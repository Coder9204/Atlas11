import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAnalyticsSummary,
  getAllGameProgress,
  getLearnerProfile,
  getGameProgress,
  AnalyticsSummary,
  GameRecord,
  LearnerProfileData,
} from '../services/GameProgressService';
import { useAnalytics } from '../hooks/useGameProgress';
import { getLetterGrade, getMasteryLabel } from '../hooks/useGameProgress';
import {
  getActivePaths, getAllPaths, getPathStats, getPathReviewDue,
  syncPathWithProgress, type LearnerPath, type PathStats,
} from '../services/LearningPathService';

// ============================================================
// HELPERS
// ============================================================

function slugToName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimeAgo(timestampMs: number): string {
  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestampMs).toLocaleDateString();
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 90) return '#22c55e';
  if (mastery >= 70) return '#3B82F6';
  if (mastery >= 40) return '#eab308';
  return '#ef4444';
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#22c55e';
    case 'B': return '#3B82F6';
    case 'C': return '#eab308';
    case 'D': return '#F59E0B';
    default: return '#ef4444';
  }
}

function getActivityColor(record: GameRecord): string {
  if (record.passed) return '#22c55e';
  if (record.completedAt !== null) return '#eab308';
  return '#6b7280';
}

function capitalizeDifficulty(diff: string): string {
  return diff.charAt(0).toUpperCase() + diff.slice(1);
}

function formatReviewDate(ts: number | null): string {
  if (!ts) return '';
  const now = Date.now();
  const diff = ts - now;
  if (diff <= 0) return 'Due now';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

// ============================================================
// STYLES
// ============================================================

const colors = {
  bg: '#0a0a0f',
  card: '#1a1a24',
  cardBorder: '#2a2a3a',
  accent: '#3B82F6',
  textPrimary: '#f0f0f5',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.textPrimary,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px 16px',
  },
  inner: {
    maxWidth: 1080,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    color: colors.textPrimary,
  },
  backLink: {
    color: colors.accent,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    background: 'none',
    border: `1px solid ${colors.accent}`,
    borderRadius: 8,
    padding: '8px 16px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: '20px 24px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.accent,
    margin: 0,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 16,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: 24,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#2a2a3a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: `1px solid ${colors.cardBorder}`,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  continueBtn: {
    display: 'block',
    width: '100%',
    maxWidth: 360,
    margin: '40px auto 24px',
    padding: '14px 32px',
    backgroundColor: colors.accent,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    backgroundColor: colors.bg,
    color: colors.textSecondary,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: 40,
    height: 40,
    border: `4px solid ${colors.cardBorder}`,
    borderTopColor: colors.accent,
    borderRadius: '50%',
    animation: 'atlas-spin 0.8s linear infinite',
    marginBottom: 16,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 8,
  },
};

// ============================================================
// SPINNER KEYFRAMES (injected once)
// ============================================================

let spinnerInjected = false;

