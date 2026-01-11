# SKILL 4: ASSESSMENT ARCHITECTURE

## Purpose

Design INTELLIGENT TESTING that:
- Truly measures understanding (not just completion)
- Adapts to the individual learner
- Detects specific misconceptions
- Ensures genuine mastery before progression
- Enables transfer to new contexts

**The goal:** Know the difference between "they got lucky" and "they truly understand"—and respond appropriately.

**Key insight:** Assessment IS teaching. Every test is a learning opportunity. Every failure is diagnostic data.

---

## THE 7 PRINCIPLES OF ASSESSMENT ARCHITECTURE

### PRINCIPLE 1: MULTI-DIMENSIONAL MASTERY

**Don't just measure "right/wrong." Measure multiple dimensions of understanding.**

```
THE 5 DIMENSIONS OF MASTERY:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dimension     │ Question                      │ How to Measure              │
├─────────────────────────────────────────────────────────────────────────────┤
│ CORRECTNESS   │ Did they achieve the goal?    │ Binary: yes/no             │
│ EFFICIENCY    │ How well did they achieve it? │ Steps, time, resources     │
│ CONSISTENCY   │ Can they do it repeatedly?    │ Success streak (3 in row)  │
│ TRANSFER      │ Can they apply it elsewhere?  │ New context, same concept  │
│ EXPLANATION   │ Can they teach it?            │ Prediction/explain prompts │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Mastery Scoring:**
```javascript
const calculateMastery = (attempt, levelConfig) => {
  if (!attempt.goalAchieved) return { score: 0, tier: null, passed: false };

  const efficiency = Math.min(1, levelConfig.targetSteps / attempt.steps);
  const consistency = attempt.successStreak >= 3 ? 1 : attempt.successStreak / 3;

  const score = efficiency * 0.5 + consistency * 0.5;

  return {
    score,
    tier: score >= 0.9 ? 'gold' : score >= 0.7 ? 'silver' : 'bronze',
    passed: true
  };
};
```

---

### PRINCIPLE 2: ADAPTIVE DIFFICULTY

**The game should get easier when struggling and harder when succeeding—automatically.**

```
ADAPTIVE DIFFICULTY STATE MACHINE:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        ┌─────────────┐                                      │
│       ┌───────────────►│   NORMAL    │◄───────────────┐                    │
│       │                └──────┬──────┘                │                    │
│       │                       │                       │                    │
│  Success streak ≥3    Failure rate > 60%     Success rate > 80%           │
│       │                       │                       │                    │
│       │                       ▼                       │                    │
│       │                ┌─────────────┐                │                    │
│       │                │   EASIER    │────────────────┘                    │
│       │                └─────────────┘                                      │
│       │                2+ successes return to normal                        │
│       │                                                                     │
│       └────────────────┌─────────────┐                                      │
│                        │   HARDER    │                                      │
│                        └─────────────┘                                      │
│                        Any failure returns to normal                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Difficulty Levers:**
| Lever | Make Easier | Make Harder |
|-------|-------------|-------------|
| Constraints | Loosen (more time) | Tighten (less time) |
| Scaffolding | Add hints | Remove supports |
| Goals | Lower target | Add efficiency requirement |
| Feedback | More immediate | Delayed until end |

---

### PRINCIPLE 3: MISCONCEPTION DETECTION

**Track WHAT KIND of wrong, not just that they're wrong.**

```
MISCONCEPTION DETECTION FRAMEWORK:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Observed Behavior             │ Likely Misconception      │ Intervention    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Always maxes one variable     │ "Only X matters"         │ Lock X, force   │
│                               │                          │ other variables │
├─────────────────────────────────────────────────────────────────────────────┤
│ Expects 2x input = 2x output  │ "Growth is linear"       │ Show curve,     │
│                               │                          │ extreme example │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ignores early periods         │ "Start time doesn't      │ Compare early   │
│                               │  matter"                 │ vs late start   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Random clicking pattern       │ "Don't understand        │ Back to basics, │
│                               │  system at all"          │ guided mode     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Detection Implementation:**
```javascript
const misconceptionDetector = {
  patterns: [
    {
      id: 'linear-thinking',
      detect: (attempts) => attempts.filter(a =>
        isLinearPrediction(a.prediction, a.actual)
      ).length >= 2,
      intervention: {
        type: 'FORCE_COMPARISON',
        message: 'Watch how the growth accelerates over time...'
      }
    }
  ],
  analyze: (attempts) => this.patterns.filter(p => p.detect(attempts))
};
```

---

### PRINCIPLE 4: THE INTELLIGENT HINT SYSTEM

**Hints should scaffold thinking, not give answers.**

```
HINT ESCALATION LADDER:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Level │ Type           │ Example                        │ Score Cost │
├─────────────────────────────────────────────────────────────────────────────┤
│   1   │ METACOGNITIVE  │ "What have you tried so far?"  │ 0%         │
│   2   │ ATTENTION      │ "Look at how the numbers       │ 0%         │
│       │                │  change each year..."          │            │
│   3   │ DIRECTIONAL    │ "Think about time, not just    │ -10%       │
│       │                │  rate..."                      │            │
│   4   │ SPECIFIC       │ "Try setting years above 25"   │ -25%       │
│   5   │ REVEALING      │ "The answer requires compound  │ -50%       │
│       │                │  growth understanding"         │            │
│   ✗   │ NEVER          │ "Set rate to 8% and years     │ N/A        │
│       │                │  to 25"                        │ (never!)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Hint Design Rules:**
1. **Never give the answer** — Guide thinking instead
2. **Target misconceptions** — If detected, address specifically
3. **Escalate gradually** — Start vague, get specific only if needed
4. **Preserve discovery** — The aha moment must still be theirs
5. **Cost for specificity** — More specific hints reduce mastery score

