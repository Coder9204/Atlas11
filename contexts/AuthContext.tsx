import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  subscribeToAuthState,
  signInAnonymousUser,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithFacebook as firebaseSignInWithFacebook,
  signInWithTwitter as firebaseSignInWithTwitter,
  signOut as firebaseSignOut,
  signUpWithEmail as firebaseSignUpWithEmail,
  signInWithEmail as firebaseSignInWithEmail,
  linkAnonymousToEmail,
  linkAnonymousToGoogle,
  linkAnonymousToFacebook,
  linkAnonymousToTwitter,
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
  signInWithFacebook(): Promise<void>;
  signInWithTwitter(): Promise<void>;
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
    hideAuthModal();
  }, [hideAuthModal]);

  const handleSignUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    const wasAnonymous = !!user?.isAnonymous;
    const reason = authModalState.reason;
    if (user?.isAnonymous) {
      await linkAnonymousToEmail(email, password, name);
    } else {
      await firebaseSignUpWithEmail(email, password, name);
    }
    trackSignupCompleted('email', wasAnonymous);
    clearFreeTimer();
    hideAuthModal();
    if (reason === 'pricing_cta') {
      window.location.href = '/pricing';
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

  const handleSignInWithFacebook = useCallback(async () => {
    const wasAnonymous = !!user?.isAnonymous;
    const reason = authModalState.reason;
    if (user?.isAnonymous) {
      await linkAnonymousToFacebook();
    } else {
      await firebaseSignInWithFacebook();
    }
    trackSignupCompleted('facebook', wasAnonymous);
    clearFreeTimer();
    hideAuthModal();
    if (reason === 'pricing_cta') {
      window.location.href = '/pricing';
    }
  }, [user, hideAuthModal, authModalState.reason]);

  const handleSignInWithTwitter = useCallback(async () => {
    const wasAnonymous = !!user?.isAnonymous;
    const reason = authModalState.reason;
    if (user?.isAnonymous) {
      await linkAnonymousToTwitter();
    } else {
      await firebaseSignInWithTwitter();
    }
    trackSignupCompleted('twitter', wasAnonymous);
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
    signInWithFacebook: handleSignInWithFacebook,
    signInWithTwitter: handleSignInWithTwitter,
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
