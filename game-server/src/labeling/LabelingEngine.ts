/**
 * Intelligent Labeling Engine
 *
 * Positions labels intelligently to avoid overlaps while maintaining clarity.
 * Uses spatial awareness to understand where graphics are and positions labels
 * in clear areas with proper spacing.
 *
 * Key Features:
 * - Collision detection (AABB + minimum gap)
 * - Center zone exclusion (reserved for graphics)
 * - Priority-based budget enforcement
 * - Abbreviation tracking (full term first N times)
 * - Viewport-specific positioning
 */

import {
  ViewportType,
  LabelAnchor,
  LabelDefinition,
  GraphicElement,
  PositionedLabel,
  BoundingBox,
  Point,
  Offset,
  LabelStyle,
  LabelingEngineConfig,
  LabelUsageStats,
  PRIORITY_VALUES,
  DEFAULT_ENGINE_CONFIG,
} from './types.js';

export class LabelingEngine {
  private elements: Map<string, GraphicElement> = new Map();
  private labels: Map<string, LabelDefinition> = new Map();
  private usageStats: LabelUsageStats = {
    labelCounts: new Map(),
    totalWords: 0,
    totalLabels: 0,
  };
  private config: LabelingEngineConfig;
  private viewport: ViewportType = 'desktop';

  constructor(config: Partial<LabelingEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  // === REGISTRATION ===

  /**
   * Register a graphic element for spatial awareness
   */
  registerElement(element: GraphicElement): this {
    this.elements.set(element.id, element);
    return this;
  }

  /**
   * Register multiple graphic elements
   */
  registerElements(elements: GraphicElement[]): this {
    elements.forEach(el => this.registerElement(el));
    return this;
  }

  /**
   * Register a label definition
   */
  registerLabel(label: LabelDefinition): this {
    this.labels.set(label.id, label);
    return this;
  }

  /**
   * Register multiple labels
   */
  registerLabels(labels: LabelDefinition[]): this {
    labels.forEach(l => this.registerLabel(l));
    return this;
  }

  /**
   * Get a registered element by ID
   */
  getElement(id: string): GraphicElement | undefined {
    return this.elements.get(id);
  }

  /**
   * Clear all registered elements and labels for a new frame
   */
  clear(): this {
    this.elements.clear();
    this.labels.clear();
    return this;
  }

  /**
   * Reset usage stats (call when starting a new session)
   */
  resetUsageStats(): this {
    this.usageStats = {
      labelCounts: new Map(),
      totalWords: 0,
      totalLabels: 0,
    };
    return this;
  }

  /**
   * Set the current viewport type
   */
  setViewport(viewport: ViewportType): this {
    this.viewport = viewport;
    return this;
  }

  // === MAIN POSITIONING ALGORITHM ===

  /**
   * Compute positions for all registered labels
   * @param svgWidth Width of the SVG canvas
   * @param svgHeight Height of the SVG canvas
   * @returns Array of positioned labels
   */
  computePositions(svgWidth: number, svgHeight: number): PositionedLabel[] {
    const positioned: PositionedLabel[] = [];
    const occupiedRegions: BoundingBox[] = [];
    const budget = this.config.budgets[this.viewport];

    // Track budget for this frame
    let wordCount = 0;
    let labelCount = 0;

    // Sort labels by priority (highest first)
    const sortedLabels = Array.from(this.labels.values()).sort(
      (a, b) => PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority]
    );

    // Calculate center zone (area reserved for graphics)
    const centerZone = this.calculateCenterZone(svgWidth, svgHeight);

    for (const label of sortedLabels) {
      // Check viewport-specific hiding
      const viewportOverride = label.viewportOverrides?.[this.viewport];
      if (viewportOverride?.hidden) {
        continue;
      }

      // Determine text to display
      const text = this.getDisplayText(label);
      const textWords = text.split(/\s+/).length;

      // Check word budget
      if (wordCount + textWords > budget.maxWords) {
        continue;
      }

      // Check label count budget
      if (labelCount >= budget.maxLabels) {
        continue;
      }

      // Get target element
      const target = this.elements.get(label.targetId);
      if (!target) {
        console.warn(`LabelingEngine: Target element "${label.targetId}" not found for label "${label.id}"`);
        continue;
      }

      // Apply viewport overrides
      const anchor = viewportOverride?.anchor ?? label.anchor;
      const offset = viewportOverride?.offset ?? label.offset ?? { x: 0, y: 0 };
      const fontSize = viewportOverride?.fontSize ?? label.style.fontSize;
      const style: LabelStyle = { ...label.style, fontSize };

      // Estimate label dimensions
      const labelBounds = this.estimateLabelBounds(text, style);

      // Try to position the label
      const position = this.findValidPosition(
        target,
        anchor,
        offset,
        labelBounds,
        occupiedRegions,
        centerZone,
        svgWidth,
        svgHeight
      );

      if (position) {
        const finalBounds: BoundingBox = {
          x: position.x,
          y: position.y - labelBounds.height,
          width: labelBounds.width,
          height: labelBounds.height,
        };

        // Add padding for background if present
        if (style.background) {
          const padding = style.background.padding;
          finalBounds.x -= padding;
          finalBounds.y -= padding;
          finalBounds.width += padding * 2;
          finalBounds.height += padding * 2;
        }

        positioned.push({
          id: label.id,
          x: position.x,
          y: position.y,
          text,
          style,
          bounds: finalBounds,
          wasRepositioned: position.anchor !== anchor,
          anchor: position.anchor,
        });

        // Mark region as occupied (with gap)
        occupiedRegions.push(this.expandBounds(finalBounds, this.config.minLabelGap));

        // Update usage stats
        const currentCount = this.usageStats.labelCounts.get(label.id) ?? 0;
        this.usageStats.labelCounts.set(label.id, currentCount + 1);

        // Update budget tracking
        wordCount += textWords;
        labelCount++;
      }
    }

    this.usageStats.totalWords = wordCount;
    this.usageStats.totalLabels = labelCount;

    return positioned;
  }

