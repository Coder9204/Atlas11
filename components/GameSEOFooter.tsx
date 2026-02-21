import React from 'react';
import { gameCategories, getCategoryForGame } from '../src/data/gameCategories';
import Breadcrumbs from './Breadcrumbs';

interface GameSEOFooterProps {
  slug: string;
}

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

/** Find all games in the same category as the given slug, excluding self. */
function findRelatedGames(slug: string): { name: string; slug: string }[] {
  for (const cat of gameCategories) {
    for (const sub of cat.subcategories) {
      for (const game of sub.games) {
        if (toSlug(game) === slug) {
          // Gather all games from this category
          const related: { name: string; slug: string }[] = [];
          for (const s of cat.subcategories) {
            for (const g of s.games) {
              const gs = toSlug(g);
              if (gs !== slug) {
                related.push({ name: slugToTitle(gs), slug: gs });
              }
            }
          }
          return related.slice(0, 8);
        }
      }
    }
  }
  return [];
}

/** Find the game's PascalCase name from its slug. */
function findGameName(slug: string): string {
  for (const cat of gameCategories) {
    for (const sub of cat.subcategories) {
      for (const game of sub.games) {
        if (toSlug(game) === slug) {
          return game;
        }
      }
    }
  }
  return slugToTitle(slug);
}

export default function GameSEOFooter({ slug }: GameSEOFooterProps) {
  const gameName = findGameName(slug);
  const category = getCategoryForGame(gameName);
  const relatedGames = findRelatedGames(slug);
  const title = slugToTitle(slug);

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    ...(category ? [{ name: category.name, url: `/learn/${category.id}` }] : []),
    { name: title, url: `/games/${slug}` },
  ];

  return (
    <footer style={{
      borderTop: '1px solid #2a2a3a',
      marginTop: '48px',
      padding: '32px 24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: '#0a0a0f',
    }}>
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Game description */}
      <div style={{ margin: '24px 0' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#f0f0f5',
          marginBottom: '8px',
        }}>
          About {title}
        </h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '14px',
          lineHeight: '1.6',
          maxWidth: '700px',
        }}>
          Master the concepts behind {title} through an interactive simulation.
          Predict outcomes, experiment with variables, and test your understanding
          with AI-powered coaching.
          {category && ` Part of the ${category.name} topic on Atlas Coach.`}
        </p>
      </div>

      {/* Related games grid */}
      {relatedGames.length > 0 && (
        <div style={{ margin: '32px 0' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#f0f0f5',
            marginBottom: '16px',
          }}>
            Related Simulations
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {relatedGames.map(game => (
              <a
                key={game.slug}
                href={`/games/${game.slug}`}
                style={{
                  display: 'block',
                  padding: '12px 16px',
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
                {game.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Category navigation */}
      <div style={{ margin: '32px 0 0' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#94a3b8',
          marginBottom: '12px',
        }}>
          Explore Categories
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {gameCategories.map(cat => (
            <a
              key={cat.id}
              href={`/learn/${cat.id}`}
              style={{
                padding: '6px 14px',
                background: '#12121a',
                border: '1px solid #2a2a3a',
                borderRadius: '20px',
                color: '#e2e8f0',
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6';
                (e.currentTarget as HTMLAnchorElement).style.color = '#3B82F6';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a';
                (e.currentTarget as HTMLAnchorElement).style.color = '#e2e8f0';
              }}
            >
              {cat.icon} {cat.name}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
