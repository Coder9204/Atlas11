import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getComparisonBySlug, comparisons } from '../src/data/comparisons';
import { updateMeta } from '../lib/seo';
import { comparisonSchema, faqPageSchema } from '../lib/seoSchemas';
import Breadcrumbs from './Breadcrumbs';
import FAQSection from './FAQSection';

export default function ComparisonPage() {
  const { comparisonSlug } = useParams<{ comparisonSlug: string }>();
  const comparison = comparisonSlug ? getComparisonBySlug(comparisonSlug) : undefined;

  useEffect(() => {
    if (!comparison) return;
    updateMeta({
      title: `${comparison.title} | Atlas Coach`,
      description: comparison.description,
      canonicalUrl: `/compare/${comparison.comparisonSlug}`,
      jsonLd: comparisonSchema({
        title: comparison.title,
        description: comparison.description,
        url: `/compare/${comparison.comparisonSlug}`,
        sideA: comparison.slugA,
        sideB: comparison.slugB,
      }),
    });
  }, [comparison]);

  if (!comparison) {
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
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The comparison you are looking for does not exist.</p>
          <a href="/games" style={{ color: '#3B82F6', textDecoration: 'none' }}>Browse all games</a>
        </div>
      </div>
    );
  }

  const faqItems = [
    {
      question: `What is the main difference between the two?`,
      answer: comparison.criteria[0]
        ? `${comparison.criteria[0].criterion}: ${comparison.criteria[0].sideA} In contrast, ${comparison.criteria[0].sideB}`
        : comparison.description,
    },
    {
      question: 'Which one should I learn first?',
      answer: 'Both sides of this comparison are important to understand. Start with whichever concept connects most to your current knowledge or coursework, then explore the other for contrast.',
    },
    {
      question: 'Are there interactive simulations for these concepts?',
      answer: 'Yes. Atlas Coach provides interactive games for both sides of this comparison. You can predict outcomes, experiment with variables, and test your understanding.',
    },
  ];

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Comparisons', url: '/games' },
    { name: comparison.title.split(':')[0], url: `/compare/${comparison.comparisonSlug}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <header style={{ padding: '40px 0 32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 16px',
          }}>
            {comparison.title}
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '750px',
          }}>
            {comparison.description}
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
              gridTemplateColumns: '200px 1fr 1fr',
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
                Side A
              </div>
              <div style={{
                padding: '16px 20px',
                fontWeight: 700,
                fontSize: '14px',
                color: '#8b5cf6',
              }}>
                Side B
              </div>
            </div>

            {/* Table rows */}
            {comparison.criteria.map((row, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr 1fr',
                  borderBottom: index < comparison.criteria.length - 1 ? '1px solid #2a2a3a' : 'none',
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
                  {row.sideA}
                </div>
                <div style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                  background: '#1a1a24',
                }}>
                  {row.sideB}
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
          marginBottom: '48px',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            Conclusion
          </h2>
          <p style={{
            color: '#e2e8f0',
            fontSize: '16px',
            lineHeight: 1.7,
          }}>
            {comparison.conclusion}
          </p>
        </section>

        {/* Related games */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            Try the Interactive Simulations
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {comparison.relatedGames.map(slug => (
              <a
                key={slug}
                href={`/games/${slug}`}
                style={{
                  display: 'block',
                  padding: '14px 18px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#f0f0f5',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
              >
                {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </a>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <FAQSection items={faqItems} />

        {/* More comparisons */}
        <section style={{
          padding: '32px 0',
          borderTop: '1px solid #2a2a3a',
          marginTop: '16px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#94a3b8',
            marginBottom: '12px',
          }}>
            More Comparisons
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {comparisons
              .filter(c => c.comparisonSlug !== comparison.comparisonSlug)
              .slice(0, 6)
              .map(c => (
                <a
                  key={c.comparisonSlug}
                  href={`/compare/${c.comparisonSlug}`}
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
                  {c.title.split(':')[0]}
                </a>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
