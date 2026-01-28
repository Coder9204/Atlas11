/**
 * Label Evaluator - Quality Validation for Labeling System
 *
 * Validates that labels meet quality requirements:
 * - Word budget per viewport
 * - Label count per viewport
 * - No overlaps (zero tolerance)
 * - Minimum font size
 * - Center zone clear
 * - Minimum gap between labels
 * - Abbreviation rules defined
 */

import {
  ViewportType,
  PositionedLabel,
  BoundingBox,
  LabelDefinition,
  LabelEvaluationResult,
  LabelEvaluationCheck,
  LabelBudget,
  DEFAULT_BUDGETS,
} from './types.js';

// === EVALUATION THRESHOLDS ===

export interface EvaluationThresholds {
  /** Word budget compliance (percentage) */
  wordBudget: number;

  /** Label count compliance (percentage) */
  labelCount: number;

  /** No overlaps compliance (percentage) */
  noOverlaps: number;

  /** Minimum font size compliance (percentage) */
  minFontSize: number;

  /** Center zone clear compliance (percentage) */
  centerZoneClear: number;

  /** Minimum gap compliance (percentage) */
  minGap: number;

  /** Abbreviation rules compliance (percentage) */
  abbreviationRules: number;
}

export const DEFAULT_THRESHOLDS: EvaluationThresholds = {
  wordBudget: 100,
  labelCount: 100,
  noOverlaps: 100,
  minFontSize: 100,
  centerZoneClear: 100,
  minGap: 90,
  abbreviationRules: 90,
};

// === CRITICAL CHECKS ===

export const CRITICAL_CHECKS = [
  'wordBudget',
  'labelCount',
  'noOverlaps',
  'minFontSize',
  'centerZoneClear',
];

// === LABEL EVALUATOR CLASS ===

export class LabelEvaluator {
  private thresholds: EvaluationThresholds;
  private minFontSize: number;
  private minGap: number;
  private centerZonePercent: number;

  constructor(config: {
    thresholds?: Partial<EvaluationThresholds>;
    minFontSize?: number;
    minGap?: number;
    centerZonePercent?: number;
  } = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
    this.minFontSize = config.minFontSize ?? 10;
    this.minGap = config.minGap ?? 24;
    this.centerZonePercent = config.centerZonePercent ?? 40;
  }

  /**
   * Evaluate positioned labels for a specific viewport
   */
  evaluate(
    labels: PositionedLabel[],
    definitions: LabelDefinition[],
    viewport: ViewportType,
    svgWidth: number,
    svgHeight: number
  ): LabelEvaluationResult {
    const checks: LabelEvaluationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];

    const budget = DEFAULT_BUDGETS[viewport];

    // === CHECK 1: Word Budget ===
    const wordCheck = this.checkWordBudget(labels, budget);
    checks.push(wordCheck);
    if (!wordCheck.passed && CRITICAL_CHECKS.includes('wordBudget')) {
      criticalFailures.push(wordCheck.message || 'Word budget exceeded');
    }

    // === CHECK 2: Label Count ===
    const labelCountCheck = this.checkLabelCount(labels, budget);
    checks.push(labelCountCheck);
    if (!labelCountCheck.passed && CRITICAL_CHECKS.includes('labelCount')) {
      criticalFailures.push(labelCountCheck.message || 'Label count exceeded');
    }

    // === CHECK 3: No Overlaps ===
    const overlapCheck = this.checkNoOverlaps(labels);
    checks.push(overlapCheck);
    if (!overlapCheck.passed && CRITICAL_CHECKS.includes('noOverlaps')) {
      criticalFailures.push(overlapCheck.message || 'Label overlaps detected');
    }

    // === CHECK 4: Minimum Font Size ===
    const fontCheck = this.checkMinFontSize(labels);
    checks.push(fontCheck);
    if (!fontCheck.passed && CRITICAL_CHECKS.includes('minFontSize')) {
      criticalFailures.push(fontCheck.message || 'Font size below minimum');
    }

    // === CHECK 5: Center Zone Clear ===
    const centerCheck = this.checkCenterZoneClear(labels, svgWidth, svgHeight);
    checks.push(centerCheck);
    if (!centerCheck.passed && CRITICAL_CHECKS.includes('centerZoneClear')) {
      criticalFailures.push(centerCheck.message || 'Labels in center zone');
    }

    // === CHECK 6: Minimum Gap ===
    const gapCheck = this.checkMinGap(labels);
    checks.push(gapCheck);
    if (!gapCheck.passed && !CRITICAL_CHECKS.includes('minGap')) {
      warnings.push(gapCheck.message || 'Minimum gap not met');
    }

