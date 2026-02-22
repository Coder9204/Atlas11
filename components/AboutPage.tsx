'use client';

import React from 'react';
import { theme, withOpacity } from '../lib/theme';

const pillars = [
  {
    icon: '\uD83C\uDFAE',
    title: 'Interactive Learning',
    description: 'Every concept becomes a hands-on game. Drag sliders, tweak variables, and see results in real time instead of reading static formulas.',
    color: theme.colors.info,
  },
  {
    icon: '\uD83E\uDD16',
    title: 'AI Coaching',
    description: 'A personal AI voice tutor watches your screen, gives targeted hints, and celebrates your breakthroughs exactly when they happen.',
    color: theme.colors.accent,
  },
  {
    icon: '\uD83E\uDDE0',
    title: 'Spaced Repetition',
    description: 'Our SM-2 algorithm schedules reviews at the optimal time so concepts move from short-term memory into long-term understanding.',
    color: theme.colors.success,
  },
  {
    icon: '\uD83C\uDF0D',
    title: 'Real-World Applications',
    description: 'From solar panels to rocket engines, every simulation connects abstract physics to technology you see and use every day.',
    color: theme.colors.warning,
  },
];

const stats = [
  { value: '340+', label: 'Interactive Games' },
  { value: '11', label: 'Subject Categories' },
  { value: '50,000+', label: 'Active Learners' },
  { value: '4.8/5', label: 'Average Rating' },
];

const AboutPage: React.FC = () => {
  const navigate = (path: string) => { window.location.href = path; };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      fontFamily: theme.fontFamily,
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        maxWidth: 1200,
        margin: '0 auto',
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Coach Atlas" style={{ height: '40px', width: 'auto' }} />
        </a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/games" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: 14 }}>Games</a>
          <a href="/blog" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: 14 }}>Blog</a>
          <a href="/pricing" style={{ color: theme.colors.textSecondary, textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          <a href="/about" style={{ color: theme.colors.info, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>About</a>
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

      {/* Hero */}
      <section style={{
        textAlign: 'center',
        padding: '80px 24px 60px',
        maxWidth: 800,
        margin: '0 auto',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 300,
          background: `radial-gradient(ellipse at center, ${withOpacity(theme.colors.accent, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: 20,
          letterSpacing: '-1px',
          position: 'relative',
        }}>
          About{' '}
          <span style={{
            background: `linear-gradient(135deg, ${theme.colors.info}, ${theme.colors.accent})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Coach Atlas
          </span>
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: theme.colors.textMuted,
          maxWidth: 620,
          margin: '0 auto',
          lineHeight: 1.7,
          position: 'relative',
        }}>
          We believe physics should be intuitive, not intimidating. Coach Atlas turns abstract
          formulas into interactive games so every learner can discover the beauty of how the world works.
        </p>
      </section>

      {/* Mission */}
      <section style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 24px 60px',
        textAlign: 'center',
      }}>
        <div style={{
          background: theme.colors.bgCard,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 16,
          padding: '40px 32px',
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Our Mission</h2>
          <p style={{
            color: theme.colors.textSecondary,
            fontSize: 16,
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Making physics intuitive through interactive play. We combine game design, AI tutoring,
            and cognitive science to create the most effective way to learn physics and engineering concepts.
            No more memorizing equations you don't understand — play with the physics and understanding follows naturally.
          </p>
        </div>
      </section>

      {/* Our Approach — 4 Pillars */}
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
          Our Approach
        </h2>
        <p style={{
          textAlign: 'center',
          color: theme.colors.textMuted,
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto 48px',
        }}>
          Four pillars that make Coach Atlas effective
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}>
          {pillars.map((p, i) => (
            <div key={i} style={{
              background: theme.colors.bgCard,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 16,
              padding: 32,
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: withOpacity(p.color, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                marginBottom: 18,
              }}>
                {p.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 'clamp(24px, 5vw, 64px)',
        padding: '40px 24px',
        borderTop: `1px solid ${theme.colors.border}`,
        borderBottom: `1px solid ${theme.colors.border}`,
        background: withOpacity(theme.colors.bgSecondary, 0.5),
        flexWrap: 'wrap',
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: theme.colors.info }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Story */}
      <section style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '80px 24px',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(24px, 4vw, 32px)',
          fontWeight: 700,
          marginBottom: 24,
          letterSpacing: '-0.5px',
        }}>
          Our Story
        </h2>
        <div style={{
          color: theme.colors.textSecondary,
          fontSize: 16,
          lineHeight: 1.8,
          maxWidth: 640,
          margin: '0 auto',
        }}>
          <p style={{ marginBottom: 20 }}>
            Coach Atlas started with a simple observation: students who play with physics simulations
            understand concepts faster and remember them longer than those who only read textbooks.
          </p>
          <p style={{ marginBottom: 20 }}>
            We set out to build the largest collection of interactive physics games, covering everything
            from basic mechanics to semiconductor physics and solar engineering. Each game follows a
            proven learning cycle — predict, experiment, review, and master.
          </p>
          <p style={{ margin: 0 }}>
            Today, Coach Atlas offers 340+ games across 11 categories, powered by an AI voice coach
            that adapts to each learner's pace. Whether you're a high school student prepping for
            AP Physics or an engineering undergraduate tackling electromagnetism, Atlas meets you
            where you are and helps you level up.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        textAlign: 'center',
        padding: '60px 24px 80px',
        background: withOpacity(theme.colors.bgSecondary, 0.5),
        borderTop: `1px solid ${theme.colors.border}`,
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 700,
          marginBottom: 16,
          letterSpacing: '-0.5px',
        }}>
          Start Learning Free
        </h2>
        <p style={{
          color: theme.colors.textMuted,
          fontSize: 16,
          marginBottom: 32,
          lineHeight: 1.6,
          maxWidth: 500,
          margin: '0 auto 32px',
        }}>
          Join 50,000+ learners mastering physics through interactive play. No credit card required.
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
          Get Started Free {'\u2192'}
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
            <a key={i} href={link.href} style={{ color: theme.colors.textMuted, fontSize: 13, textDecoration: 'none' }}>
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
