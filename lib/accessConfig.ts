/**
 * ACCESS CONFIGURATION
 *
 * Single source of truth for game access rules and pricing.
 *
 * Gating model: TIME-BASED daily limits
 *   - Guest (no account): 1 game only — pendulum-period (unlimited time on that game)
 *   - Starter (free account): 15 min/day across all games
 *   - Plus ($9.50/mo or $59.50/yr): 90 min/day, no ads
 *   - Pro ($14.50/mo or $99.50/yr): 4 hrs/day, no ads, certificates, offline, priority support
 */

// ── Guest game ──────────────────────────────────────────────────────────────

/** The single game accessible without any account */
export const GUEST_GAME = 'pendulum-period';

// ── Daily play-time limits (in seconds) ─────────────────────────────────────

export const DAILY_LIMITS = {
  guest: 0,           // Guest can only play GUEST_GAME — no timed access to library
  starter: 15 * 60,   // 15 minutes = 900 seconds
  plus: 90 * 60,      // 90 minutes = 5400 seconds
  pro: 4 * 60 * 60,   // 4 hours = 14400 seconds
} as const;

// ── Pricing display values ───────────────────────────────────────────────────

export const PRICING = {
  plus: {
    monthly: 9.50,
    annual: 59.50,
    monthlyEquivalent: 4.96, // 59.50 / 12
  },
  pro: {
    monthly: 14.50,
    annual: 99.50,
    monthlyEquivalent: 8.29, // 99.50 / 12
  },
} as const;

// ── Access helpers ───────────────────────────────────────────────────────────

export type AccessLevel = 'guest' | 'starter' | 'plus' | 'pro';

/** Check if a game slug is the guest-accessible game */
export function isGuestGame(slug: string): boolean {
  return slug === GUEST_GAME;
}

/** Get daily time limit in seconds for a given tier */
export function getDailyLimitSeconds(tier: AccessLevel): number {
  return DAILY_LIMITS[tier] ?? DAILY_LIMITS.starter;
}

/** Format seconds as a human-readable string (e.g. "14:32" or "1h 30m") */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Format a daily limit for display (e.g. "15 min", "90 min", "4 hours") */
export function formatDailyLimit(tier: AccessLevel): string {
  const secs = DAILY_LIMITS[tier];
  if (secs === 0) return 'Demo only';
  const mins = secs / 60;
  if (mins < 60) return `${mins} min/day`;
  const hrs = mins / 60;
  return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}/day`;
}

/**
 * Determine if a user can start playing a game.
 *
 * Rules:
 *   - Guest (anonymous): can only play GUEST_GAME
 *   - Starter (free account): can play any game if daily time remaining > 0
 *   - Plus/Pro: can play any game if daily time remaining > 0
 *
 * @param slug - Game slug
 * @param tier - User's access tier
 * @param isAuthenticated - Whether the user has signed in
 * @param dailySecondsUsed - Seconds used today
 */
export function canAccessGame(
  slug: string,
  tier: AccessLevel,
  isAuthenticated: boolean,
  dailySecondsUsed: number,
): boolean {
  // Guest game is always accessible to everyone
  if (isGuestGame(slug)) return true;

  // Anonymous users can only play the guest game
  if (!isAuthenticated) return false;

  // Authenticated users: check daily time budget
  const limit = getDailyLimitSeconds(tier);
  return dailySecondsUsed < limit;
}

/**
 * Get the reason a game is locked, for UI messaging.
 */
export function getLockReason(
  slug: string,
  isAuthenticated: boolean,
  tier: AccessLevel,
  dailySecondsUsed: number,
): 'none' | 'signup_required' | 'time_exhausted' | 'upgrade_for_more_time' {
  if (isGuestGame(slug)) return 'none';
  if (!isAuthenticated) return 'signup_required';

  const limit = getDailyLimitSeconds(tier);
  if (dailySecondsUsed >= limit) {
    if (tier === 'starter' || tier === 'plus') return 'upgrade_for_more_time';
    return 'time_exhausted'; // Pro users hit 4hr limit
  }

  return 'none';
}
