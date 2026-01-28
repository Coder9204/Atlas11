/**
 * Intelligent Labeling System - Type Definitions
 *
 * Provides type safety for the labeling system that positions labels
 * intelligently to avoid overlaps while maintaining clarity.
 */

// === VIEWPORT TYPES ===

export type ViewportType = 'mobile' | 'tablet' | 'desktop';

export interface ViewportConfig {
  type: ViewportType;
  width: number;
  height: number;
}

// === POSITIONING TYPES ===

export type LabelAnchor =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

// === LABEL PRIORITY ===

export type LabelPriority = 'critical' | 'high' | 'medium' | 'low';

// Priority values for sorting (higher = more important)
export const PRIORITY_VALUES: Record<LabelPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// === LABEL STYLE ===

export interface LabelBackgroundStyle {
  fill: string;
  padding: number;
  borderRadius?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface LabelStyle {
  fill: string;
  fontSize: number;
  fontWeight?: number | string;
  fontFamily?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  background?: LabelBackgroundStyle;
}

// === VIEWPORT OVERRIDES ===

export interface ViewportOverride {
  anchor?: LabelAnchor;
  offset?: Offset;
  fontSize?: number;
  hidden?: boolean;
}

export type ViewportOverrides = Partial<Record<ViewportType, ViewportOverride>>;

// === LABEL DEFINITION ===

export interface LabelDefinition {
  /** Unique identifier for this label */
  id: string;

  /** ID of the target graphic element this label refers to */
  targetId: string;

  /** Full text to display (e.g., "Center of Mass") */
  fullText: string;

  /** Abbreviated text (e.g., "COM") */
  abbreviation?: string;

  /** Use abbreviation after this many appearances (0 = never, 1 = after first) */
  useAbbreviationAfter?: number;

  /** Preferred anchor position relative to target */
  anchor: LabelAnchor;

  /** Offset from anchor position */
  offset?: Offset;

  /** Priority for positioning conflicts */
  priority: LabelPriority;

  /** Visual style */
  style: LabelStyle;

  /** Viewport-specific overrides */
  viewportOverrides?: ViewportOverrides;
}

// === GRAPHIC ELEMENT ===

export type GraphicElementType =
  | 'circle'
  | 'rect'
  | 'line'
  | 'path'
  | 'polygon'
  | 'ellipse'
  | 'group'
  | 'text'
  | 'custom';

export interface GraphicElement {
  /** Unique identifier */
  id: string;

  /** Type of graphic element */
  type: GraphicElementType;

  /** Bounding box of the element */
  bounds: BoundingBox;

  /** Center point of the element */
  center: Point;

  /** Whether this is a background element (labels can overlap) */
  isBackground?: boolean;

  /** Whether this element is interactive (prioritize avoiding overlap) */
  isInteractive?: boolean;
}

// === POSITIONED LABEL (Output) ===

export interface PositionedLabel {
  /** Original label definition ID */
  id: string;

  /** Final X position */
  x: number;

  /** Final Y position */
  y: number;

  /** Text to display (may be abbreviated) */
  text: string;

  /** Final style (with viewport overrides applied) */
  style: LabelStyle;

  /** Calculated bounding box of the positioned label */
  bounds: BoundingBox;

  /** Whether the label was repositioned from its preferred anchor */
  wasRepositioned: boolean;

  /** Final anchor used */
  anchor: LabelAnchor;
}

// === BUDGET CONFIGURATION ===

export interface LabelBudget {
  /** Maximum words across all labels */
  maxWords: number;

  /** Maximum number of labels */
  maxLabels: number;
}

export const DEFAULT_BUDGETS: Record<ViewportType, LabelBudget> = {
  mobile: { maxWords: 12, maxLabels: 3 },
  tablet: { maxWords: 16, maxLabels: 4 },
  desktop: { maxWords: 20, maxLabels: 5 },
};

// === ENGINE CONFIGURATION ===

export interface LabelingEngineConfig {
  /** Minimum gap between labels in pixels */
  minLabelGap: number;

  /** Minimum font size allowed in pixels */
  minFontSize: number;

  /** Center zone exclusion (percentage of viewport reserved for graphics) */
  centerZonePercent: number;

  /** Budgets per viewport type */
  budgets: Record<ViewportType, LabelBudget>;

  /** Alternative anchors to try when collision detected */
  fallbackAnchors: LabelAnchor[];
}

export const DEFAULT_ENGINE_CONFIG: LabelingEngineConfig = {
  minLabelGap: 24,
  minFontSize: 10,
  centerZonePercent: 40,
  budgets: DEFAULT_BUDGETS,
  fallbackAnchors: ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
};

// === EVALUATION TYPES ===

export interface LabelEvaluationCheck {
  name: string;
  passed: boolean;
  threshold: number;
  actual: number;
  critical: boolean;
  message?: string;
}

export interface LabelEvaluationResult {
  passed: boolean;
  score: number;
  checks: LabelEvaluationCheck[];
  criticalFailures: string[];
  warnings: string[];
}

// === USAGE TRACKING ===

export interface LabelUsageStats {
  /** How many times each label has been shown */
  labelCounts: Map<string, number>;

  /** Total words used */
  totalWords: number;

  /** Total labels shown */
  totalLabels: number;
}
