'use client';

import React, { useState, useEffect } from 'react';
import { theme, withOpacity } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE — Conversion-focused entry point for new visitors
// ─────────────────────────────────────────────────────────────────────────────

const categories = [
  { name: 'Mechanics', icon: '\u2699\uFE0F', color: '#3B82F6', count: 55 },
  { name: 'Thermo', icon: '\uD83D\uDD25', color: '#EF4444', count: 23 },
  { name: 'E&M', icon: '\u26A1', color: '#F59E0B', count: 24 },
  { name: 'Waves & Optics', icon: '\uD83C\uDF0A', color: '#8B5CF6', count: 43 },
  { name: 'Fluids', icon: '\uD83D\uDCA7', color: '#06B6D4', count: 27 },
  { name: 'Modern', icon: '\u269B\uFE0F', color: '#EC4899', count: 3 },
  { name: 'Engineering', icon: '\uD83D\uDD27', color: '#10B981', count: 42 },
  { name: 'Computing & AI', icon: '\uD83D\uDCBB', color: '#6366F1', count: 33 },
  { name: 'Semiconductor', icon: '\uD83D\uDD2C', color: '#14B8A6', count: 29 },
  { name: 'Solar & PV', icon: '\u2600\uFE0F', color: '#FBBF24', count: 18 },
  { name: 'ELON', icon: '\uD83D\uDE80', color: '#F97316', count: 38 },
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
    quote: 'I use this with my kids every evening. They beg to play "one more game" — and they\'re learning real physics.',
    author: 'David M.',
    role: 'Parent & Engineer',
  },
  {
    quote: 'The interactive simulations are better than any textbook. I finally understand Maxwell\'s equations intuitively.',
    author: 'Priya R.',
    role: 'EE Undergrad',
  },
];

const LandingPage: React.FC = () => {
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [animOffset, setAnimOffset] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(function tick() {
      setAnimOffset(prev => prev + 0.5);
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
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
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textSecondary,
              padding: '8px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
              fontSize: 14,
            }}
          >
            Pricing
          </button>
          <button
            onClick={() => navigate('/onboarding')}
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
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '80px 24px 60px',
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
          margin: '0 auto 36px',
          lineHeight: 1.6,
          position: 'relative',
          zIndex: 1,
        }}>
          340+ interactive simulations with an AI voice coach that guides you through every concept.
          Predict, experiment, and master physics one game at a time.
        </p>

        <div style={{
          display: 'flex',
          gap: 14,
          justifyContent: 'center',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            onClick={() => navigate('/onboarding')}
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
            Start Learning Free {'\u2192'}
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('categories');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
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
            Browse Games
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
            {/* Wave animation */}
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
            {/* Floating particle dots */}
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

      {/* Features Section */}
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
          How Atlas Works
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
          From mechanics to quantum computing — every concept is a game
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 14,
        }}>
          {categories.map((cat, i) => (
            <div
              key={i}
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
              }}
              onClick={() => navigate('/onboarding')}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: cat.color }}>{cat.count} games</div>
            </div>
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
                  "{t.quote}"
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
          onClick={() => navigate('/onboarding')}
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
          Start Learning Free {'\u2192'}
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
            { label: 'Progress', href: '/progress' },
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
    </div>
  );
};

export default LandingPage;
