/**
 * ADMIN ANALYTICS SERVICE
 *
 * Firestore query functions for the admin panel.
 * Provides multi-user analytics from Firebase collections.
 * Gracefully returns null when Firebase isn't configured.
 */

import { getFirestoreInstance, isFirebaseConfigured } from './firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

// ============================================================
// TYPES
// ============================================================

export interface FirestoreUserStats {
  totalUsers: number;
  subscribersByTier: Record<string, number>;
  dau: number;
  mau: number;
  anonymousUsers: number;
  authenticatedUsers: number;
}

export interface FirestoreTestStats {
  totalSubmissions: number;
  avgScore: number;
  scoreDistribution: { bucket: string; count: number }[];
  topGames: { slug: string; submissions: number; avgScore: number }[];
}

export interface ConversionMetrics {
  subscribersByTier: Record<string, number>;
  totalActiveSubscribers: number;
  totalTrialing: number;
  totalCanceled: number;
  mrr: number;
  trialToPaidRate: number;
  churnRate: number;
  freeToPaidRate: number;
}

// Tier pricing for MRR calculation
const TIER_MONTHLY_PRICES: Record<string, number> = {
  student: 9.99,
  pro: 19.99,
  family: 29.99,
  lifetime: 0, // one-time, not recurring
};

// ============================================================
// FIRESTORE USER STATS
// ============================================================

export async function getFirestoreUserStats(): Promise<FirestoreUserStats | null> {
  if (!isFirebaseConfigured()) return null;
  const db = getFirestoreInstance();
  if (!db) return null;

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let totalUsers = 0;
    let anonymousUsers = 0;
    let authenticatedUsers = 0;
    let dau = 0;
    let mau = 0;
    const subscribersByTier: Record<string, number> = {};

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalUsers++;

      if (data.email) {
        authenticatedUsers++;
      } else {
        anonymousUsers++;
      }

      // Subscription tier
      const tier = data.subscription?.tier || 'free';
      subscribersByTier[tier] = (subscribersByTier[tier] || 0) + 1;

      // Active date checks
      const lastActive = data.lastActiveDate?.toDate?.() || null;
      if (lastActive) {
        if (lastActive >= dayAgo) dau++;
        if (lastActive >= monthAgo) mau++;
      }
    });

    return { totalUsers, subscribersByTier, dau, mau, anonymousUsers, authenticatedUsers };
  } catch (err) {
    console.error('[AdminAnalytics] getFirestoreUserStats error:', err);
    return null;
  }
}

// ============================================================
// FIRESTORE TEST STATS
// ============================================================

export async function getFirestoreTestStats(): Promise<FirestoreTestStats | null> {
  if (!isFirebaseConfigured()) return null;
  const db = getFirestoreInstance();
  if (!db) return null;

  try {
    const testsRef = collection(db, 'test_submissions');
    const snapshot = await getDocs(testsRef);

    let totalSubmissions = 0;
    let totalScore = 0;
    const buckets = [
      { label: '0-20%', min: 0, max: 20, count: 0 },
      { label: '21-40%', min: 21, max: 40, count: 0 },
      { label: '41-60%', min: 41, max: 60, count: 0 },
      { label: '61-80%', min: 61, max: 80, count: 0 },
      { label: '81-100%', min: 81, max: 100, count: 0 },
    ];
    const gameMap = new Map<string, { submissions: number; totalScore: number }>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalSubmissions++;

      const score = typeof data.score === 'number' ? data.score : 0;
      const total = typeof data.total === 'number' ? data.total : 1;
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      totalScore += pct;

      const bucket = buckets.find(b => pct >= b.min && pct <= b.max);
      if (bucket) bucket.count++;

      const slug = data.slug || data.gameSlug || 'unknown';
      const existing = gameMap.get(slug);
      if (existing) {
        existing.submissions++;
        existing.totalScore += pct;
      } else {
        gameMap.set(slug, { submissions: 1, totalScore: pct });
      }
    });

    const avgScore = totalSubmissions > 0 ? totalScore / totalSubmissions : 0;

    const topGames = [...gameMap.entries()]
      .map(([slug, d]) => ({
        slug,
        submissions: d.submissions,
        avgScore: d.submissions > 0 ? Math.round(d.totalScore / d.submissions) : 0,
      }))
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 20);

    return {
      totalSubmissions,
      avgScore: Math.round(avgScore),
      scoreDistribution: buckets.map(b => ({ bucket: b.label, count: b.count })),
      topGames,
    };
  } catch (err) {
    console.error('[AdminAnalytics] getFirestoreTestStats error:', err);
    return null;
  }
}

// ============================================================
// CONVERSION METRICS
// ============================================================

export async function getConversionMetrics(): Promise<ConversionMetrics | null> {
  if (!isFirebaseConfigured()) return null;
  const db = getFirestoreInstance();
  if (!db) return null;

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const subscribersByTier: Record<string, number> = {};
    let totalActiveSubscribers = 0;
    let totalTrialing = 0;
    let totalCanceled = 0;
    let totalFree = 0;
    let totalPaid = 0;
    let mrr = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const tier = data.subscription?.tier || 'free';
      const status = data.subscription?.status || 'active';

      subscribersByTier[tier] = (subscribersByTier[tier] || 0) + 1;

      if (tier === 'free') {
        totalFree++;
      } else {
        if (status === 'active') {
          totalActiveSubscribers++;
          totalPaid++;
          mrr += TIER_MONTHLY_PRICES[tier] || 0;
        } else if (status === 'trialing') {
          totalTrialing++;
        } else if (status === 'canceled') {
          totalCanceled++;
        }
      }
    });

    const totalEverPaid = totalPaid + totalCanceled;
    const trialToPaidRate = (totalTrialing + totalPaid) > 0
      ? totalPaid / (totalTrialing + totalPaid)
      : 0;
    const churnRate = totalEverPaid > 0
      ? totalCanceled / totalEverPaid
      : 0;
    const totalUsers = totalFree + totalPaid + totalTrialing + totalCanceled;
    const freeToPaidRate = totalUsers > 0
      ? totalPaid / totalUsers
      : 0;

    return {
      subscribersByTier,
      totalActiveSubscribers,
      totalTrialing,
      totalCanceled,
      mrr: Math.round(mrr * 100) / 100,
      trialToPaidRate,
      churnRate,
      freeToPaidRate,
    };
  } catch (err) {
    console.error('[AdminAnalytics] getConversionMetrics error:', err);
    return null;
  }
}
