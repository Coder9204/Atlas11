'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Model as Reviewer - Complete 10-Phase Game
// How independent critique catches bugs that generation misses
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

interface ModelAsReviewerRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
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
    scenario: "A developer asks an LLM to write a kinetic energy function. It produces: energy = mass * velocity * velocity. The code compiles and runs.",
    question: "What fundamental error does this code contain?",
    options: [
      { id: 'a', label: "The variable names are incorrect" },
      { id: 'b', label: "Missing the 1/2 factor - KE = (1/2)mv^2, not mv^2", correct: true },
      { id: 'c', label: "Velocity should be cubed, not squared" },
      { id: 'd', label: "Mass and velocity should be added, not multiplied" }
    ],
    explanation: "Kinetic energy is KE = (1/2)mv^2. LLMs often produce formulas that look correct but have subtle dimensional or constant errors. A review pass checking 'unit consistency' would catch this."
  },
  {
    scenario: "An AI generates F = mass + acceleration as a force calculation. A second review pass with prompt 'Check for physics law violations' immediately flags this.",
    question: "Why did the review pass catch what generation missed?",
    options: [
      { id: 'a', label: "The review model is smarter than the generation model" },
      { id: 'b', label: "Review mode optimizes for finding errors, not for producing plausible code", correct: true },
      { id: 'c', label: "Review always catches every error" },
      { id: 'd', label: "The same model cannot be used for both generation and review" }
    ],
    explanation: "Generation optimizes for plausibility - code that looks correct. Review mode with specific prompts optimizes for error detection. Different objectives reveal different issues."
  },
  {
    scenario: "A momentum calculation returns 0 for negative velocities. The original LLM prompt was 'write a momentum calculator' without further specification.",
    question: "What type of review check would catch this error?",
    options: [
      { id: 'a', label: "Unit consistency check" },
      { id: 'b', label: "Edge case review - checking boundary conditions and unusual inputs", correct: true },
      { id: 'c', label: "Code style check" },
      { id: 'd', label: "Performance optimization check" }
    ],
    explanation: "Edge case review examines boundary conditions like negative values, zero, and extreme inputs. Momentum can be negative (opposite direction), so excluding negative velocities is a logic error."
  },
  {
    scenario: "A financial calculation AI produces code that sometimes creates money from nothing by adding interest incorrectly. The error was not caught by the same model in review mode.",
    question: "What additional review strategy would help catch this?",
    options: [
      { id: 'a', label: "Using prettier code formatting" },
      { id: 'b', label: "Cross-checking with a different model or static analysis tool", correct: true },
      { id: 'c', label: "Running the code faster" },
      { id: 'd', label: "Using a smaller model" }
    ],
    explanation: "Different models have different blind spots. Cross-checking with a different model or tool (like a static analyzer) reduces correlated mistakes that same-model review might miss."
  },
  {
    scenario: "A team implements 'Review for units, conservation laws, edge cases' as a standard second pass for all physics code. Bug rates drop by 60%.",
    question: "Why is this checklist-based approach effective?",
    options: [
      { id: 'a', label: "It makes the review take longer" },
      { id: 'b', label: "It directs focused attention to common error categories systematically", correct: true },
      { id: 'c', label: "Checklists are always better than free-form review" },
      { id: 'd', label: "The specific words in the checklist don't matter" }
    ],
    explanation: "Checklist-based review systematically verifies specific criteria. Each item (units, conservation, edge cases) targets a known category of errors, ensuring comprehensive coverage."
  },
  {
    scenario: "Model A generates API code. Model B reviews it and finds authentication edge cases. Model A reviews Model B's fixes and finds input validation issues. Neither found all bugs alone.",
    question: "What does this demonstrate about multi-model review?",
    options: [
      { id: 'a', label: "Multiple models are always slower" },
      { id: 'b', label: "Different models catch different errors - cross-checking improves coverage", correct: true },
      { id: 'c', label: "The models are randomly guessing" },
      { id: 'd', label: "One model is clearly superior" }
    ],
    explanation: "Different models have different training data and architectures, leading to different blind spots. Cross-checking leverages these differences for better overall coverage."
  },
  {
    scenario: "A race condition bug in concurrent code was not caught by any single-model review pass but was found when the prompt explicitly said 'identify potential race conditions and deadlocks'.",
    question: "What principle does this illustrate?",
    options: [
      { id: 'a', label: "Race conditions are impossible to find" },
      { id: 'b', label: "Specific prompts focus the model's attention on specific error types", correct: true },
      { id: 'c', label: "Only humans can find concurrency bugs" },
      { id: 'd', label: "Random prompts work equally well" }
    ],
    explanation: "Directed prompts focus the model's reasoning on specific concerns. Without explicit focus, the model may not allocate attention to complex issues like race conditions."
  },
  {
    scenario: "A review pass that finds no issues is presented to the development team. An experienced engineer asks 'Was the checklist comprehensive enough?'",
    question: "Why is this a valid concern?",
    options: [
      { id: 'a', label: "All code must have bugs" },
      { id: 'b', label: "A clean review might indicate incomplete checklist rather than perfect code", correct: true },
      { id: 'c', label: "Review passes should always find exactly 3 bugs" },
      { id: 'd', label: "The engineer is being unnecessarily skeptical" }
    ],
    explanation: "A clean review should prompt reflection on checklist completeness. If the checklist didn't cover relevant error types for this domain, bugs might still exist undetected."
  },
  {
    scenario: "Company A uses single-pass generation. Company B adds review passes with domain-specific checklists. After 6 months, Company B has 40% fewer production incidents.",
    question: "What is the key insight from this comparison?",
    options: [
      { id: 'a', label: "Company B's developers are smarter" },
      { id: 'b', label: "Independent critique in review mode catches errors that generation mode misses", correct: true },
      { id: 'c', label: "Company A should use a different model" },
      { id: 'd', label: "Production incidents are unpredictable" }
    ],
    explanation: "The model-as-reviewer pattern - using a separate pass focused on error detection - systematically catches bugs that single-pass generation tends to produce but not notice."
  },
  {
    scenario: "A scientific simulation produces results that look reasonable but violate conservation of energy. The bug was a subtle sign error in the integration routine.",
    question: "Which review prompt would most likely catch this?",
    options: [
      { id: 'a', label: "Make the code run faster" },
      { id: 'b', label: "Verify that conservation laws are satisfied in all calculations", correct: true },
      { id: 'c', label: "Add more comments to the code" },
      { id: 'd', label: "Rename variables for clarity" }
    ],
    explanation: "Conservation law verification is essential for physics code. A review pass specifically checking that energy, momentum, and mass are conserved catches non-physical results."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: 'Physics',
    title: 'Scientific Computing',
    short: 'Catching dimension and conservation errors',
    tagline: 'Physics simulations require mathematical precision',
    description: 'Physics simulations demand dimensional consistency and conservation law adherence. A single missing factor or wrong operator can produce plausible-looking but completely wrong results.',
    connection: 'Review prompts like "check units and conservation laws" catch subtle errors like missing 1/2 factors in kinetic energy, wrong operators (+ vs *), and violations of energy conservation.',
    howItWorks: 'After generation, a review pass verifies: (1) All terms have consistent units, (2) Conservation laws are satisfied, (3) Edge cases like negative values are handled, (4) Numerical stability is maintained.',
    stats: [
      { value: '60%', label: 'Bugs caught by units check', icon: 'Measure' },
      { value: '3x', label: 'Fewer physics errors', icon: 'Target' },
      { value: '$2M', label: 'Saved in sim reruns', icon: 'Dollar' }
    ],
    examples: ['NASA simulations', 'CERN data analysis', 'Climate models', 'Fusion research'],
    companies: ['NVIDIA SimNet', 'Ansys', 'COMSOL', 'OpenFOAM'],
    futureImpact: 'AI-assisted physics verification will become standard, with specialized review models trained on physics principles.',
    color: '#8B5CF6'
  },
  {
    icon: 'Bank',
    title: 'Financial Calculations',
    short: 'Preventing money-from-nothing errors',
    tagline: 'Financial code must handle every edge case',
    description: 'Financial systems must handle edge cases like zero balances, negative values, rounding errors, and overflow conditions. Subtle bugs can create or destroy money.',
    connection: 'Review checklists for financial code include: bounds checking, precision handling, audit trail requirements, and regulatory compliance. Cross-checking catches rounding errors same-model review misses.',
    howItWorks: 'Review passes verify: (1) No negative balances where prohibited, (2) Proper rounding modes for currency, (3) Overflow protection, (4) Transaction atomicity, (5) Audit logging.',
    stats: [
      { value: '$4.5B', label: 'Annual bug losses prevented', icon: 'Shield' },
      { value: '99.99%', label: 'Transaction accuracy', icon: 'Check' },
      { value: '45%', label: 'Faster audit compliance', icon: 'Clock' }
    ],
    examples: ['Trading systems', 'Payment processing', 'Risk calculations', 'Tax computations'],
    companies: ['Stripe', 'Bloomberg', 'Two Sigma', 'Citadel'],
    futureImpact: 'Regulatory bodies may require AI review passes for financial code, creating new compliance standards.',
    color: '#10B981'
  },
  {
    icon: 'API',
    title: 'API Design',
    short: 'Covering failure modes systematically',
    tagline: 'APIs must handle invalid inputs gracefully',
    description: 'APIs must handle invalid inputs, rate limits, authentication failures, and error conditions. Generation tends to focus on the happy path, leaving edge cases unhandled.',
    connection: 'Review prompts asking "what happens with invalid input? Missing auth? Rate limited?" force consideration of failure modes that would otherwise become production incidents.',
    howItWorks: 'Review verifies: (1) All inputs are validated, (2) Error responses are informative, (3) Authentication is checked before action, (4) Rate limiting is enforced, (5) Timeouts are handled.',
    stats: [
      { value: '70%', label: 'Fewer security vulns', icon: 'Lock' },
      { value: '3hr', label: 'Mean time to detect', icon: 'Bell' },
      { value: '99.9%', label: 'Uptime improvement', icon: 'Server' }
    ],
    examples: ['REST APIs', 'GraphQL endpoints', 'Webhooks', 'OAuth flows'],
    companies: ['Twilio', 'Plaid', 'Auth0', 'Postman'],
    futureImpact: 'API contracts will be automatically verified against implementation, with review passes checking for specification compliance.',
    color: '#3B82F6'
  },
  {
    icon: 'Threads',
    title: 'Concurrent Code',
    short: 'Finding race conditions and deadlocks',
    tagline: 'Concurrency bugs hide until production',
    description: 'Multi-threaded code has subtle race conditions and deadlock risks that are notoriously hard to spot. These bugs often appear only under production load.',
    connection: 'Directed review prompts like "identify potential race conditions and deadlocks" apply focused attention that generation mode lacks. Different models may spot different threading issues.',
    howItWorks: 'Review checks: (1) Shared state is properly synchronized, (2) Lock ordering prevents deadlock, (3) Atomic operations are used correctly, (4) Thread-safe data structures are used.',
    stats: [
      { value: '85%', label: 'Race conditions found', icon: 'Zap' },
      { value: '12x', label: 'Faster than manual review', icon: 'Fast' },
      { value: '50%', label: 'Less debugging time', icon: 'Bug' }
    ],
    examples: ['Database engines', 'Game servers', 'Trading platforms', 'Real-time systems'],
    companies: ['Intel TBB', 'Uber', 'Discord', 'Epic Games'],
    futureImpact: 'Static analysis tools will integrate with LLM review for comprehensive concurrency verification.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ModelAsReviewerRenderer: React.FC<ModelAsReviewerRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer
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
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [useReviewPass, setUseReviewPass] = useState(false);
  const [checkUnits, setCheckUnits] = useState(true);
  const [checkConservation, setCheckConservation] = useState(true);
  const [checkEdgeCases, setCheckEdgeCases] = useState(true);
  const [checkBounds, setCheckBounds] = useState(false);
  const [useCrossChecker, setUseCrossChecker] = useState(false);

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

  // Sample code with hidden bugs
  const codeSample = {
    code: `def calculate_energy(mass, velocity):
    # E = mv^2 (kinetic energy)
    energy = mass * velocity * velocity
    return energy

def calculate_force(mass, acceleration):
    # F = ma
    force = mass + acceleration  # BUG: should be *
    return force

def calculate_momentum(mass, velocity):
    if velocity > 0:  # BUG: misses negative velocity
        momentum = mass * velocity
        return momentum
    return 0`,
    bugs: [
      { line: 3, type: 'units', description: 'Missing 1/2 factor: KE = (1/2)mv^2' },
      { line: 8, type: 'logic', description: 'Using + instead of *: F = m*a' },
      { line: 12, type: 'edge_case', description: 'Negative velocity excluded' }
    ]
  };

  // Calculate review effectiveness
  const calculateReviewScore = useCallback(() => {
    let detected = 0;
    const total = codeSample.bugs.length;

    if (checkUnits) detected++;
    if (checkConservation) detected++;
    if (checkEdgeCases) detected++;

    const reviewEffectiveness = (detected / total) * 100;
    const crossCheckBonus = useCrossChecker ? 20 : 0;

    return {
      detected,
      total,
      effectiveness: Math.min(100, reviewEffectiveness + crossCheckBonus),
      bugsFound: {
        units: checkUnits,
        conservation: checkConservation,
        edgeCases: checkEdgeCases,
        bounds: checkBounds
      }
    };
  }, [checkUnits, checkConservation, checkEdgeCases, checkBounds, useCrossChecker, codeSample.bugs.length]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    review: {
      pass: '#22c55e',
      fail: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    }
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 }
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Cross-Check',
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
        gameType: 'model-as-reviewer',
        gameTitle: 'Model as Reviewer',
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

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease'
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0'
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
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease'
  };

  // Code Review Visualization
  const renderVisualization = (interactive: boolean, showCrossCheck: boolean = false) => {
    const width = isMobile ? 340 : 700;
    const height = isMobile ? 380 : 480;
    const score = calculateReviewScore();

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${isMobile ? 340 : 700} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '750px' }}
      >
        <defs>
          <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#reviewBg)" rx="12" />

        {/* Title */}
        <text x={width / 2} y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="600">
          AI Code Review Dashboard
        </text>

        {/* Code panel */}
        <g transform={`translate(${isMobile ? 10 : 20}, 50)`}>
          <rect width={isMobile ? 160 : 280} height={isMobile ? 160 : 220} rx="8" fill="#0f172a" stroke="#334155" />
          <rect width={isMobile ? 160 : 280} height="24" rx="8" fill="#1e293b" />
          <circle cx="12" cy="12" r="4" fill="#ef4444" />
          <circle cx="26" cy="12" r="4" fill="#f59e0b" />
          <circle cx="40" cy="12" r="4" fill="#10b981" />
          <text x={isMobile ? 80 : 140} y="16" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
            physics_calc.py
          </text>

          {/* Code lines */}
          {codeSample.code.split('\n').slice(0, isMobile ? 8 : 14).map((line, i) => {
            const hasBug = codeSample.bugs.some(b => b.line === i + 1);
            const bugDetected = hasBug && useReviewPass && (
              (i + 1 === 3 && checkUnits) ||
              (i + 1 === 8 && checkConservation) ||
              (i + 1 === 12 && checkEdgeCases)
            );

            return (
              <g key={i}>
                <text x="8" y={38 + i * 12} fill={colors.textMuted} fontSize="8" fontFamily="monospace">
                  {i + 1}
                </text>
                {bugDetected && (
                  <rect x="20" y={30 + i * 12} width={isMobile ? 130 : 250} height="12" fill="rgba(239,68,68,0.2)" rx="2" />
                )}
                <text
                  x="24"
                  y={38 + i * 12}
                  fill={bugDetected ? colors.error : line.includes('#') ? '#6b7280' : colors.textMuted}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {line.substring(0, isMobile ? 20 : 35)}
                </text>
                {bugDetected && (
                  <circle cx={isMobile ? 155 : 270} cy={35 + i * 12} r="4" fill={colors.error} filter="url(#glow)" />
                )}
              </g>
            );
          })}
        </g>

        {/* AI Model indicator */}
        <g transform={`translate(${isMobile ? 180 : 320}, 80)`}>
          <circle
            cx="40"
            cy="40"
            r="35"
            fill={useReviewPass ? 'rgba(6,182,212,0.2)' : 'rgba(100,116,139,0.2)'}
            stroke={useReviewPass ? '#06b6d4' : '#475569'}
            strokeWidth="2"
          />
          <circle cx="40" cy="40" r="20" fill={useReviewPass ? 'rgba(6,182,212,0.4)' : 'rgba(71,85,105,0.4)'} />
          <circle cx="40" cy="40" r="8" fill={useReviewPass ? colors.accent : '#475569'} />
          <text x="40" y="95" textAnchor="middle" fill={colors.textSecondary} fontSize="10">
            {useReviewPass ? 'REVIEWING...' : 'STANDBY'}
          </text>
        </g>

        {/* Checklist panel */}
        <g transform={`translate(${isMobile ? 180 : 500}, ${isMobile ? 180 : 50})`}>
          <rect width={isMobile ? 150 : 180} height={isMobile ? 130 : 220} rx="8" fill="rgba(30,58,95,0.5)" stroke="#0e7490" />
          <text x={isMobile ? 75 : 90} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">
            Review Checklist
          </text>

          {[
            { label: 'Unit Consistency', checked: checkUnits, key: 'units' },
            { label: 'Conservation Laws', checked: checkConservation, key: 'conservation' },
            { label: 'Edge Cases', checked: checkEdgeCases, key: 'edge' },
            { label: 'Bounds Check', checked: checkBounds, key: 'bounds' }
          ].map((item, i) => (
            <g key={item.key} transform={`translate(8, ${32 + i * (isMobile ? 24 : 38)})`}>
              <rect
                width={isMobile ? 134 : 164}
                height={isMobile ? 20 : 32}
                rx="6"
                fill={item.checked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}
                stroke={item.checked ? colors.success : 'rgba(255,255,255,0.1)'}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => {
                  if (item.key === 'units') setCheckUnits(!checkUnits);
                  if (item.key === 'conservation') setCheckConservation(!checkConservation);
                  if (item.key === 'edge') setCheckEdgeCases(!checkEdgeCases);
                  if (item.key === 'bounds') setCheckBounds(!checkBounds);
                } : undefined}
              />
              <circle cx={isMobile ? 12 : 18} cy={isMobile ? 10 : 16} r={isMobile ? 6 : 8} fill={item.checked ? colors.success : 'rgba(100,116,139,0.3)'} />
              <text x={isMobile ? 12 : 18} y={isMobile ? 13 : 20} textAnchor="middle" fill="white" fontSize={isMobile ? 8 : 10}>
                {item.checked ? 'Y' : ''}
              </text>
              <text x={isMobile ? 26 : 34} y={isMobile ? 14 : 20} fill={item.checked ? colors.success : colors.textSecondary} fontSize={isMobile ? 9 : 11}>
                {item.label}
              </text>
            </g>
          ))}

          {showCrossCheck && (
            <g transform={`translate(8, ${isMobile ? 130 : 195})`}>
              <rect
                width={isMobile ? 134 : 164}
                height={isMobile ? 18 : 22}
                rx="6"
                fill={useCrossChecker ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'}
                stroke={useCrossChecker ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => setUseCrossChecker(!useCrossChecker) : undefined}
              />
              <text x={isMobile ? 67 : 82} y={isMobile ? 12 : 15} textAnchor="middle" fill={useCrossChecker ? '#a78bfa' : colors.textMuted} fontSize="9">
                {useCrossChecker ? 'Cross-Check ON' : '+ Cross-Checker'}
              </text>
            </g>
          )}
        </g>

        {/* Results panel */}
        <g transform={`translate(${isMobile ? 10 : 20}, ${isMobile ? 320 : 290})`}>
          <rect width={isMobile ? 320 : 660} height={isMobile ? 50 : 80} rx="8" fill="rgba(31,41,55,0.8)" stroke="#374151" />

          <text x="16" y="20" fill={colors.textSecondary} fontSize="10">Effectiveness</text>
          <rect x="16" y="28" width={isMobile ? 120 : 200} height="12" rx="4" fill="rgba(0,0,0,0.4)" />
          <rect
            x="16"
            y="28"
            width={Math.max(0, (score.effectiveness / 100) * (isMobile ? 120 : 200))}
            height="12"
            rx="4"
            fill={score.effectiveness > 80 ? colors.success : score.effectiveness > 50 ? colors.warning : colors.error}
          />
          <text x={isMobile ? 76 : 116} y="37" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">
            {score.effectiveness.toFixed(0)}%
          </text>

          <text x={isMobile ? 160 : 240} y="20" fill={colors.textSecondary} fontSize="10">Bugs Found</text>
          <text x={isMobile ? 160 : 240} y="40" fill={colors.accent} fontSize="16" fontWeight="700">
            {score.detected} / {score.total}
          </text>

          <text x={isMobile ? 240 : 400} y="20" fill={colors.textSecondary} fontSize="10">Status</text>
          <circle
            cx={isMobile ? 250 : 410}
            cy="35"
            r="8"
            fill={useReviewPass ? (score.effectiveness > 80 ? colors.success : colors.warning) : 'rgba(100,116,139,0.3)'}
          />
          <text x={isMobile ? 264 : 424} y="38" fill={useReviewPass ? (score.effectiveness > 80 ? colors.success : colors.warning) : colors.textMuted} fontSize="10">
            {useReviewPass ? (score.effectiveness > 80 ? 'PASSING' : 'ISSUES') : 'INACTIVE'}
          </text>
        </g>
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
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '64px', marginBottom: '24px' }}>
          Review AI
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Model as Reviewer
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px'
        }}>
          "Can one pass write <span style={{ color: colors.error }}>plausible nonsense</span>?
          Learn why <span style={{ color: colors.success }}>independent critique</span> catches
          bugs that generation mode misses."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "LLMs optimize for plausibility during generation - code that looks correct.
            But looking correct and being correct are different things. A second pass
            in reviewer mode applies different objectives that catch hidden errors."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - AI Safety Research Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Learn Review Patterns
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'One pass is enough - modern LLMs can write correct code' },
      { id: 'b', text: 'A second review pass catches errors that slip through in generation', correct: true },
      { id: 'c', text: 'Review passes do not help - the same model makes the same mistakes' }
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            An LLM generates physics code. A second pass reviews it with "check for unit errors, conservation violations, edge cases." What happens?
          </h2>

          {/* Visualization preview */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            {renderVisualization(false)}
          </div>

          {/* Options */}
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
                  transition: 'all 0.2s'
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
                  fontWeight: 700
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Review Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Code Review Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle review checks to see which bugs they catch
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderVisualization(true)}
            </div>

            {/* Review toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => setUseReviewPass(!useReviewPass)}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: useReviewPass
                    ? `linear-gradient(135deg, ${colors.success}, #059669)`
                    : `linear-gradient(135deg, ${colors.error}, #dc2626)`,
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {useReviewPass ? 'Review Pass ON' : 'Review Pass OFF'}
              </button>
              <button
                onClick={() => {
                  setCheckUnits(true);
                  setCheckConservation(true);
                  setCheckEdgeCases(true);
                  setCheckBounds(true);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.accent}`,
                  background: 'transparent',
                  color: colors.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Enable All Checks
              </button>
            </div>

            {/* Checklist controls */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                Click checklist items to toggle them:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { label: 'Units', checked: checkUnits, set: setCheckUnits },
                  { label: 'Conservation', checked: checkConservation, set: setCheckConservation },
                  { label: 'Edge Cases', checked: checkEdgeCases, set: setCheckEdgeCases },
                  { label: 'Bounds', checked: checkBounds, set: setCheckBounds }
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => item.set(!item.checked)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: item.checked ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                      background: item.checked ? 'rgba(16,185,129,0.2)' : 'transparent',
                      color: item.checked ? colors.success : colors.textMuted,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key observations */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Key Observations:
              </h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Unit check catches missing 1/2 in kinetic energy formula</li>
                <li>Conservation check catches F=m+a (should be F=m*a)</li>
                <li>Edge case check catches excluded negative velocities</li>
                <li>Each checklist item targets a specific error category</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.error}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'The Answer: Review Passes Help'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              A second pass in review mode catches errors that slip through generation.
              The key is directing attention with specific checks.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Why Independent Critique Works
            </h3>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.accent }}>Different Objectives:</strong> Generation
                mode optimizes for "write code that does X." Review mode optimizes for "find
                problems with this code." Different objectives reveal different issues.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.accent }}>Directed Attention:</strong> Asking
                "check units" forces examination of dimensional analysis. Without this prompt,
                the model might not think about units at all.
              </p>
              <p>
                <strong style={{ color: colors.accent }}>The Key Prompt:</strong> "Review for
                unit consistency, conservation laws, edge cases, failure modes."
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.review.info}22`,
            border: `1px solid ${colors.review.info}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ ...typo.h3, color: colors.review.info, marginBottom: '12px' }}>
              The Bugs Found
            </h3>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li><strong>Line 3:</strong> Missing 1/2 factor - KE = (1/2)mv^2, not mv^2</li>
              <li><strong>Line 8:</strong> Wrong operator - F = m*a, not m+a</li>
              <li><strong>Line 12:</strong> Logic error - momentum can be negative</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Using the same model twice is sufficient for review' },
      { id: 'b', text: 'Different models/tools catch different errors - cross-checking improves coverage', correct: true },
      { id: 'c', text: 'Using multiple models is too expensive to be practical' }
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Cross-Checking
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What if we use different models or tools as cross-checkers instead of the same model reviewing itself?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            {renderVisualization(false, true)}
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
                  cursor: 'pointer'
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
                  fontWeight: 700
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See Cross-Check Effect
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Cross-Check Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Enable the cross-checker to see improved coverage
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderVisualization(true, true)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => setUseReviewPass(!useReviewPass)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: useReviewPass ? colors.success : colors.error,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {useReviewPass ? 'Review ON' : 'Review OFF'}
              </button>
              <button
                onClick={() => setUseCrossChecker(!useCrossChecker)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: useCrossChecker ? 'none' : `2px solid #8b5cf6`,
                  background: useCrossChecker ? '#8b5cf6' : 'transparent',
                  color: useCrossChecker ? 'white' : '#8b5cf6',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {useCrossChecker ? 'Cross-Check ON' : 'Cross-Check OFF'}
              </button>
            </div>

            <div style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h4 style={{ ...typo.small, color: '#a78bfa', marginBottom: '8px', fontWeight: 600 }}>
                Cross-Checker Benefits:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Different models have different blind spots. Model A might miss edge cases
                but catch unit errors. Model B might catch edge cases but miss unit errors.
                Cross-checking reduces correlated blind spots by +20% effectiveness.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistWasCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: twistWasCorrect ? `${colors.success}22` : `${colors.error}22`,
            border: `1px solid ${twistWasCorrect ? colors.success : colors.error}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ ...typo.h3, color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {twistWasCorrect ? 'Correct!' : 'Cross-Checking Improves Coverage'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Different models have different blind spots. Cross-checking reduces correlated mistakes.
            </p>
          </div>

          <h3 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Building a Review Pipeline
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              { level: 1, title: 'Same-Model Review', desc: 'Review with checklist (units, conservation, edge cases)', color: colors.success },
              { level: 2, title: 'Cross-Model Review', desc: 'Different LLM reviews (Claude + GPT, for example)', color: colors.review.info },
              { level: 3, title: 'Static Analysis', desc: 'Linters, type checkers, dimensional analysis tools', color: colors.warning },
              { level: 4, title: 'Property Testing', desc: 'Automated verification of invariants', color: '#8b5cf6' }
            ].map(item => (
              <div
                key={item.level}
                style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '20px',
                  borderLeft: `4px solid ${item.color}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: item.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px'
                  }}>
                    {item.level}
                  </span>
                  <h4 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{item.title}</h4>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '40px' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                {completedApps[i] && (
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
                    lineHeight: '18px'
                  }}>
                    Y
                  </div>
                )}
                <div style={{ fontSize: '12px', marginBottom: '4px', color: a.color }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px', color: app.color }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Review Patterns Apply:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px', color: app.color }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;

      if (passed && onCorrectAnswer) onCorrectAnswer();
      if (!passed && onIncorrectAnswer) onIncorrectAnswer();

      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px'
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? 'Trophy' : 'Book'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand model-as-reviewer patterns!'
                : 'Review the concepts and try again.'}
            </p>

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
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px'
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border
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
            borderLeft: `3px solid ${colors.accent}`
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
                  cursor: 'pointer'
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
                  fontWeight: 700
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer'
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600
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
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600
                }}
              >
                Submit Test
              </button>
            )}
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
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite'
        }}>
          Trophy
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Model-as-Reviewer Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how independent critique catches bugs that generation mode misses.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px'
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Generation optimizes for plausibility, not correctness',
              'Review mode applies different objectives',
              'Checklists direct attention to error categories',
              'Cross-checking reduces correlated blind spots',
              'Specific prompts catch specific bug types'
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>Y</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}22`,
          border: `1px solid ${colors.accent}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          maxWidth: '500px'
        }}>
          <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
            The Key Prompt:
          </h4>
          <p style={{ ...typo.body, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "Review for unit consistency, conservation laws, edge cases, failure modes."
          </p>
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
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ModelAsReviewerRenderer;
