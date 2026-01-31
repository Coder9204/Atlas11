import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: {
    currentScreen?: number;
    totalScreens?: number;
    phase?: string;
    phaseLabel?: string;
    prediction?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

interface PatchDisciplineRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  primary: '#06b6d4',
  border: '#334155',
  diff: {
    added: '#22c55e',
    removed: '#ef4444',
    context: '#64748b',
    highlight: '#3b82f6',
  },
};

type PDPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PatchDisciplineRenderer: React.FC<PatchDisciplineRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const validPhases: PDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  // Use gamePhase from props if valid, otherwise default to 'hook'
  const getInitialPhase = (): PDPhase => {
    if (gamePhase && validPhases.includes(gamePhase as PDPhase)) {
      return gamePhase as PDPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<PDPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as PDPhase) && gamePhase !== phase) {
      setPhase(gamePhase as PDPhase);
    }
  }, [gamePhase, phase]);

  // Phase order for navigation
  const phaseOrder: PDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<PDPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Refactor Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Navigation debouncing to prevent double-clicks
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [diffSize, setDiffSize] = useState(50);
  const [includesRefactor, setIncludesRefactor] = useState(false);
  const [rollbackStep, setRollbackStep] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
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

  // Emit events to AI coach
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'patch_discipline',
        gameTitle: 'Patch Discipline',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Emit initial game_started event on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      emitGameEvent('game_started', {
        phase: 'hook',
        phaseLabel: 'Introduction',
        currentScreen: 1,
        totalScreens: phaseOrder.length,
        message: `GAME STARTED - NOW ON SCREEN 1/${phaseOrder.length}: Introduction`
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const goToPhase = useCallback((p: PDPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);

    // Emit phase change
    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `NOW ON SCREEN ${idx + 1}/${phaseOrder.length}: ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phaseLabels, phaseOrder]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase, phaseOrder]);

  // Physics calculations
  const calculateRisk = useCallback(() => {
    // Risk grows non-linearly with diff size
    const baseRisk = Math.pow(diffSize / 100, 1.5) * 100;
    // Refactoring multiplies risk
    const refactorMultiplier = includesRefactor ? 2.5 : 1;
    const totalRisk = Math.min(100, baseRisk * refactorMultiplier);

    // Review difficulty scales with size
    const reviewDifficulty = Math.min(100, diffSize * 1.2 * (includesRefactor ? 1.5 : 1));

    // Rollback ease inversely related to size
    const rollbackEase = Math.max(0, 100 - diffSize * 0.8 - (includesRefactor ? 20 : 0));

    return {
      regressionRisk: totalRisk,
      reviewDifficulty,
      rollbackEase,
      linesChanged: Math.round(diffSize * 5),
      filesAffected: Math.max(1, Math.round(diffSize / 20)),
    };
  }, [diffSize, includesRefactor]);

  const predictions = [
    { id: 'no_difference', label: 'Patch size does not affect bug probability - bugs are random' },
    { id: 'linear', label: 'Bug risk increases linearly with lines changed' },
    { id: 'exponential', label: 'Bug risk grows faster than linearly - more interactions with larger patches' },
    { id: 'threshold', label: 'Bug risk stays low until a threshold, then jumps suddenly' },
  ];

  const twistPredictions = [
    { id: 'refactor_safe', label: 'Refactors are safe because they do not change behavior' },
    { id: 'refactor_risky', label: 'Refactors add hidden risk - they touch code without tests covering new paths' },
    { id: 'refactor_neutral', label: 'Refactors neither help nor hurt - they are just code movement' },
    { id: 'refactor_always', label: 'Always refactor when you see the opportunity' },
  ];

  const transferApplications = [
    {
      title: 'Database Migrations',
      description: 'Breaking schema changes into small, reversible steps reduces downtime risk.',
      question: 'Why do teams prefer many small migrations over one big schema change?',
      answer: 'Small migrations can be tested individually, rolled back independently, and reviewed thoroughly. A 500-line migration mixing data transforms with schema changes is nearly impossible to review or safely rollback.',
    },
    {
      title: 'Feature Flags',
      description: 'Deploying code behind feature flags separates deployment from release.',
      question: 'How do feature flags embody the small-patch philosophy?',
      answer: 'Feature flags let you merge small, incomplete features without affecting users. Each merge is tiny and low-risk. The "big change" happens only when toggling the flag, which is instantly reversible.',
    },
    {
      title: 'Code Review Fatigue',
      description: 'Reviewers lose effectiveness when reviewing large patches.',
      question: 'Why do 10-line PRs get better review than 500-line PRs?',
      answer: 'Cognitive load limits attention. Reviewers can deeply understand 10 lines and catch subtle bugs. At 500 lines, they skim, miss issues, and rubber-stamp approval. Studies show bugs-per-line-reviewed increases with PR size.',
    },
    {
      title: 'Git Bisect',
      description: 'Finding bugs requires isolating the problematic commit.',
      question: 'How does patch discipline improve debugging?',
      answer: 'Git bisect finds bugs by testing commits. If each commit is one focused change, bisect pinpoints the exact bug source. If commits mix unrelated changes, you find "somewhere in this 50-file commit" - useless.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the primary benefit of small, focused patches?',
      options: [
        { text: 'They are faster to write', correct: false },
        { text: 'They reduce regression risk and simplify review', correct: true },
        { text: 'They look more professional', correct: false },
        { text: 'They bypass code review requirements', correct: false },
      ],
    },
    {
      question: 'How does regression risk scale with patch size?',
      options: [
        { text: 'Linearly - double the lines, double the risk', correct: false },
        { text: 'Super-linearly - interactions between changes multiply risk', correct: true },
        { text: 'Sub-linearly - larger patches are more efficient', correct: false },
        { text: 'Risk is constant regardless of size', correct: false },
      ],
    },
    {
      question: 'Why should refactoring be separate from feature changes?',
      options: [
        { text: 'To make the git history look cleaner', correct: false },
        { text: 'Refactors can introduce subtle bugs that are hard to detect when mixed with features', correct: true },
        { text: 'Refactoring is not allowed in production code', correct: false },
        { text: 'It does not matter - combine them for efficiency', correct: false },
      ],
    },
    {
      question: 'A 10-line PR gets better review than a 500-line PR because:',
      options: [
        { text: 'Reviewers prefer less work', correct: false },
        { text: 'Cognitive load limits allow deeper understanding of small changes', correct: true },
        { text: 'Large PRs are always rejected', correct: false },
        { text: 'Line count does not affect review quality', correct: false },
      ],
    },
    {
      question: 'What makes a patch "atomic"?',
      options: [
        { text: 'It contains exactly one line change', correct: false },
        { text: 'It makes one logical change that works independently', correct: true },
        { text: 'It never touches tests', correct: false },
        { text: 'It was written by one person', correct: false },
      ],
    },
    {
      question: 'How does small-patch discipline help with rollbacks?',
      options: [
        { text: 'Small patches cannot be rolled back', correct: false },
        { text: 'Reverting a focused change has predictable, limited impact', correct: true },
        { text: 'Rollbacks are never needed with small patches', correct: false },
        { text: 'It does not affect rollback difficulty', correct: false },
      ],
    },
    {
      question: 'The prompt "Make the smallest possible diff" helps because:',
      options: [
        { text: 'It reduces the LLM token count', correct: false },
        { text: 'It forces focus on one change, reducing unintended modifications', correct: true },
        { text: 'Smaller responses are always correct', correct: false },
        { text: 'It is just a coding style preference', correct: false },
      ],
    },
    {
      question: 'When is mixing refactoring with feature work acceptable?',
      options: [
        { text: 'Always, to save time', correct: false },
        { text: 'Never, under any circumstances', correct: false },
        { text: 'Only when explicitly requested and the refactor is essential', correct: true },
        { text: 'Whenever the code looks messy', correct: false },
      ],
    },
    {
      question: 'Why does "show the patch" improve LLM code quality?',
      options: [
        { text: 'It makes the output look professional', correct: false },
        { text: 'It enables verification and makes changes explicit', correct: true },
        { text: 'Patches are required by git', correct: false },
        { text: 'It reduces API costs', correct: false },
      ],
    },
    {
      question: 'The "surface area" of a change refers to:',
      options: [
        { text: 'The screen space needed to display it', correct: false },
        { text: 'The amount of code that could be affected by the change', correct: true },
        { text: 'The number of developers involved', correct: false },
        { text: 'The file size in bytes', correct: false },
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

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const buttonColor = accentColor || colors.primary;
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
          onClick={handleBack}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${buttonColor} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${buttonColor}30` : 'none',
            minHeight: '44px'
          }}
          onClick={handleNext}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = (interactive: boolean, showRefactor: boolean = false) => {
    const width = 700;
    const height = 400;
    const stats = calculateRisk();

    // Risk curve points for the graph
    const curvePoints: string[] = [];
    for (let x = 0; x <= 100; x += 2) {
      const risk = Math.pow(x / 100, 1.5) * 100 * (showRefactor && includesRefactor ? 2.5 : 1);
      const clampedRisk = Math.min(100, risk);
      const px = 380 + (x / 100) * 280;
      const py = 320 - (clampedRisk / 100) * 200;
      curvePoints.push(`${px},${py}`);
    }

    // Current point on the risk curve
    const currentX = 380 + (diffSize / 100) * 280;
    const currentY = 320 - (stats.regressionRisk / 100) * 200;

    // Generate diff lines for visualization
    const generateDiffLines = () => {
      const lines = [];
      const totalLines = Math.min(12, Math.ceil(diffSize / 8));
      const addedRatio = includesRefactor ? 0.3 : 0.5;
      const removedRatio = includesRefactor ? 0.3 : 0.3;

      for (let i = 0; i < totalLines; i++) {
        const rand = Math.random();
        let type: 'added' | 'removed' | 'context' | 'refactor';
        if (includesRefactor && rand > 0.7) {
          type = 'refactor';
        } else if (rand < addedRatio) {
          type = 'added';
        } else if (rand < addedRatio + removedRatio) {
          type = 'removed';
        } else {
          type = 'context';
        }
        lines.push({ y: 75 + i * 22, type });
      }
      return lines;
    };

    const diffLines = generateDiffLines();

    // Workflow timeline steps
    const workflowSteps = [
      { x: 45, label: 'Write', status: 'complete' as const },
      { x: 105, label: 'Review', status: diffSize > 50 ? 'warning' as const : 'complete' as const },
      { x: 165, label: 'Test', status: diffSize > 70 ? 'danger' as const : diffSize > 40 ? 'warning' as const : 'complete' as const },
      { x: 225, label: 'Deploy', status: stats.regressionRisk > 60 ? 'danger' as const : stats.regressionRisk > 30 ? 'warning' as const : 'complete' as const },
      { x: 285, label: 'Monitor', status: 'pending' as const },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          <defs>
            {/* === PREMIUM BACKGROUND GRADIENTS === */}
            <linearGradient id="ptchLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* === CODE EDITOR GRADIENTS === */}
            <linearGradient id="ptchEditorFrame" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="15%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="85%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            <linearGradient id="ptchEditorBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="ptchTitleBar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* === DIFF LINE GRADIENTS === */}
            <linearGradient id="ptchAddedLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="10%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="90%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>

            <linearGradient id="ptchRemovedLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="10%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="90%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            <linearGradient id="ptchContextLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            <linearGradient id="ptchRefactorLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="10%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="90%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* === RISK GRAPH GRADIENTS === */}
            <linearGradient id="ptchRiskGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="75%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="ptchRiskCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <linearGradient id="ptchRiskCurveRefactor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* === STATUS INDICATOR RADIAL GRADIENTS === */}
            <radialGradient id="ptchStatusComplete" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.8" />
            </radialGradient>

            <radialGradient id="ptchStatusWarning" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.8" />
            </radialGradient>

            <radialGradient id="ptchStatusDanger" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.8" />
            </radialGradient>

            <radialGradient id="ptchStatusPending" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.8" />
            </radialGradient>

            <radialGradient id="ptchMarkerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={stats.regressionRisk > 50 ? "#fca5a5" : "#86efac"} />
              <stop offset="30%" stopColor={stats.regressionRisk > 50 ? "#ef4444" : "#22c55e"} />
              <stop offset="60%" stopColor={stats.regressionRisk > 50 ? "#dc2626" : "#16a34a"} stopOpacity="0.6" />
              <stop offset="100%" stopColor={stats.regressionRisk > 50 ? "#b91c1c" : "#15803d"} stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS === */}
            <filter id="ptchGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ptchGlowRed" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ptchGlowAmber" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ptchGlowPurple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ptchMarkerBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" />
            </filter>

            <filter id="ptchSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="ptchGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Premium dark background */}
          <rect width={width} height={height} fill="url(#ptchLabBg)" />
          <rect width={width} height={height} fill="url(#ptchGrid)" />

          {/* === LEFT PANEL: CODE EDITOR / DIFF VIEW === */}
          <g transform="translate(15, 30)">
            {/* Editor outer frame with depth */}
            <rect x="0" y="0" width="330" height="340" rx="10" fill="url(#ptchEditorFrame)" stroke="#475569" strokeWidth="1" />
            <rect x="4" y="4" width="322" height="332" rx="8" fill="url(#ptchEditorBg)" />

            {/* Title bar */}
            <rect x="4" y="4" width="322" height="28" rx="8" fill="url(#ptchTitleBar)" />
            <rect x="4" y="24" width="322" height="8" fill="url(#ptchTitleBar)" />

            {/* Window controls */}
            <circle cx="20" cy="18" r="5" fill="#ef4444" />
            <circle cx="38" cy="18" r="5" fill="#f59e0b" />
            <circle cx="56" cy="18" r="5" fill="#22c55e" />

            {/* File name */}
            <text x="165" y="22" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              feature.tsx - {stats.linesChanged} lines changed
            </text>

            {/* Line numbers column */}
            <rect x="8" y="36" width="30" height="260" fill="#0f172a" />
            {diffLines.map((_, i) => (
              <text key={i} x="28" y={80 + i * 22} textAnchor="end" fill="#475569" fontSize="9" fontFamily="monospace">
                {i + 1}
              </text>
            ))}

            {/* Diff lines with gradients */}
            {diffLines.map((line, i) => {
              const fillId = line.type === 'added' ? 'url(#ptchAddedLine)' :
                            line.type === 'removed' ? 'url(#ptchRemovedLine)' :
                            line.type === 'refactor' ? 'url(#ptchRefactorLine)' :
                            'url(#ptchContextLine)';
              const prefix = line.type === 'added' ? '+' :
                            line.type === 'removed' ? '-' :
                            line.type === 'refactor' ? '~' : ' ';
              const prefixColor = line.type === 'added' ? '#22c55e' :
                                  line.type === 'removed' ? '#ef4444' :
                                  line.type === 'refactor' ? '#a78bfa' : '#64748b';
              const filter = line.type === 'added' ? 'url(#ptchGlowGreen)' :
                            line.type === 'removed' ? 'url(#ptchGlowRed)' :
                            line.type === 'refactor' ? 'url(#ptchGlowPurple)' : '';

              return (
                <g key={i}>
                  <rect x="42" y={line.y - 12} width="278" height="18" rx="2" fill={fillId} filter={filter} opacity="0.8" />
                  <text x="48" y={line.y} fill={prefixColor} fontSize="11" fontWeight="bold" fontFamily="monospace">{prefix}</text>
                  <rect x="58" y={line.y - 8} width={50 + Math.random() * 150} height="8" rx="2" fill={prefixColor} opacity="0.4" />
                </g>
              );
            })}

            {/* Diff stats summary */}
            <rect x="8" y="300" width="314" height="32" rx="4" fill="#111827" />
            <text x="20" y="320" fill="#22c55e" fontSize="10" fontWeight="bold">+{Math.ceil(stats.linesChanged * 0.5)}</text>
            <text x="60" y="320" fill="#ef4444" fontSize="10" fontWeight="bold">-{Math.ceil(stats.linesChanged * 0.3)}</text>
            {includesRefactor && (
              <text x="100" y="320" fill="#a78bfa" fontSize="10" fontWeight="bold">~{Math.ceil(stats.linesChanged * 0.2)} refactor</text>
            )}
            <text x="220" y="320" fill="#64748b" fontSize="9">
              {stats.filesAffected} file{stats.filesAffected > 1 ? 's' : ''} changed
            </text>
          </g>

          {/* === WORKFLOW TIMELINE === */}
          <g transform="translate(15, 0)">
            <rect x="0" y="2" width="330" height="24" rx="4" fill="#111827" stroke="#1f2937" strokeWidth="1" />
            <text x="165" y="15" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold" letterSpacing="0.5">DEPLOYMENT PIPELINE</text>

            {/* Timeline connector line */}
            <line x1="45" y1="18" x2="285" y2="18" stroke="#334155" strokeWidth="2" />

            {/* Workflow steps with status indicators */}
            {workflowSteps.map((step, i) => {
              const gradientId = step.status === 'complete' ? 'url(#ptchStatusComplete)' :
                                step.status === 'warning' ? 'url(#ptchStatusWarning)' :
                                step.status === 'danger' ? 'url(#ptchStatusDanger)' :
                                'url(#ptchStatusPending)';
              const glowFilter = step.status === 'complete' ? 'url(#ptchGlowGreen)' :
                                step.status === 'warning' ? 'url(#ptchGlowAmber)' :
                                step.status === 'danger' ? 'url(#ptchGlowRed)' : '';
              return (
                <g key={i}>
                  <circle cx={step.x} cy="18" r="6" fill={gradientId} filter={glowFilter} />
                  {step.status !== 'pending' && (
                    <text x={step.x} y="21" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                      {step.status === 'complete' ? '\u2713' : step.status === 'warning' ? '!' : '\u2717'}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* === RIGHT PANEL: RISK ANALYSIS GRAPH === */}
          <g transform="translate(360, 30)">
            {/* Graph frame */}
            <rect x="0" y="0" width="320" height="260" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />

            {/* Graph title */}
            <text x="160" y="20" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
              Diff Size vs Regression Risk
            </text>

            {/* Risk gradient background */}
            <rect x="20" y="35" width="280" height="185" fill="url(#ptchRiskGradient)" opacity="0.3" rx="4" />

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(v => (
              <g key={v}>
                <line
                  x1={20}
                  y1={220 - (v / 100) * 180}
                  x2={300}
                  y2={220 - (v / 100) * 180}
                  stroke="#334155"
                  strokeWidth={v === 50 ? "1" : "0.5"}
                  strokeDasharray={v === 50 ? "none" : "4,4"}
                />
                <text x={15} y={224 - (v / 100) * 180} fill="#64748b" fontSize="8" textAnchor="end">
                  {v}%
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {[0, 50, 100].map(v => (
              <text key={v} x={20 + (v / 100) * 280} y={238} fill="#64748b" fontSize="8" textAnchor="middle">
                {v * 5}
              </text>
            ))}

            {/* Axes */}
            <line x1={20} y1={220} x2={300} y2={220} stroke="#475569" strokeWidth="2" />
            <line x1={20} y1={40} x2={20} y2={220} stroke="#475569" strokeWidth="2" />

            {/* Risk curve with gradient stroke */}
            <polyline
              points={curvePoints.map(p => {
                const [px, py] = p.split(',').map(Number);
                return `${px - 360},${py - 100}`;
              }).join(' ')}
              fill="none"
              stroke={showRefactor && includesRefactor ? 'url(#ptchRiskCurveRefactor)' : 'url(#ptchRiskCurve)'}
              strokeWidth={3}
              strokeLinecap="round"
              filter="url(#ptchSoftGlow)"
            />

            {/* Danger zone indicator */}
            <rect x={200} y={40} width={100} height={60} fill="rgba(239, 68, 68, 0.15)" rx="4" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={250} y={55} fill="#f87171" fontSize="8" textAnchor="middle" fontWeight="bold">DANGER</text>
            <text x={250} y={67} fill="#f87171" fontSize="7" textAnchor="middle">ZONE</text>

            {/* Safe zone indicator */}
            <rect x={20} y={170} width={80} height={50} fill="rgba(16, 185, 129, 0.15)" rx="4" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={60} y={195} fill="#4ade80" fontSize="8" textAnchor="middle" fontWeight="bold">SAFE</text>

            {/* Current position marker with glow */}
            <circle cx={currentX - 360} cy={currentY - 100} r="16" fill="url(#ptchMarkerGlow)" filter="url(#ptchMarkerBlur)" />
            <circle cx={currentX - 360} cy={currentY - 100} r="10" fill="url(#ptchMarkerGlow)" filter="url(#ptchSoftGlow)" />
            <circle cx={currentX - 360} cy={currentY - 100} r="5" fill="#0f172a" stroke={stats.regressionRisk > 50 ? "#ef4444" : "#22c55e"} strokeWidth="2" />

            {/* Axis labels */}
            <text x={160} y={252} fill="#94a3b8" fontSize="9" textAnchor="middle">Lines Changed</text>
            <text x={8} y={130} fill="#94a3b8" fontSize="9" textAnchor="middle" transform="rotate(-90, 8, 130)">Risk %</text>
          </g>

          {/* === METRICS PANEL === */}
          <g transform="translate(360, 300)">
            <rect x="0" y="0" width="320" height="70" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />
            <text x="160" y="16" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="0.5">RISK METRICS</text>

            {/* Risk meter */}
            <g transform="translate(20, 28)">
              <rect x="0" y="0" width="85" height="35" rx="4" fill={stats.regressionRisk > 50 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'} />
              <text x="42" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8">RISK</text>
              <text x="42" y="30" textAnchor="middle" fill={stats.regressionRisk > 50 ? '#f87171' : '#4ade80'} fontSize="14" fontWeight="bold" filter={stats.regressionRisk > 50 ? 'url(#ptchGlowRed)' : 'url(#ptchGlowGreen)'}>
                {stats.regressionRisk.toFixed(0)}%
              </text>
            </g>

            {/* Review difficulty meter */}
            <g transform="translate(117, 28)">
              <rect x="0" y="0" width="85" height="35" rx="4" fill={stats.reviewDifficulty > 60 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'} />
              <text x="42" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8">REVIEW</text>
              <text x="42" y="30" textAnchor="middle" fill={stats.reviewDifficulty > 60 ? '#fbbf24' : '#4ade80'} fontSize="14" fontWeight="bold" filter={stats.reviewDifficulty > 60 ? 'url(#ptchGlowAmber)' : 'url(#ptchGlowGreen)'}>
                {stats.reviewDifficulty.toFixed(0)}%
              </text>
            </g>

            {/* Rollback ease meter */}
            <g transform="translate(214, 28)">
              <rect x="0" y="0" width="85" height="35" rx="4" fill={stats.rollbackEase > 50 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} />
              <text x="42" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8">ROLLBACK</text>
              <text x="42" y="30" textAnchor="middle" fill={stats.rollbackEase > 50 ? '#4ade80' : '#f87171'} fontSize="14" fontWeight="bold" filter={stats.rollbackEase > 50 ? 'url(#ptchGlowGreen)' : 'url(#ptchGlowRed)'}>
                {stats.rollbackEase.toFixed(0)}%
              </text>
            </g>
          </g>

          {/* Legend */}
          <g transform="translate(370, 378)">
            <rect x="-5" y="-8" width="300" height="20" rx="4" fill="#111827" opacity="0.8" />
            <circle cx="8" cy="2" r="4" fill="#22c55e" />
            <text x="18" y="5" fill="#94a3b8" fontSize="8">Added</text>
            <circle cx="68" cy="2" r="4" fill="#ef4444" />
            <text x="78" y="5" fill="#94a3b8" fontSize="8">Removed</text>
            <circle cx="138" cy="2" r="4" fill="#64748b" />
            <text x="148" y="5" fill="#94a3b8" fontSize="8">Context</text>
            {includesRefactor && (
              <>
                <circle cx="208" cy="2" r="4" fill="#a78bfa" />
                <text x="218" y="5" fill="#94a3b8" fontSize="8">Refactor</text>
              </>
            )}
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setDiffSize(10); setIncludesRefactor(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              Small Patch (10 lines)
            </button>
            <button
              onClick={() => { setDiffSize(50); setIncludesRefactor(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
              }}
            >
              Medium Patch
            </button>
            <button
              onClick={() => { setDiffSize(100); setIncludesRefactor(true); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
              }}
            >
              Big Refactor
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showRefactor: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Diff Size: {diffSize} lines ({diffSize < 30 ? 'Small' : diffSize < 70 ? 'Medium' : 'Large'})
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={diffSize}
          onChange={(e) => setDiffSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showRefactor && (
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
              checked={includesRefactor}
              onChange={(e) => setIncludesRefactor(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Includes unrequested refactoring
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
          Prompt Template: "Make the smallest possible diff; show the patch; explain only the change"
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Risk = (lines/100)^1.5 {includesRefactor ? '* 2.5 (refactor penalty)' : ''}
        </div>
      </div>
    </div>
  );

  const renderRollbackDemo = () => (
    <div style={{
      background: colors.bgCard,
      padding: '20px',
      borderRadius: '12px',
      margin: '16px',
    }}>
      <h4 style={{ color: colors.accent, marginBottom: '12px' }}>Rollback Simulation</h4>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['Deploy', 'Bug Found', 'Rollback', 'Fixed'].map((step, i) => (
          <div
            key={step}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '4px',
              background: rollbackStep >= i ? colors.success : 'rgba(255,255,255,0.1)',
              color: rollbackStep >= i ? 'white' : colors.textMuted,
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            {step}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setRollbackStep(Math.max(0, rollbackStep - 1))}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: colors.textPrimary,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={() => setRollbackStep(Math.min(3, rollbackStep + 1))}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: colors.accent,
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Next Step
        </button>
      </div>
      <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '12px' }}>
        {rollbackStep === 0 && 'Small patch deployed to production...'}
        {rollbackStep === 1 && 'Bug reported! But we know exactly which 10 lines caused it.'}
        {rollbackStep === 2 && 'git revert takes 5 seconds. No side effects - it was atomic.'}
        {rollbackStep === 3 && 'System restored. Now fix properly without production pressure.'}
      </p>
    </div>
  );

  // Main render with wrapper
  const currentIdx = phaseOrder.indexOf(phase);

  const renderContent = () => {
    // HOOK PHASE
    if (phase === 'hook') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
                Patch Discipline
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
                Do huge one-shot changes increase bug probability?
              </p>
            </div>

            {renderVisualization(true)}

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              margin: '16px 0',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                When working with AI coding assistants, the temptation is to ask for big changes
                all at once. "Refactor this entire module and add the new feature!" But does
                this actually work better than small, focused patches?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The physics of software changes reveals surprising truths about patch size.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the diff size to see how regression risk changes!
              </p>
            </div>
          </div>
          {renderBottomBar(false, true, 'Make a Prediction')}
        </>
      );
    }

    // PREDICT PHASE
    if (phase === 'predict') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              margin: '16px 0',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                You need to add a feature to a codebase. You can either make one 500-line PR that
                does everything, or five 100-line PRs that build up to the feature incrementally.
                How does bug probability compare?
              </p>
            </div>

            <div>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                How does regression risk scale with patch size?
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
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {renderBottomBar(true, !!prediction, 'Test My Prediction')}
        </>
      );
    }

    // PLAY PHASE
    if (phase === 'play') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Patch Size Effects</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust diff size and observe how risk metrics change
              </p>
            </div>

            {renderVisualization(true)}
            {renderControls()}
            {renderRollbackDemo()}

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Risk grows faster than linearly (interactions multiply)</li>
                <li>Review difficulty makes large patches rubber-stamped</li>
                <li>Rollback ease drops dramatically with size</li>
                <li>The "safe zone" is surprisingly small (&lt;30 lines)</li>
              </ul>
            </div>
          </div>
          {renderBottomBar(true, true, 'Continue to Review')}
        </>
      );
    }

    // REVIEW PHASE
    if (phase === 'review') {
      const wasCorrect = prediction === 'exponential';

      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px',
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrect ? 'Correct!' : 'The Answer: Super-linear Growth'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Bug risk grows faster than linearly because each line can interact with every other line.
                A 100-line change has ~5000 potential interactions; a 500-line change has ~125,000!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Patch Size</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Surface Area:</strong> Larger patches
                  touch more code, creating more "surface area" for bugs to hide in the interactions.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Cognitive Load:</strong> Reviewers
                  cannot hold 500 lines in working memory. They skim, miss bugs, approve anyway.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Atomicity:</strong> Small patches
                  do one thing. If it breaks, you know exactly why. Large patches could break anywhere.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Prompt Insight:</strong> Ask LLMs
                  for "the smallest possible diff" and you get focused, reviewable, safe changes.
                </p>
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, 'Next: A Twist!')}
        </>
      );
    }

    // TWIST PREDICT PHASE
    if (phase === 'twist_predict') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
              <p style={{ color: colors.textSecondary }}>
                What about "helpful" refactoring mixed with feature work?
              </p>
            </div>

            {renderVisualization(false, true)}

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              margin: '16px 0',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                An LLM adds your requested feature, but also "cleans up" some nearby code,
                renames variables for clarity, and extracts a helper function. These changes
                are behavior-preserving refactors. Is this helpful?
              </p>
            </div>

            <div>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                Are unrequested refactors safe to include?
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
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
        </>
      );
    }

    // TWIST PLAY PHASE
    if (phase === 'twist_play') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Refactor Risk</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Toggle refactoring and observe how risk jumps
              </p>
            </div>

            {renderVisualization(true, true)}
            {renderControls(true)}

            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.error}`,
            }}>
              <h4 style={{ color: colors.error, marginBottom: '8px' }}>The Refactor Trap:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Refactors look safe ("just moving code"), but they:
                <br />- Add lines that were not requested (increases surface area)
                <br />- Are not covered by the tests you wrote for the feature
                <br />- Make git bisect unable to isolate the feature change
                <br />- Obscure the actual feature in code review
              </p>
            </div>
          </div>
          {renderBottomBar(true, true, 'See the Explanation')}
        </>
      );
    }

    // TWIST REVIEW PHASE
    if (phase === 'twist_review') {
      const wasCorrect = twistPrediction === 'refactor_risky';

      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px',
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrect ? 'Correct!' : 'The Answer: Hidden Risk'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Unrequested refactors add hidden risk. They seem safe but create untested code paths
                and make the patch harder to review, debug, and rollback.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The "No Refactors Unless Requested" Rule</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Better Prompt:</strong> "Make the
                  smallest possible diff. Do not refactor or clean up code unless I explicitly ask."
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Separate Concerns:</strong> If you
                  want a refactor, make it a separate PR. Then you can review it independently.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Trust But Verify:</strong> Always
                  ask the LLM to "show the patch" so you can verify no unrequested changes snuck in.
                </p>
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, 'Apply This Knowledge')}
        </>
      );
    }

    // TRANSFER PHASE
    if (phase === 'transfer') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>
                Real-World Applications
              </h2>
              <p style={{ color: colors.textSecondary }}>
                Small-patch discipline applies across software engineering
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                Complete all 4 applications to unlock the test
              </p>
            </div>

            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
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
          {renderBottomBar(true, transferCompleted.size >= 4, 'Take the Test')}
        </>
      );
    }

    // TEST PHASE
    if (phase === 'test') {
      if (testSubmitted) {
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                  {testScore >= 8 ? 'You understand patch discipline!' : 'Review the material and try again.'}
                </p>
              </div>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
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
            {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore < 8 ? () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); goToPhase('hook'); } : undefined)}
          </>
        );
      }

      const currentQ = testQuestions[currentTestQuestion];
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
              )}
            </div>
          </div>
        </>
      );
    }

    // MASTERY PHASE
    if (phase === 'mastery') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
              <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary }}>You have mastered patch discipline for LLM-assisted coding</p>
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Prompt Patterns:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>"Make the smallest possible diff"</li>
                <li>"Show the patch before and after"</li>
                <li>"Explain only the change you made"</li>
                <li>"Do not refactor unless I explicitly ask"</li>
                <li>"One logical change per commit"</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Remember:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Small patches are not about writing less code - they are about managing complexity.
                Every line of change is a potential bug. Every interaction between changed lines
                multiplies that risk. Discipline in patch size is the foundation of reliable
                AI-assisted development.
              </p>
            </div>
            {renderVisualization(true)}
          </div>
          {renderBottomBar(true, true, 'Complete Game', () => {
            emitGameEvent('game_completed', {
              phase: 'mastery',
              score: testScore,
              maxScore: 10,
              message: 'Patch Discipline game completed!'
            });
          })}
        </>
      );
    }

    return null;
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.bgPrimary,
      color: colors.textPrimary
    }}>
      {renderProgressBar()}
      {renderContent()}
    </div>
  );
};

export default PatchDisciplineRenderer;
