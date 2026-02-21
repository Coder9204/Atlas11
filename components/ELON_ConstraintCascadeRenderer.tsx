'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// CONSTRAINT CASCADE - Complete 10-Phase Game (ELON Game #1 of 36)
// How changing one constraint ripples through an entire system design
// First-principles reasoning through constraint propagation
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

interface ConstraintCascadeRendererProps {
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
    scenario: "SpaceX is designing a new rocket. The payload budget is cut by 40%, reducing mass allowance from 150 tons to 90 tons.",
    question: "How does this single constraint change cascade through the design?",
    options: [
      { id: 'a', label: "Only the payload bay size changes" },
      { id: 'b', label: "Payload bay, engine count, fuel volume, tank diameter, launch pad, and timeline all change", correct: true },
      { id: 'c', label: "Just the fuel volume needs adjusting" },
      { id: 'd', label: "No other parameters are affected since engines stay the same" }
    ],
    explanation: "Reducing payload mass cascades through the entire system: fewer engines needed, less fuel required, smaller tanks, different launch pad specs, and revised timeline. This is why first-principles thinking requires tracing every dependency."
  },
  {
    scenario: "A factory floor is being redesigned. Management decides to reduce total floor space by 30% to cut lease costs.",
    question: "Using first-principles reasoning, what is the cascade effect?",
    options: [
      { id: 'a', label: "Only the number of machines decreases" },
      { id: 'b', label: "Machine layout, throughput, staffing, inventory buffers, and delivery schedules all change", correct: true },
      { id: 'c', label: "Workers just move closer together" },
      { id: 'd', label: "Only inventory storage is affected" }
    ],
    explanation: "Floor space constrains everything: machine layout density, worker throughput paths, inventory buffer zones, staffing ratios, and delivery scheduling. A 30% reduction forces redesign across 10+ interconnected parameters."
  },
  {
    scenario: "An engineer is applying first-principles reasoning to a problem. They start by identifying the fundamental constraints.",
    question: "What is the primary purpose of first-principles decomposition?",
    options: [
      { id: 'a', label: "To simplify the problem by ignoring dependencies" },
      { id: 'b', label: "To break a problem into its fundamental truths and reason up from there", correct: true },
      { id: 'c', label: "To copy how other companies solved similar problems" },
      { id: 'd', label: "To reduce the number of constraints to just one" }
    ],
    explanation: "First-principles reasoning means stripping away assumptions and reasoning from fundamental truths. This reveals the true constraint tree and how changes propagate, rather than relying on analogy or convention."
  },
  {
    scenario: "The Boring Company needs to reduce tunnel diameter from 14ft to 12ft to cut construction costs.",
    question: "What is the cascade depth of this constraint change?",
    options: [
      { id: 'a', label: "Depth 1 - only vehicle size changes" },
      { id: 'b', label: "Depth 2 - vehicle size and ventilation change" },
      { id: 'c', label: "Depth 3+ - vehicle size, ventilation, emergency egress, fire suppression, cost per mile, and construction timeline all cascade", correct: true },
      { id: 'd', label: "No cascade - diameter is independent of other variables" }
    ],
    explanation: "Tunnel diameter cascades to at least depth 3: vehicle size (depth 1) affects passenger capacity (depth 2) which affects station design (depth 3). Ventilation affects air quality which affects sensor requirements. Each level spawns new dependencies."
  },
  {
    scenario: "A system has 8 interconnected variables. Changing the primary constraint affects 3 direct dependencies, each of which affects 2 more.",
    question: "What is the total number of variables potentially affected?",
    options: [
      { id: 'a', label: "3 variables (only direct dependencies)" },
      { id: 'b', label: "5 variables (3 direct + 2 secondary)" },
      { id: 'c', label: "9 variables (3 direct + 6 secondary)", correct: true },
      { id: 'd', label: "All 8 variables automatically change equally" }
    ],
    explanation: "The cascade propagates: 3 direct (depth 1) + 3x2=6 secondary (depth 2) = 9 total affected variables. In real systems, some variables appear at multiple depths, but the cascading multiplication effect is the key insight."
  },
  {
    scenario: "Neuralink is designing a brain-computer interface. They want to double the electrode count from 1024 to 2048.",
    question: "Which constraint cascade is most accurate?",
    options: [
      { id: 'a', label: "More electrodes -> larger chip -> more power -> more heat -> longer surgery -> higher risk", correct: true },
      { id: 'b', label: "More electrodes -> better signal, no other changes" },
      { id: 'c', label: "More electrodes -> just need a bigger chip" },
      { id: 'd', label: "More electrodes -> less power needed due to efficiency" }
    ],
    explanation: "Doubling electrodes creates a cascade: chip area increases ~2x, power draw increases, heat dissipation becomes critical (brain tissue is sensitive), surgery time extends for placement, and risk profile changes at every level."
  },
  {
    scenario: "Two engineers approach the same rocket design problem. Engineer A uses analogy ('other rockets use X engines'). Engineer B uses first principles ('given our mass and orbit, physics requires Y thrust').",
    question: "Why does first-principles reasoning reveal more constraint cascades?",
    options: [
      { id: 'a', label: "It doesn't - both approaches find the same constraints" },
      { id: 'b', label: "First principles exposes the actual dependency tree, showing cascades hidden by convention", correct: true },
      { id: 'c', label: "Analogy is actually better because it uses proven solutions" },
      { id: 'd', label: "First principles only works for simple problems" }
    ],
    explanation: "Analogy-based reasoning inherits hidden assumptions and may miss cascades. First-principles reasoning builds the constraint tree from scratch, exposing every dependency and revealing optimization opportunities that convention obscures."
  },
  {
    scenario: "Tesla is designing a new Gigafactory. They switch the primary constraint from 'minimize cost' to 'maximize throughput'.",
    question: "What happens to the constraint cascade when the primary constraint type changes?",
    options: [
      { id: 'a', label: "The same variables are affected in the same order" },
      { id: 'b', label: "The entire cascade tree reshapes - different variables become critical and dependency paths change", correct: true },
      { id: 'c', label: "Only the root node changes, everything else stays the same" },
      { id: 'd', label: "Fewer variables are affected overall" }
    ],
    explanation: "Changing the primary constraint type completely reshapes the cascade. Cost-optimized designs minimize material and labor. Throughput-optimized designs maximize parallel processing and flow. The dependency tree structure itself changes."
  },
  {
    scenario: "A constraint cascade has a feedback loop: Variable A affects B, B affects C, and C affects A again.",
    question: "How does a feedback loop change constraint propagation?",
    options: [
      { id: 'a', label: "It has no effect - each variable only changes once" },
      { id: 'b', label: "The system becomes unstable and cannot converge" },
      { id: 'c', label: "Changes amplify or dampen through iterations until the system reaches a new equilibrium", correct: true },
      { id: 'd', label: "Feedback loops cannot exist in real engineering systems" }
    ],
    explanation: "Feedback loops in constraint cascades create iterative convergence. A change in A affects B, which affects C, which modifies A again. The system iterates until reaching equilibrium. This is why rocket design requires multiple iteration cycles."
  },
  {
    scenario: "An engineer identifies that a system has 15 constraint variables with an average cascade depth of 4 levels.",
    question: "What is the most important implication for system design?",
    options: [
      { id: 'a', label: "The system is too complex to analyze" },
      { id: 'b', label: "Any single constraint change must be analyzed through all 4 cascade levels before implementation", correct: true },
      { id: 'c', label: "Only the first level of cascade matters practically" },
      { id: 'd', label: "The system should be simplified to 3 variables" }
    ],
    explanation: "Deep cascade depth means changes propagate far. A seemingly small tweak at level 1 can create major impacts at level 4. Engineers must trace the full cascade before committing to any constraint change - this is the core of systems thinking."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F680}',
    title: 'SpaceX Starship Mass Budget',
    short: 'Tightening payload mass cascades through the entire vehicle',
    tagline: 'Every kilogram saved reshapes the rocket',
    description: 'When SpaceX tightens the Starship payload mass budget, the cascade is enormous. Less payload means potentially fewer engines, which changes fuel requirements, which alters tank diameter, which affects aerodynamics, which modifies the launch pad design. Each constraint change propagates through dozens of interconnected parameters.',
    connection: 'Constraint cascading explains why Starship went through multiple design iterations - each mass target change rippled through the entire vehicle architecture.',
    howItWorks: 'Engineers trace each constraint change through the dependency tree, iterating until all parameters converge to a feasible design point.',
    stats: [
      { value: '150t', label: 'Payload target', icon: '\u{1F4E6}' },
      { value: '33', label: 'Raptor engines', icon: '\u{1F525}' },
      { value: '9m', label: 'Diameter', icon: '\u{1F4CF}' }
    ],
    examples: ['Starship payload optimization', 'Falcon 9 reusability cascade', 'Dragon capsule mass budget', 'Raptor engine thrust-to-weight'],
    companies: ['SpaceX', 'Blue Origin', 'Rocket Lab', 'Relativity Space'],
    futureImpact: 'AI-driven constraint solvers will automatically trace cascade effects in real-time during design iterations.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F3ED}',
    title: 'Tesla Gigafactory Floor Space',
    short: 'Constraining area cascades to every production parameter',
    tagline: 'Square footage dictates throughput destiny',
    description: 'When Tesla constrains Gigafactory floor space, the cascade reshapes production. Less area means denser machine layout, which changes worker throughput paths, which affects staffing ratios, which modifies inventory buffer sizing, which alters delivery scheduling. The entire production system rebalances around the space constraint.',
    connection: 'Floor space is a root constraint that demonstrates how physical limitations cascade through operational, staffing, and logistics parameters simultaneously.',
    howItWorks: 'Production engineers model the factory as a constraint tree, optimizing machine placement, material flow, and human ergonomics within the space envelope.',
    stats: [
      { value: '5.3M ft\u00B2', label: 'Floor space', icon: '\u{1F4D0}' },
      { value: '1M+', label: 'Vehicles/yr', icon: '\u{1F697}' },
      { value: '10k+', label: 'Employees', icon: '\u{1F465}' }
    ],
    examples: ['Gigafactory Nevada battery line', 'Gigafactory Shanghai ramp-up', 'Cybertruck production layout', 'Battery cell manufacturing flow'],
    companies: ['Tesla', 'BYD', 'Volkswagen', 'Toyota'],
    futureImpact: 'Digital twin factories will simulate constraint cascades before breaking ground, eliminating costly physical iterations.',
    color: '#10B981'
  },
  {
    icon: '\u{1F573}\u{FE0F}',
    title: 'Boring Company Tunnel Diameter',
    short: 'Smaller diameter cascades to vehicle, ventilation, and cost',
    tagline: 'Inches of diameter drive miles of consequences',
    description: 'When the Boring Company reduces tunnel diameter, the cascade is immediate and deep. Smaller diameter constrains vehicle size, which limits passenger capacity, which changes station throughput. It also constrains ventilation cross-section, emergency egress width, fire suppression access, and construction equipment size - each cascading to cost per mile.',
    connection: 'Tunnel diameter is a single physical constraint whose cascade touches safety, capacity, cost, speed, and construction methodology simultaneously.',
    howItWorks: 'Engineers optimize diameter by tracing cascades through vehicle design, ventilation CFD models, emergency egress simulations, and construction cost models.',
    stats: [
      { value: '12ft', label: 'Diameter', icon: '\u{2B55}' },
      { value: '$10M/mi', label: 'Target cost', icon: '\u{1F4B0}' },
      { value: '150mph', label: 'Design speed', icon: '\u{26A1}' }
    ],
    examples: ['Las Vegas Convention Center Loop', 'Fort Lauderdale proposal', 'LA Metro connector', 'DC-Baltimore tunnel concept'],
    companies: ['The Boring Company', 'Herrenknecht', 'Robbins TBM', 'Hitachi Zosen'],
    futureImpact: 'Autonomous boring machines will adapt diameter in real-time based on geological constraints, creating variable-diameter tunnels.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F9E0}',
    title: 'Neuralink Electrode Count',
    short: 'More electrodes cascade to power, heat, and surgical complexity',
    tagline: 'Each electrode creates a chain reaction of constraints',
    description: 'When Neuralink increases electrode count, the cascade is critical and life-affecting. More electrodes require larger chip area, which increases power draw, which generates more heat in brain tissue, which demands better thermal management, which extends surgical procedure time, which increases anesthesia risk and recovery complexity.',
    connection: 'Electrode count demonstrates how a performance improvement constraint cascades through power, thermal, mechanical, and medical parameters with potentially life-critical implications.',
    howItWorks: 'Biomedical engineers trace the electrode-to-surgery cascade, balancing signal quality gains against thermal, power, and surgical complexity costs at each level.',
    stats: [
      { value: '1024', label: 'Electrodes', icon: '\u{26A1}' },
      { value: '23mm', label: 'Chip diameter', icon: '\u{1F4CF}' },
      { value: '6hr', label: 'Surgery time', icon: '\u{23F1}\u{FE0F}' }
    ],
    examples: ['N1 implant design', 'Surgical robot R1', 'Wireless BCI protocol', 'Electrode thread insertion'],
    companies: ['Neuralink', 'Blackrock Neurotech', 'Synchron', 'Paradromics'],
    futureImpact: 'Nanotechnology electrodes will break the current cascade by achieving more channels with dramatically less chip area and power.',
    color: '#EC4899'
  }
];

