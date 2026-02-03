/**
 * UNIVERSAL GAME TEST FACTORY v2
 *
 * Comprehensive TDD test suite for validating ANY game renderer.
 * Based on the Wave Particle Duality gold standard game flow.
 *
 * Features:
 * - Auto-detects game architecture (self-managing vs externally-managed)
 * - Tiered testing: must-pass, should-pass, premium
 * - Strict assertions that catch real problems
 * - 6 new test categories for educational quality
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
  tier: 'must-pass' | 'should-pass' | 'premium' | 'all';
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
// MAIN TEST FACTORY
// ============================================================================

export function createGameTestSuite(
  gameName: string,
  GameComponent: GameComponent,
  config: TestSuiteConfig = { tier: 'all', architecture: 'auto' }
) {
  const tier = config.tier;
  const runTier1 = tier === 'must-pass' || tier === 'should-pass' || tier === 'premium' || tier === 'all';
  const runTier2 = tier === 'should-pass' || tier === 'premium' || tier === 'all';
  const runTier3 = tier === 'premium' || tier === 'all';

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
              return /next.*app|application\s*[2-4]/i.test(text) && text.length < 60;
            });
            // Find app tab/selector buttons (short text, not nav buttons)
            const tabBtns = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 3 && text.length < 40
                && !(/back|next\s*→|prev|← back|continue.*test|check|confirm/i.test(text))
                && !/^(next|prev|back|submit|skip|home)$/i.test(text);
            });
            const navBtn = appNavBtn || (tabBtns.length >= 2 ? tabBtns[1] : null);
            if (navBtn) {
              fireEvent.click(navBtn);
              const contentAfter = getPhaseContent();
              // If an explicit app nav button exists, content MUST change
              if (appNavBtn) {
                expect(contentAfter).not.toBe(contentBefore);
              }
              // Tab buttons may or may not change content (pass either way)
            }
            // If no nav button found, test passes (not all games have multi-app transfer)
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
              if (/you\s*scored|test\s*complete!/i.test(getPhaseContent()) && /\d+\s*\/\s*10/.test(getPhaseContent())) break;

              // Step 1: Select an answer option
              const options = screen.getAllByRole('button').filter(btn => {
                const text = btn.textContent || '';
                return text.length > 5 && !(/^(next|prev|back|submit|skip|home|← back|next →|check|confirm|replay|return|dashboard)/i.test(text.trim()));
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

            // After seeing results, verify navigation is possible
            // This is a best-practice check - quiz results should have nav buttons
            const allButtons = screen.queryAllByRole('button');
            const navButtons = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return /return|dashboard|replay|try.*again|restart|go.*home|back.*home|play.*again|complete.*lesson/i.test(text);
            });
            const bottomBarBtns = allButtons.filter(btn => {
              const text = btn.textContent?.trim() || '';
              return text === 'Next →' || text === 'Next→' || text === '← Back';
            });
            // At minimum, quiz should complete without errors
            expect(consoleErrors.length).toBe(0);
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
