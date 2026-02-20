/**
 * GAME PROGRESS HOOKS
 *
 * React hooks wrapping GameProgressService for use in components.
 *
 * useGameProgress(slug, category?, difficulty?)
 *   - Tracks progress for a single game session
 *   - Provides phase updates, test submission, and time tracking
 *   - Difficulty-adaptive pass thresholds (beginner:60, intermediate:70, advanced:80)
 *   - SM-2 spaced repetition integration
 *   - Letter grades and mastery level labels
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
  getLearnerProfile,
  GameRecord,
  AnalyticsSummary,
} from '../services/GameProgressService';
import { PASS_THRESHOLDS } from '../components/GameShell';
import { LearningScienceEngine } from '../services/LearningScienceEngine';
import { trackGameTestSubmitted, trackGamePhaseEntered, trackGamePhaseCompleted } from '../services/AnalyticsService';
import type { Concept } from '../types';

// ============================================================
// GRADING HELPERS
// ============================================================

/** Returns a letter grade for a mastery percentage. */
export function getLetterGrade(mastery: number): string {
  if (mastery >= 90) return 'A';
  if (mastery >= 80) return 'B';
  if (mastery >= 70) return 'C';
  if (mastery >= 60) return 'D';
  return 'F';
}

/** Returns a human-readable mastery level label. */
export function getMasteryLabel(mastery: number): string {
  if (mastery >= 96) return 'Master';
  if (mastery >= 81) return 'Expert';
  if (mastery >= 61) return 'Proficient';
  if (mastery >= 31) return 'Developing';
  return 'Novice';
}

/** Returns the pass threshold for the current learner's difficulty level. */
function getPassThreshold(): number {
  try {
    const profile = getLearnerProfile();
    const level = profile?.level || 'intermediate';
    return PASS_THRESHOLDS[level] || 70;
  } catch {
    return 70;
  }
}

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
   * Tracks phase transitions via AnalyticsService.
   */
  const updatePhase = useCallback(
    (phase: string) => {
      try {
        // Track previous phase completion and new phase entry
        if (record?.lastPhase && record.lastPhase !== phase) {
          trackGamePhaseCompleted(slug, record.lastPhase);
        }
        trackGamePhaseEntered(slug, phase);

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
   * - Uses difficulty-adaptive pass threshold from learner profile
   * - Computes letter grade (A-F) and mastery label
   * - Runs SM-2 spaced repetition to compute next review date
   * - Increments attempts count
   * - Sets completedAt if not already set
   */
  const submitTestScore = useCallback(
    (score: number, total: number) => {
      try {
        const masteryLevel = total > 0 ? Math.round((score / total) * 100) : 0;
        const threshold = getPassThreshold();
        const passed = masteryLevel >= threshold;
        const currentAttempts = record?.attempts ?? 0;
        const letterGrade = getLetterGrade(masteryLevel);
        const masteryLabel = getMasteryLabel(masteryLevel);

        // SM-2 integration: compute next review schedule
        const performanceRating = masteryToSM2Rating(masteryLevel);
        const concept: Concept = {
          id: slug,
          name: slug,
          mastery: record?.masteryLevel || 0,
          exposure: record?.passed ? 'practiced' : 'explained',
          lastReviewed: record?.lastPlayedAt || Date.now(),
          nextReview: record?.nextReviewDate || Date.now(),
          prerequisites: [],
          easeFactor: record?.easeFactor ?? 2.5,
          consecutiveCorrect: record?.consecutiveCorrect ?? 0,
        };

        const updatedConcept = LearningScienceEngine.calculateNextReview(concept, performanceRating);

        const updates: Partial<GameRecord> = {
          testScore: score,
          testTotal: total,
          masteryLevel,
          passed,
          attempts: currentAttempts + 1,
          category: category || record?.category || '',
          difficulty: difficulty || record?.difficulty || '',
          letterGrade,
          masteryLabel,
          nextReviewDate: updatedConcept.nextReview,
          easeFactor: updatedConcept.easeFactor || 2.5,
          consecutiveCorrect: updatedConcept.consecutiveCorrect || 0,
        };

        // Set completedAt on first completion
        if (!record?.completedAt) {
          updates.completedAt = Date.now();
        }

        saveGameProgress(slug, updates);
        const updated = getGameProgress(slug);
        setRecord(updated);

        // Track analytics
        trackGameTestSubmitted(slug, score, total, passed);
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

/**
 * Converts mastery percentage (0-100) to SM-2 performance rating (0-5).
 */
function masteryToSM2Rating(mastery: number): number {
  if (mastery >= 95) return 5;
  if (mastery >= 80) return 4;
  if (mastery >= 60) return 3;
  if (mastery >= 40) return 2;
  if (mastery >= 20) return 1;
  return 0;
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
