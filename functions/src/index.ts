/**
 * Firebase Cloud Functions for Project Atlas
 *
 * These functions act as a secure proxy for API calls,
 * keeping sensitive API keys on the server side.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Firebase Admin
admin.initializeApp();

// Rate limiting store (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 60,        // Max requests per window
  windowMs: 60 * 1000,    // 1 minute window
};

/**
 * Check if user is authenticated
 */
function verifyAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use this function.'
    );
  }
  return context.auth.uid;
}

/**
 * Rate limiting check
 */
function checkRateLimit(userId: string): void {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    });
    return;
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Rate limit exceeded. Please wait before making more requests.'
    );
  }

  userLimit.count++;
}

/**
 * Sanitize user input to prevent injection attacks
 */
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Input must be a string.'
    );
  }

  // Remove null bytes and control characters
  const sanitized = input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  // Limit input length
  if (sanitized.length > 100000) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Input too long. Maximum 100,000 characters.'
    );
  }

  return sanitized;
}

/**
 * Get Gemini API key from Firebase config
 */
function getGeminiApiKey(): string {
  const apiKey = functions.config().gemini?.key || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key not configured. Set it using: firebase functions:config:set gemini.key="YOUR_KEY"'
    );
  }

  return apiKey;
}

/**
 * Proxy for Gemini API calls
 *
 * Usage: Call this function with { prompt, options }
 * The API key stays on the server, never exposed to clients.
 */
export const geminiProxy = functions.https.onCall(async (data, context) => {
  // Verify authentication
  const userId = verifyAuth(context);

  // Check rate limit
  checkRateLimit(userId);

  // Validate and sanitize input
  const prompt = sanitizeInput(data.prompt || '');
  if (!prompt) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Prompt is required.'
    );
  }

  // Optional parameters
  const options = data.options || {};
  const systemInstruction = options.systemInstruction
    ? sanitizeInput(options.systemInstruction)
    : undefined;
  const temperature = typeof options.temperature === 'number'
    ? Math.max(0, Math.min(2, options.temperature))
    : 0.7;

  try {
    const genAI = new GoogleGenerativeAI(getGeminiApiKey());
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
      ...(systemInstruction && { systemInstruction })
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Log usage for analytics (no sensitive data)
    await admin.firestore().collection('analytics').add({
      userId,
      type: 'gemini_call',
      promptLength: prompt.length,
      responseLength: response.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { response };
  } catch (error: any) {
    console.error('Gemini API error:', error.message);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate response. Please try again.'
    );
  }
});

/**
 * Create a live session token
 *
 * This function creates a short-lived session token that can be used
 * for real-time streaming connections.
 */
export const createLiveSession = functions.https.onCall(async (data, context) => {
  // Verify authentication
  const userId = verifyAuth(context);

  // Check rate limit
  checkRateLimit(userId);

  try {
    // Create a session document
    const sessionRef = await admin.firestore()
      .collection('live_sessions')
      .add({
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        status: 'active'
      });

    // Generate a custom token for WebSocket authentication
    const customToken = await admin.auth().createCustomToken(userId, {
      sessionId: sessionRef.id
    });

    return {
      sessionId: sessionRef.id,
      token: customToken,
      expiresIn: 3600
    };
  } catch (error: any) {
    console.error('Session creation error:', error.message);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create session. Please try again.'
    );
  }
});

/**
 * Validate diagram data
 *
 * This function validates and sanitizes diagram/blueprint data
 * to prevent code injection attacks.
 */
export const validateDiagramData = functions.https.onCall(async (data, context) => {
  // Verify authentication
  const userId = verifyAuth(context);

  // Check rate limit
  checkRateLimit(userId);

  const diagramData = data.diagramData;

  if (!diagramData || typeof diagramData !== 'object') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Diagram data must be an object.'
    );
  }

  // Validate calculations (prevent code injection)
  if (diagramData.calculations) {
    for (const [key, formula] of Object.entries(diagramData.calculations)) {
      if (typeof formula !== 'string') continue;

      // Check for dangerous patterns (block code injection attempts)
      const dangerousPatterns = [
        /eval\s*\(/i,
        /function\s*\(/i,
        /=>/,
        /constructor/i,
        /prototype/i,
        /__proto__/i,
        /window/i,
        /document/i,
        /fetch/i,
        /import/i,
        /require/i,
        /process/i,
        /global/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(formula)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            `Unsafe calculation detected in "${key}". Only math operations are allowed.`
          );
        }
      }
    }
  }

  return { valid: true, data: diagramData };
});

