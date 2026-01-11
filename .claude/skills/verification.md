# SKILL 6: VERIFICATION

## Purpose

Test that the game works, teaches effectively, adapts appropriately, and creates genuine understanding.

**The goal:** Ship a game that is polished, effective, and truly educational.

---

## TEST 1: FUNCTIONALITY

### Core Functionality
```markdown
- [ ] All 6 screens load without errors
- [ ] Navigation works in all directions
- [ ] Progress persists through session
- [ ] Zero console errors
- [ ] No JavaScript exceptions
```

### Interactive Elements
```markdown
- [ ] All buttons respond to clicks
- [ ] Sliders update values correctly
- [ ] Touch targets are 44px minimum
- [ ] Focus states are visible
- [ ] Keyboard navigation works
```

### Adaptive Systems
```markdown
- [ ] Difficulty adjusts after repeated failures
- [ ] Difficulty increases after easy successes
- [ ] Misconceptions are detected correctly
- [ ] Hints escalate appropriately
- [ ] Mastery gates prevent advancement without understanding
```

---

## TEST 2: LEARNING EFFECTIVENESS

### The 5-Question Test

After a user completes the game, they should be able to answer:

1. **WHAT:** Can they describe the core relationship?
   - "When X increases, Y increases because Z"

2. **WHY:** Can they explain the mechanism?
   - "This happens because..."

3. **PREDICT:** Can they estimate outcomes for new numbers?
   - "If I set X to 50, Y will be approximately..."

4. **AVOID:** Do they know the common misconception?
   - "Most people think X, but actually Y"

5. **APPLY:** Can they use it for a real decision?
   - "If I were in situation X, I would do Y because..."

### The Teaching Test

> Can someone who completed this explain the concept to a friend—without ever reading a definition?

If yes → Success
If no → The learning is still in text, not mechanics

### The Transfer Test

> Can they apply the concept in a completely new context?

- Different numbers → Near transfer
- Different story → Medium transfer
- Different domain → Far transfer

---

## TEST 3: ADAPTIVE QUALITY

### Difficulty Adaptation
```markdown
- [ ] Struggling player (fail 3x) gets easier version
- [ ] Coasting player (pass easily 3x) gets harder version
- [ ] Changes feel helpful, not punishing
- [ ] System returns to normal after adjustment works
```

### Misconception Targeting
```markdown
- [ ] Linear-thinking behavior triggers appropriate intervention
- [ ] Single-variable-focus triggers variable locking
- [ ] Random clicking triggers back-to-basics mode
- [ ] Hints address detected misconceptions specifically
```

### Mastery Gates
```markdown
- [ ] Can't advance without genuine understanding
- [ ] Transfer tests actually test in new contexts
- [ ] Explanation prompts capture real comprehension
- [ ] Lucky guesses don't unlock progression
```

---

## TEST 4: FLOW STATE

### Challenge Balance
```markdown
- [ ] First-attempt success rate: 30-70%
- [ ] Mastery (gold) success rate: 10-30%
- [ ] Time to first success: 30 sec - 3 min
- [ ] Retries before success: 1-5 attempts
```

### Engagement Indicators
```markdown
- [ ] Players want to retry (not giving up)
- [ ] Players want to optimize (not just pass)
- [ ] Failure feels like learning, not punishment
- [ ] Success feels earned, not given
```

---

## TEST 5: CHILD-APPROPRIATENESS

### Relatability
```markdown
- [ ] Scenarios feature relatable characters/situations
- [ ] Stakes are things children care about
- [ ] Numbers are comprehensible for age group
- [ ] Language is clear, no jargon
```

### Usability
```markdown
- [ ] 10-year-old understands what to do in 3 seconds
- [ ] Touch targets ≥ 44px
- [ ] Text is readable (16px minimum)
- [ ] Colors have sufficient contrast (4.5:1)
```

### Emotional Safety
```markdown
- [ ] Failure messages are encouraging, not punishing
- [ ] No time pressure that causes anxiety (unless appropriate)
- [ ] Undo is always available
- [ ] Progress is never lost
```

---

## TEST 6: DESIGN SYSTEM COMPLIANCE

