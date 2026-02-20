'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { isOnboardingComplete, getLearnerProfile } from '../services/GameProgressService';
import { getActivePaths, addGameToPath, type LearnerPath } from '../services/LearningPathService';
import { trackSearchPerformed, trackCustomGameRequested } from '../services/AnalyticsService';

// ============================================================================
// CUSTOM GAME BUILDER — Fuzzy search existing games, add to paths, request new
// Route: /build
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
  error: '#EF4444',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const difficultyColors: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

interface CatalogGame {
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  difficulty: string;
  concepts: string[];
  tags: string[];
}

const CUSTOM_REQUESTS_KEY = 'atlas_custom_requests';
const RATE_LIMIT_KEY = 'atlas_custom_rate';
const MAX_REQUESTS_PER_DAY = 5;

// ============================================================================
// FUZZY MATCHING — ported from GamesPage multi-tier search
// ============================================================================

function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100;
  // Word-start initials match (e.g., "rc" matches "RC Time Constant")
  const words = t.split(/[\s\-_]+/);
  const initials = words.map(w => w[0] || '').join('').toLowerCase();
  if (initials.includes(q)) return 80;
  // Fuzzy: all chars appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return 50;
  return 0;
}

interface ScoredResult {
  game: CatalogGame;
  score: number;
  matchReason: string;
}

function scoreGame(game: CatalogGame, query: string): ScoredResult | null {
  const q = query.toLowerCase();
  let score = 0;
  let matchReason = '';

  // Exact name match
  if (game.name.toLowerCase() === q) {
    score = 1000;
    matchReason = 'Exact name match';
  }
  // Name starts with query
  else if (game.name.toLowerCase().startsWith(q)) {
    score = 500;
    matchReason = 'Name match';
  }
  // Name contains query as substring
  else if (game.name.toLowerCase().includes(q)) {
    score = 400;
    matchReason = 'Name contains query';
  }
  // Decoded slug match (handles "mosfet", "gpu", "sram", etc.)
  else if (game.slug.replace(/-/g, '').toLowerCase().includes(q.replace(/[\s\-]/g, ''))) {
    score = 350;
    matchReason = 'Slug match';
  }
  // Tag exact match
  else if (game.tags.some(t => t.toLowerCase() === q)) {
    score = 300;
    matchReason = `Tag: ${game.tags.find(t => t.toLowerCase() === q)}`;
  }
  // Concept match
  else if (game.concepts.some(c => c.toLowerCase().includes(q))) {
    score = 280;
    matchReason = `Concept: ${game.concepts.find(c => c.toLowerCase().includes(q))}`;
  }
  // Tag substring match
  else if (game.tags.some(t => t.toLowerCase().includes(q))) {
    score = 250;
    matchReason = `Tag: ${game.tags.find(t => t.toLowerCase().includes(q))}`;
  }
  // Category match
  else if (game.category.toLowerCase().includes(q)) {
    score = 200;
    matchReason = `Category: ${game.category}`;
  }
  // Subcategory match
  else if (game.subcategory.toLowerCase().includes(q)) {
    score = 180;
    matchReason = `Subcategory: ${game.subcategory}`;
  }
  // Fuzzy name match
  else {
    const fs = fuzzyMatch(q, game.name);
    if (fs > 0) {
      score = fs;
      matchReason = 'Fuzzy name match';
    }
    // Fuzzy concept match
    if (score === 0) {
      for (const c of game.concepts) {
        const cs = fuzzyMatch(q, c);
        if (cs > 0) {
          score = Math.max(score, cs - 10);
          matchReason = `Fuzzy concept: ${c}`;
        }
      }
    }
  }

  return score > 0 ? { game, score, matchReason } : null;
}

// ============================================================================
// TOPIC VALIDATION
// ============================================================================

const BLOCKLIST = [
  'shit', 'fuck', 'damn', 'ass', 'crap', 'hell', 'bitch', 'bastard',
  'dick', 'porn', 'sex', 'nude', 'naked', 'kill', 'murder', 'hate',
  'racist', 'drugs', 'weed', 'cocaine', 'meth',
];

