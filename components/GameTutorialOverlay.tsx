'use client';

import React, { useState } from 'react';
import { theme, withOpacity } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// GAME TUTORIAL OVERLAY — Explains the predict/play/review/test learning cycle
// Shown only on the user's very first game
// ─────────────────────────────────────────────────────────────────────────────

const TUTORIAL_KEY = 'atlas_tutorial_seen';

const phases = [
  {
    icon: '\uD83E\uDD14',
    title: 'Predict',
    description: 'Make your best guess before seeing the answer. This primes your brain to learn.',
    color: '#F59E0B',
  },
  {
    icon: '\uD83C\uDFAE',
    title: 'Play',
    description: 'Interact with the simulation. Adjust sliders, click buttons, and explore.',
    color: '#3B82F6',
  },
  {
    icon: '\uD83D\uDD0D',
    title: 'Review',
    description: 'Understand why the physics works this way. Compare your prediction to reality.',
    color: '#8B5CF6',
  },
  {
    icon: '\uD83C\uDFAF',
    title: 'Test',
    description: 'Prove your understanding with a new challenge. Earn mastery and unlock reviews.',
    color: '#22C55E',
  },
];

interface GameTutorialOverlayProps {
  onDismiss: () => void;
}

export default function GameTutorialOverlay({ onDismiss }: GameTutorialOverlayProps) {
  const [hoveredBtn, setHoveredBtn] = useState(false);

  const handleDismiss = () => {
    try {
      localStorage.setItem(TUTORIAL_KEY, 'true');
    } catch {}
    onDismiss();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      padding: 20,
      fontFamily: theme.fontFamily,
    }}>
      <div style={{
        background: theme.colors.bgCard,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 20,
        padding: 'clamp(24px, 5vw, 40px)',
        maxWidth: 520,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{'\u269B\uFE0F'}</div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: theme.colors.textPrimary,
          margin: '0 0 8px',
        }}>
          How Games Work
        </h2>
        <p style={{
          fontSize: 14,
          color: theme.colors.textMuted,
          margin: '0 0 28px',
          lineHeight: 1.5,
        }}>
          Every game follows a 4-phase learning cycle
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 28,
        }}>
          {phases.map((phase, i) => (
            <div key={i} style={{
              background: withOpacity(phase.color, 0.08),
              border: `1px solid ${withOpacity(phase.color, 0.2)}`,
              borderRadius: 14,
              padding: '18px 14px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{phase.icon}</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: phase.color,
                marginBottom: 4,
              }}>
                {i + 1}. {phase.title}
              </div>
              <div style={{
                fontSize: 12,
                color: theme.colors.textSecondary,
                lineHeight: 1.4,
              }}>
                {phase.description}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleDismiss}
          onMouseEnter={() => setHoveredBtn(true)}
          onMouseLeave={() => setHoveredBtn(false)}
          style={{
            padding: '14px 40px',
            background: theme.colors.info,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: theme.fontFamily,
            transform: hoveredBtn ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.2s',
          }}
        >
          Got it!
        </button>

        <p style={{
          fontSize: 11,
          color: theme.colors.textMuted,
          marginTop: 14,
          marginBottom: 0,
        }}>
          Your AI coach will guide you through each phase
        </p>
      </div>

      <style>{`
        @media (max-width: 480px) {
          [data-tutorial-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== 'true';
  } catch {
    return false;
  }
}
