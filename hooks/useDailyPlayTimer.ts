import { useState, useEffect, useCallback, useRef } from 'react';
import { DAILY_LIMITS, type AccessLevel } from '../lib/accessConfig';

const STORAGE_KEY = 'atlas_daily_play';

interface DailyPlayData {
  date: string;       // ISO date (YYYY-MM-DD)
  secondsUsed: number; // total active seconds used today
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function loadDailyData(): DailyPlayData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as DailyPlayData;
      // Reset if it's a new day
      if (data.date === getTodayISO()) {
        return data;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { date: getTodayISO(), secondsUsed: 0 };
}

function saveDailyData(data: DailyPlayData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

/** Add seconds to today's usage (called by the heartbeat). */
export function addPlayTime(seconds: number): void {
  const data = loadDailyData();
  data.secondsUsed += seconds;
  data.date = getTodayISO();
  saveDailyData(data);
}

/** Get current seconds used today (for access checks outside React). */
export function getDailySecondsUsed(): number {
  return loadDailyData().secondsUsed;
}

/** Clear daily play data (e.g. for testing). */
export function clearDailyPlayData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Hook that tracks active gameplay time.
 *
 * Only ticks when:
 *   1. The game component is mounted (isPlaying=true)
 *   2. The browser tab is focused (not hidden)
 *
 * Returns seconds used today, seconds remaining, and whether time is exhausted.
 */
export function useDailyPlayTimer(tier: AccessLevel, isPlaying: boolean) {
  const [secondsUsed, setSecondsUsed] = useState(() => loadDailyData().secondsUsed);
  const isPlayingRef = useRef(isPlaying);
  const tierRef = useRef(tier);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { tierRef.current = tier; }, [tier]);

  const limit = DAILY_LIMITS[tier] ?? DAILY_LIMITS.starter;
  const secondsRemaining = Math.max(0, limit - secondsUsed);
  const isExhausted = secondsUsed >= limit;

  // Heartbeat: tick 1 second every second while playing + tab visible
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Don't tick if tab is hidden
      if (document.hidden) return;
      // Don't tick if not actively playing
      if (!isPlayingRef.current) return;

      const lim = DAILY_LIMITS[tierRef.current] ?? DAILY_LIMITS.starter;
      const data = loadDailyData();

      // Check for day rollover
      if (data.date !== getTodayISO()) {
        data.date = getTodayISO();
        data.secondsUsed = 0;
      }

      // Don't exceed limit
      if (data.secondsUsed >= lim) {
        setSecondsUsed(data.secondsUsed);
        return;
      }

      data.secondsUsed += 1;
      saveDailyData(data);
      setSecondsUsed(data.secondsUsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sync on mount and when tab regains focus (catches day rollovers)
  useEffect(() => {
    const handleVisibility = () => {
      const data = loadDailyData();
      setSecondsUsed(data.secondsUsed);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const refresh = useCallback(() => {
    setSecondsUsed(loadDailyData().secondsUsed);
  }, []);

  return {
    secondsUsed,
    secondsRemaining,
    isExhausted,
    limit,
    refresh,
  };
}
