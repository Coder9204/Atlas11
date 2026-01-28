/**
 * Smart Design System - Type Definitions
 *
 * Comprehensive type system for creating realistic, clear, and educational
 * interactive graphics that work across all viewports.
 */

import { ViewportType } from '../labeling/types.js';

// ============================================================
// OBJECT CATEGORIES & CLASSIFICATION
// ============================================================

/**
 * Categories of physics objects for smart selection
 */
export type ObjectCategory =
  | 'projectile'      // balls, bullets, thrown objects
  | 'rigid_body'      // blocks, boxes, solid shapes
  | 'elastic'         // springs, rubber bands, bouncy materials
  | 'fluid'           // water, oil, gas particles
  | 'wave'            // light waves, sound waves, water waves
  | 'rotational'      // wheels, gears, spinning objects
  | 'pendulum'        // hanging weights, swings
  | 'particle'        // atoms, electrons, small particles
  | 'field'           // electric field, magnetic field, gravity field
  | 'container'       // beakers, boxes, boundaries
  | 'measurement'     // rulers, protractors, scales
  | 'support'         // ground, walls, pivot points
  | 'connector'       // ropes, strings, rods
  | 'indicator'       // arrows, vectors, markers
  | 'human'           // person, hand, body parts
  | 'vehicle'         // car, rocket, plane
  | 'celestial';      // planets, stars, moons

/**
 * Real-world material types for realistic appearance
 */
export type MaterialType =
  | 'metal_polished'
  | 'metal_brushed'
  | 'metal_rustic'
  | 'glass_clear'
  | 'glass_frosted'
  | 'wood_light'
  | 'wood_dark'
  | 'plastic_glossy'
  | 'plastic_matte'
  | 'rubber'
  | 'fabric'
  | 'stone'
  | 'water'
  | 'air'
  | 'energy'
  | 'glow';

/**
 * Visual complexity level
 */
export type DetailLevel = 'minimal' | 'standard' | 'detailed' | 'photorealistic';

// ============================================================
// OBJECT STYLING
// ============================================================

/**
 * Gradient definition for realistic shading
 */
export interface GradientDef {
  type: 'linear' | 'radial';
  id: string;
  stops: Array<{
    offset: string;
    color: string;
    opacity?: number;
  }>;
  // Linear gradient direction
  angle?: number;
  // Radial gradient focus
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
}

/**
 * Shadow definition for depth
 */
export interface ShadowDef {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

/**
 * Highlight definition for 3D effect
 */
export interface HighlightDef {
  type: 'specular' | 'ambient' | 'rim';
  position: { x: number; y: number };
  size: number;
  color: string;
  opacity: number;
}

/**
 * Complete object style definition
 */
export interface ObjectStyle {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Category this style belongs to */
  category: ObjectCategory;

  /** Material appearance */
  material: MaterialType;

  /** Base fill color or gradient reference */
  fill: string;

  /** Stroke color */
  stroke?: string;

  /** Stroke width */
  strokeWidth?: number;

  /** Gradients for realistic shading */
  gradients?: GradientDef[];

  /** Drop shadow for depth */
  shadow?: ShadowDef;

  /** Highlights for 3D effect */
  highlights?: HighlightDef[];

  /** Opacity (0-1) */
  opacity?: number;

  /** Detail level */
  detailLevel: DetailLevel;

  /** Viewport-specific overrides */
  viewportOverrides?: Partial<Record<ViewportType, Partial<ObjectStyle>>>;
}

// ============================================================
// LAYOUT & SPACING
// ============================================================

/**
 * Safe zones where graphics should not be placed
 */
export interface SafeZone {
  id: string;
  purpose: 'header' | 'footer' | 'controls' | 'labels' | 'coach' | 'custom';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Layout region for organizing graphics
 */
export interface LayoutRegion {
  id: string;
  name: string;
  purpose: 'main_graphic' | 'secondary' | 'reference' | 'controls' | 'legend';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  allowsLabels: boolean;
  allowsControls: boolean;
}

/**
 * Spacing configuration
 */
export interface SpacingConfig {
  /** Minimum gap between objects */
  objectGap: number;

  /** Minimum gap between object and label */
  labelGap: number;