  // === POSITIONING HELPERS ===

  /**
   * Find a valid position for a label, trying fallback anchors if needed
   */
  private findValidPosition(
    target: GraphicElement,
    preferredAnchor: LabelAnchor,
    offset: Offset,
    labelBounds: BoundingBox,
    occupiedRegions: BoundingBox[],
    centerZone: BoundingBox,
    svgWidth: number,
    svgHeight: number
  ): { x: number; y: number; anchor: LabelAnchor } | null {
    // Try preferred anchor first
    const anchorsToTry = [preferredAnchor, ...this.config.fallbackAnchors.filter(a => a !== preferredAnchor)];

    for (const anchor of anchorsToTry) {
      const position = this.calculateAnchorPosition(target, anchor, offset, labelBounds);

      // Create bounds at this position
      const bounds: BoundingBox = {
        x: position.x,
        y: position.y - labelBounds.height,
        width: labelBounds.width,
        height: labelBounds.height,
      };

      // Check if position is valid
      if (this.isValidPosition(bounds, occupiedRegions, centerZone, svgWidth, svgHeight, target)) {
        return { ...position, anchor };
      }
    }

    // If all anchors fail, try pushing out from center zone
    const pushedPosition = this.pushAwayFromCenter(target, preferredAnchor, offset, labelBounds, centerZone, svgWidth, svgHeight);
    if (pushedPosition) {
      const bounds: BoundingBox = {
        x: pushedPosition.x,
        y: pushedPosition.y - labelBounds.height,
        width: labelBounds.width,
        height: labelBounds.height,
      };

      if (!this.hasCollision(bounds, occupiedRegions)) {
        return { ...pushedPosition, anchor: preferredAnchor };
      }
    }

    return null;
  }

  /**
   * Calculate position based on anchor point
   */
  private calculateAnchorPosition(
    target: GraphicElement,
    anchor: LabelAnchor,
    offset: Offset,
    labelBounds: BoundingBox
  ): Point {
    const { bounds, center } = target;
    let x: number;
    let y: number;

    switch (anchor) {
      case 'top':
        x = center.x - labelBounds.width / 2;
        y = bounds.y;
        break;
      case 'bottom':
        x = center.x - labelBounds.width / 2;
        y = bounds.y + bounds.height + labelBounds.height;
        break;
      case 'left':
        x = bounds.x - labelBounds.width;
        y = center.y + labelBounds.height / 2;
        break;
      case 'right':
        x = bounds.x + bounds.width;
        y = center.y + labelBounds.height / 2;
        break;
      case 'top-left':
        x = bounds.x - labelBounds.width;
        y = bounds.y;
        break;
      case 'top-right':
        x = bounds.x + bounds.width;
        y = bounds.y;
        break;
      case 'bottom-left':
        x = bounds.x - labelBounds.width;
        y = bounds.y + bounds.height + labelBounds.height;
        break;
      case 'bottom-right':
        x = bounds.x + bounds.width;
        y = bounds.y + bounds.height + labelBounds.height;
        break;
      case 'center':
      default:
        x = center.x - labelBounds.width / 2;
        y = center.y + labelBounds.height / 2;
        break;
    }

    return {
      x: x + offset.x,
      y: y + offset.y,
    };
  }

  /**
   * Check if a position is valid (no collisions, not in center zone, in bounds)
   */
  private isValidPosition(
    bounds: BoundingBox,
    occupiedRegions: BoundingBox[],
    centerZone: BoundingBox,
    svgWidth: number,
    svgHeight: number,
    targetElement: GraphicElement
  ): boolean {
    // Check SVG bounds
    if (bounds.x < 0 || bounds.y < 0 ||
        bounds.x + bounds.width > svgWidth ||
        bounds.y + bounds.height > svgHeight) {
      return false;
    }

    // Check collision with occupied regions
    if (this.hasCollision(bounds, occupiedRegions)) {
      return false;
    }

    // Check collision with non-background elements
    const elements = Array.from(this.elements.values());
    for (const element of elements) {
      if (element.id === targetElement.id) continue;
      if (element.isBackground) continue;

      if (this.boundsOverlap(bounds, element.bounds)) {
        return false;
      }
    }

    // Check center zone (label should not be entirely in center zone)
    if (this.boundsContainedIn(bounds, centerZone)) {
      return false;
    }

    return true;
  }

