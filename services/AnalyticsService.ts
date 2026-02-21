/**
 * ANALYTICS SERVICE
 *
 * Centralized event tracking with localStorage persistence.
 * Tracks the full user funnel: onboarding → game play → path completion.
 *
 * localStorage key: atlas_analytics — JSON array of AnalyticsEvent
 */

// ============================================================
// TYPES
// ============================================================

export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
  sessionId: string;
  userId?: string;
}

export interface FunnelMetrics {
  onboardingStarted: number;
  onboardingCompleted: number;
  onboardingCompletionRate: number;
  firstGamePlayed: number;
  firstGameConversionRate: number;
  gamesStarted: number;
  gamesCompleted: number;
  gameCompletionRate: number;
  pathsEnrolled: number;
  pathsCompleted: number;
  pathCompletionRate: number;
  averageSessionDurationMs: number;
  uniqueSessions: number;
  returnRate: number;
}

export interface GameAnalytics {
  slug: string;
  timesPlayed: number;
  completionRate: number;
  avgScore: number;
  avgTimeMs: number;
  mostCommonDropOffPhase: string;
  difficultyDistribution: Record<string, number>;
}

export interface PhaseDropOff {
  phase: string;
  entered: number;
  completed: number;
  dropOffRate: number;
}

export interface SearchAnalytics {
  query: string;
  resultsCount: number;
  clicked: boolean;
  timestamp: number;
}

export interface DateRange {
  start: number;
  end: number;
}

export type DatePreset = 'today' | '7d' | '30d' | 'all';

// ============================================================
// CONSTANTS
// ============================================================

const ANALYTICS_KEY = 'atlas_analytics';
const SESSION_KEY = 'atlas_session_id';
const MAX_EVENTS = 5000;

const PHASE_ORDER = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// ============================================================
// HELPERS
// ============================================================

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable
  }
}

function getSessionId(): string {
  let id = safeGetItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    safeSetItem(SESSION_KEY, id);
  }
  return id;
}

function loadEvents(): AnalyticsEvent[] {
  const raw = safeGetItem(ANALYTICS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]): void {
  // Keep only the most recent events to prevent storage bloat
  const trimmed = events.length > MAX_EVENTS
    ? events.slice(events.length - MAX_EVENTS)
    : events;
  safeSetItem(ANALYTICS_KEY, JSON.stringify(trimmed));
}

/** Get current Firebase user ID if available */
function getTrackingUserId(): string | undefined {
  try {
    const { getAuthInstance } = require('../services/firebase');
    const auth = getAuthInstance();
    return auth?.currentUser?.uid || undefined;
  } catch {
    return undefined;
  }
}

/** Convert a date preset to a DateRange */
export function dateRangeFromPreset(preset: DatePreset): DateRange | undefined {
  if (preset === 'all') return undefined;
  const now = Date.now();
  const end = now;
  let start: number;
  switch (preset) {
    case 'today': {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
      break;
    }
    case '7d':
      start = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      start = now - 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      return undefined;
  }
  return { start, end };
}

/** Filter events by date range */
function filterByRange(events: AnalyticsEvent[], range?: DateRange): AnalyticsEvent[] {
  if (!range) return events;
  return events.filter(e => e.timestamp >= range.start && e.timestamp <= range.end);
}

// ============================================================
// TRACKING API
// ============================================================

/**
 * Track a single analytics event.
 */
export function trackEvent(type: string, data?: Record<string, unknown>): void {
  const events = loadEvents();
  events.push({
    type,
    timestamp: Date.now(),
    data,
    sessionId: getSessionId(),
    userId: getTrackingUserId(),
  });
  saveEvents(events);
}

// Convenience trackers

export function trackOnboardingStarted(): void {
  trackEvent('onboarding_started');
}

export function trackOnboardingStepCompleted(step: number, stepName: string): void {
  trackEvent('onboarding_step_completed', { step, stepName });
}

export function trackOnboardingCompleted(profile: Record<string, unknown>): void {
  trackEvent('onboarding_completed', profile);
}

export function trackPathEnrolled(pathId: string, templateId: string | null): void {
  trackEvent('path_enrolled', { pathId, templateId });
}

export function trackPathGameStarted(pathId: string, slug: string): void {
  trackEvent('path_game_started', { pathId, slug });
}

export function trackPathGameCompleted(pathId: string, slug: string, score: number): void {
  trackEvent('path_game_completed', { pathId, slug, score });
}

export function trackPathCompleted(pathId: string): void {
  trackEvent('path_completed', { pathId });
}

export function trackGameStarted(slug: string, difficulty?: string): void {
  trackEvent('game_started', { slug, difficulty });
}

