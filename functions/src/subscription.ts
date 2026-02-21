import * as admin from 'firebase-admin';

export interface SubscriptionData {
  tier: 'free' | 'plus' | 'pro';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  stripeSubscriptionId?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  updatedAt: FirebaseFirestore.FieldValue;
}

/**
 * Map a Stripe price ID to a tier name.
 * Price IDs are configured via Firebase Functions config.
 */
export function mapPriceIdToTier(priceId: string, config: Record<string, string>): string {
  const mapping: Record<string, string> = {
    [config.plus_monthly || '']: 'plus',
    [config.plus_annual || '']: 'plus',
    [config.pro_monthly || '']: 'pro',
    [config.pro_annual || '']: 'pro',
  };
  return mapping[priceId] || 'free';
}

/**
 * Sync a Stripe subscription to the user's Firestore document.
 */
export async function syncSubscriptionToFirestore(
  uid: string,
  data: {
    tier: string;
    status: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<void> {
  const subData: SubscriptionData = {
    tier: data.tier as SubscriptionData['tier'],
    status: data.status as SubscriptionData['status'],
    stripeSubscriptionId: data.stripeSubscriptionId,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection('users').doc(uid).set(
    { subscription: subData },
    { merge: true }
  );
}

/**
 * Look up a user's Firestore subscription and check if they have paid access.
 */
export async function verifySubscriptionAccess(userId: string): Promise<boolean> {
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const data = userDoc.data();
  if (!data?.subscription) return false;

  const sub = data.subscription;
  const activeTiers = ['plus', 'pro'];
  const activeStatuses = ['active', 'trialing'];

  return activeTiers.includes(sub.tier) && activeStatuses.includes(sub.status);
}