/**
 * Health check endpoint
 */
export const healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =============================================================
// STRIPE & PAYMENT FUNCTIONS
// =============================================================

export { createCheckoutSession, handleStripeWebhook, createCustomerPortal } from './stripe';

// =============================================================
// EMAIL FUNCTIONS
// =============================================================

import { triggerEmail, sendEmail } from './email';
export { sendStreakReminders } from './email';

/**
 * Auth trigger: when a new user is created, send welcome email + ensure profile exists.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Create user profile if it doesn't exist
  const userRef = admin.firestore().collection('users').doc(user.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    await userRef.set({
      displayName: user.displayName || 'Learner',
      email: user.email || null,
      photoURL: user.photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveDate: admin.firestore.FieldValue.serverTimestamp(),
      emailPreferences: { marketing: true, streakReminders: true, productUpdates: true },
      settings: { theme: 'auto', voiceEnabled: true, difficulty: 'adaptive' },
    });
  }

  // Send welcome email
  if (user.email) {
    await triggerEmail(user.uid, 'welcome').catch((err) =>
      console.error('Failed to send welcome email:', err)
    );
  }
});

// =============================================================
// SECURE TEST ANSWER VALIDATION
// =============================================================

import { validateAnswer, getConfiguredGames } from './gameAnswers';

/**
 * Validate a test answer without revealing the correct answer.
 *
 * This is the CRITICAL security function that keeps test answers on the server.
 * The client NEVER receives the correct answer - only whether their answer was correct.
 *
 * Request: { gameId: string, questionIndex: number, selectedIndex: number }
 * Response: { correct: boolean, explanation: string }
 */
export const validateTestAnswer = functions.https.onCall(async (data, context) => {
  // Authentication is optional for test answers (allows guest users)
  // But we log authenticated users for analytics
  const userId = context.auth?.uid || 'anonymous';

  // Rate limiting (stricter for anonymous users)
  const rateLimit = context.auth ? RATE_LIMIT : { ...RATE_LIMIT, maxRequests: 30 };
  const userLimit = rateLimitStore.get(userId);
  const now = Date.now();

  if (userLimit && now < userLimit.resetTime && userLimit.count >= rateLimit.maxRequests) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Rate limit exceeded. Please wait before submitting more answers.'
    );
  }

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + rateLimit.windowMs });
  } else {
    userLimit.count++;
  }

  // Validate input
  const { gameId, questionIndex, selectedIndex } = data;

  if (typeof gameId !== 'string' || !gameId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'gameId is required and must be a string.'
    );
  }

  if (typeof questionIndex !== 'number' || questionIndex < 0 || questionIndex > 9) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'questionIndex must be a number between 0 and 9.'
    );
  }

  if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex > 3) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'selectedIndex must be a number between 0 and 3.'
    );
  }

  // Sanitize gameId (remove special characters, convert to lowercase)
  const sanitizedGameId = gameId.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  // Validate the answer
  const result = validateAnswer(sanitizedGameId, questionIndex, selectedIndex);

  if (!result) {
    // Game or question not found - don't reveal which
    throw new functions.https.HttpsError(
      'not-found',
      'Question not found. Please ensure the game is properly configured.'
    );
  }

  // Log the attempt for analytics (no correct answer logged)
  try {
    await admin.firestore().collection('test_attempts').add({
      userId,
      gameId: sanitizedGameId,
      questionIndex,
      correct: result.correct,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Don't fail the request if analytics logging fails
    console.error('Failed to log test attempt:', error);
  }

  // Return result WITHOUT revealing the correct answer
  return {
    correct: result.correct,
    explanation: result.explanation
  };
});

/**
 * Submit complete test and get final score.
 *
 * This validates all answers at once and returns the overall score.
 * Useful for batch validation and preventing tampering with individual results.
 *
 * Request: { gameId: string, answers: number[] }
 * Response: { score: number, total: number, passed: boolean, results: boolean[] }
 */
