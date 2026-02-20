import React, { useState, useEffect, useCallback } from 'react';
import {
  getAnalyticsSummary,
  getAllGameProgress,
  getLearnerProfile,
  AnalyticsSummary,
  GameRecord,
  LearnerProfileData,
} from '../services/GameProgressService';
import { useAnalytics } from '../hooks/useGameProgress';

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
  if (mastery > 70) return '#22c55e';
  if (mastery > 40) return '#eab308';
  return '#ef4444';
}

function getActivityColor(record: GameRecord): string {
  if (record.passed) return '#22c55e';
  if (record.completedAt !== null) return '#eab308';
  return '#6b7280';
}

function capitalizeDifficulty(diff: string): string {
  return diff.charAt(0).toUpperCase() + diff.slice(1);
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    fontSize: 36,
    fontWeight: 700,
    color: colors.accent,
    margin: 0,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 13,
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
  categoryRow: {
    marginBottom: 20,
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: 500,
    color: colors.textPrimary,
    textTransform: 'capitalize' as const,
  },
  categoryStats: {
    fontSize: 12,
    color: colors.textSecondary,
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
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activityMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 0,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  diffRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.cardBorder}`,
  },
  diffName: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
  },
  diffStats: {
    fontSize: 13,
    color: colors.textSecondary,
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
  timeValue: {
    fontSize: 40,
    fontWeight: 700,
    color: colors.accent,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
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

  useEffect(() => {
    injectSpinnerKeyframes();
    try {
      const p = getLearnerProfile();
      setProfile(p);
    } catch {
      // profile unavailable
    }
  }, []);

  const navigateToGames = useCallback(() => {
    window.location.href = '/games';
  }, []);

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
          <button style={styles.backLink} onClick={navigateToGames}>
            Back to Games
          </button>
        </div>

        {/* Stats Overview Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{summary.totalGamesPlayed}</p>
            <p style={styles.statLabel}>Games Played</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{summary.totalGamesCompleted}</p>
            <p style={styles.statLabel}>Games Completed</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{Math.round(summary.averageScore)}%</p>
            <p style={styles.statLabel}>Average Score</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>
              {summary.streakDays > 0 ? `${summary.streakDays} \uD83D\uDD25` : '0'}
            </p>
            <p style={styles.statLabel}>Streak Days</p>
          </div>
        </div>

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
                      ...styles.categoryRow,
                      marginBottom: isLast ? 0 : 20,
                    }}
                  >
                    <div style={styles.categoryHeader}>
                      <span style={styles.categoryName}>{category}</span>
                      <span style={styles.categoryStats}>
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

        {/* Two-column layout: Recent Activity + Time & Difficulty */}
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
                  const scoreText =
                    record.testScore !== null && record.testTotal !== null && record.testTotal > 0
                      ? `${Math.round((record.testScore / record.testTotal) * 100)}%`
                      : null;

                  return (
                    <div
                      key={`${record.slug}-${idx}`}
                      style={{
                        ...styles.activityItem,
                        borderBottom: isLast ? 'none' : styles.activityItem.borderBottom,
                      }}
                    >
                      <div style={{ ...styles.activityDot, backgroundColor: dotColor }} />
                      <div style={styles.activityInfo}>
                        <div style={styles.activityName}>{slugToName(record.slug)}</div>
                        <div style={styles.activityMeta}>
                          {record.passed
                            ? 'Passed'
                            : record.completedAt
                              ? 'Attempted'
                              : 'Started'}
                          {scoreText && ` \u00B7 ${scoreText}`}
                        </div>
                      </div>
                      <span style={styles.activityTime}>
                        {formatTimeAgo(record.lastPlayedAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right column: Time Spent + Difficulty Distribution */}
          <div>
            {/* Time Spent */}
            <h2 style={styles.sectionTitle}>Time Spent</h2>
            <div style={{ ...styles.card, marginBottom: 16 }}>
              <p style={styles.timeValue}>{formatDuration(summary.totalTimeSpentMs)}</p>
              <p style={styles.timeLabel}>Total Learning Time</p>
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
                          ...styles.diffRow,
                          borderBottom: isLast ? 'none' : styles.diffRow.borderBottom,
                        }}
                      >
                        <span style={styles.diffName}>
                          {capitalizeDifficulty(difficulty)}
                        </span>
                        <span style={styles.diffStats}>
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

        {/* Continue Learning Button */}
        <button
          style={styles.continueBtn}
          onClick={navigateToGames}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.accent;
          }}
        >
          Continue Learning
        </button>
      </div>
    </div>
  );
}

export default ProgressDashboard;
