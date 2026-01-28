/**
 * Design Evaluator - Quality Assessment for Game Graphics
 *
 * Evaluates whether a game's graphics are:
 * - Realistic and professional looking
 * - Clear and easy to understand
 * - Well-spaced and properly laid out
 * - Appropriate for the physics concept
 * - Usable across all viewports
 */

import { ViewportType } from '../labeling/types.js';
import {
  GraphicDesignSpec,
  RealismCriteria,
  ClarityCriteria,
  UsabilityCriteria,
  DesignEvaluationResult,
  ObjectStyle,
  SliderSpec,
  SpacingConfig,
  DEFAULT_SPACING,
} from './types.js';
import { LayoutEngine, LayoutBounds } from './LayoutEngine.js';

// ============================================================
// EVALUATION THRESHOLDS
// ============================================================

export interface DesignThresholds {
  /** Minimum realism score (0-100) */
  realismMin: number;

  /** Minimum clarity score (0-100) */
  clarityMin: number;

  /** Minimum usability score (0-100) */
  usabilityMin: number;

  /** Minimum spacing score (0-100) */
  spacingMin: number;

  /** Overall minimum score (0-100) */
  overallMin: number;
}

export const DEFAULT_THRESHOLDS: DesignThresholds = {
  realismMin: 80,
  clarityMin: 90,
  usabilityMin: 90,
  spacingMin: 85,
  overallMin: 85,
};

// ============================================================
// EVALUATION WEIGHTS
// ============================================================

export const EVALUATION_WEIGHTS = {
  realism: 0.2,
  clarity: 0.35,
  usability: 0.25,
  spacing: 0.2,
};

// ============================================================
// DESIGN EVALUATOR CLASS
// ============================================================

export class DesignEvaluator {
  private thresholds: DesignThresholds;
  private layoutEngine: LayoutEngine;

  constructor(config: {
    thresholds?: Partial<DesignThresholds>;
    canvasWidth?: number;
    canvasHeight?: number;
  } = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
    this.layoutEngine = new LayoutEngine(
      config.canvasWidth ?? 700,
      config.canvasHeight ?? 350
    );
  }

  // ============================================================
  // MAIN EVALUATION METHOD
  // ============================================================

  /**
   * Evaluate a complete graphic design specification
   */
  evaluate(
    spec: GraphicDesignSpec,
    viewport: ViewportType = 'desktop'
  ): DesignEvaluationResult {
    // Configure layout engine
    this.layoutEngine.setViewport(viewport);
    this.layoutEngine.setCanvasSize(spec.canvas.width, spec.canvas.height);

    // Evaluate each category
    const realismResult = this.evaluateRealism(spec);
    const clarityResult = this.evaluateClarity(spec);
    const usabilityResult = this.evaluateUsability(spec, viewport);
    const spacingResult = this.evaluateSpacing(spec, viewport);

    // Calculate overall score
    const overallScore = Math.round(
      realismResult.score * EVALUATION_WEIGHTS.realism +
      clarityResult.score * EVALUATION_WEIGHTS.clarity +
      usabilityResult.score * EVALUATION_WEIGHTS.usability +
      spacingResult.score * EVALUATION_WEIGHTS.spacing
    );

    // Determine pass/fail
    const passed =
      overallScore >= this.thresholds.overallMin &&
      realismResult.score >= this.thresholds.realismMin &&
      clarityResult.score >= this.thresholds.clarityMin &&
      usabilityResult.score >= this.thresholds.usabilityMin &&
      spacingResult.score >= this.thresholds.spacingMin;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      realismResult,
      clarityResult,
      usabilityResult,
      spacingResult
    );

