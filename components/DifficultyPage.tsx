import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gameCategories } from '../src/data/gameCategories';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

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

const levelMeta: Record<DifficultyLevel, {
  title: string;
  description: string;
  color: string;
  icon: string;
  nextLevel: DifficultyLevel | null;
  prevLevel: DifficultyLevel | null;
}> = {
  beginner: {
    title: 'Beginner',
    description: 'Start here if you are new to physics and engineering concepts. These simulations introduce foundational ideas with guided exploration, intuitive visuals, and gentle difficulty curves.',
    color: '#22c55e',
    icon: '🌱',
    nextLevel: 'intermediate',
    prevLevel: null,
  },
  intermediate: {
    title: 'Intermediate',
    description: 'Build on your foundational knowledge with more complex simulations. These games introduce quantitative relationships, multi-variable interactions, and deeper analysis.',
    color: '#f59e0b',
    icon: '🔧',
    nextLevel: 'advanced',
    prevLevel: 'beginner',
  },
  advanced: {
    title: 'Advanced',
    description: 'Challenge yourself with expert-level simulations that cover cutting-edge topics, multi-step problem solving, and real-world engineering scenarios.',
    color: '#ef4444',
    icon: '🚀',
    nextLevel: null,
    prevLevel: 'intermediate',
  },
};

/**
 * Assign difficulty based on position within category.
 * First third = beginner, middle third = intermediate, last third = advanced.
 */
function getGamesByDifficulty(level: DifficultyLevel): { categoryName: string; categoryIcon: string; categoryId: string; games: { name: string; slug: string }[] }[] {
  const result: { categoryName: string; categoryIcon: string; categoryId: string; games: { name: string; slug: string }[] }[] = [];

  for (const cat of gameCategories) {
    const allGames: string[] = [];
    for (const sub of cat.subcategories) {
      allGames.push(...sub.games);
    }
    const uniqueGames = [...new Set(allGames)];
    const total = uniqueGames.length;

    const filtered: { name: string; slug: string }[] = [];
    uniqueGames.forEach((game, index) => {
      const ratio = index / total;
      let gameDifficulty: DifficultyLevel;
      if (ratio < 0.33) gameDifficulty = 'beginner';
      else if (ratio < 0.66) gameDifficulty = 'intermediate';
      else gameDifficulty = 'advanced';

      if (gameDifficulty === level) {
        filtered.push({ name: slugToTitle(toSlug(game)), slug: toSlug(game) });
      }
    });

    if (filtered.length > 0) {
      result.push({
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryId: cat.id,
        games: filtered,
      });
    }
  }

  return result;
}

export default function DifficultyPage() {
  const { level } = useParams<{ level: string }>();
  const validLevel = (level && level in levelMeta) ? level as DifficultyLevel : null;
  const meta = validLevel ? levelMeta[validLevel] : null;
  const groupedGames = validLevel ? getGamesByDifficulty(validLevel) : [];
  const totalGames = groupedGames.reduce((sum, g) => sum + g.games.length, 0);

  useEffect(() => {
    if (!meta || !validLevel) return;
    updateMeta({
      title: `${meta.title} Physics Simulations | Atlas Coach`,
      description: `${meta.description} Browse ${totalGames}+ interactive simulations at the ${validLevel} level.`,
      canonicalUrl: `/difficulty/${validLevel}`,
    });
  }, [meta, validLevel, totalGames]);

  if (!meta || !validLevel) {
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Invalid Difficulty Level</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Choose from beginner, intermediate, or advanced.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(l => (
              <a
                key={l}
                href={`/difficulty/${l}`}
                style={{
                  padding: '10px 20px',
                  background: levelMeta[l].color + '18',
                  border: `1px solid ${levelMeta[l].color}40`,
                  borderRadius: '8px',
                  color: levelMeta[l].color,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {levelMeta[l].title}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Difficulty Levels', url: '/games' },
    { name: meta.title, url: `/difficulty/${validLevel}` },
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

        {/* Hero */}
        <header style={{
          padding: '48px 0',
          borderBottom: '1px solid #2a2a3a',
          marginBottom: '48px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px' }}>{meta.icon}</span>
            <div>
              <h1 style={{
                fontSize: '36px',
                fontWeight: 800,
                margin: 0,
                color: meta.color,
              }}>
                {meta.title} Level
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0' }}>
                {totalGames} simulations
              </p>
            </div>
          </div>
          <p style={{
            color: '#e2e8f0',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '700px',
          }}>
            {meta.description}
          </p>
        </header>

        {/* Progression path */}
        <section style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '48px',
          flexWrap: 'wrap',
        }}>
          {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(l => {
            const isActive = l === validLevel;
            const lm = levelMeta[l];
            return (
              <a
                key={l}
                href={`/difficulty/${l}`}
                style={{
                  flex: '1 1 200px',
                  padding: '16px 20px',
                  background: isActive ? `${lm.color}18` : '#1a1a24',
                  border: `2px solid ${isActive ? lm.color : '#2a2a3a'}`,
                  borderRadius: '10px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.borderColor = lm.color; }}
                onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{lm.icon}</div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isActive ? lm.color : '#94a3b8',
                }}>
                  {lm.title}
                </div>
              </a>
            );
          })}
        </section>

        {/* Games grouped by category */}
        {groupedGames.map(group => (
          <section key={group.categoryId} style={{ marginBottom: '48px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '24px' }}>{group.categoryIcon}</span>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
              }}>
                <a
                  href={`/learn/${group.categoryId}`}
                  style={{ color: '#f0f0f5', textDecoration: 'none' }}
                  onMouseOver={e => { (e.target as HTMLAnchorElement).style.color = '#3B82F6'; }}
                  onMouseOut={e => { (e.target as HTMLAnchorElement).style.color = '#f0f0f5'; }}
                >
                  {group.categoryName}
                </a>
              </h2>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                ({group.games.length})
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
            }}>
              {group.games.map(game => (
                <a
                  key={game.slug}
                  href={`/games/${game.slug}`}
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
                    transition: 'border-color 0.2s ease, transform 0.15s ease',
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = meta.color;
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                  }}
                >
                  {game.name}
                </a>
              ))}
            </div>
          </section>
        ))}

        {/* Next/prev progression */}
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '32px 0',
          borderTop: '1px solid #2a2a3a',
        }}>
          {meta.prevLevel ? (
            <a
              href={`/difficulty/${meta.prevLevel}`}
              style={{
                color: '#3B82F6',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              &larr; {levelMeta[meta.prevLevel].title} Level
            </a>
          ) : <span />}
          {meta.nextLevel ? (
            <a
              href={`/difficulty/${meta.nextLevel}`}
              style={{
                color: '#3B82F6',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              {levelMeta[meta.nextLevel].title} Level &rarr;
            </a>
          ) : <span />}
        </nav>
      </div>
    </div>
  );
}
