import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './contexts/AuthContext';
import { AICoachProvider } from './contexts/AICoachContext';
import AuthModal from './components/AuthModal';
import { trackSessionStarted, trackSessionEnded, trackPageView } from './services/AnalyticsService';

// Track session start
trackSessionStarted();

// Track page views on navigation
const sessionStartTime = Date.now();
let lastTrackedPath = '';

function trackCurrentPage() {
  const currentPath = window.location.pathname;
  if (currentPath !== lastTrackedPath) {
    trackPageView(currentPath);
    lastTrackedPath = currentPath;
  }
}

// Track initial page view
trackCurrentPage();

// Listen for navigation changes (popstate for back/forward, and periodic check for pushState)
window.addEventListener('popstate', trackCurrentPage);

// MutationObserver to catch SPA route changes (pushState doesn't fire popstate)
const observer = new MutationObserver(() => {
  trackCurrentPage();
});
observer.observe(document.body, { childList: true, subtree: true });

// Track session end on page unload
window.addEventListener('beforeunload', () => {
  const durationMs = Date.now() - sessionStartTime;
  trackSessionEnded(durationMs);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AICoachProvider>
        <RouterProvider router={router} />
        <AuthModal />
      </AICoachProvider>
    </AuthProvider>
  </React.StrictMode>
);