  /**
   * Push a label away from the center zone
   */
  private pushAwayFromCenter(
    target: GraphicElement,
    anchor: LabelAnchor,
    offset: Offset,
    labelBounds: BoundingBox,
    centerZone: BoundingBox,
    svgWidth: number,
    svgHeight: number
  ): Point | null {
    const position = this.calculateAnchorPosition(target, anchor, offset, labelBounds);
    const labelBox: BoundingBox = {
      x: position.x,
      y: position.y - labelBounds.height,
      width: labelBounds.width,
      height: labelBounds.height,
    };

    // If not in center zone, return original position
    if (!this.boundsOverlap(labelBox, centerZone)) {
      return position;
    }

    // Determine push direction based on which edge is closest
    const centerX = centerZone.x + centerZone.width / 2;
    const centerY = centerZone.y + centerZone.height / 2;

    const dx = position.x - centerX;
    const dy = position.y - centerY;

    let pushX = 0;
    let pushY = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Push horizontally
      if (dx > 0) {
        pushX = (centerZone.x + centerZone.width) - labelBox.x + this.config.minLabelGap;
      } else {
        pushX = centerZone.x - (labelBox.x + labelBox.width) - this.config.minLabelGap;
      }
    } else {
      // Push vertically
      if (dy > 0) {
        pushY = (centerZone.y + centerZone.height) - labelBox.y + this.config.minLabelGap;
      } else {
        pushY = centerZone.y - (labelBox.y + labelBox.height) - this.config.minLabelGap;
      }
    }

    const newPosition = {
      x: position.x + pushX,
      y: position.y + pushY,
    };

    // Check bounds
    if (newPosition.x < 0 || newPosition.y - labelBounds.height < 0 ||
        newPosition.x + labelBounds.width > svgWidth ||
        newPosition.y > svgHeight) {
      return null;
    }

    return newPosition;
  }

  // === COLLISION DETECTION ===

  /**
   * Check if bounds collide with any occupied region
   */
  private hasCollision(bounds: BoundingBox, occupiedRegions: BoundingBox[]): boolean {
    for (const region of occupiedRegions) {
      if (this.boundsOverlap(bounds, region)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if two bounding boxes overlap (AABB collision)
   */
  private boundsOverlap(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  /**
   * Check if bounds A is entirely contained within bounds B
   */
  private boundsContainedIn(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.x >= b.x &&
      a.y >= b.y &&
      a.x + a.width <= b.x + b.width &&
      a.y + a.height <= b.y + b.height
    );
  }

  /**
   * Expand bounds by a margin
   */
  private expandBounds(bounds: BoundingBox, margin: number): BoundingBox {
    return {
      x: bounds.x - margin,
      y: bounds.y - margin,
      width: bounds.width + margin * 2,
      height: bounds.height + margin * 2,
    };
  }

  // === TEXT & STYLING ===

  /**
   * Get the text to display (full or abbreviated based on usage)
   */
  private getDisplayText(label: LabelDefinition): string {
    if (!label.abbreviation || label.useAbbreviationAfter === undefined) {
      return label.fullText;
    }

    const usageCount = this.usageStats.labelCounts.get(label.id) ?? 0;

    if (usageCount >= label.useAbbreviationAfter) {
      return label.abbreviation;
    }

    return label.fullText;
  }

  /**
   * Estimate label bounding box based on text and style
   * Note: This is an approximation. For pixel-perfect sizing, you'd need
   * actual font metrics from the rendering context.
   */
  private estimateLabelBounds(text: string, style: LabelStyle): BoundingBox {
    // Approximate character width based on font size
    const charWidth = style.fontSize * 0.6;
    const lineHeight = style.fontSize * 1.2;

    // Handle multi-line text
    const lines = text.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.length));

    return {
      x: 0,
      y: 0,
      width: maxLineLength * charWidth,
      height: lines.length * lineHeight,
    };
  }

  /**
   * Calculate the center zone (area reserved for graphics)
   */
  private calculateCenterZone(svgWidth: number, svgHeight: number): BoundingBox {
    const percent = this.config.centerZonePercent / 100;
    const marginX = (svgWidth * (1 - percent)) / 2;
    const marginY = (svgHeight * (1 - percent)) / 2;

    return {
      x: marginX,
      y: marginY,
      width: svgWidth * percent,
      height: svgHeight * percent,
    };
  }

  // === UTILITIES ===

  /**
   * Get current usage statistics
   */
  getUsageStats(): LabelUsageStats {
    return { ...this.usageStats };
  }

  /**
   * Get current configuration
   */
  getConfig(): LabelingEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LabelingEngineConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Get all registered elements
   */
  getElements(): GraphicElement[] {
    return Array.from(this.elements.values());
  }

  /**
   * Get all registered labels
   */
  getLabels(): LabelDefinition[] {
    return Array.from(this.labels.values());
  }
}

// === FACTORY FUNCTION ===

export function createLabelingEngine(config?: Partial<LabelingEngineConfig>): LabelingEngine {
  return new LabelingEngine(config);
}
