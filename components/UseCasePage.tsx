import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUseCaseBySlug, useCaseEntries } from '../src/data/useCases';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

export default function UseCasePage() {
  const { slug } = useParams<{ slug: string }>();
  const useCase = slug ? getUseCaseBySlug(slug) : undefined;

  useEffect(() => {
    if (!useCase) return;
    updateMeta({
      title: `${useCase.title} | Coach Atlas`,
      description: useCase.description,
      canonicalUrl: `/use-cases/${useCase.slug}`,
    });
  }, [useCase]);

  if (!useCase) {
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Use Case Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The page you are looking for does not exist.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {useCaseEntries.slice(0, 6).map(uc => (
              <a
                key={uc.slug}
                href={`/use-cases/${uc.slug}`}
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
                {uc.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Use Cases', url: '/games' },
    { name: useCase.title, url: `/use-cases/${useCase.slug}` },
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

        {/* Hero */}
        <header style={{
          padding: '64px 0 48px',
          textAlign: 'center',
          borderBottom: '1px solid #2a2a3a',
          marginBottom: '48px',
        }}>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 16px',
          }}>
            {useCase.headline}
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '18px',
            lineHeight: 1.7,
            maxWidth: '650px',
            margin: '0 auto 32px',
          }}>
            {useCase.description}
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
            {useCase.ctaText}
          </a>
        </header>

        {/* Benefits */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '32px' }}>
            Why Coach Atlas?
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {useCase.benefits.map((benefit, i) => (
              <div
                key={i}
                style={{
                  padding: '24px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  background: '#3B82F620',
                  borderRadius: '6px',
                  color: '#3B82F6',
                  fontSize: '14px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <p style={{ color: '#e2e8f0', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                  {benefit}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured simulations */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>
            Featured Simulations
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {useCase.featuredGameSlugs.map(slug => (
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

        {/* Browse categories */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
            Browse Related Categories
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {useCase.featuredCategories.map(cat => (
              <a
                key={cat}
                href={`/learn/${cat}`}
                style={{
                  padding: '10px 20px',
                  background: '#12121a',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
              >
                {cat}
              </a>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{
          padding: '48px 32px',
          background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
          border: '1px solid #3B82F640',
          borderRadius: '16px',
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
            Ready to Get Started?
          </h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '16px',
            marginBottom: '24px',
            maxWidth: '500px',
            margin: '0 auto 24px',
          }}>
            342 interactive physics and engineering simulations, free to explore.
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
            {useCase.ctaText}
          </a>
        </section>

        {/* Other use cases */}
        <section style={{ padding: '32px 0', borderTop: '1px solid #2a2a3a' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
            Other Use Cases
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {useCaseEntries
              .filter(uc => uc.slug !== useCase.slug)
              .slice(0, 6)
              .map(uc => (
                <a
                  key={uc.slug}
                  href={`/use-cases/${uc.slug}`}
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
                  {uc.title}
                </a>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
