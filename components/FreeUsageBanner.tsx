'use client';

import React from 'react';
import { theme, withOpacity } from '../lib/theme';
import { getMonthlyPlayCount, getFreeMonthlyLimit, isSubscribed } from '../services/GameProgressService';
import { useAuth } from '../contexts/AuthContext';
import { trackUpgradeClicked } from '../services/AnalyticsService';

// ─────────────────────────────────────────────────────────────────────────────
// FREE USAGE BANNER — Shows usage counter for free tier users
// ─────────────────────────────────────────────────────────────────────────────

export default function FreeUsageBanner() {
  // Use auth context for subscription status when available
  let auth: ReturnType<typeof useAuth> | null = null;
  try { auth = useAuth(); } catch { /* fallback to localStorage */ }

  const hasPaidSub = auth?.subscription && auth.subscription.tier !== 'free' && auth.subscription.status !== 'canceled';
  if (hasPaidSub || isSubscribed()) return null;

  const used = getMonthlyPlayCount();
  const limit = getFreeMonthlyLimit();
  const remaining = Math.max(0, limit - used);
  const ratio = Math.min(1, used / limit);
  const isWarning = remaining <= 1 && remaining > 0;
  const isExhausted = remaining === 0;

  const barColor = isExhausted
    ? theme.colors.error
    : isWarning
    ? theme.colors.warning
    : theme.colors.info;

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
            color: isExhausted ? theme.colors.error : theme.colors.textSecondary,
          }}>
            {isExhausted
              ? 'Monthly free games used up'
              : `${used} of ${limit} free games this month`}
          </span>
          <span style={{
            fontSize: 11,
            color: theme.colors.textMuted,
          }}>
            {remaining > 0 ? `${remaining} left` : ''}
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

      {(isWarning || isExhausted) && (
        <a
          href="/pricing"
          onClick={() => trackUpgradeClicked('free_usage_banner')}
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

/**
 * Returns true if the free tier limit has been reached.
 */
export function isFreeUsageExhausted(): boolean {
  if (isSubscribed()) return false;
  return getMonthlyPlayCount() >= getFreeMonthlyLimit();
}
