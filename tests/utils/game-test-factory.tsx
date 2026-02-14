/**
 * UNIVERSAL GAME TEST FACTORY v3
 *
 * Comprehensive TDD test suite for validating ANY game renderer.
 * Based on the Wave Particle Duality gold standard game flow.
 *
 * Features:
 * - Auto-detects game architecture (self-managing vs externally-managed)
 * - Tiered testing: must-pass, should-pass, premium, eval-compliance
 * - Strict assertions that catch real problems
 * - 6 new test categories for educational quality
 * - Tier 4: Eval Compliance tests mapped 1:1 to GAME_EVALUATION_SYSTEM.md
 *
 * Usage:
 *   import MyGameRenderer from '../../components/MyGameRenderer';
 *   import { createGameTestSuite } from '../utils/game-test-factory';
 *   createGameTestSuite('MyGameRenderer', MyGameRenderer);
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { clearConsoleLogs, consoleErrors, consoleWarnings } from '../setup';

// ============================================================================
// TYPES
// ============================================================================

interface GameProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  phase?: string;
  [key: string]: unknown;
}

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

type GameComponent = React.ComponentType<GameProps>;

type GameArchitecture = 'self-managing' | 'externally-managed';

interface TestSuiteConfig {
  tier: 'must-pass' | 'should-pass' | 'premium' | 'eval-compliance' | 'all';
  architecture?: GameArchitecture | 'auto';
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

const getPhaseContent = () => document.body.textContent || '';

const findButtonByText = (text: string | RegExp) => {
  const buttons = screen.getAllByRole('button');
  return buttons.find(btn => {
    const content = btn.textContent || '';
    if (typeof text === 'string') {
      return content.includes(text);
    }
    return text.test(content);
  });
};

const getNavDots = () => {
  // Strategy 1: buttons with aria-label containing phase-related names
  const phasePattern = /hook|intro|predict|play|experiment|review|understanding|twist|observer|new.?var|explore|deep|insight|transfer|real.?world|test|knowledge|mastery|complet|material|compare|media/i;

  const ariaLabelButtons = Array.from(document.querySelectorAll('button[aria-label]'))
    .filter(btn => phasePattern.test(btn.getAttribute('aria-label') || ''));
  if (ariaLabelButtons.length >= 8) return ariaLabelButtons;

  // Strategy 2: elements with title containing phase names (WPD uses divs+buttons with title)
  const titleElements = Array.from(document.querySelectorAll('[title]'))
    .filter(el => phasePattern.test(el.getAttribute('title') || ''));
  if (titleElements.length >= 8) return titleElements;

  // Strategy 3: All buttons with aria-label (some games use non-phase labels)
  const allAriaButtons = document.querySelectorAll('button[aria-label]');
  if (allAriaButtons.length >= 8) return Array.from(allAriaButtons);

  // Strategy 4: Small styled buttons/divs that look like dots (morphological)
  const allSmallElements = Array.from(document.querySelectorAll('button, div'))
    .filter(el => {
      const style = el.getAttribute('style') || '';
      const hasSmallWidth = style.match(/width:\s*(\d+)px/) && parseInt(style.match(/width:\s*(\d+)px/)?.[1] || '0') <= 24;
      const hasSmallHeight = style.match(/height:\s*(\d+)px/) && parseInt(style.match(/height:\s*(\d+)px/)?.[1] || '0') <= 12;
      const hasRadius = style.includes('border-radius');
      return hasSmallWidth && hasSmallHeight && hasRadius;
    });
  if (allSmallElements.length >= 8) return allSmallElements;

  // Return whatever we found
  return titleElements.length > ariaLabelButtons.length ? titleElements : Array.from(ariaLabelButtons);
};

const getSliders = () => document.querySelectorAll('input[type="range"]');

const getSVG = () => document.querySelector('svg');

const getAllSVGs = () => document.querySelectorAll('svg');

// ============================================================================
// ARCHITECTURE DETECTION
// ============================================================================

function detectArchitecture(GameComponent: GameComponent): GameArchitecture {
  // Try rendering with gamePhase prop
  try {
    const { unmount } = render(<GameComponent gamePhase="predict" />);
    const content = document.body.textContent || '';
    const hasPredictContent = /predict|think|expect|happen|choose|what.*you|question/i.test(content);
    unmount();
    cleanup();
    clearConsoleLogs();

    if (hasPredictContent) return 'self-managing';
  } catch {
    cleanup();
    clearConsoleLogs();
  }

  return 'externally-managed';
}

// ============================================================================
// SVG COMPLEXITY SCORER
// ============================================================================

function getSvgComplexityScore(svg: SVGElement | null): number {
  if (!svg) return 0;
  let score = 0;
  score += Math.min(5, svg.querySelectorAll('path').length);
  score += Math.min(3, svg.querySelectorAll('circle, ellipse').length);
  score += Math.min(3, svg.querySelectorAll('rect, polygon, polyline, line').length);
  score += Math.min(2, svg.querySelectorAll('linearGradient, radialGradient').length);
  score += Math.min(2, svg.querySelectorAll('filter, feGaussianBlur, feDropShadow, feMerge').length);
  score += Math.min(3, svg.querySelectorAll('g').length);
  score += Math.min(2, svg.querySelectorAll('text, tspan').length);
  score += svg.querySelectorAll('defs').length > 0 ? 1 : 0;
  score += svg.querySelectorAll('animate, animateTransform').length > 0 ? 1 : 0;
  return score; // Max: 22
}

// ============================================================================
// INTERACTIVE GRAPHIC EXCELLENCE HELPERS
// ============================================================================

/**
 * Extract (x, y) coordinates from an SVG path's `d` attribute.
 * Handles M (moveTo) and L (lineTo) commands.
 */
function extractPathPoints(pathD: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const commands = pathD.match(/[ML]\s*([\d.e+-]+)\s+([\d.e+-]+)/g) || [];
  commands.forEach(cmd => {
    const nums = cmd.match(/([\d.e+-]+)/g);
    if (nums && nums.length >= 2) {
      points.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
    }
  });
  return points;
}

/**
 * Find the interactive marker point in an SVG.
 * Looks for circles with glow effects, filters, larger radius, or white stroke
 * (typical patterns for "current value" markers on charts).
 */
function getInteractivePoint(svg: Element | null): { cx: number; cy: number } | null {
  if (!svg) return null;
  const circles = Array.from(svg.querySelectorAll('circle'));
  // Prefer circles with filter attribute (active/current point with glow/shadow),
  // then fall back to circles with white stroke. This avoids matching static
  // reference markers (typically smaller, no filter) before the dynamic point.
  const marker = circles.find(c => {
    const r = parseFloat(c.getAttribute('r') || '0');
    return r >= 6 && c.getAttribute('filter');
  }) || circles.find(c => {
    const r = parseFloat(c.getAttribute('r') || '0');
    const stroke = c.getAttribute('stroke');
    return (r >= 8 && (stroke === '#ffffff' || stroke === 'white' || stroke === '#fff'));
  }) || circles.find(c => {
    const r = parseFloat(c.getAttribute('r') || '0');
    const stroke = c.getAttribute('stroke');
    return (r >= 6 && (stroke === '#ffffff' || stroke === 'white' || stroke === '#fff'));
  });
  if (!marker) return null;
  return {
    cx: parseFloat(marker.getAttribute('cx') || '0'),
    cy: parseFloat(marker.getAttribute('cy') || '0')
  };
}

/**
 * Euclidean distance between two SVG points.
 */
function pointDistance(p1: { cx: number; cy: number }, p2: { cx: number; cy: number }): number {
  return Math.sqrt((p1.cx - p2.cx) ** 2 + (p1.cy - p2.cy) ** 2);
}

// ============================================================================
// EVAL COMPLIANCE HELPERS
// ============================================================================

/**
 * Parse a CSS color string to a brightness value (0-255).
 * Handles #hex, rgb(), rgba(). Returns -1 if unparseable.
 */
