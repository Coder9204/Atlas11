import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';
import { isOnboardingComplete } from './services/GameProgressService';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./components/LandingPage'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const GamesPage = lazy(() => import('./components/GamesPage'));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));
const ProgressDashboard = lazy(() => import('./components/ProgressDashboard'));
const LearningPathPage = lazy(() => import('./components/LearningPathPage'));
const CustomGameBuilder = lazy(() => import('./components/CustomGameBuilder'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

// SEO page components (lazy loaded)
const CategoryPage = lazy(() => import('./components/CategoryPage'));
const SubcategoryPage = lazy(() => import('./components/SubcategoryPage'));
const ComparisonPage = lazy(() => import('./components/ComparisonPage'));
const HowItWorksPage = lazy(() => import('./components/HowItWorksPage'));
const DifficultyPage = lazy(() => import('./components/DifficultyPage'));
const BlogIndex = lazy(() => import('./components/BlogIndex'));
const BlogPost = lazy(() => import('./components/BlogPost'));
const AudiencePage = lazy(() => import('./components/AudiencePage'));
const GlossaryIndex = lazy(() => import('./components/GlossaryIndex'));
const GlossaryTerm = lazy(() => import('./components/GlossaryTerm'));
const TopicPage = lazy(() => import('./components/TopicPage'));
const UseCasePage = lazy(() => import('./components/UseCasePage'));
const AlternativesPage = lazy(() => import('./components/AlternativesPage'));

// Lazy load GameShell and all game renderers for code splitting
const GameShellModule = () => import('./components/GameShell');
const gameModules = import.meta.glob('./components/*Renderer.tsx');

// Generate routes dynamically from game renderers — wrapped in GameShell
const gameRoutes = Object.keys(gameModules).map((path) => {
  const name = path.replace('./components/', '').replace('Renderer.tsx', '');
  const slug = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

  return {
    path: `/games/${slug}`,
    lazy: async () => {
      const [rendererMod, shellMod] = await Promise.all([
        gameModules[path]() as Promise<{ default: React.ComponentType }>,
        GameShellModule(),
      ]);
      const Renderer = rendererMod.default;
      const GameShell = shellMod.default;
      return {
        Component: () => (
          <GameShell>
            <Renderer />
          </GameShell>
        ),
      };
    },
  };
});

// Loading fallback component
const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    color: '#fff',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #3B82F6',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#9CA3AF' }}>Loading...</p>
    </div>
  </div>
);

// Root route: show App for returning users, LandingPage for new visitors
const RootRoute = () => {
  if (isOnboardingComplete()) {
    return <App />;
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
  },
  {
    path: '/pricing',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PricingPage />
      </Suspense>
    ),
  },
  {
    path: '/games',
    element: (
      <Suspense fallback={<PageLoader />}>
        <GamesPage />
      </Suspense>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={<PageLoader />}>
        <OnboardingFlow />
      </Suspense>
    ),
  },
  {
    path: '/progress',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProgressDashboard />
      </Suspense>
    ),
  },
  {
    path: '/paths',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LearningPathPage />
      </Suspense>
    ),
  },
  {
    path: '/build',
    element: (
      <Suspense fallback={<PageLoader />}>
        <CustomGameBuilder />
      </Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminPanel />
      </Suspense>
    ),
  },
  // SEO Pages
  {
    path: '/learn/:categoryId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <CategoryPage />
      </Suspense>
    ),
  },
  {
    path: '/learn/:categoryId/:subcategorySlug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SubcategoryPage />
      </Suspense>
    ),
  },
  {
    path: '/compare/:comparisonSlug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ComparisonPage />
      </Suspense>
    ),
  },
  {
    path: '/how/:conceptSlug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <HowItWorksPage />
      </Suspense>
    ),
  },
  {
    path: '/difficulty/:level',
    element: (
      <Suspense fallback={<PageLoader />}>
        <DifficultyPage />
      </Suspense>
    ),
  },
  {
    path: '/blog',
    element: (
      <Suspense fallback={<PageLoader />}>
        <BlogIndex />
      </Suspense>
    ),
  },
  {
    path: '/blog/:slug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <BlogPost />
      </Suspense>
    ),
  },
  {
    path: '/for/:audience',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AudiencePage />
      </Suspense>
    ),
  },
  {
    path: '/glossary',
    element: (
      <Suspense fallback={<PageLoader />}>
        <GlossaryIndex />
      </Suspense>
    ),
  },
  {
    path: '/glossary/:term',
    element: (
      <Suspense fallback={<PageLoader />}>
        <GlossaryTerm />
      </Suspense>
    ),
  },
  {
    path: '/topics/:slug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <TopicPage />
      </Suspense>
    ),
  },
  {
    path: '/use-cases/:slug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <UseCasePage />
      </Suspense>
    ),
  },
  {
    path: '/alternatives/:slug',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AlternativesPage />
      </Suspense>
    ),
  },
  ...gameRoutes,
]);

export default router;
