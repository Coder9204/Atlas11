'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPriceId } from '../lib/stripeConfig';
import { createCheckout, openCustomerPortal } from '../services/subscriptionService';

const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  let auth: ReturnType<typeof useAuth> | null = null;
  try { auth = useAuth(); } catch { /* AuthProvider may not be mounted in tests */ }

  const handleTierCTA = async (tierId: string) => {
    if (tierId === 'free') {
      window.location.href = '/games';
      return;
    }

    if (!auth?.isAuthenticated) {
      auth?.showAuthModal('pricing_cta');
      return;
    }

    const priceId = getPriceId(tierId, billingCycle);
    if (!priceId) return;

    setCheckoutLoading(tierId);
    try {
      await createCheckout(priceId);
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (err) {
      console.error('Portal failed:', err);
    }
  };

  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6',
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const pricingTiers = [
    {
      id: 'free',
      name: 'Free',
      tagline: 'Perfect for exploring',
      monthlyPrice: 0,
      annualPrice: 0,
      color: colors.textSecondary,
      features: [
        { text: '5 games per day', included: true },
        { text: 'Basic progress tracking', included: true },
        { text: 'Community access', included: true },
        { text: 'Full game library', included: false },
        { text: 'AI voice coach', included: false },
        { text: 'Progress analytics', included: false },
        { text: 'Certificates', included: false },
        { text: 'Offline mode', included: false },
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      id: 'plus',
      name: 'Plus',
      tagline: 'For dedicated learners',
      monthlyPrice: 5.99,
      annualPrice: 49.99,
      color: colors.success,
      features: [
        { text: 'All 340+ games unlimited', included: true },
        { text: 'AI voice coach', included: true },
        { text: 'Progress analytics', included: true },
        { text: 'No ads', included: true },
        { text: 'Mobile & desktop sync', included: true },
        { text: 'Offline mode', included: false },
        { text: 'Completion certificates', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Get Plus',
      popular: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'The complete experience',
      monthlyPrice: 11.99,
      annualPrice: 99.99,
      color: colors.accent,
      features: [
        { text: 'Everything in Plus', included: true },
        { text: 'Offline mode', included: true },
        { text: 'Shareable certificates', included: true },
        { text: 'Priority support', included: true },
        { text: 'Early access to new games', included: true },
        { text: 'Advanced analytics dashboard', included: true },
        { text: 'Custom learning paths', included: true },
        { text: 'API access', included: true },
      ],
      cta: 'Start 7-Day Free Trial',
      popular: false,
      trial: true,
    },
  ];

  const testimonials = [
    {
      quote: "Finally, physics makes sense! The interactive games helped me ace my AP Physics exam.",
      author: "Sarah M.",
      role: "High School Student",
      rating: 5,
    },
    {
      quote: "Way better than textbooks. My kids actually ask to practice physics now.",
      author: "Michael T.",
      role: "Parent of 2",
      rating: 5,
    },
    {
      quote: "The AI coach explains concepts better than my professor. Worth every penny.",
      author: "James L.",
      role: "Engineering Student",
      rating: 5,
    },
  ];

  const stats = [
    { value: '340+', label: 'Interactive Games' },
    { value: '50K+', label: 'Active Learners' },
    { value: '4.9', label: 'App Store Rating' },
    { value: '95%', label: 'Pass Rate Improvement' },
  ];

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const getAnnualSavings = (monthly: number, annual: number) => {
    if (monthly === 0) return 0;
    const yearlyIfMonthly = monthly * 12;
    return Math.round(((yearlyIfMonthly - annual) / yearlyIfMonthly) * 100);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>
            {'\uD83C\uDF93'}
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary }}>
            Atlas Coach
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="/" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>Home</a>
          <a href="/games" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>Games</a>
          <a href="/about" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>About</a>
          {auth?.isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {auth.subscription && auth.subscription.tier !== 'free' && (
                <button
                  onClick={handleManageSubscription}
                  style={{
                    background: 'transparent',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Manage Subscription
                </button>
              )}
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                {auth.user?.displayName || auth.user?.email || 'Account'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => auth?.showAuthModal('manual')}
              style={{
                background: colors.accent,
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Sign In
            </button>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '60px 24px 40px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 800,
          marginBottom: '16px',
          lineHeight: 1.2,
        }}>
          Simple, Transparent{' '}
          <span style={{ color: colors.accent }}>Pricing</span>
        </h1>
        <p style={{
          fontSize: '18px',
          color: colors.textSecondary,
          maxWidth: '600px',
          margin: '0 auto 32px',
          lineHeight: 1.6,
        }}>
          340+ interactive physics games with AI coaching.
          Start free, upgrade when you're ready.
        </p>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap',
          marginBottom: '40px',
        }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: colors.accent }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Billing Toggle */}
      <section style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '40px',
      }}>
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '4px',
          display: 'flex',
          gap: '4px',
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: billingCycle === 'monthly' ? colors.accent : 'transparent',
              color: billingCycle === 'monthly' ? 'white' : colors.textSecondary,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: billingCycle === 'annual' ? colors.accent : 'transparent',
              color: billingCycle === 'annual' ? 'white' : colors.textSecondary,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Annual
            <span style={{
              background: colors.success,
              color: 'white',
              padding: '2px 8px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              Save 30%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '960px',
        margin: '0 auto',
        padding: '0 24px 60px',
      }}>
        {pricingTiers.map((tier) => {
          const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
          const monthlyEquivalent = billingCycle === 'annual' && tier.annualPrice > 0
            ? (tier.annualPrice / 12).toFixed(2)
            : null;
          const savings = getAnnualSavings(tier.monthlyPrice, tier.annualPrice);
          const isHovered = hoveredTier === tier.id;

          return (
            <div
              key={tier.id}
              onMouseEnter={() => setHoveredTier(tier.id)}
              onMouseLeave={() => setHoveredTier(null)}
              style={{
                background: tier.popular
                  ? `linear-gradient(180deg, ${colors.bgCard} 0%, rgba(16, 185, 129, 0.08) 100%)`
                  : colors.bgCard,
                borderRadius: '16px',
                padding: '32px 24px',
                border: tier.popular
                  ? `2px solid ${colors.success}`
                  : `1px solid ${isHovered ? colors.border : 'transparent'}`,
                position: 'relative',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'translateY(-4px)' : 'none',
                boxShadow: tier.popular
                  ? '0 0 40px rgba(16, 185, 129, 0.2)'
                  : isHovered
                    ? '0 10px 40px rgba(0,0,0,0.3)'
                    : 'none',
              }}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: colors.success,
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Most Popular
                </div>
              )}

              {/* Tier Name */}
              <h3 style={{
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '4px',
                color: tier.color,
              }}>
                {tier.name}
              </h3>
              <p style={{
                fontSize: '14px',
                color: colors.textMuted,
                marginBottom: '24px',
              }}>
                {tier.tagline}
              </p>

              {/* Price */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 800 }}>
                    {formatPrice(price)}
                  </span>
                  {price > 0 && (
                    <span style={{ color: colors.textMuted, fontSize: '16px' }}>
                      /{billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                {monthlyEquivalent && price > 0 && (
                  <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>
                    Just ${monthlyEquivalent}/month
                    {savings > 0 && (
                      <span style={{ color: colors.success, marginLeft: '8px' }}>
                        (Save {savings}%)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Current plan indicator */}
              {auth?.subscription?.tier === tier.id && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: `1px solid ${colors.success}`,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}>
                  <span style={{ color: colors.success, fontSize: '12px', fontWeight: 600 }}>
                    Current Plan
                  </span>
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={() => handleTierCTA(tier.id)}
                disabled={checkoutLoading === tier.id}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: tier.popular ? 'none' : `1px solid ${colors.border}`,
                  background: tier.popular
                    ? `linear-gradient(135deg, ${colors.success}, #059669)`
                    : tier.id === 'pro'
                      ? `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`
                      : 'transparent',
                  color: tier.popular || tier.id === 'pro' ? 'white' : colors.textPrimary,
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: checkoutLoading === tier.id ? 'wait' : 'pointer',
                  marginBottom: '24px',
                  transition: 'all 0.2s',
                  opacity: checkoutLoading === tier.id ? 0.7 : 1,
                }}
              >
                {checkoutLoading === tier.id ? 'Redirecting...' : tier.cta}
                {tier.trial && checkoutLoading !== tier.id && <span style={{ opacity: 0.8, marginLeft: '4px' }}>{'\u2192'}</span>}
              </button>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tier.features.map((feature, idx) => (
                  <li key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: feature.included ? colors.textSecondary : colors.textMuted,
                  }}>
                    <span style={{
                      color: feature.included ? colors.success : colors.textMuted,
                      fontSize: '16px',
                      lineHeight: 1,
                    }}>
                      {feature.included ? '\u2713' : '\u2212'}
                    </span>
                    <span style={{
                      textDecoration: feature.included ? 'none' : 'line-through',
                      opacity: feature.included ? 1 : 0.5,
                    }}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Testimonials */}
      <section style={{
        maxWidth: '1000px',
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '40px',
        }}>
          Loved by learners worldwide
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ marginBottom: '16px' }}>
                {'\u2B50'.repeat(t.rating)}
              </div>
              <p style={{
                fontSize: '15px',
                color: colors.textSecondary,
                lineHeight: 1.6,
                marginBottom: '16px',
              }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.author}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        maxWidth: '700px',
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '40px',
        }}>
          Frequently Asked Questions
        </h2>
        {[
          {
            q: 'Can I try before I buy?',
            a: 'Yes! The Free tier gives you 5 games per day forever. Pro includes a 7-day free trial with full access to everything.',
          },
          {
            q: 'What\'s the difference between Plus and Pro?',
            a: 'Plus unlocks all 340+ games, AI coaching, and analytics. Pro adds offline mode, shareable certificates, priority support, and early access to new games.',
          },
          {
            q: 'Can I switch plans later?',
            a: 'Absolutely. Upgrade or downgrade anytime. If you upgrade, you\'ll get prorated credit. If you downgrade, changes apply at your next billing cycle.',
          },
          {
            q: 'Is there a money-back guarantee?',
            a: 'Yes! All paid plans come with a 30-day money-back guarantee. If you\'re not satisfied, we\'ll refund you — no questions asked.',
          },
          {
            q: 'Do you offer school or team pricing?',
            a: 'Yes! We offer special pricing for schools and organizations. Contact us at schools@atlascoach.com for bulk licensing.',
          },
        ].map((faq, idx) => (
          <div key={idx} style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '12px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              {faq.q}
            </h3>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
              {faq.a}
            </p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{
        textAlign: 'center',
        padding: '60px 24px 80px',
        background: `linear-gradient(180deg, transparent 0%, ${colors.bgCard} 100%)`,
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
          Ready to master physics?
        </h2>
        <p style={{ color: colors.textSecondary, marginBottom: '32px', fontSize: '18px' }}>
          Join 50,000+ learners. Start with 5 free games every day.
        </p>
        <button
          onClick={() => { window.location.href = '/games'; }}
          style={{
            background: `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`,
            color: 'white',
            border: 'none',
            padding: '18px 48px',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${colors.accentGlow}`,
          }}
        >
          Start Learning Free {'\u2192'}
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '14px' }}>
          {'\u00A9'} 2026 Atlas Coach. All rights reserved.
        </div>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <a href="/about" style={{ color: colors.textMuted, fontSize: '13px', textDecoration: 'none' }}>About</a>
          <a href="/privacy" style={{ color: colors.textMuted, fontSize: '13px', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms" style={{ color: colors.textMuted, fontSize: '13px', textDecoration: 'none' }}>Terms</a>
          <a href="/contact" style={{ color: colors.textMuted, fontSize: '13px', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
