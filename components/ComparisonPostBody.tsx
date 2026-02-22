import React from 'react';
import type { ComparisonBlogPost } from '../src/data/blogPostsIndex';

interface Props {
  post: ComparisonBlogPost;
}

export default function ComparisonPostBody({ post }: Props) {
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

      {/* What Is Competitor */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', color: '#f0f0f5' }}>
          What Is {post.competitorName}?
        </h2>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            padding: '4px 12px',
            background: '#8b5cf618',
            border: '1px solid #8b5cf640',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#8b5cf6',
          }}>
            {post.competitorCategory}
          </span>
          <span style={{
            padding: '4px 12px',
            background: '#1a1a24',
            border: '1px solid #2a2a3a',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#94a3b8',
          }}>
            {post.competitorDownloads} downloads
          </span>
        </div>
        <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#e2e8f0' }}>
          {post.competitorOverview}
        </p>
      </section>

      {/* What Is Coach Atlas */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', color: '#f0f0f5' }}>
          What Is Coach Atlas?
        </h2>
        <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#e2e8f0' }}>
          {post.atlasCoachOverview}
        </p>
      </section>

      {/* Head-to-Head Comparison Table */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '20px', color: '#f0f0f5' }}>
          Head-to-Head Comparison
        </h2>
        <div style={{
          border: '1px solid #2a2a3a',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 1fr',
            background: '#12121a',
            borderBottom: '1px solid #2a2a3a',
          }}>
            <div style={{
              padding: '16px 20px',
              fontWeight: 700,
              fontSize: '14px',
              color: '#94a3b8',
              borderRight: '1px solid #2a2a3a',
            }}>
              Criterion
            </div>
            <div style={{
              padding: '16px 20px',
              fontWeight: 700,
              fontSize: '14px',
              color: '#3B82F6',
              borderRight: '1px solid #2a2a3a',
            }}>
              Coach Atlas
            </div>
            <div style={{
              padding: '16px 20px',
              fontWeight: 700,
              fontSize: '14px',
              color: '#8b5cf6',
            }}>
              {post.competitorName}
            </div>
          </div>

          {/* Rows */}
          {post.comparisonCriteria.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr 1fr',
                borderBottom: i < post.comparisonCriteria.length - 1 ? '1px solid #2a2a3a' : 'none',
              }}
            >
              <div style={{
                padding: '16px 20px',
                fontWeight: 600,
                fontSize: '14px',
                color: '#f0f0f5',
                background: '#12121a',
                borderRight: '1px solid #2a2a3a',
              }}>
                {row.criterion}
              </div>
              <div style={{
                padding: '16px 20px',
                fontSize: '14px',
                color: '#e2e8f0',
                lineHeight: 1.6,
                background: row.winner === 'atlas' ? '#3B82F608' : '#1a1a24',
                borderRight: '1px solid #2a2a3a',
                borderLeft: row.winner === 'atlas' ? '3px solid #3B82F6' : 'none',
              }}>
                {row.atlasCoach}
              </div>
              <div style={{
                padding: '16px 20px',
                fontSize: '14px',
                color: '#e2e8f0',
                lineHeight: 1.6,
                background: row.winner === 'competitor' ? '#8b5cf608' : '#1a1a24',
                borderLeft: row.winner === 'competitor' ? '3px solid #8b5cf6' : 'none',
              }}>
                {row.competitor}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pros and Cons */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '20px', color: '#f0f0f5' }}>
          Pros and Cons
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {/* Coach Atlas */}
          <div style={{
            background: '#1a1a24',
            border: '1px solid #3B82F640',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#3B82F6', marginBottom: '16px' }}>
              Coach Atlas
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>Pros</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'none' }}>
                {post.atlasCoachPros.map((pro, i) => (
                  <li key={i} style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '6px', lineHeight: 1.5 }}>
                    <span style={{ color: '#22c55e', marginRight: '8px' }}>+</span>{pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>Cons</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'none' }}>
                {post.atlasCoachCons.map((con, i) => (
                  <li key={i} style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '6px', lineHeight: 1.5 }}>
                    <span style={{ color: '#ef4444', marginRight: '8px' }}>-</span>{con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Competitor */}
          <div style={{
            background: '#1a1a24',
            border: '1px solid #8b5cf640',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6', marginBottom: '16px' }}>
              {post.competitorName}
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>Pros</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'none' }}>
                {post.competitorPros.map((pro, i) => (
                  <li key={i} style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '6px', lineHeight: 1.5 }}>
                    <span style={{ color: '#22c55e', marginRight: '8px' }}>+</span>{pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>Cons</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'none' }}>
                {post.competitorCons.map((con, i) => (
                  <li key={i} style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '6px', lineHeight: 1.5 }}>
                    <span style={{ color: '#ef4444', marginRight: '8px' }}>-</span>{con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
        border: '1px solid #3B82F640',
        borderRadius: '12px',
        marginBottom: '40px',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#f0f0f5' }}>
          Our Verdict
        </h2>
        <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#e2e8f0', margin: 0 }}>
          {post.verdict}
        </p>
      </section>

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

      {/* Link to Roundup */}
      <div style={{
        padding: '20px 24px',
        background: '#12121a',
        border: '1px solid #2a2a3a',
        borderRadius: '10px',
        marginBottom: '40px',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          See how {post.competitorName} ranks in our full category roundup:{' '}
          <a
            href={`/blog/${post.roundupSlug}`}
            style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}
          >
            View the complete ranking &rarr;
          </a>
        </p>
      </div>

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
