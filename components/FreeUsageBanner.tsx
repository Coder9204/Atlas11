'use client';

import React from 'react';
import { useDailyPlayTimer, getDailySecondsUsed } from '../hooks/useDailyPlayTimer';
import { formatTimeRemaining, formatDailyLimit, DAILY_LIMITS, type AccessLevel } from '../lib/accessConfig';
import { useAuth } from '../contexts/AuthContext';
import { trackUpgradeClicked } from '../services/AnalyticsService';
import { theme, withOpacity } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// DAILY PLAY TIMER BANNER — Shows time-based daily usage for non-paid users
// ─────────────────────────────────────────────────────────────────────────────

export default function FreeUsageBanner() {
  // Use auth context for subscription status when available
  let auth: ReturnType<typeof useAuth> | null = null;
  try { auth = useAuth(); } catch { /* fallback if outside provider */ }

  // Determine tier from auth context
  const subTier = auth?.subscription?.tier;
  const hasPaidSub = subTier === 'plus' || subTier === 'pro';

  // Paid subscribers never see the banner
  if (hasPaidSub) return null;

  const isAuthenticated = auth?.isAuthenticated ?? false;
  const tier: AccessLevel = isAuthenticated
    ? (subTier as AccessLevel) || 'starter'
    : 'guest';

  // Guest users: show sign-up CTA (no timer needed)
  if (tier === 'guest') {
    return (
      <div style={{
        background: withOpacity(theme.colors.info, 0.08),
        border: `1px solid ${withOpacity(theme.colors.info, 0.2)}`,
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: theme.fontFamily,
        margin: '0 0 4px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.colors.textSecondary,
          }}>
            Sign up free for {formatDailyLimit('starter')} of gameplay
          </span>
        </div>
        <button
          onClick={() => auth?.showAuthModal('signup_required')}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            background: theme.colors.info,
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.4,
          }}
        >
          Sign Up
        </button>
      </div>
    );
  }

  // Authenticated free-tier users: show daily time remaining
  return <TimerBanner tier={tier} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timer sub-component (uses the hook, so must be its own component)
// ─────────────────────────────────────────────────────────────────────────────

function TimerBanner({ tier }: { tier: AccessLevel }) {
  // Banner doesn't tick — it just reads the current state
  const { secondsUsed, secondsRemaining, isExhausted, limit } = useDailyPlayTimer(tier, false);

  const ratio = limit > 0 ? Math.min(1, secondsUsed / limit) : 1;
  const isWarning = secondsRemaining > 0 && secondsRemaining < 120; // < 2 minutes

  const barColor = isExhausted
    ? theme.colors.error
    : isWarning
    ? theme.colors.warning
    : theme.colors.info;

  // Exhausted state: show reset message + upgrade button
  if (isExhausted) {
    return (
      <div style={{
        background: withOpacity(theme.colors.error, 0.08),
        border: `1px solid ${withOpacity(theme.colors.error, 0.2)}`,
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: theme.fontFamily,
        margin: '0 0 4px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.colors.error,
          }}>
            Daily play time used up &mdash; resets tomorrow
          </span>
          {/* Full progress bar */}
          <div style={{
            height: 4,
            background: withOpacity(theme.colors.error, 0.15),
            borderRadius: 2,
            overflow: 'hidden',
            marginTop: 5,
          }}>
            <div style={{
              height: '100%',
              width: '100%',
              background: theme.colors.error,
              borderRadius: 2,
            }} />
          </div>
        </div>
        <a
          href="/pricing"
          onClick={() => trackUpgradeClicked('daily_timer_banner')}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            background: theme.colors.error,
            padding: '6px 14px',
            borderRadius: 8,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Upgrade
        </a>
      </div>
    );
  }

  // Active state: show countdown + progress bar
  return (
    <div style={{
      background: withOpacity(barColor, 0.08),
      border: `1px solid ${withOpacity(barColor, 0.2)}`,
      borderRadius: 10,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontFamily: theme.fontFamily,
      margin: '0 0 4px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 5,
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: isWarning ? theme.colors.warning : theme.colors.textSecondary,
          }}>
            {formatTimeRemaining(secondsRemaining)} remaining today
          </span>
          <span style={{
            fontSize: 11,
            color: theme.colors.textMuted,
          }}>
            {formatDailyLimit(tier)}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{
          height: 4,
          background: withOpacity(barColor, 0.15),
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${ratio * 100}%`,
            background: barColor,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {isWarning && (
        <a
          href="/pricing"
          onClick={() => trackUpgradeClicked('daily_timer_banner')}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            background: barColor,
            padding: '6px 14px',
            borderRadius: 8,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Upgrade
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported helper for use in GameShell and other non-React contexts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the daily play time for the given tier is exhausted.
 * Safe to call outside React components.
 */
export function isDailyTimeExhausted(tier: AccessLevel): boolean {
  const used = getDailySecondsUsed();
  const limit = DAILY_LIMITS[tier] ?? DAILY_LIMITS.starter;
  return used >= limit;
}
