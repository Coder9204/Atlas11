import React, { useState, useEffect } from 'react';
import { updateMeta } from '../lib/seo';
import { allBlogPosts } from '../src/data/blogPostsIndex';
import type { BlogPost } from '../src/data/blogPostsIndex';
import Breadcrumbs from './Breadcrumbs';

interface BlogPostEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
}

const BLOG_CATEGORIES = [
  'All', 'App Comparisons', 'App Roundups',
  'Physics', 'Engineering', 'AI & Computing', 'Study Tips', 'Product Updates',
];

const POSTS_PER_PAGE = 12;

/** Legacy placeholder blog posts */
const legacyPosts: BlogPostEntry[] = [
  {
    slug: 'why-interactive-simulations-beat-textbooks',
    title: 'Why Interactive Simulations Beat Textbooks for Learning Physics',
    description: 'Research shows active learning outperforms passive reading by 2x. Here is how Coach Atlas applies cognitive science to physics education.',
    date: '2025-04-15',
    category: 'Study Tips',
    readTime: '6 min',
  },
  {
    slug: 'understanding-newtons-third-law-intuitively',
    title: 'Understanding Newton\'s Third Law Intuitively',
    description: 'Action and reaction are equal and opposite, but why does a truck crush a car in a head-on collision? We clear up the most common misconception in mechanics.',
    date: '2025-04-10',
    category: 'Physics',
    readTime: '5 min',
  },
  {
    slug: 'how-gpu-parallelism-mirrors-physics-simulations',
    title: 'How GPU Parallelism Mirrors Physics Simulations',
    description: 'The same math that drives particle simulations also powers modern AI inference. Explore the deep connection between physics engines and neural networks.',
    date: '2025-04-05',
    category: 'AI & Computing',
    readTime: '8 min',
  },
  {
    slug: 'solar-cell-efficiency-explained-simply',
    title: 'Solar Cell Efficiency Explained Simply',
    description: 'The Shockley-Queisser limit caps single-junction cells at 33%. But what does that actually mean, and how are engineers pushing past it?',
    date: '2025-03-28',
    category: 'Engineering',
    readTime: '7 min',
  },
  {
    slug: 'spaced-repetition-for-stem-learning',
    title: 'Spaced Repetition for STEM Learning: A Practical Guide',
    description: 'How the SM-2 algorithm schedules reviews at the perfect time, and why Coach Atlas uses it to help you remember what you learn.',
    date: '2025-03-20',
    category: 'Study Tips',
    readTime: '5 min',
  },
  {
    slug: 'semiconductor-fabrication-for-beginners',
    title: 'Semiconductor Fabrication for Beginners',
    description: 'From sand to silicon chip: a visual guide to the 500+ steps involved in manufacturing a modern processor.',
    date: '2025-03-15',
    category: 'Engineering',
    readTime: '10 min',
  },
  {
    slug: 'what-is-thermal-throttling',
    title: 'What Is Thermal Throttling and Why Does It Slow Your Laptop?',
    description: 'Your CPU clock speed drops when it gets hot. Learn the physics of heat dissipation and how chip designers fight the thermal wall.',
    date: '2025-03-10',
    category: 'AI & Computing',
    readTime: '6 min',
  },
  {
    slug: 'the-physics-of-roller-coasters',
    title: 'The Physics of Roller Coasters: Energy, Forces, and G-Loads',
    description: 'Every twist, loop, and drop on a roller coaster is governed by the same conservation laws you learn in introductory mechanics.',
    date: '2025-03-01',
    category: 'Physics',
    readTime: '7 min',
  },
];

function blogPostToEntry(p: BlogPost): BlogPostEntry {
  return {
    slug: p.slug,
    title: p.title,
    description: p.metaDescription,
    date: p.date,
    category: p.category,
    readTime: p.readTime,
  };
}

