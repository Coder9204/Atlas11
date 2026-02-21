// Shared Design Token System — single source of truth for all visual constants

export const theme = {
  colors: {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    bgElevated: '#22222e',
    border: '#2a2a3a',
    borderLight: '#3a3a48',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    accent: '#8b5cf6',
    accentAlt: '#6366f1',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    cyan: '#06b6d4',
  },

  // Semantic colors for physics domains
  physics: {
    energy: '#f59e0b',
    force: '#ef4444',
    motion: '#3b82f6',
    wave: '#8b5cf6',
    heat: '#f97316',
    electric: '#06b6d4',
  },

  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const;

/** Parse a hex color to {r, g, b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Return `rgba(r, g, b, alpha)` from a hex color */
export function withOpacity(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten a hex color by `amount` (0–1) */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Darken a hex color by `amount` (0–1) */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}
