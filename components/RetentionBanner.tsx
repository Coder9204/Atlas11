'use client';

import React, { useState, useMemo } from 'react';
import { theme, withOpacity } from '../lib/theme';
import { getAnalyticsSummary, getGamesReadyForReview, getBadges } from '../services/GameProgressService';

// ─────────────────────────────────────────────────────────────────────────────
// RETENTION BANNER — Shows streaks, review reminders, and badges
// ─────────────────────────────────────────────────────────────────────────────

const badgeInfo: Record<string, { icon: string; label: string }> = {
  five_games: { icon: '\uD83C\uDF1F', label: '5 games completed' },
  twenty_five_games: { icon: '\u2B50', label: '25 games completed' },
  hundred_games: { icon: '\uD83C\uDFC6', label: '100 games completed' },
  streak_3: { icon: '\uD83D\uDD25', label: '3-day streak' },
  streak_7: { icon: '\uD83D\uDCAA', label: '7-day streak' },
  streak_30: { icon: '\uD83D\uDE80', label: '30-day streak' },
  ten_passed: { icon: '\uD83C\uDF93', label: '10 games passed' },
};

export default function RetentionBanner() {
  const [dismissed, setDismissed] = useState(false);

  const data = useMemo(() => {
    const summary = getAnalyticsSummary();
    const reviewGames = getGamesReadyForReview();
    const earned = getBadges();
    return { streakDays: summary.streakDays, reviewCount: reviewGames.length, badges: earned };
  }, []);

  if (dismissed) return null;
  if (data.streakDays === 0 && data.reviewCount === 0 && data.badges.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '10px 16px',
      background: theme.colors.bgCard,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 12,
      marginBottom: 16,
      fontFamily: theme.fontFamily,
      flexWrap: 'wrap',
    }}>
      {/* Streak */}
      {data.streakDays > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ fontSize: 20 }}>{'\uD83D\uDD25'}</span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.colors.warning,
          }}>
            {data.streakDays} day streak!
          </span>
        </div>
      )}

      {/* Review due */}
      {data.reviewCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: withOpacity(theme.colors.accent, 0.1),
          padding: '4px 12px',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 14 }}>{'\uD83D\uDCDA'}</span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.colors.accent,
          }}>
            {data.reviewCount} {data.reviewCount === 1 ? 'game' : 'games'} ready for review
          </span>
        </div>
      )}

      {/* Badges */}
      {data.badges.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          {data.badges.slice(0, 3).map(b => {
            const info = badgeInfo[b];
            if (!info) return null;
            return (
              <span
                key={b}
                title={info.label}
                style={{
                  fontSize: 18,
                  cursor: 'default',
                }}
              >
                {info.icon}
              </span>
            );
          })}
          {data.badges.length > 3 && (
            <span style={{
              fontSize: 11,
              color: theme.colors.textMuted,
              marginLeft: 2,
            }}>
              +{data.badges.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          color: theme.colors.textMuted,
          fontSize: 16,
          cursor: 'pointer',
          padding: '2px 6px',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        {'\u00D7'}
      </button>
    </div>
  );
}
