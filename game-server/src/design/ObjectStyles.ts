/**
 * Object Styles - Realistic Presets for Physics Objects
 *
 * Provides pre-built styles for common physics simulation objects
 * with realistic materials, gradients, shadows, and highlights.
 *
 * These styles are designed to:
 * - Look realistic and professional
 * - Be immediately recognizable
 * - Work well across all viewports
 * - Support educational clarity
 */

import {
  ObjectStyle,
  ObjectCategory,
  MaterialType,
  GradientDef,
  ShadowDef,
  HighlightDef,
  DetailLevel,
} from './types.js';

// ============================================================
// COLOR PALETTES
// ============================================================

/**
 * Educational color palette - distinct, accessible, professional
 */
export const COLORS = {
  // Primary objects
  primary: {
    base: '#06b6d4',      // Cyan
    light: '#22d3ee',
    dark: '#0891b2',
    glow: '#67e8f9',
  },

  // Secondary objects
  secondary: {
    base: '#a855f7',      // Purple
    light: '#c084fc',
    dark: '#9333ea',
    glow: '#d8b4fe',
  },

  // Accent/highlight
  accent: {
    base: '#f59e0b',      // Amber
    light: '#fbbf24',
    dark: '#d97706',
    glow: '#fcd34d',
  },

  // Success states
  success: {
    base: '#10b981',      // Emerald
    light: '#34d399',
    dark: '#059669',
  },

  // Warning/energy
  energy: {
    base: '#ef4444',      // Red
    light: '#f87171',
    dark: '#dc2626',
    glow: '#fca5a5',
  },

  // Neutral materials
  metal: {
    steel: '#94a3b8',
    silver: '#cbd5e1',
    gold: '#fcd34d',
    copper: '#fb923c',
    iron: '#64748b',
  },

  // Natural materials
  wood: {
    light: '#d4a574',
    medium: '#b8860b',
    dark: '#8b4513',
  },

  // Glass and water
  transparent: {
    glass: 'rgba(200, 220, 255, 0.3)',
    water: 'rgba(56, 189, 248, 0.5)',
    air: 'rgba(255, 255, 255, 0.1)',
  },

  // Backgrounds
  background: {
    dark: '#020617',
    medium: '#0f172a',
    light: '#1e293b',
  },

  // Text
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
};

// ============================================================
// GRADIENT PRESETS
// ============================================================

/**
 * Create a metallic ball gradient
 */
export function createMetallicBallGradient(id: string, baseColor: string, highlightColor: string): GradientDef {
  return {
    type: 'radial',
    id,
    cx: '30%',
    cy: '30%',
    r: '70%',
    stops: [
      { offset: '0%', color: highlightColor, opacity: 1 },
      { offset: '50%', color: baseColor, opacity: 1 },
      { offset: '100%', color: darkenColor(baseColor, 30), opacity: 1 },
    ],
  };
}

/**
 * Create a glass/transparent gradient
 */
export function createGlassGradient(id: string): GradientDef {
  return {
    type: 'linear',
    id,
    angle: 135,
    stops: [
      { offset: '0%', color: '#ffffff', opacity: 0.4 },
      { offset: '50%', color: '#ffffff', opacity: 0.1 },
      { offset: '100%', color: '#000000', opacity: 0.1 },
    ],
  };
}

/**
 * Create a wood grain gradient
 */
export function createWoodGradient(id: string, baseColor: string): GradientDef {
  return {
    type: 'linear',
    id,
    angle: 0,
    stops: [
      { offset: '0%', color: baseColor, opacity: 1 },
      { offset: '25%', color: darkenColor(baseColor, 10), opacity: 1 },
      { offset: '50%', color: baseColor, opacity: 1 },
      { offset: '75%', color: darkenColor(baseColor, 15), opacity: 1 },
      { offset: '100%', color: baseColor, opacity: 1 },
    ],
  };
}

/**
 * Create an energy/glow gradient
 */
export function createEnergyGradient(id: string, coreColor: string, glowColor: string): GradientDef {
  return {
    type: 'radial',
    id,
    cx: '50%',
    cy: '50%',
    r: '50%',
    stops: [
      { offset: '0%', color: '#ffffff', opacity: 1 },
      { offset: '30%', color: coreColor, opacity: 1 },
      { offset: '70%', color: glowColor, opacity: 0.8 },
      { offset: '100%', color: glowColor, opacity: 0 },
    ],
  };
}

// ============================================================
// SHADOW PRESETS
// ============================================================

