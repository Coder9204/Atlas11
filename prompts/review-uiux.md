# /review-uiux - Educational Game UI/UX Review

Review an educational game renderer against the 7 Immutable Laws and design specifications.

## Usage
```
/review-uiux [RendererName]
```

## Review Process

When this skill is invoked:

1. **Locate the renderer** in `components/GeneratedDiagram.tsx`
2. **Analyze each screen** against the 7 Laws
3. **Check component patterns** against the design system
4. **Generate a report** with scores and actionable fixes

---

## THE 7 LAWS CHECKLIST

For each screen in the game, evaluate:

### Law 1: One Screen, One Purpose
- [ ] Can you state the screen's purpose in 5 words?
- [ ] Is there exactly ONE primary action?
- [ ] Are secondary actions clearly subordinate?

**Score:** Pass / Needs Work / Fail

### Law 2: The 3-Second Rule
- [ ] Would a 10-year-old understand what to do immediately?
- [ ] Is the primary action visually obvious?
- [ ] Is there any confusing jargon?

**Score:** Pass / Needs Work / Fail

### Law 3: Progressive Disclosure
- [ ] Is only essential information shown initially?
- [ ] Are advanced features hidden until needed?
- [ ] Are hints/help collapsible?

**Score:** Pass / Needs Work / Fail

### Law 4: Feedback Is Oxygen
- [ ] Does every button/interaction have hover/active states?
- [ ] Are loading states shown?
- [ ] Do errors explain what happened?

**Score:** Pass / Needs Work / Fail

### Law 5: Generous Undo
- [ ] Is there a visible Undo/Reset button?
- [ ] Can users easily restart without penalty?
- [ ] Is experimentation encouraged?

**Score:** Pass / Needs Work / Fail

### Law 6: Motion With Meaning
- [ ] Do animations explain causation?
- [ ] Are transitions under 400ms?
- [ ] Is there unnecessary decorative motion?

**Score:** Pass / Needs Work / Fail

### Law 7: Accessibility
- [ ] Are touch targets at least 44px?
- [ ] Is color never the ONLY indicator?
- [ ] Are there proper focus states?

**Score:** Pass / Needs Work / Fail

---

## SCREEN-BY-SCREEN AUDIT

### Home Screen
- [ ] Has 3-4 mode options max
- [ ] Each card has: Icon + Title + Description
- [ ] Primary mode is visually emphasized
- [ ] Touch targets ≥ 48px height

### Progress Map
- [ ] Current level is visually prominent (pulse/glow)
- [ ] Completed levels show mastery tier
- [ ] Locked levels are 50% opacity with lock icon
- [ ] Connection lines show progress

### Mission Brief
- [ ] Objective is ≤20 words
- [ ] Uses achievement framing (not teaching language)
- [ ] Success criteria is bulleted (2-4 items)
- [ ] Single primary CTA at bottom

### Build/Plan Screen
- [ ] Objective visible in sticky header
- [ ] Toolbox clearly labeled with icons
- [ ] Workspace is 60-70% of screen
- [ ] Undo button on left, Run button on right

### Simulate Screen
- [ ] Viewport is maximized
- [ ] Playback controls use media player paradigm
- [ ] Speed control available (0.5x, 1x, 2x)
- [ ] Step-through option exists

### Debrief Screen
- [ ] Success is celebratory (brief)
- [ ] Failure is encouraging (not punishing)
- [ ] Metrics use visual progress bars
- [ ] Path to Gold is shown

---

## VISUAL DESIGN AUDIT

### Colors
- [ ] Primary actions use Blue-500/600
- [ ] Success states use Green-500
- [ ] Failure states use Red-500 or Amber-500
- [ ] Bronze/Silver/Gold use correct palette

### Typography
- [ ] Max 2 font weights per screen
- [ ] Max 3 font sizes per screen
- [ ] Body text is not center-aligned

### Spacing
- [ ] Uses 8-point grid (4, 8, 16, 24, 32, 48, 64)
- [ ] Consistent padding within components

### Components
- [ ] Buttons use rounded-xl (12px) for primary
- [ ] Cards use rounded-2xl (16px)
- [ ] Proper elevation shadows

---

## REPORT FORMAT

```
╔══════════════════════════════════════════════════════════════╗
║           UI/UX REVIEW: [RendererName]                       ║
╠══════════════════════════════════════════════════════════════╣
║ Overall Score: [X/7 Laws Passing]                            ║
║ Grade: [A/B/C/D/F]                                           ║
╚══════════════════════════════════════════════════════════════╝

## 7 Laws Summary
┌────────────────────────────┬────────┐
│ Law                        │ Status │
├────────────────────────────┼────────┤
│ 1. One Screen, One Purpose │ ✓/⚠/✗  │
│ 2. 3-Second Rule           │ ✓/⚠/✗  │
│ 3. Progressive Disclosure  │ ✓/⚠/✗  │
│ 4. Feedback Is Oxygen      │ ✓/⚠/✗  │
│ 5. Generous Undo           │ ✓/⚠/✗  │
│ 6. Motion With Meaning     │ ✓/⚠/✗  │
│ 7. Accessibility           │ ✓/⚠/✗  │
└────────────────────────────┴────────┘

## Screen-by-Screen Analysis
[Detailed findings for each screen]

## Priority Fixes
1. [Critical issue - must fix]
2. [High priority - should fix]
3. [Medium priority - nice to have]

## Code Snippets
[Specific code changes to implement fixes]
```

---

## GRADING SCALE

| Grade | Laws Passing | Description |
|-------|--------------|-------------|
| A     | 7/7          | Ship it! |
| B     | 6/7          | Minor polish needed |
| C     | 5/7          | Significant issues |
| D     | 3-4/7        | Major rework needed |
| F     | 0-2/7        | Back to the drawing board |

---

## EXAMPLE REVIEW OUTPUT

```
╔══════════════════════════════════════════════════════════════╗
║           UI/UX REVIEW: NewtonsLawsRenderer                  ║
╠══════════════════════════════════════════════════════════════╣
║ Overall Score: 5/7 Laws Passing                              ║
║ Grade: C                                                     ║
╚══════════════════════════════════════════════════════════════╝

## 7 Laws Summary
┌────────────────────────────┬────────┐
│ Law                        │ Status │
├────────────────────────────┼────────┤
│ 1. One Screen, One Purpose │ ✓      │
│ 2. 3-Second Rule           │ ✓      │
│ 3. Progressive Disclosure  │ ⚠      │
│ 4. Feedback Is Oxygen      │ ✓      │
│ 5. Generous Undo           │ ✗      │
│ 6. Motion With Meaning     │ ✓      │
│ 7. Accessibility           │ ⚠      │
└────────────────────────────┴────────┘

## Priority Fixes
1. [CRITICAL] Add Reset/Undo button to Build screen
2. [HIGH] Increase touch targets from 40px to 44px
3. [MEDIUM] Add hint collapse on Mission Brief

## Code Fix for #1:
<button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
  ↶ Reset
</button>
```
