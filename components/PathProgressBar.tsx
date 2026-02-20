'use client';

import React from 'react';

// ============================================================================
// PATH PROGRESS BAR — Reusable component showing path completion
// ============================================================================

interface PathProgressBarProps {
  /** 0–100 percentage */
  percent: number;
  /** 'compact' for card-level, 'full' for dedicated view */
  variant?: 'compact' | 'full';
  /** Optional label to show */
  label?: string;
  /** Color of the fill bar */
  color?: string;
}

const colors = {
  track: '#2a2a3a',
  fill: '#3B82F6',
  text: '#9CA3AF',
  textBright: '#f0f0f5',
};

export default function PathProgressBar({
  percent,
  variant = 'compact',
  label,
  color,
}: PathProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const fillColor = color || (clampedPercent >= 100 ? '#22c55e' : colors.fill);
  const isCompact = variant === 'compact';

  return (
    <div style={{ width: '100%' }}>
      {(label || !isCompact) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isCompact ? 4 : 8,
        }}>
          {label && (
            <span style={{
              fontSize: isCompact ? 12 : 14,
              color: colors.text,
              fontWeight: 500,
            }}>
              {label}
            </span>
          )}
          <span style={{
            fontSize: isCompact ? 12 : 14,
            color: colors.textBright,
            fontWeight: 600,
          }}>
            {Math.round(clampedPercent)}%
          </span>
        </div>
      )}
      <div style={{
        height: isCompact ? 6 : 10,
        backgroundColor: colors.track,
        borderRadius: isCompact ? 3 : 5,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${clampedPercent}%`,
          backgroundColor: fillColor,
          borderRadius: isCompact ? 3 : 5,
          transition: 'width 0.5s ease',
          minWidth: clampedPercent > 0 ? 4 : 0,
        }} />
      </div>
    </div>
  );
}

// ============================================================================
// PATH GAME NODES — Visual timeline of games in a path
// ============================================================================

export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'mastered';

interface PathGameNodeProps {
  name: string;
  status: NodeStatus;
  isCurrent: boolean;
  score?: number;
  onClick?: () => void;
}

const statusIcons: Record<NodeStatus, string> = {
  locked: '\uD83D\uDD12',
  available: '\u25CB',
  in_progress: '\u25D4',
  completed: '\u2705',
  mastered: '\u2B50',
};

const statusColors: Record<NodeStatus, string> = {
  locked: '#4B5563',
  available: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#22c55e',
  mastered: '#A855F7',
};

export function PathGameNode({ name, status, isCurrent, score, onClick }: PathGameNodeProps) {
  const isClickable = status !== 'locked';

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 16px',
        backgroundColor: isCurrent ? '#1e293b' : 'transparent',
        border: isCurrent ? '1px solid #3B82F6' : '1px solid transparent',
        borderRadius: 10,
        cursor: isClickable ? 'pointer' : 'default',
        opacity: status === 'locked' ? 0.5 : 1,
        transition: 'all 0.2s ease',
        textAlign: 'left',
        color: '#f0f0f5',
        fontFamily: 'inherit',
      }}
    >
      {/* Status indicator */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: `${statusColors[status]}20`,
        border: `2px solid ${statusColors[status]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}>
        {statusIcons[status]}
      </div>

      {/* Game info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: isCurrent ? 600 : 400,
          color: status === 'locked' ? '#6B7280' : '#f0f0f5',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {name}
        </div>
        {score !== undefined && (
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            Score: {score}%
          </div>
        )}
      </div>

      {/* Play button for current */}
      {isCurrent && status !== 'locked' && (
        <div style={{
          padding: '6px 14px',
          backgroundColor: '#3B82F6',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: 'white',
          flexShrink: 0,
        }}>
          Play
        </div>
      )}
    </button>
  );
}
