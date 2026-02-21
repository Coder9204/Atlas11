import React, { useState, useEffect } from 'react';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

interface BlogPostEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
}

const BLOG_CATEGORIES = ['All', 'Physics', 'Engineering', 'AI & Computing', 'Study Tips', 'Product Updates'];

/** Placeholder blog posts for the index page. Replace with MDX integration. */
const blogPosts: BlogPostEntry[] = [
  {
    slug: 'why-interactive-simulations-beat-textbooks',
    title: 'Why Interactive Simulations Beat Textbooks for Learning Physics',
    description: 'Research shows active learning outperforms passive reading by 2x. Here is how Atlas Coach applies cognitive science to physics education.',
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
    description: 'How the SM-2 algorithm schedules reviews at the perfect time, and why Atlas Coach uses it to help you remember what you learn.',
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

export default function BlogIndex() {
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    updateMeta({
      title: 'Blog - Physics, Engineering & AI Insights | Atlas Coach',
      description: 'Articles and guides on physics, engineering, AI, and effective STEM learning. Practical insights from the Atlas Coach team.',
      canonicalUrl: '/blog',
    });
  }, []);

  const filteredPosts = activeCategory === 'All'
    ? blogPosts
    : blogPosts.filter(p => p.category === activeCategory);

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
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <header style={{ padding: '48px 0 32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            margin: '0 0 12px',
          }}>
            Atlas Coach Blog
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '18px',
            lineHeight: 1.6,
            maxWidth: '600px',
          }}>
            Articles and guides on physics, engineering, AI, and effective STEM learning.
          </p>
        </header>

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
                onClick={() => setActiveCategory(cat)}
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

        {/* Blog post grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {filteredPosts.map(post => (
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
      </div>
    </div>
  );
}
