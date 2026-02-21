import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { mapPriceIdToTier, syncSubscriptionToFirestore } from './subscription';
import { triggerEmail } from './email';

function getStripe(): Stripe {
  const secretKey = functions.config().stripe?.secret_key;
  if (!secretKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Stripe secret key not configured.'
    );
  }
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });
}

function getPriceConfig(): Record<string, string> {
  const prices = functions.config().stripe?.prices || {};
  return {
    plus_monthly: prices.plus_monthly || '',
    plus_annual: prices.plus_annual || '',
    pro_monthly: prices.pro_monthly || '',
    pro_annual: prices.pro_annual || '',
  };
}

/**
 * Create a Stripe Checkout session for subscription or one-time purchase.
 */
export const createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const uid = context.auth.uid;
  const { priceId } = data;

  if (!priceId || typeof priceId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'priceId is required.');
  }

  const stripe = getStripe();
  const priceConfig = getPriceConfig();

  // Get or create Stripe customer
  const userRef = admin.firestore().collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  let customerId = userData?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email || context.auth.token.email || undefined,
      metadata: { firebaseUID: uid },
    });
    customerId = customer.id;
    await userRef.set({ stripeCustomerId: customerId }, { merge: true });
  }

  const tier = mapPriceIdToTier(priceId, priceConfig);

  // Build session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${data.successUrl || 'https://atlascoach.com/games'}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: data.cancelUrl || 'https://atlascoach.com/pricing',
    metadata: { firebaseUID: uid, tier },
  };

  // Add trial for Pro subscriptions
  if (tier === 'pro') {
    sessionParams.subscription_data = {
      trial_period_days: 7,
      metadata: { firebaseUID: uid, tier },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { sessionId: session.id, url: session.url };
});

/**
 * Handle Stripe webhooks — raw HTTP endpoint, NOT onCall.
 */
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = functions.config().stripe?.webhook_secret;

  if (!webhookSecret) {
    res.status(500).send('Webhook secret not configured.');
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).send('Missing stripe-signature header.');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const priceConfig = getPriceConfig();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // For subscription mode, the subscription.created/updated events handle syncing
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.firebaseUID;
        if (!uid) break;

        const priceId = sub.items.data[0]?.price?.id || '';
        const tier = mapPriceIdToTier(priceId, priceConfig);

        await syncSubscriptionToFirestore(uid, {
          tier,
          status: sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });

        if (event.type === 'customer.subscription.created') {
          await triggerEmail(uid, 'subscription_confirmed').catch(console.error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.firebaseUID;
        if (!uid) break;

        await syncSubscriptionToFirestore(uid, {
          tier: 'free',
          status: 'canceled',
          stripeSubscriptionId: sub.id,
        });
        await triggerEmail(uid, 'subscription_canceled').catch(console.error);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const uid = sub.metadata?.firebaseUID;
        if (!uid) break;

        await syncSubscriptionToFirestore(uid, {
          tier: mapPriceIdToTier(sub.items.data[0]?.price?.id || '', priceConfig),
          status: 'past_due',
          stripeSubscriptionId: sub.id,
        });
        await triggerEmail(uid, 'payment_failed').catch(console.error);
        break;
      }
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
  }

  res.json({ received: true });
});

/**
 * Create a Stripe Customer Portal session for subscription management.
 */
export const createCustomerPortal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const uid = context.auth.uid;
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  const customerId = userDoc.data()?.stripeCustomerId;

  if (!customerId) {
    throw new functions.https.HttpsError('not-found', 'No billing account found.');
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: data.returnUrl || 'https://atlascoach.com/pricing',
  });

  return { url: portalSession.url };
});
