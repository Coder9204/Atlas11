/**
 * SEO Meta Tag Manager
 *
 * Lightweight utility for per-page meta tag updates in an SPA.
 * No external library needed — directly manipulates document head.
 */

export const SEO_CONFIG = {
  baseUrl: 'https://atlascoach-5e3af.web.app',
  siteName: 'Atlas Coach',
  defaultOgImage: '/og-image.png',
  defaultDescription: 'Master physics, engineering, and AI concepts through 340+ interactive games and simulations with AI-powered coaching.',
};

export interface MetaData {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function setMetaTag(property: string, content: string, isName = false): void {
  const attr = isName ? 'name' : 'property';
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string): void {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLd(data: Record<string, unknown> | Record<string, unknown>[]): void {
  // Remove existing dynamic JSON-LD tags (keep the static one in index.html)
  document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());

  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}

/**
 * Update all meta tags for the current page.
 * Call this on page mount / route change.
 */
export function updateMeta(data: MetaData): void {
  const { title, description, canonicalUrl, ogImage, ogType, jsonLd } = data;

  // Title
  document.title = title;
  setMetaTag('title', title, true);

  // Description
  setMetaTag('description', description, true);

  // Open Graph
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:type', ogType || 'website');
  setMetaTag('og:site_name', SEO_CONFIG.siteName);

  const fullUrl = canonicalUrl
    ? (canonicalUrl.startsWith('http') ? canonicalUrl : `${SEO_CONFIG.baseUrl}${canonicalUrl}`)
    : `${SEO_CONFIG.baseUrl}${window.location.pathname}`;
  setMetaTag('og:url', fullUrl);

  const image = ogImage
    ? (ogImage.startsWith('http') ? ogImage : `${SEO_CONFIG.baseUrl}${ogImage}`)
    : `${SEO_CONFIG.baseUrl}${SEO_CONFIG.defaultOgImage}`;
  setMetaTag('og:image', image);

  // Twitter
  setMetaTag('twitter:card', 'summary_large_image', true);
  setMetaTag('twitter:title', title, true);
  setMetaTag('twitter:description', description, true);
  setMetaTag('twitter:image', image, true);

  // Canonical
  setCanonical(fullUrl);

  // JSON-LD
  if (jsonLd) {
    setJsonLd(jsonLd);
  }
}

/**
 * Reset meta tags to defaults (call on unmount if needed).
 */
export function resetMeta(): void {
  document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
}
