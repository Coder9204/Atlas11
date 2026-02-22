import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gameCategories } from '../src/data/gameCategories';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

/** Convert a PascalCase game name to a kebab-case slug. */
function toSlug(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

/** Convert a kebab-case slug to a readable title. */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Convert subcategory name to a URL-safe slug. */
function subcategoryToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Estimate difficulty from game position in list (simple heuristic). */
function estimateDifficulty(index: number, total: number): string {
  const ratio = index / total;
  if (ratio < 0.33) return 'Beginner';
  if (ratio < 0.66) return 'Intermediate';
  return 'Advanced';
}

export default function SubcategoryPage() {
  const { categoryId, subcategorySlug } = useParams<{ categoryId: string; subcategorySlug: string }>();

  const category = gameCategories.find(c => c.id === categoryId);
  const subcategory = category?.subcategories.find(
    s => subcategoryToSlug(s.name) === subcategorySlug
  );

  useEffect(() => {
    if (!category || !subcategory) return;
    updateMeta({
      title: `${subcategory.name} - ${category.name} | Coach Atlas`,
      description: `Learn ${subcategory.name} through ${subcategory.games.length} interactive simulations. Part of the ${category.name} category on Coach Atlas.`,
      canonicalUrl: `/learn/${category.id}/${subcategorySlug}`,
    });
  }, [category, subcategory, subcategorySlug]);

  if (!category || !subcategory) {
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

  const otherSubcategories = category.subcategories.filter(
    s => subcategoryToSlug(s.name) !== subcategorySlug
  );

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: category.name, url: `/learn/${category.id}` },
    { name: subcategory.name, url: `/learn/${category.id}/${subcategorySlug}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Topic intro */}
        <header style={{ padding: '40px 0 32px', borderBottom: '1px solid #2a2a3a' }}>
          <p style={{ color: '#3B82F6', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>
            {category.icon} {category.name}
          </p>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            {subcategory.name}
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '650px',
          }}>
            Master {subcategory.name.toLowerCase()} through {subcategory.games.length} interactive
            simulations. Predict, experiment, and test your understanding with AI-powered coaching.
          </p>
        </header>

        {/* Game list */}
        <section style={{ padding: '32px 0' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '20px',
          }}>
            Simulations ({subcategory.games.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {subcategory.games.map((game, index) => {
              const slug = toSlug(game);
              const title = slugToTitle(slug);
              const difficulty = estimateDifficulty(index, subcategory.games.length);
              const difficultyColor =
                difficulty === 'Beginner' ? '#22c55e' :
                difficulty === 'Intermediate' ? '#f59e0b' : '#ef4444';

              return (
                <a
                  key={game}
                  href={`/games/${slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    background: '#1a1a24',
                    border: '1px solid #2a2a3a',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                >
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#f0f0f5',
                      margin: '0 0 4px',
                    }}>
                      {title}
                    </h3>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '13px',
                      margin: 0,
                    }}>
                      Interactive {subcategory.name.toLowerCase()} simulation
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: difficultyColor,
                      background: `${difficultyColor}18`,
                      border: `1px solid ${difficultyColor}40`,
                    }}>
                      {difficulty}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <div style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
          border: '1px solid #3B82F640',
          borderRadius: '12px',
          textAlign: 'center',
          margin: '16px 0 48px',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Ready to Start Learning?
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
            Jump into your first {subcategory.name.toLowerCase()} simulation.
          </p>
          <a
            href={`/games/${toSlug(subcategory.games[0])}`}
            style={{
              display: 'inline-block',
              padding: '12px 32px',
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
            Start Learning
          </a>
        </div>

        {/* Related subcategories */}
        {otherSubcategories.length > 0 && (
          <section style={{
            padding: '32px 0',
            borderTop: '1px solid #2a2a3a',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: '16px',
            }}>
              Related Topics in {category.name}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {otherSubcategories.map(sub => (
                <a
                  key={sub.name}
                  href={`/learn/${category.id}/${subcategoryToSlug(sub.name)}`}
                  style={{
                    padding: '10px 18px',
                    background: '#12121a',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                >
                  {sub.name}
                  <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '12px' }}>
                    {sub.games.length} games
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
