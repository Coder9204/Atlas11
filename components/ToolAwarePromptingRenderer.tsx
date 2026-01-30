import React, { useState, useCallback, useEffect, useRef } from 'react';

interface ToolAwarePromptingRendererProps {
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
  tool: '#3b82f6',
  confidence: '#8b5cf6',
  hallucination: '#ef4444',
  documented: '#10b981',
};

const ToolAwarePromptingRenderer: React.FC<ToolAwarePromptingRendererProps> = ({
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
  const [promptMode, setPromptMode] = useState<'naive' | 'tool_aware'>('naive');
  const [showHelp, setShowHelp] = useState(false);
  const [hasClaudemd, setHasClaudemd] = useState(false);

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
    let confidenceLevel = 30;
    let hallucinationRisk = 80;
    let commandAccuracy = 20;

    if (promptMode === 'tool_aware') {
      confidenceLevel += 30;
      hallucinationRisk -= 40;
      commandAccuracy += 40;
    }

    if (showHelp) {
      confidenceLevel += 20;
      hallucinationRisk -= 20;
      commandAccuracy += 20;
    }

    if (hasClaudemd) {
      confidenceLevel += 20;
      hallucinationRisk -= 20;
      commandAccuracy += 20;
    }

    return {
      confidenceLevel: Math.min(100, confidenceLevel),
      hallucinationRisk: Math.max(0, hallucinationRisk),
      commandAccuracy: Math.min(100, commandAccuracy),
    };
  }, [promptMode, showHelp, hasClaudemd]);

  const naiveCommands = [
    { cmd: 'deploy --fast --prod', status: 'hallucinated', note: 'No --fast flag exists' },
    { cmd: 'test run --all-files', status: 'hallucinated', note: 'Syntax is test --all' },
    { cmd: 'build -o ./dist', status: 'partial', note: 'Flag exists but path format wrong' },
    { cmd: 'lint check src/', status: 'hallucinated', note: 'Command is lint-check, not lint check' },
  ];

  const toolAwareCommands = [
    { cmd: 'deploy --environment production', status: 'correct', note: 'Verified via deploy --help' },
    { cmd: 'test --all', status: 'correct', note: 'From CLAUDE.md examples' },
    { cmd: 'build --output dist/', status: 'correct', note: 'Checked build --help for format' },
    { cmd: 'lint-check src/', status: 'correct', note: 'Tool name from docs' },
  ];

  const predictions = [
    { id: 'same', label: 'The LLM will figure out the right commands from context' },
    { id: 'hallucinate', label: 'Without tool docs, the LLM will hallucinate flags and commands' },
    { id: 'ask', label: 'The LLM will ask for help when unsure about commands' },
    { id: 'refuse', label: 'The LLM will refuse to run commands it does not know' },
  ];

  const twistPredictions = [
    { id: 'memory', label: 'The LLM remembers commands across sessions automatically' },
    { id: 'claudemd', label: 'A repo-local CLAUDE.md file provides persistent command documentation' },
    { id: 'learns', label: 'The LLM learns commands from errors and improves over time' },
    { id: 'unnecessary', label: 'Documentation is unnecessary once the LLM runs --help once' },
  ];

  const transferApplications = [
    {
      title: 'Custom CLI Tools',
      description: 'Internal tools with non-standard interfaces are prime candidates for hallucination.',
      question: 'How do you help Claude use your custom CLI correctly?',
      answer: 'Document each tool in CLAUDE.md with: command name, available flags, required arguments, example invocations, and common error messages. Explicitly tell Claude to run --help before assuming flags.',
    },
    {
      title: 'Database Migrations',
      description: 'Database migration tools have subtle flag differences that matter enormously.',
      question: 'Why is tool awareness critical for migrations?',
      answer: 'Migration commands like --dry-run vs --execute have real consequences. Hallucinated flags might skip safety checks or modify production data. Document exact commands and warn about destructive operations.',
    },
    {
      title: 'CI/CD Pipeline Commands',
      description: 'Build and deploy commands often have project-specific configurations.',
      question: 'How should CI/CD commands be documented for Claude?',
      answer: 'Include: environment names (staging, prod), required env vars, build targets, deployment verification steps, and rollback commands. Show the full pipeline sequence with dependencies between steps.',
    },
    {
      title: 'API Testing Tools',
      description: 'API testing tools like httpie, curl alternatives, and custom clients have varied syntax.',
      question: 'What makes API tool documentation effective?',
      answer: 'Document: authentication methods (header format, token location), base URL configuration, common endpoints with example payloads, and response parsing. Include working examples that can be copy-pasted.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why do LLMs hallucinate CLI flags?',
      options: [
        { text: 'They are trying to be creative', correct: false },
        { text: 'They pattern-match from similar tools in training data without knowing your specific tool', correct: true },
        { text: 'CLI flags are too complex for LLMs', correct: false },
        { text: 'They prefer longer commands', correct: false },
      ],
    },
    {
      question: 'What is the purpose of instructing Claude to run --help first?',
      options: [
        { text: 'To slow down execution for safety', correct: false },
        { text: 'To query actual tool documentation instead of guessing', correct: true },
        { text: 'To generate more output', correct: false },
        { text: '--help is required for all commands', correct: false },
      ],
    },
    {
      question: 'A CLAUDE.md file in a repository provides:',
      options: [
        { text: 'Automatic code generation', correct: false },
        { text: 'Persistent, repo-specific context that Claude can reference', correct: true },
        { text: 'Security scanning', correct: false },
        { text: 'Version control history', correct: false },
      ],
    },
    {
      question: 'The command confidence meter measures:',
      options: [
        { text: 'How fast commands execute', correct: false },
        { text: 'How likely Claude is to use correct syntax based on available documentation', correct: true },
        { text: 'CPU usage during execution', correct: false },
        { text: 'Network latency', correct: false },
      ],
    },
    {
      question: 'Tool-aware prompting reduces hallucination by:',
      options: [
        { text: 'Removing all CLI commands from responses', correct: false },
        { text: 'Providing explicit documentation that constrains valid options', correct: true },
        { text: 'Using simpler commands only', correct: false },
        { text: 'Running commands in a sandbox', correct: false },
      ],
    },
    {
      question: 'Why might a partially correct command be dangerous?',
      options: [
        { text: 'Partial commands always fail safely', correct: false },
        { text: 'A wrong flag might execute with unexpected behavior instead of erroring', correct: true },
        { text: 'Partial commands use more memory', correct: false },
        { text: 'They are slower to execute', correct: false },
      ],
    },
    {
      question: 'The auto-suggest for run help first appears when:',
      options: [
        { text: 'Every command is executed', correct: false },
        { text: 'Claude encounters an undocumented tool or uncertain syntax', correct: true },
        { text: 'The user requests it', correct: false },
        { text: 'Commands fail', correct: false },
      ],
    },
    {
      question: 'What should CLAUDE.md include for a custom deploy script?',
      options: [
        { text: 'Just the script name', correct: false },
        { text: 'Full flag list, environment options, example invocations, and warnings', correct: true },
        { text: 'Only the help text', correct: false },
        { text: 'Source code of the script', correct: false },
      ],
    },
    {
      question: 'Tool awareness is especially important for:',
      options: [
        { text: 'Standard Unix commands like ls and cd', correct: false },
        { text: 'Custom, internal, or project-specific tools', correct: true },
        { text: 'Commands that start with sudo', correct: false },
        { text: 'Commands with no flags', correct: false },
      ],
    },
    {
      question: 'The primary benefit of explicit tool documentation is:',
      options: [
        { text: 'Faster command execution', correct: false },
        { text: 'Replacing guesswork with verified command syntax', correct: true },
        { text: 'Reducing code size', correct: false },
        { text: 'Improving network performance', correct: false },
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
    const height = 500;
    const metrics = calculateMetrics();
    const commands = promptMode === 'naive' ? naiveCommands : toolAwareCommands;

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
            Command Confidence Meter
          </text>
          <text x={width/2} y={45} fill={promptMode === 'naive' ? colors.hallucination : colors.documented} fontSize={12} textAnchor="middle">
            {promptMode === 'naive' ? 'Naive Prompting (No Tool Docs)' : 'Tool-Aware Prompting'}
          </text>

          {/* Confidence gauge */}
          <g transform="translate(200, 120)">
            {/* Background arc */}
            <path
              d="M -80 0 A 80 80 0 0 1 80 0"
              fill="none"
              stroke="#374151"
              strokeWidth={20}
            />
            {/* Confidence arc */}
            <path
              d={`M -80 0 A 80 80 0 0 1 ${-80 + 160 * (metrics.confidenceLevel / 100)} ${-Math.sin(Math.acos(-1 + 2 * metrics.confidenceLevel / 100)) * 80}`}
              fill="none"
              stroke={metrics.confidenceLevel > 70 ? colors.success : metrics.confidenceLevel > 40 ? colors.warning : colors.error}
              strokeWidth={20}
              strokeLinecap="round"
            />
            <text x={0} y={-10} fill={colors.textPrimary} fontSize={24} textAnchor="middle" fontWeight="bold">
              {metrics.confidenceLevel}%
            </text>
            <text x={0} y={15} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              Command Confidence
            </text>
          </g>

          {/* Status indicators */}
          <rect x={20} y={175} width={170} height={50} fill={colors.bgCard} rx={8} />
          <text x={30} y={195} fill={colors.textSecondary} fontSize={10}>Hallucination Risk</text>
          <rect x={30} y={205} width={100} height={10} fill="#374151" rx={4} />
          <rect x={30} y={205} width={metrics.hallucinationRisk} height={10} fill={metrics.hallucinationRisk > 50 ? colors.error : colors.success} rx={4} />
          <text x={140} y={215} fill={colors.textPrimary} fontSize={11}>{metrics.hallucinationRisk}%</text>

          <rect x={210} y={175} width={170} height={50} fill={colors.bgCard} rx={8} />
          <text x={220} y={195} fill={colors.textSecondary} fontSize={10}>Command Accuracy</text>
          <rect x={220} y={205} width={100} height={10} fill="#374151" rx={4} />
          <rect x={220} y={205} width={metrics.commandAccuracy} height={10} fill={metrics.commandAccuracy > 70 ? colors.success : colors.warning} rx={4} />
          <text x={330} y={215} fill={colors.textPrimary} fontSize={11}>{metrics.commandAccuracy}%</text>

          {/* Command examples */}
          <text x={20} y={250} fill={colors.textSecondary} fontSize={11} fontWeight="bold">
            Generated Commands:
          </text>
          <rect x={20} y={260} width={width - 40} height={140} fill={colors.bgCard} rx={8} />

          {commands.map((cmd, i) => (
            <g key={i}>
              <circle
                cx={35}
                cy={280 + i * 32}
                r={6}
                fill={
                  cmd.status === 'correct' ? colors.success :
                  cmd.status === 'partial' ? colors.warning :
                  colors.error
                }
              />
              <text x={50} y={284 + i * 32} fill={colors.textPrimary} fontSize={10} fontFamily="monospace">
                $ {cmd.cmd}
              </text>
              <text x={50} y={296 + i * 32} fill={colors.textMuted} fontSize={9}>
                {cmd.note}
              </text>
            </g>
          ))}

          {/* Feature toggles status */}
          <rect x={20} y={410} width={width - 40} height={80} fill={colors.bgCard} rx={8} />
          <text x={30} y={430} fill={colors.textSecondary} fontSize={11} fontWeight="bold">
            Documentation Sources:
          </text>

          <circle cx={40} cy={455} r={8} fill={showHelp ? colors.success : '#374151'} />
          <text x={55} y={459} fill={colors.textPrimary} fontSize={10}>--help queries enabled</text>

          <circle cx={200} cy={455} r={8} fill={hasClaudemd ? colors.success : '#374151'} />
          <text x={215} y={459} fill={colors.textPrimary} fontSize={10}>CLAUDE.md present</text>

          {/* Auto-suggest hint */}
          {promptMode === 'naive' && !showHelp && (
            <g>
              <rect x={20} y={495} width={width - 40} height={25} fill="rgba(245, 158, 11, 0.2)" rx={6} />
              <text x={width/2} y={512} fill={colors.accent} fontSize={10} textAnchor="middle">
                Suggestion: Add &quot;run tool --help first&quot; to your prompt
              </text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setPromptMode('naive')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: promptMode === 'naive' ? `2px solid ${colors.hallucination}` : '1px solid rgba(255,255,255,0.2)',
                background: promptMode === 'naive' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: colors.hallucination,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Naive Prompt
            </button>
            <button
              onClick={() => setPromptMode('tool_aware')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: promptMode === 'tool_aware' ? `2px solid ${colors.documented}` : '1px solid rgba(255,255,255,0.2)',
                background: promptMode === 'tool_aware' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.documented,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Tool-Aware
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          marginBottom: '12px',
        }}>
          <input
            type="checkbox"
            checked={showHelp}
            onChange={(e) => setShowHelp(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          Instruct to run --help before unknown commands
        </label>

        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={hasClaudemd}
            onChange={(e) => setHasClaudemd(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          Include repo-local CLAUDE.md with tool docs
        </label>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {promptMode === 'naive'
            ? 'Without tool documentation, Claude pattern-matches from similar tools and often guesses wrong flags.'
            : 'Tool-aware prompting provides explicit documentation, dramatically reducing hallucinated commands.'}
        </div>
      </div>

      {hasClaudemd && (
        <div style={{
          background: colors.bgCard,
          padding: '12px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '11px',
        }}>
          <div style={{ color: colors.success, marginBottom: '8px' }}>CLAUDE.md example:</div>
          <div style={{ color: colors.textSecondary }}>
            ## Project Commands<br/>
            <br/>
            ### Deploy<br/>
            deploy --environment [staging|prod]<br/>
            deploy --environment staging --dry-run<br/>
            <br/>
            ### Testing<br/>
            test --all  (run all tests)<br/>
            test --watch  (watch mode)
          </div>
        </div>
      )}
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
              Tool-Aware Prompting
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Will the agent know your custom commands?
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
                Claude Code can run shell commands, but it does not automatically know your
                custom tools. Without explicit documentation, it will hallucinate flags
                based on similar tools from training data.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Toggle between naive and tool-aware prompting to see the difference in command accuracy!
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
              What happens when Claude encounters a custom tool without documentation?
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
              Toggle features and watch command accuracy change
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
              <li>Start with naive prompting - note the hallucinated commands</li>
              <li>Enable --help instructions - see confidence increase</li>
              <li>Add CLAUDE.md - watch accuracy approach 100%</li>
              <li>Compare the generated command quality</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'hallucinate';

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
              Without tool documentation, Claude will hallucinate flags and syntax based on
              similar tools from training. It does not ask for help - it confidently produces
              plausible-looking but incorrect commands.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why Hallucination Happens</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Pattern Matching:</strong> Claude has
                seen thousands of CLI tools. When it sees your custom deploy script, it
                pattern-matches to similar tools like kubectl, docker, or npm.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Confident Completion:</strong> LLMs are
                trained to produce complete, confident responses. Saying &quot;I do not know this flag&quot;
                is not the typical training signal.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>No Self-Verification:</strong> Without
                explicit instruction to run --help first, Claude has no way to verify its guess
                against actual tool documentation.
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
              How do you maintain tool documentation across sessions?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is the best way to ensure Claude knows your tools consistently?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>CLAUDE.md Pattern</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Repository-local documentation for persistent tool awareness
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              CLAUDE.md lives in your repository and is automatically loaded. It provides
              consistent context across all sessions without repeating yourself. Include
              all custom commands, flags, and common workflows.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'claudemd';

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
              A CLAUDE.md file in your repository provides persistent, version-controlled
              documentation that Claude reads automatically. No need to repeat tool docs
              in every conversation.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>CLAUDE.md Best Practices</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Tool Reference:</strong> Document all
                custom scripts with full flag lists and example invocations.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Workflow Patterns:</strong> Include
                common multi-step workflows (build then test then deploy) with exact commands.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Gotchas and Warnings:</strong> Note
                dangerous commands, required environment variables, and common mistakes.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Version Control:</strong> CLAUDE.md
                evolves with your project. Update it when tools change.
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
              You understand tool-aware prompting for Claude Code
            </p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>LLMs hallucinate CLI flags without explicit documentation</li>
              <li>Instruct Claude to run --help before unknown tools</li>
              <li>CLAUDE.md provides persistent, repo-local context</li>
              <li>Document custom tools with flags, examples, and warnings</li>
              <li>Command confidence correlates with documentation quality</li>
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

export default ToolAwarePromptingRenderer;