const EDUCATIONAL_KEYWORDS = [
  'physics', 'engineering', 'science', 'math', 'chemistry', 'biology',
  'mechanics', 'thermodynamics', 'electro', 'magnetic', 'wave', 'optic',
  'fluid', 'quantum', 'nuclear', 'solar', 'energy', 'force', 'motion',
  'circuit', 'semiconductor', 'chip', 'transistor', 'laser', 'radiation',
  'gravity', 'friction', 'pressure', 'temperature', 'heat', 'light',
  'sound', 'vibration', 'resonance', 'frequency', 'voltage', 'current',
  'resistance', 'capacitor', 'inductor', 'battery', 'motor', 'generator',
  'turbine', 'rocket', 'satellite', 'orbit', 'space', 'material',
  'stress', 'strain', 'elasticity', 'viscosity', 'density', 'buoyancy',
  'diffraction', 'interference', 'refraction', 'reflection', 'polarization',
  'entropy', 'enthalpy', 'reaction', 'catalyst', 'atom', 'molecule',
  'electron', 'proton', 'neutron', 'photon', 'spectrum', 'field',
  'potential', 'kinetic', 'momentum', 'torque', 'angular', 'inertia',
  'pendulum', 'oscillation', 'damping', 'coupling', 'feedback',
  'control', 'signal', 'noise', 'filter', 'amplifier', 'sensor',
  'gpu', 'cpu', 'memory', 'cache', 'network', 'algorithm', 'ai',
  'machine learning', 'neural', 'inference', 'data', 'compute',
  'power', 'efficiency', 'sustainability', 'renewable', 'wind',
  'hydro', 'geothermal', 'nuclear', 'fusion', 'fission',
  'corrosion', 'fracture', 'fatigue', 'thermal', 'conductivity',
  'convection', 'conduction', 'radiation', 'absorption', 'emission',
];

interface ValidationResult {
  valid: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
}

function validateTopic(topic: string): ValidationResult {
  const trimmed = topic.trim();

  if (trimmed.length < 3) {
    return { valid: false, message: 'Please enter at least 3 characters.', type: 'error' };
  }
  if (trimmed.length > 200) {
    return { valid: false, message: 'Please keep your description under 200 characters.', type: 'error' };
  }

  const lower = trimmed.toLowerCase();

  // Check blocklist
  for (const word of BLOCKLIST) {
    if (lower.includes(word)) {
      return { valid: false, message: 'Please describe a science or engineering topic.', type: 'error' };
    }
  }

  // Check for educational relevance
  const hasEducationalKeyword = EDUCATIONAL_KEYWORDS.some(kw => lower.includes(kw));
  if (hasEducationalKeyword) {
    return { valid: true, message: 'Great physics/engineering topic!', type: 'success' };
  }

  // Ambiguous — allow but warn
  return { valid: true, message: 'Tip: Mentioning specific physics or engineering concepts helps us prioritize.', type: 'warning' };
}

function checkRateLimit(): { allowed: boolean; remaining: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const today = new Date().toISOString().split('T')[0];
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today) {
        const remaining = MAX_REQUESTS_PER_DAY - data.count;
        return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
      }
    }
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY };
  } catch {
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY };
  }
}