export function trackGamePhaseEntered(slug: string, phase: string): void {
  trackEvent('game_phase_entered', { slug, phase });
}

export function trackGamePhaseCompleted(slug: string, phase: string): void {
  trackEvent('game_phase_completed', { slug, phase });
}

export function trackGameTestSubmitted(slug: string, score: number, total: number, passed: boolean): void {
  trackEvent('game_test_submitted', { slug, score, total, passed });
}

export function trackGameCompleted(slug: string, masteryLevel: number, timeMs: number): void {
  trackEvent('game_completed', { slug, masteryLevel, timeMs });
}

export function trackSearchPerformed(query: string, resultsCount: number, resultClicked?: string): void {
  trackEvent('search_performed', { query, resultsCount, resultClicked });
}

export function trackCustomGameRequested(topic: string, validationResult: string): void {
  trackEvent('custom_game_requested', { topic, validationResult });
}

export function trackPageView(route: string): void {
  trackEvent('page_view', { route });
}

export function trackSessionStarted(): void {
  trackEvent('session_started');
}

export function trackSessionEnded(durationMs: number): void {
  trackEvent('session_ended', { durationMs });
}

// ============================================================
// MONETIZATION FUNNEL TRACKERS (Improvement 1)
// ============================================================

export function trackPaywallShown(slug: string, reason: string): void {
  trackEvent('paywall_shown', { slug, reason });
}

export function trackUpgradeClicked(source: string): void {
  trackEvent('upgrade_clicked', { source });
}

export function trackCheckoutStarted(priceId: string): void {
  trackEvent('checkout_started', { priceId });
}

export function trackAuthModalShown(reason: string): void {
  trackEvent('auth_modal_shown', { reason });
}

export function trackAuthModalDismissed(reason: string): void {
  trackEvent('auth_modal_dismissed', { reason });
}

export function trackSignupCompleted(method: string, wasAnonymous: boolean): void {
  trackEvent('signup_completed', { method, wasAnonymous });
}

export function trackAICoachSessionStarted(gameSlug: string): void {
  trackEvent('ai_coach_session_started', { gameSlug });
}

export function trackAICoachMessageSent(gameSlug: string, phase: string): void {
  trackEvent('ai_coach_message_sent', { gameSlug, phase });
}

export function trackAICoachHintRequested(gameSlug: string, phase: string): void {
  trackEvent('ai_coach_hint_requested', { gameSlug, phase });
}

// ============================================================
// COMPUTED METRICS
// ============================================================

/**
 * Returns all raw analytics events.
 */
export function getAllEvents(): AnalyticsEvent[] {
  return loadEvents();
}

/**
 * Computes the full funnel metrics from stored events.
 */
export function getFunnelMetrics(range?: DateRange): FunnelMetrics {
  const events = filterByRange(loadEvents(), range);

  const onboardingStarted = events.filter(e => e.type === 'onboarding_started').length;
  const onboardingCompleted = events.filter(e => e.type === 'onboarding_completed').length;
  const gamesStarted = events.filter(e => e.type === 'game_started').length;
  const gamesCompleted = events.filter(e => e.type === 'game_completed').length;
  const pathsEnrolled = events.filter(e => e.type === 'path_enrolled').length;
  const pathsCompleted = events.filter(e => e.type === 'path_completed').length;

  // First game played: sessions that have at least one game_started after onboarding_completed
  const completedSessions = new Set(
    events.filter(e => e.type === 'onboarding_completed').map(e => e.sessionId)
  );
  const sessionsWithGame = new Set(
    events.filter(e => e.type === 'game_started').map(e => e.sessionId)
  );
  const firstGamePlayed = [...completedSessions].filter(s => sessionsWithGame.has(s)).length;

  // Session durations
  const sessionEnds = events.filter(e => e.type === 'session_ended');
  const sessionDurations = sessionEnds
    .map(e => (e.data?.durationMs as number) || 0)
    .filter(d => d > 0);
  const averageSessionDurationMs = sessionDurations.length > 0
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
    : 0;

  // Unique sessions
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;

  // Return rate (Improvement 6): Group session_started events by userId || sessionId,
  // count users with events on >1 distinct calendar day
  const sessionStarts = events.filter(e => e.type === 'session_started');
  const userDays = new Map<string, Set<string>>();
  for (const e of sessionStarts) {
    const userKey = e.userId || e.sessionId;
    const dayKey = new Date(e.timestamp).toISOString().slice(0, 10);
    if (!userDays.has(userKey)) userDays.set(userKey, new Set());
    userDays.get(userKey)!.add(dayKey);
  }
  const totalUsers = userDays.size;
  const returningUsers = [...userDays.values()].filter(days => days.size > 1).length;
  const returnRate = totalUsers > 0 ? returningUsers / totalUsers : 0;

  return {
    onboardingStarted,
    onboardingCompleted,
    onboardingCompletionRate: onboardingStarted > 0 ? onboardingCompleted / onboardingStarted : 0,
    firstGamePlayed,
    firstGameConversionRate: onboardingCompleted > 0 ? firstGamePlayed / onboardingCompleted : 0,
    gamesStarted,
    gamesCompleted,
    gameCompletionRate: gamesStarted > 0 ? gamesCompleted / gamesStarted : 0,
    pathsEnrolled,
    pathsCompleted,
    pathCompletionRate: pathsEnrolled > 0 ? pathsCompleted / pathsEnrolled : 0,
    averageSessionDurationMs,
    uniqueSessions,
    returnRate,
  };
}

