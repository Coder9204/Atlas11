import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { updateMeta } from '../lib/seo';
import Breadcrumbs from './Breadcrumbs';

type AudienceKey = 'teachers' | 'students' | 'engineers' | 'parents';

interface AudienceContent {
  title: string;
  subtitle: string;
  description: string;
  heroColor: string;
  heroIcon: string;
  features: { icon: string; title: string; description: string }[];
  gameRecommendations: { name: string; slug: string; reason: string }[];
  cta: { text: string; href: string };
}

const audienceData: Record<AudienceKey, AudienceContent> = {
  teachers: {
    title: 'Atlas Coach for Teachers',
    subtitle: 'Turn abstract concepts into hands-on discoveries',
    description: 'Atlas Coach gives you 340+ interactive simulations that align with AP Physics, IB, and university curricula. Assign specific games, track student progress, and use the AI coach as a teaching assistant that never runs out of patience.',
    heroColor: '#8b5cf6',
    heroIcon: '🎓',
    features: [
      {
        icon: '📊',
        title: 'Progress Tracking',
        description: 'See which students have mastered which concepts, identify struggling learners, and track class-wide trends with the analytics dashboard.',
      },
      {
        icon: '📋',
        title: 'Curriculum Alignment',
        description: 'Games organized by topic match AP Physics 1 & 2, IB Physics, and standard university physics sequences. Assign specific games as homework.',
      },
      {
        icon: '🤖',
        title: 'AI Teaching Assistant',
        description: 'The AI coach gives personalized hints and explanations so every student gets the one-on-one attention they need, freeing you to focus on deeper discussions.',
      },
      {
        icon: '🔄',
        title: 'Spaced Repetition',
        description: 'The SM-2 algorithm automatically schedules review sessions so students retain what they learn long after the lesson ends.',
      },
    ],
    gameRecommendations: [
      { name: 'Newton\'s Third Law', slug: 'newtons-third-law', reason: 'The most commonly misunderstood law in mechanics' },
      { name: 'Energy Conservation', slug: 'energy-conservation', reason: 'Foundation for thermodynamics and mechanics' },
      { name: 'Circuits', slug: 'circuits', reason: 'Build intuition before lab work' },
      { name: 'Diffraction', slug: 'diffraction', reason: 'Visualize what textbook diagrams cannot show' },
      { name: 'Pendulum Period', slug: 'pendulum-period', reason: 'Classic experiment made interactive' },
      { name: 'Gas Laws', slug: 'gas-laws', reason: 'PV = nRT comes alive with sliders' },
    ],
    cta: { text: 'Start a Free Teacher Account', href: '/onboarding' },
  },
  students: {
    title: 'Atlas Coach for Students',
    subtitle: 'Learn physics by doing, not just reading',
    description: 'Stop staring at textbook diagrams. Atlas Coach lets you predict, experiment, and test 340+ physics concepts through interactive games. The AI coach guides you step by step, and spaced repetition ensures you remember what you learn for exams.',
    heroColor: '#3B82F6',
    heroIcon: '📚',
    features: [
      {
        icon: '🎮',
        title: 'Learn by Playing',
        description: 'Every concept is an interactive game. Predict what will happen, tweak the variables, watch the physics unfold, then test yourself.',
      },
      {
        icon: '🤖',
        title: 'Personal AI Tutor',
        description: 'Stuck on a concept? The AI coach watches your screen and gives hints exactly when you need them. No judgment, infinite patience.',
      },
      {
        icon: '📈',
        title: 'Track Your Progress',
        description: 'See your mastery grow across mechanics, thermodynamics, E&M, waves, and more. Know exactly what to review before an exam.',
      },
      {
        icon: '⏰',
        title: 'Smart Review Schedule',
        description: 'Spaced repetition tells you when to review each concept. Spend your study time on what matters most.',
      },
    ],
    gameRecommendations: [
      { name: 'Momentum Conservation', slug: 'momentum-conservation', reason: 'Essential for AP Physics and university exams' },
      { name: 'Lens Focusing', slug: 'lens-focusing', reason: 'Optics made visual and intuitive' },
      { name: 'Bernoulli', slug: 'bernoulli', reason: 'Understand fluid dynamics hands-on' },
      { name: 'Standing Waves', slug: 'standing-waves', reason: 'See harmonics instead of just memorizing formulas' },
      { name: 'Electric Field', slug: 'electric-field', reason: 'Visualize the invisible' },
      { name: 'Thermal Expansion', slug: 'thermal-expansion', reason: 'Common exam topic made tangible' },
    ],
    cta: { text: 'Start Learning Free', href: '/onboarding' },
  },
  engineers: {
    title: 'Atlas Coach for Engineers',
    subtitle: 'Refresh fundamentals and explore interdisciplinary concepts',
    description: 'Whether you are a seasoned professional brushing up on first principles or a new grad bridging theory to practice, Atlas Coach offers 340+ simulations spanning semiconductor physics, power systems, RF, AI hardware, and more.',
    heroColor: '#06b6d4',
    heroIcon: '🔧',
    features: [
      {
        icon: '🔌',
        title: 'Semiconductor & VLSI',
        description: 'From MOSFET switching to lithography to chiplet architectures. Understand the physics behind the chips you design.',
      },
      {
        icon: '☀️',
        title: 'Solar & Power Systems',
        description: 'Solar cell physics, MPPT algorithms, inverter design, battery sizing, and grid frequency regulation, all interactive.',
      },
      {
        icon: '🤖',
        title: 'AI Hardware & Inference',
        description: 'GPU occupancy, memory bandwidth bottlenecks, tensor cores, quantization tradeoffs, and thermal throttling.',
      },
      {
        icon: '📡',
        title: 'RF & Communications',
        description: 'Antenna gain, link budgets, Fresnel zones, and fiber signal loss. Build intuition for wireless system design.',
      },
    ],
    gameRecommendations: [
      { name: 'MOSFET Switching', slug: 'm-o-s-f-e-t-switching', reason: 'Foundational for any circuit designer' },
      { name: 'GPU Occupancy', slug: 'g-p-u-occupancy', reason: 'Critical for ML engineers optimizing inference' },
      { name: 'MPPT', slug: 'm-p-p-t', reason: 'Every solar engineer needs to understand maximum power point tracking' },
      { name: 'Link Budget', slug: 'link-budget', reason: 'Essential for RF and satellite communications' },
      { name: 'Thermal Interface', slug: 'thermal-interface', reason: 'The bottleneck in most cooling solutions' },
      { name: 'Electromigration', slug: 'electromigration', reason: 'Reliability concern at advanced nodes' },
    ],
    cta: { text: 'Explore Engineering Simulations', href: '/games' },
  },
  parents: {
    title: 'Atlas Coach for Parents',
    subtitle: 'Give your kids a head start in science and engineering',
    description: 'Atlas Coach turns screen time into learning time. Kids play interactive physics games that build real understanding. The AI coach keeps them engaged and challenged, while you track their progress. No physics degree required from you.',
    heroColor: '#22c55e',
    heroIcon: '👨‍👩‍👧‍👦',
    features: [
      {
        icon: '🎮',
        title: 'Games, Not Homework',
        description: 'Each concept is a game with predictions, experiments, and challenges. Kids ask to play "one more" because it feels like play, not study.',
      },
      {
        icon: '🛡️',
        title: 'Safe & Ad-Free',
        description: 'No ads, no distractions, no social features. Just focused science learning in a clean, kid-friendly interface.',
      },
      {
        icon: '📊',
        title: 'See What They Learn',
        description: 'The progress dashboard shows which topics your child has explored, which they have mastered, and what they should review next.',
      },
      {
        icon: '🧠',
        title: 'Builds Real Understanding',
        description: 'Unlike flashcard apps, Atlas Coach builds intuition through experimentation. Kids understand why things work, not just memorize facts.',
      },
    ],
    gameRecommendations: [
      { name: 'Pendulum Period', slug: 'pendulum-period', reason: 'A gentle introduction to physics experimentation' },
      { name: 'Buoyancy', slug: 'buoyancy', reason: 'Why do some things float? Kids love finding out' },
      { name: 'Cartesian Diver', slug: 'cartesian-diver', reason: 'A classic science trick explained interactively' },
      { name: 'Soap Boat', slug: 'soap-boat', reason: 'Surface tension made fun and visual' },
      { name: 'Reaction Time', slug: 'reaction-time', reason: 'Test reflexes and learn about the nervous system' },
      { name: 'Chain Fountain', slug: 'chain-fountain', reason: 'A viral physics phenomenon kids can explore' },
    ],
    cta: { text: 'Try It Free With Your Kids', href: '/onboarding' },
  },
};

