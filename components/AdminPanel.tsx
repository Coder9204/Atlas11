'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getFunnelMetrics,
  getPerGameAnalytics,
  getPhaseDropOffAnalysis,
  getScoreDistribution,
  getCustomRequestsAnalytics,
  getPageViewAnalytics,
  getUserCohorts,
  getAllEvents,
  dateRangeFromPreset,
  type FunnelMetrics,
  type GameAnalytics,
  type PhaseDropOff,
  type DateRange,
  type DatePreset,
} from '../services/AnalyticsService';
import {
  getAllGameProgress,
  getAnalyticsSummary,
  type GameRecord,
} from '../services/GameProgressService';
import {
  getAllPaths,
  getPathStats,
  type LearnerPath,
} from '../services/LearningPathService';
import {
  getFirestoreUserStats,
  getFirestoreTestStats,
  getConversionMetrics,
  type FirestoreUserStats,
  type FirestoreTestStats,
  type ConversionMetrics,
} from '../services/AdminAnalyticsService';

// ============================================================================
// ADMIN PANEL — Analytics dashboard for Atlas Coach
// Route: /admin | Password-gated (localStorage auth)
// ============================================================================

const theme = {
  bg: '#0a0a0f',
  bgCard: '#141420',
  border: '#2a2a3a',
  accent: '#3B82F6',
  textPrimary: '#f0f0f5',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#22c55e',
  warning: '#F59E0B',
  error: '#EF4444',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const ADMIN_AUTH_KEY = 'atlas_admin_auth';
const ADMIN_PASSWORD = 'atlas2024admin';

type AdminTab = 'overview' | 'funnel' | 'games' | 'paths' | 'dropoff' | 'scores' | 'requests' | 'cohorts' | 'conversion';

// ============================================================================
// HELPERS
// ============================================================================

function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function slugToName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ============================================================================
// CSV EXPORT (Improvement 8)
// ============================================================================

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 4, border: `1px solid ${theme.border}`,
        background: 'transparent', color: theme.textSecondary, fontSize: 12, cursor: 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      Export CSV
    </button>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div style={{
      backgroundColor: theme.bgCard,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: '20px 24px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 32, fontWeight: 700, color: theme.accent, margin: 0, lineHeight: 1.2 }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      {subtext && (
        <p style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{subtext}</p>
      )}
    </div>
  );
}