export const submitTest = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || 'anonymous';

  // Rate limiting
  checkRateLimit(userId);

  // Validate input
  const { gameId, answers } = data;

  if (typeof gameId !== 'string' || !gameId.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'gameId is required.'
    );
  }

  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'answers must be an array of exactly 10 numbers.'
    );
  }

  // Validate each answer is a valid number
  for (let i = 0; i < answers.length; i++) {
    if (typeof answers[i] !== 'number' || answers[i] < 0 || answers[i] > 3) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Answer at index ${i} must be a number between 0 and 3.`
      );
    }
  }

  const sanitizedGameId = gameId.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  // Validate all answers
  const results: boolean[] = [];
  let score = 0;

  for (let i = 0; i < 10; i++) {
    const result = validateAnswer(sanitizedGameId, i, answers[i]);
    if (!result) {
      throw new functions.https.HttpsError(
        'not-found',
        'Game not properly configured for test validation.'
      );
    }
    results.push(result.correct);
    if (result.correct) score++;
  }

  const passed = score >= 7; // 70% pass threshold

  // Log complete test submission
  try {
    await admin.firestore().collection('test_submissions').add({
      userId,
      gameId: sanitizedGameId,
      score,
      passed,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user progress if authenticated
    if (context.auth) {
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('game_progress')
        .doc(sanitizedGameId)
        .set({
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          bestScore: admin.firestore.FieldValue.increment(0), // Will be updated below
          passed,
        }, { merge: true });

      // Update best score if this is higher
      const progressDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('game_progress')
        .doc(sanitizedGameId)
        .get();

      const currentBest = progressDoc.data()?.bestScore || 0;
      if (score > currentBest) {
        await progressDoc.ref.update({ bestScore: score });
      }
    }
  } catch (error) {
    console.error('Failed to log test submission:', error);
  }

  return {
    score,
    total: 10,
    passed,
    results, // Array of true/false for each question
    // Note: We don't return explanations here to encourage reviewing in the game
  };
});

/**
 * Get list of games with configured answers.
 * Useful for admin dashboard to see coverage.
 */
export const getConfiguredGamesList = functions.https.onCall(async (data, context) => {
  // This endpoint is public (no auth required)
  return {
    games: getConfiguredGames(),
    count: getConfiguredGames().length
  };
});

// =============================================================
// EMAIL VERIFICATION
// =============================================================

/**
 * Send a 6-digit verification code to the user's email via Resend.
 * Stores the code in Firestore with a 10-minute TTL.
 * Also includes a magic link the user can click to verify instantly.
 */
export const sendVerificationCode = functions.https.onCall(async (data, context) => {
  const userId = verifyAuth(context);
  checkRateLimit(userId);

  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const userData = userDoc.data();
  const email = userData?.email || data.email;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid email is required.');
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store verification record
  await admin.firestore().collection('email_verifications').doc(userId).set({
    code,
    email,
    expiresAt,
    verified: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Build magic link
  const verifyUrl = `https://atlascoach.com/verify?uid=${userId}&code=${code}`;

  // Send via Resend
  await sendEmail(email, 'email_verification', {
    name: userData?.displayName || 'there',
    code,
    verifyUrl,
  });

  return { sent: true };
});

/**
 * Verify a 6-digit email verification code.
 * Marks the user's email as verified in Firestore.
 */
