'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getAllGameProgress, GameRecord } from '../services/GameProgressService';
import RetentionBanner from './RetentionBanner';
import { games, gameCategories, searchTags, fuzzyMatch, getUniqueGames } from '../lib/gameData';
import type { GameCategoryKey } from '../lib/gameData';

// ─────────────────────────────────────────────────────────────────────────────
// GAMES LIBRARY PAGE - Browse all 340+ interactive games
// Data (games, categories, tags, fuzzyMatch) imported from lib/gameData.ts
// ─────────────────────────────────────────────────────────────────────────────

// Featured games for quick launch (curated selection)
const featuredSlugs = [
  'pendulum-period', 'wave-interference', 'doppler-effect', 'bernoulli',
  'entropy', 'solar-cell', 'orbital-mechanics', 'faraday-cage',
  'e-l-o-n_-grid-balance', 'tensor-core', 'photolithography', 'buoyancy',
];

// Highlight matching text in search results
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: 'rgba(59,130,246,0.3)', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
};

const GamesPage: React.FC = () => {
  // Parse URL query params for initial state
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { q: '', cat: null as string | null, diff: null as string | null };
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q') || '',
      cat: params.get('category') || null,
      diff: params.get('difficulty') || null,
    };
  };

  const initial = getInitialParams();
  const [searchQuery, setSearchQuery] = useState(initial.q);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initial.cat);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(initial.diff);
  const searchRef = useRef<HTMLInputElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);
  const [progressMap, setProgressMap] = useState<Map<string, GameRecord>>(new Map());

  // Load game progress on mount
  useEffect(() => {
    const records = getAllGameProgress();
    const map = new Map<string, GameRecord>();
    for (const r of records) {
      map.set(r.slug, r);
    }
    setProgressMap(map);
  }, []);

  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  // Sync filters to URL params (without page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  // Auto-focus search on page load
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearchQuery('');
        searchRef.current?.blur();
        setHighlightIndex(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const uniqueGames = useMemo(() => getUniqueGames(), []);

  // Relevance-ranked, fuzzy search with tag support
  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchesCategory = (game: typeof games[0]) => !selectedCategory || game.category === selectedCategory;
    const matchesDifficulty = (game: typeof games[0]) => !selectedDifficulty || game.difficulty === selectedDifficulty;

    if (!q) {
      return uniqueGames
        .filter(g => matchesCategory(g) && matchesDifficulty(g))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Score each game for relevance
    const scored = uniqueGames
      .filter(g => matchesCategory(g) && matchesDifficulty(g))
      .map(game => {
        const cat = gameCategories[game.category as GameCategoryKey];
        const tags = searchTags[game.slug] || [];
        const tagString = tags.join(' ').toLowerCase();
        const decodedSlug = game.slug.replace(/-/g, '').toLowerCase();

        let score = 0;
        if (game.name.toLowerCase() === q) score = 1000;
        else if (game.name.toLowerCase().startsWith(q)) score = 500;
        else if (game.name.toLowerCase().includes(q)) score = 400;
        else if (decodedSlug.includes(q.replace(/[\s\-]/g, ''))) score = 350;
        else if (tags.some(t => t.toLowerCase() === q)) score = 300;
        else if (tagString.includes(q)) score = 250;
        else if (cat && cat.name.toLowerCase().includes(q)) score = 200;
        else if (cat && cat.description.toLowerCase().includes(q)) score = 150;
        else {
          const fs = fuzzyMatch(q, game.name);
          if (fs > 0) score = fs;
        }

        return { game, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name));

    return scored.map(s => s.game);
  }, [searchQuery, selectedCategory, selectedDifficulty, uniqueGames]);

  // Reset highlight when results change
  useEffect(() => { setHighlightIndex(-1); }, [filteredGames]);

  // Arrow key navigation through results
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filteredGames.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < filteredGames.length) {
      e.preventDefault();
      window.location.href = `/games/${filteredGames[highlightIndex].slug}`;
    }
  }, [filteredGames, highlightIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('a[data-game-card]');
      cards[highlightIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightIndex]);

  const featuredGames = useMemo(() => {
    return featuredSlugs
      .map(slug => uniqueGames.find(g => g.slug === slug))
      .filter(Boolean) as typeof games;
  }, [uniqueGames]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    uniqueGames.forEach(g => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return counts;
  }, [uniqueGames]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  const isFiltering = searchQuery || selectedCategory || selectedDifficulty;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ─── Sticky Header ─── */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        background: `${colors.bgPrimary}ee`,
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px',
            background: `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            {'\uD83C\uDF93'}
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary }}>Atlas Coach</span>
        </a>
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="/paths" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>Learning Paths</a>
          <a href="/progress" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>My Progress</a>
          <a href="/build" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>Build</a>
          <button style={{
            background: colors.accent, color: 'white', border: 'none',
            padding: '8px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          }}>
            Sign In
          </button>
        </nav>
      </header>

      {/* ─── Hero + Search ─── */}
      <section style={{ padding: '40px 24px 24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          {uniqueGames.length}+ Interactive Games
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '28px' }}>
          Master complex concepts through hands-on simulations
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            color: colors.textMuted, fontSize: '18px', pointerEvents: 'none',
          }}>
            {'\uD83D\uDD0D'}
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder={`Search ${uniqueGames.length} games... (name, topic, or keyword)`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              width: '100%', padding: '16px 100px 16px 44px',
              borderRadius: '14px', border: `2px solid ${searchQuery ? colors.accent : colors.border}`,
              background: colors.bgCard, color: colors.textPrimary, fontSize: '16px', outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
            onBlur={(e) => { if (!searchQuery) e.currentTarget.style.borderColor = colors.border; }}
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
              style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: colors.border, color: colors.textSecondary, border: 'none',
                borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
              }}
            >
              Clear
            </button>
          ) : (
            <span style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              color: colors.textMuted, fontSize: '12px', background: colors.border,
              padding: '3px 8px', borderRadius: '5px', fontFamily: 'monospace',
            }}>
              Ctrl+K
            </span>
          )}
        </div>
      </section>

      {/* ─── Quick Launch (only when not filtering) ─── */}
      {!isFiltering && (
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: colors.textSecondary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B' }}>{'\u26A1'}</span> Quick Launch
          </h2>
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
            scrollbarWidth: 'thin',
          }}>
            {featuredGames.map((game) => {
              const category = gameCategories[game.category as GameCategoryKey];
              return (
                <a
                  key={game.slug}
                  href={`/games/${game.slug}`}
                  style={{
                    flexShrink: 0, padding: '10px 16px', borderRadius: '10px',
                    background: `${category.color}15`, border: `1px solid ${category.color}44`,
                    textDecoration: 'none', color: 'inherit', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${category.color}30`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${category.color}15`;
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{category.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>{game.name}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Filters ─── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
        {/* Category filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '6px 14px', borderRadius: '100px',
              border: `1px solid ${!selectedCategory ? colors.accent : colors.border}`,
              background: !selectedCategory ? colors.accent : 'transparent',
              color: !selectedCategory ? 'white' : colors.textSecondary,
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            All ({uniqueGames.length})
          </button>
          {Object.entries(gameCategories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
              style={{
                padding: '6px 12px', borderRadius: '100px',
                border: `1px solid ${selectedCategory === key ? cat.color : colors.border}`,
                background: selectedCategory === key ? `${cat.color}22` : 'transparent',
                color: selectedCategory === key ? cat.color : colors.textSecondary,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              {cat.icon} {cat.name} <span style={{ opacity: 0.6 }}>({categoryCounts[key] || 0})</span>
            </button>
          ))}
        </div>

        {/* Difficulty filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['beginner', 'intermediate', 'advanced'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff === selectedDifficulty ? null : diff)}
              style={{
                padding: '5px 12px', borderRadius: '6px',
                border: `1px solid ${selectedDifficulty === diff ? getDifficultyColor(diff) : colors.border}`,
                background: selectedDifficulty === diff ? `${getDifficultyColor(diff)}22` : 'transparent',
                color: selectedDifficulty === diff ? getDifficultyColor(diff) : colors.textMuted,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {diff}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Retention Banner ─── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <RetentionBanner />
      </div>

      {/* ─── Games Grid ─── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>
            {searchQuery ? (
              <>Found <strong style={{ color: colors.textSecondary }}>{filteredGames.length}</strong> result{filteredGames.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</>
            ) : (
              <>Showing {filteredGames.length} of {uniqueGames.length} games</>
            )}
          </p>
          {highlightIndex >= 0 && filteredGames[highlightIndex] && (
            <span style={{ color: colors.textMuted, fontSize: '12px' }}>
              Press Enter to open <strong style={{ color: colors.textSecondary }}>{filteredGames[highlightIndex].name}</strong>
            </span>
          )}
        </div>

        {filteredGames.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{'\uD83D\uDD0D'}</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No games found</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '20px' }}>
              Try a different search term or clear your filters
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedDifficulty(null); }}
              style={{
                background: colors.accent, color: 'white', border: 'none',
                padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredGames.map((game, idx) => {
              const category = gameCategories[game.category as GameCategoryKey];
              const isHighlighted = idx === highlightIndex;
              const tags = searchTags[game.slug];
              const matchedTag = searchQuery && tags
                ? tags.find(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
                : null;
              return (
                <a
                  key={game.slug}
                  href={`/games/${game.slug}`}
                  data-game-card
                  style={{
                    background: isHighlighted ? `${category.color}18` : colors.bgCard,
                    borderRadius: '10px', padding: '16px',
                    border: `1px solid ${isHighlighted ? category.color : colors.border}`,
                    textDecoration: 'none',
                    color: 'inherit', transition: 'all 0.15s', display: 'block',
                    outline: isHighlighted ? `2px solid ${category.color}` : 'none',
                    outlineOffset: '-1px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = category.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    setHighlightIndex(idx);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px',
                  }}>
                    <span style={{ fontSize: '20px' }}>{category.icon}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, color: getDifficultyColor(game.difficulty),
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {game.difficulty}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', lineHeight: '1.3' }}>
                    {searchQuery ? highlightText(game.name, searchQuery) : game.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                    {category.name}
                    {matchedTag && (
                      <span style={{ marginLeft: '6px', color: colors.accent, fontSize: '11px' }}>
                        — {matchedTag}
                      </span>
                    )}
                  </p>
                  {/* Progress badges */}
                  {(() => {
                    const progress = progressMap.get(game.slug);
                    if (!progress) return null;
                    return (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                        {progress.completedAt !== null && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#10B981', color: 'white', fontSize: '11px', fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            &#10003;
                          </span>
                        )}
                        {progress.testScore !== null && progress.testTotal !== null && progress.testTotal > 0 && (
                          <span style={{
                            fontSize: '11px', fontWeight: 600, color: 'white',
                            background: colors.accent, borderRadius: '100px',
                            padding: '2px 8px', lineHeight: '1.4',
                          }}>
                            {Math.round((progress.testScore / progress.testTotal) * 100)}%
                          </span>
                        )}
                        {progress.completedAt === null && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', color: '#F59E0B',
                          }}>
                            <span style={{
                              display: 'inline-block', width: '8px', height: '8px',
                              borderRadius: '50%', background: '#F59E0B', flexShrink: 0,
                            }} />
                            In Progress
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── CTA ─── */}
      <section style={{
        textAlign: 'center', padding: '48px 24px', background: colors.bgSecondary,
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px' }}>
          Unlock all {uniqueGames.length}+ games
        </h2>
        <p style={{ color: colors.textSecondary, marginBottom: '20px', fontSize: '15px' }}>
          Start with 15 free games, or upgrade for unlimited access
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/pricing" style={{
            background: colors.accent, color: 'white', padding: '12px 28px',
            borderRadius: '10px', fontWeight: 600, textDecoration: 'none', fontSize: '14px',
          }}>
            View Pricing
          </a>
          <button style={{
            background: 'transparent', color: colors.textPrimary, padding: '12px 28px',
            borderRadius: '10px', fontWeight: 600, border: `1px solid ${colors.border}`,
            cursor: 'pointer', fontSize: '14px',
          }}>
            Start Free Trial
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.textMuted, fontSize: '13px' }}>
          {'\u00A9'} 2025 Atlas Coach. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default GamesPage;
