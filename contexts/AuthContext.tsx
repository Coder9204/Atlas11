import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  subscribeToAuthState,
  signInAnonymousUser,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  signUpWithEmail as firebaseSignUpWithEmail,
  signInWithEmail as firebaseSignInWithEmail,
  linkAnonymousToEmail,
  linkAnonymousToGoogle,
  isFirebaseConfigured,
  getFirestoreInstance,
} from '../services/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { clearFreeTimer } from '../hooks/useFreeTimer';
import { getDailySecondsUsed } from '../hooks/useDailyPlayTimer';
import { trackAuthModalShown, trackAuthModalDismissed, trackSignupCompleted } from '../services/AnalyticsService';

export interface Subscription {
  tier: 'free' | 'plus' | 'pro';
  status: string;
}

export interface AuthModalState {
  open: boolean;
  reason: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  subscription: Subscription | null;
  freeTrialExpired: boolean;
  freeTrialSecondsLeft: number;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string, name: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  showAuthModal(reason?: string): void;
  hideAuthModal(): void;
  authModalState: AuthModalState;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [authModalState, setAuthModalState] = useState<AuthModalState>({ open: false, reason: '' });
  const [freeTrialExpired, setFreeTrialExpired] = useState(false);
  const subUnsubRef = useRef<(() => void) | null>(null);
  const timerTriggeredRef = useRef(false);

  const isAuthenticated = !!user && !user.isAnonymous;

  // Listen to auth state
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);

      // If no user, sign in anonymously
      if (!firebaseUser) {
        await signInAnonymousUser();
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to subscription status in Firestore
  useEffect(() => {
    if (subUnsubRef.current) {
      subUnsubRef.current();
      subUnsubRef.current = null;
    }

    if (!user || user.isAnonymous) {
      setSubscription(null);
      return;
    }

    const db = getFirestoreInstance();
    if (!db) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userDocRef, (snap) => {
      const data = snap.data();
      if (data?.subscription) {
        setSubscription({
          tier: data.subscription.tier || 'free',
          status: data.subscription.status || 'active',
        });
      } else {
        setSubscription({ tier: 'free', status: 'active' });
      }
    }, () => {
      // On error, default to free
      setSubscription({ tier: 'free', status: 'active' });
    });

    subUnsubRef.current = unsub;
    return () => unsub();
  }, [user]);

  // No longer auto-trigger based on wall-clock timer.
  // Time gating is handled by GameShell via useDailyPlayTimer.

  const showAuthModal = useCallback((reason = 'manual') => {
    trackAuthModalShown(reason);
    setAuthModalState({ open: true, reason });
  }, []);

  const hideAuthModal = useCallback(() => {
    trackAuthModalDismissed(authModalState.reason);
    setAuthModalState({ open: false, reason: '' });
  }, [authModalState.reason]);

  const handleSignInWithEmail = useCallback(async (email: string, password: string) => {
    await firebaseSignInWithEmail(email, password);
    clearFreeTimer();
    const reason = authModalState.reason;
    hideAuthModal();
    if (reason === 'pricing_cta') {
      window.location.href = '/pricing';
    }
  }, [hideAuthModal, authModalState.reason]);

  const handleSignUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    const wasAnonymous = !!user?.isAnonymous;
    try {
      if (user?.isAnonymous) {
        await linkAnonymousToEmail(email, password, name);
      } else {
        await firebaseSignUpWithEmail(email, password, name);
      }
      trackSignupCompleted('email', wasAnonymous);
      clearFreeTimer();
      // Don't close modal here — let AuthModal handle the verification flow.
      // Modal will close after user verifies email or clicks "Skip for now".
    } catch (err: any) {
      const code = err?.code || '';
      // If email is already registered and user was anonymous, fall back to sign-in.
      // This handles the "account already exists" case gracefully.
      if (
        (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') &&
        wasAnonymous
      ) {
        try {
          await firebaseSignOut();
          await firebaseSignInWithEmail(email, password);
          clearFreeTimer();
          const reason = authModalState.reason;
          hideAuthModal();
          if (reason === 'pricing_cta') {
            window.location.href = '/pricing';
          }
          return; // Successfully signed in with existing account
        } catch {
          // Sign-in fallback failed (e.g. wrong password) — re-throw original error
          // so AuthModal can show "account exists, try signing in" and switch tab
        }
      }
      throw err; // Re-throw for AuthModal to handle
    }
  }, [user, hideAuthModal, authModalState.reason]);

  const handleSignInWithGoogle = useCallback(async () => {
    const wasAnonymous = !!user?.isAnonymous;
    const reason = authModalState.reason;
    if (user?.isAnonymous) {
      await linkAnonymousToGoogle();
    } else {
      await firebaseSignInWithGoogle();
    }
    trackSignupCompleted('google', wasAnonymous);
    clearFreeTimer();
    hideAuthModal();
    if (reason === 'pricing_cta') {
      window.location.href = '/pricing';
    }
  }, [user, hideAuthModal, authModalState.reason]);

  const handleSignOut = useCallback(async () => {
    await firebaseSignOut();
    setSubscription(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    subscription,
    freeTrialExpired,
    freeTrialSecondsLeft: 0,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    showAuthModal,
    hideAuthModal,
    authModalState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
