/**
 * 3D Visualization Helpers
 *
 * Provides utilities for presenting 3D physics concepts in 2D
 * with proper depth cues, perspective, and clarity.
 *
 * Key techniques:
 * - Isometric projection
 * - Perspective with depth cues
 * - Shadow casting for depth
 * - Size attenuation
 * - Multi-view presentation
 */

import {
  Visualization3DMode,
  Visualization3DConfig,
  DepthCues,
} from './types.js';

// ============================================================
// PROJECTION SYSTEMS
// ============================================================

/**
 * 3D point in world space
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 2D point on screen
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Isometric projection angles
 */
export const ISOMETRIC = {
  /** Standard isometric angle (30°) */
  angle: Math.PI / 6, // 30 degrees

  /** Scale factors for each axis */
  scale: {
    x: Math.cos(Math.PI / 6),
    y: Math.sin(Math.PI / 6),
    z: 1,
  },
};

/**
 * Project a 3D point to 2D using isometric projection
 */
export function projectIsometric(
  point: Point3D,
  origin: Point2D = { x: 0, y: 0 },
  scale: number = 1
): Point2D {
  return {
    x: origin.x + (point.x - point.y) * ISOMETRIC.scale.x * scale,
    y: origin.y + (point.x + point.y) * ISOMETRIC.scale.y * scale - point.z * scale,
  };
}

/**
 * Project a 3D point to 2D using perspective projection
 */
export function projectPerspective(
  point: Point3D,
  camera: {
    position: Point3D;
    focalLength: number;
  },
  origin: Point2D = { x: 0, y: 0 }
): Point2D {
  const dx = point.x - camera.position.x;
  const dy = point.y - camera.position.y;
  const dz = point.z - camera.position.z;

  // Avoid division by zero
  const distance = Math.max(0.1, dz);
  const scale = camera.focalLength / distance;

  return {
    x: origin.x + dx * scale,
    y: origin.y - dy * scale, // Y is inverted in screen coordinates
  };
}

/**
 * Project a 3D point to 2D using orthographic projection
 */
export function projectOrthographic(
  point: Point3D,
  viewAngle: { pitch: number; yaw: number },
  origin: Point2D = { x: 0, y: 0 },
  scale: number = 1
): Point2D {
  // Rotate point based on view angle
  const cosPitch = Math.cos(viewAngle.pitch);
  const sinPitch = Math.sin(viewAngle.pitch);
  const cosYaw = Math.cos(viewAngle.yaw);
  const sinYaw = Math.sin(viewAngle.yaw);

  // Apply yaw (rotation around Z axis)
  const x1 = point.x * cosYaw - point.y * sinYaw;
  const y1 = point.x * sinYaw + point.y * cosYaw;
  const z1 = point.z;

  // Apply pitch (rotation around X axis)
  const y2 = y1 * cosPitch - z1 * sinPitch;
  const z2 = y1 * sinPitch + z1 * cosPitch;

  return {
    x: origin.x + x1 * scale,
    y: origin.y - z2 * scale, // Y is inverted, use Z for height
  };
}

// ============================================================
// DEPTH CUES
// ============================================================

/**
 * Calculate size attenuation based on distance
 * Objects farther away appear smaller
 */
export function calculateSizeAttenuation(
  distance: number,
  baseSize: number,
  minScale: number = 0.3,
  maxDistance: number = 100
): number {
  const normalizedDistance = Math.min(distance / maxDistance, 1);
  const scale = 1 - normalizedDistance * (1 - minScale);
  return baseSize * scale;
}

/**
 * Calculate color attenuation (atmospheric perspective)
 * Objects farther away are less saturated and lighter
 */
