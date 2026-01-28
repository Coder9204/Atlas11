# Game Evaluation System

> **Purpose**: Systematically evaluate whether a game meets all quality requirements.
> A game must score **90%+ overall** and **100% on Critical items** to be considered production-ready.

---

## Quick Reference: Evaluation Categories

| Category | Weight | Pass Threshold | Critical? |
|----------|--------|----------------|-----------|
| A. Structure & Flow | 10% | 100% | YES |
| B. Interactive Graphics | 15% | 90% | YES |
| B.5 **Slider UX** | 10% | 100% | **YES** |
| B.6 **Visual Clarity & Layout** | 10% | 100% | **YES** |
| C. Clarity & Understanding | 10% | 90% | YES |
| D. Responsive Design & Zoom | 10% | 100% | YES |
| D.4 **Zoom & Scale** | 5% | 100% | **YES** |
| E. Button & Control Reliability | 5% | 100% | YES |
| F. Design Quality | 5% | 85% | NO |
| G. Educational Effectiveness | 5% | 85% | NO |
| H. **Transfer Phase Richness** | 10% | 100% | **YES** |
| K. **Educational Clarity** | 5% | 100% | **YES** |
| L. **Responsive Layout** | 5% | 100% | **YES** |
| M. **Text Contrast & Visibility** | 5% | 100% | **YES** |
| N. **Above-The-Fold Content** | 5% | 100% | **YES** |
| O. **Legend Completeness** | 5% | 100% | **YES** |
| P. **Transfer Phase Progress** | 5% | 100% | **YES** |
| Q. **Test Phase Clarity** | 5% | 100% | **YES** |

### New Critical Categories (Added)