export default function BlogIndex() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    updateMeta({
      title: 'Blog - Physics, Engineering & AI Insights | Coach Atlas',
      description: 'Articles, app comparisons, and guides on physics, engineering, AI, and effective STEM learning. Practical insights from the Coach Atlas team.',
      canonicalUrl: '/blog',
    });
  }, []);

  // Merge data-driven posts with legacy posts
  const allEntries: BlogPostEntry[] = [
    ...allBlogPosts.map(blogPostToEntry),
    ...legacyPosts,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredPosts = activeCategory === 'All'
    ? allEntries
    : allEntries.filter(p => p.category === activeCategory);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  // Featured roundups
  const roundupPosts = allBlogPosts
    .filter(p => p.type === 'roundup')
    .map(blogPostToEntry);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
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

        {/* Header */}
        <header style={{ padding: '48px 0 32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            margin: '0 0 12px',
          }}>
            Coach Atlas Blog
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '600px',
          }}>
            Articles, app comparisons, and guides on physics, engineering, AI, and effective STEM learning.
          </p>
        </header>

        {/* Featured roundups section */}
        {roundupPosts.length > 0 && activeCategory === 'All' && currentPage === 1 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '16px',
              color: '#f0f0f5',
            }}>
              Featured Guides
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}>
              {roundupPosts.map(post => (
                <a
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
                    border: '1px solid #3B82F640',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s ease, transform 0.15s ease',
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F640';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{
                    padding: '3px 10px',
                    background: '#fbbf2420',
                    border: '1px solid #fbbf2440',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fbbf24',
                    alignSelf: 'flex-start',
                    marginBottom: '10px',
                  }}>
                    App Roundups
                  </span>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#f0f0f5',
                    margin: '0 0 6px',
                    lineHeight: 1.3,
                  }}>
                    {post.title}
                  </h3>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '13px',
                    lineHeight: 1.4,
                    margin: 0,
                  }}>
                    {post.description}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Category filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: '1px solid #2a2a3a',
        }}>
          {BLOG_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  padding: '8px 18px',
                  background: isActive ? '#3B82F6' : '#1a1a24',
                  border: `1px solid ${isActive ? '#3B82F6' : '#2a2a3a'}`,
                  borderRadius: '20px',
                  color: isActive ? '#fff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Post count */}
        <div style={{ marginBottom: '16px', color: '#4a4a5a', fontSize: '13px' }}>
          {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
        </div>

        {/* Blog post grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {paginatedPosts.map(post => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '12px',
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}>
                <span style={{
                  padding: '3px 10px',
                  background: '#3B82F618',
                  border: '1px solid #3B82F640',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#3B82F6',
                }}>
                  {post.category}
                </span>
                <span style={{ color: '#4a4a5a', fontSize: '12px' }}>
                  {post.readTime}
                </span>
              </div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#f0f0f5',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                {post.title}
              </h2>
              <p style={{
                color: '#94a3b8',
                fontSize: '14px',
                lineHeight: 1.5,
                margin: '0 0 16px',
                flex: 1,
              }}>
                {post.description}
              </p>
              <div style={{
                color: '#4a4a5a',
                fontSize: '12px',
              }}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </a>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '64px 0',
            color: '#94a3b8',
          }}>
            <p style={{ fontSize: '16px' }}>No posts in this category yet. Check back soon.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            padding: '40px 0',
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                background: currentPage === 1 ? '#12121a' : '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: currentPage === 1 ? '#4a4a5a' : '#f0f0f5',
                fontSize: '14px',
                cursor: currentPage === 1 ? 'default' : 'pointer',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '8px 14px',
                  background: page === currentPage ? '#3B82F6' : '#1a1a24',
                  border: `1px solid ${page === currentPage ? '#3B82F6' : '#2a2a3a'}`,
                  borderRadius: '8px',
                  color: page === currentPage ? '#fff' : '#94a3b8',
                  fontSize: '14px',
                  fontWeight: page === currentPage ? 700 : 400,
                  cursor: 'pointer',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 16px',
                background: currentPage === totalPages ? '#12121a' : '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: currentPage === totalPages ? '#4a4a5a' : '#f0f0f5',
                fontSize: '14px',
                cursor: currentPage === totalPages ? 'default' : 'pointer',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
