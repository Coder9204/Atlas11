import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { updateMeta } from '../lib/seo';
import { getBlogPostBySlug } from '../src/data/blogPostsIndex';
import { blogArticleSchema, faqPageSchema } from '../lib/seoSchemas';
import ComparisonPostBody from './ComparisonPostBody';
import RoundupPostBody from './RoundupPostBody';
import Breadcrumbs from './Breadcrumbs';

/** Legacy placeholder blog post data for the original 8 posts. */
const legacyPostData: Record<string, {
  title: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  description: string;
  relatedGames: { name: string; slug: string }[];
}> = {
  'why-interactive-simulations-beat-textbooks': {
    title: 'Why Interactive Simulations Beat Textbooks for Learning Physics',
    author: 'Atlas Coach Team',
    date: '2025-04-15',
    category: 'Study Tips',
    readTime: '6 min',
    description: 'Research shows active learning outperforms passive reading by 2x. Here is how Atlas Coach applies cognitive science to physics education.',
    relatedGames: [
      { name: 'Pendulum Period', slug: 'pendulum-period' },
      { name: 'Energy Conservation', slug: 'energy-conservation' },
      { name: 'Momentum Conservation', slug: 'momentum-conservation' },
    ],
  },
  'understanding-newtons-third-law-intuitively': {
    title: 'Understanding Newton\'s Third Law Intuitively',
    author: 'Atlas Coach Team',
    date: '2025-04-10',
    category: 'Physics',
    readTime: '5 min',
    description: 'Action and reaction are equal and opposite, but why does a truck crush a car in a head-on collision? We clear up the most common misconception in mechanics.',
    relatedGames: [
      { name: 'Newton\'s Third Law', slug: 'newtons-third-law' },
      { name: 'Inelastic Collisions', slug: 'inelastic-collisions' },
      { name: 'Momentum Conservation', slug: 'momentum-conservation' },
    ],
  },
  'how-gpu-parallelism-mirrors-physics-simulations': {
    title: 'How GPU Parallelism Mirrors Physics Simulations',
    author: 'Atlas Coach Team',
    date: '2025-04-05',
    category: 'AI & Computing',
    readTime: '8 min',
    description: 'The same math that drives particle simulations also powers modern AI inference. Explore the deep connection between physics engines and neural networks.',
    relatedGames: [
      { name: 'GPU Occupancy', slug: 'g-p-u-occupancy' },
      { name: 'Systolic Array', slug: 'systolic-array' },
      { name: 'Tensor Core', slug: 'tensor-core' },
    ],
  },
  'solar-cell-efficiency-explained-simply': {
    title: 'Solar Cell Efficiency Explained Simply',
    author: 'Atlas Coach Team',
    date: '2025-03-28',
    category: 'Engineering',
    readTime: '7 min',
    description: 'The Shockley-Queisser limit caps single-junction cells at 33%. But what does that actually mean, and how are engineers pushing past it?',
    relatedGames: [
      { name: 'Solar Cell', slug: 'solar-cell' },
      { name: 'PV IV Curve', slug: 'p-v-i-v-curve' },
      { name: 'Fill Factor', slug: 'fill-factor' },
    ],
  },
  'spaced-repetition-for-stem-learning': {
    title: 'Spaced Repetition for STEM Learning: A Practical Guide',
    author: 'Atlas Coach Team',
    date: '2025-03-20',
    category: 'Study Tips',
    readTime: '5 min',
    description: 'How the SM-2 algorithm schedules reviews at the perfect time, and why Atlas Coach uses it to help you remember what you learn.',
    relatedGames: [
      { name: 'Circuits', slug: 'circuits' },
      { name: 'Bernoulli', slug: 'bernoulli' },
    ],
  },
  'semiconductor-fabrication-for-beginners': {
    title: 'Semiconductor Fabrication for Beginners',
    author: 'Atlas Coach Team',
    date: '2025-03-15',
    category: 'Engineering',
    readTime: '10 min',
    description: 'From sand to silicon chip: a visual guide to the 500+ steps involved in manufacturing a modern processor.',
    relatedGames: [
      { name: 'Photolithography', slug: 'photolithography' },
      { name: 'Etch Anisotropy', slug: 'etch-anisotropy' },
      { name: 'Ion Implantation', slug: 'ion-implantation' },
    ],
  },
  'what-is-thermal-throttling': {
    title: 'What Is Thermal Throttling and Why Does It Slow Your Laptop?',
    author: 'Atlas Coach Team',
    date: '2025-03-10',
    category: 'AI & Computing',
    readTime: '6 min',
    description: 'Your CPU clock speed drops when it gets hot. Learn the physics of heat dissipation and how chip designers fight the thermal wall.',
    relatedGames: [
      { name: 'Thermal Throttling', slug: 'thermal-throttling' },
      { name: 'Heat Sink Thermal', slug: 'heat-sink-thermal' },
      { name: 'Liquid Cooling', slug: 'liquid-cooling' },
    ],
  },
  'the-physics-of-roller-coasters': {
    title: 'The Physics of Roller Coasters: Energy, Forces, and G-Loads',
    author: 'Atlas Coach Team',
    date: '2025-03-01',
    category: 'Physics',
    readTime: '7 min',
    description: 'Every twist, loop, and drop on a roller coaster is governed by the same conservation laws you learn in introductory mechanics.',
    relatedGames: [
      { name: 'Energy Conservation', slug: 'energy-conservation' },
      { name: 'Centripetal Force', slug: 'centripetal-force' },
      { name: 'Terminal Velocity', slug: 'terminal-velocity' },
    ],
  },
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  // Try data-driven posts first
  const dataPost = slug ? getBlogPostBySlug(slug) : undefined;
  // Fallback to legacy posts
  const legacyPost = !dataPost && slug ? legacyPostData[slug] : undefined;

  useEffect(() => {
    if (dataPost) {
      const jsonLdItems: Record<string, unknown>[] = [
        blogArticleSchema({
          title: dataPost.title,
          description: dataPost.metaDescription,
          url: `/blog/${dataPost.slug}`,
          datePublished: dataPost.date,
          author: dataPost.author,
        }),
      ];
      if (dataPost.faqItems.length > 0) {
        jsonLdItems.push(faqPageSchema(dataPost.faqItems));
      }
      updateMeta({
        title: dataPost.metaTitle,
        description: dataPost.metaDescription,
        canonicalUrl: `/blog/${dataPost.slug}`,
        ogType: 'article',
        jsonLd: jsonLdItems,
      });
    } else if (legacyPost) {
      updateMeta({
        title: `${legacyPost.title} | Atlas Coach Blog`,
        description: legacyPost.description,
        canonicalUrl: `/blog/${slug}`,
        ogType: 'article',
        jsonLd: [
          blogArticleSchema({
            title: legacyPost.title,
            description: legacyPost.description,
            url: `/blog/${slug}`,
            datePublished: legacyPost.date,
            author: legacyPost.author,
          }),
        ],
      });
    }
  }, [dataPost, legacyPost, slug]);

  // Not found
  if (!dataPost && !legacyPost) {
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Post Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>The blog post you are looking for does not exist.</p>
          <a href="/blog" style={{ color: '#3B82F6', textDecoration: 'none' }}>Back to blog</a>
        </div>
      </div>
    );
  }

  // Data-driven post rendering
  if (dataPost) {
    const breadcrumbItems = [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: dataPost.title.length > 50 ? dataPost.title.slice(0, 47) + '...' : dataPost.title, url: `/blog/${slug}` },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#f0f0f5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          <Breadcrumbs items={breadcrumbItems} />

          <header style={{ padding: '40px 0 32px', borderBottom: '1px solid #2a2a3a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 12px',
                background: '#3B82F618',
                border: '1px solid #3B82F640',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#3B82F6',
              }}>
                {dataPost.category}
              </span>
              <span style={{ color: '#4a4a5a', fontSize: '13px' }}>
                {dataPost.readTime} read
              </span>
            </div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 800,
              lineHeight: 1.2,
              margin: '0 0 16px',
            }}>
              {dataPost.title}
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: '#94a3b8',
              fontSize: '14px',
            }}>
              <span>By {dataPost.author}</span>
              <span style={{ color: '#2a2a3a' }}>|</span>
              <time dateTime={dataPost.date}>
                {new Date(dataPost.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          </header>

          {dataPost.type === 'comparison' ? (
            <ComparisonPostBody post={dataPost} />
          ) : (
            <RoundupPostBody post={dataPost} />
          )}

          <div style={{ padding: '24px 0' }}>
            <a
              href="/blog"
              style={{
                color: '#3B82F6',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              &larr; Back to all articles
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Legacy post rendering (original 8 placeholder posts)
  const post = legacyPost!;
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title.length > 50 ? post.title.slice(0, 47) + '...' : post.title, url: `/blog/${slug}` },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '24px' }}>
        <Breadcrumbs items={breadcrumbItems} />

        <header style={{ padding: '40px 0 32px', borderBottom: '1px solid #2a2a3a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              padding: '4px 12px',
              background: '#3B82F618',
              border: '1px solid #3B82F640',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3B82F6',
            }}>
              {post.category}
            </span>
            <span style={{ color: '#4a4a5a', fontSize: '13px' }}>
              {post.readTime} read
            </span>
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 16px',
          }}>
            {post.title}
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            color: '#94a3b8',
            fontSize: '14px',
          }}>
            <span>By {post.author}</span>
            <span style={{ color: '#2a2a3a' }}>|</span>
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
        </header>

        <article style={{ padding: '32px 0 48px' }}>
          <div style={{
            padding: '24px',
            background: '#1a1a3a',
            border: '1px solid #3B82F640',
            borderRadius: '10px',
            borderLeft: '4px solid #3B82F6',
            marginBottom: '32px',
          }}>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.7,
              color: '#e2e8f0',
              margin: 0,
              fontWeight: 500,
            }}>
              {post.description}
            </p>
          </div>

          <div style={{ color: '#e2e8f0', fontSize: '16px', lineHeight: 1.8 }}>
            <p style={{ marginBottom: '20px' }}>
              This article is coming soon. We are preparing in-depth content with
              interactive examples and connections to the Atlas Coach simulation library.
            </p>
            <p style={{ marginBottom: '20px' }}>
              In the meantime, you can explore the interactive simulations below to
              experience the concepts covered in this article firsthand.
            </p>
          </div>

          <div style={{
            padding: '48px 32px',
            background: '#12121a',
            border: '2px dashed #2a2a3a',
            borderRadius: '12px',
            textAlign: 'center',
            margin: '32px 0',
          }}>
            <p style={{ color: '#4a4a5a', fontSize: '14px', fontStyle: 'italic' }}>
              Full article content will be loaded from MDX. This is a placeholder template.
            </p>
          </div>
        </article>

        <section style={{
          padding: '32px 0',
          borderTop: '1px solid #2a2a3a',
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            Try the Interactive Simulations
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {post.relatedGames.map(game => (
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
                  transition: 'border-color 0.2s ease',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3B82F6'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2a2a3a'; }}
              >
                {game.name}
              </a>
            ))}
          </div>
        </section>

        <div style={{ padding: '24px 0' }}>
          <a
            href="/blog"
            style={{
              color: '#3B82F6',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            &larr; Back to all articles
          </a>
        </div>
      </div>
    </div>
  );
}
