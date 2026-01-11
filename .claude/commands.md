# Custom Commands

## The 6-Skill Educational Game Building Framework

These commands leverage the 6 core skills for building effective educational games.

---

## /extract-concept
**Skill 1: Concept Extraction** - Deeply analyze a topic before building.

**Usage:** `/extract-concept [TopicName]`

When invoked, load and follow `.claude/skills/concept-extraction.md`:
- Answer the 7 Extraction Questions
- Identify the ONE expert insight
- Define the misconception being fought
- Map system variables (inputs/outputs)
- Trace the causal chain
- Design the aha moment
- Create Knowledge Components (KCs)

**Output:** Concept extraction document ready for learning architecture.

---

## /design-game
**Skill 2: UI/UX Design** - Apply design principles when building games.

**Usage:** `/design-game [GameName]`

When invoked, load and follow `.claude/skills/uiux-designer.md`:
- Apply the 7 Immutable Laws of Educational Game Design
- Use the 6-screen architecture (Home, Progress, Mission, Build, Simulate, Debrief)
- Implement the Truth Engine (deterministic simulation)
- Choose appropriate interaction patterns
- Follow the visual language system (colors, typography, spacing)
- Implement proper component patterns with accessibility

---

## /design-learning
**Skill 3: Learning Architecture** - Design the teaching journey.

**Usage:** `/design-learning [TopicName]`

When invoked, load and follow `.claude/skills/learning-architecture.md`:
- Apply the 7 Principles of Learning Architecture
- Design progressive disclosure of verbs
- Create flow state calibration targets
- Build scaffolding that fades
- Anchor to real-world child scenarios
- Create the KC dependency graph
- Design each level with one clear purpose

**Output:** Level progression and KC graph ready for assessment design.

---

## /design-assessment
**Skill 4: Assessment Architecture** - Design intelligent testing.

**Usage:** `/design-assessment [TopicName]`

When invoked, load and follow `.claude/skills/assessment-architecture.md`:
- Apply multi-dimensional mastery (not just pass/fail)
- Design adaptive difficulty state machine
- Create misconception detection patterns
- Build intelligent hint escalation ladder
- Design transfer tests (near/medium/far)
- Configure mastery gates
- Define telemetry events

**Output:** Assessment architecture ready for implementation.

---

## /implement-game
**Skill 5: Implementation** - Build the game with best practices.

**Usage:** `/implement-game [GameName]`

When invoked, load and follow `.claude/skills/implementation.md`:
- Use the Master Component Template
- Implement all 6 screens with proper state management
- Follow the component library patterns
- Avoid common pitfalls (localStorage, forms, accessibility)
- Follow the recommended build order

**Output:** Working game renderer ready for verification.

---

## /verify-game
**Skill 6: Verification** - Test that the game works and teaches effectively.

**Usage:** `/verify-game [GameName]`

When invoked, load and follow `.claude/skills/verification.md`:
- Run all 6 test categories:
  1. Functionality (zero errors, navigation works)
  2. Learning Effectiveness (5-Question Test, Teaching Test, Transfer Test)
  3. Adaptive Quality (difficulty, misconception detection, mastery gates)
  4. Flow State (challenge balance, engagement)
  5. Child-Appropriateness (relatability, usability, emotional safety)
  6. Design System Compliance (7 Laws, visual design)
- Generate Verification Report with grade and recommendations

**Output:** Ship/No-Ship recommendation with action items.

---

## /review-uiux
Review an existing game renderer against the UI/UX design system.

**Usage:** `/review-uiux [RendererName]`

When invoked, follow the review process from `prompts/review-uiux.md`:
1. Locate the renderer in `components/GeneratedDiagram.tsx`
2. Evaluate against the 7 Laws
3. Audit each screen
4. Generate a report with scores and actionable fixes
5. **Update the renderer** to fix any issues found

---

## /build-game
Create a new educational game following ALL 6 skills in sequence.

**Usage:** `/build-game [ConceptName]`

**Full Process:**
1. **Skill 1:** Run `/extract-concept` - Analyze the topic deeply
2. **Skill 2:** Run `/design-game` - Apply design principles
3. **Skill 3:** Run `/design-learning` - Design the teaching journey
4. **Skill 4:** Run `/design-assessment` - Design intelligent testing
5. **Skill 5:** Run `/implement-game` - Build the renderer
6. **Skill 6:** Run `/verify-game` - Validate effectiveness
7. Register in gemini.ts
8. Fix any issues and re-verify until passing

**Output:** A polished, effective educational game that teaches through doing.

---

## Quick Reference

| Command | Skill | Purpose |
|---------|-------|---------|
| `/extract-concept` | 1 | Deep topic analysis |
| `/design-game` | 2 | UI/UX design principles |
| `/design-learning` | 3 | Teaching journey design |
| `/design-assessment` | 4 | Intelligent testing design |
| `/implement-game` | 5 | Build with best practices |
| `/verify-game` | 6 | Validate effectiveness |
| `/review-uiux` | 2 | Review and fix existing game |
| `/build-game` | All | Full pipeline (1-6) |

---

## Skill Files Location

All skill documentation is in `.claude/skills/`:
- `concept-extraction.md` - Skill 1
- `uiux-designer.md` - Skill 2
- `learning-architecture.md` - Skill 3
- `assessment-architecture.md` - Skill 4
- `implementation.md` - Skill 5
- `verification.md` - Skill 6
