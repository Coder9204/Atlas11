# SKILL 3: LEARNING ARCHITECTURE

## Purpose

Design the TEACHING journey—how concepts are introduced, sequenced, scaffolded, and reinforced to create genuine, lasting understanding.

**The goal:** Build a path where each step feels achievable, each success builds confidence, and each concept clicks into place naturally.

**Key insight:** You start with 1-2 actions and earn more. New mechanics unlock only when previous ones become "automatic." (Human Resource Machine, DragonBox)

---

## THE 7 PRINCIPLES OF LEARNING ARCHITECTURE

### PRINCIPLE 1: PROGRESSIVE DISCLOSURE OF VERBS

**Start minimal. Earn complexity.**

```
WRONG WAY:
Level 1: Here are 8 tools. Good luck!

RIGHT WAY (Human Resource Machine style):
Level 1: You have INBOX and OUTBOX. Move items between them.
Level 2: Add COPYTO. Store items for later.
Level 3: Add ADD. Combine stored items.
...
Level 20: You now have 12 commands—and you know how to use them all.
```

**Implementation:**
```javascript
const verbUnlockSchedule = [
  { level: 1, verbs: ['move'], why: 'Basic interaction' },
  { level: 3, verbs: ['move', 'store'], why: 'After move is automatic' },
  { level: 6, verbs: ['move', 'store', 'combine'], why: 'After store is mastered' },
];
```

**The Rule:** Unlock new mechanics only when previous ones require no conscious thought, then force recombination.

---

### PRINCIPLE 2: SAME MECHANIC, DEEPER CONSTRAINTS

**Don't add complexity—add constraints that require deeper understanding.**

```
DIFFICULTY PROGRESSION FRAMEWORK:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage    │ Challenge Type         │ What It Teaches                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ EARLY    │ "Make it work"         │ Basic understanding                    │
│ MIDDLE   │ "Make it efficient"    │ Optimization thinking                  │
│ LATE     │ "Make it robust"       │ Edge case awareness                    │
│ MASTERY  │ "Make it elegant"      │ Deep structural understanding          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The Rule:** Difficulty comes from tradeoffs (accuracy vs efficiency vs robustness), not hidden solutions or randomness.

---

### PRINCIPLE 3: FLOW STATE DESIGN

The game must live in the "flow channel"—neither too easy nor too hard.

```
                    ANXIETY
                       ↑
                       │     ████████████
                       │   ████████████████
         Challenge     │ ████ FLOW ZONE ████
                       │ ██████████████████
                       │   ████████████████
                       │     ████████████
                       └──────────────────────→
                              Skill            BOREDOM
```

**Flow Calibration Targets:**

| Metric | Target | Why |
|--------|--------|-----|
| First-attempt success rate | 30-70% | Too low = frustrating, too high = trivial |
| Mastery success rate | 10-30% | Aspirational but achievable |
| Time to first success | 30 sec - 3 min | Longer = needs more scaffolding |
| Retries before success | 1-5 attempts | More = difficulty spike |

**Adaptive Response:**
```javascript
const flowBalancer = {
  playerStruggling: (failureCount) => {
    if (failureCount >= 3) return { action: 'OFFER_HINT' };
    return { action: 'ENCOURAGE_RETRY' };
  },
  playerCoasting: (successStreak) => {
    if (successStreak >= 3) return { action: 'ADD_CONSTRAINT' };
    return { action: 'PROCEED_NORMALLY' };
  }
};
```

---

### PRINCIPLE 4: SCAFFOLDING THAT FADES

**Provide support that gradually disappears as competence grows.**

```
SCAFFOLDING PROGRESSION:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Level   │ Scaffolding Present                   │ Scaffolding Removed       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1-2     │ Tutorial overlays, highlighted        │ —                         │
│         │ buttons, step-by-step guidance        │                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3-4     │ Hints available on request (free)     │ Tutorial overlays         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5-6     │ Hints cost score                      │ Free hints, highlighting  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7+      │ No hints, full autonomy               │ All scaffolding           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Types of Scaffolding (most to least support):**
1. **Guided Tutorial:** "Click here, then here, then here"
2. **Prompted Tutorial:** "What do you think you should click?"
3. **Available Hints:** "Need help? Click here" (free)
4. **Costly Hints:** "Get hint (-10% score)"
5. **No Scaffolding:** Full autonomy

---

### PRINCIPLE 5: REAL-WORLD ANCHORING FOR CHILDREN

