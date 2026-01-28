/**
 * Layout Engine - Smart Spacing and Object Positioning
 *
 * Provides intelligent layout for game graphics ensuring:
 * - Objects are well-spaced and don't overlap
 * - Labels have room and don't obscure graphics
 * - Controls are accessible and don't interfere
 * - Layout adapts to different viewports
 * - Safe zones are respected
 */

import { ViewportType } from '../labeling/types.js';
import {
  SafeZone,
  LayoutRegion,
  SpacingConfig,
  DEFAULT_SPACING,
} from './types.js';

// ============================================================
// TYPES
// ============================================================

export interface LayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObjectPlacement {
  id: string;
  bounds: LayoutBounds;
  center: { x: number; y: number };
  layer: 'background' | 'main' | 'foreground' | 'overlay';
  canOverlap: boolean;
}

export interface LayoutResult {
  objects: ObjectPlacement[];
  regions: LayoutRegion[];
  safeZones: SafeZone[];
  availableSpace: LayoutBounds;
  issues: string[];
}

// ============================================================
// LAYOUT ENGINE
// ============================================================

export class LayoutEngine {
  private viewport: ViewportType = 'desktop';
  private canvasWidth: number;
  private canvasHeight: number;
  private spacing: SpacingConfig;
  private safeZones: SafeZone[] = [];
  private regions: LayoutRegion[] = [];
  private placements: ObjectPlacement[] = [];