export const SHADOWS = {
  /** Subtle shadow for small objects */
  subtle: {
    offsetX: 2,
    offsetY: 2,
    blur: 4,
    color: '#000000',
    opacity: 0.2,
  } as ShadowDef,

  /** Standard shadow for medium objects */
  standard: {
    offsetX: 4,
    offsetY: 4,
    blur: 8,
    color: '#000000',
    opacity: 0.3,
  } as ShadowDef,

  /** Strong shadow for large/heavy objects */
  strong: {
    offsetX: 6,
    offsetY: 8,
    blur: 16,
    color: '#000000',
    opacity: 0.4,
  } as ShadowDef,

  /** Elevated shadow (floating objects) */
  elevated: {
    offsetX: 0,
    offsetY: 12,
    blur: 24,
    color: '#000000',
    opacity: 0.3,
  } as ShadowDef,

  /** Glow shadow for energy/light objects */
  glow: {
    offsetX: 0,
    offsetY: 0,
    blur: 20,
    color: '#06b6d4',
    opacity: 0.6,
  } as ShadowDef,
};

// ============================================================
// HIGHLIGHT PRESETS
// ============================================================

export const HIGHLIGHTS = {
  /** Specular highlight for shiny objects */
  specular: {
    type: 'specular',
    position: { x: 0.3, y: 0.3 },
    size: 0.15,
    color: '#ffffff',
    opacity: 0.8,
  } as HighlightDef,

  /** Soft ambient highlight */
  ambient: {
    type: 'ambient',
    position: { x: 0.5, y: 0.2 },
    size: 0.4,
    color: '#ffffff',
    opacity: 0.2,
  } as HighlightDef,

  /** Rim light for edge definition */
  rim: {
    type: 'rim',
    position: { x: 0.8, y: 0.5 },
    size: 0.1,
    color: '#ffffff',
    opacity: 0.4,
  } as HighlightDef,
};

// ============================================================
// OBJECT STYLE PRESETS
// ============================================================

/**
 * Ball/Sphere styles for projectiles
 */
export const BALL_STYLES: Record<string, ObjectStyle> = {
  /** Standard physics ball - cyan metallic */
  standard: {
    id: 'ball_standard',
    name: 'Physics Ball',
    category: 'projectile',
    material: 'metal_polished',
    fill: `url(#ball_standard_gradient)`,
    stroke: COLORS.primary.dark,
    strokeWidth: 1,
    gradients: [createMetallicBallGradient('ball_standard_gradient', COLORS.primary.base, COLORS.primary.light)],
    shadow: SHADOWS.standard,
    highlights: [HIGHLIGHTS.specular],
    detailLevel: 'standard',
  },

  /** Rubber ball - matte finish */
  rubber: {
    id: 'ball_rubber',
    name: 'Rubber Ball',
    category: 'projectile',
    material: 'rubber',
    fill: COLORS.energy.base,
    stroke: COLORS.energy.dark,
    strokeWidth: 2,
    shadow: SHADOWS.subtle,
    detailLevel: 'standard',
  },

  /** Steel ball bearing */
  steel: {
    id: 'ball_steel',
    name: 'Steel Ball',
    category: 'projectile',
    material: 'metal_polished',
    fill: `url(#ball_steel_gradient)`,
    gradients: [createMetallicBallGradient('ball_steel_gradient', COLORS.metal.steel, COLORS.metal.silver)],
    shadow: SHADOWS.standard,
    highlights: [HIGHLIGHTS.specular, HIGHLIGHTS.rim],
    detailLevel: 'detailed',
  },

  /** Bowling ball - heavy, dark */
  bowling: {
    id: 'ball_bowling',
    name: 'Bowling Ball',
    category: 'projectile',
    material: 'plastic_glossy',
    fill: '#1e293b',
    stroke: '#0f172a',
    strokeWidth: 2,
    shadow: SHADOWS.strong,
    highlights: [HIGHLIGHTS.specular],
    detailLevel: 'standard',
  },

  /** Tennis ball - fuzzy texture */
  tennis: {
    id: 'ball_tennis',
    name: 'Tennis Ball',
    category: 'projectile',
    material: 'fabric',
    fill: '#bef264',
    stroke: '#84cc16',
    strokeWidth: 2,
    shadow: SHADOWS.subtle,
    detailLevel: 'standard',
  },

  /** Particle/atom - glowing */
  particle: {
    id: 'ball_particle',
    name: 'Particle',
    category: 'particle',
    material: 'energy',
    fill: `url(#ball_particle_gradient)`,
    gradients: [createEnergyGradient('ball_particle_gradient', COLORS.primary.base, COLORS.primary.glow)],
    shadow: { ...SHADOWS.glow, color: COLORS.primary.glow },
    detailLevel: 'standard',
  },
};

/**
 * Block/Box styles for rigid bodies
 */
