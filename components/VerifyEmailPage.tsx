'use client';

import React, { useState, useEffect } from 'react';
import { submitVerificationCode } from '../services/emailVerificationService';

/**
 * /verify page — handles magic link email verification.
 * URL format: /verify?uid=xxx&code=123456
 * Also allows manual code entry if params are missing.
 */
const VerifyEmailPage: React.FC = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'manual'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = {
    bgPrimary: '#0a0a0f',
    bgCard: '#1a1a24',
    accent: '#3B82F6',
    success: '#10B981',
    error: '#EF4444',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const uid = params.get('uid');

    if (code && uid) {
      // Auto-verify via magic link
      verifyCode(code);
    } else {
      // No params — show manual entry
      setStatus('manual');
    }
  }, []);

  const verifyCode = async (code: string) => {
    setStatus('verifying');
    setLoading(true);
    try {
      const verified = await submitVerificationCode(code);
      if (verified) {
        setStatus('success');
        // Redirect to games after 2 seconds
        setTimeout(() => {
          window.location.href = '/games';
        }, 2500);
      } else {
        setStatus('error');
        setErrorMessage('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      const msg = err?.message || '';
      if (msg.includes('expired')) {
        setErrorMessage('This verification link has expired. Please request a new code from the sign-in modal.');
      } else if (msg.includes('Incorrect')) {
        setErrorMessage('Incorrect verification code. Please check your email and try again.');
      } else {
        setErrorMessage(msg || 'Verification failed. Please try again or request a new code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.length === 6) {
      verifyCode(manualCode);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: colors.bgCard,
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        maxWidth: 440,
        width: '100%',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src="/logo.png" alt="Coach Atlas" style={{ height: '40px', width: 'auto' }} />
        </a>

        {/* Verifying state */}
        {status === 'verifying' && (
          <>
            <div style={{
              width: 48, height: 48,
              border: `3px solid ${colors.accent}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verifying your email...</h1>
            <p style={{ color: colors.textSecondary, fontSize: 15 }}>Please wait a moment.</p>
          </>
        )}

        {/* Success state */}
        {status === 'success' && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: colors.success,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28, color: '#fff',
            }}>
              &#10003;
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Email verified!</h1>
            <p style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 24 }}>
              Your email has been confirmed. Redirecting to games...
            </p>
            <a href="/games" style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: colors.accent,
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
            }}>
              Go to Games
            </a>
          </>
        )}

        {/* Error state */}
        {status === 'error' && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `${colors.error}22`,
              border: `2px solid ${colors.error}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28, color: colors.error,
            }}>
              !
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verification failed</h1>
            <p style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 24 }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStatus('manual')}
                style={{
                  padding: '12px 24px',
                  background: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Enter Code Manually
              </button>
              <a href="/games" style={{
                padding: '12px 24px',
                background: 'transparent',
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}>
                Skip for Now
              </a>
            </div>
          </>
        )}

        {/* Manual code entry */}
        {status === 'manual' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Enter verification code</h1>
            <p style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 24 }}>
              Enter the 6-digit code from your email.
            </p>
            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                placeholder="000000"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px',
                  background: colors.bgPrimary,
                  border: `2px solid ${colors.border}`,
                  borderRadius: 12,
                  color: colors.textPrimary,
                  fontSize: 28,
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: 10,
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 16,
                }}
              />
              <button
                type="submit"
                disabled={loading || manualCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: loading || manualCode.length !== 6 ? 'not-allowed' : 'pointer',
                  opacity: loading || manualCode.length !== 6 ? 0.6 : 1,
                  marginBottom: 16,
                }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
            <a href="/games" style={{
              color: colors.textMuted,
              fontSize: 13,
              textDecoration: 'underline',
            }}>
              Skip verification
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