  constructor(width: number = 700, height: number = 350) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.spacing = DEFAULT_SPACING.desktop;
    this.initializeDefaultSafeZones();
    this.initializeDefaultRegions();
  }

  // ============================================================
  // CONFIGURATION
  // ============================================================

  /**
   * Set viewport type and update spacing
   */
  setViewport(viewport: ViewportType): this {
    this.viewport = viewport;
    this.spacing = DEFAULT_SPACING[viewport];
    this.initializeDefaultSafeZones();
    this.initializeDefaultRegions();
    return this;
  }

  /**
   * Set canvas dimensions
   */
  setCanvasSize(width: number, height: number): this {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initializeDefaultSafeZones();
    this.initializeDefaultRegions();
    return this;
  }

  /**
   * Override default spacing
   */
  setSpacing(spacing: Partial<SpacingConfig>): this {
    this.spacing = { ...this.spacing, ...spacing };
    return this;
  }

  /**
   * Clear all placements for new frame
   */
  clear(): this {
    this.placements = [];
    return this;
  }

  // ============================================================
  // SAFE ZONES
  // ============================================================

  /**
   * Initialize default safe zones based on viewport
   */
  private initializeDefaultSafeZones(): void {
    const headerHeight = this.viewport === 'mobile' ? 50 : 60;
    const footerHeight = this.viewport === 'mobile' ? 80 : 70;
    const controlWidth = this.viewport === 'mobile' ? 0 : 200;

    this.safeZones = [
      // Header zone (for title, phase indicator)
      {
        id: 'header',
        purpose: 'header',
        bounds: {
          x: 0,
          y: 0,
          width: this.canvasWidth,
          height: headerHeight,
        },
      },
      // Footer zone (for buttons, navigation)
      {
        id: 'footer',
        purpose: 'footer',
        bounds: {
          x: 0,
          y: this.canvasHeight - footerHeight,
          width: this.canvasWidth,
          height: footerHeight,
        },
      },
      // Coach message zone (bottom left on desktop)
      {
        id: 'coach',
        purpose: 'coach',
        bounds: {
          x: 0,
          y: this.canvasHeight - footerHeight - 60,
          width: this.viewport === 'mobile' ? this.canvasWidth : 250,
          height: 60,
        },
      },
    ];

    // Right side controls zone (desktop/tablet only)
    if (this.viewport !== 'mobile' && controlWidth > 0) {
      this.safeZones.push({
        id: 'controls',
        purpose: 'controls',
        bounds: {
          x: this.canvasWidth - controlWidth,
          y: headerHeight,
          width: controlWidth,
          height: this.canvasHeight - headerHeight - footerHeight,
        },
      });
    }
  }

  /**
   * Add a custom safe zone
   */
  addSafeZone(zone: SafeZone): this {
    this.safeZones.push(zone);
    return this;
  }

  /**
   * Get all safe zones
   */
  getSafeZones(): SafeZone[] {
    return [...this.safeZones];
  }

  // ============================================================
  // LAYOUT REGIONS
  // ============================================================

  /**
   * Initialize default layout regions
   */
  private initializeDefaultRegions(): void {
    const headerHeight = this.viewport === 'mobile' ? 50 : 60;
    const footerHeight = this.viewport === 'mobile' ? 80 : 70;
    const controlWidth = this.viewport === 'mobile' ? 0 : 200;
    const margin = this.spacing.edgeMargin;

    // Main graphics region
    const mainRegion: LayoutRegion = {
      id: 'main',
      name: 'Main Graphics',
      purpose: 'main_graphic',
      bounds: {
        x: margin,
        y: headerHeight + margin,
        width: this.canvasWidth - margin * 2 - controlWidth,
        height: this.canvasHeight - headerHeight - footerHeight - margin * 2,
      },
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
      allowsLabels: true,
      allowsControls: false,
    };

    // Legend/reference region (top right)
    const legendRegion: LayoutRegion = {
      id: 'legend',
      name: 'Legend',
      purpose: 'legend',
      bounds: {
        x: this.canvasWidth - controlWidth - 150 - margin,
        y: headerHeight + margin,
        width: 150,
        height: 100,
      },
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      allowsLabels: true,
      allowsControls: false,
    };

    this.regions = [mainRegion];

    // Add legend region only on desktop
    if (this.viewport === 'desktop') {
      this.regions.push(legendRegion);
    }
  }

  /**
   * Get the main graphics region
   */
  getMainRegion(): LayoutRegion {
    return this.regions.find(r => r.purpose === 'main_graphic')!;
  }

  /**
   * Get available space after accounting for safe zones and padding
   */
  getAvailableSpace(): LayoutBounds {
    const main = this.getMainRegion();
    return {
      x: main.bounds.x + main.padding.left,
      y: main.bounds.y + main.padding.top,
      width: main.bounds.width - main.padding.left - main.padding.right,
      height: main.bounds.height - main.padding.top - main.padding.bottom,
    };
  }

  // ============================================================
  // OBJECT PLACEMENT
  // ============================================================

  /**
   * Register an object placement
   */
  placeObject(
    id: string,
    bounds: LayoutBounds,
    options: {
      layer?: 'background' | 'main' | 'foreground' | 'overlay';
      canOverlap?: boolean;
    } = {}
  ): this {
    this.placements.push({
      id,
      bounds,
      center: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      },
      layer: options.layer ?? 'main',
      canOverlap: options.canOverlap ?? false,
    });
    return this;
  }

  /**
   * Find optimal position for an object of given size
   */
  findOptimalPosition(
    width: number,
    height: number,
    options: {
      preferredX?: number;
      preferredY?: number;
      anchor?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      avoidIds?: string[];
    } = {}
  ): { x: number; y: number } | null {
    const available = this.getAvailableSpace();
    const anchor = options.anchor ?? 'center';

    // Calculate preferred position
    let preferredX = options.preferredX ?? available.x + available.width / 2;
    let preferredY = options.preferredY ?? available.y + available.height / 2;

    // Adjust for anchor
    if (anchor === 'center') {
      preferredX -= width / 2;
      preferredY -= height / 2;
    }

    // Check if preferred position works
    const preferredBounds = { x: preferredX, y: preferredY, width, height };

    if (this.isValidPlacement(preferredBounds, options.avoidIds)) {
      return { x: preferredX, y: preferredY };
    }

    // Try alternative positions
    const alternatives = this.generateAlternativePositions(width, height, available);

    for (const pos of alternatives) {
      const bounds = { x: pos.x, y: pos.y, width, height };
      if (this.isValidPlacement(bounds, options.avoidIds)) {
        return pos;
      }
    }

    return null;
  }

  /**
   * Generate alternative positions in a grid pattern
   */
  private generateAlternativePositions(
    width: number,
    height: number,
    available: LayoutBounds
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const gap = this.spacing.objectGap;

    // Center
    positions.push({
      x: available.x + (available.width - width) / 2,
      y: available.y + (available.height - height) / 2,
    });

    // Grid positions
    const cols = 3;
    const rows = 3;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = available.x + (col * (available.width - width)) / (cols - 1);
        const y = available.y + (row * (available.height - height)) / (rows - 1);
        positions.push({ x, y });
      }
    }

    return positions;
  }

  /**
   * Check if a placement is valid (no overlaps, within bounds, outside safe zones)
   */
  isValidPlacement(bounds: LayoutBounds, avoidIds?: string[]): boolean {
    const available = this.getAvailableSpace();

    // Check within available space
    if (
      bounds.x < available.x ||
      bounds.y < available.y ||
      bounds.x + bounds.width > available.x + available.width ||
      bounds.y + bounds.height > available.y + available.height
    ) {
      return false;
    }

    // Check safe zones
    for (const zone of this.safeZones) {
      if (this.boundsOverlap(bounds, zone.bounds)) {
        return false;
      }
    }

    // Check existing placements
    for (const placement of this.placements) {
      if (avoidIds && !avoidIds.includes(placement.id)) continue;
      if (placement.canOverlap) continue;

      const expandedBounds = this.expandBounds(placement.bounds, this.spacing.objectGap);
      if (this.boundsOverlap(bounds, expandedBounds)) {
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // SPACING CALCULATIONS
  // ============================================================

  /**
   * Calculate the center point of the main graphics area
   */
  getGraphicCenter(): { x: number; y: number } {
    const available = this.getAvailableSpace();
    return {
      x: available.x + available.width / 2,
      y: available.y + available.height / 2,
    };
  }

  /**
   * Calculate optimal spacing between N objects arranged horizontally
   */
  calculateHorizontalSpacing(
    objectWidth: number,
    count: number
  ): { startX: number; gap: number } {
    const available = this.getAvailableSpace();
    const totalWidth = objectWidth * count;
    const totalGap = available.width - totalWidth;
    const gap = Math.max(this.spacing.objectGap, totalGap / (count + 1));
    const startX = available.x + gap;

    return { startX, gap: gap + objectWidth };
  }

  /**
   * Calculate optimal spacing between N objects arranged vertically
   */
  calculateVerticalSpacing(
    objectHeight: number,
    count: number
  ): { startY: number; gap: number } {
    const available = this.getAvailableSpace();
    const totalHeight = objectHeight * count;
    const totalGap = available.height - totalHeight;
    const gap = Math.max(this.spacing.objectGap, totalGap / (count + 1));
    const startY = available.y + gap;

    return { startY, gap: gap + objectHeight };
  }

  /**
   * Get positions for N objects in a row (centered)
   */
  getHorizontalPositions(
    objectWidth: number,
    count: number,
    y?: number
  ): Array<{ x: number; y: number }> {
    const available = this.getAvailableSpace();
    const { startX, gap } = this.calculateHorizontalSpacing(objectWidth, count);
    const centerY = y ?? available.y + available.height / 2;

    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + i * gap,
        y: centerY,
      });
    }

    return positions;
  }

  /**
   * Get positions for N objects in a column (centered)
   */
  getVerticalPositions(
    objectHeight: number,
    count: number,
    x?: number
  ): Array<{ x: number; y: number }> {
    const available = this.getAvailableSpace();
    const { startY, gap } = this.calculateVerticalSpacing(objectHeight, count);
    const centerX = x ?? available.x + available.width / 2;

    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: centerX,
        y: startY + i * gap,
      });
    }

    return positions;
  }

  // ============================================================
  // LABEL POSITIONING
  // ============================================================

  /**
   * Find the best position for a label near an object
   */
  findLabelPosition(
    objectBounds: LayoutBounds,
    labelWidth: number,
    labelHeight: number,
    preferredAnchor: 'top' | 'bottom' | 'left' | 'right' = 'top'
  ): { x: number; y: number; anchor: string } | null {
    const gap = this.spacing.labelGap;

    const anchors: Array<'top' | 'bottom' | 'left' | 'right'> = [
      preferredAnchor,
      'top',
      'bottom',
      'right',
      'left',
    ];

    for (const anchor of anchors) {
      let x: number;
      let y: number;

      switch (anchor) {
        case 'top':
          x = objectBounds.x + (objectBounds.width - labelWidth) / 2;
          y = objectBounds.y - labelHeight - gap;
          break;
        case 'bottom':
          x = objectBounds.x + (objectBounds.width - labelWidth) / 2;
          y = objectBounds.y + objectBounds.height + gap;
          break;
        case 'left':
          x = objectBounds.x - labelWidth - gap;
          y = objectBounds.y + (objectBounds.height - labelHeight) / 2;
          break;
        case 'right':
          x = objectBounds.x + objectBounds.width + gap;
          y = objectBounds.y + (objectBounds.height - labelHeight) / 2;
          break;
      }

      const labelBounds = { x, y, width: labelWidth, height: labelHeight };

      // Check if label position is valid
      if (this.isLabelPositionValid(labelBounds)) {
        return { x, y, anchor };
      }
    }

    return null;
  }

  /**
   * Check if a label position is valid
   */
  private isLabelPositionValid(bounds: LayoutBounds): boolean {
    const available = this.getAvailableSpace();

    // Within bounds (with some tolerance)
    const tolerance = 10;
    if (
      bounds.x < available.x - tolerance ||
      bounds.y < available.y - tolerance ||
      bounds.x + bounds.width > available.x + available.width + tolerance ||
      bounds.y + bounds.height > available.y + available.height + tolerance
    ) {
      return false;
    }

    // Not in safe zones
    for (const zone of this.safeZones) {
      if (this.boundsOverlap(bounds, zone.bounds)) {
        return false;
      }
    }

    // Not overlapping objects
    for (const placement of this.placements) {
      if (this.boundsOverlap(bounds, placement.bounds)) {
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // VALIDATION & ANALYSIS
  // ============================================================

  /**
   * Analyze layout and return result with issues
   */
  analyze(): LayoutResult {
    const issues: string[] = [];

    // Check for overlapping objects
    for (let i = 0; i < this.placements.length; i++) {
      for (let j = i + 1; j < this.placements.length; j++) {
        const a = this.placements[i];
        const b = this.placements[j];

        if (!a.canOverlap && !b.canOverlap) {
          if (this.boundsOverlap(a.bounds, b.bounds)) {
            issues.push(`Objects "${a.id}" and "${b.id}" overlap`);
          }
        }
      }
    }

    // Check for objects in safe zones
    for (const placement of this.placements) {
      for (const zone of this.safeZones) {
        if (this.boundsOverlap(placement.bounds, zone.bounds)) {
          issues.push(`Object "${placement.id}" overlaps ${zone.purpose} safe zone`);
        }
      }
    }

    // Check for objects too close to edge
    const available = this.getAvailableSpace();
    for (const placement of this.placements) {
      if (
        placement.bounds.x < available.x ||
        placement.bounds.y < available.y ||
        placement.bounds.x + placement.bounds.width > available.x + available.width ||
        placement.bounds.y + placement.bounds.height > available.y + available.height
      ) {
        issues.push(`Object "${placement.id}" extends outside available space`);
      }
    }

    return {
      objects: [...this.placements],
      regions: [...this.regions],
      safeZones: [...this.safeZones],
      availableSpace: this.getAvailableSpace(),
      issues,
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private boundsOverlap(a: LayoutBounds, b: LayoutBounds): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private expandBounds(bounds: LayoutBounds, margin: number): LayoutBounds {
    return {
      x: bounds.x - margin,
      y: bounds.y - margin,
      width: bounds.width + margin * 2,
      height: bounds.height + margin * 2,
    };
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createLayoutEngine(width?: number, height?: number): LayoutEngine {
  return new LayoutEngine(width, height);
}