**Every concept must connect to something the child already understands.**

```
THE REAL-WORLD ANCHORING FRAMEWORK:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Element       │ Requirement                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ CHARACTER     │ Relatable person (name, age, situation child understands)  │
│ STAKES        │ Something child cares about (toy, pet, game, friend)       │
│ NUMBERS       │ Realistic, researched, scaled to be comprehensible         │
│ DECISIONS     │ Real choices they or adults actually face                  │
│ CONSEQUENCES  │ Authentic outcomes (not arbitrary points)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Scenario Quality Checklist:**
- [ ] Child can picture themselves in this situation
- [ ] Stakes feel real (not arbitrary "points")
- [ ] Numbers are researched (not made up)
- [ ] Decision is one real people actually face
- [ ] Expert would approve the simplification

---

### PRINCIPLE 6: THE KNOWLEDGE COMPONENT GRAPH

**Structure concepts as a directed graph where each node is a teachable piece.**

```
KC GRAPH EXAMPLE (Compound Interest):

    ┌──────────────┐
    │    KC-1      │
    │  Rate Effect │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐         ┌──────────────┐
    │    KC-2      │         │    KC-3      │
    │  Time Effect │────────►│  Compounding │
    └──────┬───────┘         │  Mechanism   │
           │                 └──────┬───────┘
           │                        │
           └────────────┬───────────┘
                        │
                        ▼
               ┌──────────────┐
               │    KC-4      │
               │  Rate-Time   │
               │  Tradeoff    │
               └──────────────┘
```

**KC Definition Template:**
```javascript
const knowledgeComponent = {
  id: 'KC-3',
  name: 'Compounding Mechanism',
  prerequisites: ['KC-1', 'KC-2'],
  misconception: 'Only the original amount earns interest',
  masteryIndicators: [
    'Can explain WHY growth accelerates',
    'Can predict year-over-year interest amounts'
  ],
  introducedInLevel: 5,
  reinforcedInLevels: [7, 9, 12],
  hints: [
    { level: 1, text: 'What is the interest calculated on each year?' },
    { level: 2, text: 'Notice that year 2 interest is more than year 1...' },
    { level: 3, text: 'The interest itself earns interest!' }
  ]
};
```

---

### PRINCIPLE 7: THE PREDICT→PLAY→REVIEW→TEST LOOP

**Every learning moment follows this 4-phase cycle to ensure genuine understanding.**

```
THE MANDATORY LEARNING LOOP:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐│
│   │  1. PREDICT │ ──► │  2. PLAY    │ ──► │  3. REVIEW  │ ──► │  4. TEST ││
│   └─────────────┘     └─────────────┘     └─────────────┘     └──────────┘│
│         │                   │                   │                   │      │
│    Ask them to         They interact      Show gap between      NEW scenario│
│    predict what        with simulation    prediction &          to verify   │
│    will happen         and observe        reality, explain      understanding│
│    for scenario        the result         the WHY               (ask + WHY) │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Phase Details:**

| Phase | What Happens | Purpose |
|-------|-------------|---------|
| **1. PREDICT** | Before interaction, ask: "What do you think will happen when...?" User must commit to a prediction | Forces hypothesis formation, reveals mental model |
| **2. PLAY** | User interacts with simulation, sees actual result vs prediction | Creates cognitive conflict if wrong, reinforces if right |
| **3. REVIEW** | Show gap between prediction and reality. Explain WHY it happened | Addresses misconception, builds correct mental model |
| **4. TEST** | Present NEW scenario, ask "What will happen AND WHY?" | Proves transfer, ensures genuine understanding |

**Implementation:**
```javascript
const learningLoop = {
  phase1_predict: {
    prompt: "Before we run this, predict: [specific scenario question]",
    requiresCommitment: true, // Must answer before proceeding
    captureReasoning: false   // Don't ask WHY yet - save for test phase
  },
  phase2_play: {
    showPredictionDuringPlay: true, // Keep their prediction visible
    highlightGap: true // Show "You predicted X, actual was Y"
  },
  phase3_review: {
    ifCorrect: "✓ Your mental model is accurate! Here's WHY it works...",
    ifWrong: "The gap: You predicted X but Y happened. Here's WHY...",
    explainMechanism: true // Always explain the causal chain
  },
  phase4_test: {
    newScenario: true, // MUST be different from original
    askPrediction: true,
    askWhy: true, // "What will happen AND WHY?"
    evaluatesUnderstanding: true // This is the true comprehension check
  }
};
```

