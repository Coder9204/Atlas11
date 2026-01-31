import React, { useState, useCallback, useEffect, useRef } from 'react';

interface SpecFirstPromptingRendererProps {
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
  vague: '#ef4444',
  structured: '#10b981',
  code: '#3b82f6',
  assumption: '#f97316',
};

const SpecFirstPromptingRenderer: React.FC<SpecFirstPromptingRendererProps> = ({
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

  // Simulation state
  const [promptMode, setPromptMode] = useState<'vague' | 'structured'>('vague');
  const [specLevel, setSpecLevel] = useState(2);
  const [showAssumptions, setShowAssumptions] = useState(true);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
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

  // Calculate metrics based on spec level
  const calculateMetrics = useCallback(() => {
    const assumptionCount = Math.max(0, 8 - specLevel * 1.5);
    const ambiguityScore = Math.max(5, 100 - specLevel * 20);
    const successRate = Math.min(95, 30 + specLevel * 15);
    const reworkCycles = Math.max(1, 6 - specLevel);
    const timeToCorrect = Math.max(5, 60 - specLevel * 12);

    return {
      assumptionCount: Math.round(assumptionCount),
      ambiguityScore,
      successRate,
      reworkCycles,
      timeToCorrect,
    };
  }, [specLevel]);

  const vaguePrompt = {
    text: "Build me a user authentication system",
    assumptions: [
      { text: "Email/password or social login?", severity: 'high' },
      { text: "Session duration? Token-based?", severity: 'high' },
      { text: "Password requirements?", severity: 'medium' },
      { text: "Rate limiting? CAPTCHA?", severity: 'medium' },
      { text: "Multi-factor auth needed?", severity: 'high' },
      { text: "User roles and permissions?", severity: 'medium' },
      { text: "Password reset flow?", severity: 'low' },
      { text: "Account lockout policy?", severity: 'medium' },
    ],
  };

  const structuredPrompt = {
    text: `Build a user authentication system with:
- Email/password login only (no social)
- JWT tokens, 24-hour expiration
- Passwords: min 8 chars, 1 uppercase, 1 number
- Rate limit: 5 attempts per 15 minutes
- No MFA required for MVP
- Single user role (no admin)
- Password reset via email link
- Lock account after 10 failed attempts`,
    assumptions: [
      { text: "JWT secret management?", severity: 'low' },
      { text: "Email service provider?", severity: 'low' },
    ],
  };

  const predictions = [
    { id: 'same', label: 'Both prompts will produce equally good code - AI understands intent' },
    { id: 'vague_creative', label: 'Vague prompts are better - they allow AI creativity' },
    { id: 'structured_better', label: 'Structured specs produce fewer wrong assumptions' },
    { id: 'doesnt_matter', label: 'Prompt style does not matter for simple tasks' },
  ];

  const twistPredictions = [
    { id: 'tests_enough', label: 'Unit tests alone are enough to prevent wrong assumptions' },
    { id: 'checklist_helps', label: 'Adding edge case + constraint checklists reduces errors further' },
    { id: 'no_difference', label: 'Checklists add no value beyond a good spec' },
    { id: 'slows_down', label: 'Checklists slow down development without benefit' },
  ];

  const transferApplications = [
    {
      title: 'API Design Prompts',
      description: 'When prompting for API endpoint creation, ambiguity in request/response formats causes costly rework.',
      question: 'What spec elements are essential for API prompts?',
      answer: 'Essential: HTTP methods, URL patterns, request body schema, response formats, error codes, authentication requirements, rate limits, and example payloads. Missing any of these leads to assumptions that may not match your system.',
    },
    {
      title: 'Database Schema Generation',
      description: 'LLMs generating database schemas often make wrong assumptions about relationships and constraints.',
      question: 'How can you prevent wrong database assumptions?',
      answer: 'Specify: exact field names and types, nullable/required constraints, foreign key relationships, indexes needed, default values, and validation rules. Include example data rows to clarify intent.',
    },
    {
      title: 'UI Component Prompts',
      description: 'Frontend component generation often produces components that do not match design system expectations.',
      question: 'What reduces UI prompt ambiguity?',
      answer: 'Include: design system/component library name, specific prop interfaces, state management approach, accessibility requirements, responsive breakpoints, and visual reference (Figma link or description). Reference existing components to match.',
    },
    {
      title: 'Algorithm Implementation',
      description: 'Algorithm prompts often yield solutions with wrong time/space complexity tradeoffs.',
      question: 'How do you spec algorithm requirements clearly?',
      answer: 'Specify: Big-O requirements for time and space, input size ranges, edge cases to handle, whether to optimize for speed or memory, acceptable tradeoffs, and concrete input/output examples with expected results.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why do LLMs make assumptions when given vague prompts?',
      options: [
        { text: 'LLMs are designed to always ask clarifying questions', correct: false },
        { text: 'LLMs fill gaps with patterns from training data to produce complete output', correct: true },
        { text: 'LLMs cannot process vague prompts at all', correct: false },
        { text: 'Vague prompts cause LLMs to crash', correct: false },
      ],
    },
    {
      question: 'A structured spec reduces entropy by:',
      options: [
        { text: 'Making the code run faster', correct: false },
        { text: 'Constraining the solution space so fewer interpretations are valid', correct: true },
        { text: 'Using shorter variable names', correct: false },
        { text: 'Removing the need for testing', correct: false },
      ],
    },
    {
      question: 'Which element is MOST important to include in a structured prompt?',
      options: [
        { text: 'Friendly greeting to the AI', correct: false },
        { text: 'Concrete constraints and expected behavior', correct: true },
        { text: 'Explanation of why you need the code', correct: false },
        { text: 'Multiple alternative solutions to choose from', correct: false },
      ],
    },
    {
      question: 'When an LLM assumes wrong password requirements, the root cause is:',
      options: [
        { text: 'The LLM is poorly trained', correct: false },
        { text: 'The prompt did not specify password requirements', correct: true },
        { text: 'Password validation is too complex for AI', correct: false },
        { text: 'The LLM intentionally chose wrong values', correct: false },
      ],
    },
    {
      question: 'Adding edge cases to your prompt spec helps because:',
      options: [
        { text: 'It makes the prompt longer which is always better', correct: false },
        { text: 'It explicitly covers scenarios the LLM might otherwise ignore or guess', correct: true },
        { text: 'Edge cases are required for prompt syntax', correct: false },
        { text: 'LLMs cannot generate code without edge cases', correct: false },
      ],
    },
    {
      question: 'The "assumption detector" visualization highlights:',
      options: [
        { text: 'All possible bugs in generated code', correct: false },
        { text: 'Requirements gaps where LLM must guess or assume', correct: true },
        { text: 'Performance bottlenecks', correct: false },
        { text: 'Security vulnerabilities only', correct: false },
      ],
    },
    {
      question: 'Performance constraints in prompts are important because:',
      options: [
        { text: 'They make the code look more professional', correct: false },
        { text: 'Without them, LLM may choose algorithms with wrong time/space tradeoffs', correct: true },
        { text: 'They are required by all coding standards', correct: false },
        { text: 'Performance cannot be optimized after generation', correct: false },
      ],
    },
    {
      question: 'A good spec-first prompt includes:',
      options: [
        { text: 'Only the function name and a brief description', correct: false },
        { text: 'Inputs, outputs, constraints, edge cases, and examples', correct: true },
        { text: 'Personal opinions about coding style', correct: false },
        { text: 'The complete solution for the LLM to copy', correct: false },
      ],
    },
    {
      question: 'Why might vague prompts seem to work for simple tasks?',
      options: [
        { text: 'Simple tasks have fewer decision points where assumptions matter', correct: true },
        { text: 'LLMs are smarter with short prompts', correct: false },
        { text: 'Vague prompts are actually better', correct: false },
        { text: 'Simple tasks do not require any specification', correct: false },
      ],
    },
    {
      question: 'The primary benefit of spec-first prompting is:',
      options: [
        { text: 'Faster token generation', correct: false },
        { text: 'Reducing rework cycles by aligning output with actual requirements upfront', correct: true },
        { text: 'Lower API costs', correct: false },
        { text: 'Bypassing AI safety filters', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 520;
    const metrics = calculateMetrics();
    const currentPrompt = promptMode === 'vague' ? vaguePrompt : structuredPrompt;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '720px' }}
        >
          <defs>
            {/* === PREMIUM LINEAR GRADIENTS === */}
            {/* Lab background gradient with depth */}
            <linearGradient id="sfpLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Workflow arrow gradient - vague mode (red-orange) */}
            <linearGradient id="sfpWorkflowVague" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>

            {/* Workflow arrow gradient - structured mode (green-cyan) */}
            <linearGradient id="sfpWorkflowStructured" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="75%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Document card gradient */}
            <linearGradient id="sfpDocumentCard" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Specification document header gradient */}
            <linearGradient id="sfpSpecHeader" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="70%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Code panel gradient */}
            <linearGradient id="sfpCodePanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="20%" stopColor="#27272a" />
              <stop offset="50%" stopColor="#18181b" />
              <stop offset="80%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>

            {/* LLM brain gradient */}
            <linearGradient id="sfpLlmBrain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="75%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>

            {/* Success status gradient */}
            <linearGradient id="sfpSuccessStatus" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Error status gradient */}
            <linearGradient id="sfpErrorStatus" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Warning status gradient */}
            <linearGradient id="sfpWarningStatus" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* === PREMIUM RADIAL GRADIENTS === */}
            {/* Status indicator glow - success */}
            <radialGradient id="sfpSuccessGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Status indicator glow - error */}
            <radialGradient id="sfpErrorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#dc2626" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Status indicator glow - warning */}
            <radialGradient id="sfpWarningGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* LLM processing glow */}
            <radialGradient id="sfpLlmGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
            </radialGradient>

            {/* Assumption pulse glow */}
            <radialGradient id="sfpAssumptionPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="30%" stopColor="#ea580c" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#c2410c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
            </radialGradient>

            {/* === PREMIUM GLOW FILTERS === */}
            {/* Document glow filter */}
            <filter id="sfpDocGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Success indicator glow */}
            <filter id="sfpSuccessFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Error indicator glow */}
            <filter id="sfpErrorFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Warning indicator glow */}
            <filter id="sfpWarningFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* LLM brain glow */}
            <filter id="sfpLlmFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="sfpSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="sfpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#sfpLabBg)" />
          <rect width={width} height={height} fill="url(#sfpGrid)" />

          {/* === HEADER === */}
          <text x={width/2} y={30} fill="#f8fafc" fontSize={16} textAnchor="middle" fontWeight="bold">
            Spec-First Prompting Workflow
          </text>
          <text x={width/2} y={50} fill={promptMode === 'vague' ? '#ef4444' : '#10b981'} fontSize={12} textAnchor="middle" fontWeight="600">
            {promptMode === 'vague' ? 'Vague Prompt Mode - High Assumption Risk' : 'Structured Spec Mode - Minimal Assumptions'}
          </text>

          {/* === WORKFLOW VISUALIZATION === */}
          {/* Step 1: Prompt/Spec Document */}
          <g transform="translate(30, 75)">
            {/* Document card with shadow */}
            <rect x={0} y={0} width={160} height={200} rx={8} fill="url(#sfpDocumentCard)" filter="url(#sfpSoftShadow)" />

            {/* Document header */}
            <rect x={0} y={0} width={160} height={32} rx={8} fill="url(#sfpSpecHeader)" />
            <rect x={0} y={24} width={160} height={8} fill="url(#sfpSpecHeader)" />

            {/* Header icon and text */}
            <text x={12} y={22} fill="#ffffff" fontSize={11} fontWeight="bold">
              {promptMode === 'vague' ? '📝 PROMPT' : '📋 SPECIFICATION'}
            </text>

            {/* Document content */}
            <rect x={8} y={40} width={144} height={150} rx={4} fill="#0f172a" />

            {promptMode === 'vague' ? (
              <g>
                <text x={16} y={60} fill="#94a3b8" fontSize={9}>User Request:</text>
                <text x={16} y={78} fill="#f8fafc" fontSize={10} fontWeight="600">&quot;Build me a user</text>
                <text x={16} y={92} fill="#f8fafc" fontSize={10} fontWeight="600">authentication system&quot;</text>
                <line x1={16} y1={110} x2={140} y2={110} stroke="#334155" strokeWidth={1} />
                <text x={16} y={130} fill="#ef4444" fontSize={9} fontWeight="bold">⚠ No specifications</text>
                <text x={16} y={145} fill="#ef4444" fontSize={9} fontWeight="bold">⚠ No constraints</text>
                <text x={16} y={160} fill="#ef4444" fontSize={9} fontWeight="bold">⚠ No edge cases</text>
                <text x={16} y={175} fill="#ef4444" fontSize={9} fontWeight="bold">⚠ No examples</text>
              </g>
            ) : (
              <g>
                <text x={16} y={58} fill="#10b981" fontSize={8}>✓ Email/password only</text>
                <text x={16} y={72} fill="#10b981" fontSize={8}>✓ JWT 24hr expiration</text>
                <text x={16} y={86} fill="#10b981" fontSize={8}>✓ Min 8 chars, 1 upper, 1 num</text>
                <text x={16} y={100} fill="#10b981" fontSize={8}>✓ Rate limit: 5/15min</text>
                <text x={16} y={114} fill="#10b981" fontSize={8}>✓ No MFA for MVP</text>
                <text x={16} y={128} fill="#10b981" fontSize={8}>✓ Single user role</text>
                <text x={16} y={142} fill="#10b981" fontSize={8}>✓ Email reset flow</text>
                <text x={16} y={156} fill="#10b981" fontSize={8}>✓ Lock after 10 fails</text>
                <line x1={16} y1={166} x2={140} y2={166} stroke="#334155" strokeWidth={1} />
                <text x={16} y={182} fill="#22d3ee" fontSize={9} fontWeight="bold">8 constraints defined</text>
              </g>
            )}
          </g>

          {/* Workflow arrow 1 */}
          <g transform="translate(200, 165)">
            <rect x={0} y={0} width={60} height={20} rx={4} fill={promptMode === 'vague' ? 'url(#sfpWorkflowVague)' : 'url(#sfpWorkflowStructured)'} />
            <polygon points="60,10 70,0 70,20" fill={promptMode === 'vague' ? '#ea580c' : '#06b6d4'} />
            <text x={30} y={14} fill="#ffffff" fontSize={8} textAnchor="middle" fontWeight="bold">INPUT</text>
          </g>

          {/* Step 2: LLM Processing */}
          <g transform="translate(280, 90)">
            {/* LLM brain container */}
            <ellipse cx={60} cy={85} rx={55} ry={75} fill="url(#sfpLlmBrain)" filter="url(#sfpLlmFilter)" />
            <ellipse cx={60} cy={85} rx={50} ry={70} fill="#1e1b4b" />

            {/* Brain circuits */}
            <circle cx={40} cy={65} r={8} fill="none" stroke="#a855f7" strokeWidth={1.5} opacity={0.7}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={80} cy={65} r={8} fill="none" stroke="#a855f7" strokeWidth={1.5} opacity={0.7}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={60} cy={95} r={10} fill="none" stroke="#a855f7" strokeWidth={1.5} opacity={0.7}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
            </circle>

            {/* Connecting lines */}
            <line x1={48} y1={65} x2={52} y2={85} stroke="#a855f7" strokeWidth={1} opacity={0.5} />
            <line x1={72} y1={65} x2={68} y2={85} stroke="#a855f7" strokeWidth={1} opacity={0.5} />
            <line x1={40} y1={73} x2={80} y2={73} stroke="#a855f7" strokeWidth={1} opacity={0.5} />

            {/* LLM label */}
            <text x={60} y={130} fill="#e9d5ff" fontSize={10} textAnchor="middle" fontWeight="bold">LLM</text>
            <text x={60} y={145} fill="#c4b5fd" fontSize={8} textAnchor="middle">Processing</text>

            {/* Assumption indicators */}
            {promptMode === 'vague' && (
              <g>
                <circle cx={20} cy={50} r={12} fill="url(#sfpAssumptionPulse)" filter="url(#sfpWarningFilter)">
                  <animate attributeName="r" values="10;14;10" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <text x={20} y={54} fill="#fff" fontSize={8} textAnchor="middle" fontWeight="bold">?</text>

                <circle cx={100} cy={50} r={12} fill="url(#sfpAssumptionPulse)" filter="url(#sfpWarningFilter)">
                  <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
                </circle>
                <text x={100} y={54} fill="#fff" fontSize={8} textAnchor="middle" fontWeight="bold">?</text>

                <circle cx={15} cy={110} r={12} fill="url(#sfpAssumptionPulse)" filter="url(#sfpWarningFilter)">
                  <animate attributeName="r" values="10;14;10" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <text x={15} y={114} fill="#fff" fontSize={8} textAnchor="middle" fontWeight="bold">?</text>

                <circle cx={105} cy={110} r={12} fill="url(#sfpAssumptionPulse)" filter="url(#sfpWarningFilter)">
                  <animate attributeName="r" values="10;14;10" dur="0.9s" repeatCount="indefinite" />
                </circle>
                <text x={105} y={114} fill="#fff" fontSize={8} textAnchor="middle" fontWeight="bold">?</text>
              </g>
            )}
          </g>

          {/* Workflow arrow 2 */}
          <g transform="translate(410, 165)">
            <rect x={0} y={0} width={60} height={20} rx={4} fill={promptMode === 'vague' ? 'url(#sfpWorkflowVague)' : 'url(#sfpWorkflowStructured)'} />
            <polygon points="60,10 70,0 70,20" fill={promptMode === 'vague' ? '#ea580c' : '#06b6d4'} />
            <text x={30} y={14} fill="#ffffff" fontSize={8} textAnchor="middle" fontWeight="bold">OUTPUT</text>
          </g>

          {/* Step 3: Generated Code */}
          <g transform="translate(490, 75)">
            {/* Code panel */}
            <rect x={0} y={0} width={180} height={200} rx={8} fill="url(#sfpCodePanel)" filter="url(#sfpSoftShadow)" />

            {/* Code header */}
            <rect x={0} y={0} width={180} height={28} rx={8} fill="#27272a" />
            <rect x={0} y={20} width={180} height={8} fill="#27272a" />

            {/* Window buttons */}
            <circle cx={14} cy={14} r={5} fill="#ef4444" />
            <circle cx={30} cy={14} r={5} fill="#f59e0b" />
            <circle cx={46} cy={14} r={5} fill="#10b981" />
            <text x={100} y={18} fill="#71717a" fontSize={9} textAnchor="middle">auth.ts</text>

            {/* Code content area */}
            <rect x={8} y={36} width={164} height={154} rx={4} fill="#09090b" />

            {/* Code lines */}
            <text x={14} y={52} fill="#6b7280" fontSize={8} fontFamily="monospace">1</text>
            <text x={28} y={52} fill="#c084fc" fontSize={8} fontFamily="monospace">async function</text>
            <text x={14} y={66} fill="#6b7280" fontSize={8} fontFamily="monospace">2</text>
            <text x={28} y={66} fill="#22d3ee" fontSize={8} fontFamily="monospace">  login(credentials)</text>
            <text x={14} y={80} fill="#6b7280" fontSize={8} fontFamily="monospace">3</text>
            <text x={28} y={80} fill="#a3a3a3" fontSize={8} fontFamily="monospace">{'  {'}</text>

            {promptMode === 'vague' ? (
              <g>
                <text x={14} y={94} fill="#6b7280" fontSize={8} fontFamily="monospace">4</text>
                <text x={28} y={94} fill="#fbbf24" fontSize={8} fontFamily="monospace">{'  // ASSUMED: email'}</text>
                <text x={14} y={108} fill="#6b7280" fontSize={8} fontFamily="monospace">5</text>
                <text x={28} y={108} fill="#fbbf24" fontSize={8} fontFamily="monospace">{'  // ASSUMED: bcrypt'}</text>
                <text x={14} y={122} fill="#6b7280" fontSize={8} fontFamily="monospace">6</text>
                <text x={28} y={122} fill="#fbbf24" fontSize={8} fontFamily="monospace">{'  // ASSUMED: JWT 1hr'}</text>
                <text x={14} y={136} fill="#6b7280" fontSize={8} fontFamily="monospace">7</text>
                <text x={28} y={136} fill="#fbbf24" fontSize={8} fontFamily="monospace">{'  // ASSUMED: no rate'}</text>
                <text x={14} y={150} fill="#6b7280" fontSize={8} fontFamily="monospace">8</text>
                <text x={28} y={150} fill="#ef4444" fontSize={8} fontFamily="monospace">{'  // ⚠ May not match'}</text>
                <text x={14} y={164} fill="#6b7280" fontSize={8} fontFamily="monospace">9</text>
                <text x={28} y={164} fill="#ef4444" fontSize={8} fontFamily="monospace">{'  // your requirements!'}</text>
              </g>
            ) : (
              <g>
                <text x={14} y={94} fill="#6b7280" fontSize={8} fontFamily="monospace">4</text>
                <text x={28} y={94} fill="#10b981" fontSize={8} fontFamily="monospace">{'  // Per spec: email'}</text>
                <text x={14} y={108} fill="#6b7280" fontSize={8} fontFamily="monospace">5</text>
                <text x={28} y={108} fill="#10b981" fontSize={8} fontFamily="monospace">{'  // Per spec: 24hr JWT'}</text>
                <text x={14} y={122} fill="#6b7280" fontSize={8} fontFamily="monospace">6</text>
                <text x={28} y={122} fill="#10b981" fontSize={8} fontFamily="monospace">{'  // Per spec: 5/15min'}</text>
                <text x={14} y={136} fill="#6b7280" fontSize={8} fontFamily="monospace">7</text>
                <text x={28} y={136} fill="#10b981" fontSize={8} fontFamily="monospace">{'  // Per spec: 8+ chars'}</text>
                <text x={14} y={150} fill="#6b7280" fontSize={8} fontFamily="monospace">8</text>
                <text x={28} y={150} fill="#22d3ee" fontSize={8} fontFamily="monospace">{'  // ✓ Matches spec!'}</text>
                <text x={14} y={164} fill="#6b7280" fontSize={8} fontFamily="monospace">9</text>
                <text x={28} y={164} fill="#22d3ee" fontSize={8} fontFamily="monospace">{'  // ✓ No guessing'}</text>
              </g>
            )}
          </g>

          {/* === TEST/CODE STATUS INDICATORS === */}
          <g transform="translate(30, 295)">
            <rect x={0} y={0} width={640} height={90} rx={8} fill="url(#sfpDocumentCard)" filter="url(#sfpSoftShadow)" />

            <text x={15} y={22} fill="#f8fafc" fontSize={11} fontWeight="bold">Quality Metrics</text>

            {/* Assumption count indicator */}
            <g transform="translate(20, 35)">
              <circle cx={12} cy={12} r={16} fill={currentPrompt.assumptions.length > 4 ? 'url(#sfpErrorGlow)' : currentPrompt.assumptions.length > 2 ? 'url(#sfpWarningGlow)' : 'url(#sfpSuccessGlow)'} filter={currentPrompt.assumptions.length > 4 ? 'url(#sfpErrorFilter)' : currentPrompt.assumptions.length > 2 ? 'url(#sfpWarningFilter)' : 'url(#sfpSuccessFilter)'} />
              <circle cx={12} cy={12} r={10} fill={currentPrompt.assumptions.length > 4 ? '#ef4444' : currentPrompt.assumptions.length > 2 ? '#f59e0b' : '#10b981'} />
              <text x={12} y={16} fill="#fff" fontSize={10} textAnchor="middle" fontWeight="bold">{currentPrompt.assumptions.length}</text>
              <text x={40} y={10} fill="#f8fafc" fontSize={10} fontWeight="600">Assumptions</text>
              <text x={40} y={24} fill="#94a3b8" fontSize={8}>{currentPrompt.assumptions.length > 4 ? 'High risk!' : currentPrompt.assumptions.length > 2 ? 'Some risk' : 'Low risk'}</text>
            </g>

            {/* Success rate indicator */}
            <g transform="translate(180, 35)">
              <circle cx={12} cy={12} r={16} fill={metrics.successRate > 70 ? 'url(#sfpSuccessGlow)' : 'url(#sfpWarningGlow)'} filter={metrics.successRate > 70 ? 'url(#sfpSuccessFilter)' : 'url(#sfpWarningFilter)'} />
              <circle cx={12} cy={12} r={10} fill={metrics.successRate > 70 ? '#10b981' : '#f59e0b'} />
              <text x={12} y={16} fill="#fff" fontSize={8} textAnchor="middle" fontWeight="bold">%</text>
              <text x={40} y={10} fill="#f8fafc" fontSize={10} fontWeight="600">Success Rate</text>
              <rect x={40} y={16} width={80} height={8} rx={4} fill="#374151" />
              <rect x={40} y={16} width={metrics.successRate * 0.8} height={8} rx={4} fill={metrics.successRate > 70 ? 'url(#sfpSuccessStatus)' : 'url(#sfpWarningStatus)'} />
              <text x={125} y={23} fill="#f8fafc" fontSize={9}>{metrics.successRate}%</text>
            </g>

            {/* Rework cycles indicator */}
            <g transform="translate(340, 35)">
              <circle cx={12} cy={12} r={16} fill={metrics.reworkCycles < 3 ? 'url(#sfpSuccessGlow)' : 'url(#sfpErrorGlow)'} filter={metrics.reworkCycles < 3 ? 'url(#sfpSuccessFilter)' : 'url(#sfpErrorFilter)'} />
              <circle cx={12} cy={12} r={10} fill={metrics.reworkCycles < 3 ? '#10b981' : '#ef4444'} />
              <text x={12} y={16} fill="#fff" fontSize={10} textAnchor="middle" fontWeight="bold">{metrics.reworkCycles}</text>
              <text x={40} y={10} fill="#f8fafc" fontSize={10} fontWeight="600">Rework Cycles</text>
              <text x={40} y={24} fill="#94a3b8" fontSize={8}>{metrics.reworkCycles < 3 ? 'Efficient' : 'Costly iterations'}</text>
            </g>

            {/* Time to correct indicator */}
            <g transform="translate(500, 35)">
              <circle cx={12} cy={12} r={16} fill={metrics.timeToCorrect < 20 ? 'url(#sfpSuccessGlow)' : 'url(#sfpWarningGlow)'} filter={metrics.timeToCorrect < 20 ? 'url(#sfpSuccessFilter)' : 'url(#sfpWarningFilter)'} />
              <circle cx={12} cy={12} r={10} fill={metrics.timeToCorrect < 20 ? '#10b981' : '#f59e0b'} />
              <text x={12} y={16} fill="#fff" fontSize={8} textAnchor="middle" fontWeight="bold">⏱</text>
              <text x={40} y={10} fill="#f8fafc" fontSize={10} fontWeight="600">Fix Time</text>
              <text x={40} y={24} fill="#94a3b8" fontSize={8}>{metrics.timeToCorrect} min avg</text>
            </g>
          </g>

          {/* === ASSUMPTION DETAIL PANEL === */}
          {showAssumptions && (
            <g transform="translate(30, 400)">
              <rect x={0} y={0} width={640} height={110} rx={8} fill="url(#sfpDocumentCard)" filter="url(#sfpSoftShadow)" />

              <text x={15} y={22} fill={promptMode === 'vague' ? '#ef4444' : '#10b981'} fontSize={11} fontWeight="bold">
                {promptMode === 'vague' ? '⚠ LLM Must Guess These Requirements:' : '✓ Clearly Specified Requirements:'}
              </text>

              {/* Assumption/Spec items in columns */}
              {currentPrompt.assumptions.slice(0, 8).map((assumption, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = 15 + col * 315;
                const y = 38 + row * 18;

                return (
                  <g key={i}>
                    <circle
                      cx={x + 6}
                      cy={y}
                      r={4}
                      fill={
                        assumption.severity === 'high' ? 'url(#sfpErrorGlow)' :
                        assumption.severity === 'medium' ? 'url(#sfpWarningGlow)' :
                        'url(#sfpSuccessGlow)'
                      }
                    />
                    <circle
                      cx={x + 6}
                      cy={y}
                      r={3}
                      fill={
                        assumption.severity === 'high' ? '#ef4444' :
                        assumption.severity === 'medium' ? '#f59e0b' :
                        '#10b981'
                      }
                    />
                    <text x={x + 16} y={y + 4} fill="#e2e8f0" fontSize={9}>{assumption.text}</text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setPromptMode('vague')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: promptMode === 'vague' ? `2px solid ${colors.vague}` : '1px solid rgba(255,255,255,0.2)',
                background: promptMode === 'vague' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(249, 115, 22, 0.2) 100%)' : 'transparent',
                color: colors.vague,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: promptMode === 'vague' ? '0 4px 20px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ⚠ Vague Prompt
            </button>
            <button
              onClick={() => setPromptMode('structured')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: promptMode === 'structured' ? `2px solid ${colors.structured}` : '1px solid rgba(255,255,255,0.2)',
                background: promptMode === 'structured' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)' : 'transparent',
                color: colors.structured,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: promptMode === 'structured' ? '0 4px 20px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ✓ Structured Spec
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Specification Detail Level: {specLevel}
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={specLevel}
          onChange={(e) => setSpecLevel(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: colors.vague, fontSize: '11px' }}>Minimal (many assumptions)</span>
          <span style={{ color: colors.structured, fontSize: '11px' }}>Detailed (few assumptions)</span>
        </div>
      </div>

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
            checked={showAssumptions}
            onChange={(e) => setShowAssumptions(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          Show detected assumption gaps
        </label>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Each missing requirement = one place where the LLM must guess.
          Guesses may not match your actual needs!
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
              Spec-First Prompting
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If your prompt is fuzzy, will the code &quot;guess&quot; wrong?
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
                When you give an LLM a vague prompt, it fills in the gaps with assumptions
                from its training data. These assumptions may not match what you actually need.
                A structured specification reduces these gaps.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Toggle between vague and structured prompts to see the difference in detected assumptions!
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
              Which approach produces better results from an LLM?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Compare Prompt Styles</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how specification detail affects assumption count
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
              <li>Toggle between vague and structured prompts</li>
              <li>Count the assumption gaps in each version</li>
              <li>Notice how structured specs reduce ambiguity</li>
              <li>Consider what happens when LLM guesses wrong</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'structured_better';

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
              Structured specifications dramatically reduce wrong assumptions. Each gap in your
              spec is a place where the LLM must guess - and guesses based on general patterns,
              not your specific requirements.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Specs Reduce Entropy</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Information Theory:</strong> A vague
                prompt has high entropy - many valid interpretations. The LLM picks one based on
                training data probability, not your intent.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Constraint = Information:</strong> Each
                constraint you add (password length, token duration, etc.) eliminates wrong
                possibilities and guides output toward your actual requirements.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Cost of Guessing:</strong> Wrong
                assumptions compound. One wrong auth assumption can cascade into security vulnerabilities,
                incompatible code, and costly rework.
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
              What about adding edge case and constraint checklists?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Does adding explicit edge cases and performance constraints help beyond a basic spec?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Edge Case Checklists</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how explicit edge cases further reduce assumptions
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px' }}>Example Edge Case Checklist:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li style={{ color: colors.textPrimary }}>What happens with empty email?</li>
              <li style={{ color: colors.textPrimary }}>What if password has unicode?</li>
              <li style={{ color: colors.textPrimary }}>Concurrent login from multiple devices?</li>
              <li style={{ color: colors.textPrimary }}>Token refresh during active session?</li>
              <li style={{ color: colors.textPrimary }}>Performance: 1000 concurrent logins?</li>
            </ul>
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
              Edge cases are often where LLMs make the worst assumptions because they are
              underrepresented in training data. Explicit checklists force correct handling.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'checklist_helps';

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
              Edge case and constraint checklists provide crucial additional value! They cover
              scenarios that even good specs might miss, and force explicit handling of corner cases.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Checklist Power</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Edge Cases Matter Most:</strong> Bugs
                cluster at boundaries. LLMs default to happy-path implementations unless you specify
                error handling explicitly.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Performance Constraints:</strong> Without
                them, LLM may choose O(n^2) algorithms when O(n log n) is needed, or allocate excessive
                memory.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Checklist Effect:</strong> A formal
                checklist changes how you think about requirements, often surfacing issues you would
                not have considered otherwise.
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
              You understand spec-first prompting for reliable LLM outputs
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Vague prompts force LLMs to make assumptions</li>
              <li>Structured specs reduce entropy and guide output</li>
              <li>Each constraint eliminates wrong possibilities</li>
              <li>Edge case checklists prevent boundary bugs</li>
              <li>Performance constraints guide algorithm selection</li>
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

export default SpecFirstPromptingRenderer;