| New Category | Why Critical? |
|--------------|---------------|
| **B.5 Slider UX** | Sliders are the PRIMARY interaction method. Laggy, confusing, or unclear sliders destroy the learning experience. |
| **B.6 Visual Clarity & Layout** | If users can't instantly understand WHAT they're looking at, WHERE to focus, and WHAT to adjust, the simulation fails before they even start. Text over graphics, crowded layouts, and unclear hierarchy make learning impossible. |
| **D.4 Zoom & Scale** | Users should NEVER need to manually zoom to see content. Content must be readable at default zoom on all devices. |
| **H. Transfer Phase Richness** | Real-world applications must be DETAILED with diagrams, statistics, and examples - not shallow text-only summaries. Apps must unlock SEQUENTIALLY (🔒 locked apps). All 4 required before test unlocks. |
| **I. Local Answer Validation** | Test questions use `correct: true` marker on options. NO Firebase dependency. Validation happens client-side. |
| **J. Navigation Accessibility** | EVERY phase MUST have a clearly visible, always-accessible navigation button. FIXED footer (not sticky). Users must NEVER be stuck without a way to proceed. |
| **K. Educational Clarity** | EVERY graphic must have a legend, labeled objects, explained formulas, and "What to Watch" guidance. Users must instantly understand what they're looking at. |
| **L. Responsive Layout** | Content must scroll properly, bottom bar always visible, graphics scale to screen size. Works on mobile (375px), tablet (768px), desktop (1280px). |
| **M. Text Contrast & Visibility** | ALL text must be immediately readable. No faint gray text. Formula variables must be BRIGHT and BOLD. Primary text = white (#f8fafc), secondary = light (#e2e8f0). |
| **N. Above-The-Fold Content** | ALL educational content (What to Watch, formula breakdowns, explanations) MUST appear ABOVE the continue button. Users should never miss important info. |
| **O. Legend Completeness** | EVERY element in graphic (battery, magnets, wires, field lines) MUST be in legend. Legend must NOT overlap graphic elements. |
| **P. Transfer Phase Progress** | Each Real World Application MUST have a prominent "Got It! Continue →" button. Full-width, gradient, 52px height, visible without scrolling. |
| **Q. Test Phase Clarity** | Test must show question number, progress dots, clear selection state. After answer: show explanation, green ✓ for correct, red ✗ for wrong. Navigation buttons must be prominent. |

---

### K. Educational Clarity (CRITICAL - 100% Required)

> **If users don't understand what they're looking at, they can't learn.** Every element must be explained.

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| K.1 | **Legend panel** visible showing what each color/shape represents | | |
| K.2 | **Every object labeled** directly in the graphic (not just legend) | | |
| K.3 | **Formulas have breakdowns** explaining each variable with color coding | | |
| K.4 | **"What to Watch"** callout tells users exactly what to observe | | |
| K.5 | **Slider labels** clearly state what they control | | |
| K.6 | **Slider effect** explained (e.g., "↑ Current = ↑ Field strength") | | |
| K.7 | **Current value** prominently displayed next to slider | | |
| K.8 | **Test correct answer** clearly highlighted with green + checkmark | | |

---

### M. Text Contrast & Visibility (CRITICAL - 100% Required)

> **If users can't read it without squinting, it FAILS.** All text must be immediately readable.

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| M.1 | **Primary text** uses `#f8fafc` or brighter on dark backgrounds | | |
| M.2 | **Secondary text** uses `#e2e8f0` minimum (NOT `#94a3b8` or darker) | | |
| M.3 | **Taglines/subtitles** are clearly visible (not faint gray) | | |
| M.4 | **Formula variables** use BRIGHT colors (`#60a5fa`, `#4ade80`, `#fbbf24`) | | |
| M.5 | **Formula variables** are bold (`fontWeight: 700`) | | |
| M.6 | **SVG labels** use `fontSize: 12` minimum, white or bright fill | | |
| M.7 | **Battery/component values** (1.5V, 10A) are clearly readable | | |
| M.8 | **No squint test**: All text readable at arm's length | | |

#### Contrast Check Protocol:
```bash
# TEST: Open game on mobile (375px), check each text element:
#
# 1. Tagline/subtitle under title - readable without effort?
# 2. Formula in graphic - each variable clearly visible?
# 3. Legend items - all text readable against dark bg?
# 4. Slider labels - what it controls is obvious?
# 5. Explanatory text - no faint gray paragraphs?
#
# If ANY text requires effort to read → FAIL
```

---

### N. Above-The-Fold Content (CRITICAL - 100% Required)

> **Users should NEVER need to scroll past the button to find important information.**

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| N.1 | **"What to Watch"** appears ABOVE the continue button | | |
| N.2 | **Formula breakdown** appears ABOVE the continue button | | |
| N.3 | **Key explanations** appear ABOVE the continue button | | |
| N.4 | **Legend** is visible without scrolling (within viewport) | | |
| N.5 | **No educational content** below the continue button | | |
| N.6 | **Continue button** is the LAST interactive element on page | | |

#### Test Protocol:
```bash
# For each phase with educational content:
# 1. Open on mobile (375px)
# 2. Scroll to the continue button
# 3. Check: Is there ANY important text BELOW the button?
# 4. If YES → FAIL
```

---

### O. Legend Completeness (CRITICAL - 100% Required)

> **Every single element in the graphic MUST be explained in the legend.**

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| O.1 | **Battery** included with voltage value (e.g., "AA Battery (1.5V)") | | |
| O.2 | **Magnets** included with pole labels (N/S) | | |
| O.3 | **Wires** included with material if relevant | | |
| O.4 | **Field lines** included (magnetic/electric) | | |
| O.5 | **Arrows/direction indicators** explained | | |
| O.6 | **All colors** in graphic have matching legend entry | | |
| O.7 | **Legend does NOT overlap** any graphic element | | |
| O.8 | **Legend position** is in corner with most empty space | | |

#### Completeness Check:
```bash
# 1. List every distinct visual element in the SVG
# 2. Check each one against legend entries
# 3. Missing ANY element → FAIL
#
# Common misses:
# - Battery (often shown but not in legend)
# - Voltage/current values
# - Direction arrows
# - Background elements (if educational)
```

---

### P. Transfer Phase Progress (CRITICAL - 100% Required)

> **Each Real World Application MUST have a clear, prominent continue button.**

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| P.1 | **"Got It! Continue →"** button at bottom of each app | | |
| P.2 | **Button is full-width** or nearly full-width | | |
| P.3 | **Button height** minimum 52px | | |
| P.4 | **Button font** minimum 16px, bold | | |
| P.5 | **Button uses gradient** background (not flat color) | | |
| P.6 | **Progress shown** ("App 1 of 4", "App 2 of 4") | | |
| P.7 | **Completed apps** show green checkmark on tab | | |
| P.8 | **"Take the Test →"** button appears after all 4 complete | | |
| P.9 | **Button visible** without scrolling on mobile | | |

---

### Q. Test Phase Clarity (CRITICAL - 100% Required)

> **Test navigation and feedback must be crystal clear. Users should never be confused.**

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| Q.1 | **Question number** prominently shown ("Question 3 of 10") | | |
| Q.2 | **Progress dots** show answered/current/unanswered | | |
| Q.3 | **Options clearly selectable** with visible selection state | | |
| Q.4 | **"Next Question →"** button is full-width, gradient, 52px height | | |
| Q.5 | **After answering - Correct**: Green glow + large ✓ + "Correct!" | | |
| Q.6 | **After answering - Wrong**: Red on wrong + green on correct + explanation | | |
| Q.7 | **Explanation shown** after each question (not just at end) | | |
| Q.8 | **Results screen**: Large score, pass/fail color, "Continue" button | | |
| Q.9 | **Button always visible** without scrolling | | |

#### Test Phase Visual Requirements:
```typescript
// Correct answer styling (REQUIRED):
{
  background: 'rgba(34, 197, 94, 0.15)',  // Green tint
  border: '2px solid #22c55e',
  boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'  // Green glow
}
// With large checkmark (24px+) and "✓ Correct!" label

// Wrong answer styling (REQUIRED):
{
  border: '2px solid #ef4444',  // Red border
}
// Show "✗" on wrong choice, highlight correct with green
// Display explanation below: "The correct answer: [option text]"
```

---

#### Required Legend Pattern:
```typescript
const legendItems = [
  { id: 'battery', color: '#fbbf24', label: 'AA Battery (1.5V)' },  // Include voltage!
  { id: 'wire', color: '#22c55e', label: 'Copper wire' },
  { id: 'magnet_n', color: '#ef4444', label: 'Magnet (N pole)' },
  { id: 'magnet_s', color: '#3b82f6', label: 'Magnet (S pole)' },
  { id: 'field', color: '#a855f7', label: 'Magnetic field lines' },
  { id: 'current', color: '#f97316', label: 'Current direction →' },
];
```

#### Required Formula Breakdown Pattern:
```
F = B × I × L   (Lorentz Force)
├── F (red, bold)    = Force on wire (what makes it spin)
├── B (blue, bold)   = Magnetic field strength
├── I (yellow, bold) = Current (from battery)
└── L (green, bold)  = Wire length in field
```

---

### L. Responsive Layout (CRITICAL - 100% Required)

> **Content must be accessible on ALL devices.** No hidden buttons, no cut-off content.

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| L.1 | Uses `height: 100dvh` (dynamic viewport height) | | |
| L.2 | Content area has `overflow-y: auto` for scrolling | | |
| L.3 | Content has `padding-bottom: 100px` for bottom bar space | | |
| L.4 | Bottom bar uses `position: fixed` (NOT sticky) | | |
| L.5 | SVG uses `viewBox` and scales properly | | |
| L.6 | SVG container has `aspectRatio` for consistent sizing | | |
| L.7 | Text sizes adapt (smaller on mobile) | | |
| L.8 | Tested on mobile (375px width) | | |
| L.9 | Tested on tablet (768px width) | | |
| L.10 | Tested on desktop (1280px width) | | |

#### Required Layout Structure:
```typescript
// Outer wrapper - full viewport, no scroll
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

  {/* Scrollable content */}
  <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
    {/* All content here */}
  </div>

  {/* FIXED bottom bar - always visible */}
  <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
    {/* Navigation buttons */}
  </div>
</div>
```

---

### J. Navigation Accessibility (CRITICAL - 100% Required)

> **Users must NEVER get stuck.** Every phase needs a clear, visible, accessible way to proceed.

| # | Criteria | Pass/Fail | Notes |
|---|----------|-----------|-------|
| J.1 | Bottom bar uses `position: fixed` (NOT sticky - fixed is more reliable) | | |
| J.2 | Bottom bar has `bottom: 0; left: 0; right: 0` | | |
| J.3 | Bottom bar has `zIndex: 1000` (high enough to stay on top) | | |
| J.4 | Bottom bar has shadow for visibility against content | | |
| J.5 | Content area has `paddingBottom: 100px` so nothing hidden behind bar | | |
| J.6 | Next button has minHeight: 52px, minWidth: 160px (easy to tap) | | |
| J.7 | When no selection made, show "Select an option above" hint | | |
| J.8 | Button text clearly describes next action | | |
| J.9 | Back button always visible (except hook phase) | | |

#### Required Bottom Bar Pattern:
```typescript
// FIXED position - ALWAYS visible regardless of scroll
<div style={{
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  minHeight: '72px',
  background: colors.bgCard,
  borderTop: `1px solid ${colors.border}`,
  boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
  padding: '16px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
  {/* Back button */}
  {/* Next button OR "Select an option" hint */}
</div>
```

---

# PART 1: AUTOMATED EVALUATIONS

These tests can be run programmatically before deployment.

## A1. Structure Validation Tests

```typescript
// File: tests/evals/structureEval.ts

interface StructureEvalResult {
  passed: boolean;
  score: number;
  failures: string[];
}

export const evaluateGameStructure = (gameComponent: React.ComponentType): StructureEvalResult => {
  const failures: string[] = [];
  let score = 0;
  const maxScore = 10;

  // A1.1: Has all 10 required phases
  const requiredPhases = [
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery'
  ];

  const componentSource = gameComponent.toString();
  const missingPhases = requiredPhases.filter(phase =>
    !componentSource.includes(`'${phase}'`) && !componentSource.includes(`"${phase}"`)
  );

  if (missingPhases.length === 0) {
    score += 2;
  } else {
    failures.push(`Missing phases: ${missingPhases.join(', ')}`);
  }

  // A1.2: Phase order is correct
  const phaseOrderRegex = /phaseOrder.*=.*\[([\s\S]*?)\]/;
  const match = componentSource.match(phaseOrderRegex);
  if (match) {
    const declaredOrder = match[1].replace(/['"]/g, '').split(',').map(s => s.trim());
    const isCorrectOrder = requiredPhases.every((phase, i) => declaredOrder[i] === phase);
    if (isCorrectOrder) {
      score += 1;
    } else {
      failures.push('Phase order is incorrect');
    }
  }

  // A1.3: Has prediction questions (minimum 2)
  const predictionCount = (componentSource.match(/prediction|predict/gi) || []).length;
  if (predictionCount >= 4) { // predict phase + twist_predict phase mentions
    score += 1;
  } else {
    failures.push('Missing prediction questions');
  }

  // A1.4: Has 10 test questions
  const testQuestionsMatch = componentSource.match(/testQuestions.*=.*\[([\s\S]*?)\];/);
  if (testQuestionsMatch) {
    const questionCount = (testQuestionsMatch[1].match(/question:/g) || []).length;
    if (questionCount >= 10) {
      score += 1;
    } else {
      failures.push(`Only ${questionCount} test questions (need 10)`);
    }
  } else {
    failures.push('No testQuestions array found');
  }

  // A1.5: Has 4 transfer applications
  const transferAppsMatch = componentSource.match(/transferApps|applications.*=.*\[([\s\S]*?)\];/);
  if (transferAppsMatch) {
    const appCount = (transferAppsMatch[0].match(/title:|name:/g) || []).length;
    if (appCount >= 4) {
      score += 1;
    } else {
      failures.push(`Only ${appCount} transfer apps (need 4)`);
    }
  }

  // A1.6: Has Return to Dashboard in mastery phase
  if (componentSource.includes('Return to Dashboard') || componentSource.includes('returnToDashboard')) {
    score += 1;
  } else {
    failures.push('Missing "Return to Dashboard" option in mastery phase');
  }

  // A1.7: Has Review Lesson option
  if (componentSource.includes('Review') || componentSource.includes('review')) {
    score += 1;
  } else {
    failures.push('Missing review lesson option');
  }

  // A1.8: Transfer apps unlock sequentially
  if (componentSource.includes('completedApps') || componentSource.includes('sequential')) {
    score += 1;
  } else {
    failures.push('Transfer apps may not unlock sequentially');
  }

  // A1.9: Has game event emissions
  if (componentSource.includes('onGameEvent') || componentSource.includes('emitGameEvent')) {
    score += 1;
  } else {
    failures.push('Missing game event emissions for AI coach');
  }

  return {
    passed: failures.length === 0,
    score: Math.round((score / maxScore) * 100),
    failures
  };
};
```

## A2. Responsive Design Tests

```typescript
// File: tests/evals/responsiveEval.ts

interface ViewportTest {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportTest[] = [
  { name: 'Mobile Small', width: 320, height: 568 },
  { name: 'Mobile Medium', width: 375, height: 667 },
  { name: 'Mobile Large', width: 414, height: 896 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Desktop Small', width: 1280, height: 800 },
  { name: 'Desktop Large', width: 1920, height: 1080 },
];

export const evaluateResponsiveDesign = async (
  page: Page, // Playwright/Puppeteer page
  gameUrl: string
): Promise<ResponsiveEvalResult> => {
  const failures: string[] = [];
  const results: Record<string, ViewportResult> = {};

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(gameUrl);
    await page.waitForLoadState('networkidle');

    const viewportResult = {
      horizontalScroll: false,
      textOverflow: false,
      touchTargetsTooSmall: false,
      fontTooSmall: false,
      elementsOverlapping: false,
      contentCutOff: false,
    };

    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasHorizontalScroll) {
      viewportResult.horizontalScroll = true;
      failures.push(`${viewport.name}: Horizontal scroll detected`);
    }

    // Check for text overflow
    const hasTextOverflow = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.scrollWidth > el.clientWidth && getComputedStyle(el).overflow !== 'hidden') {
          return true;
        }
      }
      return false;
    });
    if (hasTextOverflow) {
      viewportResult.textOverflow = true;
      failures.push(`${viewport.name}: Text overflow detected`);
    }

    // Check touch targets (mobile only)
    if (viewport.width < 768) {
      const smallTouchTargets = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"], input[type="range"]');
        const small: string[] = [];
        buttons.forEach((btn, i) => {
          const rect = btn.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            small.push(`Button ${i}: ${rect.width}x${rect.height}`);
          }
        });
        return small;
      });
      if (smallTouchTargets.length > 0) {
        viewportResult.touchTargetsTooSmall = true;
        failures.push(`${viewport.name}: Small touch targets: ${smallTouchTargets.join(', ')}`);
      }
    }

    // Check font sizes
    const smallFonts = await page.evaluate(() => {
      const MIN_FONT = 12;
      const elements = document.querySelectorAll('p, span, div, label, button');
      const small: string[] = [];
      elements.forEach((el) => {
        const fontSize = parseFloat(getComputedStyle(el).fontSize);
        if (fontSize < MIN_FONT && el.textContent?.trim()) {
          small.push(`"${el.textContent?.substring(0, 20)}..." at ${fontSize}px`);
        }
      });
      return small.slice(0, 5); // Return first 5 issues
    });
    if (smallFonts.length > 0) {
      viewportResult.fontTooSmall = true;
      failures.push(`${viewport.name}: Fonts too small: ${smallFonts.join(', ')}`);
    }

    results[viewport.name] = viewportResult;
  }

  const passedViewports = Object.values(results).filter(r =>
    !r.horizontalScroll && !r.textOverflow && !r.touchTargetsTooSmall &&
    !r.fontTooSmall && !r.elementsOverlapping && !r.contentCutOff
  ).length;

  return {
    passed: passedViewports === VIEWPORTS.length,
    score: Math.round((passedViewports / VIEWPORTS.length) * 100),
    failures,
    viewportResults: results
  };
};
```

## A3. Button Reliability Tests

```typescript
// File: tests/evals/buttonEval.ts

export const evaluateButtonReliability = async (
  page: Page,
  gameUrl: string
): Promise<ButtonEvalResult> => {
  const failures: string[] = [];
  let totalButtons = 0;
  let workingButtons = 0;

  await page.goto(gameUrl);

  // Test each phase's buttons
  const phases = ['hook', 'predict', 'play', 'review', 'transfer', 'test', 'mastery'];

  for (const phase of phases) {
    // Navigate to phase (may need custom logic per game)
    const buttons = await page.$$('button, [role="button"]');

    for (const button of buttons) {
      totalButtons++;
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();

      if (!isVisible) {
        failures.push(`Phase ${phase}: Hidden button found`);
        continue;
      }

      if (!isEnabled) {
        // Disabled buttons are OK, skip
        workingButtons++;
        continue;
      }

      // Test single click response
      const clickPromise = button.click();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Click timeout')), 500)
      );

      try {
        await Promise.race([clickPromise, timeoutPromise]);

        // Verify something happened (state change, navigation, etc.)
        // This is game-specific - simplified here
        workingButtons++;
      } catch (e) {
        failures.push(`Phase ${phase}: Button did not respond to single click`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    score: totalButtons > 0 ? Math.round((workingButtons / totalButtons) * 100) : 0,
    failures,
    totalButtons,
    workingButtons
  };
};
```

## A4. Accessibility Tests

```typescript
// File: tests/evals/accessibilityEval.ts

export const evaluateAccessibility = async (
  page: Page,
  gameUrl: string
): Promise<AccessibilityEvalResult> => {
  const failures: string[] = [];
  let score = 0;
  const maxScore = 10;

  await page.goto(gameUrl);

  // A4.1: Color contrast check
  const contrastIssues = await page.evaluate(() => {
    const issues: string[] = [];
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
      const style = getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const textColor = style.color;

      // Simplified contrast check (would use actual WCAG algorithm in production)
      if (bgColor && textColor && el.textContent?.trim()) {
        // Check if colors are too similar
        // This is a placeholder - real implementation would calculate contrast ratio
      }
    });

    return issues;
  });

  if (contrastIssues.length === 0) {
    score += 2;
  } else {
    failures.push(`Contrast issues: ${contrastIssues.join(', ')}`);
  }

  // A4.2: All interactive elements have focus states
  const focusableElements = await page.$$('button, input, [tabindex]');
  let hasFocusStates = true;

  for (const el of focusableElements) {
    await el.focus();
    const hasFocusVisible = await el.evaluate(e => {
      const style = getComputedStyle(e);
      return style.outline !== 'none' || style.boxShadow !== 'none';
    });
    if (!hasFocusVisible) {
      hasFocusStates = false;
      break;
    }
  }

  if (hasFocusStates) {
    score += 2;
  } else {
    failures.push('Some interactive elements lack focus states');
  }

  // A4.3: Labels exist for all inputs
  const unlabeledInputs = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    const unlabeled: string[] = [];

    inputs.forEach((input, i) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);

      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        unlabeled.push(`Input ${i}`);
      }
    });

    return unlabeled;
  });

  if (unlabeledInputs.length === 0) {
    score += 2;
  } else {
    failures.push(`Unlabeled inputs: ${unlabeledInputs.join(', ')}`);
  }

  // A4.4: Headings are in correct order
  const headingOrder = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    let issues: string[] = [];

    headings.forEach(h => {
      const level = parseInt(h.tagName[1]);
      if (level > lastLevel + 1) {
        issues.push(`Skipped from h${lastLevel} to h${level}`);
      }
      lastLevel = level;
    });

    return issues;
  });

  if (headingOrder.length === 0) {
    score += 2;
  } else {
    failures.push(`Heading order issues: ${headingOrder.join(', ')}`);
  }

  // A4.5: No auto-playing media without controls
  const autoplayMedia = await page.evaluate(() => {
    const media = document.querySelectorAll('video, audio');
    let autoplayWithoutControls = 0;

    media.forEach(m => {
      if (m.hasAttribute('autoplay') && !m.hasAttribute('controls')) {
        autoplayWithoutControls++;
      }
    });

    return autoplayWithoutControls;
  });

  if (autoplayMedia === 0) {
    score += 2;
  } else {
    failures.push(`${autoplayMedia} auto-playing media without controls`);
  }

  return {
    passed: score >= 8,
    score: Math.round((score / maxScore) * 100),
    failures
  };
};
```

---

# PART 2: MANUAL EVALUATION CHECKLISTS

These require human review and cannot be fully automated.

## B. Interactive Graphics Evaluation

### B1. Interactivity Checklist (Score each 0-2: 0=Missing, 1=Partial, 2=Complete)

```markdown
## Interactive Graphics Evaluation Form

Game Name: _____________________
Evaluator: _____________________
Date: _____________________

### B1. INTERACTIVITY (20 points max)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| B1.1 | Has at least 1 interactive control (slider, drag, button) | | |
| B1.2 | User can manipulate at least 1 physics variable | | |
| B1.3 | Changes happen in real-time (< 100ms) | | |
| B1.4 | Touch targets are >= 48x48px | | |
| B1.5 | Controls respond to both mouse and touch | | |
| B1.6 | Slider provides smooth, continuous feedback | | |
| B1.7 | Control state is clearly visible (current value) | | |
| B1.8 | Reset/default option available | | |
| B1.9 | Multiple controls don't conflict | | |
| B1.10 | Interaction feels natural and intuitive | | |

**Interactivity Score: ___/20**
**Pass Threshold: 16/20 (80%)**

### B1.5 SLIDER-SPECIFIC EVALUATION (Critical - 30 points max)

> **Sliders are the PRIMARY interaction. They must be FLAWLESS.**

| # | Criteria | Score (0-3) | Notes |
|---|----------|-------------|-------|
| **SMOOTHNESS** | | | |
| B1.5.1 | Updates at 60fps during drag (no lag) | | |
| B1.5.2 | No visible delay between drag and visual change | | |
| B1.5.3 | Uses both onInput + onChange handlers | | |
| B1.5.4 | Graphics update on EVERY frame, not debounced | | |
| **CLARITY** | | | |
| B1.5.5 | Label clearly states WHAT it controls | | |
| B1.5.6 | Current value is prominently displayed | | |
| B1.5.7 | Unit is always shown with value | | |
| B1.5.8 | Min/Max range shown at slider ends | | |
| B1.5.9 | Hint text explains WHAT HAPPENS when adjusted | | |
| B1.5.10 | Visual connection shows what slider affects | | |
| **IMPACT VISIBILITY** | | | |
| B1.5.11 | Change in value is IMMEDIATELY visible in graphic | | |
| B1.5.12 | Shows WHAT changed (value, bar, meter) | | |
| B1.5.13 | Shows WHY it changed (inline explanation) | | |
| B1.5.14 | Uses color/animation to highlight changes | | |
| **MOBILE UX** | | | |
| B1.5.15 | Thumb is >= 28px and easy to grab | | |
| B1.5.16 | Track is >= 8px tall | | |
| B1.5.17 | Has touch-action: none (no scroll interference) | | |
| B1.5.18 | Visual feedback on touch (scale, color change) | | |
| **STEP VALUES** | | | |
| B1.5.19 | Step values are meaningful (not arbitrary decimals) | | |
| B1.5.20 | Precision matches the physics concept | | |

**Slider Score: ___/60 (weight 3x per item)**
**Pass Threshold: 48/60 (80%) - Any item scored 0 = FAIL**

### B1.6 VISUAL CLARITY & LAYOUT EVALUATION (Critical - 60 points max)

> **Users must INSTANTLY understand what they're looking at, where to focus, and what to adjust.**
> If the page feels crowded, confusing, or overwhelming—the simulation FAILS before learning begins.

---

#### SECTION A: SVG TEXT BUDGET (CRITICAL - Must Pass All)

> **Quantitative Test:** Count the words/labels inside the SVG. If over budget = FAIL.

| # | Criteria | Pass/Fail | Actual Count | Budget |
|---|----------|-----------|--------------|--------|
| B1.6.A1 | Mobile: ≤12 words total inside SVG | | _____ words | ≤12 |
| B1.6.A2 | Mobile: ≤3 labels inside SVG | | _____ labels | ≤3 |
| B1.6.A3 | Desktop: ≤20 words total inside SVG | | _____ words | ≤20 |
| B1.6.A4 | Desktop: ≤5 labels inside SVG | | _____ labels | ≤5 |
| B1.6.A5 | Each label: ≤4 words | | longest: _____ | ≤4 |
| B1.6.A6 | Minimum font size in SVG: ≥10px | | smallest: _____ | ≥10px |
| B1.6.A7 | NO sentences or paragraphs inside SVG | | | Y/N |

**Section A Score: ___/7 (MUST be 7/7 to pass)**

---

#### SECTION B: ZONE ALLOCATION (CRITICAL)

> **Quantitative Test:** Measure the height percentage of each zone.

| # | Zone | Required % | Actual % | Pass/Fail |
|---|------|------------|----------|-----------|
| B1.6.B1 | Header (title + subtitle) | 10-15% | _____% | |
| B1.6.B2 | Graphic (SVG/Canvas only) | 35-50% | _____% | |
| B1.6.B3 | Status (metrics display) | 5-12% | _____% | |
| B1.6.B4 | Controls (sliders) | 15-25% | _____% | |
| B1.6.B5 | Explanation (WHY) | 15-25% | _____% | |
| B1.6.B6 | Footer (navigation) | 5-12% | _____% | |

**Section B Score: ___/6 (≥5/6 to pass)**

---

#### SECTION C: OVERLAP DETECTION (CRITICAL - Zero Tolerance)

> **Visual Test:** Take a screenshot and check for overlaps.

| # | Criteria | Pass/Fail | Location if Fail |
|---|----------|-----------|------------------|
| B1.6.C1 | No text overlapping other text inside SVG | | |
| B1.6.C2 | No text overlapping graphic elements inside SVG | | |
| B1.6.C3 | No labels in center 40% of SVG (reserved for visual) | | |
| B1.6.C4 | Minimum 24px gap between any two labels in SVG | | |
| B1.6.C5 | No zone overlapping another zone | | |
| B1.6.C6 | No elements cut off at screen edges | | |

**Section C Score: ___/6 (MUST be 6/6 to pass - ANY overlap = FAIL)**

---

#### SECTION D: READABILITY (Score 0-2 each)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| B1.6.D1 | All labels readable at arm's length | | |
| B1.6.D2 | All labels readable on 375px width mobile | | |
| B1.6.D3 | No squinting required to read any text | | |
| B1.6.D4 | 2-second read test: every label readable in 2 seconds | | |
| B1.6.D5 | High contrast: text vs background | | |

**Section D Score: ___/10**

---

#### SECTION E: LAYOUT STRUCTURE (Score 0-2 each)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| B1.6.E1 | Title is 20px+ bold and first thing visible | | |
| B1.6.E2 | Subtitle is one sentence explaining what to explore | | |
| B1.6.E3 | Graphic container has border/background distinguishing it | | |
| B1.6.E4 | Controls section has "CONTROLS" header | | |
| B1.6.E5 | Sliders are NOT inside the SVG | | |
| B1.6.E6 | Status/metrics display is OUTSIDE the SVG | | |
| B1.6.E7 | WHY explanation is OUTSIDE the SVG in its own section | | |
| B1.6.E8 | Scroll works smoothly (no conflicts with sliders) | | |
| B1.6.E9 | Continue button visible without scrolling on mobile | | |
| B1.6.E10 | Clear top-to-bottom visual flow | | |

**Section E Score: ___/20**

---

#### SECTION F: THE SCREENSHOT TEST (Critical Pass/Fail)

```bash
# THE SCREENSHOT TEST PROCEDURE:
#
# 1. Take a screenshot at MOBILE width (375px)
# 2. Take a screenshot at DESKTOP width (1280px)
# 3. Print or display at 50% size
# 4. Answer these questions (ALL must be YES to pass):

□ Can you identify the topic from the title? (2 seconds max)
□ Can you see where the graphic is? (distinct boundary)
□ Can you read all labels in the graphic without zooming?
□ Can you identify the controls section?
□ Can you see the WHY explanation area?
□ Is there visible whitespace between each zone?
□ Does NOTHING overlap?

# SCORING:
# All YES = PASS
# Any NO = FAIL (identify which question failed)
```

**Screenshot Test: PASS / FAIL**
**If FAIL, which question(s) failed: _____________________**

---

#### TOTAL VISUAL CLARITY SCORE

| Section | Max Points | Your Score | Pass Threshold |
|---------|------------|------------|----------------|
| A: SVG Text Budget | 7 (binary) | ___/7 | 7/7 required |
| B: Zone Allocation | 6 (binary) | ___/6 | 5/6 required |
| C: Overlap Detection | 6 (binary) | ___/6 | 6/6 required |
| D: Readability | 10 | ___/10 | 8/10 required |
| E: Layout Structure | 20 | ___/20 | 16/20 required |
| F: Screenshot Test | Pass/Fail | _____ | PASS required |

**TOTAL: ___/49 + Screenshot Test**

**PASS REQUIREMENTS:**
- Sections A, C: MUST be perfect (7/7 and 6/6)
- Section B: ≥5/6
- Section D: ≥8/10
- Section E: ≥16/20
- Section F: MUST PASS
- **Overall: ≥42/49 AND Screenshot Test PASS**

---

### QUICK EVALUATION CHECKLIST (For Rapid Assessment)

Use this for quick pass/fail during development:

```markdown
## 30-Second Visual Clarity Check

### SVG Content (Count these):
- [ ] Words in SVG: _____ (Mobile limit: 12, Desktop: 20)
- [ ] Labels in SVG: _____ (Mobile limit: 3, Desktop: 5)
- [ ] Longest label: _____ words (Limit: 4 words)

### Overlap Check (Visual scan):
- [ ] No text overlapping text
- [ ] No text overlapping graphics
- [ ] No zones overlapping zones
- [ ] All labels in edge/corner areas (not center)

### Zone Check (Eyeball percentages):
- [ ] Graphic takes 35-50% of visible height
- [ ] Controls are in their own section below graphic
- [ ] WHY explanation is below controls

### Scroll Check:
- [ ] Can scroll smoothly on mobile
- [ ] Sliders don't block scrolling
- [ ] Continue button reachable

### 2-Second Read Test:
- [ ] Can read every label in SVG in 2 seconds
- [ ] No squinting required

**If ANY checkbox fails → DO NOT SHIP. Fix first.**
```

#### Visual Clarity Test Protocol

```bash
# Test 1: 3-Second Comprehension Test
1. Show screen to someone unfamiliar with it
2. After 3 seconds, ask:
   - "What is this simulation about?" (Title test)
   - "What can you adjust?" (Controls test)
   - "Where is the main graphic?" (Focus test)
3. ✅ PASS: All 3 questions answered correctly
4. ❌ FAIL: Any hesitation or confusion

# Test 2: Crowding/Overlap Check
1. Take a screenshot of the simulation
2. Draw boxes around: Title, Graphic, Controls, Explanation
3. Check: Do ANY boxes overlap?
4. Check: Is there space BETWEEN boxes?
5. ✅ PASS: No overlap, visible spacing between sections
6. ❌ FAIL: Any text overlaps graphic, or sections touch

# Test 3: Eye Path Test
1. Track where user's eyes go (or ask them)
2. Expected path: Title → Graphic → Controls → Explanation
3. ✅ PASS: User follows expected path naturally
4. ❌ FAIL: User's eyes jump around searching for info

# Test 4: Readability Test
1. At arm's length, can you read all text?
2. On mobile (375px), is everything readable?
3. Are explanation sections scannable (not walls of text)?
4. ✅ PASS: All text readable without squinting
5. ❌ FAIL: Any text requires effort to read
```

#### Example: Good vs Bad Layout

```
❌ BAD LAYOUT (Crowded, Overlapping, Unclear):
┌────────────────────────────────────────────────────────────┐
│ small title antenna polarization                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │              Text explaining what antenna               │ │
│ │   ╱╲         polarization is overlaid on top of        │ │
│ │  ╱  ╲        the graphic making it hard to see         │ │
│ │ ╱    ╲       either the graphic OR read the text       │ │
│ │       ≋≋≋≋   Signal waves shown here too               │ │
│ └────────────────────────────────────────────────────────┘ │
│ [───●───] angle [──●────] signal some text here more text  │
│ why this matters is because electromagnetic waves and      │
│ polarization affects how antennas receive signals and...   │
└────────────────────────────────────────────────────────────┘
Problems: Text over graphic, tiny title, sliders unlabeled,
          cramped spacing, wall of text explanation


✅ GOOD LAYOUT (Clear, Separated, Focused):
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ANTENNA POLARIZATION                                      │
│  See how antenna alignment affects signal reception        │
│ ──────────────────────────────────────────────────────── │
│                                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │                                                   │     │
│  │        ╱╲                    ≋≋≋≋≋               │     │
│  │       ╱  ╲    Tx Antenna    Signal    Rx Antenna │     │
│  │      ╱    ╲                  →→→      ╲  ╱       │     │
│  │                                                   │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │  ⚙️ CONTROLS                                      │     │
│  │                                                   │     │
│  │  ANTENNA ANGLE          │ CURRENT: 45°           │     │
│  │  [────────●────────]    └─────────────┘          │     │
│  │  0°                90°                           │     │
│  │                                                   │     │
│  │  💡 Rotate to see signal strength change         │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
│  ┌───────────────────┐  ┌───────────────────┐             │
│  │ 📖 WHAT HAPPENS   │  │ 🔬 WHY             │             │
│  │                   │  │                   │             │
│  │ Signal drops as   │  │ Polarized waves   │             │
│  │ antennas misalign │  │ need alignment    │             │
│  └───────────────────┘  └───────────────────┘             │
│                                                            │
│  [                    Continue →                     ]     │
└────────────────────────────────────────────────────────────┘
Clear: Big title, separate graphic, labeled controls,
       distinct explanation boxes, breathing room
```

#### Slider Test Protocol

```bash
# Test 1: Smoothness Test
1. Open game on mobile device
2. Drag slider slowly from min to max
3. Watch for: lag, stuttering, delayed updates
4. ✅ PASS: Graphics update smoothly during entire drag
5. ❌ FAIL: Any visible delay or stutter

# Test 2: Clarity Test (5-Second Rule)
1. Show slider to someone unfamiliar with game
2. Ask: "What does this control?"
3. Ask: "What's the current value?"
4. Ask: "What happens if you move it right?"
5. ✅ PASS: All 3 questions answered correctly in 5 seconds
6. ❌ FAIL: Any question not answerable from slider alone

# Test 3: Impact Visibility Test
1. Set slider to minimum value
2. Note the visual state of the graphic
3. Move slider to maximum value
4. ✅ PASS: Change is obvious, explained, and meaningful
5. ❌ FAIL: Change is subtle, unexplained, or cosmetic only

# Test 4: Mobile Usability Test
1. Open on 375px mobile device
2. Try to grab slider thumb with thumb
3. Drag without triggering page scroll
4. ✅ PASS: Easy to grab, no scroll issues
5. ❌ FAIL: Hard to grab or causes accidental scroll
```

### B2. VISUAL ACCURACY (20 points max)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| B2.1 | "Above" visually appears ABOVE | | |
| B2.2 | "Below" visually appears BELOW | | |
| B2.3 | "Left/Right" directions are correct | | |
| B2.4 | Scale is proportional to reality | | |
| B2.5 | Animations follow physics laws | | |
| B2.6 | Colors match physics conventions (red=+, blue=-) | | |
| B2.7 | Vectors show correct direction | | |
| B2.8 | Units are displayed correctly | | |
| B2.9 | Numbers update accurately with controls | | |
| B2.10 | No visual contradictions with text | | |

**Visual Accuracy Score: ___/20**
**Pass Threshold: 18/20 (90%)**

### B3. REAL-WORLD FIDELITY (20 points max)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| B3.1 | Simulation represents real physics | | |
| B3.2 | Objects look like real objects (not abstract) | | |
| B3.3 | Behavior matches real-world expectations | | |
| B3.4 | Extreme values produce realistic results | | |
| B3.5 | Time scales are appropriate | | |
| B3.6 | No "magic" or unexplained behavior | | |
| B3.7 | Edge cases handled realistically | | |
| B3.8 | Comparable to professional simulations | | |
| B3.9 | Would pass physics teacher review | | |
| B3.10 | Student could replicate with real equipment | | |

**Real-World Fidelity Score: ___/20**
**Pass Threshold: 16/20 (80%)**
```

## C. Clarity & Understanding Evaluation

```markdown
## Clarity Evaluation Form

### C1. LABELING CLARITY (20 points max)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| C1.1 | Every component is labeled IN the graphic | | |
| C1.2 | Labels use full terminology first (not abbreviations) | | |
| C1.3 | Font size is readable (12px+ mobile, 14px+ desktop) | | |
| C1.4 | Text has sufficient contrast with background | | |
| C1.5 | Labels don't overlap or obstruct view | | |
| C1.6 | Technical terms are explained on first use | | |
| C1.7 | Units are always shown with values | | |
| C1.8 | Key components have visual emphasis | | |
| C1.9 | Relationships are shown with arrows/lines | | |
| C1.10 | Status/state is clearly indicated | | |

**Labeling Clarity Score: ___/20**

### C2. CONCEPTUAL CLARITY (20 points max)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| C2.1 | "WHAT happens" is clearly explained | | |
| C2.2 | "WHY it happens" is clearly explained | | |
| C2.3 | "WHY it matters" (real-world) is explained | | |
| C2.4 | Cause → effect relationship is visible | | |
| C2.5 | Before/after comparison available | | |
| C2.6 | Physics formula is shown AND explained | | |
| C2.7 | Simple language used before technical | | |
| C2.8 | Key insight is highlighted/emphasized | | |
| C2.9 | Common misconceptions are addressed | | |
| C2.10 | Could understand with audio muted | | |

**Conceptual Clarity Score: ___/20**

### C3. THE 5-SECOND TEST

Show the simulation to 3 different people for 5 seconds each.
Ask these questions immediately after:

| Question | Person 1 | Person 2 | Person 3 |
|----------|----------|----------|----------|
| "What physics concept is this?" | ✓/✗ | ✓/✗ | ✓/✗ |
| "What can you adjust?" | ✓/✗ | ✓/✗ | ✓/✗ |
| "What happens when you adjust it?" | ✓/✗ | ✓/✗ | ✓/✗ |
| "Point to the [key component]" | ✓/✗ | ✓/✗ | ✓/✗ |
| "Is X above or below Y?" | ✓/✗ | ✓/✗ | ✓/✗ |

**5-Second Test: ___/15 correct answers**
**Pass: 12/15 (80%)**
```

## D. Responsive Design & Zoom Manual Check

```markdown
## Responsive Design Manual Evaluation

### D1. MOBILE (375px width) - Test on real device if possible

| # | Criteria | Pass? | Notes |
|---|----------|-------|-------|
| D1.1 | No horizontal scrolling | ☐ | |
| D1.2 | All text readable without zooming | ☐ | |
| D1.3 | Buttons easily tappable with thumb | ☐ | |
| D1.4 | Graphic fits in viewport | ☐ | |
| D1.5 | Sliders usable with one hand | ☐ | |
| D1.6 | No content cut off | ☐ | |
| D1.7 | Explanation text doesn't require scrolling mid-sentence | ☐ | |
| D1.8 | Progress indicator visible | ☐ | |
| D1.9 | Back/Next buttons always accessible | ☐ | |
| D1.10 | Portrait AND landscape work | ☐ | |

### D2. TABLET (768px width)

| # | Criteria | Pass? | Notes |
|---|----------|-------|-------|
| D2.1 | Layout uses available space well | ☐ | |
| D2.2 | Graphic not stretched/distorted | ☐ | |
| D2.3 | Side-by-side layout where appropriate | ☐ | |
| D2.4 | Touch targets still adequate | ☐ | |
| D2.5 | Text not excessively large | ☐ | |

### D3. DESKTOP (1440px width)

| # | Criteria | Pass? | Notes |
|---|----------|-------|-------|
| D3.1 | Content centered appropriately | ☐ | |
| D3.2 | Max-width prevents over-stretching | ☐ | |
| D3.3 | Graphic takes advantage of space | ☐ | |
| D3.4 | Mouse interactions work | ☐ | |
| D3.5 | Keyboard navigation possible | ☐ | |

### D4. ZOOM & SCALE EVALUATION (Critical - 25 points)

> **Users should NEVER need to manually zoom to see content clearly.**

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| **AUTO-SCALING** | | | |
| D4.1 | SVG graphics use viewBox (scales automatically) | | |
| D4.2 | No fixed pixel widths causing overflow | | |
| D4.3 | Text uses responsive sizing (rem, clamp) | | |
| D4.4 | Graphics maintain aspect ratio when scaled | | |
| **BROWSER ZOOM TESTS** | | | |
| D4.5 | At 125% zoom: No horizontal scroll | | |
| D4.6 | At 125% zoom: All text readable | | |
| D4.7 | At 150% zoom: All controls usable | | |
| D4.8 | At 150% zoom: No overlap/cutoff | | |
| D4.9 | At 200% zoom: Full functionality maintained | | |
| **PINCH-ZOOM BEHAVIOR (Mobile)** | | | |
| D4.10 | Content is readable WITHOUT pinch-zoom | | |
| D4.11 | If user zooms, content doesn't break | | |
| D4.12 | Zoomed sliders still respond correctly | | |
| **VISUAL CLARITY** | | | |
| D4.13 | Labels readable on smallest screen (320px) | | |
| D4.14 | Graphics clear on smallest screen | | |
| D4.15 | Key information visible without scrolling | | |

**Zoom Score: ___/30**
**Pass Threshold: 24/30 (80%) - D4.10 MUST score 2**

#### Zoom Test Protocol

```bash
# Test 1: Default Readability (Most Important)
1. Open game on 375px mobile viewport
2. WITHOUT zooming, can you:
   - Read all labels clearly?
   - See all graphic components?
   - Use all sliders comfortably?
3. ✅ PASS: Everything usable at default zoom
4. ❌ FAIL: Any need to zoom = FAIL

# Test 2: Browser Zoom Compatibility
1. On desktop, set browser zoom to 200%
2. Navigate through all 10 phases
3. Check for:
   - Horizontal scrolling
   - Overlapping elements
   - Cut-off content
   - Unusable controls
4. ✅ PASS: Full functionality at 200%
5. ❌ FAIL: Any broken functionality

# Test 3: SVG Scaling Test
1. Resize browser window from 320px to 1920px
2. Observe SVG graphics
3. ✅ PASS: Graphics scale smoothly, labels stay readable
4. ❌ FAIL: Graphics overflow, distort, or labels become unreadable

# Test 4: Text Readability Test
1. Open on 320px viewport (smallest mobile)
2. Check all text:
   - Titles: >= 16px
   - Body text: >= 14px
   - Labels: >= 12px
   - Captions: >= 10px (sparingly)
3. ✅ PASS: All text meets minimums
4. ❌ FAIL: Any text below minimums
```
```

## E. Design Quality Evaluation

```markdown
## Design Quality Evaluation (Apple/Airbnb Level)

### E1. VISUAL HIERARCHY (10 points)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| E1.1 | Clear primary focus on each screen | | |
| E1.2 | Secondary elements support primary | | |
| E1.3 | White space used effectively | | |
| E1.4 | Visual rhythm/consistency | | |
| E1.5 | Nothing feels cluttered or sparse | | |

### E2. TYPOGRAPHY (10 points)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| E2.1 | Font hierarchy clear (title > heading > body) | | |
| E2.2 | Line height comfortable for reading | | |
| E2.3 | Font weights used purposefully | | |
| E2.4 | No more than 2-3 font sizes per screen | | |
| E2.5 | Text alignment consistent | | |

### E3. COLOR (10 points)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| E3.1 | Color palette is cohesive | | |
| E3.2 | Colors convey meaning consistently | | |
| E3.3 | Sufficient contrast throughout | | |
| E3.4 | Accent colors draw attention appropriately | | |
| E3.5 | Not too many competing colors | | |

### E4. POLISH (10 points)

| # | Criteria | Score (0-2) | Notes |
|---|----------|-------------|-------|
| E4.1 | Animations are smooth (60fps) | | |
| E4.2 | Transitions feel natural | | |
| E4.3 | Loading states are elegant | | |
| E4.4 | Error states are helpful | | |
| E4.5 | Attention to detail throughout | | |

### E5. THE "SCREENSHOT TEST"

Take a screenshot of each phase. Would you be proud to post it on:
- [ ] Your portfolio
- [ ] The company website
- [ ] A design awards submission
- [ ] A competitor analysis (as a good example)

**If NO to any: Design needs more polish**
```

---

# PART 3: PHASE-BY-PHASE EVALUATION

Evaluate each of the 10 phases individually.

## Phase Evaluation Template

```markdown
## Phase-by-Phase Evaluation

### PHASE 1: HOOK

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Compelling title | ☐ | | |
| Clear topic introduction | ☐ | | |
| Engaging visual/animation | ☐ | | |
| Feynman-style hook question | ☐ | | |
| "Begin" CTA button works | ☐ | | |
| Trust indicators present | ☐ | | |

### PHASE 2: PREDICT

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Clear prediction question | ☐ | | |
| Question is easy to understand | ☐ | | |
| 3 prediction options | ☐ | | |
| Options have icons/visual distinction | ☐ | | |
| Selection is clearly indicated | ☐ | | |
| Cannot proceed without selecting | ☐ | | |

### PHASE 3: PLAY (Interactive Graphic #1)

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Interactive simulation present | ☐ | | |
| Real-time response to input | ☐ | | |
| Controls are labeled | ☐ | | |
| What you're adjusting is clear | ☐ | | |
| What happens after adjustment is clear | ☐ | | |
| Why it happens is explained | ☐ | | |
| Graphic is realistic | ☐ | | |
| Spacing works on mobile | ☐ | | |
| All components labeled | ☐ | | |
| Milestone/discovery moments | ☐ | | |

### PHASE 4: REVIEW

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Confirms/denies prediction | ☐ | | |
| Explains the "why" | ☐ | | |
| Key takeaways (minimum 3) | ☐ | | |
| "Why it matters" section | ☐ | | |
| Visual summary/comparison | ☐ | | |

### PHASE 5: TWIST PREDICT

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| New variable introduced | ☐ | | |
| Clear prediction question | ☐ | | |
| 3 prediction options | ☐ | | |
| Builds on Phase 3 concept | ☐ | | |

### PHASE 6: TWIST PLAY (Interactive Graphic #2)

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Different/extended simulation | ☐ | | |
| New variable is controllable | ☐ | | |
| Reveals surprising insight | ☐ | | |
| Toggle/comparison available | ☐ | | |
| Graphic is realistic | ☐ | | |
| Spacing works on mobile | ☐ | | |

### PHASE 7: TWIST REVIEW

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Explains the twist | ☐ | | |
| Comparison cards | ☐ | | |
| Deeper physics insight | ☐ | | |
| Key insights (minimum 3) | ☐ | | |

### PHASE 8: TRANSFER (4 Real-World Applications) - DETAILED EVALUATION

> **Transfer phase turns abstract physics into concrete understanding.**
> Each application must be RICH, VISUAL, and DEEPLY EDUCATIONAL.

#### Basic Structure (All must be present)

| Criteria | Present? | Notes |
|----------|----------|-------|
| 4 distinct applications | ☐ | |
| Applications unlock SEQUENTIALLY with visual 🔒 lock | ☐ | |
| App N locked until App N-1 is marked complete | ☐ | |
| "Got It! Continue →" button at end of each app | ☐ | |
| All 4 REQUIRED before test phase unlocks | ☐ | |
| Test phase button shows disabled state until all complete | ☐ | |

#### Per-Application Quality Evaluation (Score each application 0-50)

**Evaluate EACH of the 4 applications:**

| # | Criteria | App 1 | App 2 | App 3 | App 4 |
|---|----------|-------|-------|-------|-------|
| **VISUAL CONTENT (15 pts)** | | | | | |
| 8.1 | Has diagram/illustration showing physics | /3 | /3 | /3 | /3 |
| 8.2 | Diagram has labeled components | /3 | /3 | /3 | /3 |
| 8.3 | Arrows/annotations explain relationships | /3 | /3 | /3 | /3 |
| 8.4 | Visual is clear on mobile (375px) | /3 | /3 | /3 | /3 |
| 8.5 | Visual connects to simulation from Play phase | /3 | /3 | /3 | /3 |
| **QUANTITATIVE DATA (10 pts)** | | | | | |
| 8.6 | Has 3+ numerical statistics | /2 | /2 | /2 | /2 |
| 8.7 | Statistics are specific, not vague | /2 | /2 | /2 | /2 |
| 8.8 | Numbers have units and context | /2 | /2 | /2 | /2 |
| 8.9 | Stats displayed visually (not just text) | /2 | /2 | /2 | /2 |
| 8.10 | Industry scale/impact included | /2 | /2 | /2 | /2 |
| **EXPLANATION DEPTH (15 pts)** | | | | | |
| 8.11 | "How It Works" section present | /3 | /3 | /3 | /3 |
| 8.12 | Explanation is step-by-step or detailed | /3 | /3 | /3 | /3 |
| 8.13 | Physics principle clearly connected | /3 | /3 | /3 | /3 |
| 8.14 | No assumed knowledge (jargon explained) | /3 | /3 | /3 | /3 |
| 8.15 | Simple explanation + technical depth both provided | /3 | /3 | /3 | /3 |
| **REAL EXAMPLES (10 pts)** | | | | | |
| 8.16 | 4+ specific real-world examples | /2 | /2 | /2 | /2 |
| 8.17 | Examples are relatable (everyday life) | /2 | /2 | /2 | /2 |
| 8.18 | Examples show different use cases | /2 | /2 | /2 | /2 |
| 8.19 | Each example explains WHY physics matters there | /2 | /2 | /2 | /2 |
| 8.20 | Industry leaders/companies mentioned | /2 | /2 | /2 | /2 |

**Per-Application Total:** ___/50 each
**Average across 4 apps:** ___/50
**Pass Threshold:** 40/50 average (80%)

#### Application Content Checklist

For EACH application, verify these elements exist:

```markdown
## Application: [Name]

### Required Visual Elements
- [ ] Header with icon, title, tagline
- [ ] Physics connection banner (purple/highlighted)
- [ ] SVG/diagram showing the concept in action
- [ ] All diagram components labeled
- [ ] Stats grid (3+ stats with icons)
- [ ] "How It Works" section with steps
- [ ] Real examples section (4+ examples)
- [ ] Industry scale section
- [ ] "Why It Matters" section (personal + broader)
- [ ] Continue button at bottom

### Content Quality
- [ ] Can understand without prior knowledge
- [ ] Physics connection is crystal clear
- [ ] Statistics are impressive and memorable
- [ ] Examples are relatable and specific
- [ ] "Why It Matters" creates personal connection
```

#### Transfer Phase Test Protocol

```bash
# Test 1: Visual Richness Test
1. Navigate to Transfer phase
2. For each application:
   - Is there a visual diagram? (not just text)
   - Are there 3+ statistics displayed?
   - Is there a "How It Works" section?
3. ✅ PASS: All 4 apps have all 3 elements
4. ❌ FAIL: Any app missing any element

# Test 2: Comprehension Test (Uninformed User)
1. Have someone unfamiliar with physics read one application
2. Ask: "How does [physics concept] apply to [application]?"
3. Ask: "Can you give me a number from this section?"
4. Ask: "Why does this matter in real life?"
5. ✅ PASS: All 3 questions answered correctly
6. ❌ FAIL: Unable to answer any question

# Test 3: Mobile Readability Test
1. Open Transfer phase on 375px mobile
2. Navigate through all 4 applications
3. Check:
   - All diagrams visible without horizontal scroll
   - All stats readable
   - All text accessible
4. ✅ PASS: Full content accessible on mobile
5. ❌ FAIL: Any content requires horizontal scroll or zoom

# Test 4: Engagement Test
1. Time how long user spends on each application
2. Observe scroll depth (did they read to the bottom?)
3. ✅ PASS: 30+ seconds per app, scrolled to Continue button
4. ❌ FAIL: <15 seconds, didn't scroll to bottom
```

#### Example: Minimum Acceptable Application Content

```
✅ GOOD APPLICATION:
┌────────────────────────────────────────────────────────────┐
│ 📡 SATELLITE TV RECEPTION                                   │
│ "Why Your Dish Installer Adjusts That Little Device"       │
├────────────────────────────────────────────────────────────┤
│ ⚛️ PHYSICS CONNECTION                                       │
│ Satellite signals are polarized waves. Your dish's LNB     │
│ must align with this polarization to receive the signal.   │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐             │
│ │     [DIAGRAM: Satellite → Dish → LNB]      │             │
│ │     - Satellite (labeled)                  │             │
│ │     - Signal wave (showing polarization)   │             │
│ │     - Dish (reflecting signal)             │             │
│ │     - LNB (needs alignment)                │             │
│ └────────────────────────────────────────────┘             │
├────────────────────────────────────────────────────────────┤
│ 📊 KEY STATS                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│ │ 📉 99%   │ │ 📺 2x    │ │ 🔧 ±5°   │                     │
│ │ Signal   │ │ Channels │ │ LNB      │                     │
│ │ loss if  │ │ with dual│ │ adjust   │                     │
│ │ perp.    │ │ polarity │ │ range    │                     │
│ └──────────┘ └──────────┘ └──────────┘                     │
├────────────────────────────────────────────────────────────┤
│ 🔧 HOW IT WORKS                                             │
│ 1. Satellite transmits signal with known polarization      │
│ 2. Signal travels 36,000 km to your dish                   │
│ 3. Dish reflects signal to LNB focal point                 │
│ 4. LNB probe must align within ±5° of signal polarization  │
│ 5. Installer uses signal meter to find optimal rotation    │
├────────────────────────────────────────────────────────────┤
│ 🌍 REAL-WORLD EXAMPLES                                      │
│ • DirecTV Installation - LNB skew adjustment               │
│ • Dual-Band Reception - Two probes at 90°                  │
│ • Rain Fade - Water depolarizes signals                    │
│ • Marine/RV - Auto-tracking polarization                   │
├────────────────────────────────────────────────────────────┤
│ 💡 WHY THIS MATTERS TO YOU                                  │
│ This is why your installer spent time adjusting that       │
│ small device on your dish. A few degrees off = no picture. │
├────────────────────────────────────────────────────────────┤
│ [Continue to Next Application →]                           │
└────────────────────────────────────────────────────────────┘
```

```
❌ BAD APPLICATION (FAILS EVALUATION):
┌────────────────────────────────────────────────────────────┐
│ 📡 Satellite TV                                             │
│                                                            │
│ Satellites use polarization to send signals.               │
│ Your dish needs to be aligned correctly.                   │
│                                                            │
│ [Continue →]                                               │
└────────────────────────────────────────────────────────────┘
Missing: diagram, stats, how it works, examples, why it matters
```

### PHASE 9: TEST (10 Questions) - LOCAL VALIDATION REQUIRED

> **CRITICAL**: Test phase must use LOCAL answer validation with `correct: true` markers.
> NO Firebase dependency - this avoids initialization errors and works offline.

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Exactly 10 questions | ☐ | | |
| **LOCAL VALIDATION**: `correct: true` marker on correct option | ☐ | | |
| NO Firebase/server calls for answer checking | ☐ | | |
| Questions test understanding (not memorization) | ☐ | | |
| Clear correct/incorrect feedback (immediate) | ☐ | | |
| Score tracked and displayed | ☐ | | |
| Questions cover both graphics | ☐ | | |
| 70% threshold for pass | ☐ | | |

#### Question Structure (REQUIRED FORMAT)

```typescript
const testQuestions = [
  {
    scenario: "Real-world context...",
    question: "What happens when...?",
    options: [
      { id: 'a', label: "Wrong answer (common misconception)" },
      { id: 'b', label: "Correct answer", correct: true },  // <-- REQUIRED marker
      { id: 'c', label: "Wrong answer" },
      { id: 'd', label: "Wrong answer" },
    ],
    explanation: "Why B is correct..."
  },
  // ... 9 more questions
];

// LOCAL VALIDATION (no Firebase)
const checkAnswer = (qIndex: number, selectedId: string): boolean => {
  return testQuestions[qIndex].options.find(o => o.id === selectedId)?.correct === true;
};
```

### PHASE 10: MASTERY

| Criteria | Present? | Quality (1-5) | Notes |
|----------|----------|---------------|-------|
| Score/results displayed | ☐ | | |
| Pass/fail indication | ☐ | | |
| Key concepts summary | ☐ | | |
| Achievement badge (if passed) | ☐ | | |
| "Return to Dashboard" button | ☐ | | |
| "Review Lesson" option | ☐ | | |
| Return to Dashboard WORKS ON FIRST CLICK | ☐ | | |

### NAVIGATION RELIABILITY CHECKS

| Criteria | Works? | Notes |
|----------|--------|-------|
| Return to Dashboard navigates to dashboard | ☐ | |
| Back buttons work correctly | ☐ | |
| Scroll works without fighting slider drags | ☐ | |
| Continue buttons are always reachable | ☐ | |
| No dead-end states (user can always navigate) | ☐ | |
| Page scroll doesn't trigger when dragging sliders | ☐ | |
| All phase transitions work smoothly | ☐ | |
```

---

# PART 4: SCORING & DECISION MATRIX

## Final Evaluation Score Calculator

```typescript
interface EvaluationScores {
  structure: number;           // 0-100
  interactiveGraphics: number; // 0-100
  clarity: number;             // 0-100
  responsive: number;          // 0-100
  buttonReliability: number;   // 0-100
  designQuality: number;       // 0-100
  educational: number;         // 0-100
}

interface EvaluationResult {
  overallScore: number;
  passed: boolean;
  criticalFailures: string[];
  recommendations: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const calculateFinalScore = (scores: EvaluationScores): EvaluationResult => {
  const weights = {
    structure: 0.15,
    interactiveGraphics: 0.20,
    clarity: 0.20,
    responsive: 0.15,
    buttonReliability: 0.10,
    designQuality: 0.10,
    educational: 0.10
  };

  const weightedScore =
    scores.structure * weights.structure +
    scores.interactiveGraphics * weights.interactiveGraphics +
    scores.clarity * weights.clarity +
    scores.responsive * weights.responsive +
    scores.buttonReliability * weights.buttonReliability +
    scores.designQuality * weights.designQuality +
    scores.educational * weights.educational;

  // Critical failures (these MUST be 100%)
  const criticalFailures: string[] = [];
  if (scores.structure < 100) criticalFailures.push('Structure incomplete');
  if (scores.responsive < 100) criticalFailures.push('Responsive issues');
  if (scores.buttonReliability < 100) criticalFailures.push('Button reliability issues');

  // Recommendations
  const recommendations: string[] = [];
  if (scores.interactiveGraphics < 90) recommendations.push('Improve interactive graphics');
  if (scores.clarity < 90) recommendations.push('Improve clarity and labeling');
  if (scores.designQuality < 85) recommendations.push('Polish design quality');
  if (scores.educational < 85) recommendations.push('Strengthen educational content');

  // Grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (criticalFailures.length > 0) {
    grade = 'F';
  } else if (weightedScore >= 95) {
    grade = 'A';
  } else if (weightedScore >= 85) {
    grade = 'B';
  } else if (weightedScore >= 75) {
    grade = 'C';
  } else if (weightedScore >= 65) {
    grade = 'D';
  } else {
    grade = 'F';
  }

  return {
    overallScore: Math.round(weightedScore),
    passed: criticalFailures.length === 0 && weightedScore >= 90,
    criticalFailures,
    recommendations,
    grade
  };
};
```

## Decision Matrix

| Overall Score | Critical Failures | Decision |
|---------------|-------------------|----------|
| 95%+ | None | ✅ **SHIP IT** - Production ready |
| 90-94% | None | ✅ **SHIP IT** - Minor polish optional |
| 85-89% | None | ⚠️ **REVIEW** - Fix recommendations first |
| 80-84% | None | ⚠️ **REVIEW** - Needs improvement |
| <80% | None | ❌ **REJECT** - Significant work needed |
| Any | Any | ❌ **REJECT** - Fix critical issues first |

---

# PART 5: QUICK EVALUATION CHECKLIST

For rapid pre-merge evaluation, use this condensed checklist:

```markdown
## QUICK EVAL CHECKLIST (5 minutes)

### CRITICAL (All must be YES) ⚠️
- [ ] All 10 phases present and in order?
- [ ] Both interactive graphics work?
- [ ] All buttons work on first click?
- [ ] Works on 375px mobile width?
- [ ] No horizontal scrolling?
- [ ] Return to Dashboard works ON FIRST CLICK?
- [ ] Scroll works reliably (no conflicts with sliders)?

### SLIDERS (All must be YES) 🎚️
- [ ] Sliders update graphics in real-time (no lag)?
- [ ] Slider has clear label (WHAT it controls)?
- [ ] Current value displayed prominently?
- [ ] Min/Max range shown at slider ends?
- [ ] Unit always displayed with value?
- [ ] Hint text explains what happens when adjusted?
- [ ] Change in graphic is OBVIOUS when slider moves?
- [ ] WHY the change happens is explained?
- [ ] Slider thumb is easy to grab on mobile (≥28px)?
- [ ] No page scroll when dragging slider?

### ZOOM & SCALE (All must be YES) 🔍
- [ ] All content readable WITHOUT pinch-zoom on mobile?
- [ ] SVG graphics scale properly (use viewBox)?
- [ ] Works at 200% browser zoom without breaking?
- [ ] Text meets minimum sizes (14px body, 12px labels)?
- [ ] Graphics fit viewport without overflow?

### VISUAL CLARITY & LAYOUT (All must be YES) 👁️
- [ ] Title is LARGE (20px+) and immediately visible?
- [ ] User knows what they're looking at within 3 seconds?
- [ ] Text does NOT overlap the graphic?
- [ ] Graphic has breathing room (16px+ margins)?
- [ ] Controls section is clearly labeled ("CONTROLS" header)?
- [ ] User knows what to adjust within 3 seconds?
- [ ] WHAT/WHY/WHY IT MATTERS all visible and separated?
- [ ] Layout feels spacious, NOT crowded?
- [ ] Clear eye path: Title → Graphic → Controls → Explanation?
- [ ] No walls of text (max 3 lines per explanation box)?

### GRAPHICS (8/10 must be YES) 📊
- [ ] Every component labeled IN graphic?
- [ ] Full terminology used (not just abbreviations)?
- [ ] "Below" looks below, "above" looks above?
- [ ] Controls are labeled with what they do?
- [ ] Changes happen in real-time?
- [ ] "What happens" is explained?
- [ ] "Why it happens" is explained?
- [ ] "Why it matters" is explained?
- [ ] Graphic is realistic (not abstract)?
- [ ] Would pass 5-second test?

### TRANSFER APPLICATIONS (All must be YES) 🌍
- [ ] Each of 4 apps has a VISUAL DIAGRAM (not just text)?
- [ ] Each app has 3+ STATISTICS with numbers?
- [ ] Each app has "How It Works" section?
- [ ] Each app has 4+ real-world examples?
- [ ] Each app has "Why It Matters" section?
- [ ] Physics connection is crystal clear for each app?
- [ ] All app content visible on mobile without zoom?

### STRUCTURE (All must be YES) 🏗️
- [ ] 2 prediction questions?
- [ ] 2 interactive graphics?
- [ ] 4 transfer applications (sequential)?
- [ ] 10 test questions?
- [ ] Pass/fail at 70%?
- [ ] Review lesson option?

### DESIGN (7/10 must be YES) 🎨
- [ ] Text readable without squinting?
- [ ] Colors have sufficient contrast?
- [ ] Visual hierarchy clear?
- [ ] Consistent styling throughout?
- [ ] Animations smooth?
- [ ] Touch targets large enough?
- [ ] Spacing comfortable?
- [ ] Would show to Apple designer?
- [ ] Would show to physics teacher?
- [ ] No embarrassing rough edges?

---

## SCORING SUMMARY

| Category | Threshold | Your Score |
|----------|-----------|------------|
| CRITICAL | 7/7 (100%) | ___/7 |
| SLIDERS | 10/10 (100%) | ___/10 |
| VISUAL CLARITY | 10/10 (100%) | ___/10 |
| ZOOM | 5/5 (100%) | ___/5 |
| GRAPHICS | 8/10 (80%) | ___/10 |
| TRANSFER | 7/7 (100%) | ___/7 |
| STRUCTURE | 6/6 (100%) | ___/6 |
| DESIGN | 7/10 (70%) | ___/10 |

**PASS REQUIREMENTS:**
- All CRITICAL items: YES
- All SLIDERS items: YES (sliders are primary interaction)
- All VISUAL CLARITY items: YES (users must instantly understand what they're looking at)
- All ZOOM items: YES (users shouldn't need to zoom)
- 8/10 GRAPHICS items
- All TRANSFER items: YES (rich real-world content required)
- All STRUCTURE items
- 7/10 DESIGN items

**ANY single failure in CRITICAL, SLIDERS, VISUAL CLARITY, ZOOM, or TRANSFER = REJECT**
```

---

# PART 6: EVALUATION AUTOMATION SETUP

## Running Automated Evals

```bash
# Install dependencies
npm install playwright @playwright/test

# Run all automated evals
npm run eval:all

# Run specific eval
npm run eval:structure
npm run eval:responsive
npm run eval:buttons
npm run eval:accessibility
```

## package.json scripts

```json
{
  "scripts": {
    "eval:all": "playwright test tests/evals/",
    "eval:structure": "playwright test tests/evals/structureEval.spec.ts",
    "eval:responsive": "playwright test tests/evals/responsiveEval.spec.ts",
    "eval:buttons": "playwright test tests/evals/buttonEval.spec.ts",
    "eval:accessibility": "playwright test tests/evals/accessibilityEval.spec.ts",
    "eval:report": "node scripts/generateEvalReport.js"
  }
}
```

## Example Playwright Test

```typescript
// tests/evals/fullEval.spec.ts
import { test, expect } from '@playwright/test';
import { evaluateGameStructure } from './structureEval';
import { evaluateResponsiveDesign } from './responsiveEval';
import { evaluateButtonReliability } from './buttonEval';

const GAMES_TO_TEST = [
  { name: 'Center of Mass', url: '/game/center_of_mass' },
  { name: 'Coulombs Law', url: '/game/coulombs_law' },
  // Add all games here
];

for (const game of GAMES_TO_TEST) {
  test.describe(`Evaluation: ${game.name}`, () => {

    test('passes responsive design evaluation', async ({ page }) => {
      const result = await evaluateResponsiveDesign(page, game.url);
      expect(result.score).toBeGreaterThanOrEqual(100);
      expect(result.failures).toHaveLength(0);
    });

    test('passes button reliability evaluation', async ({ page }) => {
      const result = await evaluateButtonReliability(page, game.url);
      expect(result.score).toBe(100);
      expect(result.failures).toHaveLength(0);
    });

    test('passes structure evaluation', async ({ page }) => {
      // Import the component and test
      // This would require a different approach in practice
    });

  });
}
```

---

# PART 7: COMPREHENSIVE VISUAL CLARITY EVALUATION (Matches GAME_TEST_SPECIFICATION 0.8.0)

> **This evaluation section corresponds directly to the 10-part Visual Clarity System in GAME_TEST_SPECIFICATION.md Section 0.8.0.**
> Each test is measurable, binary (pass/fail), and must be performed on BOTH mobile (375px) and desktop (1280px).

---

## EVAL 1: ABOVE-THE-FOLD TEST (Matches Part 1)

> **Requirement:** User must see title, graphic, and primary slider WITHOUT scrolling.

### Mobile (375px width, 667px height viewport)

| # | Measurement | Required | Actual | Pass? |
|---|-------------|----------|--------|-------|
| 1.1 | Title visible without scroll? | YES | | |
| 1.2 | Title height | ≤60px | ___px | |
| 1.3 | Subtitle visible without scroll? | YES | | |
| 1.4 | Subtitle height | ≤40px | ___px | |
| 1.5 | Main graphic visible without scroll? | YES | | |
| 1.6 | Graphic height | ≥280px | ___px | |
| 1.7 | Primary slider label visible? | YES | | |
| 1.8 | Total above-fold content | ≤460px | ___px | |

### Desktop (1280px width, 800px height viewport)

| # | Measurement | Required | Actual | Pass? |
|---|-------------|----------|--------|-------|
| 1.9 | Title + Subtitle combined height | ≤80px | ___px | |
| 1.10 | Graphic height | ≥400px | ___px | |
| 1.11 | Slider + value display visible? | YES | | |
| 1.12 | Total above-fold content | ≤580px | ___px | |

**EVAL 1 SCORE: ___/12 (MUST be 12/12 to pass)**

### Automated Test Code

```typescript
// Above-the-fold test
async function testAboveTheFold(page: Page, viewport: 'mobile' | 'desktop') {
  const heights = viewport === 'mobile'
    ? { title: 60, subtitle: 40, graphic: 280, total: 460 }
    : { titleCombo: 80, graphic: 400, total: 580 };

  const title = await page.$('.game-title');
  const graphic = await page.$('.graphic-container, svg, canvas');
  const slider = await page.$('input[type="range"]');

  const titleBox = await title?.boundingBox();
  const graphicBox = await graphic?.boundingBox();
  const sliderBox = await slider?.boundingBox();

  const viewportHeight = viewport === 'mobile' ? 667 : 800;

  // Check visibility without scroll
  expect(titleBox?.y).toBeLessThan(viewportHeight);
  expect(graphicBox?.y + graphicBox?.height).toBeLessThan(viewportHeight);
  expect(sliderBox?.y).toBeLessThan(viewportHeight);

  // Check heights
  if (viewport === 'mobile') {
    expect(titleBox?.height).toBeLessThanOrEqual(60);
    expect(graphicBox?.height).toBeGreaterThanOrEqual(280);
  } else {
    expect(graphicBox?.height).toBeGreaterThanOrEqual(400);
  }
}
```

---

## EVAL 2: TEXT PLACEMENT TEST (Matches Part 2)

> **Requirement:** Text in SVG must be in edge zones, NOT center. Uses 9-zone grid.

### 9-Zone Grid Test

```
┌─────────┬─────────┬─────────┐
│ Zone 1  │ Zone 2  │ Zone 3  │  ← TOP 25% (text OK)
│ (OK)    │ (OK)    │ (OK)    │
├─────────┼─────────┼─────────┤
│ Zone 4  │ Zone 5  │ Zone 6  │  ← MIDDLE 50% (NO TEXT in Zone 5)
│ (OK)    │ (NO!)   │ (OK)    │
├─────────┼─────────┼─────────┤
│ Zone 7  │ Zone 8  │ Zone 9  │  ← BOTTOM 25% (text OK)
│ (OK)    │ (OK)    │ (OK)    │
└─────────┴─────────┴─────────┘
```

| # | Check | Pass/Fail | Location if Fail |
|---|-------|-----------|------------------|
| 2.1 | Count all `<text>` elements in SVG | _____ texts | |
| 2.2 | ALL text in Zone 5 (center 50% x 50%)? | MUST be 0 | _____ in Zone 5 |
| 2.3 | Each text has ≥24px from nearest other text? | YES/NO | |
| 2.4 | Each text has semi-transparent background? | YES/NO | |
| 2.5 | Text-to-graphic clearance ≥12px? | YES/NO | |

### Text Placement Test Code

```typescript
async function testTextPlacement(page: Page) {
  const svgTexts = await page.$$eval('svg text', (texts) => {
    return texts.map(t => {
      const svg = t.closest('svg');
      const svgRect = svg?.getBoundingClientRect();
      const textRect = t.getBoundingClientRect();

      if (!svgRect) return null;

      // Calculate position as percentage of SVG
      const xPercent = ((textRect.x - svgRect.x) + textRect.width/2) / svgRect.width * 100;
      const yPercent = ((textRect.y - svgRect.y) + textRect.height/2) / svgRect.height * 100;

      // Check if in center zone (25-75% both axes)
      const inCenterZone = xPercent > 25 && xPercent < 75 && yPercent > 25 && yPercent < 75;

      return {
        text: t.textContent,
        xPercent,
        yPercent,
        inCenterZone
      };
    }).filter(Boolean);
  });

  // FAIL if any text in center zone
  const centerTexts = svgTexts.filter(t => t.inCenterZone);
  expect(centerTexts.length).toBe(0);
}
```

**EVAL 2 SCORE: ___/5 (MUST be 5/5 to pass - ANY center text = FAIL)**

---

## EVAL 3: FONT SIZE TEST (Matches Part 3)

> **Requirement:** All text must meet minimum font size requirements.

### Font Size Measurement Table

| # | Element Type | Required Size | Actual Size | Pass? |
|---|--------------|---------------|-------------|-------|
| **PAGE ELEMENTS** | | | | |
| 3.1 | Page Title | 20-32px | ___px | |
| 3.2 | Subtitle | 14-18px | ___px | |
| 3.3 | Section Headers | 16-20px | ___px | |
| 3.4 | Body Text | 14-16px | ___px | |
| **SVG ELEMENTS** | | | | |
| 3.5 | SVG Labels | 10-16px | ___px | |
| 3.6 | SVG Values | 12-18px | ___px | |
| 3.7 | SVG Axis Labels | 9-12px | ___px | |
| **SLIDER ELEMENTS** | | | | |
| 3.8 | Slider Label | 14-18px | ___px | |
| 3.9 | Slider Value | 18-32px (prominent!) | ___px | |
| 3.10 | Slider Hint | 12-14px | ___px | |
| 3.11 | Min/Max Labels | 10-12px | ___px | |
| **EXPLANATION ELEMENTS** | | | | |
| 3.12 | Section Title | 14-18px | ___px | |
| 3.13 | Explanation Text | 13-16px | ___px | |
| 3.14 | Key Insight | 16-20px (bold) | ___px | |

### Font Size Test Code

```typescript
async function testFontSizes(page: Page) {
  const fontChecks = await page.evaluate(() => {
    const checks = [];

    // Title
    const title = document.querySelector('h1, .game-title, [class*="title"]');
    if (title) {
      const size = parseFloat(getComputedStyle(title).fontSize);
      checks.push({ element: 'title', size, min: 20, max: 32 });
    }

    // SVG text
    document.querySelectorAll('svg text').forEach((t, i) => {
      const size = parseFloat(getComputedStyle(t).fontSize);
      checks.push({ element: `svg-text-${i}`, size, min: 10, max: 18 });
    });

    // Slider value
    const sliderValue = document.querySelector('[class*="value"], .slider-value');
    if (sliderValue) {
      const size = parseFloat(getComputedStyle(sliderValue).fontSize);
      checks.push({ element: 'slider-value', size, min: 18, max: 32 });
    }

    return checks;
  });

  fontChecks.forEach(check => {
    expect(check.size).toBeGreaterThanOrEqual(check.min);
    expect(check.size).toBeLessThanOrEqual(check.max);
  });
}
```

**EVAL 3 SCORE: ___/14 (MUST be 14/14 to pass)**

---

## EVAL 4: COLOR CONTRAST TEST (Matches Part 4)

> **Requirement:** All text must meet WCAG contrast ratios.

### WCAG Contrast Requirements

| Text Type | Required Ratio | How to Test |
|-----------|---------------|-------------|
| Normal text (< 18px) | ≥4.5:1 | Use contrast checker tool |
| Large text (≥ 18px bold OR ≥ 24px) | ≥3.0:1 | Use contrast checker tool |
| SVG text on colored background | ≥4.5:1 | Calculate from fill colors |

### Contrast Evaluation Table

| # | Text Element | Background Color | Text Color | Ratio | Pass? |
|---|--------------|------------------|------------|-------|-------|
| 4.1 | Title | _____  | _____ | ___:1 | |
| 4.2 | Subtitle | _____ | _____ | ___:1 | |
| 4.3 | SVG Label 1 | _____ | _____ | ___:1 | |
| 4.4 | SVG Label 2 | _____ | _____ | ___:1 | |
| 4.5 | SVG Label 3 | _____ | _____ | ___:1 | |
| 4.6 | Slider Label | _____ | _____ | ___:1 | |
| 4.7 | Slider Value | _____ | _____ | ___:1 | |
| 4.8 | Explanation Text | _____ | _____ | ___:1 | |

### Approved Color Combinations (from GAME_TEST_SPECIFICATION)

| Background | Text Color | Ratio | Use Case |
|------------|------------|-------|----------|
| White (#FFFFFF) | Black (#000000) | 21:1 | Default |
| White (#FFFFFF) | Dark Gray (#333333) | 12.6:1 | Body text |
| White (#FFFFFF) | Blue (#0066CC) | 6.1:1 | Links |
| Light Gray (#F5F5F5) | Black (#000000) | 16:1 | Cards |
| Blue (#0066CC) | White (#FFFFFF) | 6.1:1 | Buttons |
| Green (#22C55E) | White (#FFFFFF) | 3.1:1 | Success (large only) |
| Red (#EF4444) | White (#FFFFFF) | 4.6:1 | Error/danger |
| SVG Fill (#E0E0E0) | Black (#000000) | 13.3:1 | SVG backgrounds |

### Contrast Test Code

```typescript
async function testColorContrast(page: Page) {
  const contrastIssues = await page.evaluate(() => {
    const issues = [];

    function getLuminance(r: number, g: number, b: number) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function getContrastRatio(l1: number, l2: number) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function parseColor(color: string) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      const hex = ctx.fillStyle;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }

    document.querySelectorAll('*').forEach(el => {
      const style = getComputedStyle(el);
      const text = el.textContent?.trim();
      if (!text || text.length === 0) return;

      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight) || 400;
      const isLargeText = fontSize >= 24 || (fontSize >= 18 && fontWeight >= 700);
      const requiredRatio = isLargeText ? 3.0 : 4.5;

      const bgColor = parseColor(style.backgroundColor);
      const textColor = parseColor(style.color);

      const bgLum = getLuminance(bgColor.r, bgColor.g, bgColor.b);
      const textLum = getLuminance(textColor.r, textColor.g, textColor.b);
      const ratio = getContrastRatio(bgLum, textLum);

      if (ratio < requiredRatio) {
        issues.push({
          text: text.substring(0, 30),
          ratio: ratio.toFixed(2),
          required: requiredRatio,
          fontSize
        });
      }
    });

    return issues;
  });

  expect(contrastIssues.length).toBe(0);
}
```

**EVAL 4 SCORE: ___/8 (MUST be 8/8 to pass)**

---

## EVAL 5: TEXT LENGTH TEST (Matches Part 5)

> **Requirement:** All text must respect character limits.

### Character Count Table

| # | Element | Max Characters | Actual | Pass? |
|---|---------|----------------|--------|-------|
| 5.1 | SVG Label (longest) | 15 chars | _____ | |
| 5.2 | Page Title | 40 chars | _____ | |
| 5.3 | Subtitle | 80 chars | _____ | |
| 5.4 | Slider Label | 25 chars | _____ | |
| 5.5 | Slider Hint | 60 chars | _____ | |
| 5.6 | WHAT explanation | 100 chars | _____ | |
| 5.7 | WHY explanation | 150 chars | _____ | |
| 5.8 | Key insight | 80 chars | _____ | |

### Word Count Table (for SVG)

| # | Device | Max Words in SVG | Actual | Pass? |
|---|--------|------------------|--------|-------|
| 5.9 | Mobile (≤767px) | 15 words | _____ | |
| 5.10 | Desktop (≥768px) | 25 words | _____ | |

### Text Length Test Code

```typescript
async function testTextLength(page: Page, viewport: 'mobile' | 'desktop') {
  const maxSvgWords = viewport === 'mobile' ? 15 : 25;

  const counts = await page.evaluate(() => {
    const results = {
      svgLabels: [] as string[],
      svgTotalWords: 0,
      title: '',
      subtitle: '',
      sliderLabels: [] as string[],
    };

    // Count SVG text
    document.querySelectorAll('svg text').forEach(t => {
      const text = t.textContent?.trim() || '';
      results.svgLabels.push(text);
      results.svgTotalWords += text.split(/\s+/).filter(Boolean).length;
    });

    // Get title/subtitle
    const title = document.querySelector('h1, .game-title');
    results.title = title?.textContent?.trim() || '';

    const subtitle = document.querySelector('.subtitle, h2');
    results.subtitle = subtitle?.textContent?.trim() || '';

    return results;
  });

  // Check SVG label lengths
  counts.svgLabels.forEach(label => {
    expect(label.length).toBeLessThanOrEqual(15);
  });

  // Check SVG word count
  expect(counts.svgTotalWords).toBeLessThanOrEqual(maxSvgWords);

  // Check title length
  expect(counts.title.length).toBeLessThanOrEqual(40);

  // Check subtitle length
  expect(counts.subtitle.length).toBeLessThanOrEqual(80);
}
```

**EVAL 5 SCORE: ___/10 (MUST be 10/10 to pass)**

---

## EVAL 6: SLIDER PLACEMENT TEST (Matches Part 6)

> **Requirement:** Sliders must be close to graphic and show clear connection.

### Slider Proximity Measurement

| # | Measurement | Mobile Max | Desktop Max | Actual | Pass? |
|---|-------------|------------|-------------|--------|-------|
| 6.1 | Distance from graphic bottom to first slider | 100px | 120px | ___px | |
| 6.2 | Distance between sliders (if multiple) | 80px | 100px | ___px | |
| 6.3 | Total slider section height | 150px | 180px | ___px | |

### Slider Connection Checklist

| # | Check | Present? | Notes |
|---|-------|----------|-------|
| 6.4 | Visual line connecting slider to graphic element | | |
| 6.5 | Color coding (slider matches element it controls) | | |
| 6.6 | Label includes "[Control name] controls [Element]" | | |
| 6.7 | Arrow or pointer showing relationship | | |

### Slider Position Test Code

```typescript
async function testSliderPlacement(page: Page, viewport: 'mobile' | 'desktop') {
  const maxDistance = viewport === 'mobile' ? 100 : 120;

  const measurements = await page.evaluate(() => {
    const graphic = document.querySelector('svg, canvas, .graphic-container');
    const slider = document.querySelector('input[type="range"]');

    if (!graphic || !slider) return null;

    const graphicRect = graphic.getBoundingClientRect();
    const sliderRect = slider.getBoundingClientRect();

    return {
      graphicBottom: graphicRect.bottom,
      sliderTop: sliderRect.top,
      distance: sliderRect.top - graphicRect.bottom
    };
  });

  expect(measurements?.distance).toBeLessThanOrEqual(maxDistance);
}
```

**EVAL 6 SCORE: ___/7 (MUST be 7/7 to pass)**

---

## EVAL 7: 3D VISUALIZATION TEST (Matches Part 7)

> **Requirement:** 3D graphics must have clear depth cues and orientation.

### 3D Clarity Checklist (If Applicable)

| # | Requirement | Present? | Notes |
|---|-------------|----------|-------|
| **DEPTH PERCEPTION** | | | |
| 7.1 | Objects farther away appear smaller | | |
| 7.2 | Overlapping objects show clear depth order | | |
| 7.3 | Shadows or gradients indicate depth | | |
| 7.4 | Grid floor or reference plane visible | | |
| **AXIS INDICATORS** | | | |
| 7.5 | X-axis labeled (or color: Red) | | |
| 7.6 | Y-axis labeled (or color: Green) | | |
| 7.7 | Z-axis labeled (or color: Blue) | | |
| 7.8 | Origin point clearly marked | | |
| **ORIENTATION HELPERS** | | | |
| 7.9 | "Side View" / "Top View" / "3D View" label | | |
| 7.10 | Rotation/orbit controls available | | |
| 7.11 | Reset view button present | | |
| **TEXT IN 3D** | | | |
| 7.12 | Labels use billboarding (always face camera) | | |
| 7.13 | Labels have background for readability | | |
| 7.14 | Labels don't occlude important geometry | | |

**EVAL 7 SCORE: ___/14 (Skip if 2D only; MUST be 12/14 to pass if 3D)**

---

## EVAL 8: RESPONSIVE BREAKPOINT TEST (Matches Part 8)

> **Requirement:** Layout must work correctly at all breakpoints.

### Breakpoint Test Matrix

| Breakpoint | Width | Test | Pass? |
|------------|-------|------|-------|
| Mobile Small | 320px | All content visible, no overflow | |
| Mobile Medium | 375px | Primary test device, everything perfect | |
| Mobile Large | 414px | Layout adapts smoothly | |
| Tablet Portrait | 768px | Side-by-side layout if applicable | |
| Tablet Landscape | 1024px | Proper spacing, not too stretched | |
| Desktop | 1280px | Max-width container, centered | |
| Desktop Large | 1920px | Content not stretched beyond max-width | |

### Per-Breakpoint Checklist

For EACH breakpoint, verify:

| # | Check | 320px | 375px | 768px | 1280px |
|---|-------|-------|-------|-------|--------|
| 8.1 | No horizontal scroll | | | | |
| 8.2 | All text readable | | | | |
| 8.3 | Touch targets ≥44px (mobile) | | | | |
| 8.4 | Graphic fits viewport | | | | |
| 8.5 | Sliders usable | | | | |
| 8.6 | Navigation accessible | | | | |

### Breakpoint Test Code

```typescript
const BREAKPOINTS = [
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile-medium', width: 375, height: 667 },
  { name: 'mobile-large', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'desktop-large', width: 1920, height: 1080 },
];

async function testAllBreakpoints(page: Page) {
  for (const bp of BREAKPOINTS) {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(100); // Allow reflow

    // Check no horizontal scroll
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);

    // Check graphic fits
    const graphicOverflow = await page.evaluate(() => {
      const graphic = document.querySelector('svg, canvas');
      if (!graphic) return false;
      const rect = graphic.getBoundingClientRect();
      return rect.right > window.innerWidth || rect.left < 0;
    });
    expect(graphicOverflow).toBe(false);
  }
}
```

**EVAL 8 SCORE: ___/24 (6 checks × 4 breakpoints; MUST be 24/24 to pass)**

---

## EVAL 9: TITLE VS GRAPHIC BALANCE TEST (Matches Part 9)

> **Requirement:** Graphic must dominate the viewport, not the title.

### Height Ratio Measurement

| # | Element | Mobile Target | Desktop Target | Actual | Pass? |
|---|---------|---------------|----------------|--------|-------|
| 9.1 | Title section height | ≤15% viewport | ≤10% viewport | ___% | |
| 9.2 | Graphic section height | ≥40% viewport | ≥50% viewport | ___% | |
| 9.3 | Title:Graphic ratio | ≤1:3 | ≤1:5 | 1:___ | |

### Visual Dominance Test

```
Take a screenshot. Ask someone: "What's the MAIN thing on this screen?"

✅ PASS: They point to the graphic
❌ FAIL: They point to the title, controls, or text
```

### Balance Test Code

```typescript
async function testTitleGraphicBalance(page: Page, viewport: 'mobile' | 'desktop') {
  const viewportHeight = viewport === 'mobile' ? 667 : 800;
  const maxTitlePercent = viewport === 'mobile' ? 15 : 10;
  const minGraphicPercent = viewport === 'mobile' ? 40 : 50;

  const measurements = await page.evaluate(() => {
    const title = document.querySelector('h1, .game-title, .title-section');
    const graphic = document.querySelector('svg, canvas, .graphic-container');

    const titleHeight = title?.getBoundingClientRect().height || 0;
    const graphicHeight = graphic?.getBoundingClientRect().height || 0;

    return { titleHeight, graphicHeight };
  });

  const titlePercent = (measurements.titleHeight / viewportHeight) * 100;
  const graphicPercent = (measurements.graphicHeight / viewportHeight) * 100;

  expect(titlePercent).toBeLessThanOrEqual(maxTitlePercent);
  expect(graphicPercent).toBeGreaterThanOrEqual(minGraphicPercent);
}
```

**EVAL 9 SCORE: ___/3 (MUST be 3/3 to pass)**

---

## EVAL 10: COMPLETE VISUAL CLARITY CHECKLIST (Matches Part 10)

> **Final binary pass/fail for the entire visual system.**

### The 15-Point Instant Check

| # | Question | YES/NO |
|---|----------|--------|
| 10.1 | Can identify the topic from title in 2 seconds? | |
| 10.2 | Can see where the graphic is? (distinct boundary) | |
| 10.3 | Can read ALL labels without zooming? | |
| 10.4 | Can identify what to adjust within 3 seconds? | |
| 10.5 | Can find the slider(s) without scrolling? | |
| 10.6 | Does moving slider cause OBVIOUS visual change? | |
| 10.7 | Is the change EXPLAINED (not just visual)? | |
| 10.8 | Is there visible whitespace between sections? | |
| 10.9 | Does NOTHING overlap? | |
| 10.10 | Is the graphic the DOMINANT element? | |
| 10.11 | Can scroll smoothly on mobile? | |
| 10.12 | Do sliders NOT block scrolling? | |
| 10.13 | Is Continue/Next button always reachable? | |
| 10.14 | Would a first-time user understand this in 10 seconds? | |
| 10.15 | Would you be proud to show this to a design reviewer? | |

**EVAL 10 SCORE: ___/15 (MUST be 15/15 to pass)**

---

## TOTAL VISUAL CLARITY EVALUATION SUMMARY

| Eval Section | Max Score | Your Score | Pass Threshold | Pass? |
|--------------|-----------|------------|----------------|-------|
| EVAL 1: Above-the-Fold | 12 | ___/12 | 12/12 | |
| EVAL 2: Text Placement | 5 | ___/5 | 5/5 | |
| EVAL 3: Font Size | 14 | ___/14 | 14/14 | |
| EVAL 4: Color Contrast | 8 | ___/8 | 8/8 | |
| EVAL 5: Text Length | 10 | ___/10 | 10/10 | |
| EVAL 6: Slider Placement | 7 | ___/7 | 7/7 | |
| EVAL 7: 3D Visualization | 14 | ___/14 | 12/14 (if 3D) | |
| EVAL 8: Responsive | 24 | ___/24 | 24/24 | |
| EVAL 9: Title/Graphic Balance | 3 | ___/3 | 3/3 | |
| EVAL 10: Complete Checklist | 15 | ___/15 | 15/15 | |

**TOTAL: ___/112**

### PASS REQUIREMENTS

```
┌─────────────────────────────────────────────────────────────────┐
│                   VISUAL CLARITY PASS CRITERIA                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MANDATORY (All must pass):                                     │
│  ✓ EVAL 1: Above-the-Fold         12/12                        │
│  ✓ EVAL 2: Text Placement          5/5                         │
│  ✓ EVAL 3: Font Size              14/14                        │
│  ✓ EVAL 4: Color Contrast          8/8                         │
│  ✓ EVAL 5: Text Length            10/10                        │
│  ✓ EVAL 6: Slider Placement        7/7                         │
│  ✓ EVAL 8: Responsive             24/24                        │
│  ✓ EVAL 9: Title/Graphic Balance   3/3                         │
│  ✓ EVAL 10: Complete Checklist    15/15                        │
│                                                                 │
│  CONDITIONAL:                                                   │
│  ✓ EVAL 7: 3D Visualization       12/14 (if game uses 3D)      │
│                                                                 │
│  OVERALL MINIMUM: 98/112 (87%)                                  │
│                                                                 │
│  ⚠️  ANY single EVAL with score below threshold = FAIL          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# Section L: Intelligent Labeling System Evaluation

> **Purpose**: Evaluate that game labels are positioned intelligently to avoid overlaps,
> maintain clarity across viewports, and follow budget constraints.

## L1. Labeling Quality Checks

| Check | Threshold | Critical | Description |
|-------|-----------|----------|-------------|
| Word Budget | 100% | YES | Labels must not exceed word limits per viewport |
| Label Count | 100% | YES | Labels must not exceed count limits per viewport |
| No Overlaps | 100% | YES | Zero tolerance for label/graphic collisions |
| Min Font Size | 100% | YES | All labels must be ≥ 10px |
| Center Zone Clear | 100% | YES | Labels must not obscure center graphics area |
| Min Gap (24px) | 90% | NO | Labels should maintain 24px minimum spacing |
| Abbreviation Rules | 90% | NO | Labels with abbreviations should define usage rules |

## L2. Viewport-Specific Budgets

| Viewport | Max Words | Max Labels | Rationale |
|----------|-----------|------------|-----------|
| Mobile | 12 | 3 | Limited screen real estate |
| Tablet | 16 | 4 | Moderate space available |
| Desktop | 20 | 5 | Full screen utilization |

## L3. Label Definition Checklist

For each label in the game, verify:

| # | Check | Pass? |
|---|-------|-------|
| L3.1 | Has unique `id` | |
| L3.2 | References valid `targetId` (registered element) | |
| L3.3 | Has meaningful `fullText` (not abbreviated) | |
| L3.4 | If has `abbreviation`, has `useAbbreviationAfter` defined | |
| L3.5 | Has appropriate `priority` (critical/high/medium/low) | |
| L3.6 | Has readable `style.fontSize` (≥10px) | |
| L3.7 | Has contrasting `style.fill` color | |
| L3.8 | Has `viewportOverrides` for mobile if needed | |

## L4. Automated Labeling Evaluation

```typescript
// File: tests/evals/labelingEval.ts

import { LabelEvaluator, validateLabels } from '@/game-server/src/labeling';

export const evaluateGameLabeling = async (
  game: GameInstance,
  viewports: ViewportType[]
): Promise<LabelingEvalResult> => {
  const evaluator = new LabelEvaluator();
  const results: Record<ViewportType, LabelEvaluationResult> = {};
  const failures: string[] = [];

  for (const viewport of viewports) {
    // Initialize game with viewport
    game.initialize({
      gameType: game.gameType,
      userId: 'eval-user',
      viewport: {
        width: viewport === 'mobile' ? 375 : viewport === 'tablet' ? 768 : 1280,
        height: viewport === 'mobile' ? 667 : viewport === 'tablet' ? 1024 : 800,
        isMobile: viewport === 'mobile'
      }
    });

    // Render frame to get labels
    const frame = game.render();

    // Extract positioned labels from frame
    const labels = extractLabelsFromFrame(frame);
    const definitions = game.getLabelDefinitions?.() || [];

    // Evaluate
    const result = evaluator.evaluate(
      labels,
      definitions,
      viewport,
      frame.viewport.width,
      frame.viewport.height
    );

    results[viewport] = result;

    if (!result.passed) {
      failures.push(...result.criticalFailures.map(f => `[${viewport}] ${f}`));
    }
  }

  const allPassed = Object.values(results).every(r => r.passed);
  const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / viewports.length;

  return {
    passed: allPassed,
    score: Math.round(avgScore),
    viewportResults: results,
    failures
  };
};
```

## L5. Manual Labeling Inspection

For each phase that contains labels, verify visually:

| # | Check | Mobile | Tablet | Desktop |
|---|-------|--------|--------|---------|
| L5.1 | Labels are readable without zooming | | | |
| L5.2 | Labels don't overlap graphics | | | |
| L5.3 | Labels don't overlap each other | | | |
| L5.4 | Labels have sufficient contrast | | | |
| L5.5 | Labels point to correct elements | | | |
| L5.6 | Label text is accurate/helpful | | | |
| L5.7 | Critical labels are always visible | | | |
| L5.8 | Non-essential labels hidden on mobile | | | |

## L6. Labeling Integration Verification

Verify the game uses the labeling system correctly:

| # | Check | Pass? |
|---|-------|-------|
| L6.1 | Game imports `LabelingEngine` | |
| L6.2 | Game creates `labelEngine` instance | |
| L6.3 | Game calls `labelEngine.clear()` each frame | |
| L6.4 | Game registers elements with `registerElement()` | |
| L6.5 | Game registers labels with `registerLabel()` | |
| L6.6 | Game uses `toFrameWithLabels()` for rendering | |
| L6.7 | Game sets viewport with `setViewport()` | |

## L7. Labeling Score Calculator

```
┌─────────────────────────────────────────────────────────────────┐
│                    LABELING EVALUATION SCORE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CRITICAL CHECKS (Must all pass):                                │
│  □ Word Budget Compliance         ___/100%  (need 100%)         │
│  □ Label Count Compliance         ___/100%  (need 100%)         │
│  □ Zero Overlaps                  ___/100%  (need 100%)         │
│  □ Min Font Size                  ___/100%  (need 100%)         │
│  □ Center Zone Clear              ___/100%  (need 100%)         │
│                                                                  │
│  NON-CRITICAL CHECKS:                                            │
│  □ Min Gap (24px)                 ___/100%  (need 90%)          │
│  □ Abbreviation Rules Defined     ___/100%  (need 90%)          │
│                                                                  │
│  INTEGRATION CHECKS:                                             │
│  □ L6 Integration Checklist       ___/7     (need 7/7)          │
│                                                                  │
│  MANUAL INSPECTION (L5):                                         │
│  □ Mobile viewport                ___/8     (need 8/8)          │
│  □ Tablet viewport                ___/8     (need 8/8)          │
│  □ Desktop viewport               ___/8     (need 8/8)          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  PASS CRITERIA:                                                  │
│  • ALL critical checks at 100%                                   │
│  • ALL non-critical checks at ≥90%                               │
│  • Integration checklist 7/7                                     │
│  • Manual inspection 8/8 on each viewport                        │
│                                                                  │
│  RESULT: □ PASS  □ FAIL                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

# Section M: Smart Design System Evaluation

> **Purpose**: Evaluate that game graphics are realistic, clear, well-spaced, and appropriate
> for the physics concept being demonstrated. This section assesses the overall visual quality
> and educational effectiveness of the interactive graphic.

## M1. Design System Overview

The Smart Design System provides:
- **Realistic Object Styles**: Pre-built materials, gradients, shadows, highlights
- **Layout Engine**: Smart spacing, safe zones, viewport-aware positioning
- **Interaction Design**: Clear sliders with educational context
- **3D Visualization**: Proper depth cues for 3D concepts
- **Design Evaluator**: Automated quality assessment

## M2. Realism Evaluation (20% weight)

| # | Check | Threshold | Pass? |
|---|-------|-----------|-------|
| M2.1 | Objects have realistic materials (gradients/shading) | Required for primary objects | |
| M2.2 | Shadows are present for depth perception | Required for primary objects | |
| M2.3 | Light direction is consistent across all shadows | 100% consistent | |
| M2.4 | Colors are natural (not garish/neon) | 100% | |
| M2.5 | Object proportions match real-world | Visual inspection | |
| M2.6 | Motion appears smooth and realistic | 60fps visual check | |

**Realism Score: ___/100 (Minimum: 80)**

## M3. Clarity Evaluation (35% weight)

| # | Check | Threshold | Pass? |
|---|-------|-----------|-------|
| M3.1 | Main physics concept is immediately visible | Yes/No | |
| M3.2 | Primary object is clearly distinguishable | Yes/No | |
| M3.3 | Visual hierarchy is clear (primary → secondary → decoration) | Yes/No | |
| M3.4 | Labels don't obscure important graphics | 100% | |
| M3.5 | Minimal visual clutter (≤10 objects) | Yes/No | |
| M3.6 | Decoration elements don't distract (≤3) | Yes/No | |
| M3.7 | All sliders have clear descriptions | 100% | |
| M3.8 | All sliders have educational notes explaining importance | 100% | |

**Clarity Score: ___/100 (Minimum: 90)**

## M4. Usability Evaluation (25% weight)

| # | Check | Threshold | Pass? |
|---|-------|-----------|-------|
| M4.1 | Touch targets meet minimum size (44px on mobile) | 100% | |
| M4.2 | Sliders provide immediate visual feedback | 100% | |
| M4.3 | Affected objects highlight when slider changes | 100% | |
| M4.4 | Reset/restart capability is available | Required | |
| M4.5 | Controls are self-explanatory without instructions | Yes/No | |
| M4.6 | Mobile has ≤4 visible sliders (others collapsed) | Yes/No | |

**Usability Score: ___/100 (Minimum: 90)**

## M5. Spacing Evaluation (20% weight)

| # | Check | Threshold | Pass? |
|---|-------|-----------|-------|
| M5.1 | Objects have adequate spacing between them | viewport-specific | |
| M5.2 | Objects maintain edge margins | viewport-specific | |
| M5.3 | No unintentional overlaps | 100% | |
| M5.4 | Labels have room without crowding graphics | 100% | |
| M5.5 | Controls have adequate separation from graphics | 100% | |
| M5.6 | Layout works across mobile, tablet, desktop | All viewports | |

**Spacing Thresholds:**
| Viewport | Object Gap | Label Gap | Edge Margin | Control Gap |
|----------|-----------|-----------|-------------|-------------|
| Mobile   | 16px      | 8px       | 12px        | 20px        |
| Tablet   | 24px      | 12px      | 20px        | 28px        |
| Desktop  | 32px      | 16px      | 32px        | 36px        |

**Spacing Score: ___/100 (Minimum: 85)**

## M6. Object Selection Guidance

For common physics concepts, verify appropriate objects are used:

| Concept | Recommended Objects | Avoid |
|---------|---------------------|-------|
| Projectile Motion | Ball (metallic or rubber), Target marker | Abstract shapes |
| Center of Mass | Realistic weighted objects, COM marker | Generic circles |
| Springs/Oscillation | Coil spring with realistic material | Simple lines |
| Pendulum | Metal bob with string, pivot point | Abstract pendulum |
| Waves | Clear wave patterns with depth cues | Flat sine waves |
| Electric Fields | Field lines with glow effect | Plain arrows |
| Fluid Dynamics | Particle system, transparent container | Solid blocks |

## M7. 3D Visualization Checklist (if applicable)

| # | Check | Pass? |
|---|-------|-------|
| M7.1 | Appropriate visualization mode selected for concept | |
| M7.2 | Depth cues help understand 3D relationships | |
| M7.3 | View angle clearly shows the concept | |
| M7.4 | Shadows cast appropriately for depth | |
| M7.5 | Size attenuation used if perspective mode | |
| M7.6 | Occlusion (overlapping) shows correct depth order | |

**Recommended Visualization Modes:**
| Concept | Mode | Reason |
|---------|------|--------|
| Projectile Motion | depth_cues | 2D motion needs subtle 3D hints |
| Circular Motion | perspective | Shows circular path clearly |
| Center of Mass | isometric | Maintains measurability |
| Torque | isometric | Clear view of rotation axis |
| Waves | perspective | Shows 3D wave propagation |
| Atomic Structure | animated_rotation | Orbitals are inherently 3D |
| Optics | orthographic | Ray diagrams need precision |

## M8. Slider Design Checklist

For each slider in the game, verify:

| # | Slider Property | Required? | Check |
|---|-----------------|-----------|-------|
| M8.1 | Clear, descriptive label | YES | |
| M8.2 | Unit of measurement shown | YES | |
| M8.3 | Description explaining what it controls | YES | |
| M8.4 | Educational note explaining WHY it matters | YES | |
| M8.5 | Appropriate min/max/step values | YES | |
| M8.6 | Sensible default value | YES | |
| M8.7 | Visual feedback type matches purpose | YES | |
| M8.8 | Highlight target object when changed | Recommended | |

**Example Well-Designed Slider:**
```typescript
{
  id: 'angle',
  label: 'Launch Angle',
  description: 'The angle at which the object is launched',
  unit: '°',
  educationalNote: 'Angle affects both height and distance. 45° gives maximum range in ideal conditions.',
  min: 0,
  max: 90,
  step: 1,
  defaultValue: 45,
  feedbackType: 'preview',
  visualIndicator: { highlightTarget: true, showDelta: false }
}
```

## M9. Automated Design Evaluation

```typescript
// File: tests/evals/designEval.ts

import {
  DesignEvaluator,
  evaluateDesign,
  GraphicDesignSpec
} from '@/game-server/src/design';

export const runDesignEvaluation = (
  spec: GraphicDesignSpec
): DesignEvaluationResult => {
  const evaluator = new DesignEvaluator();

  // Evaluate for all viewports
  const results = {
    mobile: evaluator.evaluate(spec, 'mobile'),
    tablet: evaluator.evaluate(spec, 'tablet'),
    desktop: evaluator.evaluate(spec, 'desktop'),
  };

  // All viewports must pass
  const allPassed = Object.values(results).every(r => r.passed);

  return {
    passed: allPassed,
    viewportResults: results,
    recommendations: results.desktop.recommendations,
  };
};
```

## M10. Design Score Calculator

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESIGN EVALUATION SCORE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CATEGORY SCORES (weighted):                                     │
│  □ Realism (20%)              ___/100  (min 80)                 │
│  □ Clarity (35%)              ___/100  (min 90)                 │
│  □ Usability (25%)            ___/100  (min 90)                 │
│  □ Spacing (20%)              ___/100  (min 85)                 │
│                                                                  │
│  WEIGHTED TOTAL:              ___/100                           │
│                                                                  │
│  ADDITIONAL CHECKS:                                              │
│  □ Object selection appropriate   □ YES  □ NO                   │
│  □ 3D visualization (if used)     □ YES  □ NO  □ N/A            │
│  □ All sliders well-designed      □ YES  □ NO                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  PASS CRITERIA:                                                  │
│  • Realism ≥ 80                                                  │
│  • Clarity ≥ 90                                                  │
│  • Usability ≥ 90                                                │
│  • Spacing ≥ 85                                                  │
│  • Overall weighted ≥ 85                                         │
│  • All additional checks = YES (or N/A)                          │
│                                                                  │
│  RESULT: □ PASS  □ FAIL                                          │
└─────────────────────────────────────────────────────────────────┘
```

## M11. Quick Design Review Checklist

Use this for rapid assessment during development:

```
[ ] REALISM
    [ ] Primary objects have gradients/shading
    [ ] Shadows present on main objects
    [ ] Colors look natural, not garish
    [ ] Light direction consistent

[ ] CLARITY
    [ ] I immediately understand what this demonstrates
    [ ] Primary object stands out
    [ ] Not too cluttered (≤10 objects)
    [ ] Sliders explain what AND why

[ ] USABILITY
    [ ] Can reset/restart
    [ ] Sliders give immediate feedback
    [ ] Works without instructions
    [ ] Mobile-friendly controls

[ ] SPACING
    [ ] Objects don't overlap
    [ ] Adequate breathing room
    [ ] Labels don't block graphics
    [ ] Works on all viewports

[ ] INTERACTION
    [ ] I understand what each slider does
    [ ] I understand WHY each slider matters
    [ ] Changes are visible immediately
    [ ] Affected objects are highlighted
```

---

# APPENDIX: Evaluation Report Template

```markdown
# Game Evaluation Report

## Summary

| Field | Value |
|-------|-------|
| Game Name | |
| Evaluator | |
| Date | |
| Overall Score | |
| Grade | |
| Decision | |

## Scores by Category

| Category | Score | Pass? |
|----------|-------|-------|
| Structure & Flow | /100 | |
| Interactive Graphics | /100 | |
| Clarity & Understanding | /100 | |
| Responsive Design | /100 | |
| Button Reliability | /100 | |
| Design Quality | /100 | |
| Educational Effectiveness | /100 | |
| Intelligent Labeling | /100 | |
| Smart Design System | /100 | |

## Critical Issues (Must Fix)

1.
2.
3.

## Recommendations (Should Fix)

1.
2.
3.

## Strengths

1.
2.
3.

## Screenshots

[Attach screenshots of each phase]

## Sign-off

- [ ] Evaluator approves for production
- [ ] Evaluator requests changes (see issues above)
```