function BarChart({ data, maxVal }: { data: Array<{ label: string; value: number; color?: string }>; maxVal?: number }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: theme.textSecondary, width: 120, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
          <div style={{ flex: 1, height: 20, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(1, (d.value / max) * 100)}%`,
              backgroundColor: d.color || theme.accent,
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, color: theme.textPrimary, width: 50, flexShrink: 0 }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function FunnelStep({ label, count, rate, prevCount }: { label: string; count: number; rate?: number; prevCount?: number }) {
  const dropOff = prevCount !== undefined && prevCount > 0 ? prevCount - count : 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px',
      backgroundColor: theme.bgCard,
      border: `1px solid ${theme.border}`,
      borderRadius: 8,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>{label}</div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
          {rate !== undefined ? `${formatPercent(rate)} conversion` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{count}</div>
        {dropOff > 0 && (
          <div style={{ fontSize: 11, color: theme.error }}>-{dropOff} drop-off</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytics[]>([]);
  const [phaseDropOff, setPhaseDropOff] = useState<PhaseDropOff[]>([]);
  const [allRecords, setAllRecords] = useState<GameRecord[]>([]);
  const [paths, setPaths] = useState<LearnerPath[]>([]);
  const [gameSort, setGameSort] = useState<'plays' | 'completion' | 'score'>('plays');

  // Date range filter (Improvement 4)
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  // Firestore state (Improvement 2)
  const [firestoreUsers, setFirestoreUsers] = useState<FirestoreUserStats | null>(null);
  const [firestoreTests, setFirestoreTests] = useState<FirestoreTestStats | null>(null);
  const [conversionData, setConversionData] = useState<ConversionMetrics | null>(null);

  // Check existing auth
  useEffect(() => {
    try {
      if (localStorage.getItem(ADMIN_AUTH_KEY) === 'true') {
        setAuthenticated(true);
      }
    } catch {}
  }, []);

  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // Load/refresh data when authenticated or date range changes
  const refreshData = useCallback(() => {
    const range = dateRangeFromPreset(datePreset);
    setFunnel(getFunnelMetrics(range));
    setGameAnalytics(getPerGameAnalytics(range));
    setPhaseDropOff(getPhaseDropOffAnalysis(range));
    setAllRecords(getAllGameProgress());
    setPaths(getAllPaths());
    setLastRefresh(Date.now());

    // Fetch Firestore data asynchronously
    getFirestoreUserStats().then(setFirestoreUsers).catch(() => {});
    getFirestoreTestStats().then(setFirestoreTests).catch(() => {});
    getConversionMetrics().then(setConversionData).catch(() => {});
  }, [datePreset]);

  useEffect(() => {
    if (!authenticated) return;
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [authenticated, refreshData]);

  const handleLogin = useCallback(() => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  }, [password]);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    localStorage.removeItem(ADMIN_AUTH_KEY);
  }, []);

  // Computed metrics with date range
  const dateRange = useMemo(() => dateRangeFromPreset(datePreset), [datePreset]);
  const scoreDist = useMemo(() => getScoreDistribution(dateRange), [lastRefresh, dateRange]);
  const customRequests = useMemo(() => getCustomRequestsAnalytics(dateRange), [lastRefresh, dateRange]);
  const pageViews = useMemo(() => getPageViewAnalytics(dateRange), [lastRefresh, dateRange]);
  const cohorts = useMemo(() => getUserCohorts(dateRange), [lastRefresh, dateRange]);

  const summary = useMemo(() => {
    if (!authenticated) return null;
    return getAnalyticsSummary();
  }, [authenticated, lastRefresh]);

  const sortedGames = useMemo(() => {
    const copy = [...gameAnalytics];
    switch (gameSort) {
      case 'completion': return copy.sort((a, b) => b.completionRate - a.completionRate);
      case 'score': return copy.sort((a, b) => b.avgScore - a.avgScore);
      default: return copy.sort((a, b) => b.timesPlayed - a.timesPlayed);
    }
  }, [gameAnalytics, gameSort]);

  const scoreHistogram = useMemo(() => {
    const scores = scoreDist['all'] || [];
    const buckets = [
      { label: '0-20%', min: 0, max: 20, count: 0 },
      { label: '21-40%', min: 21, max: 40, count: 0 },
      { label: '41-60%', min: 41, max: 60, count: 0 },
      { label: '61-80%', min: 61, max: 80, count: 0 },
      { label: '81-100%', min: 81, max: 100, count: 0 },
    ];
    for (const s of scores) {
      const bucket = buckets.find(b => s >= b.min && s <= b.max);
      if (bucket) bucket.count++;
    }
    return buckets;
  }, [scoreDist]);

  const pathAnalytics = useMemo(() => {
    return paths.map(p => {
      const stats = getPathStats(p);
      return { path: p, stats };
    });
  }, [paths]);

  // CSV export handlers
  const exportFunnel = useCallback(() => {
    if (!funnel) return;
    const ts = datePreset;
    downloadCSV(`funnel_${ts}_${Date.now()}.csv`,
      ['Step', 'Count', 'Rate'],
      [
        ['Unique Sessions', funnel.uniqueSessions, ''],
        ['Onboarding Started', funnel.onboardingStarted, ''],
        ['Onboarding Completed', funnel.onboardingCompleted, formatPercent(funnel.onboardingCompletionRate)],
        ['First Game Played', funnel.firstGamePlayed, formatPercent(funnel.firstGameConversionRate)],
        ['Games Completed', funnel.gamesCompleted, formatPercent(funnel.gameCompletionRate)],
        ['Paths Enrolled', funnel.pathsEnrolled, ''],
        ['Paths Completed', funnel.pathsCompleted, formatPercent(funnel.pathCompletionRate)],
      ]);
  }, [funnel, datePreset]);

  const exportGames = useCallback(() => {
    downloadCSV(`games_${datePreset}_${Date.now()}.csv`,
      ['Game', 'Plays', 'Completion Rate', 'Avg Score', 'Avg Time (ms)', 'Drop-off Phase'],
      sortedGames.map(g => [slugToName(g.slug), g.timesPlayed, formatPercent(g.completionRate), Math.round(g.avgScore), Math.round(g.avgTimeMs), g.mostCommonDropOffPhase]));
  }, [sortedGames, datePreset]);

  const exportDropoff = useCallback(() => {
    downloadCSV(`dropoff_${datePreset}_${Date.now()}.csv`,
      ['Phase', 'Entered', 'Proceeded', 'Drop-off Rate'],
      phaseDropOff.map(p => [p.phase, p.entered, p.completed, formatPercent(p.dropOffRate)]));
  }, [phaseDropOff, datePreset]);

  const exportScores = useCallback(() => {
    downloadCSV(`scores_${datePreset}_${Date.now()}.csv`,
      ['Bucket', 'Count'],
      scoreHistogram.map(b => [b.label, b.count]));
  }, [scoreHistogram, datePreset]);

  const exportRequests = useCallback(() => {
    downloadCSV(`requests_${datePreset}_${Date.now()}.csv`,
      ['Topic', 'Count', 'Validation', 'Last Requested'],
      customRequests.map(r => [r.topic, r.count, r.validationResult, new Date(r.lastRequested).toISOString()]));
  }, [customRequests, datePreset]);

  // ─── AUTH SCREEN ────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: theme.font,
      }}>
        <div style={{
          backgroundColor: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 40,
          width: 360,
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, margin: '0 0 8px' }}>Admin Panel</h1>
          <p style={{ fontSize: 14, color: theme.textSecondary, margin: '0 0 24px' }}>Enter admin password to continue</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setAuthError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: `1px solid ${authError ? theme.error : theme.border}`,
              backgroundColor: theme.bg,
              color: theme.textPrimary,
              fontSize: 16,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />
          {authError && (
            <p style={{ fontSize: 13, color: theme.error, margin: '0 0 12px' }}>Incorrect password</p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: theme.accent,
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sign In
          </button>
          <a href="/" style={{ display: 'block', marginTop: 16, fontSize: 13, color: theme.textMuted, textDecoration: 'none' }}>
            Back to Atlas Coach
          </a>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ──────────────────────────────────────────────────────────

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'funnel', label: 'Funnel' },
    { id: 'games', label: 'Games' },
    { id: 'paths', label: 'Paths' },
    { id: 'dropoff', label: 'Drop-off' },
    { id: 'scores', label: 'Scores' },
    { id: 'requests', label: 'Requests' },
    { id: 'cohorts', label: 'Cohorts' },
    { id: 'conversion', label: 'Revenue' },
  ];

  const datePresets: { id: DatePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      fontFamily: theme.font,
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        background: `${theme.bg}ee`,
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: 14 }}>Atlas Coach</a>
          <span style={{ color: theme.border }}>/</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh > 0 && (
            <span style={{ fontSize: 11, color: theme.textMuted }}>
              Updated {formatTimeAgo(lastRefresh)}
            </span>
          )}
          <button
            onClick={refreshData}
            style={{
              padding: '6px 16px', borderRadius: 6, border: `1px solid ${theme.border}`,
              background: 'transparent', color: theme.accent, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 16px', borderRadius: 6, border: `1px solid ${theme.border}`,
              background: 'transparent', color: theme.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '12px 24px',
        borderBottom: `1px solid ${theme.border}`,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: activeTab === tab.id ? theme.accent : 'transparent',
              color: activeTab === tab.id ? 'white' : theme.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Filter (Improvement 4) */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '8px 24px',
        borderBottom: `1px solid ${theme.border}`,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: theme.textMuted, marginRight: 8 }}>Period:</span>
        {datePresets.map(dp => (
          <button
            key={dp.id}
            onClick={() => setDatePreset(dp.id)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: datePreset === dp.id ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
              backgroundColor: datePreset === dp.id ? `${theme.accent}20` : 'transparent',
              color: datePreset === dp.id ? theme.accent : theme.textMuted,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {dp.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>Overview</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 32,
            }}>
              <StatCard label="Unique Sessions" value={funnel?.uniqueSessions || 0} />
              <StatCard label="Games Played" value={summary?.totalGamesPlayed || 0} />
              <StatCard label="Paths Enrolled" value={funnel?.pathsEnrolled || 0} />
              <StatCard label="Avg Session" value={formatDuration(funnel?.averageSessionDurationMs || 0)} />
              <StatCard label="Return Rate" value={formatPercent(funnel?.returnRate || 0)} />
            </div>

            {/* Firestore stats (Improvement 2) */}
            {firestoreUsers && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Platform Users (Firestore)</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                  marginBottom: 32,
                }}>
                  <StatCard label="Total Users" value={firestoreUsers.totalUsers} />
                  <StatCard label="DAU" value={firestoreUsers.dau} />
                  <StatCard label="MAU" value={firestoreUsers.mau} />
                  <StatCard label="Authenticated" value={firestoreUsers.authenticatedUsers} />
                  <StatCard label="Active Subscribers" value={
                    Object.entries(firestoreUsers.subscribersByTier)
                      .filter(([k]) => k !== 'free')
                      .reduce((sum, [, v]) => sum + v, 0)
                  } />
                </div>
              </>
            )}

            {/* Quick stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}>
              <div style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Games</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: theme.textMuted }}>Completed</span>
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{summary?.totalGamesCompleted || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: theme.textMuted }}>Passed</span>
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{summary?.totalGamesPassed || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: theme.textMuted }}>Avg Score</span>
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{Math.round(summary?.averageScore || 0)}%</span>
                </div>
              </div>

              <div style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Engagement</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: theme.textMuted }}>Total Time</span>
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{formatDuration(summary?.totalTimeSpentMs || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: theme.textMuted }}>Streak</span>
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{summary?.streakDays || 0} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: theme.textMuted }}>Onboarding %</span>
                  <span style={{ fontSize: 13, color: theme.textPrimary }}>{formatPercent(funnel?.onboardingCompletionRate || 0)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── CONVERSION FUNNEL ────────────────────────────────────── */}
        {activeTab === 'funnel' && funnel && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Conversion Funnel</h2>
              <ExportButton onClick={exportFunnel} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
              <FunnelStep label="Landing (Unique Sessions)" count={funnel.uniqueSessions} />
              <FunnelStep label="Onboarding Started" count={funnel.onboardingStarted} prevCount={funnel.uniqueSessions} rate={funnel.uniqueSessions > 0 ? funnel.onboardingStarted / funnel.uniqueSessions : 0} />
              <FunnelStep label="Onboarding Completed" count={funnel.onboardingCompleted} prevCount={funnel.onboardingStarted} rate={funnel.onboardingCompletionRate} />
              <FunnelStep label="First Game Played" count={funnel.firstGamePlayed} prevCount={funnel.onboardingCompleted} rate={funnel.firstGameConversionRate} />
              <FunnelStep label="Games Completed" count={funnel.gamesCompleted} prevCount={funnel.gamesStarted} rate={funnel.gameCompletionRate} />
              <FunnelStep label="Paths Enrolled" count={funnel.pathsEnrolled} prevCount={funnel.gamesCompleted} />
              <FunnelStep label="Paths Completed" count={funnel.pathsCompleted} prevCount={funnel.pathsEnrolled} rate={funnel.pathCompletionRate} />
            </div>
          </>
        )}

        {/* ─── GAME ANALYTICS ───────────────────────────────────────── */}
        {activeTab === 'games' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Game Analytics ({sortedGames.length} games)</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <ExportButton onClick={exportGames} />
                {(['plays', 'completion', 'score'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setGameSort(s)}
                    style={{
                      padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      backgroundColor: gameSort === s ? theme.accent : theme.border,
                      color: gameSort === s ? 'white' : theme.textSecondary,
                    }}
                  >
                    {s === 'plays' ? 'By Plays' : s === 'completion' ? 'By Completion' : 'By Score'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                    {['Game', 'Plays', 'Completion', 'Avg Score', 'Avg Time', 'Drop-off Phase'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedGames.slice(0, 50).map(g => (
                    <tr key={g.slug} style={{ borderBottom: `1px solid ${theme.border}20` }}>
                      <td style={{ padding: '10px 12px', color: theme.textPrimary, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {slugToName(g.slug)}
                      </td>
                      <td style={{ padding: '10px 12px', color: theme.textPrimary }}>{g.timesPlayed}</td>
                      <td style={{ padding: '10px 12px', color: g.completionRate >= 0.7 ? theme.success : g.completionRate >= 0.4 ? theme.warning : theme.error }}>
                        {formatPercent(g.completionRate)}
                      </td>
                      <td style={{ padding: '10px 12px', color: theme.textPrimary }}>{Math.round(g.avgScore)}%</td>
                      <td style={{ padding: '10px 12px', color: theme.textMuted }}>{formatDuration(g.avgTimeMs)}</td>
                      <td style={{ padding: '10px 12px', color: theme.textMuted }}>{g.mostCommonDropOffPhase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ─── PATH ANALYTICS ───────────────────────────────────────── */}
        {activeTab === 'paths' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>Path Analytics ({pathAnalytics.length} paths)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pathAnalytics.map(({ path, stats }) => (
                <div key={path.id} style={{
                  backgroundColor: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: theme.textPrimary }}>{path.title}</h3>
                      <span style={{ fontSize: 12, color: theme.textMuted }}>{path.difficulty} | {path.templateId || 'Custom'}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, backgroundColor: `${theme.accent}20`, color: theme.accent }}>
                      {Math.round(stats.progressPercent)}% complete
                    </span>
                  </div>
                  <div style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${stats.progressPercent}%`, backgroundColor: theme.accent, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 12, color: theme.textSecondary }}>
                    <span>{stats.completedGames}/{stats.totalGames} games</span>
                    <span>Mastered: {stats.masteredGames}</span>
                    <span>Avg Score: {Math.round(stats.averageScore)}%</span>
                    <span>Est. remaining: {stats.estimatedMinutesRemaining}m</span>
                  </div>
                </div>
              ))}
              {pathAnalytics.length === 0 && (
                <p style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>No paths enrolled yet</p>
              )}
            </div>
          </>
        )}

        {/* ─── DROP-OFF ANALYSIS ─────────────────────────────────────── */}
        {activeTab === 'dropoff' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Drop-off Analysis</h2>
              <ExportButton onClick={exportDropoff} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Sequential Phase Drop-off</h3>
            {phaseDropOff.length > 0 ? (
              <div style={{ marginBottom: 32 }}>
                <BarChart
                  data={phaseDropOff.map(p => ({
                    label: p.phase,
                    value: Math.round(p.dropOffRate * 100),
                    color: p.dropOffRate > 0.5 ? theme.error : p.dropOffRate > 0.3 ? theme.warning : theme.success,
                  }))}
                  maxVal={100}
                />
              </div>
            ) : (
              <p style={{ color: theme.textMuted, marginBottom: 32 }}>No phase data recorded yet</p>
            )}

            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Page Views (drop-off indicator)</h3>
            {pageViews.length > 0 ? (
              <BarChart
                data={pageViews.slice(0, 10).map(p => ({
                  label: p.route,
                  value: p.views,
                }))}
              />
            ) : (
              <p style={{ color: theme.textMuted }}>No page view data yet</p>
            )}
          </>
        )}

        {/* ─── SCORE DISTRIBUTION ────────────────────────────────────── */}
        {activeTab === 'scores' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Score Distribution</h2>
              <ExportButton onClick={exportScores} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Test Score Histogram</h3>
            <div style={{ marginBottom: 32 }}>
              <BarChart
                data={scoreHistogram.map(b => ({
                  label: b.label,
                  value: b.count,
                  color: b.min >= 80 ? theme.success : b.min >= 60 ? theme.warning : theme.error,
                }))}
              />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>By Difficulty Level</h3>
            {summary?.difficultyBreakdown && Object.keys(summary.difficultyBreakdown).length > 0 ? (
              <BarChart
                data={Object.entries(summary.difficultyBreakdown).map(([diff, data]) => ({
                  label: diff.charAt(0).toUpperCase() + diff.slice(1),
                  value: Math.round(data.avgScore),
                }))}
                maxVal={100}
              />
            ) : (
              <p style={{ color: theme.textMuted }}>No difficulty data yet</p>
            )}
          </>
        )}

        {/* ─── CUSTOM REQUESTS ───────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Custom Game Requests ({customRequests.length})</h2>
              <ExportButton onClick={exportRequests} />
            </div>
            {customRequests.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      {['Topic', 'Requests', 'Validation', 'Last Requested'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customRequests.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${theme.border}20` }}>
                        <td style={{ padding: '10px 12px', color: theme.textPrimary }}>{r.topic}</td>
                        <td style={{ padding: '10px 12px', color: theme.accent, fontWeight: 600 }}>{r.count}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                            backgroundColor: r.validationResult === 'success' ? `${theme.success}20` : r.validationResult === 'warning' ? `${theme.warning}20` : `${theme.error}20`,
                            color: r.validationResult === 'success' ? theme.success : r.validationResult === 'warning' ? theme.warning : theme.error,
                          }}>
                            {r.validationResult}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: theme.textMuted }}>{formatTimeAgo(r.lastRequested)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>No custom requests submitted yet</p>
            )}
          </>
        )}

        {/* ─── USER COHORTS ──────────────────────────────────────────── */}
        {activeTab === 'cohorts' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>User Cohorts</h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 32,
            }}>
              <StatCard label="Onboarded" value={cohorts.onboarded} />
              <StatCard label="Not Onboarded" value={cohorts.notOnboarded} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>By Difficulty Level</h3>
            {Object.keys(cohorts.byDifficulty).length > 0 ? (
              <div style={{ marginBottom: 32 }}>
                <BarChart
                  data={Object.entries(cohorts.byDifficulty).map(([level, count]) => ({
                    label: level.charAt(0).toUpperCase() + level.slice(1),
                    value: count,
                    color: level === 'beginner' ? theme.success : level === 'intermediate' ? theme.warning : theme.error,
                  }))}
                />
              </div>
            ) : (
              <p style={{ color: theme.textMuted, marginBottom: 32 }}>No onboarding data yet</p>
            )}

            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>By Interest Category</h3>
            {Object.keys(cohorts.byInterest).length > 0 ? (
              <BarChart
                data={Object.entries(cohorts.byInterest)
                  .sort((a, b) => b[1] - a[1])
                  .map(([interest, count]) => ({
                    label: interest,
                    value: count,
                  }))}
              />
            ) : (
              <p style={{ color: theme.textMuted }}>No interest data yet</p>
            )}
          </>
        )}

        {/* ─── REVENUE / CONVERSION (Improvement 5) ──────────────────── */}
        {activeTab === 'conversion' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>Revenue & Conversion</h2>

            {conversionData ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                  marginBottom: 32,
                }}>
                  <StatCard label="MRR" value={formatCurrency(conversionData.mrr)} />
                  <StatCard label="Active Subscribers" value={conversionData.totalActiveSubscribers} />
                  <StatCard label="Trialing" value={conversionData.totalTrialing} />
                  <StatCard label="Canceled" value={conversionData.totalCanceled} />
                  <StatCard label="Trial-to-Paid" value={formatPercent(conversionData.trialToPaidRate)} />
                  <StatCard label="Churn Rate" value={formatPercent(conversionData.churnRate)} />
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Subscribers by Tier</h3>
                <div style={{ marginBottom: 32 }}>
                  <BarChart
                    data={Object.entries(conversionData.subscribersByTier)
                      .filter(([k]) => k !== 'free')
                      .map(([tier, count]) => ({
                        label: tier.charAt(0).toUpperCase() + tier.slice(1),
                        value: count,
                        color: tier === 'plus' ? theme.success : tier === 'pro' ? theme.accent : theme.warning,
                      }))}
                  />
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: theme.textSecondary }}>Conversion Funnel</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 600 }}>
                  <FunnelStep label="Total Users" count={
                    Object.values(conversionData.subscribersByTier).reduce((a, b) => a + b, 0)
                  } />
                  <FunnelStep label="Free Tier" count={conversionData.subscribersByTier['free'] || 0} />
                  <FunnelStep label="Trialing" count={conversionData.totalTrialing} />
                  <FunnelStep label="Paid" count={conversionData.totalActiveSubscribers} rate={conversionData.freeToPaidRate} />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <p style={{ color: theme.textMuted, fontSize: 15 }}>Revenue data requires Firebase connection</p>
                <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 8 }}>Firestore user documents with subscription fields are needed</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
