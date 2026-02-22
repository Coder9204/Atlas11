'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestVerificationCode, submitVerificationCode } from '../services/emailVerificationService';
import { theme } from '../lib/theme';

const REASONS: Record<string, { title: string; subtitle: string }> = {
  timer_expired: {
    title: 'Your free preview has ended',
    subtitle: 'Sign in or create a free account to keep learning.',
  },
  signup_required: {
    title: 'Sign in to play',
    subtitle: 'Sign in or create a free account to unlock 15 minutes of daily gameplay across all 340+ games.',
  },
  paywall: {
    title: 'Upgrade to continue',
    subtitle: 'Sign in or create an account to access this content.',
  },
  pricing_cta: {
    title: 'Sign in to subscribe',
    subtitle: 'Sign in or create an account to start your subscription.',
  },
  manual: {
    title: 'Welcome back',
    subtitle: 'Sign in to your account or create a new one.',
  },
};

type ModalStep = 'auth' | 'verify';

export default function AuthModal() {
  const { authModalState, hideAuthModal, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  // Email verification state
  const [step, setStep] = useState<ModalStep>('auth');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  if (!authModalState.open) return null;

  const reason = REASONS[authModalState.reason] || REASONS.manual;

  /** Close modal and redirect to pricing if the modal was opened for pricing_cta */
  const closeModal = () => {
    const currentReason = authModalState.reason;
    hideAuthModal();
    setStep('auth');
    setSignupComplete(false);
    setVerificationCode('');
    setVerificationSuccess(false);
    setError('');
    if (signupComplete && currentReason === 'pricing_cta') {
      window.location.href = '/pricing';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
        // signInWithEmail closes modal and handles redirect via AuthContext
      } else {
        await signUpWithEmail(email, password, name);
        // Signup succeeded — mark complete and proceed to verification
        setSignupComplete(true);
        try {
          await requestVerificationCode(email);
          setVerificationSent(true);
          setStep('verify');
        } catch {
          // Verification send failed, but account was created — close modal
          closeModal();
        }
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
        // Auto-switch to sign-in tab so user can sign in with existing account
        setTab('signin');
        setError('An account with this email already exists. Sign in with your password below.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/user-not-found') {
        // Auto-switch to signup tab
        setTab('signup');
        setError('No account found with this email. Create one below.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // Google auth is handled by AuthContext (closes modal + redirects if needed)
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/account-exists-with-different-credential') {
        setTab('signin');
        setError('An account already exists with this email. Try signing in with email and password instead.');
      } else if (code === 'auth/popup-closed-by-user') {
        // User closed popup, no error needed
      } else {
        setError(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      setError('Enter your email above, then click "Reset Password".');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { resetPassword } = await import('../services/firebase');
      await resetPassword(email);
      setError('');
      setShowForgotPassword(false);
      alert('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const verified = await submitVerificationCode(verificationCode);
      if (verified) {
        setVerificationSuccess(true);
        setTimeout(() => {
          closeModal();
        }, 1500);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('expired')) {
        setError('Code expired. Click "Resend" to get a new code.');
      } else if (msg.includes('Incorrect')) {
        setError('Incorrect code. Please check your email and try again.');
      } else {
        setError(msg || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await requestVerificationCode(email);
      setVerificationSent(true);
      setError('');
    } catch (err: any) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: theme.colors.bgSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 8,
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: theme.fontFamily,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const socialBtnStyle = (bg: string): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    background: bg,
    color: bg === '#fff' ? '#333' : '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: theme.fontFamily,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    opacity: loading ? 0.7 : 1,
  });

  return (
    <div
      onClick={closeModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.colors.bgCard,
          borderRadius: 16,
          border: `1px solid ${theme.colors.border}`,
          maxWidth: 420,
          width: '100%',
          padding: '32px 28px',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: 20,
            cursor: 'pointer',
            padding: 4,
            lineHeight: 1,
          }}
        >
          &#10005;
        </button>

        {/* ─── VERIFICATION STEP ─── */}
        {step === 'verify' ? (
          <>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: theme.colors.textPrimary,
              fontFamily: theme.fontFamily,
              margin: '0 0 4px',
            }}>
              {verificationSuccess ? 'Email verified!' : 'Check your email'}
            </h2>
            <p style={{
              fontSize: 14,
              color: theme.colors.textMuted,
              fontFamily: theme.fontFamily,
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}>
              {verificationSuccess
                ? 'Your email has been verified. Redirecting...'
                : `We sent a 6-digit code to ${email}. Enter it below or click the link in the email.`}
            </p>

            {verificationSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: 48 }}>&#10003;</span>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(val);
                  }}
                  maxLength={6}
                  style={{
                    ...inputStyle,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: 8,
                    marginBottom: 12,
                  }}
                  autoFocus
                />

                {error && (
                  <p style={{
                    fontSize: 13,
                    color: theme.colors.error,
                    fontFamily: theme.fontFamily,
                    margin: '0 0 12px',
                    lineHeight: 1.4,
                  }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: theme.colors.info,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: theme.fontFamily,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || verificationCode.length !== 6 ? 0.7 : 1,
                    marginBottom: 12,
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={handleResendCode}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: theme.colors.textMuted,
                      fontSize: 13,
                      fontFamily: theme.fontFamily,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Resend code
                  </button>
                  <button
                    onClick={closeModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: theme.colors.textMuted,
                      fontSize: 13,
                      fontFamily: theme.fontFamily,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Skip for now
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* ─── AUTH STEP ─── */
          <>
            {/* Header */}
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: theme.colors.textPrimary,
              fontFamily: theme.fontFamily,
              margin: '0 0 4px',
            }}>
              {reason.title}
            </h2>
            <p style={{
              fontSize: 14,
              color: theme.colors.textMuted,
              fontFamily: theme.fontFamily,
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}>
              {reason.subtitle}
            </p>

            {/* Social login buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {/* Google */}
              <button onClick={() => handleSocialLogin('google')} disabled={loading} style={socialBtnStyle('#fff')}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}>
              <div style={{ flex: 1, height: 1, background: theme.colors.border }} />
              <span style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.fontFamily }}>or use email</span>
              <div style={{ flex: 1, height: 1, background: theme.colors.border }} />
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: 4,
              marginBottom: 20,
              background: theme.colors.bgSecondary,
              borderRadius: 8,
              padding: 3,
            }}>
              {(['signin', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: tab === t ? theme.colors.info : 'transparent',
                    color: tab === t ? '#fff' : theme.colors.textMuted,
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: theme.fontFamily,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {t === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'signup' && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />

              {error && (
                <p style={{
                  fontSize: 13,
                  color: theme.colors.error,
                  fontFamily: theme.fontFamily,
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: theme.colors.info,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: theme.fontFamily,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Forgot password */}
            {tab === 'signin' && (
              <button
                onClick={showForgotPassword ? handleForgotPassword : () => setShowForgotPassword(true)}
                style={{
                  display: 'block',
                  margin: '12px auto 0',
                  background: 'none',
                  border: 'none',
                  color: theme.colors.textMuted,
                  fontSize: 13,
                  fontFamily: theme.fontFamily,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {showForgotPassword ? 'Send Reset Email' : 'Forgot password?'}
              </button>
            )}

            {/* Terms */}
            <p style={{
              fontSize: 11,
              color: theme.colors.textMuted,
              fontFamily: theme.fontFamily,
              textAlign: 'center',
              margin: '16px 0 0',
              lineHeight: 1.5,
            }}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
