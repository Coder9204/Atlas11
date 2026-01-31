import React, { useState, useCallback, useEffect, useRef } from 'react';

// Game event interface for AI coach integration
export interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'answer' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface AskForAssumptionsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase type for internal state management
type AFAPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: AFAPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseOrder: AFAPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<AFAPhase, string> = {
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
  confidence: {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#ef4444',
  },
};

interface Assumption {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  impact: number; // How much this affects output
  hidden: boolean; // Was this originally hidden?
}

const AskForAssumptionsRenderer: React.FC<AskForAssumptionsRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): AFAPhase => {
    if (gamePhase && validPhases.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<AFAPhase>(getInitialPhase);
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
  const goToPhase = useCallback((targetPhase: AFAPhase) => {
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

  // Assumption state
  const [assumptions, setAssumptions] = useState<Assumption[]>([
    { id: 'load', label: 'Expected Load', value: 100, min: 50, max: 500, unit: 'users/sec', confidence: 'medium', impact: 0.4, hidden: false },
    { id: 'latency', label: 'Max Latency', value: 200, min: 50, max: 1000, unit: 'ms', confidence: 'high', impact: 0.3, hidden: false },
    { id: 'memory', label: 'Available Memory', value: 8, min: 2, max: 64, unit: 'GB', confidence: 'low', impact: 0.5, hidden: true },
    { id: 'uptime', label: 'Required Uptime', value: 99.9, min: 95, max: 99.99, unit: '%', confidence: 'medium', impact: 0.6, hidden: true },
    { id: 'budget', label: 'Monthly Budget', value: 500, min: 100, max: 5000, unit: '$', confidence: 'low', impact: 0.7, hidden: true },
  ]);

  const [showHiddenAssumptions, setShowHiddenAssumptions] = useState(false);
  const [useRanges, setUseRanges] = useState(false);
  const [rangeWidth, setRangeWidth] = useState(20); // percentage of value

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate system design output based on assumptions
  const calculateOutput = useCallback(() => {
    const visibleAssumptions = assumptions.filter(a => !a.hidden || showHiddenAssumptions);
    const hiddenCount = assumptions.filter(a => a.hidden && !showHiddenAssumptions).length;

    // Calculate risk based on hidden assumptions and confidence levels
    const lowConfidenceCount = visibleAssumptions.filter(a => a.confidence === 'low').length;
    const mediumConfidenceCount = visibleAssumptions.filter(a => a.confidence === 'medium').length;

    const riskFromHidden = hiddenCount * 15;
    const riskFromLowConfidence = lowConfidenceCount * 10;
    const riskFromMediumConfidence = mediumConfidenceCount * 5;

    // Range-based estimation reduces risk
    const rangeReduction = useRanges ? 20 : 0;

    const totalRisk = Math.min(100, Math.max(0,
      riskFromHidden + riskFromLowConfidence + riskFromMediumConfidence - rangeReduction
    ));

    // Calculate estimated cost/resources
    const load = assumptions.find(a => a.id === 'load')?.value || 100;
    const memory = assumptions.find(a => a.id === 'memory')?.value || 8;
    const uptime = assumptions.find(a => a.id === 'uptime')?.value || 99.9;

    const estimatedServers = Math.ceil(load / 100) * (uptime > 99.9 ? 2 : 1);
    const estimatedCost = estimatedServers * memory * 50;

    // Calculate range if using ranges
    const costMin = useRanges ? estimatedCost * (1 - rangeWidth / 100) : estimatedCost;
    const costMax = useRanges ? estimatedCost * (1 + rangeWidth / 100) : estimatedCost;

    return {
      risk: totalRisk,
      estimatedServers,
      estimatedCost,
      costRange: { min: Math.round(costMin), max: Math.round(costMax) },
      hiddenCount,
      reliability: 100 - totalRisk,
      visibleCount: visibleAssumptions.length,
    };
  }, [assumptions, showHiddenAssumptions, useRanges, rangeWidth]);

  const updateAssumption = (id: string, field: string, value: number | string) => {
    setAssumptions(prev => prev.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const predictions = [
    { id: 'not_needed', label: 'Explicit assumptions are not needed - just describe what you want' },
    { id: 'helps_some', label: 'Listing assumptions helps somewhat but is optional' },
    { id: 'critical', label: 'Hidden assumptions cause most engineering failures - making them explicit is critical' },
    { id: 'too_much', label: 'Too many assumptions slow down development' },
  ];

  const twistPredictions = [
    { id: 'single_values', label: 'Single values are fine - just pick the most likely number' },
    { id: 'ranges_better', label: 'Numeric ranges are better - they capture uncertainty and force conservative design' },
    { id: 'ranges_confusing', label: 'Ranges make things too complicated' },
    { id: 'estimates_always_wrong', label: 'Estimates are always wrong anyway, so precision does not matter' },
  ];

  const transferApplications = [
    {
      title: 'Cloud Infrastructure Sizing',
      description: 'Provisioning servers requires assumptions about load, growth, and peak usage.',
      question: 'Why do infrastructure estimates often miss badly?',
      answer: 'Hidden assumptions like "load is uniform" (it is usually bursty), "growth is linear" (it is often exponential during success), and "current metrics are representative" (they may miss holiday peaks). Explicit assumption lists with confidence levels catch these.',
    },
    {
      title: 'Project Time Estimation',
      description: 'Software project timelines depend on many unstated assumptions.',
      question: 'Why do software projects consistently run over schedule?',
      answer: 'Hidden assumptions: "requirements are complete" (they never are), "no key person will leave" (they might), "dependencies will be ready" (often delayed), "scope will not change" (it always does). Listing these with LOW confidence flags the real risks.',
    },
    {
      title: 'API Rate Limit Design',
      description: 'Setting rate limits requires assumptions about usage patterns.',
      question: 'How can explicit assumptions improve rate limit design?',
      answer: 'List assumptions: "average request size: 1KB (MEDIUM)", "burst factor: 5x (LOW)", "client retry behavior: exponential backoff (LOW)". Low-confidence items need monitoring and adjustment. Without this list, limits are guesses that fail under real load.',
    },
    {
      title: 'Machine Learning Model Deployment',
      description: 'ML model performance in production depends on data distribution assumptions.',
      question: 'Why do ML models often fail in production despite good test metrics?',
      answer: 'Hidden assumptions: "production data matches training distribution" (it drifts), "input quality is consistent" (garbage in, garbage out), "latency requirements are flexible" (often not). Explicit assumption lists force monitoring plans for each assumption.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why do engineering failures often come from hidden assumptions?',
      options: [
        { text: 'Engineers are careless', correct: false },
        { text: 'Unstated assumptions are not validated or monitored, so they fail silently', correct: true },
        { text: 'Assumptions are always correct', correct: false },
        { text: 'Hidden assumptions are rare', correct: false },
      ],
    },
    {
      question: 'What does "List assumptions; mark HIGH/LOW confidence" accomplish?',
      options: [
        { text: 'Makes documentation longer', correct: false },
        { text: 'Forces explicit acknowledgment of uncertainty and identifies risks', correct: true },
        { text: 'Slows down development', correct: false },
        { text: 'Nothing useful', correct: false },
      ],
    },
    {
      question: 'A LOW confidence assumption should:',
      options: [
        { text: 'Be ignored until it causes problems', correct: false },
        { text: 'Be monitored, have fallbacks, and be validated early', correct: true },
        { text: 'Be changed to HIGH confidence', correct: false },
        { text: 'Be removed from the list', correct: false },
      ],
    },
    {
      question: 'Why ask for missing data explicitly?',
      options: [
        { text: 'To make the LLM work harder', correct: false },
        { text: 'To identify what you do not know and get it before building', correct: true },
        { text: 'It is just a formality', correct: false },
        { text: 'LLMs cannot identify missing data', correct: false },
      ],
    },
    {
      question: 'Numeric ranges instead of single values help because:',
      options: [
        { text: 'They look more professional', correct: false },
        { text: 'They capture uncertainty and force designs that work across the range', correct: true },
        { text: 'Single values are always wrong', correct: false },
        { text: 'Ranges are easier to calculate', correct: false },
      ],
    },
    {
      question: 'An assumption panel with sliders that update outputs live helps you:',
      options: [
        { text: 'Play with numbers for fun', correct: false },
        { text: 'See how sensitive your design is to each assumption', correct: true },
        { text: 'Avoid doing real calculations', correct: false },
        { text: 'Make prettier presentations', correct: false },
      ],
    },
    {
      question: 'The prompt "List assumptions; mark HIGH/LOW confidence; ask for missing data" improves reliability because:',
      options: [
        { text: 'It adds more words to the prompt', correct: false },
        { text: 'It forces explicit uncertainty tracking and identifies knowledge gaps', correct: true },
        { text: 'LLMs prefer longer prompts', correct: false },
        { text: 'It is a trendy prompt pattern', correct: false },
      ],
    },
    {
      question: 'What happens when assumptions stay implicit?',
      options: [
        { text: 'Development goes faster', correct: false },
        { text: 'You cannot validate them, monitor them, or know when they break', correct: true },
        { text: 'They automatically become true', correct: false },
        { text: 'Nothing bad happens', correct: false },
      ],
    },
    {
      question: 'For engineering tasks, HIGH confidence means:',
      options: [
        { text: 'You are 100% certain', correct: false },
        { text: 'The assumption is well-validated with data or experience', correct: true },
        { text: 'It is a guess you feel good about', correct: false },
        { text: 'It does not need to be checked', correct: false },
      ],
    },
    {
      question: 'If an LLM design has no listed assumptions, you should:',
      options: [
        { text: 'Trust it completely', correct: false },
        { text: 'Ask "What assumptions are you making?" before proceeding', correct: true },
        { text: 'Assume there are none', correct: false },
        { text: 'Add random assumptions', correct: false },
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

  const renderVisualization = (interactive: boolean, showRanges: boolean = false) => {
    const width = 700;
    const height = 420;
    const output = calculateOutput();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '720px' }}
        >
          {/* ===================== PREMIUM DEFS SECTION ===================== */}
          <defs>
            {/* Premium background gradient with depth */}
            <linearGradient id="afaBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Assumption panel gradient */}
            <linearGradient id="afaPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Output panel premium gradient */}
            <linearGradient id="afaOutputPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="20%" stopColor="#0f172a" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* HIGH confidence - emerald gradient with depth */}
            <linearGradient id="afaHighConfidence" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* MEDIUM confidence - amber gradient */}
            <linearGradient id="afaMediumConfidence" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* LOW confidence - red gradient */}
            <linearGradient id="afaLowConfidence" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* 3D sphere for assumption nodes - HIGH */}
            <radialGradient id="afaSphereHigh" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="30%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </radialGradient>

            {/* 3D sphere for assumption nodes - MEDIUM */}
            <radialGradient id="afaSphereMedium" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* 3D sphere for assumption nodes - LOW */}
            <radialGradient id="afaSphereLow" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>

            {/* Server stack metallic gradient */}
            <linearGradient id="afaServerMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Cost badge gradient */}
            <linearGradient id="afaCostBadge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Risk meter gradient - dynamic based on risk */}
            <linearGradient id="afaRiskMeter" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Progress bar track */}
            <linearGradient id="afaProgressTrack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Connection line gradient */}
            <linearGradient id="afaConnectionLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
            </linearGradient>

            {/* Hidden assumption warning gradient */}
            <linearGradient id="afaHiddenWarning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#450a0a" />
              <stop offset="50%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>

            {/* Glow filter for HIGH confidence */}
            <filter id="afaGlowHigh" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for MEDIUM confidence */}
            <filter id="afaGlowMedium" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for LOW confidence */}
            <filter id="afaGlowLow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="afaShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Inner glow for panels */}
            <filter id="afaInnerGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Pulse animation for warning */}
            <filter id="afaPulseWarning" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for background */}
            <pattern id="afaGridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ===================== BACKGROUND ===================== */}
          <rect width={width} height={height} fill="url(#afaBgGradient)" />
          <rect width={width} height={height} fill="url(#afaGridPattern)" />

          {/* Title with premium styling */}
          <text x={width/2} y={28} fill="#f8fafc" fontSize={16} fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
            Assumption Panel - Live System Design
          </text>
          <text x={width/2} y={46} fill="#94a3b8" fontSize={11} textAnchor="middle">
            Explicit assumptions reduce failure risk
          </text>

          {/* ===================== ASSUMPTIONS PANEL (LEFT) ===================== */}
          <g transform="translate(20, 60)">
            {/* Panel background with depth */}
            <rect x={0} y={0} width={260} height={320} fill="url(#afaPanelGradient)" rx={12} filter="url(#afaShadow)" />
            <rect x={2} y={2} width={256} height={316} fill="none" stroke="#334155" strokeWidth={1} rx={11} />

            {/* Panel header */}
            <rect x={0} y={0} width={260} height={35} fill="rgba(30,41,59,0.8)" rx={12} />
            <rect x={0} y={25} width={260} height={10} fill="rgba(30,41,59,0.8)" />
            <text x={20} y={23} fill="#e2e8f0" fontSize={12} fontWeight="bold" letterSpacing="1">ASSUMPTIONS</text>
            <circle cx={240} cy={17} r={6} fill={showHiddenAssumptions ? 'url(#afaSphereHigh)' : 'url(#afaSphereLow)'}>
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Assumption items */}
            {assumptions.filter(a => !a.hidden || showHiddenAssumptions).map((assumption, i) => {
              const sphereGradient = assumption.confidence === 'high' ? 'url(#afaSphereHigh)' :
                assumption.confidence === 'medium' ? 'url(#afaSphereMedium)' : 'url(#afaSphereLow)';
              const glowFilter = assumption.confidence === 'high' ? 'url(#afaGlowHigh)' :
                assumption.confidence === 'medium' ? 'url(#afaGlowMedium)' : 'url(#afaGlowLow)';
              const confidenceGradient = assumption.confidence === 'high' ? 'url(#afaHighConfidence)' :
                assumption.confidence === 'medium' ? 'url(#afaMediumConfidence)' : 'url(#afaLowConfidence)';

              return (
                <g key={assumption.id} transform={`translate(10, ${45 + i * 52})`}>
                  {/* Card background */}
                  <rect
                    x={0}
                    y={0}
                    width={240}
                    height={46}
                    fill={assumption.hidden ? 'rgba(127, 29, 29, 0.15)' : 'rgba(15, 23, 42, 0.6)'}
                    stroke={assumption.hidden ? '#7f1d1d' : '#334155'}
                    strokeWidth={1}
                    rx={8}
                  />

                  {/* Confidence indicator sphere */}
                  <circle cx={20} cy={23} r={10} fill={sphereGradient} filter={glowFilter}>
                    <animate attributeName="r" values="9;11;9" dur="3s" repeatCount="indefinite" />
                  </circle>

                  {/* Assumption label */}
                  <text x={38} y={16} fill="#f8fafc" fontSize={10} fontWeight="600">
                    {assumption.label}
                  </text>

                  {/* Value display */}
                  <text x={38} y={32} fill={assumption.confidence === 'high' ? '#34d399' : assumption.confidence === 'medium' ? '#fbbf24' : '#f87171'} fontSize={12} fontWeight="bold">
                    {showRanges && useRanges
                      ? `${Math.round(assumption.value * (1 - rangeWidth / 100))}-${Math.round(assumption.value * (1 + rangeWidth / 100))} ${assumption.unit}`
                      : `${assumption.value} ${assumption.unit}`
                    }
                  </text>

                  {/* Confidence badge */}
                  <rect x={175} y={8} width={55} height={18} fill={confidenceGradient} rx={9} />
                  <text x={202} y={20} fill="#ffffff" fontSize={8} fontWeight="bold" textAnchor="middle">
                    {assumption.confidence.toUpperCase()}
                  </text>

                  {/* Hidden indicator */}
                  {assumption.hidden && (
                    <g>
                      <rect x={175} y={28} width={55} height={14} fill="url(#afaHiddenWarning)" rx={7} />
                      <text x={202} y={38} fill="#fca5a5" fontSize={7} textAnchor="middle">REVEALED</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Hidden assumptions warning */}
            {!showHiddenAssumptions && output.hiddenCount > 0 && (
              <g transform={`translate(10, ${45 + (assumptions.length - output.hiddenCount) * 52})`}>
                <rect x={0} y={0} width={240} height={46} fill="url(#afaHiddenWarning)" rx={8} strokeDasharray="6,4" stroke="#ef4444" filter="url(#afaPulseWarning)">
                  <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                </rect>
                <text x={120} y={20} fill="#fca5a5" fontSize={11} textAnchor="middle" fontWeight="bold">
                  + {output.hiddenCount} HIDDEN ASSUMPTIONS
                </text>
                <text x={120} y={36} fill="#f87171" fontSize={9} textAnchor="middle">
                  Click "Show Hidden" to reveal
                </text>
              </g>
            )}
          </g>

          {/* ===================== CONNECTION FLOW ===================== */}
          <g transform="translate(285, 180)">
            {/* Animated connection line */}
            <path d="M 0 40 C 40 40, 40 40, 80 40" stroke="url(#afaConnectionLine)" strokeWidth={3} fill="none">
              <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="2s" repeatCount="indefinite" />
            </path>
            <polygon points="75,35 85,40 75,45" fill="#a855f7">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </polygon>
            <text x={40} y={60} fill="#94a3b8" fontSize={8} textAnchor="middle">FEEDS INTO</text>
          </g>

          {/* ===================== OUTPUT PANEL (RIGHT) ===================== */}
          <g transform="translate(380, 60)">
            {/* Panel background */}
            <rect x={0} y={0} width={300} height={320} fill="url(#afaOutputPanel)" rx={12} filter="url(#afaShadow)" />
            <rect x={2} y={2} width={296} height={316} fill="none" stroke="#334155" strokeWidth={1} rx={11} />

            {/* Panel header */}
            <rect x={0} y={0} width={300} height={35} fill="rgba(30,41,59,0.8)" rx={12} />
            <rect x={0} y={25} width={300} height={10} fill="rgba(30,41,59,0.8)" />
            <text x={20} y={23} fill="#e2e8f0" fontSize={12} fontWeight="bold" letterSpacing="1">DESIGN OUTPUT</text>

            {/* Risk Gauge */}
            <g transform="translate(20, 50)">
              <text x={0} y={0} fill="#94a3b8" fontSize={10} fontWeight="600">Failure Risk Assessment</text>

              {/* Gauge background */}
              <rect x={0} y={10} width={260} height={24} fill="url(#afaProgressTrack)" rx={12} />
              <rect x={2} y={12} width={256} height={20} fill="rgba(0,0,0,0.3)" rx={10} />

              {/* Risk level indicator */}
              <rect
                x={2}
                y={12}
                width={Math.min(256, output.risk * 2.56)}
                height={20}
                fill={output.risk > 60 ? 'url(#afaLowConfidence)' : output.risk > 30 ? 'url(#afaMediumConfidence)' : 'url(#afaHighConfidence)'}
                rx={10}
              >
                <animate attributeName="width" from="0" to={Math.min(256, output.risk * 2.56)} dur="1s" fill="freeze" />
              </rect>

              <text x={130} y={27} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight="bold">
                {output.risk.toFixed(0)}% RISK
              </text>
            </g>

            {/* Server Stack Visualization */}
            <g transform="translate(20, 100)">
              <text x={0} y={0} fill="#94a3b8" fontSize={10} fontWeight="600">Infrastructure Required</text>

              {/* Server rack */}
              {Array.from({ length: Math.min(output.estimatedServers, 4) }).map((_, i) => (
                <g key={i} transform={`translate(${i * 60}, 15)`}>
                  <rect x={0} y={0} width={50} height={35} fill="url(#afaServerMetal)" rx={4} filter="url(#afaShadow)" />
                  <rect x={5} y={5} width={40} height={4} fill="#10b981" rx={2}>
                    <animate attributeName="opacity" values="0.5;1;0.5" dur={`${0.8 + i * 0.2}s`} repeatCount="indefinite" />
                  </rect>
                  <rect x={5} y={12} width={40} height={4} fill="#06b6d4" rx={2}>
                    <animate attributeName="opacity" values="0.6;1;0.6" dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
                  </rect>
                  <rect x={5} y={19} width={40} height={4} fill="#8b5cf6" rx={2}>
                    <animate attributeName="opacity" values="0.7;1;0.7" dur={`${1.2 + i * 0.2}s`} repeatCount="indefinite" />
                  </rect>
                  <circle cx={10} cy={30} r={2} fill="#22c55e">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              ))}

              <text x={0} y={65} fill="#f8fafc" fontSize={14} fontWeight="bold">
                {output.estimatedServers} Server{output.estimatedServers > 1 ? 's' : ''} Required
              </text>
            </g>

            {/* Cost Estimate */}
            <g transform="translate(20, 185)">
              <text x={0} y={0} fill="#94a3b8" fontSize={10} fontWeight="600">Monthly Cost Estimate</text>

              {/* Cost badge */}
              <rect x={0} y={10} width={180} height={36} fill="url(#afaCostBadge)" rx={8} filter="url(#afaShadow)" />
              <text x={90} y={34} fill="#ffffff" fontSize={16} fontWeight="bold" textAnchor="middle">
                {showRanges && useRanges
                  ? `$${output.costRange.min} - $${output.costRange.max}`
                  : `$${output.estimatedCost}`
                }
              </text>
              <text x={90} y={50} fill="#fef3c7" fontSize={9} textAnchor="middle">/month</text>
            </g>

            {/* Reliability Score */}
            <g transform="translate(20, 245)">
              <text x={0} y={0} fill="#94a3b8" fontSize={10} fontWeight="600">Design Reliability Score</text>

              <rect x={0} y={10} width={260} height={24} fill="url(#afaProgressTrack)" rx={12} />
              <rect x={2} y={12} width={256} height={20} fill="rgba(0,0,0,0.3)" rx={10} />

              <rect
                x={2}
                y={12}
                width={Math.min(256, output.reliability * 2.56)}
                height={20}
                fill={output.reliability > 70 ? 'url(#afaHighConfidence)' : output.reliability > 40 ? 'url(#afaMediumConfidence)' : 'url(#afaLowConfidence)'}
                rx={10}
              >
                <animate attributeName="width" from="0" to={Math.min(256, output.reliability * 2.56)} dur="1s" fill="freeze" />
              </rect>

              <text x={130} y={27} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight="bold">
                {output.reliability.toFixed(0)}% RELIABLE
              </text>
            </g>

            {/* Status indicator */}
            <g transform="translate(20, 285)">
              <rect
                x={0}
                y={0}
                width={260}
                height={28}
                fill={output.risk > 50 ? 'url(#afaHiddenWarning)' : output.risk > 25 ? 'rgba(180, 83, 9, 0.3)' : 'rgba(4, 120, 87, 0.3)'}
                rx={8}
                stroke={output.risk > 50 ? '#ef4444' : output.risk > 25 ? '#f59e0b' : '#10b981'}
                strokeWidth={1}
              />
              <text x={130} y={18} fill={output.risk > 50 ? '#fca5a5' : output.risk > 25 ? '#fcd34d' : '#6ee7b7'} fontSize={10} textAnchor="middle" fontWeight="bold">
                {output.risk > 50
                  ? 'HIGH RISK - Review hidden assumptions!'
                  : output.risk > 25
                    ? 'MODERATE - Validate LOW confidence items'
                    : 'SOLID - Assumptions well documented'}
              </text>
            </g>
          </g>

          {/* ===================== LEGEND ===================== */}
          <g transform="translate(20, 392)">
            <text x={0} y={0} fill="#94a3b8" fontSize={10} fontWeight="600">Confidence Levels:</text>

            <circle cx={120} cy={-3} r={7} fill="url(#afaSphereHigh)" />
            <text x={132} y={1} fill="#94a3b8" fontSize={9}>HIGH</text>

            <circle cx={180} cy={-3} r={7} fill="url(#afaSphereMedium)" />
            <text x={192} y={1} fill="#94a3b8" fontSize={9}>MEDIUM</text>

            <circle cx={250} cy={-3} r={7} fill="url(#afaSphereLow)" />
            <text x={262} y={1} fill="#94a3b8" fontSize={9}>LOW</text>

            <text x={380} y={0} fill="#64748b" fontSize={9}>
              Visible: {output.visibleCount} / {assumptions.length} assumptions
            </text>
            {!showHiddenAssumptions && output.hiddenCount > 0 && (
              <text x={550} y={0} fill="#ef4444" fontSize={9} fontWeight="bold">
                {output.hiddenCount} hidden!
              </text>
            )}
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setShowHiddenAssumptions(!showHiddenAssumptions)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: showHiddenAssumptions
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: showHiddenAssumptions
                  ? '0 4px 20px rgba(16, 185, 129, 0.4)'
                  : '0 4px 20px rgba(239, 68, 68, 0.4)',
              }}
            >
              {showHiddenAssumptions ? 'All Assumptions Visible' : 'Show Hidden Assumptions'}
            </button>
            <button
              onClick={() => {
                setAssumptions(prev => prev.map(a => ({ ...a, confidence: 'high' as const })));
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              Validate All to HIGH
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showRanges: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {assumptions.filter(a => !a.hidden || showHiddenAssumptions).map(assumption => (
        <div key={assumption.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
              {assumption.label}: {assumption.value} {assumption.unit}
            </label>
            <select
              value={assumption.confidence}
              onChange={(e) => updateAssumption(assumption.id, 'confidence', e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: `1px solid ${colors.confidence[assumption.confidence]}`,
                background: 'transparent',
                color: colors.confidence[assumption.confidence],
                fontSize: '11px',
              }}
            >
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>
          </div>
          <input
            type="range"
            min={assumption.min}
            max={assumption.max}
            step={(assumption.max - assumption.min) / 20}
            value={assumption.value}
            onChange={(e) => updateAssumption(assumption.id, 'value', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      ))}

      {showRanges && (
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
              checked={useRanges}
              onChange={(e) => setUseRanges(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Use numeric ranges instead of single values (+/-{rangeWidth}%)
          </label>
          {useRanges && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ color: colors.textMuted, fontSize: '12px' }}>
                Range Width: +/-{rangeWidth}%
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={rangeWidth}
                onChange={(e) => setRangeWidth(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Prompt: "List assumptions; mark HIGH/LOW confidence; ask for missing data"
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Risk = (hiddenAssumptions * 15) + (lowConfidence * 10) - (useRanges ? 20 : 0)
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
                Ask for Assumptions
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
                If assumptions stay hidden, do you notice wrong ones?
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
                  Every engineering design rests on assumptions. Some are obvious, some are
                  not. When an LLM designs a system, it makes assumptions too - but does it
                  tell you about them? Hidden assumptions are the source of most engineering failures.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                  Notice the "hidden assumptions" warning. Click "Show Hidden" to see what is lurking.
                </p>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.error}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  Watch how the risk score changes when you reveal hidden assumptions!
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
                You ask an LLM to design a system. It gives you a solution with server counts
                and cost estimates. But it does not tell you what assumptions it made about
                load, memory, uptime requirements, or budget constraints. Is this a problem?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                How important is making assumptions explicit?
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
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Assumption Impact</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust assumptions and watch outputs update live
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
                <li>Hidden assumptions add significant risk to the design</li>
                <li>LOW confidence assumptions should be validated or monitored</li>
                <li>Changing slider values shows output sensitivity</li>
                <li>Making all assumptions explicit improves reliability</li>
              </ul>
            </div>
          </div>
        );

      case 'review':
        const wasCorrect = prediction === 'critical';
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
                {wasCorrect ? 'Correct!' : 'The Answer: Explicit Assumptions Are Critical'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Engineering failures often trace back to hidden assumptions. You cannot validate
                what you do not know. You cannot monitor what you have not identified. Making
                assumptions explicit is the first step to reliable engineering.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Hidden Assumptions Fail</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Silent Failures:</strong> If you
                  assume "load is under 100 users/sec" but never state it, you will not monitor it,
                  and will not know when it exceeds that - until the system fails.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Confidence Levels:</strong> Marking
                  assumptions HIGH/MEDIUM/LOW forces you to acknowledge uncertainty. LOW confidence
                  items need validation, monitoring, or fallback plans.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Missing Data:</strong> Asking
                  "what data would help validate this assumption?" identifies knowledge gaps before
                  they become production problems.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>The Prompt:</strong> "List
                  assumptions; mark HIGH/LOW confidence; ask for missing data."
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
                What about using numeric ranges instead of single values?
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
                Instead of "Expected Load: 100 users/sec", what about "Expected Load: 80-150
                users/sec"? Does expressing uncertainty as ranges improve engineering decisions?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                Are numeric ranges better than single values?
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
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Range-Based Estimation</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Enable ranges and see how uncertainty is captured
              </p>
            </div>

            {renderVisualization(true, true)}
            {renderControls(true)}

            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.success}`,
            }}>
              <h4 style={{ color: colors.success, marginBottom: '8px' }}>Range Benefits:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Ranges force you to design for the worst case:
                <br />- Cost estimates become "$400-$600/mo" not "$500/mo"
                <br />- You plan for the upper bound, not the guess
                <br />- Stakeholders understand there is uncertainty
                <br />- You are more likely to be right (it will be in the range)
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        const twistWasCorrect = twistPrediction === 'ranges_better';
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
                {twistWasCorrect ? 'Correct!' : 'The Answer: Ranges Are Better'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Numeric ranges capture uncertainty that single values hide. They force
                conservative design, honest communication with stakeholders, and designs
                that work across the range, not just at the guess.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Complete Assumption Template</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Format:</strong> "Assumption: [name]
                  <br />- Value: [range with units]
                  <br />- Confidence: [HIGH/MEDIUM/LOW]
                  <br />- Validation: [how to check]
                  <br />- Impact if wrong: [consequence]"
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Example:</strong> "Assumption: Expected Load
                  <br />- Value: 80-150 users/sec
                  <br />- Confidence: MEDIUM
                  <br />- Validation: Monitor for 2 weeks before scaling decision
                  <br />- Impact if wrong: Service degradation or over-provisioning costs"
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
                Explicit assumptions improve reliability across domains
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
                  {testScore >= 8 ? 'You understand assumption management!' : 'Review the material and try again.'}
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
              <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered assumption management</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Prompt Patterns:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>"List all assumptions you are making"</li>
                <li>"Mark each as HIGH/MEDIUM/LOW confidence"</li>
                <li>"Use numeric ranges instead of single values"</li>
                <li>"Ask for missing data that would help"</li>
                <li>"What happens if [assumption] is wrong?"</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Remember:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Engineering failures come from silent assumptions. If it stays hidden, you
                cannot validate it, monitor it, or know when it breaks. Making assumptions
                explicit - with confidence levels and numeric ranges - is the foundation of
                reliable engineering. Always ask: "What assumptions are you making?"
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

export default AskForAssumptionsRenderer;
