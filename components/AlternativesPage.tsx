import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAlternativeBySlug, alternativeEntries } from '../src/data/alternatives';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

export default function AlternativesPage() {
  const { slug } = useParams<{ slug: string }>();
  const entry = slug ? getAlternativeBySlug(slug) : undefined;

  useEffect(() => {
    if (!entry) return;
    updateMeta({
      title: `${entry.title} | Detailed Comparison`,
      description: entry.description,
      canonicalUrl: `/alternatives/${entry.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: entry.title,
        description: entry.description,
        url: `https://atlascoach-5e3af.web.app/alternatives/${entry.slug}`,
        author: {
          '@type': 'Organization',
          name: 'Atlas Coach',
        },
        about: [
          { '@type': 'Thing', name: 'Atlas Coach' },
          { '@type': 'Thing', name: entry.competitor },
        ],
      },
    });
  }, [entry]);

  if (!entry) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f0f0f5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Comparison Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>See how Atlas Coach compares to other platforms.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {alternativeEntries.map(alt => (
              <a
                key={alt.slug}
                href={`/alternatives/${alt.slug}`}
                style={{
                  padding: '8px 16px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#f0f0f5',
                  textDecoration: 'none',
                  fontSize: '13px',
                }}
              >
                vs {alt.competitor}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Alternatives', url: '/games' },
    { name: `vs ${entry.competitor}`, url: `/alternatives/${entry.slug}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <header style={{ padding: '40px 0 32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 16px',
          }}>
            {entry.title}
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '750px',
          }}>
            {entry.description}
          </p>
        </header>

        {/* Comparison table */}
        <section style={{ marginBottom: '48px' }}>
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
                Atlas Coach
              </div>
              <div style={{
                padding: '16px 20px',
                fontWeight: 700,
                fontSize: '14px',
                color: '#8b5cf6',
              }}>
                {entry.competitor}
              </div>
            </div>

            {/* Table rows */}
            {entry.criteria.map((row, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr 1fr',
                  borderBottom: index < entry.criteria.length - 1 ? '1px solid #2a2a3a' : 'none',
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
                  lineHeight: 1.5,
                  background: '#1a1a24',
                  borderRight: '1px solid #2a2a3a',
                }}>
                  {row.atlasCoach}
                </div>
                <div style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                  background: '#1a1a24',
                }}>
                  {row.competitor}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Conclusion */}
        <section style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
          border: '1px solid #3B82F640',
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
            Conclusion
          </h2>
          <p style={{ color: '#e2e8f0', fontSize: '16px', lineHeight: 1.7, margin: '0 0 16px' }}>
            {entry.conclusion}
          </p>
          <p style={{
            color: '#3B82F6',
            fontSize: '15px',
            fontWeight: 600,
            margin: 0,
          }}>
            {entry.bestFor}
          </p>
        </section>

        {/* CTA */}
        <section style={{
          padding: '40px 32px',
          background: '#1a1a24',
          border: '1px solid #2a2a3a',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
            Try Atlas Coach Free
          </h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '15px',
            marginBottom: '24px',
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

        {/* Other alternatives */}
        <section style={{ padding: '32px 0', borderTop: '1px solid #2a2a3a' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
            More Comparisons
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {alternativeEntries
              .filter(a => a.slug !== entry.slug)
              .map(a => (
                <a
                  key={a.slug}
                  href={`/alternatives/${a.slug}`}
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
                  vs {a.competitor}
                </a>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
