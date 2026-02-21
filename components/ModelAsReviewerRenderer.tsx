'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme, withOpacity } from '../lib/theme';
import { SvgDefs, Legend, Annotation } from '../lib/svg';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Model as Reviewer - Complete 10-Phase Game
// How independent critique catches bugs that generation misses
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

interface ModelAsReviewerRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
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
    scenario: "A developer asks an LLM to write a kinetic energy function. It produces: energy = mass * velocity * velocity. The code compiles and runs.",
    question: "What fundamental error does this code contain?",
    options: [
      { id: 'a', label: "The variable names are incorrect" },
      { id: 'b', label: "Missing the 1/2 factor - KE = (1/2)mv\u00B2, not mv\u00B2", correct: true },
      { id: 'c', label: "Velocity should be cubed, not squared" },
      { id: 'd', label: "Mass and velocity should be added, not multiplied" }
    ],
    explanation: "Kinetic energy is KE = (1/2)mv\u00B2. LLMs often produce formulas that look correct but have subtle dimensional or constant errors. A review pass checking 'unit consistency' would catch this."
  },
  {
    scenario: "An AI generates F = mass + acceleration as a force calculation. A second review pass with prompt 'Check for physics law violations' immediately flags this.",
    question: "Why did the review pass catch what generation missed?",
    options: [
      { id: 'a', label: "The review model is smarter than the generation model" },
      { id: 'b', label: "Review mode optimizes for finding errors, not for producing plausible code", correct: true },
      { id: 'c', label: "Review always catches every error" },
      { id: 'd', label: "The same model cannot be used for both generation and review" }
    ],
    explanation: "Generation optimizes for plausibility - code that looks correct. Review mode with specific prompts optimizes for error detection. Different objectives reveal different issues."
  },
  {
    scenario: "A momentum calculation returns 0 for negative velocities. The original LLM prompt was 'write a momentum calculator' without further specification.",
    question: "What type of review check would catch this error?",
    options: [
      { id: 'a', label: "Unit consistency check" },
      { id: 'b', label: "Edge case review - checking boundary conditions and unusual inputs", correct: true },
      { id: 'c', label: "Code style check" },
      { id: 'd', label: "Performance optimization check" }
    ],
    explanation: "Edge case review examines boundary conditions like negative values, zero, and extreme inputs. Momentum can be negative (opposite direction), so excluding negative velocities is a logic error."
  },
  {
    scenario: "A financial calculation AI produces code that sometimes creates money from nothing by adding interest incorrectly. The error was not caught by the same model in review mode.",
    question: "What additional review strategy would help catch this?",
    options: [
      { id: 'a', label: "Using prettier code formatting" },
      { id: 'b', label: "Cross-checking with a different model or static analysis tool", correct: true },
      { id: 'c', label: "Running the code faster" },
      { id: 'd', label: "Using a smaller model" }
    ],
    explanation: "Different models have different blind spots. Cross-checking with a different model or tool (like a static analyzer) reduces correlated mistakes that same-model review might miss."
  },
  {
    scenario: "A team implements 'Review for units, conservation laws, edge cases' as a standard second pass for all physics code. Bug rates drop by 60%.",
    question: "Why is this checklist-based approach effective?",
    options: [
      { id: 'a', label: "It makes the review take longer" },
      { id: 'b', label: "It directs focused attention to common error categories systematically", correct: true },
      { id: 'c', label: "Checklists are always better than free-form review" },
      { id: 'd', label: "The specific words in the checklist don't matter" }
    ],
    explanation: "Checklist-based review systematically verifies specific criteria. Each item (units, conservation, edge cases) targets a known category of errors, ensuring comprehensive coverage."
  },
  {
    scenario: "Model A generates API code. Model B reviews it and finds authentication edge cases. Model A reviews Model B's fixes and finds input validation issues. Neither found all bugs alone.",
    question: "What does this demonstrate about multi-model review?",
    options: [
      { id: 'a', label: "Multiple models are always slower" },
      { id: 'b', label: "Different models catch different errors - cross-checking improves coverage", correct: true },
      { id: 'c', label: "The models are randomly guessing" },
      { id: 'd', label: "One model is clearly superior" }
    ],
    explanation: "Different models have different training data and architectures, leading to different blind spots. Cross-checking leverages these differences for better overall coverage."
  },
  {
    scenario: "A race condition bug in concurrent code was not caught by any single-model review pass but was found when the prompt explicitly said 'identify potential race conditions and deadlocks'.",
    question: "What principle does this illustrate?",
    options: [
      { id: 'a', label: "Race conditions are impossible to find" },
      { id: 'b', label: "Specific prompts focus the model's attention on specific error types", correct: true },
      { id: 'c', label: "Only humans can find concurrency bugs" },
      { id: 'd', label: "Random prompts work equally well" }
    ],
    explanation: "Directed prompts focus the model's reasoning on specific concerns. Without explicit focus, the model may not allocate attention to complex issues like race conditions."
  },
  {
    scenario: "A review pass that finds no issues is presented to the development team. An experienced engineer asks 'Was the checklist comprehensive enough?'",
    question: "Why is this a valid concern?",
    options: [
      { id: 'a', label: "All code must have bugs" },
      { id: 'b', label: "A clean review might indicate incomplete checklist rather than perfect code", correct: true },
      { id: 'c', label: "Review passes should always find exactly 3 bugs" },
      { id: 'd', label: "The engineer is being unnecessarily skeptical" }
    ],
    explanation: "A clean review should prompt reflection on checklist completeness. If the checklist didn't cover relevant error types for this domain, bugs might still exist undetected."
  },
  {
    scenario: "Company A uses single-pass generation. Company B adds review passes with domain-specific checklists. After 6 months, Company B has 40% fewer production incidents.",
    question: "What is the key insight from this comparison?",
    options: [
      { id: 'a', label: "Company B's developers are smarter" },
      { id: 'b', label: "Independent critique in review mode catches errors that generation mode misses", correct: true },
      { id: 'c', label: "Company A should use a different model" },
      { id: 'd', label: "Production incidents are unpredictable" }
    ],
    explanation: "The model-as-reviewer pattern - using a separate pass focused on error detection - systematically catches bugs that single-pass generation tends to produce but not notice."
  },
  {
    scenario: "A scientific simulation produces results that look reasonable but violate conservation of energy. The bug was a subtle sign error in the integration routine.",
    question: "Which review prompt would most likely catch this?",
    options: [
      { id: 'a', label: "Make the code run faster" },
      { id: 'b', label: "Verify that conservation laws are satisfied in all calculations", correct: true },
      { id: 'c', label: "Add more comments to the code" },
      { id: 'd', label: "Rename variables for clarity" }
    ],
    explanation: "Conservation law verification is essential for physics code. A review pass specifically checking that energy, momentum, and mass are conserved catches non-physical results."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F52C}',
    title: 'Scientific Computing',
    short: 'Catching dimension and conservation errors',
    tagline: 'Physics simulations require mathematical precision',
    description: 'Physics simulations demand dimensional consistency and conservation law adherence. A single missing factor or wrong operator can produce plausible-looking but completely wrong results. These bugs are particularly dangerous because the output appears reasonable to casual inspection.',
    connection: 'Review prompts like "check units and conservation laws" catch subtle errors like missing 1/2 factors in kinetic energy, wrong operators (+ vs *), and violations of energy conservation. This is why independent critique is essential for scientific code.',
    howItWorks: 'After generation, a review pass verifies: (1) All terms have consistent units, (2) Conservation laws are satisfied, (3) Edge cases like negative values are handled, (4) Numerical stability is maintained across a range of inputs.',
    stats: [
      { value: '60%', label: 'Bugs caught by units check', icon: '\u{1F4CF}' },
      { value: '3\u00D7', label: 'Fewer physics errors', icon: '\u{1F3AF}' },
      { value: '$2M', label: 'Saved in sim reruns', icon: '\u{1F4B0}' }
    ],
    examples: ['NASA simulations', 'CERN data analysis', 'Climate models', 'Fusion research'],
    companies: ['NVIDIA SimNet', 'Ansys', 'COMSOL', 'OpenFOAM'],
    futureImpact: 'AI-assisted physics verification will become standard, with specialized review models trained on physics principles.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F3E6}',
    title: 'Financial Calculations',
    short: 'Preventing money-from-nothing errors',
    tagline: 'Financial code must handle every edge case',
    description: 'Financial systems must handle edge cases like zero balances, negative values, rounding errors, and overflow conditions. Subtle bugs can create or destroy money, leading to catastrophic downstream effects in production environments.',
    connection: 'Review checklists for financial code include: bounds checking, precision handling, audit trail requirements, and regulatory compliance. Cross-checking catches rounding errors same-model review misses.',
    howItWorks: 'Review passes verify: (1) No negative balances where prohibited, (2) Proper rounding modes for currency, (3) Overflow protection, (4) Transaction atomicity, (5) Audit logging for every operation.',
    stats: [
      { value: '$4.5B', label: 'Annual bug losses prevented', icon: '\u{1F6E1}' },
      { value: '99.99%', label: 'Transaction accuracy', icon: '\u2705' },
      { value: '45%', label: 'Faster audit compliance', icon: '\u{1F552}' }
    ],
    examples: ['Trading systems', 'Payment processing', 'Risk calculations', 'Tax computations'],
    companies: ['Stripe', 'Bloomberg', 'Two Sigma', 'Citadel'],
    futureImpact: 'Regulatory bodies may require AI review passes for financial code, creating new compliance standards.',
    color: '#10B981'
  },
  {
    icon: '\u{1F310}',
    title: 'API Design',
    short: 'Covering failure modes systematically',
    tagline: 'APIs must handle invalid inputs gracefully',
    description: 'APIs must handle invalid inputs, rate limits, authentication failures, and error conditions. Generation tends to focus on the happy path, leaving edge cases unhandled. This causes production incidents when unusual inputs arrive.',
    connection: 'Review prompts asking "what happens with invalid input? Missing auth? Rate limited?" force consideration of failure modes that would otherwise become production incidents affecting users.',
    howItWorks: 'Review verifies: (1) All inputs are validated, (2) Error responses are informative, (3) Authentication is checked before action, (4) Rate limiting is enforced, (5) Timeouts are handled gracefully.',
    stats: [
      { value: '70%', label: 'Fewer security vulns', icon: '\u{1F512}' },
      { value: '3hr', label: 'Mean time to detect', icon: '\u{1F514}' },
      { value: '99.9%', label: 'Uptime improvement', icon: '\u{1F4BB}' }
    ],
    examples: ['REST APIs', 'GraphQL endpoints', 'Webhooks', 'OAuth flows'],
    companies: ['Twilio', 'Plaid', 'Auth0', 'Postman'],
    futureImpact: 'API contracts will be automatically verified against implementation, with review passes checking for specification compliance.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F9F5}',
    title: 'Concurrent Code',
    short: 'Finding race conditions and deadlocks',
    tagline: 'Concurrency bugs hide until production',
    description: 'Multi-threaded code has subtle race conditions and deadlock risks that are notoriously hard to spot. These bugs often appear only under production load and are extremely difficult to reproduce in testing.',
    connection: 'Directed review prompts like "identify potential race conditions and deadlocks" apply focused attention that generation mode lacks. Different models may spot different threading issues.',
    howItWorks: 'Review checks: (1) Shared state is properly synchronized, (2) Lock ordering prevents deadlock, (3) Atomic operations are used correctly, (4) Thread-safe data structures are used throughout.',
    stats: [
      { value: '85%', label: 'Race conditions found', icon: '\u26A1' },
      { value: '12\u00D7', label: 'Faster than manual review', icon: '\u{1F680}' },
      { value: '50%', label: 'Less debugging time', icon: '\u{1F41B}' }
    ],
    examples: ['Database engines', 'Game servers', 'Trading platforms', 'Real-time systems'],
    companies: ['Intel TBB', 'Uber', 'Discord', 'Epic Games'],
    futureImpact: 'Static analysis tools will integrate with LLM review for comprehensive concurrency verification.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ModelAsReviewerRenderer: React.FC<ModelAsReviewerRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
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
  const { isMobile } = useViewport();
// Simulation state - sliders
  const [reviewStrength, setReviewStrength] = useState(50);
  const [crossCheckStrength, setCrossCheckStrength] = useState(30);

  // Derived states from sliders
  const checkUnits = reviewStrength >= 30;
  const checkConservation = reviewStrength >= 50;
  const checkEdgeCases = reviewStrength >= 70;
  const checkBounds = reviewStrength >= 90;
  const useCrossChecker = crossCheckStrength >= 50;
  const useReviewPass = reviewStrength > 0;

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [confirmedAnswer, setConfirmedAnswer] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
// Sample code with hidden bugs
  const codeSample = {
    bugs: [
      { line: 3, type: 'units', description: 'Missing 1/2 factor: KE = (1/2)mv\u00B2' },
      { line: 8, type: 'logic', description: 'Using + instead of *: F = m*a' },
      { line: 12, type: 'edge_case', description: 'Negative velocity excluded' }
    ]
  };

  // Calculate review effectiveness from slider
  const calculateReviewScore = useCallback(() => {
    let detected = 0;
    const total = codeSample.bugs.length;

    if (checkUnits) detected++;
    if (checkConservation) detected++;
    if (checkEdgeCases) detected++;

    const reviewEffectiveness = (detected / total) * 100;
    const crossCheckBonus = useCrossChecker ? 20 : 0;

    return {
      detected,
      total,
      effectiveness: Math.min(100, reviewEffectiveness + crossCheckBonus),
    };
  }, [checkUnits, checkConservation, checkEdgeCases, useCrossChecker, codeSample.bugs.length]);

  // Premium design colors
  const colors = {
    ...theme.colors,
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgDark: 'rgba(15, 23, 42, 0.95)',
    code: '#3b82f6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 }
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
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
        gameType: 'model-as-reviewer',
        gameTitle: 'Model as Reviewer',
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
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease'
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0'
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
            transition: 'all 0.3s ease'
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom bar with Back and Next
  const renderBottomBar = (nextLabel: string, onNext?: () => void, nextDisabled?: boolean) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
        gap: '12px',
        marginTop: '16px'
      }}>
        <button
          onClick={() => { if (canBack) prevPhase(); }}
          style={{
            padding: '14px 24px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontWeight: 600,
            fontSize: '15px'
          }}
        >
          {'\u2190'} Back
        </button>
        <button
          onClick={() => {
            if (!nextDisabled && onNext) {
              playSound('success');
              onNext();
            }
          }}
          disabled={nextDisabled}
          style={{
            padding: '14px 28px',
            borderRadius: '10px',
            border: 'none',
            background: nextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #D97706)`,
            color: 'white',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            opacity: nextDisabled ? 0.4 : 1,
            fontWeight: 700,
            fontSize: '15px',
            boxShadow: nextDisabled ? 'none' : `0 4px 20px ${withOpacity(colors.accent, 0.3)}`
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

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
    boxShadow: `0 4px 20px ${withOpacity(colors.accent, 0.3)}`,
    transition: 'all 0.2s ease'
  };

  // Code Review Visualization - uses absolute coordinates, no g transforms for text
  const renderVisualization = (interactive: boolean, showCrossCheck: boolean = false) => {
    const width = 700;
    const height = 480;
    const score = calculateReviewScore();

    // Code lines
    const codeLines = [
      'def calculate_energy(mass, velocity):',
      '    # E = mv\u00B2 (kinetic energy)',
      '    energy = mass * velocity * velocity',
      '    return energy',
      '',
      'def calculate_force(mass, acceleration):',
      '    # F = ma',
      '    force = mass + acceleration  # BUG',
      '    return force',
      '',
      'def calculate_momentum(mass, velocity):',
      '    if velocity > 0:  # BUG: negative',
      '        momentum = mass * velocity',
      '        return momentum'
    ];

    // Panel positions - absolute
    const codeX = 20;
    const codeY = 55;
    const codeW = 280;
    const codeH = 220;

    const checkerX = 400;
    const checkerY = 55;

    const resultX = 20;
    const resultY = 310;
    const resultW = 660;
    const resultH = 80;

    // Bar chart
    const barX = 20;
    const barY = 410;
    const barW = 660;
    const barH = 60;

    const effectivenessWidth = Math.max(0, (score.effectiveness / 100) * 200);
    const effColor = score.effectiveness > 80 ? colors.success : score.effectiveness > 50 ? colors.warning : colors.error;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '750px' }}
       role="img" aria-label="Model As Reviewer visualization">
        <defs>
          <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="glowMarker" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#06b6d4" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
            <feMerge>
              <feMergeNode in="colorBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bugGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#ef4444" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
            <feMerge>
              <feMergeNode in="colorBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="codePanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="checkerBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(30,58,95,0.6)" />
            <stop offset="100%" stopColor="rgba(14,116,144,0.2)" />
          </linearGradient>
          <linearGradient id="successBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <pattern id="gridDots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="rgba(148,163,184,0.15)" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#reviewBg)" rx="12" />
        <rect width="100%" height="100%" fill="url(#gridDots)" rx="12" />

        {/* Title */}
        <text x={width / 2} y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="600">
          AI Code Review Dashboard
        </text>

        {/* Grid lines for visual reference */}
        <line x1="20" y1="50" x2="680" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        <line x1="20" y1="300" x2="680" y2="300" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        <line x1="20" y1="400" x2="680" y2="400" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

        {/* Code panel background */}
        <rect x={codeX} y={codeY} width={codeW} height={codeH} rx="8" fill="url(#codePanelBg)" stroke="#334155" />
        <rect x={codeX} y={codeY} width={codeW} height="24" rx="8" fill="#1e293b" />
        <circle cx={codeX + 12} cy={codeY + 12} r="4" fill="#ef4444" />
        <circle cx={codeX + 26} cy={codeY + 12} r="4" fill="#f59e0b" />
        <circle cx={codeX + 40} cy={codeY + 12} r="4" fill="#10b981" />
        <text x={codeX + codeW / 2} y={codeY + 16} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          physics_calc.py
        </text>

        {/* Code lines - absolute coordinates */}
        {codeLines.map((line, i) => {
          const hasBug = codeSample.bugs.some(b => b.line === i + 1);
          const bugDetected = hasBug && useReviewPass && (
            (i + 1 === 3 && checkUnits) ||
            (i + 1 === 8 && checkConservation) ||
            (i + 1 === 12 && checkEdgeCases)
          );
          const lineY = codeY + 40 + i * 13;

          return (
            <React.Fragment key={i}>
              <text x={codeX + 8} y={lineY} fill={colors.textMuted} fontSize="11" fontFamily="monospace">
                {i + 1}
              </text>
              {bugDetected && (
                <rect x={codeX + 20} y={lineY - 9} width={250} height="12" fill="rgba(239,68,68,0.2)" rx="2" />
              )}
              <text
                x={codeX + 24}
                y={lineY}
                fill={bugDetected ? colors.error : line.includes('#') ? '#6b7280' : colors.textMuted}
                fontSize="11"
                fontFamily="monospace"
              >
                {line.substring(0, 35)}
              </text>
              {bugDetected && (
                <circle cx={codeX + codeW - 10} cy={lineY - 3} r="4" fill={colors.error} filter="url(#glowMarker)" />
              )}
            </React.Fragment>
          );
        })}

        {/* AI Model indicator - absolute coords */}
        <g>
          <circle cx="360" cy="140" r="35" fill={useReviewPass ? 'rgba(6,182,212,0.2)' : 'rgba(100,116,139,0.2)'} stroke={useReviewPass ? '#06b6d4' : '#475569'} strokeWidth="2" />
          <circle cx="360" cy="140" r="20" fill={useReviewPass ? 'rgba(6,182,212,0.4)' : 'rgba(71,85,105,0.4)'} />
          {/* Interactive marker - moves with reviewStrength slider */}
          <circle cx={320 + reviewStrength * 0.8} cy={120 + (100 - reviewStrength) * 0.4} r="8" fill={useReviewPass ? colors.accent : '#475569'} filter="url(#glowMarker)" stroke="#ffffff" strokeWidth="2" />
          <text x="360" y="190" textAnchor="middle" fill={colors.textSecondary} fontSize="12">
            {useReviewPass ? 'REVIEWING...' : 'STANDBY'}
          </text>
        </g>

        {/* Signal paths */}
        <g>
          <path d={`M ${codeX + codeW} 150 L 325 150`} stroke={useReviewPass ? '#06b6d4' : '#475569'} strokeWidth="2" fill="none" strokeDasharray={useReviewPass ? "none" : "4 4"} />
          <path d={`M 395 150 L ${checkerX} 150`} stroke={useReviewPass ? '#06b6d4' : '#475569'} strokeWidth="2" fill="none" strokeDasharray={useReviewPass ? "none" : "4 4"} />
          <polygon points="325,145 335,150 325,155" fill={useReviewPass ? '#06b6d4' : '#475569'} />
          <polygon points={`${checkerX - 5},145 ${checkerX},150 ${checkerX - 5},155`} fill={useReviewPass ? '#06b6d4' : '#475569'} />
        </g>

        {/* Checklist panel - absolute coords */}
        <rect x={checkerX} y={checkerY} width="180" height="220" rx="8" fill="url(#checkerBg)" stroke="#0e7490" />
        <text x={checkerX + 90} y={checkerY + 20} textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">
          Review Checklist
        </text>

        {[
          { label: 'Unit Consistency', checked: checkUnits, yOff: 40 },
          { label: 'Conservation Laws', checked: checkConservation, yOff: 78 },
          { label: 'Edge Cases', checked: checkEdgeCases, yOff: 116 },
          { label: 'Bounds Check', checked: checkBounds, yOff: 154 }
        ].map((item) => (
          <React.Fragment key={item.label}>
            <rect
              x={checkerX + 8}
              y={checkerY + item.yOff}
              width="164"
              height="30"
              rx="6"
              fill={item.checked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}
              stroke={item.checked ? colors.success : 'rgba(255,255,255,0.1)'}
            />
            <circle
              cx={checkerX + 26}
              cy={checkerY + item.yOff + 15}
              r="8"
              fill={item.checked ? colors.success : 'rgba(100,116,139,0.3)'}
            />
            <text x={checkerX + 26} y={checkerY + item.yOff + 19} textAnchor="middle" fill="white" fontSize="11">
              {item.checked ? '\u2713' : ''}
            </text>
            <text x={checkerX + 42} y={checkerY + item.yOff + 19} fill={item.checked ? colors.success : colors.textSecondary} fontSize="12">
              {item.label}
            </text>
          </React.Fragment>
        ))}

        {showCrossCheck && (
          <React.Fragment>
            <rect
              x={checkerX + 8}
              y={checkerY + 192}
              width="164"
              height="22"
              rx="6"
              fill={useCrossChecker ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'}
              stroke={useCrossChecker ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}
            />
            <text x={checkerX + 90} y={checkerY + 207} textAnchor="middle" fill={useCrossChecker ? '#a78bfa' : colors.textMuted} fontSize="12">
              {useCrossChecker ? 'Cross-Check ON' : '+ Cross-Checker'}
            </text>
          </React.Fragment>
        )}

        {/* Results panel - absolute */}
        <rect x={resultX} y={resultY} width={resultW} height={resultH} rx="8" fill="rgba(31,41,55,0.8)" stroke="#374151" />

        <text x={resultX + 16} y={resultY + 20} fill={colors.textSecondary} fontSize="12">Effectiveness</text>
        <rect x={resultX + 16} y={resultY + 28} width="200" height="14" rx="4" fill="rgba(0,0,0,0.4)" />
        <rect x={resultX + 16} y={resultY + 28} width={effectivenessWidth} height="14" rx="4" fill={effColor} />
        <text x={resultX + 116} y={resultY + 39} textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
          {score.effectiveness.toFixed(0)}%
        </text>

        <text x={resultX + 240} y={resultY + 20} fill={colors.textSecondary} fontSize="12">Bugs Found</text>
        <text x={resultX + 240} y={resultY + 45} fill={colors.accent} fontSize="18" fontWeight="700">
          {score.detected} / {score.total}
        </text>

        <text x={resultX + 400} y={resultY + 20} fill={colors.textSecondary} fontSize="12">Status</text>
        <circle
          cx={resultX + 410}
          cy={resultY + 40}
          r="8"
          fill={useReviewPass ? (score.effectiveness > 80 ? colors.success : colors.warning) : 'rgba(100,116,139,0.3)'}
        />
        <text x={resultX + 424} y={resultY + 44} fill={useReviewPass ? (score.effectiveness > 80 ? colors.success : colors.warning) : colors.textMuted} fontSize="12">
          {useReviewPass ? (score.effectiveness > 80 ? 'PASSING' : 'ISSUES') : 'INACTIVE'}
        </text>

        {/* Comparison bar chart - reference vs current */}
        <text x={barX + 16} y={barY + 14} fill={colors.textSecondary} fontSize="12">Baseline (No Review)</text>
        <rect x={barX + 200} y={barY + 4} width="100" height="14" rx="3" fill={colors.error} opacity="0.6" />
        <text x={barX + 310} y={barY + 14} fill={colors.textMuted} fontSize="11">33% coverage</text>

        <text x={barX + 16} y={barY + 38} fill={colors.textPrimary} fontSize="12">Current Review</text>
        <rect x={barX + 200} y={barY + 28} width={Math.max(10, score.effectiveness * 2)} height="14" rx="3" fill={effColor} />
        <text x={barX + 210 + score.effectiveness * 2} y={barY + 38} fill={colors.textPrimary} fontSize="11">{score.effectiveness.toFixed(0)}% coverage</text>

        {/* Min/max labels */}
        <text x={barX + 200} y={barY + 56} fill={colors.textMuted} fontSize="11">0%</text>
        <text x={barX + 395} y={barY + 56} fill={colors.textMuted} fontSize="11">100%</text>

        {/* Formula */}
        <text x={resultX + 520} y={resultY + 20} fill={colors.accent} fontSize="12" fontWeight="600">
          Formula:
        </text>
        <text x={resultX + 520} y={resultY + 38} fill={colors.textSecondary} fontSize="11">
          P = (checks/total) {'\u00D7'} 100
        </text>
        <text x={resultX + 520} y={resultY + 54} fill={colors.textSecondary} fontSize="11">
          + crossCheck bonus
        </text>
      </svg>
    );
  };

  // Shared scroll container wrapper
  const renderPhaseWrapper = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      background: colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '60px',
        paddingBottom: '16px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          {children}
        </div>
      </div>
      <div style={{ padding: '8px 24px' }}>
        {renderNavDots()}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseWrapper(
      <>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            {'\u{1F50D}'}
          </div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Model as Reviewer
          </h1>

          <p className="text-secondary" style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            margin: '0 auto 32px'
          }}>
            Discover how <span style={{ color: colors.success }}>independent critique</span> catches
            bugs that generation mode misses. Let's explore why a second review pass is essential.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto',
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "LLMs optimize for plausibility during generation - code that looks correct.
              But looking correct and being correct are different things. A second pass
              in reviewer mode applies different objectives that catch hidden errors."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              - AI Safety Research Principles
            </p>
          </div>
        </div>
        {renderBottomBar('Start Discovery \u2192', nextPhase)}
      </>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'One pass is enough - modern LLMs can write correct code' },
      { id: 'b', text: 'A second review pass catches errors that slip through in generation', correct: true },
      { id: 'c', text: 'Review passes do not help - the same model makes the same mistakes' }
    ];

    return renderPhaseWrapper(
      <>
        <div style={{
          background: `${colors.accent}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}44`
        }}>
          <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
            {'\u{1F914}'} Make Your Prediction
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          An LLM generates physics code. A second pass reviews it with "check for unit errors, conservation violations, edge cases." What happens?
        </h2>

        {/* Visualization preview */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          {renderVisualization(false)}
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
                transition: 'all 0.2s'
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
                fontWeight: 700
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ color: colors.textPrimary, ...typo.body }}>
                {opt.text}
              </span>
            </button>
          ))}
        </div>

        {renderBottomBar('Test My Prediction \u2192', nextPhase, !prediction)}
      </>
    );
  }

  // PLAY PHASE - Interactive Review Simulator
  if (phase === 'play') {
    return renderPhaseWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Code Review Simulator
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          Watch how increasing the review strength affects bug detection. Notice when each checklist item activates and observe how the effectiveness bar changes in real-time.
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
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderVisualization(true)}
              </div>
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
            }}>
              {/* Review Strength Slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Review: {reviewStrength}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={reviewStrength}
                  onChange={(e) => setReviewStrength(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    accentColor: colors.accent,
                    touchAction: 'pan-y',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                  {reviewStrength < 30 ? 'No checks active' :
                   reviewStrength < 50 ? 'Units check only' :
                   reviewStrength < 70 ? 'Units + Conservation' :
                   reviewStrength < 90 ? 'All 3 core checks' : 'Full coverage'}
                </div>
              </div>

              {/* Key observations */}
              <div style={{
                background: `${colors.accent}11`,
                border: `1px solid ${colors.accent}33`,
                borderRadius: '12px',
                padding: '12px'
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  Key Observations:
                </h4>
                <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                  <li>Above 30%: unit check activates</li>
                  <li>Above 50%: conservation check</li>
                  <li>Above 70%: edge case check</li>
                  <li>Directed prompts beat general review</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            The review strength parameter is calculated as P = (checks/total) \u00D7 100 + bonus. Higher review strength means more checklist items are active, and more bugs are caught. This demonstrates why technology companies like Google and Microsoft use multi-pass review in their engineering workflows.
          </p>
        </div>

        {renderBottomBar('Understand the Physics \u2192', nextPhase)}
      </>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';

    return renderPhaseWrapper(
      <>
        <div style={{
          background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
          border: `1px solid ${wasCorrect ? colors.success : colors.error}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? '\u2705 Correct! Your prediction was right.' : '\u274C The Answer: Review Passes Help'}
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            You predicted: "{prediction === 'a' ? 'One pass is enough' : prediction === 'b' ? 'Review catches errors' : prediction === 'c' ? 'Review does not help' : 'No prediction'}".
            A second pass in review mode catches errors that slip through generation.
            The key is directing attention with specific checks.
          </p>
        </div>

        {/* Review phase SVG diagram */}
        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          {renderVisualization(false)}
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Why Independent Critique Works
          </h3>
          <div style={{ ...typo.body, color: colors.textSecondary }}>
            <p style={{ marginBottom: '16px' }}>
              <strong style={{ color: colors.accent }}>Different Objectives:</strong> Generation
              mode optimizes for "write code that does X." Review mode optimizes for "find
              problems with this code." Different objectives reveal different issues.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong style={{ color: colors.accent }}>Directed Attention:</strong> Asking
              "check units" forces examination of dimensional analysis. Without this prompt,
              the model might not think about units at all.
            </p>
            <p>
              <strong style={{ color: colors.accent }}>The Key Prompt:</strong> "Review for
              unit consistency, conservation laws, edge cases, failure modes."
            </p>
          </div>
        </div>

        <div style={{
          background: `${colors.info}22`,
          border: `1px solid ${colors.info}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ ...typo.h3, color: colors.info, marginBottom: '12px' }}>
            The Bugs Found
          </h3>
          <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
            <li><strong>Line 3:</strong> Missing 1/2 factor - KE = (1/2)mv\u00B2, not mv\u00B2</li>
            <li><strong>Line 8:</strong> Wrong operator - F = m*a, not m+a</li>
            <li><strong>Line 12:</strong> Logic error - momentum can be negative</li>
          </ul>
        </div>

        {renderBottomBar('Discover the Twist \u2192', nextPhase)}
      </>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Using the same model twice is sufficient for review' },
      { id: 'b', text: 'Different models/tools catch different errors - cross-checking improves coverage', correct: true },
      { id: 'c', text: 'Using multiple models is too expensive to be practical' }
    ];

    return renderPhaseWrapper(
      <>
        <div style={{
          background: `${colors.warning}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.warning}44`
        }}>
          <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
            {'\u{1F504}'} New Variable: Cross-Checking
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          What if we use different models or tools as cross-checkers instead of the same model reviewing itself? Watch what changes.
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          {renderVisualization(false, true)}
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
                cursor: 'pointer'
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
                fontWeight: 700
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ color: colors.textPrimary, ...typo.body }}>
                {opt.text}
              </span>
            </button>
          ))}
        </div>

        {renderBottomBar('See Cross-Check Effect \u2192', nextPhase, !twistPrediction)}
      </>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Cross-Check Simulator
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          Observe how adding a cross-checker from a different model increases detection coverage beyond what single-model review achieves.
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
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderVisualization(true, true)}
              </div>
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
            }}>
              {/* Cross-check Strength Slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Cross-Check: {crossCheckStrength}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={crossCheckStrength}
                  onChange={(e) => setCrossCheckStrength(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    accentColor: '#8b5cf6',
                    touchAction: 'pan-y',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ ...typo.small, color: useCrossChecker ? '#a78bfa' : colors.textMuted, marginTop: '4px' }}>
                  {useCrossChecker ? '+20% effectiveness bonus' : 'Below threshold (50%)'}
                </div>
              </div>

              <div style={{
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '12px',
                padding: '12px'
              }}>
                <h4 style={{ ...typo.small, color: '#a78bfa', marginBottom: '8px', fontWeight: 600 }}>
                  Cross-Checker Benefits:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontSize: '12px' }}>
                  Different models have different blind spots. Cross-checking reduces correlated blind spots by +20% effectiveness.
                </p>
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar('Understand the Solution \u2192', nextPhase)}
      </>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistWasCorrect = twistPrediction === 'b';

    return renderPhaseWrapper(
      <>
        <div style={{
          background: twistWasCorrect ? `${colors.success}22` : `${colors.error}22`,
          border: `1px solid ${twistWasCorrect ? colors.success : colors.error}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ ...typo.h3, color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {twistWasCorrect ? '\u2705 Correct!' : '\u274C Cross-Checking Improves Coverage'}
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            Different models have different blind spots. Cross-checking reduces correlated mistakes.
          </p>
        </div>

        {/* Twist review diagram */}
        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          {renderVisualization(false, true)}
        </div>

        <h3 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          Building a Review Pipeline
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            { level: 1, title: 'Same-Model Review', desc: 'Review with checklist (units, conservation, edge cases)', color: colors.success },
            { level: 2, title: 'Cross-Model Review', desc: 'Different LLM reviews (Claude + GPT, for example)', color: colors.info },
            { level: 3, title: 'Static Analysis', desc: 'Linters, type checkers, dimensional analysis tools', color: colors.warning },
            { level: 4, title: 'Property Testing', desc: 'Automated verification of invariants', color: '#8b5cf6' }
          ].map(item => (
            <div
              key={item.level}
              style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                borderLeft: `4px solid ${item.color}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: item.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px'
                }}>
                  {item.level}
                </span>
                <h4 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{item.title}</h4>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '40px' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {renderBottomBar('See Real-World Applications \u2192', nextPhase)}
      </>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Model As Reviewer"
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

    return renderPhaseWrapper(
      <>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          Real-World Applications
        </h2>

        {/* App selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px'
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
                position: 'relative'
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
                  lineHeight: '18px'
                }}>
                  {'\u2713'}
                </div>
              )}
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{a.icon}</div>
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
          borderLeft: `4px solid ${app.color}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '28px' }}>{app.icon}</span>
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
            marginBottom: '16px'
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              How Review Patterns Apply:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.connection}
            </p>
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              How It Works:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.howItWorks}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Industry Examples:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.examples.join(', ')}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Companies Using This:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.companies.join(', ')}
            </p>
          </div>

          <div>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Future Impact:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.futureImpact}
            </p>
          </div>

          {/* Got It button */}
          <button
            onClick={() => {
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              playSound('success');
            }}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              borderRadius: '10px',
              border: completedApps[selectedApp] ? `2px solid ${colors.success}` : `2px solid ${app.color}`,
              background: completedApps[selectedApp] ? `${colors.success}22` : `${app.color}22`,
              color: completedApps[selectedApp] ? colors.success : app.color,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              width: '100%'
            }}
          >
            {completedApps[selectedApp] ? '\u2713 Got It' : 'Got It'}
          </button>
        </div>

        {allAppsCompleted && renderBottomBar('Take the Knowledge Test \u2192', nextPhase)}
        {!allAppsCompleted && (
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
            Visit all 4 applications and click "Got It" on each to unlock the test.
          </p>
        )}
      </>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;

      if (passed && onCorrectAnswer) onCorrectAnswer();
      if (!passed && onIncorrectAnswer) onIncorrectAnswer();

      return renderPhaseWrapper(
        <>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: '8px 0' }}>
              You scored
            </p>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand model-as-reviewer patterns!'
                : 'Review the concepts and try again.'}
            </p>
          </div>

          {/* Answer Key */}
          <div style={{ padding: '16px' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
            {testQuestions.map((q, idx) => {
              const userAnswer = testAnswers[idx];
              const correctOption = q.options.find(o => o.correct);
              const correctAnswer = correctOption?.id;
              const userOption = q.options.find(o => o.id === userAnswer);
              const isCorrect = userAnswer === correctAnswer;
              return (
                <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                    <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                  </div>
                  {!isCorrect && userOption && (<div style={{ marginLeft: '26px', marginBottom: '6px' }}><span style={{ color: colors.error, fontSize: '13px' }}>Your answer: </span><span style={{ color: '#64748b', fontSize: '13px' }}>{userOption.label}</span></div>)}
                  <div style={{ marginLeft: '26px', marginBottom: '8px' }}><span style={{ color: colors.success, fontSize: '13px' }}>Correct answer: </span><span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.label}</span></div>
                  <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}><span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span><span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span></div>
                </div>
              );
            })}
          </div>

          {passed ? (
            <button
              onClick={() => { playSound('complete'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
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
                setConfirmedAnswer(false);
                goToPhase('hook');
              }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Review and Try Again
            </button>
          )}
        </>
      );
    }

    const question = testQuestions[currentQuestion];
    const selectedAnswer = testAnswers[currentQuestion];
    const correctId = question.options.find(o => o.correct)?.id;

    return renderPhaseWrapper(
      <>
        {/* Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
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
                    : colors.border
              }} />
            ))}
          </div>
        </div>

        {/* Phase label */}
        <div style={{
          background: `${colors.accent}11`,
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '16px',
          border: `1px solid ${colors.accent}33`
        }}>
          <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
            Knowledge Test - Select the correct answer for each scenario-based question below
          </p>
        </div>

        {/* Scenario */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          borderLeft: `3px solid ${colors.accent}`
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
            {question.scenario}
          </p>
        </div>

        {/* Question */}
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
          {question.question}
        </h3>

        {/* Options with A) B) C) D) format */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {question.options.map(opt => {
            const isSelected = selectedAnswer === opt.id;
            const showResult = confirmedAnswer;
            const isCorrectOption = opt.id === correctId;
            let borderColor = colors.border;
            let bgColor = colors.bgCard;

            if (showResult && isCorrectOption) {
              borderColor = colors.success;
              bgColor = `${colors.success}22`;
            } else if (showResult && isSelected && !isCorrectOption) {
              borderColor = colors.error;
              bgColor = `${colors.error}22`;
            } else if (isSelected) {
              borderColor = colors.accent;
              bgColor = `${colors.accent}22`;
            }

            return (
              <button
                key={opt.id}
                onClick={() => {
                  if (!confirmedAnswer) {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }
                }}
                style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: confirmedAnswer ? 'default' : 'pointer'
                }}
              >
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.id.toUpperCase()}) {opt.label}
                </span>
                {showResult && isCorrectOption && (
                  <span style={{ marginLeft: '8px', color: colors.success }}>{'\u2705'}</span>
                )}
                {showResult && isSelected && !isCorrectOption && (
                  <span style={{ marginLeft: '8px', color: colors.error }}>{'\u274C'}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation after confirm */}
        {confirmedAnswer && (
          <div style={{
            background: `${colors.info}11`,
            border: `1px solid ${colors.info}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentQuestion > 0 && (
            <button
              onClick={() => {
                setConfirmedAnswer(false);
                setCurrentQuestion(currentQuestion - 1);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer'
              }}
            >
              Previous
            </button>
          )}

          {/* Check Answer button - optional confirm before advancing */}
          {selectedAnswer && !confirmedAnswer && (
            <button
              onClick={() => {
                setConfirmedAnswer(true);
                playSound(selectedAnswer === correctId ? 'success' : 'failure');
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Check Answer
            </button>
          )}

          {/* Next Question - available when answer selected */}
          {selectedAnswer && currentQuestion < 9 && (
            <button
              onClick={() => {
                if (!confirmedAnswer) {
                  setConfirmedAnswer(true);
                }
                setConfirmedAnswer(false);
                setCurrentQuestion(currentQuestion + 1);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Next Question
            </button>
          )}

          {/* Submit Test on last question */}
          {selectedAnswer && currentQuestion === 9 && (
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
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: colors.success,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseWrapper(
      <>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px'
          }}>
            {'\u{1F3C6}'}
          </div>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Model-as-Reviewer Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 32px' }}>
            You now understand how independent critique catches bugs that generation mode misses.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Generation optimizes for plausibility, not correctness',
              'Review mode applies different objectives',
              'Checklists direct attention to error categories',
              'Cross-checking reduces correlated blind spots',
              'Specific prompts catch specific bug types'
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>{'\u2705'}</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}22`,
          border: `1px solid ${colors.accent}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px'
        }}>
          <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
            The Key Prompt:
          </h4>
          <p style={{ ...typo.body, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "Review for unit consistency, conservation laws, edge cases, failure modes."
          </p>
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
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
          <button onClick={() => { onGameEvent?.({ eventType: 'game_completed', gameType: 'model_as_reviewer', gameTitle: 'Model as Reviewer', details: { phase: 'mastery', score: testScore, maxScore: 10 }, timestamp: Date.now() }); window.location.href = '/games'; }}
            style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Complete Game →
          </button>
        </div>
      </>
    );
  }

  return null;
};

export default ModelAsReviewerRenderer;
