import React, { useState, useCallback, useEffect } from 'react';

interface AskForAssumptionsRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

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
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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
    const width = 450;
    const height = 400;
    const output = calculateOutput();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            Assumption Panel - Live Output Updates
          </text>

          {/* Assumptions list */}
          <g transform="translate(20, 50)">
            <rect x={0} y={0} width={200} height={260} fill="rgba(0,0,0,0.4)" rx={8} />
            <text x={10} y={20} fill={colors.textSecondary} fontSize={10}>ASSUMPTIONS</text>

            {assumptions.filter(a => !a.hidden || showHiddenAssumptions).map((assumption, i) => (
              <g key={assumption.id} transform={`translate(10, ${35 + i * 45})`}>
                <rect
                  x={0}
                  y={0}
                  width={180}
                  height={40}
                  fill={assumption.hidden ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)'}
                  stroke={colors.confidence[assumption.confidence]}
                  strokeWidth={1}
                  rx={4}
                />
                <text x={5} y={14} fill={colors.textPrimary} fontSize={9}>
                  {assumption.label}
                </text>
                <text x={5} y={28} fill={colors.confidence[assumption.confidence]} fontSize={11} fontWeight="bold">
                  {showRanges && useRanges
                    ? `${Math.round(assumption.value * (1 - rangeWidth / 100))}-${Math.round(assumption.value * (1 + rangeWidth / 100))} ${assumption.unit}`
                    : `${assumption.value} ${assumption.unit}`
                  }
                </text>
                <text x={175} y={20} fill={colors.confidence[assumption.confidence]} fontSize={8} textAnchor="end">
                  {assumption.confidence.toUpperCase()}
                </text>
                {assumption.hidden && (
                  <text x={175} y={32} fill={colors.error} fontSize={7} textAnchor="end">
                    (was hidden)
                  </text>
                )}
              </g>
            ))}

            {!showHiddenAssumptions && output.hiddenCount > 0 && (
              <g transform={`translate(10, ${35 + (assumptions.length - output.hiddenCount) * 45})`}>
                <rect x={0} y={0} width={180} height={30} fill="rgba(239, 68, 68, 0.2)" rx={4} strokeDasharray="5,5" stroke={colors.error} />
                <text x={90} y={18} fill={colors.error} fontSize={10} textAnchor="middle">
                  + {output.hiddenCount} hidden assumptions
                </text>
              </g>
            )}
          </g>

          {/* Output panel */}
          <g transform="translate(240, 50)">
            <rect x={0} y={0} width={190} height={260} fill="rgba(0,0,0,0.4)" rx={8} />
            <text x={10} y={20} fill={colors.textSecondary} fontSize={10}>DESIGN OUTPUT</text>

            {/* Risk meter */}
            <g transform="translate(10, 35)">
              <text x={0} y={0} fill={colors.textMuted} fontSize={9}>Failure Risk</text>
              <rect x={0} y={8} width={170} height={16} fill="rgba(255,255,255,0.1)" rx={4} />
              <rect
                x={0}
                y={8}
                width={output.risk * 1.7}
                height={16}
                fill={output.risk > 60 ? colors.error : output.risk > 30 ? colors.warning : colors.success}
                rx={4}
              />
              <text x={85} y={21} fill={colors.textPrimary} fontSize={10} textAnchor="middle" fontWeight="bold">
                {output.risk.toFixed(0)}%
              </text>
            </g>

            {/* Server estimate */}
            <g transform="translate(10, 80)">
              <text x={0} y={0} fill={colors.textMuted} fontSize={9}>Servers Needed</text>
              <text x={0} y={20} fill={colors.textPrimary} fontSize={16} fontWeight="bold">
                {output.estimatedServers}
              </text>
            </g>

            {/* Cost estimate */}
            <g transform="translate(10, 125)">
              <text x={0} y={0} fill={colors.textMuted} fontSize={9}>Monthly Cost</text>
              <text x={0} y={20} fill={colors.accent} fontSize={16} fontWeight="bold">
                {showRanges && useRanges
                  ? `$${output.costRange.min} - $${output.costRange.max}`
                  : `$${output.estimatedCost}`
                }
              </text>
            </g>

            {/* Reliability */}
            <g transform="translate(10, 170)">
              <text x={0} y={0} fill={colors.textMuted} fontSize={9}>Design Reliability</text>
              <rect x={0} y={8} width={170} height={16} fill="rgba(255,255,255,0.1)" rx={4} />
              <rect
                x={0}
                y={8}
                width={output.reliability * 1.7}
                height={16}
                fill={output.reliability > 70 ? colors.success : output.reliability > 40 ? colors.warning : colors.error}
                rx={4}
              />
              <text x={85} y={21} fill={colors.textPrimary} fontSize={10} textAnchor="middle" fontWeight="bold">
                {output.reliability.toFixed(0)}%
              </text>
            </g>

            {/* Status message */}
            <g transform="translate(10, 215)">
              <rect
                x={0}
                y={0}
                width={170}
                height={35}
                fill={output.risk > 50 ? 'rgba(239, 68, 68, 0.3)' : output.risk > 25 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}
                rx={4}
              />
              <text x={85} y={22} fill={output.risk > 50 ? colors.error : output.risk > 25 ? colors.warning : colors.success} fontSize={10} textAnchor="middle" fontWeight="bold">
                {output.risk > 50
                  ? 'HIGH RISK - Review assumptions!'
                  : output.risk > 25
                    ? 'MODERATE - Some assumptions LOW'
                    : 'SOLID - Assumptions documented'}
              </text>
            </g>
          </g>

          {/* Legend */}
          <g transform="translate(20, 330)">
            <text x={0} y={0} fill={colors.textSecondary} fontSize={9}>Confidence Levels:</text>
            <circle cx={10} cy={18} r={5} fill={colors.confidence.high} />
            <text x={20} y={22} fill={colors.textMuted} fontSize={9}>HIGH</text>
            <circle cx={70} cy={18} r={5} fill={colors.confidence.medium} />
            <text x={80} y={22} fill={colors.textMuted} fontSize={9}>MEDIUM</text>
            <circle cx={145} cy={18} r={5} fill={colors.confidence.low} />
            <text x={155} y={22} fill={colors.textMuted} fontSize={9}>LOW</text>
          </g>

          {/* Impact indicator */}
          <g transform="translate(240, 330)">
            <text x={0} y={0} fill={colors.textSecondary} fontSize={9}>Visible: {output.visibleCount} / {assumptions.length}</text>
            {!showHiddenAssumptions && output.hiddenCount > 0 && (
              <text x={0} y={18} fill={colors.error} fontSize={9}>
                {output.hiddenCount} assumptions not listed!
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
                background: showHiddenAssumptions ? colors.success : colors.error,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {showHiddenAssumptions ? 'All Shown' : 'Show Hidden'}
            </button>
            <button
              onClick={() => {
                setAssumptions(prev => prev.map(a => ({ ...a, confidence: 'high' as const })));
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Validate All
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

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'critical';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'ranges_better';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'The Answer: Ranges Are Better'}
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
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default AskForAssumptionsRenderer;
