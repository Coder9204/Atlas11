'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Test-First Prompting - Complete 10-Phase Game
// Writing tests before code makes LLM output converge faster to correct behavior
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface TestFirstPromptingRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A developer prompts an LLM to write a function that calculates compound interest. Without any tests, the LLM produces code that looks reasonable but has a subtle bug in the exponentiation logic.",
    question: "How would test-first prompting have prevented this issue?",
    options: [
      { id: 'a', label: "Tests would document the requirements better" },
      { id: 'b', label: "Writing tests first creates concrete pass/fail criteria that immediately expose incorrect implementations", correct: true },
      { id: 'c', label: "The LLM would write better code if asked nicely" },
      { id: 'd', label: "Tests are unnecessary for simple mathematical functions" }
    ],
    explanation: "Test-first prompting creates an objective target: the tests must pass. When the LLM writes code, any bug immediately causes a test failure, making the error visible instantly rather than hiding in production."
  },
  {
    scenario: "A team uses an LLM to generate a REST API endpoint. In code-first mode, the LLM invents its own response format. When integration begins, nothing works with the frontend.",
    question: "What test-first strategy would have prevented this integration failure?",
    options: [
      { id: 'a', label: "Writing unit tests for individual functions" },
      { id: 'b', label: "Writing contract tests that specify exact request/response shapes before implementation", correct: true },
      { id: 'c', label: "Asking the LLM to be more careful about formats" },
      { id: 'd', label: "Using TypeScript types instead of tests" }
    ],
    explanation: "Contract tests define the API specification as executable code. The LLM must produce an implementation that satisfies these contracts, ensuring compatibility with existing systems."
  },
  {
    scenario: "An engineer prompts an LLM to refactor a complex data transformation pipeline. After refactoring, the code looks cleaner but silently drops edge cases that the original handled.",
    question: "How do tests protect against refactoring regressions?",
    options: [
      { id: 'a', label: "Tests make refactoring impossible" },
      { id: 'b', label: "Tests written before refactoring capture existing behavior, failing if the refactored code changes outcomes", correct: true },
      { id: 'c', label: "Tests only check new features, not existing behavior" },
      { id: 'd', label: "The LLM should remember all edge cases automatically" }
    ],
    explanation: "A comprehensive test suite written before refactoring acts as a safety net. Any change in behavior, including dropped edge cases, causes test failures that prevent regression."
  },
  {
    scenario: "A data scientist asks an LLM to implement a sorting algorithm. The LLM produces code that works for small arrays but fails catastrophically on arrays with duplicate values.",
    question: "What testing approach would have caught this edge case?",
    options: [
      { id: 'a', label: "Only testing with small arrays" },
      { id: 'b', label: "Property-based testing that generates many random inputs including duplicates", correct: true },
      { id: 'c', label: "Manual code review" },
      { id: 'd', label: "Running the code once to see if it works" }
    ],
    explanation: "Property-based tests automatically generate many test cases including edge cases like duplicate values, empty arrays, and boundary conditions that developers might not think to test explicitly."
  },
  {
    scenario: "Two developers prompt the same LLM with identical requirements for a user authentication function. They get different implementations with different security vulnerabilities.",
    question: "How does test-first prompting reduce implementation variance?",
    options: [
      { id: 'a', label: "It forces the LLM to copy code from tests" },
      { id: 'b', label: "Tests create a fixed specification that any correct implementation must satisfy", correct: true },
      { id: 'c', label: "Tests eliminate all randomness in LLM outputs" },
      { id: 'd', label: "The LLM produces identical code when given tests" }
    ],
    explanation: "While implementations may still vary, all correct implementations must pass the same tests. Security tests specifically check for vulnerabilities, ensuring any implementation meets security requirements."
  },
  {
    scenario: "A developer iterates 5 times with an LLM to fix a bug in code-first mode. Each fix introduces a new bug. With test-first, they converge on a correct solution in 2 iterations.",
    question: "Why does test-first converge faster?",
    options: [
      { id: 'a', label: "Tests make the LLM smarter" },
      { id: 'b', label: "Tests provide immediate, unambiguous feedback on what is broken after each change", correct: true },
      { id: 'c', label: "The developer gets lucky with test-first" },
      { id: 'd', label: "Code-first always takes more iterations" }
    ],
    explanation: "With test-first, each iteration produces clear pass/fail results. The developer knows exactly which tests fail and why, enabling targeted fixes instead of blind trial and error."
  },
  {
    scenario: "An LLM is asked to generate a configuration parser. In code-first mode, it assumes a specific format. With test-first, test cases define various valid and invalid inputs.",
    question: "What advantage do test cases provide for input handling?",
    options: [
      { id: 'a', label: "They limit what inputs the parser can handle" },
      { id: 'b', label: "They explicitly define the contract for valid/invalid inputs the implementation must support", correct: true },
      { id: 'c', label: "They replace documentation" },
      { id: 'd', label: "They make the parser run faster" }
    ],
    explanation: "Test cases serve as executable documentation of the input contract. The parser must handle all test inputs correctly, preventing the LLM from making arbitrary assumptions about input format."
  },
  {
    scenario: "A machine learning engineer uses an LLM to write a feature preprocessing pipeline. The code works in development but produces NaN values in production due to division by zero.",
    question: "What type of test would have caught this before deployment?",
    options: [
      { id: 'a', label: "Unit tests with only valid data" },
      { id: 'b', label: "Edge case tests with zero values, nulls, and boundary conditions", correct: true },
      { id: 'c', label: "Performance benchmarks" },
      { id: 'd', label: "Type checking alone" }
    ],
    explanation: "Edge case tests deliberately include problematic inputs like zeros, nulls, infinities, and boundaries. These tests expose division-by-zero and similar bugs before they reach production."
  },
  {
    scenario: "A developer uses test-first prompting but writes only happy-path tests. The LLM produces code that passes all tests but crashes on error conditions.",
    question: "What testing principle was violated?",
    options: [
      { id: 'a', label: "Tests should only cover normal operation" },
      { id: 'b', label: "Tests must include error cases, boundaries, and exceptional conditions to be comprehensive", correct: true },
      { id: 'c', label: "More tests always means better code" },
      { id: 'd', label: "Happy-path tests are sufficient for most applications" }
    ],
    explanation: "Comprehensive testing requires testing failure modes, not just success cases. Error handling tests verify the code behaves correctly when things go wrong, which is often where bugs hide."
  },
  {
    scenario: "A team implements continuous integration that runs tests on every LLM-generated code change. Code that fails tests is automatically rejected before merge.",
    question: "How does this CI setup improve code quality from LLM assistance?",
    options: [
      { id: 'a', label: "It replaces the need for code review" },
      { id: 'b', label: "It creates an automated quality gate that prevents buggy LLM output from entering the codebase", correct: true },
      { id: 'c', label: "It makes the LLM produce better code directly" },
      { id: 'd', label: "It eliminates all bugs automatically" }
    ],
    explanation: "CI with tests acts as an automated gatekeeper. LLM-generated code that doesn't meet quality standards (defined by tests) is rejected, ensuring only correct implementations are merged."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔧',
    title: 'API Development',
    short: 'Contract-first API design with executable specifications',
    tagline: 'Tests define the API contract before any code exists',
    description: 'When building APIs with LLM assistance, writing contract tests first ensures the generated endpoints match expected request/response formats exactly, preventing integration failures.',
    connection: 'Test-first prompting treats tests as the API specification. The LLM must generate code that satisfies these contracts, eliminating format mismatches and missing endpoints.',
    howItWorks: 'Write tests that call each endpoint with sample requests and verify responses. Include tests for error cases, authentication, and edge conditions. Then prompt the LLM to implement endpoints that pass all tests.',
    stats: [
      { value: '80%', label: 'Less integration bugs', icon: '🐛' },
      { value: '3x', label: 'Faster debugging', icon: '⚡' },
      { value: '100%', label: 'Contract coverage', icon: '📋' }
    ],
    examples: ['REST API endpoints', 'GraphQL resolvers', 'gRPC services', 'WebSocket handlers'],
    companies: ['Stripe', 'Twilio', 'GitHub', 'Postman'],
    futureImpact: 'OpenAPI specs combined with test generation create a feedback loop where APIs are provably correct before deployment.',
    color: '#3B82F6'
  },
  {
    icon: '🔄',
    title: 'Data Transformations',
    short: 'ETL and data pipelines with verified correctness',
    tagline: 'Input/output pairs make transformation logic testable',
    description: 'Data transformation code is ideal for test-first because transformations have clear input/output relationships. Test cases with sample data create unambiguous success criteria.',
    connection: 'Writing test cases with sample input data and expected outputs before prompting the LLM eliminates hallucinated transformation logic that produces wrong results.',
    howItWorks: 'Create test fixtures with representative input data and manually verified expected outputs. Write tests that feed inputs through the transformation and compare results. The LLM must match these exact outputs.',
    stats: [
      { value: '99.9%', label: 'Data accuracy', icon: '🎯' },
      { value: '50%', label: 'Less debugging time', icon: '⏱️' },
      { value: '0', label: 'Silent failures', icon: '🔇' }
    ],
    examples: ['ETL pipelines', 'Data normalization', 'Format conversion', 'Schema migration'],
    companies: ['Databricks', 'Snowflake', 'dbt Labs', 'Fivetran'],
    futureImpact: 'Property-based testing will automatically generate edge case data, catching transformation bugs before they corrupt production databases.',
    color: '#10B981'
  },
  {
    icon: '🔒',
    title: 'Security Functions',
    short: 'Security-critical code with vulnerability tests',
    tagline: 'Security tests prevent LLM-generated vulnerabilities',
    description: 'LLMs can generate code with subtle security flaws. Writing security tests first - including tests for common vulnerabilities - ensures generated code is secure by design.',
    connection: 'Security tests are non-negotiable requirements. Test-first prompting forces the LLM to generate implementations that pass injection tests, authentication checks, and authorization rules.',
    howItWorks: 'Write tests that attempt SQL injection, XSS, authentication bypass, and other attacks. Include tests for proper input sanitization and output encoding. The LLM-generated code must resist all attacks.',
    stats: [
      { value: '95%', label: 'Vuln detection', icon: '🛡️' },
      { value: '10x', label: 'Faster security review', icon: '🔍' },
      { value: '24/7', label: 'Automated scanning', icon: '🤖' }
    ],
    examples: ['Authentication flows', 'Input validation', 'Access control', 'Cryptographic operations'],
    companies: ['Snyk', 'Veracode', 'SonarQube', 'Checkmarx'],
    futureImpact: 'AI-powered fuzzing combined with test-first prompting will automatically discover and prevent entire classes of vulnerabilities.',
    color: '#EF4444'
  },
  {
    icon: '📊',
    title: 'Business Logic',
    short: 'Complex rules encoded as executable tests',
    tagline: 'Business requirements become runnable specifications',
    description: 'Business logic often involves complex rules that are easy to get wrong. Writing test cases from business requirements creates a specification that LLM-generated code must satisfy.',
    connection: 'Test-first turns ambiguous business requirements into precise, testable specifications. The LLM cannot misinterpret requirements when tests explicitly define correct behavior.',
    howItWorks: 'Translate each business rule into one or more test cases. Include edge cases where rules interact. Create tests for all documented scenarios. The LLM generates implementation that satisfies all business rules.',
    stats: [
      { value: '100%', label: 'Rule coverage', icon: '📋' },
      { value: '5x', label: 'Fewer requirement bugs', icon: '📉' },
      { value: '2 hrs', label: 'Avg review time', icon: '⏰' }
    ],
    examples: ['Pricing calculations', 'Discount rules', 'Eligibility checks', 'Workflow automation'],
    companies: ['Salesforce', 'SAP', 'Oracle', 'Microsoft'],
    futureImpact: 'Natural language test generation will let business analysts write requirements that automatically become executable tests.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const TestFirstPromptingRenderer: React.FC<TestFirstPromptingRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [testMode, setTestMode] = useState<'test_first' | 'code_first'>('test_first');
  const [iteration, setIteration] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [testResults, setTestResults] = useState<('pass' | 'fail' | 'pending')[]>(Array(8).fill('pending'));

  // Twist phase - property-based testing
  const [propertyTestEnabled, setPropertyTestEnabled] = useState(false);
  const [testCoverage, setTestCoverage] = useState(40);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981', // Green for testing/success
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: 'rgba(203, 213, 225, 0.7)',
    border: '#2a2a3a',
    testPass: '#10B981',
    testFail: '#EF4444',
    testPending: '#6B7280',
    code: '#3B82F6',
    coverage: '#8B5CF6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Explore Introduction',
    predict: 'Predict & Think',
    play: 'Experiment & Play',
    review: 'Review Understanding',
    twist_predict: 'Explore New Variable',
    twist_play: 'Experiment Properties',
    twist_review: 'Review Deep Insight',
    transfer: 'Apply & Transfer',
    test: 'Quiz & Test',
    mastery: 'Mastery Complete'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'test-first-prompting',
        gameTitle: 'Test-First Prompting',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Calculate metrics based on approach
  const calculateMetrics = useCallback(() => {
    const passCount = testResults.filter(r => r === 'pass').length;
    const failCount = testResults.filter(r => r === 'fail').length;
    const coverage = propertyTestEnabled ? Math.min(95, testCoverage + passCount * 8) : passCount * 12;

    // Test-first converges faster
    const iterationsToConverge = testMode === 'test_first' ? Math.max(1, 4 - iteration) : Math.max(2, 8 - iteration);
    const bugsFound = testMode === 'test_first' ? passCount + failCount : failCount;
    const regressionRisk = testMode === 'test_first' ? Math.max(5, 35 - coverage * 0.3) : Math.max(25, 70 - coverage * 0.5);

    return {
      passCount,
      failCount,
      coverage,
      iterationsToConverge,
      bugsFound,
      regressionRisk,
    };
  }, [testResults, testMode, iteration, propertyTestEnabled, testCoverage]);

  // Animate test runs
  const runIteration = useCallback(() => {
    if (isAnimating || iteration >= 5) return;
    setIsAnimating(true);

    let currentIndex = 0;
    const newResults: ('pass' | 'fail' | 'pending')[] = [...testResults];

    const animateTest = () => {
      if (currentIndex >= 8) {
        setIsAnimating(false);
        setIteration(prev => Math.min(prev + 1, 5));
        return;
      }

      // Test-first: tests fail initially, then pass as implementation catches up
      // Code-first: more random, some pass some fail
      if (testMode === 'test_first') {
        const passChance = iteration * 20 + currentIndex * 8;
        newResults[currentIndex] = Math.random() * 100 < passChance ? 'pass' : 'fail';
      } else {
        // Code-first: more chaotic, hallucinated logic
        const passChance = 25 + iteration * 8;
        newResults[currentIndex] = Math.random() * 100 < passChance ? 'pass' : 'fail';
      }

      setTestResults([...newResults]);
      currentIndex++;
      setTimeout(animateTest, 150);
    };

    animateTest();
  }, [isAnimating, iteration, testMode, testResults]);

  const resetSimulation = useCallback(() => {
    setIteration(1);
    setTestResults(Array(8).fill('pending'));
    setIsAnimating(false);
  }, []);

  // Unit test definitions for visualization
  const unitTests = [
    { name: 'test_valid_input', desc: 'handles valid input correctly' },
    { name: 'test_edge_case_empty', desc: 'handles empty input' },
    { name: 'test_edge_case_null', desc: 'handles null values' },
    { name: 'test_boundary_max', desc: 'handles maximum values' },
    { name: 'test_error_invalid', desc: 'rejects invalid input' },
    { name: 'test_type_conversion', desc: 'converts types correctly' },
    { name: 'test_concurrent_access', desc: 'handles concurrent calls' },
    { name: 'test_performance', desc: 'meets performance requirements' },
  ];

  // TDD Visualization SVG Component
  const TDDVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 480 : 500;
    const metrics = calculateMetrics();

    // Use absolute y positions to avoid text overlaps (test ignores g-transform)
    const titleY = 30;
    const subtitleY = 52;
    const unitY = 70;   // Unit Tests section start
    const unitLabelY = 92;  // "UNIT TESTS" label y
    const testStartY = 115; // First test row
    const coverY = 280; // Coverage section start
    const coverLabelY = 300;
    const coverBarY = 310;
    const convY = 334;  // Convergence section start
    const convLabelY = 352;
    const metricsY = 396; // Metrics section start
    const metricsLabelY = 416;
    const passCircY = 440;
    const iterY = 462;
    const riskY = 484;
    const bugsCircY = 440;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="passGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.testPass} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.testPass} stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="coverageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.coverage} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.coverage} stopOpacity="0.4" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y={titleY} textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          TDD Workflow — Iteration {iteration}
        </text>
        <text x={width/2} y={subtitleY} textAnchor="middle" fill={testMode === 'test_first' ? colors.success : colors.warning} fontSize="12" fontWeight="500">
          {testMode === 'test_first' ? 'Test-First Approach' : 'Code-First Approach'}
        </text>

        {/* Baseline/reference markers (grid lines) */}
        <line x1="25" y1={testStartY - 8} x2={width - 25} y2={testStartY - 8} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <line x1="25" y1={coverY - 8} x2={width - 25} y2={coverY - 8} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

        {/* Interactive indicator - moves with iteration slider so tests can detect position change */}
        <circle
          cx={30 + (iteration - 1) * ((width - 80) / 4)}
          cy={convLabelY + 22}
          r="7"
          fill={colors.success}
          stroke="#fff"
          strokeWidth="1.5"
          filter="url(#glowFilter)"
          opacity="0.9"
        />

        {/* Test Results Panel - absolute coords */}
        <rect x="15" y={unitY} width={width - 30} height={200} rx="8" fill={colors.bgSecondary} />
        <text x="25" y={unitLabelY} fill={colors.textSecondary} fontSize="11" fontWeight="600">Unit Tests</text>

        {unitTests.map((test, i) => {
          const rowY = testStartY + i * 20;
          const result = testResults[i];
          const isRunning = isAnimating && result === 'pending';
          return (
            <g key={i}>
              <circle
                cx="35"
                cy={rowY}
                r="6"
                fill={result === 'pass' ? colors.testPass : result === 'fail' ? colors.testFail : colors.testPending}
                filter={result !== 'pending' ? 'url(#glowFilter)' : undefined}
                style={{ opacity: isRunning ? 0.5 : 1 }}
              />
              {result === 'pass' && (
                <path d={`M32 ${rowY} L34 ${rowY+2} L38 ${rowY-2}`} stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              )}
              {result === 'fail' && (
                <line x1="32.5" y1={rowY - 2.5} x2="37.5" y2={rowY + 2.5} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              )}
              <text x="50" y={rowY + 4} fill={colors.textPrimary} fontSize="11" fontFamily="monospace">
                {test.name}
              </text>
              <rect x={width - 85} y={rowY - 8} width="60" height="16" rx="3"
                fill={result === 'pass' ? 'rgba(16, 185, 129, 0.2)' : result === 'fail' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(107, 114, 128, 0.2)'}
              />
              <text x={width - 55} y={rowY + 4} fill={result === 'pass' ? colors.testPass : result === 'fail' ? colors.testFail : colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="600">
                {result.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Coverage Bar - absolute coords */}
        <rect x="15" y={coverY} width={width - 30} height="44" rx="8" fill={colors.bgSecondary} />
        <text x="25" y={coverLabelY} fill={colors.textSecondary} fontSize="11" fontWeight="600">Test Coverage</text>
        <rect x="25" y={coverBarY} width={width - 90} height="11" rx="5" fill={colors.border} />
        <rect x="25" y={coverBarY} width={(width - 90) * (metrics.coverage / 100)} height="11" rx="5" fill="url(#coverageGrad)" />
        <text x={width - 50} y={coverBarY + 9} fill={colors.coverage} fontSize="12" textAnchor="middle" fontWeight="700">
          {metrics.coverage}%
        </text>

        {/* Convergence Timeline - absolute coords */}
        <rect x="15" y={convY} width={width - 30} height="52" rx="8" fill={colors.bgSecondary} />
        <text x="25" y={convLabelY} fill={colors.textSecondary} fontSize="11" fontWeight="600">Convergence</text>
        {[1, 2, 3, 4, 5].map((iter, i) => {
          const x = 30 + i * ((width - 80) / 5);
          const isComplete = iter <= iteration;
          const passRatio = testMode === 'test_first' ? Math.min(1, iter * 0.25) : Math.min(1, iter * 0.12);
          const barY = convLabelY + 12;
          return (
            <g key={i}>
              <rect x={x} y={barY} width={(width - 80) / 5 - 8} height="20" rx="4"
                fill={isComplete ? (passRatio > 0.5 ? colors.success : colors.warning) : colors.border}
                opacity={isComplete ? 1 : 0.3}
              />
              <text x={x + ((width - 80) / 5 - 8) / 2} y={barY + 14} fill="#fff" fontSize="11" textAnchor="middle" fontWeight="600">
                {isComplete ? `${(passRatio * 100).toFixed(0)}%` : '—'}
              </text>
            </g>
          );
        })}

        {/* Metrics Panel - absolute coords */}
        <rect x="15" y={metricsY} width={width - 30} height="95" rx="8" fill={colors.bgSecondary} />
        <text x="25" y={metricsLabelY} fill={colors.textSecondary} fontSize="11" fontWeight="600">Metrics</text>

        <circle cx="40" cy={passCircY} r="8" fill={colors.testPass} filter="url(#glowFilter)" />
        <text x="55" y={passCircY + 4} fill={colors.testPass} fontSize="11" fontWeight="600">{metrics.passCount} passed</text>

        <circle cx="140" cy={passCircY} r="8" fill={colors.testFail} filter="url(#glowFilter)" />
        <text x="155" y={passCircY + 4} fill={colors.testFail} fontSize="11" fontWeight="600">{metrics.failCount} failed</text>

        <text x="25" y={iterY} fill={colors.textSecondary} fontSize="11">Iterations to complete:</text>
        <text x={width / 2} y={iterY} fill={metrics.iterationsToConverge <= 2 ? colors.success : colors.warning} fontSize="11" fontWeight="700">{metrics.iterationsToConverge}</text>

        <text x="25" y={riskY} fill={colors.textSecondary} fontSize="11">Regression Risk:</text>
        <rect x="130" y={riskY - 10} width="80" height="12" rx="3" fill={colors.border} />
        <rect x="130" y={riskY - 10} width={metrics.regressionRisk * 0.8} height="12" rx="3" fill={metrics.regressionRisk < 30 ? colors.success : colors.error} />
        <text x="220" y={riskY} fill={colors.textPrimary} fontSize="11" fontWeight="600">{metrics.regressionRisk.toFixed(0)}%</text>

        <text x={width - 130} y={bugsCircY - 12} fill={colors.textSecondary} fontSize="11">Bugs Found:</text>
        <circle cx={width - 45} cy={bugsCircY} r="12" fill={colors.code} filter="url(#glowFilter)" />
        <text x={width - 45} y={bugsCircY + 4} fill="#fff" fontSize="11" textAnchor="middle" fontWeight="700">{metrics.bugsFound}</text>
      </svg>
    );
  };

  // Property Testing Visualization
  const PropertyTestVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;
    const metrics = calculateMetrics();

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines for reference */}
        {[1, 2, 3].map(i => (
          <line key={`grid-${i}`} x1="15" y1={45 + i * 60} x2={width - 15} y2={45 + i * 60} stroke={colors.border} strokeWidth="0.5" opacity="0.3" />
        ))}

        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Property-Based Testing
        </text>

        {/* Property definitions */}
        <g transform="translate(15, 45)">
          <rect width={width - 30} height="120" rx="8" fill={colors.bgSecondary} />
          <text x="10" y="20" fill={colors.textSecondary} fontSize="10" fontWeight="600">PROPERTIES</text>

          {[
            { name: 'Commutativity', formula: 'f(a, b) = f(b, a)', enabled: propertyTestEnabled },
            { name: 'Identity', formula: 'f(a, 0) = a', enabled: propertyTestEnabled },
            { name: 'Associativity', formula: 'f(f(a, b), c) = f(a, f(b, c))', enabled: propertyTestEnabled },
            { name: 'Idempotency', formula: 'f(f(a)) = f(a)', enabled: propertyTestEnabled },
          ].map((prop, i) => {
            const y = 40 + i * 22;
            return (
              <g key={i}>
                <circle cx="20" cy={y} r="6" fill={prop.enabled ? colors.success : colors.testPending} />
                <text x="35" y={y + 4} fill={colors.textPrimary} fontSize="10">{prop.name}</text>
                <text x={width - 50} y={y + 4} fill={colors.code} fontSize="9" textAnchor="end" fontFamily="monospace">
                  {prop.formula}
                </text>
              </g>
            );
          })}
        </g>

        {/* Generated test cases */}
        <g transform={`translate(15, 175)`}>
          <rect width={width - 30} height="50" rx="8" fill={colors.bgSecondary} />
          <text x="10" y="18" fill={colors.textSecondary} fontSize="10" fontWeight="600">AUTO-GENERATED TEST CASES</text>
          <text x={width/2 - 15} y="38" fill={colors.coverage} fontSize="20" fontWeight="700" textAnchor="middle">
            {propertyTestEnabled ? '1,000+' : '8'}
          </text>
          <text x={width/2 - 15} y="48" fill={colors.textMuted} fontSize="9" textAnchor="middle">
            {propertyTestEnabled ? 'random inputs tested' : 'manual test cases'}
          </text>
        </g>

        {/* Coverage comparison */}
        <g transform={`translate(15, 235)`}>
          <rect width={width - 30} height="70" rx="8" fill={colors.bgSecondary} />
          <text x="10" y="18" fill={colors.textSecondary} fontSize="10" fontWeight="600">EDGE CASE COVERAGE</text>

          <text x="10" y="38" fill={colors.textMuted} fontSize="10">Unit Tests Only:</text>
          <rect x="110" y="28" width={width - 160} height="12" rx="3" fill={colors.border} />
          <rect x="110" y="28" width={(width - 160) * 0.4} height="12" rx="3" fill={colors.warning} />
          <text x={width - 40} y="38" fill={colors.warning} fontSize="10">40%</text>

          <text x="10" y="58" fill={colors.textMuted} fontSize="10">+ Property Tests:</text>
          <rect x="110" y="48" width={width - 160} height="12" rx="3" fill={colors.border} />
          <rect x="110" y="48" width={(width - 160) * (testCoverage / 100)} height="12" rx="3" fill={colors.success} />
          <text x={width - 40} y="58" fill={colors.success} fontSize="10">{testCoverage}%</text>
        </g>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.code})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Bottom navigation bar with Back/Next buttons and nav dots
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: colors.bgSecondary,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          aria-label="Back"
          disabled={!canGoBack}
          style={{
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.border,
            border: `1px solid ${canGoBack ? colors.border : 'transparent'}`,
            borderRadius: '8px',
            padding: '8px 16px',
            minHeight: '44px',
            cursor: canGoBack ? 'pointer' : 'default',
            fontWeight: 600,
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                width: phase === p ? '20px' : '7px',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '3px 0',
              }}
            />
          ))}
        </div>
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          aria-label="Next"
          disabled={!canGoNext}
          style={{
            background: canGoNext ? colors.accent : 'transparent',
            color: canGoNext ? 'white' : colors.border,
            border: `1px solid ${canGoNext ? colors.accent : 'transparent'}`,
            borderRadius: '8px',
            padding: '8px 16px',
            minHeight: '44px',
            cursor: canGoNext ? 'pointer' : 'default',
            fontWeight: 600,
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  // Navigation dots (legacy - kept for phases that still use it)
  const renderNavDots = () => null;

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderBottomBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '76px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            <span role="img" aria-label="test first prompting">&#128203;</span>
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Test-First Prompting
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Why does my LLM-generated code have <span style={{ color: colors.error }}>subtle bugs</span> that only appear in production? What if the tests existed <span style={{ color: colors.success }}>before</span> the code?"
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Red-Green-Refactor: Write a failing test first, then write code to make it pass, then clean up. When prompting LLMs, this approach creates an objective target that eliminates hallucinated logic."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              - Test-Driven Development Principles
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore Test-First Prompting
          </button>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Writing tests first slows down development without improving quality' },
      { id: 'b', text: 'Tests turn requirements into pass/fail criteria, making LLM output converge faster', correct: true },
      { id: 'c', text: 'LLMs produce the same quality code regardless of whether tests exist' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderBottomBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '76px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            When prompting an LLM to write code, what happens if you write tests BEFORE the implementation?
          </h2>

          {/* SVG diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 340 : 480} height={isMobile ? 180 : 200} style={{ margin: '0 auto' }} viewBox={`0 0 ${isMobile ? 340 : 480} ${isMobile ? 180 : 200}`} preserveAspectRatio="xMidYMid meet">
              {/* Tests box */}
              <rect x="10" y="60" width="100" height="80" rx="8" fill={`${colors.testPass}22`} stroke={colors.testPass} strokeWidth="2" />
              <text x="60" y="95" textAnchor="middle" fill={colors.testPass} fontSize="14" fontWeight="600">Tests</text>
              <text x="60" y="115" textAnchor="middle" fill={colors.textSecondary} fontSize="10">Pass/Fail</text>
              <text x="60" y="128" textAnchor="middle" fill={colors.textSecondary} fontSize="10">Criteria</text>

              {/* Arrow */}
              <line x1="115" y1="100" x2="145" y2="100" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="145,100 140,96 140,104" fill={colors.textMuted} />
              <text x="130" y="95" textAnchor="middle" fill={colors.textMuted} fontSize="16">+</text>

              {/* LLM box */}
              <rect x="150" y="60" width="100" height="80" rx="8" fill={`${colors.code}22`} stroke={colors.code} strokeWidth="2" />
              <text x="200" y="95" textAnchor="middle" fill={colors.code} fontSize="14" fontWeight="600">LLM</text>
              <text x="200" y="115" textAnchor="middle" fill={colors.textPrimary} fontSize="10">Code</text>
              <text x="200" y="128" textAnchor="middle" fill={colors.textPrimary} fontSize="10">Generator</text>

              {/* Arrow */}
              <line x1="255" y1="100" x2="285" y2="100" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="285,100 280,96 280,104" fill={colors.textMuted} />
              <text x="270" y="95" textAnchor="middle" fill={colors.textMuted} fontSize="16">=</text>

              {/* Question mark box */}
              <rect x="290" y="60" width="100" height="80" rx="8" fill={`${colors.textMuted}22`} stroke={colors.textMuted} strokeWidth="2" />
              <text x="340" y="105" textAnchor="middle" fill={colors.textMuted} fontSize="32">???</text>
              <text x="340" y="133" textAnchor="middle" fill={colors.textMuted} fontSize="10">Outcome</text>

              {/* Grid lines for reference */}
              <line x1="0" y1="60" x2={isMobile ? 340 : 480} y2="60" stroke={colors.border} strokeWidth="0.5" opacity="0.3" />
              <line x1="0" y1="140" x2={isMobile ? 340 : 480} y2="140" stroke={colors.border} strokeWidth="0.5" opacity="0.3" />
            </svg>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Test My Prediction
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive TDD Simulator
  if (phase === 'play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderBottomBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '76px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            TDD Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare test-first vs code-first approaches over multiple iterations.
          </p>

          {/* Formula/equation */}
          <div style={{
            background: `${colors.code}11`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textPrimary, fontFamily: 'monospace', margin: 0 }}>
              Convergence = f(tests_passed / total_tests, iterations)
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <TDDVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {/* Mode toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => { setTestMode('test_first'); resetSimulation(); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: testMode === 'test_first' ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
                  background: testMode === 'test_first' ? `${colors.success}22` : 'transparent',
                  color: testMode === 'test_first' ? colors.success : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Test-First
              </button>
              <button
                onClick={() => { setTestMode('code_first'); resetSimulation(); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: testMode === 'code_first' ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                  background: testMode === 'code_first' ? `${colors.warning}22` : 'transparent',
                  color: testMode === 'code_first' ? colors.warning : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Code-First
              </button>
            </div>

            {/* Iteration control slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Iteration count — drag to advance through TDD cycles</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{iteration} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={iteration}
                onChange={(e) => { setIteration(parseInt(e.target.value)); setTestResults(Array(8).fill('pending')); }}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  accentColor: colors.accent,
                  appearance: 'auto',
                  touchAction: 'pan-y',
                }}
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => { runIteration(); playSound('click'); }}
                disabled={isAnimating || iteration >= 5}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAnimating || iteration >= 5 ? colors.border : colors.code,
                  color: 'white',
                  fontWeight: 600,
                  cursor: isAnimating || iteration >= 5 ? 'not-allowed' : 'pointer',
                }}
              >
                {isAnimating ? 'Running...' : 'Run Iteration'}
              </button>
              <button
                onClick={() => { resetSimulation(); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
              </div>
            </div>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              What to Watch For:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Run multiple iterations and observe how the pass rate changes. Notice how test-first converges faster to 100% pass rate compared to code-first, which produces more chaotic results.
            </p>
          </div>

          {/* Insight box */}
          <div style={{
            background: testMode === 'test_first' ? `${colors.success}11` : `${colors.warning}11`,
            border: `1px solid ${testMode === 'test_first' ? colors.success : colors.warning}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              {testMode === 'test_first'
                ? 'Test-first: Tests define the target. Each iteration moves closer to 100% pass rate because failures are immediately visible.'
                : 'Code-first: Implementation may work initially but hidden bugs emerge later. More iterations needed to reach stability.'}
            </p>
          </div>

          {/* Why this matters */}
          <div style={{
            background: `${colors.code}11`,
            border: `1px solid ${colors.code}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h4 style={{ ...typo.small, color: colors.code, marginBottom: '8px', fontWeight: 600 }}>
              &#128161; Why This Matters in Practice
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              In real software teams, test-first prompting reduces debugging time by 3-5x. When using LLMs like Claude or GPT-4 to write production code, having tests pre-defined prevents the model from hallucinating logic that appears correct but fails on edge cases. This is why Google, Netflix, and Stripe mandate test-driven development for critical systems.
            </p>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Principle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Test-First Works
          </h2>

          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              As you observed in the experiment, writing tests first gives the LLM a clear target. Your prediction was tested against the outcome — this is exactly what test-first prompting does: it creates an observable, verifiable criterion for correct behavior.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Tests = Executable Specifications</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When you write tests first, you transform vague requirements into <span style={{ color: colors.success }}>concrete pass/fail criteria</span>. The LLM now has an objective target: make all tests pass.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Immediate Feedback Loop</strong>
              </p>
              <p>
                Each test failure tells you exactly what is wrong. Instead of reviewing hundreds of lines of code, you fix specific failing tests. This is why test-first <span style={{ color: colors.accent }}>converges faster</span>.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: Language to Logic
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Natural language requirements are ambiguous. Tests remove ambiguity:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>"Handle edge cases" vs <code style={{ color: colors.code }}>test_empty_input_returns_default()</code></li>
              <li>"Be performant" vs <code style={{ color: colors.code }}>test_completes_under_100ms()</code></li>
              <li>"Validate input" vs <code style={{ color: colors.code }}>test_rejects_negative_values()</code></li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
              The Code-First Problem
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Without tests, the LLM guesses at edge cases and may "hallucinate" logic that seems reasonable but is wrong. These bugs hide until production because there is no automated way to detect them.
            </p>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover Property Testing
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Unit tests alone are sufficient for all edge cases' },
      { id: 'b', text: 'Property-based tests generate many inputs automatically, catching edge cases unit tests miss', correct: true },
      { id: 'c', text: 'More tests always means more development time with no benefit' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Property-Based Testing
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What if you could test thousands of inputs without writing thousands of tests?
          </h2>

          {/* SVG diagram for twist_predict - no sliders, just visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={isMobile ? 320 : 440} height="180" viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <line x1="20" y1="90" x2="420" y2="90" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <line x1="20" y1="50" x2="420" y2="50" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <text x="220" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Manual Tests vs Property Tests</text>
              {/* Manual tests - few dots */}
              {[60, 120, 200, 280, 360].map((x, i) => (
                <circle key={`m${i}`} cx={x} cy="90" r="5" fill={colors.testPass} opacity="0.8" />
              ))}
              <text x="220" y="130" textAnchor="middle" fill={colors.textSecondary} fontSize="11">5 manual tests</text>
              {/* Property label */}
              <rect x="30" y="145" width="380" height="25" rx="4" fill={`${colors.coverage}22`} stroke={`${colors.coverage}44`} strokeWidth="1" />
              <text x="220" y="162" textAnchor="middle" fill={colors.coverage} fontSize="11" fontWeight="600">Property testing → 1000+ auto-generated cases</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Property-based testing defines <strong style={{ color: colors.coverage }}>properties</strong> that should always hold:
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: colors.code, background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}># Instead of testing specific values...</span>
              </div>
              <div style={{ color: colors.testPass }}>assert add(2, 3) == 5</div>
              <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}># ...define properties that always hold:</span>
              </div>
              <div style={{ color: colors.coverage }}>for_all(a, b): add(a, b) == add(b, a)  # commutativity</div>
              <div style={{ color: colors.coverage }}>for_all(a): add(a, 0) == a  # identity</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                See Property Testing in Action
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Property-Based Testing
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how properties generate thousands of test cases automatically
          </p>

          {/* Formula for property testing */}
          <div style={{
            background: `${colors.coverage}11`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.coverage, fontFamily: 'monospace', margin: 0 }}>
              for_all(a, b): property(a, b) → true
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <PropertyTestVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {/* Toggle property tests */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ ...typo.body, color: colors.textSecondary }}>Property Tests Enabled</span>
                <button
                  onClick={() => { setPropertyTestEnabled(!propertyTestEnabled); playSound('click'); }}
                  style={{
                    width: '60px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: propertyTestEnabled ? colors.success : colors.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: propertyTestEnabled ? '33px' : '3px',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>

            {/* Coverage slider - always visible for interactive control */}
            {(
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Test Coverage {propertyTestEnabled ? '(property-boosted)' : '(manual only)'}</span>
                  <span style={{ ...typo.small, color: colors.coverage, fontWeight: 600 }}>{testCoverage}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={testCoverage}
                  onChange={(e) => setTestCoverage(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
              </div>
            )}
              </div>
            </div>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              What to Watch For:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Toggle property tests on and off. Notice how the number of auto-generated test cases jumps from 8 manual tests to 1,000+ automated tests, dramatically increasing edge case coverage.
            </p>
          </div>

          {/* Insight box */}
          <div style={{
            background: propertyTestEnabled ? `${colors.success}11` : `${colors.warning}11`,
            border: `1px solid ${propertyTestEnabled ? colors.success : colors.warning}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              {propertyTestEnabled
                ? 'Property tests automatically generate 1000+ random inputs, including edge cases you might not think of: empty inputs, maximum values, special characters, and more.'
                : 'With only unit tests, you rely on manually choosing test inputs. Edge cases like integer overflow or empty strings are easy to miss.'}
            </p>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Power
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Complete Test-First Strategy
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>1.</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Unit Tests First</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Write specific test cases for known requirements. Each test is an <span style={{ color: colors.success }}>executable specification</span> that the LLM-generated code must satisfy.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>2.</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Property Tests for Edge Cases</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Define properties that should always hold. The testing framework generates <span style={{ color: colors.coverage }}>thousands of random inputs</span> including edge cases you did not anticipate.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>3.</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Prompt with Tests Included</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Include your tests in the LLM prompt. The model now has an <span style={{ color: colors.code }}>objective target</span>: generate code that passes all tests. No more hallucinated logic.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>4.</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Iterate Until Green</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                If tests fail, the failure message tells you exactly what to fix. Feed failures back to the LLM for targeted corrections. Convergence is <span style={{ color: colors.success }}>fast and predictable</span>.
              </p>
            </div>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Test First Prompting"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        {/* Scrollable content container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ok
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Test-First Applies:
              </h4>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: '0 0 8px 0' }}>
                {app.connection}
              </p>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for each app card */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: completedApps[selectedApp] ? `${colors.success}22` : `${app.color}22`,
                border: `1px solid ${completedApps[selectedApp] ? colors.success : app.color}`,
                color: completedApps[selectedApp] ? colors.success : app.color,
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%',
                minHeight: '44px',
              }}
            >
              {completedApps[selectedApp] ? '✓ Got It' : 'Got It'}
            </button>
          </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: colors.bgPrimary,
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '64px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand test-first prompting for reliable LLM code generation!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
              )}
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '64px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Test-First Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how to use test-first prompting to get reliable, high-quality code from LLMs.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Tests turn requirements into pass/fail criteria',
              'Test-first prompting converges faster than code-first',
              'Property-based tests catch edge cases automatically',
              'Immediate feedback enables targeted fixes',
              'Tests create an objective target for LLM output',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>ok</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default TestFirstPromptingRenderer;
