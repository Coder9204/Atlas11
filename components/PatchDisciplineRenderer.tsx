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
    const width = 450;
    const height = 350;
    const stats = calculateRisk();

    // Risk curve points
    const curvePoints: string[] = [];
    for (let x = 0; x <= 100; x += 5) {
      const risk = Math.pow(x / 100, 1.5) * 100 * (showRefactor && includesRefactor ? 2.5 : 1);
      const clampedRisk = Math.min(100, risk);
      const px = 50 + (x / 100) * 300;
      const py = 280 - (clampedRisk / 100) * 200;
      curvePoints.push(`${px},${py}`);
    }

    // Current point
    const currentX = 50 + (diffSize / 100) * 300;
    const currentY = 280 - (stats.regressionRisk / 100) * 200;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="riskGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={colors.success} stopOpacity="0.3" />
              <stop offset="50%" stopColor={colors.warning} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.error} stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            Diff Size vs Regression Risk
          </text>

          {/* Background grid */}
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line
                x1={50}
                y1={280 - (v / 100) * 200}
                x2={350}
                y2={280 - (v / 100) * 200}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4,4"
              />
              <text x={40} y={285 - (v / 100) * 200} fill={colors.textMuted} fontSize={10} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}

          {/* Axes */}
          <line x1={50} y1={280} x2={350} y2={280} stroke={colors.textMuted} strokeWidth={2} />
          <line x1={50} y1={80} x2={50} y2={280} stroke={colors.textMuted} strokeWidth={2} />

          {/* Risk curve */}
          <polyline
            points={curvePoints.join(' ')}
            fill="none"
            stroke={showRefactor && includesRefactor ? colors.error : colors.warning}
            strokeWidth={3}
          />

          {/* Danger zone */}
          <rect x={250} y={80} width={100} height={100} fill="rgba(239, 68, 68, 0.1)" />
          <text x={300} y={100} fill={colors.error} fontSize={10} textAnchor="middle">DANGER ZONE</text>

          {/* Safe zone */}
          <rect x={50} y={230} width={100} height={50} fill="rgba(16, 185, 129, 0.1)" />
          <text x={100} y={250} fill={colors.success} fontSize={10} textAnchor="middle">SAFE ZONE</text>

          {/* Current position marker */}
          <circle cx={currentX} cy={currentY} r={10} fill={stats.regressionRisk > 50 ? colors.error : colors.success} />
          <circle cx={currentX} cy={currentY} r={6} fill={colors.bgPrimary} />

          {/* Axis labels */}
          <text x={200} y={310} fill={colors.textSecondary} fontSize={12} textAnchor="middle">
            Lines Changed: {stats.linesChanged} | Files: {stats.filesAffected}
          </text>
          <text x={30} y={180} fill={colors.textSecondary} fontSize={11} textAnchor="middle" transform="rotate(-90, 30, 180)">
            Risk %
          </text>

          {/* Stats panel */}
          <rect x={360} y={80} width={80} height={120} fill="rgba(0,0,0,0.5)" rx={8} />
          <text x={400} y={100} fill={colors.textSecondary} fontSize={9} textAnchor="middle">METRICS</text>
          <text x={400} y={125} fill={stats.regressionRisk > 50 ? colors.error : colors.success} fontSize={11} textAnchor="middle">
            Risk: {stats.regressionRisk.toFixed(0)}%
          </text>
          <text x={400} y={150} fill={stats.reviewDifficulty > 60 ? colors.warning : colors.textPrimary} fontSize={11} textAnchor="middle">
            Review: {stats.reviewDifficulty.toFixed(0)}%
          </text>
          <text x={400} y={175} fill={stats.rollbackEase > 50 ? colors.success : colors.error} fontSize={11} textAnchor="middle">
            Rollback: {stats.rollbackEase.toFixed(0)}%
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setDiffSize(10); setIncludesRefactor(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
                background: colors.warning,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
                background: colors.error,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