  /** Minimum gap from viewport edge */
  edgeMargin: number;

  /** Minimum gap from controls */
  controlGap: number;

  /** Viewport-specific overrides */
  viewportOverrides?: Partial<Record<ViewportType, Partial<SpacingConfig>>>;
}

/**
 * Default spacing by viewport
 */
export const DEFAULT_SPACING: Record<ViewportType, SpacingConfig> = {
  mobile: {
    objectGap: 16,
    labelGap: 8,
    edgeMargin: 12,
    controlGap: 20,
  },
  tablet: {
    objectGap: 24,
    labelGap: 12,
    edgeMargin: 20,
    controlGap: 28,
  },
  desktop: {
    objectGap: 32,
    labelGap: 16,
    edgeMargin: 32,
    controlGap: 36,
  },
};

// ============================================================
// 3D VISUALIZATION
// ============================================================

/**
 * How to present a 3D concept in 2D
 */
export type Visualization3DMode =
  | 'orthographic'      // Flat, no perspective (good for measurements)
  | 'isometric'         // 30-degree angle, equal scaling
  | 'perspective'       // Realistic depth with vanishing points
  | 'cross_section'     // Cut-away view showing interior
  | 'exploded'          // Parts separated to show assembly
  | 'multi_view'        // Multiple angles shown simultaneously
  | 'animated_rotation' // Object rotates to show all sides
  | 'depth_cues';       // 2D with depth hints (shadows, size, overlap)

/**
 * Depth cue techniques
 */
export interface DepthCues {
  /** Objects farther away are smaller */
  sizeAttenuation: boolean;

  /** Objects farther away are less saturated */
  atmosphericPerspective: boolean;

  /** Objects farther away have softer edges */
  blurAttenuation: boolean;

  /** Show cast shadows for depth */
  castShadows: boolean;

  /** Objects overlap to show depth order */
  occlusion: boolean;

  /** Shading indicates surface orientation */
  surfaceShading: boolean;

  /** Grid or reference plane for depth */
  referenceGrid: boolean;
}

/**
 * 3D visualization configuration
 */
export interface Visualization3DConfig {
  mode: Visualization3DMode;
  depthCues: DepthCues;

  /** Light source direction (for shading) */
  lightDirection: { x: number; y: number; z: number };

  /** Camera/view angle */
  viewAngle: { pitch: number; yaw: number; roll: number };

  /** Perspective strength (0 = orthographic, 1 = strong perspective) */
  perspectiveStrength: number;
}

// ============================================================
// INTERACTION DESIGN
// ============================================================

/**
 * Slider purpose categories
 */
export type SliderPurpose =
  | 'initial_condition'   // Set starting values (angle, velocity)
  | 'parameter'           // Adjust physical parameters (mass, friction)
  | 'time_control'        // Playback speed, time scrubbing
  | 'view_control'        // Zoom, rotation angle
  | 'comparison';         // A/B comparison values

/**
 * How changes should be displayed
 */
export type FeedbackType =
  | 'immediate'           // Changes visible instantly
  | 'on_release'          // Changes applied when slider released
  | 'preview'             // Show preview while dragging
  | 'animated';           // Animate to new value

/**
 * Slider design specification
 */
export interface SliderSpec {
  id: string;
  label: string;
  purpose: SliderPurpose;

  /** What this slider controls (for clarity) */
  description: string;

  /** Unit of measurement */
  unit: string;

  /** Why this parameter matters */
  educationalNote: string;

  /** Value range */
  min: number;
  max: number;
  step: number;
  defaultValue: number;

  /** How feedback is shown */
  feedbackType: FeedbackType;

  /** Visual cues when value changes */
  visualIndicator: {
    /** Highlight affected object */
    highlightTarget: boolean;

    /** Show value change animation */
    showDelta: boolean;

    /** Show real-time calculation */
    showFormula: boolean;
  };

  /** Position preference */
  position: 'top' | 'bottom' | 'left' | 'right' | 'inline';
}

/**
 * Control group for related sliders
 */
export interface ControlGroup {
  id: string;
  label: string;
  description: string;
  sliders: SliderSpec[];
  collapsed: boolean;
  position: 'sidebar' | 'bottom' | 'overlay';
}

// ============================================================
// REALISM & CLARITY METRICS
// ============================================================

/**
 * Realism assessment criteria
 */
export interface RealismCriteria {
  /** Object proportions match real world */
  accurateProportions: boolean;

