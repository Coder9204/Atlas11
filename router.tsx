import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';

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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  ...gameRoutes,
]);

export default router;
