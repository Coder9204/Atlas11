import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTopicBySlug, topicEntries } from '../src/data/topics';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

export default function TopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const topic = slug ? getTopicBySlug(slug) : undefined;

  useEffect(() => {
    if (!topic) return;
    updateMeta({
      title: `${topic.title} — Interactive Simulations & Learning | Coach Atlas`,
      description: topic.description,
      canonicalUrl: `/topics/${topic.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: topic.title,
        description: topic.description,
        url: `https://atlascoach-5e3af.web.app/topics/${topic.slug}`,
        provider: {
          '@type': 'Organization',
          name: 'Coach Atlas',
        },
        numberOfItems: topic.gameSlugs.length,
      },
    });
  }, [topic]);

  if (!topic) {
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Topic Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The topic you are looking for does not exist.</p>
          <a href="/games" style={{ color: '#3B82F6', textDecoration: 'none' }}>Browse all games</a>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Topics', url: '/games' },
    { name: topic.title, url: `/topics/${topic.slug}` },
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

        <header style={{ padding: '40px 0 32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 16px' }}>
            {topic.title}
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '18px', lineHeight: 1.6, maxWidth: '750px' }}>
            {topic.description}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
            {topic.gameSlugs.length} interactive simulations
          </p>
        </header>

        {/* Simulations grid */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>
            Interactive Simulations
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {topic.gameSlugs.map(slug => (
              <a
                key={slug}
                href={`/games/${slug}`}
                style={{
                  display: 'block',
                  padding: '16px 18px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '10px',
                  color: '#f0f0f5',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'border-color 0.2s ease, transform 0.15s ease',
                }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6';
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a';
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                }}
              >
                {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </a>
            ))}
          </div>
        </section>

        {/* Comparisons */}
        {topic.comparisonSlugs.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Concept Comparisons
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {topic.comparisonSlugs.map(slug => (
                <a
                  key={slug}
                  href={`/compare/${slug}`}
                  style={{
                    padding: '10px 18px',
                    background: '#1a1a24',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#8b5cf6'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                >
                  {slug.split('-vs-').map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' vs ')}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* How It Works */}
        {topic.howItWorksSlugs.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              How It Works Guides
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topic.howItWorksSlugs.map(slug => (
                <a
                  key={slug}
                  href={`/how/${slug}`}
                  style={{
                    display: 'block',
                    padding: '12px 18px',
                    background: '#1a1a24',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#10b981'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                >
                  How {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Works
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Glossary terms */}
        {topic.glossaryTerms.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Key Terms
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topic.glossaryTerms.map(slug => (
                <a
                  key={slug}
                  href={`/glossary/${slug}`}
                  style={{
                    padding: '6px 14px',
                    background: '#12121a',
                    border: '1px solid #2a2a3a',
                    borderRadius: '6px',
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: '13px',
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#f0f0f5';
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8';
                  }}
                >
                  {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related topics */}
        {topic.relatedTopics.length > 0 && (
          <section style={{ padding: '32px 0', borderTop: '1px solid #2a2a3a' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
              Related Topics
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {topic.relatedTopics.map(slug => {
                const related = topicEntries.find(t => t.slug === slug);
                return (
                  <a
                    key={slug}
                    href={`/topics/${slug}`}
                    style={{
                      padding: '10px 20px',
                      background: '#12121a',
                      border: '1px solid #2a2a3a',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                  >
                    {related?.title || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
