import React, { useState, useCallback } from 'react';

interface VerificationHarnessRendererProps {
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
  perf: {
    fast: '#22c55e',
    medium: '#f59e0b',
    slow: '#ef4444',
    baseline: '#3b82f6',
  },
};

const VerificationHarnessRenderer: React.FC<VerificationHarnessRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [hasBenchmark, setHasBenchmark] = useState(false);
  const [hasCorrectness, setHasCorrectness] = useState(true);
  const [optimizationLevel, setOptimizationLevel] = useState(50);
  const [showFlamegraph, setShowFlamegraph] = useState(false);
  const [iterations, setIterations] = useState(1000);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Simulation data
  const calculateMetrics = useCallback(() => {
    // Without benchmarks, "improvements" are just stories
    const baseTime = 100; // ms
    const actualImprovement = hasBenchmark ? optimizationLevel / 100 : Math.random() * 0.3 + 0.1;
    const perceivedImprovement = optimizationLevel / 100;

    // Aggressive optimization without tests can break correctness
    const correctnessRisk = hasCorrectness ? 0.05 : (optimizationLevel / 100) * 0.8;

    const actualTime = baseTime * (1 - actualImprovement * 0.7);
    const perceivedTime = baseTime * (1 - perceivedImprovement * 0.7);

    return {
      baselineMs: baseTime,
      actualMs: actualTime,
      perceivedMs: perceivedTime,
      actualSpeedup: ((baseTime - actualTime) / baseTime * 100).toFixed(1),
      perceivedSpeedup: ((baseTime - perceivedTime) / baseTime * 100).toFixed(1),
      correctnessRisk: (correctnessRisk * 100).toFixed(0),
      reliable: hasBenchmark && hasCorrectness,
    };
  }, [hasBenchmark, hasCorrectness, optimizationLevel]);

  const predictions = [
    { id: 'llm_knows', label: 'The LLM knows which optimizations are faster - it has seen millions of codebases' },
    { id: 'need_measurement', label: 'Performance claims need benchmarks - complexity and hardware make predictions unreliable' },
    { id: 'obvious', label: 'Obvious optimizations (O(n) to O(1)) do not need measurement' },
    { id: 'always_faster', label: 'Modern compilers optimize everything anyway' },
  ];

  const twistPredictions = [
    { id: 'flamegraph_optional', label: 'Flamegraphs are nice but optional - timing is enough' },
    { id: 'flamegraph_essential', label: 'Flamegraphs show WHERE time is spent - essential for targeted optimization' },
    { id: 'flamegraph_slow', label: 'Profiling slows down the code too much to be useful' },
    { id: 'flamegraph_expert', label: 'Only experts can read flamegraphs' },
  ];

  const transferApplications = [
    {
      title: 'Database Query Optimization',
      description: 'SQL queries can behave very differently depending on data distribution and indexes.',
      question: 'Why do DBAs insist on EXPLAIN ANALYZE before and after query changes?',
      answer: 'Query planners make complex decisions based on table statistics. A "simpler" query might trigger a table scan instead of an index lookup. Without before/after execution plans, you might ship a 100x slower query while believing you optimized it.',
    },
    {
      title: 'Machine Learning Inference',
      description: 'ML models have complex performance characteristics depending on batch size, hardware, and model architecture.',
      question: 'Why do ML engineers always benchmark on representative data?',
      answer: 'ML inference time depends on input shape, batch size, GPU memory, and quantization. A change that speeds up one model might slow down another. Benchmark results from one dataset can be misleading for production data.',
    },
    {
      title: 'Compiler Optimization Levels',
      description: 'Compilers like gcc and clang have multiple optimization levels (-O0 to -O3, -Os, etc.).',
      question: 'Why does -O3 sometimes produce slower code than -O2?',
      answer: 'Aggressive optimizations can increase code size, causing more cache misses. Inlining everything sounds fast but may blow out instruction cache. Benchmarks reveal when "more optimization" hurts performance.',
    },
    {
      title: 'Network Protocol Selection',
      description: 'Different protocols (HTTP/1.1, HTTP/2, gRPC, WebSocket) have different performance profiles.',
      question: 'Why can a "faster" protocol be slower in practice?',
      answer: 'Protocol overhead depends on message size, connection reuse, and network conditions. HTTP/2 multiplexing helps with many small requests but adds complexity for large streams. Real benchmarks on your traffic pattern are essential.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why can LLMs not reliably predict performance improvements?',
      options: [
        { text: 'They are not smart enough', correct: false },
        { text: 'Performance depends on runtime factors like hardware, data, and compiler optimizations', correct: true },
        { text: 'They were not trained on fast code', correct: false },
        { text: 'Performance is subjective', correct: false },
      ],
    },
    {
      question: 'What does "performance is physics" mean?',
      options: [
        { text: 'Performance requires a physics degree to understand', correct: false },
        { text: 'Performance involves real time and energy that must be measured, not guessed', correct: true },
        { text: 'Computers use physics to run', correct: false },
        { text: 'Fast code follows physical laws', correct: false },
      ],
    },
    {
      question: 'A benchmark shows 2x speedup. What is missing?',
      options: [
        { text: 'Nothing - 2x speedup is great', correct: false },
        { text: 'Correctness tests to verify the output is still correct', correct: true },
        { text: 'More optimization to get 4x speedup', correct: false },
        { text: 'A faster computer', correct: false },
      ],
    },
    {
      question: 'Why require "before/after" benchmark results from LLMs?',
      options: [
        { text: 'To make responses longer', correct: false },
        { text: 'To verify the claimed improvement with actual measurements', correct: true },
        { text: 'To check the LLM did any work', correct: false },
        { text: 'Benchmarks are required by coding standards', correct: false },
      ],
    },
    {
      question: 'What is a flamegraph?',
      options: [
        { text: 'A chart showing code temperature', correct: false },
        { text: 'A visualization of where CPU time is spent across function calls', correct: true },
        { text: 'A graph of fire risk in data centers', correct: false },
        { text: 'A colorful code coverage report', correct: false },
      ],
    },
    {
      question: 'Why add flamegraph summaries as required artifacts?',
      options: [
        { text: 'They look impressive in documentation', correct: false },
        { text: 'They reveal if optimization targeted the actual bottleneck', correct: true },
        { text: 'They are required by most frameworks', correct: false },
        { text: 'They replace unit tests', correct: false },
      ],
    },
    {
      question: 'An LLM claims it "optimized" a function. Without benchmarks, you have:',
      options: [
        { text: 'An optimized function', correct: false },
        { text: 'A story about optimization, possibly a slower function', correct: true },
        { text: 'A better algorithm', correct: false },
        { text: 'Trustworthy code', correct: false },
      ],
    },
    {
      question: 'Why keep correctness tests alongside performance tests?',
      options: [
        { text: 'To have more tests', correct: false },
        { text: 'Fast wrong answers are worse than slow correct ones', correct: true },
        { text: 'Correctness tests are easier to write', correct: false },
        { text: 'They run automatically anyway', correct: false },
      ],
    },
    {
      question: 'What is a "performance regression guardrail"?',
      options: [
        { text: 'A safety barrier in data centers', correct: false },
        { text: 'An automated check that fails builds if performance degrades', correct: true },
        { text: 'A manual code review step', correct: false },
        { text: 'A type of firewall', correct: false },
      ],
    },
    {
      question: 'The prompt "Add a benchmark; show before/after; keep correctness tests" ensures:',
      options: [
        { text: 'The LLM writes longer responses', correct: false },
        { text: 'Claims are verified with measurements and safety preserved', correct: true },
        { text: 'The code follows best practices', correct: false },
        { text: 'The optimization will definitely work', correct: false },
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

  const renderVisualization = (interactive: boolean, showProfiling: boolean = false) => {
    const width = 450;
    const height = 380;
    const metrics = calculateMetrics();

    // Benchmark bars
    const barWidth = 60;
    const maxBarHeight = 200;

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
            Benchmark Dashboard
          </text>

          {/* Baseline bar */}
          <g transform="translate(80, 250)">
            <rect
              x={-barWidth/2}
              y={-maxBarHeight}
              width={barWidth}
              height={maxBarHeight}
              fill={colors.perf.baseline}
              rx={4}
            />
            <text x={0} y={20} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Baseline</text>
            <text x={0} y={-maxBarHeight - 10} fill={colors.textPrimary} fontSize={12} textAnchor="middle">
              {metrics.baselineMs}ms
            </text>
          </g>

          {/* Perceived improvement bar (what LLM claims) */}
          <g transform="translate(180, 250)">
            <rect
              x={-barWidth/2}
              y={-(metrics.perceivedMs / metrics.baselineMs) * maxBarHeight}
              width={barWidth}
              height={(metrics.perceivedMs / metrics.baselineMs) * maxBarHeight}
              fill={hasBenchmark ? colors.perf.fast : 'rgba(255,255,255,0.3)'}
              rx={4}
              strokeDasharray={hasBenchmark ? 'none' : '5,5'}
              stroke={hasBenchmark ? 'none' : colors.textMuted}
            />
            <text x={0} y={20} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              {hasBenchmark ? 'Measured' : 'Claimed'}
            </text>
            <text x={0} y={-(metrics.perceivedMs / metrics.baselineMs) * maxBarHeight - 10} fill={hasBenchmark ? colors.success : colors.textMuted} fontSize={12} textAnchor="middle">
              {hasBenchmark ? `${metrics.actualMs.toFixed(0)}ms` : `~${metrics.perceivedMs.toFixed(0)}ms?`}
            </text>
          </g>

          {/* Status indicators */}
          <g transform="translate(300, 70)">
            <rect x={0} y={0} width={130} height={170} fill="rgba(0,0,0,0.5)" rx={8} />
            <text x={65} y={25} fill={colors.textSecondary} fontSize={11} textAnchor="middle">STATUS</text>

            <circle cx={20} cy={50} r={8} fill={hasBenchmark ? colors.success : colors.error} />
            <text x={35} y={54} fill={colors.textPrimary} fontSize={10}>Benchmark</text>

            <circle cx={20} cy={80} r={8} fill={hasCorrectness ? colors.success : colors.error} />
            <text x={35} y={84} fill={colors.textPrimary} fontSize={10}>Correctness</text>

            <circle cx={20} cy={110} r={8} fill={showProfiling && showFlamegraph ? colors.success : colors.textMuted} />
            <text x={35} y={114} fill={colors.textPrimary} fontSize={10}>Profiling</text>

            <rect
              x={10}
              y={130}
              width={110}
              height={30}
              fill={metrics.reliable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
              rx={4}
            />
            <text x={65} y={150} fill={metrics.reliable ? colors.success : colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">
              {metrics.reliable ? 'RELIABLE' : 'UNVERIFIED'}
            </text>
          </g>

          {/* Speedup indicator */}
          <g transform="translate(80, 300)">
            <text x={50} y={0} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              Claimed: {metrics.perceivedSpeedup}% faster
            </text>
            <text x={50} y={20} fill={hasBenchmark ? colors.success : colors.warning} fontSize={11} textAnchor="middle">
              {hasBenchmark ? `Verified: ${metrics.actualSpeedup}% faster` : 'Unverified!'}
            </text>
          </g>

          {/* Correctness risk warning */}
          {!hasCorrectness && (
            <g transform={`translate(${width/2}, 340)`}>
              <rect x={-100} y={-15} width={200} height={30} fill="rgba(239, 68, 68, 0.3)" rx={4} />
              <text x={0} y={5} fill={colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">
                RISK: {metrics.correctnessRisk}% chance of wrong results
              </text>
            </g>
          )}

          {/* Flamegraph mini-view */}
          {showProfiling && showFlamegraph && (
            <g transform="translate(80, 280)">
              <rect x={0} y={0} width={180} height={40} fill="rgba(0,0,0,0.4)" rx={4} />
              <text x={90} y={15} fill={colors.textSecondary} fontSize={9} textAnchor="middle">FLAMEGRAPH SUMMARY</text>
              <rect x={5} y={22} width={80} height={12} fill={colors.error} rx={2} />
              <rect x={88} y={22} width={50} height={12} fill={colors.warning} rx={2} />
              <rect x={141} y={22} width={34} height={12} fill={colors.success} rx={2} />
              <text x={45} y={32} fill="white" fontSize={8} textAnchor="middle">hotspot()</text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setHasBenchmark(!hasBenchmark)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: hasBenchmark ? colors.success : colors.error,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {hasBenchmark ? 'Benchmark ON' : 'Benchmark OFF'}
            </button>
            <button
              onClick={() => setHasCorrectness(!hasCorrectness)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: hasCorrectness ? colors.success : colors.error,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {hasCorrectness ? 'Tests ON' : 'Tests OFF'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showProfiling: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Optimization Level: {optimizationLevel}% (LLM's claimed improvement)
        </label>
        <input
          type="range"
          min="10"
          max="90"
          step="10"
          value={optimizationLevel}
          onChange={(e) => setOptimizationLevel(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Benchmark Iterations: {iterations}
        </label>
        <input
          type="range"
          min="100"
          max="10000"
          step="100"
          value={iterations}
          onChange={(e) => setIterations(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showProfiling && (
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
              checked={showFlamegraph}
              onChange={(e) => setShowFlamegraph(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Include flamegraph profiling output
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
          Prompt: "Add a benchmark; show before/after; keep correctness tests"
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Reliability = hasBenchmark AND hasCorrectness {showProfiling ? 'AND hasProfiling' : ''}
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
              Verification Harness
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Will the model optimize the wrong thing without measurements?
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
                "I optimized this function to be 3x faster!" claims the LLM. But how do you
                know? Without benchmarks, you are trusting a story. Performance is physics -
                real time and energy - and physics requires measurement.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Toggle the benchmark to see the difference between claims and verification.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try turning off the benchmark and see how the status changes!
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
              You ask an LLM to optimize a function. It rewrites the algorithm and claims
              "this is much faster." Should you trust this claim?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Can LLMs reliably predict performance improvements?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Verification</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle benchmarks and tests to see what makes claims reliable
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
              <li>Without benchmarks, claimed speedups are just stories</li>
              <li>Without correctness tests, fast wrong answers are worse than slow correct ones</li>
              <li>More iterations give more stable benchmark results</li>
              <li>The "RELIABLE" badge requires BOTH measurements</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'need_measurement';

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
              {wasCorrect ? 'Correct!' : 'The Answer: Measurement Required'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Performance is physics - it involves real time and energy. LLMs can reason
              about complexity, but actual performance depends on hardware, data patterns,
              compiler optimizations, and cache behavior. Only measurement reveals truth.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Performance is Physics</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Time is Real:</strong> Code runs
                on physical hardware with physical limitations. CPUs have clock cycles, memory
                has latency, and networks have bandwidth. These are measurable quantities.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Complexity Lies:</strong> O(n log n)
                is "slower" than O(n) in theory, but for n less than 1000, the constant factors often dominate.
                Real performance requires real numbers.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>You Need Numbers:</strong> "Faster"
                is meaningless. "2.3ms vs 4.1ms on input size 10,000" is actionable.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Prompt Template:</strong> "Add a
                benchmark; show before/after; keep correctness tests."
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
              What about profiling outputs like flamegraphs?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Beyond simple timing, profilers can generate flamegraphs that show exactly
              where CPU time is spent. Should you require these as artifacts from LLM
              optimization work?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Are flamegraphs necessary for optimization?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Profiling Value</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable flamegraph profiling and see what it reveals
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.perf.baseline}`,
          }}>
            <h4 style={{ color: colors.perf.baseline, marginBottom: '8px' }}>Flamegraph Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              A flamegraph shows the call stack over time. Wide bars mean functions that
              take lots of time. Without this, you might optimize a function that only
              takes 2% of total time while the real bottleneck sits at 80%.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'flamegraph_essential';

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
              {wasCorrect ? 'Correct!' : 'The Answer: Flamegraphs Are Essential'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Flamegraphs reveal WHERE time is spent, enabling targeted optimization.
              Without them, you might optimize the wrong function entirely.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Profiling as Required Artifact</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Prompt Upgrade:</strong> "Add
                a benchmark with profiling output; show the flamegraph summary; keep correctness tests."
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>What to Look For:</strong> The
                widest bars in a flamegraph are your bottlenecks. If the LLM optimized something
                that is not the widest bar, they optimized the wrong thing.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Performance Regression Guardrail:</strong> Set
                up CI to fail if benchmarks regress. This catches "optimizations" that actually
                make things slower.
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
              Verification harnesses apply across all performance work
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
                {testScore >= 8 ? 'You understand verification harnesses!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered verification harnesses for performance work</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Prompt Patterns:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>"Add a benchmark with N iterations"</li>
              <li>"Show before/after timing results"</li>
              <li>"Keep correctness tests passing"</li>
              <li>"Include flamegraph/profiling output"</li>
              <li>"Set up performance regression guardrails"</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Remember:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Performance is physics. Time and energy are real, measurable quantities. Without
              benchmarks, optimization claims are just stories. Without profiling, you might
              optimize the wrong thing. Without correctness tests, fast wrong answers are worse
              than slow correct ones. Always verify with numbers.
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

export default VerificationHarnessRenderer;
