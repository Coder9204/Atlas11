# Master Prompt for Physics Simulation Games

## CRITICAL: First-Shot Success Requirements

This document ensures games work PERFECTLY on the first generation. Every requirement below was extracted from the WaveParticleDualityRenderer gold standard. Missing ANY of these caused early games to need multiple revisions.

---

## Why First-Generation Games Failed (Root Cause Analysis)

### 1. **Navigation Reliability Issues**
- **Problem**: Double-clicks, button jamming, flashing between phases
- **Root Cause**: Missing navigation debouncing, using `onClick` instead of `onMouseDown`
- **Fix**: Use BOTH `isNavigating.current` ref (400ms timeout) AND `lastClickRef` (200ms check) + `onMouseDown` with `e.preventDefault()`

### 1b. **Navigation Accessibility Issues (CRITICAL)**
- **Problem**: Users get stuck - can't proceed past phases, buttons hidden or not visible
- **Root Cause**: Bottom bar not sticky, buttons conditional-only without guidance
- **Fix**:
  - Bottom bar MUST be `position: sticky; bottom: 0; z-index: 100`
  - Bottom bar MUST have `minHeight: 72px` and visible shadow
  - Next button MUST have `minHeight: 52px; minWidth: 160px`
  - When next button is disabled, show "Select an option above to continue" hint
  - **USERS MUST NEVER GET STUCK WITHOUT A VISIBLE PATH FORWARD**

### 2. **Sound System Wrong Pattern**
- **Problem**: Inconsistent sounds, type errors with OscillatorType
- **Root Cause**: Using raw frequencies instead of semantic types
- **Fix**: Use typed `playSound('click' | 'success' | 'failure' | 'transition' | 'complete')` pattern

### 3. **Test Question Structure**
- **Problem**: Only 3-4 questions, inconsistent format, no learning value
- **Root Cause**: Simplified question template without scenarios/explanations
- **Fix**: ALWAYS 10 questions with `{scenario, question, options: [{id, label, correct?}], explanation}` structure

### 4. **Transfer Phase Severely Underspecified**
- **Problem**: Applications too shallow, no real educational value
- **Root Cause**: Template only specified title/description/icon
- **Fix**: Each app needs: title, short, tagline, description, connection, howItWorks, stats[], examples[], companies[], futureImpact, color + DETAILED SVG DIAGRAM (100+ lines)
- **CRITICAL**: Apps must unlock SEQUENTIALLY - user cannot access App 2 until App 1 is complete. All 4 must be complete before test phase unlocks.

### 5. **Render Helpers Defined as Components**
- **Problem**: React reconciliation issues causing UI glitches
- **Root Cause**: Helper components re-render incorrectly
- **Fix**: Use FUNCTIONS that return JSX (e.g., `renderProgressBar()`) NOT separate components

### 6. **Missing Premium Wrapper**
- **Problem**: Inconsistent styling, missing ambient effects
- **Root Cause**: No standardized wrapper component
- **Fix**: Use PremiumWrapper component with gradient background + 3 blur-3xl ambient glow circles

### 7. **Graphics Too Basic**
- **Problem**: Simple shapes with no depth or animation
- **Root Cause**: No detailed SVG specification
- **Fix**: Premium gradients, filters, animations, educational labels, multi-layer depth

### 8. **Missing Teaching Milestones**
- **Problem**: No contextual feedback during interactive phases
- **Root Cause**: Not specified in template
- **Fix**: Track progress (few/pattern/clear/many) with milestone-appropriate messages

---

## GOLD STANDARD TEMPLATE

Use this EXACT structure for every game. Copy this template verbatim and fill in the specifics.

