import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gameCategories, getGamesInCategory } from '../src/data/gameCategories';
import { updateMeta } from '../lib/seo';
import { courseSchema } from '../lib/seoSchemas';
import FAQSection from './FAQSection';
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

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = gameCategories.find(c => c.id === categoryId);

  useEffect(() => {
    if (!category) return;
    const allGames = getGamesInCategory(category.id);
    updateMeta({
      title: `${category.name} - Interactive Physics Simulations | Atlas Coach`,
      description: `${category.description}. Explore ${allGames.length}+ interactive games and simulations covering ${category.subcategories.map(s => s.name).join(', ')}.`,
      canonicalUrl: `/learn/${category.id}`,
      jsonLd: courseSchema({
        name: category.name,
        description: category.description,
        url: `/learn/${category.id}`,
        gameCount: allGames.length,
      }),
    });
  }, [category]);

  if (!category) {
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Category Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The category you are looking for does not exist.</p>
          <a href="/games" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '16px' }}>
            Browse all games
          </a>
        </div>
      </div>
    );
  }

  const allGames = getGamesInCategory(category.id);

  const faqItems = [
    {
      question: `What topics are covered in ${category.name}?`,
      answer: `${category.name} covers ${category.subcategories.map(s => s.name).join(', ')}. Each topic includes interactive simulations where you predict, experiment, and test your understanding.`,
    },
    {
      question: `How many ${category.name} games are available?`,
      answer: `There are ${allGames.length} interactive simulations in the ${category.name} category, spanning ${category.subcategories.length} subcategories.`,
    },
    {
      question: 'Do I need prior knowledge to start?',
      answer: 'No. Each simulation starts with a hook that introduces the concept intuitively. Games range from beginner to advanced, and the AI coach adapts to your level.',
    },
    {
      question: 'Can I track my progress?',
      answer: 'Yes. Atlas Coach uses spaced repetition (SM-2 algorithm) to schedule reviews and tracks your mastery across all games in this category.',
    },
  ];

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: category.name, url: `/learn/${category.id}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Hero section */}
        <header style={{
          padding: '48px 0',
          borderBottom: '1px solid #2a2a3a',
          marginBottom: '48px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '48px' }}>{category.icon}</span>
            <div>
              <h1 style={{
                fontSize: '36px',
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.2,
              }}>
                {category.name}
              </h1>
              <p style={{
                color: '#94a3b8',
                fontSize: '16px',
                margin: '4px 0 0',
              }}>
                {allGames.length} interactive simulations
              </p>
            </div>
          </div>
          <p style={{
            color: '#e2e8f0',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '700px',
          }}>
            {category.description}. Explore interactive games that let you predict outcomes,
            experiment with real physics, and build deep intuition through hands-on learning.
          </p>
        </header>

        {/* Subcategory sections */}
        {category.subcategories.map(sub => (
          <section key={sub.name} style={{ marginBottom: '48px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#f0f0f5',
              marginBottom: '20px',
              paddingBottom: '8px',
              borderBottom: '1px solid #2a2a3a',
            }}>
              {sub.name}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              {sub.games.map(game => {
                const slug = toSlug(game);
                const title = slugToTitle(slug);
                return (
                  <a
                    key={game}
                    href={`/games/${slug}`}
                    style={{
                      display: 'block',
                      padding: '20px',
                      background: '#1a1a24',
                      border: '1px solid #2a2a3a',
                      borderRadius: '10px',
                      textDecoration: 'none',
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
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#f0f0f5',
                      margin: '0 0 8px 0',
                    }}>
                      {title}
                    </h3>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '13px',
                      margin: 0,
                    }}>
                      Interactive simulation
                    </p>
                  </a>
                );
              })}
            </div>
          </section>
        ))}

        {/* FAQ Section */}
        <FAQSection items={faqItems} />

        {/* Category navigation */}
        <nav style={{
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
            Explore Other Categories
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {gameCategories
              .filter(c => c.id !== category.id)
              .map(cat => (
                <a
                  key={cat.id}
                  href={`/learn/${cat.id}`}
                  style={{
                    padding: '8px 16px',
                    background: '#12121a',
                    border: '1px solid #2a2a3a',
                    borderRadius: '20px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                >
                  {cat.icon} {cat.name}
                </a>
              ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
