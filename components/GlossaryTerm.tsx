import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getGlossaryBySlug, glossaryEntries } from '../src/data/glossary';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

export default function GlossaryTerm() {
  const { term } = useParams<{ term: string }>();
  const entry = term ? getGlossaryBySlug(term) : undefined;

  useEffect(() => {
    if (!entry) return;
    updateMeta({
      title: `${entry.term} — Definition & Interactive Simulations | Atlas Coach`,
      description: entry.definition,
      canonicalUrl: `/glossary/${entry.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: entry.term,
        description: entry.definition,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: 'Atlas Coach Physics & Engineering Glossary',
          url: 'https://atlascoach-5e3af.web.app/glossary',
        },
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Term Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The glossary term you are looking for does not exist.</p>
          <a href="/glossary" style={{ color: '#3B82F6', textDecoration: 'none' }}>Browse the glossary</a>
        </div>
      </div>
    );
  }

  const relatedEntries = entry.relatedTerms
    .map(slug => glossaryEntries.find(e => e.slug === slug))
    .filter(Boolean) as typeof glossaryEntries;

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Glossary', url: '/glossary' },
    { name: entry.term, url: `/glossary/${entry.slug}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <Breadcrumbs items={breadcrumbItems} />

        <header style={{ padding: '40px 0 32px' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: '#12121a',
            border: '1px solid #2a2a3a',
            borderRadius: '4px',
            color: '#94a3b8',
            fontSize: '12px',
            textTransform: 'capitalize',
            marginBottom: '12px',
          }}>
            {entry.category}
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 16px' }}>
            {entry.term}
          </h1>
          {entry.unit && (
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 8px' }}>
              SI Unit: <span style={{ color: '#3B82F6', fontWeight: 600 }}>{entry.unit}</span>
            </p>
          )}
          {entry.formula && (
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 8px' }}>
              Formula: <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>{entry.formula}</span>
            </p>
          )}
        </header>

        {/* Definition */}
        <section style={{
          padding: '24px',
          background: '#1a1a24',
          border: '1px solid #2a2a3a',
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Definition</h2>
          <p style={{ color: '#e2e8f0', fontSize: '16px', lineHeight: 1.7, margin: 0 }}>
            {entry.definition}
          </p>
        </section>

        {/* Interactive simulations */}
        {entry.relatedGameSlugs.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Interactive Simulations
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}>
              {entry.relatedGameSlugs.map(slug => (
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
        )}

        {/* Related terms */}
        {relatedEntries.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Related Terms
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {relatedEntries.map(related => (
                <a
                  key={related.slug}
                  href={`/glossary/${related.slug}`}
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
                  {related.term}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* See also */}
        {entry.seeAlso && entry.seeAlso.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
              Learn More
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {entry.seeAlso.map(link => (
                <a
                  key={link}
                  href={link.startsWith('/') ? link : `/${link}`}
                  style={{
                    color: '#3B82F6',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Back to glossary */}
        <section style={{ padding: '24px 0', borderTop: '1px solid #2a2a3a' }}>
          <a
            href="/glossary"
            style={{
              color: '#3B82F6',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            &larr; Back to Glossary
          </a>
        </section>
      </div>
    </div>
  );
}