---

### PRINCIPLE 5: TRANSFER TESTING

**True understanding means applying knowledge to NEW contexts.**

```
TRANSFER DISTANCE SPECTRUM:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Type          │ What Changes             │ What Stays Same                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ NEAR          │ Numbers/values only      │ Context, tools, goal type        │
│               │ ($1000→$500, 7%→5%)      │                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ MEDIUM        │ Context/story            │ Underlying concept, mechanics    │
│               │ (savings→bacteria)       │                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ FAR           │ Domain entirely          │ Only abstract principle          │
│               │ (money→learning→disease) │                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Transfer Test Design:**
```javascript
const transferTest = {
  distance: 'medium',
  originalKC: 'compound-growth',
  scenario: 'Bacteria population doubling',
  context: {
    unit: 'bacteria',
    startValue: 100,
    growthTerm: 'reproduction rate',
    timeTerm: 'hours'
  },
  proves: 'Understands exponential growth abstractly'
};
```

---

### PRINCIPLE 6: EXPLANATION PROMPTS

**The highest test of understanding: can they predict and explain?**

```
EXPLANATION PROMPT TYPES:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Type          │ Prompt Format                       │ What It Tests         │
├─────────────────────────────────────────────────────────────────────────────┤
│ PREDICTION    │ "What will happen if...?"           │ Mental model accuracy │
│ COMPARISON    │ "Which is better and why?"          │ Relative reasoning    │
│ MECHANISM     │ "Why does this happen?"             │ Causal understanding  │
│ TEACHING      │ "Explain to someone who doesn't     │ Deep comprehension    │
│               │  know..."                           │                       │
│ DEBUGGING     │ "What went wrong here?"             │ Error recognition     │
│ TRANSFER      │ "Where else does this apply?"       │ Abstract thinking     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### PRINCIPLE 7: MASTERY GATES

**Players must PROVE understanding before advancing.**

```
MASTERY GATE TYPES:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Gate Type        │ Requirement                  │ When to Use              │
├─────────────────────────────────────────────────────────────────────────────┤
│ SUCCESS_COUNT    │ Pass N times                 │ Basic proficiency        │
│ SUCCESS_STREAK   │ Pass N times in a row        │ Consistent competence    │
│ EFFICIENCY_GATE  │ Pass with efficiency ≥ X     │ Beyond brute force       │
│ NO_HINTS_GATE    │ Pass without using hints     │ Independent mastery      │
│ TRANSFER_GATE    │ Pass in new context          │ True understanding       │
│ PREDICTION_GATE  │ Correctly predict before run │ Mental model validation  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Gate Configuration:**
```javascript
const masteryGates = {
  'KC-1': {
    toUnlock: 'KC-2',
    requirements: [
      { type: 'SUCCESS_STREAK', value: 2 }
    ]
  },
  'KC-3': {
    toUnlock: 'KC-4',
    requirements: [
      { type: 'SUCCESS_STREAK', value: 2 },
      { type: 'TRANSFER_GATE', context: 'bacteria-growth' }
    ]
  }
};
```

---

## TELEMETRY EVENTS

Track everything needed to improve both the game AND the learner's experience:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Event              │ Data Captured                │ Why It Matters          │
├─────────────────────────────────────────────────────────────────────────────┤
│ LEVEL_START        │ levelId, timestamp           │ Session tracking        │
│ ACTION_TAKEN       │ actionType, value            │ Behavior patterns       │
│ PREDICTION_MADE    │ predicted, actual, delta     │ Misconception detection │
│ HINT_REQUESTED     │ hintLevel, context           │ Struggle points         │
│ LEVEL_COMPLETE     │ passed, metrics, timeSpent   │ Success patterns        │
│ MISCONCEPTION_FLAG │ type, evidence               │ Adaptive content        │
│ TRANSFER_ATTEMPT   │ originalKC, newContext, pass │ Understanding depth     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SKILL 4 OUTPUT TEMPLATE

```markdown
# ASSESSMENT ARCHITECTURE: [Topic Name]

## Mastery Dimensions
| Dimension | How Measured | Weight |
|-----------|--------------|--------|

## Adaptive Difficulty Rules
| Condition | Response |
|-----------|----------|

## Misconception Detection
| Behavior Pattern | Misconception | Intervention |
|-----------------|---------------|--------------|

## Hint System
| Level | Type | Example | Cost |
|-------|------|---------|------|

## Transfer Tests
| KC | Distance | New Context | What It Proves |
|----|----------|-------------|----------------|

## Mastery Gates
| From KC | To KC | Requirements |
|---------|-------|--------------|

## Telemetry Events
| Event | Data | Purpose |
|-------|------|---------|
```

---

## QUALITY CHECKLIST

Before moving to Skill 5, verify:

- [ ] Multi-dimensional mastery (not just pass/fail)
- [ ] Adaptive difficulty responds to player state
- [ ] Misconceptions are detected and addressed
- [ ] Hints scaffold without giving answers
- [ ] Transfer tests prove real understanding
- [ ] Mastery gates prevent lucky advancement
- [ ] Telemetry captures actionable data
