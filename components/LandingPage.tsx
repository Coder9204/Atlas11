'use client';

import React, { useState, useEffect, useRef } from 'react';
import { theme, withOpacity } from '../lib/theme';
import { searchGames, gameCategories } from '../lib/gameData';
import type { GameCategoryKey } from '../lib/gameData';
import AICoachPanel from './AICoachPanel';

// Map category keys to their data for the landing page cards
const categoryCards: { key: GameCategoryKey; name: string; icon: string; color: string; count: number }[] = [
  { key: 'mechanics', name: 'Mechanics', icon: '\u2699\uFE0F', color: '#3B82F6', count: 55 },
  { key: 'thermodynamics', name: 'Thermo', icon: '\uD83D\uDD25', color: '#EF4444', count: 23 },
  { key: 'electromagnetism', name: 'E&M', icon: '\u26A1', color: '#F59E0B', count: 24 },
  { key: 'waves', name: 'Waves & Optics', icon: '\uD83C\uDF0A', color: '#8B5CF6', count: 43 },
  { key: 'fluids', name: 'Fluids', icon: '\uD83D\uDCA7', color: '#06B6D4', count: 27 },
  { key: 'modern', name: 'Modern', icon: '\u269B\uFE0F', color: '#EC4899', count: 3 },
  { key: 'engineering', name: 'Engineering', icon: '\uD83D\uDD27', color: '#10B981', count: 42 },
  { key: 'computing', name: 'Computing & AI', icon: '\uD83D\uDCBB', color: '#6366F1', count: 33 },
  { key: 'semiconductor', name: 'Semiconductor', icon: '\uD83D\uDD2C', color: '#14B8A6', count: 29 },
  { key: 'solar', name: 'Solar & PV', icon: '\u2600\uFE0F', color: '#FBBF24', count: 18 },
  { key: 'elon', name: 'ELON', icon: '\uD83D\uDE80', color: '#F97316', count: 38 },
];

const features = [
  {
    icon: '\uD83E\uDD16',
    title: 'AI Voice Coach',
    description: 'A personal tutor that watches your screen, celebrates wins, and gives hints exactly when you need them.',
    color: theme.colors.accent,
  },
  {
    icon: '\uD83C\uDFAE',
    title: 'Interactive Simulations',
    description: 'Predict, play, review, and test. Every concept becomes a hands-on experiment you control.',
    color: theme.colors.info,
  },
  {
    icon: '\uD83E\uDDE0',
    title: 'Spaced Repetition',
    description: 'SM-2 algorithm schedules reviews at the perfect time so you remember what you learn.',
    color: theme.colors.success,
  },
];

const testimonials = [
  {
    quote: 'Atlas turned physics from my worst subject into my best. The AI coach feels like having a patient tutor 24/7.',
    author: 'Sarah K.',
    role: 'AP Physics Student',
  },
  {
    quote: 'I use this with my kids every evening. They beg to play "one more game" \u2014 and they\'re learning real physics.',
    author: 'David M.',
    role: 'Parent & Engineer',
  },
  {
    quote: 'The interactive simulations are better than any textbook. I finally understand Maxwell\'s equations intuitively.',
    author: 'Priya R.',
    role: 'EE Undergrad',
  },
];

const howItWorksSteps = [
  { step: '1', title: 'Pick a Game', description: 'Choose from 340+ interactive physics simulations across 11 categories.', icon: '\uD83C\uDFAF' },
  { step: '2', title: 'Predict', description: 'Make a prediction about what will happen before running the experiment.', icon: '\uD83E\uDD14' },
  { step: '3', title: 'Experiment', description: 'Drag sliders, tweak variables, and watch the physics unfold in real time.', icon: '\uD83E\uDDEA' },
  { step: '4', title: 'Master', description: 'Review your results, get AI coaching, and build lasting understanding.', icon: '\uD83C\uDFC6' },
];

