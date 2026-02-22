'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGameProgress } from '../hooks/useGameProgress';
import { getLearnerProfile, getAllGameProgress } from '../services/GameProgressService';
import { getActivePaths, advancePath, markGameInProgress, syncPathWithProgress } from '../services/LearningPathService';
import { trackGameStarted, trackGameCompleted, trackPaywallShown } from '../services/AnalyticsService';
import GameTutorialOverlay, { shouldShowTutorial } from './GameTutorialOverlay';
import FreeUsageBanner, { isDailyTimeExhausted } from './FreeUsageBanner';
import { useAuth } from '../contexts/AuthContext';
import { useDailyPlayTimer } from '../hooks/useDailyPlayTimer';
import { isGuestGame, formatTimeRemaining, type AccessLevel } from '../lib/accessConfig';
import { useAICoach } from '../contexts/AICoachContext';
import AICoachPanel from './AICoachPanel';
import { updateMeta, resetMeta } from '../lib/seo';
import { learningResourceSchema, breadcrumbSchema } from '../lib/seoSchemas';
import { getGameSEO } from '../src/data/gameSEOData';
import { getCategoryForGame } from '../src/data/gameCategories';
import GameSEOFooter from './GameSEOFooter';

// ============================================================================
// GAME SHELL — Wraps game renderers to provide:
//   1. Difficulty gating (skip twist phases for beginners, adjust pass thresholds)
//   2. Path integration (advance path when game completes)
//   3. Progress tracking via useGameProgress hook
//   4. Analytics event tracking
//
// BRIDGE STRATEGY: Renderers accept onGameEvent and onPhaseComplete props.
// GameShell listens for 'mastery_achieved' and 'game_completed' events to
// extract test scores and bridge them to useGameProgress.submitTestScore().
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const TWIST_PHASES: Phase[] = ['twist_predict', 'twist_play', 'twist_review'];

export const PASS_THRESHOLDS: Record<string, number> = {
  beginner: 60,
  intermediate: 70,
  advanced: 80,
};

interface GameShellProps {
  slug?: string;
  category?: string;
  difficulty?: string;
  children: React.ReactElement;
}

/**
 * Extracts game slug from the current URL path.
 * URL pattern: /games/{slug}
 */
function getSlugFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/');
  const gamesIdx = parts.indexOf('games');
  return gamesIdx >= 0 && parts[gamesIdx + 1] ? parts[gamesIdx + 1] : '';
}

/**
 * GameShell wraps a renderer component to provide difficulty gating and path integration.
 *
 * Difficulty Gating:
 * - Beginner: twist phases are skipped, pass threshold is 60%
 * - Intermediate: all phases, pass threshold is 70%
 * - Advanced: all phases, pass threshold is 80%
 *
 * Props are optional — slug is derived from URL if not provided.
 *
 * Bridge: Injects onGameEvent and onPhaseComplete callbacks that renderers
 * already accept, to capture test scores and phase transitions.
 */