/**
 * Per-game analytics from events.
 */
export function getPerGameAnalytics(range?: DateRange): GameAnalytics[] {
  const events = filterByRange(loadEvents(), range);
  const gameMap = new Map<string, {
    starts: number;
    completes: number;
    scores: number[];
    times: number[];
    phaseDropOffs: Map<string, number>;
    difficulties: Map<string, number>;
  }>();

  for (const e of events) {
    const slug = e.data?.slug as string;
    if (!slug) continue;

    if (!gameMap.has(slug)) {
      gameMap.set(slug, {
        starts: 0, completes: 0, scores: [], times: [],
        phaseDropOffs: new Map(), difficulties: new Map(),
      });
    }
    const g = gameMap.get(slug)!;

    switch (e.type) {
      case 'game_started': {
        g.starts++;
        const diff = (e.data?.difficulty as string) || 'unknown';
        g.difficulties.set(diff, (g.difficulties.get(diff) || 0) + 1);
        break;
      }
      case 'game_completed': {
        g.completes++;
        if (typeof e.data?.masteryLevel === 'number') g.scores.push(e.data.masteryLevel as number);
        if (typeof e.data?.timeMs === 'number') g.times.push(e.data.timeMs as number);
        break;
      }
      case 'game_phase_entered': {
        const phase = e.data?.phase as string;
        if (phase) {
          g.phaseDropOffs.set(phase, (g.phaseDropOffs.get(phase) || 0) + 1);
        }
        break;
      }
    }
  }

  const results: GameAnalytics[] = [];
  for (const [slug, data] of gameMap) {
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;
    const avgTimeMs = data.times.length > 0
      ? data.times.reduce((a, b) => a + b, 0) / data.times.length
      : 0;

    // Find the phase with highest drop-off (entered but game not completed)
    let mostCommonDropOffPhase = 'N/A';
    if (data.phaseDropOffs.size > 0 && data.starts > data.completes) {
      const phases = [...data.phaseDropOffs.entries()].sort((a, b) => b[1] - a[1]);
      mostCommonDropOffPhase = phases[0]?.[0] || 'N/A';
    }

    const diffDist: Record<string, number> = {};
    for (const [k, v] of data.difficulties) diffDist[k] = v;

    results.push({
      slug,
      timesPlayed: data.starts,
      completionRate: data.starts > 0 ? data.completes / data.starts : 0,
      avgScore,
      avgTimeMs,
      mostCommonDropOffPhase,
      difficultyDistribution: diffDist,
    });
  }

  return results.sort((a, b) => b.timesPlayed - a.timesPlayed);
}

/**
 * Phase drop-off analysis across all games (Improvement 7).
 * Groups game_phase_entered events by sessionId:slug to get per-game-session phase sets.
 * Computes drop-off as difference between users reaching phase N vs phase N+1.
 */
