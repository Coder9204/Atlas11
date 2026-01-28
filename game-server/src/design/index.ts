/**
 * Smart Design System
 *
 * Comprehensive design system for creating realistic, clear, and educational
 * interactive physics graphics that work across all viewports.
 *
 * Modules:
 * - Types: Core type definitions
 * - ObjectStyles: Realistic object styling presets
 * - LayoutEngine: Smart spacing and layout
 * - InteractionDesign: Clear controls and user feedback
 * - Visualization3D: 3D concept visualization helpers
 * - DesignEvaluator: Quality assessment
 */

// Types
export * from './types.js';

// Object Styles
export {
  COLORS,
  SHADOWS,
  HIGHLIGHTS,
  BALL_STYLES,
  BLOCK_STYLES,
  SPRING_STYLES,
  PENDULUM_STYLES,
  CONTAINER_STYLES,
  ARROW_STYLES,
  MEASUREMENT_STYLES,
  MARKER_STYLES,
  OBJECT_STYLES,
  getStyle,
  getStylesForCategory,
  createMetallicBallGradient,
  createGlassGradient,
  createWoodGradient,
  createEnergyGradient,
  createCustomBallStyle,
  createCustomBlockStyle,
  lightenColor,
} from './ObjectStyles.js';

// Layout Engine
export {
  LayoutEngine,
  createLayoutEngine,
} from './LayoutEngine.js';
export type { LayoutBounds, ObjectPlacement, LayoutResult } from './LayoutEngine.js';

// Interaction Design
export {
  SLIDER_DESIGN_PRINCIPLES,
  SLIDER_TEMPLATES,
  COMMON_SLIDERS,
  CONTROL_GROUPS,
  DEFAULT_FEEDBACK_CONFIG,
  createControlGroup,
  getFeedbackConfig,
  getSliderAnnotation,
  slider,
  SliderBuilder,
} from './InteractionDesign.js';
export type { SliderFeedbackConfig, SliderAnnotation } from './InteractionDesign.js';

// 3D Visualization
export {
  ISOMETRIC,
  VISUALIZATION_CONFIGS,
  CONCEPT_VISUALIZATION,
  projectIsometric,
  projectPerspective,
  projectOrthographic,
  calculateSizeAttenuation,
  calculateAtmosphericPerspective,
  calculateDepthBlur,
  calculateShadow,
  getCubePoints,
  getSphereShading,
  getCylinderPoints,
  getRecommendedVisualization,
  normalizeVector,
  dotProduct,
  calculateShadingIntensity,
} from './Visualization3D.js';
export type { Point3D, Point2D } from './Visualization3D.js';

// Design Evaluator
export {
  DesignEvaluator,
  createDesignEvaluator,
  validateDesign,
  evaluateDesign,
  generateDesignChecklist,
  DEFAULT_THRESHOLDS,
  EVALUATION_WEIGHTS,
} from './DesignEvaluator.js';
export type { DesignThresholds } from './DesignEvaluator.js';
