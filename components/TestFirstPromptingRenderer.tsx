import React, { useState, useCallback, useEffect, useRef } from 'react';

interface TestFirstPromptingRendererProps {
  gamePhase?: string;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase management
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Prediction',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'Twist Prediction',
    twist_play: 'Twist Experiment',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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
    const height = 520;
    const metrics = calculateMetrics();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium dark lab background gradient */}
            <linearGradient id="tfpLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Test panel card gradient with depth */}
            <linearGradient id="tfpCardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#1a2332" />
              <stop offset="70%" stopColor="#151d2b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* TDD workflow cycle gradient - test first (green to blue) */}
            <linearGradient id="tfpTestFirstFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="75%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Code first workflow gradient (amber to red warning) */}
            <linearGradient id="tfpCodeFirstFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Coverage bar gradient (purple spectrum) */}
            <linearGradient id="tfpCoverageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="75%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#d8b4fe" />
            </linearGradient>

            {/* Pass status radial glow */}
            <radialGradient id="tfpPassGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Fail status radial glow */}
            <radialGradient id="tfpFailGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#dc2626" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Pending status radial glow */}
            <radialGradient id="tfpPendingGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#9ca3af" stopOpacity="1" />
              <stop offset="40%" stopColor="#6b7280" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#4b5563" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#374151" stopOpacity="0" />
            </radialGradient>

            {/* Running/animating test glow */}
            <radialGradient id="tfpRunningGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Iteration progress gradient */}
            <linearGradient id="tfpIterationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="30%" stopColor="#14b8a6" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Metrics panel brushed metal effect */}
            <linearGradient id="tfpBrushedMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Header title gradient */}
            <linearGradient id="tfpTitleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Pass status glow filter */}
            <filter id="tfpPassGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Fail status glow filter */}
            <filter id="tfpFailGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft inner glow for panels */}
            <filter id="tfpPanelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Running test pulse filter */}
            <filter id="tfpPulseFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern for lab background */}
            <pattern id="tfpLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Test case row highlight gradient */}
            <linearGradient id="tfpRowHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="10%" stopColor="#1e293b" stopOpacity="0.5" />
              <stop offset="90%" stopColor="#1e293b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#tfpLabBg)" />
          <rect width={width} height={height} fill="url(#tfpLabGrid)" />

          {/* Title Section with gradient text effect */}
          <rect x={10} y={10} width={width - 20} height={50} rx={8} fill="url(#tfpCardGradient)" opacity="0.8" />
          <text x={width/2} y={32} fill="url(#tfpTitleGradient)" fontSize={15} textAnchor="middle" fontWeight="bold">
            TDD Workflow - Iteration {iteration}
          </text>
          <text x={width/2} y={50} fill={testMode === 'test_first' ? '#10b981' : '#f59e0b'} fontSize={12} textAnchor="middle" fontWeight="600">
            {testMode === 'test_first' ? 'Test-First Approach' : 'Code-First Approach'}
          </text>
          {/* Approach indicator bar */}
          <rect x={120} y={54} width={width - 240} height={3} rx={1.5} fill={testMode === 'test_first' ? 'url(#tfpTestFirstFlow)' : 'url(#tfpCodeFirstFlow)'} />

          {/* Test Results Panel */}
          <rect x={15} y={70} width={width - 30} height={210} rx={10} fill="url(#tfpCardGradient)" filter="url(#tfpPanelGlow)" />
          <rect x={15} y={70} width={width - 30} height={3} rx={1.5} fill="url(#tfpBrushedMetal)" opacity="0.5" />
          <text x={25} y={92} fill={colors.textSecondary} fontSize={11} fontWeight="bold" letterSpacing="0.5">UNIT TESTS</text>

          {unitTests.map((test, i) => {
            const y = 110 + i * 21;
            const result = testResults[i];
            const isRunning = isAnimating && result === 'pending';
            return (
              <g key={i}>
                {/* Row highlight on hover area */}
                <rect x={20} y={y - 10} width={width - 40} height={20} rx={4} fill="url(#tfpRowHighlight)" opacity="0.3" />

                {/* Status indicator with premium glow */}
                <circle
                  cx={35}
                  cy={y}
                  r={8}
                  fill={
                    result === 'pass' ? 'url(#tfpPassGlow)' :
                    result === 'fail' ? 'url(#tfpFailGlow)' :
                    isRunning ? 'url(#tfpRunningGlow)' :
                    'url(#tfpPendingGlow)'
                  }
                  filter={
                    result === 'pass' ? 'url(#tfpPassGlowFilter)' :
                    result === 'fail' ? 'url(#tfpFailGlowFilter)' :
                    isRunning ? 'url(#tfpPulseFilter)' :
                    undefined
                  }
                />
                {/* Inner circle for depth */}
                <circle
                  cx={35}
                  cy={y}
                  r={4}
                  fill={
                    result === 'pass' ? '#10b981' :
                    result === 'fail' ? '#ef4444' :
                    isRunning ? '#f59e0b' :
                    '#6b7280'
                  }
                />
                {/* Check/X icon */}
                {result === 'pass' && (
                  <path d="M32 0 L34 2 L38 -2" transform={`translate(0, ${y})`} stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                )}
                {result === 'fail' && (
                  <g transform={`translate(35, ${y})`}>
                    <line x1="-2" y1="-2" x2="2" y2="2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2" y1="-2" x2="-2" y2="2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                )}

                <text x={52} y={y + 4} fill={colors.textPrimary} fontSize={10} fontFamily="monospace">
                  {test.name}
                </text>
                <rect x={width - 75} y={y - 8} width={55} height={16} rx={4}
                  fill={result === 'pass' ? 'rgba(16, 185, 129, 0.2)' : result === 'fail' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(107, 114, 128, 0.2)'}
                />
                <text x={width - 48} y={y + 4} fill={result === 'pass' ? '#10b981' : result === 'fail' ? '#ef4444' : colors.textMuted} fontSize={9} textAnchor="middle" fontWeight="600">
                  {result.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Coverage Section */}
          <rect x={15} y={290} width={width - 30} height={45} rx={8} fill="url(#tfpCardGradient)" />
          <text x={25} y={310} fill={colors.textSecondary} fontSize={11} fontWeight="bold" letterSpacing="0.5">COVERAGE</text>
          <rect x={25} y={318} width={width - 100} height={12} rx={6} fill="#1f2937" />
          <rect x={25} y={318} width={(width - 100) * (metrics.coverage / 100)} height={12} rx={6} fill="url(#tfpCoverageGradient)" />
          <text x={width - 40} y={328} fill={colors.textPrimary} fontSize={13} textAnchor="middle" fontWeight="bold">{metrics.coverage.toFixed(0)}%</text>

          {/* Convergence Timeline */}
          <rect x={15} y={345} width={width - 30} height={55} rx={8} fill="url(#tfpCardGradient)" />
          <text x={25} y={362} fill={colors.textSecondary} fontSize={10} fontWeight="bold" letterSpacing="0.5">CONVERGENCE TIMELINE</text>

          {[1, 2, 3, 4, 5].map((iter, i) => {
            const x = 35 + i * 72;
            const isComplete = iter <= iteration;
            const passRatio = testMode === 'test_first' ? Math.min(1, iter * 0.25) : Math.min(1, iter * 0.15);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={372}
                  width={60}
                  height={22}
                  rx={6}
                  fill={isComplete ? (passRatio > 0.7 ? 'url(#tfpTestFirstFlow)' : 'url(#tfpCodeFirstFlow)') : '#1f2937'}
                  opacity={isComplete ? 1 : 0.4}
                  filter={isComplete && passRatio > 0.7 ? 'url(#tfpPassGlowFilter)' : undefined}
                />
                <text x={x + 30} y={387} fill={isComplete ? '#fff' : colors.textMuted} fontSize={11} textAnchor="middle" fontWeight="bold">
                  {isComplete ? `${(passRatio * 100).toFixed(0)}%` : '-'}
                </text>
              </g>
            );
          })}

          {/* Metrics Panel */}
          <rect x={15} y={410} width={width - 30} height={100} rx={10} fill="url(#tfpCardGradient)" filter="url(#tfpPanelGlow)" />
          <rect x={15} y={410} width={width - 30} height={3} rx={1.5} fill="url(#tfpBrushedMetal)" opacity="0.5" />
          <text x={25} y={430} fill={colors.textSecondary} fontSize={10} fontWeight="bold" letterSpacing="0.5">METRICS</text>

          {/* Pass/Fail counts */}
          <circle cx={35} cy={448} r={6} fill="url(#tfpPassGlow)" />
          <text x={48} y={452} fill={colors.testPass} fontSize={11} fontWeight="600">{metrics.passCount} passed</text>
          <circle cx={130} cy={448} r={6} fill="url(#tfpFailGlow)" />
          <text x={143} y={452} fill={colors.testFail} fontSize={11} fontWeight="600">{metrics.failCount} failed</text>

          {/* Est. iterations */}
          <text x={25} y={472} fill={colors.textSecondary} fontSize={10}>Est. iterations to 100%:</text>
          <rect x={150} y={462} width={30} height={16} rx={4} fill={metrics.iterationsToPass <= 2 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'} />
          <text x={165} y={474} fill={metrics.iterationsToPass <= 2 ? colors.success : colors.warning} fontSize={12} textAnchor="middle" fontWeight="bold">{metrics.iterationsToPass}</text>

          {/* Regression Risk bar */}
          <text x={25} y={495} fill={colors.textSecondary} fontSize={10}>Regression Risk:</text>
          <rect x={115} y={485} width={120} height={14} rx={4} fill="#1f2937" />
          <rect x={115} y={485} width={metrics.regressionRisk * 1.2} height={14} rx={4} fill={metrics.regressionRisk < 30 ? 'url(#tfpTestFirstFlow)' : 'url(#tfpCodeFirstFlow)'} />
          <text x={245} y={496} fill={colors.textPrimary} fontSize={11} fontWeight="600">{metrics.regressionRisk}%</text>

          {/* Bugs Found */}
          <text x={280} y={472} fill={colors.textSecondary} fontSize={10}>Bugs Found:</text>
          <circle cx={360} cy={468} r={12} fill="url(#tfpPassGlow)" filter="url(#tfpPassGlowFilter)" />
          <text x={360} y={472} fill="#fff" fontSize={11} textAnchor="middle" fontWeight="bold">{metrics.bugsFound}</text>
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

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      flexWrap: 'wrap',
    }}>
      {phaseOrder.map((p, index) => (
        <div
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: phase === p ? colors.accent : phaseOrder.indexOf(phase) > index ? colors.success : 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: phase === p || phaseOrder.indexOf(phase) > index ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
          title={phaseLabels[p]}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );

  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
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
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          disabled={isLast}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: isLast ? 'rgba(255,255,255,0.1)' : colors.accent,
            color: isLast ? colors.textMuted : 'white',
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'test_first';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'property_helps';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
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
          {renderBottomBar()}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderProgressBar()}
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
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default TestFirstPromptingRenderer;