    // === CHECK 7: Abbreviation Rules ===
    const abbrCheck = this.checkAbbreviationRules(definitions);
    checks.push(abbrCheck);
    if (!abbrCheck.passed && !CRITICAL_CHECKS.includes('abbreviationRules')) {
      warnings.push(abbrCheck.message || 'Abbreviation rules not defined');
    }

    // Calculate overall score
    const passedChecks = checks.filter(c => c.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);

    // Overall pass requires all critical checks to pass
    const passed = criticalFailures.length === 0;

    return {
      passed,
      score,
      checks,
      criticalFailures,
      warnings,
    };
  }

  /**
   * Evaluate labels across all viewports
   */
  evaluateAllViewports(
    labelsByViewport: Record<ViewportType, PositionedLabel[]>,
    definitions: LabelDefinition[],
    svgWidth: number,
    svgHeight: number
  ): Record<ViewportType, LabelEvaluationResult> {
    return {
      mobile: this.evaluate(labelsByViewport.mobile, definitions, 'mobile', svgWidth, svgHeight),
      tablet: this.evaluate(labelsByViewport.tablet, definitions, 'tablet', svgWidth, svgHeight),
      desktop: this.evaluate(labelsByViewport.desktop, definitions, 'desktop', svgWidth, svgHeight),
    };
  }

  // === INDIVIDUAL CHECKS ===

  /**
   * Check word budget compliance
   */
  private checkWordBudget(labels: PositionedLabel[], budget: LabelBudget): LabelEvaluationCheck {
    const totalWords = labels.reduce((sum, label) => {
      return sum + label.text.split(/\s+/).length;
    }, 0);

    const compliance = totalWords <= budget.maxWords ? 100 :
      Math.round((budget.maxWords / totalWords) * 100);

    return {
      name: 'Word Budget',
      passed: compliance >= this.thresholds.wordBudget,
      threshold: this.thresholds.wordBudget,
      actual: compliance,
      critical: CRITICAL_CHECKS.includes('wordBudget'),
      message: totalWords > budget.maxWords
        ? `Word count ${totalWords} exceeds budget ${budget.maxWords}`
        : undefined,
    };
  }

  /**
   * Check label count compliance
   */
  private checkLabelCount(labels: PositionedLabel[], budget: LabelBudget): LabelEvaluationCheck {
    const compliance = labels.length <= budget.maxLabels ? 100 :
      Math.round((budget.maxLabels / labels.length) * 100);

    return {
      name: 'Label Count',
      passed: compliance >= this.thresholds.labelCount,
      threshold: this.thresholds.labelCount,
      actual: compliance,
      critical: CRITICAL_CHECKS.includes('labelCount'),
      message: labels.length > budget.maxLabels
        ? `Label count ${labels.length} exceeds budget ${budget.maxLabels}`
        : undefined,
    };
  }

  /**
   * Check for label overlaps
   */
  private checkNoOverlaps(labels: PositionedLabel[]): LabelEvaluationCheck {
    const overlaps: string[] = [];

    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        if (this.boundsOverlap(labels[i].bounds, labels[j].bounds)) {
          overlaps.push(`${labels[i].id} overlaps ${labels[j].id}`);
        }
      }
    }

    const compliance = overlaps.length === 0 ? 100 : 0;

    return {
      name: 'No Overlaps',
      passed: compliance >= this.thresholds.noOverlaps,
      threshold: this.thresholds.noOverlaps,
      actual: compliance,
      critical: CRITICAL_CHECKS.includes('noOverlaps'),
      message: overlaps.length > 0
        ? `${overlaps.length} overlap(s) detected: ${overlaps.join(', ')}`
        : undefined,
    };
  }

  /**
   * Check minimum font size
   */
  private checkMinFontSize(labels: PositionedLabel[]): LabelEvaluationCheck {
    const tooSmall = labels.filter(l => l.style.fontSize < this.minFontSize);
    const compliance = labels.length === 0 ? 100 :
      Math.round(((labels.length - tooSmall.length) / labels.length) * 100);

    return {
      name: 'Minimum Font Size',
      passed: compliance >= this.thresholds.minFontSize,
      threshold: this.thresholds.minFontSize,
      actual: compliance,
      critical: CRITICAL_CHECKS.includes('minFontSize'),
      message: tooSmall.length > 0
        ? `${tooSmall.length} label(s) below min font size ${this.minFontSize}px`
        : undefined,
    };
  }

  /**
   * Check that center zone is clear of labels
   */
  private checkCenterZoneClear(
    labels: PositionedLabel[],
    svgWidth: number,
    svgHeight: number
  ): LabelEvaluationCheck {
    const centerZone = this.calculateCenterZone(svgWidth, svgHeight);
    const inCenter = labels.filter(l => this.boundsContainedIn(l.bounds, centerZone));
    const compliance = inCenter.length === 0 ? 100 :
      Math.round(((labels.length - inCenter.length) / labels.length) * 100);

    return {
      name: 'Center Zone Clear',
      passed: compliance >= this.thresholds.centerZoneClear,
      threshold: this.thresholds.centerZoneClear,
      actual: compliance,
      critical: CRITICAL_CHECKS.includes('centerZoneClear'),
      message: inCenter.length > 0
        ? `${inCenter.length} label(s) entirely in center zone`
        : undefined,
    };
  }

  /**
   * Check minimum gap between labels
   */
  private checkMinGap(labels: PositionedLabel[]): LabelEvaluationCheck {
    if (labels.length < 2) {
      return {
        name: 'Minimum Gap',
        passed: true,
        threshold: this.thresholds.minGap,
        actual: 100,
        critical: false,
      };
    }

    let totalPairs = 0;
    let pairsWithSufficientGap = 0;

    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        totalPairs++;
        const gap = this.calculateGap(labels[i].bounds, labels[j].bounds);
        if (gap >= this.minGap || gap < 0) { // gap < 0 means they don't overlap (far apart)
          pairsWithSufficientGap++;
        }
      }
    }

    const compliance = Math.round((pairsWithSufficientGap / totalPairs) * 100);

    return {
      name: 'Minimum Gap',
      passed: compliance >= this.thresholds.minGap,
      threshold: this.thresholds.minGap,
      actual: compliance,
      critical: false,
      message: compliance < this.thresholds.minGap
        ? `${totalPairs - pairsWithSufficientGap} label pair(s) below min gap ${this.minGap}px`
        : undefined,
    };
  }

  /**
   * Check that abbreviation rules are defined for labels with abbreviations
   */
  private checkAbbreviationRules(definitions: LabelDefinition[]): LabelEvaluationCheck {
    const withAbbr = definitions.filter(d => d.abbreviation);
    const withRules = withAbbr.filter(d => d.useAbbreviationAfter !== undefined);
    const compliance = withAbbr.length === 0 ? 100 :
      Math.round((withRules.length / withAbbr.length) * 100);

    return {
      name: 'Abbreviation Rules',
      passed: compliance >= this.thresholds.abbreviationRules,
      threshold: this.thresholds.abbreviationRules,
      actual: compliance,
      critical: false,
      message: compliance < this.thresholds.abbreviationRules
        ? `${withAbbr.length - withRules.length} label(s) have abbreviations without useAbbreviationAfter`
        : undefined,
    };
  }

  // === HELPER METHODS ===

  /**
   * Check if two bounding boxes overlap
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
   * Calculate the minimum gap between two bounding boxes
   * Returns negative value if boxes overlap
   */
  private calculateGap(a: BoundingBox, b: BoundingBox): number {
    const horizontalGap = Math.max(0, Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width)));
    const verticalGap = Math.max(0, Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height)));

    // If boxes overlap, return negative
    if (this.boundsOverlap(a, b)) {
      return -1;
    }

    // Return the actual gap (minimum of horizontal or vertical separation)
    // If they're diagonally separated, use the diagonal distance
    if (horizontalGap > 0 && verticalGap > 0) {
      return Math.sqrt(horizontalGap * horizontalGap + verticalGap * verticalGap);
    }

    return Math.max(horizontalGap, verticalGap);
  }

  /**
   * Calculate the center zone bounds
   */
  private calculateCenterZone(svgWidth: number, svgHeight: number): BoundingBox {
    const percent = this.centerZonePercent / 100;
    const marginX = (svgWidth * (1 - percent)) / 2;
    const marginY = (svgHeight * (1 - percent)) / 2;

    return {
      x: marginX,
      y: marginY,
      width: svgWidth * percent,
      height: svgHeight * percent,
    };
  }
}

// === FACTORY FUNCTION ===

export function createLabelEvaluator(config?: {
  thresholds?: Partial<EvaluationThresholds>;
  minFontSize?: number;
  minGap?: number;
  centerZonePercent?: number;
}): LabelEvaluator {
  return new LabelEvaluator(config);
}

// === QUICK VALIDATION HELPER ===

/**
 * Quick validation function for positioned labels
 * Returns true if all critical checks pass
 */
export function validateLabels(
  labels: PositionedLabel[],
  definitions: LabelDefinition[],
  viewport: ViewportType,
  svgWidth: number,
  svgHeight: number
): boolean {
  const evaluator = new LabelEvaluator();
  const result = evaluator.evaluate(labels, definitions, viewport, svgWidth, svgHeight);
  return result.passed;
}
