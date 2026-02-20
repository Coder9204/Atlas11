'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGameProgress } from '../hooks/useGameProgress';
import { getLearnerProfile } from '../services/GameProgressService';
import { getActivePaths, advancePath, markGameInProgress, syncPathWithProgress } from '../services/LearningPathService';
import { trackGameStarted, trackGameCompleted } from '../services/AnalyticsService';

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
  const sessionStartRef = useRef<number>(Date.now());
  const hasSubmittedRef = useRef(false);

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
      }
    }
  }, [slug, submitTestScore, pathId, updatePhase]);

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

  return (
    <div
      ref={shellRef}
      data-game-shell
      data-slug={slug}
      data-difficulty={learnerLevel.current}
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {enhancedChildren}
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
