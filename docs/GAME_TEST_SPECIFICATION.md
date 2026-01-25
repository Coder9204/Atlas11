# Game Test Specification

Based on the Wave Particle Duality game structure, this document outlines the tests, structure, and design patterns that should be validated for all interactive games.

---

## 1. Phase Structure Tests

### 1.1 Required Phases
Every game should have these core phases in sequence:

| Phase | Purpose | Required Elements |
|-------|---------|-------------------|
| `hook` | Engage & introduce | Title, compelling intro text, visual element, "Begin" button |
| `predict` | Activate prior knowledge | Clear question, 2-4 options, guidance text |
| `play` | Interactive exploration | Simulation/interaction, real-time feedback, controls |
| `review` | Explain first concept | Key takeaways, visual comparison, quotes/facts |
| `twist_predict` | Challenge assumptions | New scenario, prediction options |
| `twist_play` | Reveal the twist | Interactive demonstration of twist |
| `twist_review` | Deep understanding | Explanation, key insights, connection to real world |
| `transfer` | Real-world applications | 3-4 applications with details, sequential unlock |
| `test` | Knowledge assessment | 5-10 questions with scenarios |
| `mastery` | Completion & celebration | Summary of learned concepts, next steps |

### 1.2 Phase Flow Tests
```
[ ] Phase sequence is correct (no skipping)
[ ] Back button returns to previous phase
[ ] Next button only enabled when requirements met
[ ] Phase state persists during session
[ ] gamePhase prop can resume to any phase
```

---

## 2. Component Structure Tests

### 2.1 PremiumWrapper Usage
```typescript
// CORRECT: Using footer prop
<PremiumWrapper footer={renderBottomBar(...)}>
  <div style={{ padding: '16px', maxWidth: '650px', margin: '0 auto' }}>
    {/* Content */}
  </div>
</PremiumWrapper>

// INCORRECT: Footer inside wrapper
<PremiumWrapper>
  <div>
    {/* Content */}
    {renderBottomBar(...)} // WRONG - causes scroll issues
  </div>
</PremiumWrapper>
```

**Tests:**
```
[ ] All phases use PremiumWrapper
[ ] Footer/navigation uses footer prop (not inside children)
[ ] Home button visible and functional
[ ] Progress indicator shows current phase
```

### 2.2 Styling Requirements
```
[ ] NO Tailwind className on scroll containers
[ ] Inline styles for layout (flex, overflow, minHeight)
[ ] Tailwind OK for SVG text and non-scroll elements
[ ] colors object used for consistent theming
[ ] isMobile checks for responsive sizing
```

**Required inline styles for scroll containers:**
```typescript
style={{
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch'
}}
```

---

## 3. UI/UX Pattern Tests

### 3.1 Section Headers
```typescript
renderSectionHeader(
  "Step N • Phase Name",     // Step indicator
  "Main Title",              // Clear, engaging title
  "Subtitle explanation"     // Context/guidance
)
```

**Tests:**
```
[ ] Each phase has section header
[ ] Step numbers are sequential
[ ] Titles are clear and descriptive
[ ] Subtitles provide context
```

### 3.2 Bottom Navigation Bar
```typescript
renderBottomBar(
  showBack: boolean,      // Show back button?
  canProceed: boolean,    // Enable next button?
  nextLabel: string,      // "Next Phase Name"
  onNext?: () => void,    // Custom handler (optional)
  accentColor?: string    // Phase-specific color
)
```

**Tests:**
```
[ ] Back button visible except on first phase
[ ] Next button disabled until requirements met
[ ] Next button label indicates destination
[ ] Buttons use onMouseDown (not onClick) for mobile
[ ] Visual feedback on button states
```

### 3.3 Interactive Elements
```
[ ] All buttons use onMouseDown + onTouchEnd
[ ] Selection states clearly visible
[ ] Hover states on desktop
[ ] Touch targets minimum 44x44px
[ ] No pointer-events issues with overlays
```

---

## 4. Content Quality Tests

### 4.1 Hook Phase
```
[ ] Compelling title that sparks curiosity
[ ] Brief, engaging introduction (2-3 sentences)
[ ] Visual element (animation, diagram, or icon)
[ ] Famous quote or intriguing fact
[ ] Clear "Begin" call-to-action
[ ] Estimated time or step count
```