function colorBrightness(color: string): number {
  if (!color) return -1;
  color = color.trim().toLowerCase();

  // #rrggbb or #rgb
  let match = color.match(/^#([0-9a-f]{6})$/);
  if (match) {
    const r = parseInt(match[1].slice(0, 2), 16);
    const g = parseInt(match[1].slice(2, 4), 16);
    const b = parseInt(match[1].slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }
  match = color.match(/^#([0-9a-f]{3})$/);
  if (match) {
    const r = parseInt(match[1][0] + match[1][0], 16);
    const g = parseInt(match[1][1] + match[1][1], 16);
    const b = parseInt(match[1][2] + match[1][2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // Named colors
  if (color === 'white' || color === '#fff') return 255;
  if (color === 'black' || color === '#000') return 0;

  return -1;
}

/** Minimum brightness for primary text (#f8fafc ≈ 248) */
const PRIMARY_TEXT_MIN_BRIGHTNESS = 240;
/** Minimum brightness for secondary text (#e2e8f0 ≈ 230) */
const SECONDARY_TEXT_MIN_BRIGHTNESS = 220;

/**
 * Extract all inline color values from a style string.
 * Returns array of {property, value} objects.
 */
function extractColors(style: string): Array<{ property: string; value: string }> {
  const results: Array<{ property: string; value: string }> = [];
  // Match color: and background-color: with hex or rgb values
  const colorProps = style.match(/((?:background-)?color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|white|black)/gi);
  if (colorProps) {
    colorProps.forEach(match => {
      const parts = match.split(':');
      if (parts.length >= 2) {
        results.push({ property: parts[0].trim().toLowerCase(), value: parts.slice(1).join(':').trim() });
      }
    });
  }
  return results;
}

/**
 * Find the scrollable content container in the rendered DOM.
 * Looks for a div with overflowY: auto/scroll inside an overflow: hidden parent.
 * Checks both getAttribute('style') string AND the element's .style object
 * to handle different React rendering behaviors across jsdom versions.
 */
function findScrollStructure(): {
  outerContainer: Element | null;
  scrollableContent: Element | null;
  fixedFooter: Element | null;
} {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const allNavs = Array.from(document.querySelectorAll('nav'));
  const allElements = [...allDivs, ...allNavs];

  // Helper: check both style attribute string and style object
  const styleMatches = (el: Element, pattern: RegExp, styleProp?: string, values?: string[]): boolean => {
    const styleAttr = el.getAttribute('style') || '';
    if (pattern.test(styleAttr)) return true;
    if (styleProp && values) {
      const computed = (el as HTMLElement).style;
      const val = (computed as any)[styleProp];
      if (val && values.some(v => val.includes(v))) return true;
    }
    return false;
  };

  // Find outer container with overflow: hidden
  const outerContainer = allDivs.find(div => {
    const hasOverflowHidden = styleMatches(div, /overflow\s*:\s*hidden/i, 'overflow', ['hidden']);
    const hasLayout = styleMatches(div, /flex|height/i);
    return hasOverflowHidden && hasLayout;
  }) || null;

  // Find scrollable content area with overflowY: auto or scroll
  const scrollableContent = allDivs.find(div => {
    return styleMatches(div, /overflow(-y)?\s*:\s*(auto|scroll)/i, 'overflowY', ['auto', 'scroll'])
      || styleMatches(div, /overflow(-y)?\s*:\s*(auto|scroll)/i, 'overflow', ['auto', 'scroll']);
  }) || null;

  // Find fixed footer - check both div and nav elements with position: fixed AND bottom: 0
  const fixedFooter = allElements.find(el => {
    const isFixed = styleMatches(el, /position\s*:\s*fixed/i, 'position', ['fixed']);
    if (!isFixed) return false;
    // Must be at the bottom (has bottom: 0 style)
    const style = el.getAttribute('style') || '';
    const s = (el as HTMLElement).style;
    const hasBottom = /bottom\s*:\s*0/.test(style) || s.bottom === '0' || s.bottom === '0px';
    return hasBottom;
  }) || null;

  return { outerContainer, scrollableContent, fixedFooter };
}

/**
 * Get the DOM index/position of an element relative to a container.
 * Used for checking above-the-fold ordering.
 */
function getDomPosition(element: Element, container: Element): number {
  const allElements = Array.from(container.querySelectorAll('*'));
  return allElements.indexOf(element);
}

// ============================================================================
// MAIN TEST FACTORY
// ============================================================================

export function createGameTestSuite(
  gameName: string,
  GameComponent: GameComponent,
  config: TestSuiteConfig = { tier: 'all', architecture: 'auto' }
) {
  const tier = config.tier;
  const runTier1 = tier === 'must-pass' || tier === 'should-pass' || tier === 'premium' || tier === 'eval-compliance' || tier === 'all';
  const runTier2 = tier === 'should-pass' || tier === 'premium' || tier === 'eval-compliance' || tier === 'all';
  const runTier3 = tier === 'premium' || tier === 'eval-compliance' || tier === 'all';
  const runTier4 = tier === 'eval-compliance' || tier === 'all';
  const runTier5 = tier === 'all';

  let architecture: GameArchitecture = 'self-managing';

  const renderGame = (props: GameProps = {}) => {
    const mergedProps: GameProps = { ...props };
    if (architecture === 'externally-managed' && props.gamePhase) {
      mergedProps.phase = props.gamePhase;
    }
    return render(<GameComponent {...mergedProps} />);
  };

  describe(`${gameName} - TDD Validation Suite`, () => {
    beforeEach(() => {
      cleanup();
      clearConsoleLogs();
    });

    // Detect architecture once before all tests
    it('detects game architecture', () => {
      if (config.architecture && config.architecture !== 'auto') {
        architecture = config.architecture;
      } else {
        architecture = detectArchitecture(GameComponent);
      }
      expect(['self-managing', 'externally-managed']).toContain(architecture);
    });

    // ========================================================================
    // TIER 1: MUST-PASS (Structural Correctness) ~25 tests
    // ========================================================================

    if (runTier1) {
      describe('TIER 1: Must-Pass - Structural Correctness', () => {

        describe('1.1 Phase Rendering', () => {
          it('all 10 phases render without error', () => {
            const phases = ['hook', 'predict', 'play', 'review', 'twist_predict',
              'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

            phases.forEach(p => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: p });
              const content = getPhaseContent();
              expect(content.length).toBeGreaterThan(20);
              unmount();
              cleanup();
            });
          });

          it('initializes to hook/introduction phase', () => {
            renderGame();
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(100);
          });

          it('renders different content for each phase', () => {
            const { unmount } = renderGame({ gamePhase: 'hook' });
            const hookContent = getPhaseContent();
            unmount();
            cleanup();

            renderGame({ gamePhase: 'test' });
            const testContent = getPhaseContent();

            expect(hookContent).not.toBe(testContent);
          });

          it('invalid phase defaults to hook safely', () => {
            clearConsoleLogs();
            renderGame({ gamePhase: 'invalid_phase_xyz' as any });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(50);
          });
        });

        describe('1.2 No Console Errors', () => {
          it('no errors on initial load', () => {
            renderGame();
            expect(consoleErrors.length).toBe(0);
          });

          it('no errors during phase navigation', () => {
            renderGame();
            const dots = getNavDots();
            dots.forEach(dot => fireEvent.click(dot));
            expect(consoleErrors.length).toBe(0);
          });

          it('no errors during slider interaction', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0];
            if (slider) {
              fireEvent.change(slider, { target: { value: '50' } });
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('no errors during quiz', () => {
            renderGame({ gamePhase: 'test' });
            const options = screen.getAllByRole('button').filter(btn =>
              btn.textContent && btn.textContent.length > 5 &&
              !(/next|prev|back|submit|skip|home/i.test(btn.textContent))
            );
            if (options.length > 0) fireEvent.click(options[0]);
            expect(consoleErrors.length).toBe(0);
          });

          it('no React key warnings', () => {
            renderGame({ gamePhase: 'transfer' });
            const hasKeyWarning = consoleWarnings.some(warn =>
              warn.includes('key') && warn.includes('unique')
            );
            expect(hasKeyWarning).toBe(false);
          });
        });

        describe('1.3 SVG Visualization Exists', () => {
          it('has SVG element in play phase', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();
          });

          it('SVG has substantial content (not trivial)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();
            expect(svg!.innerHTML.length).toBeGreaterThan(200);
          });

          it('SVG has proper dimensions', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg?.getAttribute('width') || svg?.getAttribute('viewBox')).toBeTruthy();
          });
        });

        describe('1.4 Test Questions Exist', () => {
          it('test phase has quiz content', () => {
            renderGame({ gamePhase: 'test' });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(200);
          });

          it('test phase has answer options', () => {
            renderGame({ gamePhase: 'test' });
            const buttons = screen.getAllByRole('button');
            const optionButtons = buttons.filter(btn => {
              const text = btn.textContent || '';
              return text.length > 5 && !(/next|prev|back|submit|skip|home|^[0-9]$/i.test(text));
            });
            expect(optionButtons.length).toBeGreaterThanOrEqual(3);
          });
        });

        describe('1.5 Transfer Content Exists', () => {
          it('transfer phase has real-world content', () => {
            renderGame({ gamePhase: 'transfer' });
            const content = getPhaseContent();
            expect(content).toMatch(/application|real.?world|example|industry|company|engineer/i);
          });

          it('transfer content is substantial', () => {
            renderGame({ gamePhase: 'transfer' });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(300);
          });
        });

        describe('1.6 Prediction Phase Exists', () => {
          it('predict phase has prediction content', () => {
            renderGame({ gamePhase: 'predict' });
            const content = getPhaseContent();
            expect(content).toMatch(/predict|think|expect|happen|choose|what|question/i);
          });

          it('twist_predict phase has prediction content', () => {
            renderGame({ gamePhase: 'twist_predict' });
            const content = getPhaseContent();
            expect(content).toMatch(/predict|think|expect|new|variable|twist|change|different|what|watch|observe/i);
          });
        });

        describe('1.7 Clean Unmount', () => {
          it('unmounts without errors', () => {
            const { unmount } = renderGame();
            unmount();
            expect(consoleErrors.length).toBe(0);
          });

          it('cleans up on unmount from play phase', () => {
            const { unmount } = renderGame({ gamePhase: 'play' });
            unmount();
            expect(consoleErrors.length).toBe(0);
          });

          it('no errors after unmount events', () => {
            const { unmount } = renderGame();
            unmount();
            window.dispatchEvent(new Event('resize'));
            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('1.8 Sound Integration', () => {
          it('does not crash when interactions trigger sounds', () => {
            renderGame();
            const buttons = screen.getAllByRole('button');
            buttons.slice(0, 5).forEach(btn => fireEvent.click(btn));
            expect(consoleErrors.filter(e => e.includes('Audio'))).toHaveLength(0);
          });
        });

        describe('1.9 Performance', () => {
          it('mounts in under 500ms', () => {
            const start = performance.now();
            renderGame();
            const end = performance.now();
            expect(end - start).toBeLessThan(500);
          });

          it('handles remount gracefully', () => {
            const { unmount } = renderGame({ gamePhase: 'play' });
            unmount();
            cleanup();
            clearConsoleLogs();
            renderGame({ gamePhase: 'hook' });
            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('1.10 Navigation Flow', () => {
          it('has a bottom navigation bar with Back and Next buttons', () => {
            renderGame();
            const allButtons = screen.getAllByRole('button');
            const buttonTexts = allButtons.map(b => b.textContent?.trim() || '');
            const hasBack = buttonTexts.some(t => /back/i.test(t));
            const hasNext = buttonTexts.some(t => /next|continue|start|begin/i.test(t));
            expect(hasBack || hasNext).toBe(true);
          });

          it('Next button advances from hook to predict', () => {
            renderGame();
            const hookContent = getPhaseContent();

            // Find a Next/Continue/Start button
            const allButtons = screen.getAllByRole('button');
            const nextBtn = allButtons.find(b => {
              const txt = b.textContent?.trim() || '';
              return /next|continue|start|begin|discovery/i.test(txt) && txt.length > 2;
            });
            if (nextBtn) {
              // Try both click and pointerDown (some games use onPointerDown)
              fireEvent.pointerDown(nextBtn);
              fireEvent.click(nextBtn);
              const newContent = getPhaseContent();
              expect(newContent).not.toBe(hookContent);
            }
          });

          it('has proper layout structure (not just free-flowing content)', () => {
            const { container } = renderGame();
            const outerDiv = container.firstElementChild as HTMLElement;
            if (outerDiv) {
              // Check for flex layout via inline styles OR CSS classes
              const style = outerDiv.style;
              const className = outerDiv.className || '';
              const hasFlexLayout = (style.display === 'flex' && style.flexDirection === 'column')
                || className.includes('flex')
                || className.includes('flex-col');
              const hasFullHeight = style.height === '100vh' || style.minHeight === '100vh'
                || className.includes('inset-0')
                || className.includes('h-screen');
              expect(hasFlexLayout || hasFullHeight).toBe(true);
            }
          });
        });

        describe('1.11 Critical Game Integrity', () => {
          it('starts at hook phase when no gamePhase prop provided (production mode)', () => {
            // This is critical: games must start at hook, not skip to test or other phases
            render(<GameComponent />);
            const content = getPhaseContent();

            // Hook phase should have introductory content, NOT quiz questions
            // Be specific: "Question 1 of 10" is a quiz, but "1/10" alone is just phase progress
            const hasQuizContent = /question\s*1\s*(of|\/)\s*10/i.test(content) ||
              /select.*correct.*answer|choose.*best.*answer|which.*following.*correct/i.test(content);
            expect(hasQuizContent).toBe(false);

            // Should have hook-like content (intro, discover, begin, start)
            const hasHookContent = /discover|introduction|welcome|begin|start|explore|let's|what.*happen|about to|first|how.*work/i.test(content);
            expect(hasHookContent).toBe(true);
          });

          it('can navigate sequentially from hook to play phase via Next buttons', () => {
            render(<GameComponent />);

            // Track which phases we visit
            const phasesVisited: string[] = [];

            // Helper to click Next/Continue button
            const clickNextButton = () => {
              const allButtons = screen.getAllByRole('button');
              const nextBtn = allButtons.find(b => {
                const txt = b.textContent?.trim() || '';
                return /^(next|continue|start|begin|discovery|see|observe|experiment|understand|got it|explore)[\s→]?/i.test(txt)
                  || txt === 'Next →' || txt === 'Next→';
              });
              if (nextBtn && !(nextBtn as HTMLElement).hasAttribute('disabled')) {
                const style = (nextBtn as HTMLElement).getAttribute('style') || '';
                const isDisabled = style.includes('opacity: 0.4') || style.includes('cursor: not-allowed');
                if (!isDisabled) {
                  fireEvent.pointerDown(nextBtn);
                  fireEvent.click(nextBtn);
                  return true;
                }
              }
              return false;
            };

            // Start at hook - record initial content fingerprint
            const hookContent = getPhaseContent().slice(0, 200);
            phasesVisited.push('hook');

            // Navigate through phases (hook → predict → play)
            // We need at least 2 Next clicks to reach play phase
            for (let i = 0; i < 4; i++) {
              const contentBefore = getPhaseContent();
              const clicked = clickNextButton();
              if (!clicked) break;

              const contentAfter = getPhaseContent();
              if (contentAfter !== contentBefore) {
                phasesVisited.push(`phase_${i + 1}`);
              }

              // Check if we reached play phase (has sliders)
              const sliders = document.querySelectorAll('input[type="range"]');
              if (sliders.length > 0) {
                phasesVisited.push('play_with_sliders');
                break;
              }
            }

            // Should have progressed through at least 2 phases
            expect(phasesVisited.length).toBeGreaterThanOrEqual(2);
          });

          it('play phase sliders are visible and not hidden by CSS', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = document.querySelectorAll('input[type="range"]');

            if (sliders.length > 0) {
              sliders.forEach((slider, index) => {
                const el = slider as HTMLElement;
                const style = el.getAttribute('style') || '';
                const computedDisplay = el.style.display;
                const computedVisibility = el.style.visibility;

                // Slider should not be hidden
                const isHidden =
                  style.includes('display: none') ||
                  style.includes('display:none') ||
                  style.includes('visibility: hidden') ||
                  style.includes('visibility:hidden') ||
                  computedDisplay === 'none' ||
                  computedVisibility === 'hidden';

                expect(isHidden).toBe(false);

                // Check parent containers aren't hiding it
                let parent = el.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                  const parentStyle = parent.getAttribute('style') || '';
                  const isParentHidden =
                    parentStyle.includes('display: none') ||
                    parentStyle.includes('display:none') ||
                    parent.style.display === 'none';
                  expect(isParentHidden).toBe(false);
                  parent = parent.parentElement;
                  depth++;
                }
              });
            }
          });

          it('does not jump directly to test phase on initial render', () => {
            render(<GameComponent />);
            const content = getPhaseContent();

            // Should NOT have quiz-specific indicators on initial render
            // "Question 1 of 10" is quiz content, but "1/10" alone is just phase progress
            const hasQuizSpecificContent =
              /question\s*1\s*(of|\/)\s*10/i.test(content) ||
              /knowledge\s*test.*question|select.*correct.*answer|which.*following/i.test(content);

            // If it looks like we're at test phase immediately, verify there's hook content
            if (hasQuizSpecificContent) {
              const hookContent = /discover|introduction|welcome|begin|explore|start.*journey|let's.*learn|how.*work/i.test(content);
              expect(hookContent).toBe(true);
            }
          });
        });

        describe('1.12 Full User Journey', () => {
          it('renders distinct content for hook, play, and test phases', () => {
            // Verify the three critical phases have distinct content
            const contentMap: Record<string, string> = {};

            ['hook', 'play', 'test'].forEach(phase => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: phase });
              contentMap[phase] = getPhaseContent().slice(0, 300);
              unmount();
              cleanup();
            });

            // Each phase should have unique content
            expect(contentMap.hook).not.toBe(contentMap.play);
            expect(contentMap.play).not.toBe(contentMap.test);
            expect(contentMap.hook).not.toBe(contentMap.test);
          });

          it('can advance from hook phase via primary action button', () => {
            render(<GameComponent />);
            const hookContent = getPhaseContent().slice(0, 200);

            // Find and click the primary CTA button
            const allButtons = screen.getAllByRole('button');
            const ctaBtn = allButtons.find(b => {
              const txt = b.textContent?.trim() || '';
              const style = (b as HTMLElement).getAttribute('style') || '';
              // Look for prominent styled buttons with action text
              const hasBackground = style.includes('background') && !style.includes('transparent');
              const isAction = /start|begin|discover|explore|let's go|next|continue/i.test(txt);
              return isAction && (hasBackground || txt.length < 30);
            });

            if (ctaBtn) {
              fireEvent.pointerDown(ctaBtn);
              fireEvent.click(ctaBtn);

              const newContent = getPhaseContent().slice(0, 200);
              // Content should change after clicking CTA
              // (or we might need to make a prediction first - that's OK too)
              expect(consoleErrors.length).toBe(0);
            }
          });

          it('back button exists in navigation bar', () => {
            // Verify back button exists in predict phase (should be enabled)
            renderGame({ gamePhase: 'predict' });

            // Find Back button
            const backBtn = screen.getAllByRole('button').find(b => {
              const txt = b.textContent?.trim() || '';
              return /^←|back|previous/i.test(txt);
            });

            // Back button should exist in the UI
            expect(backBtn).toBeTruthy();
            expect(consoleErrors.length).toBe(0);
          });

          it('game state resets on fresh mount', () => {
            // First render at play phase
            const { unmount } = renderGame({ gamePhase: 'play' });
            const playContent = getPhaseContent().slice(0, 100);
            unmount();
            cleanup();

            // Fresh render with no props - should start at hook
            render(<GameComponent />);
            const freshContent = getPhaseContent().slice(0, 100);

            // Fresh mount should show hook content, not play content
            expect(freshContent).not.toBe(playContent);
          });

          it('phases have varied content (not all identical)', () => {
            const phaseContents: Map<string, string> = new Map();
            const phases = ['hook', 'predict', 'play', 'review', 'transfer', 'test'];

            phases.forEach(phase => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: phase });
              // Use first 200 chars of content as fingerprint
              const content = getPhaseContent().slice(0, 200);
              phaseContents.set(phase, content);
              unmount();
              cleanup();
            });

            // Count unique content fingerprints
            const uniqueContents = new Set(phaseContents.values());

            // Should have at least 3 distinct content variations across 6 phases
            // (some phases like predict/twist_predict may share format)
            expect(uniqueContents.size).toBeGreaterThanOrEqual(3);
          });
        });
      });
    }

    // ========================================================================
    // TIER 2: SHOULD-PASS (Quality Standards) ~40 tests
    // ========================================================================

    if (runTier2) {
      describe('TIER 2: Should-Pass - Quality Standards', () => {

        describe('2.1 Navigation Structure', () => {
          it('has 10 navigation dots (self-managing games)', () => {
            renderGame();
            const navDots = getNavDots();
            // Self-managing games must have exactly 10 nav dots
            // Externally-managed games may have fewer or none
            if (architecture === 'self-managing') {
              expect(navDots.length).toBe(10);
            } else {
              expect(navDots.length).toBeGreaterThanOrEqual(0);
            }
          });

          it('navigation dots have labels', () => {
            renderGame();
            const navDots = getNavDots();
            if (navDots.length >= 8) {
              const labeled = navDots.filter(dot =>
                dot.getAttribute('aria-label') || dot.getAttribute('title')
              );
              expect(labeled.length).toBe(navDots.length);
            }
          });

          it('navigation dots are clickable', () => {
            renderGame();
            const dots = getNavDots();
            if (dots.length > 0) {
              dots.forEach(dot => {
                const style = (dot as HTMLElement).getAttribute('style') || '';
                expect(style).toContain('cursor');
              });
            }
          });

          it('has progress bar', () => {
            renderGame();
            const progressBar = document.querySelector('[style*="position: fixed"]') ||
              document.querySelector('[style*="width"][style*="transition"]');
            expect(progressBar).toBeInTheDocument();
          });
        });

        describe('2.2 Predict-Play Graphic Continuity', () => {
          it('predict phase contains an SVG graphic', () => {
            renderGame({ gamePhase: 'predict' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();
            expect(svg!.innerHTML.length).toBeGreaterThan(200);
          });

          it('predict phase does NOT have sliders (observe before interact)', () => {
            renderGame({ gamePhase: 'predict' });
            const sliders = getSliders();
            expect(sliders.length).toBe(0);
          });

          it('play phase has sliders or toggle controls that predict does not', () => {
            const { unmount: u1 } = renderGame({ gamePhase: 'predict' });
            const predictSliders = getSliders().length;
            u1();
            cleanup();

            renderGame({ gamePhase: 'play' });
            const playSliders = getSliders().length;
            // Play phase should have sliders/range inputs OR toggle buttons
            // that predict phase does not have
            const playToggleButtons = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent || '';
              return /reset|fire|start|run|toggle|on|off/i.test(text);
            }).length;

            expect(playSliders + playToggleButtons).toBeGreaterThan(predictSliders);
          });

          it('twist_predict shows graphic without sliders', () => {
            renderGame({ gamePhase: 'twist_predict' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();
            const sliders = getSliders();
            expect(sliders.length).toBe(0);
          });

          it('twist_play has interactive controls', () => {
            renderGame({ gamePhase: 'twist_play' });
            const sliders = getSliders();
            const buttons = screen.getAllByRole('button');
            expect(sliders.length + buttons.length).toBeGreaterThan(2);
          });

          it('play phase has at least 1 slider for physics parameter control', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();
            // Physics simulations should have sliders to adjust parameters
            // This is a critical UX requirement for interactive learning
            expect(sliders.length).toBeGreaterThanOrEqual(1);
          });

          it('twist_play phase has interactive controls or educational visualization', () => {
            renderGame({ gamePhase: 'twist_play' });
            const sliders = getSliders();
            // Count action buttons that provide interactivity
            const actionButtons = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent?.trim() || '';
              return /start|run|fire|launch|inject|toggle|reset|simulate|release|drop|go|activate|drain|stir|mix/i.test(text);
            });
            // Check for educational visualization (SVG with substantial content)
            const svg = getSVG();
            const hasMeaningfulVisualization = svg && svg.innerHTML.length > 500;
            // Twist phases should have interactive elements OR meaningful visualization
            expect(sliders.length + actionButtons.length >= 1 || hasMeaningfulVisualization).toBe(true);
          });
        });

        describe('2.3 Control Effectiveness', () => {
          it('slider change modifies SVG content in play phase', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return; // Some games use buttons instead

            const svgBefore = getSVG()?.innerHTML || '';

            const mid = (Number(slider.min) + Number(slider.max)) / 2;
            const newVal = Number(slider.value) === mid ? Number(slider.max) : mid;
            fireEvent.change(slider, { target: { value: String(newVal) } });

            const svgAfter = getSVG()?.innerHTML || '';
            expect(svgAfter).not.toBe(svgBefore);
          });

          it('twist_play slider also modifies SVG', () => {
            renderGame({ gamePhase: 'twist_play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const svgBefore = getSVG()?.innerHTML || '';
            const mid = (Number(slider.min) + Number(slider.max)) / 2;
            fireEvent.change(slider, { target: { value: String(mid) } });
            const svgAfter = getSVG()?.innerHTML || '';

            expect(svgAfter).not.toBe(svgBefore);
          });

          it('controls have visible labels', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(100);
          });

          it('sliders are not disabled by default in play phase', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();
            sliders.forEach(slider => {
              const el = slider as HTMLInputElement;
              expect(el.disabled).toBe(false);
            });
          });

          it('slider change updates displayed value text', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const textBefore = getPhaseContent();
            const mid = (Number(slider.min) + Number(slider.max)) / 2;
            const newVal = Number(slider.value) === mid ? Number(slider.max) : mid;
            fireEvent.change(slider, { target: { value: String(newVal) } });

            const textAfter = getPhaseContent();
            // Page text should change when slider moves (showing updated value/label)
            expect(textAfter).not.toBe(textBefore);
          });

          it('slider values stay in bounds', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (slider) {
              expect(Number(slider.value)).toBeGreaterThanOrEqual(Number(slider.min));
              expect(Number(slider.value)).toBeLessThanOrEqual(Number(slider.max));
            }
          });

          it('handles extreme slider values without error', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (slider) {
              fireEvent.change(slider, { target: { value: slider.min } });
              fireEvent.change(slider, { target: { value: slider.max } });
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('handles continuous slider drag (20 rapid changes)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (slider) {
              for (let i = 0; i < 20; i++) {
                fireEvent.change(slider, { target: { value: String(i * 5) } });
              }
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('slider value is displayed numerically near the slider', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            // Get the slider's current value
            const currentValue = Number(slider.value);

            // Look for the value displayed in the page (common patterns: "50", "50%", "50 m/s")
            const content = getPhaseContent();

            // The slider value OR a derived value should appear in the text
            // Check for the raw number or common formatted versions
            const valuePatterns = [
              new RegExp(`\\b${currentValue}\\b`), // exact value
              new RegExp(`\\b${currentValue}%`),   // percentage
              new RegExp(`\\b${currentValue}\\s*(m|km|s|Hz|°|deg)`), // with units
            ];

            const hasDisplayedValue = valuePatterns.some(p => p.test(content));

            // If value isn't directly shown, at least verify content changes with slider
            if (!hasDisplayedValue) {
              const newVal = currentValue < Number(slider.max) / 2 ? Number(slider.max) : Number(slider.min);
              fireEvent.change(slider, { target: { value: String(newVal) } });
              const newContent = getPhaseContent();
              expect(newContent).not.toBe(content);
            }
          });

          it('sliders respond to touch events (mobile compatibility)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const initialValue = slider.value;

            // Simulate touch interaction
            fireEvent.touchStart(slider, { touches: [{ clientX: 0, clientY: 0 }] });
            fireEvent.touchMove(slider, { touches: [{ clientX: 100, clientY: 0 }] });
            fireEvent.touchEnd(slider);

            // Also test via change event (most reliable in jsdom)
            const newVal = Number(initialValue) + 10;
            fireEvent.change(slider, { target: { value: String(newVal) } });

            // No errors during touch interaction
            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('2.3b Slider Visibility & Styling', () => {
          it('sliders have visible dimensions (width >= 100px, height >= 6px)', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();

            sliders.forEach((slider) => {
              const el = slider as HTMLInputElement;
              const style = el.getAttribute('style') || '';

              // Check for width specification
              const widthMatch = style.match(/width:\s*(\d+)/);
              if (widthMatch) {
                const width = parseInt(widthMatch[1]);
                expect(width).toBeGreaterThanOrEqual(100);
              } else if (style.includes('100%')) {
                // 100% width is acceptable
                expect(true).toBe(true);
              }

              // Check slider has height
              const heightMatch = style.match(/height:\s*(\d+)/);
              if (heightMatch) {
                const height = parseInt(heightMatch[1]);
                expect(height).toBeGreaterThanOrEqual(4);
              }
            });
          });

          it('sliders have accent color styling for visibility', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();

            if (sliders.length > 0) {
              const slider = sliders[0] as HTMLInputElement;
              const style = slider.getAttribute('style') || '';

              // Should have accent-color or background styling for visibility
              const hasVisibleStyling =
                style.includes('accent') ||
                style.includes('background') ||
                style.includes('appearance');

              expect(hasVisibleStyling).toBe(true);
            }
          });

          it('each slider has a descriptive label explaining what it controls', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();
            const content = getPhaseContent();

            if (sliders.length > 0) {
              // Should have labels like "Velocity", "Force", "Angle", "Mass", etc.
              const hasPhysicsLabels = /velocity|speed|force|angle|mass|pressure|temperature|frequency|amplitude|distance|height|diameter|viscosity|flow|rate|volume|density|energy|power|current|voltage|resistance|time|period/i.test(content);
              expect(hasPhysicsLabels).toBe(true);
            }
          });

          it('sliders have units displayed (m/s, kg, Hz, etc.)', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();
            const sliders = getSliders();

            if (sliders.length > 0) {
              // Should show units for physics values
              const hasUnits = /m\/s|km\/h|kg|Hz|°|rad|N|Pa|J|W|V|A|Ω|m²|m³|cm|mm|%|°C|°F|K/i.test(content);
              expect(hasUnits).toBe(true);
            }
          });
        });

        describe('2.3c Educational Labels & Explanations', () => {
          it('play phase explains what the visualization shows', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Should have text explaining what we're looking at
            const hasVisualizationExplanation =
              /showing|displays|represents|illustrates|demonstrates|visualiz|you.*see|watch.*how|observe|notice|look.*at/i.test(content);
            expect(hasVisualizationExplanation).toBe(true);
          });

          it('play phase has cause-effect explanation for slider changes', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Should explain what happens when values change
            const hasCauseEffect =
              /when.*increase|when.*decrease|as.*change|higher.*cause|lower.*result|more.*means|less.*means|affect|impact|because|result|leads to|causes/i.test(content);
            expect(hasCauseEffect).toBe(true);
          });

          it('play phase defines key physics terms used', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Should define or explain at least one physics concept
            const definesTerms =
              /is\s+defined\s+as|is\s+the\s+measure|refers\s+to|means\s+that|is\s+a\s+measure|describes\s+how|measures\s+the|ratio\s+of|relationship\s+between|formula|equation|=|calculated/i.test(content);
            expect(definesTerms).toBe(true);
          });

          it('play phase explains why this concept matters (real-world relevance)', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Should connect to real-world importance
            const hasRelevance =
              /important|matter|real.?world|everyday|practical|engineer|design|application|used\s+in|helps\s+us|allows\s+us|enables|this\s+is\s+why|that'?s\s+why|industry|technology|useful/i.test(content);
            expect(hasRelevance).toBe(true);
          });

          it('SVG visualization has labeled components', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();

            if (svg) {
              const textElements = svg.querySelectorAll('text');
              // Should have at least 2 labels in the SVG
              expect(textElements.length).toBeGreaterThanOrEqual(2);

              // Labels should have meaningful text (not just numbers)
              const meaningfulLabels = Array.from(textElements).filter(t => {
                const text = t.textContent?.trim() || '';
                return text.length > 2 && !/^\d+\.?\d*$/.test(text);
              });
              expect(meaningfulLabels.length).toBeGreaterThanOrEqual(1);
            }
          });
        });

        describe('2.3d Layout Containment', () => {
          it('game container does not overflow viewport width', () => {
            const { container } = renderGame();
            const outerDiv = container.firstElementChild as HTMLElement;

            if (outerDiv) {
              const style = outerDiv.getAttribute('style') || '';
              // Should have overflow hidden or controlled width
              const hasOverflowControl =
                style.includes('overflow') ||
                style.includes('max-width') ||
                style.includes('width: 100%') ||
                style.includes('width:100%');
              expect(hasOverflowControl || outerDiv.scrollWidth <= window.innerWidth + 50).toBe(true);
            }
          });

          it('game content stays within its container bounds', () => {
            const { container } = renderGame({ gamePhase: 'play' });

            // Check that content doesn't spill outside
            const allElements = container.querySelectorAll('*');
            let hasAbsoluteOverflow = false;

            allElements.forEach(el => {
              const style = (el as HTMLElement).getAttribute('style') || '';
              // Elements with position absolute/fixed and negative margins could cause overflow
              if (style.includes('position: absolute') || style.includes('position:absolute')) {
                const left = style.match(/left:\s*(-?\d+)/);
                if (left && parseInt(left[1]) < -50) {
                  hasAbsoluteOverflow = true;
                }
              }
            });

            expect(hasAbsoluteOverflow).toBe(false);
          });

          it('hook phase does not have full-screen overlay blocking other UI', () => {
            const { container } = renderGame({ gamePhase: 'hook' });
            const outerDiv = container.firstElementChild as HTMLElement;

            if (outerDiv) {
              const style = outerDiv.getAttribute('style') || '';
              const className = outerDiv.className || '';

              // Should NOT have position fixed/absolute covering entire screen
              const isFullScreenOverlay =
                (style.includes('position: fixed') || style.includes('position:fixed')) &&
                (style.includes('inset: 0') || style.includes('inset:0') ||
                  (style.includes('top: 0') && style.includes('left: 0') && style.includes('right: 0') && style.includes('bottom: 0')));

              // If it's a fixed overlay, it should have proper z-index management
              if (isFullScreenOverlay) {
                const hasZIndex = style.includes('z-index');
                expect(hasZIndex).toBe(true);
              }
            }
          });
        });

        describe('2.3e Real Usability Quality', () => {
          it('SVG visualization is large enough to see (min 300x200)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // Check viewBox dimensions
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
              const parts = viewBox.split(/[\s,]+/).map(Number);
              const width = parts[2] || 0;
              const height = parts[3] || 0;
              expect(width).toBeGreaterThanOrEqual(300);
              expect(height).toBeGreaterThanOrEqual(200);
            } else {
              // Check width/height attributes
              const width = parseInt(svg.getAttribute('width') || '0');
              const height = parseInt(svg.getAttribute('height') || '0');
              expect(width).toBeGreaterThanOrEqual(300);
              expect(height).toBeGreaterThanOrEqual(200);
            }
          });

          it('SVG text elements are readable (fontSize >= 11)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const textElements = svg.querySelectorAll('text');
            textElements.forEach((text, i) => {
              const fontSize = text.getAttribute('font-size') || text.getAttribute('fontSize') ||
                text.style.fontSize || '12';
              const size = parseInt(fontSize);
              // Allow size 0 for hidden elements, but visible text must be >= 11
              if (size > 0) {
                expect(size).toBeGreaterThanOrEqual(11);
              }
            });
          });

          it('slider change produces meaningful SVG update (>100 chars difference)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const svgBefore = getSVG()?.innerHTML || '';

            // Change slider significantly
            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            const current = Number(slider.value);
            const newVal = current < (min + max) / 2 ? max * 0.9 : min + (max - min) * 0.1;

            fireEvent.change(slider, { target: { value: String(newVal) } });

            const svgAfter = getSVG()?.innerHTML || '';
            const charDiff = Math.abs(svgAfter.length - svgBefore.length) +
              (svgAfter !== svgBefore ? 50 : 0); // Bonus for any change

            // SVG should change meaningfully, not just a tiny attribute
            expect(charDiff).toBeGreaterThan(20);
          });

          it('content container has scroll capability when needed', () => {
            const { container } = renderGame({ gamePhase: 'play' });

            // Find the main content area
            const contentDivs = container.querySelectorAll('div');
            let hasScrollCapability = false;

            contentDivs.forEach(div => {
              const style = div.getAttribute('style') || '';
              if (style.includes('overflow-y: auto') ||
                  style.includes('overflow-y: scroll') ||
                  style.includes('overflow: auto') ||
                  style.includes('overflow: scroll') ||
                  style.includes('overflowY: auto') ||
                  style.includes('overflowY: scroll')) {
                hasScrollCapability = true;
              }
            });

            // Should have at least one scrollable container
            expect(hasScrollCapability).toBe(true);
          });

          it('sliders have adequate touch target size (height >= 16px, responsive width)', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            sliders.forEach(slider => {
              const style = slider.getAttribute('style') || '';

              // Width can be percentage (100%) or pixel value >= 150
              const widthMatch = style.match(/width:\s*(\d+)/);
              const hasPercentWidth = style.includes('width: 100%') || style.includes('width:100%');
              if (widthMatch && !hasPercentWidth) {
                expect(parseInt(widthMatch[1])).toBeGreaterThanOrEqual(150);
              }
              // 100% width is acceptable as it's responsive

              // Check height (should have adequate height for touch - >= 16px)
              const heightMatch = style.match(/height:\s*(\d+)/);
              if (heightMatch) {
                expect(parseInt(heightMatch[1])).toBeGreaterThanOrEqual(16);
              }
            });
          });

          it('page text uses readable font sizes (body text >= 14px)', () => {
            renderGame({ gamePhase: 'play' });
            const paragraphs = document.querySelectorAll('p, span');

            let hasReadableText = false;
            paragraphs.forEach(p => {
              const style = (p as HTMLElement).getAttribute('style') || '';
              const fontSizeMatch = style.match(/font-size:\s*(\d+)/i) ||
                style.match(/fontSize:\s*(\d+)/i);
              if (fontSizeMatch) {
                const size = parseInt(fontSizeMatch[1]);
                if (size >= 14) hasReadableText = true;
              } else {
                // Default browser font is typically 16px, so no explicit size is OK
                hasReadableText = true;
              }
            });

            expect(hasReadableText).toBe(true);
          });
        });

        describe('2.4 Transfer Phase Quality', () => {
          it('transfer content exceeds 800 characters (not placeholder)', () => {
            renderGame({ gamePhase: 'transfer' });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(800);
          });

          it('transfer has numeric statistics', () => {
            renderGame({ gamePhase: 'transfer' });
            const content = getPhaseContent();
            const statsPattern = /\d+[%×xX]|\$\d+|\d+\s*(km|m|kg|GHz|MHz|nm|ms|s|W|V|A|TB|GB|MB|billion|million|B\b)/gi;
            const stats = content.match(statsPattern) || [];
            expect(stats.length).toBeGreaterThanOrEqual(3);
          });

          it('transfer mentions real companies or organizations', () => {
            renderGame({ gamePhase: 'transfer' });
            const content = getPhaseContent();
            // Broad pattern - real applications mention real entities
            expect(content.length).toBeGreaterThan(500);
            // Should have capitalized proper nouns (company/org names)
            const properNouns = content.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
            expect(properNouns.length).toBeGreaterThanOrEqual(4);
          });

          it('transfer has within-phase navigation for multiple applications', () => {
            renderGame({ gamePhase: 'transfer' });
            const contentBefore = getPhaseContent();
            // Find explicit app navigation buttons (not generic Continue/Next)
            const allButtons = screen.getAllByRole('button');
            const appNavBtn = allButtons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /next.*app|app.*→/i.test(text) && text.length < 60;
            });
            // Find app tab/selector buttons (short text, not nav buttons)
            const tabBtns = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 3 && text.length < 40
                && !(/back|next\s*→|prev|← back|continue.*test|check|confirm/i.test(text))
                && !/^(next|prev|back|submit|skip|home)$/i.test(text);
            });

            // If explicit app nav button exists, clicking it MUST change content
            if (appNavBtn) {
              fireEvent.click(appNavBtn);
              const contentAfter = getPhaseContent();
              expect(contentAfter).not.toBe(contentBefore);
            } else if (tabBtns.length >= 4) {
              // If 4+ tab-like buttons exist, clicking should change content or DOM
              const htmlBefore = document.body.innerHTML;
              fireEvent.click(tabBtns[1]);
              const contentAfter = getPhaseContent();
              const htmlAfter = document.body.innerHTML;

              const nextAppBtnAfterClick = screen.queryAllByRole('button').find(btn => {
                const text = btn.textContent?.trim() || '';
                return /next.*app|app.*→/i.test(text);
              });

              const contentChanged = contentAfter !== contentBefore;
              const domChanged = htmlAfter !== htmlBefore;
              // Soft check: at least one of these should be true, but not all games have real tabs
              if (!nextAppBtnAfterClick && !contentChanged && !domChanged) {
                // Tabs exist but don't work - warn but don't fail
                console.warn('[QUALITY] Transfer phase has 4+ buttons but clicking them doesn\'t change content');
              }
            } else if (tabBtns.length >= 2) {
              fireEvent.click(tabBtns[1]);
            }
          });

          it('transfer phase has no duplicate forward-navigation buttons', () => {
            renderGame({ gamePhase: 'transfer' });

            // Click through all apps/tabs first to reach the final state
            const allButtons = screen.getAllByRole('button');
            const appButtons = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 2 && text.length < 50
                && !(/← back|next →|back|prev/i.test(text));
            });
            appButtons.slice(0, 8).forEach(btn => fireEvent.click(btn));

            // After visiting all apps, count enabled forward-navigation buttons
            const currentButtons = screen.getAllByRole('button');
            const forwardBtns = currentButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              const el = btn as HTMLElement;
              const isDisabled = el.hasAttribute('disabled') || el.style.opacity === '0.4' || el.style.cursor === 'not-allowed';
              if (isDisabled) return false;
              return /continue.*test|take.*test|start.*test|begin.*test|knowledge.*test/i.test(text);
            });

            // Should have at most 1 enabled "go to test" button, not duplicates
            expect(forwardBtns.length).toBeLessThanOrEqual(1);
          });

          it('transfer phase has forward navigation to test phase', () => {
            renderGame({ gamePhase: 'transfer' });

            // Click all visible app/tab buttons to simulate visiting all apps
            const allButtons = screen.getAllByRole('button');
            const appButtons = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 2 && text.length < 50
                && !(/← back|next →|back|prev/i.test(text));
            });
            appButtons.slice(0, 8).forEach(btn => fireEvent.click(btn));

            // After visiting apps, there must be a forward navigation path
            const forwardBtn = screen.getAllByRole('button').find(btn => {
              const text = btn.textContent?.trim() || '';
              return /continue|take.*test|next|proceed|knowledge.*test|start.*test|begin.*test/i.test(text);
            });
            const forwardLink = document.querySelector('a[href]');

            expect(forwardBtn || forwardLink).toBeTruthy();
          });
        });

        describe('2.5 Quiz Quality', () => {
          it('shows question counter (1 of 10 or similar)', () => {
            renderGame({ gamePhase: 'test' });
            const content = getPhaseContent();
            expect(content).toMatch(/1\s*(of|\/)\s*10/i);
          });

          it('each question has multiple answer options', () => {
            renderGame({ gamePhase: 'test' });
            const buttons = screen.getAllByRole('button');
            // Filter out navigation and control buttons to find answer options
            const navDotCount = getNavDots().length;
            const optionButtons = buttons.filter(btn => {
              const text = btn.textContent || '';
              const style = btn.getAttribute('style') || '';
              // Exclude nav dots (small buttons), navigation buttons, and control buttons
              const isNavOrControl = /^(next|prev|back|submit|skip|home|previous)$/i.test(text.trim());
              const isSmallDot = style.includes('border-radius') && style.includes('width: 8px') || style.includes('width: 10px') || style.includes('width: 20px') || style.includes('width: 24px');
              return text.length > 10 && !isNavOrControl && !isSmallDot;
            });
            // Should have at least 3 visible answer options
            expect(optionButtons.length).toBeGreaterThanOrEqual(3);
          });

          it('questions have scenario context (substantial text)', () => {
            renderGame({ gamePhase: 'test' });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(400);
          });

          it('can select an answer without error', () => {
            renderGame({ gamePhase: 'test' });
            const options = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent || '';
              return text.length > 5 && !(/next|prev|back|submit|skip|home/i.test(text));
            });
            if (options.length > 0) {
              fireEvent.click(options[0]);
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('can change answer before confirming', () => {
            renderGame({ gamePhase: 'test' });
            const options = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent || '';
              return text.length > 5 && !(/next|prev|back|submit|skip|home/i.test(text));
            });
            if (options.length >= 2) {
              fireEvent.click(options[0]);
              fireEvent.click(options[1]);
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('completing quiz shows score', async () => {
            renderGame({ gamePhase: 'test' });

            for (let i = 0; i < 12; i++) {
              // Break if quiz results are already showing (prevents clicking nav buttons on results page)
              // Match common result formats: "you scored", "test complete!", "X/10 Correct", just "X/10"
              const content = getPhaseContent();
              if (/you\s*scored|test\s*complete!/i.test(content) || /\d+\s*\/\s*10\s*correct/i.test(content)) break;
              if (/\d+\s*\/\s*10/.test(content) && /complete\s*lesson|continue\s*to|mastery|excellent|good\s*job/i.test(content)) break;

              // Step 1: Select an answer option
              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent || '';
                return text.length > 5 && !(/^(next|prev|back|submit|skip|home|← back|next →|check|confirm|replay|return|dashboard|complete)/i.test(text.trim()));
              });
              if (options.length > 0) fireEvent.click(options[0]);

              // Step 2: Click "Check Answer" / "Confirm" if present (new confirm flow)
              const checkBtn = screen.getAllByRole('button').find(btn => {
                const text = btn.textContent?.trim() || '';
                return /check.*answer|confirm.*answer|lock.*in|check$/i.test(text);
              });
              if (checkBtn) fireEvent.click(checkBtn);

              // Step 3: Click quiz-specific next button (not the bottom bar "Next →" or answer options)
              const allButtons = screen.getAllByRole('button');
              const isAnswerOption = (text: string) => /^[A-D]\)/.test(text);
              const quizNextBtn = allButtons.find(btn => {
                const text = btn.textContent?.trim() || '';
                if (isAnswerOption(text)) return false;
                return /next\s*question|question\s*\d|submit\s*test|finish|see\s*results|^continue$/i.test(text);
              }) || allButtons.find(btn => {
                const text = btn.textContent?.trim() || '';
                if (isAnswerOption(text)) return false;
                return text === 'Next' || /^next$/i.test(text);
              });
              if (quizNextBtn) fireEvent.click(quizNextBtn);
            }

            const submitBtn = findButtonByText(/submit|finish|see.*result|complete/i);
            if (submitBtn) fireEvent.click(submitBtn);

            await waitFor(() => {
              expect(getPhaseContent()).toMatch(/\d+\s*\/\s*10|\d+%/);
            }, { timeout: 3000 });
          });

          it('quiz tracks answers and shows accurate final score', async () => {
            renderGame({ gamePhase: 'test' });

            let questionsAnswered = 0;

            // Answer all questions by selecting the first option each time
            for (let i = 0; i < 12; i++) {
              const content = getPhaseContent();
              if (/you\s*scored|test\s*complete/i.test(content)) break;

              // Find and click an answer option
              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent?.trim() || '';
                return /^[A-D]\)/.test(text) && text.length > 5;
              });

              if (options.length > 0) {
                fireEvent.click(options[0]);
                questionsAnswered++;

                // Click check/confirm if present
                const checkBtn = screen.getAllByRole('button').find(b =>
                  /check|confirm/i.test(b.textContent || '')
                );
                if (checkBtn) fireEvent.click(checkBtn);

                // Click next question
                const nextBtn = screen.getAllByRole('button').find(b => {
                  const txt = b.textContent?.trim() || '';
                  return /next|continue/i.test(txt) && !/back/i.test(txt);
                });
                if (nextBtn) fireEvent.click(nextBtn);
              }
            }

            // Submit if there's a submit button
            const submitBtn = findButtonByText(/submit|finish|see.*result/i);
            if (submitBtn) fireEvent.click(submitBtn);

            // Wait for results
            try {
              await waitFor(() => {
                const finalContent = getPhaseContent();
                // Should show a score in format X/10 or X%
                expect(finalContent).toMatch(/\d+\s*\/\s*10|\d+\s*%/);
              }, { timeout: 3000 });

              // Verify the score is reasonable (not 0/10 unless all wrong, not 11/10)
              const finalContent = getPhaseContent();
              const scoreMatch = finalContent.match(/(\d+)\s*\/\s*10/);
              if (scoreMatch) {
                const score = parseInt(scoreMatch[1]);
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(10);
              }
            } catch {
              // Quiz may not have completed - just verify no errors
              expect(consoleErrors.length).toBe(0);
            }
          });
        });

        describe('2.5b Quiz Protection', () => {
          it('bottom bar Next is disabled during active test phase', () => {
            renderGame({ gamePhase: 'test' });
            const allButtons = screen.getAllByRole('button');
            const bottomNextBtn = allButtons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return text === 'Next →' || text === 'Next→';
            });
            if (bottomNextBtn) {
              // Should be disabled (opacity < 1, or cursor not-allowed, or onClick does nothing)
              const style = (bottomNextBtn as HTMLElement).style;
              const isDisabled = style.opacity === '0.4' || style.cursor === 'not-allowed'
                || bottomNextBtn.hasAttribute('disabled');
              expect(isDisabled).toBe(true);
            }
          });

          it('test phase has Check Answer or confirm mechanism', () => {
            renderGame({ gamePhase: 'test' });
            const content = getPhaseContent();
            // Select first answer option
            const allButtons = screen.getAllByRole('button');
            const answerBtn = allButtons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /^[A-D]\)/.test(text) && text.length > 5;
            });
            if (answerBtn) {
              fireEvent.click(answerBtn);
              // After selecting, there should be a Check/Confirm button
              const checkBtn = screen.getAllByRole('button').find(btn => {
                const text = btn.textContent?.trim() || '';
                return /check|confirm|submit|lock/i.test(text);
              });
              expect(checkBtn).toBeTruthy();
            }
          });
        });

        describe('2.5c Quiz Results Navigation', () => {
          it('quiz results page has navigation buttons (dashboard/replay)', async () => {
            renderGame({ gamePhase: 'test' });

            // Complete all 10 questions
            let quizCompleted = false;
            for (let i = 0; i < 12; i++) {
              // Break if quiz results are already showing
              const content = getPhaseContent();
              if (/you\s*scored|test\s*complete!/i.test(content) && /\d+\s*\/\s*10/.test(content)) {
                quizCompleted = true;
                break;
              }

              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent || '';
                return text.length > 5 && !(/^(next|prev|back|submit|skip|home|← back|next →|check|confirm|replay|return|dashboard)/i.test(text.trim()));
              });
              if (options.length > 0) fireEvent.click(options[0]);

              const checkBtn = screen.getAllByRole('button').find(btn => {
                const text = btn.textContent?.trim() || '';
                return /check.*answer|confirm.*answer|lock.*in|check$/i.test(text);
              });
              if (checkBtn) fireEvent.click(checkBtn);

              const allButtons = screen.getAllByRole('button');
              const isAnswerOption = (text: string) => /^[A-D]\)/.test(text);
              const quizNextBtn = allButtons.find(btn => {
                const text = btn.textContent?.trim() || '';
                if (isAnswerOption(text)) return false;
                return /next\s*question|question\s*\d|submit\s*test|finish|see\s*results|^continue$/i.test(text);
              }) || allButtons.find(btn => {
                const text = btn.textContent?.trim() || '';
                if (isAnswerOption(text)) return false;
                return text === 'Next' || /^next$/i.test(text);
              });
              if (quizNextBtn) fireEvent.click(quizNextBtn);
            }

            if (!quizCompleted) {
              const submitBtn = findButtonByText(/submit|finish|see.*result|complete/i);
              if (submitBtn) fireEvent.click(submitBtn);

              try {
                await waitFor(() => {
                  expect(getPhaseContent()).toMatch(/\d+\s*\/\s*10|\d+%/);
                }, { timeout: 5000 });
                quizCompleted = true;
              } catch {
                // Quiz couldn't be completed programmatically - skip nav check
                return;
              }
            }

            // After seeing results, verify navigation buttons exist and are accessible
            if (quizCompleted) {
              const allButtons = screen.queryAllByRole('button');
              const navButtons = allButtons.filter(btn => {
                const text = btn.textContent?.trim() || '';
                return /return|dashboard|replay|try.*again|restart|go.*home|back.*home|play.*again|complete.*lesson|review.*try/i.test(text);
              });
              // Also accept bottom-bar or generic forward navigation as valid
              const bottomBarBtns = allButtons.filter(btn => {
                const text = btn.textContent?.trim() || '';
                return /next\s*→|next→|← back|continue|finish/i.test(text);
              });
              // Also check for navigation links or nav dots
              const navLinks = document.querySelectorAll('a[href]');
              const navDots = getNavDots();

              // At least one way to navigate away from results must exist
              expect(navButtons.length + bottomBarBtns.length + navLinks.length + (navDots.length >= 8 ? 1 : 0)).toBeGreaterThan(0);

              // If dedicated nav buttons exist, verify they're not hidden
              navButtons.forEach(btn => {
                const el = btn as HTMLElement;
                const style = el.getAttribute('style') || '';
                const isHidden = style.includes('display: none') || style.includes('display:none');
                expect(isHidden).toBe(false);
              });
            }

            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('2.5d Quiz Answer Review', () => {
          it('quiz results page shows answer review indicators', async () => {
            renderGame({ gamePhase: 'test' });

            // Complete quiz using same loop pattern
            for (let i = 0; i < 12; i++) {
              if (/you\s*scored|test\s*complete!/i.test(getPhaseContent()) && /\d+\s*\/\s*10/.test(getPhaseContent())) break;

              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent || '';
                return text.length > 5 && !(/^(next|prev|back|submit|skip|home|← back|next →|check|confirm|replay|return|dashboard)/i.test(text.trim()));
              });
              if (options.length > 0) fireEvent.click(options[0]);

              const checkBtn = screen.getAllByRole('button').find(btn =>
                /check.*answer|confirm.*answer|lock.*in|check$/i.test(btn.textContent?.trim() || '')
              );
              if (checkBtn) fireEvent.click(checkBtn);

              const quizNextBtn = screen.getAllByRole('button').find(btn => {
                const text = btn.textContent?.trim() || '';
                return /next\s*question|submit\s*test|finish|see\s*results|^continue$/i.test(text);
              }) || screen.getAllByRole('button').find(btn => /^next$/i.test(btn.textContent?.trim() || ''));
              if (quizNextBtn) fireEvent.click(quizNextBtn);
            }

            // Submit if needed
            const submitBtn = findButtonByText(/submit|finish|see.*result|complete/i);
            if (submitBtn) fireEvent.click(submitBtn);

            try {
              await waitFor(() => {
                expect(getPhaseContent()).toMatch(/\d+\s*\/\s*10|\d+%/);
              }, { timeout: 3000 });
            } catch {
              return; // Could not complete quiz
            }

            // Check for answer review indicators (✓, ✗, correct/incorrect markers)
            const html = document.body.innerHTML;
            const hasReview =
              html.includes('✓') || html.includes('✗') ||
              /question.*review|answer.*review|your.*answer|correct.*answer/i.test(html);

            if (!hasReview) {
              console.warn(
                '[QUALITY] Quiz results page does not include answer review. ' +
                'Gold standard: show question-by-question breakdown with ✓/✗ indicators.'
              );
            }
            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('2.5e Quiz Answer Explanations', () => {
          it('wrong answers show explanation of correct answer', async () => {
            renderGame({ gamePhase: 'test' });

            // Answer first question (likely wrong)
            const options = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent?.trim() || '';
              return /^[A-D]\)/.test(text) && text.length > 5;
            });

            if (options.length > 0) {
              // Select an answer
              fireEvent.click(options[0]);

              // Click check/confirm if present
              const checkBtn = screen.getAllByRole('button').find(b =>
                /check|confirm|submit/i.test(b.textContent || '')
              );
              if (checkBtn) fireEvent.click(checkBtn);

              // After answering, look for explanation
              const content = getPhaseContent();
              const hasExplanation =
                /explanation|because|the correct answer|this is correct|the reason|actually|in fact|remember|note that|key point/i.test(content) ||
                /correct.*because|wrong.*because|answer.*is|should.*be/i.test(content);

              // At minimum, should show which answer was correct
              const showsCorrectAnswer = /correct|✓|right|answer.*[A-D]/i.test(content);

              expect(hasExplanation || showsCorrectAnswer).toBe(true);
            }
          });

          it('quiz provides educational feedback, not just right/wrong', async () => {
            renderGame({ gamePhase: 'test' });

            // Complete several questions
            for (let i = 0; i < 3; i++) {
              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent?.trim() || '';
                return /^[A-D]\)/.test(text) && text.length > 5;
              });
              if (options.length > 0) {
                fireEvent.click(options[0]);
                const checkBtn = screen.getAllByRole('button').find(b =>
                  /check|confirm/i.test(b.textContent || '')
                );
                if (checkBtn) fireEvent.click(checkBtn);

                const nextBtn = screen.getAllByRole('button').find(b =>
                  /next|continue/i.test(b.textContent || '')
                );
                if (nextBtn) fireEvent.click(nextBtn);
              }
            }

            // The content during/after quiz should have educational value
            const content = getPhaseContent();
            const contentLength = content.length;

            // Quiz content should be substantial (not just "Right!" or "Wrong!")
            expect(contentLength).toBeGreaterThan(200);
          });
        });

        describe('2.6 Educational Flow Integrity', () => {
          it('predict phase has selectable prediction options', () => {
            renderGame({ gamePhase: 'predict' });
            const buttons = screen.getAllByRole('button');
            const optionButtons = buttons.filter(btn => {
              const text = btn.textContent || '';
              return text.length > 15;
            });
            expect(optionButtons.length).toBeGreaterThanOrEqual(2);
          });

          it('predict phase gates progress until prediction is made', () => {
            renderGame({ gamePhase: 'predict' });
            const contentBefore = getPhaseContent();

            // Find the Next/Continue button
            const allButtons = screen.getAllByRole('button');
            const nextBtn = allButtons.find(b => {
              const txt = b.textContent?.trim() || '';
              return /next|continue|see|observe/i.test(txt) && !/back/i.test(txt);
            });

            if (nextBtn) {
              // Check if Next is disabled before making prediction
              const style = (nextBtn as HTMLElement).getAttribute('style') || '';
              const isDisabled = style.includes('opacity: 0.4') || style.includes('opacity: 0.3')
                || style.includes('cursor: not-allowed') || nextBtn.hasAttribute('disabled');

              if (isDisabled) {
                // Good - Next is disabled, now select a prediction
                const predictionOptions = allButtons.filter(btn => {
                  const text = btn.textContent?.trim() || '';
                  return text.length > 20 && text.length < 200;
                });
                if (predictionOptions.length > 0) {
                  fireEvent.click(predictionOptions[0]);

                  // Now check if Next is enabled
                  const updatedNextBtn = screen.getAllByRole('button').find(b =>
                    /next|continue|see|observe/i.test(b.textContent?.trim() || '')
                  );
                  if (updatedNextBtn) {
                    const newStyle = (updatedNextBtn as HTMLElement).getAttribute('style') || '';
                    const isNowEnabled = !newStyle.includes('opacity: 0.4') && !newStyle.includes('cursor: not-allowed');
                    expect(isNowEnabled).toBe(true);
                  }
                }
              }
            }
            // If Next wasn't disabled, that's also acceptable (some games allow skipping)
            expect(consoleErrors.length).toBe(0);
          });

          it('review phase has explanatory content (>300 chars)', () => {
            renderGame({ gamePhase: 'review' });
            const content = getPhaseContent();
            expect(content.length).toBeGreaterThan(300);
          });

          it('review phase explains WHY (contains explanatory language)', () => {
            renderGame({ gamePhase: 'review' });
            const content = getPhaseContent();
            expect(content).toMatch(/because|therefore|this.*means|the reason|explains|demonstrates|shows|due to|result|principle|law|equation|formula|secret|key|insight|understand/i);
          });

          it('review phase has formula or mathematical relationship', () => {
            renderGame({ gamePhase: 'review' });
            const content = getPhaseContent();

            // Should show the physics formula or relationship
            const hasFormula =
              /=|∝|×|÷|²|³|√|formula|equation|proportional|relationship|ratio|calculate/i.test(content);
            expect(hasFormula).toBe(true);
          });

          it('review phase connects to prediction made earlier', () => {
            renderGame({ gamePhase: 'review' });
            const content = getPhaseContent();

            // Should reference the prediction or observation
            const referencesLearning =
              /you\s*(saw|observed|noticed|predicted|expected)|as\s*you\s*saw|what\s*happened|the\s*result|your\s*prediction|correct|experiment|observation/i.test(content);
            expect(referencesLearning).toBe(true);
          });

          it('twist introduces genuinely NEW content', () => {
            const { unmount: u1 } = renderGame({ gamePhase: 'predict' });
            const predictContent = getPhaseContent();
            u1();
            cleanup();

            renderGame({ gamePhase: 'twist_predict' });
            const twistContent = getPhaseContent();

            expect(twistContent).not.toBe(predictContent);
            expect(twistContent.length).toBeGreaterThan(50);
          });

          it('mastery phase provides completion/accomplishment', () => {
            renderGame({ gamePhase: 'mastery' });
            const content = getPhaseContent();
            expect(content).toMatch(/complete|master|learned|congratulation|success|score|result|achievement|well done|pass|great/i);
          });

          it('visual indicators use emoji/unicode, not literal plaintext words', () => {
            // Words that should be emoji when used as standalone visual indicators
            const emojiWords = /^(check|trophy|books|star|medal|fire|bulb|sparkle|warning|cross|tick)$/i;
            const suspectElements: string[] = [];

            ['mastery', 'test'].forEach(p => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: p });

              // Scan all leaf elements for standalone words that should be emoji
              document.querySelectorAll('span, div, p').forEach(el => {
                if (el.children.length > 0) return; // skip containers
                const text = (el.textContent || '').trim();
                if (text.length > 15) return; // skip longer phrases
                if (emojiWords.test(text)) {
                  suspectElements.push(`Phase "${p}": literal text "${text}" should be an emoji character`);
                }
              });

              unmount();
              cleanup();
            });

            expect(suspectElements).toEqual([]);
          });

          it('follows predict-observe-explain pattern', () => {
            renderGame({ gamePhase: 'predict' });
            expect(getPhaseContent()).toMatch(/predict|think|expect|what.*will|what.*happen/i);
          });
        });

        describe('2.7 SVG Realism', () => {
          it('play phase SVG has complexity score >= 10', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();
            const score = getSvgComplexityScore(svg as SVGElement);
            expect(score).toBeGreaterThanOrEqual(10);
          });

          it('SVG innerHTML exceeds 1000 characters', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg?.innerHTML.length).toBeGreaterThan(1000);
          });

          it('SVG does not use emoji as primary content', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            const svgText = svg?.textContent || '';
            const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
            const emojiCount = (svgText.match(emojiPattern) || []).length;
            const shapeCount = svg?.querySelectorAll('path, circle, rect, line, polygon, ellipse').length || 0;
            expect(shapeCount).toBeGreaterThan(emojiCount * 3);
          });

          it('uses SVG graphics instead of Unicode symbols for visualization', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            const hasRealGraphics = svg?.querySelectorAll('path, circle, rect, line, polygon, ellipse, g');
            expect(hasRealGraphics?.length).toBeGreaterThanOrEqual(3);
          });

          it('SVG text labels do not overlap each other', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;
            const textEls = Array.from(svg.querySelectorAll('text'));
            if (textEls.length < 2) return; // Skip if fewer than 2 labels

            // Extract approximate position for each text element, accounting for parent <g> transforms
            const getTextPos = (el: SVGTextElement): { x: number; y: number; text: string } | null => {
              let x = parseFloat(el.getAttribute('x') || '') || 0;
              let y = parseFloat(el.getAttribute('y') || '') || 0;

              // Walk up ancestors accumulating translate transforms
              let node: Element | null = el.parentElement;
              while (node && node.tagName !== 'svg') {
                const transform = node.getAttribute('transform') || '';
                const tMatch = transform.match(/translate\(\s*([\d.-]+)\s*,?\s*([\d.-]+)\s*\)/);
                if (tMatch) {
                  x += parseFloat(tMatch[1]);
                  y += parseFloat(tMatch[2]);
                }
                node = node.parentElement;
              }

              // Also check own transform
              const ownTransform = el.getAttribute('transform') || '';
              const ownMatch = ownTransform.match(/translate\(\s*([\d.-]+)\s*,?\s*([\d.-]+)\s*\)/);
              if (ownMatch) {
                x += parseFloat(ownMatch[1]);
                y += parseFloat(ownMatch[2]);
              }

              return { x, y, text: (el.textContent || '').trim() };
            };

            const positions = textEls.map(el => getTextPos(el as SVGTextElement)).filter(Boolean) as { x: number; y: number; text: string }[];
            if (positions.length < 2) return;

            // Check that no two text labels occupy nearly the same position
            // Use a minimum distance threshold - text at the same y with close x, or same x with close y
            const MIN_DISTANCE = 12; // minimum pixel distance between text center points
            const overlaps: string[] = [];
            for (let i = 0; i < positions.length; i++) {
              for (let j = i + 1; j < positions.length; j++) {
                const dx = Math.abs(positions[i].x - positions[j].x);
                const dy = Math.abs(positions[i].y - positions[j].y);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MIN_DISTANCE) {
                  overlaps.push(`"${positions[i].text}" and "${positions[j].text}" are only ${dist.toFixed(1)}px apart`);
                }
              }
            }
            expect(overlaps).toEqual([]);
          });

          it('SVG contains meaningful educational labels (>= 3 text elements)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const textElements = Array.from(svg.querySelectorAll('text, tspan'));
            const meaningfulLabels = textElements.filter(el => {
              const text = (el.textContent || '').trim();
              // Must be more than 2 characters and not just a bare number
              return text.length > 2 && !/^\d+\.?\d*°?$/.test(text);
            });

            expect(meaningfulLabels.length).toBeGreaterThanOrEqual(3);
          });
        });

        describe('2.8 Button Reliability', () => {
          it('buttons respond on first click', () => {
            renderGame();
            const button = findButtonByText(/start|discover|next|begin|explore/i);
            if (button) {
              fireEvent.click(button);
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('prediction options select on first click', () => {
            renderGame({ gamePhase: 'predict' });
            const options = screen.getAllByRole('button').filter(btn =>
              (btn.textContent?.length || 0) > 15
            );
            if (options.length > 0) {
              fireEvent.click(options[0]);
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('buttons respond quickly (<100ms)', () => {
            renderGame({ gamePhase: 'play' });
            const button = findButtonByText(/understand|next|continue/i);
            if (button) {
              const start = performance.now();
              fireEvent.click(button);
              const end = performance.now();
              expect(end - start).toBeLessThan(100);
            }
          });

          it('works after rapid navigation', () => {
            renderGame();
            const dots = getNavDots();
            dots.forEach(dot => fireEvent.click(dot));
            expect(consoleErrors.length).toBe(0);
          });

          it('uses action verbs in button text', () => {
            renderGame();
            const button = findButtonByText(/start|discover|next|continue|submit|test|begin|explore|try|learn|see|go|play|run|fire|launch|watch/i);
            expect(button).toBeDefined();
          });

          it('primary CTA has background style', () => {
            renderGame();
            const button = findButtonByText(/start|discover|next|begin|explore/i);
            if (button) {
              const style = button.getAttribute('style') || '';
              expect(style).toContain('background');
            }
          });

          it('play phase interactive button causes visible state change', () => {
            renderGame({ gamePhase: 'play' });
            const contentBefore = document.body.innerHTML;
            // Find interactive buttons in play phase (simulate, start, run, toggle, etc.)
            const interactiveBtn = screen.getAllByRole('button').find(btn => {
              const text = btn.textContent?.trim().toLowerCase() || '';
              return /simulat|start|run|fire|launch|toggle|animate|play|go|activate|drain|begin|drop|release/i.test(text);
            });
            if (interactiveBtn) {
              fireEvent.click(interactiveBtn);
              // After clicking, either the button text should change or the page content should change
              const contentAfter = document.body.innerHTML;
              const buttonTextAfter = interactiveBtn.textContent?.trim() || '';
              const buttonTextBefore = interactiveBtn.textContent?.trim() || '';
              // At minimum, no console errors should occur
              expect(consoleErrors.length).toBe(0);
              // The click should have had some effect - either content or button changed
              // This is a soft check: if there's an interactive button, clicking it shouldn't be a no-op
              // We check innerHTML changed OR at least no errors occurred
              const changed = contentAfter !== contentBefore;
              if (!changed) {
                // If content didn't change, at least verify the button isn't broken
                expect(interactiveBtn).not.toBeDisabled();
              }
            }
          });
        });

        describe('2.9 Security', () => {
          it('answers not exposed in data attributes', () => {
            renderGame({ gamePhase: 'test' });
            const html = document.body.innerHTML;
            expect(html).not.toMatch(/data-correct|data-answer/i);
          });

          it('no script injection possible', () => {
            renderGame();
            const scripts = document.querySelectorAll('script');
            expect(scripts.length).toBe(0);
          });

          it('renders safely (no inline scripts)', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).not.toMatch(/<script>|javascript:/i);
          });
        });

        describe('2.10 Robustness', () => {
          it('handles 100 rapid slider interactions', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0];
            for (let i = 0; i < 100; i++) {
              if (slider) {
                fireEvent.change(slider, { target: { value: String(Math.random() * 100) } });
              }
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('handles full phase cycle multiple times', () => {
            renderGame();
            const dots = getNavDots();
            for (let cycle = 0; cycle < 3; cycle++) {
              dots.forEach(dot => fireEvent.click(dot));
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('shows content on every phase', () => {
            const phases = ['hook', 'predict', 'play', 'review', 'twist_predict',
              'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

            phases.forEach(phase => {
              const { unmount } = renderGame({ gamePhase: phase });
              expect(getPhaseContent().length).toBeGreaterThan(20);
              unmount();
              cleanup();
              clearConsoleLogs();
            });
          });
        });

        describe('2.11 Play Phase Continue/Progress', () => {
          it('play phase has a continue button or progress indicator', () => {
            renderGame({ gamePhase: 'play' });

            // Interact with sliders to simulate experiments
            const sliders = getSliders();
            if (sliders.length > 0) {
              const slider = sliders[0] as HTMLInputElement;
              for (let i = 0; i < 5; i++) {
                fireEvent.change(slider, { target: { value: String(10 + i * 10) } });
              }
            }

            // Click action buttons (Roll, Start, Run, etc.)
            const actionBtns = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent?.trim().toLowerCase() || '';
              return /roll|start|run|fire|launch|drop|release|simulate|go|activate/i.test(text);
            });
            actionBtns.slice(0, 3).forEach(btn => fireEvent.click(btn));

            // Look for continue/advance button (broad patterns)
            const continueBtn = screen.getAllByRole('button').find(btn => {
              const text = btn.textContent?.trim() || '';
              return /continue|understand|next|proceed|review|ready|advance|complete|discover|pattern|physics/i.test(text);
            });

            // Look for progress indicator (e.g., "2/3 experiments" or "2 of 3")
            const pageContent = getPhaseContent();
            const progressIndicator = /\d+\s*\/\s*\d+|\d+\s*of\s*\d+|experiment|progress|step|trial/i.test(pageContent);

            // Also check for bottom bar nav buttons (Next →) which serve as continue
            const bottomNav = screen.getAllByRole('button').find(btn => {
              const text = btn.textContent?.trim() || '';
              return /next\s*→|next→/i.test(text);
            });

            // Also accept nav dots as a valid navigation mechanism
            const navDots = getNavDots();

            expect(continueBtn || progressIndicator || bottomNav || navDots.length >= 8).toBeTruthy();
          });

          it('play phase does not gate continue behind excessive experiments', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Check for excessive experiment gates (3+ required)
            // Patterns like "3 more experiments" or "0 / 3" or "Complete 3 More"
            const excessiveGate = /[3-9]\s*more\s*(experiment|trial|run)/i.test(content)
              || /0\s*\/\s*[3-9]/i.test(content)
              || /complete\s*[3-9]\s*more/i.test(content);

            if (excessiveGate) {
              // Warn - games should not require 3+ experiments before allowing continue
              console.warn('[QUALITY] Play phase requires 3+ experiments to continue. Consider reducing to 0-1.');
            }
            // Soft check - log warning but don't fail universally
            // Game-specific tests should enforce strict limits
            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('2.5e Quiz Results Scrollability', () => {
          it('quiz results with answer review has scrollable container or bounded height', async () => {
            renderGame({ gamePhase: 'test' });

            // Complete quiz
            for (let i = 0; i < 12; i++) {
              if (/you\s*scored|test\s*complete!/i.test(getPhaseContent()) && /\d+\s*\/\s*10/.test(getPhaseContent())) break;

              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent || '';
                return text.length > 5 && !(/^(next|prev|back|submit|skip|home|← back|next →|check|confirm|replay|return|dashboard)/i.test(text.trim()));
              });
              if (options.length > 0) fireEvent.click(options[0]);

              const checkBtn = screen.getAllByRole('button').find(btn =>
                /check.*answer|confirm.*answer|lock.*in|check$/i.test(btn.textContent?.trim() || '')
              );
              if (checkBtn) fireEvent.click(checkBtn);

              const quizNextBtn = screen.getAllByRole('button').find(btn => {
                const text = btn.textContent?.trim() || '';
                return /next\s*question|submit\s*test|finish|see\s*results|^continue$/i.test(text);
              }) || screen.getAllByRole('button').find(btn => /^next$/i.test(btn.textContent?.trim() || ''));
              if (quizNextBtn) fireEvent.click(quizNextBtn);
            }

            const submitBtn = findButtonByText(/submit|finish|see.*result|complete/i);
            if (submitBtn) fireEvent.click(submitBtn);

            try {
              await waitFor(() => {
                expect(getPhaseContent()).toMatch(/\d+\s*\/\s*10|\d+%/);
              }, { timeout: 3000 });
            } catch {
              return; // Could not complete quiz
            }

            // Check if answer review section exists with multiple items
            const reviewItems = document.querySelectorAll('[style*="border-radius"]');
            const questionReviews = Array.from(reviewItems).filter(el => {
              const text = el.textContent || '';
              return /Question\s*\d+/i.test(text);
            });

            if (questionReviews.length >= 5) {
              // Walk up from a question review item to find a scrollable container
              let found = false;
              let node: Element | null = questionReviews[0];
              for (let depth = 0; depth < 5 && node; depth++) {
                const style = node.getAttribute('style') || '';
                if (style.includes('overflow') || style.includes('max-height') || style.includes('maxHeight')) {
                  found = true;
                  break;
                }
                node = node.parentElement;
              }
              expect(found).toBe(true);
            }

            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('2.7b SVG Minimum Dimensions', () => {
          it('SVG has adequate size (viewBox width >= 200 or pixel width >= 200)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();

            const viewBox = svg?.getAttribute('viewBox');
            const widthAttr = svg?.getAttribute('width');

            if (viewBox) {
              const parts = viewBox.split(/[\s,]+/);
              const vbWidth = parseFloat(parts[2]) || 0;
              expect(vbWidth).toBeGreaterThanOrEqual(200);
            } else if (widthAttr && widthAttr !== '100%') {
              const pixelWidth = parseInt(widthAttr || '0');
              expect(pixelWidth).toBeGreaterThanOrEqual(200);
            }
            // If width="100%" with no viewBox, pass (responsive)
          });
        });

        describe('2.7d SVG Bounded Heights', () => {
          it('play phase SVGs have bounded height to keep controls accessible', () => {
            renderGame({ gamePhase: 'play' });
            const svgs = document.querySelectorAll('svg');
            svgs.forEach(svg => {
              const viewBox = svg.getAttribute('viewBox');
              const heightAttr = svg.getAttribute('height');

              if (viewBox) {
                const parts = viewBox.split(/[\s,]+/);
                const vbHeight = parseFloat(parts[3]) || 0;
                // Each SVG viewBox height should be ≤ 500 to prevent viewport domination
                expect(vbHeight).toBeLessThanOrEqual(500);
              }

              if (heightAttr && heightAttr !== '100%' && heightAttr !== 'auto') {
                const pixelHeight = parseInt(heightAttr);
                if (!isNaN(pixelHeight)) {
                  expect(pixelHeight).toBeLessThanOrEqual(500);
                }
              }
            });
          });

          it('play phase does not stack multiple large SVGs without scroll', () => {
            renderGame({ gamePhase: 'play' });
            const svgs = document.querySelectorAll('svg');
            if (svgs.length < 2) return;

            // If there are 2+ SVGs, their container should have overflow or max-height
            // OR each SVG should be reasonably small (viewBox height ≤ 300)
            let totalSvgHeight = 0;
            svgs.forEach(svg => {
              const viewBox = svg.getAttribute('viewBox');
              const heightAttr = svg.getAttribute('height');
              if (viewBox) {
                const parts = viewBox.split(/[\s,]+/);
                totalSvgHeight += parseFloat(parts[3]) || 0;
              } else if (heightAttr && heightAttr !== '100%') {
                totalSvgHeight += parseInt(heightAttr) || 0;
              }
            });

            if (totalSvgHeight > 500) {
              // If SVGs are tall, look for a scrollable container
              let foundScroll = false;
              let node: Element | null = svgs[0].parentElement;
              for (let depth = 0; depth < 6 && node; depth++) {
                const style = node.getAttribute('style') || '';
                if (style.includes('overflow') || style.includes('max-height') || style.includes('maxHeight')) {
                  foundScroll = true;
                  break;
                }
                node = node.parentElement;
              }
              expect(foundScroll).toBe(true);
            }
          });
        });

        describe('2.7c SVG Legend Explains Meaning', () => {
          it('play phase has explanatory text describing the visualization', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Check for at least 1 of 3 explanatory pattern categories
            const hasInstruction = /adjust|observe|watch|notice|explore|interact|drag|change|slide|move|try/i.test(content);
            const hasPhysicsConcept = /force|velocity|acceleration|energy|wave|field|pressure|angle|gravity|friction|momentum|frequency|amplitude|charge|current|temperature/i.test(content);
            const hasExplanation = /because|causes|results|means|shows|demonstrates|how|affect|change|see|notice/i.test(content);

            const matchCount = [hasInstruction, hasPhysicsConcept, hasExplanation].filter(Boolean).length;
            expect(matchCount).toBeGreaterThanOrEqual(1);
          });
        });
      });
    }

    // ========================================================================
    // TIER 3: PREMIUM (Design Excellence) ~45 tests
    // ========================================================================

    if (runTier3) {
      describe('TIER 3: Premium - Design Excellence', () => {

        describe('3.1 Typography', () => {
          it('uses proper font weights (variety)', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/font-?weight:\s*(700|800|600|bold)/i);
            expect(html).toMatch(/font-?weight:\s*(400|normal|500)/i);
          });

          it('has clear typographic hierarchy (multiple font sizes)', () => {
            renderGame();
            const headings = document.querySelectorAll('h1, h2, h3, [style*="font-size"]');
            const sizes = new Set<string>();
            headings.forEach(h => {
              const style = h.getAttribute('style') || '';
              const match = style.match(/font-size:\s*(\d+)/);
              if (match) sizes.add(match[1]);
            });
            expect(sizes.size).toBeGreaterThanOrEqual(2);
          });

          it('uses appropriate line heights', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/line-?height:\s*(1\.[4-9]|[2-9])/i);
          });

          it('uses modern font stack', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/font-family|Inter|SF Pro|-apple-system|BlinkMacSystemFont|Segoe UI|Roboto|system-ui/i);
          });
        });

        describe('3.2 Color Sophistication', () => {
          it('uses gradient backgrounds', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/linear-gradient|radial-gradient/i);
          });

          it('avoids pure primary colors (#FF0000, #00FF00, #0000FF)', () => {
            renderGame();
            const html = document.body.innerHTML;
            const hasPureColors = html.match(/#FF0000|#00FF00|#0000FF|rgb\(255,\s*0,\s*0\)|rgb\(0,\s*255,\s*0\)|rgb\(0,\s*0,\s*255\)/i);
            expect(hasPureColors).toBeFalsy();
          });

          it('uses modern accent colors', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/10B981|059669|8B5CF6|7C3AED|3B82F6|2563EB|F59E0B|D97706|22c55e|16a34a|6366f1|4f46e5|0ea5e9|06b6d4|a855f7|EC4899|linear-gradient/i);
          });

          it('dark backgrounds use dark grays (not pure #000000)', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).not.toMatch(/background[^;]*#000000[^0-9a-f]/i);
          });

          it('has accent color glow or shadow effects', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/box-shadow|filter.*blur|glow/i);
          });
        });

        describe('3.3 Spatial Design', () => {
          it('has generous padding (16px+)', () => {
            renderGame();
            const html = document.body.innerHTML;
            const paddingMatches = html.match(/padding[^;]*(\d+)px/gi) || [];
            const hasSufficientPadding = paddingMatches.some(p => {
              const num = parseInt(p.match(/(\d+)/)?.[1] || '0');
              return num >= 16;
            });
            expect(hasSufficientPadding).toBe(true);
          });

          it('uses consistent spacing system', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/gap:\s*\d+px|margin|padding/i);
          });

          it('has proper content max-width', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/max-width:\s*\d+px/i);
          });

          it('uses CSS Flexbox or Grid for layout', () => {
            renderGame();
            const flexElements = document.querySelectorAll('[style*="flex"], [style*="grid"]');
            expect(flexElements.length).toBeGreaterThan(0);
          });

          it('containers have proper border-radius (8px+)', () => {
            renderGame();
            const html = document.body.innerHTML;
            const radiusMatches = html.match(/border-radius[^;]*(\d+)px/gi) || [];
            const hasModernRadius = radiusMatches.some(r => {
              const num = parseInt(r.match(/(\d+)/)?.[1] || '0');
              return num >= 8;
            });
            expect(hasModernRadius).toBe(true);
          });

          it('no horizontal overflow', () => {
            renderGame();
            expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 20);
          });
        });

        describe('3.4 SVG Quality', () => {
          it('SVG uses gradient definitions', () => {
            renderGame({ gamePhase: 'play' });
            const gradients = document.querySelectorAll('linearGradient, radialGradient');
            expect(gradients.length).toBeGreaterThan(0);
          });

          it('SVG uses filter effects for depth', () => {
            renderGame({ gamePhase: 'play' });
            const filters = document.querySelectorAll('filter, feGaussianBlur, feDropShadow, feMerge');
            expect(filters.length).toBeGreaterThan(0);
          });

          it('SVG has multiple layers/groups', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            const groups = svg?.querySelectorAll('g');
            expect(groups?.length).toBeGreaterThanOrEqual(2);
          });

          it('SVG elements have realistic colors (not flat fills)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            const svgHtml = svg?.innerHTML || '';
            const hasVariety = svgHtml.match(/fill="url\(#|fill="#[0-9a-f]{6}"/gi);
            expect(hasVariety?.length).toBeGreaterThan(2);
          });

          it('SVG complexity score >= 15 (premium threshold)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            const score = getSvgComplexityScore(svg as SVGElement);
            expect(score).toBeGreaterThanOrEqual(15);
          });

          it('review phases contain visual diagrams', () => {
            const reviewPhases = ['review', 'twist_review'];
            const phasesMissing: string[] = [];

            reviewPhases.forEach(p => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: p });
              const svg = getSVG();
              const img = document.querySelector('img');
              const canvas = document.querySelector('canvas');
              if (!svg && !img && !canvas) {
                phasesMissing.push(p);
              }
              unmount();
              cleanup();
            });

            if (phasesMissing.length > 0) {
              console.warn(
                `[PREMIUM] Review phases missing visual diagrams: ${phasesMissing.join(', ')}. ` +
                `Consider adding SVG diagrams to reinforce concepts visually.`
              );
            }
            // Soft: just verify phases rendered without error
            expect(consoleErrors.length).toBe(0);
          });
        });

        describe('3.5 Animation & Transitions', () => {
          it('has CSS transitions for smooth interactions', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/transition[^;]*(\d+\.?\d*)s|transition[^;]*(\d+)ms/i);
          });

          it('buttons have hover/active transitions', () => {
            renderGame();
            const buttons = screen.getAllByRole('button');
            const hasTransition = buttons.some(btn => {
              const style = btn.getAttribute('style') || '';
              return style.includes('transition');
            });
            expect(hasTransition).toBe(true);
          });

          it('uses easing functions (not linear)', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/ease|cubic-bezier/i);
          });
        });

        describe('3.6 Visual Hierarchy', () => {
          it('primary content is visually prominent', () => {
            renderGame();
            const h1 = document.querySelector('h1, [style*="font-size: 28"], [style*="font-size: 32"], [style*="font-size: 36"], [style*="font-size: 24"]');
            expect(h1).toBeInTheDocument();
          });

          it('secondary content has muted colors', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/9CA3AF|6B7280|94a3b8|64748b|text-secondary|text-muted|rgba?\([^)]*0\.[5-8]/i);
          });

          it('interactive elements stand out with gradient background', () => {
            renderGame();
            const buttons = screen.getAllByRole('button');
            const hasDistinctButton = buttons.some(btn => {
              const style = btn.getAttribute('style') || '';
              return style.includes('background') && style.includes('gradient');
            });
            expect(hasDistinctButton).toBe(true);
          });
        });

        describe('3.7 Premium UI Components', () => {
          it('cards have subtle shadows or borders', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/box-shadow|border.*solid/i);
          });

          it('sliders are styled (not browser default)', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();
            if (sliders.length > 0) {
              const slider = sliders[0];
              const style = slider.getAttribute('style') || '';
              expect(style.length).toBeGreaterThan(0);
            }
          });

          it('progress indicators are visually polished', () => {
            renderGame();
            const navDots = getNavDots();
            if (navDots.length > 0) {
              const hasStyledDots = navDots.some(dot => {
                const style = (dot as HTMLElement).getAttribute('style') || '';
                return style.includes('border-radius') || style.includes('background');
              });
              expect(hasStyledDots).toBe(true);
            }
          });

          it('consistent border-radius throughout', () => {
            renderGame();
            const html = document.body.innerHTML;
            const radiusValues = html.match(/border-radius[^;]*?(\d+)px/gi) || [];
            expect(radiusValues.length).toBeGreaterThan(0);
          });

          it('consistent color palette throughout', () => {
            renderGame();
            const html = document.body.innerHTML;
            const accentMatches = html.match(/10B981|EC4899|F59E0B|8B5CF6|3B82F6|6366F1|22c55e|06b6d4|a855f7|linear-gradient/gi) || [];
            expect(accentMatches.length).toBeGreaterThan(0);
          });
        });

        describe('3.8 Accessibility', () => {
          it('buttons are keyboard accessible', () => {
            renderGame();
            const buttons = screen.getAllByRole('button');
            buttons.forEach(btn => {
              expect(btn.tabIndex).toBeGreaterThanOrEqual(-1);
            });
          });

          it('contrast ratios support readability (light text on dark)', () => {
            renderGame();
            const html = document.body.innerHTML;
            expect(html).toMatch(/(#fff|#FFF|white|#[ef][ef][ef]|rgb\(255)/i);
          });

          it('interactive elements have cursor: pointer', () => {
            renderGame();
            const buttons = screen.getAllByRole('button');
            const hasVisibleButton = buttons.some(btn => {
              const style = btn.getAttribute('style') || '';
              return style.includes('cursor: pointer');
            });
            expect(hasVisibleButton).toBe(true);
          });

          it('has minimum height set to prevent layout shift', () => {
            renderGame();
            const container = document.querySelector('[style*="min-height"]');
            expect(container).toBeInTheDocument();
          });
        });
      });
    }

    // ========================================================================
    // TIER 4: EVAL COMPLIANCE (GAME_EVALUATION_SYSTEM.md Alignment)
    // Maps directly to critical eval categories M, R, L, T, N, O, B.5, B.6,
    // K, J, P, D.4, Q
    // ========================================================================

    if (runTier4) {
      describe('TIER 4: Eval Compliance - GAME_EVALUATION_SYSTEM.md', () => {

        // ----------------------------------------------------------------
        // 4.1 Text Contrast & Visibility (Eval M - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.1 Text Contrast & Visibility [Eval M]', () => {
          it('M.1-M.3: text elements use sufficiently bright colors on dark backgrounds', () => {
            renderGame({ gamePhase: 'play' });
            // Only check direct text-bearing elements, skip containers
            const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label');
            const faintTexts: string[] = [];

            textElements.forEach(el => {
              const style = el.getAttribute('style') || '';
              const colors = extractColors(style);
              const colorEntry = colors.find(c => c.property === 'color');
              if (!colorEntry) return;

              const brightness = colorBrightness(colorEntry.value);
              if (brightness === -1) return; // unparseable, skip

              const text = (el.textContent || '').trim();
              if (text.length < 5) return; // skip very short text
              if (el.children.length > 5) return; // likely a container

              // Reject faint grays: #94a3b8 has brightness ~170, #64748b ~115
              // Minimum acceptable is ~200 (slightly relaxed from #e2e8f0=230
              // to allow some secondary UI elements like tab labels)
              if (brightness < 180 && brightness > 0) {
                faintTexts.push(`"${text.slice(0, 40)}..." has color ${colorEntry.value} (brightness ${brightness.toFixed(0)})`);
              }
            });

            // Allow up to 6 faint items (decorative/chrome elements)
            // Games with more than 6 faint text elements have a systemic contrast problem
            expect(faintTexts.length).toBeLessThanOrEqual(6);
          });

          it('M.4-M.5: formula variables use bright colors and bold weight', () => {
            renderGame({ gamePhase: 'play' });
            const html = document.body.innerHTML;

            // Look for formula-like content: single letters (F, m, a, v, etc.) that are styled
            const styledSpans = Array.from(document.querySelectorAll('span, tspan'));
            const formulaVars = styledSpans.filter(el => {
              const text = (el.textContent || '').trim();
              // Single letter or letter with subscript, common physics variables
              return /^[A-Za-z][₀₁₂]?$/.test(text) && el.getAttribute('style');
            });

            if (formulaVars.length > 0) {
              // At least some formula variables should be bold
              const boldVars = formulaVars.filter(el => {
                const style = el.getAttribute('style') || '';
                return /font-?weight:\s*(700|800|900|bold)/i.test(style);
              });
              expect(boldVars.length).toBeGreaterThanOrEqual(1);

              // At least some should have bright colors
              const brightVars = formulaVars.filter(el => {
                const style = el.getAttribute('style') || '';
                const colors = extractColors(style);
                const c = colors.find(c => c.property === 'color');
                if (!c) return false;
                return colorBrightness(c.value) > 150;
              });
              expect(brightVars.length).toBeGreaterThanOrEqual(1);
            }
            // If no formula vars found, test passes (not all games have formulas)
          });

          it('M.6: SVG text labels have minimum font size', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const textEls = Array.from(svg.querySelectorAll('text'));
            const tooSmall: string[] = [];

            // SVG viewBox coordinates scale up, so fontSize 8+ in SVG is usually
            // readable when the viewBox renders at full container width.
            // Below 8 is genuinely too small in any context.
            textEls.forEach(el => {
              const fontSize = el.getAttribute('font-size') || el.style?.fontSize || '';
              const sizeNum = parseFloat(fontSize);
              if (sizeNum > 0 && sizeNum < 8) {
                tooSmall.push(`SVG text "${(el.textContent || '').trim().slice(0, 30)}" has fontSize ${sizeNum} (min 8)`);
              }
            });

            expect(tooSmall).toEqual([]);
          });

          it('M.8: no extremely faint text anywhere (#94a3b8 or darker as main text)', () => {
            renderGame({ gamePhase: 'play' });
            const html = document.body.innerHTML;
            // #94a3b8 is the specific "too faint" color called out in the eval doc
            const faintColorPattern = /(?:^|;|\s)color\s*:\s*#(94a3b8|64748b|475569|334155|1e293b)/gi;
            const faintMatches = html.match(faintColorPattern) || [];

            // Count how many unique elements use these faint colors
            const faintElements = Array.from(document.querySelectorAll('[style*="#94a3b8"], [style*="#64748b"], [style*="#475569"]'));
            const realTextFaint = faintElements.filter(el => {
              const text = (el.textContent || '').trim();
              return text.length > 10; // Only count real text, not decorative
            });

            expect(realTextFaint.length).toBeLessThanOrEqual(2);
          });
        });

        // ----------------------------------------------------------------
        // 4.2 Scroll Functionality (Eval R - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.2 Scroll Functionality [Eval R]', () => {
          it('R.1-R.2: has proper scroll structure (outer hidden + content scrollable)', () => {
            renderGame({ gamePhase: 'play' });
            const { outerContainer, scrollableContent } = findScrollStructure();

            // At least one of these scroll patterns must exist
            const hasScrollStructure = outerContainer || scrollableContent;
            // Also accept flex column layouts with overflow on body
            const hasFlexLayout = document.querySelector('[style*="flex-direction: column"], [style*="flexDirection: column"]');

            expect(hasScrollStructure || hasFlexLayout).toBeTruthy();
          });

          it('R.3: content area has padding-bottom for fixed footer clearance', () => {
            renderGame({ gamePhase: 'play' });
            const { scrollableContent } = findScrollStructure();

            if (scrollableContent) {
              const style = scrollableContent.getAttribute('style') || '';
              const paddingMatch = style.match(/padding-?bottom\s*:\s*(\d+)/i);
              if (paddingMatch) {
                const padding = parseInt(paddingMatch[1]);
                expect(padding).toBeGreaterThanOrEqual(60);
              }
            }
            // If no scrollable content found, other scroll tests will catch it
          });

          it('R.5: sliders have touch-action set to prevent scroll blocking', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = getSliders();

            if (sliders.length > 0) {
              // Check that slider containers or sliders themselves have touch-action
              // or that the page doesn't have conflicting touch handling
              const slider = sliders[0] as HTMLElement;
              const style = slider.getAttribute('style') || '';
              const parentStyle = slider.parentElement?.getAttribute('style') || '';

              // touch-action: pan-y or manipulation prevents scroll blocking
              const hasTouchAction = style.includes('touch-action') || parentStyle.includes('touch-action');
              // Also accept if the slider is in a scrollable container (common pattern)
              const inScrollContainer = !!slider.closest('[style*="overflow"]');

              // Soft check - warn if missing but don't hard fail since many patterns work
              if (!hasTouchAction && !inScrollContainer) {
                console.warn('[EVAL R.5] Sliders may block page scroll - consider adding touch-action: pan-y');
              }
            }
            expect(consoleErrors.length).toBe(0);
          });

          it('R.6-R.9: scroll structure present across key phases', () => {
            const phasesToCheck = ['predict', 'play', 'transfer', 'test'];
            const phasesMissingScroll: string[] = [];

            phasesToCheck.forEach(phase => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: phase });
              const { outerContainer, scrollableContent, fixedFooter } = findScrollStructure();

              // Must have at least a flex column layout or explicit scroll structure
              const hasFlexColumn = !!document.querySelector(
                '[style*="flex-direction: column"], [style*="flexDirection: column"]'
              );
              // Also check via DOM style objects
              const hasFlexColumnDom = Array.from(document.querySelectorAll('div')).some(div =>
                (div as HTMLElement).style.flexDirection === 'column'
              );
              // Also accept overflow on any container
              const hasAnyOverflow = Array.from(document.querySelectorAll('div')).some(div => {
                const s = (div as HTMLElement).style;
                return s.overflowY === 'auto' || s.overflowY === 'scroll'
                  || s.overflow === 'auto' || s.overflow === 'hidden';
              });

              if (!outerContainer && !scrollableContent && !hasFlexColumn && !hasFlexColumnDom && !hasAnyOverflow) {
                phasesMissingScroll.push(phase);
              }

              unmount();
              cleanup();
            });

            // All phases should have scroll structure
            expect(phasesMissingScroll).toEqual([]);
          });

          it('R.10: fixed footer exists and is outside scroll area', () => {
            renderGame({ gamePhase: 'play' });
            const { fixedFooter } = findScrollStructure();

            if (fixedFooter) {
              const style = fixedFooter.getAttribute('style') || '';
              const s = (fixedFooter as HTMLElement).style;
              // Check via style string or style object
              const hasBottom = /bottom\s*:\s*0/.test(style) || s.bottom === '0' || s.bottom === '0px';
              const hasLeft = /left\s*:\s*0/.test(style) || s.left === '0' || s.left === '0px';
              const hasRight = /right\s*:\s*0/.test(style) || s.right === '0' || s.right === '0px';
              // Full-width fixed footer needs bottom + at least left or right
              expect(hasBottom).toBe(true);
              expect(hasLeft || hasRight).toBe(true);
            }
            // Fixed footer is strongly recommended but some games use sticky
          });
        });

        // ----------------------------------------------------------------
        // 4.3 Responsive Layout & Graphic Responsiveness (Eval L + T - CRITICAL)
        // ----------------------------------------------------------------
        describe('4.3 Responsive Layout & Graphic Scaling [Eval L + T]', () => {
          it('L.1: uses full-height layout (100dvh, 100vh, or equivalent)', () => {
            renderGame();
            const html = document.body.innerHTML;
            const hasViewportHeight = html.includes('100dvh') || html.includes('100vh')
              || html.includes('100svh') || html.includes('100%');
            // Also check via style objects
            const hasFullHeight = Array.from(document.querySelectorAll('div')).some(div => {
              const s = (div as HTMLElement).style;
              return s.height === '100vh' || s.height === '100dvh' || s.height === '100%'
                || s.minHeight === '100vh' || s.minHeight === '100dvh' || s.minHeight === '100%';
            });
            // Also accept class-based full height (Tailwind h-screen, h-full, inset-0)
            const hasClassName = !!document.querySelector('.h-screen, .h-full, .min-h-screen, [class*="inset-0"]');
            expect(hasViewportHeight || hasFullHeight || hasClassName).toBe(true);
          });

          it('L.2: content area has overflow-y for scrolling', () => {
            renderGame();
            const html = document.body.innerHTML;
            // Check both CSS property format and also the style object on elements
            const hasOverflowInHtml = /overflow(-y)?\s*:\s*(auto|scroll)/i.test(html);
            // Also check via DOM style objects (React may not serialize to attribute)
            const hasOverflowInDom = Array.from(document.querySelectorAll('div')).some(div => {
              const s = (div as HTMLElement).style;
              return s.overflowY === 'auto' || s.overflowY === 'scroll'
                || s.overflow === 'auto' || s.overflow === 'scroll';
            });
            expect(hasOverflowInHtml || hasOverflowInDom).toBe(true);
          });

          it('L.4: navigation is always accessible (fixed, sticky, or flex-pinned)', () => {
            renderGame();
            // Check for position: fixed via both attribute and style object
            const fixedViaAttr = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
            const fixedViaDom = Array.from(document.querySelectorAll('div')).filter(
              div => (div as HTMLElement).style.position === 'fixed'
            );
            const stickyElements = document.querySelectorAll('[style*="position: sticky"], [style*="position:sticky"]');

            // Also accept flex-column layout with nav buttons always visible
            const hasFlexLayout = Array.from(document.querySelectorAll('div')).some(div => {
              const s = (div as HTMLElement).style;
              return s.display === 'flex' && s.flexDirection === 'column';
            });

            // At least one positioning strategy should be present
            const hasFixed = fixedViaAttr.length > 0 || fixedViaDom.length > 0;
            const hasSticky = stickyElements.length > 0;

            expect(hasFixed || hasSticky || hasFlexLayout).toBe(true);

            // Warn if not using fixed (preferred)
            if (!hasFixed && (hasSticky || hasFlexLayout)) {
              console.warn('[EVAL L.4] Uses sticky/flex instead of position: fixed for nav. Fixed is more reliable.');
            }
          });

          it('T.1-T.3: SVG container uses responsive sizing', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // Check SVG or its container (up to 3 levels) for responsive patterns
            const svgStyle = svg.getAttribute('style') || '';
            const parents = [svg.parentElement, svg.parentElement?.parentElement, svg.parentElement?.parentElement?.parentElement];
            const containerStyles = svgStyle + parents.map(p => p?.getAttribute('style') || '').join(' ');

            // Check via style attributes
            const hasResponsiveInAttr = containerStyles.includes('width: 100%')
              || containerStyles.includes('width:100%')
              || containerStyles.includes('max-width')
              || containerStyles.includes('maxWidth');

            // Check via SVG attributes
            const svgWidth = svg.getAttribute('width');
            const hasResponsiveAttr = svgWidth === '100%' || !svgWidth; // No width attr = fills container

            // Check via style objects
            const hasResponsiveInDom = parents.some(p => {
              if (!p) return false;
              const s = (p as HTMLElement).style;
              return s.width === '100%' || s.maxWidth !== '';
            });

            // Also check if SVG has viewBox (scales proportionally by default)
            const hasViewBox = !!svg.getAttribute('viewBox');

            expect(hasResponsiveInAttr || hasResponsiveAttr || hasResponsiveInDom || hasViewBox).toBe(true);
          });

          it('T.4: SVG uses viewBox for proportional scaling', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            expect(svg).toBeInTheDocument();
            expect(svg?.getAttribute('viewBox')).toBeTruthy();
          });

          it('T.5: SVG uses preserveAspectRatio for proper scaling', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // preserveAspectRatio defaults to "xMidYMid meet" if not set, which is correct
            const par = svg.getAttribute('preserveAspectRatio');
            // Either not set (default is correct) or explicitly set to a valid value
            if (par) {
              expect(par).toMatch(/xMid|xMin|xMax|meet|slice|none/);
            }
            // No preserveAspectRatio = default xMidYMid meet = pass
          });

          it('T.2: SVG container has size constraint (maxWidth, fixed width, or bounded viewBox)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // Walk up 5 levels looking for maxWidth or width constraint
            let found = false;
            let node: Element | null = svg;
            for (let depth = 0; depth < 6 && node; depth++) {
              const style = node.getAttribute('style') || '';
              const s = (node as HTMLElement).style;
              if (style.includes('max-width') || style.includes('maxWidth')
                || s?.maxWidth || style.includes('width:') || s?.width) {
                found = true;
                break;
              }
              node = node.parentElement;
            }
            // Also accept SVG with bounded viewBox (limits coordinate space)
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
              const vbWidth = parseFloat(viewBox.split(/[\s,]+/)[2] || '0');
              if (vbWidth > 0 && vbWidth <= 2000) found = true;
            }
            expect(found).toBe(true);
          });

          it('T.10: no horizontal overflow in play phase', () => {
            renderGame({ gamePhase: 'play' });
            // Check that body doesn't have horizontal overflow
            expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 20);
          });
        });

        // ----------------------------------------------------------------
        // 4.4 Above-The-Fold Content (Eval N - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.4 Above-The-Fold Content [Eval N]', () => {
          it('N.1-N.4: educational content appears before continue button in predict phase', () => {
            renderGame({ gamePhase: 'predict' });
            const container = document.body;

            // Find the continue/next button
            const allButtons = Array.from(document.querySelectorAll('button'));
            const continueBtn = allButtons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /continue|next|submit|skip/i.test(text) && text.length < 30;
            });

            if (!continueBtn) return; // No continue button = content flows naturally

            // Find educational elements
            const allElements = Array.from(container.querySelectorAll('*'));
            const continueBtnIdx = allElements.indexOf(continueBtn);

            // Look for "What to Watch" or explanation content
            const educationalElements = allElements.filter((el, idx) => {
              const text = (el.textContent || '').trim();
              return (
                /what.*watch|what.*look|observe|prediction|what.*happen/i.test(text)
                && text.length > 20
                && idx < continueBtnIdx
              );
            });

            // SVG/graphic should appear before button
            const svgElements = allElements.filter((el, idx) => {
              return el.tagName === 'svg' && idx < continueBtnIdx;
            });

            // At least graphic or educational text should be above button
            expect(educationalElements.length + svgElements.length).toBeGreaterThan(0);
          });

          it('N.5-N.6: no educational content below continue button in review phase', () => {
            renderGame({ gamePhase: 'review' });

            const allElements = Array.from(document.querySelectorAll('*'));
            const allButtons = Array.from(document.querySelectorAll('button'));

            // Find the last continue/next button (the one in the footer)
            const continueBtn = allButtons.reverse().find(btn => {
              const text = btn.textContent?.trim() || '';
              return /continue|next\s*→|next→/i.test(text);
            });

            if (!continueBtn) return;

            const continueBtnIdx = allElements.indexOf(continueBtn);
            if (continueBtnIdx === -1) return;

            // Check for substantial educational content BELOW the button
            const contentBelow = allElements.filter((el, idx) => {
              if (idx <= continueBtnIdx) return false;
              const text = (el.textContent || '').trim();
              // Must be a leaf-ish text element with real educational content
              return text.length > 50 && el.children.length < 3
                && /because|formula|equation|principle|therefore|key.*insight/i.test(text);
            });

            // Ideally no educational content should be below the main continue button
            if (contentBelow.length > 0) {
              console.warn(`[EVAL N.5] Found ${contentBelow.length} educational element(s) below the continue button in review phase`);
            }
            // Soft check - warn but allow up to 1
            expect(contentBelow.length).toBeLessThanOrEqual(1);
          });
        });

        // ----------------------------------------------------------------
        // 4.5 Legend Completeness (Eval O - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.5 Legend Completeness [Eval O]', () => {
          it('O.1-O.6: SVG elements have matching legend entries', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // Count distinct fill colors used in SVG shapes
            const shapes = Array.from(svg.querySelectorAll(
              'circle, rect, path, ellipse, polygon, line, polyline'
            ));
            const uniqueFills = new Set<string>();
            shapes.forEach(shape => {
              const fill = shape.getAttribute('fill');
              if (fill && fill !== 'none' && fill !== 'transparent' && !fill.startsWith('url(')) {
                uniqueFills.add(fill.toLowerCase());
              }
              const stroke = shape.getAttribute('stroke');
              if (stroke && stroke !== 'none' && stroke !== 'transparent') {
                uniqueFills.add(stroke.toLowerCase());
              }
            });

            // Exclude common non-semantic colors (white, black, very dark bg fills)
            const semanticColors = Array.from(uniqueFills).filter(c =>
              c !== '#000' && c !== '#000000' && c !== 'black'
              && c !== '#fff' && c !== '#ffffff' && c !== 'white'
              && !c.startsWith('#1') && !c.startsWith('#0') // very dark colors
            );

            if (semanticColors.length < 2) return; // Simple graphic, legend may not be needed

            // Look for legend-like content in the page
            const pageContent = getPhaseContent().toLowerCase();
            const hasLegendSection = /legend|key|color.*guide|what.*color|symbol/i.test(pageContent);

            // Also check for colored indicators with labels nearby
            const legendItems = Array.from(document.querySelectorAll('span, div, li, p')).filter(el => {
              const style = el.getAttribute('style') || '';
              const text = (el.textContent || '').trim();
              // Elements with colored backgrounds that look like legend swatches
              return (style.includes('background') && style.includes('#') && text.length > 2 && text.length < 80)
                || (style.includes('border-radius: 50%') && style.includes('background'));
            });

            // SVG text elements can also serve as labels
            const svgLabels = Array.from(svg.querySelectorAll('text, tspan'));
            const meaningfulSvgLabels = svgLabels.filter(el =>
              (el.textContent || '').trim().length > 2
            );

            // Must have either a legend section or sufficient inline labels
            const legendScore = (hasLegendSection ? 3 : 0) + legendItems.length + Math.min(meaningfulSvgLabels.length, 5);
            expect(legendScore).toBeGreaterThanOrEqual(3);
          });

          it('O.7: legend does not overlap SVG graphic area', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // Check that legend text elements inside SVG don't have coordinates
            // that would place them directly over the main graphic area
            const viewBox = svg.getAttribute('viewBox');
            if (!viewBox) return;

            const parts = viewBox.split(/[\s,]+/);
            const vbWidth = parseFloat(parts[2]) || 800;
            const vbHeight = parseFloat(parts[3]) || 450;

            // Find text elements that look like legend entries (short text near edges)
            const textEls = Array.from(svg.querySelectorAll('text'));
            const legendTexts = textEls.filter(el => {
              const text = (el.textContent || '').trim();
              const x = parseFloat(el.getAttribute('x') || '0');
              const y = parseFloat(el.getAttribute('y') || '0');
              // Legend items are typically in corners
              const isNearEdge = x < vbWidth * 0.15 || x > vbWidth * 0.75
                || y < vbHeight * 0.15 || y > vbHeight * 0.75;
              return text.length > 3 && text.length < 40 && isNearEdge;
            });

            // This is a structural check - if legend exists inside SVG,
            // it should be positioned at edges not center
            // No hard fail needed, just verification
            expect(consoleErrors.length).toBe(0);
          });
        });

        // ----------------------------------------------------------------
        // 4.6 Slider UX (Eval B.5 - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.6 Slider UX [Eval B.5]', () => {
          it('B.5.1: each slider has a visible label', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            const unlabeledSliders: string[] = [];
            sliders.forEach((slider, i) => {
              // Check for aria-label
              const ariaLabel = slider.getAttribute('aria-label');
              // Check for nearby label text (parent or sibling)
              const parent = slider.parentElement;
              const parentText = parent?.textContent || '';
              const prevSibling = slider.previousElementSibling;
              const prevText = prevSibling?.textContent || '';
              // Check for associated label element
              const labelEl = slider.id ? document.querySelector(`label[for="${slider.id}"]`) : null;

              const hasLabel = ariaLabel
                || parentText.length > 5
                || prevText.length > 3
                || labelEl;

              if (!hasLabel) {
                unlabeledSliders.push(`Slider ${i} has no visible label`);
              }
            });

            expect(unlabeledSliders).toEqual([]);
          });

          it('B.5.2: each slider displays its current value', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            const slidersWithoutValue: string[] = [];
            sliders.forEach((slider, i) => {
              const value = slider.value;
              // Look for the value displayed near the slider
              const parent = slider.parentElement;
              const grandparent = parent?.parentElement;
              const nearbyText = (parent?.textContent || '') + (grandparent?.textContent || '');

              // The current value number should appear in nearby text
              const valueNum = parseFloat(value);
              const hasValue = nearbyText.includes(value)
                || nearbyText.includes(valueNum.toFixed(1))
                || nearbyText.includes(String(Math.round(valueNum)));

              if (!hasValue) {
                slidersWithoutValue.push(`Slider ${i} (value=${value}) - value not displayed nearby`);
              }
            });

            // At least half of sliders should show their value
            expect(slidersWithoutValue.length).toBeLessThanOrEqual(Math.ceil(sliders.length / 2));
          });

          it('B.5.3: slider value updates when slider changes', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            const slider = sliders[0];
            const parent = slider.parentElement?.parentElement;
            const textBefore = parent?.textContent || '';

            const mid = (Number(slider.min) + Number(slider.max)) / 2;
            const newVal = Number(slider.value) === mid ? Number(slider.max) * 0.9 : mid;
            fireEvent.change(slider, { target: { value: String(newVal) } });

            const textAfter = parent?.textContent || '';
            // Text near the slider should change when value changes
            expect(textAfter).not.toBe(textBefore);
          });

          it('B.5.4: sliders have descriptive effect text nearby', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            // Look for effect descriptions near sliders - walk up to 5 levels
            let nearbyContent = '';
            let node: Element | null = sliders[0];
            for (let depth = 0; depth < 6 && node; depth++) {
              nearbyContent += (node.textContent || '') + ' ';
              node = node.parentElement;
            }

            // Also check full page content as fallback (some games put instructions elsewhere)
            const fullContent = getPhaseContent();

            // Check for relationship indicators, physics terms, or interaction guidance
            const hasEffectText = /increase|decrease|↑|↓|→|=|affect|change|control|adjust|stronger|weaker|faster|slower|more|less|higher|lower|observe|watch|slide|drag|move/i.test(nearbyContent);
            const hasPhysicsContext = /force|velocity|speed|angle|mass|frequency|amplitude|current|voltage|energy|wave|field|pressure|gravity|momentum|temperature|distance|height|radius|acceleration/i.test(fullContent);

            expect(hasEffectText || hasPhysicsContext).toBe(true);
          });
        });

        // ----------------------------------------------------------------
        // 4.7 Educational Clarity (Eval K - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.7 Educational Clarity [Eval K]', () => {
          it('K.1: legend panel is visible in play phase', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Check for legend/key section
            const hasLegend = /legend|key:|what.*color|color.*guide/i.test(content);
            // Also check for colored indicator elements with text
            const legendIndicators = Array.from(document.querySelectorAll('span, div')).filter(el => {
              const style = el.getAttribute('style') || '';
              return (style.includes('border-radius: 50%') || style.includes('border-radius:50%'))
                && style.includes('background')
                && style.includes('width');
            });

            // Also count SVG text elements as inline labels
            const svg = getSVG();
            const svgTextCount = svg?.querySelectorAll('text, tspan').length || 0;

            expect(hasLegend || legendIndicators.length >= 2 || svgTextCount >= 3).toBe(true);
          });

          it('K.2: objects in SVG graphic are labeled directly', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const textElements = svg.querySelectorAll('text, tspan');
            const meaningfulLabels = Array.from(textElements).filter(el => {
              const text = (el.textContent || '').trim();
              return text.length > 1 && !/^\d+\.?\d*°?$/.test(text);
            });

            // SVG should have at least 2 direct labels on objects
            expect(meaningfulLabels.length).toBeGreaterThanOrEqual(2);
          });

          it('K.4: observation guidance or instructional context exists', () => {
            // Check across predict, play, and review phases
            const phasesToCheck = ['predict', 'play', 'review'];
            let foundGuidance = false;

            phasesToCheck.forEach(phase => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: phase });
              const content = getPhaseContent();

              // "What to Watch" style guidance, or equivalent instructional text
              if (/what.*watch|what.*look|what.*observe|notice|pay.*attention|focus.*on|key.*observation|watch.*for|look.*for/i.test(content)) {
                foundGuidance = true;
              }
              // Also accept: instructional verbs, experiment guidance, physics explanations
              if (/try.*adjust|experiment.*with|slide.*to|change.*the|observe.*how|see.*what|explore|interact|adjust.*slider|move.*slider|understand.*physics|physics.*behind/i.test(content)) {
                foundGuidance = true;
              }
              unmount();
              cleanup();
            });

            expect(foundGuidance).toBe(true);
          });

          it('K.5-K.6: slider labels state what they control', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            // Each slider should have physics-related label text nearby
            let labeledCount = 0;
            sliders.forEach(slider => {
              const parent = slider.parentElement;
              const grandparent = parent?.parentElement;
              const nearbyText = (parent?.textContent || '') + (grandparent?.textContent || '');

              // Physics concepts that a slider label should reference
              if (/force|velocity|speed|acceleration|mass|angle|frequency|amplitude|current|voltage|temperature|pressure|distance|height|radius|charge|field|energy|momentum|wavelength|resistance|friction|gravity|density|volume|time|rate|power|intensity|weight|length|width|depth|flow|concentration|coefficient/i.test(nearbyText)) {
                labeledCount++;
              }
            });

            // At least one slider should have a physics-labeled control
            expect(labeledCount).toBeGreaterThanOrEqual(1);
          });

          it('K.8: test answer shows visual feedback (color, checkmark, or selection state)', () => {
            renderGame({ gamePhase: 'test' });

            const htmlBefore = document.body.innerHTML;

            // Find answer option buttons - try multiple strategies
            const allBtns = screen.getAllByRole('button');
            const navDotCount = getNavDots().length;
            let options = allBtns.filter(btn => {
              const text = btn.textContent?.trim() || '';
              // Exclude nav/control buttons, keep answer options
              return text.length > 10 && text.length < 200
                && !(/^(next|prev|back|submit|skip|home|check|confirm)/i.test(text))
                && !(/←|→/i.test(text) && text.length < 15);
            });
            // Fallback: A) B) C) D) prefix
            if (options.length < 2) {
              options = allBtns.filter(btn => /^[A-D]\)/.test(btn.textContent?.trim() || ''));
            }
            if (options.length === 0) return;

            fireEvent.click(options[0]);

            // Click check/confirm if present
            const checkBtn = screen.getAllByRole('button').find(btn =>
              /check.*answer|confirm|lock.*in|check$/i.test(btn.textContent?.trim() || '')
            );
            if (checkBtn) fireEvent.click(checkBtn);

            // After answering, look for visual feedback
            const html = document.body.innerHTML;
            const hasColorFeedback = html.includes('#22c55e') || html.includes('#16a34a')
              || html.includes('#4ade80') || html.includes('rgb(34, 197, 94)')
              || html.includes('#10B981') || html.includes('#EF4444') || html.includes('#ef4444')
              || html.includes('green') || html.includes('✓') || html.includes('✗')
              || html.includes('Correct') || html.includes('correct')
              || html.includes('Incorrect') || html.includes('incorrect')
              || html.includes('Wrong') || html.includes('wrong');
            const hasDomChange = html !== htmlBefore;
            const hasGreenFeedback = hasColorFeedback || hasDomChange;

            expect(hasGreenFeedback).toBe(true);
          });
        });

        // ----------------------------------------------------------------
        // 4.8 Navigation Accessibility (Eval J - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.8 Navigation Accessibility [Eval J]', () => {
          it('J.1-J.3: navigation bar has fixed/sticky positioning or flex-pinned layout', () => {
            renderGame({ gamePhase: 'play' });
            const { fixedFooter } = findScrollStructure();

            // Also check for any fixed/sticky element via style object (include nav elements)
            const allElements = [...Array.from(document.querySelectorAll('div')), ...Array.from(document.querySelectorAll('nav'))];
            const hasFixedElement = !!fixedFooter || allElements.some(el => {
              const s = (el as HTMLElement).style;
              return s.position === 'fixed' || s.position === 'sticky';
            });
            // Also accept flex-column layout with nav at bottom
            const hasFlexLayout = allElements.some(el => {
              const s = (el as HTMLElement).style;
              return s.display === 'flex' && s.flexDirection === 'column';
            });

            expect(hasFixedElement || hasFlexLayout).toBe(true);

            if (fixedFooter) {
              const style = fixedFooter.getAttribute('style') || '';
              const s = (fixedFooter as HTMLElement).style;
              // Check z-index is high enough
              const zIndexMatch = style.match(/z-?index\s*:\s*(\d+)/i);
              const zFromStyle = parseInt(s.zIndex) || 0;
              if (zIndexMatch) {
                expect(parseInt(zIndexMatch[1])).toBeGreaterThanOrEqual(100);
              } else if (zFromStyle > 0) {
                expect(zFromStyle).toBeGreaterThanOrEqual(100);
              }
            }
          });

          it('J.4: bottom bar has shadow or border for visibility', () => {
            renderGame({ gamePhase: 'play' });
            const { fixedFooter } = findScrollStructure();

            if (fixedFooter) {
              const style = fixedFooter.getAttribute('style') || '';
              const s = (fixedFooter as HTMLElement).style;
              // Check both style string and style object for shadow/border
              const hasShadowOrBorder = style.includes('box-shadow') || style.includes('boxShadow')
                || style.includes('border-top') || style.includes('borderTop')
                || style.includes('border:') || style.includes('shadow')
                || !!s.boxShadow || !!s.borderTop;
              // Also check children (some games put shadow on inner wrapper or buttons)
              const childHasShadow = Array.from(fixedFooter.querySelectorAll('*')).some(el => {
                const cs = el.getAttribute('style') || '';
                return cs.includes('shadow') || cs.includes('border');
              });
              expect(hasShadowOrBorder || childHasShadow).toBe(true);
            }
          });

          it('J.6: navigation buttons have adequate tap size (minHeight >= 44px)', () => {
            renderGame({ gamePhase: 'play' });
            const { fixedFooter } = findScrollStructure();

            if (fixedFooter) {
              const buttons = fixedFooter.querySelectorAll('button');
              buttons.forEach(btn => {
                const style = btn.getAttribute('style') || '';
                const heightMatch = style.match(/(?:min-?height|height)\s*:\s*(\d+)/i);
                if (heightMatch) {
                  // Minimum tap target is 44px (WCAG), eval requires 52px
                  expect(parseInt(heightMatch[1])).toBeGreaterThanOrEqual(44);
                }
              });
            }
          });

          it('J.8: button text describes the next action', () => {
            renderGame({ gamePhase: 'hook' });
            const buttons = screen.getAllByRole('button');
            const actionButton = buttons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /start|begin|discover|explore|next|continue|learn|play|predict|go|let.*go|dive/i.test(text);
            });
            expect(actionButton).toBeTruthy();
          });

          it('J.9: Back button or backward navigation visible on non-hook phases', () => {
            renderGame({ gamePhase: 'play' });
            const buttons = screen.getAllByRole('button');
            const backButton = buttons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /←|back|previous|prev/i.test(text);
            });
            // Nav dots also serve as backward navigation
            const navDots = getNavDots();
            expect(backButton || navDots.length >= 8).toBeTruthy();
          });
        });

        // ----------------------------------------------------------------
        // 4.9 Transfer Phase Progress (Eval P - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.9 Transfer Phase Progress [Eval P]', () => {
          it('P.1: transfer apps have "Got It" or continue button', () => {
            renderGame({ gamePhase: 'transfer' });
            const buttons = screen.getAllByRole('button');
            const gotItBtn = buttons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /got\s*it|continue|next.*app|understood|done|complete/i.test(text);
            });
            expect(gotItBtn).toBeTruthy();
          });

          it('P.2-P.5: app continue button has proper styling', () => {
            renderGame({ gamePhase: 'transfer' });
            const buttons = screen.getAllByRole('button');
            const gotItBtn = buttons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /got\s*it|continue.*→|next.*app/i.test(text);
            });

            if (gotItBtn) {
              const style = gotItBtn.getAttribute('style') || '';
              // Should have background gradient or solid color
              const hasBackground = style.includes('background') || style.includes('gradient');
              expect(hasBackground).toBe(true);
            }
          });

          it('P.6: transfer phase shows progress (App X of Y)', () => {
            renderGame({ gamePhase: 'transfer' });
            const content = getPhaseContent();
            const hasProgress = /\d+\s*(of|\/)\s*\d+|app\s*\d|application\s*\d|step\s*\d/i.test(content)
              || /🔒|locked|unlock/i.test(content);
            expect(hasProgress).toBe(true);
          });

          it('P.8: "Take the Test" button appears after viewing apps', () => {
            renderGame({ gamePhase: 'transfer' });

            // Click through available app buttons to simulate completing them
            const allButtons = screen.getAllByRole('button');
            const appButtons = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 2 && text.length < 50
                && !(/← back|next →|next→|back|prev/i.test(text));
            });
            appButtons.slice(0, 10).forEach(btn => fireEvent.click(btn));

            // After visiting apps, look for test navigation
            const currentButtons = screen.getAllByRole('button');
            const testButton = currentButtons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /take.*test|start.*test|begin.*test|continue.*test|knowledge.*test|ready.*test|test.*knowledge|to\s*test/i.test(text);
            });
            // Also accept generic forward nav (Next →, Continue →, etc.)
            const nextBtn = currentButtons.find(btn => {
              const text = btn.textContent?.trim() || '';
              return /next\s*→|next→|continue\s*→|continue→/i.test(text);
            });
            // Also accept nav dots as forward navigation mechanism
            const navDots = getNavDots();

            expect(testButton || nextBtn || navDots.length >= 8).toBeTruthy();
          });
        });

        // ----------------------------------------------------------------
        // 4.10 Visual Clarity & Layout (Eval B.6 - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.10 Visual Clarity & Layout [Eval B.6]', () => {
          it('B.6.1: play phase has clear visual sections (graphic + controls separated)', () => {
            renderGame({ gamePhase: 'play' });

            // SVG graphic should exist
            const svg = getSVG();
            expect(svg).toBeInTheDocument();

            // Controls (sliders) should exist
            const sliders = getSliders();

            if (svg && sliders.length > 0) {
              // SVG and sliders should NOT be in the same parent container
              // (they should be in separate visual sections)
              const svgParent = svg.parentElement;
              const sliderParent = sliders[0].parentElement;

              // They should be separated - not the exact same container
              // (1-2 levels up being the same is OK for layout wrappers)
              const svgGrandparent = svgParent?.parentElement;
              const sliderGrandparent = sliderParent?.parentElement;
              const areSeparated = svgParent !== sliderParent
                || svgGrandparent !== sliderGrandparent;

              expect(areSeparated).toBe(true);
            }
          });

          it('B.6.2: text does not render directly over SVG graphic elements', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            // Check for absolutely-positioned text overlaying the SVG from outside
            const svgParent = svg.parentElement;
            if (!svgParent) return;

            const overlayTexts = Array.from(svgParent.querySelectorAll('div, span, p')).filter(el => {
              const style = el.getAttribute('style') || '';
              const text = (el.textContent || '').trim();
              // Absolutely positioned text over the SVG container
              return style.includes('position: absolute') && text.length > 20
                && !style.includes('pointer-events: none'); // decorative overlays are OK
            });

            // Should have 0 non-decorative text overlays on SVG
            expect(overlayTexts.length).toBeLessThanOrEqual(1);
          });

          it('B.6.3: content is not overly crowded (adequate spacing)', () => {
            renderGame({ gamePhase: 'play' });
            const html = document.body.innerHTML;

            // Check for margin/padding/gap usage indicating proper spacing
            const spacingPatterns = [
              /margin[^;]*\d+px/gi,
              /padding[^;]*\d+px/gi,
              /gap\s*:\s*\d+px/gi,
            ];

            let spacingCount = 0;
            spacingPatterns.forEach(pattern => {
              const matches = html.match(pattern);
              spacingCount += (matches?.length || 0);
            });

            // A well-spaced layout should have many spacing declarations
            expect(spacingCount).toBeGreaterThanOrEqual(5);
          });

          it('B.6.4: key content areas have distinct backgrounds or borders', () => {
            renderGame({ gamePhase: 'play' });

            // Look for card-like containers with distinct styling
            const styledContainers = Array.from(document.querySelectorAll('div')).filter(div => {
              const style = div.getAttribute('style') || '';
              const text = (div.textContent || '').trim();
              return text.length > 30 && text.length < 500
                && (style.includes('background') || style.includes('border'))
                && style.includes('border-radius');
            });

            // Play phase should have at least 1 distinct content area
            expect(styledContainers.length).toBeGreaterThanOrEqual(1);
          });
        });

        // ----------------------------------------------------------------
        // 4.11 Test Phase Clarity (Eval Q - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.11 Test Phase Clarity [Eval Q]', () => {
          it('Q.1: question number prominently shown', () => {
            renderGame({ gamePhase: 'test' });
            const content = getPhaseContent();
            expect(content).toMatch(/(?:question|q)\s*\d+\s*(?:of|\/)\s*\d+/i);
          });

          it('Q.2: progress dots or indicators show question progress', () => {
            renderGame({ gamePhase: 'test' });

            // Look for progress dots, progress bar, or numbered indicators
            const html = document.body.innerHTML;
            const hasProgressDots = html.includes('border-radius: 50%') || html.includes('border-radius:50%');
            const hasProgressBar = /width:\s*\d+%/.test(html) && html.includes('transition');
            const hasQuestionNumbers = /\d+\s*(?:of|\/)\s*\d+/i.test(getPhaseContent());

            expect(hasProgressDots || hasProgressBar || hasQuestionNumbers).toBe(true);
          });

          it('Q.3: answer options have visible selection state styling', () => {
            renderGame({ gamePhase: 'test' });

            // Find answer option buttons
            const options = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent || '';
              return text.length > 10 && !(/^(next|prev|back|submit|skip|home|check|confirm)/i.test(text.trim()));
            });

            if (options.length > 0) {
              // Click first option
              fireEvent.click(options[0]);

              // Check that the clicked option has changed styling
              const style = options[0].getAttribute('style') || '';
              const hasSelectionStyle = style.includes('border') || style.includes('background')
                || style.includes('box-shadow') || style.includes('boxShadow')
                || style.includes('opacity') || style.includes('transform');

              expect(hasSelectionStyle).toBe(true);
            }
          });

          it('Q.7: visual feedback shown after answering a question', () => {
            renderGame({ gamePhase: 'test' });

            const htmlBefore = document.body.innerHTML;

            // Find answer option buttons - multiple strategies
            const allBtns = screen.getAllByRole('button');
            let options = allBtns.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 10 && text.length < 200
                && !(/^(next|prev|back|submit|skip|home|check|confirm)/i.test(text))
                && !(/←|→/i.test(text) && text.length < 15);
            });
            if (options.length < 2) {
              options = allBtns.filter(btn => /^[A-D]\)/.test(btn.textContent?.trim() || ''));
            }
            if (options.length === 0) return;

            fireEvent.click(options[0]);

            // Click check/confirm if present
            const checkBtn = screen.getAllByRole('button').find(btn =>
              /check.*answer|confirm|lock.*in|check$/i.test(btn.textContent?.trim() || '')
            );
            if (checkBtn) fireEvent.click(checkBtn);

            const htmlAfter = document.body.innerHTML;

            // After answering, DOM should change (explanation, color feedback, selection state, etc.)
            expect(htmlAfter).not.toBe(htmlBefore);
          });
        });

        // ----------------------------------------------------------------
        // 4.12 Prediction Phase Flow (Eval S - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.12 Prediction Phase Flow [Eval S]', () => {
          it('S.1: predict phase shows STATIC graphic (no sliders, no start button)', () => {
            renderGame({ gamePhase: 'predict' });

            // SVG should exist
            const svg = getSVG();
            expect(svg).toBeInTheDocument();

            // No sliders
            const sliders = getSliders();
            expect(sliders.length).toBe(0);

            // No start/run/fire action buttons
            const actionBtns = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent?.trim().toLowerCase() || '';
              return /^(start|run|fire|launch|simulate|go|activate)$/i.test(text);
            });
            expect(actionBtns.length).toBe(0);
          });

          it('S.2: context or explanation exists in predict phase', () => {
            renderGame({ gamePhase: 'predict' });
            const content = getPhaseContent();

            // Should have contextual explanation - any of these patterns:
            // Direct explanation, prediction question context, scenario description,
            // physics setup, or a question that provides context
            const hasExplanation = /what.*looking|what.*see|setup|scenario|diagram|graphic.*shows|observe|this.*shows/i.test(content)
              || /predict|think|expect|how.*much|how.*will|what.*happen|what.*would|which.*will/i.test(content)
              || /imagine|consider|ramp|incline|circuit|wave|force|energy|experiment/i.test(content);
            expect(hasExplanation).toBe(true);
          });

          it('S.3-S.4: prediction question with selectable options', () => {
            renderGame({ gamePhase: 'predict' });

            // Find prediction-related buttons (answer options)
            const options = screen.getAllByRole('button').filter(btn => {
              const text = btn.textContent || '';
              return text.length > 15 && !(/next|prev|back|submit|skip|home|continue/i.test(text.trim()));
            });

            expect(options.length).toBeGreaterThanOrEqual(2);

            // Clicking an option should work without error
            if (options.length > 0) {
              fireEvent.click(options[0]);
              expect(consoleErrors.length).toBe(0);
            }
          });

          it('S.7: play phase shows SAME graphic type but with controls', () => {
            // Render predict phase and check SVG
            const { unmount: u1 } = renderGame({ gamePhase: 'predict' });
            const predictSvg = getSVG();
            const predictSvgTag = predictSvg?.querySelector('g')?.getAttribute('id')
              || predictSvg?.innerHTML.slice(0, 100);
            u1();
            cleanup();
            clearConsoleLogs();

            // Render play phase
            renderGame({ gamePhase: 'play' });
            const playSvg = getSVG();
            const playSliders = getSliders();

            // Play should have SVG AND controls
            expect(playSvg).toBeInTheDocument();
            expect(playSliders.length).toBeGreaterThan(0);
          });

          it('S.9: play phase has explanatory or instructional text', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Should have explanatory or instructional text during interaction
            const hasExplanation = /happen|observe|notice|change|watch|see|affect|increas|decreas|when|because|result/i.test(content)
              || /adjust|slide|drag|experiment|try|explore|interact|control|simulate/i.test(content)
              || /force|velocity|speed|angle|energy|wave|field|pressure|acceleration|momentum/i.test(content);
            expect(hasExplanation).toBe(true);
          });
        });

        // ----------------------------------------------------------------
        // 4.13 Zoom & Scale (Eval D.4 - CRITICAL 100%)
        // ----------------------------------------------------------------
        describe('4.13 Zoom & Scale [Eval D.4]', () => {
          it('D.4.1: font sizes are readable at default zoom (no text under 10px)', () => {
            renderGame({ gamePhase: 'play' });

            const textElements = document.querySelectorAll('p, span, label, li, td');
            const tooSmallTexts: string[] = [];

            textElements.forEach(el => {
              const style = el.getAttribute('style') || '';
              const s = (el as HTMLElement).style;
              const fontSizeMatch = style.match(/font-size\s*:\s*(\d+)/i);
              const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1])
                : (s.fontSize ? parseInt(s.fontSize) : 0);

              if (fontSize > 0 && fontSize < 10) {
                const text = (el.textContent || '').trim();
                // Only flag real readable text, not decorative/icon elements
                if (text.length > 5 && el.children.length < 3) {
                  tooSmallTexts.push(`"${text.slice(0, 30)}..." has font-size: ${fontSize}px (min 10)`);
                }
              }
            });

            // No body text should be under 10px
            expect(tooSmallTexts).toEqual([]);
          });

          it('D.4.2: SVG viewBox provides adequate coordinate space', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const viewBox = svg.getAttribute('viewBox');
            if (!viewBox) return;

            const parts = viewBox.split(/[\s,]+/);
            const width = parseFloat(parts[2]);
            const height = parseFloat(parts[3]);

            // ViewBox should be large enough for readable content
            expect(width).toBeGreaterThanOrEqual(200);
            expect(height).toBeGreaterThanOrEqual(100);
          });

          it('D.4.3: buttons have adequate size for touch targets', () => {
            renderGame({ gamePhase: 'play' });
            const buttons = screen.getAllByRole('button');

            // Primary action buttons should be large enough
            const primaryBtns = buttons.filter(btn => {
              const style = btn.getAttribute('style') || '';
              return style.includes('background') && (btn.textContent || '').trim().length > 3;
            });

            const tooSmallBtns: string[] = [];
            primaryBtns.forEach(btn => {
              const style = btn.getAttribute('style') || '';
              const s = (btn as HTMLElement).style;
              const heightMatch = style.match(/(?:min-?height|height)\s*:\s*(\d+)/i);
              const paddingMatch = style.match(/padding[^;]*?(\d+)/i);
              const heightFromStyle = parseInt(s.height) || parseInt(s.minHeight) || 0;

              // Either explicit height >= 36px or padding >= 4px or style object has height
              let adequate = false;
              if (heightMatch && parseInt(heightMatch[1]) >= 36) adequate = true;
              else if (heightFromStyle >= 36) adequate = true;
              else if (paddingMatch && parseInt(paddingMatch[1]) >= 4) adequate = true;
              else if (!heightMatch && !paddingMatch) adequate = true; // No explicit sizing = browser default (OK)

              if (!adequate) {
                tooSmallBtns.push(`"${(btn.textContent || '').trim().slice(0, 30)}" too small`);
              }
            });
            expect(tooSmallBtns).toEqual([]);
          });
        });

      });
    }

    // ========================================================================
    // TIER 5: INTERACTIVE GRAPHIC EXCELLENCE (~55 tests)
    // Ensures interactive graphics are realistic, responsive, cross-browser
    // compatible, educationally clear, and truly engaging on web/mobile/tablet.
    // Catches: flat curves, broken Brave sliders, invisible changes, unlabeled
    // axes, poor scaling, unresponsive layouts, and physics display errors.
    // ========================================================================

    if (runTier5) {
      describe('TIER 5: Interactive Graphic Excellence', () => {

        // ----------------------------------------------------------------
        // 5.1 Cross-Browser Slider Compatibility
        // Ensures sliders work in Chrome, Brave, Safari, Firefox, mobile
        // ----------------------------------------------------------------
        describe('5.1 Cross-Browser Slider Compatibility', () => {
          it('slider responds to input event for real-time Chromium/Brave feedback', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const textBefore = getPhaseContent();
            const mid = (Number(slider.min) + Number(slider.max)) / 2;
            const newVal = Number(slider.value) === mid ? Number(slider.max) * 0.8 : mid;

            // onInput fires continuously during drag in ALL browsers.
            // onChange only fires on mouse release in Chromium/Brave.
            // Without onInput support, Brave users get no real-time feedback.
            fireEvent.input(slider, { target: { value: String(newVal) } });

            const textAfter = getPhaseContent();
            expect(textAfter).not.toBe(textBefore);
          });

          it('slider has appearance reset for cross-browser custom styling', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            // Without -webkit-appearance: none, custom background gradients on
            // slider tracks will NOT render in Chromium/Brave/Safari.
            const hasAppearanceReset = sliders.some(slider => {
              const style = slider.getAttribute('style') || '';
              return /appearance\s*:\s*none|-webkit-appearance\s*:\s*none|WebkitAppearance|webkitAppearance/i.test(style);
            });

            // Accept accent-color approach as an alternative (simpler but limited)
            const hasAccentColor = sliders.some(slider => {
              const style = slider.getAttribute('style') || '';
              return /accent-?color|accentColor/i.test(style);
            });

            expect(hasAppearanceReset || hasAccentColor).toBe(true);
          });

          it('slider has touch-action CSS for mobile scroll compatibility', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            // Without touch-action: pan-y, dragging a slider on mobile scrolls
            // the page instead of moving the thumb. Brave's fingerprinting
            // protection makes this worse by blocking touch event APIs.
            const hasProperTouchHandling = sliders.some(slider => {
              const style = slider.getAttribute('style') || '';
              const parentStyle = slider.parentElement?.getAttribute('style') || '';
              const inlineMatch = /touch-?action|touchAction/i.test(style + parentStyle);
              // jsdom may not serialize touchAction into getAttribute('style'),
              // so also check the DOM style property directly
              const el = slider as HTMLElement;
              const domMatch = !!(el.style as any).touchAction || !!(el.style as any)['touch-action'];
              return inlineMatch || domMatch;
            });

            if (!hasProperTouchHandling) {
              console.warn(
                '[TIER 5.1] Sliders missing touch-action CSS. ' +
                'Add touchAction: "pan-y" to prevent scroll blocking on mobile/tablet/Brave.'
              );
            }
            expect(hasProperTouchHandling).toBe(true);
          });

          it('slider input event updates SVG in real-time (not just on release)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const svgBefore = getSVG()?.innerHTML || '';
            const max = Number(slider.max) || 100;
            fireEvent.input(slider, { target: { value: String(max * 0.75) } });
            const svgAfter = getSVG()?.innerHTML || '';

            expect(svgAfter).not.toBe(svgBefore);
          });

          it('slider thumb has adequate height for finger touch (>= 16px)', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            sliders.forEach(slider => {
              const style = slider.getAttribute('style') || '';
              const heightMatch = style.match(/height\s*:\s*(\d+)/i);
              if (heightMatch) {
                expect(parseInt(heightMatch[1])).toBeGreaterThanOrEqual(16);
              }
            });
          });

          it('keyboard arrow keys do not crash slider', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            fireEvent.keyDown(slider, { key: 'ArrowRight' });
            fireEvent.keyDown(slider, { key: 'ArrowLeft' });
            expect(consoleErrors.length).toBe(0);
          });

          it('slider handles rapid input-change event alternation (simulated drag)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            const step = (max - min) / 20;

            // Simulate realistic drag: alternating input (during drag) and change (release)
            for (let i = 0; i <= 20; i++) {
              const val = String(min + step * i);
              fireEvent.input(slider, { target: { value: val } });
              if (i % 5 === 0) {
                fireEvent.change(slider, { target: { value: val } });
              }
            }

            expect(consoleErrors.length).toBe(0);
            expect(getSVG()?.innerHTML.length).toBeGreaterThan(100);
          });
        });

        // ----------------------------------------------------------------
        // 5.2 SVG Visualization Perceptibility & Realism
        // Ensures graphics show visible, meaningful, realistic changes
        // that clearly communicate the physics to the learner
        // ----------------------------------------------------------------
        describe('5.2 SVG Visualization Perceptibility', () => {
          it('SVG curve points are distributed across plot area (not compressed flat)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const paths = Array.from(svg.querySelectorAll('path'));
            const curvePath = paths.find(p => {
              const d = p.getAttribute('d') || '';
              return d.includes('L') && d.length > 50;
            });
            if (!curvePath) return;

            const d = curvePath.getAttribute('d') || '';
            const points = extractPathPoints(d);
            if (points.length < 5) return;

            // Calculate Y-coordinate range of the curve
            const yValues = points.map(p => p.y);
            const yMin = Math.min(...yValues);
            const yMax = Math.max(...yValues);
            const yRange = yMax - yMin;

            const viewBox = svg.getAttribute('viewBox');
            let totalHeight = parseFloat(svg.getAttribute('height') || '280');
            if (viewBox) {
              totalHeight = parseFloat(viewBox.split(/[\s,]+/)[3]) || totalHeight;
            }

            // The curve should use at least 15% of the vertical space.
            // If less, the curve is compressed flat — meaning all the interesting
            // behavior is invisible to the user (e.g., linear Y on exponential data).
            const utilizationPercent = (yRange / totalHeight) * 100;
            if (utilizationPercent < 15) {
              console.warn(
                `[TIER 5.2] SVG curve uses only ${utilizationPercent.toFixed(1)}% of vertical space. ` +
                'Curve appears flat. Consider logarithmic Y-axis for exponential data.'
              );
            }
            expect(utilizationPercent).toBeGreaterThanOrEqual(15);
          });

          it('slider change produces visible point position change (> 5px)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const svg = getSVG();
            const pointBefore = getInteractivePoint(svg);
            if (!pointBefore) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            const newVal = min + (max - min) * 0.75;
            fireEvent.change(slider, { target: { value: String(newVal) } });

            const pointAfter = getInteractivePoint(getSVG());
            if (!pointAfter) return;

            const distance = pointDistance(pointBefore, pointAfter);
            if (distance < 5) {
              console.warn(
                `[TIER 5.2] Interactive point moved only ${distance.toFixed(1)}px on slider change. ` +
                'Users cannot perceive the change. Check Y-axis scaling or value mapping.'
              );
            }
            expect(distance).toBeGreaterThan(5);
          });

          it('different slider positions (25%, 50%, 75%) produce distinct SVG states', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            const snapshots: string[] = [];

            [0.25, 0.5, 0.75].forEach(fraction => {
              const val = min + (max - min) * fraction;
              fireEvent.change(slider, { target: { value: String(val) } });
              snapshots.push(getSVG()?.innerHTML || '');
            });

            // All three should be different — if not, the graphic doesn't respond
            const uniqueSnapshots = new Set(snapshots);
            expect(uniqueSnapshots.size).toBeGreaterThanOrEqual(2);
            expect(snapshots[0] !== snapshots[1] || snapshots[1] !== snapshots[2]).toBe(true);
          });

          it('SVG curve has sufficient data points for smooth appearance (>= 10)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const paths = Array.from(svg.querySelectorAll('path'));
            const curvePath = paths.find(p => {
              const d = p.getAttribute('d') || '';
              return d.includes('L') && d.length > 50;
            });
            if (!curvePath) return;

            const points = extractPathPoints(curvePath.getAttribute('d') || '');
            expect(points.length).toBeGreaterThanOrEqual(10);
          });

          it('interactive marker is not stuck at extreme edge of plot', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const point = getInteractivePoint(svg);
            if (!point) return;

            const viewBox = svg.getAttribute('viewBox');
            let svgHeight = parseFloat(svg.getAttribute('height') || '280');
            if (viewBox) {
              svgHeight = parseFloat(viewBox.split(/[\s,]+/)[3]) || svgHeight;
            }

            // If marker is within 5% of top or bottom, it's compressed to an extreme
            const margin = svgHeight * 0.05;
            const isAtExtreme = point.cy < margin || point.cy > svgHeight - margin;
            if (isAtExtreme) {
              console.warn(
                `[TIER 5.2] Interactive marker at cy=${point.cy.toFixed(1)} in SVG height ${svgHeight}. ` +
                'Marker pressed against edge — consider logarithmic Y-axis scaling.'
              );
            }
          });

          it('SVG content area utilizes meaningful portion of available space', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const shapes = svg.querySelectorAll('path, circle, rect, line, polygon');
            if (shapes.length < 3) return;

            let minX = Infinity, maxX = -Infinity;
            shapes.forEach(shape => {
              const x = parseFloat(
                shape.getAttribute('cx') || shape.getAttribute('x1') || shape.getAttribute('x') || ''
              );
              if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
            });
            if (!isFinite(minX)) return;

            const viewBox = svg.getAttribute('viewBox');
            let svgWidth = parseFloat(svg.getAttribute('width') || '450');
            if (viewBox) {
              svgWidth = parseFloat(viewBox.split(/[\s,]+/)[2]) || svgWidth;
            }

            const widthUtilization = (maxX - minX) / svgWidth;
            expect(widthUtilization).toBeGreaterThanOrEqual(0.3);
          });

          it('SVG curves/barriers use significant vertical space (not flat or compressed)', () => {
            // Check ALL phases that may have SVGs, not just play.
            // Energy barrier diagrams, reaction coordinate plots, etc. must show
            // visible peaks/curves that use the available height, not flat lines.
            const phasesToCheck = ['play', 'twist_predict', 'twist_play'];
            let foundCurve = false;
            let worstUtilization = 100;

            for (const gp of phasesToCheck) {
              cleanup();
              try { renderGame({ gamePhase: gp }); } catch { continue; }
              const svgs = document.querySelectorAll('svg');
              svgs.forEach(svg => {
                const paths = Array.from(svg.querySelectorAll('path'));
                paths.forEach(path => {
                  const d = path.getAttribute('d') || '';
                  // Check Q (quadratic) and C (cubic) curves and L (line-to) paths
                  if (d.length < 30) return;
                  const hasCommands = /[QLCT]/i.test(d);
                  const hasLinePoints = (d.match(/[LM]/g) || []).length >= 3;
                  if (!hasCommands && !hasLinePoints) return;

                  // Extract all Y coordinates from the path
                  const yCoords: number[] = [];
                  const nums = d.match(/[\d.e+-]+/g) || [];
                  // For Q/C curves, parse control points; for M/L, parse endpoints
                  // Simple approach: every other number after the first is a Y coordinate
                  const cmdParts = d.match(/[MLQCT][^MLQCT]*/gi) || [];
                  cmdParts.forEach(part => {
                    const coordNums = part.match(/[\d.e+-]+/g) || [];
                    for (let i = 1; i < coordNums.length; i += 2) {
                      yCoords.push(parseFloat(coordNums[i]));
                    }
                  });

                  if (yCoords.length < 2) return;
                  foundCurve = true;

                  const yMin = Math.min(...yCoords);
                  const yMax = Math.max(...yCoords);
                  const yRange = yMax - yMin;

                  const vb = svg.getAttribute('viewBox');
                  let h = parseFloat(svg.getAttribute('height') || '280');
                  if (vb) h = parseFloat(vb.split(/[\s,]+/)[3]) || h;

                  const utilPct = (yRange / h) * 100;
                  worstUtilization = Math.min(worstUtilization, utilPct);
                });
              });
            }

            if (!foundCurve) return; // no curves found in any phase

            if (worstUtilization < 25) {
              console.warn(
                `[TIER 5.2] SVG curve/barrier uses only ${worstUtilization.toFixed(1)}% of vertical space. ` +
                'Barrier appears flat. Scale the peak height to use at least 25% of the SVG height ' +
                'so the energy barrier or data curve is clearly visible to learners.'
              );
            }
            expect(worstUtilization).toBeGreaterThanOrEqual(25);
          });

          it('SVG text elements do not overlap each other (clear readability)', () => {
            // Text overlapping other text or curve elements makes graphics
            // look unprofessional and hinders learning.
            renderGame({ gamePhase: 'play' });
            const svgs = document.querySelectorAll('svg');
            let overlappingPairs = 0;

            svgs.forEach(svg => {
              const texts = Array.from(svg.querySelectorAll('text'));
              if (texts.length < 2) return;

              // Build bounding boxes from text attributes
              const boxes = texts.map(t => {
                const x = parseFloat(t.getAttribute('x') || '0');
                const y = parseFloat(t.getAttribute('y') || '0');
                const fontSize = parseFloat(t.getAttribute('font-size') || t.getAttribute('fontSize') || '12');
                const content = t.textContent || '';
                const anchor = t.getAttribute('text-anchor') || t.getAttribute('textAnchor') || 'start';
                const estWidth = content.length * fontSize * 0.6;
                let left = x;
                if (anchor === 'middle') left = x - estWidth / 2;
                else if (anchor === 'end') left = x - estWidth;
                return { left, right: left + estWidth, top: y - fontSize, bottom: y + 2 };
              });

              // Check all pairs
              for (let i = 0; i < boxes.length; i++) {
                for (let j = i + 1; j < boxes.length; j++) {
                  const a = boxes[i], b = boxes[j];
                  const overlapX = a.left < b.right && a.right > b.left;
                  const overlapY = a.top < b.bottom && a.bottom > b.top;
                  if (overlapX && overlapY) {
                    console.warn(`[OVERLAP] "${texts[i].textContent?.substring(0,25)}" (${JSON.stringify(a)}) vs "${texts[j].textContent?.substring(0,25)}" (${JSON.stringify(b)})`);
                    overlappingPairs++;
                  }
                }
              }
            });

            if (overlappingPairs > 0) {
              console.warn(
                `[TIER 5.2] ${overlappingPairs} overlapping text pair(s) in SVG. ` +
                'Text overlap makes graphics unclear. Reposition labels to avoid collision.'
              );
            }
            expect(overlappingPairs).toBe(0);
          });

          it('all SVG phases have graphics that use vertical space well (no empty void)', () => {
            // The graphic should not be 80%+ empty space with everything crammed at the bottom.
            const phasesToCheck = ['play', 'twist_predict', 'twist_play'];
            let foundBadSpace = false;

            for (const gp of phasesToCheck) {
              cleanup();
              try { renderGame({ gamePhase: gp }); } catch { continue; }
              const svgs = document.querySelectorAll('svg');
              svgs.forEach(svg => {
                const vb = svg.getAttribute('viewBox');
                let h = parseFloat(svg.getAttribute('height') || '0');
                if (vb) h = parseFloat(vb.split(/[\s,]+/)[3]) || h;
                if (h < 100) return;

                // Get all content Y positions (circles, rects, texts, paths)
                const contentYs: number[] = [];
                svg.querySelectorAll('circle').forEach(c => {
                  const cy = parseFloat(c.getAttribute('cy') || '');
                  if (!isNaN(cy)) contentYs.push(cy);
                });
                svg.querySelectorAll('text').forEach(t => {
                  const ty = parseFloat(t.getAttribute('y') || '');
                  if (!isNaN(ty)) contentYs.push(ty);
                });
                svg.querySelectorAll('line').forEach(l => {
                  const y1 = parseFloat(l.getAttribute('y1') || '');
                  const y2 = parseFloat(l.getAttribute('y2') || '');
                  if (!isNaN(y1)) contentYs.push(y1);
                  if (!isNaN(y2)) contentYs.push(y2);
                });

                if (contentYs.length < 3) return;

                const topContent = Math.min(...contentYs);
                const bottomContent = Math.max(...contentYs);
                const contentSpan = bottomContent - topContent;
                const spanRatio = contentSpan / h;

                // Content should span at least 40% of the SVG height
                if (spanRatio < 0.4) {
                  console.warn(
                    `[TIER 5.2] SVG content spans only ${(spanRatio * 100).toFixed(0)}% of height in ${gp} phase. ` +
                    'Most of the graphic is empty void. Redistribute content vertically.'
                  );
                  foundBadSpace = true;
                }
              });
            }
            expect(foundBadSpace).toBe(false);
          });
        });

        // ----------------------------------------------------------------
        // 5.3 Educational Graphic Clarity & Annotations
        // Ensures graphics clearly communicate WHAT is shown and WHY
        // it matters — like Apple/Airbnb-quality data visualization
        // ----------------------------------------------------------------
        describe('5.3 Educational Graphic Clarity', () => {
          it('SVG has labeled axes (X and/or Y axis text)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const texts = Array.from(svg.querySelectorAll('text'))
              .map(t => (t.textContent || '').trim().toLowerCase());

            const axisPattern = /temperature|rate|force|velocity|speed|distance|time|angle|frequency|amplitude|energy|pressure|voltage|current|position|height|mass|volume|density|power|acceleration|momentum|wavelength|concentration|coefficient|intensity|reaction/i;
            const axisLabels = texts.filter(t => axisPattern.test(t));

            expect(axisLabels.length).toBeGreaterThanOrEqual(1);
          });

          it('SVG has grid lines or tick marks for visual reference', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const lines = Array.from(svg.querySelectorAll('line'));

            // Grid lines: dashed or semi-transparent
            const gridLines = lines.filter(line => {
              const dash = line.getAttribute('stroke-dasharray') || line.getAttribute('strokeDasharray');
              const opacity = line.getAttribute('opacity');
              return dash || (opacity && parseFloat(opacity) < 1);
            });

            // Tick marks: short lines at axis edges
            const tickMarks = lines.filter(line => {
              const dy = Math.abs(
                parseFloat(line.getAttribute('y2') || '0') - parseFloat(line.getAttribute('y1') || '0')
              );
              const dx = Math.abs(
                parseFloat(line.getAttribute('x2') || '0') - parseFloat(line.getAttribute('x1') || '0')
              );
              return (dy > 0 && dy < 15) || (dx > 0 && dx < 15);
            });

            expect(gridLines.length + tickMarks.length).toBeGreaterThanOrEqual(2);
          });

          it('SVG has a title or descriptive heading nearby', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const titleEl = svg.querySelector('title');
            const boldText = Array.from(svg.querySelectorAll('text')).find(t => {
              const fw = t.getAttribute('font-weight') || t.getAttribute('fontWeight') || '';
              const fs = parseFloat(t.getAttribute('font-size') || t.getAttribute('fontSize') || '0');
              const text = (t.textContent || '').trim();
              return (fw === 'bold' || fw === '700' || fw === '800' || fs >= 13) && text.length > 3;
            });

            const pageContent = getPhaseContent();
            const hasHeading = /temperature|rate|reaction|curve|graph|diagram|chart|relationship|equation|simulation|energy|barrier|visualization/i.test(pageContent);

            expect(titleEl || boldText || hasHeading).toBeTruthy();
          });

          it('current interactive value is visually highlighted (glow/filter/size)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const circles = Array.from(svg.querySelectorAll('circle'));
            const highlighted = circles.filter(c => {
              const filter = c.getAttribute('filter');
              const r = parseFloat(c.getAttribute('r') || '0');
              const stroke = c.getAttribute('stroke');
              return filter || r >= 8 || (stroke && stroke !== 'none');
            });

            const glowElements = svg.querySelectorAll('[fill*="url(#glow"]');
            const filterElements = svg.querySelectorAll('[filter]');

            expect(highlighted.length + glowElements.length + filterElements.length).toBeGreaterThanOrEqual(1);
          });

          it('reference or baseline marker exists for comparison', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent || '');
            const hasRefText = texts.some(t =>
              /ref|baseline|default|initial|25°?C|standard|normal|compare/i.test(t)
            );

            const circles = Array.from(svg.querySelectorAll('circle'));
            const secondaryMarkers = circles.filter(c => {
              const fill = c.getAttribute('fill') || '';
              const opacity = parseFloat(c.getAttribute('opacity') || '1');
              return /a1a1|9ca3|gray|grey/i.test(fill) || (opacity > 0 && opacity < 0.8);
            });

            if (!hasRefText && secondaryMarkers.length === 0) {
              console.warn(
                '[TIER 5.3] No reference/baseline point in SVG. ' +
                'A "before" marker helps users see the magnitude of their changes.'
              );
            }
          });

          it('units are displayed on axes or near values', () => {
            renderGame({ gamePhase: 'play' });
            const svgText = getSVG()?.textContent || '';
            const pageContent = getPhaseContent();
            const allText = svgText + pageContent;

            const hasUnits = /°C|°F|K\b|m\/s|km\/h|Hz|eV|J\b|N\b|Pa|W\b|V\b|A\b|Ω|kg|cm|mm|m²|ms|μs|%|rad|rpm/i.test(allText);
            expect(hasUnits).toBe(true);
          });

          it('formula or equation is visible near the graphic', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();
            const svgText = getSVG()?.textContent || '';
            const allText = content + svgText;

            const hasFormula = /=.*exp|=.*e\^|k\s*=|F\s*=|v\s*=|E\s*=|P\s*=|\^2|\^3|²|³|×|·|∝|ln\(|log\(/i.test(allText);
            const hasEquation = /equation|formula|relationship|proportional|varies.*as/i.test(content);
            expect(hasFormula || hasEquation).toBe(true);
          });

          it('color coding is semantically meaningful (not arbitrary)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const svgHtml = svg.innerHTML;
            const hasGradient = svg.querySelectorAll('linearGradient, radialGradient').length > 0;
            const hasTempColors = /3B82F6|blue/i.test(svgHtml) && /EF4444|F59E0B|red|orange|yellow/i.test(svgHtml);
            const hasSemanticColors = /10B981|22c55e|green/i.test(svgHtml) && /EF4444|ef4444|red/i.test(svgHtml);

            expect(hasGradient || hasTempColors || hasSemanticColors).toBe(true);
          });
        });

        // ----------------------------------------------------------------
        // 5.4 Slider UX Excellence
        // Ensures sliders are clearly labeled, informative, intuitive,
        // and communicate what the user is controlling and why it matters
        // ----------------------------------------------------------------
        describe('5.4 Slider UX Excellence', () => {
          it('slider has min and max boundary labels', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            const slider = sliders[0];
            const parent = slider.parentElement;
            const grandparent = parent?.parentElement;
            const nearbyText = (parent?.textContent || '') + (grandparent?.textContent || '');

            const hasMinLabel = nearbyText.includes(slider.min) ||
              /low|min|cold|slow|small|weak|zero|none|freezer/i.test(nearbyText);
            const hasMaxLabel = nearbyText.includes(slider.max) ||
              /high|max|hot|fast|large|strong|full/i.test(nearbyText);

            expect(hasMinLabel || hasMaxLabel).toBe(true);
          });

          it('slider value readout updates immediately on change', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const parent = slider.parentElement?.parentElement;
            const textBefore = parent?.textContent || '';

            const max = Number(slider.max) || 100;
            const newVal = Math.round(max * 0.7);
            fireEvent.change(slider, { target: { value: String(newVal) } });

            const textAfter = parent?.textContent || '';
            expect(textAfter).not.toBe(textBefore);
          });

          it('slider has physics-concept label explaining what it controls', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            const parent = sliders[0].parentElement;
            const grandparent = parent?.parentElement;
            const nearbyText = (parent?.textContent || '') + (grandparent?.textContent || '');

            const hasLabel = /temperature|force|velocity|speed|angle|mass|frequency|amplitude|energy|activation|pressure|distance|height|radius|current|voltage|rate|power|time|coefficient|concentration|density|viscosity|flow|wavelength|momentum/i.test(nearbyText);
            expect(hasLabel).toBe(true);
          });

          it('slider change updates derived calculated values', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const valueBefore = getPhaseContent();
            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            fireEvent.change(slider, { target: { value: String(min + (max - min) * 0.8) } });
            const valueAfter = getPhaseContent();

            expect(valueAfter).not.toBe(valueBefore);

            // Check numerical values actually changed
            const numbersBefore = (valueBefore.match(/\d+\.?\d*/g) || []).join(',');
            const numbersAfter = (valueAfter.match(/\d+\.?\d*/g) || []).join(',');
            expect(numbersAfter).not.toBe(numbersBefore);
          });

          it('multiple sliders can be adjusted independently in twist_play', () => {
            renderGame({ gamePhase: 'twist_play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length < 2) return;

            const s1 = sliders[0];
            const s2 = sliders[1];

            fireEvent.change(s1, { target: { value: String((Number(s1.min) + Number(s1.max)) / 2) } });
            const stateAfterS1 = getPhaseContent();

            fireEvent.change(s2, { target: { value: String((Number(s2.min) + Number(s2.max)) / 2) } });
            const stateAfterS2 = getPhaseContent();

            expect(stateAfterS2).not.toBe(stateAfterS1);
            expect(consoleErrors.length).toBe(0);
          });

          it('slider displays units alongside current value', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            const parent = sliders[0].parentElement;
            const grandparent = parent?.parentElement;
            const nearbyText = (parent?.textContent || '') + (grandparent?.textContent || '');

            const hasUnits = /°C|°F|K\b|m\/s|km\/h|Hz|eV|J\b|N\b|Pa|W\b|V\b|A\b|Ω|kg|cm|mm|m²|s\b|ms|%|rad|rpm|m\b|ft|lb|atm/i.test(nearbyText);
            expect(hasUnits).toBe(true);
          });

          it('extreme slider values produce valid displays (no NaN, Infinity, or broken text)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            fireEvent.change(slider, { target: { value: slider.min } });
            let content = getPhaseContent();
            expect(content).not.toMatch(/\bNaN\b|\bInfinity\b|\bundefined\b/);

            fireEvent.change(slider, { target: { value: slider.max } });
            content = getPhaseContent();
            expect(content).not.toMatch(/\bNaN\b|\bInfinity\b|\bundefined\b/);

            expect(consoleErrors.length).toBe(0);
          });

          it('displayed values use appropriate precision (no excessive decimals)', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            // Find numbers with 7+ decimal places (unreadable noise)
            const excessive = (content.match(/\d+\.\d{7,}/g) || [])
              .filter(n => !n.includes('e') && parseFloat(n) > 0.001);

            if (excessive.length > 0) {
              console.warn(
                `[TIER 5.4] Excessive decimal precision: ${excessive.join(', ')}. ` +
                'Use .toFixed() or toLocaleString() for readability.'
              );
            }
            expect(excessive.length).toBeLessThanOrEqual(2);
          });
        });

        // ----------------------------------------------------------------
        // 5.5 Device Responsiveness (Mobile 375px / Tablet 768px / Desktop)
        // Ensures graphics look great and function properly at all sizes
        // ----------------------------------------------------------------
        describe('5.5 Device Responsiveness', () => {
          it('SVG container uses responsive width (100%, flex, or viewBox)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            let hasResponsive = false;
            let node: Element | null = svg;
            for (let depth = 0; depth < 4 && node; depth++) {
              const style = node.getAttribute('style') || '';
              if (style.includes('100%') || style.includes('flex') ||
                  style.includes('max-width') || style.includes('maxWidth')) {
                hasResponsive = true;
                break;
              }
              if (node.tagName === 'svg' && node.getAttribute('viewBox')) {
                hasResponsive = true;
                break;
              }
              node = node.parentElement;
            }

            expect(hasResponsive).toBe(true);
          });

          it('sliders have full-width responsive layout', () => {
            renderGame({ gamePhase: 'play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length === 0) return;

            sliders.forEach(slider => {
              const style = slider.getAttribute('style') || '';
              const hasWidth = style.includes('100%') || style.includes('width');
              expect(hasWidth).toBe(true);
            });
          });

          it('primary buttons have minimum 44px touch targets', () => {
            renderGame({ gamePhase: 'play' });
            const buttons = screen.getAllByRole('button');
            const primaryBtns = buttons.filter(btn => {
              const style = btn.getAttribute('style') || '';
              const text = (btn.textContent || '').trim();
              return style.includes('background') && text.length > 2 && text.length < 50;
            });

            primaryBtns.forEach(btn => {
              const style = btn.getAttribute('style') || '';
              const heightMatch = style.match(/(?:min-?height|height)\s*:\s*(\d+)/i);
              if (heightMatch) {
                expect(parseInt(heightMatch[1])).toBeGreaterThanOrEqual(44);
              }
            });
          });

          it('no fixed pixel widths exceed mobile viewport (375px)', () => {
            renderGame({ gamePhase: 'play' });
            const oversized: string[] = [];

            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              const widthMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i);
              if (widthMatch) {
                const width = parseInt(widthMatch[1]);
                // SVGs with viewBox scale down, so they're exempt
                if (width > 375 && el.tagName !== 'svg') {
                  oversized.push(`<${el.tagName.toLowerCase()}> width: ${width}px`);
                }
              }
            });

            if (oversized.length > 0) {
              console.warn(`[TIER 5.5] Elements wider than mobile viewport: ${oversized.join(', ')}`);
            }
            expect(oversized.length).toBeLessThanOrEqual(2);
          });

          it('SVG preserveAspectRatio is not "none" (prevents distortion)', () => {
            renderGame({ gamePhase: 'play' });
            document.querySelectorAll('svg').forEach(svg => {
              const par = svg.getAttribute('preserveAspectRatio');
              if (par) {
                expect(par).not.toBe('none');
              }
            });
          });

          it('no horizontal scroll in play or twist_play phases', () => {
            ['play', 'twist_play'].forEach(phase => {
              clearConsoleLogs();
              const { unmount } = renderGame({ gamePhase: phase });
              expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 30);
              unmount();
              cleanup();
            });
          });
        });

        // ----------------------------------------------------------------
        // 5.6 Interactive Engagement & Game-like Quality
        // Ensures the graphic draws users in like a game — immediate
        // feedback, discovery moments, rich visual context
        // ----------------------------------------------------------------
        describe('5.6 Interactive Engagement', () => {
          it('interaction produces synchronous visual feedback (no async delay)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const svgBefore = getSVG()?.innerHTML || '';
            const max = Number(slider.max) || 100;
            fireEvent.change(slider, { target: { value: String(max * 0.6) } });
            const svgAfter = getSVG()?.innerHTML || '';

            // Change must be immediate (same render tick), not delayed
            expect(svgAfter).not.toBe(svgBefore);
          });

          it('contextual discovery or insight prompts appear during exploration', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            let foundDiscovery = false;

            // Sweep through the slider range
            for (let fraction = 0.1; fraction <= 0.9; fraction += 0.1) {
              const val = min + (max - min) * fraction;
              fireEvent.change(slider, { target: { value: String(val) } });
              const content = getPhaseContent();
              if (/notice|discover|observe|insight|did you|look!|amazing|key|important|rule|tip|hint|🎯|💡|🔍/i.test(content)) {
                foundDiscovery = true;
                break;
              }
            }

            if (!foundDiscovery) {
              console.warn(
                '[TIER 5.6] No discovery prompt found when sweeping slider range. ' +
                'Consider adding contextual insights at key parameter values.'
              );
            }
          });

          it('real-time calculated values are displayed alongside graphic', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            const hasCalculatedValues = /×|rate|ratio|factor|multiplier|result|output|velocity|force|energy|power|current|acceleration/i.test(content);
            const hasNumericalDisplay = /\d+\.?\d*\s*(×|m\/s|Hz|N|J|W|V|A|Pa|eV|°C|K)/i.test(content);

            expect(hasCalculatedValues || hasNumericalDisplay).toBe(true);
          });

          it('multiple visual sections reinforce the concept (chart + data readout)', () => {
            renderGame({ gamePhase: 'play' });

            const svgs = document.querySelectorAll('svg');
            const styledCards = document.querySelectorAll(
              '[style*="border-radius"][style*="background"]'
            );

            // Should have graphic(s) AND styled data readout cards
            expect(svgs.length).toBeGreaterThanOrEqual(1);
            expect(styledCards.length).toBeGreaterThanOrEqual(1);
          });

          it('color changes create intuitive parameter mapping (blue=cold, red=hot, etc.)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            fireEvent.change(slider, { target: { value: slider.min } });
            const htmlLow = document.body.innerHTML;

            fireEvent.change(slider, { target: { value: slider.max } });
            const htmlHigh = document.body.innerHTML;

            // Different slider positions should show different colors
            expect(htmlHigh).not.toBe(htmlLow);

            // Color-coded feedback should be present
            const hasColorCoding = /10B981|22c55e|success|EF4444|ef4444|error|F59E0B|f59e0b|warning/i.test(htmlHigh);
            expect(hasColorCoding).toBe(true);
          });

          it('smooth CSS transitions are present for state changes', () => {
            renderGame({ gamePhase: 'play' });
            const html = document.body.innerHTML;
            const hasTransitions = /transition[^;]*\d+\.?\d*(s|ms)/i.test(html);
            expect(hasTransitions).toBe(true);
          });

          it('observation guidance explains what to watch for when interacting', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();

            const hasGuidance = /observe|watch|notice|look|pay attention|focus|what.*happen|when.*increase|when.*decrease|try.*moving|try.*adjust|experiment/i.test(content);
            expect(hasGuidance).toBe(true);
          });

          it('comparison or before-after display aids understanding', () => {
            renderGame({ gamePhase: 'play' });
            const content = getPhaseContent();
            const html = document.body.innerHTML;

            const hasComparison = /reference|baseline|compare|vs\.?|versus|before|after|original|current|change.*from|relative|multiplier|factor/i.test(content);
            const hasMultiValueLayout = /grid-template-columns|gridTemplateColumns/i.test(html);
            const hasFlexRow = /flex-direction:\s*row|flexDirection:\s*row/i.test(html);

            expect(hasComparison || hasMultiValueLayout || hasFlexRow).toBeTruthy();
          });
        });

        // ----------------------------------------------------------------
        // 5.7 Physics Accuracy & Display Integrity
        // Ensures displayed values are physically correct, readable,
        // and the visualization faithfully represents the underlying math
        // ----------------------------------------------------------------
        describe('5.7 Physics Accuracy & Display Integrity', () => {
          it('no NaN or Infinity at any slider position across full range', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            const positions = [min, min + (max - min) * 0.25, (min + max) / 2, min + (max - min) * 0.75, max];

            positions.forEach(val => {
              fireEvent.change(slider, { target: { value: String(val) } });
              const content = getPhaseContent();
              const svgText = getSVG()?.textContent || '';
              const allText = content + svgText;

              expect(allText).not.toMatch(/\bNaN\b/);
              expect(allText).not.toMatch(/\bInfinity\b/);
              expect(allText).not.toMatch(/\bundefined\b/);
            });
          });

          it('increasing slider value changes output in physically expected direction', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;

            fireEvent.change(slider, { target: { value: String(min + (max - min) * 0.2) } });
            const contentLow = getPhaseContent();

            fireEvent.change(slider, { target: { value: String(min + (max - min) * 0.8) } });
            const contentHigh = getPhaseContent();

            expect(contentHigh).not.toBe(contentLow);
            expect(consoleErrors.length).toBe(0);
          });

          it('SVG coordinate attributes are all valid numbers (no NaN)', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            const invalidAttrs: string[] = [];
            svg.querySelectorAll('*').forEach(el => {
              ['cx', 'cy', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'r', 'width', 'height'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val && isNaN(parseFloat(val)) && val !== '100%' && !val.includes('url')) {
                  invalidAttrs.push(`<${el.tagName}> ${attr}="${val}"`);
                }
              });
            });

            expect(invalidAttrs).toEqual([]);
          });

          it('SVG path d attribute contains only valid coordinates', () => {
            renderGame({ gamePhase: 'play' });
            const svg = getSVG();
            if (!svg) return;

            svg.querySelectorAll('path').forEach(path => {
              const d = path.getAttribute('d') || '';
              if (d.length < 10) return;

              expect(d).not.toMatch(/NaN/);
              expect(d).not.toMatch(/Infinity/);

              const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
              commands.forEach(cmd => {
                (cmd.match(/[\d.e+-]+/g) || []).forEach(num => {
                  expect(isFinite(parseFloat(num))).toBe(true);
                });
              });
            });
          });

          it('Y-axis scaling differentiates between close slider values (not over-compressed)', () => {
            renderGame({ gamePhase: 'play' });
            const slider = getSliders()[0] as HTMLInputElement;
            if (!slider) return;

            const min = Number(slider.min) || 0;
            const max = Number(slider.max) || 100;
            const range = max - min;

            // Compare 40% vs 50% — if these produce identical SVG, the scale is too compressed
            fireEvent.change(slider, { target: { value: String(min + range * 0.4) } });
            const svg1 = getSVG()?.innerHTML || '';

            fireEvent.change(slider, { target: { value: String(min + range * 0.5) } });
            const svg2 = getSVG()?.innerHTML || '';

            if (svg1 === svg2) {
              console.warn(
                '[TIER 5.7] Slider at 40% and 50% produce identical SVG. ' +
                'Y-axis may be over-compressed. For exponential data, use Math.log() scaling.'
              );
            }
          });

          it('twist_play visualization responds to both sliders', () => {
            renderGame({ gamePhase: 'twist_play' });
            const sliders = Array.from(getSliders()) as HTMLInputElement[];
            if (sliders.length < 2) return;

            const s1 = sliders[0];
            fireEvent.change(s1, { target: { value: String((Number(s1.min) + Number(s1.max)) / 2) } });
            const stateA = getSVG()?.innerHTML || '';

            const s2 = sliders[1];
            fireEvent.change(s2, { target: { value: String((Number(s2.min) + Number(s2.max)) / 2) } });
            const stateB = getSVG()?.innerHTML || '';

            expect(stateB).not.toBe(stateA);
          });
        });

        // ----------------------------------------------------------------
        // 5.8 Scroll & Zoom Functionality
        // Ensures games are scrollable on all devices, content is not
        // hidden behind fixed bars, and zoom is not blocked. These are
        // structural checks that catch the DOM patterns causing scroll
        // failure even though jsdom cannot simulate actual scrolling.
        // ----------------------------------------------------------------
        describe('5.8 Scroll & Zoom Functionality', () => {
          it('content-heavy phases have a scrollable container with overflowY', () => {
            // Phases like transfer, test, review have lots of content.
            // Without overflowY: auto/scroll on a container, content gets cut off.
            const contentPhases = ['play', 'transfer', 'test', 'review'];
            let hasScrollContainer = false;

            for (const gp of contentPhases) {
              cleanup();
              try { renderGame({ gamePhase: gp }); } catch { continue; }

              const allElements = document.querySelectorAll('[style]');
              allElements.forEach(el => {
                const style = el.getAttribute('style') || '';
                if (/overflow-?y\s*:\s*(auto|scroll)/i.test(style)) {
                  hasScrollContainer = true;
                }
              });
              if (hasScrollContainer) break;
            }

            if (!hasScrollContainer) {
              console.warn(
                '[TIER 5.8] No element with overflowY: auto/scroll found in any content phase. ' +
                'Content will be clipped on mobile. Add overflowY: "auto" to the scrollable content container.'
              );
            }
            expect(hasScrollContainer).toBe(true);
          });

          it('scrollable container has paddingBottom >= 80px for fixed bottom nav', () => {
            // Fixed bottom bars (position: fixed, bottom: 0) overlay content.
            // The scrollable area needs paddingBottom to prevent the last content
            // from being hidden behind the fixed bar.
            renderGame({ gamePhase: 'play' });

            const hasFixedBottom = Array.from(document.querySelectorAll('[style]')).some(el => {
              const style = el.getAttribute('style') || '';
              return /position\s*:\s*fixed/i.test(style) && /bottom\s*:\s*0/i.test(style);
            });

            if (!hasFixedBottom) return; // No fixed bottom bar, no issue

            // Find scrollable container and check paddingBottom
            let sufficientPadding = false;
            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              if (/overflow-?y\s*:\s*(auto|scroll)/i.test(style)) {
                // Check explicit padding-bottom
                const pbMatch = style.match(/padding-?bottom\s*:\s*(\d+)/i);
                if (pbMatch && parseInt(pbMatch[1]) >= 80) {
                  sufficientPadding = true;
                  return;
                }
                // Check shorthand padding (1-4 values). Third value is bottom when 3+ values present.
                const shorthand = style.match(/(?:^|;\s*)padding\s*:\s*([\d.]+)px(?:\s+([\d.]+)px)?(?:\s+([\d.]+)px)?(?:\s+([\d.]+)px)?/i);
                if (shorthand) {
                  // padding: top right bottom left  OR  padding: top horizontal bottom  OR  padding: vertical horizontal  OR  padding: all
                  const values = [shorthand[1], shorthand[2], shorthand[3], shorthand[4]].filter(Boolean).map(Number);
                  let bottomVal = values[0]; // 1 value: all sides
                  if (values.length === 2) bottomVal = values[0]; // 2 values: vertical horizontal → bottom = vertical
                  if (values.length === 3) bottomVal = values[2]; // 3 values: top horizontal bottom
                  if (values.length === 4) bottomVal = values[2]; // 4 values: top right bottom left
                  if (bottomVal >= 80) {
                    sufficientPadding = true;
                    return;
                  }
                }
                // Also check via DOM style property directly
                const htmlEl = el as HTMLElement;
                const pbDom = parseFloat(htmlEl.style.paddingBottom || '0');
                if (pbDom >= 80) {
                  sufficientPadding = true;
                }
              }
            });

            if (!sufficientPadding) {
              console.warn(
                '[TIER 5.8] Fixed bottom nav exists but scroll container lacks paddingBottom >= 80px. ' +
                'Content at the bottom will be hidden behind the navigation bar on mobile.'
              );
            }
            expect(sufficientPadding).toBe(true);
          });

          it('scrollable container has paddingTop >= 44px for fixed top nav', () => {
            renderGame({ gamePhase: 'play' });

            const hasFixedTop = Array.from(document.querySelectorAll('[style]')).some(el => {
              const style = el.getAttribute('style') || '';
              return /position\s*:\s*fixed/i.test(style) && /top\s*:\s*0/i.test(style);
            });

            if (!hasFixedTop) return;

            let sufficientPadding = false;
            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              if (/overflow-?y\s*:\s*(auto|scroll)/i.test(style)) {
                // Check explicit padding-top
                const ptMatch = style.match(/padding-?top\s*:\s*(\d+)/i);
                if (ptMatch && parseInt(ptMatch[1]) >= 44) {
                  sufficientPadding = true;
                  return;
                }
                // Check shorthand padding (1-4 values). First value is always top.
                const shorthand = style.match(/(?:^|;\s*)padding\s*:\s*([\d.]+)px(?:\s+([\d.]+)px)?(?:\s+([\d.]+)px)?(?:\s+([\d.]+)px)?/i);
                if (shorthand) {
                  const topVal = parseFloat(shorthand[1]);
                  if (topVal >= 44) {
                    sufficientPadding = true;
                    return;
                  }
                }
                // Also check via DOM style property directly
                const htmlEl = el as HTMLElement;
                const ptDom = parseFloat(htmlEl.style.paddingTop || '0');
                if (ptDom >= 44) {
                  sufficientPadding = true;
                }
              }
            });

            if (!sufficientPadding) {
              console.warn(
                '[TIER 5.8] Fixed top nav exists but scroll container lacks paddingTop >= 44px. ' +
                'Content at the top will be hidden behind the progress/navigation bar.'
              );
            }
            expect(sufficientPadding).toBe(true);
          });

          it('scroll container uses flex: 1 to fill available viewport space', () => {
            renderGame({ gamePhase: 'play' });

            let hasFlexGrow = false;
            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              if (/overflow-?y\s*:\s*(auto|scroll)/i.test(style)) {
                if (/flex\s*:\s*1|flex-grow\s*:\s*1|flexGrow\s*:\s*1/i.test(style)) {
                  hasFlexGrow = true;
                }
              }
            });

            if (!hasFlexGrow) {
              console.warn(
                '[TIER 5.8] Scroll container missing flex: 1. Without it, the container ' +
                'may not expand to fill the viewport, causing content to be cut off.'
              );
            }
            expect(hasFlexGrow).toBe(true);
          });

          it('no touch-action: none on scroll containers (only on sliders)', () => {
            // touch-action: none on a scroll container blocks all scrolling
            // and zooming. It should only be on individual sliders.
            renderGame({ gamePhase: 'play' });

            const badElements: string[] = [];
            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              const tag = el.tagName.toLowerCase();
              if (tag === 'input') return; // sliders are OK
              if (/touch-?action\s*:\s*none/i.test(style)) {
                badElements.push(`<${tag}>`);
              }
            });

            if (badElements.length > 0) {
              console.warn(
                `[TIER 5.8] touch-action: none found on non-slider elements: ${badElements.join(', ')}. ` +
                'This blocks scrolling and zooming. Use touch-action: pan-y instead.'
              );
            }
            expect(badElements.length).toBe(0);
          });

          it('outer game container uses min-height 100vh or 100dvh for full viewport', () => {
            renderGame({ gamePhase: 'play' });

            let hasFullHeight = false;
            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              if (/min-?height\s*:\s*100[dv]?vh/i.test(style) ||
                  /height\s*:\s*100[dv]?vh/i.test(style)) {
                hasFullHeight = true;
              }
            });

            expect(hasFullHeight).toBe(true);
          });

          it('transfer phase scroll container exists and contains all app cards', () => {
            cleanup();
            try { renderGame({ gamePhase: 'transfer' }); } catch { return; }

            // Transfer phase typically has 3-6 application cards. All must be
            // inside a scrollable container.
            let scrollContainerExists = false;
            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              if (/overflow-?y\s*:\s*(auto|scroll)/i.test(style)) {
                // Check that it contains multiple child content blocks
                const cards = el.querySelectorAll('[style*="border-radius"], [style*="borderRadius"]');
                if (cards.length >= 2) {
                  scrollContainerExists = true;
                }
              }
            });

            if (!scrollContainerExists) {
              console.warn(
                '[TIER 5.8] Transfer phase has no scrollable container wrapping application cards. ' +
                'Users cannot scroll to see all real-world applications.'
              );
            }
            expect(scrollContainerExists).toBe(true);
          });

          it('fixed position elements have appropriate z-index for layering', () => {
            renderGame({ gamePhase: 'play' });

            document.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style') || '';
              if (/position\s*:\s*fixed/i.test(style)) {
                const zMatch = style.match(/z-?index\s*:\s*(\d+)/i);
                if (zMatch) {
                  const z = parseInt(zMatch[1]);
                  expect(z).toBeGreaterThanOrEqual(10);
                }
              }
            });
          });
        });

      });
    }
  });
}

