/**
 * GAME PROGRESS SERVICE
 *
 * Persists game progress to localStorage with optional Firestore sync later.
 * Handles individual game records, learner profiles, analytics summaries,
 * and game recommendations.
 *
 * localStorage key pattern:
 *   atlas_gp_{slug}     - JSON of GameRecord for each game
 *   atlas_profile       - JSON of LearnerProfileData
 *   atlas_onboarding_done - "true" or absent
 *   atlas_last_active   - ISO date string for streak calculation
 */

// ============================================================
// TYPES
// ============================================================

export interface GameRecord {
  slug: string;
  category: string;
  difficulty: string;
  lastPhase: string;
  testScore: number | null;
  testTotal: number | null;
  passed: boolean;
  masteryLevel: number;
  completedAt: number | null;
  lastPlayedAt: number;
  timeSpentMs: number;
  attempts: number;
}

export interface AnalyticsSummary {
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  totalGamesPassed: number;
  averageScore: number;
  categoryBreakdown: Record<string, {
    played: number;
    completed: number;
    passed: number;
    avgScore: number;
    avgMastery: number;
  }>;
  difficultyBreakdown: Record<string, {
    played: number;
    completed: number;
    avgScore: number;
  }>;
  recentActivity: GameRecord[];
  totalTimeSpentMs: number;
  streakDays: number;
}

export interface LearnerProfileData {
  goals: string[];
  interests: string[];
  level: string;
  completedOnboarding: boolean;
  createdAt: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const GP_PREFIX = 'atlas_gp_';
const PROFILE_KEY = 'atlas_profile';
const ONBOARDING_KEY = 'atlas_onboarding_done';
const LAST_ACTIVE_KEY = 'atlas_last_active';

// ============================================================
// HELPERS
// ============================================================

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__atlas_ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function safeGetItem(key: string): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function safeParseJSON<T>(json: string | null): T | null {
  if (json === null) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================
// GAME PROGRESS
// ============================================================

/**
 * Reads existing game progress for a slug, merges in the provided updates,
 * and writes the merged record back to localStorage.
 * Always sets lastPlayedAt to Date.now().
 */
export function saveGameProgress(slug: string, updates: Partial<GameRecord>): void {
  const existing = getGameProgress(slug);

  const now = Date.now();

  const merged: GameRecord = {
    slug,
    category: '',
    difficulty: '',
    lastPhase: '',
    testScore: null,
    testTotal: null,
    passed: false,
    masteryLevel: 0,
    completedAt: null,
    lastPlayedAt: now,
    timeSpentMs: 0,
    attempts: 0,
    ...existing,
    ...updates,
  };

  // Always update lastPlayedAt to current time
  merged.lastPlayedAt = now;

  safeSetItem(`${GP_PREFIX}${slug}`, JSON.stringify(merged));
}

/**
 * Reads the GameRecord for a given slug from localStorage.
 * Returns null if not found or if the stored value is invalid JSON.
 */
export function getGameProgress(slug: string): GameRecord | null {
  const raw = safeGetItem(`${GP_PREFIX}${slug}`);
  return safeParseJSON<GameRecord>(raw);
}

/**
 * Reads ALL atlas_gp_* keys from localStorage and returns
 * an array of parsed GameRecord objects.
 */
export function getAllGameProgress(): GameRecord[] {
  if (!isLocalStorageAvailable()) return [];

  const records: GameRecord[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(GP_PREFIX)) {
        const parsed = safeParseJSON<GameRecord>(localStorage.getItem(key));
        if (parsed) {
          records.push(parsed);
        }
      }
    }
  } catch {
    // localStorage iteration failed
  }

  return records;
}

// ============================================================
// ANALYTICS
// ============================================================

