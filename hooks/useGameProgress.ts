/**
 * GAME PROGRESS HOOKS
 *
 * React hooks wrapping GameProgressService for use in components.
 *
 * useGameProgress(slug, category?, difficulty?)
 *   - Tracks progress for a single game session
 *   - Provides phase updates, test submission, and time tracking
 *
 * useAnalytics()
 *   - Provides aggregate analytics summary across all games
 *   - Supports manual refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveGameProgress,
  getGameProgress,
  getAllGameProgress,
  getAnalyticsSummary,
  recordActivity,
  GameRecord,
  AnalyticsSummary,
} from '../services/GameProgressService';

// ============================================================
// useGameProgress
// ============================================================

export interface UseGameProgressReturn {
  /** Current progress record for this game, or null if never played */
  record: GameRecord | null;
  /** Save the current phase (e.g. 'learn', 'practice', 'test', 'mastery') */
  updatePhase: (phase: string) => void;
  /** Submit test results — computes mastery and pass/fail */
  submitTestScore: (score: number, total: number) => void;
  /** Start the session timer */
  startTimer: () => void;
  /** Stop the session timer and accumulate elapsed time */
  stopTimer: () => void;
}

/**
 * Hook for tracking individual game progress.
 *
 * On mount, loads existing progress from localStorage and calls recordActivity().
 * Provides methods to update phase, submit test scores, and track time.
 *
 * @param slug - Unique game identifier
 * @param category - Game category (e.g. 'Mechanics', 'Thermodynamics')
 * @param difficulty - Game difficulty (e.g. 'beginner', 'intermediate', 'advanced')
 */
export function useGameProgress(
  slug: string,
  category?: string,
  difficulty?: string
): UseGameProgressReturn {
  const [record, setRecord] = useState<GameRecord | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);

  // Load existing progress on mount and record activity
  useEffect(() => {
    try {
      const existing = getGameProgress(slug);
      if (existing) {
        setRecord(existing);
        accumulatedMsRef.current = existing.timeSpentMs || 0;
      }
      recordActivity();
    } catch {
      // Graceful fallback — leave record as null
    }
  }, [slug]);

  /**
   * Save the current phase. If phase is 'mastery', also sets completedAt.
   */
  const updatePhase = useCallback(
    (phase: string) => {
      try {
        const updates: Partial<GameRecord> = {
          lastPhase: phase,
          category: category || record?.category || '',
          difficulty: difficulty || record?.difficulty || '',
        };

        if (phase === 'mastery') {
          updates.completedAt = Date.now();
        }

        saveGameProgress(slug, updates);
        const updated = getGameProgress(slug);
        setRecord(updated);
      } catch {
        // Silently fail — localStorage may be unavailable
      }
    },
    [slug, category, difficulty, record]
  );

  /**
   * Submit test results:
   * - Calculates masteryLevel as Math.round((score / total) * 100)
   * - Sets passed to true if mastery >= 70
   * - Increments attempts count
   * - Sets completedAt if not already set
   */
  const submitTestScore = useCallback(
    (score: number, total: number) => {
      try {
        const masteryLevel = total > 0 ? Math.round((score / total) * 100) : 0;
        const passed = masteryLevel >= 70;
        const currentAttempts = record?.attempts ?? 0;

        const updates: Partial<GameRecord> = {
          testScore: score,
          testTotal: total,
          masteryLevel,
          passed,
          attempts: currentAttempts + 1,
          category: category || record?.category || '',
          difficulty: difficulty || record?.difficulty || '',
        };

        // Set completedAt on first completion
        if (!record?.completedAt) {
          updates.completedAt = Date.now();
        }

        saveGameProgress(slug, updates);
        const updated = getGameProgress(slug);
        setRecord(updated);
      } catch {
        // Silently fail
      }
    },
    [slug, category, difficulty, record]
  );

  /**
   * Start the session timer. Records the current timestamp.
   * If a timer is already running, this is a no-op.
   */
  const startTimer = useCallback(() => {
    if (timerStartRef.current === null) {
      timerStartRef.current = Date.now();
    }
  }, []);

  /**
   * Stop the session timer and persist accumulated time.
   * Adds elapsed time since startTimer was called to the cumulative total.
   */
  const stopTimer = useCallback(() => {
    if (timerStartRef.current !== null) {
      const elapsed = Date.now() - timerStartRef.current;
      accumulatedMsRef.current += elapsed;
      timerStartRef.current = null;

      try {
        saveGameProgress(slug, {
          timeSpentMs: accumulatedMsRef.current,
        });
        const updated = getGameProgress(slug);
        setRecord(updated);
      } catch {
        // Silently fail
      }
    }
  }, [slug]);

  return {
    record,
    updatePhase,
    submitTestScore,
    startTimer,
    stopTimer,
  };
}

// ============================================================
// useAnalytics
// ============================================================

export interface UseAnalyticsReturn {
  /** Aggregate analytics summary, or null while loading */
  summary: AnalyticsSummary | null;
  /** All individual game progress records */
  allProgress: GameRecord[];
  /** Re-read from localStorage and recompute analytics */
  refresh: () => void;
}

/**
 * Hook for reading aggregate analytics across all games.
 *
 * On mount, computes the analytics summary from all stored game records.
 * Provides a refresh function to re-read from localStorage.
 */
export function useAnalytics(): UseAnalyticsReturn {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [allProgress, setAllProgress] = useState<GameRecord[]>([]);

  const refresh = useCallback(() => {
    try {
      const records = getAllGameProgress();
      const analytics = getAnalyticsSummary();
      setAllProgress(records);
      setSummary(analytics);
    } catch {
      setAllProgress([]);
      setSummary(null);
    }
  }, []);

  // Compute on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    summary,
    allProgress,
    refresh,
  };
}
