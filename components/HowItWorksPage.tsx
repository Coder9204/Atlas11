import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getHowItWorksBySlug, howItWorks } from '../src/data/howItWorks';
import { updateMeta } from '../lib/seo';
import { howItWorksSchema } from '../lib/seoSchemas';
import Breadcrumbs from './Breadcrumbs';
import FAQSection from './FAQSection';

export default function HowItWorksPage() {
  const { conceptSlug } = useParams<{ conceptSlug: string }>();
  const entry = conceptSlug ? getHowItWorksBySlug(conceptSlug) : undefined;

  useEffect(() => {
    if (!entry) return;
    updateMeta({
      title: `${entry.title} | Atlas Coach`,
      description: entry.shortAnswer,
      canonicalUrl: `/how/${entry.slug}`,
      jsonLd: howItWorksSchema({
        title: entry.title,
        description: entry.shortAnswer,
        url: `/how/${entry.slug}`,
        steps: entry.steps,
      }),
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Article Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The explanation you are looking for does not exist.</p>
          <a href="/games" style={{ color: '#3B82F6', textDecoration: 'none' }}>Browse all games</a>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'How It Works', url: '/games' },
    { name: entry.title.replace('How Do ', '').replace('How Does ', '').replace('?', ''), url: `/how/${entry.slug}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* H1 as question */}
        <header style={{ padding: '40px 0 32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 20px',
          }}>
            {entry.title}
          </h1>
          {/* Short answer summary */}
          <div style={{
            padding: '20px 24px',
            background: '#1a1a3a',
            border: '1px solid #3B82F640',
            borderRadius: '10px',
            borderLeft: '4px solid #3B82F6',
          }}>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.7,
              color: '#e2e8f0',
              margin: 0,
              fontWeight: 500,
            }}>
              {entry.shortAnswer}
            </p>
          </div>
        </header>

        {/* Step-by-step explanation */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '24px',
          }}>
            Step-by-Step Explanation
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {entry.steps.map((step, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '24px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '10px',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#3B82F618',
                  border: '2px solid #3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#3B82F6',
                  flexShrink: 0,
                }}>
                  {index + 1}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#f0f0f5',
                    margin: '0 0 8px',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    margin: 0,
                  }}>
                    {step.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Real-world applications */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            Real-World Applications
          </h2>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {entry.applications.map((app, index) => (
              <li
                key={index}
                style={{
                  padding: '14px 20px',
                  background: '#12121a',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <span style={{ color: '#22c55e', fontSize: '12px', marginTop: '3px' }}>&#9679;</span>
                {app}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA to try the game */}
        <section style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
          border: '1px solid #3B82F640',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            See It in Action
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px' }}>
            Try the interactive {entry.relatedGameName} simulation. Predict, experiment, and test
            your understanding with hands-on physics.
          </p>
          <a
            href={`/games/${entry.relatedGameSlug}`}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: '#3B82F6',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#2563eb'; }}
            onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#3B82F6'; }}
          >
            Play {entry.relatedGameName}
          </a>
        </section>

        {/* FAQ */}
        <FAQSection items={entry.faq} />

        {/* More how-it-works articles */}
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
            More Explanations
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {howItWorks
              .filter(h => h.slug !== entry.slug)
              .map(h => (
                <a
                  key={h.slug}
                  href={`/how/${h.slug}`}
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
                  {h.title}
                </a>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
