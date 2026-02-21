/**
 * Firebase Configuration and Services
 *
 * This module provides secure Firebase integration for Project Atlas.
 * - Authentication for user management
 * - Firestore for data persistence
 * - Cloud Functions for secure API proxying
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  updateProfile,
  User,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';

// Firebase configuration from environment variables
// These are safe to expose - they only identify the project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Singleton instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your_firebase_api_key'
  );
}

/**
 * Initialize Firebase (lazy initialization)
 */
export function initializeFirebase(): FirebaseApp | null {
  if (app) return app;

  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured. Running in local-only mode.');
    return null;
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);

    console.log('Firebase initialized successfully');
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

/**
 * Get Firebase Auth instance
 */
export function getAuthInstance(): Auth | null {
  if (!auth) initializeFirebase();
  return auth;
}

/**
 * Get Firestore instance
 */
export function getFirestoreInstance(): Firestore | null {
  if (!db) initializeFirebase();
  return db;
}

/**
 * Get Functions instance
 */
export function getFunctionsInstance(): Functions | null {
  if (!functions) initializeFirebase();
  return functions;
}

// ============================================
// AUTHENTICATION SERVICES
// ============================================

/**
 * Sign in anonymously (for users who don't want to create an account)
 */
export async function signInAnonymousUser(): Promise<User | null> {
  const authInstance = getAuthInstance();
  if (!authInstance) return null;

  try {
    const result = await signInAnonymously(authInstance);
    return result.user;
  } catch (error) {
    console.error('Anonymous sign-in failed:', error);
    return null;
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User | null> {
  const authInstance = getAuthInstance();
  if (!authInstance) return null;

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);

    // Create/update user profile in Firestore
    await createUserProfile(result.user);

    return result.user;
  } catch (error) {
    console.error('Google sign-in failed:', error);
    return null;
  }
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  const authInstance = getAuthInstance();
  if (!authInstance) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(authInstance, callback);
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const authInstance = getAuthInstance();
  if (!authInstance) return;

  try {
    await authInstance.signOut();
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, name?: string): Promise<User | null> {
  const authInstance = getAuthInstance();
  if (!authInstance) return null;

  try {
    const result = await createUserWithEmailAndPassword(authInstance, email, password);
    if (name) {
      await updateProfile(result.user, { displayName: name });
    }
    await createUserProfile(result.user, name);
    return result.user;
  } catch (error) {
    console.error('Email sign-up failed:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  const authInstance = getAuthInstance();
  if (!authInstance) return null;

  try {
    const result = await signInWithEmailAndPassword(authInstance, email, password);
    return result.user;
  } catch (error) {
    console.error('Email sign-in failed:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  const authInstance = getAuthInstance();
  if (!authInstance) return;

  try {
    await sendPasswordResetEmail(authInstance, email);
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

/**
 * Upgrade anonymous user to email/password account (preserves UID)
 */
export async function linkAnonymousToEmail(email: string, password: string, name?: string): Promise<User | null> {
  const authInstance = getAuthInstance();
  if (!authInstance?.currentUser) return null;

  try {
    const credential = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(authInstance.currentUser, credential);
    if (name) {
      await updateProfile(result.user, { displayName: name });
    }
    await createUserProfile(result.user, name);
    return result.user;
  } catch (error) {
    console.error('Anonymous to email link failed:', error);
    throw error;
  }
}

/**
 * Upgrade anonymous user to Google account (preserves UID)
 */
export async function linkAnonymousToGoogle(): Promise<User | null> {
  const authInstance = getAuthInstance();
  if (!authInstance?.currentUser) return null;

  try {
    const provider = new GoogleAuthProvider();
    const result = await linkWithPopup(authInstance.currentUser, provider);
    await createUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error('Anonymous to Google link failed:', error);
    throw error;
  }
}

// ============================================
// USER DATA SERVICES
// ============================================

/**
 * Create or update user profile
 */
async function createUserProfile(user: User, name?: string): Promise<void> {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  const userRef = doc(dbInstance, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      displayName: name || user.displayName || 'Learner',
      email: user.email || null,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActiveDate: serverTimestamp(),
      emailPreferences: { marketing: true, streakReminders: true, productUpdates: true },
      settings: {
        theme: 'auto',
        voiceEnabled: true,
        difficulty: 'adaptive'
      }
    });
  } else {
    await updateDoc(userRef, {
      displayName: name || user.displayName || undefined,
      email: user.email || undefined,
      photoURL: user.photoURL || undefined,
      updatedAt: serverTimestamp(),
      lastActiveDate: serverTimestamp(),
    });
  }
}

/**
 * Save learning progress
 */
export async function saveLearningProgress(
  userId: string,
  topicId: string,
  progress: {
    mastery: number;
    lastActivity: string;
    achievements: string[];
  }
): Promise<void> {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return;

  const progressRef = doc(dbInstance, 'users', userId, 'progress', topicId);
  await setDoc(progressRef, {
    ...progress,
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

/**
 * Get learning progress for a topic
 */
export async function getLearningProgress(
  userId: string,
  topicId: string
): Promise<any | null> {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return null;

  const progressRef = doc(dbInstance, 'users', userId, 'progress', topicId);
  const progressDoc = await getDoc(progressRef);

  return progressDoc.exists() ? progressDoc.data() : null;
}

/**
 * Save session data
 */
export async function saveSession(
  userId: string,
  sessionData: {
    topic: string;
    duration: number;
    summary: string;
  }
): Promise<string | null> {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return null;

  const sessionsRef = collection(dbInstance, 'users', userId, 'sessions');
  const newSessionRef = doc(sessionsRef);

  await setDoc(newSessionRef, {
    ...sessionData,
    createdAt: serverTimestamp()
  });

  return newSessionRef.id;
}

/**
 * Get recent sessions
 */
export async function getRecentSessions(
  userId: string,
  limitCount: number = 10
): Promise<any[]> {
  const dbInstance = getFirestoreInstance();
  if (!dbInstance) return [];

  const sessionsRef = collection(dbInstance, 'users', userId, 'sessions');
  const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// ============================================
// SECURE API PROXY (via Cloud Functions)
// ============================================

/**
 * Call Gemini API securely through Firebase Functions
 * This keeps the API key on the server side
 */
export async function callGeminiSecure(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string | null> {
  const functionsInstance = getFunctionsInstance();
  if (!functionsInstance) {
    console.warn('Firebase Functions not available. Using direct API call.');
    return null;
  }

  try {
    const geminiProxy = httpsCallable(functionsInstance, 'geminiProxy');
    const result = await geminiProxy({ prompt, options });
    return (result.data as any).response;
  } catch (error) {
    console.error('Gemini proxy call failed:', error);
    return null;
  }
}

/**
 * Start a live Gemini session through Firebase Functions
 */
export async function createSecureLiveSession(): Promise<any | null> {
  const functionsInstance = getFunctionsInstance();
  if (!functionsInstance) {
    console.warn('Firebase Functions not available for live session.');
    return null;
  }

  try {
    const createSession = httpsCallable(functionsInstance, 'createLiveSession');
    const result = await createSession({});
    return result.data;
  } catch (error) {
    console.error('Failed to create secure live session:', error);
    return null;
  }
}

// Export types for external use
export type { User, FirebaseApp };