const VALID_AUDIENCES: AudienceKey[] = ['teachers', 'students', 'engineers', 'parents'];

export default function AudiencePage() {
  const { audience } = useParams<{ audience: string }>();
  const validAudience = (audience && VALID_AUDIENCES.includes(audience as AudienceKey))
    ? audience as AudienceKey
    : null;
  const content = validAudience ? audienceData[validAudience] : null;

  useEffect(() => {
    if (!content || !validAudience) return;
    updateMeta({
      title: `${content.title} | Interactive Physics Simulations`,
      description: content.description,
      canonicalUrl: `/for/${validAudience}`,
    });
  }, [content, validAudience]);

  if (!content || !validAudience) {
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
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Page Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Choose an audience to learn more.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {VALID_AUDIENCES.map(a => (
              <a
                key={a}
                href={`/for/${a}`}
                style={{
                  padding: '10px 20px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#f0f0f5',
                  textDecoration: 'none',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {audienceData[a].heroIcon} {a}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: content.title, url: `/for/${validAudience}` },
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

        {/* Hero section */}
        <header style={{
          padding: '64px 0 48px',
          textAlign: 'center',
          borderBottom: '1px solid #2a2a3a',
          marginBottom: '48px',
        }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>
            {content.heroIcon}
          </span>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 800,
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            {content.title}
          </h1>
          <p style={{
            fontSize: '22px',
            color: content.heroColor,
            fontWeight: 600,
            margin: '0 0 20px',
          }}>
            {content.subtitle}
          </p>
          <p style={{
            color: '#e2e8f0',
            fontSize: '16px',
            lineHeight: 1.7,
            maxWidth: '650px',
            margin: '0 auto 32px',
          }}>
            {content.description}
          </p>
          <a
            href={content.cta.href}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: content.heroColor,
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
            {content.cta.text}
          </a>
        </header>

        {/* Feature list */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            Why {validAudience.charAt(0).toUpperCase() + validAudience.slice(1)} Love Atlas Coach
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {content.features.map((feature, index) => (
              <div
                key={index}
                style={{
                  padding: '28px 24px',
                  background: '#1a1a24',
                  border: '1px solid #2a2a3a',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>
                  {feature.icon}
                </span>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#f0f0f5',
                  margin: '0 0 8px',
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Game recommendations */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '24px',
          }}>
            Recommended Simulations
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {content.gameRecommendations.map(game => (
              <a
                key={game.slug}
                href={`/games/${game.slug}`}
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
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = content.heroColor;
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
                  margin: '0 0 6px',
                }}>
                  {game.name}
                </h3>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '13px',
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {game.reason}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{
          padding: '48px 32px',
          background: 'linear-gradient(135deg, #1a1a3a, #1a1a24)',
          border: `1px solid ${content.heroColor}40`,
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
            Join thousands of {validAudience} who are using Atlas Coach to master physics and engineering.
          </p>
          <a
            href={content.cta.href}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: content.heroColor,
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
            {content.cta.text}
          </a>
        </section>

        {/* Other audiences */}
        <section style={{
          padding: '32px 0',
          borderTop: '1px solid #2a2a3a',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#94a3b8',
            marginBottom: '12px',
          }}>
            Atlas Coach is also for
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {VALID_AUDIENCES
              .filter(a => a !== validAudience)
              .map(a => (
                <a
                  key={a}
                  href={`/for/${a}`}
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
                  {audienceData[a].heroIcon} {a}
                </a>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