### 4.2 Predict Phase
```
[ ] Clear experiment/scenario setup
[ ] Visual diagram of setup
[ ] Explicit question being asked
[ ] 2-4 distinct prediction options
[ ] Each option has label + description
[ ] Reasoning hint without giving answer
[ ] "Think About It" guidance section
```

### 4.3 Play Phase (Simulation)
```
[ ] Interactive controls clearly labeled
[ ] Real-time visual feedback
[ ] Progress indicator (count, percentage)
[ ] Teaching milestones at key moments
[ ] Explanation panel with context
[ ] Clear indication when ready to proceed
```

### 4.4 Review Phases
```
[ ] Comparison cards (before/after, option A/B)
[ ] Key takeaways list (3-5 items)
[ ] Visual diagrams supporting explanation
[ ] Expert quote or scientific fact
[ ] Connection to broader concept
```

### 4.5 Transfer Phase
```
[ ] 3-4 real-world applications
[ ] Sequential unlock (complete one to see next)
[ ] Each application has:
    [ ] Icon and title
    [ ] Tagline
    [ ] Full description
    [ ] Connection to learned concept
    [ ] How it works explanation
    [ ] Statistics (3 data points)
    [ ] Real-world examples (4 items)
    [ ] Industry leaders
    [ ] Future impact
[ ] Visual diagram for each application
[ ] Progress tracking (X/4 completed)
```

### 4.6 Test Phase
```
[ ] 5-10 scenario-based questions
[ ] Each question has:
    [ ] Scenario context
    [ ] Clear question
    [ ] 3-4 answer options
    [ ] Correct answer marked
    [ ] Explanation for review
[ ] Progress bar showing question count
[ ] Answer selection clearly visible
[ ] Submit only after answering all
[ ] Results screen with:
    [ ] Score and percentage
    [ ] Pass/fail indication (70% threshold)
    [ ] Question-by-question review
    [ ] Correct answer shown for wrong answers
    [ ] Explanation for each question
    [ ] Retake option
```

### 4.7 Mastery Phase
```
[ ] Celebration visual (confetti, badge)
[ ] Congratulatory title
[ ] Summary of concepts mastered (5 items)
[ ] Each concept has icon, title, description
[ ] Checkmarks for completed items
[ ] "Start Over" option
[ ] "Free Exploration" option (if applicable)
```

---

## 5. AI Coach Integration Tests

### 5.1 Event Emission
Every significant action should emit a game event:

```typescript
emitGameEvent('event_type', {
  phase: 'current_phase',
  phaseLabel: 'Human Readable Phase Name',
  // Event-specific details
  message: 'Human readable summary'
});
```

**Required Events:**
```
[ ] game_started - When game begins
[ ] phase_changed - On every phase transition
[ ] prediction_made - When user makes prediction
[ ] answer_selected - When user selects answer
[ ] app_completed - When transfer app completed
[ ] game_completed - When test finished
[ ] screen_change - For sub-screens within phase
```

### 5.2 Screen Descriptions
```typescript
const screenDescriptions: Record<Phase, string> = {
  hook: 'INTRO SCREEN: [Full description of what user sees]',
  predict: 'PREDICTION SCREEN: [What user must do, options available]',
  // ... for each phase
};
```

**Tests:**
```
[ ] Every phase has screen description
[ ] Descriptions are detailed (what user sees, can do)
[ ] Descriptions included in phase_changed events
[ ] AI coach receives full context
```

---

## 6. Responsive Design Tests

### 6.1 Mobile (< 768px)
```
[ ] All content visible without horizontal scroll
[ ] Touch targets adequate size (44px+)
[ ] Font sizes readable (min 12px body)
[ ] Padding/margins reduced appropriately
[ ] Diagrams scale down clearly
[ ] Bottom bar accessible (not hidden)
```

### 6.2 Desktop (>= 768px)
```
[ ] Content centered with max-width
[ ] Larger fonts and spacing
[ ] Grid layouts for cards (2 columns)
[ ] Hover states on interactive elements
```

### 6.3 Scroll Behavior
```
[ ] Vertical scroll works on all phases
[ ] Content not cut off at bottom
[ ] Bottom bar always visible
[ ] No double-scroll containers
[ ] WebkitOverflowScrolling: 'touch' applied
```

---

## 7. Visual Design Tests