function incrementRateLimit(): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    let count = 1;
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today) count = data.count + 1;
    }
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ date: today, count }));
  } catch {
    // Storage unavailable
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CustomGameBuilder() {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [activePaths, setActivePaths] = useState<LearnerPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());
  const [customRequest, setCustomRequest] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [rateInfo, setRateInfo] = useState({ allowed: true, remaining: MAX_REQUESTS_PER_DAY });

  useEffect(() => {
    if (!isOnboardingComplete()) {
      window.location.href = '/onboarding';
      return;
    }

    // Load catalog
    import('../src/data/gameCatalog').then(mod => {
      const data = mod.gameCatalog || mod.default || [];
      setCatalog(data);
    }).catch(() => {});

    // Load active paths
    setActivePaths(getActivePaths());
    setRateInfo(checkRateLimit());
  }, []);

  // Set default selected path
  useEffect(() => {
    if (activePaths.length > 0 && !selectedPathId) {
      setSelectedPathId(activePaths[0].id);
    }
  }, [activePaths, selectedPathId]);

  // Live validation on custom request input
  useEffect(() => {
    if (customRequest.trim().length > 0) {
      setValidation(validateTopic(customRequest));
    } else {
      setValidation(null);
    }
  }, [customRequest]);

  // Fuzzy multi-tier search
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const scored: ScoredResult[] = [];
    for (const game of catalog) {
      const result = scoreGame(game, q);
      if (result) scored.push(result);
    }

    scored.sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name));
    return scored.slice(0, 20);
  }, [query, catalog]);

  // Track search when results change
  useEffect(() => {
    const q = query.trim();
    if (q.length >= 2) {
      trackSearchPerformed(q, results.length);
    }
  }, [results.length, query]);

  const handleAddToPath = useCallback((slug: string) => {
    if (!selectedPathId) return;
    addGameToPath(selectedPathId, slug);
    setAddedSlugs(prev => new Set(prev).add(slug));
  }, [selectedPathId]);

  const handleSubmitRequest = useCallback(() => {
    const trimmed = customRequest.trim();
    if (!trimmed) return;

    const result = validateTopic(trimmed);
    if (!result.valid) {
      setValidation(result);
      return;
    }

    if (!rateInfo.allowed) return;

    // Store request with context
    try {
      const profile = getLearnerProfile();
      const existing = JSON.parse(localStorage.getItem(CUSTOM_REQUESTS_KEY) || '[]');

      // Find closest existing game matches
      const closestMatches = catalog
        .map(g => {
          const s = scoreGame(g, trimmed);
          return s ? { slug: g.slug, name: g.name, score: s.score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (b?.score || 0) - (a?.score || 0))
        .slice(0, 3);

      existing.push({
        topic: trimmed,
        timestamp: Date.now(),
        validationResult: result.type,
        learnerLevel: profile?.level || 'unknown',
        learnerInterests: profile?.interests || [],
        closestMatches,
      });
      localStorage.setItem(CUSTOM_REQUESTS_KEY, JSON.stringify(existing));
    } catch {
      // Storage unavailable
    }

    incrementRateLimit();
    setRateInfo(checkRateLimit());
    trackCustomGameRequested(trimmed, result.type);

    setRequestSubmitted(true);
    setCustomRequest('');
    setValidation(null);
    setTimeout(() => setRequestSubmitted(false), 3000);
  }, [customRequest, rateInfo.allowed, catalog]);

  const validationColor = validation
    ? validation.type === 'success' ? theme.success
    : validation.type === 'warning' ? theme.warning
    : theme.error
    : theme.textMuted;

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
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            {'\uD83C\uDF93'}
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>Atlas Coach</span>
        </a>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/games" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Games</a>
          <a href="/paths" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Paths</a>
          <a href="/progress" style={{ color: theme.textSecondary, textDecoration: 'none', fontSize: 14 }}>Progress</a>
        </nav>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Game Builder</h1>
        <p style={{ color: theme.textSecondary, fontSize: 15, margin: '0 0 32px' }}>
          Find games on any topic or request new ones
        </p>

        {/* Search */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            What do you want to learn about?
          </label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g., optics, thermodynamics, GPU, solar cells..."
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.bgCard,
              color: theme.textPrimary,
              fontSize: 16,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Path selector */}
        {activePaths.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>
              Add results to path:
            </label>
            <select
              value={selectedPathId || ''}
              onChange={e => setSelectedPathId(e.target.value || null)}
              style={{
                padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`,
                background: theme.bgCard, color: theme.textPrimary, fontSize: 13, fontFamily: 'inherit',
              }}
            >
              {activePaths.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>
              {results.length} matching games
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(({ game, matchReason }) => {
                const added = addedSlugs.has(game.slug);
                return (
                  <div
                    key={game.slug}
                    style={{
                      backgroundColor: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <a
                          href={`/games/${game.slug}`}
                          style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, textDecoration: 'none' }}
                          onClick={() => trackSearchPerformed(query, results.length, game.slug)}
                        >
                          {game.name}
                        </a>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                          backgroundColor: `${difficultyColors[game.difficulty] || theme.textMuted}20`,
                          color: difficultyColors[game.difficulty] || theme.textMuted,
                          textTransform: 'uppercase',
                        }}>
                          {game.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 2 }}>
                        {game.category} {game.subcategory ? `\u203A ${game.subcategory}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: theme.accent, fontStyle: 'italic' }}>
                        {matchReason}
                      </div>
                      {game.concepts.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {game.concepts.slice(0, 3).map(c => (
                            <span key={c} style={{
                              fontSize: 11, padding: '2px 6px', borderRadius: 3,
                              backgroundColor: `${theme.accent}15`, color: theme.accent,
                            }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <a
                        href={`/games/${game.slug}`}
                        style={{
                          padding: '6px 14px', borderRadius: 6, border: `1px solid ${theme.border}`,
                          background: 'transparent', color: theme.textSecondary, textDecoration: 'none', fontSize: 13,
                        }}
                      >
                        Play
                      </a>
                      {selectedPathId && (
                        <button
                          onClick={() => handleAddToPath(game.slug)}
                          disabled={added}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none',
                            backgroundColor: added ? theme.success : theme.accent,
                            color: 'white', cursor: added ? 'default' : 'pointer', fontSize: 13,
                            fontWeight: 600, fontFamily: 'inherit',
                          }}
                        >
                          {added ? 'Added' : '+ Path'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No results */}
        {query.length >= 2 && results.length === 0 && (
          <div style={{
            backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
            borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 32,
          }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              No games found for &quot;{query}&quot;
            </p>
            <p style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 16 }}>
              Request a custom game on this topic below
            </p>
          </div>
        )}

        {/* Custom request section */}
        <div style={{
          backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
            Request a Custom Game
          </h3>
          <p style={{ fontSize: 13, color: theme.textSecondary, margin: '0 0 16px' }}>
            Describe a science or engineering topic you'd like to learn about.
            {!rateInfo.allowed && (
              <span style={{ color: theme.warning, display: 'block', marginTop: 4 }}>
                Daily limit reached ({MAX_REQUESTS_PER_DAY} requests/day). Try again tomorrow.
              </span>
            )}
            {rateInfo.allowed && rateInfo.remaining < MAX_REQUESTS_PER_DAY && (
              <span style={{ color: theme.textMuted, display: 'block', marginTop: 4 }}>
                {rateInfo.remaining} request{rateInfo.remaining !== 1 ? 's' : ''} remaining today.
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={customRequest}
              onChange={e => setCustomRequest(e.target.value)}
              placeholder="e.g., Quantum tunneling, fluid dynamics in pipes..."
              maxLength={200}
              onKeyDown={e => e.key === 'Enter' && handleSubmitRequest()}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${validation ? validationColor + '60' : theme.border}`,
                backgroundColor: theme.bg,
                color: theme.textPrimary,
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSubmitRequest}
              disabled={!customRequest.trim() || !rateInfo.allowed || (validation !== null && !validation.valid)}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                backgroundColor: customRequest.trim() && rateInfo.allowed ? theme.accent : theme.border,
                color: customRequest.trim() && rateInfo.allowed ? 'white' : theme.textMuted,
                cursor: customRequest.trim() && rateInfo.allowed ? 'pointer' : 'default',
                fontWeight: 600, fontSize: 14, fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              Submit
            </button>
          </div>
          {validation && customRequest.trim() && (
            <p style={{ fontSize: 13, color: validationColor, marginTop: 8, marginBottom: 0 }}>
              {validation.message}
            </p>
          )}
          {requestSubmitted && (
            <p style={{ fontSize: 13, color: theme.success, marginTop: 8, marginBottom: 0 }}>
              Request submitted! We'll work on adding this topic.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