const pricingPreview = [
  { name: 'Free', price: '$0', period: '', description: '5 games/day, basic tracking', color: theme.colors.textMuted },
  { name: 'Plus', price: '$4.17', period: '/mo', description: 'All games, AI coach, analytics', color: theme.colors.success, popular: true },
  { name: 'Pro', price: '$8.33', period: '/mo', description: 'Plus + offline, certs, priority', color: theme.colors.info },
];

const LandingPage: React.FC = () => {
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [animOffset, setAnimOffset] = useState(0);
  const [heroSearch, setHeroSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; slug: string; category: string; difficulty: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(function tick() {
      setAnimOffset(prev => prev + 0.5);
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Live search
  useEffect(() => {
    if (heroSearch.trim().length > 0) {
      const results = searchGames(heroSearch, 8);
      setSearchResults(results);
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [heroSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current && !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      fontFamily: theme.fontFamily,
      overflowX: 'hidden',
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{'\u269B\uFE0F'}</span>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>Atlas</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/games" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: 14 }}>Games</a>
          <a href="/pricing" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          <a href="/about" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: 14 }}>About</a>
          <button
            onClick={() => navigate('/games/pendulum-period')}
            style={{
              background: theme.colors.info,
              border: 'none',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Play Now
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '60px 24px 40px',
        maxWidth: 900,
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Animated background orbs */}
        <div style={{
          position: 'absolute',
          top: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          background: `radial-gradient(ellipse at center, ${withOpacity(theme.colors.info, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 20,
          position: 'relative',
          zIndex: 1,
          letterSpacing: '-1.5px',
        }}>
          Learn Physics{' '}
          <span style={{
            background: `linear-gradient(135deg, ${theme.colors.info}, ${theme.colors.accent})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            by Playing
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: theme.colors.textMuted,
          maxWidth: 600,
          margin: '0 auto 28px',
          lineHeight: 1.6,
          position: 'relative',
          zIndex: 1,
        }}>
          340+ interactive simulations with an AI voice coach that guides you through every concept.
          Predict, experiment, and master physics one game at a time.
        </p>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          maxWidth: 560,
          margin: '0 auto 24px',
          zIndex: 10,
        }}>
          <div style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: theme.colors.textMuted, fontSize: 18, pointerEvents: 'none',
          }}>
            {'\uD83D\uDD0D'}
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search 340+ games... (e.g. pendulum, wave, GPU)"
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                navigate(`/games/${searchResults[0].slug}`);
              }
              if (e.key === 'Escape') {
                setHeroSearch('');
                setShowDropdown(false);
                searchRef.current?.blur();
              }
            }}
            style={{
              width: '100%',
              padding: '14px 14px 14px 44px',
              borderRadius: 14,
              border: `2px solid ${heroSearch ? theme.colors.info : theme.colors.border}`,
              background: theme.colors.bgCard,
              color: theme.colors.textPrimary,
              fontSize: 16,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
              fontFamily: theme.fontFamily,
            }}
          />

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 6,
                background: theme.colors.bgCard,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                zIndex: 100,
              }}
            >
              {searchResults.map((game, i) => {
                const cat = gameCategories[game.category as GameCategoryKey];
                return (
                  <a
                    key={game.slug}
                    href={`/games/${game.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      textDecoration: 'none',
                      color: theme.colors.textPrimary,
                      borderBottom: i < searchResults.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = withOpacity(theme.colors.info, 0.1); }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{cat?.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {game.name}
                      </div>
                      <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        {cat?.name} &middot; {game.difficulty}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: theme.colors.textMuted, flexShrink: 0 }}>{'\u2192'}</span>
                  </a>
                );
              })}
              <a
                href={`/games?q=${encodeURIComponent(heroSearch)}`}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.colors.info,
                  textDecoration: 'none',
                  borderTop: `1px solid ${theme.colors.border}`,
                }}
              >
                See all results {'\u2192'}
              </a>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: 14,
          justifyContent: 'center',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            onClick={() => navigate('/games/pendulum-period')}
            style={{
              background: `linear-gradient(135deg, ${theme.colors.info}, ${theme.colors.accent})`,
              border: 'none',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
              boxShadow: `0 4px 20px ${withOpacity(theme.colors.info, 0.4)}`,
            }}
          >
            Play Now {'\u2192'}
          </button>
          <button
            onClick={() => navigate('/games')}
            style={{
              background: withOpacity(theme.colors.textPrimary, 0.06),
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textSecondary,
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 17,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
            }}
          >
            Browse All Games
          </button>
        </div>

        {/* Animated demo SVG */}
        <div style={{ marginTop: 50, position: 'relative', zIndex: 1 }}>
          <svg viewBox="0 0 800 200" style={{ width: '100%', maxWidth: 700, margin: '0 auto', display: 'block' }}>
            <defs>
              <linearGradient id="lp-wave-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={theme.colors.info} stopOpacity="0.8" />
                <stop offset="50%" stopColor={theme.colors.accent} stopOpacity="0.6" />
                <stop offset="100%" stopColor={theme.colors.cyan} stopOpacity="0.8" />
              </linearGradient>
              <filter id="lp-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {[0, 1, 2].map(i => {
              const points = [];
              for (let x = 0; x <= 800; x += 4) {
                const y = 100 + Math.sin((x + animOffset * (2 + i * 0.5)) * 0.015) * (30 - i * 8)
                  + Math.sin((x + animOffset * (1.5 - i * 0.3)) * 0.008) * (15 - i * 4);
                points.push(`${x},${y}`);
              }
              return (
                <polyline
                  key={i}
                  points={points.join(' ')}
                  fill="none"
                  stroke={`url(#lp-wave-grad)`}
                  strokeWidth={2.5 - i * 0.5}
                  strokeOpacity={0.7 - i * 0.2}
                  filter="url(#lp-glow)"
                />
              );
            })}
            {[120, 300, 500, 680].map((cx, i) => (
              <circle
                key={i}
                cx={cx}
                cy={100 + Math.sin((cx + animOffset * 1.2) * 0.02) * 25}
                r={4}
                fill={[theme.colors.info, theme.colors.accent, theme.colors.cyan, theme.colors.success][i]}
                opacity={0.8}
                filter="url(#lp-glow)"
              />
            ))}
          </svg>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 'clamp(24px, 5vw, 64px)',
        padding: '30px 24px',
        borderTop: `1px solid ${theme.colors.border}`,
        borderBottom: `1px solid ${theme.colors.border}`,
        background: withOpacity(theme.colors.bgSecondary, 0.5),
        flexWrap: 'wrap',
      }}>
        {[
          { value: '50,000+', label: 'Active Learners' },
          { value: '340+', label: 'Interactive Games' },
          { value: '11', label: 'Subject Categories' },
          { value: '4.8/5', label: 'Average Rating' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.info }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works Section */}
      <section style={{
        padding: '80px 24px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          How It Works
        </h2>
        <p style={{
          textAlign: 'center',
          color: theme.colors.textMuted,
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto 48px',
        }}>
          Four steps to mastering any physics concept
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
        }}>
          {howItWorksSteps.map((s, i) => (
            <div key={i} style={{
              background: theme.colors.bgCard,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 16,
              padding: 28,
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{
                fontSize: 36,
                marginBottom: 14,
              }}>
                {s.icon}
              </div>
              <div style={{
                position: 'absolute',
                top: 12,
                left: 16,
                fontSize: 12,
                fontWeight: 700,
                color: theme.colors.info,
                background: withOpacity(theme.colors.info, 0.1),
                borderRadius: 6,
                padding: '2px 8px',
              }}>
                Step {s.step}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '60px 24px 80px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          Why Atlas Works
        </h2>
        <p style={{
          textAlign: 'center',
          color: theme.colors.textMuted,
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto 48px',
        }}>
          Every game follows a proven learning cycle backed by research
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: theme.colors.bgCard,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 16,
              padding: 32,
              transition: 'transform 0.2s, border-color 0.2s',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: withOpacity(f.color, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                marginBottom: 18,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" style={{
        padding: '60px 24px 80px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          Explore 340+ Games
        </h2>
        <p style={{
          textAlign: 'center',
          color: theme.colors.textMuted,
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto 40px',
        }}>
          From mechanics to quantum computing {'\u2014'} every concept is a game
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 14,
        }}>
          {categoryCards.map((cat, i) => (
            <a
              key={cat.key}
              href={`/games?category=${cat.key}`}
              onMouseEnter={() => setHoveredCategory(i)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{
                background: hoveredCategory === i
                  ? withOpacity(cat.color, 0.1)
                  : theme.colors.bgCard,
                border: `1px solid ${hoveredCategory === i ? withOpacity(cat.color, 0.3) : theme.colors.border}`,
                borderRadius: 12,
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: cat.color }}>{cat.count} games</div>
            </a>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        padding: '60px 24px 80px',
        background: withOpacity(theme.colors.bgSecondary, 0.5),
        borderTop: `1px solid ${theme.colors.border}`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 700,
            marginBottom: 40,
            letterSpacing: '-0.5px',
          }}>
            What Learners Say
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                background: theme.colors.bgCard,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 16,
                padding: 28,
              }}>
                <p style={{
                  color: theme.colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  margin: '0 0 18px',
                }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.author}</div>
                  <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={{
        padding: '80px 24px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          Simple Pricing
        </h2>
        <p style={{
          textAlign: 'center',
          color: theme.colors.textMuted,
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto 40px',
        }}>
          Start free, upgrade when you're ready
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}>
          {pricingPreview.map((tier, i) => (
            <div key={i} style={{
              background: theme.colors.bgCard,
              border: `1px solid ${tier.popular ? theme.colors.success : theme.colors.border}`,
              borderRadius: 16,
              padding: '28px 24px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {tier.popular && (
                <div style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: theme.colors.success,
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  Most Popular
                </div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 700, color: tier.color, marginBottom: 8 }}>{tier.name}</h3>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 800 }}>{tier.price}</span>
                {tier.period && <span style={{ color: theme.colors.textMuted, fontSize: 14 }}>{tier.period}</span>}
              </div>
              <p style={{ color: theme.colors.textMuted, fontSize: 13, margin: 0 }}>
                {tier.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a
            href="/pricing"
            style={{
              color: theme.colors.info,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            See full pricing {'\u2192'}
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        textAlign: 'center',
        padding: '80px 24px',
        maxWidth: 700,
        margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          marginBottom: 16,
          letterSpacing: '-0.5px',
        }}>
          Ready to Start?
        </h2>
        <p style={{
          color: theme.colors.textMuted,
          fontSize: 16,
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          Join 50,000+ learners mastering physics through interactive play. Free to start, no credit card required.
        </p>
        <button
          onClick={() => navigate('/games/pendulum-period')}
          style={{
            background: `linear-gradient(135deg, ${theme.colors.info}, ${theme.colors.accent})`,
            border: 'none',
            color: '#fff',
            padding: '16px 40px',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: theme.fontFamily,
            boxShadow: `0 4px 24px ${withOpacity(theme.colors.info, 0.4)}`,
          }}
        >
          Play Now {'\u2192'}
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${theme.colors.border}`,
        padding: '32px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 1100,
        margin: '0 auto',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          {'\u00A9'} 2026 Atlas. Learn physics by playing.
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Games', href: '/games' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'About', href: '/about' },
          ].map((link, i) => (
            <a
              key={i}
              href={link.href}
              style={{
                color: theme.colors.textMuted,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </footer>

      {/* AI Coach Panel — floating bottom-right */}
      <AICoachPanel />
    </div>
  );
};

export default LandingPage;
