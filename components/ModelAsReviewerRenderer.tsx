import React, { useState, useCallback, useEffect, useRef } from 'react';

// Game event interface for AI coach integration
export interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'answer' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface ModelAsReviewerRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase type for internal state management
type MRPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: MRPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseOrder: MRPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<MRPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Test Twist',
  twist_review: 'Twist Review',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  review: {
    pass: '#22c55e',
    fail: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
};

const ModelAsReviewerRenderer: React.FC<ModelAsReviewerRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): MRPhase => {
    if (gamePhase && validPhases.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<MRPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation state to prevent double-clicks
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with external gamePhase prop if provided (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Check for mobile viewport
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

  // Emit game events for AI coach integration
  const emitGameEvent = useCallback((type: GameEvent['type'], data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({
        type,
        phase,
        data,
        timestamp: Date.now(),
      });
    }
  }, [onGameEvent, phase]);

  // Navigation function with debouncing
  const goToPhase = useCallback((targetPhase: MRPhase) => {
    const now = Date.now();
    if (isNavigating.current || now - lastClickRef.current < 300) {
      return;
    }
    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(targetPhase);
    emitGameEvent('phase_change', { from: phase, to: targetPhase });

    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [phase, emitGameEvent]);

  // Simulation state
  const [useReviewPass, setUseReviewPass] = useState(false);
  const [checkUnits, setCheckUnits] = useState(true);
  const [checkConservation, setCheckConservation] = useState(true);
  const [checkEdgeCases, setCheckEdgeCases] = useState(true);
  const [checkBounds, setCheckBounds] = useState(false);
  const [useCrossChecker, setUseCrossChecker] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

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
      { line: 3, type: 'units', description: 'Missing 1/2 factor: KE = (1/2)mv^2, not mv^2' },
      { line: 8, type: 'logic', description: 'Using + instead of *: F = m*a, not m+a' },
      { line: 12, type: 'edge_case', description: 'Negative velocity excluded: momentum can be negative' },
    ]
  };

  const calculateReviewScore = useCallback(() => {
    let detected = 0;
    let total = codeSample.bugs.length;

    if (checkUnits) detected++; // Catches the 1/2 factor
    if (checkConservation) detected++; // Catches F=ma error
    if (checkEdgeCases) detected++; // Catches negative velocity

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
        bounds: checkBounds,
      }
    };
  }, [checkUnits, checkConservation, checkEdgeCases, checkBounds, useCrossChecker]);

  const predictions = [
    { id: 'perfect', label: 'One pass is enough - modern LLMs can write correct code' },
    { id: 'review_helps', label: 'A second review pass catches errors that slip through in generation' },
    { id: 'no_difference', label: 'Review passes do not help - the same model makes the same mistakes' },
    { id: 'manual_only', label: 'Only human review can catch AI errors' },
  ];

  const twistPredictions = [
    { id: 'same_model', label: 'Using the same model twice is sufficient for review' },
    { id: 'different_models', label: 'Different models/tools catch different errors - cross-checking improves coverage' },
    { id: 'more_expensive', label: 'Using multiple models is too expensive to be practical' },
    { id: 'one_is_best', label: 'One good model is better than two mediocre ones' },
  ];

  const transferApplications = [
    {
      title: 'Scientific Computing',
      description: 'Physics simulations require dimensional consistency and conservation law adherence.',
      question: 'Why add "check units and conservation laws" to review prompts?',
      answer: 'LLMs often produce formulas that look correct but have subtle dimensional errors (e.g., E=mv instead of E=mv^2/2). A review pass specifically checking units catches these. Conservation law checks catch non-physical results like energy appearing from nowhere.',
    },
    {
      title: 'Financial Calculations',
      description: 'Financial code must handle edge cases like zero balances, negative values, and rounding.',
      question: 'What review checklist items matter most for financial code?',
      answer: 'Bounds checking (no negative balances where prohibited), precision handling (rounding modes), edge cases (zero division, overflow), and audit trail requirements. A second pass with "check for financial edge cases" catches many subtle bugs.',
    },
    {
      title: 'API Design',
      description: 'APIs must handle invalid inputs, rate limits, and error conditions.',
      question: 'How does a review pass improve API code quality?',
      answer: 'Generation focuses on the happy path. A review pass asking "what happens with invalid input? Missing auth? Rate limited?" forces consideration of failure modes that would otherwise become production incidents.',
    },
    {
      title: 'Concurrent Code',
      description: 'Multi-threaded code has subtle race conditions and deadlock risks.',
      question: 'Why is review especially valuable for concurrent code?',
      answer: 'Concurrency bugs are notoriously hard to spot. A review pass checking "identify potential race conditions and deadlocks" applies focused attention that generation mode often lacks. Different models may spot different threading issues.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why can one-pass LLM code generation produce plausible nonsense?',
      options: [
        { text: 'LLMs are unintelligent', correct: false },
        { text: 'Generation optimizes for plausibility, not correctness - review forces verification', correct: true },
        { text: 'Code is too hard for AI', correct: false },
        { text: 'One pass is always enough', correct: false },
      ],
    },
    {
      question: 'What does "independent critique" mean in the context of LLM review?',
      options: [
        { text: 'Criticism from a human', correct: false },
        { text: 'A separate pass focused on finding errors, not defending the code', correct: true },
        { text: 'Using a competitor product', correct: false },
        { text: 'Running the code to find bugs', correct: false },
      ],
    },
    {
      question: 'A review prompt should check for "unit consistency." This catches errors like:',
      options: [
        { text: 'Typos in variable names', correct: false },
        { text: 'Mixing meters and feet, or missing dimensional factors like 1/2 in formulas', correct: true },
        { text: 'Code style violations', correct: false },
        { text: 'Performance issues', correct: false },
      ],
    },
    {
      question: 'Why check for "conservation laws" in physics code review?',
      options: [
        { text: 'It is a legal requirement', correct: false },
        { text: 'It catches non-physical results where energy, momentum, or mass appear/disappear', correct: true },
        { text: 'Conservation is just a naming convention', correct: false },
        { text: 'Only physicists need to worry about this', correct: false },
      ],
    },
    {
      question: 'Edge case review is important because:',
      options: [
        { text: 'Edge cases are rare and unimportant', correct: false },
        { text: 'Generation often focuses on typical cases, missing boundary conditions', correct: true },
        { text: 'Edge cases only matter in production', correct: false },
        { text: 'Users never trigger edge cases', correct: false },
      ],
    },
    {
      question: 'The prompt "Review for unit consistency, conservation laws, edge cases" is effective because:',
      options: [
        { text: 'It makes responses longer', correct: false },
        { text: 'It directs focused attention to common error categories', correct: true },
        { text: 'It sounds professional', correct: false },
        { text: 'These are the only possible errors', correct: false },
      ],
    },
    {
      question: 'Why use different models/tools as cross-checkers?',
      options: [
        { text: 'To increase costs', correct: false },
        { text: 'Different models have different blind spots - cross-checking reduces correlated mistakes', correct: true },
        { text: 'All models are identical', correct: false },
        { text: 'Cross-checking is never worth the effort', correct: false },
      ],
    },
    {
      question: 'A "checklist-based review" works by:',
      options: [
        { text: 'Randomly checking code', correct: false },
        { text: 'Systematically verifying specific criteria one by one', correct: true },
        { text: 'Checking only what looks suspicious', correct: false },
        { text: 'Trusting the original output', correct: false },
      ],
    },
    {
      question: 'Independent critique reduces correlated mistakes because:',
      options: [
        { text: 'The same model cannot be wrong twice', correct: false },
        { text: 'Review mode looks for errors, not defends choices - different perspective catches different bugs', correct: true },
        { text: 'Mistakes are always random', correct: false },
        { text: 'Critique is always correct', correct: false },
      ],
    },
    {
      question: 'A review pass that finds no issues should:',
      options: [
        { text: 'Be trusted completely', correct: false },
        { text: 'Prompt consideration of whether the checklist was comprehensive enough', correct: true },
        { text: 'Indicate the code is perfect', correct: false },
        { text: 'Be repeated until issues are found', correct: false },
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

  const renderVisualization = (interactive: boolean, showCrossCheck: boolean = false) => {
    const width = 700;
    const height = 480;
    const score = calculateReviewScore();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '750px' }}
        >
          {/* ============= COMPREHENSIVE DEFS SECTION ============= */}
          <defs>
            {/* Premium background gradient with depth */}
            <linearGradient id="marvLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Code editor panel gradient */}
            <linearGradient id="marvCodePanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="20%" stopColor="#0f172a" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* AI Model housing gradient with metallic look */}
            <linearGradient id="marvAIModelMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Review checklist panel gradient */}
            <linearGradient id="marvChecklistGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#0c4a6e" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#164e63" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.9" />
            </linearGradient>

            {/* Results panel gradient */}
            <linearGradient id="marvResultsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Success status radial gradient */}
            <radialGradient id="marvSuccessGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="30%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#047857" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
            </radialGradient>

            {/* Error status radial gradient */}
            <radialGradient id="marvErrorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="30%" stopColor="#dc2626" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#b91c1c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
            </radialGradient>

            {/* Warning status radial gradient */}
            <radialGradient id="marvWarningGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="30%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#b45309" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
            </radialGradient>

            {/* AI processing radial gradient */}
            <radialGradient id="marvAIProcessGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="30%" stopColor="#7c3aed" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#6d28d9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
            </radialGradient>

            {/* Review pass active indicator gradient */}
            <radialGradient id="marvReviewActiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="30%" stopColor="#0891b2" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#0e7490" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#155e75" stopOpacity="0" />
            </radialGradient>

            {/* Effectiveness meter gradient */}
            <linearGradient id="marvEffectivenessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="33%" stopColor="#f59e0b" />
              <stop offset="66%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Cross-checker model gradient */}
            <linearGradient id="marvCrossCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
            </linearGradient>

            {/* Connection beam gradient */}
            <linearGradient id="marvConnectionBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>

            {/* Bug indicator pulse gradient */}
            <radialGradient id="marvBugPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter for success elements */}
            <filter id="marvSuccessBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for error/bug elements */}
            <filter id="marvErrorBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* AI processing glow filter */}
            <filter id="marvAIGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft inner shadow for panels */}
            <filter id="marvInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Status indicator pulse animation */}
            <filter id="marvPulseGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern for background */}
            <pattern id="marvLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ============= PREMIUM BACKGROUND ============= */}
          <rect width={width} height={height} fill="url(#marvLabBg)" />
          <rect width={width} height={height} fill="url(#marvLabGrid)" />

          {/* Title with premium styling */}
          <text x={width/2} y={32} fill={colors.textPrimary} fontSize={18} fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
            AI Code Review Dashboard
          </text>
          <text x={width/2} y={50} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Model-as-Reviewer Pattern Visualization
          </text>

          {/* ============= CODE PANEL WITH PREMIUM STYLING ============= */}
          <g transform="translate(20, 65)">
            {/* Panel background with gradient */}
            <rect x={0} y={0} width={280} height={220} rx={12} fill="url(#marvCodePanelGrad)" stroke="#334155" strokeWidth="1" />

            {/* Panel header */}
            <rect x={0} y={0} width={280} height={28} rx={12} fill="#1e293b" />
            <rect x={0} y={14} width={280} height={14} fill="#1e293b" />

            {/* Window controls */}
            <circle cx={16} cy={14} r={5} fill="#ef4444" />
            <circle cx={34} cy={14} r={5} fill="#f59e0b" />
            <circle cx={52} cy={14} r={5} fill="#10b981" />

            <text x={140} y={18} fill={colors.textSecondary} fontSize={11} fontWeight="600" textAnchor="middle">
              physics_calculations.py
            </text>

            {/* Code lines with syntax highlighting */}
            {codeSample.code.split('\n').slice(0, 14).map((line, i) => {
              const hasBug = codeSample.bugs.some(b => b.line === i + 1);
              const bugDetected = hasBug && useReviewPass && (
                (i + 1 === 3 && checkUnits) ||
                (i + 1 === 8 && checkConservation) ||
                (i + 1 === 12 && checkEdgeCases)
              );
              const bugHighlighted = hasBug && useReviewPass && !bugDetected;

              return (
                <g key={i}>
                  {/* Line number background */}
                  <rect x={5} y={35 + i * 13} width={25} height={12} fill="rgba(0,0,0,0.3)" />
                  <text x={17} y={44 + i * 13} fill={colors.textMuted} fontSize={8} textAnchor="middle" fontFamily="monospace">
                    {i + 1}
                  </text>

                  {/* Bug highlight background */}
                  {bugDetected && (
                    <rect
                      x={32}
                      y={34 + i * 13}
                      width={243}
                      height={13}
                      fill="rgba(239, 68, 68, 0.25)"
                      rx={2}
                    />
                  )}
                  {bugHighlighted && (
                    <rect
                      x={32}
                      y={34 + i * 13}
                      width={243}
                      height={13}
                      fill="rgba(245, 158, 11, 0.15)"
                      rx={2}
                    />
                  )}

                  {/* Code text */}
                  <text
                    x={38}
                    y={44 + i * 13}
                    fill={bugDetected ? colors.error : bugHighlighted ? colors.warning : line.startsWith('#') || line.includes('#') ? '#6b7280' : line.includes('def ') ? '#a78bfa' : colors.textMuted}
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {line.substring(0, 35)}{line.length > 35 ? '...' : ''}
                  </text>

                  {/* Bug indicator with glow */}
                  {bugDetected && (
                    <g filter="url(#marvErrorBlur)">
                      <circle cx={268} cy={40 + i * 13} r={5} fill="url(#marvErrorGlow)" />
                      <circle cx={268} cy={40 + i * 13} r={3} fill={colors.error} />
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* ============= AI MODEL VISUALIZATION ============= */}
          <g transform="translate(320, 65)">
            {/* AI Model housing */}
            <rect x={0} y={0} width={160} height={100} rx={12} fill="url(#marvAIModelMetal)" stroke="#475569" strokeWidth="1.5" />
            <rect x={5} y={5} width={150} height={90} rx={10} fill="#0f172a" opacity="0.6" />

            {/* AI brain visualization */}
            <g transform="translate(80, 50)">
              <circle r={30} fill={useReviewPass ? 'url(#marvReviewActiveGlow)' : 'rgba(100,116,139,0.3)'} filter={useReviewPass ? 'url(#marvAIGlow)' : 'none'} />
              <circle r={20} fill={useReviewPass ? 'rgba(6,182,212,0.4)' : 'rgba(71,85,105,0.4)'} />
              <circle r={10} fill={useReviewPass ? colors.accent : '#475569'} />

              {/* Neural network lines */}
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <line
                  key={i}
                  x1={0} y1={0}
                  x2={Math.cos(angle * Math.PI / 180) * 28}
                  y2={Math.sin(angle * Math.PI / 180) * 28}
                  stroke={useReviewPass ? '#22d3ee' : '#475569'}
                  strokeWidth="1"
                  opacity={useReviewPass ? 0.8 : 0.3}
                />
              ))}
            </g>

            <text x={80} y={95} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="600">
              {useReviewPass ? 'REVIEWING...' : 'STANDBY'}
            </text>
          </g>

          {/* ============= REVIEW CHECKLIST PANEL ============= */}
          <g transform="translate(500, 65)">
            <rect x={0} y={0} width={180} height={220} rx={12} fill="url(#marvChecklistGrad)" stroke="#0e7490" strokeWidth="1" filter="url(#marvInnerShadow)" />

            {/* Panel header */}
            <rect x={0} y={0} width={180} height={30} rx={12} fill="rgba(6,182,212,0.2)" />
            <rect x={0} y={15} width={180} height={15} fill="rgba(6,182,212,0.2)" />
            <text x={90} y={20} fill={colors.textPrimary} fontSize={11} fontWeight="bold" textAnchor="middle">
              Review Checklist
            </text>

            {/* Checklist items */}
            {[
              { label: 'Unit Consistency', checked: checkUnits, key: 'units', icon: 'U' },
              { label: 'Conservation Laws', checked: checkConservation, key: 'conservation', icon: 'C' },
              { label: 'Edge Cases', checked: checkEdgeCases, key: 'edge', icon: 'E' },
              { label: 'Bounds Checking', checked: checkBounds, key: 'bounds', icon: 'B' },
            ].map((item, i) => (
              <g key={item.key} transform={`translate(10, ${40 + i * 38})`}>
                <rect
                  x={0}
                  y={0}
                  width={160}
                  height={32}
                  fill={item.checked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)'}
                  stroke={item.checked ? colors.success : 'rgba(255,255,255,0.15)'}
                  strokeWidth={1.5}
                  rx={8}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                  onClick={interactive ? () => {
                    if (item.key === 'units') setCheckUnits(!checkUnits);
                    if (item.key === 'conservation') setCheckConservation(!checkConservation);
                    if (item.key === 'edge') setCheckEdgeCases(!checkEdgeCases);
                    if (item.key === 'bounds') setCheckBounds(!checkBounds);
                  } : undefined}
                />

                {/* Check indicator with glow */}
                <g filter={item.checked ? 'url(#marvSuccessBlur)' : 'none'}>
                  <circle cx={20} cy={16} r={10} fill={item.checked ? 'url(#marvSuccessGlow)' : 'rgba(100,116,139,0.3)'} />
                  <text x={20} y={20} fill={item.checked ? 'white' : colors.textMuted} fontSize={10} fontWeight="bold" textAnchor="middle">
                    {item.checked ? '✓' : item.icon}
                  </text>
                </g>

                <text x={40} y={20} fill={item.checked ? colors.success : colors.textSecondary} fontSize={11} fontWeight={item.checked ? '600' : '400'}>
                  {item.label}
                </text>
              </g>
            ))}

            {/* Cross-checker option */}
            {showCrossCheck && (
              <g transform="translate(10, 195)">
                <rect
                  x={0}
                  y={0}
                  width={160}
                  height={22}
                  fill={useCrossChecker ? 'url(#marvCrossCheckGrad)' : 'rgba(255,255,255,0.05)'}
                  stroke={useCrossChecker ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}
                  strokeWidth={1.5}
                  rx={6}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                  onClick={interactive ? () => setUseCrossChecker(!useCrossChecker) : undefined}
                />
                <g filter={useCrossChecker ? 'url(#marvAIGlow)' : 'none'}>
                  <circle cx={15} cy={11} r={6} fill={useCrossChecker ? 'url(#marvAIProcessGlow)' : 'rgba(100,116,139,0.3)'} />
                </g>
                <text x={28} y={15} fill={useCrossChecker ? '#a78bfa' : colors.textMuted} fontSize={9} fontWeight={useCrossChecker ? '600' : '400'}>
                  {useCrossChecker ? 'Cross-Check Active' : '+ Add Cross-Checker'}
                </text>
              </g>
            )}
          </g>

          {/* ============= CONNECTION BEAM (Code -> AI -> Checklist) ============= */}
          {useReviewPass && (
            <g>
              <line x1={300} y1={175} x2={320} y2={115} stroke="url(#marvConnectionBeam)" strokeWidth="3" opacity="0.8" />
              <line x1={480} y1={115} x2={500} y2={175} stroke="url(#marvConnectionBeam)" strokeWidth="3" opacity="0.8" />
            </g>
          )}

          {/* ============= RESULTS PANEL ============= */}
          <g transform="translate(20, 300)">
            <rect x={0} y={0} width={660} height={160} rx={12} fill="url(#marvResultsGrad)" stroke="#374151" strokeWidth="1" />

            {/* Panel header */}
            <rect x={0} y={0} width={660} height={32} rx={12} fill="rgba(55,65,81,0.5)" />
            <rect x={0} y={16} width={660} height={16} fill="rgba(55,65,81,0.5)" />
            <text x={330} y={22} fill={colors.textPrimary} fontSize={13} fontWeight="bold" textAnchor="middle">
              Review Results & AI Feedback
            </text>

            {/* Effectiveness meter with gradient */}
            <g transform="translate(20, 45)">
              <text x={0} y={0} fill={colors.textSecondary} fontSize={10} fontWeight="600">Effectiveness</text>
              <rect x={0} y={8} width={280} height={24} rx={6} fill="rgba(0,0,0,0.4)" />
              <rect x={2} y={10} width={276} height={20} rx={5} fill="rgba(255,255,255,0.05)" />
              <rect
                x={2}
                y={10}
                width={Math.max(0, (score.effectiveness / 100) * 276)}
                height={20}
                rx={5}
                fill={score.effectiveness > 80 ? colors.success : score.effectiveness > 50 ? colors.warning : colors.error}
                filter={score.effectiveness > 0 ? 'url(#marvPulseGlow)' : 'none'}
              />
              <text x={140} y={25} fill={colors.textPrimary} fontSize={12} fontWeight="bold" textAnchor="middle">
                {score.effectiveness.toFixed(0)}%
              </text>
            </g>

            {/* Bug detection status with visual indicators */}
            <g transform="translate(320, 45)">
              <text x={0} y={0} fill={colors.textSecondary} fontSize={10} fontWeight="600">Bugs Detected</text>
              <g transform="translate(0, 12)">
                {[0, 1, 2].map((i) => (
                  <g key={i} transform={`translate(${i * 35}, 0)`}>
                    <circle
                      cx={12} cy={12} r={12}
                      fill={i < score.detected ? 'url(#marvErrorGlow)' : 'rgba(100,116,139,0.2)'}
                      filter={i < score.detected ? 'url(#marvErrorBlur)' : 'none'}
                    />
                    <circle
                      cx={12} cy={12} r={8}
                      fill={i < score.detected ? colors.error : 'rgba(100,116,139,0.3)'}
                    />
                    <text x={12} y={16} fill="white" fontSize={10} fontWeight="bold" textAnchor="middle">
                      {i < score.detected ? '!' : '?'}
                    </text>
                  </g>
                ))}
                <text x={120} y={18} fill={score.detected === score.total ? colors.success : colors.warning} fontSize={14} fontWeight="bold">
                  {score.detected} / {score.total}
                </text>
              </g>
            </g>

            {/* AI Feedback messages */}
            <g transform="translate(500, 45)">
              <text x={0} y={0} fill={colors.textSecondary} fontSize={10} fontWeight="600">Status</text>
              <g transform="translate(0, 10)">
                <circle
                  cx={12} cy={12} r={12}
                  fill={useReviewPass ? (score.effectiveness > 80 ? 'url(#marvSuccessGlow)' : 'url(#marvWarningGlow)') : 'rgba(100,116,139,0.2)'}
                  filter="url(#marvPulseGlow)"
                />
                <text x={32} y={16} fill={useReviewPass ? (score.effectiveness > 80 ? colors.success : colors.warning) : colors.textMuted} fontSize={11} fontWeight="600">
                  {useReviewPass ? (score.effectiveness > 80 ? 'PASSING' : 'ISSUES') : 'INACTIVE'}
                </text>
              </g>
            </g>

            {/* Detailed findings */}
            <g transform="translate(20, 95)">
              <text x={0} y={0} fill={colors.textSecondary} fontSize={10} fontWeight="600">AI Findings:</text>
              {useReviewPass ? (
                <g transform="translate(0, 8)">
                  {score.bugsFound.units && (
                    <g transform="translate(0, 0)">
                      <circle cx={6} cy={8} r={4} fill={colors.error} filter="url(#marvErrorBlur)" />
                      <text x={16} y={12} fill={colors.error} fontSize={10}>Line 3: Missing 1/2 factor - KE = (1/2)mv², not mv²</text>
                    </g>
                  )}
                  {score.bugsFound.conservation && (
                    <g transform="translate(0, 18)">
                      <circle cx={6} cy={8} r={4} fill={colors.error} filter="url(#marvErrorBlur)" />
                      <text x={16} y={12} fill={colors.error} fontSize={10}>Line 8: Operator error - F = m*a, not m+a</text>
                    </g>
                  )}
                  {score.bugsFound.edgeCases && (
                    <g transform="translate(0, 36)">
                      <circle cx={6} cy={8} r={4} fill={colors.error} filter="url(#marvErrorBlur)" />
                      <text x={16} y={12} fill={colors.error} fontSize={10}>Line 12: Negative velocity excluded - momentum can be negative</text>
                    </g>
                  )}
                  {!score.bugsFound.units && !score.bugsFound.conservation && !score.bugsFound.edgeCases && (
                    <text x={0} y={15} fill={colors.warning} fontSize={10}>Enable checklist items to detect specific bug types...</text>
                  )}
                </g>
              ) : (
                <text x={0} y={20} fill={colors.textMuted} fontSize={10} fontStyle="italic">Enable review pass to activate AI bug detection...</text>
              )}
            </g>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setUseReviewPass(!useReviewPass)}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: useReviewPass
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: useReviewPass
                  ? '0 4px 20px rgba(16, 185, 129, 0.4)'
                  : '0 4px 20px rgba(239, 68, 68, 0.4)',
                WebkitTapHighlightColor: 'transparent',
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
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Enable All Checks
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showCrossCheck: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Review Checklist Items:
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { label: 'Units', checked: checkUnits, set: setCheckUnits },
            { label: 'Conservation', checked: checkConservation, set: setCheckConservation },
            { label: 'Edge Cases', checked: checkEdgeCases, set: setCheckEdgeCases },
            { label: 'Bounds', checked: checkBounds, set: setCheckBounds },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => item.set(!item.checked)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: item.checked ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                background: item.checked ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: item.checked ? colors.success : colors.textMuted,
                cursor: 'pointer',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {showCrossCheck && (
        <div>
          <label style={{
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={useCrossChecker}
              onChange={(e) => setUseCrossChecker(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Use second model/tool as cross-checker (+20% effectiveness)
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Prompt: "Review for unit consistency, conservation laws, edge cases"
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Effectiveness = (checksEnabled * bugsMatchingChecks) {showCrossCheck && useCrossChecker ? '+ crossCheckBonus' : ''}
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '4px' : '8px',
        padding: '16px',
        flexWrap: 'wrap',
      }}>
        {phaseOrder.map((p, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = index <= currentIndex;

          return (
            <div
              key={p}
              onClick={() => isClickable && goToPhase(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: isClickable ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: isMobile ? '24px' : '32px',
                  height: isMobile ? '24px' : '32px',
                  borderRadius: '50%',
                  background: isCompleted
                    ? colors.success
                    : isCurrent
                      ? colors.accent
                      : 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '10px' : '12px',
                  fontWeight: 'bold',
                  color: isCompleted || isCurrent ? 'white' : colors.textMuted,
                  border: isCurrent ? `2px solid ${colors.accent}` : 'none',
                  boxShadow: isCurrent ? `0 0 12px ${colors.accentGlow}` : 'none',
                }}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              {!isMobile && (
                <span style={{
                  fontSize: '9px',
                  color: isCurrent ? colors.accent : colors.textMuted,
                  marginTop: '4px',
                  textAlign: 'center',
                  maxWidth: '60px',
                }}>
                  {phaseLabels[p]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Bottom navigation bar with Back/Next buttons
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    const canProceed = (): boolean => {
      switch (phase) {
        case 'predict':
          return !!prediction;
        case 'twist_predict':
          return !!twistPrediction;
        case 'transfer':
          return transferCompleted.size >= 4;
        case 'test':
          return testSubmitted && testScore >= 8;
        default:
          return true;
      }
    };

    const getNextLabel = (): string => {
      switch (phase) {
        case 'hook':
          return 'Make a Prediction';
        case 'predict':
          return 'Test My Prediction';
        case 'play':
          return 'Continue to Review';
        case 'review':
          return 'Next: A Twist!';
        case 'twist_predict':
          return 'Test My Prediction';
        case 'twist_play':
          return 'See the Explanation';
        case 'twist_review':
          return 'Apply This Knowledge';
        case 'transfer':
          return 'Take the Test';
        case 'test':
          return testSubmitted ? (testScore >= 8 ? 'Complete Mastery' : 'Review & Retry') : 'Submit Test';
        case 'mastery':
          return 'Complete Game';
        default:
          return 'Next';
      }
    };

    return (
      <div style={{
        position: 'absolute',
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
        <button
          onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 'bold',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>

        <button
          onClick={() => {
            if (phase === 'test' && !testSubmitted) {
              submitTest();
            } else if (!isLast && canProceed()) {
              goToPhase(phaseOrder[currentIndex + 1]);
            } else if (isLast && canProceed()) {
              emitGameEvent('completion', { score: testScore });
            }
          }}
          disabled={!canProceed() && phase !== 'test'}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed() ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed() ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed() ? 'pointer' : 'not-allowed',
            fontSize: '16px',
          }}
        >
          {getNextLabel()}
        </button>
      </div>
    );
  };

  // Main content renderer
  const renderContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
                Model as Reviewer
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
                Can one pass write plausible nonsense?
              </p>
            </div>

            {renderVisualization(true)}

            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                background: colors.bgCard,
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                  When an LLM generates code, it optimizes for plausibility - code that looks
                  correct. But looking correct and being correct are different things. A
                  second pass in "reviewer mode" catches dimension errors, missing constraints,
                  and edge cases that generation mode often misses.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                  The code above has three bugs. Can you spot them without a review checklist?
                </p>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  Toggle the review checklist items to see what they catch!
                </p>
              </div>
            </div>
          </div>
        );

      case 'predict':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                You ask an LLM to write physics calculations. It produces code that compiles
                and runs. But is it correct? A second prompt says "Review for unit consistency,
                conservation laws, edge cases." Does this help?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                Does a review pass improve code quality?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPrediction(p.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                      background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'play':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Review Effectiveness</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Enable different checklist items to see which bugs they catch
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
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Unit check catches missing 1/2 in kinetic energy formula</li>
                <li>Conservation check catches F=m+a (should be F=m*a)</li>
                <li>Edge case check catches excluded negative velocities</li>
                <li>Each checklist item targets a specific error category</li>
              </ul>
            </div>
          </div>
        );

      case 'review':
        const wasCorrect = prediction === 'review_helps';
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrect ? 'Correct!' : 'The Answer: Review Passes Help'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                A second pass in review mode catches errors that slip through generation.
                The key is directing attention with specific checks: units, conservation,
                edge cases, bounds - each targets different error types.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Independent Critique Works</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Different Objectives:</strong> Generation
                  mode optimizes for "write code that does X." Review mode optimizes for "find
                  problems with this code." Different objectives reveal different issues.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Directed Attention:</strong> Asking
                  "check units" forces examination of dimensional analysis. Without this prompt,
                  the model might not think about units at all.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Correlated Mistakes:</strong> If the
                  same model generates and reviews, it might make the same mistakes. But review
                  mode is sufficiently different that many bugs are caught.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>The Prompt:</strong> "Review for
                  unit consistency, conservation laws, edge cases, failure modes."
                </p>
              </div>
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
              <p style={{ color: colors.textSecondary }}>
                What if we use different models or tools as cross-checkers?
              </p>
            </div>

            {renderVisualization(false, true)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                Same-model review catches many bugs. But what about using a different model
                or static analysis tool as a cross-checker? Does this improve bug detection
                even further?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                Do cross-checkers with different models/tools help?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {twistPredictions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTwistPrediction(p.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                      background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Cross-Checking</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Enable the cross-checker to see improved coverage
              </p>
            </div>

            {renderVisualization(true, true)}
            {renderControls(true)}

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid #8b5cf6`,
            }}>
              <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>Cross-Checker Benefits:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Different models have different blind spots:
                <br />- Model A might miss edge cases but catch unit errors
                <br />- Model B might catch edge cases but miss unit errors
                <br />- A static analyzer catches yet different issues
                <br />- Cross-checking reduces correlated blind spots
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        const twistWasCorrect = twistPrediction === 'different_models';
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {twistWasCorrect ? 'Correct!' : 'The Answer: Cross-Checking Improves Coverage'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Different models and tools have different training data, architectures, and
                blind spots. Cross-checking with diverse reviewers catches bugs that any
                single reviewer might miss.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Building a Review Pipeline</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Level 1:</strong> Same-model
                  review with checklist (units, conservation, edge cases)
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Level 2:</strong> Cross-check
                  with different LLM (Claude + GPT, for example)
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Level 3:</strong> Static
                  analysis tools (linters, type checkers, dimensional analysis tools)
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Level 4:</strong> Property-based
                  testing to verify invariants automatically
                </p>
              </div>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
                Real-World Applications
              </h2>
              <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
                Review passes apply to many domains beyond physics
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
                Complete all 4 applications to unlock the test
              </p>
            </div>

            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
                </div>
                {!transferCompleted.has(index) ? (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.accent}`,
                      background: 'transparent',
                      color: colors.accent,
                      cursor: 'pointer',
                      fontSize: '13px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                margin: '16px',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                  {testScore >= 8 ? 'You understand model-as-reviewer patterns!' : 'Review the material and try again.'}
                </p>
              </div>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                        {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        }

        const currentQ = testQuestions[currentTestQuestion];
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
                <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQ.options.map((opt, oIndex) => (
                  <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
              ) : null}
            </div>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
              <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered model-as-reviewer patterns</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Prompt Patterns:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>"Review for unit consistency"</li>
                <li>"Check conservation laws are satisfied"</li>
                <li>"Identify edge cases and failure modes"</li>
                <li>"Verify bounds and constraints"</li>
                <li>"Cross-check with [different tool/model]"</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Remember:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                One pass can write plausible nonsense. Independent critique in review mode catches
                dimension errors, missing constraints, and edge cases. Cross-checking with different
                models or tools reduces correlated mistakes. Always verify generated code with a
                structured review checklist.
              </p>
            </div>
            {renderVisualization(true, true)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
    }}>
      {renderProgressBar()}
      {renderContent()}
      {renderBottomBar()}
    </div>
  );
};

export default ModelAsReviewerRenderer;
