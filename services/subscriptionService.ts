/**
 * Client-side subscription helpers for Stripe integration.
 */

import { getFunctionsInstance } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { trackCheckoutStarted, trackBillingPortalOpened } from './AnalyticsService';

/**
 * Create a Stripe Checkout session and redirect to it.
 */
export async function createCheckout(priceId: string): Promise<void> {
  trackCheckoutStarted(priceId);
  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available.');
  }

  const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
  const result = await createCheckoutSession({
    priceId,
    successUrl: `${window.location.origin}/games?checkout=success`,
    cancelUrl: `${window.location.origin}/pricing`,
  });

  const data = result.data as { url: string; sessionId: string };
  if (data.url) {
    window.location.href = data.url;
  }
}

/**
 * Open the Stripe Customer Portal for subscription management.
 */
export async function openCustomerPortal(): Promise<void> {
  trackBillingPortalOpened();
  const functions = getFunctionsInstance();
  if (!functions) {
    throw new Error('Firebase Functions not available.');
  }

  const createPortal = httpsCallable(functions, 'createCustomerPortal');
  const result = await createPortal({
    returnUrl: `${window.location.origin}/pricing`,
  });

  const data = result.data as { url: string };
  if (data.url) {
    window.location.href = data.url;
  }
}
