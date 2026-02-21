'use client';

import React, { useState, useEffect } from 'react';

// ============================================================================
// TRANSFER PHASE VIEW - Shared component for all 340 game renderers
// ============================================================================
// Shows real-world applications one at a time in a tabbed interface.
// Accepts both `val` and `value` in stats arrays.
// Manages its own activeTab and completedSet state internally.
// ============================================================================

interface TransferPhaseViewProps {
  conceptName: string;
  applications: any[];
  onComplete: () => void;
  isMobile: boolean;
  colors: {
    primary?: string;
    primaryDark?: string;
    accent?: string;
    secondary?: string;
    success?: string;
    danger?: string;
    bgDark?: string;
    bgCard?: string;
    bgCardLight?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    border?: string;
    [key: string]: string | undefined;
  };
  typo?: {
    h1?: string;
    h2?: string;
    h3?: string;
    body?: string;
    small?: string;
    label?: string;
    heading?: string;
    [key: string]: string | undefined;
  };
  playSound?: (sound: string) => void;
}

// Default color palette (dark theme, matching existing renderers)
const defaultColors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  accent: '#6366f1',
  secondary: '#22c55e',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: 'rgba(148,163,184,0.8)',
  textMuted: 'rgba(100,116,139,0.7)',
  border: '#334155',
};

// Default typography sizes
const defaultTypo = {
  h1: '28px',
  h2: '24px',
  h3: '18px',
  body: '15px',
  small: '13px',
  label: '12px',
};