### 7.1 Color Usage
```typescript
const colors = {
  bgDark: '#030712',      // Main background
  bgCard: '#111827',      // Card backgrounds
  bgCardLight: '#1f2937', // Lighter cards
  textPrimary: '#f9fafb', // Main text
  textSecondary: '#9ca3af', // Secondary text
  textMuted: '#6b7280',   // Muted text
  primary: '#06b6d4',     // Cyan - primary actions
  accent: '#8b5cf6',      // Purple - accents
  success: '#10b981',     // Green - success/correct
  warning: '#f59e0b',     // Amber - warnings/hints
  danger: '#ef4444',      // Red - errors/wrong
  border: '#374151',      // Borders
};
```

**Tests:**
```
[ ] Consistent color usage across phases
[ ] Sufficient contrast for readability
[ ] Status colors used correctly (success/warning/danger)
[ ] Gradients subtle and consistent
```

### 7.2 Typography
```
[ ] Headers use fontWeight 700-900
[ ] Body text 14-16px
[ ] Labels uppercase with letter-spacing
[ ] Line height 1.5-1.7 for paragraphs
[ ] Monospace for data/counts
```

### 7.3 Spacing
```
[ ] Consistent padding (12-24px based on screen)
[ ] Card border-radius (12-16px)
[ ] Gap between elements (12-16px)
[ ] Margins between sections (16-24px)
```

---

## 8. Accessibility Tests

```
[ ] Color not sole indicator of state
[ ] Icons paired with text labels
[ ] Touch targets 44x44px minimum
[ ] Focus states visible (if keyboard nav)
[ ] Text content readable by screen readers
[ ] No auto-playing audio without control
```

---

## 9. Performance Tests

```
[ ] SVG animations smooth (no jank)
[ ] State updates don't cause full re-renders
[ ] Large lists virtualized if needed
[ ] Images/assets optimized
[ ] No memory leaks on phase transitions
```

---

## 10. Test Checklist Template

Use this checklist when reviewing a new game:

```markdown
## Game: [Game Name]
## Reviewer: [Name]
## Date: [Date]

### Structure
- [ ] All 10 phases implemented
- [ ] Phase flow correct
- [ ] PremiumWrapper + footer pattern used

### Styling
- [ ] Inline styles for layout
- [ ] No Tailwind on scroll containers
- [ ] Responsive (mobile + desktop)
- [ ] Scroll works on all phases

### Content
- [ ] Hook is engaging
- [ ] Predict has clear question + options
- [ ] Play is interactive with feedback
- [ ] Review explains key concepts
- [ ] Transfer has 4 applications
- [ ] Test has 5-10 questions
- [ ] Mastery celebrates completion

### AI Integration
- [ ] All events emitted
- [ ] Screen descriptions complete
- [ ] Events have detailed payloads

### Polish
- [ ] Colors consistent
- [ ] Typography correct
- [ ] Spacing uniform
- [ ] Animations smooth

### Issues Found
1.
2.
3.

### Overall: [ ] Pass / [ ] Needs Work
```

---

## 11. Code Structure Reference

### File Organization
```
components/
  [GameName]Renderer.tsx    # Main game component

# Inside the renderer:
1. Imports
2. GameEvent interface (if custom)
3. Props interface
4. Main component function
5. State declarations
6. useEffect hooks
7. Helper functions (emitGameEvent, playSound)
8. Render helper functions
9. Phase render blocks (if/return for each phase)
10. Export default
```

### Phase Block Pattern
```typescript
if (phase === 'phase_name') {
  // Optional: define footer separately for complex footers
  const phaseFooter = renderBottomBar(...);

  return (
    <PremiumWrapper footer={phaseFooter}>
      <div style={{ padding: '16px', maxWidth: '650px', margin: '0 auto' }}>
        {renderSectionHeader(...)}

        {/* Phase-specific content */}

      </div>
    </PremiumWrapper>
  );
}
```

---

## Quick Reference: Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Scroll not working | Tailwind on container | Convert to inline styles |
| Bottom bar hidden | Footer inside wrapper | Use footer prop |
| Buttons not clicking | Background overlay | Add pointer-events: none |
| Mobile tap issues | Using onClick | Use onMouseDown + onTouchEnd |
| AI out of sync | Missing events | Add emitGameEvent calls |
| Phase skipping | Wrong conditions | Check canProceed logic |
