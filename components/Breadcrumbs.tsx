import React, { useEffect } from 'react';
import { breadcrumbSchema } from '../lib/seoSchemas';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-breadcrumb', 'true');
    script.textContent = JSON.stringify(breadcrumbSchema(items));
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [items]);

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding: '12px 0',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <ol style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        fontSize: '14px',
      }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLast ? (
                <span style={{ color: '#94a3b8' }}>{item.name}</span>
              ) : (
                <>
                  <a
                    href={item.url}
                    style={{
                      color: '#3B82F6',
                      textDecoration: 'none',
                    }}
                    onMouseOver={e => { (e.target as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                    onMouseOut={e => { (e.target as HTMLAnchorElement).style.textDecoration = 'none'; }}
                  >
                    {item.name}
                  </a>
                  <span style={{ color: '#4a4a5a' }}>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