### The 7 Laws
```markdown
- [ ] Law 1: Each screen has ONE clear purpose
- [ ] Law 2: 10-year-old understands in 3 seconds
- [ ] Law 3: Only essential info shown (progressive disclosure)
- [ ] Law 4: Every action has immediate feedback
- [ ] Law 5: Undo/Reset always available
- [ ] Law 6: Animations explain, not decorate
- [ ] Law 7: Works for accessibility needs
```

### Visual Design
```markdown
- [ ] Colors follow semantic system
- [ ] Typography follows scale
- [ ] Spacing uses 8-point grid
- [ ] Components use correct radius
```

---

## FINAL SHIP CHECKLIST

```markdown
# SHIP CHECKLIST: [Game Name]

## ✓ FUNCTIONALITY
- [ ] Zero errors in console
- [ ] Complete playthrough possible (all levels)
- [ ] All navigation paths work
- [ ] Adaptive systems responding

## ✓ LEARNING
- [ ] Teaches core insight (not just facts)
- [ ] Exposes and corrects misconceptions
- [ ] User can explain WHY, not just WHAT
- [ ] Transfer tests prove real understanding

## ✓ ADAPTATION
- [ ] Difficulty adjusts to player state
- [ ] Misconceptions detected and addressed
- [ ] Hints scaffold without giving answers
- [ ] Mastery gates prevent lucky advancement

## ✓ DESIGN
- [ ] 7 Laws all passing
- [ ] Touch targets 44px+
- [ ] Focus states visible
- [ ] Accessible (contrast, keyboard)

## ✓ CHILD-FRIENDLY
- [ ] Relatable scenarios
- [ ] Appropriate challenge level
- [ ] Encouraging tone
- [ ] Safe for children

## ✓ POLISH
- [ ] Animations smooth
- [ ] No layout shift
- [ ] Loading states shown
- [ ] Edge cases handled
```

---

## THE ULTIMATE TEST

After playing, users can:

```markdown
- [ ] NAME the concept
- [ ] EXPLAIN how it works (mechanism)
- [ ] PREDICT new outcomes
- [ ] APPLY to real decisions
- [ ] TEACH it to someone else
```

**WITHOUT ever being "taught" explicitly.**

If all boxes are checked, the game teaches through doing, not telling.

---

## VERIFICATION REPORT TEMPLATE

```markdown
# VERIFICATION REPORT: [Game Name]

## Summary
- Overall Grade: [A/B/C/D/F]
- Ship Ready: [Yes/No]

## Test Results

### Functionality: [PASS/FAIL]
- Errors found: [count]
- Issues: [list]

### Learning Effectiveness: [PASS/FAIL]
- 5-Question Test: [X/5 passed]
- Teaching Test: [Yes/No]
- Transfer Test: [Near/Medium/Far]

### Adaptive Quality: [PASS/FAIL]
- Difficulty adaptation: [Working/Broken]
- Misconception detection: [Working/Broken]
- Mastery gates: [Working/Broken]

### Flow State: [PASS/FAIL]
- First-attempt success: [X%]
- Mastery success: [X%]
- Engagement: [High/Medium/Low]

### Child-Appropriateness: [PASS/FAIL]
- Age-appropriate: [Yes/No]
- Emotional safety: [Yes/No]
- Usability: [Yes/No]

### Design Compliance: [PASS/FAIL]
- 7 Laws: [X/7 passing]
- Visual system: [Compliant/Issues]
- Accessibility: [Compliant/Issues]

## Action Items
1. [Critical fix needed]
2. [High priority improvement]
3. [Nice to have polish]

## Recommendation
[Ship / Ship with fixes / Needs rework]
```

---

## GRADING SCALE

| Grade | Criteria | Action |
|-------|----------|--------|
| **A** | All tests pass, no issues | Ship it! |
| **B** | Minor issues, all core working | Ship with quick fixes |
| **C** | Some tests fail, core works | Fix before shipping |
| **D** | Multiple failures | Significant rework needed |
| **F** | Core functionality broken | Back to Skill 5 |

---

*The best educational games don't feel like learning.*
*They feel like playing.*
*And then you realize you understand something you didn't before.*

**Build games where understanding is the only path to victory.**
