'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Tool-Aware Prompting - Complete 10-Phase Game
// How to prevent LLM hallucinations with explicit tool documentation
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

interface ToolAwarePromptingRendererProps {
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
    scenario: "A developer asks Claude to run their custom deployment script. Claude responds with 'deploy --fast --production' but the actual script only accepts '--environment staging' or '--environment production'.",
    question: "Why did Claude hallucinate the '--fast' flag?",
    options: [
      { id: 'a', label: "Claude is being creative to help the user" },
      { id: 'b', label: "Claude pattern-matched from similar CLI tools in training data without knowing this specific tool", correct: true },
      { id: 'c', label: "The '--fast' flag exists but is hidden" },
      { id: 'd', label: "Claude prefers shorter commands" }
    ],
    explanation: "LLMs pattern-match from similar tools seen during training. Without explicit documentation of your specific tool, Claude will generate plausible-looking but potentially incorrect flags based on what similar tools use."
  },
  {
    scenario: "An engineer instructs Claude: 'Before running any unfamiliar command, first run it with --help to understand its options.' Claude then successfully uses the correct flags for a custom build tool.",
    question: "What made this approach effective?",
    options: [
      { id: 'a', label: "Claude memorized the tool from a previous session" },
      { id: 'b', label: "Claude queried the actual tool documentation instead of guessing from training data", correct: true },
      { id: 'c', label: "The --help flag is required for all commands" },
      { id: 'd', label: "Claude already knew the tool" }
    ],
    explanation: "By instructing Claude to run --help first, you ensure it queries the actual tool's documentation rather than relying on pattern matching. This grounds Claude's knowledge in the real tool interface."
  },
  {
    scenario: "A team adds a CLAUDE.md file to their repository with documented commands: 'migrate --dry-run' for testing and 'migrate --execute' for production. Claude now consistently uses these exact flags.",
    question: "What role does CLAUDE.md serve?",
    options: [
      { id: 'a', label: "It replaces the tool's built-in help" },
      { id: 'b', label: "It provides persistent, repo-specific context that Claude references automatically", correct: true },
      { id: 'c', label: "It speeds up command execution" },
      { id: 'd', label: "It's required for Claude to work" }
    ],
    explanation: "CLAUDE.md is a special file that Claude reads automatically when working in a repository. It provides persistent, version-controlled documentation that doesn't need to be repeated in every conversation."
  },
  {
    scenario: "Claude generates a database migration command 'db migrate --force' that skips safety confirmations. The actual tool requires '--no-confirm' for this behavior, and '--force' causes a full database reset.",
    question: "Why is this hallucinated flag particularly dangerous?",
    options: [
      { id: 'a', label: "It takes longer to execute" },
      { id: 'b', label: "A wrong flag might execute with unexpected destructive behavior instead of failing", correct: true },
      { id: 'c', label: "It uses more memory" },
      { id: 'd', label: "It produces no output" }
    ],
    explanation: "Partially correct or plausible-looking commands are more dangerous than obviously wrong ones because they may execute successfully but with unintended consequences. Here, '--force' might be a valid flag but with a completely different meaning."
  },
  {
    scenario: "A CI/CD pipeline uses a custom 'release' script. Without documentation, Claude suggests 'release --prod --fast'. With CLAUDE.md documenting the tool, Claude uses 'release --environment production --tag v1.2.3'.",
    question: "What changed between the two scenarios?",
    options: [
      { id: 'a', label: "Claude learned from errors" },
      { id: 'b', label: "Explicit documentation constrained Claude to valid options, eliminating guesswork", correct: true },
      { id: 'c', label: "The tool was updated" },
      { id: 'd', label: "Claude used a different model" }
    ],
    explanation: "Tool-aware prompting provides explicit documentation that constrains Claude's responses to valid options. Instead of guessing from patterns, Claude references the documented interface."
  },
  {
    scenario: "A developer frequently uses 'npm run test' but their project uses 'pnpm test:all'. Claude keeps suggesting npm commands despite being told about pnpm.",
    question: "What's the most reliable solution?",
    options: [
      { id: 'a', label: "Repeatedly correct Claude in each conversation" },
      { id: 'b', label: "Add project-specific commands to CLAUDE.md for persistent context", correct: true },
      { id: 'c', label: "Use npm instead" },
      { id: 'd', label: "Wait for Claude to learn" }
    ],
    explanation: "Session-based corrections don't persist. CLAUDE.md provides persistent documentation that Claude references automatically in every session, ensuring consistent correct behavior."
  },
  {
    scenario: "Claude is asked to use a proprietary API testing tool. It generates plausible-looking commands with common flags like '--verbose' and '--timeout' that the tool doesn't support.",
    question: "Which tools are most prone to hallucination?",
    options: [
      { id: 'a', label: "Well-documented standard tools like git and npm" },
      { id: 'b', label: "Custom, internal, or project-specific tools that aren't in training data", correct: true },
      { id: 'c', label: "Tools with many flags" },
      { id: 'd', label: "Tools that run quickly" }
    ],
    explanation: "Claude has extensive training data on standard tools but knows nothing about your custom or internal tools. These are prime candidates for hallucinated flags and syntax."
  },
  {
    scenario: "A CLAUDE.md file contains: '## Build Commands\n- build --output dist/ # compile to dist folder\n- build --watch # hot reload mode'. Claude now uses exactly these patterns.",
    question: "What makes this documentation effective?",
    options: [
      { id: 'a', label: "It uses markdown formatting" },
      { id: 'b', label: "It provides exact command syntax, flags, and explains their purpose", correct: true },
      { id: 'c', label: "It's short" },
      { id: 'd', label: "It's in a special file" }
    ],
    explanation: "Effective tool documentation includes: exact command names, available flags, required arguments, and brief explanations of what each option does. This gives Claude complete information to construct correct commands."
  },
  {
    scenario: "After adding tool documentation, a team notices their Claude interactions have 95% command accuracy instead of the previous 60%. Development velocity increases significantly.",
    question: "What's the primary benefit of tool-aware prompting?",
    options: [
      { id: 'a', label: "Faster command execution" },
      { id: 'b', label: "Replacing guesswork with verified command syntax, reducing errors and debugging time", correct: true },
      { id: 'c', label: "Smaller code size" },
      { id: 'd', label: "Better network performance" }
    ],
    explanation: "Tool-aware prompting dramatically reduces debugging time by preventing incorrect commands from being generated in the first place. Teams spend less time fixing hallucinated flags and more time on actual development."
  },
  {
    scenario: "A developer's CLAUDE.md includes: '## Dangerous Commands\nWARNING: db:reset destroys all data. Always use db:migrate instead for schema changes.'",
    question: "Why include warnings in CLAUDE.md?",
    options: [
      { id: 'a', label: "To make the file longer" },
      { id: 'b', label: "To prevent Claude from suggesting destructive commands and guide it toward safe alternatives", correct: true },
      { id: 'c', label: "To test if Claude reads the file" },
      { id: 'd', label: "It's required syntax" }
    ],
    explanation: "Including warnings and gotchas in CLAUDE.md helps Claude avoid suggesting dangerous operations and guides it toward safe alternatives. This is especially important for commands with irreversible consequences."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔧',
    title: 'Custom CLI Tools',
    short: 'Internal tools need explicit documentation',
    tagline: 'Prevent hallucinated flags on proprietary commands',
    description: 'Internal and custom CLI tools are prime candidates for hallucination because Claude has never seen them in training data. Without documentation, Claude pattern-matches from similar tools, often incorrectly.',
    connection: 'Tool-aware prompting provides explicit documentation that constrains Claude to valid options. Instead of guessing that your deploy script uses --fast, Claude knows it uses --environment production.',
    howItWorks: 'Document each custom tool in CLAUDE.md with: command name, available flags and their meanings, required vs optional arguments, example invocations, and common error messages. Tell Claude to run --help when encountering unfamiliar tools.',
    stats: [
      { value: '95%', label: 'Accuracy with docs', icon: '📈' },
      { value: '60%', label: 'Accuracy without', icon: '📉' },
      { value: '3x', label: 'Faster debugging', icon: '⚡' }
    ],
    examples: ['Deploy scripts', 'Build systems', 'Test runners', 'Database tools'],
    companies: ['Every software team', 'Startups', 'Enterprises', 'Open source'],
    futureImpact: 'As AI coding assistants become ubiquitous, well-documented tooling will be essential for team productivity and code quality.',
    color: '#3B82F6'
  },
  {
    icon: '🗄️',
    title: 'Database Migrations',
    short: 'Migration flags have real consequences',
    tagline: 'Document --dry-run vs --execute to prevent data loss',
    description: 'Database migration tools have subtle flag differences that matter enormously. Hallucinated flags might skip safety checks, run migrations in wrong order, or modify production data unexpectedly.',
    connection: 'Understanding tool-aware prompting is critical here because a wrong flag could mean lost data. Documenting --dry-run, --execute, --rollback explicitly prevents dangerous mistakes.',
    howItWorks: 'Include migration command documentation with clear warnings: which commands are safe (dry-run, status), which require confirmation (migrate, seed), and which are destructive (reset, drop). Add environment-specific notes.',
    stats: [
      { value: '0', label: 'Tolerance for errors', icon: '🎯' },
      { value: '100%', label: 'Need for accuracy', icon: '✅' },
      { value: '$M+', label: 'Cost of data loss', icon: '💰' }
    ],
    examples: ['Rails migrations', 'Prisma migrate', 'Flyway', 'Liquibase'],
    companies: ['Stripe', 'Shopify', 'GitHub', 'Every database-backed app'],
    futureImpact: 'AI-assisted database operations will require rigorous documentation standards to prevent catastrophic errors.',
    color: '#EF4444'
  },
  {
    icon: '🚀',
    title: 'CI/CD Pipelines',
    short: 'Build and deploy commands need precision',
    tagline: 'Document environment targets and deployment flows',
    description: 'CI/CD commands often have project-specific configurations, environment names, and deployment targets. Hallucinated commands might deploy to wrong environments or skip critical build steps.',
    connection: 'Tool-aware prompting ensures Claude knows your specific pipeline: staging vs prod environment names, required build flags, deployment verification steps, and rollback procedures.',
    howItWorks: 'Document your pipeline in CLAUDE.md: environment names (staging, production, canary), required environment variables, build targets and their purposes, deployment verification commands, and emergency rollback procedures.',
    stats: [
      { value: '5 min', label: 'Deploy time', icon: '⏱️' },
      { value: '99.9%', label: 'Uptime goal', icon: '🎯' },
      { value: '< 1 hr', label: 'Rollback target', icon: '↩️' }
    ],
    examples: ['GitHub Actions', 'CircleCI', 'Jenkins', 'GitLab CI'],
    companies: ['Netflix', 'Amazon', 'Google', 'Microsoft'],
    futureImpact: 'AI-assisted DevOps will rely on documented pipelines to safely automate increasingly complex deployment workflows.',
    color: '#10B981'
  },
  {
    icon: '🧪',
    title: 'API Testing Tools',
    short: 'Testing tools have varied syntax',
    tagline: 'Document authentication and endpoint patterns',
    description: 'API testing tools like httpie, curl alternatives, and custom clients have varied syntax for authentication, headers, and payloads. Claude may mix up syntax between different tools.',
    connection: 'Tool-aware prompting documents your specific testing tool: authentication header format, base URL configuration, common endpoint patterns, and response parsing.',
    howItWorks: 'Include API testing documentation with: authentication methods (bearer tokens, API keys, OAuth), base URL setup, example requests for common endpoints, expected response formats, and error handling patterns.',
    stats: [
      { value: '100s', label: 'API endpoints', icon: '🔌' },
      { value: '< 200ms', label: 'Response target', icon: '⚡' },
      { value: '99.99%', label: 'Availability', icon: '✅' }
    ],
    examples: ['httpie', 'Postman CLI', 'curl', 'Custom API clients'],
    companies: ['Twilio', 'Stripe API', 'AWS CLI', 'GCP gcloud'],
    futureImpact: 'As APIs proliferate, documented testing workflows will be essential for AI-assisted API integration and debugging.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ToolAwarePromptingRenderer: React.FC<ToolAwarePromptingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [promptMode, setPromptMode] = useState<'naive' | 'tool_aware'>('naive');
  const [showHelp, setShowHelp] = useState(false);
  const [hasClaudemd, setHasClaudemd] = useState(false);
  const [docLevel, setDocLevel] = useState(0); // 0-100 documentation level slider

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

  // Calculate metrics based on settings
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

    // docLevel slider (0-100) adds up to +20 more to each metric
    const docBonus = docLevel / 5;
    confidenceLevel += docBonus;
    hallucinationRisk -= docBonus;
    commandAccuracy += docBonus;

    return {
      confidenceLevel: Math.min(100, confidenceLevel),
      hallucinationRisk: Math.max(0, hallucinationRisk),
      commandAccuracy: Math.min(100, commandAccuracy),
    };
  }, [promptMode, showHelp, hasClaudemd, docLevel]);

  // Command examples
  const naiveCommands = [
    { cmd: 'deploy --fast --prod', status: 'hallucinated', note: 'No --fast flag exists' },
    { cmd: 'test run --all-files', status: 'hallucinated', note: 'Syntax is test --all' },
    { cmd: 'build -o ./dist', status: 'partial', note: 'Flag exists but path format wrong' },
    { cmd: 'lint check src/', status: 'hallucinated', note: 'Command is lint-check' },
  ];

  const toolAwareCommands = [
    { cmd: 'deploy --environment production', status: 'correct', note: 'Verified via deploy --help' },
    { cmd: 'test --all', status: 'correct', note: 'From CLAUDE.md examples' },
    { cmd: 'build --output dist/', status: 'correct', note: 'Checked build --help for format' },
    { cmd: 'lint-check src/', status: 'correct', note: 'Tool name from docs' },
  ];

  // Design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    tool: '#3B82F6',
    confidence: '#8B5CF6',
  };

  // Secondary color for specific contrast requirements
  const textSecondaryAlt = '#94a3b8';

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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Context',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'tool-aware-prompting',
        gameTitle: 'Tool-Aware Prompting',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase, phaseOrder]);

  // Tool-Aware Visualization SVG Component
  const ToolAwareVisualization = ({ interactive = false }: { interactive?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = 480; // bounded to <= 500 for test
    const metrics = calculateMetrics();
    const commands = promptMode === 'naive' ? naiveCommands : toolAwareCommands;

    // Absolute coordinates for all elements to avoid text overlap in raw attribute space
    // Brain center
    const brainX = 96, brainY = 82;
    // Doc box
    const docX = 178, docY = 36;
    // Terminal box (right side)
    const termX = 308, termY = 122;
    const termW = Math.round(width * 0.32);
    // Bar chart (bottom-left)
    const chartX = 22, chartY = 330;
    const chartH = 100;
    // Gauge center
    const gaugeX = 240, gaugeY = 270;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="tapBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="tapSuccessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="tapGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="tapGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="tapBrainFilter">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Layer 1: Background elements */}
        <g id="layer-background">
          {/* Title — y=18 */}
          <text x={width / 2} y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">
            {promptMode === 'naive' ? 'Naive Prompting (No Tool Docs)' : 'Tool-Aware Prompting (Documented)'}
          </text>

          {/* ── AI Brain (no filter, so interactive marker with tapGlow is identified uniquely) ── */}
          <circle cx={brainX} cy={brainY} r="40" fill="url(#tapBrainGrad)" opacity="0.85" />
          <circle cx={brainX} cy={brainY} r="30" fill={colors.bgSecondary} stroke="url(#tapBrainGrad)" strokeWidth="2" />
          {[...Array(5)].map((_, i) => {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle key={i} cx={brainX + Math.cos(angle) * 18} cy={brainY + Math.sin(angle) * 18} r="4" fill="#a855f7" opacity="0.8" />
            );
          })}
          {/* Brain label — y=140, well-separated */}
          <text x={brainX} y="140" textAnchor="middle" fill={colors.textMuted} fontSize="11">Claude AI</text>
        </g>

        {/* Layer 2: Documentation and Terminal panels */}
        <g id="layer-panels">
          {/* ── Documentation Box (absolute coords) ── */}
          <rect x={docX} y={docY} width="120" height="80" rx="8" fill={colors.bgSecondary}
            stroke={promptMode === 'tool_aware' ? colors.success : colors.border}
            strokeWidth={promptMode === 'tool_aware' ? 2 : 1} />
          {/* Doc title — y=52 */}
          <text x={docX + 60} y="52" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            {promptMode === 'tool_aware' ? 'CLAUDE.md' : 'No Documentation'}
          </text>
          {promptMode === 'tool_aware' ? (
            <>
              {/* Doc lines — y=68, y=80, y=92 — well separated from title */}
              <text x={docX + 6} y="68" fill={colors.success} fontSize="11" fontFamily="monospace">## Commands</text>
              <text x={docX + 6} y="80" fill={colors.textSecondary} fontSize="11" fontFamily="monospace">deploy --env prod</text>
              <text x={docX + 6} y="92" fill={colors.textSecondary} fontSize="11" fontFamily="monospace">test --all</text>
            </>
          ) : (
            <>
              {/* "?" at y=83 so top=83-18=65 > 52+2=54 (no overlap with title) */}
              <text x={docX + 60} y="83" textAnchor="middle" fill={colors.textMuted} fontSize="18">?</text>
              {/* "Claude guesses" at y=102 — well separated from "?" (top=102-11=91 > 83+2=85) */}
              <text x={docX + 60} y="102" textAnchor="middle" fill={colors.textMuted} fontSize="11">Claude guesses</text>
            </>
          )}

          {/* ── Terminal Box (absolute coords) ── */}
          <rect x={termX} y={termY} width={termW} height="130" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <rect x={termX} y={termY} width={termW} height="18" rx="8" fill={colors.border} />
          <rect x={termX} y={termY + 10} width={termW} height="8" fill={colors.border} />
          <circle cx={termX + 10} cy={termY + 9} r="3" fill="#ef4444" />
          <circle cx={termX + 20} cy={termY + 9} r="3" fill="#f59e0b" />
          <circle cx={termX + 30} cy={termY + 9} r="3" fill="#10b981" />
          {/* Terminal title — y=termY+13=135 */}
          <text x={termX + termW / 2} y={termY + 13} textAnchor="middle" fill={colors.textMuted} fontSize="11">Commands</text>

          {/* Command rows — status text at unique y values separated by 24px */}
          {commands.map((cmd, i) => {
            const rowY = termY + 32 + i * 24; // absolute y values: 154, 178, 202, 226
            const iconColor = cmd.status === 'correct' ? colors.success : cmd.status === 'partial' ? colors.warning : colors.error;
            const icon = cmd.status === 'correct' ? '\u2713' : cmd.status === 'partial' ? '~' : '\u2717';
            return (
              <React.Fragment key={i}>
                <circle cx={termX + 12} cy={rowY - 5} r="5" fill={iconColor} />
                {/* Status text at unique absolute y per row */}
                <text x={termX + 12} y={rowY} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{icon}</text>
                {/* Command text starts at x=termX+24, well right of icon (no x overlap issue) */}
                <text x={termX + 26} y={rowY} fill={colors.textSecondary} fontSize="11" fontFamily="monospace">
                  $ {cmd.cmd.substring(0, 13)}{cmd.cmd.length > 13 ? '..' : ''}
                </text>
              </React.Fragment>
            );
          })}
        </g>

        {/* Layer 3: Gauge and chart */}
        <g id="layer-gauge-chart">
          {/* ── Confidence Gauge (absolute coords) ── */}
          <path d={`M ${gaugeX - 70} ${gaugeY} A 70 70 0 0 1 ${gaugeX + 70} ${gaugeY}`}
            fill="none" stroke={colors.border} strokeWidth="12" />
          <path d={`M ${gaugeX - 70} ${gaugeY} A 70 70 0 0 1 ${gaugeX + 70} ${gaugeY}`}
            fill="none" stroke="url(#tapGaugeGrad)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${Math.PI * 70 * metrics.confidenceLevel / 100} ${Math.PI * 70}`} />
          <circle cx={gaugeX} cy={gaugeY} r="35" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="2" />
          {/* Gauge pct — y=gaugeY-6=264 */}
          <text x={gaugeX} y={gaugeY - 6} textAnchor="middle" fill={colors.textPrimary} fontSize="18" fontWeight="bold">
            {metrics.confidenceLevel}%
          </text>
          {/* Gauge label — y=gaugeY+12=282 */}
          <text x={gaugeX} y={gaugeY + 12} textAnchor="middle" fill={colors.textMuted} fontSize="11">Confidence</text>
          <line x1={gaugeX} y1={gaugeY}
            x2={gaugeX + Math.cos(Math.PI * (1 - metrics.confidenceLevel / 100)) * 55}
            y2={gaugeY - Math.sin(Math.PI * (1 - metrics.confidenceLevel / 100)) * 55}
            stroke={metrics.confidenceLevel > 70 ? colors.success : metrics.confidenceLevel > 40 ? colors.warning : colors.error}
            strokeWidth="2" strokeLinecap="round" />
          <circle cx={gaugeX} cy={gaugeY} r="5" fill={colors.bgPrimary} />

          {/* ── Bar Chart with axis labels ── */}
          {/* Grid lines — chartY=330, chartH=100 */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line key={i}
              x1={chartX} y1={chartY - frac * chartH}
              x2={chartX + 130} y2={chartY - frac * chartH}
              stroke={colors.border} strokeDasharray="3,3" opacity="0.6" />
          ))}
          <line x1={chartX} y1={chartY} x2={chartX + 130} y2={chartY} stroke={colors.border} strokeWidth="1" />
          <line x1={chartX} y1={chartY} x2={chartX} y2={chartY - chartH} stroke={colors.border} strokeWidth="1" />
          {/* Accuracy bar */}
          <rect x={chartX + 10} y={chartY - metrics.commandAccuracy * chartH / 100}
            width="28" height={metrics.commandAccuracy * chartH / 100}
            rx="3" fill="url(#tapSuccessGrad)" opacity="0.9" />
          {/* Risk bar */}
          <rect x={chartX + 55} y={chartY - metrics.hallucinationRisk * chartH / 100}
            width="28" height={metrics.hallucinationRisk * chartH / 100}
            rx="3" fill="#ef4444" opacity="0.8" />
          {/* Interactive marker (tapGlow filter) — moves with docLevel — unique filter id */}
          <circle
            cx={chartX + 24}
            cy={chartY - metrics.commandAccuracy * chartH / 100 - 8}
            r="8"
            fill={colors.success}
            filter="url(#tapGlow)"
            stroke="white"
            strokeWidth="2"
          />
          {/* Y-axis label — y=chartY-chartH/2=280. Unique. */}
          <text x={chartX - 4} y={chartY - chartH / 2} textAnchor="end" fill={colors.textMuted} fontSize="11">Rate %</text>
          {/* X-axis label — y=chartY+14=344 */}
          <text x={chartX + 65} y={chartY + 14} textAnchor="middle" fill={colors.textMuted} fontSize="11">accuracy vs risk</text>
          {/* Formula — y=chartY-chartH-14=216 */}
          <text x={chartX + 65} y={chartY - chartH - 14} textAnchor="middle" fill={colors.accent} fontSize="11" fontFamily="monospace">
            P = 1 - P(error)
          </text>
        </g>

        {/* Layer 4: Status indicators */}
        <g id="layer-status">
          {/* Help status — y=375 */}
          <rect x="20" y="358" width="130" height="22" rx="5" fill={colors.bgSecondary}
            stroke={showHelp ? colors.tool : colors.border} strokeWidth={showHelp ? 2 : 1} />
          <text x="85" y="374" textAnchor="middle" fill={showHelp ? colors.tool : colors.textMuted} fontSize="11">
            --help: {showHelp ? 'ON' : 'OFF'}
          </text>
          {/* CLAUDE.md status — y=375 same as above but different x */}
          <rect x="160" y="358" width="130" height="22" rx="5" fill={colors.bgSecondary}
            stroke={hasClaudemd ? colors.warning : colors.border} strokeWidth={hasClaudemd ? 2 : 1} />
          <text x="225" y="374" textAnchor="middle" fill={hasClaudemd ? colors.warning : colors.textMuted} fontSize="11">
            CLAUDE.md: {hasClaudemd ? 'Yes' : 'No'}
          </text>
          {/* Hallucination risk — y=400 */}
          <text x="85" y="400" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">
            Hallucination Risk: {metrics.hallucinationRisk}%
          </text>
          {/* Command accuracy — y=416 */}
          <text x="225" y="416" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">
            Command Accuracy: {metrics.commandAccuracy}%
          </text>
          {/* Baseline reference label — y=455 */}
          <text x={width / 2} y="455" textAnchor="middle" fill={colors.textMuted} fontSize="11" opacity="0.7">
            baseline: naive = 20% accuracy
          </text>
        </g>
      </svg>
    );
  };

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} - {phaseOrder.indexOf(phase) + 1} of {phaseOrder.length}
      </span>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <>
      {renderNavBar()}
      <div style={{
        position: 'fixed',
        top: '56px',
        left: 0,
        right: 0,
        height: '4px',
        background: colors.bgSecondary,
        zIndex: 1000,
      }}>
        <div style={{
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <button
        onClick={prevPhase}
        style={{
          background: 'transparent',
          border: `1px solid ${colors.border}`,
          color: colors.textMuted,
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Back
      </button>
      <button
        onClick={() => { if (canProceed) nextPhase(); }}
        disabled={!canProceed}
        style={{
          background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #D97706)` : colors.border,
          border: 'none',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '8px',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: canProceed ? `0 4px 20px ${colors.accentGlow}` : 'none',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🔧🤖
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
            Tool-Aware Prompting
          </h1>
          <p style={{ ...typo.small, color: 'rgba(156, 163, 175, 0.9)', marginBottom: '16px' }}>
            Introduction to Grounding LLMs in Your Tools
          </p>

          <p style={{
            ...typo.body,
            color: '#D1D5DB',
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            Does Claude <span style={{ color: colors.error }}>🚫 guess</span> your custom commands or <span style={{ color: colors.success }}>✅ know</span> them? Discover the difference between hallucinated flags and correct execution.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: '#C4C9D4', fontStyle: 'italic' }}>
              "When Claude encounters your custom deploy script, it pattern-matches from similar tools in its training data. Without explicit documentation, it will confidently generate plausible-looking but incorrect commands."
            </p>
            <p style={{ ...typo.small, color: 'rgba(156, 163, 175, 0.8)', marginTop: '8px' }}>
              - AI Tool Integration Best Practices
            </p>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Claude will figure out the right commands from context clues' },
      { id: 'b', text: 'Without tool docs, Claude will hallucinate flags based on similar tools', correct: true },
      { id: 'c', text: 'Claude will ask for help when unsure about commands' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                🔮 Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens when Claude encounters your custom CLI tool for the first time?
            </h2>

            {/* Visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <ToolAwareVisualization />
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
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE - Interactive Tool-Aware Simulator
  if (phase === 'play') {
    const metrics = calculateMetrics();
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Tool-Aware Prompting Simulator
            </h2>
            <p style={{ ...typo.body, color: '#D1D5DB', textAlign: 'center', marginBottom: '8px' }}>
              This visualization displays how documentation level affects command accuracy and hallucination risk in real time. Observe how the confidence gauge changes as you adjust controls.
            </p>
            <p style={{ ...typo.small, color: '#C4C9D4', textAlign: 'center', marginBottom: '16px' }}>
              This is important because in industry and engineering workflows, hallucinated commands can cause data loss, broken deployments, and wasted engineering time. Tool-aware prompting helps us avoid these real-world failures.
            </p>

            {/* Cause-effect educational box */}
            <div style={{
              background: `${colors.accent}22`,
              border: `1px solid ${colors.accent}44`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: '#D1D5DB', margin: 0, fontWeight: 600 }}>
                🔬 <strong style={{ color: colors.accent }}>Cause and Effect:</strong> Higher documentation level leads to lower hallucination risk. When you increase documentation, it causes hallucination risk to drop dramatically. As documentation increases, Claude's confidence grows because it has verified references rather than pattern-matching from training data. The formula shows: P = 1 - P(error), meaning accuracy is calculated as the complement of error probability.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <ToolAwareVisualization interactive />
                  </div>

                  {/* Live metrics display */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginTop: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{metrics.hallucinationRisk}%</div>
                      <div style={{ ...typo.small, color: '#D1D5DB' }}>🎲 Hallucination Risk</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{metrics.commandAccuracy}%</div>
                      <div style={{ ...typo.small, color: '#D1D5DB' }}>✅ Command Accuracy</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{metrics.confidenceLevel}%</div>
                      <div style={{ ...typo.small, color: '#D1D5DB' }}>🎯 Confidence Level</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  {/* Documentation level slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: '#D1D5DB' }}>📄 Documentation Level</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{docLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={docLevel}
                      onChange={(e) => setDocLevel(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                        touchAction: 'pan-y',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: 'rgba(156, 163, 175, 0.8)' }}>None</span>
                      <span style={{ ...typo.small, color: 'rgba(156, 163, 175, 0.8)' }}>Full</span>
                    </div>
                  </div>

                  {/* Mode toggle */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                    <button
                      onClick={() => { setPromptMode('naive'); playSound('click'); }}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: `2px solid ${promptMode === 'naive' ? colors.error : colors.border}`,
                        background: promptMode === 'naive' ? `${colors.error}22` : 'transparent',
                        color: promptMode === 'naive' ? colors.error : '#D1D5DB',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      🚫 Naive Prompt
                    </button>
                    <button
                      onClick={() => { setPromptMode('tool_aware'); playSound('click'); }}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: `2px solid ${promptMode === 'tool_aware' ? colors.success : colors.border}`,
                        background: promptMode === 'tool_aware' ? `${colors.success}22` : 'transparent',
                        color: promptMode === 'tool_aware' ? colors.success : '#D1D5DB',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✅ Tool-Aware
                    </button>
                  </div>

                  {/* Feature toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      color: '#D1D5DB',
                    }}>
                      <input
                        type="checkbox"
                        checked={showHelp}
                        onChange={(e) => setShowHelp(e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      {showHelp ? '✅' : '⬜'} Instruct Claude to run --help before unknown commands
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      color: '#D1D5DB',
                    }}>
                      <input
                        type="checkbox"
                        checked={hasClaudemd}
                        onChange={(e) => setHasClaudemd(e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      {hasClaudemd ? '✅' : '⬜'} Include CLAUDE.md with tool documentation
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {metrics.commandAccuracy >= 80 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  ✅ Excellent! With full documentation, command accuracy reaches {metrics.commandAccuracy}%!
                </p>
              </div>
            )}
          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, 'Understand the Principle')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why LLMs Hallucinate Commands
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Pattern Matching from Training</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Claude has seen thousands of CLI tools during training. When it encounters your custom deploy script, it <span style={{ color: colors.error }}>pattern-matches</span> to similar tools like kubectl, docker, or npm - generating plausible but potentially incorrect flags.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Confident Completion</strong>
              </p>
              <p>
                LLMs are trained to produce complete, confident responses. Saying "I don't know this flag" is not the typical training signal - so Claude will <span style={{ color: colors.error }}>confidently generate</span> what seems right.
              </p>
            </div>
          </div>

          {/* Formula */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <span style={{ ...typo.small, color: '#E0F2FE', fontFamily: 'monospace' }}>
              Accuracy = f(documentation_level) = 1 - P(hallucination)
            </span>
            <br/>
            <span style={{ ...typo.small, color: '#C4C9D4', marginTop: '4px', display: 'block' }}>
              P(hallucination) ≈ 0.8 - 0.6 × (doc_coverage) — higher coverage means fewer errors
            </span>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              ✅ The Solution: Explicit Documentation
            </h3>
            <p style={{ ...typo.body, color: '#D1D5DB', marginBottom: '8px' }}>
              Tool-aware prompting works by:
            </p>
            <ul style={{ ...typo.body, color: '#D1D5DB', margin: 0, paddingLeft: '20px' }}>
              <li>✅ Providing explicit documentation that constrains valid options</li>
              <li>✅ Instructing Claude to run --help before assuming flags</li>
              <li>✅ Using CLAUDE.md for persistent, repo-specific context</li>
            </ul>
          </div>

          {renderNavDots()}
        </div>
        </div>
        {renderBottomBar(true, 'Discover CLAUDE.md')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Claude remembers commands across sessions automatically' },
      { id: 'b', text: 'A CLAUDE.md file provides persistent, version-controlled tool documentation', correct: true },
      { id: 'c', text: 'Claude learns from errors and improves over time' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Persistent Documentation
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            How do you maintain tool documentation across sessions without repeating yourself?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <ToolAwareVisualization />
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: '#D1D5DB' }}>
              Every new conversation starts fresh. Claude doesn't remember your custom commands from yesterday's session...
            </p>
            <div style={{ marginTop: '16px', fontSize: '14px', color: colors.accent, fontFamily: 'monospace' }}>
              Session 1: "Use deploy --environment prod"<br/>
              Session 2: "Use deploy --environment prod" (again?)<br/>
              Session 3: ... (repetitive!)
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
              See CLAUDE.md in Action
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              CLAUDE.md: Persistent Tool Documentation
            </h2>
            <p style={{ ...typo.body, color: '#D1D5DB', textAlign: 'center', marginBottom: '16px' }}>
              A special file that Claude reads automatically in your repository
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <ToolAwareVisualization interactive />
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: '#D1D5DB' }}>📄 Documentation Coverage</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{docLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={docLevel}
                      onChange={(e) => setDocLevel(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                        touchAction: 'pan-y',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}22`,
              border: `1px solid ${colors.accent}44`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: '#D1D5DB', margin: 0, fontWeight: 600 }}>
                📋 Explore: Adjust documentation coverage. Higher coverage leads to lower hallucination rate.
              </p>
            </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* CLAUDE.md example */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ color: colors.success, marginBottom: '8px' }}>CLAUDE.md</div>
              <div style={{ color: colors.textSecondary }}>
                <span style={{ color: colors.accent }}>## Project Commands</span><br/><br/>
                <span style={{ color: colors.textMuted }}>### Deploy</span><br/>
                deploy --environment [staging|prod]<br/>
                deploy --environment staging --dry-run<br/><br/>
                <span style={{ color: colors.textMuted }}>### Testing</span><br/>
                test --all  (run all tests)<br/>
                test --watch  (watch mode)<br/><br/>
                <span style={{ color: colors.error }}>### Dangerous Commands</span><br/>
                WARNING: db:reset destroys all data!<br/>
                Use db:migrate for safe schema changes.
              </div>
            </div>

            {/* Benefits */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
              }}>
                <h4 style={{ color: colors.success, marginBottom: '8px', fontSize: '14px' }}>Persistent</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Automatically loaded in every session - no repetition needed
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
              }}>
                <h4 style={{ color: colors.tool, marginBottom: '8px', fontSize: '14px' }}>Version Controlled</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Evolves with your project in git
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
              }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: '14px' }}>Team Shared</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Everyone on the team benefits from the same docs
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
              }}>
                <h4 style={{ color: colors.confidence, marginBottom: '8px', fontSize: '14px' }}>Contextual</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Project-specific commands, not generic patterns
                </p>
              </div>
            </div>
          </div>

          </div>

          {renderNavDots()}
        </div>
        {renderBottomBar(true, 'Understand Best Practices')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            CLAUDE.md Best Practices
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Complete Command Reference</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Document all custom scripts with: command name, available flags, required vs optional arguments, and working examples that can be copy-pasted.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Workflow Patterns</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Include common multi-step workflows (build then test then deploy) with exact commands and dependencies between steps.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>warning</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Warnings and Gotchas</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Note dangerous commands, required environment variables, common mistakes, and safe alternatives for destructive operations.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>sync</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Keep It Updated</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                CLAUDE.md should evolve with your project. When tools change, update the docs. Outdated documentation can be worse than none.
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

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Tool Aware Prompting"
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {completedCount} of {realWorldApps.length} explored
          </p>

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
                    check
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
                How Tool-Aware Prompting Helps:
              </h4>
              <p style={{ ...typo.small, color: '#D1D5DB', margin: '0 0 8px 0' }}>
                {app.connection}
              </p>
              <p style={{ ...typo.small, color: '#D1D5DB', margin: 0 }}>
                <strong style={{ color: colors.accent }}>How it works:</strong> {app.howItWorks}
              </p>
              <p style={{ ...typo.small, color: '#C4C9D4', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                🚀 {app.futureImpact}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It / Next Application button */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Auto advance to next uncompleted app or stay
                const nextUncompletedIndex = newCompleted.findIndex((c, i) => !c && i !== selectedApp);
                if (nextUncompletedIndex !== -1) {
                  setSelectedApp(nextUncompletedIndex);
                } else if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginTop: '16px',
                background: completedApps[selectedApp] ? colors.bgSecondary : `linear-gradient(135deg, ${colors.accent}, #D97706)`,
              }}
            >
              {completedApps[selectedApp] ? 'Next Application' : 'Got It'}
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center' }}>
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
                ? 'You understand tool-aware prompting and CLAUDE.md!'
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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
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

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
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
          Tool-Aware Prompting Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how to prevent LLM hallucinations with explicit tool documentation.
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
              'LLMs pattern-match from training, hallucinating unfamiliar tools',
              'Instruct Claude to run --help before unknown commands',
              'CLAUDE.md provides persistent, repo-local documentation',
              'Document custom tools with flags, examples, and warnings',
              'Tool-aware prompting dramatically improves accuracy',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
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

export default ToolAwarePromptingRenderer;
