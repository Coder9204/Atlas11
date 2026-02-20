'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON ROBOT LEARNING - Complete 10-Phase Game (#31 of 36)
// Sim-to-real transfer: training robot policies in simulation and deploying
// to physical hardware with domain randomization
// -----------------------------------------------------------------------------

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

interface ELON_RobotLearningRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: 'A robot trained in simulation to pick up rigid boxes is deployed to a real warehouse. The lighting, surface textures, and camera angles differ from training.',
    question: 'What is the primary cause of performance degradation?',
    options: [
      { id: 'a', label: 'The robot hardware is too slow' },
      { id: 'b', label: 'The reality gap — differences between sim and real visual/physics properties', correct: true },
      { id: 'c', label: 'The neural network is too small' },
      { id: 'd', label: 'The robot needs more battery power' }
    ],
    explanation: 'The reality gap encompasses all differences between simulation and reality — visual appearance, physics fidelity, sensor noise, and dynamics. These mismatches cause policies that work in sim to fail in reality.'
  },
  {
    scenario: 'An engineer is training a manipulation policy in simulation and wants to improve real-world transfer. They have two options: (A) train with fixed lighting or (B) randomize lighting across episodes.',
    question: 'Which approach will transfer better and why?',
    options: [
      { id: 'a', label: 'Fixed lighting — consistency helps learning' },
      { id: 'b', label: 'Randomized lighting — domain randomization forces robust features', correct: true },
      { id: 'c', label: 'Neither — lighting does not affect robot policies' },
      { id: 'd', label: 'Both are identical in outcome' }
    ],
    explanation: 'Domain randomization exposes the policy to a wide distribution of visual conditions. The policy must learn features invariant to lighting changes, making it robust to the unpredictable real world.'
  },
  {
    scenario: 'A team runs 1 million simulation episodes in 24 hours on a GPU cluster. The same experiments in reality would take one robot arm 1 day per 100 episodes.',
    question: 'How long would the same number of real-world episodes take?',
    options: [
      { id: 'a', label: 'About 1 month' },
      { id: 'b', label: 'About 1 year' },
      { id: 'c', label: 'About 27 years (10,000 days)', correct: true },
      { id: 'd', label: 'About 100 years' }
    ],
    explanation: '1,000,000 episodes / 100 episodes per day = 10,000 days = ~27.4 years. This massive speedup (10,000x) is exactly why sim-to-real transfer is so valuable — you compress decades into hours.'
  },
  {
    scenario: 'System identification involves carefully measuring real-world parameters (friction, mass, damping) and matching them in simulation.',
    question: 'What is the main disadvantage of system identification compared to domain randomization?',
    options: [
      { id: 'a', label: 'It produces worse simulation fidelity' },
      { id: 'b', label: 'It requires extensive manual measurement and cannot capture all real-world variation', correct: true },
      { id: 'c', label: 'It is computationally more expensive' },
      { id: 'd', label: 'It only works for wheeled robots' }
    ],
    explanation: 'System identification creates one specific simulation that matches measured reality. But it cannot account for unmeasured parameters, environmental changes, or wear over time. Domain randomization covers a distribution of possible realities instead.'
  },
  {
    scenario: 'A teacher-student approach trains a "teacher" policy in simulation with full state access, then distills it into a "student" that uses only camera images.',
    question: 'Why use this two-stage approach?',
    options: [
      { id: 'a', label: 'Because neural networks cannot learn from images directly' },
      { id: 'b', label: 'The teacher provides structured signal, making visual learning easier and more sample-efficient', correct: true },
      { id: 'c', label: 'To make the policy run faster on hardware' },
      { id: 'd', label: 'Because cameras are unreliable in simulation' }
    ],
    explanation: 'Training directly from pixels in complex environments is sample-inefficient. The teacher policy, trained with privileged state info, provides stable behavior. The student learns to map images to the teacher actions — a supervised learning problem that converges faster.'
  },
  {
    scenario: 'A robot learning to walk in simulation achieves 95% success rate. When deployed on real hardware, it only achieves 40%.',
    question: 'Which factor most likely explains this 55% performance drop?',
    options: [
      { id: 'a', label: 'The simulation ran too fast' },
      { id: 'b', label: 'Actuator dynamics, ground contact, and sensor noise differ from sim assumptions', correct: true },
      { id: 'c', label: 'The real robot has more compute power' },
      { id: 'd', label: 'Real-world gravity is different' }
    ],
    explanation: 'Ground contact models, actuator response curves, and sensor characteristics are extremely hard to simulate perfectly. Small mismatches compound across many timesteps, causing accumulated errors that degrade locomotion performance.'
  },
  {
    scenario: 'An RL policy trained with domain randomization achieves 80% sim performance (vs. 95% without randomization), but 75% real-world performance (vs. 40% without).',
    question: 'What does this illustrate about the randomization tradeoff?',
    options: [
      { id: 'a', label: 'Randomization always hurts performance' },
      { id: 'b', label: 'You sacrifice some sim performance for dramatically better real transfer — a worthwhile tradeoff', correct: true },
      { id: 'c', label: 'The policy is underfitting in both cases' },
      { id: 'd', label: 'You should never randomize training' }
    ],
    explanation: 'Domain randomization intentionally makes training harder (lower sim score) but produces a policy robust to variation. The 75% real-world performance far exceeds the 40% from sim-only training. This gap/transfer tradeoff is the core insight of sim-to-real.'
  },
  {
    scenario: 'A safety constraint requires that a robot arm never exceed 10 N of force on any object during training.',
    question: 'Why is simulation essential for learning with safety constraints?',
    options: [
      { id: 'a', label: 'Simulation cannot model forces accurately' },
      { id: 'b', label: 'In sim, the robot can safely explore dangerous states without damaging hardware or surroundings', correct: true },
      { id: 'c', label: 'Safety constraints do not exist in simulation' },
      { id: 'd', label: 'Real robots never need safety constraints' }
    ],
    explanation: 'Safe exploration is a major advantage of sim training. The robot can crash, drop objects, or apply extreme forces millions of times in sim with zero cost. In reality, a single mistake could break the robot or injure someone.'
  },
  {
    scenario: 'A team uses progressive domain randomization: starting with low randomization and gradually increasing it during training.',
    question: 'What is the advantage of this curriculum approach?',
    options: [
      { id: 'a', label: 'It makes training faster by skipping randomization' },
      { id: 'b', label: 'The policy first learns basic skills, then adapts them to handle variation — avoiding early-training instability', correct: true },
      { id: 'c', label: 'It eliminates the need for real-world fine-tuning' },
      { id: 'd', label: 'Progressive randomization is identical to fixed randomization' }
    ],
    explanation: 'Starting with low randomization lets the policy learn the core task quickly. Gradually increasing randomization then forces it to become robust, building on a stable foundation. This is more stable than starting with maximum randomization.'
  },
  {
    scenario: 'NVIDIA Isaac Sim can simulate 10,000 robots in parallel on a single GPU, each collecting experience simultaneously.',
    question: 'Why is parallel simulation critical for robot learning?',
    options: [
      { id: 'a', label: 'It reduces the cost of GPU hardware' },
      { id: 'b', label: 'It makes neural networks smaller' },
      { id: 'c', label: 'It multiplies sample collection speed, enabling RL algorithms that require billions of timesteps', correct: true },
      { id: 'd', label: 'It improves rendering quality' }
    ],
    explanation: 'Modern RL algorithms (PPO, SAC) need enormous amounts of experience. Running 10,000 sims in parallel provides 10,000x more data per wall-clock second, making it feasible to train complex robot behaviors in hours instead of years.'
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F916}',
    title: 'Tesla Optimus Training',
    short: 'Humanoid robot trained in simulation for factory tasks',
    tagline: 'From digital twin to physical worker',
    description: 'Tesla Optimus uses massive simulation to learn manipulation and locomotion before deployment. Simulated factories let the robot practice box carrying, object sorting, and terrain navigation millions of times. Domain randomization across surface types, lighting, and object properties ensures the skills transfer to real factory floors.',
    connection: 'Sim-to-real with domain randomization lets Optimus learn in hours what would take decades of real-world practice.',
    howItWorks: 'Digital twin factories with randomized physics run on GPU clusters. Policies trained via RL are distilled into deployable models.',
    stats: [
      { value: 'sim', label: 'Digital factories', icon: '\u{1F3ED}' },
      { value: 'box', label: 'Manipulation tasks', icon: '\u{1F4E6}' },
      { value: 'varied terrain', label: 'Walking surfaces', icon: '\u{1F9B6}' }
    ],
    examples: ['Box carrying', 'Object sorting', 'Walking on uneven ground', 'Door handling'],
    companies: ['Tesla', 'Tesla AI', 'Tesla Robotics', 'Tesla Autopilot (shared infra)'],
    futureImpact: 'Optimus will learn new tasks from simulation overnight and deploy updated policies the next morning.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F9E9}',
    title: 'OpenAI Dactyl Rubik\'s Cube',
    short: 'Dexterous hand manipulation from pure simulation',
    tagline: 'Solving a Rubik\'s Cube with a robot hand trained entirely in sim',
    description: 'OpenAI trained a Shadow Dextyl hand to solve a Rubik\'s Cube using only simulation. The policy was trained with Automatic Domain Randomization (ADR), which progressively increased randomization of 236 simulation parameters including friction, mass, gravity, and visual properties. Zero real-world training was used.',
    connection: 'Massive domain randomization (236 parameters) bridges the sim-to-real gap for one of the hardest manipulation challenges.',
    howItWorks: 'ADR automatically adjusts randomization ranges based on policy performance, finding the optimal balance between difficulty and learnability.',
    stats: [
      { value: '100%', label: 'Sim-trained', icon: '\u{1F4BB}' },
      { value: 'massive', label: 'Randomization scope', icon: '\u{1F3B2}' },
      { value: 'real hand', label: 'Zero-shot transfer', icon: '\u{270B}' }
    ],
    examples: ['Cube rotation', 'Finger gaiting', 'In-hand reorientation', 'Tactile sensing'],
    companies: ['OpenAI', 'Shadow Robot Company', 'NVIDIA (GPU compute)', 'MuJoCo'],
    futureImpact: 'ADR-style training will enable zero-shot deployment of any dexterous manipulation task.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F5A5}\u{FE0F}',
    title: 'NVIDIA Isaac Sim',
    short: 'GPU-accelerated physics simulation for robot training at scale',
    tagline: 'Training 10,000 robots simultaneously on one GPU',
    description: 'NVIDIA Isaac Sim provides a GPU-accelerated simulation platform that runs thousands of robot instances in parallel. It supports photorealistic rendering via RTX ray tracing, accurate rigid and deformable body physics, and domain randomization APIs. Teams train walking, grasping, and navigation policies orders of magnitude faster than real time.',
    connection: 'GPU-parallel simulation provides the 10,000x speedup that makes sim-to-real practical at industrial scale.',
    howItWorks: 'PhysX and Warp run physics on GPU. Isaac Gym provides RL training with thousands of parallel environments sharing GPU memory.',
    stats: [
      { value: 'GPU', label: 'Accelerated physics', icon: '\u{1F3AE}' },
      { value: '10,000x', label: 'vs real-time speed', icon: '\u{26A1}' },
      { value: 'physics sim', label: 'PhysX backbone', icon: '\u{2699}\u{FE0F}' }
    ],
    examples: ['Quadruped locomotion', 'Drone navigation', 'Warehouse picking', 'Assembly tasks'],
    companies: ['NVIDIA', 'Boston Dynamics', 'Agility Robotics', 'Universal Robots'],
    futureImpact: 'Cloud-based Isaac Sim will let any company train robot policies without owning physical hardware.',
    color: '#76B900'
  },
  {
    icon: '\u{1F535}',
    title: 'Google RT-2 (Robotic Transformer)',
    short: 'Vision-Language-Action model bridging internet knowledge to robots',
    tagline: 'Teaching robots to understand and act using language',
    description: 'Google DeepMind RT-2 is a Vision-Language-Action (VLA) model that transfers knowledge from internet-scale language and vision pretraining to robot control. By fine-tuning a large language model (PaLM-E) on robot demonstration data, RT-2 can follow novel instructions it has never seen during robot training, leveraging common-sense knowledge from text.',
    connection: 'Transfer learning from massive internet data bridges the data gap — the robot inherits knowledge from billions of text/image examples.',
    howItWorks: 'A VLM (Vision-Language Model) is fine-tuned to output robot action tokens, treating robot control as a language generation task.',
    stats: [
      { value: 'VLA', label: 'Model architecture', icon: '\u{1F9E0}' },
      { value: 'internet', label: 'Knowledge source', icon: '\u{1F310}' },
      { value: 'robot actions', label: 'Output modality', icon: '\u{1F9BE}' }
    ],
    examples: ['Novel object grasping', 'Instruction following', 'Semantic reasoning', 'Multi-step tasks'],
    companies: ['Google DeepMind', 'Everyday Robots', 'Google Brain', 'Google Research'],
    futureImpact: 'VLA models will enable general-purpose robots that learn from watching videos and reading manuals.',
    color: '#3B82F6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_RobotLearningRenderer: React.FC<ELON_RobotLearningRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [domainRandomization, setDomainRandomization] = useState(50);
  const [simEpisodes, setSimEpisodes] = useState(100000);
  const [animFrame, setAnimFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation tick for SVG
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Sim-to-real gap calculation
  const calculateSimPerformance = (episodes: number, randomization: number) => {
    // Higher episodes = better sim perf, but randomization slightly reduces sim perf
    const basePerf = Math.min(98, 40 + 58 * (1 - Math.exp(-episodes / 200000)));
    const randPenalty = randomization * 0.15; // up to 15% penalty in sim
    return Math.max(10, basePerf - randPenalty);
  };

  const calculateRealPerformance = (episodes: number, randomization: number) => {
    // Real performance depends heavily on randomization
    const baseLearning = Math.min(95, 20 + 75 * (1 - Math.exp(-episodes / 300000)));
    // Randomization is key to transfer: too little = overfitting to sim, too much = underfitting
    const optimalRand = 60;
    const randDistance = Math.abs(randomization - optimalRand);
    const transferBonus = Math.max(0, 50 - randDistance * 0.8);
    const lowRandPenalty = randomization < 20 ? (20 - randomization) * 2.5 : 0;
    return Math.max(5, Math.min(90, baseLearning * (transferBonus / 50) - lowRandPenalty));
  };

  const simPerf = calculateSimPerformance(simEpisodes, domainRandomization);
  const realPerf = calculateRealPerformance(simEpisodes, domainRandomization);
  const simToRealGap = simPerf - realPerf;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'elon-robot-learning',
        gameTitle: 'Robot Learning: Sim-to-Real Transfer',
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
  }, [phase, goToPhase]);

  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
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
          data-navigation-dot="true"
          style={{
            width: phase === p ? '24px' : '8px',
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Fixed navigation bar
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG VISUALIZATION: Sim-to-Real Split Screen
  // ═══════════════════════════════════════════════════════════════════════════
  const SimToRealVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 360;
    const halfW = width / 2;
    const randNorm = domainRandomization / 100;
    const t = animFrame;
    const armAngle1 = Math.sin(t * 0.05) * 25;
    const armAngle2 = Math.sin(t * 0.05 + 0.5) * 20;
    const colorShift1 = Math.sin(t * 0.03 * randNorm) * 40;
    const colorShift2 = Math.cos(t * 0.04 * randNorm) * 30;

    // Performance bar heights
    const simBarH = (simPerf / 100) * 80;
    const realBarH = (realPerf / 100) * 80;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          {/* Sim side gradient — wireframe blue */}
          <linearGradient id="simGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          {/* Real side gradient — warm realistic */}
          <linearGradient id="realGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
          {/* Domain randomization color shift */}
          <linearGradient id="randGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`hsl(${200 + colorShift1}, 70%, 50%)`} />
            <stop offset="50%" stopColor={`hsl(${260 + colorShift2}, 60%, 55%)`} />
            <stop offset="100%" stopColor={`hsl(${320 + colorShift1}, 65%, 50%)`} />
          </linearGradient>
          {/* Performance bar gradients */}
          <linearGradient id="perfSimGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="perfRealGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="gapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="simGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="realGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background split */}
        {/* Interactive performance marker */}
        <circle cx={width / 2} cy={245 + 90 - (domainRandomization / 100) * 80} r="8" fill="rgba(239,68,68,0.5)" stroke="#ffffff" strokeWidth="2" filter="url(#simGlow)" />
        <rect x={0} y={0} width={halfW} height={height} fill="rgba(59,130,246,0.05)" />
        <rect x={halfW} y={0} width={halfW} height={height} fill="rgba(249,115,22,0.05)" />
        <line x1={halfW} y1={0} x2={halfW} y2={height} stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="6,4" />

        {/* Grid lines */}
        <line x1="0" y1="40" x2={width} y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="0" y1="120" x2={width} y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="0" y1="200" x2={width} y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={halfW / 2} y1="30" x2={halfW / 2} y2="240" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={halfW + halfW / 2} y1="30" x2={halfW + halfW / 2} y2="240" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={halfW / 2} y={22} fill="#60A5FA" fontSize="13" fontWeight="700" textAnchor="middle">SIMULATION</text>
        <text x={halfW + halfW / 2} y={22} fill="#FB923C" fontSize="13" fontWeight="700" textAnchor="middle">REALITY</text>
        <text x={halfW} y={22} fill={colors.textMuted} fontSize="11" textAnchor="middle">SIM-TO-REAL</text>

        {/* ─── SIM ROBOT (wireframe, left side) ─── */}
        <g transform={`translate(${halfW / 2 - 30}, 50)`}>
          {/* Domain randomization background effect */}
          {randNorm > 0.1 && (
            <rect x={-20} y={-10} width={100} height={160} rx="8" fill="url(#randGrad)" opacity={randNorm * 0.15} />
          )}
          {/* Robot base */}
          <rect x={10} y={120} width={40} height={15} rx="3" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* Robot body */}
          <rect x={15} y={60} width={30} height={60} rx="4" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* Robot head */}
          <rect x={18} y={40} width={24} height={20} rx="6" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* Eyes */}
          <circle cx={25} cy={50} r="3" fill="#60A5FA" opacity="0.8" />
          <circle cx={35} cy={50} r="3" fill="#60A5FA" opacity="0.8" />
          {/* Arm (animated) */}
          <line
            x1={45} y1={75}
            x2={45 + Math.cos((armAngle1 * Math.PI) / 180) * 30}
            y2={75 + Math.sin((armAngle1 * Math.PI) / 180) * 30}
            stroke="#60A5FA" strokeWidth="2" strokeDasharray="4,2"
          />
          {/* Gripper */}
          <circle
            cx={45 + Math.cos((armAngle1 * Math.PI) / 180) * 30}
            cy={75 + Math.sin((armAngle1 * Math.PI) / 180) * 30}
            r="6" fill="rgba(59,130,246,0.3)" stroke="#60A5FA" strokeWidth="1.5"
            filter="url(#nodeGlow)"
          />
          {/* Left arm */}
          <line
            x1={15} y1={75}
            x2={15 - Math.cos((armAngle2 * Math.PI) / 180) * 25}
            y2={75 + Math.sin((armAngle2 * Math.PI) / 180) * 25}
            stroke="#60A5FA" strokeWidth="2" strokeDasharray="4,2"
          />
          <circle
            cx={15 - Math.cos((armAngle2 * Math.PI) / 180) * 25}
            cy={75 + Math.sin((armAngle2 * Math.PI) / 180) * 25}
            r="6" fill="rgba(59,130,246,0.3)" stroke="#60A5FA" strokeWidth="1.5"
            filter="url(#nodeGlow)"
          />
          {/* Sim object (cube) */}
          <rect x={50} y={105} width={18} height={18} rx="2" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,2" opacity={0.7} />
          {/* Wireframe grid on body */}
          <line x1={15} y1={80} x2={45} y2={80} stroke="#60A5FA" strokeWidth="0.5" opacity="0.4" />
          <line x1={15} y1={100} x2={45} y2={100} stroke="#60A5FA" strokeWidth="0.5" opacity="0.4" />
          <line x1={30} y1={60} x2={30} y2={120} stroke="#60A5FA" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* ─── REAL ROBOT (solid, right side) ─── */}
        <g transform={`translate(${halfW + halfW / 2 - 30}, 50)`}>
          {/* Robot base (solid) */}
          <rect x={10} y={120} width={40} height={15} rx="3" fill="url(#realGrad)" opacity="0.9" />
          {/* Robot body (solid with shading) */}
          <rect x={15} y={60} width={30} height={60} rx="4" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1" />
          <rect x={17} y={62} width={26} height={10} rx="2" fill="#374151" />
          {/* Robot head */}
          <rect x={18} y={40} width={24} height={20} rx="6" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1" />
          {/* Eyes (glowing) */}
          <circle cx={25} cy={50} r="3" fill="#F97316" filter="url(#realGlow)" />
          <circle cx={35} cy={50} r="3" fill="#F97316" filter="url(#realGlow)" />
          {/* Arm (animated, same motion) */}
          <line
            x1={45} y1={75}
            x2={45 + Math.cos((armAngle1 * Math.PI) / 180) * 30}
            y2={75 + Math.sin((armAngle1 * Math.PI) / 180) * 30}
            stroke="#9CA3AF" strokeWidth="3"
          />
          <circle
            cx={45 + Math.cos((armAngle1 * Math.PI) / 180) * 30}
            cy={75 + Math.sin((armAngle1 * Math.PI) / 180) * 30}
            r="7" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1.5"
            filter="url(#realGlow)"
          />
          {/* Left arm */}
          <line
            x1={15} y1={75}
            x2={15 - Math.cos((armAngle2 * Math.PI) / 180) * 25}
            y2={75 + Math.sin((armAngle2 * Math.PI) / 180) * 25}
            stroke="#9CA3AF" strokeWidth="3"
          />
          <circle
            cx={15 - Math.cos((armAngle2 * Math.PI) / 180) * 25}
            cy={75 + Math.sin((armAngle2 * Math.PI) / 180) * 25}
            r="7" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1.5"
            filter="url(#realGlow)"
          />
          {/* Real object (solid cube with shadow) */}
          <rect x={50} y={105} width={18} height={18} rx="2" fill="#D97706" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
          <rect x={52} y={107} width={14} height={14} rx="1" fill="#B45309" opacity="0.3" />
          {/* Surface detail */}
          <circle cx={30} cy={85} r="6" fill="none" stroke="#6B7280" strokeWidth="0.5" opacity="0.4" />
          <line x1={22} y1={90} x2={38} y2={90} stroke="#6B7280" strokeWidth="0.5" opacity="0.3" />
        </g>

        {/* ─── PERFORMANCE GAP CHART (bottom) ─── */}
        <g transform={`translate(${width / 2 - 80}, 245)`}>
          <text x={80} y={0} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">Performance Gap</text>

          {/* Sim bar */}
          <rect x={20} y={90 - simBarH} width={28} height={simBarH} rx="3" fill="url(#perfSimGrad)" />
          <text x={34} y={100} fill="#60A5FA" fontSize="11" fontWeight="600" textAnchor="middle">{simPerf.toFixed(0)}%</text>
          <text x={34} y={116} fill={colors.textMuted} fontSize="11" textAnchor="middle">Sim</text>

          {/* Real bar */}
          <rect x={60} y={90 - realBarH} width={28} height={realBarH} rx="3" fill="url(#perfRealGrad)" />
          <text x={74} y={100} fill="#10B981" fontSize="11" fontWeight="600" textAnchor="middle">{realPerf.toFixed(0)}%</text>
          <text x={74} y={116} fill={colors.textMuted} fontSize="11" textAnchor="middle">Real</text>

          {/* Gap indicator */}
          <rect x={100} y={90 - (simToRealGap / 100) * 80} width={28} height={Math.max(2, (simToRealGap / 100) * 80)} rx="3" fill="url(#gapGrad)" />
          <text x={114} y={100} fill="#EF4444" fontSize="11" fontWeight="600" textAnchor="middle">{simToRealGap.toFixed(0)}%</text>
          <text x={114} y={116} fill={colors.textMuted} fontSize="11" textAnchor="middle">Gap</text>

          {/* Baseline */}
          <line x1={10} y1={90} x2={140} y2={90} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <text x={0} y={50} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90, 0, 50)">Rate (%)</text>
        </g>

        {/* Transfer arrow */}
        <path
          d={`M ${halfW - 15} 130 L ${halfW + 15} 130`}
          stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowHead)"
          opacity="0.8"
        />
        <defs>
          <marker id="arrowHead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={colors.accent} />
          </marker>
        </defs>
        <text x={halfW} y={125} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">TRANSFER</text>

        {/* Domain Randomization indicator */}
        <text x={halfW / 2} y={height - 8} fill="#60A5FA" fontSize="11" textAnchor="middle">
          Randomization: {domainRandomization}%
        </text>
        <text x={halfW + halfW / 2} y={height - 8} fill="#FB923C" fontSize="11" textAnchor="middle">
          Episodes: {(simEpisodes / 1000).toFixed(0)}K
        </text>
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG: Twist visualization — Deformable Object Gap
  // ═══════════════════════════════════════════════════════════════════════════
  const DeformableGapVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 300;
    const t = animFrame;
    const squish = Math.sin(t * 0.06) * 8;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="rigidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="deformGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="deformGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Sim-to-Real Gap: Deformable Objects
        </text>

        {/* Grid lines */}
        <line x1="20" y1="45" x2={width - 20} y2="45" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1="20" y1="130" x2={width - 20} y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="35" x2={width / 2} y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />

        {/* Left: Sim (rigid object) */}
        <text x={width / 4} y={45} fill="#60A5FA" fontSize="12" fontWeight="600" textAnchor="middle">In Simulation</text>
        {/* Robot gripper sim */}
        <rect x={width / 4 - 25} y={60} width={50} height={8} rx="2" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,2" />
        {/* Rigid box (perfect rectangle) */}
        <rect x={width / 4 - 18} y={70} width={36} height={36} rx="2" fill="none" stroke="#60A5FA" strokeWidth="2" />
        <text x={width / 4} y={92} fill="#60A5FA" fontSize="11" textAnchor="middle">Rigid Box</text>
        <circle cx={width / 4} cy={125} r="8" fill="rgba(59,130,246,0.3)" stroke="#60A5FA" strokeWidth="1.5" filter="url(#deformGlow)" />
        <text x={width / 4} y={145} fill={colors.success} fontSize="11" fontWeight="600" textAnchor="middle">95% Success</text>

        {/* Right: Real (deformable object) */}
        <text x={3 * width / 4} y={45} fill="#FB923C" fontSize="12" fontWeight="600" textAnchor="middle">In Reality</text>
        {/* Robot gripper real */}
        <rect x={3 * width / 4 - 25} y={60} width={50} height={8} rx="2" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1" />
        {/* Deformable object (squished ellipse) */}
        <ellipse
          cx={3 * width / 4}
          cy={88}
          rx={18 + squish}
          ry={18 - squish * 0.6}
          fill="rgba(239,68,68,0.2)"
          stroke="#EF4444"
          strokeWidth="2"
        />
        <text x={3 * width / 4} y={92} fill="#EF4444" fontSize="11" textAnchor="middle">Deforms!</text>
        <circle cx={3 * width / 4} cy={125} r="8" fill="rgba(239,68,68,0.3)" stroke="#EF4444" strokeWidth="1.5" filter="url(#deformGlow)" />
        <text x={3 * width / 4} y={145} fill={colors.error} fontSize="11" fontWeight="600" textAnchor="middle">35% Success</text>

        {/* Performance drop chart */}
        <g transform={`translate(${width / 2 - 100}, 165)`}>
          <text x={100} y={0} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">Performance After Deployment</text>

          {/* Path showing performance drop */}
          <path
            d={`M 20 100 L 40 100 L 50 95 L 70 85 L 90 10 C 100 5, 110 5, 120 70 L 130 80 L 140 85 L 160 90 L 180 95`}
            stroke="url(#dropGrad)" fill="none" strokeWidth="2.5"
          />

          {/* Annotation: deployment moment */}
          <line x1={90} y1={5} x2={90} y2={105} stroke="#EF4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          <text x={90} y={2} fill="#EF4444" fontSize="11" fontWeight="600" textAnchor="middle">Deploy</text>

          {/* Annotation: gap */}
          <circle cx={120} cy={60} r="6" fill="rgba(239,68,68,0.4)" stroke="#EF4444" strokeWidth="1" filter="url(#deformGlow)" />
          <text x={145} y={50} fill={colors.warning} fontSize="11" textAnchor="start">Gap!</text>

          {/* Baseline */}
          <line x1={10} y1={105} x2={190} y2={105} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <text x={5} y={108} fill={colors.textMuted} fontSize="11" textAnchor="end">0%</text>
          <text x={5} y={8} fill={colors.textMuted} fontSize="11" textAnchor="end">95%</text>
        </g>
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERS
  // ═══════════════════════════════════════════════════════════════════════════

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F916}\u{1F3AE}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Robot Learning
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;What if you could <span style={{ color: colors.accent }}>train a robot 10,000 times faster</span> than reality allows? In simulation, robots can practice a lifetime of manipulation in minutes — but the gap between virtual and physical worlds is the ultimate engineering challenge.&quot;
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              &quot;Simulation is the great equalizer for robotics. A startup with GPUs can now train robot behaviors that used to require years of physical prototyping. The challenge is making those simulated skills survive contact with reality.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Sim-to-Real Transfer Research
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '500px',
            width: '100%',
          }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.accent }}>10,000x</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Faster than real</div>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.success }}>1M+</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Episodes / day</div>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.warning }}>$0</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Hardware damage</div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'About 100 — simulation is only slightly faster' },
      { id: 'b', text: 'About 10,000 — sim runs in accelerated time but is limited' },
      { id: 'c', text: 'About 1,000,000 — sim runs 10,000x faster, compressing years to hours', correct: true },
      { id: 'd', text: 'Simulation can never match reality — real experience is always better' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              How many simulated episodes does it take to match 1 day of real-world robot training (about 100 real episodes)?
            </h2>

            {/* Static SVG showing speed comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predSimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="predRealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#FB923C" />
                  </linearGradient>
                  <filter id="predGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Sim vs Real: Training Speed</text>
                <text x="200" y="55" textAnchor="middle" fill="#60A5FA" fontSize="11">Simulation: 1 day on GPU cluster</text>
                <rect x="40" y="62" width="320" height="22" rx="4" fill="url(#predSimGrad)" opacity="0.8" />
                <text x="200" y="78" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">??? episodes</text>
                <text x="200" y="115" textAnchor="middle" fill="#FB923C" fontSize="11">Reality: 1 day with 1 robot arm</text>
                <rect x="40" y="122" width="30" height="22" rx="4" fill="url(#predRealGrad)" opacity="0.8" />
                <text x="55" y="138" textAnchor="start" fill="white" fontSize="11" fontWeight="600">~100</text>
                <text x="200" y="180" textAnchor="middle" fill={colors.textMuted} fontSize="11">How much faster is simulation?</text>
                <circle cx="360" cy="73" r="6" fill="#60A5FA" filter="url(#predGlow)" />
                <circle cx="70" cy="133" r="6" fill="#FB923C" filter="url(#predGlow)" />
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Sim-to-Real Gap Visualizer
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Sim-to-Real Transfer Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Every modern robotics company uses sim-to-real transfer. The ability to train in simulation and deploy on real hardware determines whether a robot product ships in months or years. Domain randomization is the key technique that makes this possible.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Sim-to-Real Transfer</strong> is the process of training a robot policy in simulation and deploying it to physical hardware.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Domain Randomization</strong> varies simulation parameters (lighting, friction, mass, textures) so the policy learns features invariant to these changes.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Reality Gap</strong> is the performance difference between simulation and physical deployment caused by imperfect simulation fidelity.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization demonstrates the sim-to-real transfer pipeline. Observe how the blue (sim) and green (real) performance bars respond as you adjust domain randomization. The Reality Gap is defined as the performance difference between simulation and physical deployment, calculated as sim performance minus real performance. Adjust the sliders to minimize this gap.
            </p>

            {/* Main visualization - side by side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <SimToRealVisualization />
                  </div>
                </div>

                {/* Insight card */}
                <div style={{
                  background: `${colors.accent}11`,
                  border: `1px solid ${colors.accent}33`,
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <p style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '4px' }}>Observation:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {domainRandomization < 20
                      ? 'With minimal randomization, sim performance is high but real-world transfer is poor. The policy has memorized sim-specific details.'
                      : domainRandomization > 80
                      ? 'With extreme randomization, the task becomes too hard in simulation. The policy struggles to learn anything useful.'
                      : 'Moderate randomization trades some sim performance for dramatically better real-world transfer. This is the sweet spot!'}
                  </p>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Domain Randomization Range slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Domain Randomization Range (friction, mass, gravity)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {domainRandomization}%
                        {domainRandomization < 20 ? ' (Narrow — underfitting to sim)' :
                         domainRandomization > 80 ? ' (Wide — overfitting tradeoff)' :
                         ' (Balanced)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={domainRandomization}
                      onChange={(e) => setDomainRandomization(parseInt(e.target.value))}
                      onInput={(e) => setDomainRandomization(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Domain Randomization Range"
                      style={sliderStyle(colors.accent, domainRandomization, 0, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>Narrow (overfit)</span>
                      <span style={{ ...typo.small, color: colors.success }}>Optimal</span>
                      <span style={{ ...typo.small, color: colors.warning }}>Wide (underfit)</span>
                    </div>
                  </div>

                  {/* Simulation Episodes slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Simulation Episodes (time to train)</span>
                      <span style={{ ...typo.small, color: '#60A5FA', fontWeight: 600 }}>
                        {(simEpisodes / 1000).toFixed(0)}K episodes
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="1000000"
                      step="1000"
                      value={simEpisodes}
                      onChange={(e) => setSimEpisodes(parseInt(e.target.value))}
                      onInput={(e) => setSimEpisodes(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Simulation Episodes"
                      style={sliderStyle('#60A5FA', simEpisodes, 1000, 1000000)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1K</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500K</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1M</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#60A5FA' }}>{simPerf.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Sim Performance</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{realPerf.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Real Performance</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: simToRealGap > 30 ? colors.error : colors.warning }}>
                        {simToRealGap.toFixed(1)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Reality Gap</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Science
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Science of Sim-to-Real Transfer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! Simulation runs approximately 10,000x faster than reality. One million simulated episodes in a day is entirely feasible with GPU-parallel simulation, while real-world collection would take decades.'
                : 'As you observed in the experiment, the answer is about 1,000,000 episodes. Your prediction may have been close! Modern GPU-accelerated simulators like NVIDIA Isaac Sim run 10,000x faster than real-time, compressing years of physical experience into hours of compute time.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Sim-to-Real Pipeline</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  1. <span style={{ color: '#60A5FA' }}>Simulate</span> — Build a physics simulation of the robot and environment.{'\n'}
                  2. <span style={{ color: colors.accent }}>Randomize</span> — Vary physics, visual, and dynamics parameters across training.{'\n'}
                  3. <span style={{ color: colors.success }}>Train</span> — Run millions of RL episodes on GPU clusters.{'\n'}
                  4. <span style={{ color: colors.warning }}>Transfer</span> — Deploy the policy directly to real hardware.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Transfer Rate = Sim_Perf × Transfer_Efficiency | Speedup: ~10,000x
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Domain Randomization Works
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                By randomizing simulation parameters (friction coefficients, object masses, lighting, textures, camera angles), the policy is forced to learn features that are invariant to these variations. Reality becomes just another sample from the randomization distribution — if the distribution is wide enough, real-world conditions fall within the training set.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key Techniques
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Domain\nRandomization', value: 'Visual + Physics' },
                  { name: 'System\nIdentification', value: 'Measure Real' },
                  { name: 'Teacher-\nStudent', value: 'Privileged Info' },
                  { name: 'Progressive\nRand.', value: 'Curriculum' },
                  { name: 'Sim-to-Real\nFine-tuning', value: 'Adapt on HW' },
                  { name: 'Parallel\nSimulation', value: '10,000x GPU' },
                ].map(tech => (
                  <div key={tech.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, whiteSpace: 'pre-line' }}>{tech.name}</div>
                    <div style={{ ...typo.small, color: colors.accent }}>{tech.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Works perfectly — the policy generalizes to all objects' },
      { id: 'b', text: 'Performance drops dramatically — the sim-to-real gap from missing physics (deformable dynamics were never simulated)' },
      { id: 'c', text: 'Slight decrease — maybe 5-10% lower success rate' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: The Deformable Object Challenge
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A robot trained to grasp rigid objects in simulation encounters a deformable object (like a soft bag or cloth) in reality. What happens?
            </h2>

            {/* Static SVG showing rigid vs deformable */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <filter id="twistPredGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Trained on Rigid → Deployed on Deformable</text>

                {/* Trained: rigid boxes */}
                <text x="100" y="50" textAnchor="middle" fill="#60A5FA" fontSize="11">Sim Training (Rigid)</text>
                <rect x="70" y="55" width="28" height="28" rx="2" fill="none" stroke="#60A5FA" strokeWidth="2" />
                <rect x="105" y="58" width="22" height="22" rx="2" fill="none" stroke="#60A5FA" strokeWidth="2" />
                <circle cx="100" cy="110" r="8" fill="rgba(16,185,129,0.3)" stroke="#10B981" strokeWidth="1.5" filter="url(#twistPredGlow)" />
                <text x="100" y="135" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">95% Success</text>

                {/* Arrow */}
                <path d="M 170 80 L 230 80" stroke={colors.accent} strokeWidth="2" markerEnd="url(#twistArrow)" />
                <defs>
                  <marker id="twistArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill={colors.accent} />
                  </marker>
                </defs>
                <text x="200" y="75" textAnchor="middle" fill={colors.accent} fontSize="11">Deploy</text>

                {/* Deployed: deformable */}
                <text x="300" y="50" textAnchor="middle" fill="#FB923C" fontSize="11">Reality (Deformable)</text>
                <ellipse cx="290" cy="72" rx="18" ry="14" fill="rgba(239,68,68,0.2)" stroke="#EF4444" strokeWidth="2" />
                <path d="M 310 60 Q 325 70, 318 85" stroke="#F59E0B" strokeWidth="2" fill="none" />
                <circle cx="300" cy="110" r="8" fill="rgba(239,68,68,0.3)" stroke="#EF4444" strokeWidth="1.5" filter="url(#twistPredGlow)" />
                <text x="300" y="135" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600">???</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See What Happens
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Deformable Object Gap Exploration
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              The Deformable Object Sim-to-Real Gap
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              When the simulation simplifies deformable objects as rigid bodies, the policy fails in reality
            </p>

            {/* Educational Explanation */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> The left side shows how simulation treats objects as rigid rectangles. The right side shows reality where objects deform, squish, and bend. The robot gripper trained on rigid shapes fails when encountering soft objects.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', marginBottom: 0 }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> Adjust the deformation slider to see performance drop. Higher deformation means bigger sim-to-real gap. This is why Tesla&apos;s Optimus robot needs high-fidelity physics simulation for manipulation tasks.
              </p>
            </div>

            {/* Side-by-side layout on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <DeformableGapVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Explanation cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ ...typo.small, color: '#60A5FA', marginBottom: '8px', fontWeight: 600 }}>In Simulation</h4>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        All objects are rigid bodies with fixed shapes. The gripper applies force, the object does not deform. The policy learns exact grasp points.
                      </p>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ ...typo.small, color: '#FB923C', marginBottom: '8px', fontWeight: 600 }}>In Reality</h4>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        Deformable objects change shape under grip force. The grasp points shift, the object slips, and the expected contact geometry is wrong.
                      </p>
                    </div>
                  </div>

                  {/* Impact stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>95%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Sim (rigid)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>35%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Real (deformable)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>60%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Performance Drop</div>
                    </div>
                  </div>

                  {/* Missing physics warning */}
                  <div style={{
                    background: `${colors.error}22`,
                    border: `1px solid ${colors.error}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      The root cause is missing physics:
                    </p>
                    <div style={{
                      ...typo.h3,
                      color: colors.error,
                    }}>
                      Domain Randomization Cannot Fix Missing Physics Models
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      No amount of randomizing rigid body parameters will teach a policy about deformation. The simulation must include deformable body physics to close this gap.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Deeper Lesson
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Limits of Sim-to-Real: Missing Physics
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Fundamental Insight</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Domain randomization can bridge the gap for parameters that exist in the simulation but are imprecise (friction, mass, lighting). However, it <strong style={{ color: colors.error }}>cannot bridge gaps from physics that are entirely missing</strong> from the simulation model. A rigid body simulator will never teach a robot about cloth draping, fluid dynamics, or elastic deformation — no matter how much you randomize.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Solutions</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  1. <strong style={{ color: colors.accent }}>Better simulators</strong> — Add deformable body simulation (FEM, particle-based methods).{' '}
                  2. <strong style={{ color: colors.success }}>Sim-to-real fine-tuning</strong> — Train mostly in sim, then fine-tune on a small amount of real data.{' '}
                  3. <strong style={{ color: colors.warning }}>Hybrid approaches</strong> — Use sim for exploration, real data for dynamics refinement.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Sim-to-real transfer is revolutionizing robotics, but simulation fidelity is the bottleneck. The frontier of research is in building simulators that capture the full complexity of the real world — deformable objects, fluids, granular materials, and multi-contact dynamics. As simulators improve, the reality gap shrinks.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Robot Learning"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Sim-to-Real Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Key players: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      const nextIdx = newCompleted.findIndex(c => !c);
                      if (nextIdx === -1) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextIdx);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand sim-to-real transfer, domain randomization, and the reality gap!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Robot Learning
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of sim-to-real transfer to real-world robotics scenarios. Consider the reality gap, domain randomization, sample efficiency, system identification, teacher-student methods, and safety constraints as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Sim-to-Real Transfer Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how robots learn in simulation, why domain randomization bridges the reality gap, and the limits of sim-to-real transfer.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Sim-to-real transfer: train in sim, deploy on hardware',
                'Domain randomization bridges the reality gap',
                'Simulation provides 10,000x speedup and safe exploration',
                'Missing physics (deformable objects) cannot be fixed by randomization alone',
                'Teacher-student and progressive randomization improve transfer',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Play Again
            </button>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_RobotLearningRenderer;
