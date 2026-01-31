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
    const width = 400;
    const height = 450;
    const metrics = calculateMetrics();
    const currentPrompt = promptMode === 'vague' ? vaguePrompt : structuredPrompt;

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
            <linearGradient id="assumptionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.error} />
              <stop offset="100%" stopColor={colors.assumption} />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            Assumption Detector
          </text>
          <text x={width/2} y={45} fill={promptMode === 'vague' ? colors.vague : colors.structured} fontSize={12} textAnchor="middle">
            {promptMode === 'vague' ? 'Vague Prompt Analysis' : 'Structured Spec Analysis'}
          </text>

          {/* Prompt display box */}
          <rect x={20} y={60} width={width - 40} height={80} fill={colors.bgCard} rx={8} stroke={promptMode === 'vague' ? colors.vague : colors.structured} strokeWidth={2} />
          <text x={30} y={78} fill={colors.textMuted} fontSize={10}>PROMPT:</text>

          {/* Prompt text (truncated for display) */}
          {promptMode === 'vague' ? (
            <text x={30} y={100} fill={colors.textPrimary} fontSize={12}>
              &quot;Build me a user authentication system&quot;
            </text>
          ) : (
            <>
              <text x={30} y={95} fill={colors.textPrimary} fontSize={10}>Build auth system with:</text>
              <text x={30} y={110} fill={colors.textSecondary} fontSize={9}>- Email/password, JWT 24hr, min 8 chars...</text>
              <text x={30} y={125} fill={colors.textSecondary} fontSize={9}>- Rate limit 5/15min, no MFA, single role...</text>
            </>
          )}

          {/* Assumption count indicator */}
          <rect x={20} y={150} width={width - 40} height={50} fill="rgba(239, 68, 68, 0.1)" rx={8} />
          <text x={30} y={170} fill={colors.error} fontSize={12} fontWeight="bold">
            Detected Assumptions: {currentPrompt.assumptions.length}
          </text>
          <text x={30} y={188} fill={colors.textMuted} fontSize={10}>
            {currentPrompt.assumptions.length > 2 ? 'High risk of wrong guesses!' : 'Low ambiguity - good spec!'}
          </text>

          {/* Assumption list with highlighting */}
          {showAssumptions && (
            <g>
              <text x={20} y={220} fill={colors.textSecondary} fontSize={11} fontWeight="bold">
                Missing Requirements (LLM will guess):
              </text>
              {currentPrompt.assumptions.slice(0, 6).map((assumption, i) => (
                <g key={i}>
                  <rect
                    x={20}
                    y={228 + i * 24}
                    width={width - 40}
                    height={20}
                    fill={
                      assumption.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                      assumption.severity === 'medium' ? 'rgba(249, 115, 22, 0.2)' :
                      'rgba(245, 158, 11, 0.1)'
                    }
                    rx={4}
                  />
                  <circle
                    cx={32}
                    cy={238 + i * 24}
                    r={5}
                    fill={
                      assumption.severity === 'high' ? colors.error :
                      assumption.severity === 'medium' ? colors.assumption :
                      colors.warning
                    }
                  />
                  <text
                    x={45}
                    y={242 + i * 24}
                    fill={colors.textPrimary}
                    fontSize={10}
                  >
                    {assumption.text}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Success metrics */}
          <rect x={20} y={385} width={width - 40} height={55} fill={colors.bgCard} rx={8} />
          <text x={30} y={405} fill={colors.textSecondary} fontSize={10}>Success Rate</text>
          <rect x={100} y={396} width={100} height={12} fill="#374151" rx={4} />
          <rect x={100} y={396} width={metrics.successRate} height={12} fill={metrics.successRate > 70 ? colors.success : colors.warning} rx={4} />
          <text x={210} y={406} fill={colors.textPrimary} fontSize={11}>{metrics.successRate}%</text>

          <text x={30} y={428} fill={colors.textSecondary} fontSize={10}>Rework Cycles</text>
          <text x={210} y={428} fill={metrics.reworkCycles < 3 ? colors.success : colors.error} fontSize={11}>{metrics.reworkCycles}</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setPromptMode('vague')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: promptMode === 'vague' ? `2px solid ${colors.vague}` : '1px solid rgba(255,255,255,0.2)',
                background: promptMode === 'vague' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: colors.vague,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Vague Prompt
            </button>
            <button
              onClick={() => setPromptMode('structured')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: promptMode === 'structured' ? `2px solid ${colors.structured}` : '1px solid rgba(255,255,255,0.2)',
                background: promptMode === 'structured' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.structured,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Structured Spec
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
