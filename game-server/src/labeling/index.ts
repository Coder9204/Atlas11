/**
 * Intelligent Labeling System
 *
 * Export all labeling system components for easy imports.
 */

// Types
export * from './types.js';

// Core engine
export { LabelingEngine, createLabelingEngine } from './LabelingEngine.js';

// Evaluator
export {
  LabelEvaluator,
  createLabelEvaluator,
  validateLabels,
  DEFAULT_THRESHOLDS,
  CRITICAL_CHECKS,
} from './LabelEvaluator.js';

// Re-export commonly used types for convenience
export type {
  ViewportType,
  LabelAnchor,
  LabelDefinition,
  GraphicElement,
  PositionedLabel,
  BoundingBox,
  Point,
  LabelPriority,
  LabelStyle,
  LabelEvaluationResult,
} from './types.js';
