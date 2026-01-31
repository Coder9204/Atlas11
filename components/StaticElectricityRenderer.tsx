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
    positive: '#EF4444',
    negative: '#3B82F6',
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
      electric: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

interface ChargedObject {
  id: number;
  x: number;
  y: number;
  charge: number; // positive or negative
  vx: number;
  vy: number;
  fixed: boolean;
}

interface StaticElectricityRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function StaticElectricityRenderer({ onGameEvent, gamePhase, onPhaseComplete }: StaticElectricityRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - charge simulation
  const [balloonCharge, setBalloonCharge] = useState(0);
  const [rubCount, setRubCount] = useState(0);
  const [hairStrands, setHairStrands] = useState<{ angle: number; length: number }[]>([]);
  const [paperPieces, setPaperPieces] = useState<{ x: number; y: number; attracted: boolean }[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Coulomb's law simulation
  const [chargedObjects, setChargedObjects] = useState<ChargedObject[]>([]);
  const [isTwistSimulating, setIsTwistSimulating] = useState(false);
  const twistAnimationRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "What happens when you rub a balloon on your hair?",
      options: [
        { text: "Nothing happens", correct: false },
        { text: "Electrons transfer from hair to balloon", correct: true },
        { text: "Protons transfer", correct: false },
        { text: "The balloon heats up", correct: false }
      ],
      explanation: "Rubbing transfers electrons from your hair to the balloon. Hair loses electrons (becomes positive), balloon gains electrons (becomes negative)."
    },
    {
      question: "What does Coulomb's Law tell us about electric force?",
      options: [
        { text: "Force increases with distance", correct: false },
        { text: "Force depends on charge amount and distance", correct: true },
        { text: "Only positive charges create force", correct: false },
        { text: "Force is always attractive", correct: false }
      ],
      explanation: "Coulomb's Law states that electric force is proportional to the product of charges and inversely proportional to the square of the distance between them."
    },
    {
      question: "Two negatively charged objects will:",
      options: [
        { text: "Attract each other", correct: false },
        { text: "Repel each other", correct: true },
        { text: "Have no interaction", correct: false },
        { text: "Create a spark", correct: false }
      ],
      explanation: "Like charges repel! Two negative charges push away from each other, just as two positive charges would."
    },
    {
      question: "Why does a charged balloon attract neutral paper pieces?",
      options: [
        { text: "Paper has hidden charges", correct: false },
        { text: "Induction creates temporary charge separation", correct: true },
        { text: "Paper is always attracted to plastic", correct: false },
        { text: "Magic", correct: false }
      ],
      explanation: "The balloon's negative charge induces (causes) a temporary charge separation in the paper - positive charges move closer to the balloon, creating attraction."
    },
    {
      question: "What is the unit of electric charge?",
      options: [
        { text: "Volt", correct: false },
        { text: "Coulomb", correct: true },
        { text: "Ampere", correct: false },
        { text: "Watt", correct: false }
      ],
      explanation: "Electric charge is measured in Coulombs (C), named after Charles-Augustin de Coulomb who discovered the force law for charges."
    },
    {
      question: "In the equation F = kq₁q₂/r², what happens if you double the distance?",
      options: [
        { text: "Force doubles", correct: false },
        { text: "Force halves", correct: false },
        { text: "Force becomes 1/4", correct: true },
        { text: "Force stays the same", correct: false }
      ],
      explanation: "Since force depends on 1/r², doubling the distance makes the force 1/(2)² = 1/4 of the original force."
    },
    {
      question: "Which statement about electrons and protons is correct?",
      options: [
        { text: "They have the same mass", correct: false },
        { text: "Electrons are positive, protons negative", correct: false },
        { text: "They have opposite charges of equal magnitude", correct: true },
        { text: "Protons can move freely in solids", correct: false }
      ],
      explanation: "Electrons (negative) and protons (positive) have exactly equal but opposite charges. However, electrons are much lighter and more mobile."
    },
    {
      question: "Static electricity is called 'static' because:",
      options: [
        { text: "It doesn't exist", correct: false },
        { text: "Charges stay in place rather than flowing", correct: true },
        { text: "It only works with plastic", correct: false },
        { text: "It was discovered at a static location", correct: false }
      ],
      explanation: "Static electricity involves charges that accumulate and stay in place on objects, unlike current electricity where charges flow continuously."
    },
    {
      question: "Lightning is an example of:",
      options: [
        { text: "Magnetic force", correct: false },
        { text: "Static discharge", correct: true },
        { text: "Nuclear reaction", correct: false },
        { text: "Chemical reaction", correct: false }
      ],
      explanation: "Lightning is a massive static discharge - charges built up in clouds suddenly flow to the ground, neutralizing the charge difference."
    },
    {
      question: "The triboelectric series tells us:",
      options: [
        { text: "How much objects weigh", correct: false },
        { text: "Which materials gain or lose electrons when rubbed", correct: true },
        { text: "The speed of electricity", correct: false },
        { text: "Color of charged objects", correct: false }
      ],
      explanation: "The triboelectric series ranks materials by their tendency to gain or lose electrons when rubbed against each other."
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

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Phase sync
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Audio feedback
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

  // Event emission
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Initialize hair strands
  const initHair = useCallback(() => {
    const strands = [];
    for (let i = 0; i < 20; i++) {
      strands.push({
        angle: 90 + (Math.random() - 0.5) * 30, // Mostly pointing up
        length: 30 + Math.random() * 20,
      });
    }
    setHairStrands(strands);
  }, []);

  // Initialize paper pieces
  const initPaper = useCallback(() => {
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      pieces.push({
        x: 60 + Math.random() * 180,
        y: 220 + Math.random() * 40,
        attracted: false,
      });
    }
    setPaperPieces(pieces);
  }, []);

  // Initialize charged objects for twist
  const initChargedObjects = useCallback(() => {
    setChargedObjects([
      { id: 0, x: 100, y: 150, charge: 1, vx: 0, vy: 0, fixed: false },
      { id: 1, x: 200, y: 150, charge: -1, vx: 0, vy: 0, fixed: false },
    ]);
  }, []);

  useEffect(() => {
    if (phase === 'play') {
      initHair();
      initPaper();
      setBalloonCharge(0);
      setRubCount(0);
    }
    if (phase === 'twist_play') {
      initChargedObjects();
    }
  }, [phase, initHair, initPaper, initChargedObjects]);

  // Update hair based on balloon charge
  useEffect(() => {
    if (phase === 'play' && balloonCharge !== 0) {
      setHairStrands(prev => prev.map((strand, i) => {
        // Hair stands up and spreads due to positive charge
        const spreadAngle = Math.abs(balloonCharge) * 15;
        const baseAngle = 90 + ((i / prev.length) - 0.5) * spreadAngle * 2;
        return {
          ...strand,
          angle: baseAngle + (Math.random() - 0.5) * 10,
        };
      }));
    }
  }, [balloonCharge, phase]);

  // Update paper attraction
  useEffect(() => {
    if (phase === 'play' && isSimulating) {
      setPaperPieces(prev => prev.map(piece => {
        if (Math.abs(balloonCharge) > 3) {
          // Calculate distance to balloon (positioned at x:150, y:100)
          const dx = 150 - piece.x;
          const dy = 80 - piece.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100 + Math.abs(balloonCharge) * 10) {
            return {
              ...piece,
              attracted: true,
              x: piece.x + dx * 0.05,
              y: piece.y + dy * 0.05,
            };
          }
        }
        return piece;
      }));
    }
  }, [balloonCharge, isSimulating, phase]);

  // Twist simulation - Coulomb's law
  useEffect(() => {
    if (phase === 'twist_play' && isTwistSimulating) {
      const simulate = () => {
        setChargedObjects(prev => {
          const updated = prev.map(obj => {
            if (obj.fixed) return obj;

            let fx = 0, fy = 0;

            // Calculate forces from other charges
            prev.forEach(other => {
              if (other.id === obj.id) return;

              const dx = other.x - obj.x;
              const dy = other.y - obj.y;
              const dist = Math.max(20, Math.sqrt(dx * dx + dy * dy));

              // Coulomb's law: F = k * q1 * q2 / r²
              // Like charges repel (positive force), unlike attract (negative force)
              const forceMag = (obj.charge * other.charge * 1000) / (dist * dist);

              // Direction: toward other if attracted, away if repelled
              fx -= (dx / dist) * forceMag;
              fy -= (dy / dist) * forceMag;
            });

            // Apply force with damping
            let newVx = (obj.vx + fx * 0.1) * 0.95;
            let newVy = (obj.vy + fy * 0.1) * 0.95;

            let newX = obj.x + newVx;
            let newY = obj.y + newVy;

            // Boundaries
            if (newX < 40) { newX = 40; newVx = -newVx * 0.5; }
            if (newX > 260) { newX = 260; newVx = -newVx * 0.5; }
            if (newY < 40) { newY = 40; newVy = -newVy * 0.5; }
            if (newY > 260) { newY = 260; newVy = -newVy * 0.5; }

            return { ...obj, x: newX, y: newY, vx: newVx, vy: newVy };
          });

          return updated;
        });

        twistAnimationRef.current = requestAnimationFrame(simulate);
      };
      twistAnimationRef.current = requestAnimationFrame(simulate);

      return () => {
        if (twistAnimationRef.current) {
          cancelAnimationFrame(twistAnimationRef.current);
        }
      };
    }
  }, [phase, isTwistSimulating]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (twistAnimationRef.current) cancelAnimationFrame(twistAnimationRef.current);
    };
  }, [phase]);

  // Rub balloon function
  const rubBalloon = () => {
    setRubCount(r => r + 1);
    setBalloonCharge(c => Math.min(10, c - 1)); // Balloon gains negative charge
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
      zIndex: 10,
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
        background: premiumDesign.colors.gradient.electric,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.accent),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={(e) => {
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
          <span>{phaseLabels[phase]}</span>
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
            background: premiumDesign.colors.gradient.electric,
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
        title: "⚡ The Shocking Truth",
        text: "You walk across a carpet, reach for a doorknob, and ZAP! A tiny spark jumps to your finger. What mysterious force caused that shock? The same force that makes lightning crack across the sky!",
      },
      {
        title: "🎈 Magic Attraction",
        text: "Rub a balloon on your hair and it sticks to walls, picks up paper pieces, and makes your hair stand on end! Is this magic? No - it's one of the fundamental forces of nature at work.",
      },
      {
        title: "🔬 Discover Static Electricity",
        text: "Today we'll uncover the invisible world of electric charges - how they build up, attract, repel, and occasionally jump between objects in spectacular sparks!",
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
                    ? premiumDesign.colors.accent
                    : premiumDesign.colors.background.tertiary,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          hookStep > 0 ? { text: '← Back', onClick: () => setHookStep(h => h - 1) } : undefined,
          {
            text: hookStep < hookContent.length - 1 ? 'Continue →' : 'Make a Prediction →',
            onClick: () => {
              if (hookStep < hookContent.length - 1) {
                setHookStep(h => h + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'electrons', text: "Rubbing transfers tiny particles called electrons between objects" },
      { id: 'friction', text: "Friction creates heat that makes things sticky" },
      { id: 'magnetism', text: "Rubbing magnetizes objects so they attract" },
      { id: 'air', text: "Air pressure changes around rubbed objects" },
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
            What do you think happens when you rub a balloon on your hair?
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
                  ? `2px solid ${premiumDesign.colors.accent}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(245, 158, 11, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setPrediction(p.id);
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
            🎈 Balloon & Hair Experiment
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Rub the balloon on the hair to build up static charge
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
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
              <defs>
                {/* Premium background gradient */}
                <linearGradient id="staticLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="50%" stopColor="#0a0f1a" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Balloon gradient - neutral */}
                <radialGradient id="staticBalloonNeutral" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FF8888" />
                  <stop offset="40%" stopColor="#FF6B6B" />
                  <stop offset="70%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#DC2626" />
                </radialGradient>

                {/* Balloon gradient - charged (negative) */}
                <radialGradient id="staticBalloonCharged" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#F87171" />
                  <stop offset="30%" stopColor="#EF4444" />
                  <stop offset="60%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#991B1B" />
                </radialGradient>

                {/* Negative charge glow */}
                <radialGradient id="staticNegativeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
                  <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#2563EB" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
                </radialGradient>

                {/* Positive charge glow */}
                <radialGradient id="staticPositiveGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FCA5A5" stopOpacity="1" />
                  <stop offset="40%" stopColor="#EF4444" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#DC2626" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#B91C1C" stopOpacity="0" />
                </radialGradient>

                {/* Skin tone gradient */}
                <radialGradient id="staticSkinGrad" cx="40%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FFE4C4" />
                  <stop offset="50%" stopColor="#FFD7B5" />
                  <stop offset="80%" stopColor="#F5C69A" />
                  <stop offset="100%" stopColor="#E8B589" />
                </radialGradient>

                {/* Hair strand gradient */}
                <linearGradient id="staticHairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#A0522D" />
                  <stop offset="50%" stopColor="#8B4513" />
                  <stop offset="100%" stopColor="#654321" />
                </linearGradient>

                {/* Table wood gradient */}
                <linearGradient id="staticWoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A0522D" />
                  <stop offset="30%" stopColor="#8B4513" />
                  <stop offset="60%" stopColor="#704214" />
                  <stop offset="100%" stopColor="#5C3317" />
                </linearGradient>

                {/* Paper gradient */}
                <linearGradient id="staticPaperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFEF0" />
                  <stop offset="50%" stopColor="#F5F5DC" />
                  <stop offset="100%" stopColor="#E8E8D0" />
                </linearGradient>

                {/* Electric field line gradient */}
                <linearGradient id="staticFieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
                  <stop offset="30%" stopColor="#3B82F6" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                </linearGradient>

                {/* Balloon glow filter */}
                <filter id="staticBalloonGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Charge symbol glow */}
                <filter id="staticChargeGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Hair strand glow when charged */}
                <filter id="staticHairGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Spark effect filter */}
                <filter id="staticSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Attraction field lines gradient */}
                <linearGradient id="staticAttractionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#F472B6" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Premium background */}
              <rect x="0" y="0" width="300" height="300" fill="url(#staticLabBg)" rx="12" />

              {/* Subtle grid pattern */}
              <pattern id="staticGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
              </pattern>
              <rect x="0" y="0" width="300" height="300" fill="url(#staticGrid)" rx="12" />

              {/* Head with premium gradient */}
              <ellipse cx="150" cy="200" rx="50" ry="60" fill="url(#staticSkinGrad)" />
              <ellipse cx="135" cy="185" rx="5" ry="7" fill="#2D2D2D" />
              <ellipse cx="165" cy="185" rx="5" ry="7" fill="#2D2D2D" />
              <ellipse cx="135" cy="183" rx="2" ry="3" fill="#FFFFFF" opacity="0.6" />
              <ellipse cx="165" cy="183" rx="2" ry="3" fill="#FFFFFF" opacity="0.6" />
              <path d="M140 210 Q150 218 160 210" stroke="#8B4513" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Hair strands with gradient and glow when charged */}
              {hairStrands.map((strand, i) => {
                const startX = 100 + (i / hairStrands.length) * 100;
                const startY = 145;
                const endX = startX + Math.cos(strand.angle * Math.PI / 180) * strand.length;
                const endY = startY - Math.sin(strand.angle * Math.PI / 180) * strand.length;

                return (
                  <line
                    key={i}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="url(#staticHairGrad)"
                    strokeWidth={balloonCharge < 0 ? "2.5" : "2"}
                    strokeLinecap="round"
                    filter={balloonCharge < 0 ? "url(#staticHairGlow)" : undefined}
                  />
                );
              })}

              {/* Positive charge indicators on hair with glow */}
              {balloonCharge < 0 && (
                <>
                  {[...Array(Math.min(Math.abs(balloonCharge), 4))].map((_, i) => (
                    <g key={i} filter="url(#staticChargeGlow)">
                      <circle
                        cx={120 + i * 20}
                        cy={130}
                        r="8"
                        fill="url(#staticPositiveGlow)"
                      />
                      <text
                        x={120 + i * 20}
                        y={135}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        +
                      </text>
                    </g>
                  ))}
                </>
              )}

              {/* Balloon with premium styling */}
              <g transform="translate(150, 80)">
                {/* Balloon glow effect when charged */}
                {balloonCharge < 0 && (
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="50"
                    ry="60"
                    fill="url(#staticNegativeGlow)"
                    opacity={Math.min(Math.abs(balloonCharge) * 0.1, 0.6)}
                  />
                )}
                {/* Main balloon */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx="35"
                  ry="45"
                  fill={balloonCharge < 0 ? "url(#staticBalloonCharged)" : "url(#staticBalloonNeutral)"}
                  stroke={balloonCharge < 0 ? '#991B1B' : '#CC5555'}
                  strokeWidth="2"
                  filter={balloonCharge < 0 ? "url(#staticBalloonGlow)" : undefined}
                />
                {/* Balloon highlight */}
                <ellipse cx="-12" cy="-15" rx="8" ry="12" fill="rgba(255,255,255,0.3)" />

                {/* Negative charge indicators with glow */}
                {balloonCharge < 0 && (
                  <>
                    {[...Array(Math.min(Math.abs(balloonCharge), 6))].map((_, i) => (
                      <g key={i} filter="url(#staticChargeGlow)">
                        <circle
                          cx={-15 + (i % 3) * 15}
                          cy={-15 + Math.floor(i / 3) * 25}
                          r="7"
                          fill="url(#staticNegativeGlow)"
                        />
                        <text
                          x={-15 + (i % 3) * 15}
                          y={-10 + Math.floor(i / 3) * 25}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="14"
                          fontWeight="bold"
                        >
                          -
                        </text>
                      </g>
                    ))}
                  </>
                )}
                {/* Balloon string with gradient */}
                <line x1="0" y1="45" x2="0" y2="60" stroke="#666" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="60" x2="5" y2="70" stroke="#666" strokeWidth="1.5" />
              </g>

              {/* Electric field lines when simulating attraction */}
              {isSimulating && balloonCharge < -3 && paperPieces.map((piece, i) => {
                if (!piece.attracted) return null;
                const dx = 150 - piece.x;
                const dy = 80 - piece.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 150) return null;

                return (
                  <line
                    key={`field-${i}`}
                    x1={piece.x + 6}
                    y1={piece.y + 4}
                    x2={150}
                    y2={80}
                    stroke="url(#staticAttractionGrad)"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity={0.6}
                  />
                );
              })}

              {/* Paper pieces with premium styling */}
              {paperPieces.map((piece, i) => (
                <g key={i} transform={`rotate(${(i * 17) % 30 - 15}, ${piece.x + 6}, ${piece.y + 4})`}>
                  <rect
                    x={piece.x}
                    y={piece.y}
                    width="12"
                    height="8"
                    fill="url(#staticPaperGrad)"
                    stroke="#C4C4A0"
                    strokeWidth="0.5"
                    rx="1"
                  />
                  {/* Paper shadow */}
                  <rect
                    x={piece.x + 1}
                    y={piece.y + 7}
                    width="12"
                    height="2"
                    fill="rgba(0,0,0,0.2)"
                    rx="1"
                  />
                </g>
              ))}

              {/* Table surface with wood grain effect */}
              <rect x="40" y="270" width="220" height="25" fill="url(#staticWoodGrad)" rx="3" />
              <rect x="40" y="270" width="220" height="3" fill="rgba(255,255,255,0.1)" rx="1" />
              {/* Wood grain lines */}
              {[60, 100, 140, 180, 220].map((x, i) => (
                <line key={i} x1={x} y1="273" x2={x + 15} y2="292" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              ))}

              {/* Spark effects when highly charged and simulating */}
              {isSimulating && balloonCharge < -5 && (
                <>
                  <g filter="url(#staticSparkGlow)">
                    <path
                      d="M150 125 L155 130 L148 135 L158 145"
                      stroke="#60A5FA"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.8"
                    >
                      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.3s" repeatCount="indefinite" />
                    </path>
                  </g>
                </>
              )}
            </svg>
            {/* Label moved outside SVG using typo system */}
            <div style={{
              textAlign: 'center',
              marginTop: typo.elementGap,
              fontSize: typo.small,
              color: premiumDesign.colors.text.muted,
            }}>
              Paper pieces on table
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
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                ⚡ Charge Status
              </h4>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: premiumDesign.spacing.md,
              }}>
                <span style={{ color: premiumDesign.colors.text.secondary }}>Balloon:</span>
                <span style={{ color: balloonCharge < 0 ? premiumDesign.colors.negative : premiumDesign.colors.text.muted }}>
                  {balloonCharge < 0 ? `${balloonCharge} (negative)` : 'Neutral'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: premiumDesign.colors.text.secondary }}>Hair:</span>
                <span style={{ color: balloonCharge < 0 ? premiumDesign.colors.positive : premiumDesign.colors.text.muted }}>
                  {balloonCharge < 0 ? `+${Math.abs(balloonCharge)} (positive)` : 'Neutral'}
                </span>
              </div>
              <div style={{
                marginTop: premiumDesign.spacing.md,
                fontSize: '12px',
                color: premiumDesign.colors.text.muted,
              }}>
                Rub count: {rubCount}
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <button
                style={{
                  width: '100%',
                  padding: premiumDesign.spacing.lg,
                  borderRadius: premiumDesign.radius.lg,
                  border: 'none',
                  background: premiumDesign.colors.gradient.warm,
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: premiumDesign.spacing.md,
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  rubBalloon();
                }}
              >
                🎈 Rub Balloon on Hair
              </button>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={isSimulating}
                  onChange={(e) => setIsSimulating(e.target.checked)}
                  style={{ accentColor: premiumDesign.colors.primary }}
                />
                Bring balloon near paper
              </label>

              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: premiumDesign.spacing.sm,
                  marginTop: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setBalloonCharge(0);
                  setRubCount(0);
                  initHair();
                  initPaper();
                  setIsSimulating(false);
                }}
              >
                🔄 Reset Experiment
              </button>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Rub several times to build charge! Watch hair stand up and paper pieces get attracted.
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const reviewContent = [
      {
        title: "Electron Transfer",
        content: "When you rub the balloon on your hair, electrons (tiny negative charges) transfer from your hair to the balloon. Hair loses electrons and becomes positively charged; the balloon gains electrons and becomes negatively charged.",
        formula: "Hair loses e⁻ → Hair⁺    Balloon gains e⁻ → Balloon⁻",
      },
      {
        title: "Like Charges Repel",
        content: "Your hair strands all become positively charged. Since like charges repel each other, each hair strand pushes away from its neighbors - that's why your hair stands up and spreads out!",
        formula: "Same signs → Repulsion: (+)(+) or (−)(−)",
      },
      {
        title: "Opposites Attract & Induction",
        content: "The negative balloon attracts positive charges in paper (induction). Even though paper is neutral overall, the balloon pulls positive charges closer while pushing negative charges away, creating attraction!",
        formula: "Different signs → Attraction: (+)(−)",
      },
      {
        title: "Your Prediction",
        content: prediction === 'electrons'
          ? "Excellent! You correctly predicted that electrons transfer between objects. This triboelectric effect is the basis of all static electricity!"
          : "The correct answer is that rubbing transfers electrons. Hair loses electrons (becomes +), balloon gains them (becomes −). This is called the triboelectric effect!",
        formula: "Triboelectric Effect = Contact + Separation → Charge Transfer",
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
            📊 Understanding Static Electricity
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
            color: premiumDesign.colors.accent,
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
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.accent,
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
                    ? premiumDesign.colors.accent
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setReviewStep(i);
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
                setReviewStep(r => r + 1);
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
      { id: 'attract', text: "Opposite charges will attract and move toward each other" },
      { id: 'repel', text: "All charges repel each other regardless of sign" },
      { id: 'nothing', text: "Charges don't affect each other's motion" },
      { id: 'orbit', text: "Charges will orbit around each other" },
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
            🔄 The Twist: Coulomb's Law
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            If you place a positive charge near a negative charge, what will happen?
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
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setTwistPrediction(p.id);
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
            onClick: goNext,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const addCharge = (charge: number) => {
      const newObj: ChargedObject = {
        id: chargedObjects.length,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 100,
        charge,
        vx: 0,
        vy: 0,
        fixed: false,
      };
      setChargedObjects([...chargedObjects, newObj]);
    };

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
            ⚡ Coulomb's Law Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Add charges and watch them interact - F = kq₁q₂/r²
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
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
              <defs>
                {/* Premium lab background gradient */}
                <linearGradient id="staticCoulombBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="50%" stopColor="#0a1628" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Positive charge gradient - warm */}
                <radialGradient id="staticPositiveGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FCA5A5" />
                  <stop offset="30%" stopColor="#F87171" />
                  <stop offset="60%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#B91C1C" />
                </radialGradient>

                {/* Negative charge gradient - cool */}
                <radialGradient id="staticNegativeGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="30%" stopColor="#60A5FA" />
                  <stop offset="60%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </radialGradient>

                {/* Positive outer glow */}
                <radialGradient id="staticPositiveOuterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#DC2626" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#B91C1C" stopOpacity="0" />
                </radialGradient>

                {/* Negative outer glow */}
                <radialGradient id="staticNegativeOuterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
                </radialGradient>

                {/* Attraction force line gradient */}
                <linearGradient id="staticAttractionLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                  <stop offset="30%" stopColor="#34D399" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#6EE7B7" stopOpacity="1" />
                  <stop offset="70%" stopColor="#34D399" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                </linearGradient>

                {/* Repulsion force line gradient */}
                <linearGradient id="staticRepulsionLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                  <stop offset="30%" stopColor="#F87171" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#FCA5A5" stopOpacity="1" />
                  <stop offset="70%" stopColor="#F87171" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
                </linearGradient>

                {/* Electric field gradient */}
                <linearGradient id="staticFieldLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                  <stop offset="30%" stopColor="#A78BFA" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#C4B5FD" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#A78BFA" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                </linearGradient>

                {/* Charge glow filter */}
                <filter id="staticChargeBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Force line glow */}
                <filter id="staticForceGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Pulsing animation for charges */}
                <filter id="staticPulse" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2">
                    <animate attributeName="stdDeviation" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
                  </feGaussianBlur>
                </filter>
              </defs>

              {/* Premium background */}
              <rect x="0" y="0" width="300" height="300" fill="url(#staticCoulombBg)" rx="12" />

              {/* Subtle grid pattern */}
              <pattern id="staticCoulombGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
              </pattern>
              <rect x="0" y="0" width="300" height="300" fill="url(#staticCoulombGrid)" rx="12" />

              {/* Simulation area with premium border */}
              <rect x="30" y="30" width="240" height="240" fill="rgba(99, 102, 241, 0.03)" rx="12" />
              <rect x="30" y="30" width="240" height="240" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1.5" rx="12" />
              {/* Corner accents */}
              <path d="M30 50 L30 30 L50 30" fill="none" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2" />
              <path d="M250 30 L270 30 L270 50" fill="none" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2" />
              <path d="M270 250 L270 270 L250 270" fill="none" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2" />
              <path d="M50 270 L30 270 L30 250" fill="none" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2" />

              {/* Force lines between charges with premium styling */}
              {chargedObjects.map((obj1, i) =>
                chargedObjects.slice(i + 1).map((obj2, j) => {
                  const isAttracting = obj1.charge * obj2.charge < 0;
                  const dx = obj2.x - obj1.x;
                  const dy = obj2.y - obj1.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const midX = (obj1.x + obj2.x) / 2;
                  const midY = (obj1.y + obj2.y) / 2;

                  return (
                    <g key={`${i}-${j}`} filter="url(#staticForceGlow)">
                      <line
                        x1={obj1.x}
                        y1={obj1.y}
                        x2={obj2.x}
                        y2={obj2.y}
                        stroke={isAttracting ? "url(#staticAttractionLineGrad)" : "url(#staticRepulsionLineGrad)"}
                        strokeWidth="2"
                        strokeDasharray={isAttracting ? "none" : "8,4"}
                        opacity="0.8"
                      />
                      {/* Force direction arrows */}
                      {isAttracting ? (
                        <>
                          {/* Arrows pointing toward each other */}
                          <polygon
                            points={`${midX - 4},${midY - 4} ${midX + 4},${midY} ${midX - 4},${midY + 4}`}
                            fill="#34D399"
                            transform={`rotate(${Math.atan2(dy, dx) * 180 / Math.PI}, ${midX}, ${midY})`}
                          />
                        </>
                      ) : (
                        <>
                          {/* Arrows pointing away */}
                          <polygon
                            points={`${midX + 4},${midY - 4} ${midX - 4},${midY} ${midX + 4},${midY + 4}`}
                            fill="#F87171"
                            transform={`rotate(${Math.atan2(dy, dx) * 180 / Math.PI}, ${midX}, ${midY})`}
                          />
                        </>
                      )}
                    </g>
                  );
                })
              )}

              {/* Charged objects with premium styling */}
              {chargedObjects.map((obj) => (
                <g key={obj.id}>
                  {/* Outer pulsing glow */}
                  <circle
                    cx={obj.x}
                    cy={obj.y}
                    r="30"
                    fill={obj.charge > 0 ? "url(#staticPositiveOuterGlow)" : "url(#staticNegativeOuterGlow)"}
                    filter="url(#staticPulse)"
                  />
                  {/* Inner glow ring */}
                  <circle
                    cx={obj.x}
                    cy={obj.y}
                    r="24"
                    fill="none"
                    stroke={obj.charge > 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)"}
                    strokeWidth="2"
                  />
                  {/* Main charge circle with gradient */}
                  <circle
                    cx={obj.x}
                    cy={obj.y}
                    r="18"
                    fill={obj.charge > 0 ? "url(#staticPositiveGrad)" : "url(#staticNegativeGrad)"}
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="2"
                    filter="url(#staticChargeBlur)"
                  />
                  {/* Highlight */}
                  <circle
                    cx={obj.x - 5}
                    cy={obj.y - 5}
                    r="5"
                    fill="rgba(255,255,255,0.3)"
                  />
                  {/* Charge sign */}
                  <text
                    x={obj.x}
                    y={obj.y + 7}
                    textAnchor="middle"
                    fill="white"
                    fontSize="22"
                    fontWeight="bold"
                    style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                  >
                    {obj.charge > 0 ? '+' : '-'}
                  </text>
                </g>
              ))}
            </svg>
            {/* Legend moved outside SVG */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: premiumDesign.spacing.lg,
              marginTop: typo.elementGap,
              fontSize: typo.small,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 50%, #B91C1C 100%)',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                }} />
                <span style={{ color: premiumDesign.colors.text.secondary }}>Positive</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #1D4ED8 100%)',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
                }} />
                <span style={{ color: premiumDesign.colors.text.secondary }}>Negative</span>
              </div>
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
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Add Charges
              </h4>
              <div style={{ display: 'flex', gap: premiumDesign.spacing.sm }}>
                <button
                  style={{
                    flex: 1,
                    padding: premiumDesign.spacing.md,
                    borderRadius: premiumDesign.radius.md,
                    border: 'none',
                    background: premiumDesign.colors.positive,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    addCharge(1);
                  }}
                >
                  + Add
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: premiumDesign.spacing.md,
                    borderRadius: premiumDesign.radius.md,
                    border: 'none',
                    background: premiumDesign.colors.negative,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    addCharge(-1);
                  }}
                >
                  − Add
                </button>
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {renderButton(
                isTwistSimulating ? '⏸ Pause' : '▶️ Start Simulation',
                () => setIsTwistSimulating(!isTwistSimulating),
                isTwistSimulating ? 'secondary' : 'primary'
              )}

              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: premiumDesign.spacing.sm,
                  marginTop: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  initChargedObjects();
                  setIsTwistSimulating(false);
                }}
              >
                🔄 Reset
              </button>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Opposite charges attract (solid lines), like charges repel (dashed lines). Watch force ∝ 1/r²!
              </p>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Coulomb's Law
              </div>
              <div style={{ color: premiumDesign.colors.primary, fontSize: '18px', fontFamily: 'monospace' }}>
                F = k × q₁q₂ / r²
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const twistReviewContent = [
      {
        title: "Coulomb's Law Confirmed",
        content: "Opposite charges attract and move toward each other, while like charges repel. The force between them follows Coulomb's Law: F = kq₁q₂/r², where the force depends on both charge magnitudes and the square of the distance.",
        highlight: twistPrediction === 'attract'
          ? "You correctly predicted that opposite charges attract!"
          : "The correct answer was that opposite charges attract. Like charges repel, but opposite charges are drawn together.",
      },
      {
        title: "The Inverse Square Law",
        content: "Notice how charges accelerate faster as they get closer? That's because force increases as 1/r². Double the distance, force drops to 1/4. Halve the distance, force quadruples!",
      },
      {
        title: "Just Like Gravity",
        content: "Coulomb's Law looks remarkably similar to Newton's Law of Gravitation! Both are inverse-square laws. But unlike gravity (always attractive), electric force can be either attractive or repulsive depending on the charges.",
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
            🔍 Coulomb's Law Analysis
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
              background: twistPrediction === 'attract'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'attract' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'attract' ? premiumDesign.colors.success : '#EF4444',
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
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setTwistReviewStep(i);
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
                setTwistReviewStep(t => t + 1);
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
        title: "⚡ Lightning",
        description: "Lightning is nature's most dramatic static discharge! Charges build up in clouds through ice crystal collisions. When the potential difference becomes enormous, electrons jump through the air in a massive spark - lightning!",
        fact: "A single lightning bolt can heat the air to 30,000°C (5x hotter than the sun's surface) and carry 300 million volts!",
      },
      {
        title: "📄 Photocopiers & Laser Printers",
        description: "These machines use static electricity to create images! A photosensitive drum gets charged, then exposed to light (creating the image). Toner (charged powder) sticks to the charged areas, then transfers to paper and gets fused with heat.",
        fact: "Chester Carlson invented xerography (photocopying) in 1938 - it took him 20 years to find a company willing to develop it!",
      },
      {
        title: "🎨 Electrostatic Painting",
        description: "Car factories use static electricity to paint cars! Paint droplets are given a charge, while the car body is grounded. The charged paint is attracted to the car, creating an even coating with minimal waste.",
        fact: "Electrostatic painting can reduce paint waste by up to 95% compared to conventional spraying!",
      },
      {
        title: "🌬️ Air Purifiers",
        description: "Electrostatic precipitators clean air by charging dust particles, then collecting them on oppositely charged plates. This technology removes smoke, pollen, and pollutants from factory emissions and indoor air.",
        fact: "Large power plants use electrostatic precipitators to remove 99%+ of particulate matter from exhaust gases!",
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
            🌍 Static Electricity in Action
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
                  ? `2px solid ${premiumDesign.colors.accent}`
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
                zIndex: 10,
              }}
              onClick={(e) => {
                e.preventDefault();
                setActiveApp(index);
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
            <p style={{ margin: 0, color: premiumDesign.colors.accent, fontWeight: 600 }}>
              💡 Fun Fact
            </p>
            <p style={{ margin: `${premiumDesign.spacing.sm}px 0 0`, color: premiumDesign.colors.text.secondary }}>
              {applications[activeApp].fact}
            </p>
          </div>

          <button
            style={{
              display: 'block',
              width: '100%',
              marginTop: premiumDesign.spacing.lg,
              padding: premiumDesign.spacing.md,
              borderRadius: premiumDesign.radius.md,
              border: 'none',
              background: completedApps.has(activeApp)
                ? premiumDesign.colors.background.tertiary
                : premiumDesign.colors.gradient.primary,
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              zIndex: 10,
            }}
            onClick={(e) => {
              e.preventDefault();
              if (!completedApps.has(activeApp)) {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
              }
              if (activeApp < applications.length - 1) {
                setActiveApp(activeApp + 1);
              }
            }}
          >
            {completedApps.has(activeApp)
              ? (activeApp < applications.length - 1 ? 'Next Application →' : '✓ Completed')
              : 'Next Application →'}
          </button>
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
              background: passed ? premiumDesign.colors.gradient.electric : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
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
                ? 'You have mastered static electricity!'
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
          <span style={{ color: premiumDesign.colors.accent, fontWeight: 600 }}>
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
                zIndex: 10,
              };

              if (showExplanation) {
                if (option.correct) {
                  buttonStyle.background = 'rgba(16, 185, 129, 0.2)';
                  buttonStyle.borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
                  buttonStyle.borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                buttonStyle.borderColor = premiumDesign.colors.accent;
                buttonStyle.background = 'rgba(245, 158, 11, 0.2)';
              }

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                  disabled={showExplanation}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: premiumDesign.spacing.xl,
              padding: premiumDesign.spacing.lg,
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.accent, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
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
                setShowExplanation(true);
                if (question.options[selectedAnswer as number]?.correct) {
                  setTestScore(s => s + 1);
                }
              },
              'primary',
              selectedAnswer === null
            )
          ) : (
            renderButton(
              currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results',
              () => {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
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
          background: premiumDesign.colors.gradient.electric,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Static Electricity Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how charges transfer, attract, repel, and create the sparks and forces that power everything from lightning to photocopiers!
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
          <h3 style={{ color: premiumDesign.colors.accent, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Electrons transfer between materials when rubbed</li>
            <li>Like charges repel, opposite charges attract</li>
            <li>Coulomb's Law: F = kq₁q₂/r²</li>
            <li>Induction creates temporary charge separation</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {renderButton('← Review Again', () => goToPhase('hook'), 'secondary')}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1a',
      color: premiumDesign.colors.text.primary,
      fontFamily: premiumDesign.typography.fontFamily,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Premium Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Static Electricity</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : phaseOrder.indexOf(p) < phaseOrder.indexOf(phase)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative pt-16" style={{ padding: isMobile ? premiumDesign.spacing.md : premiumDesign.spacing.xl, paddingTop: '64px', maxWidth: 900, margin: '0 auto' }}>
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
