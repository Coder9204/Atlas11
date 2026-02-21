/**
 * Maps tier + billing cycle to Stripe price IDs from environment variables.
 */

export interface PriceMapping {
  monthly: string;
  annual: string;
}

export const stripePrices: Record<string, PriceMapping> = {
  plus: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PLUS_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_PLUS_ANNUAL || '',
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || '',
  },
};

/**
 * Get the Stripe price ID for a given tier and billing cycle.
 */
export function getPriceId(tier: string, billingCycle: 'monthly' | 'annual'): string {
  const price = stripePrices[tier];
  if (!price) return '';
  return price[billingCycle] || '';
}