// Constraint types for simulation
interface ConstraintType {
  name: string;
  color: string;
  description: string;
  nodes: string[];
  edges: [number, number][];
}

const constraintTypes: ConstraintType[] = [
  {
    name: 'Cost',
    color: '#3B82F6',
    description: 'Budget drives mass, engines, fuel, timeline',
    nodes: ['Budget', 'Mass Limit', 'Engine Count', 'Fuel Volume', 'Tank Size', 'Launch Pad', 'Timeline', 'Workforce'],
    edges: [[0,1],[0,6],[0,7],[1,2],[1,3],[2,3],[3,4],[4,5],[5,6],[6,7]]
  },
  {
    name: 'Time',
    color: '#EF4444',
    description: 'Schedule drives parallel work, testing, integration',
    nodes: ['Deadline', 'Parallel Tasks', 'Testing Cycles', 'Integration', 'Staffing', 'Facility Use', 'Suppliers', 'Risk Buffer'],
    edges: [[0,1],[0,4],[0,7],[1,2],[1,4],[2,3],[3,5],[4,5],[5,6],[6,7]]
  },
  {
    name: 'Mass',
    color: '#10B981',
    description: 'Mass budget drives structure, propulsion, payload',
    nodes: ['Mass Target', 'Structure', 'Propulsion', 'Fuel Mass', 'Payload Bay', 'Avionics', 'Thermal Shield', 'Landing Gear'],
    edges: [[0,1],[0,2],[0,4],[1,6],[2,3],[3,1],[4,5],[5,6],[6,7],[7,1]]
  },
  {
    name: 'Power',
    color: '#F59E0B',
    description: 'Power budget drives compute, sensors, communication',
    nodes: ['Power Budget', 'Compute', 'Sensors', 'Communication', 'Thermal Mgmt', 'Battery Mass', 'Solar Array', 'Redundancy'],
    edges: [[0,1],[0,2],[0,3],[1,4],[2,4],[3,6],[4,5],[5,0],[6,5],[7,1]]
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_ConstraintCascadeRenderer: React.FC<ConstraintCascadeRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state
  const [constraintTightness, setConstraintTightness] = useState(30);
  const [selectedConstraint, setSelectedConstraint] = useState(0);

  // Twist phase - constraint type switching
  const [twistConstraintType, setTwistConstraintType] = useState(0);

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
// Calculate cascade depth based on tightness
  const calculateCascadeDepth = (tightness: number): number => {
    return Math.floor(1 + (tightness / 100) * 3);
  };

  // Calculate affected nodes based on tightness
  const calculateAffectedNodes = (tightness: number, constraintIdx: number): number => {
    const ct = constraintTypes[constraintIdx];
    const ratio = tightness / 100;
    return Math.min(ct.nodes.length, Math.floor(1 + ratio * (ct.nodes.length - 1)));
  };

  // Calculate cascade propagation intensity per node
  const getNodeIntensity = (nodeIdx: number, tightness: number, constraintIdx: number): number => {
    const ct = constraintTypes[constraintIdx];
    // BFS distance from root
    const visited = new Set<number>();
    const queue: [number, number][] = [[0, 0]];
    const distances: Record<number, number> = {};
    while (queue.length > 0) {
      const [node, dist] = queue.shift()!;
      if (visited.has(node)) continue;
      visited.add(node);
      distances[node] = dist;
      for (const [from, to] of ct.edges) {
        if (from === node && !visited.has(to)) queue.push([to, dist + 1]);
        if (to === node && !visited.has(from)) queue.push([from, dist + 1]);
      }
    }
    const dist = distances[nodeIdx] ?? ct.nodes.length;
    const maxDist = Math.max(...Object.values(distances), 1);
    const ratio = tightness / 100;
    const intensity = ratio * Math.max(0, 1 - dist / (maxDist + 1));
    return Math.max(0, Math.min(1, intensity));
  };

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
    hot: '#EF4444',
    cold: '#3B82F6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
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
        gameType: 'constraint-cascade',
        gameTitle: 'Constraint Cascade',
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

  // Current constraint type
  const currentConstraint = constraintTypes[selectedConstraint];
  const cascadeDepth = calculateCascadeDepth(constraintTightness);
  const affectedNodes = calculateAffectedNodes(constraintTightness, selectedConstraint);

  // Progress bar component
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.hot})`,
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
            height: '8px',
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
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

  // Fixed navigation bar component
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

  // Constraint Cascade SVG Visualization
  const CascadeVisualization = ({ constraintIdx, tightness }: { constraintIdx: number; tightness: number }) => {
    const width = isMobile ? 340 : 520;
    const height = 500;
    const ct = constraintTypes[constraintIdx];
    const nodeCount = ct.nodes.length;

    // Position nodes in a tree-like layout
    const getNodePosition = (idx: number): { x: number; y: number } => {
      const levels: number[][] = [];
      const visited = new Set<number>();
      const queue: [number, number][] = [[0, 0]];
      const nodeLevels: Record<number, number> = {};
      while (queue.length > 0) {
        const [node, level] = queue.shift()!;
        if (visited.has(node)) continue;
        visited.add(node);
        nodeLevels[node] = level;
        if (!levels[level]) levels[level] = [];
        levels[level].push(node);
        for (const [from, to] of ct.edges) {
          if (from === node && !visited.has(to)) queue.push([to, level + 1]);
        }
      }
      // Also add unvisited nodes
      for (let i = 0; i < nodeCount; i++) {
        if (!visited.has(i)) {
          const lastLevel = levels.length;
          nodeLevels[i] = lastLevel;
          if (!levels[lastLevel]) levels[lastLevel] = [];
          levels[lastLevel].push(i);
        }
      }
      const level = nodeLevels[idx] ?? 0;
      const nodesAtLevel = levels[level] || [idx];
      const posInLevel = nodesAtLevel.indexOf(idx);
      const totalLevels = levels.length;
      const xSpacing = (width - 100) / Math.max(1, nodesAtLevel.length);
      const ySpacing = (height - 160) / Math.max(1, totalLevels);
      return {
        x: 50 + xSpacing * (posInLevel + 0.5),
        y: 70 + ySpacing * level
      };
    };

    const positions = Array.from({ length: nodeCount }, (_, i) => getNodePosition(i));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Constraint Cascade visualization">
        <defs>
          <linearGradient id="cascadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ct.color} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
          <linearGradient id="edgeGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={ct.color} />
            <stop offset="100%" stopColor={colors.hot} />
          </linearGradient>
          <linearGradient id="edgeGradInactive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ct.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={ct.color} stopOpacity="0" />
          </radialGradient>
          <filter id="cascadeBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <line x1="30" y1="40" x2={width - 30} y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1={height / 3} x2={width - 30} y2={height / 3} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1={(height * 2) / 3} x2={width - 30} y2={(height * 2) / 3} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 3} y1="30" x2={width / 3} y2={height - 30} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={(width * 2) / 3} y1="30" x2={(width * 2) / 3} y2={height - 30} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Dynamic cascade indicator - moves with tightness */}
        <circle
          cx={50 + (tightness / 100) * (width - 100)}
          cy={35}
          r="8"
          fill={ct.color}
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.9"
          filter="url(#cascadeBlur)"
        />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Constraint Cascade \u2014 {ct.name} Constraint
        </text>

        {/* Edges */}
        {ct.edges.map(([from, to], edgeIdx) => {
          const fromPos = positions[from];
          const toPos = positions[to];
          const fromIntensity = getNodeIntensity(from, tightness, constraintIdx);
          const toIntensity = getNodeIntensity(to, tightness, constraintIdx);
          const edgeActive = fromIntensity > 0.1 && toIntensity > 0.1;
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2 - 15;
          return (
            <g key={`edge-${edgeIdx}`}>
              <path
                d={`M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`}
                stroke={edgeActive ? ct.color : 'rgba(255,255,255,0.1)'}
                strokeWidth={edgeActive ? 2.5 : 1}
                fill="none"
                opacity={edgeActive ? 0.8 : 0.3}
                filter={edgeActive ? 'url(#edgeGlow)' : undefined}
              />
              {edgeActive && (
                <circle r="3" fill={ct.color} opacity="0.9">
                  <animateMotion
                    dur={`${1.5 + edgeIdx * 0.2}s`}
                    repeatCount="indefinite"
                    path={`M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {ct.nodes.map((name, nodeIdx) => {
          const pos = positions[nodeIdx];
          const intensity = getNodeIntensity(nodeIdx, tightness, constraintIdx);
          const isRoot = nodeIdx === 0;
          const nodeRadius = isRoot ? 28 : 20 + intensity * 8;
          const isActive = intensity > 0.1;
          return (
            <g key={`node-${nodeIdx}`}>
              {/* Glow behind active nodes */}
              {isActive && (
                <circle cx={pos.x} cy={pos.y} r={nodeRadius + 12} fill="url(#nodeGlow)" opacity={intensity * 0.5} />
              )}
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={isActive ? ct.color : colors.bgSecondary}
                stroke={isActive ? ct.color : colors.border}
                strokeWidth={isRoot ? 3 : 2}
                opacity={isActive ? 0.7 + intensity * 0.3 : 0.4}
                filter={isActive ? 'url(#cascadeBlur)' : undefined}
              />
              {/* Intensity ring */}
              {isActive && intensity > 0.3 && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius + 4}
                  fill="none"
                  stroke={ct.color}
                  strokeWidth="1.5"
                  opacity={intensity * 0.6}
                  strokeDasharray={`${intensity * 20} ${(1 - intensity) * 20}`}
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${pos.x} ${pos.y}`}
                    to={`360 ${pos.x} ${pos.y}`}
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* Node label */}
              <text
                x={pos.x}
                y={pos.y + 1}
                fill={isActive ? colors.textPrimary : colors.textMuted}
                fontSize={isRoot ? '12' : '11'}
                fontWeight={isRoot ? '700' : '500'}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {name.length > 10 ? name.substring(0, 9) + '...' : name}
              </text>
              {/* Intensity percentage */}
              {isActive && (
                <text
                  x={pos.x}
                  y={pos.y + nodeRadius + 20}
                  fill={ct.color}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {Math.round(intensity * 100)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g>
          <circle cx={40} cy={height - 30} r="6" fill={ct.color} opacity="0.8" />
          <text x={52} y={height - 26} fill="#94a3b8" fontSize="11" fontWeight="400">Active Node</text>
          <circle cx={140} cy={height - 30} r="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1.5" />
          <text x={152} y={height - 26} fill="#94a3b8" fontSize="11" fontWeight="400">Inactive</text>
          <line x1={230} y1={height - 30} x2={260} y2={height - 30} stroke={ct.color} strokeWidth="2" />
          <text x={267} y={height - 26} fill="#94a3b8" fontSize="11" fontWeight="400">Cascade Path</text>
        </g>

{/* Stats bar */}
        <rect x={width / 2 - 140} y={height - 16} width="280" height="14" rx="4" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" />
        <text x={width / 2} y={height - 6} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Depth: {cascadeDepth} | Affected: {affectedNodes}/{nodeCount} nodes | Tightness: {tightness}%
        </text>
      </svg>
    );
  };

  // Twist Phase Visualization - Multiple constraint types comparison
  const TwistCascadeVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 340;
    const ct = constraintTypes[twistConstraintType];
    const nodeCount = ct.nodes.length;
    const twistTightness = 70; // Fixed tightness for comparison

    // Circular layout for twist view
    const getCircularPosition = (idx: number): { x: number; y: number } => {
      if (idx === 0) return { x: width / 2, y: height / 2 };
      const angle = ((idx - 1) / (nodeCount - 1)) * 2 * Math.PI - Math.PI / 2;
      const radius = Math.min(width, height) / 2 - 60;
      return {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      };
    };

    const positions = Array.from({ length: nodeCount }, (_, i) => getCircularPosition(i));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="twistGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ct.color} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
          <radialGradient id="twistCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ct.color} stopOpacity="0.4" />
            <stop offset="70%" stopColor={ct.color} stopOpacity="0.1" />
            <stop offset="100%" stopColor={ct.color} stopOpacity="0" />
          </radialGradient>
          <filter id="twistNodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="twistEdgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background radial lines */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 2 * Math.PI;
          const r = Math.min(width, height) / 2 - 20;
          return (
            <line
              key={`radial-${i}`}
              x1={width / 2}
              y1={height / 2}
              x2={width / 2 + r * Math.cos(angle)}
              y2={height / 2 + r * Math.sin(angle)}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="2,6"
            />
          );
        })}

        {/* Center glow */}
        <circle cx={width / 2} cy={height / 2} r="80" fill="url(#twistCenterGlow)" />

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          {ct.name} Constraint \u2014 Cascade Pattern
        </text>

        {/* Edges */}
        {ct.edges.map(([from, to], idx) => {
          const fromPos = positions[from];
          const toPos = positions[to];
          const fromIntensity = getNodeIntensity(from, twistTightness, twistConstraintType);
          const active = fromIntensity > 0.1;
          return (
            <line
              key={`twist-edge-${idx}`}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke={active ? ct.color : 'rgba(255,255,255,0.08)'}
              strokeWidth={active ? 2 : 1}
              opacity={active ? 0.7 : 0.3}
              filter={active ? 'url(#twistEdgeGlow)' : undefined}
            />
          );
        })}

        {/* Nodes */}
        {ct.nodes.map((name, nodeIdx) => {
          const pos = positions[nodeIdx];
          const intensity = getNodeIntensity(nodeIdx, twistTightness, twistConstraintType);
          const isRoot = nodeIdx === 0;
          const radius = isRoot ? 32 : 22 + intensity * 6;
          const isActive = intensity > 0.1;
          return (
            <g key={`twist-node-${nodeIdx}`}>
              {isActive && (
                <circle cx={pos.x} cy={pos.y} r={radius + 8} fill={ct.color} opacity={intensity * 0.15} />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={isActive ? ct.color : colors.bgSecondary}
                stroke={isActive ? 'rgba(255,255,255,0.3)' : colors.border}
                strokeWidth={isRoot ? 3 : 1.5}
                opacity={isActive ? 0.6 + intensity * 0.4 : 0.35}
                filter={isActive ? 'url(#twistNodeGlow)' : undefined}
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                fill={isActive ? colors.textPrimary : colors.textMuted}
                fontSize={isRoot ? '12' : '11'}
                fontWeight={isRoot ? '700' : '500'}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {name.length > 10 ? name.substring(0, 9) + '...' : name}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <rect x={30} y={height - 40} width="12" height="12" rx="2" fill={ct.color} opacity="0.7" />
        <text x={47} y={height - 30} fill="#94a3b8" fontSize="11">Affected</text>
        <rect x={120} y={height - 40} width="12" height="12" rx="2" fill={colors.bgSecondary} stroke={colors.border} />
        <text x={137} y={height - 30} fill="#94a3b8" fontSize="11">Unaffected</text>
        <circle cx={230} cy={height - 34} r="4" fill={ct.color} />
        <text x={240} y={height - 30} fill="#94a3b8" fontSize="11">Root Constraint</text>

        {/* Description */}
        <text x={width / 2} y={height - 10} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          {ct.description}
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

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
            {'\u26D3\uFE0F\u{1F4A5}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Constraint Cascade
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"\"When you change "}
            <span style={{ color: colors.accent }}>one constraint</span>
            {" in a complex system, the effects don't stop at the next variable \u2014 they "}
            <span style={{ color: colors.hot }}>ripple through the entire design</span>
            {". First-principles reasoning means tracing every cascade.\""}
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
              "I think it is important to reason from first principles rather than by analogy. The normal way we conduct our lives is we reason by analogy. We are doing this because it is like something else that was done, or it is like what other people are doing. First principles is a physics way of looking at the world - you boil things down to the most fundamental truths and reason up from there."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Elon Musk
            </p>
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
      { id: 'a', text: '2-3 parameters \u2014 just mass and maybe fuel' },
      { id: 'b', text: '5-8 parameters \u2014 a moderate chain reaction' },
      { id: 'c', text: '10-15+ parameters \u2014 nearly everything changes' },
      { id: 'd', text: 'Only mass changes \u2014 budget is separate from physics' },
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
              If you reduce a rocket's payload budget by 50%, how many other design parameters are directly affected?
            </h2>

            {/* Static SVG showing constraint concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictBudgetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="predictCascadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Payload Budget: Cut by 50%</text>
                {/* Central budget node */}
                <circle cx="200" cy="70" r="25" fill="url(#predictBudgetGrad)" filter="url(#predictGlow)" />
                <text x="200" y="74" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Budget</text>
                {/* Cascade arrows and question marks */}
                <line x1="180" y1="90" x2="100" y2="130" stroke="#F97316" strokeWidth="2" opacity="0.6" />
                <line x1="195" y1="95" x2="155" y2="140" stroke="#F97316" strokeWidth="2" opacity="0.6" />
                <line x1="205" y1="95" x2="245" y2="140" stroke="#F97316" strokeWidth="2" opacity="0.6" />
                <line x1="220" y1="90" x2="300" y2="130" stroke="#F97316" strokeWidth="2" opacity="0.6" />
                {/* Question mark nodes */}
                <circle cx="100" cy="145" r="18" fill={colors.bgSecondary} stroke="#F97316" strokeWidth="1.5" />
                <text x="100" y="150" textAnchor="middle" fill="#F97316" fontSize="16" fontWeight="700">?</text>
                <circle cx="155" cy="155" r="18" fill={colors.bgSecondary} stroke="#F97316" strokeWidth="1.5" />
                <text x="155" y="160" textAnchor="middle" fill="#F97316" fontSize="16" fontWeight="700">?</text>
                <circle cx="245" cy="155" r="18" fill={colors.bgSecondary} stroke="#F97316" strokeWidth="1.5" />
                <text x="245" y="160" textAnchor="middle" fill="#F97316" fontSize="16" fontWeight="700">?</text>
                <circle cx="300" cy="145" r="18" fill={colors.bgSecondary} stroke="#F97316" strokeWidth="1.5" />
                <text x="300" y="150" textAnchor="middle" fill="#F97316" fontSize="16" fontWeight="700">?</text>
                <text x="200" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11">How far does the cascade reach?</text>
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
              {'\u2190'} Back
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

  // PLAY PHASE - Interactive Constraint Cascade Simulator
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
              Constraint Cascade Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Constraint cascading is how Elon Musk approaches every engineering problem. When SpaceX changes one rocket parameter, it ripples through the entire design. Understanding this cascade is the foundation of first-principles reasoning.
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
                <strong style={{ color: colors.textPrimary }}>Constraint Cascade</strong> is defined as the chain reaction of parameter changes that occurs when a single system constraint is modified.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Cascade Depth</strong> refers to the number of levels through which a constraint change propagates before effects become negligible.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.hot }}>Constraint Tightness</strong> describes how restrictive a constraint is \u2014 tighter constraints create deeper and wider cascades.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows how constraints propagate through a system. Watch how tightening the primary constraint (budget) causes cascading effects through connected nodes. The brighter a node glows, the more intensely it is affected by the cascade. Try adjusting the slider to see how tightening or loosening the constraint changes the cascade pattern.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px', fontStyle: 'italic' }}>
              Formula: Cascade Depth = `log(N) × Connectivity` where N = number of variables. The relationship is proportional: tighter constraints produce deeper cascades.
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
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <CascadeVisualization constraintIdx={selectedConstraint} tightness={constraintTightness} />
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
                  {/* Constraint type selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Constraint Type</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {currentConstraint.name} ({currentConstraint.nodes.length} variables)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {constraintTypes.map((ct, i) => (
                        <button
                          key={ct.name}
                          onClick={() => { playSound('click'); setSelectedConstraint(i); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: selectedConstraint === i ? `2px solid ${ct.color}` : `1px solid ${colors.border}`,
                            background: selectedConstraint === i ? `${ct.color}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                          }}
                        >
                          {ct.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Constraint tightness slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Constraint Tightness</span>
                      <span style={{ ...typo.small, color: constraintTightness > 50 ? colors.hot : colors.cold, fontWeight: 600 }}>
                        {constraintTightness}% ({constraintTightness > 70 ? 'Very Tight' : constraintTightness > 40 ? 'Moderate' : 'Loose'})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={constraintTightness}
                      onChange={(e) => setConstraintTightness(parseInt(e.target.value))}
                      onInput={(e) => setConstraintTightness(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Constraint Tightness"
                      style={sliderStyle(colors.accent, constraintTightness, 1, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.cold }}>1% Loose</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50% Moderate</span>
                      <span style={{ ...typo.small, color: colors.hot }}>100% Maximum</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{cascadeDepth}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Cascade Depth</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{affectedNodes}/{currentConstraint.nodes.length}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Nodes Affected</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: constraintTightness > 50 ? colors.hot : colors.cold }}>
                        {constraintTightness}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Tightness</div>
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
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
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
              The Science of Constraint Cascading
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right \u2014 as you observed in the simulation, a single constraint change cascades to 10-15+ parameters in a real rocket design.'
                : 'As you observed in the simulation, a single constraint change cascades much further than most people expect \u2014 typically affecting 10-15+ interconnected parameters in a complex system like a rocket.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Cascade Depth = log(N) \u00D7 Connectivity</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is because the cascade depth depends on the <span style={{ color: colors.accent }}>number of variables (N)</span> and the <span style={{ color: colors.success }}>average connectivity</span> between them. In a rocket with 8 primary variables each connected to 2-3 others, a single change at the root cascades through <span style={{ color: colors.hot }}>3-4 levels deep</span>, affecting virtually every parameter.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Affected = 1 + k + k{'\u00B2'} + k{'\u00B3'} ... where k = avg connections per node
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
                First-Principles Decomposition
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                First-principles reasoning starts by identifying the fundamental constraints of a system, then tracing how each constraint connects to others. Unlike reasoning by analogy ("other rockets do X"), first-principles reveals the actual dependency tree and every cascade path. This is why SpaceX can find optimizations that incumbent companies miss \u2014 they trace the full cascade from physics, not convention.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Constraint Propagation Rules
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Direct Cascade', depth: '1', desc: 'Immediate neighbors' },
                  { name: 'Secondary Cascade', depth: '2', desc: 'Neighbors of neighbors' },
                  { name: 'Tertiary Cascade', depth: '3', desc: 'Third-level effects' },
                  { name: 'Feedback Loops', depth: '\u221E', desc: 'Circular dependencies' },
                  { name: 'Amplification', depth: '\u00D7k', desc: 'Effects multiply' },
                  { name: 'Dampening', depth: '\u00F7k', desc: 'Effects diminish' },
                ].map(rule => (
                  <div key={rule.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{rule.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{rule.depth}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{rule.desc}</div>
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
              {'\u2190'} Back
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
      { id: 'a', text: 'Same cascade pattern \u2014 constraints all propagate identically' },
      { id: 'b', text: 'Completely different cascade pattern \u2014 different nodes become critical' },
      { id: 'c', text: 'Fewer dependencies \u2014 time is simpler than cost' },
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
                New Variable: Constraint Type Switch
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens when you switch the primary constraint from cost to time?
            </h2>

            {/* Static SVG showing constraint type switch */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="timeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                {/* Cost tree (left) */}
                <circle cx="100" cy="35" r="18" fill="url(#costGrad)" opacity="0.8" />
                <text x="100" y="39" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Cost</text>
                <line x1="85" y1="50" x2="60" y2="75" stroke="#3B82F6" strokeWidth="1.5" />
                <line x1="100" y1="53" x2="100" y2="80" stroke="#3B82F6" strokeWidth="1.5" />
                <line x1="115" y1="50" x2="140" y2="75" stroke="#3B82F6" strokeWidth="1.5" />
                <circle cx="60" cy="85" r="10" fill={colors.bgSecondary} stroke="#3B82F6" strokeWidth="1.5" />
                <circle cx="100" cy="90" r="10" fill={colors.bgSecondary} stroke="#3B82F6" strokeWidth="1.5" />
                <circle cx="140" cy="85" r="10" fill={colors.bgSecondary} stroke="#3B82F6" strokeWidth="1.5" />
                {/* Arrow */}
                <text x="200" y="65" textAnchor="middle" fill={colors.warning} fontSize="24" fontWeight="700">{'\u2192'}</text>
                <text x="200" y="85" textAnchor="middle" fill={colors.textMuted} fontSize="11">Switch!</text>
                {/* Time tree (right) */}
                <circle cx="300" cy="35" r="18" fill="url(#timeGrad)" opacity="0.8" />
                <text x="300" y="39" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Time</text>
                <line x1="285" y1="50" x2="265" y2="80" stroke="#EF4444" strokeWidth="1.5" />
                <line x1="295" y1="53" x2="290" y2="82" stroke="#EF4444" strokeWidth="1.5" />
                <line x1="305" y1="53" x2="310" y2="82" stroke="#EF4444" strokeWidth="1.5" />
                <line x1="315" y1="50" x2="335" y2="80" stroke="#EF4444" strokeWidth="1.5" />
                <circle cx="265" cy="90" r="10" fill={colors.bgSecondary} stroke="#EF4444" strokeWidth="1.5" />
                <circle cx="290" cy="92" r="10" fill={colors.bgSecondary} stroke="#EF4444" strokeWidth="1.5" />
                <circle cx="310" cy="92" r="10" fill={colors.bgSecondary} stroke="#EF4444" strokeWidth="1.5" />
                <circle cx="335" cy="90" r="10" fill={colors.bgSecondary} stroke="#EF4444" strokeWidth="1.5" />
                <text x="200" y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">Does the cascade pattern change?</text>
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
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Cascade Reshape
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Constraint Type Switcher
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
              Constraint Type Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Switch between constraint types and see how the entire cascade tree reshapes
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
                <strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> This circular layout shows the same constraint network from a different perspective. Each constraint type (budget, weight, power, thermal) creates a unique cascade pattern through the system.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', marginBottom: 0 }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> When you switch constraint types, watch how the cascade depth and breadth change. Budget constraints tend to affect everything, while thermal constraints create focused, deep cascades in specific subsystems.
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
                    <TwistCascadeVisualization />
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
                  {/* Constraint type selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Primary Constraint</span>
                      <span style={{ ...typo.small, color: constraintTypes[twistConstraintType].color, fontWeight: 600 }}>
                        {constraintTypes[twistConstraintType].name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {constraintTypes.map((ct, i) => (
                        <button
                          key={ct.name}
                          onClick={() => { playSound('click'); setTwistConstraintType(i); }}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: twistConstraintType === i ? `2px solid ${ct.color}` : `1px solid ${colors.border}`,
                            background: twistConstraintType === i ? `${ct.color}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: twistConstraintType === i ? 700 : 400,
                            minHeight: '44px',
                          }}
                        >
                          {ct.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description of current constraint type */}
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    borderLeft: `4px solid ${constraintTypes[twistConstraintType].color}`,
                  }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      <strong style={{ color: constraintTypes[twistConstraintType].color }}>
                        {constraintTypes[twistConstraintType].name} Constraint:
                      </strong>{' '}
                      {constraintTypes[twistConstraintType].description}. The cascade flows through{' '}
                      {constraintTypes[twistConstraintType].nodes.join(' \u2192 ')}.
                    </p>
                  </div>

                  {/* Comparison grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: constraintTypes[twistConstraintType].color }}>
                        {constraintTypes[twistConstraintType].nodes.length}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Total Variables</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>
                        {constraintTypes[twistConstraintType].edges.length}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Dependencies</div>
                    </div>
                  </div>

                  {/* Key insight */}
                  <div style={{
                    background: `${colors.warning}22`,
                    border: `1px solid ${colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      Key Insight:
                    </p>
                    <div style={{
                      ...typo.body,
                      color: colors.warning,
                      fontWeight: 600,
                    }}>
                      Switching the primary constraint completely reshapes the dependency tree
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      Different root constraints activate different cascade paths and critical nodes
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
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Cascade Reshaping
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
              The Power of Constraint Type Switching
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why the Cascade Reshapes</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>Cascade(type) = Tree(root=type, edges=dependencies(type))</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When you change the primary constraint from cost to time, the entire dependency structure reorganizes. Cost-driven cascades prioritize material and labor efficiencies. Time-driven cascades prioritize parallelization and critical path reduction. The same system has a <strong>completely different cascade topology</strong> depending on which constraint is primary.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>System-Level Thinking</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Elon Musk frequently switches primary constraints to find optimal design points. SpaceX optimized Falcon 9 for cost (reusability), while competitors optimized for performance (expendable). By switching the root constraint, SpaceX found a completely different \u2014 and superior \u2014 cascade solution that others missed.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Constraint cascading is the mechanism behind first-principles reasoning. When you decompose a problem to its fundamental constraints and trace every cascade path, you see the true solution space \u2014 not the conventional one. This is how breakthrough engineering happens: by understanding that changing one constraint reshapes everything.
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
              {'\u2190'} Back
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
        conceptName="E L O N_ Constraint Cascade"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Cascade Connection:</p>
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
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      // Auto-advance to next uncompleted app or test phase
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
              {'\u2190'} Back
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
                {passed ? 'You understand constraint cascading and first-principles reasoning!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Constraint Cascade
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of constraint cascading and first-principles reasoning to real-world engineering scenarios. Each question presents a practical situation where constraint propagation determines the design outcome. Consider cascade depth, dependency trees, and how changing the primary constraint reshapes the entire system.
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
                {'\u2190'} Previous
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
            Constraint Cascade Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how one constraint change ripples through an entire system, and why first-principles reasoning is the key to breakthrough engineering.
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
                'First-principles decomposition of complex systems',
                'Constraint propagation and cascade depth',
                'How switching constraint types reshapes the dependency tree',
                'System-level thinking across interconnected variables',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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

export default ELON_ConstraintCascadeRenderer;
