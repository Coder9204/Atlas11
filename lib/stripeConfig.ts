/**
 * Maps tier + billing cycle to Stripe price IDs from environment variables.
 */

export interface PriceMapping {
  monthly: string;
  annual: string;
}

export const stripePrices: Record<string, PriceMapping | string> = {
  student: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_STUDENT_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_STUDENT_ANNUAL || '',
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || '',
  },
  family: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_FAMILY_ANNUAL || '',
  },
  lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '',
};

/**
 * Get the Stripe price ID for a given tier and billing cycle.
 */
export function getPriceId(tier: string, billingCycle: 'monthly' | 'annual'): string {
  const price = stripePrices[tier];
  if (!price) return '';
  if (typeof price === 'string') return price; // lifetime
  return price[billingCycle] || '';
}