function injectSpinnerKeyframes(): void {
  if (spinnerInjected || typeof document === 'undefined') return;
  spinnerInjected = true;
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes atlas-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

// ============================================================
// COMPONENT
// ============================================================

function ProgressDashboard(): React.ReactElement {
  const { summary, allProgress, refresh } = useAnalytics();
  const [profile, setProfile] = useState<LearnerProfileData | null>(null);
  const [activePaths, setActivePaths] = useState<LearnerPath[]>([]);
  const [reviewDueGames, setReviewDueGames] = useState<string[]>([]);

  useEffect(() => {
    injectSpinnerKeyframes();
    try {
      const p = getLearnerProfile();
      setProfile(p);
    } catch {
      // profile unavailable
    }

    // Load active paths and sync progress
    try {
      const paths = getAllPaths();
      for (const path of paths) {
        syncPathWithProgress(path.id);
      }
      setActivePaths(getActivePaths());

      // Collect review-due games across all paths
      const dueSet = new Set<string>();
      for (const path of paths) {
        const due = getPathReviewDue(path.id);
        due.forEach(g => dueSet.add(g.slug));
      }
      // Also check individual game records for SM-2 review dates
      const allRecords = getAllGameProgress();
      const now = Date.now();
      for (const record of allRecords) {
        if (record.nextReviewDate && record.nextReviewDate <= now && record.passed) {
          dueSet.add(record.slug);
        }
      }
      setReviewDueGames(Array.from(dueSet));
    } catch {
      // Path service unavailable
    }
  }, []);

  const navigateToGames = useCallback(() => {
    window.location.href = '/games';
  }, []);

  // Mastery heatmap data from all played games
  const heatmapData = useMemo(() => {
    return allProgress
      .filter(r => r.masteryLevel > 0)
      .sort((a, b) => b.masteryLevel - a.masteryLevel);
  }, [allProgress]);

  // Count concepts mastered (games with mastery >= 70)
  const conceptsMastered = useMemo(() => {
    return allProgress.filter(r => r.masteryLevel >= 70).length;
  }, [allProgress]);

  // Most recent active path for "Continue Path" button
  const mostRecentPath = useMemo(() => {
    if (activePaths.length === 0) return null;
    return activePaths[0];
  }, [activePaths]);

  // Loading state
  if (summary === null) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading your progress...</p>
      </div>
    );
  }

  // Empty state - no games played yet
  if (summary.totalGamesPlayed === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <div style={styles.header}>
            <h1 style={styles.title}>Your Learning Progress</h1>
            <button style={styles.backLink} onClick={navigateToGames}>
              Back to Games
            </button>
          </div>
          <div style={{ ...styles.card, ...styles.emptyState }}>
            <p style={styles.emptyTitle}>No progress yet</p>
            <p>Start playing games to track your learning journey.</p>
            <button style={{ ...styles.continueBtn, marginTop: 24 }} onClick={navigateToGames}>
              Start Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categoryEntries = Object.entries(summary.categoryBreakdown);
  const difficultyEntries = Object.entries(summary.difficultyBreakdown);
  const recentGames = summary.recentActivity.slice(0, 10);

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Your Learning Progress</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.backLink} onClick={navigateToGames}>
              Back to Games
            </button>
          </div>
        </div>

        {/* Stats Overview Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{summary.totalGamesPlayed}</p>
            <p style={styles.statLabel}>Games Played</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{summary.totalGamesCompleted}</p>
            <p style={styles.statLabel}>Completed</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{Math.round(summary.averageScore)}%</p>
            <p style={styles.statLabel}>Average Score</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>
              {summary.streakDays > 0 ? summary.streakDays : '0'}
            </p>
            <p style={styles.statLabel}>Streak Days</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{conceptsMastered}</p>
            <p style={styles.statLabel}>Concepts Mastered</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{formatDuration(summary.totalTimeSpentMs)}</p>
            <p style={styles.statLabel}>Total Time</p>
          </div>
        </div>

        {/* Continue Path CTA */}
        {mostRecentPath && (
          <div style={{ marginBottom: 32 }}>
            <a
              href="/paths"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                backgroundColor: `${colors.accent}15`,
                border: `1px solid ${colors.accent}40`,
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                backgroundColor: `${colors.accent}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                {'\u25B6'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>Continue: {mostRecentPath.title}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {getPathStats(mostRecentPath).completedGames}/{getPathStats(mostRecentPath).totalGames} games completed
                </div>
              </div>
              <span style={{ fontSize: 24, color: colors.accent }}>{'\u2192'}</span>
            </a>
          </div>
        )}

        {/* Active Learning Paths */}
        {activePaths.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Active Learning Paths</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activePaths.map(path => {
                const stats = getPathStats(path);
                return (
                  <a
                    key={path.id}
                    href="/paths"
                    style={{
                      ...styles.card,
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>{path.title}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                        backgroundColor: path.difficulty === 'beginner' ? '#10B98120' : path.difficulty === 'intermediate' ? '#F59E0B20' : '#EF444420',
                        color: path.difficulty === 'beginner' ? '#10B981' : path.difficulty === 'intermediate' ? '#F59E0B' : '#EF4444',
                        textTransform: 'uppercase' as const,
                      }}>
                        {path.difficulty}
                      </span>
                    </div>
                    <div style={styles.progressBarTrack}>
                      <div style={{
                        height: '100%',
                        width: `${stats.progressPercent}%`,
                        backgroundColor: colors.accent,
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
                      <span>{stats.completedGames}/{stats.totalGames} games</span>
                      <span>Avg: {Math.round(stats.averageScore)}%</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Review Due (SM-2 Spaced Repetition) */}
        {reviewDueGames.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Review Due ({reviewDueGames.length})</h2>
            <div style={styles.card}>
              <p style={{ fontSize: 13, color: colors.textSecondary, margin: '0 0 12px' }}>
                These games are due for review based on spaced repetition scheduling.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {reviewDueGames.slice(0, 12).map(slug => {
                  const record = allProgress.find(r => r.slug === slug);
                  return (
                    <a
                      key={slug}
                      href={`/games/${slug}`}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        backgroundColor: '#F59E0B15',
                        color: '#F59E0B',
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: 'none',
                        border: '1px solid #F59E0B30',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <span>{slugToName(slug)}</span>
                      {record && (
                        <span style={{ fontSize: 10, opacity: 0.7 }}>
                          {record.letterGrade ? `Grade: ${record.letterGrade}` : ''} {formatReviewDate(record.nextReviewDate)}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Mastery Heatmap */}
        {heatmapData.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Mastery Heatmap</h2>
            <div style={styles.card}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {heatmapData.map(record => {
                  const color = getMasteryColor(record.masteryLevel);
                  const grade = record.letterGrade || getLetterGrade(record.masteryLevel);
                  const label = record.masteryLabel || getMasteryLabel(record.masteryLevel);
                  return (
                    <a
                      key={record.slug}
                      href={`/games/${record.slug}`}
                      title={`${slugToName(record.slug)}: ${record.masteryLevel}% (${label}, Grade ${grade})`}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        backgroundColor: `${color}30`,
                        border: `1px solid ${color}50`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: color,
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {grade}
                    </a>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: colors.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#ef444430', border: '1px solid #ef444450' }} />
                  Novice (0-30)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#eab30830', border: '1px solid #eab30850' }} />
                  Developing (31-60)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#3B82F630', border: '1px solid #3B82F650' }} />
                  Proficient (61-80)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#22c55e30', border: '1px solid #22c55e50' }} />
                  Expert/Master (81+)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Category Mastery */}
        {categoryEntries.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Category Mastery</h2>
            <div style={styles.card}>
              {categoryEntries.map(([category, data], idx) => {
                const masteryPercent = Math.min(100, Math.round(data.avgMastery));
                const barColor = getMasteryColor(data.avgMastery);
                const isLast = idx === categoryEntries.length - 1;

                return (
                  <div
                    key={category}
                    style={{
                      marginBottom: isLast ? 0 : 20,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: colors.textPrimary, textTransform: 'capitalize' }}>{category}</span>
                      <span style={{ fontSize: 12, color: colors.textSecondary }}>
                        {data.played} played, {data.completed} completed
                      </span>
                    </div>
                    <div style={styles.progressBarTrack}>
                      <div
                        style={{
                          height: '100%',
                          width: `${masteryPercent}%`,
                          backgroundColor: barColor,
                          borderRadius: 4,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two-column layout: Recent Activity + Review Schedule */}
        <div style={styles.twoCol}>
          {/* Recent Activity */}
          <div>
            <h2 style={styles.sectionTitle}>Recent Activity</h2>
            <div style={styles.card}>
              {recentGames.length === 0 ? (
                <p style={{ color: colors.textSecondary, textAlign: 'center', margin: 0 }}>
                  No recent activity
                </p>
              ) : (
                recentGames.map((record, idx) => {
                  const dotColor = getActivityColor(record);
                  const isLast = idx === recentGames.length - 1;
                  const grade = record.letterGrade || (record.masteryLevel > 0 ? getLetterGrade(record.masteryLevel) : '');
                  const label = record.masteryLabel || (record.masteryLevel > 0 ? getMasteryLabel(record.masteryLevel) : '');
                  const scoreText =
                    record.testScore !== null && record.testTotal !== null && record.testTotal > 0
                      ? `${Math.round((record.testScore / record.testTotal) * 100)}%`
                      : null;
                  const isDueForReview = reviewDueGames.includes(record.slug);

                  return (
                    <div
                      key={`${record.slug}-${idx}`}
                      style={{
                        ...styles.activityItem,
                        borderBottom: isLast ? 'none' : styles.activityItem.borderBottom,
                      }}
                    >
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: dotColor,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 500, color: colors.textPrimary,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {slugToName(record.slug)}
                          {grade && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                              backgroundColor: `${getGradeColor(grade)}20`,
                              color: getGradeColor(grade),
                            }}>
                              {grade}
                            </span>
                          )}
                          {isDueForReview && (
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                              backgroundColor: '#F59E0B20', color: '#F59E0B',
                            }}>
                              REVIEW
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          {record.passed ? 'Passed' : record.completedAt ? 'Attempted' : 'Started'}
                          {scoreText && ` \u00B7 ${scoreText}`}
                          {label && ` \u00B7 ${label}`}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: colors.textMuted, flexShrink: 0 }}>
                        {formatTimeAgo(record.lastPlayedAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right column: Review Schedule + Difficulty Distribution */}
          <div>
            {/* Upcoming Reviews */}
            <h2 style={styles.sectionTitle}>Review Schedule</h2>
            <div style={{ ...styles.card, marginBottom: 16 }}>
              {(() => {
                const upcoming = allProgress
                  .filter(r => r.nextReviewDate && r.nextReviewDate > Date.now() && r.passed)
                  .sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0))
                  .slice(0, 5);

                if (upcoming.length === 0) {
                  return <p style={{ color: colors.textMuted, textAlign: 'center', margin: 0, fontSize: 13 }}>No upcoming reviews scheduled</p>;
                }

                return upcoming.map((record, idx) => (
                  <div key={record.slug} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: idx === upcoming.length - 1 ? 'none' : `1px solid ${colors.cardBorder}`,
                  }}>
                    <span style={{ fontSize: 13, color: colors.textPrimary }}>{slugToName(record.slug)}</span>
                    <span style={{ fontSize: 12, color: '#F59E0B' }}>{formatReviewDate(record.nextReviewDate)}</span>
                  </div>
                ));
              })()}
            </div>

            {/* Difficulty Distribution */}
            {difficultyEntries.length > 0 && (
              <>
                <h2 style={styles.sectionTitle}>Difficulty Distribution</h2>
                <div style={styles.card}>
                  {difficultyEntries.map(([difficulty, data], idx) => {
                    const isLast = idx === difficultyEntries.length - 1;
                    return (
                      <div
                        key={difficulty}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: isLast ? 'none' : `1px solid ${colors.cardBorder}`,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                          {capitalizeDifficulty(difficulty)}
                        </span>
                        <span style={{ fontSize: 13, color: colors.textSecondary }}>
                          {data.played} played, {data.completed} completed
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', margin: '40px auto 24px' }}>
          {activePaths.length > 0 ? (
            <a
              href="/paths"
              style={{
                ...styles.continueBtn,
                margin: 0,
                display: 'inline-block',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Continue Path
            </a>
          ) : (
            <a
              href="/paths"
              style={{
                ...styles.continueBtn,
                margin: 0,
                display: 'inline-block',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Start a Learning Path
            </a>
          )}
          <button
            style={{
              ...styles.continueBtn,
              margin: 0,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.accent}`,
              color: colors.accent,
            }}
            onClick={navigateToGames}
          >
            Browse All Games
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProgressDashboard;