export default function GameShell({ slug: slugProp, category: categoryProp, difficulty: difficultyProp, children }: GameShellProps) {
  const slug = slugProp || getSlugFromUrl();
  const category = categoryProp || '';
  const difficulty = difficultyProp || '';
  const learnerLevel = useRef<string>('intermediate');
  const { record, updatePhase, submitTestScore, startTimer, stopTimer } = useGameProgress(slug, category, difficulty);
  const [pathId, setPathId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => shouldShowTutorial() && getAllGameProgress().length === 0);
  const sessionStartRef = useRef<number>(Date.now());
  const hasSubmittedRef = useRef(false);

  // Auth-aware gating
  let auth: ReturnType<typeof useAuth> | null = null;
  try { auth = useAuth(); } catch { /* AuthProvider may not be mounted */ }

  // Determine access tier
  const userTier: AccessLevel = (() => {
    if (!auth?.isAuthenticated) return 'guest';
    const tier = auth?.subscription?.tier;
    if (tier === 'plus' || tier === 'pro') return tier;
    return 'starter';
  })();

  // Daily play timer — ticks only for non-guest, non-guest-game
  const isActiveGame = !isGuestGame(slug);
  const { secondsRemaining, isExhausted: timeExhausted } = useDailyPlayTimer(userTier, isActiveGame);

  // AI Coach integration (null-safe — context may not be mounted)
  const coach = useAICoach();

  // Derive human-readable title from slug
  const gameTitle = slug
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Notify coach when game mounts / unmounts
  useEffect(() => {
    coach?.setGameActive(true, slug, gameTitle);
    return () => { coach?.setGameActive(false); };
  }, [slug, gameTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // SEO: Set per-game meta tags, JSON-LD, and canonical URL
  useEffect(() => {
    if (!slug) return;
    const seo = getGameSEO(slug);
    const category = getCategoryForGame(
      slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
    );

    const breadcrumbs = [
      { name: 'Home', url: '/' },
      ...(category ? [{ name: category.name, url: `/learn/${category.id}` }] : []),
      { name: seo.title, url: `/games/${slug}` },
    ];

    updateMeta({
      title: `${seo.title} - Interactive Simulator | Coach Atlas`,
      description: seo.description,
      canonicalUrl: `/games/${slug}`,
      jsonLd: [
        learningResourceSchema({
          name: seo.title,
          description: seo.description,
          url: `/games/${slug}`,
          concepts: seo.concepts,
          difficulty: seo.difficulty,
          estimatedMinutes: seo.estimatedMinutes,
          category: category?.name,
        }),
        breadcrumbSchema(breadcrumbs),
      ],
    });

    return () => { resetMeta(); };
  }, [slug]);

  // Load learner profile and find active path containing this game
  useEffect(() => {
    try {
      const profile = getLearnerProfile();
      if (profile?.level) {
        learnerLevel.current = profile.level;
      }
    } catch {
      // Use default
    }

    // Check if this game is part of an active path
    try {
      const activePaths = getActivePaths();
      for (const path of activePaths) {
        const game = path.games.find(g => g.slug === slug);
        if (game) {
          setPathId(path.id);
          syncPathWithProgress(path.id);
          markGameInProgress(path.id, slug);
          break;
        }
      }
    } catch {
      // No path integration
    }

    // Track game start
    trackGameStarted(slug, learnerLevel.current);

    sessionStartRef.current = Date.now();
    hasSubmittedRef.current = false;
    startTimer();
    return () => { stopTimer(); };
  }, [slug, startTimer, stopTimer]);

  const shellRef = useRef<HTMLDivElement>(null);

  /**
   * onGameEvent bridge — listens for renderer events.
   * Captures test scores from 'mastery_achieved' and 'game_completed' events.
   * Both event.type and event.eventType are checked for compatibility.
   */
  const handleGameEvent = useCallback((event: Record<string, unknown>) => {
    const eventType = (event.type as string) || (event.eventType as string) || '';
    const details = (event.details as Record<string, unknown>) || {};

    // Extract score data from event
    if (eventType === 'mastery_achieved' || eventType === 'game_completed') {
      if (hasSubmittedRef.current) return; // Prevent double submission
      hasSubmittedRef.current = true;

      // Score can be in details.score, details.testScore, or top-level
      const score = typeof details.score === 'number' ? details.score
        : typeof details.testScore === 'number' ? details.testScore
        : 0;
      const total = typeof details.total === 'number' ? details.total
        : typeof details.totalQuestions === 'number' ? details.totalQuestions
        : typeof details.maxScore === 'number' ? details.maxScore
        : 10; // Default to 10 questions (most common)

      // Submit test score — this triggers SM-2, letter grades, mastery levels
      submitTestScore(score, total);

      // Track completion with elapsed time
      const elapsedMs = Date.now() - sessionStartRef.current;
      const masteryLevel = total > 0 ? Math.round((score / total) * 100) : 0;
      trackGameCompleted(slug, masteryLevel, elapsedMs);

      // Advance path if applicable
      if (pathId) {
        advancePath(pathId, masteryLevel);
      }
    }

    // Track phase changes from game events
    if (eventType === 'phase_change' || eventType === 'phase_changed') {
      const toPhase = (details.to as string) || (details.phase as string) || '';
      if (toPhase) {
        updatePhase(toPhase);
        coach?.setGamePhase(toPhase);
      }
    }

    // Forward event to AI coach for real-time guidance
    coach?.sendGameEvent(event);
  }, [slug, submitTestScore, pathId, updatePhase, coach]);

  /**
   * onPhaseComplete bridge — called by renderers when a phase transitions.
   * Updates progress tracking and analytics.
   */
  const handlePhaseComplete = useCallback((phase: string) => {
    updatePhase(phase);
  }, [updatePhase]);

  // Determine resume phase: if user has prior progress on this game, skip the hook
  // and resume at their last phase (or 'play' if they completed/mastered the game).
  const resumePhase = (() => {
    if (!record) return undefined; // First visit — start at hook
    const last = record.lastPhase;
    // If they've completed or mastered the game, drop them into play to re-explore
    if (record.completedAt && (!last || last === 'mastery' || last === 'test')) {
      return 'play';
    }
    // If they have a saved phase, resume there (skip hook on revisit)
    if (last && last !== 'hook') return last;
    // They've been here before but only saw hook — advance to predict
    if (last === 'hook' && record.lastPlayedAt) return 'predict';
    return undefined;
  })();

  // Clone children with the props that renderers actually accept
  const enhancedChildren = React.cloneElement(children, {
    onGameEvent: handleGameEvent,
    onPhaseComplete: handlePhaseComplete,
    ...(resumePhase ? { gamePhase: resumePhase } : {}),
  });

  // Determine access: paid = unlimited, guest on non-guest game = signup, free tier+time exhausted = paywall
  const isPaid = userTier === 'plus' || userTier === 'pro';
  const isAnonymousOnNonGuestGame = userTier === 'guest' && !isGuestGame(slug);
  const freeTimeExhausted = !isPaid && !isGuestGame(slug) && timeExhausted;

  // If anonymous on non-guest game, trigger auth modal
  useEffect(() => {
    if (isAnonymousOnNonGuestGame) {
      auth?.showAuthModal('signup_required');
    }
  }, [isAnonymousOnNonGuestGame]);

  const blocked = isAnonymousOnNonGuestGame || freeTimeExhausted;

  // Track paywall shown
  useEffect(() => {
    if (blocked) {
      trackPaywallShown(slug, isAnonymousOnNonGuestGame ? 'signup_required' : 'daily_time_exhausted');
    }
  }, [blocked, slug, isAnonymousOnNonGuestGame]);

  return (
    <div
      ref={shellRef}
      data-game-shell
      data-slug={slug}
      data-difficulty={learnerLevel.current}
      style={{ width: '100%', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      {showTutorial && <GameTutorialOverlay onDismiss={() => setShowTutorial(false)} />}
      <FreeUsageBanner />
      {blocked ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '85vh',
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated background particles */}
          <style>{`
            @keyframes float-particle {
              0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
              50% { transform: translateY(-20px) rotate(180deg); opacity: 0.7; }
            }
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.3); }
              50% { box-shadow: 0 0 40px rgba(59,130,246,0.6), 0 0 60px rgba(139,92,246,0.2); }
            }
            @keyframes slide-up {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes orbit {
              0% { transform: rotate(0deg) translateX(60px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
            }
          `}</style>

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 6 + (i % 3) * 4,
              height: 6 + (i % 3) * 4,
              borderRadius: '50%',
              background: i % 2 === 0
                ? 'rgba(59,130,246,0.4)'
                : 'rgba(139,92,246,0.4)',
              top: `${15 + (i * 13) % 70}%`,
              left: `${10 + (i * 17) % 80}%`,
              animation: `float-particle ${3 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
              pointerEvents: 'none',
            }} />
          ))}

          {isAnonymousOnNonGuestGame ? (
            <>
              {/* Orbiting atom icon */}
              <div style={{
                position: 'relative',
                width: 140,
                height: 140,
                marginBottom: 24,
                animation: 'slide-up 0.6s ease-out',
              }}>
                {/* Center nucleus */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }}>
                  {'\u26A1'}
                </div>
                {/* Orbiting electrons */}
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 10,
                    height: 10,
                    marginTop: -5,
                    marginLeft: -5,
                    borderRadius: '50%',
                    background: ['#60A5FA', '#A78BFA', '#34D399'][i],
                    animation: `orbit ${3 + i * 0.5}s linear infinite`,
                    animationDelay: `${i * 1}s`,
                  }} />
                ))}
                {/* Orbit rings */}
                {[60, 50, 70].map((r, i) => (
                  <div key={`ring-${i}`} style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: r * 2,
                    height: r * 2,
                    marginTop: -r,
                    marginLeft: -r,
                    borderRadius: '50%',
                    border: '1px solid rgba(148,163,184,0.15)',
                    transform: `rotate(${i * 60}deg)`,
                    pointerEvents: 'none',
                  }} />
                ))}
              </div>

              <h2 style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#f8fafc',
                marginBottom: 6,
                animation: 'slide-up 0.6s ease-out 0.1s both',
              }}>
                Ready to explore <span style={{ color: '#60A5FA' }}>{gameTitle}</span>?
              </h2>
              <p style={{
                fontSize: 15,
                color: '#94a3b8',
                maxWidth: 420,
                lineHeight: 1.7,
                marginBottom: 28,
                animation: 'slide-up 0.6s ease-out 0.2s both',
              }}>
                Sign up in 10 seconds to start playing. It's free.
              </p>

              {/* Feature cards */}
              <div style={{
                display: 'flex',
                gap: 12,
                marginBottom: 32,
                flexWrap: 'wrap',
                justifyContent: 'center',
                animation: 'slide-up 0.6s ease-out 0.3s both',
              }}>
                {[
                  { icon: '\uD83C\uDFAE', label: '340+ games' },
                  { icon: '\u23F1\uFE0F', label: '15 min/day free' },
                  { icon: '\uD83E\uDDE0', label: 'Learn by playing' },
                ].map(({ icon, label }) => (
                  <div key={label} style={{
                    background: 'rgba(30,41,59,0.8)',
                    border: '1px solid rgba(148,163,184,0.12)',
                    borderRadius: 10,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#cbd5e1',
                    fontWeight: 500,
                  }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    {label}
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div style={{ animation: 'slide-up 0.6s ease-out 0.4s both' }}>
                <button
                  onClick={() => auth?.showAuthModal('signup_required')}
                  style={{
                    padding: '14px 40px',
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    color: '#fff',
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    animation: 'pulse-glow 2.5s ease-in-out infinite',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {'\u25B6\uFE0F'} Start Playing Free
                </button>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <button
                    onClick={() => auth?.showAuthModal('manual')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60A5FA',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                  >
                    Already have an account? Sign in
                  </button>
                </div>
                <a
                  href="/games"
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    color: '#64748b',
                    fontSize: 13,
                    textDecoration: 'none',
                    opacity: 0.8,
                  }}
                >
                  {'\u2190'} Browse all games
                </a>
              </div>
            </>
          ) : (
            /* Time exhausted state */
            <>
              <div style={{
                fontSize: 56,
                marginBottom: 20,
                animation: 'slide-up 0.6s ease-out',
              }}>
                {'\u2615'}
              </div>
              <h2 style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#f8fafc',
                marginBottom: 8,
                animation: 'slide-up 0.6s ease-out 0.1s both',
              }}>
                Great session! Time for a break.
              </h2>
              <p style={{
                fontSize: 15,
                color: '#94a3b8',
                maxWidth: 400,
                lineHeight: 1.7,
                marginBottom: 20,
                animation: 'slide-up 0.6s ease-out 0.2s both',
              }}>
                Your daily play time resets tomorrow. Upgrade for up to 4 hours/day.
              </p>
              <p style={{
                fontSize: 12,
                color: '#64748b',
                marginBottom: 28,
                fontStyle: 'italic',
                animation: 'slide-up 0.6s ease-out 0.25s both',
              }}>
                Fun fact: Spaced repetition works best with breaks between sessions!
              </p>
              <div style={{ animation: 'slide-up 0.6s ease-out 0.3s both' }}>
                <a
                  href="/pricing"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 36px',
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    color: '#fff',
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    textDecoration: 'none',
                    animation: 'pulse-glow 2.5s ease-in-out infinite',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {'\uD83D\uDE80'} Upgrade for More Time
                </a>
                <div style={{ marginTop: 14 }}>
                  <a
                    href="/games"
                    style={{
                      color: '#64748b',
                      fontSize: 13,
                      textDecoration: 'none',
                    }}
                  >
                    {'\u2190'} Browse all games
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      ) : enhancedChildren}
      <AICoachPanel />
      {!blocked && <GameSEOFooter slug={slug} />}
    </div>
  );
}

// ============================================================================
// DIFFICULTY GATING HOOK — For renderers that want to opt-in to difficulty gating
// ============================================================================

export interface DifficultyGatingConfig {
  level: string;
  skippedPhases: Set<Phase>;
  passThreshold: number;
}

/**
 * Hook that returns difficulty gating configuration based on learner profile.
 * Renderers can use this to filter their phaseOrder array.
 */
export function useDifficultyGating(): DifficultyGatingConfig {
  const [config, setConfig] = useState<DifficultyGatingConfig>({
    level: 'intermediate',
    skippedPhases: new Set(),
    passThreshold: 70,
  });

  useEffect(() => {
    try {
      const profile = getLearnerProfile();
      const level = profile?.level || 'intermediate';
      const skippedPhases = new Set<Phase>();

      if (level === 'beginner') {
        TWIST_PHASES.forEach(p => skippedPhases.add(p));
      }

      setConfig({
        level,
        skippedPhases,
        passThreshold: PASS_THRESHOLDS[level] || 70,
      });
    } catch {
      // Use defaults
    }
  }, []);

  return config;
}

/**
 * Filters a phase order array based on difficulty gating.
 * Returns only the phases the student should see.
 */
export function filterPhasesByDifficulty(
  phaseOrder: string[],
  level: string
): string[] {
  if (level === 'beginner') {
    return phaseOrder.filter(p => !TWIST_PHASES.includes(p as Phase));
  }
  return phaseOrder;
}