export function calculateAtmosphericPerspective(
  distance: number,
  baseColor: string,
  fogColor: string = '#94a3b8',
  maxDistance: number = 100
): string {
  const normalizedDistance = Math.min(distance / maxDistance, 1);

  // Parse colors
  const base = parseColor(baseColor);
  const fog = parseColor(fogColor);

  // Blend towards fog color
  const r = Math.round(base.r + (fog.r - base.r) * normalizedDistance * 0.5);
  const g = Math.round(base.g + (fog.g - base.g) * normalizedDistance * 0.5);
  const b = Math.round(base.b + (fog.b - base.b) * normalizedDistance * 0.5);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Calculate blur amount for depth-based blur
 */
export function calculateDepthBlur(
  distance: number,
  focalDistance: number,
  maxBlur: number = 5
): number {
  const blur = Math.abs(distance - focalDistance) / focalDistance;
  return Math.min(blur * maxBlur, maxBlur);
}

/**
 * Calculate shadow offset based on light direction and height
 */
export function calculateShadow(
  objectPosition: Point3D,
  lightDirection: Point3D,
  groundY: number = 0
): { offset: Point2D; scale: number; opacity: number } {
  // Height above ground
  const height = objectPosition.z - groundY;

  if (height <= 0) {
    return { offset: { x: 0, y: 0 }, scale: 1, opacity: 0 };
  }

  // Shadow offset based on light direction
  const offsetX = -lightDirection.x * height;
  const offsetY = -lightDirection.y * height;

  // Shadow gets larger and more diffuse with height
  const scale = 1 + height * 0.01;

  // Shadow gets lighter with height
  const opacity = Math.max(0.1, 0.4 - height * 0.01);

  return {
    offset: { x: offsetX, y: offsetY },
    scale,
    opacity,
  };
}

// ============================================================
// 3D SHAPE HELPERS
// ============================================================

/**
 * Generate points for a 3D cube in isometric view
 */
export function getCubePoints(
  center: Point3D,
  size: number,
  origin: Point2D,
  scale: number = 1
): {
  front: Point2D[];
  top: Point2D[];
  side: Point2D[];
} {
  const half = size / 2;

  // Define cube vertices
  const vertices: Point3D[] = [
    { x: center.x - half, y: center.y - half, z: center.z - half }, // 0: front-bottom-left
    { x: center.x + half, y: center.y - half, z: center.z - half }, // 1: front-bottom-right
    { x: center.x + half, y: center.y + half, z: center.z - half }, // 2: back-bottom-right
    { x: center.x - half, y: center.y + half, z: center.z - half }, // 3: back-bottom-left
    { x: center.x - half, y: center.y - half, z: center.z + half }, // 4: front-top-left
    { x: center.x + half, y: center.y - half, z: center.z + half }, // 5: front-top-right
    { x: center.x + half, y: center.y + half, z: center.z + half }, // 6: back-top-right
    { x: center.x - half, y: center.y + half, z: center.z + half }, // 7: back-top-left
  ];

  // Project all vertices
  const projected = vertices.map(v => projectIsometric(v, origin, scale));

  return {
    // Front face (visible)
    front: [projected[0], projected[1], projected[5], projected[4]],
    // Top face (visible)
    top: [projected[4], projected[5], projected[6], projected[7]],
    // Right side face (visible)
    side: [projected[1], projected[2], projected[6], projected[5]],
  };
}

/**
 * Generate points for a 3D sphere approximation (circle with shading)
 */
export function getSphereShading(
  center: Point2D,
  radius: number,
  lightDirection: Point3D
): {
  highlightOffset: Point2D;
  highlightRadius: number;
  gradientAngle: number;
} {
  // Highlight position based on light direction
  const highlightOffset = {
    x: -lightDirection.x * radius * 0.3,
    y: -lightDirection.z * radius * 0.3,
  };

  // Highlight size
  const highlightRadius = radius * 0.2;

  // Gradient angle for shading
  const gradientAngle = Math.atan2(lightDirection.z, lightDirection.x) * (180 / Math.PI);

  return {
    highlightOffset,
    highlightRadius,
    gradientAngle,
  };
}

/**
 * Generate points for a 3D cylinder in isometric view
 */
export function getCylinderPoints(
  baseCenter: Point3D,
  radius: number,
  height: number,
  origin: Point2D,
  scale: number = 1,
  segments: number = 16
): {
  topEllipse: Point2D[];
  bottomEllipse: Point2D[];
  sidePath: string;
} {
  const topCenter = { ...baseCenter, z: baseCenter.z + height };

  // Generate ellipse points
  const topEllipse: Point2D[] = [];
  const bottomEllipse: Point2D[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    topEllipse.push(
      projectIsometric(
        { x: topCenter.x + x, y: topCenter.y + y, z: topCenter.z },
        origin,
        scale
      )
    );
    bottomEllipse.push(
      projectIsometric(
        { x: baseCenter.x + x, y: baseCenter.y + y, z: baseCenter.z },
        origin,
        scale
      )
    );
  }

  // Generate side path (visible portion only)
  const sidePath = generateCylinderSidePath(topEllipse, bottomEllipse);

  return {
    topEllipse,
    bottomEllipse,
    sidePath,
  };
}

/**
 * Generate SVG path for cylinder side
 */
function generateCylinderSidePath(
  topEllipse: Point2D[],
  bottomEllipse: Point2D[]
): string {
  if (topEllipse.length === 0 || bottomEllipse.length === 0) return '';

  // Find leftmost and rightmost points
  const topSorted = [...topEllipse].sort((a, b) => a.x - b.x);
  const bottomSorted = [...bottomEllipse].sort((a, b) => a.x - b.x);

  const leftTop = topSorted[0];
  const rightTop = topSorted[topSorted.length - 1];
  const leftBottom = bottomSorted[0];
  const rightBottom = bottomSorted[bottomSorted.length - 1];

  return `
    M ${leftTop.x} ${leftTop.y}
    L ${leftBottom.x} ${leftBottom.y}
    L ${rightBottom.x} ${rightBottom.y}
    L ${rightTop.x} ${rightTop.y}
    Z
  `;
}

// ============================================================
// VISUALIZATION MODE CONFIGURATIONS
// ============================================================

/**
 * Default configurations for each visualization mode
 */
export const VISUALIZATION_CONFIGS: Record<Visualization3DMode, Visualization3DConfig> = {
  orthographic: {
    mode: 'orthographic',
    depthCues: {
      sizeAttenuation: false,
      atmosphericPerspective: false,
      blurAttenuation: false,
      castShadows: false,
      occlusion: true,
      surfaceShading: true,
      referenceGrid: true,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: 0, yaw: 0, roll: 0 },
    perspectiveStrength: 0,
  },

  isometric: {
    mode: 'isometric',
    depthCues: {
      sizeAttenuation: false,
      atmosphericPerspective: false,
      blurAttenuation: false,
      castShadows: true,
      occlusion: true,
      surfaceShading: true,
      referenceGrid: true,
    },
    lightDirection: { x: -1, y: -1, z: -1 },
    viewAngle: { pitch: Math.PI / 6, yaw: Math.PI / 4, roll: 0 },
    perspectiveStrength: 0,
  },

  perspective: {
    mode: 'perspective',
    depthCues: {
      sizeAttenuation: true,
      atmosphericPerspective: true,
      blurAttenuation: false,
      castShadows: true,
      occlusion: true,
      surfaceShading: true,
      referenceGrid: true,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: Math.PI / 8, yaw: Math.PI / 6, roll: 0 },
    perspectiveStrength: 0.5,
  },

  cross_section: {
    mode: 'cross_section',
    depthCues: {
      sizeAttenuation: false,
      atmosphericPerspective: false,
      blurAttenuation: false,
      castShadows: false,
      occlusion: false,
      surfaceShading: true,
      referenceGrid: false,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: 0, yaw: 0, roll: 0 },
    perspectiveStrength: 0,
  },

  exploded: {
    mode: 'exploded',
    depthCues: {
      sizeAttenuation: false,
      atmosphericPerspective: false,
      blurAttenuation: false,
      castShadows: true,
      occlusion: false,
      surfaceShading: true,
      referenceGrid: false,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: Math.PI / 6, yaw: Math.PI / 4, roll: 0 },
    perspectiveStrength: 0,
  },

  multi_view: {
    mode: 'multi_view',
    depthCues: {
      sizeAttenuation: false,
      atmosphericPerspective: false,
      blurAttenuation: false,
      castShadows: false,
      occlusion: true,
      surfaceShading: true,
      referenceGrid: true,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: 0, yaw: 0, roll: 0 },
    perspectiveStrength: 0,
  },

  animated_rotation: {
    mode: 'animated_rotation',
    depthCues: {
      sizeAttenuation: false,
      atmosphericPerspective: false,
      blurAttenuation: false,
      castShadows: true,
      occlusion: true,
      surfaceShading: true,
      referenceGrid: false,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: Math.PI / 8, yaw: 0, roll: 0 },
    perspectiveStrength: 0.2,
  },

  depth_cues: {
    mode: 'depth_cues',
    depthCues: {
      sizeAttenuation: true,
      atmosphericPerspective: true,
      blurAttenuation: false,
      castShadows: true,
      occlusion: true,
      surfaceShading: true,
      referenceGrid: false,
    },
    lightDirection: { x: -0.5, y: -0.5, z: -1 },
    viewAngle: { pitch: 0, yaw: 0, roll: 0 },
    perspectiveStrength: 0,
  },
};

// ============================================================
// CONCEPT-TO-VISUALIZATION MAPPING
// ============================================================

/**
 * Recommended visualization mode for different physics concepts
 */
export const CONCEPT_VISUALIZATION: Record<string, {
  mode: Visualization3DMode;
  reason: string;
  alternatives: Visualization3DMode[];
}> = {
  projectile_motion: {
    mode: 'depth_cues',
    reason: '2D motion is clearest with subtle depth hints',
    alternatives: ['orthographic'],
  },

  circular_motion: {
    mode: 'perspective',
    reason: '3D rotation needs perspective to show the circular path',
    alternatives: ['isometric', 'animated_rotation'],
  },

  center_of_mass: {
    mode: 'isometric',
    reason: 'Shows 3D objects clearly while maintaining measurability',
    alternatives: ['depth_cues'],
  },

  torque: {
    mode: 'isometric',
    reason: 'Clear view of rotation axis and lever arm',
    alternatives: ['perspective'],
  },

  waves: {
    mode: 'perspective',
    reason: 'Wave propagation needs depth to show 3D nature',
    alternatives: ['multi_view'],
  },

  electric_field: {
    mode: 'depth_cues',
    reason: 'Field lines are 3D but clarity is paramount',
    alternatives: ['isometric'],
  },

  atomic_structure: {
    mode: 'perspective',
    reason: 'Orbital shapes are inherently 3D',
    alternatives: ['animated_rotation', 'cross_section'],
  },

  fluid_dynamics: {
    mode: 'cross_section',
    reason: 'Flow patterns are clearest in cross-section',
    alternatives: ['perspective'],
  },

  optics: {
    mode: 'orthographic',
    reason: 'Ray diagrams need precise angles without distortion',
    alternatives: ['depth_cues'],
  },

  simple_harmonic_motion: {
    mode: 'depth_cues',
    reason: 'Primarily 2D motion with optional 3D context',
    alternatives: ['orthographic'],
  },
};

/**
 * Get recommended visualization for a concept
 */
export function getRecommendedVisualization(concept: string): Visualization3DConfig {
  const mapping = CONCEPT_VISUALIZATION[concept];

  if (mapping) {
    return VISUALIZATION_CONFIGS[mapping.mode];
  }

  // Default to depth_cues for unknown concepts
  return VISUALIZATION_CONFIGS.depth_cues;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Parse a hex color to RGB
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  // Handle rgb() colors
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }

  // Default to gray
  return { r: 128, g: 128, b: 128 };
}

/**
 * Normalize a 3D vector
 */
export function normalizeVector(v: Point3D): Point3D {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

/**
 * Calculate dot product of two 3D vectors
 */
export function dotProduct(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculate surface shading intensity based on surface normal and light direction
 */
export function calculateShadingIntensity(
  surfaceNormal: Point3D,
  lightDirection: Point3D
): number {
  const normal = normalizeVector(surfaceNormal);
  const light = normalizeVector(lightDirection);

  // Dot product gives cosine of angle between vectors
  const intensity = Math.max(0, -dotProduct(normal, light));

  // Add ambient light
  const ambient = 0.3;
  return Math.min(1, ambient + intensity * (1 - ambient));
}
