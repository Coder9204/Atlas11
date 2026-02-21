'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGameProgress } from '../hooks/useGameProgress';
import { getLearnerProfile, getAllGameProgress } from '../services/GameProgressService';
import { getActivePaths, advancePath, markGameInProgress, syncPathWithProgress } from '../services/LearningPathService';
import { trackGameStarted, trackGameCompleted, trackPaywallShown } from '../services/AnalyticsService';
import GameTutorialOverlay, { shouldShowTutorial } from './GameTutorialOverlay';
import FreeUsageBanner, { isFreeUsageExhausted } from './FreeUsageBanner';
import { useAuth } from '../contexts/AuthContext';
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
      title: `${seo.title} - Interactive Simulator | Atlas Coach`,
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

  // Clone children with the props that renderers actually accept
  const enhancedChildren = React.cloneElement(children, {
    onGameEvent: handleGameEvent,
    onPhaseComplete: handlePhaseComplete,
  });

  // Determine access: subscriber = unlimited, anonymous+expired = auth modal, free tier+exhausted = paywall
  const isSubscribed = auth?.subscription && auth.subscription.tier !== 'free' && auth.subscription.status !== 'canceled';
  const isAnonymousExpired = auth?.user?.isAnonymous && auth?.freeTrialExpired;
  const freeExhausted = !isSubscribed && isFreeUsageExhausted();

  // If anonymous and timer expired, trigger auth modal
  useEffect(() => {
    if (isAnonymousExpired) {
      auth?.showAuthModal('timer_expired');
    }
  }, [isAnonymousExpired]);

  const blocked = !isSubscribed && (isAnonymousExpired || freeExhausted);

  // Track paywall shown
  useEffect(() => {
    if (blocked) {
      trackPaywallShown(slug, isAnonymousExpired ? 'anonymous_expired' : 'free_exhausted');
    }
  }, [blocked, slug, isAnonymousExpired]);

  return (
    <div
      ref={shellRef}
      data-game-shell
      data-slug={slug}
      data-difficulty={learnerLevel.current}
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {showTutorial && <GameTutorialOverlay onDismiss={() => setShowTutorial(false)} />}
      <FreeUsageBanner />
      {blocked ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: 40,
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{'\uD83D\uDD12'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
            {isAnonymousExpired ? 'Free Preview Ended' : 'Free Games Used Up'}
          </h2>
          <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            {isAnonymousExpired
              ? 'Create a free account to keep learning, or upgrade for unlimited access.'
              : "You've played all 5 free games this month. Upgrade to continue learning with unlimited access."}
          </p>
          {isAnonymousExpired ? (
            <button
              onClick={() => auth?.showAuthModal('timer_expired')}
              style={{
                padding: '14px 32px',
                background: '#3B82F6',
                color: '#fff',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Create Free Account
            </button>
          ) : (
            <a
              href="/pricing"
              style={{
                padding: '14px 32px',
                background: '#3B82F6',
                color: '#fff',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              View Plans
            </a>
          )}
          <a
            href="/games"
            style={{
              marginTop: 14,
              color: '#94a3b8',
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            Back to games
          </a>
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
