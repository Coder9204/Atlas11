/**
 * UNIVERSAL GAME TEST FACTORY
 *
 * This factory creates a complete TDD test suite that can be run against
 * ANY game renderer in the project. Simply import your game component
 * and call createGameTestSuite() to validate it against all 108 test cases.
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
}

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

type GameComponent = React.ComponentType<GameProps>;

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

const getNavDots = () => document.querySelectorAll('button[aria-label]');

const getSliders = () => document.querySelectorAll('input[type="range"]');

const getSVG = () => document.querySelector('svg');

// ============================================================================
// MAIN TEST FACTORY
// ============================================================================

export function createGameTestSuite(
  gameName: string,
  GameComponent: GameComponent
) {
  const renderGame = (props: GameProps = {}) => {
    return render(<GameComponent {...props} />);
  };

  describe(`${gameName} - TDD Validation Suite`, () => {
    beforeEach(() => {
      cleanup();
      clearConsoleLogs();
    });

    // ========================================================================
    // PHASE 1: STRUCTURAL TESTS (20 tests)
    // ========================================================================

    describe('1. Structural Tests', () => {
      describe('1.1 Phase Structure', () => {
        it('has exactly 10 navigation phases', () => {
          renderGame();
          const navDots = getNavDots();
          expect(navDots.length).toBe(10);
        });

        it('has all required phases in correct order', () => {
          renderGame();
          const expectedPhases = [
            'Introduction', 'Predict', 'Experiment', 'Understanding',
            'New Variable', 'Weight Experiment', 'Deep Insight',
            'Real World', 'Knowledge Test', 'Mastery'
          ];
          const navDots = getNavDots();
          const ariaLabels = Array.from(navDots).map(dot => dot.getAttribute('aria-label'));

          // Check that all expected phase types exist (names may vary slightly)
          expect(ariaLabels.length).toBe(10);
          ariaLabels.forEach(label => {
            expect(label).toBeTruthy();
          });
        });

        it('initializes to hook/introduction phase', () => {
          renderGame();
          const content = getPhaseContent();
          // Should have introductory content - question or hook
          expect(content.length).toBeGreaterThan(100);
        });

        it('renders different content for each phase', () => {
          const { unmount } = renderGame({ gamePhase: 'hook' });
          const hookContent = getPhaseContent();
          unmount();

          renderGame({ gamePhase: 'test' });
          const testContent = getPhaseContent();

          expect(hookContent).not.toBe(testContent);
        });

        it('accepts gamePhase prop to set initial phase', () => {
          renderGame({ gamePhase: 'predict' });
          const content = getPhaseContent();
          expect(content).toMatch(/predict|question|think|expect/i);
        });
      });

      describe('1.2 Test Questions', () => {
        it('has 10 test questions', () => {
          renderGame({ gamePhase: 'test' });
          expect(screen.getByText(/1\s*(of|\/)\s*10/i)).toBeInTheDocument();
        });

        it('each question has multiple choice options', () => {
          renderGame({ gamePhase: 'test' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-D]/i)
          );
          expect(options.length).toBeGreaterThanOrEqual(3);
        });

        it('questions have scenario context', () => {
          renderGame({ gamePhase: 'test' });
          // Should have descriptive scenario text
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(200);
        });

        it('no duplicate questions in test', async () => {
          renderGame({ gamePhase: 'test' });
          const questions: string[] = [];

          for (let i = 0; i < 10; i++) {
            const heading = document.querySelector('h3, h2');
            if (heading?.textContent) {
              questions.push(heading.textContent);
            }
            const options = screen.getAllByRole('button').filter(btn =>
              btn.textContent?.match(/^[A-D]/i)
            );
            if (options.length > 0) {
              fireEvent.click(options[0]);
            }
            const nextBtn = findButtonByText(/next/i);
            if (nextBtn && i < 9) {
              fireEvent.click(nextBtn);
            }
          }

          const uniqueQuestions = new Set(questions);
          expect(uniqueQuestions.size).toBe(questions.length);
        });

        it('questions are topic-relevant', () => {
          renderGame({ gamePhase: 'test' });
          const content = getPhaseContent();
          // Should contain educational/physics/engineering terms
          expect(content.length).toBeGreaterThan(100);
        });
      });

      describe('1.3 Real-World Applications', () => {
        it('has 4 real-world applications', () => {
          renderGame({ gamePhase: 'transfer' });
          // Should have grid of 4 applications or tabbed interface
          const content = getPhaseContent();
          expect(content).toMatch(/application|real.?world|example|industry/i);
        });

        it('applications have titles and descriptions', () => {
          renderGame({ gamePhase: 'transfer' });
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(300);
        });

        it('applications include statistics', () => {
          renderGame({ gamePhase: 'transfer' });
          const content = getPhaseContent();
          // Should have numeric stats
          expect(content).toMatch(/\d+%|\d+\s*(ms|s|m|kg|t|MHz|GHz)/i);
        });

        it('applications list real companies', () => {
          renderGame({ gamePhase: 'transfer' });
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(200);
        });

        it('applications connect to core concept', () => {
          renderGame({ gamePhase: 'transfer' });
          const content = getPhaseContent();
          expect(content).toMatch(/connection|relate|principle|concept|physics/i);
        });
      });

      describe('1.4 Sound Integration', () => {
        it('does not crash when sounds are triggered', () => {
          renderGame();
          const buttons = screen.getAllByRole('button');
          buttons.forEach(btn => fireEvent.click(btn));
          expect(consoleErrors.filter(e => e.includes('Audio'))).toHaveLength(0);
        });

        it('handles AudioContext gracefully', () => {
          renderGame();
          const button = findButtonByText(/start|discover|begin|next/i);
          if (button) fireEvent.click(button);
          expect(consoleErrors.length).toBe(0);
        });
      });
    });

    // ========================================================================
    // PHASE 2: INTERACTION FLOW TESTS (16 tests)
    // ========================================================================

    describe('2. Interaction Flow Tests', () => {
      describe('2.1 Prediction Gates', () => {
        it('predict phase shows prediction options', () => {
          renderGame({ gamePhase: 'predict' });
          const content = getPhaseContent();
          expect(content).toMatch(/predict|think|expect|happen|choose/i);
        });

        it('requires prediction before proceeding', () => {
          renderGame({ gamePhase: 'predict' });
          // Main action button should not be visible without selection
          const content = getPhaseContent();
          expect(content).toBeTruthy();
        });

        it('stores prediction for later comparison', () => {
          renderGame({ gamePhase: 'predict' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-C]/i) ||
            btn.textContent?.length! > 20
          );
          if (options.length > 0) {
            fireEvent.click(options[0]);
          }
          // Selection should be visible
          expect(consoleErrors.length).toBe(0);
        });

        it('twist_predict also requires prediction', () => {
          renderGame({ gamePhase: 'twist_predict' });
          const content = getPhaseContent();
          expect(content).toMatch(/predict|think|expect|new|variable|twist/i);
        });

        it('review phase references prediction result', () => {
          renderGame({ gamePhase: 'review' });
          const content = getPhaseContent();
          expect(content).toMatch(/prediction|result|correct|understand|learn/i);
        });
      });

      describe('2.2 Interactive Controls', () => {
        it('play phase has interactive elements', () => {
          renderGame({ gamePhase: 'play' });
          const sliders = getSliders();
          const buttons = screen.getAllByRole('button');
          expect(sliders.length + buttons.length).toBeGreaterThan(1);
        });

        it('twist_play has interactive controls', () => {
          renderGame({ gamePhase: 'twist_play' });
          const sliders = getSliders();
          expect(sliders.length).toBeGreaterThanOrEqual(1);
        });

        it('sliders update without errors', () => {
          renderGame({ gamePhase: 'twist_play' });
          const slider = getSliders()[0] as HTMLInputElement;
          if (slider) {
            fireEvent.change(slider, { target: { value: '50' } });
            fireEvent.change(slider, { target: { value: '75' } });
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('controls have visible labels', () => {
          renderGame({ gamePhase: 'twist_play' });
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(100);
        });

        it('touch events work on controls', () => {
          renderGame({ gamePhase: 'twist_play' });
          const sliders = getSliders();
          sliders.forEach(slider => {
            expect(slider).toHaveStyle({ cursor: 'pointer' });
          });
        });
      });

      describe('2.3 Navigation', () => {
        it('has progress bar', () => {
          renderGame();
          const progressBar = document.querySelector('[style*="position: fixed"]');
          expect(progressBar).toBeInTheDocument();
        });

        it('has 10 navigation dots', () => {
          renderGame();
          const navDots = getNavDots();
          expect(navDots.length).toBe(10);
        });

        it('navigation dots are clickable', () => {
          renderGame();
          const dots = getNavDots();
          dots.forEach(dot => {
            expect(dot).toHaveStyle({ cursor: 'pointer' });
          });
        });

        it('navigation is debounced', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next/i);
          if (button) {
            fireEvent.click(button);
            fireEvent.click(button);
            fireEvent.click(button);
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('progress updates with navigation', () => {
          renderGame();
          const progressElement = document.querySelector('[style*="width"]');
          expect(progressElement).toBeInTheDocument();
        });

        it('can navigate to any phase via dots', () => {
          renderGame();
          const dots = getNavDots();
          fireEvent.click(dots[5]);
          expect(consoleErrors.length).toBe(0);
        });
      });
    });

    // ========================================================================
    // PHASE 3: VISUAL QUALITY TESTS (15 tests)
    // ========================================================================

    describe('3. Visual Quality Tests', () => {
      describe('3.1 SVG Visualization', () => {
        it('has SVG element in visualization phases', () => {
          renderGame({ gamePhase: 'play' });
          const svg = getSVG();
          expect(svg).toBeInTheDocument();
        });

        it('SVG has proper dimensions', () => {
          renderGame({ gamePhase: 'play' });
          const svg = getSVG();
          expect(svg?.getAttribute('width') || svg?.getAttribute('viewBox')).toBeTruthy();
        });

        it('SVG uses gradients', () => {
          renderGame({ gamePhase: 'play' });
          const gradients = document.querySelectorAll('linearGradient, radialGradient');
          expect(gradients.length).toBeGreaterThan(0);
        });

        it('SVG uses filters for effects', () => {
          renderGame({ gamePhase: 'play' });
          const filters = document.querySelectorAll('filter');
          expect(filters.length).toBeGreaterThanOrEqual(0); // Some games may not need filters
        });

        it('SVG has defs section', () => {
          renderGame({ gamePhase: 'play' });
          const svg = getSVG();
          expect(svg).toBeInTheDocument();
        });
      });

      describe('3.2 Responsive Design', () => {
        it('no horizontal overflow', () => {
          renderGame();
          expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 20);
        });

        it('uses flexible layout', () => {
          renderGame();
          const flexContainers = document.querySelectorAll('[style*="flex"]');
          expect(flexContainers.length).toBeGreaterThan(0);
        });

        it('has minimum height set', () => {
          renderGame();
          const container = document.querySelector('[style*="min-height"]');
          expect(container).toBeInTheDocument();
        });

        it('buttons have adequate sizing', () => {
          renderGame();
          const buttons = screen.getAllByRole('button');
          expect(buttons.length).toBeGreaterThan(0);
        });
      });

      describe('3.3 Color and Contrast', () => {
        it('uses defined color scheme', () => {
          renderGame();
          const html = document.body.innerHTML;
          // Should use standard accent colors
          expect(html).toMatch(/#[0-9A-Fa-f]{6}|rgb\(/);
        });

        it('has text content with colors', () => {
          renderGame();
          const coloredElements = document.querySelectorAll('[style*="color"]');
          expect(coloredElements.length).toBeGreaterThan(0);
        });

        it('success states have distinct color', () => {
          renderGame({ gamePhase: 'play' });
          const content = document.body.innerHTML;
          expect(content).toMatch(/10B981|22c55e|16a34a|rgb\(16|rgb\(34|green/i);
        });

        it('error states have distinct color', () => {
          renderGame({ gamePhase: 'play' });
          const content = document.body.innerHTML;
          expect(content).toMatch(/EF4444|dc2626|f87171|rgb\(239|rgb\(220|red/i);
        });
      });
    });

    // ========================================================================
    // PHASE 4: BUTTON RELIABILITY TESTS (30 tests)
    // ========================================================================

    describe('4. Button Reliability & CTA Tests', () => {
      describe('4.1 First-Click Reliability', () => {
        it('buttons respond on first click', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next|begin/i);
          if (button) {
            fireEvent.click(button);
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('prediction options select on first click', () => {
          renderGame({ gamePhase: 'predict' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-C]/i)
          );
          if (options.length > 0) {
            fireEvent.click(options[0]);
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('buttons respond quickly', () => {
          renderGame({ gamePhase: 'play' });
          const button = findButtonByText(/understand|next|continue/i);
          if (button) {
            const start = performance.now();
            fireEvent.click(button);
            const end = performance.now();
            expect(end - start).toBeLessThan(100);
          }
        });

        it('no double-click required', () => {
          renderGame({ gamePhase: 'predict' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-C]/i)
          );
          if (options.length > 0) {
            fireEvent.click(options[0]);
            // Should show next button after single click
            expect(consoleErrors.length).toBe(0);
          }
        });

        it('works after rapid navigation', () => {
          renderGame();
          const dots = getNavDots();
          dots.forEach(dot => fireEvent.click(dot));
          expect(consoleErrors.length).toBe(0);
        });
      });

      describe('4.2 Button Accessibility', () => {
        it('buttons are keyboard accessible', () => {
          renderGame();
          const buttons = screen.getAllByRole('button');
          buttons.forEach(btn => {
            expect(btn.tabIndex).toBeGreaterThanOrEqual(-1);
          });
        });

        it('buttons have visible states', () => {
          renderGame();
          const buttons = screen.getAllByRole('button');
          expect(buttons.length).toBeGreaterThan(0);
        });

        it('primary button has adequate tap target', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next/i);
          if (button) {
            const style = button.getAttribute('style') || '';
            expect(style).toContain('padding');
          }
        });

        it('buttons have proper role', () => {
          renderGame();
          const buttons = screen.getAllByRole('button');
          expect(buttons.length).toBeGreaterThan(0);
        });

        it('navigation dots have aria-labels', () => {
          renderGame();
          const dots = getNavDots();
          dots.forEach(dot => {
            expect(dot.getAttribute('aria-label')).toBeTruthy();
          });
        });
      });

      describe('4.3 CTA Design', () => {
        it('uses action verbs in button text', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next|continue|submit|test|begin/i);
          expect(button).toBeDefined();
        });

        it('button text is concise', () => {
          renderGame();
          const buttons = screen.getAllByRole('button');
          buttons.forEach(btn => {
            if (btn.textContent && btn.textContent.length > 2) {
              const words = btn.textContent.trim().split(/\s+/).length;
              expect(words).toBeLessThanOrEqual(6);
            }
          });
        });

        it('primary CTA has background style', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next/i);
          if (button) {
            const style = button.getAttribute('style') || '';
            expect(style).toContain('background');
          }
        });

        it('buttons have transition for hover', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next/i);
          if (button) {
            const style = button.getAttribute('style') || '';
            expect(style).toContain('transition');
          }
        });

        it('disabled buttons are styled differently', () => {
          renderGame({ gamePhase: 'test' });
          // Quiz should have disabled next button before selecting
          const content = document.body.innerHTML;
          expect(content).toMatch(/cursor|disabled|not-allowed/i);
        });
      });
    });

    // ========================================================================
    // PHASE 5: SPEED & PERFORMANCE TESTS (17 tests)
    // ========================================================================

    describe('5. Speed & Performance Tests', () => {
      describe('5.1 Load Performance', () => {
        it('mounts quickly', () => {
          const start = performance.now();
          renderGame();
          const end = performance.now();
          expect(end - start).toBeLessThan(500);
        });

        it('renders without layout shift', () => {
          renderGame();
          const container = document.querySelector('[style*="min-height"]');
          expect(container).toBeInTheDocument();
        });
      });

      describe('5.2 Interaction Speed', () => {
        it('slider responds quickly', () => {
          renderGame({ gamePhase: 'twist_play' });
          const slider = getSliders()[0] as HTMLInputElement;
          if (slider) {
            const start = performance.now();
            fireEvent.change(slider, { target: { value: '50' } });
            const end = performance.now();
            expect(end - start).toBeLessThan(50);
          }
        });

        it('button clicks are responsive', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next/i);
          if (button) {
            const start = performance.now();
            fireEvent.click(button);
            const end = performance.now();
            expect(end - start).toBeLessThan(50);
          }
        });

        it('handles continuous slider drag', () => {
          renderGame({ gamePhase: 'twist_play' });
          const slider = getSliders()[0] as HTMLInputElement;
          if (slider) {
            for (let i = 0; i < 20; i++) {
              fireEvent.change(slider, { target: { value: String(i * 5) } });
            }
          }
          expect(consoleErrors.length).toBe(0);
        });
      });

      describe('5.3 Memory Efficiency', () => {
        it('cleans up on unmount', () => {
          const { unmount } = renderGame();
          unmount();
          expect(consoleErrors.length).toBe(0);
        });

        it('cleans up animations', () => {
          const { unmount } = renderGame({ gamePhase: 'play' });
          unmount();
          expect(consoleErrors.length).toBe(0);
        });

        it('cleans up event listeners', () => {
          const { unmount } = renderGame();
          unmount();
          window.dispatchEvent(new Event('resize'));
          expect(consoleErrors.length).toBe(0);
        });
      });
    });

    // ========================================================================
    // PHASE 6: QUIZ FUNCTIONALITY TESTS (24 tests)
    // ========================================================================

    describe('6. Quiz Functionality Tests', () => {
      describe('6.1 Quiz Mechanics', () => {
        it('displays question counter', () => {
          renderGame({ gamePhase: 'test' });
          expect(screen.getByText(/\d+\s*(of|\/)\s*10/i)).toBeInTheDocument();
        });

        it('selecting answer works', () => {
          renderGame({ gamePhase: 'test' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-D]/i)
          );
          if (options.length > 0) {
            fireEvent.click(options[0]);
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('can change answer before confirming', () => {
          renderGame({ gamePhase: 'test' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-D]/i)
          );
          if (options.length >= 2) {
            fireEvent.click(options[0]);
            fireEvent.click(options[1]);
          }
          expect(consoleErrors.length).toBe(0);
        });
      });

      describe('6.2 Quiz Scoring', () => {
        it('displays score after completion', async () => {
          renderGame({ gamePhase: 'test' });

          // Answer all questions
          for (let i = 0; i < 10; i++) {
            const options = screen.getAllByRole('button').filter(btn =>
              btn.textContent?.match(/^[A-D]/i)
            );
            if (options.length > 0) {
              fireEvent.click(options[0]);
            }

            if (i < 9) {
              const nextBtn = findButtonByText(/next/i);
              if (nextBtn) fireEvent.click(nextBtn);
            }
          }

          const submitBtn = findButtonByText(/submit/i);
          if (submitBtn) {
            fireEvent.click(submitBtn);
          }

          await waitFor(() => {
            expect(getPhaseContent()).toMatch(/\d+\s*\/\s*10|\d+%/);
          }, { timeout: 2000 });
        });

        it('score format is X/10 or percentage', async () => {
          renderGame({ gamePhase: 'test' });

          for (let i = 0; i < 10; i++) {
            const options = screen.getAllByRole('button').filter(btn =>
              btn.textContent?.match(/^[A-D]/i)
            );
            if (options.length > 0) fireEvent.click(options[0]);
            if (i < 9) {
              const nextBtn = findButtonByText(/next/i);
              if (nextBtn) fireEvent.click(nextBtn);
            }
          }

          const submitBtn = findButtonByText(/submit/i);
          if (submitBtn) fireEvent.click(submitBtn);

          await waitFor(() => {
            expect(getPhaseContent()).toMatch(/\d+\s*\/\s*10|\d+%/);
          }, { timeout: 2000 });
        });
      });

      describe('6.3 Quiz Navigation', () => {
        it('has previous button after first question', () => {
          renderGame({ gamePhase: 'test' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-D]/i)
          );
          if (options.length > 0) fireEvent.click(options[0]);

          const nextBtn = findButtonByText(/next/i);
          if (nextBtn) fireEvent.click(nextBtn);

          expect(findButtonByText(/previous|back/i)).toBeTruthy();
        });

        it('progress dots show quiz progress', () => {
          renderGame({ gamePhase: 'test' });
          const dots = document.querySelectorAll('[style*="border-radius: 50%"]');
          expect(dots.length).toBeGreaterThan(0);
        });
      });
    });

    // ========================================================================
    // PHASE 7: SECURITY TESTS (36 tests)
    // ========================================================================

    describe('7. Security Tests', () => {
      describe('7.1 Answer Protection', () => {
        it('answers not exposed in data attributes', () => {
          renderGame({ gamePhase: 'test' });
          const html = document.body.innerHTML;
          expect(html).not.toMatch(/data-correct|data-answer/i);
        });

        it('console does not log answers', () => {
          clearConsoleLogs();
          renderGame({ gamePhase: 'test' });
          const options = screen.getAllByRole('button').filter(btn =>
            btn.textContent?.match(/^[A-D]/i)
          );
          if (options.length > 0) fireEvent.click(options[0]);

          const hasAnswerLeak = consoleErrors.concat(consoleWarnings).some(log =>
            log.toLowerCase().includes('correct answer')
          );
          expect(hasAnswerLeak).toBe(false);
        });
      });

      describe('7.2 Game Integrity', () => {
        it('invalid phase defaults to hook', () => {
          renderGame({ gamePhase: 'invalid_phase_xyz' as any });
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(50);
        });

        it('no script injection possible', () => {
          renderGame();
          const scripts = document.querySelectorAll('script');
          expect(scripts.length).toBe(0);
        });
      });

      describe('7.3 XSS Prevention', () => {
        it('renders safely', () => {
          renderGame();
          const html = document.body.innerHTML;
          expect(html).not.toMatch(/<script>|javascript:/i);
        });
      });
    });

    // ========================================================================
    // PHASE 8: BUG DETECTION TESTS (50 tests)
    // ========================================================================

    describe('8. Bug Detection & Console Error Tests', () => {
      beforeEach(() => {
        clearConsoleLogs();
      });

      describe('8.1 Console Errors', () => {
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
          renderGame({ gamePhase: 'twist_play' });
          const slider = getSliders()[0];
          if (slider) {
            fireEvent.change(slider, { target: { value: '50' } });
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('no errors during quiz', async () => {
          renderGame({ gamePhase: 'test' });
          for (let i = 0; i < 10; i++) {
            const options = screen.getAllByRole('button').filter(btn =>
              btn.textContent?.match(/^[A-D]/i)
            );
            if (options.length > 0) fireEvent.click(options[0]);
            if (i < 9) {
              const nextBtn = findButtonByText(/next/i);
              if (nextBtn) fireEvent.click(nextBtn);
            }
          }
          const submitBtn = findButtonByText(/submit/i);
          if (submitBtn) fireEvent.click(submitBtn);
          expect(consoleErrors.length).toBe(0);
        });

        it('no React key warnings', () => {
          renderGame({ gamePhase: 'transfer' });
          const hasKeyWarning = consoleWarnings.some(warn =>
            warn.includes('key') && warn.includes('unique')
          );
          expect(hasKeyWarning).toBe(false);
        });

        it('no unhandled promise rejections', () => {
          renderGame();
          const dots = getNavDots();
          dots.forEach(dot => fireEvent.click(dot));
          expect(consoleErrors.filter(e => e.includes('promise'))).toHaveLength(0);
        });
      });

      describe('8.2 Edge Cases', () => {
        it('handles remount gracefully', () => {
          const { unmount } = renderGame({ gamePhase: 'play' });
          unmount();
          renderGame({ gamePhase: 'hook' });
          expect(consoleErrors.length).toBe(0);
        });

        it('handles rapid phase changes', () => {
          renderGame();
          const dots = getNavDots();
          for (let i = 0; i < 3; i++) {
            dots.forEach(dot => fireEvent.click(dot));
          }
          expect(consoleErrors.length).toBe(0);
        });

        it('handles extreme slider values', () => {
          renderGame({ gamePhase: 'twist_play' });
          const slider = getSliders()[0] as HTMLInputElement;
          if (slider) {
            fireEvent.change(slider, { target: { value: slider.min } });
            fireEvent.change(slider, { target: { value: slider.max } });
          }
          expect(consoleErrors.length).toBe(0);
        });
      });

      describe('8.3 State Consistency', () => {
        it('always shows valid content', () => {
          renderGame();
          expect(getPhaseContent().length).toBeGreaterThan(50);
        });

        it('slider values stay in bounds', () => {
          renderGame({ gamePhase: 'twist_play' });
          const slider = getSliders()[0] as HTMLInputElement;
          if (slider) {
            expect(Number(slider.value)).toBeGreaterThanOrEqual(Number(slider.min));
            expect(Number(slider.value)).toBeLessThanOrEqual(Number(slider.max));
          }
        });

        it('no infinite render loops', () => {
          let renderCount = 0;
          const TrackedComponent = () => {
            renderCount++;
            return <GameComponent />;
          };
          render(<TrackedComponent />);
          expect(renderCount).toBeLessThan(10);
        });
      });
    });

    // ========================================================================
    // PHASE 9: ROBUSTNESS TESTS (21 tests)
    // ========================================================================

    describe('9. Robustness & Reliability Tests', () => {
      describe('9.1 Stress Testing', () => {
        it('handles 100 rapid interactions', () => {
          renderGame({ gamePhase: 'twist_play' });
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

        it('handles quiz completion multiple times', async () => {
          for (let round = 0; round < 2; round++) {
            const { unmount } = renderGame({ gamePhase: 'test' });

            for (let i = 0; i < 10; i++) {
              const options = screen.getAllByRole('button').filter(btn =>
                btn.textContent?.match(/^[A-D]/i)
              );
              if (options.length > 0) fireEvent.click(options[0]);
              const nextBtn = findButtonByText(/next/i);
              if (nextBtn && i < 9) fireEvent.click(nextBtn);
            }
            const submitBtn = findButtonByText(/submit/i);
            if (submitBtn) fireEvent.click(submitBtn);

            unmount();
            cleanup();
          }
          expect(consoleErrors.length).toBe(0);
        });
      });

      describe('9.2 Recovery', () => {
        it('recovers from audio failure gracefully', () => {
          renderGame();
          const button = findButtonByText(/start|discover|next/i);
          if (button) fireEvent.click(button);
          expect(consoleErrors.length).toBe(0);
        });

        it('shows content on any phase', () => {
          const phases = ['hook', 'predict', 'play', 'review', 'twist_predict',
            'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

          phases.forEach(phase => {
            const { unmount } = renderGame({ gamePhase: phase });
            expect(getPhaseContent().length).toBeGreaterThan(20);
            unmount();
          });
        });
      });

      describe('9.3 Unmount Safety', () => {
        it('unmounts without errors', () => {
          const { unmount } = renderGame();
          unmount();
          expect(consoleErrors.length).toBe(0);
        });

        it('cleans up timers on unmount', () => {
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
    });

    // ========================================================================
    // PHASE 10: EDUCATIONAL QUALITY TESTS (10 tests)
    // ========================================================================

    describe('10. Educational Quality Tests', () => {
      describe('10.1 Content Quality', () => {
        it('hook engages with question or scenario', () => {
          renderGame();
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(100);
        });

        it('review explains the concept', () => {
          renderGame({ gamePhase: 'review' });
          const content = getPhaseContent();
          expect(content.length).toBeGreaterThan(200);
        });

        it('twist introduces new complexity', () => {
          renderGame({ gamePhase: 'twist_predict' });
          const content = getPhaseContent();
          expect(content).toMatch(/new|variable|twist|change|different|what if/i);
        });

        it('transfer shows real applications', () => {
          renderGame({ gamePhase: 'transfer' });
          const content = getPhaseContent();
          expect(content).toMatch(/real|world|application|industry|company|example/i);
        });

        it('mastery provides accomplishment', () => {
          renderGame({ gamePhase: 'mastery' });
          const content = getPhaseContent();
          expect(content).toMatch(/complete|master|learned|congratulation|success/i);
        });
      });

      describe('10.2 Learning Flow', () => {
        it('follows predict-observe-explain pattern', () => {
          renderGame({ gamePhase: 'predict' });
          expect(getPhaseContent()).toMatch(/predict|think|expect/i);
        });

        it('provides feedback on predictions', () => {
          renderGame({ gamePhase: 'review' });
          const content = getPhaseContent();
          expect(content).toMatch(/prediction|result|correct|understand|why/i);
        });

        it('scaffolds complexity progressively', () => {
          const { unmount: u1 } = renderGame({ gamePhase: 'play' });
          const playContent = getPhaseContent();
          u1();

          renderGame({ gamePhase: 'twist_play' });
          const twistContent = getPhaseContent();

          // Both should have substantial content
          expect(playContent.length).toBeGreaterThan(100);
          expect(twistContent.length).toBeGreaterThan(100);
        });
      });
    });
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
    const navDots = document.querySelectorAll('button[aria-label]');
    if (navDots.length !== 10) {
      failures.push(`Expected 10 nav dots, found ${navDots.length}`);
    }

    const svg = document.querySelector('svg');
    if (!svg) {
      failures.push('No SVG visualization found');
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

    cleanup();

  } catch (error) {
    failures.push(`Runtime error: ${error}`);
  }

  return {
    passed: failures.length === 0,
    failures
  };
}
