/**
 * Blog Posts Index — Types and Aggregation
 *
 * Shared interfaces for comparison and roundup blog posts,
 * plus helpers to query across all blog content.
 */

export interface BlogFAQItem {
  question: string;
  answer: string;
}

export interface RelatedSimulation {
  name: string;
  slug: string;
}

export interface ComparisonBlogPost {
  type: 'comparison';
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  date: string;
  category: string;
  readTime: string;
  author: string;
  competitorName: string;
  competitorDownloads: string;
  competitorCategory: string;
  introText: string;
  competitorOverview: string;
  atlasCoachOverview: string;
  comparisonCriteria: {
    criterion: string;
    atlasCoach: string;
    competitor: string;
    winner: 'atlas' | 'competitor' | 'tie';
  }[];
  atlasCoachPros: string[];
  atlasCoachCons: string[];
  competitorPros: string[];
  competitorCons: string[];
  verdict: string;
  roundupSlug: string;
  relatedSimulations: RelatedSimulation[];
  faqItems: BlogFAQItem[];
}

export interface RoundupBlogPost {
  type: 'roundup';
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  date: string;
  category: string;
  readTime: string;
  author: string;
  introText: string;
  methodologyText: string;
  rankedApps: {
    rank: number;
    name: string;
    downloads: string;
    summary: string;
    pros: string[];
    cons: string[];
    comparisonSlug?: string;
    isAtlasCoach?: boolean;
  }[];
  comparisonSlugs: string[];
  relatedSimulations: RelatedSimulation[];
  faqItems: BlogFAQItem[];
}

export type BlogPost = ComparisonBlogPost | RoundupBlogPost;

import { blogComparisonPosts } from './blogComparisonPosts';
import { blogRoundupPosts } from './blogRoundupPosts';

export const allBlogPosts: BlogPost[] = [
  ...blogRoundupPosts,
  ...blogComparisonPosts,
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return allBlogPosts.find(p => p.slug === slug);
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  return allBlogPosts.filter(p => p.category === category);
}