  /** Materials look realistic */
  realisticMaterials: boolean;

  /** Shadows and lighting are consistent */
  consistentLighting: boolean;

  /** Physics behavior matches expectations */
  plausiblePhysics: boolean;

  /** Colors are naturalistic (not garish) */
  naturalisticColors: boolean;

  /** Motion is smooth and realistic */
  smoothMotion: boolean;
}

/**
 * Clarity assessment criteria
 */
export interface ClarityCriteria {
  /** Main concept is immediately obvious */
  conceptVisible: boolean;

  /** Controls are self-explanatory */
  controlsIntuitive: boolean;

  /** Labels don't obscure graphics */
  labelsNonObstructive: boolean;

  /** Important elements are highlighted */
  emphasisCorrect: boolean;

  /** Clutter is minimized */
  minimalClutter: boolean;

  /** Hierarchy is clear (what to look at first) */
  clearHierarchy: boolean;
}

/**
 * Usability assessment criteria
 */
export interface UsabilityCriteria {
  /** Touch targets are large enough */
  touchTargetsAdequate: boolean;

  /** Controls respond immediately */
  responsiveControls: boolean;

  /** Feedback is clear when interacting */
  clearFeedback: boolean;

  /** Undo/reset is available */
  canReset: boolean;

  /** Works without instructions */
  selfExplanatory: boolean;
}

// ============================================================
// OBJECT SELECTION GUIDANCE
// ============================================================

/**
 * Concept to object mapping suggestion
 */
export interface ObjectSuggestion {
  /** Physics concept being demonstrated */
  concept: string;

  /** Recommended objects to use */
  recommendedObjects: Array<{
    category: ObjectCategory;
    description: string;
    whyGood: string;
    realWorldExample: string;
  }>;

  /** Objects to avoid */
  avoidObjects: Array<{
    category: ObjectCategory;
    whyBad: string;
  }>;

  /** Suggested interaction type */
  interactionType: 'drag' | 'slider' | 'click' | 'auto' | 'hybrid';

  /** Key visual elements to include */
  essentialVisuals: string[];

  /** Common mistakes to avoid */
  commonMistakes: string[];
}

// ============================================================
// COMPLETE DESIGN SPECIFICATION
// ============================================================

/**
 * Complete design specification for a game graphic
 */
export interface GraphicDesignSpec {
  /** Unique identifier */
  id: string;

  /** Physics concept being demonstrated */
  concept: string;

  /** Target viewport (or 'all') */
  viewport: ViewportType | 'all';

  /** Canvas dimensions */
  canvas: {
    width: number;
    height: number;
  };

  /** Layout regions */
  layout: {
    regions: LayoutRegion[];
    safeZones: SafeZone[];
    spacing: SpacingConfig;
  };

  /** Objects in the scene */
  objects: Array<{
    id: string;
    style: ObjectStyle;
    initialPosition: { x: number; y: number };
    role: 'primary' | 'secondary' | 'reference' | 'decoration';
  }>;

  /** 3D visualization settings (if applicable) */
  visualization3D?: Visualization3DConfig;

  /** Interaction controls */
  controls: {
    groups: ControlGroup[];
    primaryAction: string;
  };

  /** Quality targets */
  qualityTargets: {
    realism: RealismCriteria;
    clarity: ClarityCriteria;
    usability: UsabilityCriteria;
  };
}

// ============================================================
// EVALUATION RESULTS
// ============================================================

/**
 * Design evaluation result
 */
export interface DesignEvaluationResult {
  passed: boolean;
  overallScore: number;

  realism: {
    score: number;
    criteria: RealismCriteria;
    issues: string[];
  };

  clarity: {
    score: number;
    criteria: ClarityCriteria;
    issues: string[];
  };

  usability: {
    score: number;
    criteria: UsabilityCriteria;
    issues: string[];
  };

  spacing: {
    score: number;
    issues: string[];
  };

  recommendations: string[];
}