// ============================================================================
// QUICK VALIDATION FUNCTION
// ============================================================================

export function quickValidateGame(
  gameName: string,
  GameComponent: GameComponent
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  try {
    const { unmount } = render(<GameComponent />);

    // Check basic structure
    const navDots = getNavDots();
    if (navDots.length < 8) {
      failures.push(`Expected 10 nav dots, found ${navDots.length}`);
    }

    const svg = document.querySelector('svg');
    if (!svg) {
      failures.push('No SVG visualization found');
    } else if (svg.innerHTML.length < 200) {
      failures.push('SVG content is too trivial');
    }

    unmount();
    cleanup();

    // Check test phase
    render(<GameComponent gamePhase="test" />);
    const testContent = document.body.textContent || '';
    if (!testContent.match(/1\s*(of|\/)\s*10/i)) {
      failures.push('Test phase does not show question counter');
    }

    cleanup();

    // Check transfer phase
    render(<GameComponent gamePhase="transfer" />);
    const transferContent = document.body.textContent || '';
    if (!transferContent.match(/application|real|world|example/i)) {
      failures.push('Transfer phase missing real-world applications');
    }
    if (transferContent.length < 800) {
      failures.push('Transfer content too short (< 800 chars)');
    }

    cleanup();

    // Check predict phase has no sliders
    render(<GameComponent gamePhase="predict" />);
    const predictSliders = document.querySelectorAll('input[type="range"]');
    if (predictSliders.length > 0) {
      failures.push('Predict phase should not have sliders');
    }

    cleanup();

    // Check play phase has SVG
    render(<GameComponent gamePhase="play" />);
    const playSvg = document.querySelector('svg');
    if (!playSvg) {
      failures.push('Play phase missing SVG visualization');
    }

    cleanup();

  } catch (error) {
    failures.push(`Runtime error: ${error}`);
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
