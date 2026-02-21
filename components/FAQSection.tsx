import React, { useState, useEffect } from 'react';
import { faqPageSchema } from '../lib/seoSchemas';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export default function FAQSection({ items }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    // Inject FAQ JSON-LD schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-faq', 'true');
    script.textContent = JSON.stringify(faqPageSchema(items));
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [items]);

  const toggle = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section style={{ padding: '48px 0' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#f0f0f5',
        marginBottom: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        Frequently Asked Questions
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggle(index)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '16px 20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#f0f0f5',
                  flex: 1,
                  paddingRight: '16px',
                }}>
                  {item.question}
                </span>
                <span style={{
                  fontSize: '20px',
                  color: '#3B82F6',
                  transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                }}>
                  +
                </span>
              </button>
              {isOpen && (
                <div style={{
                  padding: '0 20px 16px 20px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
