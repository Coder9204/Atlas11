import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';

// Lazy load pages for code splitting
const PricingPage = lazy(() => import('./components/PricingPage'));
const GamesPage = lazy(() => import('./components/GamesPage'));

// Lazy load all game renderers for code splitting
const gameModules = import.meta.glob('./components/*Renderer.tsx');

// Generate routes dynamically from game renderers
const gameRoutes = Object.keys(gameModules).map((path) => {
  const name = path.replace('./components/', '').replace('Renderer.tsx', '');
  const slug = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

  return {
    path: `/games/${slug}`,
    lazy: async () => {
      const module = await gameModules[path]() as { default: React.ComponentType };
      return { Component: module.default };
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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
  ...gameRoutes,
]);

export default router;