```typescript
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// GAME EVENT INTERFACE FOR AI COACH INTEGRATION (REQUIRED)
// ═══════════════════════════════════════════════════════════════════════════
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed' | 'app_completed' | 'app_changed' |
             'question_changed' | 'visual_state_update';
  gameType: string;
  gameTitle: string;
  details: {
    currentScreen?: number;
    totalScreens?: number;
    phase?: string;
    phaseLabel?: string;
    prediction?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    needsHelp?: boolean;
    [key: string]: any;
  };
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' |
            'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface [GameName]RendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;  // For resume functionality
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - MUST BE DEFINED BEFORE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',  // Customize per game
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

// PREMIUM DARK THEME COLOR PALETTE (REQUIRED - matching Wave Particle Duality gold standard)
const colors = {
  // Background colors (dark theme)
  bgDark: '#0f172a',           // slate-900 - primary dark background
  bgCard: '#1e293b',           // slate-800 - card backgrounds
  bgGradientStart: '#1e1b4b',  // indigo-950 - gradient start
  bgGradientEnd: '#0f172a',    // slate-900 - gradient end

  // Brand colors (customize primary per game theme)
  primary: '#6366f1',          // indigo-500 - main brand color
  primaryDark: '#4f46e5',      // indigo-600 - darker shade
  primaryLight: '#818cf8',     // indigo-400 - lighter shade
  accent: '#8b5cf6',           // violet-500 - secondary accent
  accentDark: '#7c3aed',       // violet-600 - darker accent

  // Semantic colors
  success: '#22c55e',          // green-500 - correct/complete
  successLight: '#4ade80',     // green-400 - success highlights
  warning: '#f59e0b',          // amber-500 - caution/info
  error: '#ef4444',            // red-500 - incorrect/danger

  // Text colors (dark theme)
  textPrimary: '#f8fafc',      // slate-50 - primary text (white)
  textSecondary: '#cbd5e1',    // slate-300 - secondary text
  textMuted: '#64748b',        // slate-500 - muted/disabled text

  // Border & UI
  border: '#334155',           // slate-700 - borders
  borderLight: '#475569',      // slate-600 - lighter borders

  // Physics-specific colors (for diagrams)
  positive: '#ef4444',         // red for positive charge
  negative: '#3b82f6',         // blue for negative charge
  magnetic: '#a855f7',         // purple for magnetic fields
  electric: '#22c55e',         // green for electric current
};

// ═══════════════════════════════════════════════════════════════════════════
// SOUND SYSTEM - REQUIRED PATTERN (Must use types, not frequencies!)
// ═══════════════════════════════════════════════════════════════════════════
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
      success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
      failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
      transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
      complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
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

// ═══════════════════════════════════════════════════════════════════════════
// 10 QUESTIONS REQUIRED - Use LOCAL VALIDATION with `correct: true` marker
// CRITICAL: This pattern avoids Firebase dependency - answers validated locally!
// ═══════════════════════════════════════════════════════════════════════════
const testQuestions = [
  // Q1: Core Concept - Easy
  {
    scenario: "Real-world context that sets up the question. Include specific details, numbers, or situations that make the question feel grounded in reality.",
    question: "Clear, specific question about the concept?",
    options: [
      { id: 'a', label: "Plausible wrong answer (common misconception)" },
      { id: 'b', label: "Another plausible wrong answer" },
      { id: 'c', label: "The correct answer that demonstrates understanding", correct: true },  // <-- CRITICAL: correct: true marker
      { id: 'd', label: "Fourth option testing different aspect" },
    ],
    explanation: "Detailed explanation of WHY the answer is correct. Connect it back to what they learned in the experiment. Reinforce the key concept."
  },
  // Q2-3: Basic concept understanding
  // Q4-6: Application and deeper understanding
  // Q7-8: Real-world connections to the 4 applications
  // Q9-10: Synthesis and advanced understanding (hardest - often with twist scenarios)
  // ... repeat for all 10 questions with increasing difficulty
];

// LOCAL VALIDATION FUNCTION (REQUIRED - avoids Firebase dependency)
const checkAnswer = (questionIndex: number, selectedId: string): boolean => {
  const question = testQuestions[questionIndex];
  const selectedOption = question.options.find(opt => opt.id === selectedId);
  return selectedOption?.correct === true;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4 APPLICATIONS REQUIRED - RICH TRANSFER PHASE (Not shallow popups!)
// Each app is a FULL MODULE with all fields below. Users must complete
// apps SEQUENTIALLY - App 2 locked until App 1 complete, etc.
// ═══════════════════════════════════════════════════════════════════════════
const realWorldApps = [
  {
    // IDENTIFICATION
    icon: '💻',                              // Single emoji for recognition
    title: 'Application Name',               // 2-4 words (e.g., "Electric Motors")
    short: 'Brief 3-word summary',           // Compact descriptor (e.g., "Motion from electricity")
    tagline: 'Compelling subtitle',          // Hook attention (e.g., "Powering the Modern World")

    // CONTENT (All required for rich educational value)
    description: '2-3 sentences explaining how the physics concept enables this technology. Be specific about the mechanism, not vague.',

    connection: 'Explicit link to the experiment: "The [concept] you explored demonstrates X. In [application], the same principle is used to achieve Y. The key insight is Z..."',

    howItWorks: 'Step-by-step technical explanation using accessible language. Explain the mechanism clearly. 2-4 sentences.',

    // QUANTITATIVE DATA (Required - makes it memorable)
    stats: [
      { value: '1.5 billion', label: 'Electric motors worldwide', icon: '⚡' },
      { value: '$150B', label: 'Global market by 2030', icon: '📈' },
      { value: '90%+', label: 'Efficiency achieved', icon: '🎯' }
    ],

    // REAL EXAMPLES (4+ specific, relatable examples)
    examples: [
      'Power Tools: Drills, saws, and grinders use DC motors with brushes for high torque at variable speeds',
      'Electric Vehicles: Tesla motors spin at 18,000 RPM, converting battery power to wheel rotation',
      'Industrial Automation: Robotic arms in factories use precision DC motors for assembly lines',
      'Home Appliances: Washing machines, blenders, and vacuum cleaners rely on the same motor principles'
    ],

    // INDUSTRY CONTEXT
    companies: ['Tesla', 'Siemens', 'ABB', 'Bosch', 'Nidec'],

    // FUTURE/IMPACT (Create excitement about learning this)
    futureImpact: 'As the world transitions to electric everything, understanding motor physics becomes essential. Your phone, car, and future robot all depend on these principles.',

    // VISUAL STYLING
    color: colors.primary  // Each app gets unique color: primary, success, accent, warning
  },
  // App 2: Industrial/High-tech application (use colors.success)
  // App 3: Scientific/Medical application (use colors.accent)
  // App 4: Future/Emerging application (use colors.warning)
];

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFER PHASE STATE (REQUIRED - Sequential Locking Pattern)
// ═══════════════════════════════════════════════════════════════════════════
const [currentAppIndex, setCurrentAppIndex] = useState(0);
const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

// Check if app is accessible (sequential unlock)
const isAppAccessible = (index: number): boolean => {
  if (index === 0) return true;  // First app always accessible
  return completedApps[index - 1]; // Others require previous complete
};

// Check if test phase is unlocked
const isTestUnlocked = completedApps.every(c => c);  // All 4 must be complete

// ═══════════════════════════════════════════════════════════════════════════
// COACH MESSAGES - For AI integration
// ═══════════════════════════════════════════════════════════════════════════
const coachMessages: Record<Phase, string> = {
  hook: "Welcome! 🌟 [Brief engaging intro]. Ready to discover something amazing?",
  predict: "Time to make a prediction! What do YOU think will happen? There's no wrong answer here!",
  play: "Now let's run the experiment! Watch carefully and notice what happens.",
  review: "Interesting! Did you expect that? Let's understand why this happens...",
  twist_predict: "Here's where it gets interesting! What happens when we change [variable]?",
  twist_play: "Try it out! See how [variable] affects the outcome.",
  twist_review: "You've discovered [key insight]! This is why it matters...",
  transfer: "Now let's see how this powers amazing real-world technology! 🚀",
  test: "Time to test your understanding! Take your time with each question.",
  mastery: "Congratulations! 🎉 You've mastered [concept]!"
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const [GameName]Renderer: React.FC<[GameName]RendererProps> = ({ onGameEvent, gamePhase }) => {
  const validPhases: Phase[] = PHASES;

  // Use gamePhase from props if valid, otherwise default to 'hook'
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);  // For animations
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);

  // Game-specific state (customize)
  // const [specificValue, setSpecificValue] = useState(50);
  // const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'few' | 'pattern' | 'clear' | 'many'>('none');

  // ─── RESPONSIVE DESIGN (CRITICAL) ──────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── AI Coach Integration ──────────────────────────────────────────────────
  const [guidedMode, setGuidedMode] = useState(true);
  const [lastCoachMessage, setLastCoachMessage] = useState<string>('');

  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'game_type_snake_case',  // CUSTOMIZE
        gameTitle: 'Game Title Here',       // CUSTOMIZE
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // ─── Navigation (CRITICAL DUAL DEBOUNCING PATTERN) ─────────────────────────
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);  // REQUIRED: Second layer of protection

  const goToPhase = useCallback((p: Phase) => {
    // DUAL DEBOUNCE: Both time check AND flag check
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;  // Time-based debounce
    if (isNavigating.current) return;               // Flag-based debounce

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');

    // Emit phase change event
    const idx = PHASES.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: PHASES.length,
      coachMessage: guidedMode ? coachMessages[p] : undefined,
      message: `Entered phase: ${phaseLabels[p]}`
    });

    if (guidedMode) {
      setLastCoachMessage(coachMessages[p]);
    }

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, guidedMode]);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) goToPhase(PHASES[idx - 1]);
  }, [phase, goToPhase]);

  // ─── Animation Loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.02), 30);
    return () => clearInterval(interval);
  }, []);

  // ─── Emit game_started on mount ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      emitGameEvent('game_started', {
        phase: 'hook',
        phaseLabel: 'Introduction',
        currentScreen: 1,
        totalScreens: PHASES.length,
        coachMessage: guidedMode ? coachMessages.hook : '',
        message: 'Game started'
      });
      if (guidedMode) {
        setLastCoachMessage(coachMessages.hook);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ─── Confetti on mastery ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'mastery') {
      const confettiColors = ['#06b6d4', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
      setConfetti(Array.from({ length: 60 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: confettiColors[i % confettiColors.length],
        delay: Math.random() * 2
      })));
    }
  }, [phase]);

  // ─── Test score calculation ────────────────────────────────────────────────
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PREMIUM WRAPPER COMPONENT (REQUIRED)
  // ═══════════════════════════════════════════════════════════════════════════
  const PremiumWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      {/* Three ambient glow circles - customize colors per game theme */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Fixed Header with phase dots */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">[Game Title]</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => {
              const currentIdx = PHASES.indexOf(phase);
              return (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); if (i <= currentIdx) goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIdx
                      ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                      : i < currentIdx
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                  title={phaseLabels[p]}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content with padding for fixed header */}
      <div className="relative pt-16 pb-12">
        {children}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPER FUNCTIONS (NOT COMPONENTS - returns JSX directly)
  // This avoids React reconciliation issues
  // ═══════════════════════════════════════════════════════════════════════════

  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => {
    const currentIdx = PHASES.indexOf(phase);
    const buttonColor = accentColor || colors.primary;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard
      }}>
        <button
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: 'none',
            cursor: canGoBack && currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: canGoBack && currentIdx > 0 ? 1 : 0.3,
            minHeight: '44px'  // Touch-friendly
          }}
          onMouseDown={() => {
            if (canGoBack && currentIdx > 0) {
              goToPhase(PHASES[currentIdx - 1]);
            }
          }}
        >
          ← Back
        </button>
        <button
          style={{
            padding: '12px 32px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            background: canGoNext ? `linear-gradient(135deg, ${buttonColor} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
            color: colors.textPrimary,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.3,
            boxShadow: canGoNext ? `0 4px 20px ${buttonColor}40` : 'none',
            minHeight: '44px'  // Touch-friendly
          }}
          onMouseDown={() => {
            if (!canGoNext) return;
            if (onNext) {
              onNext();
            } else if (currentIdx < PHASES.length - 1) {
              goToPhase(PHASES[currentIdx + 1]);
            }
          }}
        >
          {nextLabel} →
        </button>
      </div>
    );
  };

  const renderKeyTakeaway = (icon: string, title: string, description: string, key?: number) => (
    <div key={key} style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      borderRadius: '16px',
      background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: colors.textPrimary }}>{title}</p>
        <p style={{ fontSize: '12px', lineHeight: 1.6, color: colors.textSecondary }}>{description}</p>
      </div>
    </div>
  );

  const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>{phaseName}</p>
      <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: colors.textPrimary }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '14px', marginTop: '8px', color: colors.textSecondary }}>{subtitle}</p>}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERS - Each phase returns JSX wrapped in PremiumWrapper
  // ═══════════════════════════════════════════════════════════════════════════

  // HOOK Screen - Clean intro with icon, title, features, CTA
  if (phase === 'hook') {
    return (
      <PremiumWrapper>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '24px 16px' : '40px 24px',
          textAlign: 'center',
          minHeight: '70vh'
        }}>
          {/* Elegant icon */}
          <div style={{
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: isMobile ? '20px' : '32px',
            boxShadow: `0 20px 60px ${colors.primary}30`
          }}>
            <span style={{ fontSize: isMobile ? '28px' : '36px' }}>⚛️</span>  {/* CUSTOMIZE */}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 800,
            color: colors.textPrimary,
            marginBottom: isMobile ? '12px' : '16px',
            lineHeight: 1.2
          }}>
            [Game Title]  {/* CUSTOMIZE */}
          </h1>

          {/* Subtitle with highlighted text */}
          <p style={{
            fontSize: isMobile ? '15px' : '18px',
            color: colors.textSecondary,
            marginBottom: isMobile ? '24px' : '32px',
            maxWidth: '480px',
            lineHeight: 1.6
          }}>
            [Engaging hook sentence] <span style={{ color: colors.textPrimary, fontWeight: 600 }}>"[Quoted highlight]"</span>
          </p>

          {/* Feature cards - 3 columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: isMobile ? '8px' : '12px',
            width: '100%',
            maxWidth: '400px',
            marginBottom: isMobile ? '24px' : '40px'
          }}>
            {[
              { icon: '🔬', text: 'Interactive Lab' },
              { icon: '🎯', text: 'Predictions' },
              { icon: '💡', text: 'Real Apps' }
            ].map((item, i) => (
              <div key={i} style={{
                padding: isMobile ? '12px 8px' : '16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(51, 65, 85, 0.5)'
              }}>
                <div style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 600, color: colors.textSecondary }}>{item.text}</div>
              </div>
            ))}
          </div>

          {/* CTA Button - touch-friendly */}
          <button
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: isMobile ? '16px 24px' : '18px 32px',
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: `0 8px 32px ${colors.primary}40`,
              minHeight: '48px'
            }}
            onMouseDown={() => goToPhase('predict')}
          >
            Start Experiment →
          </button>

          {/* Duration hint */}
          <p style={{
            fontSize: isMobile ? '11px' : '12px',
            color: colors.textMuted,
            marginTop: isMobile ? '12px' : '16px'
          }}>
            ~5 minutes • Interactive • Test your intuition
          </p>
        </div>
      </PremiumWrapper>
    );
  }

  // PREDICT Screen
  if (phase === 'predict') {
    return (
      <PremiumWrapper>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-2xl">
              {renderSectionHeader("Step 1 • Make Your Prediction", "[Prediction Question]", "Think carefully — your intuition from everyday experience may not apply here.")}

              {/* Setup diagram SVG - CUSTOMIZE with physics concept */}
              <div className="w-full p-4 rounded-2xl mb-6" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                <svg viewBox="0 0 400 130" className="w-full h-32">
                  {/* Premium diagram showing setup */}
                  {/* CUSTOMIZE THIS SVG */}
                </svg>
              </div>

              {/* Question context */}
              <div className="p-4 rounded-xl mb-6" style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  <strong style={{ color: colors.textPrimary }}>The Setup:</strong> [Describe the experimental setup]
                  <strong style={{ color: colors.primary }}> What do you predict will happen?</strong>
                </p>
              </div>

              {/* Prediction Options */}
              <div className="grid gap-4 mb-6">
                {[
                  { id: 'option_a', label: 'Option A', desc: 'Description of what this means', icon: '▮▮' },
                  { id: 'option_b', label: 'Option B', desc: 'Description of what this means', icon: '▮▯▮' },
                  { id: 'option_c', label: 'Option C', desc: 'Description of what this means', icon: '▓▓▓' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onMouseDown={() => {
                      setPrediction(opt.id);
                      playSound('click');
                      emitGameEvent('prediction_made', {
                        phase: 'predict',
                        prediction: opt.id,
                        predictionLabel: opt.label,
                        message: `User predicted: ${opt.label}`
                      });
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all"
                    style={{
                      background: prediction === opt.id ? `${colors.primary}20` : colors.bgCard,
                      border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                      boxShadow: prediction === opt.id ? `0 4px 20px ${colors.primary}20` : 'none'
                    }}
                  >
                    <div className="text-2xl font-mono" style={{ color: prediction === opt.id ? colors.primary : colors.textMuted }}>
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold mb-1" style={{ color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                      <p className="text-sm" style={{ color: colors.textMuted }}>{opt.desc}</p>
                    </div>
                    {prediction === opt.id && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: colors.primary }}>
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {renderBottomBar(true, !!prediction, "Run the Experiment")}
        </div>
      </PremiumWrapper>
    );
  }

  // PLAY Screen - Interactive Simulation (CUSTOMIZE HEAVILY)
  if (phase === 'play') {
    return (
      <PremiumWrapper>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Main visualization area */}
            <div className="flex-1 min-h-[45vh] lg:min-h-0 relative p-2 sm:p-3" style={{ background: colors.bgDark }}>
              <div className="h-full rounded-xl sm:rounded-2xl overflow-hidden" style={{ background: '#030712', border: `1px solid ${colors.border}` }}>
                {/* CUSTOMIZE: Main physics simulation SVG */}
                <svg viewBox="0 0 700 350" className="w-full h-full">
                  {/* Detailed animated physics visualization */}
                </svg>
              </div>
            </div>

            {/* Control panel */}
            <div className="w-full lg:w-80 p-3 sm:p-5 flex flex-col gap-3 sm:gap-5 overflow-y-auto" style={{
              background: colors.bgCard,
              borderLeft: `1px solid ${colors.border}`
            }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: colors.primary }}>Step 2 • Run the Experiment</p>
                <h3 className="text-lg font-black" style={{ color: colors.textPrimary }}>[Experiment Lab Name]</h3>
              </div>

              {/* Controls - sliders, buttons, etc. */}
              {/* CUSTOMIZE */}
            </div>
          </div>
          {renderBottomBar(true, true, "Understanding")}
        </div>
      </PremiumWrapper>
    );
  }

  // REVIEW Screen
  if (phase === 'review') {
    return (
      <PremiumWrapper>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
            <div className="w-full max-w-2xl">
              {renderSectionHeader("Step 3 • Understanding", "[What We Learned]", "[Subtitle about the key insight]")}

              {/* Result comparison */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Two comparison cards showing before/after or different states */}
              </div>

              {/* Key takeaways */}
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.success }}>Key Takeaways</p>
                {renderKeyTakeaway("💥", "Takeaway 1", "Description of what this means")}
                {renderKeyTakeaway("📊", "Takeaway 2", "Description of what this means")}
                {renderKeyTakeaway("🔮", "Takeaway 3", "Description of what this means")}
              </div>
            </div>
          </div>
          {renderBottomBar(true, true, "The Twist")}
        </div>
      </PremiumWrapper>
    );
  }

  // TWIST_PREDICT, TWIST_PLAY, TWIST_REVIEW - Similar structure, different content
  // ... (follow same patterns)

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFER SCREEN - RICH PHASE WITH SEQUENTIAL APP UNLOCK
  // This is NOT a popup carousel - each app is a FULL educational module
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'transfer') {
    const currentApp = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    // Handler for completing current app and advancing
    const handleCompleteApp = () => {
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      playSound('success');

      emitGameEvent('app_completed', {
        phase: 'transfer',
        appNumber: selectedApp + 1,
        appTitle: currentApp.title,
        message: `Completed application ${selectedApp + 1}: ${currentApp.title}`
      });

      // Auto-advance to next locked app
      if (selectedApp < 3) {
        setSelectedApp(selectedApp + 1);
      }
    };

    return (
      <PremiumWrapper>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header with sequential progress indicator */}
          <div className="px-4 pt-4 pb-2" style={{ background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.success }}>Step 7 • Real World Applications</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  {completedCount}/4 completed — {allCompleted ? 'Ready for test!' : 'Complete all to unlock test'}
                </p>
              </div>
              <div className="flex gap-1.5">
                {completedApps.map((completed, i) => (
                  <div key={i} className="w-3 h-3 rounded-full transition-all" style={{
                    background: completed ? colors.success : i === selectedApp ? realWorldApps[i].color : colors.bgCardLight,
                    boxShadow: i === selectedApp ? `0 0 8px ${realWorldApps[i].color}` : 'none'
                  }} />
                ))}
              </div>
            </div>

            {/* Tab buttons with LOCKING - users CANNOT skip ahead */}
            <div className="flex gap-2">
              {realWorldApps.map((app, i) => {
                const isCompleted = completedApps[i];
                const isCurrent = selectedApp === i;
                // CRITICAL: Sequential locking - can only access if previous is complete
                const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

                return (
                  <button
                    key={i}
                    onMouseDown={() => {
                      if (!isLocked && i !== selectedApp) {
                        setSelectedApp(i);
                        playSound('click');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-center transition-all"
                    style={{
                      background: isCurrent ? `${app.color}20` : 'transparent',
                      border: `2px solid ${isCurrent ? app.color : isCompleted ? colors.success : colors.border}`,
                      opacity: isLocked ? 0.4 : 1,
                      cursor: isLocked ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <span className="text-lg">{app.icon}</span>
                    <span className="text-xs font-bold hidden sm:inline" style={{ color: isCurrent ? colors.textPrimary : colors.textSecondary }}>
                      {app.title.split(' ')[0]}
                    </span>
                    {isCompleted && <span className="text-xs" style={{ color: colors.success }}>✓</span>}
                    {isLocked && <span className="text-xs">🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              RICH APPLICATION CONTENT - This is the key differentiator!
              Each app shows: hero, stats, diagram, examples, complete button
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Hero header with icon, title, tagline */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{currentApp.icon}</div>
              <h2 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>{currentApp.title}</h2>
              <p className="text-sm" style={{ color: currentApp.color }}>{currentApp.tagline}</p>
            </div>

            {/* Description and physics connection */}
            <div className="p-4 rounded-xl mb-4" style={{ background: `${currentApp.color}15`, border: `1px solid ${currentApp.color}30` }}>
              <p className="text-sm" style={{ color: colors.textSecondary }}>{currentApp.description}</p>
              <p className="text-sm mt-3 font-medium" style={{ color: currentApp.color }}>{currentApp.connection}</p>
            </div>

            {/* Stats grid (3 columns) */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {currentApp.stats.map((stat, i) => (
                <div key={i} className="text-center p-3 rounded-lg" style={{ background: colors.bgCard }}>
                  <p className="text-lg">{stat.icon}</p>
                  <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* DETAILED SVG DIAGRAM - REQUIRED (100+ lines showing physics in action) */}
            <div className="p-4 rounded-xl mb-4" style={{ background: colors.bgCard }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>
                How It Works
              </p>
              <svg viewBox="0 0 600 320" className="w-full" style={{ maxHeight: '340px' }}>
                {/* CUSTOMIZE: Detailed diagram for each application */}
                {/* Show the physics principle applied to this real-world use */}
              </svg>
              <p className="text-sm mt-3" style={{ color: colors.textSecondary }}>{currentApp.howItWorks}</p>
            </div>

            {/* Real examples list */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.textMuted }}>Real Examples</p>
              <div className="space-y-2">
                {currentApp.examples.map((example, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: colors.bgCard }}>
                    <span style={{ color: colors.success }}>✓</span>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>{example}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Companies and future impact */}
            <div className="text-center mb-4">
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Industry Leaders: {currentApp.companies.join(' • ')}
              </p>
              <p className="text-sm mt-2 italic" style={{ color: colors.textSecondary }}>{currentApp.futureImpact}</p>
            </div>

            {/* Complete button (marks this app as done) */}
            {!completedApps[selectedApp] && (
              <button
                onMouseDown={handleCompleteApp}
                className="w-full py-4 rounded-xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)` }}
              >
                Got It! Continue →
              </button>
            )}
          </div>

          {/* Bottom bar - only enable "Knowledge Test" when all 4 complete */}
          {renderBottomBar(true, allCompleted, "Knowledge Test", undefined, colors.success)}
        </div>
      </PremiumWrapper>
    );
  }

  // TEST Screen - 10 Questions with scenario/explanation structure
  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const score = calculateTestScore();
    const passed = score >= 7;

    if (testSubmitted) {
      return (
        <PremiumWrapper>
          {/* Results screen with score, pass/fail, retry option */}
        </PremiumWrapper>
      );
    }

    return (
      <PremiumWrapper>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-2xl">
              {/* Question counter */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.primary }}>
                  Question {testQuestion + 1} of 10
                </p>
                <div className="flex gap-1">
                  {testQuestions.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{
                      background: testAnswers[i] !== null
                        ? testQuestions[i].options.find(o => o.correct)?.id === testAnswers[i]
                          ? colors.success
                          : colors.danger
                        : i === testQuestion
                          ? colors.primary
                          : colors.border
                    }} />
                  ))}
                </div>
              </div>

              {/* Scenario */}
              <div className="p-4 rounded-xl mb-4" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  <strong style={{ color: colors.primary }}>Scenario:</strong> {currentQ.scenario}
                </p>
              </div>

              {/* Question */}
              <h3 className="text-lg font-bold mb-4" style={{ color: colors.textPrimary }}>{currentQ.question}</h3>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={opt.id}
                    onMouseDown={() => {
                      const newAnswers = [...testAnswers];
                      newAnswers[testQuestion] = opt.id;
                      setTestAnswers(newAnswers);
                      playSound('click');
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: testAnswers[testQuestion] === opt.id ? `${colors.primary}20` : colors.bgCard,
                      border: `2px solid ${testAnswers[testQuestion] === opt.id ? colors.primary : colors.border}`
                    }}
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{
                      background: testAnswers[testQuestion] === opt.id ? colors.primary : colors.bgCardLight,
                      color: testAnswers[testQuestion] === opt.id ? 'white' : colors.textSecondary
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-sm" style={{ color: colors.textPrimary }}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                {testQuestion > 0 && (
                  <button
                    onMouseDown={() => setTestQuestion(testQuestion - 1)}
                    className="px-4 py-2 rounded-lg text-sm font-bold"
                    style={{ background: colors.bgCardLight, color: colors.textSecondary }}
                  >
                    ← Previous
                  </button>
                )}
                <button
                  onMouseDown={() => {
                    if (testQuestion < 9) {
                      setTestQuestion(testQuestion + 1);
                    } else {
                      setTestSubmitted(true);
                      playSound(passed ? 'complete' : 'failure');
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-lg text-sm font-bold"
                  style={{
                    background: testAnswers[testQuestion] !== null
                      ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
                      : colors.bgCardLight,
                    color: testAnswers[testQuestion] !== null ? 'white' : colors.textMuted,
                    cursor: testAnswers[testQuestion] !== null ? 'pointer' : 'not-allowed'
                  }}
                  disabled={testAnswers[testQuestion] === null}
                >
                  {testQuestion < 9 ? 'Next Question →' : 'Submit Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </PremiumWrapper>
    );
  }

  // MASTERY Screen
  if (phase === 'mastery') {
    const score = calculateTestScore();
    return (
      <PremiumWrapper>
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center relative">
          {/* Confetti animation */}
          {confetti.map((c, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-sm animate-bounce"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                backgroundColor: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: '2s'
              }}
            />
          ))}

          {/* Trophy */}
          <div className="text-6xl mb-6">🏆</div>

          <h1 className="text-3xl font-black mb-4" style={{ color: colors.textPrimary }}>
            Congratulations!
          </h1>

          <p className="text-lg mb-2" style={{ color: colors.textSecondary }}>
            You scored <strong style={{ color: colors.success }}>{score}/10</strong> and mastered
          </p>

          <p className="text-2xl font-bold mb-8" style={{ color: colors.primary }}>
            [Game Topic]!
          </p>

          {/* Summary of what they learned */}
          <div className="w-full max-w-md space-y-3">
            {[
              { icon: '🔬', text: 'Learned core concept' },
              { icon: '🎯', text: 'Made predictions and tested them' },
              { icon: '💡', text: 'Discovered 4 real-world applications' },
              { icon: '📚', text: 'Passed the knowledge test' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>{item.text}</span>
                <span className="ml-auto" style={{ color: colors.success }}>✓</span>
              </div>
            ))}
          </div>
        </div>
      </PremiumWrapper>
    );
  }

  return null;
};

export default [GameName]Renderer;
```

---

## CRITICAL REQUIREMENTS CHECKLIST

### Navigation (MUST HAVE - PREVENTS DOUBLE-CLICK BUGS)
- [ ] `isNavigating = useRef(false)` for flag-based debouncing
- [ ] `lastClickRef = useRef(0)` for time-based debouncing (200ms check)
- [ ] DUAL CHECK in goToPhase: `if (now - lastClickRef.current < 200) return;` AND `if (isNavigating.current) return;`
- [ ] All buttons use `onMouseDown` (NOT onClick)
- [ ] `useCallback` wrapper on all event handlers
- [ ] 400ms timeout to reset `isNavigating.current`

### Sound System (MUST HAVE - TYPE-BASED, NOT FREQUENCY)
- [ ] Use `playSound('click' | 'success' | 'failure' | 'transition' | 'complete')`
- [ ] Cast OscillatorType correctly: `'sine' as OscillatorType`
- [ ] Wrap in try/catch for audio context errors

### Test Phase (MUST HAVE - LOCAL VALIDATION)
- [ ] Exactly 10 questions with SCENARIO + QUESTION + OPTIONS + EXPLANATION
- [ ] **LOCAL VALIDATION**: Each option has `{ id: string, label: string, correct?: boolean }`
- [ ] Correct answer marked with `correct: true` on the option object
- [ ] NO Firebase dependency - validation happens entirely client-side
- [ ] `testAnswers` initialized as `Array(10).fill(null)`
- [ ] 70% passing threshold (7/10)
- [ ] Show explanation after EACH question answered (immediate feedback)
- [ ] Visual progress dots showing answered/current/unanswered
- [ ] Questions use scenario format for context

### Transfer Phase (MUST HAVE - RICH MODULE PATTERN)
- [ ] Exactly 4 applications with FULL structure (ALL 11 fields required):
      - icon, title, short, tagline, description, connection, howItWorks
      - stats[] (3+ with value, label, icon)
      - examples[] (4+ specific real-world examples)
      - companies[] (5 industry leaders)
      - futureImpact, color
- [ ] Tabbed interface with completion tracking and VISUAL LOCK INDICATORS
- [ ] `completedApps` as `boolean[]` with useState
- [ ] **SEQUENTIAL UNLOCK**: App N locked until App N-1 complete (🔒 icon shown)
- [ ] **ALL 4 REQUIRED**: Test phase button disabled until all complete
- [ ] EACH APP HAS DETAILED SVG DIAGRAM (100+ lines showing physics in action)
- [ ] Hero header with icon, title, tagline for each app
- [ ] Stats grid (3 columns) with icons
- [ ] Real examples list with checkmarks
- [ ] "Got It! Continue →" button advances to next app

### Graphics (MUST HAVE)
- [ ] All graphics use SVG with viewBox
- [ ] Dark backgrounds (`#030712`, `#0a0f1a`, `#0f172a`)
- [ ] Premium gradients (linearGradient, radialGradient)
- [ ] Animations via `<animate>` elements or time-based state
- [ ] Educational labels and annotations
- [ ] Filters for glow effects (`<filter>`, `blur`, `feGaussianBlur`)

### Premium Wrapper (MUST HAVE)
- [ ] `min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden`
- [ ] Gradient background: `from-slate-900 via-[#0a1628] to-slate-900`
- [ ] THREE ambient glow circles with `blur-3xl` (top-left, bottom-right, center)
- [ ] Fixed header with `backdrop-blur-xl` and phase dots (w-6 active, w-2 inactive)
- [ ] Phase navigation dots with emerald for completed, cyan for current, slate for future

### Responsive Design (MUST HAVE)
- [ ] `isMobile` state with `window.innerWidth < 768` check
- [ ] Touch-friendly buttons: `minHeight: '44px'`
- [ ] `onTouchEnd` handlers where needed
- [ ] Responsive padding: `p-4 sm:p-6`
- [ ] Mobile-first layout with `flex-col lg:flex-row`

---

## SVG DIAGRAM REQUIREMENTS FOR TRANSFER APPS

Each of the 4 applications MUST have a detailed SVG diagram (viewBox="0 0 600 320") that:

1. **Shows the physics principle in action** for that specific application
2. **Uses the gold standard patterns**:
   - Premium gradients (`linearGradient`, `radialGradient`)
   - Dark backgrounds with subtle grid patterns
   - Animated elements using `<animate>`
   - Clear educational labels (text elements with className for Tailwind)
   - Multi-layer depth with overlapping elements
   - Glow effects using filters

3. **Follows this structure**:
```tsx
<svg viewBox="0 0 600 320" className="w-full" style={{ maxHeight: '340px' }}>
  <defs>
    {/* Define gradients, filters, patterns */}
    <linearGradient id="appGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={currentApp.color} />
      <stop offset="100%" stopColor={colors.accent} />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  {/* Dark background with grid */}
  <rect width="600" height="320" fill="#030712" />
  <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
    <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
  </pattern>
  <rect width="600" height="320" fill="url(#grid)" />

  {/* Main visualization - CUSTOMIZE for each app */}
  {/* ... detailed physics visualization ... */}

  {/* Labels with good contrast */}
  <text x="300" y="300" textAnchor="middle" className="text-sm fill-slate-400 font-bold">
    Educational Label
  </text>
</svg>
```

---

## TEST QUESTION TEMPLATE (10 REQUIRED)

```typescript
const testQuestions = [
  // Q1: Core Concept - Easy
  {
    scenario: "You're [real-world situation]. [Specific details about the setup].",
    question: "Based on [concept], what happens when [action]?",
    options: [
      { id: 'a', label: "Wrong but plausible answer (common misconception)" },
      { id: 'b', label: "Another wrong but plausible answer" },
      { id: 'c', label: "The correct answer", correct: true },
      { id: 'd', label: "Fourth option testing different aspect" },
    ],
    explanation: "The answer is [correct] because [detailed explanation connecting to the experiment]. This demonstrates [key concept]."
  },
  // Q2: Core Concept - Easy
  // Q3: Basic Understanding - Medium
  // Q4: Application - Medium
  // Q5: Application - Medium
  // Q6: Real-world Connection (tie to one of the 4 apps) - Medium-Hard
  // Q7: Real-world Connection (tie to another app) - Hard
  // Q8: Synthesis - Hard
  // Q9: Advanced/Twist Scenario - Expert
  // Q10: Critical Thinking - Expert
];
```

Key principles for questions:
- **Scenarios** should be concrete and relatable
- **Wrong answers** should represent common misconceptions
- **Correct answer** position should vary (not always C)
- **Explanations** should reinforce learning, not just say "A is wrong because..."
- **Difficulty** should increase progressively
- **Q6-7** should directly reference the 4 real-world applications
- **Q9-10** can include "twist" scenarios that test deeper understanding

---

## FINAL NOTES

1. **ALWAYS test the build** after generating: `npm run build`
2. **Check for TypeScript errors** before submitting
3. **Verify navigation** works without double-clicks (test rapidly clicking)
4. **Test all 4 applications** unlock properly (must complete in order)
5. **Ensure 70% threshold** (7/10) for test passing
6. **Mobile test** - verify on narrow viewport (375px width)

This template ensures games work correctly on the first try by:
- Standardizing ALL critical patterns from the gold standard
- Providing EXACT code to copy (not vague descriptions)
- Including working TypeScript with proper types
- Defining clear success criteria with checklist
- Requiring detailed SVG diagrams (not placeholders)

---

## ADDITIONAL CRITICAL PATTERNS (v2.0 - First-Shot Success)

### 1. TEACHING MILESTONES SYSTEM (Required for interactive phases)

Track user progress through interactive phases and provide contextual feedback:

```typescript
// Required state
const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'few' | 'pattern' | 'clear' | 'many'>('none');

// Update based on progress (e.g., particle count, interactions, time)
useEffect(() => {
  if (phase === 'play' || phase === 'twist_play') {
    if (progressValue < 15) setTeachingMilestone('few');
    else if (progressValue < 60) setTeachingMilestone('pattern');
    else if (progressValue < 150) setTeachingMilestone('clear');
    else setTeachingMilestone('many');
  }
}, [progressValue, phase]);

// Teaching messages for each milestone
const teachingMessages: Record<string, { title: string; message: string; color: string }> = {
  none: { title: '', message: '', color: colors.primary },
  few: {
    title: 'Observing Initial Results',
    message: 'Watch what happens with each interaction. Notice the patterns starting to form...',
    color: colors.textMuted
  },
  pattern: {
    title: 'A Pattern Is Emerging',
    message: 'Something interesting is happening! Keep watching to see the full effect.',
    color: colors.warning
  },
  clear: {
    title: 'Pattern Confirmed!',
    message: 'The physics principle is now clearly visible. This is [key insight]!',
    color: colors.primary
  },
  many: {
    title: 'Complete Understanding',
    message: 'You\'ve observed the full phenomenon. [Summary of what they learned].',
    color: colors.success
  }
};
```

### 2. HINT SYSTEM (Required for AI Coach integration)

```typescript
const requestHint = useCallback(() => {
  const hintMessages: Record<Phase, string> = {
    hook: "Take a moment to read the introduction. What question are we trying to answer?",
    predict: "Think about what you'd expect from everyday experience. Does [physics] behave like familiar objects?",
    play: "Keep observing! The pattern takes time to emerge. What do you notice?",
    review: "Key insight: [Core concept]. Why is this surprising?",
    twist_predict: "If we change [variable], how might the outcome change?",
    twist_play: "Compare results with [variable] on vs off. What's different?",
    twist_review: "The key is understanding WHY [variable] matters. It's about [deeper insight].",
    transfer: "Each application uses [concept] differently. Look for the connection to the experiment.",
    test: "Think back to what you observed. The key is understanding the WHY, not just the WHAT.",
    mastery: "You've mastered this! Review any section you'd like to revisit."
  };

  emitGameEvent('hint_requested', {
    phase,
    coachMessage: hintMessages[phase],
    message: 'User requested a hint'
  });
  setLastCoachMessage(hintMessages[phase]);
}, [phase, emitGameEvent]);
```

### 3. COLOR CONTRAST REQUIREMENTS (Apple/Airbnb Quality)

**NEVER use same color for background and text. Always ensure:**
- Text on dark backgrounds: Use `colors.textPrimary` (#f8fafc) or `colors.textSecondary` (#94a3b8)
- Highlighted text: Use `colors.primary` or accent color with `fontWeight: 600`
- Muted text: Use `colors.textMuted` (#64748b) only on dark backgrounds
- Card backgrounds: `colors.bgCard` (#0f172a) or `colors.bgCardLight` (#1e293b)
- Active state: Add `20` (20% opacity) to color hex for subtle highlight (e.g., `${colors.primary}20`)

**Contrast ratios for accessibility:**
```typescript
// Good - high contrast
<p style={{ color: colors.textPrimary }}>...</p>  // #f8fafc on #0f172a = 15.4:1

// Bad - low contrast (DO NOT USE)
<p style={{ color: colors.textMuted }}>...</p>  // #64748b on #64748b = 1:1 (WRONG!)
```

### 4. SPACING & SIZING GUIDELINES (Premium Design)

```typescript
// Consistent spacing scale (use these values)
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px'
};

// Touch-friendly minimums
const minTouchTarget = '44px';  // REQUIRED for all interactive elements

// Font sizes (responsive)
const fontSizes = {
  xs: isMobile ? '10px' : '12px',
  sm: isMobile ? '12px' : '14px',
  base: isMobile ? '14px' : '16px',
  lg: isMobile ? '16px' : '18px',
  xl: isMobile ? '20px' : '24px',
  '2xl': isMobile ? '24px' : '32px',
  '3xl': isMobile ? '28px' : '36px'
};

// Card padding
const cardPadding = isMobile ? '16px' : '24px';

// Gap between elements
const gap = isMobile ? '12px' : '16px';
```

### 5. COMPLETE TWIST PHASES TEMPLATE

**TWIST_PREDICT** - Introduce the new variable:
```typescript
if (phase === 'twist_predict') {
  return (
    <PremiumWrapper>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
          <div className="w-full max-w-2xl">
            {renderSectionHeader("Step 4 • The [Variable Name]", "What If We [Change]?", "This is where [concept] gets truly interesting.")}

            {/* Context explaining the new variable */}
            <div className="p-5 rounded-2xl mb-6" style={{ background: `${colors.danger}15`, border: `1px solid ${colors.danger}30` }}>
              <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                <strong style={{ color: colors.textPrimary }}>The New Question:</strong> We've seen [initial result].
                But what if we <strong style={{ color: colors.danger }}>[introduce variable]</strong>?
                Will the result change when we [action]?
              </p>
            </div>

            {/* Diagram showing the change - REQUIRED SVG */}
            <div className="w-full p-4 rounded-2xl mb-6" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
              <svg viewBox="0 0 350 110" className="w-full h-28">
                {/* Show setup WITH the new variable highlighted */}
              </svg>
            </div>

            {/* Prediction options */}
            <div className="grid gap-4 mb-6">
              {[
                { id: 'change_a', label: 'Result A happens', desc: 'Description', icon: '▮▮' },
                { id: 'change_b', label: 'Result B happens', desc: 'Description', icon: '▮▯▮' },
                { id: 'no_change', label: 'No change occurs', desc: 'Description', icon: '───' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => {
                    setTwistPrediction(opt.id);
                    playSound('click');
                    emitGameEvent('prediction_made', {
                      phase: 'twist_predict',
                      prediction: opt.id,
                      predictionLabel: opt.label,
                      message: `User predicted: ${opt.label}`
                    });
                  }}
                  className="flex items-center gap-4 p-5 rounded-2xl text-left"
                  style={{
                    background: twistPrediction === opt.id ? `${colors.danger}20` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.danger : colors.border}`
                  }}
                >
                  {/* ... button content ... */}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, "Test Your Prediction", undefined, colors.danger)}
      </div>
    </PremiumWrapper>
  );
}
```

### 6. PREVENTING AI CHAT FROM BLOCKING BUTTONS

The AI chat should ASSIST, not BLOCK user interactions. Critical patterns:

```typescript
// 1. Use onMouseDown instead of onClick (fires before chat can intercept)
<button onMouseDown={() => action()} />

// 2. Add e.preventDefault() for touch events
<button
  onMouseDown={(e) => { e.preventDefault(); action(); }}
  onTouchEnd={(e) => { e.preventDefault(); action(); }}
/>

// 3. Use pointer-events-none on overlays that shouldn't capture clicks
<div className="pointer-events-none">
  {/* Decorative/informational content */}
</div>

// 4. Z-index hierarchy (buttons above chat suggestions)
const zIndexes = {
  background: 0,
  content: 10,
  buttons: 20,
  modal: 30,
  header: 50
};
```

### 7. COMPLETE REAL-WORLD APPLICATION SVG TEMPLATE

Each of the 4 applications MUST have a detailed educational diagram:

```tsx
{selectedApp === 0 && (
  <g>
    {/* Left side: Connection to experiment */}
    <g transform="translate(20, 10)">
      <rect x="0" y="0" width="240" height="160" rx="10" fill={colors.bgCard} stroke={colors.border} />
      <text x="120" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.textMuted}>
        YOUR EXPERIMENT
      </text>
      {/* Show the physics principle from the experiment */}
      {/* ... SVG elements ... */}
      <text x="120" y="145" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>
        [Experiment label]
      </text>
    </g>

    {/* Equals sign showing connection */}
    <text x="300" y="80" textAnchor="middle" fontSize="32" fontWeight="bold" fill={colors.accent}>=</text>
    <text x="300" y="105" textAnchor="middle" fontSize="12" fill={colors.textMuted}>Same Principle!</text>

    {/* Right side: Real-world application */}
    <g transform="translate(340, 10)">
      <rect x="0" y="0" width="240" height="160" rx="10" fill={colors.bgCard} stroke={currentApp.color} strokeWidth="2" />
      <text x="120" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill={currentApp.color}>
        {currentApp.title.toUpperCase()}
      </text>
      {/* Show how the principle applies to this application */}
      {/* ... detailed SVG with animations ... */}
    </g>

    {/* Key insight box */}
    <rect x="20" y="185" width="560" height="55" rx="8" fill={`${currentApp.color}20`} stroke={currentApp.color} strokeWidth="2" />
    <text x="300" y="208" textAnchor="middle" fontSize="14" fontWeight="bold" fill={currentApp.color}>💡 KEY INSIGHT</text>
    <text x="300" y="228" textAnchor="middle" fontSize="12" fill={colors.textPrimary}>
      [Concise explanation of how physics principle enables application]
    </text>

    {/* Bottom impact statement */}
    <rect x="20" y="250" width="560" height="55" rx="8" fill={colors.bgCard} stroke={colors.border} />
    <text x="300" y="273" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colors.textPrimary}>
      ⚡ {currentApp.futureImpact}
    </text>
    <text x="300" y="293" textAnchor="middle" fontSize="11" fill={colors.textMuted}>
      Companies: {currentApp.companies.join(' • ')}
    </text>
  </g>
)}
```

### 8. EVENT EMISSION FOR AI COACH ACCURACY

Emit detailed events so AI coach knows exactly what's on screen:

```typescript
// When showing test question, include FULL question content
emitGameEvent('question_changed', {
  phase: 'test',
  questionNumber: nextQ + 1,
  totalQuestions: 10,
  questionScenario: currentQuestion.scenario,  // FULL scenario text
  questionText: currentQuestion.question,       // FULL question text
  allOptions: currentQuestion.options.map((o, idx) =>
    `${String.fromCharCode(65 + idx)}: ${o.label}`
  ).join(' | '),
  message: `Now on Q${nextQ + 1}: "${currentQuestion.question}"`
});

// When showing application, include full details
emitGameEvent('app_changed', {
  phase: 'transfer',
  appNumber: i + 1,
  totalApps: 4,
  appTitle: app.title,
  appTagline: app.tagline,
  appDescription: app.description,
  appConnection: app.connection,  // How it connects to experiment
  message: `Viewing application: ${app.title} - ${app.tagline}`
});
```

---

## CHECKLIST BEFORE SUBMITTING

Run through this checklist for EVERY new game:

### Navigation & Interaction
- [ ] All buttons use `onMouseDown` (not onClick)
- [ ] Navigation debouncing: BOTH `lastClickRef` (200ms) AND `isNavigating.current` (400ms)
- [ ] Touch targets at least 44px height
- [ ] No z-index conflicts with AI chat overlay

### Visual Design
- [ ] Premium gradients on key elements (buttons, headers, cards)
- [ ] Dark backgrounds (#030712, #0a0f1a, #0f172a)
- [ ] Three ambient glow circles in PremiumWrapper
- [ ] Good color contrast (text visible on all backgrounds)
- [ ] Consistent spacing using the scale (8px, 16px, 24px, 32px)

### Content Completeness
- [ ] 10 test questions with scenario + explanation (difficulty increasing)
- [ ] 4 applications with FULL structure (all 10 fields populated)
- [ ] Each application has detailed SVG diagram (100+ lines)
- [ ] Teaching milestones for interactive phases
- [ ] Hint messages for every phase

### AI Coach Integration
- [ ] `emitGameEvent` called for ALL user actions
- [ ] Events include FULL context (question text, app details, etc.)
- [ ] Game started event on mount
- [ ] Game completed event with score

### Testing
- [ ] `npm run build` passes with no errors
- [ ] Rapid-click navigation doesn't cause glitches
- [ ] All 4 apps complete before test unlocks
- [ ] Mobile viewport (375px) displays correctly
- [ ] Test score calculates correctly (7/10 to pass)
