'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Experiment',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  temp: number;
}

interface ConvectionCurrentsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function ConvectionCurrentsRenderer({ onGameEvent, gamePhase, onPhaseComplete }: ConvectionCurrentsRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography responsive system
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

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - convection simulation
  const [particles, setParticles] = useState<Particle[]>([]);
  const [heatSource, setHeatSource] = useState<'bottom' | 'left' | 'right' | 'off'>('bottom');
  const [heatIntensity, setHeatIntensity] = useState(100);
  const [isSimulating, setIsSimulating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - pot of water simulation
  const [potParticles, setPotParticles] = useState<Particle[]>([]);
  const [burnerPower, setBurnerPower] = useState(0);
  const [isPotSimulating, setIsPotSimulating] = useState(false);
  const potAnimationRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      scenario: "You're heating a pot of soup on the stove and notice the vegetables near the bottom keep rising to the surface before sinking back down.",
      question: "What causes this circular movement of the vegetables in the soup?",
      options: [
        { id: 'a', label: "Magnetic forces from the metal pot" },
        { id: 'b', label: "The soup near the bottom becomes less dense when heated and rises, while cooler soup sinks", correct: true },
        { id: 'c', label: "Steam bubbles pushing the vegetables upward" },
        { id: 'd', label: "The stirring motion you created earlier" }
      ],
      explanation: "This is convection in action. When fluid is heated, it expands and becomes less dense. The buoyant force pushes this warm, less dense fluid upward. As it rises and moves away from the heat source, it cools, becomes denser, and sinks back down, creating a continuous circular current."
    },
    {
      scenario: "On a sunny beach day, you notice a steady breeze blowing from the ocean toward the land during the afternoon.",
      question: "Why does this sea breeze occur?",
      options: [
        { id: 'a', label: "The ocean pushes air toward land with its waves" },
        { id: 'b', label: "Land heats up faster than water, causing hot air to rise and cooler ocean air to flow in", correct: true },
        { id: 'c', label: "The moon's gravity pulls air toward the shore" },
        { id: 'd', label: "Trees on land attract the ocean air" }
      ],
      explanation: "Land has a lower specific heat capacity than water, so it heats up faster under the sun. The hot air over land rises, creating a low-pressure zone. Cooler, denser air from over the ocean flows in to replace it, creating a sea breeze. This is atmospheric convection."
    },
    {
      scenario: "An engineer is designing a home heating system and needs to decide where to place the heating vents.",
      question: "Where should the heating vents be placed for most efficient room heating through convection?",
      options: [
        { id: 'a', label: "On the ceiling, since heat rises" },
        { id: 'b', label: "Near the floor, so warm air rises and circulates throughout the room", correct: true },
        { id: 'c', label: "In the middle of the wall for even distribution" },
        { id: 'd', label: "Behind furniture where they're hidden" }
      ],
      explanation: "Heating vents placed near the floor allow warm air to rise naturally due to convection. As it rises, cooler air near the floor moves toward the vent to be heated, creating a continuous circulation that heats the entire room efficiently."
    },
    {
      scenario: "Geologists are studying Earth's interior and observe that the tectonic plates move slowly over millions of years.",
      question: "What drives the movement of tectonic plates according to convection theory?",
      options: [
        { id: 'a', label: "The rotation of the Earth spinning the plates" },
        { id: 'b', label: "Hot mantle material rises, spreads, cools, and sinks, dragging plates along", correct: true },
        { id: 'c', label: "Ocean water pressure pushing on the continents" },
        { id: 'd', label: "The gravitational pull of the moon" }
      ],
      explanation: "The Earth's mantle undergoes slow convection. Extremely hot material near the core rises toward the surface, spreads laterally as it cools, then sinks back down. This convection current in the mantle is believed to be a major driving force behind plate tectonics."
    },
    {
      scenario: "A chef notices that the top of their oven is much hotter than the bottom, even though the heating element is at the bottom.",
      question: "Why is the top of the oven hotter than the bottom?",
      options: [
        { id: 'a', label: "Heat from the element radiates upward only" },
        { id: 'b', label: "Hot air is less dense and rises, accumulating at the top of the enclosed space", correct: true },
        { id: 'c', label: "Cold air from outside leaks in at the bottom" },
        { id: 'd', label: "The oven door blocks heat at the bottom" }
      ],
      explanation: "Even though the heating element is at the bottom, the hot air it creates is less dense and rises to the top of the oven. This is why convection ovens have fans to circulate the air and create more even temperatures throughout."
    },
    {
      scenario: "Astronauts on the International Space Station are conducting experiments and notice that a candle flame behaves very differently in microgravity.",
      question: "Why would convection-driven processes behave differently in the absence of gravity?",
      options: [
        { id: 'a', label: "Fire cannot exist without gravity" },
        { id: 'b', label: "Without gravity, there's no buoyancy force to make less dense warm fluid rise", correct: true },
        { id: 'c', label: "Space has too much radiation for convection" },
        { id: 'd', label: "Oxygen doesn't work the same way in space" }
      ],
      explanation: "Convection relies on buoyancy, which requires gravity. In microgravity, warm, less dense fluid doesn't rise because there's no gravitational force creating the density-driven flow. In space, a candle flame is spherical because hot gases don't rise - they simply diffuse outward equally in all directions."
    },
    {
      scenario: "Weather forecasters are tracking the formation of a thunderstorm on a hot summer day.",
      question: "How does convection contribute to thunderstorm formation?",
      options: [
        { id: 'a', label: "Lightning creates convection currents in clouds" },
        { id: 'b', label: "The sun heats the ground, warm air rises rapidly, cools, and water vapor condenses into storm clouds", correct: true },
        { id: 'c', label: "Cold fronts blow convection upward" },
        { id: 'd', label: "Thunder shakes the air creating circulation" }
      ],
      explanation: "Strong surface heating creates powerful convection. Very warm, moist air rises rapidly, cooling as it ascends. When it cools enough, water vapor condenses, releasing heat energy that fuels further rising. This strong convective updraft creates the towering cumulonimbus clouds associated with thunderstorms."
    },
    {
      scenario: "A homeowner is trying to understand why their upstairs is always warmer than their downstairs during summer.",
      question: "What explains this temperature difference between floors?",
      options: [
        { id: 'a', label: "The roof absorbs heat and transfers it directly to the upstairs" },
        { id: 'b', label: "Warm air is less dense and naturally rises, accumulating on upper floors", correct: true },
        { id: 'c', label: "Air conditioning units work better on lower floors" },
        { id: 'd', label: "Windows upstairs let in more sunlight" }
      ],
      explanation: "Warm air is less dense than cool air and rises due to buoyancy. In a multi-story home, this means warm air naturally accumulates on upper floors while cooler, denser air settles on lower floors. This is why good HVAC design accounts for convection patterns in buildings."
    },
    {
      scenario: "A scientist is observing the sun and notices that its surface shows distinct granulation patterns - bright centers with darker edges.",
      question: "What causes these granulation patterns on the sun's surface?",
      options: [
        { id: 'a', label: "Magnetic storms creating visible patterns" },
        { id: 'b', label: "Convection cells where hot plasma rises in the center and cooler plasma sinks at the edges", correct: true },
        { id: 'c', label: "Nuclear explosions on the surface" },
        { id: 'd', label: "Sunspots spreading across the surface" }
      ],
      explanation: "Solar granulation is convection on a massive scale. Hot plasma from the sun's interior rises to the surface (appearing as bright granule centers), releases heat, cools, and sinks back down at the edges (appearing darker). Each granule is about the size of Texas!"
    },
    {
      scenario: "An engineer is designing a passive cooling system for a building in a hot climate without using electricity.",
      question: "How can convection be used for passive cooling?",
      options: [
        { id: 'a', label: "Paint the roof white to reflect heat" },
        { id: 'b', label: "Create openings at different heights so hot air rises and exits while cool air enters below", correct: true },
        { id: 'c', label: "Use thick walls to block all air movement" },
        { id: 'd', label: "Install mirrors to redirect sunlight" }
      ],
      explanation: "Stack ventilation uses convection for cooling. Hot air inside rises and exits through openings near the ceiling, creating negative pressure that draws cooler outside air in through lower openings. This creates continuous air circulation without any mechanical systems, using only the natural tendency of warm air to rise."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) {
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

  // Initialize particles for main simulation
  const initParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        id: i,
        x: 50 + Math.random() * 200,
        y: 50 + Math.random() * 200,
        vx: 0,
        vy: 0,
        temp: 20,
      });
    }
    setParticles(newParticles);
  }, []);

  // Initialize pot particles
  const initPotParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: 60 + Math.random() * 180,
        y: 80 + Math.random() * 140,
        vx: 0,
        vy: 0,
        temp: 20,
      });
    }
    setPotParticles(newParticles);
  }, []);

  useEffect(() => {
    if (phase === 'play') {
      initParticles();
    }
    if (phase === 'twist_play') {
      initPotParticles();
    }
  }, [phase, initParticles, initPotParticles]);

  // Main convection simulation
  useEffect(() => {
    if (phase === 'play' && isSimulating && heatSource !== 'off') {
      const simulate = () => {
        setParticles(prev => prev.map(p => {
          let newTemp = p.temp;
          let newVx = p.vx;
          let newVy = p.vy;

          // Heat source effects
          if (heatSource === 'bottom' && p.y > 220) {
            newTemp = Math.min(100, p.temp + 2);
          } else if (heatSource === 'left' && p.x < 80) {
            newTemp = Math.min(100, p.temp + 2);
          } else if (heatSource === 'right' && p.x > 220) {
            newTemp = Math.min(100, p.temp + 2);
          }

          // Cooling at top
          if (p.y < 80) {
            newTemp = Math.max(20, p.temp - 1);
          }

          // Buoyancy - hot rises, cold sinks
          const buoyancy = (newTemp - 50) * 0.02;
          newVy -= buoyancy;

          // Convection flow pattern
          if (heatSource === 'bottom') {
            if (p.y < 100 && newTemp > 60) {
              newVx += p.x < 150 ? -0.1 : 0.1;
            }
            if (p.y > 200 && newTemp < 40) {
              newVx += p.x < 150 ? 0.1 : -0.1;
            }
          }

          // Apply drag
          newVx *= 0.95;
          newVy *= 0.95;

          // Update position
          let newX = p.x + newVx;
          let newY = p.y + newVy;

          // Boundary collisions
          if (newX < 50) { newX = 50; newVx *= -0.5; }
          if (newX > 250) { newX = 250; newVx *= -0.5; }
          if (newY < 50) { newY = 50; newVy *= -0.5; }
          if (newY > 250) { newY = 250; newVy *= -0.5; }

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy, temp: newTemp };
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
  }, [phase, isSimulating, heatSource]);

  // Pot simulation
  useEffect(() => {
    if (phase === 'twist_play' && isPotSimulating && burnerPower > 0) {
      const simulate = () => {
        setPotParticles(prev => prev.map(p => {
          let newTemp = p.temp;
          let newVx = p.vx;
          let newVy = p.vy;

          // Heat from bottom (burner)
          if (p.y > 190) {
            newTemp = Math.min(100, p.temp + burnerPower * 0.3);
          }

          // Cool at sides
          if (p.x < 80 || p.x > 220) {
            newTemp = Math.max(20, p.temp - 0.5);
          }

          // Cool at surface
          if (p.y < 100) {
            newTemp = Math.max(20, p.temp - 0.3);
          }

          // Buoyancy
          const buoyancy = (newTemp - 50) * 0.025;
          newVy -= buoyancy;

          // Convection pattern - two cells
          const centerX = 150;
          if (p.y < 120 && newTemp > 60) {
            newVx += p.x < centerX ? -0.15 : 0.15;
          }
          if (p.y > 180 && newTemp < 50) {
            newVx += p.x < centerX ? 0.15 : -0.15;
          }

          // Drag
          newVx *= 0.94;
          newVy *= 0.94;

          // Update position
          let newX = p.x + newVx;
          let newY = p.y + newVy;

          // Pot boundaries
          if (newX < 60) { newX = 60; newVx *= -0.5; }
          if (newX > 240) { newX = 240; newVx *= -0.5; }
          if (newY < 80) { newY = 80; newVy *= -0.5; }
          if (newY > 220) { newY = 220; newVy *= -0.5; }

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy, temp: newTemp };
        }));

        potAnimationRef.current = requestAnimationFrame(simulate);
      };
      potAnimationRef.current = requestAnimationFrame(simulate);

      return () => {
        if (potAnimationRef.current) {
          cancelAnimationFrame(potAnimationRef.current);
        }
      };
    }
  }, [phase, isPotSimulating, burnerPower]);

  // Cleanup animations on phase change
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (potAnimationRef.current) cancelAnimationFrame(potAnimationRef.current);
    };
  }, [phase]);

  // Get temperature color
  const getTempColor = (temp: number) => {
    const t = (temp - 20) / 80;
    const r = Math.round(66 + t * 173);
    const g = Math.round(135 - t * 70);
    const b = Math.round(245 - t * 177);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper functions for UI elements (not React components)
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      minHeight: '52px',
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
        color: '#e2e8f0',
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
        onClick={() => {
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
          color: '#e2e8f0',
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
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${premiumDesign.spacing.md}px ${premiumDesign.spacing.lg}px`,
        background: 'rgba(15, 15, 26, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        zIndex: 1000,
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // Real-World Applications Data
  const realWorldApps = [
    {
      icon: "🌪️",
      title: "Weather Systems and Climate",
      short: "Meteorology",
      tagline: "The engine that drives global weather patterns",
      description: "Atmospheric convection is the primary mechanism driving weather systems across the globe. When the sun heats Earth's surface unevenly—land warms faster than water, dark surfaces absorb more heat than light ones—the air above these regions heats up, expands, becomes less dense, and rises. This creates low-pressure zones that draw in cooler, denser air from surrounding areas, generating winds. The rising warm air eventually cools at altitude, releases moisture as precipitation, and descends elsewhere, completing the convection cycle. This process creates everything from gentle sea breezes to massive hurricane systems spanning hundreds of kilometers.",
      connection: "Just like our simulation where heated particles rise and cooler ones sink, atmospheric convection creates vertical circulation cells. The temperature differential between Earth's equator and poles drives global wind patterns, while local temperature differences create regional weather phenomena like thunderstorms and monsoons.",
      howItWorks: "Solar radiation heats Earth's surface unevenly. Hot air rises, creating low pressure zones. Cooler air rushes in horizontally (wind) to replace it. Rising air cools adiabatically, water vapor condenses forming clouds. Cooled air descends in high-pressure zones, completing the cycle. The Coriolis effect from Earth's rotation deflects these flows, creating prevailing wind patterns and rotating storm systems.",
      stats: [
        { val: "12 km", label: "Troposphere convection height" },
        { val: "300 km/h", label: "Max hurricane wind speeds" },
        { val: "40%", label: "Earth's heat redistribution via convection" }
      ],
      examples: [
        "Hadley cells driving tropical trade winds",
        "Sea and land breezes in coastal regions",
        "Thunderstorm formation from summer heating",
        "Monsoon systems in South Asia"
      ],
      companies: ["NOAA", "NASA Earth Science", "European Centre for Medium-Range Weather Forecasts", "The Weather Company", "AccuWeather"],
      futureImpact: "Climate change is altering global convection patterns, shifting weather systems poleward and intensifying extreme events. Advanced climate models now simulate convection at unprecedented resolution, enabling more accurate long-term predictions. Understanding these changes is crucial for agriculture, disaster preparedness, and urban planning in a warming world.",
      color: "#06B6D4"
    },
    {
      icon: "🌊",
      title: "Ocean Circulation",
      short: "Oceanography",
      tagline: "The global conveyor belt regulating Earth's climate",
      description: "Thermohaline circulation—driven by differences in water temperature and salinity—creates a planet-spanning 'conveyor belt' that moves heat around the globe and profoundly influences climate. In polar regions, cold, salty water (made saltier by sea ice formation which excludes salt) becomes extremely dense and sinks to the ocean floor. This deep water flows toward the equator, while warm surface currents like the Gulf Stream flow poleward to replace it. This circulation takes about 1,000 years to complete one full cycle and transports an amount of heat equivalent to a million power plants.",
      connection: "Our convection simulation demonstrates this principle perfectly: temperature differences create density differences, which drive circulation. In the ocean, the 'heat source' is the tropical sun warming surface waters, while polar regions act as the 'cold sink' where water cools, increases in density, and descends—exactly like the particles in our simulation.",
      howItWorks: "Warm, less saline water flows poleward near the surface (e.g., Gulf Stream). In the North Atlantic, this water cools and evaporation increases salinity. Cold, salty water becomes dense enough to sink 2-4 km to the ocean floor. Deep water flows slowly toward the equator and into other ocean basins. Upwelling brings nutrients and cold water back to the surface, completing the cycle over centuries.",
      stats: [
        { val: "30 Sv", label: "Gulf Stream flow rate (Sverdrups)" },
        { val: "1000 yrs", label: "Full circulation cycle time" },
        { val: "5°C", label: "Europe warmer due to Gulf Stream" }
      ],
      examples: [
        "Gulf Stream warming Western Europe",
        "Antarctic Bottom Water formation",
        "El Niño oscillation disrupting normal patterns",
        "Coastal upwelling supporting fisheries"
      ],
      companies: ["NOAA Ocean Service", "Woods Hole Oceanographic Institution", "Scripps Institution of Oceanography", "GEOMAR Helmholtz Centre"],
      futureImpact: "Climate scientists warn that melting polar ice could disrupt thermohaline circulation by adding freshwater that prevents dense water formation. A weakened Gulf Stream could paradoxically cool Europe even as global temperatures rise. Monitoring ocean circulation patterns has become critical for predicting climate tipping points and understanding our planet's thermal regulation system.",
      color: "#3B82F6"
    },
    {
      icon: "💻",
      title: "Computer Cooling Systems",
      short: "Electronics Engineering",
      tagline: "Keeping processors cool through fluid dynamics",
      description: "Modern computer processors generate tremendous heat—up to 250 watts in high-performance CPUs—concentrated in an area smaller than a postage stamp. Without effective cooling, temperatures would quickly exceed safe limits, causing thermal throttling, system instability, or permanent damage. Convection-based cooling systems, from simple heatsinks with fans to sophisticated liquid cooling loops, use the principle that heated fluid naturally rises and carries heat away. This allows continuous heat removal without requiring the fluid to be actively pumped in some designs, making convection a fundamental principle in thermal management.",
      connection: "Our simulation shows how heated particles gain kinetic energy, spread apart, and rise while cooler, denser particles sink. In a heatsink, metal fins conduct heat from the CPU into the surrounding air. The heated air rises by natural convection, drawing cooler air in from below. Adding a fan forces this convection, dramatically increasing heat transfer rates.",
      howItWorks: "Heat conducts from the processor through thermal paste to a metal heatsink base. The heatsink's extended fins increase surface area for air contact. Natural convection causes heated air to rise between fins. Fans add forced convection, moving air at 1-3 m/s across fin surfaces. In liquid cooling, water or coolant absorbs heat, flows to a radiator where convection transfers heat to air, then returns cooled to the CPU block.",
      stats: [
        { val: "250W", label: "Max TDP in high-end CPUs" },
        { val: "95°C", label: "Typical CPU thermal limit" },
        { val: "10-20x", label: "Forced vs natural convection improvement" }
      ],
      examples: [
        "Tower heatsinks in desktop computers",
        "All-in-one liquid coolers for gaming PCs",
        "Passive convection cooling in fanless designs",
        "Data center hot/cold aisle configurations"
      ],
      companies: ["Noctua", "Corsair", "NZXT", "CoolerMaster", "EKWB"],
      futureImpact: "As processors become more powerful and compact, innovative cooling solutions are emerging. Two-phase immersion cooling submerges entire servers in dielectric fluid that boils at low temperatures, using phase-change convection for extreme efficiency. 3D-printed microstructured heatsinks optimize convection patterns, while AI-controlled fans dynamically adjust airflow based on predictive thermal models.",
      color: "#8B5CF6"
    },
    {
      icon: "🌋",
      title: "Mantle Convection and Plate Tectonics",
      short: "Geology",
      tagline: "The slow churning that shapes continents",
      description: "Deep beneath Earth's surface, the mantle—a 2,900 km thick layer of hot rock—flows like an extremely viscous fluid over geological timescales. Radioactive decay and residual heat from Earth's formation create temperature differences of over 3,000°C between the core-mantle boundary and the surface. This drives convection cells that slowly circulate mantle material, taking hundreds of millions of years to complete. These convection currents are the driving force behind plate tectonics: they drag continental and oceanic plates, creating mid-ocean ridges where plates spread apart and subduction zones where they collide.",
      connection: "Our simulation demonstrates convection in minutes; Earth's mantle performs the same process over millions of years. Hot material rises at mid-ocean ridges (like heated particles rising from our heat source), spreads laterally while cooling, then descends at subduction zones (like cooled particles sinking). The same physics applies regardless of timescale.",
      howItWorks: "Heat from Earth's core and radioactive decay warms the lower mantle. Hot, less dense rock rises in plumes toward the lithosphere. Rising material spreads horizontally, pushing tectonic plates. Rock cools near the surface, becomes denser, and eventually descends at subduction zones. Sinking slabs pull plates, adding to convection-driven plate motion. Complete circulation takes 100-200 million years.",
      stats: [
        { val: "1-10 cm/yr", label: "Plate movement speed" },
        { val: "2900 km", label: "Mantle thickness" },
        { val: "4000°C", label: "Core-mantle boundary temperature" }
      ],
      examples: [
        "Mid-Atlantic Ridge seafloor spreading",
        "Pacific Ring of Fire subduction volcanism",
        "Hawaiian hotspot from mantle plume",
        "Continental drift over geological time"
      ],
      companies: ["USGS", "Geological Society of America", "British Geological Survey", "GeoForschungsZentrum Potsdam"],
      futureImpact: "Seismic tomography now maps mantle convection in unprecedented detail, revealing plume structures and subducted slabs. Understanding mantle dynamics helps predict volcanic activity, earthquake patterns, and long-term continental configurations. This knowledge is essential for assessing geothermal energy potential and understanding how plate tectonics regulates Earth's carbon cycle and climate over geological timescales.",
      color: "#EF4444"
    }
  ];

  // Phase Renderers
  function renderHookPhase() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '48px 24px', textAlign: 'center' }}>
        {/* Premium badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
          <span style={{ width: '8px', height: '8px', background: '#fb923c', borderRadius: '50%' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#fb923c', letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
        </div>

        {/* Main title with gradient */}
        <h1 style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #fed7aa, #fecaca)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Convection Currents
        </h1>

        <p style={{ fontSize: '18px', color: '#e2e8f0', maxWidth: '28rem', marginBottom: '40px' }}>
          Discover how temperature differences create flowing currents in fluids
        </p>

        {/* Premium card with content */}
        <div style={{ position: 'relative', background: 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '36rem', width: '100%', border: '1px solid rgba(51, 65, 85, 0.5)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          {/* Subtle glow effect */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(249, 115, 22, 0.05), transparent, rgba(239, 68, 68, 0.05))', borderRadius: '24px' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔥</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, lineHeight: 1.6 }}>
                Have you ever watched smoke rise from a campfire?
              </p>
              <p style={{ fontSize: '18px', color: '#e2e8f0', lineHeight: 1.6 }}>
                It rises in a graceful, billowing column. But why does hot smoke know to go UP?
              </p>
              <div style={{ paddingTop: '8px' }}>
                <p style={{ fontSize: '16px', color: '#fb923c', fontWeight: 600 }}>
                  Uncover the force that drives ocean currents and creates weather patterns!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onClick={() => goToPhase('predict')}
          style={{
            marginTop: '40px',
            padding: '20px 40px',
            background: 'linear-gradient(to right, #f97316, #dc2626)',
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.25)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            Explore Convection
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: '#e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fb923c' }}>✦</span>
            Interactive Lab
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fb923c' }}>✦</span>
            Real-World Examples
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fb923c' }}>✦</span>
            Knowledge Test
          </div>
        </div>

        {renderBottomBar(
          undefined,
          { text: 'Start Discovery →', onClick: () => goToPhase('predict') }
        )}
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'rises', text: "Hot fluid rises because it expands and becomes lighter" },
      { id: 'sinks', text: "Hot fluid sinks because heat makes things fall" },
      { id: 'stays', text: "Hot fluid stays in place - heat doesn't affect movement" },
      { id: 'random', text: "Hot fluid moves randomly in all directions" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', paddingBottom: '16px' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: premiumDesign.spacing.md,
          }}>
            Make Your Prediction
          </h2>
          <p style={{
            color: '#e2e8f0',
            fontSize: '16px',
          }}>
            When you heat water at the bottom of a container, what do you think happens to the warm water?
          </p>
          <p style={{
            color: '#e2e8f0',
            fontSize: '14px',
            marginTop: premiumDesign.spacing.sm,
          }}>
            Step 1 of 2: Select your prediction below
          </p>
        </div>

        {/* Static Preview SVG */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 400,
          margin: `0 auto ${premiumDesign.spacing.lg}px`,
        }}>
          <svg viewBox="0 0 300 200" style={{ width: '100%', maxHeight: 200 }}>
            <defs>
              <linearGradient id="predictTempGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {/* Background */}
            <rect x="0" y="0" width="300" height="200" fill="#0a0f1a" />
            {/* Container */}
            <rect x="50" y="30" width="200" height="140" fill="rgba(100,116,139,0.2)" stroke="#94a3b8" strokeWidth="2" rx="4" />
            {/* Heat source indicator */}
            <rect x="60" y="155" width="180" height="12" fill="#ef4444" rx="4" opacity="0.8" />
            {/* Static particles - cold at top, warm at bottom */}
            <circle cx="100" cy="60" r="8" fill="#3b82f6" opacity="0.8" />
            <circle cx="150" cy="55" r="8" fill="#3b82f6" opacity="0.8" />
            <circle cx="200" cy="65" r="8" fill="#3b82f6" opacity="0.8" />
            <circle cx="120" cy="100" r="8" fill="#8b5cf6" opacity="0.8" />
            <circle cx="180" cy="95" r="8" fill="#8b5cf6" opacity="0.8" />
            <circle cx="90" cy="140" r="8" fill="#ef4444" opacity="0.8" />
            <circle cx="150" cy="135" r="8" fill="#f97316" opacity="0.8" />
            <circle cx="210" cy="140" r="8" fill="#ef4444" opacity="0.8" />
            {/* Labels */}
            <text x="150" y="20" fill="#e2e8f0" fontSize="12" textAnchor="middle" fontWeight="600">Container with Water</text>
            <text x="150" y="185" fill="#fbbf24" fontSize="11" textAnchor="middle">Heat Source (Bottom)</text>
            <text x="260" y="60" fill="#3b82f6" fontSize="11" textAnchor="start">Cold</text>
            <text x="260" y="140" fill="#ef4444" fontSize="11" textAnchor="start">Hot</text>
            {/* Question mark */}
            <text x="150" y="105" fill="#fbbf24" fontSize="24" textAnchor="middle" fontWeight="700">?</text>
          </svg>
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
                minHeight: '52px',
                borderRadius: premiumDesign.radius.lg,
                border: prediction === p.id
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(99, 102, 241, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: '#e2e8f0',
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onClick={() => setPrediction(p.id)}
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
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', paddingBottom: '16px' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Convection Current Simulator
          </h2>
          <p style={{ color: '#e2e8f0' }}>
            Adjust the heat source position and observe how temperature differences create fluid flow
          </p>
        </div>

        {/* What to Watch guidance box */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.15)',
          borderRadius: premiumDesign.radius.lg,
          padding: premiumDesign.spacing.md,
          marginBottom: premiumDesign.spacing.lg,
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}>
          <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, fontWeight: 600 }}>
            What to Watch: Notice how hot particles (red) rise upward while cool particles (blue) sink downward, creating a circular convection current.
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
            position: 'relative',
          }}>
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
              {/* Premium SVG Definitions */}
              <defs>
                {/* Hot zone gradient - warm colors with multiple stops */}
                <linearGradient id="convHotZoneH" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
                  <stop offset="25%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
                  <stop offset="75%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="convHotZoneV" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
                  <stop offset="25%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
                  <stop offset="75%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.9" />
                </linearGradient>

                {/* Cold zone gradient - cool colors */}
                <linearGradient id="convColdZone" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="0.6" />
                  <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
                  <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0.6" />
                </linearGradient>

                {/* Container glass gradient */}
                <linearGradient id="convContainerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
                  <stop offset="30%" stopColor="#64748b" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#475569" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#334155" stopOpacity="0.4" />
                </linearGradient>

                {/* Temperature legend gradient */}
                <linearGradient id="convTempLegend" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#1e40af" />
                  <stop offset="25%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="75%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>

                {/* Particle glow gradient */}
                <radialGradient id="convParticleGlowHot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="40%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="convParticleGlowCold" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                  <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
                </radialGradient>

                {/* Heat glow filter */}
                <filter id="convHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Particle glow filter */}
                <filter id="convParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow glow filter */}
                <filter id="convArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Flow arrow marker */}
                <marker id="convArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,255,255,0.8)" />
                </marker>

                {/* Background pattern */}
                <pattern id="convGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                </pattern>
              </defs>

              {/* Background with grid */}
              <rect x="0" y="0" width="300" height="300" fill="#0a0f1a" />
              <rect x="0" y="0" width="300" height="300" fill="url(#convGridPattern)" />

              {/* Container with glass effect */}
              <rect x="40" y="40" width="220" height="220" fill="url(#convContainerGlass)" stroke="rgba(148,163,184,0.4)" strokeWidth="2" rx="8" />
              <rect x="42" y="42" width="216" height="216" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" rx="6" />

              {/* Cold zone indicator at top */}
              <rect x="50" y="45" width="200" height="8" fill="url(#convColdZone)" rx="4" opacity="0.6" />

              {/* Heat source indicators with glow */}
              {heatSource === 'bottom' && (
                <g filter="url(#convHeatGlow)">
                  <rect x="50" y="250" width="200" height="12" fill="url(#convHotZoneH)" rx="6" />
                  <rect x="60" y="252" width="180" height="8" fill="#fbbf24" opacity="0.4" rx="4">
                    <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1s" repeatCount="indefinite" />
                  </rect>
                </g>
              )}
              {heatSource === 'left' && (
                <g filter="url(#convHeatGlow)">
                  <rect x="28" y="50" width="12" height="200" fill="url(#convHotZoneV)" rx="6" />
                  <rect x="30" y="60" width="8" height="180" fill="#fbbf24" opacity="0.4" rx="4">
                    <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1s" repeatCount="indefinite" />
                  </rect>
                </g>
              )}
              {heatSource === 'right' && (
                <g filter="url(#convHeatGlow)">
                  <rect x="260" y="50" width="12" height="200" fill="url(#convHotZoneV)" rx="6" />
                  <rect x="262" y="60" width="8" height="180" fill="#fbbf24" opacity="0.4" rx="4">
                    <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1s" repeatCount="indefinite" />
                  </rect>
                </g>
              )}

              {/* Particles with glow effect */}
              {particles.map(p => (
                <g key={p.id} filter="url(#convParticleGlow)">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={6}
                    fill={getTempColor(p.temp)}
                    opacity="0.9"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={p.temp > 60 ? '#fef3c7' : '#dbeafe'}
                    opacity="0.6"
                  />
                </g>
              ))}

              {/* Flow arrows when simulating with glow */}
              {isSimulating && heatSource === 'bottom' && (
                <g opacity={0.6} filter="url(#convArrowGlow)">
                  <path d="M150 210 L150 90" stroke="url(#convTempLegend)" strokeWidth="3" markerEnd="url(#convArrow)" />
                  <path d="M100 70 L60 70 L60 230 L100 230" stroke="rgba(96,165,250,0.8)" strokeWidth="2" fill="none" markerEnd="url(#convArrow)" />
                  <path d="M200 70 L240 70 L240 230 L200 230" stroke="rgba(96,165,250,0.8)" strokeWidth="2" fill="none" markerEnd="url(#convArrow)" />
                </g>
              )}

              {/* Temperature legend */}
              <g transform="translate(268, 50)">
                <rect x="0" y="10" width="18" height="90" fill="url(#convTempLegend)" rx="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              </g>

              {/* Grid lines for visual reference */}
              <line x1="50" y1="100" x2="250" y2="100" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
              <line x1="50" y1="150" x2="250" y2="150" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
              <line x1="50" y1="200" x2="250" y2="200" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
              <line x1="100" y1="50" x2="100" y2="250" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
              <line x1="150" y1="50" x2="150" y2="250" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />
              <line x1="200" y1="50" x2="200" y2="250" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" opacity="0.3" />

              {/* Temperature profile curve responding to heat intensity */}
              <path
                d={`M 50 ${250 - heatIntensity * 0.3} L 70 ${250 - heatIntensity * 0.6} L 90 ${250 - heatIntensity * 1.0} L 110 ${250 - heatIntensity * 1.4} L 130 ${250 - heatIntensity * 1.7} L 150 ${250 - heatIntensity * 1.85} L 170 ${250 - heatIntensity * 1.7} L 190 ${250 - heatIntensity * 1.4} L 210 ${250 - heatIntensity * 1.0} L 230 ${250 - heatIntensity * 0.6} L 250 ${250 - heatIntensity * 0.3}`}
                stroke="#f97316"
                strokeWidth="2"
                fill="none"
                opacity="0.7"
              />

              {/* Interactive point on the curve */}
              <circle
                cx={150}
                cy={250 - heatIntensity * 1.85}
                r={8}
                filter="url(#convParticleGlow)"
                stroke="#fff"
                strokeWidth={2}
                fill="#f97316"
              />

              {/* Axis labels */}
              <text x="150" y="298" fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">Position (horizontal)</text>
              <text x="12" y="150" fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle" transform="rotate(-90, 12, 150)">Temperature</text>

              {/* SVG Labels for accessibility and educational clarity */}
              <text x="150" y="15" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="600">Fluid Container</text>
              <text x="150" y="278" fill="#fbbf24" fontSize="11" textAnchor="middle">{heatSource !== 'off' ? 'Heat Source Active' : 'Heat Source Off'}</text>
              <text x="28" y="60" fill="#3b82f6" fontSize="11" textAnchor="middle">Cold</text>
              <text x="28" y="248" fill="#ef4444" fontSize="11" textAnchor="middle">Hot</text>
              <text x="150" y="55" fill="#60a5fa" fontSize="11" textAnchor="middle">Cooling Region</text>
            </svg>

            {/* Labels outside SVG using typo system */}
            <div style={{
              position: 'absolute',
              right: isMobile ? '8px' : '12px',
              top: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}>
              <span style={{ fontSize: typo.label, color: premiumDesign.colors.text.muted, fontWeight: 600 }}>TEMP</span>
              <div style={{ height: '90px' }} />
              <span style={{ fontSize: typo.label, color: '#ef4444', fontWeight: 500 }}>Hot</span>
              <div style={{ height: '60px' }} />
              <span style={{ fontSize: typo.label, color: '#3b82f6', fontWeight: 500 }}>Cold</span>
            </div>

            {/* Heat source label */}
            {heatSource !== 'off' && (
              <div style={{
                position: 'absolute',
                bottom: isMobile ? '8px' : '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: typo.small,
                color: '#f97316',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                Heat Source Active
              </div>
            )}
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
              <h4 style={{ color: '#e2e8f0', marginBottom: premiumDesign.spacing.md }}>
                Heat Source Position
              </h4>
              {['bottom', 'left', 'right', 'off'].map((pos) => (
                <button
                  key={pos}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: premiumDesign.spacing.sm,
                    minHeight: '44px',
                    marginBottom: premiumDesign.spacing.xs,
                    borderRadius: premiumDesign.radius.md,
                    border: heatSource === pos ? `2px solid ${premiumDesign.colors.primary}` : '1px solid rgba(255,255,255,0.1)',
                    background: heatSource === pos ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                  onClick={() => setHeatSource(pos as 'bottom' | 'left' | 'right' | 'off')}
                >
                  {pos === 'off' ? 'Off' : `${pos}`}
                </button>
              ))}
            </div>

            {/* Temperature Control Slider */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: '#e2e8f0', marginBottom: premiumDesign.spacing.sm }}>
                Heat Intensity: {heatIntensity}%
              </h4>
              <input
                type="range"
                min="0"
                max="100"
                value={heatIntensity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHeatIntensity(val);
                  if (val < 10) {
                    setHeatSource('off');
                  } else if (heatSource === 'off') {
                    setHeatSource('bottom');
                  }
                }}
                onInput={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setHeatIntensity(val);
                  if (val < 10) {
                    setHeatSource('off');
                  } else if (heatSource === 'off') {
                    setHeatSource('bottom');
                  }
                }}
                aria-label="Heat Intensity Control"
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#e2e8f0',
                marginTop: premiumDesign.spacing.xs,
              }}>
                <span>Off</span>
                <span>Max</span>
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {renderButton(
                isSimulating ? 'Pause' : 'Start Simulation',
                () => setIsSimulating(!isSimulating),
                isSimulating ? 'secondary' : 'primary'
              )}
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: premiumDesign.spacing.sm,
                  minHeight: '44px',
                  marginTop: premiumDesign.spacing.sm,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
                onClick={() => initParticles()}
              >
                Reset Particles
              </button>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
                Tip: Watch how hot particles (red) rise and cool particles (blue) sink, creating circular convection currents!
              </p>
            </div>

            {/* Formula display */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginTop: premiumDesign.spacing.md,
            }}>
              <p style={{ color: premiumDesign.colors.primary, fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                Convection Formula
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>
                F = (ρ_cold − ρ_hot) × g × V
              </p>
              <p style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '12px', margin: '4px 0 0 0' }}>
                Buoyancy force is defined as the density difference between cold and hot fluid, multiplied by gravity and volume. This relationship describes how temperature causes density changes that drive convection.
              </p>
            </div>

            {/* Real-world relevance */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(245, 158, 11, 0.3)',
              marginTop: premiumDesign.spacing.md,
            }}>
              <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: premiumDesign.spacing.xs, margin: 0 }}>
                Real-World Connection
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '14px', margin: `${premiumDesign.spacing.xs}px 0 0 0` }}>
                This same convection process drives ocean currents, weather patterns, and even the movement of tectonic plates in Earth's mantle!
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
        title: "Why Hot Fluid Rises",
        content: "As you observed in the simulation, when fluid is heated, its molecules gain energy and move faster, spreading apart. This makes the fluid expand and become less dense than the cooler fluid around it. Due to buoyancy, the less dense hot fluid is pushed upward by the denser cold fluid.",
        formula: "Density relationship: ρ = m ÷ V  |  ρ_hot < ρ_cold",
      },
      {
        title: "The Convection Cycle",
        content: "You saw how hot fluid rises, cooler fluid moves in to take its place near the heat source. The risen hot fluid then cools at the top, becomes denser, and sinks back down. This creates a continuous circular current!",
        formula: "Buoyancy Force: F = (ρ_cold − ρ_hot) × g × V",
      },
      {
        title: "Your Prediction",
        content: prediction === 'rises'
          ? "You predicted correctly! As you noticed, hot fluid does rise because it expands and becomes less dense (lighter per unit volume). This is the fundamental principle of convection."
          : "You observed that hot fluid rises because it expands and becomes less dense. Density differences create buoyancy forces that drive convection currents.",
        formula: "Convection Rate ∝ ΔT × √(g × β)",
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
            📊 Understanding Convection
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
                onClick={() => setReviewStep(i)}
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
      { id: 'even', text: "The water heats evenly throughout the pot" },
      { id: 'bottom', text: "Only the water at the bottom gets hot" },
      { id: 'cells', text: "Convection cells form, distributing heat throughout" },
      { id: 'top', text: "The top heats first because heat rises" },
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
            🔄 The Twist: Boiling a Pot of Water
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            When you heat a pot of water on a stove, the heat comes from the bottom. What happens to the water?
          </p>
        </div>

        {/* Preview SVG showing pot setup */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 350,
          margin: `0 auto ${premiumDesign.spacing.lg}px`,
        }}>
          <svg viewBox="0 0 300 200" style={{ width: '100%', maxHeight: 180 }}>
            <rect x="0" y="0" width="300" height="200" fill="#0a0f1a" />
            {/* Pot outline */}
            <path d="M60 50 L60 150 Q60 170 80 170 L220 170 Q240 170 240 150 L240 50" fill="none" stroke="#9ca3af" strokeWidth="4" />
            {/* Water */}
            <rect x="65" y="55" width="170" height="110" fill="rgba(59, 130, 246, 0.3)" />
            {/* Burner */}
            <rect x="80" y="180" width="140" height="12" fill="#ef4444" rx="6" />
            {/* Question mark */}
            <text x="150" y="115" fill="#fbbf24" fontSize="40" textAnchor="middle" fontWeight="700">?</text>
            <text x="150" y="25" fill="#e2e8f0" fontSize="12" textAnchor="middle">Pot of Water</text>
            <text x="150" y="198" fill="#fbbf24" fontSize="11" textAnchor="middle">Heat Source</text>
          </svg>
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
                borderRadius: `${premiumDesign.radius.lg}px`,
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
              onClick={() => setTwistPrediction(p.id)}
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
            Pot of Water Simulation
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Heat water from below and watch convection cells form
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Pot Simulation */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
          }}>
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
              {/* Premium SVG Definitions for Pot Simulation */}
              <defs>
                {/* Pot metal gradient - brushed steel look */}
                <linearGradient id="convPotMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4b5563" />
                  <stop offset="20%" stopColor="#6b7280" />
                  <stop offset="40%" stopColor="#9ca3af" />
                  <stop offset="60%" stopColor="#6b7280" />
                  <stop offset="80%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Pot interior shadow gradient */}
                <linearGradient id="convPotInterior" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#0f172a" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.7" />
                </linearGradient>

                {/* Handle gradient */}
                <linearGradient id="convHandleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Burner heat gradient - radial for glow effect */}
                <radialGradient id="convBurnerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="30%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>

                {/* Burner coil gradient */}
                <linearGradient id="convBurnerCoil" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1f2937" />
                  <stop offset="25%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#4b5563" />
                  <stop offset="75%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Active burner coil (hot) */}
                <linearGradient id="convBurnerCoilHot" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7f1d1d" />
                  <stop offset="25%" stopColor="#dc2626" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="75%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>

                {/* Water surface gradient */}
                <linearGradient id="convWaterSurface" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
                </linearGradient>

                {/* Steam gradient */}
                <radialGradient id="convSteamGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
                </radialGradient>

                {/* Convection arrow gradient */}
                <linearGradient id="convFlowArrow" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                </linearGradient>

                {/* Heat glow filter */}
                <filter id="convPotHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Particle glow filter */}
                <filter id="convPotParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Steam blur filter */}
                <filter id="convSteamBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>

                {/* Arrow glow filter */}
                <filter id="convPotArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow marker */}
                <marker id="convPotArrowUp" markerWidth="10" markerHeight="10" refX="5" refY="10" orient="auto">
                  <path d="M0,10 L5,0 L10,10" fill="rgba(255,255,255,0.8)" />
                </marker>

                {/* Background pattern */}
                <pattern id="convPotGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                </pattern>
              </defs>

              {/* Background */}
              <rect x="0" y="0" width="300" height="300" fill="#0a0f1a" />
              <rect x="0" y="0" width="300" height="300" fill="url(#convPotGridPattern)" />

              {/* Burner glow (behind pot) */}
              {burnerPower > 0 && (
                <g filter="url(#convPotHeatGlow)">
                  <ellipse
                    cx="150"
                    cy="268"
                    rx={50 + burnerPower * 12}
                    ry={12 + burnerPower * 3}
                    fill="url(#convBurnerGlow)"
                    opacity={0.4 + burnerPower * 0.12}
                  >
                    <animate attributeName="opacity" values={`${0.3 + burnerPower * 0.1};${0.5 + burnerPower * 0.1};${0.3 + burnerPower * 0.1}`} dur="0.8s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              )}

              {/* Burner coils */}
              <circle cx="150" cy="270" r="42" fill="none" stroke={burnerPower > 0 ? "url(#convBurnerCoilHot)" : "url(#convBurnerCoil)"} strokeWidth="4" />
              <circle cx="150" cy="270" r="30" fill="none" stroke={burnerPower > 0 ? "url(#convBurnerCoilHot)" : "url(#convBurnerCoil)"} strokeWidth="3" />
              <circle cx="150" cy="270" r="18" fill="none" stroke={burnerPower > 0 ? "url(#convBurnerCoilHot)" : "url(#convBurnerCoil)"} strokeWidth="3" />

              {/* Pot interior (shadow) */}
              <path
                d="M55 75 L55 225 Q55 245 75 245 L225 245 Q245 245 245 225 L245 75"
                fill="url(#convPotInterior)"
              />

              {/* Water surface indicator */}
              <rect x="58" y="78" width="184" height="6" fill="url(#convWaterSurface)" rx="3" />

              {/* Water particles with glow */}
              {potParticles.map(p => (
                <g key={p.id} filter="url(#convPotParticleGlow)">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={7}
                    fill={getTempColor(p.temp)}
                    opacity="0.9"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={3.5}
                    fill={p.temp > 60 ? '#fef3c7' : '#dbeafe'}
                    opacity="0.5"
                  />
                </g>
              ))}

              {/* Pot shape with metal gradient */}
              <path
                d="M50 70 L50 230 Q50 250 70 250 L230 250 Q250 250 250 230 L250 70"
                fill="none"
                stroke="url(#convPotMetal)"
                strokeWidth="7"
              />
              {/* Pot rim highlight */}
              <path
                d="M50 70 L250 70"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />

              {/* Pot handles with gradient */}
              <ellipse cx="28" cy="150" rx="16" ry="32" fill="none" stroke="url(#convHandleGrad)" strokeWidth="5" />
              <ellipse cx="272" cy="150" rx="16" ry="32" fill="none" stroke="url(#convHandleGrad)" strokeWidth="5" />

              {/* Convection arrows when active with glow */}
              {isPotSimulating && burnerPower > 0 && (
                <g opacity={0.5} filter="url(#convPotArrowGlow)">
                  {/* Left cell */}
                  <path d="M100 205 L100 115 L68 115 L68 205" stroke="rgba(96,165,250,0.7)" strokeWidth="2.5" fill="none" strokeDasharray="6,4" />
                  {/* Right cell */}
                  <path d="M200 205 L200 115 L232 115 L232 205" stroke="rgba(96,165,250,0.7)" strokeWidth="2.5" fill="none" strokeDasharray="6,4" />
                  {/* Center up arrow */}
                  <path d="M150 215 L150 95" stroke="url(#convFlowArrow)" strokeWidth="3" markerEnd="url(#convPotArrowUp)" />
                </g>
              )}

              {/* Steam bubbles at high heat with blur */}
              {burnerPower > 2 && isPotSimulating && (
                <g filter="url(#convSteamBlur)">
                  {[...Array(7)].map((_, i) => (
                    <circle
                      key={i}
                      cx={85 + i * 22}
                      cy={70}
                      r={4 + Math.random() * 2}
                      fill="url(#convSteamGrad)"
                    >
                      <animate
                        attributeName="cy"
                        values="75;45;75"
                        dur={`${0.8 + i * 0.15}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.2;0.6"
                        dur={`${0.8 + i * 0.15}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </g>
              )}
            </svg>

            {/* Labels outside SVG using typo system */}
            {burnerPower > 0 && (
              <div style={{
                position: 'absolute',
                bottom: isMobile ? '8px' : '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: typo.small,
                color: '#f97316',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                Burner Active - Power Level {burnerPower}
              </div>
            )}
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
                🔥 Burner Power: {burnerPower}
              </h4>
              <input
                type="range"
                min="0"
                max="5"
                value={burnerPower}
                onChange={(e) => setBurnerPower(Number(e.target.value))}
                onInput={(e) => setBurnerPower(Number((e.target as HTMLInputElement).value))}
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: premiumDesign.colors.text.muted,
                marginTop: premiumDesign.spacing.xs,
              }}>
                <span>Off</span>
                <span>Low</span>
                <span>Med</span>
                <span>High</span>
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {renderButton(
                isPotSimulating ? '⏸ Pause' : '▶️ Start Heating',
                () => setIsPotSimulating(!isPotSimulating),
                isPotSimulating ? 'secondary' : 'primary'
              )}
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: premiumDesign.spacing.sm,
                  marginTop: premiumDesign.spacing.sm,
                  borderRadius: premiumDesign.radius.md,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: premiumDesign.colors.text.secondary,
                  cursor: 'pointer',
                }}
                onClick={() => initPotParticles()}
              >
                🔄 Reset Water
              </button>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Notice how water near the bottom heats up (turns red), rises to the top, cools (turns blue), and sinks along the sides!
              </p>
            </div>

            {/* Average temperature display */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: premiumDesign.colors.text.muted }}>
                Average Water Temp
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: premiumDesign.colors.primary }}>
                {Math.round(potParticles.reduce((sum, p) => sum + p.temp, 0) / (potParticles.length || 1))}°C
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
        title: "Convection Cells Form",
        content: "When you heat water from below, convection cells form! Hot water at the bottom rises in the center, spreads across the surface, cools along the edges and walls, then sinks back down to be heated again.",
        highlight: twistPrediction === 'cells'
          ? "Excellent! You correctly predicted that convection cells would form."
          : "The correct answer was that convection cells form, distributing heat throughout the pot.",
      },
      {
        title: "Why This Matters",
        content: "This is why you can heat an entire pot of water with just a burner at the bottom! Convection naturally circulates heat throughout the fluid, making it an efficient way to cook and warm things.",
      },
      {
        title: "Two-Cell Pattern",
        content: "In a typical pot, two convection cells form - one on each side. Water rises in the center where it's hottest, flows outward at the top, cools along the sides, and descends back to the bottom.",
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
            🔍 Twist Analysis
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
              background: twistPrediction === 'cells'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'cells' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'cells' ? premiumDesign.colors.success : '#EF4444',
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
                onClick={() => setTwistReviewStep(i)}
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
        title: "🌊 Ocean Currents",
        description: "The Gulf Stream and other ocean currents are massive convection cells powered by temperature and salinity differences. Warm water near the equator rises and flows toward the poles as surface currents, while cold polar water sinks and flows back toward the equator along the ocean floor. This thermohaline circulation acts as a global conveyor belt, redistributing heat and nutrients across the planet. Scientists at NOAA and the Woods Hole Oceanographic Institution continuously monitor these currents using satellite altimetry and deep-ocean sensors to understand how climate change affects circulation patterns.",
        fact: "The Gulf Stream transports about 30 million cubic meters of water per second, warming Western Europe by approximately 5°C compared to similar latitudes elsewhere.",
        stats: "30 Sv flow rate | 1000 year cycle | 5°C warming effect",
      },
      {
        title: "🌤️ Weather & Wind",
        description: "Most weather patterns are driven by atmospheric convection. The sun heats the Earth's surface unevenly, creating rising warm air and sinking cool air. This convection drives winds, thunderstorms, and global circulation patterns like the Hadley cells that span from the equator to 30 degrees latitude. Meteorologists at the National Weather Service and the European Centre for Medium-Range Weather Forecasts use convection models to predict severe weather events including hurricanes that can generate wind speeds exceeding 300 km/h.",
        fact: "Sea breezes occur because land heats faster than water during the day. Thunderstorm updrafts can reach heights of 12 km in the troposphere.",
        stats: "12 km convection height | 300 km/h hurricane winds | 40% heat redistribution",
      },
      {
        title: "🏠 Home Heating",
        description: "Engineers at companies like Honeywell, Carrier, and Trane design HVAC systems that leverage convection for efficient climate control. Radiators and forced-air heating systems use convection to circulate warm air through buildings. Natural convection causes heated air to rise from baseboard heaters, spread across ceilings, cool, and descend back to floor level. Placing heating vents near the floor maximizes this natural circulation. Modern smart thermostats can optimize convection patterns by adjusting temperature differentials across zones.",
        fact: "Placing furniture over a radiator blocks convection currents and can reduce heating efficiency by up to 40%!",
        stats: "40% efficiency loss | 95% of buildings use convection | 20°C optimal room temp",
      },
      {
        title: "🌋 Earth's Mantle",
        description: "Deep inside Earth, convection currents in the semi-molten mantle drive plate tectonics at speeds of 2-10 cm per year. Hot rock from near the 4000°C core-mantle boundary rises in plumes, spreads along the lithosphere, cools, and sinks back down at subduction zones. This process has been reshaping Earth's surface for billions of years. Researchers at the USGS and the British Geological Survey use seismic tomography to map these convection patterns through the 2900 km thick mantle, helping predict volcanic activity and earthquake risks.",
        fact: "The mantle's convection cycle takes 100-200 million years to complete. The mid-ocean ridges where new crust forms span over 65000 km worldwide.",
        stats: "4000°C core temperature | 2900 km mantle thickness | 65000 km ridge length",
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
            🌍 Convection in the Real World
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
                minHeight: '44px',
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
              onClick={() => setActiveApp(index)}
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

          {/* Got It / Mark as read button */}
          {!completedApps.has(activeApp) && (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                minHeight: '44px',
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                // Auto-advance to next unread
                if (activeApp < applications.length - 1) {
                  setActiveApp(activeApp + 1);
                }
              }}
            >
              Got It
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div style={{
          textAlign: 'center',
          marginTop: premiumDesign.spacing.lg,
          color: premiumDesign.colors.text.muted,
        }}>
          {completedApps.size} of {applications.length} applications explored
        </div>

        {completedApps.size >= applications.length && (
          <div style={{
            textAlign: 'center',
            marginTop: premiumDesign.spacing.lg,
          }}>
            <button
              style={{
                padding: '16px 32px',
                minHeight: '52px',
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: premiumDesign.colors.gradient.warm,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.accent),
              }}
              onClick={goNext}
            >
              Take the Test
            </button>
          </div>
        )}

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          { text: 'Next →', onClick: goNext }
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: premiumDesign.spacing.lg,
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
              Test Complete!
            </h2>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '16px',
              marginBottom: premiumDesign.spacing.sm,
            }}>
              You scored:
            </p>

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
              marginBottom: premiumDesign.spacing.lg,
            }}>
              {passed
                ? 'You have mastered convection currents!'
                : 'Review the material and try again.'}
            </p>
          </div>

          {/* Answer Review */}
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: premiumDesign.spacing.lg,
            borderRadius: premiumDesign.radius.lg,
          }}>
            {testQuestions.map((q, i) => {
              const userAns = userAnswers[i];
              const isCorrect = userAns !== null && userAns !== undefined && q.options[userAns]?.correct;
              return (
                <div key={i} style={{
                  padding: premiumDesign.spacing.md,
                  background: premiumDesign.colors.background.card,
                  borderRadius: premiumDesign.radius.md,
                  border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  marginBottom: premiumDesign.spacing.sm,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
                      Question {i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: premiumDesign.spacing.md, justifyContent: 'center', flexWrap: 'wrap' }}>
            {renderButton(
              'Return to Dashboard',
              () => goToPhase('hook'),
              'secondary'
            )}
            {renderButton(
              'Replay Quiz',
              () => {
                setTestComplete(false);
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
                setTestScore(0);
                setUserAnswers([]);
              },
              'secondary'
            )}
            {passed && renderButton(
              'Complete Lesson →',
              () => goNext(),
              'success'
            )}
          </div>

          {renderBottomBar(
            { text: '← Back', onClick: () => goToPhase('transfer') },
            { text: 'Next →', onClick: goNext }
          )}
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', paddingBottom: '16px' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '16px' }}>
            Question {currentQuestion + 1} of 10
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
          {/* Scenario context */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            marginBottom: premiumDesign.spacing.lg,
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}>
            <p style={{ color: '#e2e8f0', fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
              {question.scenario}
            </p>
          </div>

          <h3 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: '#ffffff',
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
              let borderColor = 'rgba(255,255,255,0.1)';
              let background = premiumDesign.colors.background.tertiary;

              if (showExplanation) {
                if (option.correct) {
                  background = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  background = 'rgba(239, 68, 68, 0.2)';
                  borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                borderColor = premiumDesign.colors.primary;
                background = 'rgba(99, 102, 241, 0.2)';
              }

              const buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                minHeight: '52px',
                borderRadius: premiumDesign.radius.lg,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor,
                background,
                color: '#e2e8f0',
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              };

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onClick={() => {
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                  disabled={showExplanation}
                >
                  {option.id.toUpperCase()}) {option.label}
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
              <p style={{ color: '#e2e8f0', margin: 0 }}>
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
                setUserAnswers(prev => {
                  const updated = [...prev];
                  updated[currentQuestion] = selectedAnswer;
                  return updated;
                });
                if (selectedAnswer !== null && question.options[selectedAnswer]?.correct) {
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
          background: premiumDesign.colors.gradient.primary,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Convection Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how temperature differences drive fluid motion, creating convection currents that shape everything from boiling water to global weather patterns!
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
            <li>Hot fluids expand, become less dense, and rise</li>
            <li>Cool fluids contract, become denser, and sink</li>
            <li>Convection cells create circular flow patterns</li>
            <li>Convection drives ocean currents, weather, and more</li>
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', maxWidth: '896px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.05em' }}>Convection Currents</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={phaseLabels[p]}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: phase === p
                    ? '#fb923c'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? '#10B981'
                      : '#334155',
                  boxShadow: phase === p ? '0 4px 6px -1px rgba(251, 146, 60, 0.3)' : 'none',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#fb923c' }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px', maxWidth: '800px', margin: '0 auto', width: '100%', padding: '48px 16px 100px' }}>
        {phase === 'hook' && renderHookPhase()}
        {phase === 'predict' && renderPredictPhase()}
        {phase === 'play' && renderPlayPhase()}
        {phase === 'review' && renderReviewPhase()}
        {phase === 'twist_predict' && renderTwistPredictPhase()}
        {phase === 'twist_play' && renderTwistPlayPhase()}
        {phase === 'twist_review' && renderTwistReviewPhase()}
        {phase === 'transfer' && (
          <TransferPhaseView
            conceptName="Convection Currents"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        )}
        {phase === 'test' && renderTestPhase()}
        {phase === 'mastery' && renderMasteryPhase()}
      </div>
    </div>
  );
}