    return {
      passed,
      overallScore,
      realism: realismResult,
      clarity: clarityResult,
      usability: usabilityResult,
      spacing: spacingResult,
      recommendations,
    };
  }

  /**
   * Quick validation - returns true/false only
   */
  quickValidate(spec: GraphicDesignSpec, viewport: ViewportType = 'desktop'): boolean {
    return this.evaluate(spec, viewport).passed;
  }

  // ============================================================
  // REALISM EVALUATION
  // ============================================================

  /**
   * Evaluate realism of the graphics
   */
  private evaluateRealism(spec: GraphicDesignSpec): {
    score: number;
    criteria: RealismCriteria;
    issues: string[];
  } {
    const issues: string[] = [];
    const criteria: RealismCriteria = {
      accurateProportions: true,
      realisticMaterials: true,
      consistentLighting: true,
      plausiblePhysics: true,
      naturalisticColors: true,
      smoothMotion: true,
    };

    // Check each object for realism
    for (const obj of spec.objects) {
      // Check for gradients/shading (indicates realistic material)
      if (!obj.style.gradients && obj.style.detailLevel !== 'minimal') {
        if (!issues.includes('Missing gradients for realistic shading')) {
          issues.push('Missing gradients for realistic shading');
          criteria.realisticMaterials = false;
        }
      }

      // Check for shadows (indicates depth)
      if (!obj.style.shadow && obj.role === 'primary') {
        if (!issues.includes('Primary objects should have shadows for depth')) {
          issues.push('Primary objects should have shadows for depth');
          criteria.consistentLighting = false;
        }
      }

      // Check color naturalness
      if (this.isGarishColor(obj.style.fill)) {
        issues.push(`Object "${obj.id}" has garish color: ${obj.style.fill}`);
        criteria.naturalisticColors = false;
      }
    }

    // Check for consistent light direction in shadows
    const lightDirections = spec.objects
      .filter(o => o.style.shadow)
      .map(o => ({
        x: o.style.shadow!.offsetX,
        y: o.style.shadow!.offsetY,
      }));

    if (lightDirections.length > 1) {
      const inconsistent = lightDirections.some(
        (d, i) =>
          i > 0 &&
          (Math.sign(d.x) !== Math.sign(lightDirections[0].x) ||
            Math.sign(d.y) !== Math.sign(lightDirections[0].y))
      );

      if (inconsistent) {
        issues.push('Inconsistent light direction across objects');
        criteria.consistentLighting = false;
      }
    }

    // Calculate score
    const criteriaCount = Object.values(criteria).length;
    const passedCount = Object.values(criteria).filter(Boolean).length;
    const score = Math.round((passedCount / criteriaCount) * 100);

    return { score, criteria, issues };
  }

  // ============================================================
  // CLARITY EVALUATION
  // ============================================================

  /**
   * Evaluate clarity of the graphics
   */
  private evaluateClarity(spec: GraphicDesignSpec): {
    score: number;
    criteria: ClarityCriteria;
    issues: string[];
  } {
    const issues: string[] = [];
    const criteria: ClarityCriteria = {
      conceptVisible: true,
      controlsIntuitive: true,
      labelsNonObstructive: true,
      emphasisCorrect: true,
      minimalClutter: true,
      clearHierarchy: true,
    };

    // Check for primary object (concept should be visible)
    const primaryObjects = spec.objects.filter(o => o.role === 'primary');
    if (primaryObjects.length === 0) {
      issues.push('No primary object defined - concept may not be visible');
      criteria.conceptVisible = false;
    }

    // Check for too many objects (clutter)
    if (spec.objects.length > 10) {
      issues.push(`Too many objects (${spec.objects.length}) - may cause clutter`);
      criteria.minimalClutter = false;
    }

    // Check decoration objects (should be minimal)
    const decorations = spec.objects.filter(o => o.role === 'decoration');
    if (decorations.length > 3) {
      issues.push('Too many decoration objects may distract from concept');
      criteria.minimalClutter = false;
    }

    // Check for slider descriptions
    if (spec.controls.groups.length > 0) {
      for (const group of spec.controls.groups) {
        for (const slider of group.sliders) {
          if (!slider.description || slider.description.length < 10) {
            issues.push(`Slider "${slider.id}" lacks clear description`);
            criteria.controlsIntuitive = false;
          }

          if (!slider.educationalNote) {
            issues.push(`Slider "${slider.id}" lacks educational note explaining its importance`);
          }
        }
      }
    }

    // Check object visual hierarchy
    const hasHighlight = spec.objects.some(
      o => o.style.highlights && o.style.highlights.length > 0
    );
    if (!hasHighlight && primaryObjects.length > 0) {
      issues.push('Primary objects should have highlights for visual hierarchy');
      criteria.clearHierarchy = false;
    }

    // Calculate score
    const criteriaCount = Object.values(criteria).length;
    const passedCount = Object.values(criteria).filter(Boolean).length;
    const score = Math.round((passedCount / criteriaCount) * 100);

    return { score, criteria, issues };
  }

  // ============================================================
  // USABILITY EVALUATION
  // ============================================================

  /**
   * Evaluate usability of the interactive elements
   */
  private evaluateUsability(
    spec: GraphicDesignSpec,
    viewport: ViewportType
  ): {
    score: number;
    criteria: UsabilityCriteria;
    issues: string[];
  } {
    const issues: string[] = [];
    const criteria: UsabilityCriteria = {
      touchTargetsAdequate: true,
      responsiveControls: true,
      clearFeedback: true,
      canReset: true,
      selfExplanatory: true,
    };

    // Check for reset capability
    const hasReset = spec.controls.groups.some(g =>
      g.sliders.some(s => s.id === 'reset' || s.label.toLowerCase().includes('reset'))
    );
    if (!hasReset) {
      // Check if there's a reset button defined elsewhere
      criteria.canReset = false;
      issues.push('No reset control found - users should be able to reset');
    }

    // Check slider feedback types
    for (const group of spec.controls.groups) {
      for (const slider of group.sliders) {
        // Check feedback configuration
        if (!slider.visualIndicator.highlightTarget && slider.purpose !== 'time_control') {
          issues.push(`Slider "${slider.id}" should highlight target when changed`);
          criteria.clearFeedback = false;
        }

        // Check for educational note (self-explanatory)
        if (!slider.educationalNote) {
          issues.push(`Slider "${slider.id}" needs educational note for self-explanation`);
          criteria.selfExplanatory = false;
        }
      }
    }

    // Mobile-specific checks
    if (viewport === 'mobile') {
      // Check number of visible controls
      const visibleSliders = spec.controls.groups
        .filter(g => !g.collapsed)
        .reduce((sum, g) => sum + g.sliders.length, 0);

      if (visibleSliders > 4) {
        issues.push('Too many visible sliders on mobile - consider grouping or collapsing');
        criteria.touchTargetsAdequate = false;
      }
    }

    // Calculate score
    const criteriaCount = Object.values(criteria).length;
    const passedCount = Object.values(criteria).filter(Boolean).length;
    const score = Math.round((passedCount / criteriaCount) * 100);

    return { score, criteria, issues };
  }

  // ============================================================
  // SPACING EVALUATION
  // ============================================================

  /**
   * Evaluate spacing and layout
   */
  private evaluateSpacing(
    spec: GraphicDesignSpec,
    viewport: ViewportType
  ): {
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    const spacing = spec.layout.spacing ?? DEFAULT_SPACING[viewport];
    let score = 100;

    // Register all objects for analysis
    this.layoutEngine.clear();
    for (const obj of spec.objects) {
      const bounds: LayoutBounds = {
        x: obj.initialPosition.x,
        y: obj.initialPosition.y,
        width: 50, // Default size for evaluation
        height: 50,
      };
      this.layoutEngine.placeObject(obj.id, bounds);
    }

    // Analyze layout
    const layoutResult = this.layoutEngine.analyze();

    // Add layout issues
    for (const issue of layoutResult.issues) {
      issues.push(issue);
      score -= 10;
    }

    // Check edge margins
    const available = this.layoutEngine.getAvailableSpace();
    for (const obj of spec.objects) {
      if (obj.initialPosition.x < spacing.edgeMargin) {
        issues.push(`Object "${obj.id}" too close to left edge`);
        score -= 5;
      }
      if (obj.initialPosition.y < spacing.edgeMargin) {
        issues.push(`Object "${obj.id}" too close to top edge`);
        score -= 5;
      }
    }

    // Check object spacing
    for (let i = 0; i < spec.objects.length; i++) {
      for (let j = i + 1; j < spec.objects.length; j++) {
        const a = spec.objects[i];
        const b = spec.objects[j];

        const distance = Math.sqrt(
          Math.pow(a.initialPosition.x - b.initialPosition.x, 2) +
          Math.pow(a.initialPosition.y - b.initialPosition.y, 2)
        );

        if (distance < spacing.objectGap && a.role !== 'decoration' && b.role !== 'decoration') {
          issues.push(`Objects "${a.id}" and "${b.id}" are too close (${distance.toFixed(0)}px < ${spacing.objectGap}px)`);
          score -= 10;
        }
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return { score, issues };
  }

  // ============================================================
  // RECOMMENDATIONS
  // ============================================================

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    realism: { score: number; issues: string[] },
    clarity: { score: number; issues: string[] },
    usability: { score: number; issues: string[] },
    spacing: { score: number; issues: string[] }
  ): string[] {
    const recommendations: string[] = [];

    // Realism recommendations
    if (realism.score < this.thresholds.realismMin) {
      recommendations.push('Add gradients and shadows to make objects look more realistic');
      recommendations.push('Ensure consistent light direction across all shadows');
      recommendations.push('Use natural, muted colors instead of bright/garish colors');
    }

    // Clarity recommendations
    if (clarity.score < this.thresholds.clarityMin) {
      recommendations.push('Ensure the main physics concept is prominently displayed');
      recommendations.push('Add descriptions and educational notes to all sliders');
      recommendations.push('Reduce decorative elements to minimize visual clutter');
      recommendations.push('Use highlights to create clear visual hierarchy');
    }

    // Usability recommendations
    if (usability.score < this.thresholds.usabilityMin) {
      recommendations.push('Add a reset button so users can start over');
      recommendations.push('Ensure sliders highlight affected objects when changed');
      recommendations.push('Add educational notes explaining why each control matters');
    }

    // Spacing recommendations
    if (spacing.score < this.thresholds.spacingMin) {
      recommendations.push('Increase spacing between objects for better clarity');
      recommendations.push('Keep objects away from screen edges');
      recommendations.push('Avoid overlapping objects unless intentional');
    }

    return recommendations;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Check if a color is too bright/garish
   */
  private isGarishColor(color: string): boolean {
    // Skip gradient references
    if (color.startsWith('url(')) return false;
    if (color.startsWith('rgba') && color.includes('0.')) return false; // Transparent

    // Parse hex color
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      // Check saturation (high saturation = garish)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // Check brightness
      const brightness = (r + g + b) / 3;

      // Garish = high saturation AND high brightness
      return saturation > 0.9 && brightness > 200;
    }

    return false;
  }
}

