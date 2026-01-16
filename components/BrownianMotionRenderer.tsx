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

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number }[];
}

interface WaterMolecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface BrownianMotionRendererProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function BrownianMotionRenderer({ onBack, onNext }: BrownianMotionRendererProps) {
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

  // Play phase - Brownian motion simulation
  const [particles, setParticles] = useState<Particle[]>([]);
  const [waterMolecules, setWaterMolecules] = useState<WaterMolecule[]>([]);
  const [temperature, setTemperature] = useState(25);
  const [showMolecules, setShowMolecules] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - particle size comparison
  const [twistParticles, setTwistParticles] = useState<Particle[]>([]);
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
      question: "What causes Brownian motion?",
      options: ["Wind currents", "Collisions with fluid molecules", "Magnetic forces", "Gravity fluctuations"],
      correct: 1,
      explanation: "Brownian motion is caused by countless random collisions between the visible particle and the much smaller, invisible molecules of the surrounding fluid."
    },
    {
      question: "What happens to Brownian motion when temperature increases?",
      options: ["Motion stops", "Motion slows down", "Motion becomes more vigorous", "Motion becomes organized"],
      correct: 2,
      explanation: "Higher temperature means molecules have more kinetic energy, move faster, and collide with particles more forcefully, causing more vigorous Brownian motion."
    },
    {
      question: "Which particle would show MORE noticeable Brownian motion?",
      options: ["A large sand grain", "A small pollen grain", "A basketball", "They all move the same"],
      correct: 1,
      explanation: "Smaller, lighter particles show more noticeable Brownian motion because individual molecular collisions have a greater relative effect on their motion."
    },
    {
      question: "Why does a particle in Brownian motion move randomly?",
      options: ["It's alive", "Collisions come from random directions", "Gravity keeps changing", "The fluid is spinning"],
      correct: 1,
      explanation: "The random motion occurs because molecules hit the particle from all directions randomly - sometimes more from one side, sometimes from another."
    },
    {
      question: "Who famously explained Brownian motion mathematically in 1905?",
      options: ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Robert Brown"],
      correct: 2,
      explanation: "Albert Einstein's 1905 paper explained Brownian motion quantitatively and provided strong evidence for the existence of atoms and molecules."
    },
    {
      question: "What does Brownian motion prove about matter?",
      options: ["Matter is continuous", "Atoms and molecules exist and move", "Fluids are perfectly still", "Temperature doesn't affect particles"],
      correct: 1,
      explanation: "Brownian motion provides visible evidence that fluids are made of tiny, constantly moving particles (molecules), not continuous matter."
    },
    {
      question: "In which medium would you observe Brownian motion?",
      options: ["Only in water", "Only in air", "In any fluid (liquid or gas)", "Only in a vacuum"],
      correct: 2,
      explanation: "Brownian motion occurs in any fluid - both liquids and gases contain moving molecules that can cause visible particles to jiggle randomly."
    },
    {
      question: "What pattern does a particle trace over time in Brownian motion?",
      options: ["A straight line", "A perfect circle", "A random, zigzag path", "A smooth curve"],
      correct: 2,
      explanation: "The particle traces a random, zigzag path called a 'random walk' because each collision changes its direction unpredictably."
    },
    {
      question: "At absolute zero temperature (0 K), what would happen to Brownian motion?",
      options: ["It would speed up", "It would stop", "It would reverse", "No change"],
      correct: 1,
      explanation: "At absolute zero, all molecular motion theoretically stops, so there would be no collisions to cause Brownian motion."
    },
    {
      question: "Why is Brownian motion important in biology?",
      options: ["It powers muscles", "It helps molecules move and meet in cells", "It creates bones", "It doesn't affect biology"],
      correct: 1,
      explanation: "Brownian motion is essential for transporting molecules within cells, helping enzymes find substrates and enabling biochemical reactions."
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

  // Initialize particles for main simulation
  const initParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      newParticles.push({
        id: i,
        x: 80 + i * 70,
        y: 150,
        vx: 0,
        vy: 0,
        radius: 8,
        trail: [],
      });
    }
    setParticles(newParticles);

    // Initialize water molecules
    const molecules: WaterMolecule[] = [];
    for (let i = 0; i < 100; i++) {
      const speed = (temperature / 25) * 3;
      const angle = Math.random() * Math.PI * 2;
      molecules.push({
        id: i,
        x: 30 + Math.random() * 240,
        y: 30 + Math.random() * 240,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
    setWaterMolecules(molecules);
  }, [temperature]);

  // Initialize twist particles (different sizes)
  const initTwistParticles = useCallback(() => {
    const sizes = [4, 8, 14];
    const newParticles: Particle[] = sizes.map((r, i) => ({
      id: i,
      x: 80 + i * 70,
      y: 150,
      vx: 0,
      vy: 0,
      radius: r,
      trail: [],
    }));
    setTwistParticles(newParticles);
  }, []);

  useEffect(() => {
    if (phase === 'play') {
      initParticles();
    }
    if (phase === 'twist_play') {
      initTwistParticles();
    }
  }, [phase, initParticles, initTwistParticles]);

  // Update molecule speeds when temperature changes
  useEffect(() => {
    if (phase === 'play') {
      setWaterMolecules(prev => prev.map(m => {
        const speed = (temperature / 25) * 3;
        const currentSpeed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        if (currentSpeed === 0) return m;
        const scale = speed / currentSpeed;
        return { ...m, vx: m.vx * scale, vy: m.vy * scale };
      }));
    }
  }, [temperature, phase]);

  // Main Brownian motion simulation
  useEffect(() => {
    if (phase === 'play' && isSimulating) {
      const simulate = () => {
        // Update water molecules
        setWaterMolecules(prev => prev.map(m => {
          let newX = m.x + m.vx;
          let newY = m.y + m.vy;
          let newVx = m.vx;
          let newVy = m.vy;

          // Bounce off walls
          if (newX < 30 || newX > 270) { newVx = -newVx; newX = Math.max(30, Math.min(270, newX)); }
          if (newY < 30 || newY > 270) { newVy = -newVy; newY = Math.max(30, Math.min(270, newY)); }

          // Random direction changes (thermal agitation)
          if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (temperature / 25) * 3;
            newVx = Math.cos(angle) * speed;
            newVy = Math.sin(angle) * speed;
          }

          return { ...m, x: newX, y: newY, vx: newVx, vy: newVy };
        }));

        // Update visible particles based on molecular collisions
        setParticles(prev => prev.map(p => {
          let impulseX = 0;
          let impulseY = 0;

          // Calculate net impulse from nearby molecules
          waterMolecules.forEach(m => {
            const dx = m.x - p.x;
            const dy = m.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < p.radius + 3) {
              // Collision! Transfer momentum
              const force = (temperature / 25) * 0.5;
              impulseX -= (dx / dist) * force;
              impulseY -= (dy / dist) * force;
            }
          });

          // Add random thermal kicks
          const thermalKick = (temperature / 25) * 0.3;
          impulseX += (Math.random() - 0.5) * thermalKick;
          impulseY += (Math.random() - 0.5) * thermalKick;

          // Update velocity with drag
          let newVx = (p.vx + impulseX) * 0.95;
          let newVy = (p.vy + impulseY) * 0.95;

          // Update position
          let newX = p.x + newVx;
          let newY = p.y + newVy;

          // Boundary constraints
          if (newX < 30 + p.radius) { newX = 30 + p.radius; newVx = -newVx * 0.5; }
          if (newX > 270 - p.radius) { newX = 270 - p.radius; newVx = -newVx * 0.5; }
          if (newY < 30 + p.radius) { newY = 30 + p.radius; newVy = -newVy * 0.5; }
          if (newY > 270 - p.radius) { newY = 270 - p.radius; newVy = -newVy * 0.5; }

          // Update trail
          const newTrail = [...p.trail, { x: newX, y: newY }].slice(-50);

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy, trail: newTrail };
        }));

        animationRef.current = requestAnimationFrame(simulate);
      };
      animationRef.current = requestAnimationFrame(simulate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isSimulating, temperature, waterMolecules]);

  // Twist simulation (particle size comparison)
  useEffect(() => {
    if (phase === 'twist_play' && isTwistSimulating) {
      const simulate = () => {
        setTwistParticles(prev => prev.map(p => {
          // Smaller particles get stronger kicks
          const kickStrength = 0.8 / Math.sqrt(p.radius);

          const impulseX = (Math.random() - 0.5) * kickStrength;
          const impulseY = (Math.random() - 0.5) * kickStrength;

          let newVx = (p.vx + impulseX) * 0.92;
          let newVy = (p.vy + impulseY) * 0.92;

          let newX = p.x + newVx;
          let newY = p.y + newVy;

          // Boundaries
          if (newX < 30 + p.radius) { newX = 30 + p.radius; newVx = -newVx * 0.5; }
          if (newX > 270 - p.radius) { newX = 270 - p.radius; newVx = -newVx * 0.5; }
          if (newY < 30 + p.radius) { newY = 30 + p.radius; newVy = -newVy * 0.5; }
          if (newY > 270 - p.radius) { newY = 270 - p.radius; newVy = -newVy * 0.5; }

          const newTrail = [...p.trail, { x: newX, y: newY }].slice(-60);

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy, trail: newTrail };
        }));

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

  // Cleanup animations on phase change
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (twistAnimationRef.current) cancelAnimationFrame(twistAnimationRef.current);
    };
  }, [phase]);

  // Get particle color based on index
  const getParticleColor = (index: number) => {
    const colors = ['#F59E0B', '#10B981', '#8B5CF6'];
    return colors[index % colors.length];
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
        background: premiumDesign.colors.gradient.warm,
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

  // Phase Renderers
  function renderHookPhase() {
    const hookContent = [
      {
        title: "🔬 The Dancing Dust Mystery",
        text: "In 1827, botanist Robert Brown peered through his microscope at pollen grains in water. To his amazement, the tiny grains were dancing and jiggling, never staying still! What invisible force could possibly be causing this?",
      },
      {
        title: "👻 Invisible Bumper Cars",
        text: "Imagine you're blindfolded in a room full of invisible people constantly bumping into you from all directions. You'd stumble around randomly, never knowing which way you'd be pushed next. This is exactly what happens at the microscopic level!",
      },
      {
        title: "🌡️ Discover Thermal Motion",
        text: "Today we'll uncover why tiny particles never rest - and how this jittery dance proves that matter is made of constantly moving molecules you can't see!",
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
                    ? premiumDesign.colors.primary
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
      { id: 'molecules', text: "Invisible molecules constantly bump into the particle randomly" },
      { id: 'currents', text: "Hidden water currents carry the particles around" },
      { id: 'alive', text: "The particles have tiny engines or are somehow alive" },
      { id: 'electric', text: "Electric or magnetic fields push the particles" },
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
            What do you think causes tiny particles to jiggle randomly in water?
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
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(99, 102, 241, 0.2)'
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
            🔬 Brownian Motion Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch pollen grains jiggle as water molecules bump into them
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
              {/* Water background */}
              <rect x="25" y="25" width="250" height="250" fill="rgba(59, 130, 246, 0.15)" rx="8" />
              <rect x="25" y="25" width="250" height="250" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="2" rx="8" />

              {/* Water molecules (visible toggle) */}
              {showMolecules && waterMolecules.map(m => (
                <circle
                  key={m.id}
                  cx={m.x}
                  cy={m.y}
                  r={2}
                  fill="rgba(59, 130, 246, 0.6)"
                />
              ))}

              {/* Particle trails */}
              {showTrails && particles.map((p, index) => (
                <polyline
                  key={`trail-${p.id}`}
                  points={p.trail.map(t => `${t.x},${t.y}`).join(' ')}
                  fill="none"
                  stroke={getParticleColor(index)}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
              ))}

              {/* Visible particles (pollen) */}
              {particles.map((p, index) => (
                <g key={p.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 2}
                    fill={`${getParticleColor(index)}40`}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius}
                    fill={getParticleColor(index)}
                    stroke="white"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Labels */}
              <text x="150" y="18" textAnchor="middle" fill="white" fontSize="12">
                Microscope View
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
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                🌡️ Temperature: {temperature}°C
              </h4>
              <input
                type="range"
                min="5"
                max="80"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.primary }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: premiumDesign.colors.text.muted,
                marginTop: premiumDesign.spacing.xs,
              }}>
                <span>Cold</span>
                <span>Warm</span>
                <span>Hot</span>
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {renderButton(
                isSimulating ? '⏸ Pause' : '▶️ Start',
                () => setIsSimulating(!isSimulating),
                isSimulating ? 'secondary' : 'primary'
              )}

              <div style={{ marginTop: premiumDesign.spacing.md }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: premiumDesign.spacing.sm,
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                  marginBottom: premiumDesign.spacing.sm,
                }}>
                  <input
                    type="checkbox"
                    checked={showMolecules}
                    onChange={(e) => setShowMolecules(e.target.checked)}
                    style={{ accentColor: premiumDesign.colors.primary }}
                  />
                  Show water molecules
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: premiumDesign.spacing.sm,
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={showTrails}
                    onChange={(e) => setShowTrails(e.target.checked)}
                    style={{ accentColor: premiumDesign.colors.primary }}
                  />
                  Show particle trails
                </label>
              </div>

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
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  initParticles();
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
                💡 Try increasing temperature - molecules move faster and bump the particles harder!
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
        title: "Molecular Collisions Cause the Motion",
        content: "Brownian motion is caused by invisible molecules (like water) constantly colliding with visible particles (like pollen). Each collision gives the particle a tiny push in a random direction.",
        formula: "Random Walk: ⟨x²⟩ = 2Dt",
      },
      {
        title: "Temperature Increases Motion",
        content: "Higher temperature means molecules have more kinetic energy - they move faster and hit particles harder. This is why Brownian motion becomes more vigorous when you heat the fluid!",
        formula: "KE = ½mv² ∝ Temperature",
      },
      {
        title: "Your Prediction",
        content: prediction === 'molecules'
          ? "Excellent! You correctly predicted that invisible molecules bump into the particles. Einstein proved this mathematically in 1905, confirming that atoms exist!"
          : "The correct answer is that invisible molecules constantly bump into the particles from random directions. This was proven by Einstein in 1905!",
        formula: "Einstein: D = kT / (6πηr)",
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
            📊 Understanding Brownian Motion
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
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {reviewContent[reviewStep].content}
          </p>

          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.primary,
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
      { id: 'same', text: "All particles jiggle the same amount regardless of size" },
      { id: 'large', text: "Larger particles jiggle more because more molecules hit them" },
      { id: 'small', text: "Smaller particles jiggle more because each hit has a bigger effect" },
      { id: 'none', text: "Size doesn't affect Brownian motion at all" },
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
            🔄 The Twist: Particle Size
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            How does particle size affect Brownian motion?
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
    const sizes = ['Small', 'Medium', 'Large'];

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
            📏 Size Comparison Experiment
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch how different sized particles respond to molecular collisions
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
              {/* Background */}
              <rect x="25" y="25" width="250" height="250" fill="rgba(139, 92, 246, 0.1)" rx="8" />
              <rect x="25" y="25" width="250" height="250" fill="none" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="2" rx="8" />

              {/* Particle trails */}
              {twistParticles.map((p, index) => (
                <polyline
                  key={`trail-${p.id}`}
                  points={p.trail.map(t => `${t.x},${t.y}`).join(' ')}
                  fill="none"
                  stroke={getParticleColor(index)}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
              ))}

              {/* Particles */}
              {twistParticles.map((p, index) => (
                <g key={p.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 2}
                    fill={`${getParticleColor(index)}40`}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius}
                    fill={getParticleColor(index)}
                    stroke="white"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Size labels */}
              {twistParticles.map((p, index) => (
                <text
                  key={`label-${p.id}`}
                  x={80 + index * 70}
                  y={280}
                  textAnchor="middle"
                  fill={getParticleColor(index)}
                  fontSize="11"
                >
                  {sizes[index]}
                </text>
              ))}
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
              {renderButton(
                isTwistSimulating ? '⏸ Pause' : '▶️ Start Comparison',
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
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  initTwistParticles();
                }}
              >
                🔄 Reset Particles
              </button>
            </div>

            {/* Legend */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Particle Sizes
              </h4>
              {twistParticles.map((p, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: premiumDesign.spacing.sm,
                  marginBottom: premiumDesign.spacing.sm,
                }}>
                  <div style={{
                    width: p.radius * 2,
                    height: p.radius * 2,
                    borderRadius: '50%',
                    background: getParticleColor(i),
                  }} />
                  <span style={{ color: premiumDesign.colors.text.secondary }}>
                    {sizes[i]} ({p.radius * 2}px)
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Notice how the smallest particle (orange) jiggles the most, while the largest (purple) barely moves!
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
        title: "Smaller Particles Move More",
        content: "Smaller particles show more dramatic Brownian motion because each molecular collision has a relatively larger effect on them. It's like a ping pong ball vs a bowling ball - the same wind affects them very differently!",
        highlight: twistPrediction === 'small'
          ? "You correctly predicted that smaller particles jiggle more!"
          : "The correct answer was that smaller particles jiggle more because each collision has a bigger relative effect on them.",
      },
      {
        title: "The Math Behind It",
        content: "Einstein's formula shows that the diffusion coefficient D is inversely proportional to particle radius: D = kT/(6πηr). Smaller radius = larger D = more motion!",
      },
      {
        title: "Why This Matters",
        content: "This size-dependence is why Brownian motion is visible for tiny particles like pollen but invisible for larger objects like sand grains or dust bunnies - the molecular kicks average out for big things.",
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
            🔍 Size Effect Analysis
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
              background: twistPrediction === 'small'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'small' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'small' ? premiumDesign.colors.success : '#EF4444',
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
        title: "🧬 Cell Biology",
        description: "Inside your cells, Brownian motion helps molecules find each other! Enzymes randomly bump into their substrates, nutrients diffuse to where they're needed, and signaling molecules spread throughout the cell - all powered by thermal jiggling.",
        fact: "Without Brownian motion, the chemical reactions keeping you alive would take millions of years instead of fractions of a second!",
      },
      {
        title: "💨 Air Quality & Pollution",
        description: "Smoke particles, viruses, and fine dust all experience Brownian motion in air. This affects how pollutants spread, how long they stay airborne, and how air purifiers can capture them using diffusion onto filter fibers.",
        fact: "HEPA filters rely partly on Brownian motion - tiny particles jiggle into filter fibers rather than flying straight through!",
      },
      {
        title: "🎨 Paints & Colloids",
        description: "Brownian motion keeps paint particles from settling! The constant jiggling prevents pigments from sinking to the bottom of the can, keeping paint mixed. This is why nano-particle paints stay uniform.",
        fact: "Milk is a colloid where fat droplets are kept suspended partly by Brownian motion - that's why unhomogenized milk separates!",
      },
      {
        title: "💹 Stock Market Models",
        description: "Financial mathematicians use random walk equations (inspired by Brownian motion) to model stock price movements! The unpredictable zigzag of prices mirrors the random path of particles.",
        fact: "The famous Black-Scholes option pricing formula is based on equations originally developed to describe Brownian motion!",
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
            🌍 Brownian Motion in Action
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
                  ? 'rgba(99, 102, 241, 0.2)'
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
            <p style={{ margin: 0, color: premiumDesign.colors.accent, fontWeight: 600 }}>
              💡 Fun Fact
            </p>
            <p style={{ margin: `${premiumDesign.spacing.sm}px 0 0`, color: premiumDesign.colors.text.secondary }}>
              {applications[activeApp].fact}
            </p>
          </div>

          {/* Mark as read button */}
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
              background: passed ? premiumDesign.colors.gradient.primary : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
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
                ? 'You have mastered Brownian motion!'
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
          <span style={{ color: premiumDesign.colors.primary, fontWeight: 600 }}>
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
                buttonStyle.borderColor = premiumDesign.colors.primary;
                buttonStyle.background = 'rgba(99, 102, 241, 0.2)';
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
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.primary, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
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
          background: premiumDesign.colors.gradient.primary,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Brownian Motion Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how invisible molecular collisions cause visible random motion - a phenomenon that proved atoms exist and powers life itself!
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
          <h3 style={{ color: premiumDesign.colors.primary, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Random molecular collisions cause Brownian motion</li>
            <li>Higher temperature = more vigorous motion</li>
            <li>Smaller particles show more noticeable jiggling</li>
            <li>Einstein proved this mathematically in 1905</li>
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
            background: premiumDesign.colors.gradient.cool,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🔬 Brownian Motion
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
