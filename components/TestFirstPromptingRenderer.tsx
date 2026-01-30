import React, { useState, useCallback, useEffect } from 'react';

interface TestFirstPromptingRendererProps {
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
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  testPass: '#10b981',
  testFail: '#ef4444',
  testPending: '#6b7280',
  code: '#3b82f6',
  coverage: '#8b5cf6',
};

const TestFirstPromptingRenderer: React.FC<TestFirstPromptingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [testMode, setTestMode] = useState<'code_first' | 'test_first'>('code_first');
  const [iteration, setIteration] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [testResults, setTestResults] = useState<('pass' | 'fail' | 'pending')[]>(['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate metrics based on approach
  const calculateMetrics = useCallback(() => {
    const passCount = testResults.filter(r => r === 'pass').length;
    const failCount = testResults.filter(r => r === 'fail').length;
    const coverage = passCount * 12.5;

    // Test-first converges faster
    const iterationsToPass = testMode === 'test_first' ? Math.max(1, 4 - iteration) : Math.max(1, 7 - iteration);
    const bugsFound = testMode === 'test_first' ? failCount * 2 : failCount;
    const regressionRisk = testMode === 'test_first' ? Math.max(5, 30 - passCount * 5) : Math.max(20, 60 - passCount * 5);

    return {
      passCount,
      failCount,
      coverage,
      iterationsToPass,
      bugsFound,
      regressionRisk,
    };
  }, [testResults, testMode, iteration]);

  // Animate test runs
  useEffect(() => {
    if (!isAnimating) return;

    const runTests = async () => {
      const newResults: ('pass' | 'fail' | 'pending')[] = [...testResults];

      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));

        // Test-first: tests fail initially, then pass as implementation catches up
        // Code-first: more random, some pass some fail
        if (testMode === 'test_first') {
          const passChance = iteration * 15 + i * 5;
          newResults[i] = Math.random() * 100 < passChance ? 'pass' : 'fail';
        } else {
          // Code-first: more chaotic, hallucinated logic
          const passChance = 30 + iteration * 10;
          newResults[i] = Math.random() * 100 < passChance ? 'pass' : 'fail';
        }
        setTestResults([...newResults]);
      }

      setIsAnimating(false);
    };

    runTests();
  }, [isAnimating, iteration, testMode, testResults]);

  const unitTests = [
    { name: 'test_add_positive_numbers', desc: 'adds two positive integers correctly' },
    { name: 'test_add_negative_numbers', desc: 'handles negative numbers' },
    { name: 'test_add_zero', desc: 'adding zero returns same number' },
    { name: 'test_add_floats', desc: 'handles floating point precision' },
    { name: 'test_add_large_numbers', desc: 'handles integer overflow' },
    { name: 'test_add_type_error', desc: 'raises error for non-numeric input' },
    { name: 'test_add_empty_input', desc: 'handles empty/null input' },
    { name: 'test_add_string_numbers', desc: 'handles string number conversion' },
  ];

  const predictions = [
    { id: 'same', label: 'Writing tests first or after makes no difference in final code quality' },
    { id: 'code_first', label: 'Writing code first is faster and tests can verify it after' },
    { id: 'test_first', label: 'Writing tests first makes failures visible immediately and code converges faster' },
    { id: 'no_tests', label: 'Tests are not needed if the prompt is detailed enough' },
  ];

  const twistPredictions = [
    { id: 'unit_only', label: 'Unit tests alone are sufficient for all edge cases' },
    { id: 'property_helps', label: 'Property-based tests catch edge cases that unit tests miss' },
    { id: 'manual_better', label: 'Manual testing is more reliable than automated tests' },
    { id: 'no_difference', label: 'Property-based tests add complexity without benefit' },
  ];

  const transferApplications = [
    {
      title: 'API Contract Testing',
      description: 'When prompting for API endpoints, test-first ensures the contract is met before implementation details.',
      question: 'How does test-first help with API development?',
      answer: 'Writing API tests first defines the contract: expected inputs, outputs, status codes, and error formats. The LLM then implements to satisfy these concrete requirements rather than inventing its own API shape.',
    },
    {
      title: 'Data Transformation Pipelines',
      description: 'ETL and data processing code benefits from test-first because transformations have clear input/output relationships.',
      question: 'Why is test-first particularly effective for data pipelines?',
      answer: 'Data transforms have concrete input/output pairs. Defining test cases with sample data first creates an objective target. The LLM cannot hallucinate logic that produces wrong output when tests immediately catch it.',
    },
    {
      title: 'Refactoring Existing Code',
      description: 'When asking LLMs to refactor code, tests ensure the refactored version maintains behavior.',
      question: 'How do tests protect against refactoring regressions?',
      answer: 'Tests written before refactoring capture the existing behavior. When the LLM refactors, any change in behavior immediately fails a test. This is especially valuable since LLMs may simplify away important edge case handling.',
    },
    {
      title: 'Mathematical Functions',
      description: 'Numerical algorithms are prone to subtle bugs that tests can catch systematically.',
      question: 'What testing approach works best for math functions?',
      answer: 'Combine unit tests with specific values (test_sqrt(4) = 2) with property-based tests (sqrt(x)^2 = x for all positive x). This catches both specific bugs and general logical errors in the implementation.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does test-first prompting help LLM code converge faster?',
      options: [
        { text: 'It makes the LLM work harder', correct: false },
        { text: 'Failures become visible immediately, creating a clear objective target', correct: true },
        { text: 'Tests are simpler than code', correct: false },
        { text: 'The LLM prefers writing tests', correct: false },
      ],
    },
    {
      question: 'In test-first prompting, when should you write the implementation?',
      options: [
        { text: 'Before any tests', correct: false },
        { text: 'After writing tests that define expected behavior', correct: true },
        { text: 'Tests and implementation should be written together', correct: false },
        { text: 'Implementation is not needed if tests pass', correct: false },
      ],
    },
    {
      question: 'What is the main advantage of having tests fail initially?',
      options: [
        { text: 'It proves the tests are working correctly', correct: true },
        { text: 'Failing tests are easier to write', correct: false },
        { text: 'The LLM learns from failures', correct: false },
        { text: 'Failures are ignored anyway', correct: false },
      ],
    },
    {
      question: 'How do tests turn language into an objective target?',
      options: [
        { text: 'Tests use special programming languages', correct: false },
        { text: 'Tests provide concrete pass/fail criteria the implementation must satisfy', correct: true },
        { text: 'Tests are written in natural language', correct: false },
        { text: 'Tests remove the need for specifications', correct: false },
      ],
    },
    {
      question: 'What does the red/green test timeline visualize?',
      options: [
        { text: 'Code compilation status', correct: false },
        { text: 'Test results over iterations: failures (red) converting to passes (green)', correct: true },
        { text: 'Memory usage over time', correct: false },
        { text: 'Network traffic patterns', correct: false },
      ],
    },
    {
      question: 'Property-based tests are valuable because they:',
      options: [
        { text: 'Run faster than unit tests', correct: false },
        { text: 'Generate many test cases from properties, catching edge cases you did not explicitly write', correct: true },
        { text: 'Require less code to write', correct: false },
        { text: 'Only test happy paths', correct: false },
      ],
    },
    {
      question: 'Why might code-first prompting produce more hallucinated logic?',
      options: [
        { text: 'The LLM writes more code', correct: false },
        { text: 'Without tests, there is no immediate feedback on correctness, so errors persist', correct: true },
        { text: 'Code-first uses different syntax', correct: false },
        { text: 'Hallucinations are random and unrelated to approach', correct: false },
      ],
    },
    {
      question: 'What is the relationship between test coverage and regression risk?',
      options: [
        { text: 'No relationship exists', correct: false },
        { text: 'Higher coverage means more code paths are verified, reducing regression risk', correct: true },
        { text: 'Coverage increases regression risk', correct: false },
        { text: 'Coverage only matters for production code', correct: false },
      ],
    },
    {
      question: 'A coverage map shows:',
      options: [
        { text: 'Which tests are running', correct: false },
        { text: 'Which parts of the code are exercised by tests', correct: true },
        { text: 'How fast tests execute', correct: false },
        { text: 'Memory allocation patterns', correct: false },
      ],
    },
    {
      question: 'The test-first approach treats tests as:',
      options: [
        { text: 'Optional documentation', correct: false },
        { text: 'Executable specifications that define correct behavior', correct: true },
        { text: 'Performance benchmarks', correct: false },
        { text: 'Security audits', correct: false },
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

  const runIteration = () => {
    setIteration(prev => Math.min(prev + 1, 5));
    setIsAnimating(true);
  };

  const resetSimulation = () => {
    setIteration(1);
    setTestResults(['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 480;
    const metrics = calculateMetrics();

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
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            Test Timeline - Iteration {iteration}
          </text>
          <text x={width/2} y={45} fill={testMode === 'test_first' ? colors.success : colors.warning} fontSize={12} textAnchor="middle">
            {testMode === 'test_first' ? 'Test-First Approach' : 'Code-First Approach'}
          </text>

          {/* Test results grid */}
          <rect x={20} y={60} width={width - 40} height={200} fill={colors.bgCard} rx={8} />
          <text x={30} y={80} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Unit Tests:</text>

          {unitTests.map((test, i) => {
            const y = 95 + i * 20;
            const result = testResults[i];
            return (
              <g key={i}>
                <circle
                  cx={35}
                  cy={y}
                  r={6}
                  fill={
                    result === 'pass' ? colors.testPass :
                    result === 'fail' ? colors.testFail :
                    colors.testPending
                  }
                />
                <text x={50} y={y + 4} fill={colors.textPrimary} fontSize={10}>
                  {test.name}
                </text>
                <text x={width - 80} y={y + 4} fill={colors.textMuted} fontSize={9}>
                  {result.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Coverage bar */}
          <text x={20} y={280} fill={colors.textSecondary} fontSize={11}>Coverage:</text>
          <rect x={80} y={268} width={200} height={16} fill="#374151" rx={4} />
          <rect x={80} y={268} width={metrics.coverage * 2} height={16} fill={colors.coverage} rx={4} />
          <text x={290} y={280} fill={colors.textPrimary} fontSize={11}>{metrics.coverage.toFixed(0)}%</text>

          {/* Iteration timeline */}
          <text x={20} y={315} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Convergence Timeline:</text>
          <rect x={20} y={325} width={width - 40} height={40} fill={colors.bgCard} rx={6} />

          {[1, 2, 3, 4, 5].map((iter, i) => {
            const x = 40 + i * 70;
            const isComplete = iter <= iteration;
            const passRatio = testMode === 'test_first' ? Math.min(1, iter * 0.25) : Math.min(1, iter * 0.15);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={335}
                  width={50}
                  height={20}
                  fill={isComplete ? (passRatio > 0.7 ? colors.success : colors.warning) : '#374151'}
                  rx={4}
                  opacity={isComplete ? 1 : 0.3}
                />
                <text x={x + 25} y={349} fill={colors.textPrimary} fontSize={10} textAnchor="middle">
                  {isComplete ? `${(passRatio * 100).toFixed(0)}%` : '-'}
                </text>
              </g>
            );
          })}

          {/* Metrics comparison */}
          <rect x={20} y={380} width={width - 40} height={90} fill={colors.bgCard} rx={8} />
          <text x={30} y={400} fill={colors.textSecondary} fontSize={11}>Pass/Fail: </text>
          <text x={100} y={400} fill={colors.testPass} fontSize={11}>{metrics.passCount} passed</text>
          <text x={170} y={400} fill={colors.testFail} fontSize={11}>{metrics.failCount} failed</text>

          <text x={30} y={420} fill={colors.textSecondary} fontSize={11}>Est. iterations to 100%: </text>
          <text x={180} y={420} fill={metrics.iterationsToPass <= 2 ? colors.success : colors.warning} fontSize={11}>{metrics.iterationsToPass}</text>

          <text x={30} y={440} fill={colors.textSecondary} fontSize={11}>Regression Risk: </text>
          <rect x={130} y={430} width={100} height={12} fill="#374151" rx={4} />
          <rect x={130} y={430} width={metrics.regressionRisk} height={12} fill={metrics.regressionRisk < 30 ? colors.success : colors.error} rx={4} />
          <text x={240} y={441} fill={colors.textPrimary} fontSize={10}>{metrics.regressionRisk}%</text>

          <text x={30} y={460} fill={colors.textSecondary} fontSize={11}>Bugs Found Early: </text>
          <text x={140} y={460} fill={colors.success} fontSize={11}>{metrics.bugsFound}</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setTestMode('test_first'); resetSimulation(); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: testMode === 'test_first' ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                background: testMode === 'test_first' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.success,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Test-First
            </button>
            <button
              onClick={() => { setTestMode('code_first'); resetSimulation(); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: testMode === 'code_first' ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: testMode === 'code_first' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.warning,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Code-First
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={runIteration}
          disabled={isAnimating || iteration >= 5}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: isAnimating || iteration >= 5 ? colors.textMuted : colors.accent,
            color: 'white',
            fontWeight: 'bold',
            cursor: isAnimating || iteration >= 5 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isAnimating ? 'Running...' : 'Run Iteration'}
        </button>
        <button
          onClick={resetSimulation}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Reset
        </button>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {testMode === 'test_first'
            ? 'Tests define the target. Implementation converges to satisfy them.'
            : 'Code written first. Tests verify after - but hallucinated logic may persist.'}
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
      borderTop: '1px solid rgba(255,255,255,0.1)',
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
              Test-First Prompting
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can you prevent hallucinated logic by demanding tests first?
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
                When you prompt an LLM to write tests first, then implement to satisfy them,
                you create an objective target. Failures become visible immediately, and the
                code converges faster toward correct behavior.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Compare test-first vs code-first approaches and watch how tests converge!
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

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which approach produces more reliable code faster?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Compare Approaches</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Run iterations and watch test convergence
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Run 5 iterations in test-first mode, note how quickly tests pass</li>
              <li>Reset and run 5 iterations in code-first mode</li>
              <li>Compare iterations needed to reach 100% passing</li>
              <li>Notice regression risk differences between approaches</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'test_first';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Test-first prompting makes failures visible immediately. The LLM has a concrete
              target to satisfy, and incorrect implementations are caught right away instead
              of persisting through multiple iterations.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Tests Turn Language into Targets</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Executable Specifications:</strong> Tests
                are not just documentation - they are runnable code that objectively verifies behavior.
                Pass or fail, no ambiguity.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Immediate Feedback:</strong> A failing test
                immediately signals a problem. In code-first, hallucinated logic can hide until manual
                review or production bugs.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Convergent Development:</strong> With tests
                as targets, each iteration moves closer to correct behavior. Without tests, iterations
                may wander in wrong directions.
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
              What about property-based tests for edge cases?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Can property-based tests catch edge cases that unit tests miss?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Property-Based Testing</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Properties generate many test cases automatically
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px' }}>Example Property Tests:</h4>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: colors.code, background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}># Property: add is commutative</span>
              </div>
              <div>for_all(a, b): add(a, b) == add(b, a)</div>
              <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}># Property: add has identity</span>
              </div>
              <div>for_all(a): add(a, 0) == a</div>
              <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}># Property: add is associative</span>
              </div>
              <div>for_all(a, b, c): add(add(a, b), c) == add(a, add(b, c))</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Property tests generate 100s of random inputs per property. They often find edge
              cases (like integer overflow, floating point precision, empty inputs) that you
              would not think to write unit tests for.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'property_helps';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Property-based tests are powerful because they explore the input space automatically.
              They frequently discover edge cases that explicit unit tests miss, like boundary
              values and unusual combinations.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Property Testing Power</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Generative Testing:</strong> Instead of
                writing specific test cases, you define properties that should always hold. The
                framework generates random inputs to verify them.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shrinking:</strong> When a property fails,
                property testing frameworks automatically find the minimal failing example, making
                debugging easier.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Complementary to Unit Tests:</strong> Use
                unit tests for specific known cases and property tests to explore unknown territory.
                Together they provide comprehensive coverage.
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
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
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
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Achievement</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand test-first prompting for reliable LLM code generation
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Tests provide objective, executable specifications</li>
              <li>Test-first makes failures visible immediately</li>
              <li>Code converges faster toward correct behavior with tests</li>
              <li>Property-based tests catch edge cases automatically</li>
              <li>Coverage maps show which code paths are verified</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TestFirstPromptingRenderer;
