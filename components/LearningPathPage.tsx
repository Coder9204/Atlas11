'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getLearnerProfile, isOnboardingComplete, type LearnerProfileData } from '../services/GameProgressService';
import {
  getAllPaths, getActivePaths, getPath, createPathFromTemplate,
  deletePath, syncPathWithProgress, adjustDifficulty, removeGameFromPath,
  addGameToPath, getPathStats, type LearnerPath, type PathStats,
} from '../services/LearningPathService';
import PathProgressBar, { PathGameNode } from './PathProgressBar';
import RetentionBanner from './RetentionBanner';

// ============================================================================
// LEARNING PATH PAGE — Browse paths, view active paths, customize
// Route: /paths
// ============================================================================

const theme = {
  bg: '#0a0a0f',
  bgCard: '#1a1a24',
  border: '#2a2a3a',
  accent: '#3B82F6',
  textPrimary: '#f0f0f5',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#22c55e',
  warning: '#F59E0B',
  danger: '#EF4444',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const difficultyColors: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

const categoryIcons: Record<string, string> = {
  mechanics: '\u2699\uFE0F',
  thermodynamics: '\uD83D\uDD25',
  electromagnetism: '\u26A1',
  waves: '\uD83C\uDF0A',
  fluids: '\uD83D\uDCA7',
  modern: '\u269B\uFE0F',
  engineering: '\uD83D\uDD27',
  computing: '\uD83D\uDCBB',
  semiconductor: '\uD83D\uDD2C',
  solar: '\u2600\uFE0F',
  elon: '\uD83D\uDE80',
};

type ViewMode = 'browse' | 'active' | 'detail';

// Slugs to display names
function slugToName(slug: string): string {
  return slug
    .replace(/^e-l-o-n_-/, 'ELON ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ============================================================================
// Lazy-load path templates to avoid bundling the large data file in main chunk
// ============================================================================

interface PathTemplateData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  gameSequence: string[];
  estimatedHours: number;
}

export default function LearningPathPage() {
  const [view, setView] = useState<ViewMode>('browse');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [profile, setProfile] = useState<LearnerProfileData | null>(null);
  const [paths, setPaths] = useState<LearnerPath[]>([]);
  const [templates, setTemplates] = useState<PathTemplateData[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    if (!isOnboardingComplete()) {
      window.location.href = '/onboarding';
      return;
    }

    setProfile(getLearnerProfile());
    setPaths(getAllPaths());

    // Dynamic import for path templates
    import('../src/data/pathTemplates').then(mod => {
      setTemplates(mod.pathTemplates || mod.default || []);
    }).catch(() => {
      // Templates not available yet
    });
  }, []);

  const refreshPaths = useCallback(() => {
    setPaths(getAllPaths());
  }, []);

  const activePaths = useMemo(() => {
    return paths.filter(p =>
      p.games.some(g => g.status !== 'completed' && g.status !== 'mastered')
    );
  }, [paths]);

  const completedPaths = useMemo(() => {
    return paths.filter(p =>
      p.games.length > 0 &&
      p.games.every(g => g.status === 'completed' || g.status === 'mastered')
    );
  }, [paths]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (filterCategory) {
      result = result.filter(t => t.category === filterCategory);
    }
    if (filterDifficulty) {
      result = result.filter(t => t.difficulty === filterDifficulty);
    }
    return result;
  }, [templates, filterCategory, filterDifficulty]);

  // Already-enrolled template IDs
  const enrolledTemplateIds = useMemo(() => {
    return new Set(paths.map(p => p.templateId).filter(Boolean));
  }, [paths]);

  // Enroll in a template
  const handleEnroll = useCallback((template: PathTemplateData) => {
    const path = createPathFromTemplate(
      template.id,
      template.title,
      template.gameSequence,
      template.difficulty
    );
    refreshPaths();
    setSelectedPathId(path.id);
    setView('detail');
  }, [refreshPaths]);

  // Open path detail
  const handleOpenPath = useCallback((pathId: string) => {
    syncPathWithProgress(pathId);
    refreshPaths();
    setSelectedPathId(pathId);
    setView('detail');
  }, [refreshPaths]);

  // Delete a path
  const handleDeletePath = useCallback((pathId: string) => {
    deletePath(pathId);
    refreshPaths();
    setView('browse');
    setSelectedPathId(null);
  }, [refreshPaths]);

  // Navigate to a game
  const handlePlayGame = useCallback((slug: string) => {
    window.location.href = `/games/${slug}`;
  }, []);

  // Adjust difficulty
  const handleAdjustDifficulty = useCallback((pathId: string, newDiff: 'beginner' | 'intermediate' | 'advanced') => {
    adjustDifficulty(pathId, newDiff);
    refreshPaths();
  }, [refreshPaths]);

  // Remove game from path
  const handleRemoveGame = useCallback((pathId: string, slug: string) => {
    removeGameFromPath(pathId, slug);
    refreshPaths();
  }, [refreshPaths]);

  // Active path detail
  const selectedPath = selectedPathId ? paths.find(p => p.id === selectedPathId) : null;
  const selectedStats = selectedPath ? getPathStats(selectedPath) : null;

  // Unique categories in templates
  const templateCategories = useMemo(() => {
    return [...new Set(templates.map(t => t.category))].sort();
  }, [templates]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      fontFamily: theme.font,
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
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
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Coach Atlas" style={{ height: '40px', width: 'auto' }} />
        </a>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Home</a>
          <a href="/games" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Games</a>
          <a href="/blog" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Blog</a>
          <a href="/pricing" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          <a href="/about" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>About</a>
        </nav>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* Title & View Switcher */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Learning Paths</h1>
          <p style={{ color: theme.textSecondary, fontSize: 15, margin: '0 0 20px' }}>
            Structured sequences to master physics topics step by step
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['browse', 'active'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setSelectedPathId(null); }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: `1px solid ${view === v ? theme.accent : theme.border}`,
                  backgroundColor: view === v ? `${theme.accent}20` : 'transparent',
                  color: view === v ? theme.accent : theme.textSecondary,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                {v === 'browse' ? `Browse Paths (${templates.length})` : `My Paths (${paths.length})`}
              </button>
            ))}
          </div>
        </div>

        <RetentionBanner />

        {/* ── BROWSE VIEW ── */}
        {view === 'browse' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterCategory(null)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: `1px solid ${!filterCategory ? theme.accent : theme.border}`,
                  background: !filterCategory ? `${theme.accent}20` : 'transparent',
                  color: !filterCategory ? theme.accent : theme.textSecondary, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                }}
              >
                All
              </button>
              {templateCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    border: `1px solid ${filterCategory === cat ? theme.accent : theme.border}`,
                    background: filterCategory === cat ? `${theme.accent}20` : 'transparent',
                    color: filterCategory === cat ? theme.accent : theme.textSecondary,
                    cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  }}
                >
                  {categoryIcons[cat] || ''} {cat}
                </button>
              ))}
              <div style={{ width: 1, height: 28, backgroundColor: theme.border, margin: '0 4px' }} />
              {['beginner', 'intermediate', 'advanced'].map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDifficulty(d === filterDifficulty ? null : d)}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    border: `1px solid ${filterDifficulty === d ? difficultyColors[d] : theme.border}`,
                    background: filterDifficulty === d ? `${difficultyColors[d]}20` : 'transparent',
                    color: filterDifficulty === d ? difficultyColors[d] : theme.textSecondary,
                    cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {filteredTemplates.map(template => {
                const enrolled = enrolledTemplateIds.has(template.id);
                return (
                  <div
                    key={template.id}
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 24 }}>{categoryIcons[template.category] || '\uD83D\uDCD6'}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: `${difficultyColors[template.difficulty]}20`,
                        color: difficultyColors[template.difficulty],
                        textTransform: 'uppercase',
                      }}>
                        {template.difficulty}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{template.title}</h3>
                    <p style={{ fontSize: 13, color: theme.textSecondary, margin: 0, lineHeight: 1.5 }}>
                      {template.description}
                    </p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: theme.textMuted }}>
                      <span>{template.gameSequence.length} games</span>
                      <span>{template.estimatedHours.toFixed(1)}h</span>
                    </div>
                    <button
                      onClick={() => !enrolled && handleEnroll(template)}
                      disabled={enrolled}
                      style={{
                        marginTop: 'auto',
                        padding: '10px 0',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: enrolled ? theme.border : theme.accent,
                        color: enrolled ? theme.textMuted : 'white',
                        cursor: enrolled ? 'default' : 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                    >
                      {enrolled ? 'Enrolled' : 'Start Path'}
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredTemplates.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.textSecondary }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>No paths match your filters</p>
                <p>Try adjusting your category or difficulty filters.</p>
              </div>
            )}
          </>
        )}

        {/* ── ACTIVE PATHS VIEW ── */}
        {view === 'active' && !selectedPathId && (
          <>
            {paths.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.textSecondary }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>No paths yet</p>
                <p>Browse and start a learning path to begin your journey.</p>
                <button
                  onClick={() => setView('browse')}
                  style={{
                    marginTop: 16, padding: '12px 32px', borderRadius: 8, border: 'none',
                    backgroundColor: theme.accent, color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 15, fontFamily: 'inherit',
                  }}
                >
                  Browse Paths
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Active Paths */}
                {activePaths.length > 0 && (
                  <>
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>In Progress</h2>
                    {activePaths.map(path => {
                      const stats = getPathStats(path);
                      return (
                        <button
                          key={path.id}
                          onClick={() => handleOpenPath(path.id)}
                          style={{
                            backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
                            borderRadius: 12, padding: 20, cursor: 'pointer', textAlign: 'left',
                            color: theme.textPrimary, fontFamily: 'inherit', display: 'block', width: '100%',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{path.title}</h3>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                              backgroundColor: `${difficultyColors[path.difficulty]}20`,
                              color: difficultyColors[path.difficulty], textTransform: 'uppercase',
                            }}>
                              {path.difficulty}
                            </span>
                          </div>
                          <PathProgressBar percent={stats.progressPercent} label={`${stats.completedGames}/${stats.totalGames} games`} />
                          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: theme.textMuted }}>
                            <span>Avg: {Math.round(stats.averageScore)}%</span>
                            <span>{formatMinutes(stats.estimatedMinutesRemaining)} remaining</span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Completed Paths */}
                {completedPaths.length > 0 && (
                  <>
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: '16px 0 4px' }}>Completed</h2>
                    {completedPaths.map(path => {
                      const stats = getPathStats(path);
                      return (
                        <button
                          key={path.id}
                          onClick={() => handleOpenPath(path.id)}
                          style={{
                            backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
                            borderRadius: 12, padding: 20, cursor: 'pointer', textAlign: 'left',
                            color: theme.textPrimary, fontFamily: 'inherit', display: 'block', width: '100%',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                              {'\u2705'} {path.title}
                            </h3>
                            <span style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                              {Math.round(stats.averageScore)}% avg
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── PATH DETAIL VIEW ── */}
        {(view === 'detail' || (view === 'active' && selectedPathId)) && selectedPath && selectedStats && (
          <>
            {/* Back button */}
            <button
              onClick={() => { setSelectedPathId(null); setView('active'); }}
              style={{
                marginBottom: 20, padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${theme.border}`, background: 'transparent',
                color: theme.textSecondary, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
              }}
            >
              {'\u2190'} Back to My Paths
            </button>

            {/* Path header */}
            <div style={{
              backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
              borderRadius: 12, padding: 24, marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{selectedPath.title}</h2>
                  <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>
                    Started {new Date(selectedPath.startedAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Difficulty selector */}
                  <select
                    value={selectedPath.difficulty}
                    onChange={e => handleAdjustDifficulty(selectedPath.id, e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.border}`,
                      background: theme.bgCard, color: theme.textPrimary, fontSize: 13, fontFamily: 'inherit',
                    }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <button
                    onClick={() => handleDeletePath(selectedPath.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.danger}40`,
                      background: 'transparent', color: theme.danger, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { value: `${selectedStats.completedGames}/${selectedStats.totalGames}`, label: 'Games' },
                  { value: `${Math.round(selectedStats.averageScore)}%`, label: 'Avg Score' },
                  { value: `${selectedStats.masteredGames}`, label: 'Mastered' },
                  { value: formatMinutes(selectedStats.estimatedMinutesRemaining), label: 'Remaining' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <PathProgressBar percent={selectedStats.progressPercent} variant="full" label="Overall Progress" />
            </div>

            {/* Game timeline */}
            <div style={{
              backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
              borderRadius: 12, padding: 16,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', padding: '0 8px' }}>Game Sequence</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedPath.games.map((game, i) => (
                  <div key={game.slug} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1 }}>
                      <PathGameNode
                        name={slugToName(game.slug)}
                        status={game.status}
                        isCurrent={i === selectedPath.currentIndex}
                        score={game.score}
                        onClick={() => handlePlayGame(game.slug)}
                      />
                    </div>
                    {game.status === 'locked' && (
                      <button
                        onClick={() => handleRemoveGame(selectedPath.id, game.slug)}
                        title="Remove from path"
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: `1px solid ${theme.border}`,
                          background: 'transparent', color: theme.textMuted, cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                        }}
                      >
                        {'\u00D7'}
                      </button>
                    )}
                    {/* Connector line */}
                    {i < selectedPath.games.length - 1 && (
                      <div style={{ position: 'absolute', left: 34, top: 48, width: 2, height: 4, backgroundColor: theme.border }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
