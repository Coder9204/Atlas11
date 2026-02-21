/**
 * JSON-LD Structured Data Generators
 *
 * Generates schema.org JSON-LD for games, categories, and pages.
 */

import { SEO_CONFIG } from './seo';

export function learningResourceSchema(data: {
  name: string;
  description: string;
  url: string;
  concepts?: string[];
  difficulty?: string;
  estimatedMinutes?: number;
  category?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: data.name,
    description: data.description,
    url: data.url.startsWith('http') ? data.url : `${SEO_CONFIG.baseUrl}${data.url}`,
    provider: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.baseUrl,
    },
    educationalLevel: data.difficulty || 'intermediate',
    interactivityType: 'active',
    learningResourceType: ['simulation', 'interactive game'],
    ...(data.concepts?.length ? { teaches: data.concepts } : {}),
    ...(data.estimatedMinutes ? { timeRequired: `PT${data.estimatedMinutes}M` } : {}),
    ...(data.category ? { about: { '@type': 'Thing', name: data.category } } : {}),
  };
}

export function faqPageSchema(items: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SEO_CONFIG.baseUrl}${item.url}`,
    })),
  };
}

export function courseSchema(data: {
  name: string;
  description: string;
  url: string;
  gameCount: number;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: data.name,
    description: data.description,
    url: data.url.startsWith('http') ? data.url : `${SEO_CONFIG.baseUrl}${data.url}`,
    provider: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.baseUrl,
    },
    numberOfCredits: data.gameCount,
    educationalCredentialAwarded: 'Certificate of Completion',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${data.gameCount * 10}M`,
    },
  };
}

export function comparisonSchema(data: {
  title: string;
  description: string;
  url: string;
  sideA: string;
  sideB: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    url: data.url.startsWith('http') ? data.url : `${SEO_CONFIG.baseUrl}${data.url}`,
    author: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
    },
    about: [
      { '@type': 'Thing', name: data.sideA },
      { '@type': 'Thing', name: data.sideB },
    ],
  };
}

export function howItWorksSchema(data: {
  title: string;
  description: string;
  url: string;
  steps: { title: string; explanation: string }[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.title,
    description: data.description,
    url: data.url.startsWith('http') ? data.url : `${SEO_CONFIG.baseUrl}${data.url}`,
    step: data.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.explanation,
    })),
  };
}