export const BLOCK_STYLES: Record<string, ObjectStyle> = {
  /** Standard physics block */
  standard: {
    id: 'block_standard',
    name: 'Physics Block',
    category: 'rigid_body',
    material: 'plastic_matte',
    fill: COLORS.secondary.base,
    stroke: COLORS.secondary.dark,
    strokeWidth: 2,
    shadow: SHADOWS.standard,
    detailLevel: 'standard',
  },

  /** Wooden crate */
  wooden: {
    id: 'block_wooden',
    name: 'Wooden Crate',
    category: 'rigid_body',
    material: 'wood_light',
    fill: `url(#block_wooden_gradient)`,
    stroke: COLORS.wood.dark,
    strokeWidth: 2,
    gradients: [createWoodGradient('block_wooden_gradient', COLORS.wood.light)],
    shadow: SHADOWS.standard,
    detailLevel: 'detailed',
  },

  /** Metal block */
  metal: {
    id: 'block_metal',
    name: 'Metal Block',
    category: 'rigid_body',
    material: 'metal_brushed',
    fill: COLORS.metal.iron,
    stroke: COLORS.metal.steel,
    strokeWidth: 1,
    shadow: SHADOWS.strong,
    highlights: [HIGHLIGHTS.ambient],
    detailLevel: 'standard',
  },

  /** Ice block - transparent */
  ice: {
    id: 'block_ice',
    name: 'Ice Block',
    category: 'rigid_body',
    material: 'glass_frosted',
    fill: 'rgba(200, 230, 255, 0.6)',
    stroke: 'rgba(150, 200, 255, 0.8)',
    strokeWidth: 2,
    shadow: SHADOWS.subtle,
    opacity: 0.8,
    detailLevel: 'standard',
  },
};

/**
 * Spring styles for elastic objects
 */
export const SPRING_STYLES: Record<string, ObjectStyle> = {
  /** Standard coil spring */
  standard: {
    id: 'spring_standard',
    name: 'Coil Spring',
    category: 'elastic',
    material: 'metal_polished',
    fill: 'none',
    stroke: COLORS.metal.steel,
    strokeWidth: 3,
    shadow: SHADOWS.subtle,
    detailLevel: 'standard',
  },

  /** Rubber band */
  rubber: {
    id: 'spring_rubber',
    name: 'Rubber Band',
    category: 'elastic',
    material: 'rubber',
    fill: 'none',
    stroke: COLORS.accent.base,
    strokeWidth: 4,
    detailLevel: 'minimal',
  },
};

/**
 * Pendulum styles
 */
export const PENDULUM_STYLES: Record<string, ObjectStyle> = {
  /** Standard pendulum bob */
  standard: {
    id: 'pendulum_standard',
    name: 'Pendulum Bob',
    category: 'pendulum',
    material: 'metal_polished',
    fill: `url(#pendulum_gradient)`,
    gradients: [createMetallicBallGradient('pendulum_gradient', COLORS.metal.gold, '#fff7cc')],
    shadow: SHADOWS.standard,
    highlights: [HIGHLIGHTS.specular],
    detailLevel: 'standard',
  },

  /** String/rod for pendulum */
  string: {
    id: 'pendulum_string',
    name: 'Pendulum String',
    category: 'connector',
    material: 'fabric',
    fill: 'none',
    stroke: COLORS.text.muted,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },
};

/**
 * Container styles (beakers, boxes, boundaries)
 */
export const CONTAINER_STYLES: Record<string, ObjectStyle> = {
  /** Glass beaker */
  beaker: {
    id: 'container_beaker',
    name: 'Glass Beaker',
    category: 'container',
    material: 'glass_clear',
    fill: 'rgba(200, 220, 255, 0.15)',
    stroke: 'rgba(200, 220, 255, 0.6)',
    strokeWidth: 2,
    gradients: [createGlassGradient('beaker_glass_gradient')],
    opacity: 0.9,
    detailLevel: 'standard',
  },

  /** Ground/floor */
  ground: {
    id: 'container_ground',
    name: 'Ground',
    category: 'support',
    material: 'stone',
    fill: COLORS.background.light,
    stroke: COLORS.text.muted,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },

  /** Wall boundary */
  wall: {
    id: 'container_wall',
    name: 'Wall',
    category: 'support',
    material: 'stone',
    fill: COLORS.background.medium,
    stroke: COLORS.text.muted,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },
};

/**
 * Arrow/Vector styles for indicators
 */
export const ARROW_STYLES: Record<string, ObjectStyle> = {
  /** Velocity vector */
  velocity: {
    id: 'arrow_velocity',
    name: 'Velocity Vector',
    category: 'indicator',
    material: 'energy',
    fill: COLORS.primary.base,
    stroke: COLORS.primary.dark,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },

  /** Force vector */
  force: {
    id: 'arrow_force',
    name: 'Force Vector',
    category: 'indicator',
    material: 'energy',
    fill: COLORS.energy.base,
    stroke: COLORS.energy.dark,
    strokeWidth: 3,
    detailLevel: 'minimal',
  },

  /** Acceleration vector */
  acceleration: {
    id: 'arrow_acceleration',
    name: 'Acceleration Vector',
    category: 'indicator',
    material: 'energy',
    fill: COLORS.accent.base,
    stroke: COLORS.accent.dark,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },

  /** Displacement vector */
  displacement: {
    id: 'arrow_displacement',
    name: 'Displacement',
    category: 'indicator',
    material: 'plastic_matte',
    fill: COLORS.success.base,
    stroke: COLORS.success.dark,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },
};