export function TransferPhaseView({
  conceptName,
  applications,
  onComplete,
  isMobile,
  colors: colorsProp,
  typo: typoProp,
  playSound,
}: TransferPhaseViewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set());

  // Merge provided colors/typo with defaults
  const c = { ...defaultColors, ...colorsProp };
  const t = { ...defaultTypo, ...typoProp };

  // Scroll to top when switching between applications
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [activeTab]);

  const totalApps = applications.length;
  const allCompleted = completedSet.size >= totalApps;
  const app = applications[activeTab];

  if (!app) return null;

  // Helper: resolve stat value from either `val` or `value`
  const statValue = (stat: { val?: string; value?: string }) =>
    stat.val || stat.value || '';

  // Find the next uncompleted tab index (wrapping around), or -1 if all done
  const findNextUncompleted = (afterIndex: number): number => {
    for (let offset = 1; offset <= totalApps; offset++) {
      const idx = (afterIndex + offset) % totalApps;
      if (!completedSet.has(idx)) return idx;
    }
    return -1;
  };

  // Is the current tab the last uncompleted one?
  const isLastUncompleted = (() => {
    if (completedSet.has(activeTab)) return false;
    const remaining = totalApps - completedSet.size;
    return remaining === 1;
  })();

  // Mark current app complete and handle navigation
  const handleGotIt = () => {
    const newCompleted = new Set(completedSet);
    newCompleted.add(activeTab);
    setCompletedSet(newCompleted);
    playSound?.('complete');

    if (isLastUncompleted) {
      // This was the last one -- all are now completed
      onComplete();
    } else {
      // Auto-advance to next uncompleted after brief delay
      const next = findNextUncompleted(activeTab);
      if (next !== -1) {
        setTimeout(() => setActiveTab(next), 300);
      }
    }
  };

  // Navigate to next uncompleted when current is already done
  const handleNext = () => {
    const next = findNextUncompleted(activeTab);
    if (next !== -1) {
      setActiveTab(next);
    }
  };

  // ---- Determine CTA label and action ----
  let ctaLabel: string;
  let ctaAction: () => void;

  if (allCompleted) {
    ctaLabel = 'Take the Quiz \u2192';
    ctaAction = onComplete;
  } else if (completedSet.has(activeTab)) {
    // Current already completed, more remain
    ctaLabel = 'Next \u2192';
    ctaAction = handleNext;
  } else if (isLastUncompleted) {
    ctaLabel = 'Got It \u2014 Take the Quiz \u2192';
    ctaAction = handleGotIt;
  } else {
    ctaLabel = 'Got It \u2014 Next Application';
    ctaAction = handleGotIt;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        // @ts-ignore -- dvh override for modern mobile browsers
        minHeight: '100dvh',
        background: c.bgDark,
        display: 'flex',
        flexDirection: 'column',
      } as React.CSSProperties}
    >
      {/* ---- Sticky Header ---- */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: `${c.bgDark}ee`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: isMobile ? '16px 12px 12px' : '20px 16px 14px',
          textAlign: 'center',
          borderBottom: `1px solid ${c.border}40`,
        }}
      >
        <p
          style={{
            fontSize: t.label,
            color: c.textMuted,
            margin: '0 0 4px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontWeight: 600,
          }}
        >
          Step 8 &mdash; Real World
        </p>
        <h2
          style={{
            fontSize: isMobile ? '18px' : t.h2,
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
          }}
        >
          {conceptName} in the Real World
        </h2>
      </div>

      {/* ---- Scrollable Content ---- */}
      <div
        style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isMobile ? '16px 12px' : '24px 16px',
        }}
      >
        <p
          style={{
            fontSize: t.small,
            color: c.textSecondary,
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Explore all {totalApps} applications to unlock the quiz
        </p>

        {/* ---- Tab bar ---- */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {applications.map((a: any, index: number) => {
          const isActive = activeTab === index;
          const isDone = completedSet.has(index);
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                transition: 'all 0.3s ease',
                background: isActive
                  ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                  : isDone
                    ? `${c.success}20`
                    : c.bgCardLight,
                color: isActive
                  ? '#ffffff'
                  : isDone
                    ? c.success
                    : c.textSecondary,
                whiteSpace: 'nowrap',
                position: 'relative' as const,
                zIndex: 10,
              }}
            >
              {isDone && '\u2713 '}{a.icon} {a.short}
            </button>
          );
        })}
      </div>

      {/* ---- Application content card ---- */}
      <div
        style={{
          borderRadius: '16px',
          padding: isMobile ? '20px 16px' : '24px',
          maxWidth: '700px',
          width: '100%',
          border: `1px solid ${app.color}40`,
          marginBottom: '24px',
          background: `linear-gradient(135deg, ${app.color}15, ${app.color}05)`,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Icon + Title + Tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              flexShrink: 0,
              background: `linear-gradient(135deg, ${app.color}30, ${app.color}10)`,
            }}
          >
            {app.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: t.h3,
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '4px',
                margin: 0,
              }}
            >
              {app.title}
            </h3>
            <p
              style={{
                fontSize: t.small,
                color: c.textSecondary,
                margin: '4px 0 0 0',
              }}
            >
              {app.tagline}
            </p>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: t.body,
            color: c.textSecondary,
            lineHeight: 1.7,
            marginBottom: '20px',
            margin: '0 0 20px 0',
          }}
        >
          {app.description}
        </p>

        {/* Connection box (only if present) */}
        {app.connection && (
          <div
            style={{
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '12px',
              background: c.bgCard,
              borderTop: `1px solid ${app.color}30`,
              borderRight: `1px solid ${app.color}30`,
              borderBottom: `1px solid ${app.color}30`,
              borderLeft: `4px solid ${app.color}`,
            }}
          >
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Connection
            </h4>
            <p
              style={{
                fontSize: t.small,
                color: c.textSecondary,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {app.connection}
            </p>
          </div>
        )}

        {/* How It Works */}
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '12px',
            background: `${app.color}10`,
            border: `1px solid ${app.color}20`,
          }}
        >
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '8px',
              margin: '0 0 8px 0',
            }}
          >
            How It Works
          </h4>
          <p
            style={{
              fontSize: t.small,
              color: c.textSecondary,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {app.howItWorks}
          </p>
        </div>

        {/* Stats grid */}
        {app.stats && app.stats.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile && app.stats.length > 2
                ? 'repeat(2, 1fr)'
                : `repeat(${Math.min(app.stats.length, 3)}, 1fr)`,
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {app.stats.map((stat: any, i: number) => (
              <div
                key={i}
                style={{
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  background: `${app.color}15`,
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: app.color,
                  }}
                >
                  {statValue(stat)}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: c.textSecondary,
                    lineHeight: 1.3,
                    marginTop: '4px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Real Examples */}
        {app.examples && app.examples.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Real Examples
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {app.examples.map((ex: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: app.color, fontSize: '14px', lineHeight: 1.5 }}>
                    {'\u2022'}
                  </span>
                  <span
                    style={{
                      fontSize: t.small,
                      color: c.textSecondary,
                      lineHeight: 1.5,
                    }}
                  >
                    {ex}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Companies */}
        {app.companies && app.companies.length > 0 && (
          <div
            style={{
              marginBottom: '20px',
              paddingTop: '16px',
              borderTop: `1px solid ${c.border}`,
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: c.textMuted,
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Leading Companies
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {app.companies.map((company: string, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: `${c.bgCardLight}80`,
                    color: c.textSecondary,
                  }}
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Future Impact */}
        {app.futureImpact && (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: `${app.color}08`,
              border: `1px solid ${app.color}15`,
              marginBottom: '20px',
            }}
          >
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Future Impact
            </h4>
            <p
              style={{
                fontSize: t.small,
                color: c.textSecondary,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {app.futureImpact}
            </p>
          </div>
        )}

      </div>
      </div>

      {/* ---- Sticky Footer ---- */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 20,
          background: `${c.bgDark}ee`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: isMobile ? '12px 16px 16px' : '14px 24px 20px',
          borderTop: `1px solid ${c.border}40`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <button
          onClick={ctaAction}
          style={{
            width: '100%',
            maxWidth: '700px',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 600,
            fontSize: t.body,
            cursor: 'pointer',
            background: allCompleted
              ? `linear-gradient(135deg, ${c.success}, ${c.success}cc)`
              : `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
            color: '#ffffff',
            transition: 'all 0.3s ease',
            boxShadow: allCompleted
              ? `0 4px 12px ${c.success}30`
              : `0 4px 12px ${app.color}30`,
          }}
        >
          {ctaLabel}
        </button>
        <p
          style={{
            fontSize: '13px',
            color: c.textMuted,
            margin: 0,
            textAlign: 'center',
          }}
        >
          {completedSet.size} of {totalApps} explored
          {!allCompleted && ` \u2014 ${totalApps - completedSet.size} more to continue`}
        </p>
      </div>
    </div>
  );
}

export default TransferPhaseView;
