import React from 'react';
import type { RoundupBlogPost } from '../src/data/blogPostsIndex';

interface Props {
  post: RoundupBlogPost;
}

const BADGE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#fbbf2420', border: '#fbbf24', text: '#fbbf24' },
  2: { bg: '#94a3b820', border: '#94a3b8', text: '#94a3b8' },
  3: { bg: '#cd7f3220', border: '#cd7f32', text: '#cd7f32' },
};

export default function RoundupPostBody({ post }: Props) {
  return (
    <article style={{ padding: '32px 0 48px' }}>
      {/* Intro */}
      <div style={{
        fontSize: '17px',
        lineHeight: 1.8,
        color: '#e2e8f0',
        marginBottom: '40px',
      }}>
        <p>{post.introText}</p>
      </div>

      {/* Methodology */}
      <section style={{
        padding: '24px',
        background: '#1a1a3a',
        border: '1px solid #3B82F640',
        borderRadius: '10px',
        borderLeft: '4px solid #3B82F6',
        marginBottom: '40px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#f0f0f5' }}>
          How We Evaluated
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#e2e8f0', margin: 0 }}>
          {post.methodologyText}
        </p>
      </section>

      {/* Ranked App List */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', color: '#f0f0f5' }}>
          The Rankings
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {post.rankedApps.map(app => {
            const badge = BADGE_COLORS[app.rank];
            const isAtlas = app.isAtlasCoach;
            return (
              <div
                key={app.rank}
                style={{
                  padding: '24px',
                  background: isAtlas ? '#1a1a3a' : '#1a1a24',
                  border: `1px solid ${isAtlas ? '#3B82F640' : '#2a2a3a'}`,
                  borderRadius: '12px',
                  ...(isAtlas ? { borderLeft: '4px solid #3B82F6' } : {}),
                }}
              >
                {/* Rank + Name header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: badge ? badge.bg : '#2a2a3a',
                    border: `2px solid ${badge ? badge.border : '#4a4a5a'}`,
                    fontWeight: 800,
                    fontSize: '16px',
                    color: badge ? badge.text : '#94a3b8',
                    flexShrink: 0,
                  }}>
                    {app.rank}
                  </span>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: isAtlas ? '#3B82F6' : '#f0f0f5',
                    margin: 0,
                  }}>
                    {app.name}
                  </h3>
                  <span style={{
                    padding: '3px 10px',
                    background: '#1a1a24',
                    border: '1px solid #2a2a3a',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#94a3b8',
                  }}>
                    {app.downloads}
                  </span>
                </div>

                {/* Summary */}
                <p style={{
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: '#e2e8f0',
                  marginBottom: '16px',
                }}>
                  {app.summary}
                </p>

                {/* Pros/Cons inline */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  marginBottom: app.comparisonSlug ? '16px' : '0',
                }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', marginBottom: '4px', display: 'block' }}>Pros</span>
                    <ul style={{ margin: 0, paddingLeft: '0', listStyleType: 'none' }}>
                      {app.pros.map((p, i) => (
                        <li key={i} style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '4px', lineHeight: 1.4 }}>
                          <span style={{ color: '#22c55e', marginRight: '6px' }}>+</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '4px', display: 'block' }}>Cons</span>
                    <ul style={{ margin: 0, paddingLeft: '0', listStyleType: 'none' }}>
                      {app.cons.map((c, i) => (
                        <li key={i} style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '4px', lineHeight: 1.4 }}>
                          <span style={{ color: '#ef4444', marginRight: '6px' }}>-</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Link to full comparison */}
                {app.comparisonSlug && (
                  <a
                    href={`/blog/${app.comparisonSlug}`}
                    style={{
                      display: 'inline-block',
                      fontSize: '13px',
                      color: '#3B82F6',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Read full comparison: Coach Atlas vs {app.name} &rarr;
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* All Comparison Links */}
      {post.comparisonSlugs.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: '#f0f0f5' }}>
            All Individual Comparisons
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {post.comparisonSlugs.map(slug => (
              <a
                key={slug}
                href={`/blog/${slug}`}
                style={{
                  padding: '8px 16px',
                  background: '#12121a',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: '13px',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
              >
                {slug.replace('atlas-coach-vs-', 'vs ').replace(/-/g, ' ')}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Related Simulations */}
      {post.relatedSimulations.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: '#f0f0f5' }}>
            Try Related Coach Atlas Simulations
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {post.relatedSimulations.map(sim => (
              <a
                key={sim.slug}
                href={`/games/${sim.slug}`}
                style={{
                  display: 'block',
                  padding: '16px 20px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#f0f0f5',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'border-color 0.2s ease',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
              >
                {sim.name}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {post.faqItems.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px', color: '#f0f0f5' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {post.faqItems.map((faq, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 24px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '10px',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>
                  {faq.question}
                </h3>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#94a3b8', margin: 0 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{
        padding: '40px 32px',
        background: '#1a1a24',
        border: '1px solid #2a2a3a',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: '#f0f0f5' }}>
          Try Coach Atlas Free
        </h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '15px',
          maxWidth: '500px',
          margin: '0 auto 24px',
        }}>
          342 interactive physics and engineering simulations with AI coaching. No signup required.
        </p>
        <a
          href="/games"
          style={{
            display: 'inline-block',
            padding: '14px 36px',
            background: '#3B82F6',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '16px',
            transition: 'opacity 0.2s ease',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9'; }}
          onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
        >
          Explore Simulations
        </a>
      </section>
    </article>
  );
}