/**
 * Computes aggregate statistics from all game progress records.
 * streakDays counts consecutive past days (including today) with recorded activity.
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  const allRecords = getAllGameProgress();

  const totalGamesPlayed = allRecords.length;
  const completedRecords = allRecords.filter(r => r.completedAt !== null);
  const totalGamesCompleted = completedRecords.length;
  const passedRecords = allRecords.filter(r => r.passed);
  const totalGamesPassed = passedRecords.length;

  // Average score: only consider records that have a testScore and testTotal
  const scoredRecords = allRecords.filter(
    r => r.testScore !== null && r.testTotal !== null && r.testTotal > 0
  );
  const averageScore =
    scoredRecords.length > 0
      ? scoredRecords.reduce((sum, r) => sum + (r.testScore! / r.testTotal!) * 100, 0) /
        scoredRecords.length
      : 0;

  // Category breakdown
  const categoryBreakdown: AnalyticsSummary['categoryBreakdown'] = {};
  for (const record of allRecords) {
    const cat = record.category || 'uncategorized';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { played: 0, completed: 0, passed: 0, avgScore: 0, avgMastery: 0 };
    }
    categoryBreakdown[cat].played++;
    if (record.completedAt !== null) categoryBreakdown[cat].completed++;
    if (record.passed) categoryBreakdown[cat].passed++;
  }
  // Compute averages per category
  for (const cat of Object.keys(categoryBreakdown)) {
    const catRecords = allRecords.filter(r => (r.category || 'uncategorized') === cat);
    const catScored = catRecords.filter(
      r => r.testScore !== null && r.testTotal !== null && r.testTotal > 0
    );
    categoryBreakdown[cat].avgScore =
      catScored.length > 0
        ? catScored.reduce((sum, r) => sum + (r.testScore! / r.testTotal!) * 100, 0) /
          catScored.length
        : 0;
    categoryBreakdown[cat].avgMastery =
      catRecords.length > 0
        ? catRecords.reduce((sum, r) => sum + r.masteryLevel, 0) / catRecords.length
        : 0;
  }

  // Difficulty breakdown
  const difficultyBreakdown: AnalyticsSummary['difficultyBreakdown'] = {};
  for (const record of allRecords) {
    const diff = record.difficulty || 'unknown';
    if (!difficultyBreakdown[diff]) {
      difficultyBreakdown[diff] = { played: 0, completed: 0, avgScore: 0 };
    }
    difficultyBreakdown[diff].played++;
    if (record.completedAt !== null) difficultyBreakdown[diff].completed++;
  }
  for (const diff of Object.keys(difficultyBreakdown)) {
    const diffRecords = allRecords.filter(r => (r.difficulty || 'unknown') === diff);
    const diffScored = diffRecords.filter(
      r => r.testScore !== null && r.testTotal !== null && r.testTotal > 0
    );
    difficultyBreakdown[diff].avgScore =
      diffScored.length > 0
        ? diffScored.reduce((sum, r) => sum + (r.testScore! / r.testTotal!) * 100, 0) /
          diffScored.length
        : 0;
  }

  // Recent activity: last 10 played, sorted by lastPlayedAt descending
  const recentActivity = [...allRecords]
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, 10);

  // Total time spent
  const totalTimeSpentMs = allRecords.reduce((sum, r) => sum + r.timeSpentMs, 0);

  // Streak days: count consecutive days with activity going backwards from today
  const streakDays = calculateStreakDays(allRecords);

  return {
    totalGamesPlayed,
    totalGamesCompleted,
    totalGamesPassed,
    averageScore,
    categoryBreakdown,
    difficultyBreakdown,
    recentActivity,
    totalTimeSpentMs,
    streakDays,
  };
}

/**
 * Calculates consecutive days with activity going backwards from today.
 * Uses both atlas_last_active and individual game record lastPlayedAt timestamps.
 */
