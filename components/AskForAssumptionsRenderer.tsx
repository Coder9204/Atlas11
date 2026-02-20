import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

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

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y' as const,
  WebkitAppearance: 'none' as const,
  accentColor: '#3b82f6',
};

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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set([0]));
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
      description: 'Provisioning 8 servers at $500/month requires assumptions about 100 users/sec load, 2x growth rate, and peak usage patterns.',
      question: 'Why do infrastructure estimates often miss badly?',
      answer: 'Hidden assumptions like "load is uniform" (it is usually bursty at 5x peaks), "growth is linear" (it is often 300% exponential during success), and "current metrics at 50 ms latency are representative" (they may miss holiday peaks). Explicit assumption lists with confidence levels catch these.',
    },
    {
      title: 'Project Time Estimation',
      description: 'A 6-month software project with a $200,000 budget depends on many unstated assumptions about team velocity and scope.',
      question: 'Why do software projects consistently run over schedule?',
      answer: 'Hidden assumptions: "requirements are complete" (they never are), "no key person will leave" (they might), "dependencies will be ready" (often delayed 4-8 weeks), "scope will not change" (it always grows 30%). Listing these with LOW confidence flags the real risks.',
    },
    {
      title: 'API Rate Limit Design',
      description: 'Setting rate limits to 1000 requests/sec requires assumptions about 1KB average payload and 5x burst patterns.',
      question: 'How can explicit assumptions improve rate limit design?',
      answer: 'List assumptions: "average request size: 1KB (MEDIUM)", "burst factor: 5x (LOW)", "client retry: exponential backoff at 100 ms (LOW)". Low-confidence items need monitoring. Without this list, limits are guesses that fail under 10000 requests/sec real load.',
    },
    {
      title: 'Machine Learning Model Deployment',
      description: 'An ML model achieving 95% accuracy on test data with 50 ms inference latency depends on data distribution assumptions.',
      question: 'Why do ML models often fail in production despite good test metrics?',
      answer: 'Hidden assumptions: "production data matches training distribution" (it drifts 15% monthly), "input quality is consistent" (garbage in at 200 ms latency), "8 GB memory is sufficient" (often not). Explicit assumption lists force monitoring plans for each assumption.',
    },
  ];

  const testQuestions = [
    {
      scenario: 'A startup asks an LLM to design their cloud architecture. The LLM returns a detailed plan with 3 servers and a $500/month estimate, but lists no assumptions about expected traffic patterns, growth rate, or peak loads.',
      question: 'Why do engineering failures often come from hidden assumptions?',
      options: [
        { text: 'Engineers are careless', correct: false },
        { text: 'Unstated assumptions are not validated or monitored, so they fail silently', correct: true },
        { text: 'Assumptions are always correct', correct: false },
        { text: 'Hidden assumptions are rare', correct: false },
      ],
    },
    {
      scenario: 'You are reviewing an LLM-generated system design. The output says "deploy 2 servers with 16GB RAM each." You prompt: "List assumptions; mark HIGH/LOW confidence."',
      question: 'What does "List assumptions; mark HIGH/LOW confidence" accomplish?',
      options: [
        { text: 'Makes documentation longer', correct: false },
        { text: 'Forces explicit acknowledgment of uncertainty and identifies risks', correct: true },
        { text: 'Slows down development', correct: false },
        { text: 'Nothing useful', correct: false },
      ],
    },
    {
      scenario: 'An assumption panel shows "Expected Load: 100 users/sec (LOW confidence)". The team has no production data yet, only estimates from a competitor analysis.',
      question: 'A LOW confidence assumption should:',
      options: [
        { text: 'Be ignored until it causes problems', correct: false },
        { text: 'Be monitored, have fallbacks, and be validated early', correct: true },
        { text: 'Be changed to HIGH confidence', correct: false },
        { text: 'Be removed from the list', correct: false },
      ],
    },
    {
      scenario: 'Your team is building a real-time notification system. The LLM provides a WebSocket architecture but does not mention what happens when network latency exceeds 500ms or when message queues overflow.',
      question: 'Why ask for missing data explicitly?',
      options: [
        { text: 'To make the LLM work harder', correct: false },
        { text: 'To identify what you do not know and get it before building', correct: true },
        { text: 'It is just a formality', correct: false },
        { text: 'LLMs cannot identify missing data', correct: false },
      ],
    },
    {
      scenario: 'Compare two cost estimates: Estimate A says "$500/month". Estimate B says "$400-$650/month (MEDIUM confidence, based on current traffic patterns which may change seasonally)".',
      question: 'Numeric ranges instead of single values help because:',
      options: [
        { text: 'They look more professional', correct: false },
        { text: 'They capture uncertainty and force designs that work across the range', correct: true },
        { text: 'Single values are always wrong', correct: false },
        { text: 'Ranges are easier to calculate', correct: false },
      ],
    },
    {
      scenario: 'You have built an interactive assumption panel with sliders for load (50-500 users/sec), memory (2-64GB), and uptime (95-99.99%). Moving the load slider from 100 to 300 triples the estimated cost.',
      question: 'An assumption panel with sliders that update outputs live helps you:',
      options: [
        { text: 'Play with numbers for fun', correct: false },
        { text: 'See how sensitive your design is to each assumption', correct: true },
        { text: 'Avoid doing real calculations', correct: false },
        { text: 'Make prettier presentations', correct: false },
      ],
    },
    {
      scenario: 'A production database goes down because the original design assumed "peak queries will never exceed 1000/sec." This assumption was never documented, never monitored, and there was no alert when traffic hit 1200/sec.',
      question: 'The prompt "List assumptions; mark HIGH/LOW confidence; ask for missing data" improves reliability because:',
      options: [
        { text: 'It adds more words to the prompt', correct: false },
        { text: 'It forces explicit uncertainty tracking and identifies knowledge gaps', correct: true },
        { text: 'LLMs prefer longer prompts', correct: false },
        { text: 'It is a trendy prompt pattern', correct: false },
      ],
    },
    {
      scenario: 'A microservices architecture was deployed based on the assumption that "inter-service latency is negligible." Six months later, cascading timeouts cause a 4-hour outage during peak traffic.',
      question: 'What happens when assumptions stay implicit?',
      options: [
        { text: 'Development goes faster', correct: false },
        { text: 'You cannot validate them, monitor them, or know when they break', correct: true },
        { text: 'They automatically become true', correct: false },
        { text: 'Nothing bad happens', correct: false },
      ],
    },
    {
      scenario: 'Your assumption panel shows "Required Uptime: 99.9% (HIGH confidence)". This is backed by the SLA contract signed with the client, which specifies exactly 99.9% uptime with financial penalties for breaches.',
      question: 'For engineering tasks, HIGH confidence means:',
      options: [
        { text: 'You are 100% certain', correct: false },
        { text: 'The assumption is well-validated with data or experience', correct: true },
        { text: 'It is a guess you feel good about', correct: false },
        { text: 'It does not need to be checked', correct: false },
      ],
    },
    {
      scenario: 'An LLM generates a complete API gateway design with rate limiting, caching, and load balancing. It looks thorough. But nowhere does it say what it assumes about request sizes, authentication overhead, or geographic distribution of users.',
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

    // Compute interactive point position based on load assumption value
    const loadVal = assumptions.find(a => a.id === 'load')?.value || 100;
    const loadMin = assumptions.find(a => a.id === 'load')?.min || 50;
    const loadMax = assumptions.find(a => a.id === 'load')?.max || 500;
    const loadFrac = (loadVal - loadMin) / (loadMax - loadMin);
    const pointX = 390 + loadFrac * 280;
    const pointY = 340 - loadFrac * 260;

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

            {/* Glow filter for interactive point */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.7" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

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

          {/* ===================== GRID LINES ===================== */}
          <line x1={20} y1={100} x2={680} y2={100} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1={20} y1={200} x2={680} y2={200} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1={20} y1={300} x2={680} y2={300} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1={350} y1={60} x2={350} y2={390} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

          {/* Title */}
          <text x={350} y={28} fill="#f8fafc" fontSize={16} fontWeight="bold" textAnchor="middle">
            Assumption Panel
          </text>
          <text x={350} y={48} fill="#94a3b8" fontSize={12} textAnchor="middle">
            Explicit assumptions reduce failure risk
          </text>

          {/* ===================== LEFT PANEL ===================== */}
          <rect x={20} y={60} width={260} height={320} fill="url(#afaPanelGradient)" rx={12} filter="url(#afaShadow)" />
          <text x={40} y={83} fill="#e2e8f0" fontSize={12} fontWeight="bold">ASSUMPTIONS</text>

          {/* Assumption items - absolute positions */}
          {assumptions.filter(a => !a.hidden || showHiddenAssumptions).map((assumption, i) => {
            const baseY = 105 + i * 52;
            const sphereGradient = assumption.confidence === 'high' ? 'url(#afaSphereHigh)' :
              assumption.confidence === 'medium' ? 'url(#afaSphereMedium)' : 'url(#afaSphereLow)';
            const glowFilter = assumption.confidence === 'high' ? 'url(#afaGlowHigh)' :
              assumption.confidence === 'medium' ? 'url(#afaGlowMedium)' : 'url(#afaGlowLow)';
            return (
              <g key={assumption.id}>
                <rect x={30} y={baseY} width={240} height={46} fill="rgba(15, 23, 42, 0.6)" stroke="#334155" strokeWidth={1} rx={8} />
                <circle cx={50} cy={baseY + 23} r={10} fill={sphereGradient} />
                <text x={68} y={baseY + 17} fill="#f8fafc" fontSize={11} fontWeight="600">{assumption.label}</text>
                <text x={68} y={baseY + 35} fill={assumption.confidence === 'high' ? '#34d399' : assumption.confidence === 'medium' ? '#fbbf24' : '#f87171'} fontSize={12} fontWeight="bold">
                  {showRanges && useRanges
                    ? `${Math.round(assumption.value * (1 - rangeWidth / 100))}-${Math.round(assumption.value * (1 + rangeWidth / 100))} ${assumption.unit}`
                    : `${assumption.value} ${assumption.unit}`
                  }
                </text>
              </g>
            );
          })}

          {/* Hidden warning */}
          {!showHiddenAssumptions && output.hiddenCount > 0 && (
            <text x={150} y={215 + (assumptions.length - output.hiddenCount) * 52} fill="#fca5a5" fontSize={12} textAnchor="middle" fontWeight="bold">
              +{output.hiddenCount} HIDDEN
            </text>
          )}

          {/* ===================== CONNECTION ===================== */}
          <text x={325} y={245} fill="#94a3b8" fontSize={11} textAnchor="middle">FEEDS INTO</text>

          {/* ===================== RIGHT PANEL ===================== */}
          <rect x={380} y={60} width={300} height={320} fill="url(#afaOutputPanel)" rx={12} filter="url(#afaShadow)" />
          <text x={400} y={83} fill="#e2e8f0" fontSize={12} fontWeight="bold">DESIGN OUTPUT</text>

          {/* Risk */}
          <text x={400} y={112} fill="#94a3b8" fontSize={11} fontWeight="600">Failure Risk</text>
          <rect x={400} y={118} width={260} height={24} fill="url(#afaProgressTrack)" rx={12} />
          <rect x={402} y={120} width={Math.min(256, output.risk * 2.56)} height={20} fill={output.risk > 60 ? 'url(#afaLowConfidence)' : output.risk > 30 ? 'url(#afaMediumConfidence)' : 'url(#afaHighConfidence)'} rx={10} />
          <text x={530} y={136} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight="bold">{output.risk.toFixed(0)}% RISK</text>

          {/* Servers */}
          <text x={400} y={168} fill="#94a3b8" fontSize={11} fontWeight="600">Infrastructure</text>
          {Array.from({ length: Math.min(output.estimatedServers, 4) }).map((_, i) => (
            <rect key={i} x={400 + i * 60} y={176} width={50} height={35} fill="url(#afaServerMetal)" rx={4} />
          ))}
          <text x={400} y={228} fill="#f8fafc" fontSize={14} fontWeight="bold">
            {output.estimatedServers} Server{output.estimatedServers > 1 ? 's' : ''}
          </text>

          {/* Cost */}
          <text x={400} y={258} fill="#94a3b8" fontSize={11} fontWeight="600">Monthly Cost</text>
          <rect x={400} y={264} width={180} height={36} fill="url(#afaCostBadge)" rx={8} />
          <text x={490} y={288} fill="#ffffff" fontSize={16} fontWeight="bold" textAnchor="middle">
            {showRanges && useRanges ? `$${output.costRange.min}-$${output.costRange.max}` : `$${output.estimatedCost}`}
          </text>

          {/* Reliability */}
          <text x={400} y={318} fill="#94a3b8" fontSize={11} fontWeight="600">Reliability Score</text>
          <rect x={400} y={324} width={260} height={24} fill="url(#afaProgressTrack)" rx={12} />
          <rect x={402} y={326} width={Math.min(256, output.reliability * 2.56)} height={20} fill={output.reliability > 70 ? 'url(#afaHighConfidence)' : output.reliability > 40 ? 'url(#afaMediumConfidence)' : 'url(#afaLowConfidence)'} rx={10} />
          <text x={530} y={340} fill="#ffffff" fontSize={12} textAnchor="middle" fontWeight="bold">{output.reliability.toFixed(0)}% RELIABLE</text>

          {/* Status */}
          <text x={530} y={370} fill={output.risk > 50 ? '#fca5a5' : output.risk > 25 ? '#fcd34d' : '#6ee7b7'} fontSize={11} textAnchor="middle" fontWeight="bold">
            {output.risk > 50 ? 'HIGH RISK' : output.risk > 25 ? 'MODERATE RISK' : 'SOLID'}
          </text>

          {/* ===================== INTERACTIVE POINT ===================== */}
          <circle
            cx={pointX}
            cy={pointY}
            r={8}
            fill="#f59e0b"
            filter="url(#glow)"
            stroke="#fff"
            strokeWidth={2}
          />

          {/* ===================== LEGEND ===================== */}
          <text x={20} y={408} fill="#94a3b8" fontSize={11} fontWeight="600">Confidence:</text>
          <circle cx={100} cy={405} r={7} fill="url(#afaSphereHigh)" />
          <text x={112} y={408} fill="#94a3b8" fontSize={11}>HIGH</text>
          <circle cx={160} cy={405} r={7} fill="url(#afaSphereMedium)" />
          <text x={172} y={408} fill="#94a3b8" fontSize={11}>MED</text>
          <circle cx={210} cy={405} r={7} fill="url(#afaSphereLow)" />
          <text x={222} y={408} fill="#94a3b8" fontSize={11}>LOW</text>
          <text x={280} y={408} fill="#64748b" fontSize={11}>
            {output.visibleCount}/{assumptions.length} visible
          </text>
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
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: showHiddenAssumptions
                  ? '0 4px 20px rgba(16, 185, 129, 0.4)'
                  : '0 4px 20px rgba(239, 68, 68, 0.4)',
              }}
            >
              {showHiddenAssumptions ? 'Explore All Visible' : 'Start: Show Hidden'}
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
                minHeight: '44px',
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
            <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>
              {assumption.label} (pressure/load factor): {assumption.value} {assumption.unit}
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
            onInput={(e) => updateAssumption(assumption.id, 'value', parseFloat((e.target as HTMLInputElement).value))}
            style={sliderStyle}
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
            fontWeight: 400,
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
              <label style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 400 }}>
                Range Width: +/-{rangeWidth}%
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={rangeWidth}
                onChange={(e) => setRangeWidth(parseInt(e.target.value))}
                onInput={(e) => setRangeWidth(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
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
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>
          Prompt: &quot;List assumptions; mark HIGH/LOW confidence; ask for missing data&quot;
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px', fontWeight: 400 }}>
          Risk = (hiddenAssumptions &times; 15) + (lowConfidence &times; 10) - (useRanges ? 20 : 0)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '2px', fontWeight: 400 }}>
          Current baseline reference factor: {calculateOutput().risk}% risk vs. {calculateOutput().reliability}% reliability
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
      }}>
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={10}
          style={{
            width: '100%',
            maxWidth: '400px',
            height: '6px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            width: `${((currentIndex + 1) / 10) * 100}%`,
            height: '100%',
            background: colors.accent,
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '4px' : '8px',
          flexWrap: 'wrap',
        }}>
        {phaseOrder.map((p, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = index <= currentIndex;

          return (
            <button
              key={p}
              aria-label={p}
              onClick={() => isClickable && goToPhase(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: isClickable ? 1 : 0.5,
                border: 'none',
                background: 'transparent',
                padding: '4px',
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
                  fontWeight: 700,
                  color: isCompleted || isCurrent ? 'white' : colors.textMuted,
                  border: isCurrent ? `2px solid ${colors.accent}` : 'none',
                  boxShadow: isCurrent ? `0 0 12px ${colors.accentGlow}` : 'none',
                }}
              >
                {isCompleted ? '\u2713' : index + 1}
              </div>
            </button>
          );
        })}
        </div>
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

        case 'transfer': return (
          <TransferPhaseView
          conceptName="Ask For Assumptions"
          applications={transferApplications}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          />
        );
        case 'test':
          return testSubmitted && testScore >= 8;
        default:
          return true;
      }
    };

    const getNextLabel = (): string => {
      switch (phase) {
        case 'hook':
          return 'Start Prediction';
        case 'predict':
          return 'Continue to Experiment';
        case 'play':
          return 'Continue to Review';
        case 'review':
          return 'Continue: A Twist!';
        case 'twist_predict':
          return 'Continue to Experiment';
        case 'twist_play':
          return 'See the Explanation';
        case 'twist_review':
          return 'Continue to Applications';
        case 'transfer':
          return 'Take the Test';
        case 'test':
          return testSubmitted ? (testScore >= 8 ? 'Continue to Mastery' : 'Review & Retry') : 'Submit Test';
        case 'mastery':
          return 'Continue';
        default:
          return 'Next';
      }
    };

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
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
            fontWeight: 700,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isFirst ? 0.5 : 1,
            minHeight: '44px',
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
            fontWeight: 700,
            cursor: canProceed() ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            minHeight: '44px',
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
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
                Ask for Assumptions
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
                If assumptions stay hidden, do you notice wrong ones? Let&apos;s discover how explicit assumptions change everything.
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
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                  Every engineering design rests on assumptions. Some are obvious, some are
                  not. When an LLM designs a system, it makes assumptions too - but does it
                  tell you about them? Hidden assumptions are the source of most engineering failures.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                  Notice the &quot;hidden assumptions&quot; warning. Click &quot;Show Hidden&quot; to see what is lurking.
                </p>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.error}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                  Watch how the risk score changes when you reveal hidden assumptions!
                </p>
              </div>
            </div>
          </div>
        );

      case 'predict':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            {renderVisualization(false)}

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Scenario:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
                You ask an LLM to design a system. It gives you a solution with server counts
                and cost estimates. But it does not tell you what assumptions it made about
                load, memory, uptime requirements, or budget constraints. Is this a problem?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
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
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                      fontWeight: 400,
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
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore Assumption Impact</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                Adjust assumptions and watch outputs update live
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              margin: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                <strong style={{ color: colors.accent, fontWeight: 700 }}>Try this:</strong> Observe how revealing hidden assumptions changes the risk score. Try changing confidence levels and see output sensitivity.
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

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Key Observations:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li style={{ fontWeight: 400 }}>Hidden assumptions add significant risk to the design</li>
                <li style={{ fontWeight: 400 }}>LOW confidence assumptions should be validated or monitored</li>
                <li style={{ fontWeight: 400 }}>Changing slider values shows output sensitivity</li>
                <li style={{ fontWeight: 400 }}>Making all assumptions explicit improves reliability</li>
              </ul>
            </div>
          </div>
        );

      case 'review': {
        const wasCorrect = prediction === 'critical';
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                {wasCorrect ? '\u2705 Correct!' : '\u274C The Answer: Explicit Assumptions Are Critical'}
              </h3>
              <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
                Your prediction was {wasCorrect ? 'correct' : 'not quite right'}. Because engineering failures often trace back to hidden assumptions, you cannot validate
                what you do not know. Therefore, making assumptions explicit is the first step to reliable engineering.
                This means every assumption must be documented, assigned a confidence level, and monitored.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Formula: Risk = Hidden Assumptions &times; Impact</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                  The relationship is proportional: Risk &prop; HiddenCount &times; AverageImpact. The formula shows that
                  Result = HiddenAssumptions &times; 15 + LowConfidence &times; 10 for total risk percentage.
                </p>
                <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Silent Failures:</strong> If you
                  assume &quot;load is under 100 users/sec&quot; but never state it, you will not monitor it,
                  and will not know when it exceeds that - until the system fails.
                </p>
                <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Confidence Levels:</strong> Marking
                  assumptions HIGH/MEDIUM/LOW forces you to acknowledge uncertainty. LOW confidence
                  items need validation, monitoring, or fallback plans.
                </p>
                <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Missing Data:</strong> Asking
                  &quot;what data would help validate this assumption?&quot; identifies knowledge gaps before
                  they become production problems.
                </p>
                <p style={{ fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>The Prompt:</strong> &quot;List
                  assumptions; mark HIGH/LOW confidence; ask for missing data.&quot;
                </p>
              </div>
            </div>
          </div>
        );
      }

      case 'twist_predict':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>The Twist</h2>
              <p style={{ color: colors.textSecondary, fontWeight: 400 }}>
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
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 400 }}>
                Instead of &quot;Expected Load: 100 users/sec&quot;, what about &quot;Expected Load: 80-150
                users/sec&quot;? Does expressing uncertainty as ranges improve engineering decisions?
              </p>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
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
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                      fontWeight: 400,
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
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Explore Range-Based Estimation</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                Enable ranges and see how uncertainty is captured
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              margin: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                <strong style={{ color: colors.warning, fontWeight: 700 }}>Try this:</strong> Observe how enabling ranges changes the cost estimates. Notice how wider ranges affect design decisions.
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
              <h4 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Range Benefits:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                Ranges force you to design for the worst case:
                <br />- Cost estimates become &quot;$400-$600/mo&quot; not &quot;$500/mo&quot;
                <br />- You plan for the upper bound, not the guess
                <br />- Stakeholders understand there is uncertainty
                <br />- You are more likely to be right (it will be in the range)
              </p>
            </div>
          </div>
        );

      case 'twist_review': {
        const twistWasCorrect = twistPrediction === 'ranges_better';
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{
              background: twistWasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                {twistWasCorrect ? '\u2705 Correct!' : '\u274C The Answer: Ranges Are Better'}
              </h3>
              <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
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
              <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>The Complete Assumption Template</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Format:</strong> &quot;Assumption: [name]
                  <br />- Value: [range with units]
                  <br />- Confidence: [HIGH/MEDIUM/LOW]
                  <br />- Validation: [how to check]
                  <br />- Impact if wrong: [consequence]&quot;
                </p>
                <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                  <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Example:</strong> &quot;Assumption: Expected Load
                  <br />- Value: 80-150 users/sec
                  <br />- Confidence: MEDIUM
                  <br />- Validation: Monitor for 2 weeks before scaling decision
                  <br />- Impact if wrong: Service degradation or over-provisioning costs&quot;
                </p>
              </div>
            </div>
          </div>
        );
      }

      case 'transfer':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
                Real-World Applications
              </h2>
              <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
                Explicit assumptions improve reliability across domains
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
                {transferCompleted.size} of {transferApplications.length} applications completed
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
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success }}>&#x2705; Complete</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>{app.description}</p>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 700 }}>{app.question}</p>
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
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                      fontWeight: 700,
                    }}
                  >
                    Explore Answer
                  </button>
                ) : (
                  <div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                      <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
                    </div>
                    <button
                      onClick={() => {
                        // Already completed, just acknowledge
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: colors.success,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        minHeight: '44px',
                        WebkitTapHighlightColor: 'transparent',
                        fontWeight: 700,
                      }}
                    >
                      Got It
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                margin: '16px',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
                  {testScore >= 8 ? '\u2705 Excellent!' : '\u274C Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 700 }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: 400 }}>
                  {testScore >= 8 ? 'You understand assumption management!' : 'Review the material and try again.'}
                </p>
              </div>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>{qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontWeight: 400 }}>
                        {opt.correct ? '\u2705 Correct: ' : userAnswer === oIndex ? '\u274C Your answer: ' : ''} {opt.text}
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
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
                <span style={{ color: colors.textSecondary, fontWeight: 400 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: 1.5, marginBottom: '12px', fontStyle: 'italic', fontWeight: 400 }}>{currentQ.scenario}</p>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 700 }}>{currentQ.question}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQ.options.map((opt, oIndex) => (
                  <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', minHeight: '44px', WebkitTapHighlightColor: 'transparent', fontWeight: 400 }}>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', minHeight: '44px', WebkitTapHighlightColor: 'transparent', fontWeight: 700 }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', minHeight: '44px', WebkitTapHighlightColor: 'transparent', fontWeight: 700 }}>Next</button>
              ) : null}
            </div>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\uD83C\uDFC6'}</div>
              <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 400 }}>You have mastered assumption management</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Key Prompt Patterns:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li style={{ fontWeight: 400 }}>&quot;List all assumptions you are making&quot;</li>
                <li style={{ fontWeight: 400 }}>&quot;Mark each as HIGH/MEDIUM/LOW confidence&quot;</li>
                <li style={{ fontWeight: 400 }}>&quot;Use numeric ranges instead of single values&quot;</li>
                <li style={{ fontWeight: 400 }}>&quot;Ask for missing data that would help&quot;</li>
                <li style={{ fontWeight: 400 }}>&quot;What happens if [assumption] is wrong?&quot;</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>Remember:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
                Engineering failures come from silent assumptions. If it stays hidden, you
                cannot validate it, monitor it, or know when it breaks. Making assumptions
                explicit - with confidence levels and numeric ranges - is the foundation of
                reliable engineering. Always ask: &quot;What assumptions are you making?&quot;
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
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
    }}>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1001,
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {renderProgressBar()}
      </nav>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default AskForAssumptionsRenderer;
