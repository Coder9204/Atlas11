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