export function getPhaseDropOffAnalysis(range?: DateRange): PhaseDropOff[] {
  const events = filterByRange(loadEvents(), range);

  // Group phase events by sessionId:slug to get per-game-session phase sets
  const sessionPhases = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.type === 'game_phase_entered') {
      const slug = e.data?.slug as string;
      const phase = e.data?.phase as string;
      if (!slug || !phase) continue;
      const key = `${e.sessionId}:${slug}`;
      if (!sessionPhases.has(key)) sessionPhases.set(key, new Set());
      sessionPhases.get(key)!.add(phase);
    }
  }

  // Count how many sessions reached each phase
  const phaseReachCount = new Map<string, number>();
  for (const phase of PHASE_ORDER) {
    phaseReachCount.set(phase, 0);
  }

  for (const phases of sessionPhases.values()) {
    for (const phase of PHASE_ORDER) {
      if (phases.has(phase)) {
        phaseReachCount.set(phase, (phaseReachCount.get(phase) || 0) + 1);
      }
    }
  }

  // Compute sequential drop-off
  const results: PhaseDropOff[] = [];
  for (let i = 0; i < PHASE_ORDER.length; i++) {
    const phase = PHASE_ORDER[i];
    const entered = phaseReachCount.get(phase) || 0;
    if (entered === 0) continue;
    const nextPhaseCount = i < PHASE_ORDER.length - 1
      ? (phaseReachCount.get(PHASE_ORDER[i + 1]) || 0)
      : entered; // last phase has no drop-off to next
    const dropOffRate = entered > 0 ? (entered - nextPhaseCount) / entered : 0;
    results.push({
      phase,
      entered,
      completed: nextPhaseCount,
      dropOffRate: Math.max(0, dropOffRate),
    });
  }

  return results;
}

/**
 * Score distribution histograms by difficulty level.
 */
export function getScoreDistribution(range?: DateRange): Record<string, number[]> {
  const events = filterByRange(loadEvents(), range);
  const dist: Record<string, number[]> = {};

  for (const e of events) {
    if (e.type === 'game_test_submitted' && typeof e.data?.score === 'number' && typeof e.data?.total === 'number') {
      const total = e.data.total as number;
      if (total === 0) continue;
      const pct = Math.round(((e.data.score as number) / total) * 100);
      const key = 'all';
      if (!dist[key]) dist[key] = [];
      dist[key].push(pct);
    }
    if (e.type === 'game_completed' && typeof e.data?.masteryLevel === 'number') {
      const key = 'mastery';
      if (!dist[key]) dist[key] = [];
      dist[key].push(e.data.masteryLevel as number);
    }
  }

  return dist;
}

/**
 * Custom game requests aggregation.
 */
export function getCustomRequestsAnalytics(range?: DateRange): Array<{ topic: string; validationResult: string; count: number; lastRequested: number }> {
  const events = filterByRange(loadEvents(), range).filter(e => e.type === 'custom_game_requested');
  const topicMap = new Map<string, { validationResult: string; count: number; lastRequested: number }>();

  for (const e of events) {
    const topic = (e.data?.topic as string) || '';
    const key = topic.toLowerCase().trim();
    if (!key) continue;
    const existing = topicMap.get(key);
    if (existing) {
      existing.count++;
      existing.lastRequested = Math.max(existing.lastRequested, e.timestamp);
    } else {
      topicMap.set(key, {
        validationResult: (e.data?.validationResult as string) || 'unknown',
        count: 1,
        lastRequested: e.timestamp,
      });
    }
  }

  return [...topicMap.entries()]
    .map(([topic, data]) => ({ topic, ...data }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Page view analytics.
 */
export function getPageViewAnalytics(range?: DateRange): Array<{ route: string; views: number; lastVisited: number }> {
  const events = filterByRange(loadEvents(), range).filter(e => e.type === 'page_view');
  const routeMap = new Map<string, { views: number; lastVisited: number }>();

  for (const e of events) {
    const route = (e.data?.route as string) || '/';
    const existing = routeMap.get(route);
    if (existing) {
      existing.views++;
      existing.lastVisited = Math.max(existing.lastVisited, e.timestamp);
    } else {
      routeMap.set(route, { views: 1, lastVisited: e.timestamp });
    }
  }

  return [...routeMap.entries()]
    .map(([route, data]) => ({ route, ...data }))
    .sort((a, b) => b.views - a.views);
}

/**
 * User cohort breakdown.
 */
export function getUserCohorts(range?: DateRange): {
  byDifficulty: Record<string, number>;
  byInterest: Record<string, number>;
  onboarded: number;
  notOnboarded: number;
} {
  const events = filterByRange(loadEvents(), range);
  const byDifficulty: Record<string, number> = {};
  const byInterest: Record<string, number> = {};
  let onboarded = 0;
  let notOnboarded = 0;

  const completedEvents = events.filter(e => e.type === 'onboarding_completed');
  onboarded = completedEvents.length;

  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
  notOnboarded = Math.max(0, uniqueSessions - onboarded);

  for (const e of completedEvents) {
    const level = (e.data?.level as string) || 'unknown';
    byDifficulty[level] = (byDifficulty[level] || 0) + 1;

    const interests = (e.data?.interests as string[]) || [];
    for (const interest of interests) {
      byInterest[interest] = (byInterest[interest] || 0) + 1;
    }
  }

  return { byDifficulty, byInterest, onboarded, notOnboarded };
}