**Why This Works:**
- **Prediction creates investment** — They care about the answer
- **Gap creates curiosity** — Wrong predictions drive learning
- **Review builds understanding** — Causal explanation sticks
- **Test proves transfer** — New scenario = genuine comprehension

**Test Phase Requirements:**
The test scenario MUST:
- Be different from the original scenario (new numbers, context, or framing)
- Ask BOTH "what will happen" AND "why"
- Evaluate the WHY explanation, not just the prediction
- Only pass learners who can articulate the mechanism

---

### PRINCIPLE 8: LEVEL DESIGN RULES

**Each level is precisely crafted to teach ONE thing.**

```
LEVEL DESIGN TEMPLATE:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Level 5: "Interest on Interest"                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ NEW KC: KC-3 (Compounding Mechanism)                                        │
│ REQUIRES: KC-1, KC-2                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: "Grow $1,000 to $3,000"                                         │
│ FRAMING: Achievement language, not teaching language                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ TOOLS AVAILABLE:                                                            │
│ - Rate slider (1-8%)                                                        │
│ - Time control                                                              │
│ - NEW: Breakdown view                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ CONSTRAINTS:                                                                │
│ - Max rate: 8%                                                              │
│ - Max years: 20                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ DESIGNED MISCONCEPTION:                                                     │
│ Player will ignore breakdown view and be surprised when 8% for              │
│ 15 years doesn't reach $3,000                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ AHA MOMENT:                                                                 │
│ Seeing year 10's interest exceeds year 1's total interest                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ SUCCESS: Balance ≥ $3,000                                                   │
│ MASTERY: Balance ≥ $3,000 in ≤ 15 years, used breakdown view               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Anti-Brute-Force Design:**
| Pattern | How It Works |
|---------|--------------|
| Limited resources | Can only make N moves |
| Time pressure | Must solve before timer |
| Efficiency requirement | Solution must meet threshold |
| Combination lock | Multiple variables must be correct together |
| Understanding gate | Must demonstrate prediction ability |

---

## PROGRESSION TEMPLATES

### Template A: Single-Concept Deep Dive (3-5 levels)

```
Level 1: INTRODUCE
- Minimal constraints, single variable
- Success = "make it work"

Level 2: REINFORCE
- Same concept, harder numbers
- Add one constraint

Level 3: COMBINE
- Introduce second variable
- Both must be used correctly

Level 4: OPTIMIZE
- Strict constraints
- Mastery = best solution

Level 5: TRANSFER
- New context, same concept
- Proves genuine understanding
```

### Template B: Multi-Concept Build (8-12 levels)

```
Levels 1-2:  Introduce KC-1 (isolated)
Levels 3-4:  Introduce KC-2 (isolated)
Level 5:     Combine KC-1 + KC-2
Levels 6-7:  Introduce KC-3 (requires KC-1, KC-2)
Level 8:     Combine all three KCs
Levels 9-10: Optimization challenges
Levels 11-12: Transfer to new contexts
```

---

## SKILL 3 OUTPUT TEMPLATE

```markdown
# LEARNING ARCHITECTURE: [Topic Name]

## KC Graph
[Visual diagram showing dependencies]

## Verb Unlock Schedule
| Level | New Verbs | Why Now |
|-------|-----------|---------|

## Level Progression
| Level | New KC | Required KCs | Objective | Constraints |
|-------|--------|--------------|-----------|-------------|

## Scaffolding Schedule
| Level Range | Support Level | What's Available |
|-------------|---------------|------------------|

## Flow Calibration
| Metric | Target | Adjustment if off |
|--------|--------|-------------------|

## Level Details
### Level 1: [Name]
- **Objective:** [Achievement-framed goal]
- **New KC:** [Which KC introduced]
- **Tools:** [Available verbs]
- **Constraints:** [Limits]
- **Misconception targeted:** [What wrong belief]
- **Aha moment:** [What they realize]
- **Success:** [Pass condition]
- **Mastery:** [Gold condition]
```

---

## QUALITY CHECKLIST

Before moving to Skill 4, verify:

- [ ] Each level teaches exactly ONE new thing
- [ ] KCs build on each other (no orphans)
- [ ] Scaffolding fades as player progresses
- [ ] Flow targets are defined and achievable
- [ ] Real-world scenarios are age-appropriate
- [ ] Objectives use achievement language, not teaching language
- [ ] Transfer levels prove genuine understanding
