/**
 * ============================================================================
 * GAME TDD TEST TEMPLATE
 * ============================================================================
 *
 * HOW TO USE:
 * 1. Copy this file and rename it to YourGameRenderer.test.tsx
 * 2. Replace "YourGameRenderer" with your actual game component name
 * 3. Update the import path to point to your component
 * 4. Run: npm run test:run -- tests/games/YourGameRenderer.test.tsx
 *
 * This will run ALL 108 test cases against your game, validating:
 * - 10-phase structure (hook → predict → play → review → twist_predict →
 *   twist_play → twist_review → transfer → test → mastery)
 * - 10 test questions with proper format
 * - 4 real-world applications
 * - Interactive controls (sliders, buttons)
 * - Visual quality (SVG, responsive design, colors)
 * - Button reliability (first-click, accessibility, CTAs)
 * - Performance (load time, interaction speed)
 * - Quiz functionality (mechanics, scoring)
 * - Security (answer protection, XSS prevention)
 * - Bug detection (console errors, edge cases)
 * - Educational quality (content, learning flow)
 *
 * ============================================================================
 */

// ===== STEP 1: Import your game component =====
import YourGameRenderer from '../../components/YourGameRenderer';

// ===== STEP 2: Import the test factory =====
import { createGameTestSuite } from '../utils/game-test-factory';

// ===== STEP 3: Run the test suite =====
createGameTestSuite('YourGameRenderer', YourGameRenderer);

/**
 * ============================================================================
 * QUICK VALIDATION (Optional)
 * ============================================================================
 *
 * If you just want a quick pass/fail check without running all 108 tests,
 * you can use quickValidateGame() instead:
 *
 * import { quickValidateGame } from '../utils/game-test-factory';
 *
 * describe('Quick Validation', () => {
 *   it('passes basic validation', () => {
 *     const result = quickValidateGame('YourGameRenderer', YourGameRenderer);
 *     console.log('Failures:', result.failures);
 *     expect(result.passed).toBe(true);
 *   });
 * });
 *
 * ============================================================================
 */
