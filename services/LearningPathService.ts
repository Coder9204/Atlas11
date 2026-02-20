/**
 * LEARNING PATH SERVICE
 *
 * Manages learning pathways: generating paths from templates, tracking progress,
 * advancing through games, and adjusting difficulty.
 *
 * localStorage key: atlas_paths — JSON array of LearnerPath
 */

import { getGameProgress, getLearnerProfile, type GameRecord } from './GameProgressService';
import { LearningScienceEngine } from './LearningScienceEngine';
import type { Concept } from '../types';

// ============================================================
// TYPES
// ============================================================

export type PathGameStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'mastered';

export interface PathGame {
  slug: string;
  status: PathGameStatus;
  score?: number;
  completedAt?: string;
}

export interface LearnerPath {
  id: string;
  templateId: string | null;
  title: string;
  games: PathGame[];
  currentIndex: number;
  startedAt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================================
// CONSTANTS
// ============================================================

const PATHS_KEY = 'atlas_paths';

// ============================================================
// HELPERS
// ============================================================

function generateId(): string {
  return `path_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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
    // Storage full or unavailable
  }
}

function loadPaths(): LearnerPath[] {
  const raw = safeGetItem(PATHS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LearnerPath[];
  } catch {
    return [];
  }
}

function savePaths(paths: LearnerPath[]): void {
  safeSetItem(PATHS_KEY, JSON.stringify(paths));
}

// ============================================================
// CORE API
// ============================================================

/**
 * Creates a new learning path from a template.
 */
export function createPathFromTemplate(
  templateId: string,
  title: string,
  gameSlugs: string[],
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): LearnerPath {
  const games: PathGame[] = gameSlugs.map((slug, i) => {
    const progress = getGameProgress(slug);
    let status: PathGameStatus = i === 0 ? 'available' : 'locked';

    if (progress) {
      if (progress.passed && progress.masteryLevel >= 90) {
        status = 'mastered';
      } else if (progress.passed) {
        status = 'completed';
      } else if (progress.lastPhase) {
        status = 'in_progress';
      }
    }

    return {
      slug,
      status,
      score: progress?.masteryLevel ?? undefined,
      completedAt: progress?.completedAt
        ? new Date(progress.completedAt).toISOString()
        : undefined,
    };
  });

  // Find the first non-completed game to set as current
  let currentIndex = games.findIndex(
    g => g.status !== 'completed' && g.status !== 'mastered'
  );
  if (currentIndex === -1) currentIndex = games.length - 1;

  // Unlock current game
  if (games[currentIndex] && games[currentIndex].status === 'locked') {
    games[currentIndex].status = 'available';
  }

  const path: LearnerPath = {
    id: generateId(),
    templateId,
    title,
    games,
    currentIndex,
    startedAt: new Date().toISOString(),
    difficulty,
  };

  const paths = loadPaths();
  paths.push(path);
  savePaths(paths);

  return path;
}

/**
 * Creates a custom (non-template) learning path.
 */
export function createCustomPath(
  title: string,
  gameSlugs: string[],
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): LearnerPath {
  return createPathFromTemplate(null as unknown as string, title, gameSlugs, difficulty);
}

/**
 * Returns all saved paths.
 */
export function getAllPaths(): LearnerPath[] {
  return loadPaths();
}

/**
 * Returns all in-progress paths (have at least one non-completed game).
 */
export function getActivePaths(): LearnerPath[] {
  return loadPaths().filter(p =>
    p.games.some(g => g.status !== 'completed' && g.status !== 'mastered')
  );
}

/**
 * Returns a single path by ID.
 */
export function getPath(pathId: string): LearnerPath | undefined {
  return loadPaths().find(p => p.id === pathId);
}

/**
 * Marks the current game as completed, unlocks the next game, and advances the index.
 */
export function advancePath(pathId: string, score?: number): LearnerPath | undefined {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return undefined;

  const currentGame = path.games[path.currentIndex];
  if (currentGame) {
    currentGame.status = score !== undefined && score >= 90 ? 'mastered' : 'completed';
    currentGame.score = score;
    currentGame.completedAt = new Date().toISOString();
  }

  // Unlock next game
  const nextIndex = path.currentIndex + 1;
  if (nextIndex < path.games.length) {
    path.currentIndex = nextIndex;
    if (path.games[nextIndex].status === 'locked') {
      path.games[nextIndex].status = 'available';
    }
  }

  savePaths(paths);
  return path;
}

/**
 * Returns the next available game in a path.
 */
export function getNextGame(pathId: string): PathGame | null {
  const path = getPath(pathId);
  if (!path) return null;

  const next = path.games.find(
    g => g.status === 'available' || g.status === 'in_progress'
  );
  return next || null;
}

/**
 * Marks a game as in-progress.
 */
export function markGameInProgress(pathId: string, slug: string): void {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return;

  const game = path.games.find(g => g.slug === slug);
  if (game && (game.status === 'available' || game.status === 'locked')) {
    game.status = 'in_progress';
  }

  savePaths(paths);
}

/**
 * Adjusts the difficulty for remaining games in a path.
 */
export function adjustDifficulty(
  pathId: string,
  newDifficulty: 'beginner' | 'intermediate' | 'advanced'
): LearnerPath | undefined {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return undefined;

  path.difficulty = newDifficulty;
  savePaths(paths);
  return path;
}

/**
 * Inserts a game into a path at the given position (defaults to after current).
 */
export function addGameToPath(
  pathId: string,
  slug: string,
  position?: number
): LearnerPath | undefined {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return undefined;

  // Don't add duplicates
  if (path.games.some(g => g.slug === slug)) return path;

  const insertAt = position ?? path.currentIndex + 1;
  const newGame: PathGame = { slug, status: 'locked' };

  path.games.splice(insertAt, 0, newGame);

  // Adjust currentIndex if insert was before it
  if (insertAt <= path.currentIndex) {
    path.currentIndex++;
  }

  savePaths(paths);
  return path;
}

/**
 * Removes a game from a path.
 */
export function removeGameFromPath(
  pathId: string,
  slug: string
): LearnerPath | undefined {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return undefined;

  const idx = path.games.findIndex(g => g.slug === slug);
  if (idx === -1) return path;

  path.games.splice(idx, 1);

  // Adjust currentIndex
  if (idx < path.currentIndex) {
    path.currentIndex = Math.max(0, path.currentIndex - 1);
  } else if (idx === path.currentIndex && path.currentIndex >= path.games.length) {
    path.currentIndex = Math.max(0, path.games.length - 1);
  }

  savePaths(paths);
  return path;
}

/**
 * Reorders games in a path by moving a game from one index to another.
 */
export function reorderPathGames(
  pathId: string,
  fromIndex: number,
  toIndex: number
): LearnerPath | undefined {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return undefined;
  if (fromIndex < 0 || fromIndex >= path.games.length) return path;
  if (toIndex < 0 || toIndex >= path.games.length) return path;

  const [moved] = path.games.splice(fromIndex, 1);
  path.games.splice(toIndex, 0, moved);

  // Recalculate currentIndex to first non-completed game
  const newCurrent = path.games.findIndex(
    g => g.status !== 'completed' && g.status !== 'mastered'
  );
  if (newCurrent !== -1) path.currentIndex = newCurrent;

  savePaths(paths);
  return path;
}

/**
 * Deletes a path.
 */
export function deletePath(pathId: string): void {
  const paths = loadPaths().filter(p => p.id !== pathId);
  savePaths(paths);
}

/**
 * Syncs path game statuses with actual GameProgressService records.
 * Call this when loading a path to pick up externally-completed games.
 */
export function syncPathWithProgress(pathId: string): LearnerPath | undefined {
  const paths = loadPaths();
  const path = paths.find(p => p.id === pathId);
  if (!path) return undefined;

  let changed = false;

  for (const game of path.games) {
    const progress = getGameProgress(game.slug);
    if (!progress) continue;

    if (progress.passed && progress.masteryLevel >= 90 && game.status !== 'mastered') {
      game.status = 'mastered';
      game.score = progress.masteryLevel;
      game.completedAt = progress.completedAt
        ? new Date(progress.completedAt).toISOString()
        : undefined;
      changed = true;
    } else if (progress.passed && game.status !== 'completed' && game.status !== 'mastered') {
      game.status = 'completed';
      game.score = progress.masteryLevel;
      game.completedAt = progress.completedAt
        ? new Date(progress.completedAt).toISOString()
        : undefined;
      changed = true;
    } else if (progress.lastPhase && game.status === 'available') {
      game.status = 'in_progress';
      changed = true;
    }
  }

  if (changed) {
    // Advance currentIndex past completed games and unlock next
    let newCurrent = path.games.findIndex(
      g => g.status !== 'completed' && g.status !== 'mastered'
    );
    if (newCurrent === -1) newCurrent = path.games.length - 1;
    path.currentIndex = newCurrent;

    if (path.games[newCurrent] && path.games[newCurrent].status === 'locked') {
      path.games[newCurrent].status = 'available';
    }

    savePaths(paths);
  }

  return path;
}

// ============================================================
// PATH GENERATION FROM LEARNER PROFILE
// ============================================================

/**
 * Generates recommended path template IDs based on learner profile interests and level.
 * Returns template IDs sorted by relevance.
 */
export function getRecommendedTemplateIds(
  interests: string[],
  level: string,
  allTemplateIds: Array<{ id: string; category: string; difficulty: string }>
): string[] {
  const appropriateDifficulties = getAppropriateDifficulties(level);

  const scored = allTemplateIds.map(t => {
    let score = 0;

    // Difficulty match
    if (appropriateDifficulties.includes(t.difficulty)) {
      score += 20;
    }

    // Interest match
    if (interests.some(i =>
      t.category.toLowerCase().includes(i.toLowerCase()) ||
      i.toLowerCase().includes(t.category.toLowerCase())
    )) {
      score += 30;
    }

    return { id: t.id, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.id);
}

function getAppropriateDifficulties(level: string): string[] {
  switch (level.toLowerCase()) {
    case 'beginner':
      return ['beginner'];
    case 'intermediate':
      return ['beginner', 'intermediate'];
    case 'advanced':
      return ['intermediate', 'advanced'];
    default:
      return ['beginner', 'intermediate'];
  }
}

// ============================================================
// SM-2 INTEGRATION
// ============================================================

/**
 * Returns games from a path that are due for review based on SM-2 scheduling.
 */
export function getPathReviewDue(pathId: string): PathGame[] {
  const path = getPath(pathId);
  if (!path) return [];

  const now = Date.now();
  const due: PathGame[] = [];

  for (const game of path.games) {
    if (game.status !== 'completed' && game.status !== 'mastered') continue;

    const progress = getGameProgress(game.slug);
    if (!progress || !progress.completedAt) continue;

    // Build a Concept object from progress to use SM-2
    const concept: Concept = {
      id: game.slug,
      name: game.slug,
      mastery: progress.masteryLevel,
      exposure: progress.passed ? 'practiced' : 'explained',
      lastReviewed: progress.lastPlayedAt,
      nextReview: progress.lastPlayedAt + getReviewInterval(progress),
      prerequisites: [],
      easeFactor: 2.5,
      consecutiveCorrect: progress.passed ? Math.floor(progress.masteryLevel / 20) : 0,
    };

    if (concept.nextReview <= now) {
      due.push(game);
    }
  }

  return due;
}

function getReviewInterval(progress: GameRecord): number {
  // Simple interval based on mastery level
  if (progress.masteryLevel >= 90) return 14 * 24 * 60 * 60 * 1000; // 14 days
  if (progress.masteryLevel >= 70) return 7 * 24 * 60 * 60 * 1000;  // 7 days
  if (progress.masteryLevel >= 50) return 3 * 24 * 60 * 60 * 1000;  // 3 days
  return 1 * 24 * 60 * 60 * 1000; // 1 day
}

// ============================================================
// PATH STATS
// ============================================================

export interface PathStats {
  totalGames: number;
  completedGames: number;
  masteredGames: number;
  averageScore: number;
  progressPercent: number;
  estimatedMinutesRemaining: number;
}

/**
 * Computes stats for a path.
 */
export function getPathStats(path: LearnerPath): PathStats {
  const totalGames = path.games.length;
  const completedGames = path.games.filter(
    g => g.status === 'completed' || g.status === 'mastered'
  ).length;
  const masteredGames = path.games.filter(g => g.status === 'mastered').length;

  const scored = path.games.filter(g => g.score !== undefined);
  const averageScore =
    scored.length > 0
      ? scored.reduce((sum, g) => sum + (g.score || 0), 0) / scored.length
      : 0;

  const progressPercent = totalGames > 0 ? (completedGames / totalGames) * 100 : 0;

  const minutesPerGame = path.difficulty === 'beginner' ? 5 : path.difficulty === 'intermediate' ? 8 : 12;
  const remainingGames = totalGames - completedGames;
  const estimatedMinutesRemaining = remainingGames * minutesPerGame;

  return {
    totalGames,
    completedGames,
    masteredGames,
    averageScore,
    progressPercent,
    estimatedMinutesRemaining,
  };
}
