import React, { useState, useCallback, useRef, useEffect } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme, withOpacity } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
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
  ...theme.colors,
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  diff: '#22c55e',
  diffRemove: '#ef4444',
  patch: '#8b5cf6',
  code: '#3b82f6',
  bgCardLight: '#1e293b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
};

type PDPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PatchDisciplineRenderer: React.FC<PatchDisciplineRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const validPhases: PDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): PDPhase => {
    if (gamePhase && validPhases.includes(gamePhase as PDPhase)) {
      return gamePhase as PDPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<PDPhase>(getInitialPhase);

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as PDPhase) && gamePhase !== phase) {
      setPhase(gamePhase as PDPhase);
    }
  }, [gamePhase]);

  const phaseOrder: PDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<PDPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Transfer',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const [diffSize, setDiffSize] = useState(50);
  const [includesRefactor, setIncludesRefactor] = useState(false);
  const [rollbackStep, setRollbackStep] = useState(0);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const { isMobile } = useViewport();
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `NOW ON SCREEN ${idx + 1}/${phaseOrder.length}: ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // Physics calculations - Risk = (lines/100)^1.5 * refactorMultiplier
  const calculateRisk = useCallback(() => {
    const baseRisk = Math.pow(diffSize / 100, 1.5) * 100;
    const refactorMultiplier = includesRefactor ? 2.5 : 1;
    const totalRisk = Math.min(100, baseRisk * refactorMultiplier);
    const reviewDifficulty = Math.min(100, diffSize * 1.2 * (includesRefactor ? 1.5 : 1));
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
    { id: 'no_difference', label: 'Patch size does not affect bug probability — bugs are random' },
    { id: 'linear', label: 'Bug risk increases linearly with lines changed' },
    { id: 'exponential', label: 'Bug risk grows faster than linearly — more interactions with larger patches' },
    { id: 'threshold', label: 'Bug risk stays low until a threshold, then jumps suddenly' },
  ];

  const twistPredictions = [
    { id: 'refactor_safe', label: 'Refactors are safe because they do not change behavior' },
    { id: 'refactor_risky', label: 'Refactors add hidden risk — they touch code without tests covering new paths' },
    { id: 'refactor_neutral', label: 'Refactors neither help nor hurt — they are just code movement' },
    { id: 'refactor_always', label: 'Always refactor when you see the opportunity' },
  ];

  const transferApplications = [
    {
      title: 'Database Migrations',
      description: 'Breaking schema changes into small, reversible steps reduces downtime risk. Teams like Stripe, GitHub, and Shopify deploy 100+ migrations per week by keeping each one under 50 lines.',
      question: 'Why do teams prefer many small migrations over one big schema change?',
      answer: 'Small migrations can be tested individually, rolled back independently, and reviewed thoroughly. A 500-line migration mixing data transforms with schema changes is nearly impossible to review or safely rollback. Studies show rollback success rate drops from 95% for 10-line migrations to under 40% for 500+ line migrations. GitHub deploys ~50 schema changes per week this way — zero downtime.',
    },
    {
      title: 'Feature Flags',
      description: 'Deploying code behind feature flags separates deployment from release. Companies like Facebook, Netflix, and LinkedIn manage 1000s of flags simultaneously.',
      question: 'How do feature flags embody the small-patch philosophy?',
      answer: 'Feature flags let you merge small, incomplete features without affecting users. Each merge is tiny and low-risk — typically under 30 lines. The "big change" happens only when toggling the flag, which is instantly reversible in under 1 second. Facebook uses 10,000+ active flags; each feature ships as a series of tiny PRs, each independently reviewable and revertable.',
    },
    {
      title: 'Code Review Fatigue',
      description: 'Reviewers lose effectiveness when reviewing large patches. Research shows bug-catch rate drops from 85% to under 20% as PR size grows from 50 to 500 lines.',
      question: 'Why do 10-line PRs get better review than 500-line PRs?',
      answer: 'Cognitive load limits attention. Reviewers can deeply understand 10 lines and catch subtle bugs — finding 85% of defects. At 500 lines, they skim, miss issues, and rubber-stamp approval. SmartBear research: optimal PR size is under 200 lines; beyond 400 lines, bugs-per-line-reviewed increases 3x. Google mandates PRs under 500 lines for this reason.',
    },
    {
      title: 'Git Bisect & Debug Speed',
      description: 'Finding bugs requires isolating the problematic commit. With small atomic patches, git bisect can pinpoint a bug in O(log n) commits.',
      question: 'How does patch discipline improve debugging speed?',
      answer: 'Git bisect halves the search space each iteration: 1000 commits takes only 10 bisection steps. If each commit is one focused change, bisect pinpoints the exact bug source. If commits mix unrelated changes, you find "somewhere in this 50-file commit" — useless. Teams practicing patch discipline report 60% faster time-to-root-cause on production incidents.',
    },
  ];

  const testQuestions = [
    {
      question: 'A team is adding authentication to their app. They have a 500-line PR that adds OAuth, refactors the user model, and updates 12 API endpoints. What is the primary concern with this approach?',
      options: [
        { text: 'A) The PR is too fast to write — it should take longer', correct: false },
        { text: 'B) Mixed concerns increase regression risk and make review nearly impossible', correct: true },
        { text: 'C) The PR looks unprofessional — it should be one file only', correct: false },
        { text: 'D) Large PRs bypass code review requirements automatically', correct: false },
      ],
      explanation: 'Mixing authentication changes, model refactoring, and API updates in one PR creates too many interacting concerns, making review nearly impossible and regression risk very high.',
    },
    {
      question: 'You doubled the size of a patch from 50 lines to 100 lines. Using the risk formula Risk = (lines/100)^1.5, how does regression risk actually scale?',
      options: [
        { text: 'A) Linearly — double the lines, double the risk', correct: false },
        { text: 'B) Super-linearly — interactions between changes multiply risk beyond 2x', correct: true },
        { text: 'C) Sub-linearly — larger patches are proportionally safer', correct: false },
        { text: 'D) Risk is constant regardless of patch size', correct: false },
      ],
      explanation: 'The 1.5-power scaling means doubling the lines causes more than double the risk because the number of potential interactions between changed lines grows combinatorially.',
    },
    {
      question: 'An LLM adds your requested feature but also renames 15 variables "for clarity" and extracts a helper function. The refactors are behavior-preserving. Should you keep them?',
      options: [
        { text: 'A) Yes — cleaner code is always better', correct: false },
        { text: 'B) No — unrequested refactors add hidden untested risk and should be a separate PR', correct: true },
        { text: 'C) Keep them, but do not mention it to reviewers', correct: false },
        { text: 'D) It makes no difference — combine them for efficiency', correct: false },
      ],
      explanation: 'Unrequested refactors introduce untested code paths and expand the change surface area beyond what was reviewed, creating hidden risk that should be isolated in a separate PR.',
    },
    {
      question: 'Research shows a 10-line PR gets better review than a 500-line PR. What is the primary reason?',
      options: [
        { text: 'A) Reviewers have a personal preference for less work', correct: false },
        { text: 'B) Cognitive load limits: reviewers can deeply understand small changes, catching 85% of bugs vs under 20% for large PRs', correct: true },
        { text: 'C) Large PRs are automatically rejected by CI systems', correct: false },
        { text: 'D) Line count does not affect review quality in practice', correct: false },
      ],
      explanation: 'Cognitive load limits mean reviewers can deeply analyze small changes and catch subtle bugs, but large diffs cause attention fatigue and rubber-stamp approvals.',
    },
    {
      question: 'What makes a patch "atomic" in the context of software engineering?',
      options: [
        { text: 'A) It contains exactly one line change', correct: false },
        { text: 'B) It makes one logical change that can be deployed, tested, and reverted independently', correct: true },
        { text: 'C) It was never touched by tests before merge', correct: false },
        { text: 'D) It was written by exactly one developer', correct: false },
      ],
      explanation: 'An atomic patch makes exactly one logical change that can be independently deployed, tested, and reverted without affecting unrelated functionality.',
    },
    {
      question: 'A production bug appears. You have two recent commits: (A) a 10-line focused fix, or (B) a 400-line "cleanup + feature + fix" commit. How does small-patch discipline help here?',
      options: [
        { text: 'A) Small patches cannot cause production bugs', correct: false },
        { text: 'B) Reverting the focused 10-line fix has predictable, limited impact — you know exactly what changes', correct: true },
        { text: 'C) Rollbacks are never needed if you test thoroughly', correct: false },
        { text: 'D) Patch size does not affect rollback difficulty', correct: false },
      ],
      explanation: 'Reverting a small focused fix has predictable, limited blast radius because you know exactly what changed, while reverting a mixed commit risks undoing unrelated work.',
    },
    {
      question: 'The prompt "Make the smallest possible diff that achieves the goal" is effective because:',
      options: [
        { text: 'A) It reduces the LLM API token count and saves money', correct: false },
        { text: 'B) It forces focus on one change, reducing unintended modifications and surface area for bugs', correct: true },
        { text: 'C) Smaller LLM responses are always more accurate', correct: false },
        { text: 'D) It is just a style preference with no measurable impact', correct: false },
      ],
      explanation: 'Constraining the diff size forces the LLM to focus on the specific goal, preventing scope creep and reducing the surface area for unintended modifications.',
    },
    {
      question: 'When is it acceptable to mix refactoring with feature work in a single commit?',
      options: [
        { text: 'A) Always — refactoring + features together saves time', correct: false },
        { text: 'B) Never under any circumstances', correct: false },
        { text: 'C) Only when explicitly requested by the ticket and the refactor is essential for the feature', correct: true },
        { text: 'D) Whenever the surrounding code looks messy to you', correct: false },
      ],
      explanation: 'Mixing refactoring with feature work is only acceptable when the refactor is a prerequisite for the feature and both are part of the same ticket scope.',
    },
    {
      question: 'The "show the patch" technique (asking an LLM to show a before/after diff) improves code quality by:',
      options: [
        { text: 'A) Making the output look more professional in reviews', correct: false },
        { text: 'B) Enabling explicit verification — you can see exactly what changed and catch unintended modifications', correct: true },
        { text: 'C) Git requires diff format for all submissions', correct: false },
        { text: 'D) Smaller patch format reduces API costs per request', correct: false },
      ],
      explanation: 'Seeing the exact diff makes every change explicit, enabling line-by-line verification that catches unintended modifications that would be invisible in full-file output.',
    },
    {
      question: 'The "surface area" of a code change refers to:',
      options: [
        { text: 'A) The screen space in pixels needed to display the diff', correct: false },
        { text: 'B) The amount of code that could be affected — every touched line is a potential interaction point for bugs', correct: true },
        { text: 'C) The number of developers who contributed to the change', correct: false },
        { text: 'D) The file size in bytes after the change', correct: false },
      ],
      explanation: 'Surface area represents the total code touched by a change, where each modified line creates potential interaction points with surrounding code that could introduce bugs.',
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
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px',
        minHeight: '48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                aria-label={phaseLabels[p]}
                onClick={() => goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: 'none',
                  padding: 0,
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
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
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
            minHeight: '44px',
            transition: 'all 0.15s ease',
          }}
          onClick={handleBack}
        >
          ← Back
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
            minHeight: '44px',
            transition: 'all 0.15s ease',
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

    // Graph area: x: 60..340, y: 50..300 (range 250px vertical)
    const graphLeft = 60;
    const graphRight = 340;
    const graphTop = 50;
    const graphBottom = 300;
    const graphW = graphRight - graphLeft;
    const graphH = graphBottom - graphTop;

    // Risk curve points
    const curvePoints: string[] = [];
    for (let x = 0; x <= 100; x += 2) {
      const risk = Math.pow(x / 100, 1.5) * 100 * (showRefactor && includesRefactor ? 2.5 : 1);
      const clampedRisk = Math.min(100, risk);
      const px = graphLeft + (x / 100) * graphW;
      const py = graphBottom - (clampedRisk / 100) * graphH;
      curvePoints.push(`${px},${py}`);
    }

    // Baseline curve (no refactor, always shown for reference)
    const baselineCurvePoints: string[] = [];
    for (let x = 0; x <= 100; x += 2) {
      const risk = Math.pow(x / 100, 1.5) * 100;
      const px = graphLeft + (x / 100) * graphW;
      const py = graphBottom - (Math.min(100, risk) / 100) * graphH;
      baselineCurvePoints.push(`${px},${py}`);
    }

    // Current interactive point position
    const currentX = graphLeft + (diffSize / 100) * graphW;
    const currentRisk = Math.min(100, Math.pow(diffSize / 100, 1.5) * 100 * (showRefactor && includesRefactor ? 2.5 : 1));
    const currentY = graphBottom - (currentRisk / 100) * graphH;

    // Reference point at diffSize=30 (baseline)
    const refX = graphLeft + (30 / 100) * graphW;
    const refRisk = Math.pow(0.3, 1.5) * 100;
    const refY = graphBottom - (refRisk / 100) * graphH;

    // Diff visualization (right panel)
    const generateDiffLines = () => {
      const lines = [];
      const totalLines = Math.min(10, Math.ceil(diffSize / 10));
      for (let i = 0; i < totalLines; i++) {
        const rand = (i * 7 + 3) % 10;
        let type: 'added' | 'removed' | 'context' | 'refactor';
        if (includesRefactor && rand > 6) {
          type = 'refactor';
        } else if (rand < 4) {
          type = 'added';
        } else if (rand < 6) {
          type = 'removed';
        } else {
          type = 'context';
        }
        lines.push({ y: 90 + i * 20, type, width: 80 + (rand * 15) });
      }
      return lines;
    };

    const diffLines = generateDiffLines();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
         role="img" aria-label="Patch Discipline visualization">
          <defs>
            <linearGradient id="ptchLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <linearGradient id="ptchRiskGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="ptchRiskCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="ptchRiskCurveRefactor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <radialGradient id="ptchMarkerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={currentRisk > 50 ? "#fca5a5" : "#86efac"} />
              <stop offset="60%" stopColor={currentRisk > 50 ? "#ef4444" : "#22c55e"} stopOpacity="0.5" />
              <stop offset="100%" stopColor={currentRisk > 50 ? "#b91c1c" : "#15803d"} stopOpacity="0" />
            </radialGradient>
            <filter id="ptchGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ptchGlowRed" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ptchMarkerFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ptchSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="ptchGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
            <filter id="diffGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="diffPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <pattern id="gridDots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.5" fill="rgba(148,163,184,0.15)" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#ptchLabBg)" />
          <rect width={width} height={height} fill="url(#ptchGrid)" />

          {/* === LEFT PANEL: RISK GRAPH === */}
          <rect x="20" y="20" width="360" height="360" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />

          {/* Graph title */}
          <text x="200" y="42" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">
            Diff Size vs Regression Rate (Risk)
          </text>

          {/* Risk zone background */}
          <rect x={graphLeft} y={graphTop} width={graphW} height={graphH} fill="url(#ptchRiskGradient)" opacity="0.3" rx="4" />

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line
                x1={graphLeft} y1={graphBottom - (v / 100) * graphH}
                x2={graphRight} y2={graphBottom - (v / 100) * graphH}
                stroke="#334155" strokeWidth="0.5"
                strokeDasharray="4 4" opacity="0.3"
              />
              <text x={graphLeft - 6} y={graphBottom - (v / 100) * graphH + 4}
                fill="#94a3b8" fontSize="11" textAnchor="end">
                {v}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {[0, 50, 100].map(v => (
            <text key={v} x={graphLeft + (v / 100) * graphW} y={graphBottom + 18}
              fill="#94a3b8" fontSize="11" textAnchor="middle">
              {v * 5}
            </text>
          ))}

          {/* Axes */}
          <line x1={graphLeft} y1={graphBottom} x2={graphRight} y2={graphBottom} stroke="#475569" strokeWidth="2" />
          <line x1={graphLeft} y1={graphTop} x2={graphLeft} y2={graphBottom} stroke="#475569" strokeWidth="2" />

          {/* Y-axis label */}
          <text x={12} y={graphTop + graphH / 2} fill="#94a3b8" fontSize="12" textAnchor="middle"
            transform={`rotate(-90, 12, ${graphTop + graphH / 2})`}>
            Risk %
          </text>

          {/* X-axis label */}
          <text x={graphLeft + graphW / 2} y={graphBottom + 36} fill="#94a3b8" fontSize="12" textAnchor="middle">
            Lines Changed
          </text>

          {/* Baseline curve (shown as reference when refactor is active) */}
          {showRefactor && includesRefactor && (
            <polyline
              points={baselineCurvePoints.join(' ')}
              fill="none"
              stroke="#475569"
              strokeWidth="1.5"
              strokeDasharray="5,3"
              opacity="0.6"
            />
          )}

          {/* Main risk curve */}
          <polyline
            points={curvePoints.join(' ')}
            fill="none"
            stroke={showRefactor && includesRefactor ? 'url(#ptchRiskCurveRefactor)' : 'url(#ptchRiskCurve)'}
            strokeWidth={3}
            strokeLinecap="round"
            filter="url(#ptchSoftGlow)"
          />

          {/* Safe zone */}
          <rect x={graphLeft} y={graphBottom - 30} width={60} height={30}
            fill="rgba(16,185,129,0.15)" rx="3" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={graphLeft + 30} y={graphBottom - 12} fill="#4ade80" fontSize="11" textAnchor="middle" fontWeight="bold">
            SAFE ✓
          </text>

          {/* Danger zone */}
          <rect x={graphRight - 80} y={graphTop} width={80} height={50}
            fill="rgba(239,68,68,0.15)" rx="3" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={graphRight - 40} y={graphTop + 20} fill="#f87171" fontSize="11" textAnchor="middle" fontWeight="bold">
            ⚠ DANGER
          </text>

          {/* Reference marker (baseline at 30 lines) */}
          <circle cx={refX} cy={refY} r="5" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
          <text x={refX + 8} y={refY - 6} fill="#94a3b8" fontSize="11">baseline</text>

          {/* Current interactive marker */}
          <circle cx={currentX} cy={currentY} r="20" fill="url(#ptchMarkerGlow)" filter="url(#ptchMarkerFilter)" opacity="0.6" />
          <circle cx={currentX} cy={currentY} r="10" fill="none" stroke={currentRisk > 50 ? "#ef4444" : "#22c55e"}
            strokeWidth="2" filter="url(#ptchSoftGlow)" opacity="0.7" />
          <circle cx={currentX} cy={currentY} r="8" fill="#0f172a"
            stroke={currentRisk > 50 ? "#ef4444" : "#22c55e"} strokeWidth="2.5"
            filter="url(currentRisk > 50 ? 'ptchGlowRed' : 'ptchGlowGreen')" />

          {/* === RIGHT PANEL: DIFF VIEW + METRICS === */}
          <rect x="400" y="20" width="280" height="360" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />

          {/* Editor title bar */}
          <rect x="404" y="24" width="272" height="28" rx="4" fill="#1e293b" />
          <circle cx="416" cy="38" r="4" fill="#ef4444" />
          <circle cx="430" cy="38" r="4" fill="#f59e0b" />
          <circle cx="444" cy="38" r="4" fill="#22c55e" />
          <text x="540" y="42" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
            feature.tsx
          </text>

          {/* Diff lines */}
          {diffLines.map((line, i) => {
            const prefixColor = line.type === 'added' ? '#22c55e' :
              line.type === 'removed' ? '#ef4444' :
              line.type === 'refactor' ? '#a78bfa' : '#64748b';
            const bgColor = line.type === 'added' ? 'rgba(34,197,94,0.12)' :
              line.type === 'removed' ? 'rgba(239,68,68,0.12)' :
              line.type === 'refactor' ? 'rgba(167,139,250,0.12)' : 'rgba(100,116,139,0.05)';
            const prefix = line.type === 'added' ? '+' :
              line.type === 'removed' ? '-' :
              line.type === 'refactor' ? '~' : ' ';

            return (
              <g key={i}>
                <rect x="404" y={line.y - 13} width="272" height="17" fill={bgColor} />
                <text x="412" y={line.y} fill={prefixColor} fontSize="12" fontFamily="monospace" fontWeight="bold">{prefix}</text>
                <rect x="424" y={line.y - 8} width={line.width} height="8" rx="2" fill={prefixColor} opacity="0.35" />
              </g>
            );
          })}

          {/* Metrics bar */}
          <rect x="404" y="310" width="272" height="65" rx="4" fill="#0f172a" />

          <text x="540" y="326" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">
            RISK METRICS
          </text>

          {/* Risk % */}
          <rect x="412" y="334" width="75" height="34" rx="3" fill={stats.regressionRisk > 50 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'} />
          <text x="450" y="346" textAnchor="middle" fill="#94a3b8" fontSize="11">RISK</text>
          <text x="450" y="362" textAnchor="middle"
            fill={stats.regressionRisk > 50 ? '#f87171' : '#4ade80'} fontSize="14" fontWeight="bold">
            {stats.regressionRisk.toFixed(0)}%
          </text>

          {/* Review % */}
          <rect x="494" y="334" width="75" height="34" rx="3" fill={stats.reviewDifficulty > 60 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'} />
          <text x="532" y="346" textAnchor="middle" fill="#94a3b8" fontSize="11">REVIEW</text>
          <text x="532" y="362" textAnchor="middle"
            fill={stats.reviewDifficulty > 60 ? '#fbbf24' : '#4ade80'} fontSize="14" fontWeight="bold">
            {stats.reviewDifficulty.toFixed(0)}%
          </text>

          {/* Rollback % */}
          <rect x="576" y="334" width="92" height="34" rx="3" fill={stats.rollbackEase > 50 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} />
          <text x="622" y="346" textAnchor="middle" fill="#94a3b8" fontSize="11">ROLLBACK</text>
          <text x="622" y="362" textAnchor="middle"
            fill={stats.rollbackEase > 50 ? '#4ade80' : '#f87171'} fontSize="14" fontWeight="bold">
            {stats.rollbackEase.toFixed(0)}%
          </text>

          {/* Files changed label */}
          <text x="540" y="384" textAnchor="middle" fill="#64748b" fontSize="11">
            {stats.filesAffected} file{stats.filesAffected > 1 ? 's' : ''} · {stats.linesChanged} lines
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setDiffSize(10); setIncludesRefactor(false); }}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              Try Small Patch
            </button>
            <button
              onClick={() => { setDiffSize(50); setIncludesRefactor(false); }}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              Try Medium Patch
            </button>
            <button
              onClick={() => { setDiffSize(100); setIncludesRefactor(true); }}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              Try Big Refactor
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showRefactor: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Diff Size (lines): {diffSize} — {diffSize < 30 ? 'Small ✓ safe zone' : diffSize < 70 ? 'Medium ⚠ moderate risk' : 'Large ✗ high risk'}
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={diffSize}
          onChange={(e) => setDiffSize(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: '20px',
            accentColor: '#3b82f6',
            WebkitAppearance: 'none' as any,
            touchAction: 'pan-y',
            cursor: 'pointer',
          }}
        />
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Risk formula: Risk = (lines/100)^1.5 — super-linear growth. 100 lines → {(Math.pow(1, 1.5) * 100).toFixed(0)}% risk.
        </div>
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
            Includes unrequested refactoring (+2.5× risk multiplier)
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(245,158,11,0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
          <strong>📋 Prompt template:</strong> "Make the smallest possible diff; show the patch; explain only the change"
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          Risk = (diffSize/100)^1.5 {includesRefactor ? '× 2.5 (refactor multiplier applied)' : ''}. When you increase diff size, risk grows faster than linearly because each line can interact with every other line.
        </div>
      </div>
    </div>
  );

  const renderRollbackDemo = () => (
    <div style={{
      background: colors.bgCard,
      padding: '20px',
      borderRadius: '12px',
      margin: '16px 0',
    }}>
      <h4 style={{ color: colors.accent, marginBottom: '12px' }}>⚡ Rollback Simulation</h4>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['🚀 Deploy', '🐛 Bug Found', '↩ Rollback', '✅ Fixed'].map((step, i) => (
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
            padding: '8px 16px', borderRadius: '6px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent', color: colors.textPrimary, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => setRollbackStep(Math.min(3, rollbackStep + 1))}
          style={{
            padding: '8px 16px', borderRadius: '6px',
            border: 'none', background: colors.accent,
            color: 'white', cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Advance Step →
        </button>
      </div>
      <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '12px' }}>
        {rollbackStep === 0 && 'Small patch deployed to production — only 10 focused lines changed.'}
        {rollbackStep === 1 && '🐛 Bug reported! But we know exactly which 10 lines caused it.'}
        {rollbackStep === 2 && '↩ git revert takes 5 seconds. No side effects — it was atomic. Rollback ease: high.'}
        {rollbackStep === 3 && '✅ System restored. Fix properly without production pressure. Patch discipline wins.'}
      </p>
    </div>
  );

  const currentIdx = phaseOrder.indexOf(phase);

  const renderContent = () => {
    // HOOK PHASE
    if (phase === 'hook') {
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 800 }}>
                🩹 Patch Discipline
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                When working with AI coding assistants, the temptation is to ask for big changes
                all at once. "Refactor this entire module and add the new feature!" But does
                this actually work better than small, focused patches?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The physics of software changes reveals surprising truths about patch size — and why
                the formula Risk = (lines/100)^1.5 explains so much about engineering disasters.
              </p>
            </div>

            <div style={{
              background: 'rgba(245,158,11,0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Explore the visualization above — adjust diff size to observe how regression risk changes!
              </p>
            </div>
          </div>
          {renderBottomBar(false, true, 'Next →')}
        </div>
      );
    }

    // PREDICT PHASE
    if (phase === 'predict') {
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              margin: '16px 0',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>🔍 The Scenario:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                You need to add a feature to a codebase. You can either make one 500-line PR that
                does everything, or five 100-line PRs that build up to the feature incrementally.
                How does bug probability compare between these approaches?
              </p>
            </div>

            <div>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
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
                      background: prediction === p.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, 'Next →')}
        </div>
      );
    }

    // PLAY PHASE
    if (phase === 'play') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>🔬 Explore Patch Size Effects</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust diff size and observe how risk metrics change in real time
              </p>
            </div>

            {/* Side-by-side layout: SVG left, controls right */}


            <div style={{


              display: 'flex',


              flexDirection: isMobile ? 'column' : 'row',


              gap: isMobile ? '12px' : '20px',


              width: '100%',


              alignItems: isMobile ? 'center' : 'flex-start',


            }}>


              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


                {renderVisualization(true)}


              </div>


              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


                {renderControls()}


              </div>


            </div>
            {renderRollbackDemo()}

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>🔑 Key Observations:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Risk grows super-linearly: doubling lines more than doubles risk (interactions multiply)</li>
                <li>Review difficulty causes larger patches to be rubber-stamped — reviewers can't hold 500 lines in memory</li>
                <li>Rollback ease drops dramatically with size: reverting an atomic change is safe; reverting a 50-file commit is chaotic</li>
                <li>The "safe zone" is surprisingly small (&lt;30 lines) — this is why patch discipline matters in practice</li>
              </ul>
              <div style={{ marginTop: '12px', color: colors.textSecondary, fontSize: '14px' }}>
                <strong style={{ color: colors.textPrimary }}>Why this matters in industry:</strong> Google, Microsoft, and high-performing
                engineering teams mandate small PRs. Research shows teams with median PR size &lt;200 lines
                deploy 2x more frequently and have 3x fewer production incidents.
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, 'Continue to Review →')}
        </div>
        </div>
      );
    }

    // REVIEW PHASE
    if (phase === 'review') {
      const wasCorrect = prediction === 'exponential';

      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px',
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                {wasCorrect ? '✅ Correct! Super-linear Growth' : '📚 The Answer: Super-linear Growth'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Bug risk grows faster than linearly because each line can interact with every other line.
                A 100-line change has ~5,000 potential interactions; a 500-line change has ~125,000!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>📐 The Formula & Physics</h3>
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                borderLeft: '3px solid #3b82f6',
              }}>
                <div style={{ color: '#60a5fa', fontSize: '16px', fontFamily: 'monospace', fontWeight: 700 }}>
                  Risk = (diffSize / 100)^1.5 × refactorMultiplier
                </div>
                <div style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '4px' }}>
                  Equation shows: 100 lines → 100% base risk. 50 lines → 35% risk. 10 lines → 3% risk.
                </div>
              </div>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>🔗 Surface Area:</strong> Larger patches
                  touch more code, creating more "surface area" for bugs to hide in the interactions between changed lines.
                  This relationship is proportional to n² in the worst case.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>🧠 Cognitive Load:</strong> Reviewers
                  cannot hold 500 lines in working memory. They skim, miss bugs, approve anyway. This is why your
                  prediction about review difficulty was confirmed by the graph.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>💡 Prompt Insight:</strong> Ask LLMs
                  for "the smallest possible diff" and you get focused, reviewable, safe changes.
                </p>
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, 'Next: A Twist! →')}
        </div>
      );
    }

    // TWIST PREDICT PHASE
    if (phase === 'twist_predict') {
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>🌀 The Twist</h2>
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
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>🔍 The New Scenario:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                An LLM adds your requested feature, but also "cleans up" some nearby code,
                renames variables for clarity, and extracts a helper function. These changes
                are behavior-preserving refactors. Observe how the graph might change — what do you think?
              </p>
            </div>

            <div>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
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
                      background: twistPrediction === p.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
        </div>
      );
    }

    // TWIST PLAY PHASE
    if (phase === 'twist_play') {
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>🧪 Explore Refactor Risk</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Toggle refactoring and observe how risk jumps — the multiplier effect is dramatic
              </p>
            </div>

            {renderVisualization(true, true)}
            {renderControls(true)}

            <div style={{
              background: 'rgba(239,68,68,0.2)',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.error}`,
            }}>
              <h4 style={{ color: colors.error, marginBottom: '8px', fontWeight: 700 }}>⚠ The Refactor Trap:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Refactors look safe ("just moving code"), but they:
                <br />• Add lines that were not requested (increases surface area × 2.5)
                <br />• Are not covered by the tests you wrote for the feature
                <br />• Make git bisect unable to isolate the feature change
                <br />• Obscure the actual feature in code review — reviewers must evaluate both
              </p>
            </div>
          </div>
          {renderBottomBar(true, true, 'See the Explanation →')}
        </div>
      );
    }

    // TWIST REVIEW PHASE
    if (phase === 'twist_review') {
      const wasCorrect = twistPrediction === 'refactor_risky';

      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px',
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                {wasCorrect ? '✅ Correct! Hidden Risk Confirmed' : '📚 The Answer: Hidden Risk'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Unrequested refactors add hidden risk. They seem safe but create untested code paths
                and make the patch harder to review, debug, and rollback. The formula multiplier is 2.5×.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>📋 The "No Refactors Unless Requested" Rule</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>✍ Better Prompt:</strong> "Make the
                  smallest possible diff. Do not refactor or clean up code unless I explicitly ask."
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>🔀 Separate Concerns:</strong> If you
                  want a refactor, make it a separate PR. Then you can review it independently, and if it breaks
                  something, you can revert just that change.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>🔍 Trust But Verify:</strong> Always
                  ask the LLM to "show the patch" so you can verify no unrequested changes snuck in.
                </p>
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, 'Apply This Knowledge →')}
        </div>
      );
    }

    // TRANSFER PHASE
    if (phase === 'transfer') {
      return (
        <TransferPhaseView
          conceptName="Patch Discipline"
          applications={transferApplications}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
        />
      );
    }

    if (phase === 'transfer') {
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>
                🌍 Real-World Applications
              </h2>
              <p style={{ color: colors.textSecondary }}>
                Small-patch discipline applies across software engineering — from database migrations to space systems
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                Reveal all 4 applications to unlock the knowledge test
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
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success }}>✅ Complete</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
                <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>💬 {app.question}</p>
                </div>
                {!transferCompleted.has(index) ? (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.accent}`,
                      background: 'transparent',
                      color: colors.accent,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Got It — Reveal Answer
                  </button>
                ) : (
                  <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {renderBottomBar(true, true, 'Next →')}
        </div>
      );
    }

    // TEST PHASE
    if (phase === 'test') {
      if (testSubmitted) {
        return (
          <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
            <div style={{ padding: '16px' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                  {testScore >= 8 ? '🏆 Excellent!' : '📚 Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                  {testScore >= 8 ? 'You understand patch discipline!' : 'Review the material and try again.'}
                </p>
              </div>
              <div style={{ padding: '16px' }}>
                <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
                {testQuestions.map((q, idx) => {
                  const userAnswer = testAnswers[idx];
                  const correctOption = q.options.find(o => o.correct);
                  const isCorrect = userAnswer !== null && q.options[userAnswer]?.correct;
                  return (
                    <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                        <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                      </div>
                      {!isCorrect && (
                        <div style={{ marginLeft: '26px', marginBottom: '6px' }}>
                          <span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span>
                          <span style={{ color: '#64748b', fontSize: '13px' }}>{userAnswer !== null ? q.options[userAnswer]?.text : 'No answer'}</span>
                        </div>
                      )}
                      <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                        <span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.text}</span>
                      </div>
                      {q.explanation && (
                        <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                          <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span>
                          <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry', testScore < 8 ? () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); goToPhase('hook'); } : undefined)}
          </div>
        );
      }

      const currentQ = testQuestions[currentTestQuestion];
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>📝 Knowledge Test</h2>
              <span style={{
                color: colors.textPrimary,
                fontWeight: 700,
                fontSize: '16px',
                background: colors.bgCard,
                padding: '4px 12px',
                borderRadius: '8px',
              }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 500 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{
                  padding: '16px', borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245,158,11,0.2)' : 'transparent',
                  color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                  transition: 'all 0.15s ease',
                }}>
                  {opt.text}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>← Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s ease' }}>Check Answer →</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'all 0.15s ease' }}>Check Answers ✓</button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // MASTERY PHASE
    if (phase === 'mastery') {
      return (
        <div style={{ overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', minHeight: '100dvh' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
              <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 800 }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary }}>You have mastered patch discipline for LLM-assisted coding</p>
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>🔑 Key Prompt Patterns:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>"Make the smallest possible diff" — forces focus, reduces risk</li>
                <li>"Show the patch before and after" — enables verification</li>
                <li>"Explain only the change you made" — avoids over-explanation</li>
                <li>"Do not refactor unless I explicitly ask" — prevents 2.5× risk multiplier</li>
                <li>"One logical change per commit" — enables atomic rollbacks</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.2)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>💡 Remember:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Small patches are not about writing less code — they are about managing complexity.
                Every line of change is a potential bug. Every interaction between changed lines
                multiplies that risk. Discipline in patch size is the foundation of reliable
                AI-assisted development.
              </p>
            </div>
            {renderVisualization(true)}
          </div>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
  <button onClick={() => { onGameEvent?.({ type: 'mastery_achieved', details: { score: testQuestions.filter((q, i) => testAnswers[i] !== null && q.options[testAnswers[i]].correct).length, total: testQuestions.length } }); window.location.href = '/games'; }}
    style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
    Complete Game \u2192
  </button>
</div>
        </div>
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
      color: colors.textPrimary,
      minHeight: '100dvh',
      overflow: 'hidden',
    }}>
      {renderProgressBar()}
      {renderContent()}
    </div>
  );
};

export default PatchDisciplineRenderer;
