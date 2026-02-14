'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// BROWNIAN MOTION RENDERER - Complete 10-Phase Learning Game
// Discover how random molecular collisions create observable motion
// ============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface BrownianMotionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  particle: '#3b82f6',
  trackedParticle: '#ef4444',
  path: '#10b981',
  molecule: 'rgba(59, 130, 246, 0.3)',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTracked: boolean;
}

interface PathPoint {
  x: number;
  y: number;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

const BrownianMotionRenderer: React.FC<BrownianMotionRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simulation state
  const [temperature, setTemperature] = useState(50);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [trackedPath, setTrackedPath] = useState<PathPoint[]>([]);
  const [msdData, setMsdData] = useState<number[]>([]);
  const animationRef = useRef<number>();
  const frameCountRef = useRef(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [selectedApp, setSelectedApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Experiment',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'brownian-motion',
        gameTitle: 'Brownian Motion',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Initialize particles
  useEffect(() => {
    const initParticles: Particle[] = [];
    const centerX = 200;
    const centerY = 175;

    // Add one tracked particle in the center
    initParticles.push({
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 8,
      isTracked: true,
    });

    // Add smaller particles around
    for (let i = 0; i < 15; i++) {
      initParticles.push({
        x: 50 + Math.random() * 300,
        y: 50 + Math.random() * 250,
        vx: 0,
        vy: 0,
        radius: 4 + Math.random() * 3,
        isTracked: false,
      });
    }

    setParticles(initParticles);
    setTrackedPath([{ x: centerX, y: centerY }]);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating || particles.length === 0) return;

    const animate = () => {
      frameCountRef.current++;
      const jitterStrength = (temperature / 50) * 2;

      setParticles(prevParticles => {
        return prevParticles.map(p => {
          // Random walk - each step is random
          const dx = (Math.random() - 0.5) * jitterStrength * 3;
          const dy = (Math.random() - 0.5) * jitterStrength * 3;

          let newX = p.x + dx;
          let newY = p.y + dy;

          // Boundary constraints
          const margin = p.radius;
          if (newX < margin) newX = margin;
          if (newX > 400 - margin) newX = 400 - margin;
          if (newY < margin) newY = margin;
          if (newY > 350 - margin) newY = 350 - margin;

          return { ...p, x: newX, y: newY };
        });
      });

      // Update tracked path every few frames
      if (frameCountRef.current % 3 === 0) {
        setParticles(currentParticles => {
          const tracked = currentParticles.find(p => p.isTracked);
          if (tracked) {
            setTrackedPath(prevPath => {
              const newPath = [...prevPath, { x: tracked.x, y: tracked.y }];
              // Keep last 200 points
              if (newPath.length > 200) {
                return newPath.slice(-200);
              }
              return newPath;
            });

            // Calculate MSD
            if (frameCountRef.current % 10 === 0) {
              setMsdData(prevMsd => {
                const newMsd = [...prevMsd];
                if (newMsd.length > 0) {
                  const firstPoint = { x: 200, y: 175 };
                  const displacement = Math.sqrt(
                    Math.pow(tracked.x - firstPoint.x, 2) +
                    Math.pow(tracked.y - firstPoint.y, 2)
                  );
                  newMsd.push(displacement);
                  if (newMsd.length > 50) {
                    return newMsd.slice(-50);
                  }
                } else {
                  newMsd.push(0);
                }
                return newMsd;
              });
            }
          }
          return currentParticles;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, temperature, particles.length]);

  const resetSimulation = useCallback(() => {
    const centerX = 200;
    const centerY = 175;

    setParticles(prev => prev.map((p, i) => {
      if (i === 0) {
        return { ...p, x: centerX, y: centerY };
      }
      return { ...p, x: 50 + Math.random() * 300, y: 50 + Math.random() * 250 };
    }));
    setTrackedPath([{ x: centerX, y: centerY }]);
    setMsdData([0]);
    frameCountRef.current = 0;
  }, []);

  // Typography styles
  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgCard,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.bgCard,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Navigation bar component
  const renderNavBar = (showBack: boolean = true) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      {showBack && phaseOrder.indexOf(phase) > 0 ? (
        <button
          onClick={prevPhase}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={nextPhase}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        Next
      </button>
    </div>
  );

  const predictions = [
    { id: 'still', label: 'The particles stay still until something pushes them' },
    { id: 'drift', label: 'The particles drift slowly in one direction' },
    { id: 'jitter', label: 'The particles jitter randomly but stay in the same general area' },
    { id: 'orbit', label: 'The particles orbit around in circular paths' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The jittering stays exactly the same' },
    { id: 'faster', label: 'The particles jitter faster and more intensely' },
    { id: 'slower', label: 'The particles jitter slower and less' },
    { id: 'stop', label: 'The particles stop moving entirely' },
  ];

  const transferApplications = [
    {
      title: 'Diffusion in Living Cells',
      description: 'Molecules inside cells move via Brownian motion, enabling nutrients to reach where they are needed without active transport.',
      question: 'How does Brownian motion help molecules distribute themselves inside a cell?',
      answer: 'Random thermal collisions cause molecules to spread out from areas of high concentration to low concentration. This passive diffusion is essential for distributing oxygen, nutrients, and signaling molecules throughout the cell.',
    },
    {
      title: 'Nanoparticle Behavior',
      description: 'Nanoparticles in fluids exhibit strong Brownian motion. This affects drug delivery, nanomaterial synthesis, and colloidal stability.',
      question: 'Why do nanoparticles show stronger Brownian motion than larger particles?',
      answer: 'Smaller particles have less mass and inertia, so individual molecular collisions have a greater relative effect. The random forces from surrounding molecules are not averaged out as much, leading to more visible jittering.',
    },
    {
      title: 'Einstein\'s Proof of Atoms',
      description: 'In 1905, Einstein\'s theoretical analysis of Brownian motion provided compelling evidence that atoms and molecules actually exist.',
      question: 'How did Brownian motion help prove atoms exist?',
      answer: 'Einstein showed that the statistical properties of Brownian motion (like mean square displacement) could only be explained if matter was made of discrete particles (molecules) colliding with the visible particles. Jean Perrin later confirmed this experimentally.',
    },
    {
      title: 'Thermal Noise in Electronics',
      description: 'Random thermal motion of electrons in conductors creates "Johnson-Nyquist noise" that limits the sensitivity of electronic instruments.',
      question: 'How is electronic thermal noise related to Brownian motion?',
      answer: 'Just as visible particles are buffeted by invisible molecules, electrons in a conductor are randomly pushed by thermal vibrations. This creates random voltage fluctuations proportional to temperature - the electronic equivalent of Brownian motion.',
    },
  ];

  const testQuestions = [
    {
      scenario: 'Robert Brown, a botanist studying pollen grains in water under a microscope in 1827, noticed the tiny particles were constantly jiggling in a seemingly random manner. Despite no visible cause pushing them, the particles never stopped moving.',
      question: 'What causes this mysterious Brownian motion?',
      options: [
        { text: 'Gravity pulling particles downward', correct: false },
        { text: 'Random collisions with invisible fluid molecules', correct: true },
        { text: 'Electric charges on the particles', correct: false },
        { text: 'Convection currents in the fluid', correct: false },
      ],
    },
    {
      scenario: 'A biology student sets up a microscope to observe pollen grains suspended in a drop of water. She carefully eliminates all vibrations and ensures the water is at thermal equilibrium. She begins tracking the path of a single pollen grain over several minutes.',
      question: 'What pattern will she observe in the pollen grain\'s path over time?',
      options: [
        { text: 'A straight line moving in one direction', correct: false },
        { text: 'A perfect circular orbit', correct: false },
        { text: 'A random, zigzag pattern (random walk)', correct: true },
        { text: 'Movement only toward the light source', correct: false },
      ],
    },
    {
      scenario: 'A physicist is conducting an experiment on Brownian motion. She starts with a water sample at room temperature (20 degrees C) and carefully heats it to 60 degrees C while observing particles under the microscope. She notices a significant change in particle behavior.',
      question: 'How does increasing the temperature affect the Brownian motion?',
      options: [
        { text: 'It stops Brownian motion completely', correct: false },
        { text: 'The jittering becomes slower and less intense', correct: false },
        { text: 'The jittering becomes faster and more intense', correct: true },
        { text: 'Particles begin moving in straight lines', correct: false },
      ],
    },
    {
      scenario: 'Einstein\'s 1905 paper on Brownian motion introduced the concept of mean square displacement (MSD), which measures the average squared distance a particle travels from its starting point. This statistical measure became crucial for understanding diffusion.',
      question: 'How does the mean square displacement of a Brownian particle grow over time?',
      options: [
        { text: 'Not at all - particles stay in the same place', correct: false },
        { text: 'Linearly with time (MSD is proportional to t)', correct: true },
        { text: 'Exponentially with time', correct: false },
        { text: 'With the square of time (proportional to t squared)', correct: false },
      ],
    },
    {
      scenario: 'A researcher compares two samples: one with large 10-micrometer particles and another with tiny 100-nanometer nanoparticles. Both are suspended in water at the same temperature. She observes dramatically different behavior under the microscope.',
      question: 'Why do smaller particles show stronger Brownian motion?',
      options: [
        { text: 'They have less inertia relative to collision forces', correct: true },
        { text: 'They are lighter and float better', correct: false },
        { text: 'They have more electric charge', correct: false },
        { text: 'Gravity affects them less', correct: false },
      ],
    },
    {
      scenario: 'A statistics student studying physics learns that while each individual step of a Brownian particle is completely unpredictable, the ensemble behavior of many particles follows precise mathematical laws. This seems paradoxical at first.',
      question: 'Brownian motion is best described as what type of phenomenon?',
      options: [
        { text: 'Deterministic motion that can be predicted exactly', correct: false },
        { text: 'Random or stochastic motion with statistical patterns', correct: true },
        { text: 'Periodic motion like a pendulum', correct: false },
        { text: 'Motion caused only by external forces', correct: false },
      ],
    },
    {
      scenario: 'In 1905, Einstein published a paper showing that Brownian motion could be explained by molecular theory. His mathematical predictions were later verified experimentally by Jean Perrin, who won the Nobel Prize for this work.',
      question: 'What fundamental concept did Einstein\'s analysis of Brownian motion help prove?',
      options: [
        { text: 'The existence of atoms and molecules', correct: true },
        { text: 'The theory of special relativity', correct: false },
        { text: 'The photoelectric effect', correct: false },
        { text: 'The wave nature of light', correct: false },
      ],
    },
    {
      scenario: 'A curious student asks: "If Brownian motion is caused by thermal energy, does it stop when everything reaches the same temperature?" The professor explains the subtle point about thermal equilibrium and perpetual motion.',
      question: 'In a fluid at thermal equilibrium, what happens to Brownian motion?',
      options: [
        { text: 'It stops completely', correct: false },
        { text: 'It continues indefinitely', correct: true },
        { text: 'It only occurs near the surface', correct: false },
        { text: 'It requires external energy input', correct: false },
      ],
    },
    {
      scenario: 'The Stokes-Einstein equation (D = kT/6 pi eta r) relates the diffusion coefficient D to various physical parameters. A researcher wants to increase the diffusion rate of nanoparticles in her drug delivery system.',
      question: 'According to this equation, the diffusion coefficient depends on:',
      options: [
        { text: 'Particle color', correct: false },
        { text: 'Room lighting', correct: false },
        { text: 'Temperature and fluid viscosity', correct: true },
        { text: 'Container shape', correct: false },
      ],
    },
    {
      scenario: 'An electrical engineer designing a sensitive amplifier encounters unwanted voltage fluctuations called Johnson-Nyquist noise. This random signal limits how small a signal the amplifier can detect. The noise power is proportional to temperature.',
      question: 'Why is thermal noise in electronics related to Brownian motion?',
      options: [
        { text: 'Both involve random thermal fluctuations of particles', correct: true },
        { text: 'Both require a vacuum to occur', correct: false },
        { text: 'Both are caused by light absorption', correct: false },
        { text: 'Both only occur at high temperatures', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  // Real-world applications of Brownian motion
  const realWorldApps = [
    {
      icon: '💊',
      title: 'Drug Delivery Nanoparticles',
      short: 'Nanomedicine',
      tagline: 'Harnessing Random Motion for Targeted Healing',
      description: 'Nanoparticles used in drug delivery exploit Brownian motion to diffuse through tissues and reach target cells. Their tiny size means they experience strong random motion, helping them penetrate biological barriers.',
      connection: 'Just like the jittering particles in this simulation, drug-carrying nanoparticles undergo random walks through the bloodstream and tissues. Their small size amplifies Brownian motion, enhancing tissue penetration.',
      howItWorks: 'Nanoparticles (10-200nm) are loaded with drugs and injected into the body. Brownian motion helps them diffuse out of blood vessels, through the extracellular matrix, and into cells. Surface coatings control how they interact with the immune system.',
      stats: [
        { value: '10-200nm', label: 'Typical particle size', icon: '🔬' },
        { value: '100x', label: 'Enhanced tumor uptake', icon: '🎯' },
        { value: '$100B+', label: 'Global market by 2030', icon: '💰' }
      ],
      examples: [
        'Lipid nanoparticles in mRNA COVID vaccines deliver genetic material to cells',
        'Doxil uses liposomes for targeted cancer chemotherapy',
        'Gold nanoparticles for photothermal tumor ablation',
        'Iron oxide nanoparticles for MRI contrast and drug delivery'
      ],
      companies: ['Pfizer/BioNTech', 'Moderna', 'Alnylam', 'Bind Therapeutics', 'Arrowhead'],
      futureImpact: 'Smart nanoparticles that respond to pH, temperature, or enzymes will enable precision medicine with minimal side effects.',
      color: colors.success
    },
    {
      icon: '📈',
      title: 'Stock Market Modeling',
      short: 'Financial Mathematics',
      tagline: 'Random Walks on Wall Street',
      description: 'Stock prices are modeled using geometric Brownian motion, treating price changes as random walks. This forms the foundation of modern options pricing and risk management.',
      connection: 'Just as particles jitter unpredictably due to molecular collisions, stock prices fluctuate due to countless random buy/sell decisions. The same mathematical framework describes both phenomena.',
      howItWorks: 'The Black-Scholes model assumes stock prices follow geometric Brownian motion: dS = μS dt + σS dW, where dW is a Wiener process (continuous Brownian motion). This allows calculation of option prices and portfolio risk.',
      stats: [
        { value: '$1.2Q', label: 'Derivatives market size', icon: '💵' },
        { value: '1973', label: 'Black-Scholes published', icon: '📅' },
        { value: '10M+', label: 'Trades/day using models', icon: '📊' }
      ],
      examples: [
        'Options pricing using Black-Scholes-Merton equations',
        'Monte Carlo simulations for portfolio risk assessment',
        'Value-at-Risk (VaR) calculations for bank regulations',
        'High-frequency trading algorithms modeling price movements'
      ],
      companies: ['Goldman Sachs', 'Jane Street', 'Citadel', 'Two Sigma'],
      futureImpact: 'Quantum computing may enable more sophisticated stochastic models, while AI augments traditional Brownian motion frameworks with pattern recognition.',
      color: colors.warning
    },
    {
      icon: '🔌',
      title: 'Diffusion in Semiconductors',
      short: 'Chip Manufacturing',
      tagline: 'Atomic Random Walks That Power Your Devices',
      description: 'Semiconductor doping relies on thermal diffusion of impurity atoms, which move through the crystal lattice via Brownian-like random walks. Controlling this process is essential for modern electronics.',
      connection: 'Dopant atoms in silicon undergo random thermal motion, hopping between lattice sites. This is Brownian motion at the atomic scale - the same physics, just with atoms instead of visible particles.',
      howItWorks: 'At high temperatures (900-1100°C), dopant atoms like boron or phosphorus diffuse into silicon wafers. The diffusion coefficient D follows the Arrhenius equation. Precise control of time and temperature creates exact concentration profiles.',
      stats: [
        { value: '5nm', label: 'Modern transistor size', icon: '📏' },
        { value: '100B+', label: 'Transistors per chip', icon: '🔢' },
        { value: '1000°C', label: 'Diffusion temperature', icon: '🌡️' }
      ],
      examples: [
        'Boron and phosphorus doping to create p-n junctions',
        'Thermal oxidation of silicon for gate insulators',
        'Copper interconnect formation in advanced chips',
        'Defect engineering in quantum dot displays'
      ],
      companies: ['Intel', 'TSMC', 'Samsung', 'ASML', 'Applied Materials'],
      futureImpact: 'As chips shrink below 3nm, controlling atomic diffusion becomes critical. New materials and atomic-layer deposition techniques push the boundaries of semiconductor physics.',
      color: colors.accent
    },
    {
      icon: '🌸',
      title: 'Pollen Analysis',
      short: 'Forensics and Archaeology',
      tagline: 'Ancient Particles Tell Modern Stories',
      description: 'Palynology (pollen analysis) uses the same particles Robert Brown first observed! Pollen grains preserved in sediments reveal past climates, crime scene locations, and archaeological diets.',
      connection: 'Robert Brown discovered Brownian motion in 1827 while studying pollen grains in water. Today, those same pollen particles help forensic scientists and archaeologists solve mysteries.',
      howItWorks: 'Pollen grains have unique shapes that identify plant species. In forensics, pollen on clothing links suspects to crime scenes. In archaeology, sediment pollen profiles reveal ancient vegetation and climate.',
      stats: [
        { value: '10-100μm', label: 'Pollen grain size', icon: '🔍' },
        { value: '10,000yr', label: 'Pollen preservation', icon: '⏳' },
        { value: '95%', label: 'Species ID accuracy', icon: '✓' }
      ],
      examples: [
        'Forensic palynology linking suspects to burial sites',
        'Ice core pollen revealing 800,000 years of climate history',
        'Honey authentication by identifying source flower pollen',
        'Archaeological diet reconstruction from dental calculus pollen'
      ],
      companies: ['FBI Forensic Labs', 'Palynology Research Facility', 'National Ice Core Lab', 'Natural History Museums'],
      futureImpact: 'AI-powered pollen identification and ancient DNA extraction from pollen are revolutionizing both forensic science and our understanding of prehistoric ecosystems.',
      color: colors.particle
    }
  ];

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="brownLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a1628" />
              <stop offset="50%" stopColor="#0c1929" />
              <stop offset="75%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Fluid medium gradient with depth */}
            <radialGradient id="brownFluidGradient" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#164e73" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#0c4a6e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.08" />
            </radialGradient>

            {/* Container glass effect gradient */}
            <linearGradient id="brownContainerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#94a3b8" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#475569" stopOpacity="0.1" />
              <stop offset="80%" stopColor="#334155" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.35" />
            </linearGradient>

            {/* Container border depth gradient */}
            <linearGradient id="brownContainerBorder" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.5" />
            </linearGradient>

            {/* 3D tracked particle radial gradient (red) */}
            <radialGradient id="brownTrackedParticle3D" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            {/* 3D regular particle radial gradient (blue) */}
            <radialGradient id="brownParticle3D" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            {/* Water molecule gradient (smaller particles) */}
            <radialGradient id="brownMolecule3D" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
            </radialGradient>

            {/* Motion path gradient */}
            <linearGradient id="brownPathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="10%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.7" />
              <stop offset="90%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>

            {/* Tracked particle glow filter */}
            <filter id="brownTrackedGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Particle outer glow filter */}
            <filter id="brownParticleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Motion trail blur filter */}
            <filter id="brownTrailBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>

            {/* Inner shadow for container depth */}
            <filter id="brownInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Temperature indicator gradient */}
            <linearGradient id="brownTempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a3e635" />
              <stop offset="75%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Label background gradient */}
            <linearGradient id="brownLabelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* === PREMIUM DARK LAB BACKGROUND === */}
          <rect width={width} height={height} fill="url(#brownLabBg)" />

          {/* Subtle grid pattern for scientific feel */}
          <pattern id="brownLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
          <rect width={width} height={height} fill="url(#brownLabGrid)" />

          {/* === FLUID CONTAINER WITH DEPTH === */}
          {/* Outer container shadow */}
          <rect
            x="18"
            y="58"
            width={width - 36}
            height={height - 96}
            rx="12"
            fill="#000"
            opacity="0.4"
          />

          {/* Main container with glass effect */}
          <rect
            x="15"
            y="55"
            width={width - 30}
            height={height - 90}
            rx="12"
            fill="url(#brownFluidGradient)"
            stroke="url(#brownContainerBorder)"
            strokeWidth="2"
          />

          {/* Glass reflection highlight */}
          <rect
            x="20"
            y="60"
            width={width - 40}
            height="8"
            rx="4"
            fill="url(#brownContainerGlass)"
            opacity="0.5"
          />

          {/* Inner container edge for depth */}
          <rect
            x="18"
            y="58"
            width={width - 36}
            height={height - 96}
            rx="10"
            fill="none"
            stroke="#0c4a6e"
            strokeWidth="1"
            opacity="0.3"
          />

          {/* === INVISIBLE WATER MOLECULES (HINT VISUALIZATION) === */}
          {Array.from({ length: 80 }).map((_, i) => {
            const mx = 25 + (i * 47) % (width - 50);
            const my = 65 + (i * 31) % (height - 110);
            return (
              <circle
                key={`mol-${i}`}
                cx={mx}
                cy={my}
                r={1.5}
                fill="url(#brownMolecule3D)"
                opacity={0.2 + (i % 3) * 0.15}
              />
            );
          })}

          {/* === MOTION TRAIL EFFECTS FOR PARTICLE PATH === */}
          {showPath && trackedPath.length > 1 && (
            <g>
              {/* Outer glow trail */}
              <path
                d={`M ${trackedPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#10b981"
                strokeWidth={6}
                opacity={0.15}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#brownTrailBlur)"
              />
              {/* Middle glow trail */}
              <path
                d={`M ${trackedPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#34d399"
                strokeWidth={3}
                opacity={0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Core trail line */}
              <path
                d={`M ${trackedPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#6ee7b7"
                strokeWidth={1.5}
                opacity={0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Trail start point marker */}
              {trackedPath.length > 0 && (
                <circle
                  cx={trackedPath[0].x}
                  cy={trackedPath[0].y}
                  r={4}
                  fill="#10b981"
                  opacity={0.6}
                />
              )}
            </g>
          )}

          {/* Interactive temperature indicator - moves with slider */}
          <circle
            cx={15 + (temperature / 100) * (width - 30)}
            cy={height - 12}
            r={8}
            fill={colors.accent}
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#brownParticleGlow)"
          />

          {/* === 3D PARTICLES WITH REALISTIC SPHERICAL APPEARANCE === */}
          {particles.map((p, i) => (
            <g key={i}>
              {/* Tracked particle outer glow ring */}
              {p.isTracked && (
                <>
                  {/* Pulsing outer glow */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 8}
                    fill="none"
                    stroke="#f87171"
                    strokeWidth={2}
                    opacity={0.25}
                    filter="url(#brownTrackedGlow)"
                  />
                  {/* Inner tracking ring */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 4}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    opacity={0.6}
                    strokeDasharray="4,3"
                  />
                </>
              )}

              {/* Particle shadow for 3D effect */}
              <ellipse
                cx={p.x + 2}
                cy={p.y + 3}
                rx={p.radius * 0.9}
                ry={p.radius * 0.5}
                fill="#000"
                opacity={0.25}
              />

              {/* Main 3D particle sphere */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.radius}
                fill={p.isTracked ? 'url(#brownTrackedParticle3D)' : 'url(#brownParticle3D)'}
                filter={p.isTracked ? 'url(#brownTrackedGlow)' : 'url(#brownParticleGlow)'}
              />

              {/* Specular highlight for 3D depth */}
              <circle
                cx={p.x - p.radius * 0.35}
                cy={p.y - p.radius * 0.35}
                r={p.radius * 0.3}
                fill="rgba(255,255,255,0.5)"
              />

              {/* Secondary highlight */}
              <circle
                cx={p.x - p.radius * 0.15}
                cy={p.y - p.radius * 0.5}
                r={p.radius * 0.12}
                fill="rgba(255,255,255,0.7)"
              />
            </g>
          ))}

          {/* === PROFESSIONAL LABELS WITH BACKGROUNDS === */}
          {/* Temperature label background */}
          <rect
            x="12"
            y="8"
            width="135"
            height="40"
            rx="6"
            fill="url(#brownLabelBg)"
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Temperature indicator bar */}
          <rect
            x="18"
            y="32"
            width="100"
            height="6"
            rx="3"
            fill="#1e293b"
          />
          <rect
            x="18"
            y="32"
            width={temperature}
            height="6"
            rx="3"
            fill="url(#brownTempGradient)"
          />

          <text x="22" y="24" fill={colors.textPrimary} fontSize="12" fontWeight="600">
            Temperature: {temperature}%
          </text>

          {/* Legend label background */}
          <rect
            x={width - 185}
            y="8"
            width="173"
            height="28"
            rx="6"
            fill="url(#brownLabelBg)"
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Legend items */}
          <circle cx={width - 170} cy="22" r="5" fill="url(#brownTrackedParticle3D)" />
          <text x={width - 160} y="26" fill={colors.textSecondary} fontSize="11">
            Tracked
          </text>

          <circle cx={width - 110} cy="22" r="5" fill="url(#brownParticle3D)" />
          <text x={width - 100} y="26" fill={colors.textSecondary} fontSize="11">
            Particles
          </text>

          <line x1={width - 55} y1="22" x2={width - 35} y2="22" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
          <text x={width - 30} y="26" fill={colors.textSecondary} fontSize="11">
            Path
          </text>

          {/* Container label */}
          <text
            x={width / 2}
            y={height - 18}
            fill={colors.textMuted}
            fontSize="11"
            textAnchor="middle"
            fontStyle="italic"
          >
            Fluid Medium (Water with Suspended Particles)
          </text>

          {/* Grid lines for visual reference */}
          <line x1={100} y1={55} x2={100} y2={height - 35} stroke={colors.textMuted} strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
          <line x1={200} y1={55} x2={200} y2={height - 35} stroke={colors.textMuted} strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
          <line x1={300} y1={55} x2={300} y2={height - 35} stroke={colors.textMuted} strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
          <line x1={15} y1={130} x2={width - 15} y2={130} stroke={colors.textMuted} strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
          <line x1={15} y1={210} x2={width - 15} y2={210} stroke={colors.textMuted} strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />

          {/* Reference and current labels */}
          <text x={20} y={height - 5} fill={colors.textMuted} fontSize="11" opacity="0.7">reference</text>
          <text x={width - 20} y={height - 5} fill={colors.accent} fontSize="11" textAnchor="end" opacity="0.7">current</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnimating ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => setShowPath(!showPath)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.path}`,
                background: showPath ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.path,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {showPath ? 'Hide Path' : 'Show Path'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMSDGraph = () => {
    const width = 300;
    const height = 120;
    const maxMsd = Math.max(...msdData, 50);

    return (
      <div style={{ background: colors.bgCard, padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
        <h4 style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: '13px' }}>
          Mean Square Displacement Over Time
        </h4>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {/* Axes */}
          <line x1={40} y1={100} x2={290} y2={100} stroke={colors.textMuted} strokeWidth={1} />
          <line x1={40} y1={10} x2={40} y2={100} stroke={colors.textMuted} strokeWidth={1} />

          {/* Labels */}
          <text x={165} y={115} fill={colors.textMuted} fontSize={11} textAnchor="middle">Time</text>
          <text x={15} y={55} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform="rotate(-90, 15, 55)">MSD</text>

          {/* Data line */}
          {msdData.length > 1 && (
            <path
              d={`M ${msdData.map((d, i) => `${40 + (i * 250) / msdData.length},${100 - (d / maxMsd) * 80}`).join(' L ')}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2}
            />
          )}

          {/* Theoretical linear growth reference */}
          <line
            x1={40}
            y1={100}
            x2={290}
            y2={20}
            stroke={colors.warning}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
          <text x={250} y={30} fill={colors.warning} fontSize={11} opacity={0.7}>Linear (theory)</text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Temperature: {temperature}% (affects jitter intensity)
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ touchAction: 'pan-y',
            width: '100%',
            height: '20px',
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${colors.accent} ${temperature}%, ${colors.bgCard} ${temperature}%)`,
            cursor: 'pointer',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
      </div>

      {renderMSDGraph()}

      <div style={{
        background: `${colors.accent}22`,
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Jitter Intensity: {(temperature / 50).toFixed(1)}x base rate
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Higher temperature = more molecular collisions = faster jittering
        </div>
      </div>
    </div>
  );


  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgDark} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>🔬</div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              The Random Jiggle
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
              Can "randomness" have a measurable pattern?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: `1px solid rgba(255,255,255,0.1)`,
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '12px' }}>
                Look at tiny particles under a microscope - they never sit still!
                They jitter and dance unpredictably, even when nothing seems to push them.
                This is Brownian motion, discovered in 1827 by botanist Robert Brown.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Try it yourself: Mix a drop of milk in water and observe under a phone microscope.
              </p>
            </div>

            <div style={{
              background: `${colors.accent}22`,
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                Watch the red particle's path - completely random, yet strangely predictable in aggregate!
              </p>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar(false)}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            margin: '24px 16px 16px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Tiny particles (like pollen or fat droplets) suspended in water.
              The red particle is being tracked. The fluid appears still - no currents,
              no external forces. What should happen?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
              How will the particles move over time?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { playSound('click'); setPrediction(p.id); }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? `${colors.accent}22` : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    ...typo.small,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center', marginTop: '20px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>Explore Brownian Motion</h2>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Observe how particles jitter randomly but with consistent statistical properties.
              This is important because understanding Brownian motion is essential for drug delivery,
              nanomedicine, and financial modeling.
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Watch the path - each step is random, but the overall spread is predictable</li>
              <li>Notice: particles don't travel far in any one direction</li>
              <li>The MSD graph shows displacement grows with time (not distance traveled!)</li>
              <li>Reset and watch different paths - all random, but statistically similar</li>
            </ul>
          </div>

          <div style={{
            background: `${colors.success}15`,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Why This Matters:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Brownian motion is fundamental to drug delivery (nanoparticles diffuse through tissue),
              financial mathematics (stock price models), and even forensic science (pollen analysis).
              Einstein used it to prove atoms exist!
            </p>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'jitter';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            margin: '24px 16px 16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct! You predicted the jittering behavior!' : 'Not Quite - But Now You Saw It!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              As you observed, particles jitter randomly but stay in the same general area - classic Brownian motion!
              {wasCorrect ? ' Your prediction matched what Einstein described mathematically.' : ' The jittering you saw is exactly what Einstein predicted.'}
            </p>
          </div>

          {/* Review diagram SVG */}
          <div style={{ textAlign: 'center', margin: '16px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <svg width="360" height="180" viewBox="0 0 360 180" style={{ maxWidth: '100%' }}>
              <defs>
                <radialGradient id="reviewParticle" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>
                <radialGradient id="reviewMolecule" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </radialGradient>
              </defs>
              <rect width="360" height="180" fill="#0f172a" rx="8" />
              <text x="180" y="20" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Random Molecular Collisions</text>
              {/* Surrounding molecules with arrows */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const cx = 180 + Math.cos(rad) * 55;
                const cy = 100 + Math.sin(rad) * 55;
                const ax = 180 + Math.cos(rad) * 35;
                const ay = 100 + Math.sin(rad) * 35;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="8" fill="url(#reviewMolecule)" opacity="0.7" />
                    <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  </g>
                );
              })}
              {/* Central particle */}
              <circle cx="180" cy="100" r="18" fill="url(#reviewParticle)" />
              <text x="180" y="155" textAnchor="middle" fill="#94a3b8" fontSize="11">Water molecules constantly collide from all directions</text>
            </svg>
          </div>

          {/* Key formula */}
          <div style={{
            background: `${colors.warning}15`,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Einstein's Key Equation:</p>
            <p style={{ fontSize: '18px', color: colors.textPrimary, fontFamily: 'serif', margin: '8px 0' }}>
              MSD = 2Dt (Mean Square Displacement is proportional to time)
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              D = kT / (6 pi eta r) relates diffusion to temperature
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>The Physics of Brownian Motion</h3>
            <div style={{ ...typo.small, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Invisible Collisions:</strong> Water molecules
                are far too small to see, but they're constantly moving and colliding with the visible
                particles from all sides. These collisions are random and uneven.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Random Walk:</strong> Each tiny kick from
                molecular collisions pushes the particle in a random direction. The net effect is a
                "drunkard's walk" - random steps that don't add up to any particular direction.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Statistical Pattern:</strong> While each
                step is random, the mean square displacement grows linearly with time. This is a
                fundamental result that Einstein used to prove atoms exist!
              </p>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            margin: '24px 16px 16px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Temperature!
            </p>
          </div>

          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              What if we warm up the sample slightly?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Imagine gently heating the water sample. The water molecules are now moving faster
              on average. How will this affect the visible particles' jittering?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
              With higher temperature, what happens to the Brownian motion?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { playSound('click'); setTwistPrediction(p.id); }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? `${colors.warning}22` : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    ...typo.small,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center', marginTop: '20px' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px' }}>Test Temperature Effects</h2>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Adjust the temperature and observe how jittering changes
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: `${colors.warning}22`,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Higher temperature means faster-moving water molecules, which deliver harder kicks
              to the visible particles. The jittering becomes more intense!
            </p>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            margin: '24px 16px 16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              Higher temperature causes faster, more intense jittering!
            </p>
          </div>

          {/* Review diagram for temperature effect */}
          <div style={{ textAlign: 'center', margin: '16px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <svg width="360" height="160" viewBox="0 0 360 160" style={{ maxWidth: '100%' }}>
              <rect width="360" height="160" fill="#0f172a" rx="8" />
              <text x="180" y="20" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Temperature vs. Motion Intensity</text>
              {/* Cold side */}
              <rect x="30" y="40" width="120" height="80" rx="6" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
              <text x="90" y="60" textAnchor="middle" fill="#60a5fa" fontSize="11">Low Temperature</text>
              <circle cx="90" cy="90" r="10" fill="#ef4444" />
              <path d="M80 85 L85 80 M100 85 L95 80 M80 95 L85 100 M100 95 L95 100" stroke="#6ee7b7" strokeWidth="1.5" fill="none" />
              <text x="90" y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">Slow jitter</text>
              {/* Hot side */}
              <rect x="210" y="40" width="120" height="80" rx="6" fill="#3f1818" stroke="#f87171" strokeWidth="1" />
              <text x="270" y="60" textAnchor="middle" fill="#fca5a5" fontSize="11">High Temperature</text>
              <circle cx="270" cy="90" r="10" fill="#ef4444" />
              <path d="M250 75 L260 70 M290 75 L280 70 M250 105 L260 110 M290 105 L280 110 M258 80 L265 75 M282 80 L275 75 M258 100 L265 105 M282 100 L275 105" stroke="#6ee7b7" strokeWidth="2" fill="none" />
              <text x="270" y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">Fast jitter</text>
              {/* Arrow */}
              <line x1="160" y1="90" x2="200" y2="90" stroke="#f59e0b" strokeWidth="2" />
              <polygon points="200,90 194,85 194,95" fill="#f59e0b" />
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>Temperature and Brownian Motion</h3>
            <div style={{ ...typo.small, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Molecular Speed:</strong> Temperature is
                directly related to the average kinetic energy of molecules. Higher temperature =
                faster molecules = harder collisions.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Einstein's Equation:</strong> The diffusion
                coefficient D = kT / (6 pi eta r), where T is temperature. This predicts that
                Brownian motion intensity is proportional to temperature!
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Practical Use:</strong> This relationship
                allows scientists to measure temperature at microscopic scales by observing
                particle motion - a form of "molecular thermometer."
              </p>
            </div>
          </div>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = transferCompleted.size >= 4;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px 16px 16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Brownian motion appears everywhere from biology to electronics
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
              Explore all 4 applications to continue
            </p>
          </div>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            margin: '0 16px 16px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  setTransferCompleted(new Set([...transferCompleted, i]));
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : transferCompleted.has(i) ? colors.success : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px',
                  padding: '12px 4px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {transferCompleted.has(i) && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ fontSize: '10px', color: colors.textPrimary, fontWeight: 500 }}>
                  {a.short}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgDark,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How This Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgDark,
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '14px', color: app.color, fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ fontSize: '10px', color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: colors.bgDark,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '6px', fontWeight: 600 }}>Examples:</h4>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {app.examples.slice(0, 3).map((ex, i) => (
                  <li key={i} style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Continue button */}
          <div style={{ padding: '0 16px 16px' }}>
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const nextIdx = selectedApp + 1;
                  setSelectedApp(nextIdx);
                  setTransferCompleted(new Set([...transferCompleted, nextIdx]));
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Next Application
              </button>
            ) : (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Got It - Continue to Test
              </button>
            )}
          </div>

          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>
        </div>
        {renderNavDots()}
        {renderNavBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
            <div style={{ maxWidth: '600px', margin: '24px auto 0', textAlign: 'center', padding: '0 16px' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Test Complete!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: '4px 0' }}>
                You Scored
              </p>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '8px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand Brownian motion!' : 'Review the concepts and try again.'}
              </p>

              {/* Answer Review */}
              <div style={{ textAlign: 'left' }}>
                <p style={{ ...typo.small, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  Question-by-Question Review
                </p>
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingBottom: '100px',
                  flex: 1,
                  paddingTop: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {testQuestions.map((q, i) => {
                    const correctIdx = q.options.findIndex(o => o.correct);
                    const isCorrect = testAnswers[i] === correctIdx;
                    return (
                      <div key={i} style={{
                        background: colors.bgCard,
                        borderRadius: '10px',
                        border: `2px solid ${isCorrect ? colors.success : colors.error}30`,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          background: isCorrect ? `${colors.success}15` : `${colors.error}15`,
                          display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700,
                            background: isCorrect ? colors.success : colors.error,
                            color: 'white',
                          }}>
                            {isCorrect ? '\u2713' : '\u2717'}
                          </div>
                          <div>
                            <p style={{ ...typo.small, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                              Question {i + 1}
                            </p>
                            <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                              {q.question.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        {!isCorrect && (
                          <div style={{ padding: '10px 14px' }}>
                            <p style={{ fontSize: '11px', color: colors.error, margin: '0 0 4px', fontWeight: 600 }}>
                              Your answer: {testAnswers[i] !== null ? q.options[testAnswers[i]!].text : 'Not answered'}
                            </p>
                            <p style={{ fontSize: '11px', color: colors.success, margin: 0, fontWeight: 600 }}>
                              Correct: {q.options[correctIdx].text}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '24px 0' }}>
                {passed ? (
                  <button
                    onClick={() => { playSound('complete'); nextPhase(); }}
                    style={primaryButtonStyle}
                  >
                    Complete Lesson
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTestSubmitted(false);
                      setTestAnswers(new Array(10).fill(null));
                      setCurrentTestQuestion(0);
                      setTestScore(0);
                      goToPhase('hook');
                    }}
                    style={primaryButtonStyle}
                  >
                    Review and Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '700px', margin: '24px auto 0', padding: '0 16px' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h2 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Knowledge Test</h2>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentTestQuestion + 1} of 10
              </span>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentTestQuestion
                      ? colors.accent
                      : testAnswers[i] !== null
                        ? colors.success
                        : 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Scenario */}
            {'scenario' in currentQ && currentQ.scenario && (
              <div style={{
                background: colors.bgCard,
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {currentQ.scenario}
                </p>
              </div>
            )}

            {/* Question */}
            <div style={{
              background: colors.bgDark,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>{currentQ.question}</p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => { playSound('click'); handleTestAnswer(currentTestQuestion, oIndex); }}
                  style={{
                    background: testAnswers[currentTestQuestion] === oIndex ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentTestQuestion] === oIndex ? colors.accent : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentTestQuestion] === oIndex ? colors.accent : colors.bgDark,
                    color: testAnswers[currentTestQuestion] === oIndex ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {String.fromCharCode(65 + oIndex)}
                  </span>
                  <span style={{ ...typo.small, color: colors.textPrimary }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
                disabled={currentTestQuestion === 0}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.textMuted}`,
                  background: 'transparent',
                  color: currentTestQuestion === 0 ? colors.textMuted : colors.textSecondary,
                  cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              {currentTestQuestion < 9 ? (
                <button
                  onClick={() => testAnswers[currentTestQuestion] !== null && setCurrentTestQuestion(currentTestQuestion + 1)}
                  disabled={testAnswers[currentTestQuestion] === null}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers[currentTestQuestion] !== null ? colors.accent : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    cursor: testAnswers[currentTestQuestion] !== null ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correctIdx = testQuestions[i].options.findIndex(o => o.correct);
                      return acc + (ans === correctIdx ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSound(score >= 7 ? 'complete' : 'failure');
                  }}
                  disabled={testAnswers.some(a => a === null)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgDark} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '24px', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>You've mastered Brownian motion and random walks</p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Random molecular collisions cause visible particle jittering</li>
              <li>Mean square displacement grows linearly with time</li>
              <li>Temperature directly affects jitter intensity</li>
              <li>Brownian motion proved the existence of atoms</li>
            </ul>
          </div>

          <div style={{ background: `${colors.accent}22`, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Brownian motion is fundamental to statistical mechanics, finance (stock prices),
              and biology (molecular motors). The Langevin equation and Fokker-Planck equation
              describe it mathematically. It's also key to understanding diffusion, osmosis,
              and many nanoscale phenomena!
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px', textAlign: 'center' }}>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                display: 'inline-block',
                textDecoration: 'none',
              }}
            >
              Back to Dashboard
            </a>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // Default fallback - should not reach here
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {renderProgressBar()}
      <p style={{ color: colors.textSecondary }}>Loading...</p>
    </div>
  );
};

export default BrownianMotionRenderer;
