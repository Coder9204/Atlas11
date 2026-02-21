import React, { useEffect, useMemo, useState } from 'react';
import { glossaryEntries } from '../src/data/glossary';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

export default function GlossaryIndex() {
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    updateMeta({
      title: 'Physics & Engineering Glossary | Atlas Coach',
      description: 'Browse definitions for 100+ physics and engineering terms. Each term links to interactive simulations, related concepts, and formulas.',
      canonicalUrl: '/glossary',
    });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(glossaryEntries.map(e => e.category));
    return Array.from(cats).sort();
  }, []);

  const filtered = useMemo(() => {
    let entries = glossaryEntries;
    if (activeCategory) {
      entries = entries.filter(e => e.category === activeCategory);
    }
    if (filter) {
      const q = filter.toLowerCase();
      entries = entries.filter(e =>
        e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)
      );
    }
    return entries.sort((a, b) => a.term.localeCompare(b.term));
  }, [filter, activeCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const entry of filtered) {
      const letter = entry.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(entry);
    }
    return groups;
  }, [filtered]);

  const letters = Object.keys(grouped).sort();

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Glossary', url: '/glossary' },
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
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px' }}>
            Physics & Engineering Glossary
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '18px', lineHeight: 1.6, maxWidth: '700px' }}>
            Definitions for {glossaryEntries.length} key terms in physics, engineering, semiconductors, and computing. Each term links to interactive simulations.
          </p>
        </header>

        {/* Search + Category filter */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <input
            type="text"
            placeholder="Search terms..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              background: '#1a1a24',
              border: '1px solid #2a2a3a',
              borderRadius: '8px',
              color: '#f0f0f5',
              fontSize: '14px',
              flex: '1 1 200px',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                padding: '8px 14px',
                background: activeCategory === null ? '#3B82F6' : '#1a1a24',
                border: '1px solid',
                borderColor: activeCategory === null ? '#3B82F6' : '#2a2a3a',
                borderRadius: '6px',
                color: '#f0f0f5',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                style={{
                  padding: '8px 14px',
                  background: activeCategory === cat ? '#3B82F6' : '#1a1a24',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? '#3B82F6' : '#2a2a3a',
                  borderRadius: '6px',
                  color: '#f0f0f5',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Letter nav */}
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '32px',
          padding: '12px 0',
          borderBottom: '1px solid #2a2a3a',
        }}>
          {letters.map(letter => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '6px',
                color: '#3B82F6',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Term listing */}
        {letters.map(letter => (
          <section key={letter} id={`letter-${letter}`} style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#3B82F6',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid #2a2a3a',
            }}>
              {letter}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {grouped[letter].map(entry => (
                <a
                  key={entry.slug}
                  href={`/glossary/${entry.slug}`}
                  style={{
                    display: 'block',
                    padding: '16px 20px',
                    background: '#1a1a24',
                    border: '1px solid #2a2a3a',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', margin: '0 0 4px' }}>
                        {entry.term}
                        {entry.formula && (
                          <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '8px', fontSize: '14px' }}>
                            {entry.formula}
                          </span>
                        )}
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                        {entry.definition.length > 120 ? entry.definition.slice(0, 120) + '...' : entry.definition}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      background: '#12121a',
                      border: '1px solid #2a2a3a',
                      borderRadius: '4px',
                      color: '#94a3b8',
                      fontSize: '11px',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.category}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '48px 0' }}>
            No terms found matching your search.
          </p>
        )}
      </div>
    </div>
  );
}
