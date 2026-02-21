import { useState, useEffect } from 'react';

const TIMER_KEY = 'atlas_free_timer_start';
const FREE_DURATION_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Returns the start timestamp, initializing it on first call.
 */
function getTimerStart(): number {
  try {
    const stored = localStorage.getItem(TIMER_KEY);
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val)) return val;
    }
    const now = Date.now();
    localStorage.setItem(TIMER_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

/**
 * Clears the free trial timer (call on successful signup).
 */
export function clearFreeTimer(): void {
  try {
    localStorage.removeItem(TIMER_KEY);
  } catch {
    // ignore
  }
}

/**
 * 20-minute free trial timer hook.
 * Wall-clock based — closing tab doesn't pause the timer.
 */
export function useFreeTimer() {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const start = getTimerStart();
    const elapsed = Date.now() - start;
    return Math.max(0, Math.ceil((FREE_DURATION_MS - elapsed) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const start = getTimerStart();
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, Math.ceil((FREE_DURATION_MS - elapsed) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    secondsLeft,
    isExpired: secondsLeft <= 0,
  };
}
