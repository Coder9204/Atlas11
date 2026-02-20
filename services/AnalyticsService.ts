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

// ============================================================
// CONSTANTS
// ============================================================

const ANALYTICS_KEY = 'atlas_analytics';
const SESSION_KEY = 'atlas_session_id';
const MAX_EVENTS = 5000;

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
export function getFunnelMetrics(): FunnelMetrics {
  const events = loadEvents();

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
  const sessionStarts = events.filter(e => e.type === 'session_started');
  const sessionEnds = events.filter(e => e.type === 'session_ended');
  const sessionDurations = sessionEnds
    .map(e => (e.data?.durationMs as number) || 0)
    .filter(d => d > 0);
  const averageSessionDurationMs = sessionDurations.length > 0
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
    : 0;

  // Unique sessions
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size;

  // Return rate: sessions that have more than one session_started event
  const sessionStartCounts = new Map<string, number>();
  for (const e of sessionStarts) {
    sessionStartCounts.set(e.sessionId, (sessionStartCounts.get(e.sessionId) || 0) + 1);
  }
  const returningSessions = [...sessionStartCounts.values()].filter(c => c > 1).length;
  const returnRate = uniqueSessions > 0 ? returningSessions / uniqueSessions : 0;

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
export function getPerGameAnalytics(): GameAnalytics[] {
  const events = loadEvents();
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
 * Phase drop-off analysis across all games.
 */
export function getPhaseDropOffAnalysis(): PhaseDropOff[] {
  const events = loadEvents();
  const entered = new Map<string, number>();
  const completed = new Map<string, number>();

  for (const e of events) {
    if (e.type === 'game_phase_entered') {
      const phase = e.data?.phase as string;
      if (phase) entered.set(phase, (entered.get(phase) || 0) + 1);
    }
    if (e.type === 'game_phase_completed') {
      const phase = e.data?.phase as string;
      if (phase) completed.set(phase, (completed.get(phase) || 0) + 1);
    }
  }

  const phases: PhaseDropOff[] = [];
  for (const [phase, enteredCount] of entered) {
    const completedCount = completed.get(phase) || 0;
    phases.push({
      phase,
      entered: enteredCount,
      completed: completedCount,
      dropOffRate: enteredCount > 0 ? (enteredCount - completedCount) / enteredCount : 0,
    });
  }

  return phases.sort((a, b) => b.dropOffRate - a.dropOffRate);
}

/**
 * Score distribution histograms by difficulty level.
 */
export function getScoreDistribution(): Record<string, number[]> {
  const events = loadEvents();
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
export function getCustomRequestsAnalytics(): Array<{ topic: string; validationResult: string; count: number; lastRequested: number }> {
  const events = loadEvents().filter(e => e.type === 'custom_game_requested');
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
export function getPageViewAnalytics(): Array<{ route: string; views: number; lastVisited: number }> {
  const events = loadEvents().filter(e => e.type === 'page_view');
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
export function getUserCohorts(): {
  byDifficulty: Record<string, number>;
  byInterest: Record<string, number>;
  onboarded: number;
  notOnboarded: number;
} {
  const events = loadEvents();
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