// ============================================================
// FACTORY AND HELPERS
// ============================================================

/**
 * Create a new design evaluator
 */
export function createDesignEvaluator(config?: {
  thresholds?: Partial<DesignThresholds>;
  canvasWidth?: number;
  canvasHeight?: number;
}): DesignEvaluator {
  return new DesignEvaluator(config);
}

/**
 * Quick validation function
 */
export function validateDesign(
  spec: GraphicDesignSpec,
  viewport: ViewportType = 'desktop'
): boolean {
  const evaluator = new DesignEvaluator();
  return evaluator.quickValidate(spec, viewport);
}

/**
 * Get full evaluation report
 */
export function evaluateDesign(
  spec: GraphicDesignSpec,
  viewport: ViewportType = 'desktop'
): DesignEvaluationResult {
  const evaluator = new DesignEvaluator();
  return evaluator.evaluate(spec, viewport);
}

// ============================================================
// CHECKLIST GENERATION
// ============================================================

/**
 * Generate a design checklist for manual review
 */
export function generateDesignChecklist(concept: string): string[] {
  return [
    // Realism
    '[ ] Objects have realistic materials (gradients, shadows, highlights)',
    '[ ] Colors are natural and not garish',
    '[ ] Light direction is consistent across all shadows',
    '[ ] Object proportions match real-world expectations',

    // Clarity
    `[ ] The ${concept} concept is immediately visible and understandable`,
    '[ ] Primary objects are clearly distinguishable from secondary/decoration',
    '[ ] Labels do not obscure important graphics',
    '[ ] Visual hierarchy is clear (what to look at first, second, etc.)',

    // Usability
    '[ ] All sliders have clear descriptions',
    '[ ] All sliders explain WHY they matter (educational note)',
    '[ ] Sliders highlight affected objects when changed',
    '[ ] Reset/restart capability is available',
    '[ ] Touch targets are large enough on mobile (44px minimum)',

    // Spacing
    '[ ] Objects have adequate spacing between them',
    '[ ] Objects are not too close to edges',
    '[ ] No unintentional overlaps',
    '[ ] Layout works on mobile, tablet, and desktop',

    // 3D (if applicable)
    '[ ] 3D concepts use appropriate visualization mode',
    '[ ] Depth cues help understand 3D relationships',
    '[ ] View angle shows the concept clearly',
  ];
}