export const verifyEmailCode = functions.https.onCall(async (data, context) => {
  // Allow both authenticated calls and magic-link calls (with uid param)
  const userId = context.auth?.uid || data.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User ID required.');
  }

  const code = data.code;
  if (!code || typeof code !== 'string' || code.length !== 6) {
    throw new functions.https.HttpsError('invalid-argument', 'A 6-digit code is required.');
  }

  const verifyDoc = await admin.firestore().collection('email_verifications').doc(userId).get();
  const verifyData = verifyDoc.data();

  if (!verifyData) {
    throw new functions.https.HttpsError('not-found', 'No verification pending. Request a new code.');
  }

  if (verifyData.verified) {
    return { verified: true, alreadyVerified: true };
  }

  const expiresAt = verifyData.expiresAt?.toDate ? verifyData.expiresAt.toDate() : new Date(verifyData.expiresAt);
  if (new Date() > expiresAt) {
    throw new functions.https.HttpsError('deadline-exceeded', 'Code expired. Request a new code.');
  }

  if (verifyData.code !== code) {
    throw new functions.https.HttpsError('permission-denied', 'Incorrect code. Please try again.');
  }

  // Mark as verified
  await admin.firestore().collection('email_verifications').doc(userId).update({
    verified: true,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update user profile
  await admin.firestore().collection('users').doc(userId).update({
    emailVerified: true,
    emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { verified: true };
});

// =============================================================
// LIFECYCLE EMAIL TRIGGERS
// =============================================================

/**
 * Scheduled: send trial-ending emails 2 days before trial expires.
 * Runs daily at 10 AM UTC.
 */
export const sendTrialEndingEmails = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const db = admin.firestore();
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('users')
      .where('subscription.status', '==', 'trialing')
      .where('subscription.currentPeriodEnd', '>=', twoDaysFromNow.getTime())
      .where('subscription.currentPeriodEnd', '<', threeDaysFromNow.getTime())
      .where('emailPreferences.productUpdates', '==', true)
      .limit(500)
      .get();

    const promises: Promise<void>[] = [];
    for (const userDoc of snapshot.docs) {
      promises.push(
        triggerEmail(userDoc.id, 'trial_ending').catch((err) =>
          console.error(`Failed trial_ending email for ${userDoc.id}:`, err)
        )
      );
    }

    await Promise.all(promises);
    console.log(`Sent ${promises.length} trial ending emails.`);
  });

/**
 * Scheduled: send reactivation emails to users inactive for 14+ days.
 * Runs weekly on Mondays at 10 AM UTC.
 */
export const sendReactivationEmails = functions.pubsub
  .schedule('0 10 * * 1')
  .timeZone('UTC')
  .onRun(async () => {
    const db = admin.firestore();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('users')
      .where('emailPreferences.marketing', '==', true)
      .where('lastActiveDate', '>=', thirtyDaysAgo)
      .where('lastActiveDate', '<', fourteenDaysAgo)
      .limit(200)
      .get();

    const promises: Promise<void>[] = [];
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      if (userData.email) {
        promises.push(
          triggerEmail(userDoc.id, 'reactivation').catch((err) =>
            console.error(`Failed reactivation email for ${userDoc.id}:`, err)
          )
        );
      }
    }

    await Promise.all(promises);
    console.log(`Sent ${promises.length} reactivation emails.`);
  });

/**
 * Scheduled: send upgrade nudge emails to free users who have played 10+ games.
 * Runs Wednesdays at 10 AM UTC.
 */
export const sendUpgradeNudgeEmails = functions.pubsub
  .schedule('0 10 * * 3')
  .timeZone('UTC')
  .onRun(async () => {
    const db = admin.firestore();

    // Find free-tier users with emailPreferences.marketing enabled
    const snapshot = await db.collection('users')
      .where('subscription.tier', '==', 'free')
      .where('emailPreferences.marketing', '==', true)
      .limit(300)
      .get();

    const promises: Promise<void>[] = [];
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      if (!userData.email) continue;

      // Check if they have game progress (10+ games played)
      const progressSnap = await db.collection('users').doc(userDoc.id)
        .collection('game_progress').limit(10).get();

      if (progressSnap.size >= 10) {
        promises.push(
          sendEmail(userData.email, 'upgrade_nudge', {
            name: userData.displayName || 'Learner',
            gamesPlayed: String(progressSnap.size),
          }).catch((err) => console.error(`Failed upgrade_nudge email for ${userDoc.id}:`, err))
        );
      }
    }

    await Promise.all(promises);
    console.log(`Sent ${promises.length} upgrade nudge emails.`);
  });

/**
 * Firestore trigger: send milestone email when user reaches game completion milestones.
 * Fires when a game_progress doc is created/updated under a user.
 */
export const onGameProgressUpdate = functions.firestore
  .document('users/{userId}/game_progress/{gameId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const db = admin.firestore();

    // Count total completed games
    const progressSnap = await db.collection('users').doc(userId)
      .collection('game_progress')
      .where('passed', '==', true)
      .get();

    const completedCount = progressSnap.size;
    const milestones = [10, 25, 50, 100, 200, 300];
    const hitMilestone = milestones.find(m => m === completedCount);

    if (!hitMilestone) return;

    // Check user email preferences
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData?.email || !userData?.emailPreferences?.productUpdates) return;

    await sendEmail(userData.email, 'milestone', {
      name: userData.displayName || 'Learner',
      milestone: `${hitMilestone} games completed!`,
    }).catch((err) => console.error(`Failed milestone email for ${userId}:`, err));
  });