function calculateStreakDays(allRecords: GameRecord[]): number {
  // Collect all unique active dates
  const activeDates = new Set<string>();

  // Add atlas_last_active if present
  const lastActive = safeGetItem(LAST_ACTIVE_KEY);
  if (lastActive) {
    activeDates.add(lastActive);
  }

  // Add dates from all game records
  for (const record of allRecords) {
    if (record.lastPlayedAt) {
      const dateStr = new Date(record.lastPlayedAt).toISOString().split('T')[0];
      activeDates.add(dateStr);
    }
  }

  if (activeDates.size === 0) return 0;

  // Count consecutive days going backwards from today
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(today);

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (activeDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ============================================================
// PROFILE
// ============================================================

/**
 * Saves the learner profile to localStorage and marks onboarding as complete.
 */
export function saveLearnerProfile(profile: LearnerProfileData): void {
  safeSetItem(PROFILE_KEY, JSON.stringify(profile));
  safeSetItem(ONBOARDING_KEY, 'true');
}

/**
 * Reads the learner profile from localStorage.
 * Returns null if not found or if stored value is invalid JSON.
 */
export function getLearnerProfile(): LearnerProfileData | null {
  const raw = safeGetItem(PROFILE_KEY);
  return safeParseJSON<LearnerProfileData>(raw);
}

/**
 * Returns true if onboarding has been completed.
 */
export function isOnboardingComplete(): boolean {
  return safeGetItem(ONBOARDING_KEY) === 'true';
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

interface CatalogEntry {
  slug: string;
  category: string;
  difficulty: string;
  name: string;
}

interface RecommendedGame extends CatalogEntry {
  reason: string;
}

/**
 * Returns a sorted list of recommended games based on the learner profile
 * and existing progress data.
 *
 * Priority order:
 *   1. Filter by profile interests (if profile exists)
 *   2. Filter by appropriate difficulty level
 *   3. Deprioritize already-mastered games (masteryLevel >= 90)
 *   4. Prioritize games not yet played
 *   5. Then games played but not passed
 *   6. Add a reason string explaining the recommendation
 *   7. Return top 12
 */
export function getRecommendedGames(
  profile: LearnerProfileData | null,
  catalog: CatalogEntry[]
): RecommendedGame[] {
  const allProgress = getAllGameProgress();
  const progressMap = new Map<string, GameRecord>();
  for (const record of allProgress) {
    progressMap.set(record.slug, record);
  }

  // Determine appropriate difficulty levels based on profile level
  const appropriateDifficulties = getAppropriateDifficulties(profile?.level ?? 'beginner');

  // Score each catalog entry
  const scored: Array<{ game: CatalogEntry; score: number; reason: string }> = [];

  for (const game of catalog) {
    let score = 50; // base score
    let reason = '';

    const progress = progressMap.get(game.slug);

    // Interest matching
    if (profile && profile.interests.length > 0) {
      const matchesInterest = profile.interests.some(
        interest => game.category.toLowerCase().includes(interest.toLowerCase()) ||
                    interest.toLowerCase().includes(game.category.toLowerCase())
      );
      if (matchesInterest) {
        score += 30;
        const matchedInterest = profile.interests.find(
          interest => game.category.toLowerCase().includes(interest.toLowerCase()) ||
                      interest.toLowerCase().includes(game.category.toLowerCase())
        );
        reason = `Matches your interest in ${matchedInterest || game.category}`;
      }
    }

    // Difficulty appropriateness
    if (appropriateDifficulties.includes(game.difficulty.toLowerCase())) {
      score += 15;
      if (!reason) {
        reason = `Try this ${game.difficulty} game`;
      }
    } else {
      score -= 10;
    }

    // Mastered games get deprioritized
    if (progress && progress.masteryLevel >= 90) {
      score -= 40;
      reason = 'Already mastered — revisit for review';
    }

    // Not yet played gets highest priority
    if (!progress) {
      score += 25;
      if (!reason) {
        reason = 'New game to explore';
      }
    } else if (!progress.passed) {
      // Played but not passed
      score += 15;
      if (!reason) {
        reason = 'Keep practicing to pass';
      }
    }

    // Fallback reason
    if (!reason) {
      reason = `Recommended ${game.difficulty} ${game.category} game`;
    }

    scored.push({ game, score, reason });
  }

  // Sort by score descending, then alphabetically by name for stability
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.game.name.localeCompare(b.game.name);
  });

  // Return top 12
  return scored.slice(0, 12).map(({ game, reason }) => ({
    slug: game.slug,
    category: game.category,
    difficulty: game.difficulty,
    name: game.name,
    reason,
  }));
}

/**
 * Returns a list of appropriate difficulty levels based on the learner's level.
 */
function getAppropriateDifficulties(level: string): string[] {
  switch (level.toLowerCase()) {
    case 'beginner':
      return ['beginner', 'easy', 'introductory'];
    case 'intermediate':
      return ['intermediate', 'medium', 'beginner'];
    case 'advanced':
      return ['advanced', 'hard', 'intermediate'];
    default:
      return ['beginner', 'easy', 'introductory', 'intermediate'];
  }
}

// ============================================================
// ACTIVITY TRACKING
// ============================================================

/**
 * Records today's date as the last active date for streak tracking.
 */
export function recordActivity(): void {
  safeSetItem(LAST_ACTIVE_KEY, getTodayISO());
}