/**
 * Measurement tool styles
 */
export const MEASUREMENT_STYLES: Record<string, ObjectStyle> = {
  /** Ruler */
  ruler: {
    id: 'measurement_ruler',
    name: 'Ruler',
    category: 'measurement',
    material: 'plastic_matte',
    fill: COLORS.background.light,
    stroke: COLORS.text.secondary,
    strokeWidth: 1,
    detailLevel: 'standard',
  },

  /** Protractor */
  protractor: {
    id: 'measurement_protractor',
    name: 'Protractor',
    category: 'measurement',
    material: 'plastic_glossy',
    fill: 'rgba(200, 220, 255, 0.2)',
    stroke: COLORS.text.secondary,
    strokeWidth: 1,
    detailLevel: 'standard',
  },

  /** Grid reference */
  grid: {
    id: 'measurement_grid',
    name: 'Reference Grid',
    category: 'measurement',
    material: 'air',
    fill: 'none',
    stroke: COLORS.text.muted,
    strokeWidth: 1,
    opacity: 0.3,
    detailLevel: 'minimal',
  },
};

/**
 * Center of mass marker
 */
export const MARKER_STYLES: Record<string, ObjectStyle> = {
  /** Center of mass marker */
  centerOfMass: {
    id: 'marker_com',
    name: 'Center of Mass',
    category: 'indicator',
    material: 'energy',
    fill: COLORS.accent.base,
    stroke: COLORS.accent.dark,
    strokeWidth: 2,
    shadow: { ...SHADOWS.glow, color: COLORS.accent.glow },
    detailLevel: 'standard',
  },

  /** Pivot point */
  pivot: {
    id: 'marker_pivot',
    name: 'Pivot Point',
    category: 'support',
    material: 'metal_polished',
    fill: COLORS.text.secondary,
    stroke: COLORS.text.muted,
    strokeWidth: 2,
    detailLevel: 'minimal',
  },

  /** Target/goal marker */
  target: {
    id: 'marker_target',
    name: 'Target',
    category: 'indicator',
    material: 'plastic_glossy',
    fill: COLORS.success.base,
    stroke: COLORS.success.dark,
    strokeWidth: 2,
    detailLevel: 'standard',
  },
};

// ============================================================
// STYLE REGISTRY
// ============================================================

/**
 * All available object styles
 */
export const OBJECT_STYLES = {
  balls: BALL_STYLES,
  blocks: BLOCK_STYLES,
  springs: SPRING_STYLES,
  pendulums: PENDULUM_STYLES,
  containers: CONTAINER_STYLES,
  arrows: ARROW_STYLES,
  measurements: MEASUREMENT_STYLES,
  markers: MARKER_STYLES,
};

/**
 * Get a style by category and name
 */
export function getStyle(category: keyof typeof OBJECT_STYLES, name: string): ObjectStyle | undefined {
  return OBJECT_STYLES[category]?.[name];
}

/**
 * Get all styles for a category
 */
export function getStylesForCategory(category: keyof typeof OBJECT_STYLES): ObjectStyle[] {
  return Object.values(OBJECT_STYLES[category] || {});
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Lighten a hex color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Create a custom ball style based on a preset
 */
export function createCustomBallStyle(
  id: string,
  name: string,
  baseColor: string,
  options: Partial<ObjectStyle> = {}
): ObjectStyle {
  const gradientId = `${id}_gradient`;
  return {
    id,
    name,
    category: 'projectile',
    material: 'metal_polished',
    fill: `url(#${gradientId})`,
    stroke: darkenColor(baseColor, 20),
    strokeWidth: 1,
    gradients: [createMetallicBallGradient(gradientId, baseColor, lightenColor(baseColor, 30))],
    shadow: SHADOWS.standard,
    highlights: [HIGHLIGHTS.specular],
    detailLevel: 'standard',
    ...options,
  };
}

/**
 * Create a custom block style
 */
export function createCustomBlockStyle(
  id: string,
  name: string,
  baseColor: string,
  options: Partial<ObjectStyle> = {}
): ObjectStyle {
  return {
    id,
    name,
    category: 'rigid_body',
    material: 'plastic_matte',
    fill: baseColor,
    stroke: darkenColor(baseColor, 20),
    strokeWidth: 2,
    shadow: SHADOWS.standard,
    detailLevel: 'standard',
    ...options,
  };
}
