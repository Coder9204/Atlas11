# Game Test Specification

Based on the **Wave Particle Duality** game implementation, this document provides the definitive specification for all interactive physics games in Project Atlas.

---

## CRITICAL: Before You Start

### Architecture Rule: NO INLINE RENDERERS
**NEVER define a game renderer inline in GeneratedDiagram.tsx if it's imported from a standalone file.**

This causes the inline version to **SHADOW** the imported version, meaning your standalone file changes are IGNORED.

**Check before adding a game:**
```bash
# Check if imported
grep -n "import.*YourGameRenderer" components/GeneratedDiagram.tsx

# Check if also defined inline (BAD!)
grep -n "const YourGameRenderer = " components/GeneratedDiagram.tsx
```

**If you find both: DELETE the inline version.**

### Critical Implementation Checklist
Before considering any game "complete", verify:

- [ ] **No inline version** in GeneratedDiagram.tsx shadowing the import
- [ ] **onClick handlers** (NOT onMouseDown/onTouchEnd) for all buttons
- [ ] **WebkitTapHighlightColor: 'transparent'** on all interactive elements
- [ ] **Sliders use onInput + onChange** for smooth updates
- [ ] **Transfer phase has "Continue" at end of each app** (scrolls to bottom, then Continue → next app or Take Test)
- [ ] **AI coach receives app-specific screenDescription/coachMessage** for tab clicks
- [ ] **Mastery phase has pass/fail logic** (70% threshold)
- [ ] **Mastery shows Return to Dashboard** option
- [ ] **Quick launch link added** to SmartDashboard.tsx
- [ ] **10 test questions** with proper state reset on entry

---

## 1. Phase Structure

### 1.1 Required Phases (10 Total)

Every game must implement these phases in exact sequence:

| Phase | Step | Purpose | Required Elements |
|-------|------|---------|-------------------|
| `hook` | 1 | Engage & introduce | Title, compelling intro, animated visual, Feynman quote, "Begin Experiment" CTA, trust indicators |
| `predict` | 2 | Activate prior knowledge | Experiment setup diagram, clear question, 3 prediction options with icons/tags |
| `play` | 3 | Interactive exploration | Live simulation, real-time feedback, controls panel, teaching milestones |
| `review` | 4 | Explain first concept | Dual-nature cards, key takeaways (3 items), "Why it matters" box |
| `twist_predict` | 5 | Challenge assumptions | New variable diagram, prediction question, 3 options |
| `twist_play` | 6 | Reveal the twist | Interactive toggle (observer ON/OFF), comparative visualization |
| `twist_review` | 7 | Deep understanding | Comparison cards, measurement problem, key insights (3 items) |
| `transfer` | 8 | Real-world applications | 4 applications with sequential unlock, detailed info for each |
| `test` | 9 | Knowledge assessment | 10 scenario-based questions, results review |
| `mastery` | 10 | Completion & celebration | Achievement badge, 5 mastered concepts, inspirational quote, action buttons |

### 1.2 Phase Order & Labels

```typescript
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
   hook: 'Introduction',
   predict: 'Predict',
   play: 'Experiment',
   review: 'Understanding',
   twist_predict: 'New Variable',
   twist_play: 'Observer Effect',
   twist_review: 'Deep Insight',
   transfer: 'Real World',
   test: 'Knowledge Test',
   mastery: 'Mastery'
};
```

---

## 2. Design System

### 2.1 Color Palette

```typescript
const colors = {
   // Primary colors
   primary: '#06b6d4',      // cyan-500 - main actions, primary elements
   primaryDark: '#0891b2',  // cyan-600
   accent: '#a855f7',       // purple-500 - secondary accents
   accentDark: '#9333ea',   // purple-600

   // Semantic colors
   warning: '#f59e0b',      // amber-500 - hints, warnings, test phase
   success: '#10b981',      // emerald-500 - correct, completed, mastery
   danger: '#ef4444',       // red-500 - observer effect, errors, wrong answers

   // Background colors
   bgDark: '#020617',       // slate-950 - main background
   bgCard: '#0f172a',       // slate-900 - card backgrounds
   bgCardLight: '#1e293b',  // slate-800 - lighter cards, inputs

   // Border & text
   border: '#334155',       // slate-700 - borders
   textPrimary: '#f8fafc',  // slate-50 - main text
   textSecondary: '#94a3b8', // slate-400 - secondary text
   textMuted: '#64748b',    // slate-500 - muted text, labels
};
```

### 2.2 Typography System

```typescript
const typo = {
   // Font sizes - responsive (mobile | desktop)
   label: isMobile ? '9px' : '10px',       // Phase labels, section tags, uppercase
   small: isMobile ? '11px' : '12px',      // Hints, descriptions, explanations
   body: isMobile ? '12px' : '13px',       // Main body text
   bodyLarge: isMobile ? '13px' : '14px',  // Important paragraphs, CTAs
   heading: isMobile ? '18px' : '22px',    // Section headings (h2)
   title: isMobile ? '24px' : '32px',      // Main titles (hook page h1)

   // Spacing - responsive
   pagePadding: isMobile ? '12px' : '16px',
   sectionGap: isMobile ? '12px' : '14px',
   cardPadding: isMobile ? '10px' : '14px',
   elementGap: isMobile ? '8px' : '10px',
};
```

### 2.3 Gradient Patterns

```typescript
// Primary gradient (CTAs, primary buttons)
background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`;
boxShadow: `0 4px 20px ${colors.primary}40`;

// Card gradients (phase-specific)
background: `linear-gradient(135deg, ${phaseColor}15 0%, ${phaseColor}05 100%)`;
border: `1px solid ${phaseColor}30`;

// Background gradients
background: `linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)`;
```

---

## 3. Component Architecture

### 3.1 renderPremiumWrapper (CRITICAL)

**MUST be a render function, NOT a React component** to prevent remounting and scroll reset issues.

```typescript
const renderPremiumWrapper = (children: React.ReactNode, footer?: React.ReactNode) => (
   <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: colors.bgDark, color: colors.textPrimary }}>
      {/* Background gradient - decorative */}
      <div style={{ position: 'absolute', inset: 0, background: '...', pointerEvents: 'none' }} />

      {/* HEADER - contains back button, home button, progress dots, phase indicator */}
      <div style={{ flexShrink: 0, ... }}>
         {/* Back button (← to previous phase) */}
         {/* Home button (🏠) */}
         {/* Progress dots - clickable for completed phases */}
         {/* Current phase indicator (X/10) */}
      </div>

      {/* MAIN CONTENT - scrollable */}
      <div style={{
         flex: '1 1 0%',
         minHeight: 0,
         overflowY: 'auto',
         overflowX: 'hidden',
         WebkitOverflowScrolling: 'touch'
      }}>
         {children}
      </div>

      {/* FOOTER - fixed at bottom */}
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
   </div>
);
```

### 3.2 renderBottomBar

```typescript
const renderBottomBar = (
   canGoBack: boolean,      // Show back button? (always true except hook)
   canGoNext: boolean,      // Enable next button?
   nextLabel: string,       // "Run Experiment", "Understand Why", etc.
   onNext?: () => void,     // Custom handler (optional)
   accentColor?: string     // Phase-specific color (optional)
) => (
   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgCard }}>
      {/* Back button - "← Back" */}
      {/* Phase indicator - current phase label */}
      {/* Next button - "[nextLabel] →" */}
   </div>
);
```

### 3.3 renderSectionHeader

```typescript
const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
   <div style={{ marginBottom: typo.sectionGap }}>
      <p style={{ fontSize: typo.label, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.primary }}>
         {phaseName}  // e.g., "Step 1 • Make Your Prediction"
      </p>
      <h2 style={{ fontSize: typo.heading, fontWeight: 800, color: colors.textPrimary, lineHeight: 1.2 }}>
         {title}      // e.g., "What Will Electrons Do?"
      </h2>
      {subtitle && <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.4 }}>
         {subtitle}   // e.g., "Think about what pattern you expect..."
      </p>}
   </div>
);
```

---

## 4. Phase Content Specifications

### 4.1 Hook Phase

**Visual Elements:**
- Animated atom/molecule visualization with orbiting electrons
- Animated background orbs (subtle, blurred)
- Category tag (e.g., "● Quantum Physics")
- Gradient text effect on title

**Content Structure:**
```typescript
{
   categoryTag: "Quantum Physics",
   title: "The Double-Slit Experiment",  // Gradient text on second word
   description: "The experiment that shattered our understanding of reality. Watch particles behave like waves.",
   quote: {
      text: "The double-slit experiment contains the only mystery of quantum mechanics.",
      author: "Feynman"
   },
   features: [
      { icon: '⚡', text: '5 min' },
      { icon: '🧪', text: 'Lab' },
      { icon: '🧠', text: 'Quiz' }
   ],
   ctaButton: "Begin Experiment →",
   trustIndicator: "★★★★★ Loved by 10,000+ learners"
}
```

### 4.2 Predict Phase

**Prediction Options Format:**
```typescript
const predictions = [
   { id: 'two', label: 'Two bands', desc: 'Particles go through one slit each', icon: '▮ ▮', tag: 'Particle' },
   { id: 'interference', label: 'Multiple bands', desc: 'Wave interference pattern', icon: '▮▯▮▯▮', tag: 'Wave' },
   { id: 'one', label: 'One blob', desc: 'Random scatter pattern', icon: '░▓░', tag: 'Random' },
];
```

**Required Elements:**
- Setup explanation with inline diagram (SVG)
- Clear question (bold, centered)
- 3 selectable options with visual feedback
- Hint box at bottom

**Bottom Bar:** `renderBottomBar(true, !!prediction, "Run Experiment")`

### 4.3 Play Phase (Simulation)

**Layout:** Split view (mobile: stacked, desktop: side-by-side)
- Main visualization area (SVG simulation)
- Control panel (right/bottom)

**Teaching Milestones:**
```typescript
const milestones = {
   none: { title: '', message: '', color: colors.primary },
   few: { title: 'Observing', message: 'Each electron lands as a dot...', color: colors.textMuted },
   pattern: { title: 'Pattern Emerging!', message: 'Bands forming!...', color: colors.warning },
   clear: { title: 'Interference!', message: 'Wave pattern confirmed!...', color: colors.primary },
   many: { title: 'Quantum Reality', message: 'Single particles create wave interference...', color: colors.success },
};
```

**Control Panel Elements:**
- Particle counter (large monospace number)
- Firing rate slider (1-20/sec)
- Reset button
- Key insight box

**Bottom Bar:** `renderBottomBar(true, particleCount >= 30, "Understand Why")`

### 4.4 Review Phase

**Key Takeaways Format:**
```typescript
const takeaways = [
   { icon: '🌊', title: 'Wave Function', desc: '|ψ|² = probability at each location' },
   { icon: '🎯', title: 'Probability Only', desc: "Can't predict single electron, only distribution" },
   { icon: '🔀', title: 'Superposition', desc: 'Both paths until measured' }
];
```

**Structure:**
1. Section header
2. Dual-nature comparison cards (2 columns: Particles / Waves)
3. Quote card (centered, italic)
4. Key takeaways list (icon + inline title/desc)
5. "Why it matters" hint box

### 4.5 Twist Predict Phase

**Twist Prediction Options:**
```typescript
const twistPredictions = [
   { id: 'disappear', label: 'Pattern disappears', desc: 'Two bands instead of wave pattern', icon: '▮ ▮' },
   { id: 'same', label: 'Pattern stays same', desc: "Watching shouldn't change physics", icon: '▮▯▮▯▮' },
   { id: 'stronger', label: 'Pattern stronger', desc: 'More info = clearer result', icon: '▮▮▮▮▮' },
];
```

**Bottom Bar:** `renderBottomBar(true, !!twistPrediction, "Turn On Detector", undefined, colors.danger)`

### 4.6 Twist Play Phase

**Observer Toggle:**
```typescript
// Two button toggle
<button>👁️ WATCHING</button>     // detectorOn = true, color: danger
<button>🔒 NOT WATCHING</button>  // detectorOn = false, color: primary
```

**Result Overlay:**
- Shows current mode icon and label
- Describes pattern being shown
- Color-coded (red for observing, cyan for not observing)

### 4.7 Twist Review Phase

**Comparison Cards Format:**
```typescript
// Two columns
{ mode: 'Not Observed', icon: '🌊', effect: 'Wave through both slits', result: '→ Interference', color: colors.accent },
{ mode: 'Observed', icon: '👁️', effect: 'Collapses to one slit', result: '→ Two Bands', color: colors.danger },
```

**Key Insights:**
```typescript
[
   { icon: '💥', title: 'Wave Collapse', desc: 'Observation forces one path' },
   { icon: '📊', title: 'Info Is Physical', desc: 'Knowing destroys interference' },
   { icon: '🔮', title: 'Quantum Eraser', desc: 'Erase info → restore pattern' }
]
```

### 4.8 Transfer Phase

**Application Data Structure:**
```typescript
interface Application {
   icon: string;           // Emoji: '💻', '🔒', '🔬', '🏥'
   title: string;          // "Quantum Computing"
   short: string;          // "Qubits in superposition"
   tagline: string;        // "The Next Computing Revolution"
   description: string;    // Full paragraph
   connection: string;     // How it connects to double-slit
   howItWorks: string;     // Technical explanation
   stats: Array<{
      value: string;       // "1,000+"
      label: string;       // "Qubits achieved"
      icon: string;        // "⚡"
   }>;                     // Always 3 stats
   examples: string[];     // Always 4 real-world examples
   companies: string[];    // 4-5 industry leaders
   futureImpact: string;   // Future prediction
   color: string;          // Phase accent color
}
```

**4 Required Applications:**
1. **Quantum Computing** (color: primary)
2. **Quantum Encryption** (color: success)
3. **Electron Microscopy** (color: accent)
4. **Medical Imaging (MRI)** (color: warning)

**Sequential Unlock Pattern:**
- Start with first app unlocked
- Complete current to unlock next
- Show 🔒 on locked apps
- Show ✓ on completed apps
- Track progress: `X/4 completed`

**App Navigation (CRITICAL):**
- After marking an app complete, show **"Continue to [Next App] →"** button (PRIMARY action)
- **"Take Test" button ONLY appears in bottom bar after ALL 4 apps are completed** - NOT on first app!
- Tab clicks must emit `app_changed` event with **full details including screenDescription and coachMessage** for AI coach sync
- Tab clicks should only work for: current app, completed apps, and next unlockable app
- **AI Coach must receive app-specific content** - override generic phase descriptions with app-specific ones

**Tab Click Handler (CRITICAL for AI Coach sync):**
```typescript
const handleAppTabClick = (index: number) => {
   if (index === activeApp) return; // Already on this app

   // Only allow clicking on completed apps or the next unlocked one
   const canAccess = index === 0 || completedApps[index - 1] || completedApps[index];
   if (!canAccess) return;

   setActiveApp(index);
   const targetApp = applications[index];

   // CRITICAL: Override screenDescription and coachMessage with app-specific content
   // This ensures the AI coach talks about the CORRECT app, not generic phase info
   const appScreenDescription = `REAL WORLD APPLICATION ${index + 1}/4: "${targetApp.title}" - ${targetApp.tagline}. ${targetApp.description}`;
   const appCoachMessage = `Now let's explore ${targetApp.title}! ${targetApp.tagline}. ${targetApp.connection}`;

   emitGameEvent('app_changed', {
      appNumber: index + 1,
      totalApps: 4,
      appTitle: targetApp.title,
      appTagline: targetApp.tagline,
      appConnection: targetApp.connection,
      screenDescription: appScreenDescription,  // Override for AI coach
      coachMessage: appCoachMessage,            // Override for AI coach
      message: `NOW viewing Real-World Application ${index + 1}/4: ${targetApp.title}. ${targetApp.tagline}. Physics connection: ${targetApp.connection}`
   });
};
```

**Continue Button Handler:**
```typescript
const handleContinueToNextApp = () => {
   if (activeApp < applications.length - 1) {
      const nextIndex = activeApp + 1;
      setActiveApp(nextIndex);
      const targetApp = applications[nextIndex];

      // Same pattern - override with app-specific content
      const appScreenDescription = `REAL WORLD APPLICATION ${nextIndex + 1}/4: "${targetApp.title}" - ${targetApp.tagline}. ${targetApp.description}`;
      const appCoachMessage = `Now let's explore ${targetApp.title}! ${targetApp.tagline}. ${targetApp.connection}`;

      emitGameEvent('app_changed', {
         appNumber: nextIndex + 1,
         totalApps: 4,
         appTitle: targetApp.title,
         appTagline: targetApp.tagline,
         appConnection: targetApp.connection,
         screenDescription: appScreenDescription,
         coachMessage: appCoachMessage,
         message: `NOW viewing Real-World Application ${nextIndex + 1}/4: ${targetApp.title}.`
      });
   }
};
```

**Transfer Phase Pattern - "Continue" at End of Content:**

Each real-world application should have a "Continue" button at the **end of its content** (after scrolling through). This is simpler and more intuitive than a "Mark Complete" pattern.

```typescript
// At the end of each app's content:
<div style={{ padding: '16px', marginTop: '16px' }}>
  {!isLastApp ? (
    <button onClick={handleContinueToNextApp} style={{ /* Primary CTA styling */ }}>
      Continue to {applications[activeApp + 1].title} →
    </button>
  ) : (
    <button onClick={() => goToPhase('test')} style={{ /* Primary CTA styling */ }}>
      Take the Test →
    </button>
  )}
</div>
```

| Current App | Button Text | Action |
|-------------|-------------|--------|
| App 1, 2, or 3 | "Continue to [Next App] →" | Unlock next app, scroll to top, switch tab |
| App 4 (last) | "Take the Test →" | Go to test phase |

**Key Points:**
- **NO "Mark Complete" button** - just "Continue" at the end
- Apps unlock sequentially as user scrolls to Continue and clicks
- User must scroll through content to find Continue button (engagement)
- Previously visited apps remain accessible via tabs

### 4.9 Test Phase

**Test State Reset (CRITICAL):**
Always reset test state when entering the test phase to ensure a clean start:
```typescript
// Reset test state when entering test phase
useEffect(() => {
   if (phase === 'test') {
      setCurrentQuestion(0);
      setTestScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTestAnswers(Array(10).fill(null));
   }
}, [phase]);
```

**Question Data Structure:**
```typescript
interface TestQuestion {
   scenario: string;        // Context/situation description
   question: string;        // The actual question
   options: Array<{
      id: string;           // 'two', 'interference', etc.
      label: string;        // Answer text
      correct?: boolean;    // Only one per question
   }>;
   explanation: string;     // Why correct answer is correct
}
```

**10 Questions with Topics:**
1. Core Concept - Interference (Easy)
2. Core Concept - Observer Effect (Medium)
3. Deep Concept - Superposition (Medium)
4. Quantum Computing Application (Medium-Hard)
5. Quantum Encryption Application (Hard)
6. Electron Microscopy Application (Medium)
7. MRI Application (Hard)
8. Synthesis Question (Expert)
9. Delayed Choice Experiment (Expert)
10. Practical Quantum Engineering (Hard)

**Test UI:**
- Progress bar (10 segments)
- Scenario box (primary color background)
- Question text (large, bold)
- 4 option buttons (A, B, C, D)
- Bottom bar with question navigation

**Results Screen:**
- Score display with emoji badge (🏆/🌟/👍/📚)
- Pass threshold: 70% (7/10)
- Question-by-question review
- For wrong answers: show correct answer + explanation
- Retake button

### 4.10 Mastery Phase

**Mastery Items:**
```typescript
const masteryItems = [
   { icon: '🌊', title: 'Wave-Particle Duality', desc: 'Particles travel as probability waves but are detected as particles', color: colors.primary },
   { icon: '🔀', title: 'Superposition', desc: 'Quantum objects exist in multiple states simultaneously until measured', color: colors.accent },
   { icon: '👁️', title: 'Observer Effect', desc: 'The act of measurement collapses the wave function into a definite state', color: colors.danger },
   { icon: '💻', title: 'Quantum Computing', desc: 'Exploits superposition to process exponentially more information in parallel', color: colors.success },
   { icon: '🎲', title: 'Probabilistic Reality', desc: 'At the quantum level, we can only predict probabilities, not certainties', color: colors.warning },
];
```

**Pass/Fail Logic (CRITICAL):**
```typescript
const percentage = Math.round((testScore / 10) * 100);
const isPassing = testScore >= 7; // 70% threshold

// Title changes based on pass/fail
isPassing ? "Topic Master!" : "Keep Practicing!"

// Badge changes
isPassing ? '🏆' : '📚'

// Checkmarks only shown on mastery items if passing
{isPassing && <span>✓</span>}
```

**Structure:**
1. Animated background orbs (same as hook)
2. Section header - dynamic based on pass/fail
3. Achievement badge (🏆 if passing, 📚 if not)
4. Score display with percentage
5. 5 mastered concepts list (checkmarks ONLY if passing)
6. Inspirational quote
7. Action buttons (different based on pass/fail):

**If PASSING (≥70%):**
   - Primary: "🏠 Return to Dashboard" (gradient, dispatches `returnToDashboard` event)
   - Secondary: "🔬 Review Lesson" (outline style)

**If NOT PASSING (<70%):**
   - Primary: "↺ Retake Test" (gradient)
   - Secondary: "🔬 Review Lesson" (outline style)
   - Tertiary: "Return to Dashboard" (text link, underlined)

**Return to Dashboard Implementation:**
```typescript
const handleReturnToDashboard = () => {
   emitGameEvent('button_clicked', {
      action: 'return_to_dashboard',
      message: 'User requested to return to dashboard'
   });
   window.dispatchEvent(new CustomEvent('returnToDashboard'));
};
```

---

## 5. AI Coach Integration

### 5.1 GameEvent Interface

```typescript
interface GameEvent {
   eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
              'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
              'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
              'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
              'coach_prompt' | 'guide_paused' | 'guide_resumed' | 'question_changed' | 'app_completed' | 'app_changed';
   gameType: string;        // 'wave_particle_duality'
   gameTitle: string;       // 'Wave-Particle Duality'
   details: {
      phase?: string;
      phaseLabel?: string;
      currentScreen?: number;
      totalScreens?: number;
      screenDescription?: string;
      prediction?: string;
      predictionLabel?: string;
      answer?: string;
      isCorrect?: boolean;
      score?: number;
      maxScore?: number;
      message?: string;      // Human-readable summary for AI
      coachMessage?: string;
      [key: string]: any;
   };
   timestamp: number;
}
```

### 5.2 Required Events

| Event | When to Emit | Required Details |
|-------|--------------|------------------|
| `game_started` | On mount | phase, phaseLabel, screenDescription, coachMessage |
| `phase_changed` | Every phase transition | phase, phaseLabel, currentScreen, totalScreens, screenDescription |
| `prediction_made` | User selects prediction | phase, prediction, predictionLabel |
| `answer_selected` | User selects test answer | questionNumber, questionText, selectedAnswer, allOptions |
| `question_changed` | Move to next question | questionNumber, questionScenario, questionText, allOptions |
| `app_completed` | Complete transfer app | appNumber, appTitle, appDescription |
| `app_changed` | Switch to different app | appNumber, totalApps, appTitle, appTagline, appConnection |
| `game_completed` | Test submitted | score, totalQuestions, percentage, passed |
| `hint_requested` | User requests hint | phase, coachMessage |

### 5.3 Screen Descriptions

```typescript
const screenDescriptions: Record<Phase, string> = {
   hook: 'INTRO SCREEN: Title "The Double-Slit Experiment", Feynman quote, Start button.',
   predict: 'PREDICTION SCREEN: User must select what pattern electrons will make: (A) Two bands, (B) Multiple bands (interference), or (C) One blob.',
   play: 'EXPERIMENT SCREEN: Live simulation firing electrons one at a time. User watches dots accumulate.',
   review: 'REVIEW SCREEN: Explains why interference pattern formed - each electron goes through BOTH slits.',
   twist_predict: 'TWIST PREDICTION: What happens if we ADD A DETECTOR to watch which slit?',
   twist_play: 'OBSERVER EXPERIMENT: Toggle detector ON/OFF. Compare patterns.',
   twist_review: 'OBSERVER EFFECT REVIEW: Explains measurement collapses wave function.',
   transfer: 'REAL WORLD APPLICATIONS: 4 cards showing quantum tech.',
   test: 'KNOWLEDGE TEST: Multiple choice questions with scenarios.',
   mastery: 'COMPLETION SCREEN: Summary of concepts mastered.'
};
```

### 5.4 Coach Messages

```typescript
const coachMessages: Record<Phase, string> = {
   hook: "Welcome to the quantum world! 🌟 This experiment changed physics forever.",
   predict: "Time to make a prediction! What do YOU think will happen?",
   play: "Now let's run the experiment! Watch carefully as electrons hit the screen.",
   review: "Wow! Did you expect THAT? Let's understand why this happens.",
   twist_predict: "Here's where it gets REALLY interesting! What happens when we try to catch the electrons?",
   twist_play: "Toggle the observer on and off. Watch how the pattern changes!",
   twist_review: "You've discovered the Observer Effect! The act of looking changes what happens.",
   transfer: "Now let's see how this quantum weirdness powers amazing real-world technology! 🚀",
   test: "Time to test your understanding! Take your time with each question.",
   mastery: "Congratulations! You've mastered wave-particle duality! 🎉"
};
```

---

## 6. Responsive Design

### 6.1 Mobile Breakpoint

```typescript
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
   const checkMobile = () => setIsMobile(window.innerWidth < 768);
   checkMobile();
   window.addEventListener('resize', checkMobile);
   return () => window.removeEventListener('resize', checkMobile);
}, []);
```

### 6.2 Mobile Adaptations

| Element | Desktop | Mobile |
|---------|---------|--------|
| Page padding | 16px | 12px |
| Card padding | 14px | 10px |
| Title font | 32px | 24px |
| Heading font | 22px | 18px |
| Body font | 13px | 12px |
| Button min-height | 44px | 44px (same) |
| Grid columns | 2 | 1 |
| Simulation layout | Side-by-side | Stacked |

### 6.3 Click Handling (UPDATED)

**IMPORTANT:** Use `onClick` for most buttons to avoid double-firing issues on mobile.

```typescript
// RECOMMENDED: Use onClick for selection buttons (predictions, answers, tabs)
<button
   onClick={() => handleAction()}
   style={{ WebkitTapHighlightColor: 'transparent' }}
>

// For selections, prevent re-selection:
const handlePredictionSelect = (id: string) => {
   if (prediction === id) return; // Already selected
   playSound('click');
   setPrediction(id);
   emitGameEvent('prediction_made', { prediction: id });
};
```

**Slider smoothness:** Use `onInput` for real-time updates in addition to `onChange`:
```typescript
<input
   type="range"
   onInput={(e) => setValue(Number((e.target as HTMLInputElement).value))}
   onChange={(e) => setValue(Number(e.target.value))}
   style={{ cursor: 'pointer' }}
/>
```

---

## 7. Animation & CSS

### 7.1 Required Keyframes

```css
@keyframes pulse {
   0%, 100% { transform: scale(1); opacity: 0.5; }
   50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes glow {
   0% { box-shadow: 0 0 20px rgba(6,182,212,0.4); }
   100% { box-shadow: 0 0 30px rgba(6,182,212,0.6); }
}

@keyframes spin {
   from { transform: rotate(0deg); }
   to { transform: rotate(360deg); }
}

@keyframes gradientShift {
   0%, 100% { background-position: 0% 50%; }
   50% { background-position: 100% 50%; }
}
```

### 7.2 Sound Effects

```typescript
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
   const sounds = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
   };
   // Web Audio API implementation
};
```

---

## 8. Navigation Logic

### 8.1 Phase Navigation

```typescript
const goToPhase = useCallback((p: Phase) => {
   const now = Date.now();
   if (now - lastClickRef.current < 200) return;  // Debounce
   if (isNavigating.current) return;

   lastClickRef.current = now;
   isNavigating.current = true;

   setPhase(p);

   // Reset simulation state when entering play phases
   if (p === 'play' || p === 'twist_play') {
      setParticleHits([]);
      setParticleCount(0);
   }
   if (p === 'twist_play') setDetectorOn(true);
   if (p === 'play') setDetectorOn(false);

   playSound('transition');
   emitGameEvent('phase_changed', { ... });

   setTimeout(() => { isNavigating.current = false; }, 400);
}, []);
```

### 8.2 Progress Requirements

| Phase | Can Proceed When |
|-------|------------------|
| hook | Always (click Begin) |
| predict | `prediction !== null` |
| play | `particleCount >= 30` |
| review | Always |
| twist_predict | `twistPrediction !== null` |
| twist_play | `particleCount >= 30` |
| twist_review | Always |
| transfer | `completedApps.every(c => c)` (all 4) |
| test | `testAnswers[currentQuestion] !== null` |
| mastery | Always |

---

## 9. Quick Reference: Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Scroll not working | Component remounts | Use render function, not component |
| Bottom bar hidden | Footer inside wrapper | Use footer prop in renderPremiumWrapper |
| Buttons not clicking | Overlay blocking | Add `pointerEvents: 'none'` to decorative elements |
| Multiple clicks needed for selection | Using onMouseDown/onTouchEnd | Use `onClick` with early return if already selected |
| Sliders not smooth | Missing onInput handler | Add both `onInput` and `onChange` handlers |
| AI coach talks about wrong app | Generic phase info sent | Override `screenDescription` and `coachMessage` in app events |
| "Take Test" shown too early | Wrong condition check | Only show when `allComplete === true` (all 4 apps done) |
| Says "Mastered" with 0/10 | Missing pass/fail logic | Check `isPassing = testScore >= 7` (70% threshold) |
| Test has wrong question count | Stale state / syntax error | Reset test state in useEffect when entering test phase |
| No Return to Dashboard option | Missing button on mastery | Add both "Return to Dashboard" AND "Review Lesson" buttons |
| AI out of sync | Missing events | Emit `phase_changed` on every transition |
| Phase skipping | Wrong conditions | Check `canGoNext` logic |
| Double transitions | No debounce | Add `isNavigating` ref with 400ms timeout |

---

## 10. Test Checklist

```markdown
## Game: [Name]
## Date: [Date]

### Structure
- [ ] All 10 phases implemented
- [ ] Phase sequence correct
- [ ] renderPremiumWrapper used (NOT a component)
- [ ] Footer prop pattern used
- [ ] **Quick Link added to dashboard page**

### Design
- [ ] Colors object matches spec
- [ ] Typography system matches spec
- [ ] Responsive design (mobile + desktop)
- [ ] Scroll works on all phases (especially steps 7, 8)

### Content
- [ ] Hook has animated visual, quote, CTA
- [ ] Predict has 3 options with icons - **single click selection works**
- [ ] Play has interactive simulation + milestones - **sliders are smooth**
- [ ] Review has 3 key takeaways
- [ ] Twist has observer toggle
- [ ] Transfer has 4 apps with sequential unlock
- [ ] Transfer: "Continue" button shows after each app completion
- [ ] Transfer: "Take Test" ONLY visible after ALL 4 apps complete
- [ ] Transfer: Tab clicks show correct app AND AI talks about correct app
- [ ] Test has 10 scenario-based questions - **state resets on entry**
- [ ] Mastery has 5 concepts + action buttons
- [ ] Mastery: Pass/fail logic correct (70% threshold)
- [ ] Mastery: "Return to Dashboard" option available
- [ ] Mastery: "Review Lesson" option available

### AI Integration
- [ ] game_started emitted on mount
- [ ] phase_changed emitted on every transition
- [ ] prediction_made emitted when user predicts
- [ ] All test events emitted (answer_selected, question_changed, game_completed)
- [ ] Screen descriptions complete for all phases

### Polish
- [ ] Sound effects on transitions
- [ ] Debounced navigation (no double-clicks)
- [ ] **Single-click selection works** (use onClick, not onMouseDown/onTouchEnd)
- [ ] **Sliders smooth** (use onInput + onChange)
- [ ] Touch events work on mobile
- [ ] Animations smooth
- [ ] Loading states if needed

### Issues Found
1.
2.
3.

### Overall: [ ] Pass / [ ] Needs Work
```

---

## 11. File Structure

```
components/
  [GameName]Renderer.tsx    # Main game component

# Inside the renderer (in order):
1. Imports
2. GameEvent interface export
3. Props interface
4. playSound utility function
5. Main component function
6. Type definitions (Phase type, etc.)
7. State declarations (useState)
8. useEffect hooks (responsive, animation, simulation)
9. emitGameEvent callback
10. Phase data (phaseOrder, phaseLabels, coachMessages, screenDescriptions)
11. Navigation functions (goToPhase, goNext, goBack)
12. Design system (colors, typo)
13. Helper render functions (renderBottomBar, renderPremiumWrapper, renderSectionHeader, etc.)
14. Content data (predictions, testQuestions, transferApps, masteryItems)
15. Phase render blocks (if/return for each phase)
16. Export default
```

---

## 12. Adding New Games

### 12.1 Quick Links Registration

**CRITICAL:** When adding a new game, it MUST be registered as a Quick Link on the dashboard/landing page.

**Steps to add a new game:**
1. Create the game renderer file: `components/[GameName]Renderer.tsx`
2. Register the game in `GeneratedDiagram.tsx` switch statement
3. **Add Quick Link entry** in the dashboard/landing page component
4. Test the Quick Link navigation works

**Quick Link Data Structure:**
```typescript
interface QuickLink {
   id: string;              // 'photoelectric_effect', 'coulombs_law', etc.
   title: string;           // "The Photoelectric Effect"
   description: string;     // Short description for the card
   icon: string;            // Emoji or icon component
   category: string;        // "Quantum Physics", "Electromagnetism", etc.
   duration: string;        // "~5 min"
   difficulty: string;      // "Beginner", "Intermediate", "Advanced"
}
```

### 12.2 Game Registration Checklist

When adding a new game:
- [ ] Game renderer created and follows this specification
- [ ] Game added to GeneratedDiagram.tsx switch statement
- [ ] **Quick Link added to dashboard** so users can access the game
- [ ] Game tested on both mobile and desktop
- [ ] AI coach events working correctly
- [ ] All 10 phases implemented and tested

---

## 13. Critical Implementation Rules

### 13.1 Selection Buttons (Predictions, Answers, Tabs)

**ALWAYS use `onClick` for selection buttons** to ensure single-click selection:

```typescript
// CORRECT - Single click works
<button
   onClick={() => handleSelect(id)}
   style={{ WebkitTapHighlightColor: 'transparent' }}
>

// WRONG - Can cause multiple clicks needed
<button
   onMouseDown={(e) => { e.preventDefault(); handleSelect(id); }}
   onTouchEnd={(e) => { e.preventDefault(); handleSelect(id); }}
>
```

**Always include early return for already-selected items:**
```typescript
const handleSelect = (id: string) => {
   if (selected === id) return;  // Already selected - prevent re-processing
   playSound('click');
   setSelected(id);
   emitGameEvent('selection_made', { ... });
};
```

### 13.2 Slider Smoothness

**Use both `onInput` and `onChange`** for smooth, real-time slider updates:

```typescript
<input
   type="range"
   min="200" max="700" step="1"
   value={wavelength}
   onInput={(e) => setWavelength(Number((e.target as HTMLInputElement).value))}
   onChange={(e) => setWavelength(Number(e.target.value))}
   style={{
      width: '100%',
      cursor: 'pointer',
      height: '8px',
      WebkitAppearance: 'none',
      appearance: 'none',
      background: 'linear-gradient(...)',
      borderRadius: '4px'
   }}
/>
```

### 13.3 AI Coach Sync for Real-World Applications

**CRITICAL:** When user clicks on application tabs (2, 3, 4), the AI coach MUST receive app-specific content, not generic phase info.

**Problem:** AI says "Quantum Computing" when user clicks "Digital Cameras"
**Solution:** Override `screenDescription` and `coachMessage` in the event:

```typescript
emitGameEvent('app_changed', {
   // App-specific overrides - AI will use THESE, not generic phase info
   screenDescription: `REAL WORLD APPLICATION ${index + 1}/4: "${targetApp.title}" - ${targetApp.description}`,
   coachMessage: `Now let's explore ${targetApp.title}! ${targetApp.connection}`,
   // Other details...
});
```

### 13.4 Mastery Phase Action Buttons

**Both passing AND failing users need clear navigation options:**

**If PASSING (≥70%):**
```typescript
// Primary CTA
<button onClick={handleReturnToDashboard} style={{ /* gradient */ }}>
   🏠 Return to Dashboard
</button>
// Secondary
<button onClick={() => goToPhase('hook')} style={{ /* outline */ }}>
   🔬 Review Lesson
</button>
```

**If NOT PASSING (<70%):**
```typescript
// Primary CTA
<button onClick={handleRetakeTest} style={{ /* gradient */ }}>
   ↺ Retake Test
</button>
// Secondary
<button onClick={() => goToPhase('hook')} style={{ /* outline */ }}>
   🔬 Review Lesson
</button>
// Tertiary (text link)
<button onClick={handleReturnToDashboard} style={{ /* text, underlined */ }}>
   Return to Dashboard
</button>
```

**Return to Dashboard implementation:**
```typescript
const handleReturnToDashboard = () => {
   emitGameEvent('button_clicked', { action: 'return_to_dashboard' });
   window.dispatchEvent(new CustomEvent('returnToDashboard'));
};
```

---

## 14. Interactive Graphics Design Philosophy

### 14.0 CRITICAL: REALISTIC, Professional-Grade Simulations

**Every simulation must look and feel like a REAL scientific instrument or natural phenomenon.**

#### The Standard: Lab-Quality Realism

Our simulations should feel like you're looking at:
- A real physics lab experiment
- Actual scientific equipment
- Nature as it truly appears
- Professional visualization software

**NOT:**
- Cartoon drawings
- Stick figures
- Clipart-style graphics
- Oversimplified diagrams
- "Educational" looking (boring, flat, lifeless)

#### Visual Quality Requirements

| Element | Wrong ❌ | Right ✓ |
|---------|----------|---------|
| **Metal surfaces** | Flat gray rectangle | Brushed metal with highlights, reflections, realistic texture gradients |
| **Light beams** | Solid colored lines | Glowing rays with falloff, proper color based on wavelength, animated photon particles |
| **Electrons** | Blue dots | Glowing orbs with emission trails, realistic motion blur, proper e⁻ labeling |
| **Equipment** | Basic shapes | Detailed lab equipment with proper shadows, bezels, panels, realistic materials |
| **Bubbles/films** | Flat circles with color | Iridescent surfaces with multiple reflection layers, realistic light interference patterns |
| **Waves** | Simple sine curves | Smooth propagating waves with proper physics, interference patterns, amplitude visualization |
| **Force fields** | Arrow lines | Field line visualizations with density gradients, color-coded strength, smooth curves |

#### Realistic Material Rendering

```typescript
// REALISTIC metal plate with proper gradients
<defs>
  <linearGradient id="brushedMetal" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#78716c" />
    <stop offset="30%" stopColor="#a8a29e" />  // Highlight
    <stop offset="60%" stopColor="#78716c" />
    <stop offset="100%" stopColor="#57534e" /> // Shadow
  </linearGradient>
</defs>
<rect fill="url(#brushedMetal)" stroke="#a8a29e" strokeWidth="1" />

// REALISTIC glowing element
<defs>
  <radialGradient id="electronGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
    <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.6" />
    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
  </radialGradient>
  <filter id="glow">
    <feGaussianBlur stdDeviation="3" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</defs>
<circle fill="url(#electronGlow)" filter="url(#glow)" />
```

#### Inspiration Sources

When designing simulations, reference:

1. **Real lab equipment photos** - Google "photoelectric effect apparatus" or "[concept] laboratory equipment"
2. **PhET simulations** - University of Colorado's gold standard (phet.colorado.edu)
3. **Scientific visualization software** - How professionals visualize physics
4. **Nature photography** - For phenomena like thin film interference, wave patterns
5. **Engineering diagrams** - For technical accuracy in equipment rendering

#### Physics Accuracy Checklist

Before finalizing any simulation:

- [ ] **Colors are physically accurate** - wavelength 400nm = violet, 700nm = red, not arbitrary
- [ ] **Proportions make sense** - electrons smaller than atoms, photons represented as packets
- [ ] **Motion follows physics** - acceleration, not teleportation; smooth curves, not jagged
- [ ] **Labels use proper notation** - E = hf, not "energy equals h times f"
- [ ] **Units are correct** - nm for wavelength, eV for energy, N for force
- [ ] **Scale indicators present** - show relative sizes, distances, or magnitudes

#### The "Would a Physicist Approve?" Test

Ask yourself: If a physics professor saw this simulation, would they:
- ✅ Nod approvingly at the accuracy
- ✅ Want to use it in their class
- ✅ Show it to colleagues as a good example
- ❌ Cringe at oversimplification
- ❌ Point out visual inaccuracies
- ❌ Say "that's not how it really looks"

#### Concept-Specific Realism Guidelines

**Photoelectric Effect:**
```
✓ Realistic vacuum tube/chamber with glass walls, metal electrodes
✓ Light source that looks like actual lab equipment (not a sun icon)
✓ Photon visualization as wave-packets with proper wavelength coloring
✓ Metal plate with crystalline/atomic structure hints
✓ Ejected electrons with proper trajectories and glow effects
✓ Energy meter/ammeter displays like real instruments
✗ Cartoon sun shooting yellow lines at a gray box
```

**Coulomb's Law / Electric Fields:**
```
✓ Charged spheres with realistic metallic or dielectric materials
✓ Electric field lines as smooth curves with proper density
✓ Force vectors with magnitude-proportional styling
✓ Charge indicators (+/-) integrated naturally, not stamped on
✓ Distance measurements with proper scale bars
✓ Background grid for spatial reference
✗ Plus and minus signs floating in white space with arrows
```

**Wave Interference / Thin Film:**
```
✓ Actual soap bubble appearance with iridescent rainbow reflections
✓ Oil slick on water with realistic fluid dynamics hints
✓ Wave fronts as proper sinusoidal surfaces, not zigzag lines
✓ Interference patterns showing actual bright/dark fringes
✓ Light rays with proper reflection/refraction angles
✓ Multiple surface reflections visible
✗ Colored stripes on a circle labeled "bubble"
```

**Wave-Particle Duality / Double Slit:**
```
✓ Realistic electron gun apparatus
✓ Barrier with actual slit geometry (not just gaps in a line)
✓ Detection screen showing accumulating hit pattern
✓ Individual particle hits as discrete points
✓ Emerging wave pattern from probability distribution
✓ Detector apparatus that looks like real equipment
✗ Balls going through holes in a wall
```

**Momentum / Collisions:**
```
✓ Billiard balls or air hockey pucks with realistic materials
✓ Motion blur and velocity vectors
✓ Impact visualization with compression hints
✓ Momentum arrows scaled to actual values
✓ Before/after states clearly distinguished
✓ Track or surface with realistic friction representation
✗ Colored circles bouncing with arrows
```

#### Premium Visual Elements Library

Every simulation should use these premium elements:

**Backgrounds:**
```typescript
// Lab environment background
<rect fill="#0a0a12" /> // Deep space black for contrast
<pattern id="labGrid" patternUnits="userSpaceOnUse" width="40" height="40">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a2a" strokeWidth="0.5"/>
</pattern>
<rect fill="url(#labGrid)" opacity="0.5" />
```

**Glows and Emissions:**
```typescript
// Multi-layer glow for realism
<filter id="premiumGlow">
  <feGaussianBlur stdDeviation="2" result="blur1"/>
  <feGaussianBlur stdDeviation="6" result="blur2"/>
  <feMerge>
    <feMergeNode in="blur2"/>
    <feMergeNode in="blur1"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

**Metallic Surfaces:**
```typescript
// Realistic brushed metal
<linearGradient id="premiumMetal" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stopColor="#d4d4d8"/>
  <stop offset="15%" stopColor="#a1a1aa"/>
  <stop offset="50%" stopColor="#71717a"/>
  <stop offset="85%" stopColor="#a1a1aa"/>
  <stop offset="100%" stopColor="#52525b"/>
</linearGradient>
```

**Glass/Transparent Materials:**
```typescript
// Realistic glass tube
<linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1"/>
  <stop offset="20%" stopColor="#ffffff" stopOpacity="0.05"/>
  <stop offset="80%" stopColor="#ffffff" stopOpacity="0.05"/>
  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15"/>
</linearGradient>
```

---

### 14.0.1 Animated Simulations, Not Static Images

**Every "interactive graphic" MUST be an ANIMATED SIMULATION, not a static image.**

| Wrong ❌ | Right ✓ |
|----------|---------|
| Static diagram that changes when slider moves | Continuously animated simulation with moving particles/waves |
| Image that swaps out based on settings | Real-time physics rendering with smooth transitions |
| Screenshot of a simulation | Live SVG/Canvas with `requestAnimationFrame` loop |
| Diagram with labels that update | Particles flowing, waves propagating, electrons ejecting |

**Required Animation Loop:**
```typescript
// Animation ref for cleanup
const animationRef = useRef<number>();
const timeRef = useRef(0);

// Continuous animation loop
useEffect(() => {
  const animate = () => {
    timeRef.current += 0.05; // Increment time
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
  return () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };
}, []);
```

**Simulation Elements Must:**
1. **Move continuously** - particles flow, waves propagate, electrons orbit
2. **Respond to sliders in real-time** - change speed, color, count instantly
3. **Show cause and effect** - adjusting wavelength → photon color changes → electron ejection changes
4. **Feel "game-like"** - dynamic, engaging, something to watch

**Example - Photoelectric Effect:**
```typescript
// Photon beam - particles moving from light source to metal
{Array.from({ length: numPhotons }).map((_, i) => {
  const progress = ((timeRef.current * 50 + i * 30) % 240) / 240;
  const x = 140 + progress * 240; // Photons move across screen
  return <circle cx={x} cy={y} r="6" fill={photonColor} />;
})}

// Electrons ejecting when emission occurs
{emissionOccurs && Array.from({ length: numElectrons }).map((_, i) => {
  const progress = ((timeRef.current * 40 + i * 25) % 180) / 180;
  const x = 430 + progress * speed * 100; // Electrons fly away
  return <circle cx={x} cy={y} r="3" fill="#38bdf8" />;
})}
```

### 14.1 Core Principle: SHOW, Don't Tell

**The goal of every interactive graphic is to make the abstract VISIBLE and TANGIBLE.**

Every simulation and interactive element must answer three questions:

| Question | Purpose | Example (Photoelectric Effect) |
|----------|---------|--------------------------------|
| **WHAT is being shown?** | Clear visual identification | Light beam hitting metal surface, electrons being ejected |
| **HOW does it teach?** | Direct cause → effect relationship | Slider changes wavelength → see color change → see electron ejection threshold |
| **WHY does it matter?** | Connect to real-world significance | "This is how solar panels work" |

### 14.2 Visual Clarity Rules

**Rule 1: One concept per visualization**
- Don't cram multiple physics concepts into a single graphic
- Each slider/control should demonstrate ONE relationship
- If showing multiple variables, show them side-by-side or in sequence, not overlapping

**Rule 2: Immediate visual feedback**
```typescript
// GOOD - Change is immediately visible
const handleWavelengthChange = (value: number) => {
   setWavelength(value);
   // Light beam color updates instantly
   // Electron ejection state updates instantly
   // Energy display updates instantly
};

// BAD - User has to click "Apply" to see changes
const handleWavelengthChange = (value: number) => {
   setPendingWavelength(value);
   // Nothing visual happens until user clicks "Apply"
};
```

**Rule 3: Clear cause and effect labeling**
- Label the INPUT clearly: "Light Wavelength (nm)" with value display
- Label the OUTPUT clearly: "Electrons Ejected: YES/NO" or "Force: 2.5 N"
- Use visual connectors (arrows, highlighting) to show relationship

**Rule 4: Use color semantically**
```typescript
// Color communicates meaning
const semanticColors = {
   active: '#10b981',      // Green = working, ejecting, moving
   inactive: '#64748b',    // Gray = threshold not met, stationary
   warning: '#f59e0b',     // Amber = approaching threshold
   danger: '#ef4444',      // Red = observer on, blocking, error
   highlight: '#06b6d4',   // Cyan = current focus, selected
};
```

### 14.3 Text Minimization Strategy

**Keep text to absolute minimum. Let the visual do the teaching.**

| Phase | Maximum Text | What to Include |
|-------|--------------|-----------------|
| Hook | 50 words | Title, one-sentence hook, quote |
| Play | 30 words | Control labels, milestone hints only |
| Review | 100 words | 3 key takeaways (3 sentences each max) |

**Text placement hierarchy:**
1. **Labels** - What is this element? (e.g., "Wavelength")
2. **Values** - What is the current state? (e.g., "400 nm")
3. **Hints** - What should user notice? (e.g., "Approaching threshold!")
4. **Explanations** - Why does this happen? (ONLY in review phases, not in play phases)

**Example - Good vs Bad:**
```typescript
// BAD - Too much text in simulation
<div>
   <p>The photoelectric effect demonstrates that light behaves as particles
      called photons. When a photon with sufficient energy strikes a metal
      surface, it can transfer its energy to an electron...</p>
   <Simulation />
</div>

// GOOD - Visual teaches, text labels only
<div>
   <Simulation />
   <div className="controls">
      <label>Light Wavelength</label>
      <input type="range" />
      <span className="value">{wavelength} nm</span>
      {belowThreshold && <span className="hint">⚡ Threshold reached!</span>}
   </div>
</div>
```

### 14.4 Slider Best Practices

**Sliders are the primary teaching tool. They must be perfect.**

**Technical requirements:**
```typescript
<input
   type="range"
   min={minValue}
   max={maxValue}
   step={appropriateStep}  // Fine enough for smooth animation
   value={currentValue}
   // BOTH handlers for smooth, real-time updates
   onInput={(e) => setValue(Number((e.target as HTMLInputElement).value))}
   onChange={(e) => setValue(Number(e.target.value))}
   style={{
      width: '100%',
      height: '8px',
      WebkitAppearance: 'none',
      appearance: 'none',
      background: `linear-gradient(to right,
         ${activeColor} 0%,
         ${activeColor} ${percentage}%,
         ${inactiveColor} ${percentage}%,
         ${inactiveColor} 100%)`,
      borderRadius: '4px',
      cursor: 'pointer'
   }}
/>
```

**Visual feedback requirements:**
1. **Track fill** - Show progress visually (filled portion vs unfilled)
2. **Value display** - Always show current numeric value
3. **Unit labels** - Include units (nm, N, Hz, etc.)
4. **Range indicators** - Show min/max values at track ends
5. **Semantic coloring** - Track color can indicate meaning (e.g., spectrum for wavelength)

**Slider-to-simulation sync:**
```typescript
// The simulation MUST update in real-time as slider moves
useEffect(() => {
   // Recalculate physics based on slider value
   const newEnergy = calculatePhotonEnergy(wavelength);
   const willEject = newEnergy >= workFunction;
   setElectronsEjecting(willEject);
   setPhotonEnergy(newEnergy);
}, [wavelength]);
```

### 14.5 Animation for Understanding

**Animations should reveal physics, not just look pretty.**

**Good animation examples:**
- Electrons accelerating as they leave the metal (shows kinetic energy)
- Wave amplitude decreasing with distance (shows inverse square law)
- Particles spreading from point source (shows probability distribution)
- Color gradient on light beam (shows wavelength → frequency relationship)

**Bad animation examples:**
- Spinning logos (decorative, doesn't teach)
- Pulsing buttons (distracting)
- Random particle motion (no physics meaning)

**Animation timing:**
```typescript
// Use appropriate durations
const animationDurations = {
   instant: '0ms',        // Slider track fill
   quick: '150ms',        // Button state changes
   smooth: '300ms',       // Element transitions
   visible: '500ms',      // Particle motion (needs to be trackable)
   slow: '1000ms+',       // Wave propagation (needs to be observable)
};
```

### 14.6 Interactive Element Checklist

For each interactive element in your simulation, verify:

```markdown
## Interactive Element: [Name]

### Visibility
- [ ] User can immediately see what this control affects
- [ ] Current value is displayed numerically
- [ ] Range limits are visible (min/max labels)
- [ ] Visual feedback is instantaneous (no lag)

### Teaching Value
- [ ] Control demonstrates ONE clear physics relationship
- [ ] Cause → effect is visually obvious
- [ ] No text explanation needed to understand the effect
- [ ] A student could discover the physics principle by playing

### Technical Implementation
- [ ] Uses both onInput and onChange handlers
- [ ] Has WebkitTapHighlightColor: 'transparent' for mobile
- [ ] Touch target is at least 44px
- [ ] Smooth animation (no janky updates)
- [ ] Proper units displayed

### Edge Cases
- [ ] Works at minimum value
- [ ] Works at maximum value
- [ ] Works with rapid slider movement
- [ ] Works on mobile touch
- [ ] Doesn't break simulation when spammed
```

### 14.7 Real-World Application Visuals

**Each of the 4 transfer applications MUST have a visual component.**

**Required visual elements per application:**
1. **Icon/Image** - Recognizable representation of the technology
2. **Connection diagram** - How the physics connects to the application
3. **Key stats** - 3 numerical facts with icons
4. **Examples list** - 4 real products/uses

**Visual hierarchy for app cards:**
```
┌─────────────────────────────────────┐
│ 💻 [ICON]                           │
│                                     │
│ Quantum Computing                   │  ← Title (large, bold)
│ The Next Computing Revolution       │  ← Tagline (medium, accent)
│                                     │
│ [Connection to physics principle]   │  ← 1 sentence max
│                                     │
│ ⚡ 1,000+ qubits achieved          │  ← Stats with icons
│ 🚀 10x processing speed             │
│ 💰 $2B+ invested                    │
│                                     │
│ Examples: IBM, Google, Intel, ...   │  ← Real companies
└─────────────────────────────────────┘
```

### 14.8 Common Visual Mistakes

| Mistake | Why It's Bad | Fix |
|---------|--------------|-----|
| Text explaining what animation shows | Redundant, clutters screen | Remove text, let visual teach |
| Static diagram with text description | Not interactive, passive learning | Make it draggable/adjustable |
| Multiple physics concepts in one view | Confusing, overwhelming | Split into sequential steps |
| Tiny sliders/buttons | Hard to use, especially mobile | Min 44px touch targets |
| No value display on sliders | User doesn't know exact state | Always show current value |
| Animations too fast to track | Can't observe the physics | Slow down to ~500ms minimum |
| Decorative animations | Distracting from content | Remove or make them teach something |
| Inconsistent colors | Meaning unclear | Use semantic color system |

### 14.9 Testing Interactive Graphics

**Manual test protocol for each interactive element:**

1. **Initial state** - Is it clear what to do?
2. **First interaction** - Does something visually change?
3. **Continuous interaction** - Is feedback smooth and continuous?
4. **Extreme values** - Does it handle min/max gracefully?
5. **Mobile test** - Does touch work as well as mouse?
6. **Teaching test** - Could a student discover the physics concept without reading?

**The "Mute Test":**
> If you muted all the text and just watched the visuals, would a student still learn the core concept?

If the answer is "no", the interactive graphic needs more visual teaching power.

---

## 15. PREMIUM DESIGN STANDARDS (Apple/Airbnb Level)

### 15.0 Design Philosophy

**Every game should feel like it was designed by a team from Apple, Airbnb, Nike, and Figma.**

The user experience must be:
- **Effortless** - One click does one thing, every time
- **Beautiful** - Colors, typography, and spacing are intentional and harmonious
- **Clear** - Users always know what to do and what's happening
- **Reliable** - No flashing, no double-clicks required, no jammed interactions

### 15.1 Premium Color System

**CRITICAL: Color contrast and harmony are non-negotiable.**

```typescript
const premiumColors = {
  // Background Hierarchy (darkest to lightest)
  bgDeep: '#030712',        // gray-950 - main page background
  bgSurface: '#0f172a',     // slate-900 - card backgrounds
  bgElevated: '#1e293b',    // slate-800 - elevated cards, inputs
  bgHover: '#334155',       // slate-700 - hover states

  // Text Hierarchy (must contrast with backgrounds)
  textPrimary: '#f8fafc',   // slate-50 - headings, primary text (contrast 16:1 on bgDeep)
  textSecondary: '#cbd5e1', // slate-300 - body text (contrast 10:1 on bgDeep)
  textTertiary: '#94a3b8',  // slate-400 - labels, hints (contrast 6:1 on bgDeep)
  textMuted: '#64748b',     // slate-500 - disabled, metadata (contrast 4:1 on bgDeep)

  // Brand Colors
  brand: {
    primary: '#3b82f6',     // blue-500 - main CTA, links
    primaryHover: '#2563eb', // blue-600 - hover state
    secondary: '#10b981',   // emerald-500 - success, completion
    accent: '#8b5cf6',      // violet-500 - highlights, special elements
  },

  // Semantic Colors
  semantic: {
    success: '#22c55e',     // green-500
    successBg: 'rgba(34, 197, 94, 0.1)',
    warning: '#f59e0b',     // amber-500
    warningBg: 'rgba(245, 158, 11, 0.1)',
    error: '#ef4444',       // red-500
    errorBg: 'rgba(239, 68, 68, 0.1)',
    info: '#06b6d4',        // cyan-500
    infoBg: 'rgba(6, 182, 212, 0.1)',
  },

  // Interactive States
  interactive: {
    default: '#3b82f6',
    hover: '#2563eb',
    active: '#1d4ed8',
    disabled: '#475569',
  }
};
```

**Color Pairing Rules:**

| Background | Allowed Text Colors | Min Contrast |
|------------|---------------------|--------------|
| `bgDeep` (#030712) | textPrimary, textSecondary, textTertiary | 4.5:1 minimum |
| `bgSurface` (#0f172a) | textPrimary, textSecondary | 4.5:1 minimum |
| `bgElevated` (#1e293b) | textPrimary, textSecondary | 4.5:1 minimum |
| Any dark bg | NEVER use textMuted for important info | - |

**FORBIDDEN combinations:**
- Dark text on dark background
- Low-contrast text for interactive elements
- Pure white (#fff) on dark backgrounds (too harsh - use slate-50)

### 15.2 Premium Typography System

```typescript
const typography = {
  // Font Stack
  fontFamily: {
    display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
  },

  // Type Scale (mobile / desktop)
  scale: {
    // Display - Hero titles only
    hero: { mobile: '32px', desktop: '48px', weight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },

    // Headings
    h1: { mobile: '28px', desktop: '36px', weight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },
    h2: { mobile: '22px', desktop: '28px', weight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { mobile: '18px', desktop: '22px', weight: 600, lineHeight: 1.4 },

    // Body
    bodyLarge: { mobile: '16px', desktop: '18px', weight: 400, lineHeight: 1.6 },
    body: { mobile: '14px', desktop: '16px', weight: 400, lineHeight: 1.6 },
    bodySmall: { mobile: '13px', desktop: '14px', weight: 400, lineHeight: 1.5 },

    // UI Elements
    label: { mobile: '11px', desktop: '12px', weight: 600, lineHeight: 1.4, letterSpacing: '0.04em', textTransform: 'uppercase' },
    caption: { mobile: '12px', desktop: '13px', weight: 400, lineHeight: 1.4 },
    button: { mobile: '14px', desktop: '15px', weight: 600, lineHeight: 1 },
  }
};
```

### 15.3 Premium Spacing System

**Use consistent spacing based on 4px grid:**

```typescript
const spacing = {
  // Base unit: 4px
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',

  // Semantic spacing
  page: {
    paddingX: { mobile: '16px', desktop: '24px' },
    paddingY: { mobile: '24px', desktop: '32px' },
    maxWidth: '640px',  // Content max width for readability
  },

  card: {
    padding: { mobile: '16px', desktop: '24px' },
    gap: { mobile: '12px', desktop: '16px' },
    borderRadius: '16px',
  },

  button: {
    paddingX: { mobile: '20px', desktop: '24px' },
    paddingY: { mobile: '14px', desktop: '16px' },
    minHeight: '48px',  // Touch target
    borderRadius: '12px',
  },

  section: {
    gap: { mobile: '32px', desktop: '48px' },
  }
};
```

### 15.4 Button Reliability Requirements

**CRITICAL: Buttons MUST work with a single click, every time.**

```typescript
// REQUIRED button implementation pattern
const PremiumButton = ({ onClick, children, disabled }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onClick?.();
  }, [onClick, disabled]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        // Minimum touch target
        minHeight: '48px',
        minWidth: '48px',

        // Prevent double-tap zoom on mobile
        touchAction: 'manipulation',

        // Prevent highlight flash
        WebkitTapHighlightColor: 'transparent',

        // Clear focus states
        outline: 'none',

        // Prevent text selection on rapid clicks
        userSelect: 'none',
        WebkitUserSelect: 'none',

        // Smooth transitions (not too fast)
        transition: 'all 0.2s ease',

        // Cursor feedback
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};
```

**Button Reliability Checklist:**
- [ ] Uses `onClick` (NOT onMouseDown, onTouchEnd, or onPointerDown)
- [ ] Has `touchAction: 'manipulation'` to prevent zoom delay
- [ ] Has `WebkitTapHighlightColor: 'transparent'`
- [ ] Has `userSelect: 'none'` to prevent text selection
- [ ] Minimum 48px touch target
- [ ] Clear visual feedback on hover/active states
- [ ] Disabled state is visually distinct
- [ ] No event propagation issues (stopPropagation if needed)

**AI Chat Integration:**
The AI chat sidebar must NEVER block or intercept game button clicks. The chat is a helper, not a controller. Game buttons must always respond to user input regardless of chat state.

### 15.5 Premium Hook Page Design

**The hook page is the first impression. It must be stunning.**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              [Progress dots in header]                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    ┌─────────────┐                      │
│                    │ ● PHYSICS   │  ← Category pill     │
│                    └─────────────┘                      │
│                                                         │
│                 The Impossible                          │
│                   Balance                               │  ← Hero title
│                                                         │      (gradient text)
│      A fork hangs off a glass and doesn't fall.        │  ← Subtitle
│           How is this even possible?                    │      (secondary text)
│                                                         │
│         ┌─────────────────────────────────┐            │
│         │                                 │            │
│         │    [Premium Visualization]      │            │  ← Animated preview
│         │    Realistic, high-quality      │            │      (not cartoon)
│         │    simulation preview           │            │
│         │                                 │            │
│         └─────────────────────────────────┘            │
│                                                         │
│           "The center of mass is the key               │  ← Quote box
│            to understanding balance."                   │      (subtle bg)
│                     — Physics                           │
│                                                         │
│         ┌─────────────────────────────────┐            │
│         │     Begin Experiment  →         │            │  ← Primary CTA
│         └─────────────────────────────────┘            │      (gradient, large)
│                                                         │
│              ⏱ 5 min  •  🧪 Lab  •  📝 Quiz            │  ← Feature pills
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Hook Page Requirements:**
1. **Category pill** - Small, colored badge indicating topic area
2. **Hero title** - Large, gradient text, memorable phrasing
3. **Subtitle** - Intriguing question or statement in secondary color
4. **Visualization** - Animated preview of the simulation (realistic, not cartoon)
5. **Quote** - Relevant physics quote with attribution
6. **Primary CTA** - Large, gradient button with clear action
7. **Feature pills** - Time estimate, format indicators

### 15.6 Realistic Simulation Design

**Simulations must look like real physics equipment, not educational clipart.**

**Visual Quality Standards:**

| Element | Wrong ❌ | Right ✓ |
|---------|----------|---------|
| Metal | Flat gray | Multi-stop gradient with highlights and shadows |
| Glass | Solid color with stroke | Transparent gradient with reflections and refractions |
| Wood | Brown rectangle | Grain texture with subtle color variations |
| Shadow | Hard drop shadow | Soft, realistic ambient occlusion |
| Glow | Flat color | Multi-layer radial gradient with blur |
| Animation | Jerky frame changes | Smooth easing with 60fps rendering |

**Required SVG Techniques:**
```xml
<!-- Realistic metal gradient -->
<linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#e8e8e8"/>
  <stop offset="20%" stop-color="#d0d0d0"/>
  <stop offset="40%" stop-color="#f0f0f0"/>  <!-- highlight -->
  <stop offset="60%" stop-color="#c8c8c8"/>
  <stop offset="100%" stop-color="#a0a0a0"/>
</linearGradient>

<!-- Realistic glass -->
<linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
  <stop offset="50%" stop-color="#87ceeb" stop-opacity="0.25"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1"/>
</linearGradient>

<!-- Soft glow effect -->
<filter id="glow">
  <feGaussianBlur stdDeviation="4" result="blur"/>
  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
</filter>
```

### 15.7 Transfer Phase Tab Design

**4 applications with strict sequential unlock:**

```
┌─────────────────────────────────────────────────────────┐
│  Real-World Applications                    3/4 done    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │ ✓ 1  │  │ ✓ 2  │  │ ● 3  │  │ 🔒 4  │  ← Tab bar   │
│  └──────┘  └──────┘  └──────┘  └──────┘               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎪  Tightrope Walking                          │   │
│  │                                                 │   │
│  │  [Realistic illustration of concept]           │   │  ← Each app has
│  │                                                 │   │    its own graphic
│  │  Professional tightrope walkers use long,      │   │
│  │  curved poles to lower their center of mass    │   │
│  │  below the rope...                             │   │
│  │                                                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │ 10-12m  │ │ 10-15kg │ │  45°    │          │   │  ← Stats grid
│  │  │ Length  │ │ Weight  │ │ Max tilt│          │   │
│  │  └─────────┘ └─────────┘ └─────────┘          │   │
│  │                                                 │   │
│  │  Examples: Nik Wallenda, Philippe Petit...     │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │    Continue to Ship Stability →         │  │   │  ← Continue CTA
│  │  └─────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Tab Unlock Rules:**
1. Tab 1 is always unlocked
2. Tab N is unlocked ONLY when Tab N-1 is completed
3. Completed tabs show ✓ checkmark
4. Current tab shows ● filled dot
5. Locked tabs show 🔒 and are NOT clickable
6. "Take the Test" button ONLY appears after ALL 4 tabs are completed

### 15.8 Test Phase Requirements

**10 questions with clear progress tracking:**

```
┌─────────────────────────────────────────────────────────┐
│  Knowledge Test                          Score: 6/8     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ████████████████░░░░░░░░░░░░░░░░  Question 8 of 10    │  ← Progress bar
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  Why does a tightrope walker hold a long pole? │   │  ← Question
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  A. For exercise during the walk               │   │  ← Options
│  └─────────────────────────────────────────────────┘   │     (clear, tappable)
│  ┌─────────────────────────────────────────────────┐   │
│  │  B. To lower their overall center of mass  ✓   │   │  ← Correct answer
│  └─────────────────────────────────────────────────┘   │     highlighted
│  ┌─────────────────────────────────────────────────┐   │
│  │  C. To wave at the crowd                       │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  D. The pole has no purpose                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💡 The heavy pole bends downward, lowering the │   │  ← Explanation
│  │    walker's center of mass below the rope.     │   │     (after answer)
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│           ← Back                    Next →              │  ← Navigation
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Test Requirements:**
1. User CANNOT reach test without completing all 4 transfer apps
2. Questions are shown one at a time
3. Clear progress indicator (X of 10)
4. Running score display
5. Explanation shown AFTER answering (not before)
6. Navigation between questions (can review answered ones)
7. "Complete" button only after all 10 answered

### 15.9 Stability & Reliability Checklist

Before shipping any game, verify:

**Button Reliability:**
- [ ] Every button works on first click (test on real device)
- [ ] No double-click required anywhere
- [ ] No flashing or UI jumping when clicking
- [ ] Disabled buttons are clearly disabled
- [ ] Touch targets are minimum 48px

**Visual Stability:**
- [ ] No layout shifts when content loads
- [ ] Animations are smooth (60fps)
- [ ] Colors have proper contrast (test with contrast checker)
- [ ] Text is readable at all sizes
- [ ] No overlapping elements

**Interaction Stability:**
- [ ] Sliders respond immediately to input
- [ ] Graphics update in real-time as controls change
- [ ] State is preserved when navigating between phases
- [ ] "Back" button returns to correct previous state

**Progressive Lock:**
- [ ] Test phase is locked until all 4 transfer apps complete
- [ ] Transfer apps unlock sequentially
- [ ] Progress is tracked accurately
- [ ] User cannot skip required content

---

## 16. SIMULATION REALISM REQUIREMENTS

### 16.1 The "Live Physics" Standard

Every play/twist_play phase must have a **CONTINUOUSLY RUNNING physics simulation**, not a static diagram that updates on interaction.

**Non-Negotiable Requirements:**

| Requirement | Wrong ❌ | Right ✓ |
|-------------|----------|---------|
| Animation | Static image that changes on slider move | Continuously animated particles/waves/objects |
| Slider response | "Apply" button to see changes | Instant visual update (< 16ms) |
| Physics teaching | Text explains what happened | User SEES the physics relationship |
| Interactivity | Click to trigger preset animation | Manipulate parameters, observe continuous effect |

### 16.2 Required Animation Loop

**Every simulation MUST have this structure:**

```typescript
// Animation refs
const animationRef = useRef<number>();
const timeRef = useRef(0);

// Physics state that drives the visualization
const [particles, setParticles] = useState<Particle[]>([]);

// Continuous animation loop - REQUIRED
useEffect(() => {
  const animate = () => {
    timeRef.current += 0.016; // ~60fps

    // Update physics every frame
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx * 0.016,
      y: p.y + p.vy * 0.016,
    })));

    animationRef.current = requestAnimationFrame(animate);
  };

  animationRef.current = requestAnimationFrame(animate);
  return () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };
}, [/* physics parameters that affect simulation */]);
```

### 16.3 Simulation Types by Physics Concept

| Concept Type | What Must Animate | User Controls |
|--------------|-------------------|---------------|
| **Mechanics** | Objects move, rotate, collide continuously | Force, mass, angle, friction |
| **Waves** | Wave fronts propagate across screen | Frequency, amplitude, wavelength |
| **Electrostatics** | Field lines animate, charges move under forces | Charge magnitude, separation |
| **Thermal** | Particles move with speed proportional to temperature | Temperature, pressure, volume |
| **Optics** | Light rays trace paths, interference patterns form | Angle, wavelength, slit width |
| **Quantum** | Probability waves evolve, particles accumulate | Detector on/off, firing rate |

### 16.4 Visual Quality Standards

**Materials must look realistic, not like clipart:**

```typescript
// WRONG - Flat, lifeless shapes
<rect fill="#808080" /> // Gray rectangle for "metal"
<circle fill="#ffff00" /> // Yellow circle for "light"

// RIGHT - Realistic materials with depth
<defs>
  {/* Brushed metal with highlights */}
  <linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stopColor="#e8e8e8"/>
    <stop offset="20%" stopColor="#d0d0d0"/>
    <stop offset="40%" stopColor="#f0f0f0"/>  {/* highlight band */}
    <stop offset="60%" stopColor="#c8c8c8"/>
    <stop offset="100%" stopColor="#a0a0a0"/>
  </linearGradient>

  {/* Glowing light source */}
  <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
    <stop offset="40%" stopColor="#fef08a" stopOpacity="0.8"/>
    <stop offset="100%" stopColor="#fef08a" stopOpacity="0"/>
  </radialGradient>

  {/* Soft glow filter */}
  <filter id="glow">
    <feGaussianBlur stdDeviation="3" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>
```

### 16.5 Physics Accuracy Checklist

Before finalizing any simulation:

- [ ] **Colors are physically accurate** - 400nm = violet, 550nm = green, 700nm = red
- [ ] **Proportions make sense** - Forces scale with actual equations
- [ ] **Motion follows physics** - Acceleration, not teleportation; smooth curves
- [ ] **Labels use proper notation** - F = kq₁q₂/r², not "force = k times charges over distance squared"
- [ ] **Units are correct** - nm for wavelength, μC for charge, N for force
- [ ] **Scale indicators present** - Grid, ruler, or reference object for size context

---

## 17. SLIDER-DRIVEN DISCOVERY LEARNING

### 17.1 The Discovery Learning Pattern

Students must discover physics relationships **BY MANIPULATING sliders**, not by reading explanations.

**The Learning Loop:**
```
┌─────────────────────────────────────────────────────────────┐
│  1. User moves slider                                       │
│         ↓                                                   │
│  2. Simulation responds INSTANTLY (< 16ms)                  │
│         ↓                                                   │
│  3. User observes VISUAL CHANGE in the graphic              │
│         ↓                                                   │
│  4. User forms hypothesis ("bigger charge = stronger force")│
│         ↓                                                   │
│  5. User tests hypothesis with more slider moves            │
│         ↓                                                   │
│  6. User discovers the physics principle themselves         │
│         ↓                                                   │
│  7. Review phase CONFIRMS what they discovered              │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 Required Slider Implementation

**CRITICAL: Use BOTH onInput AND onChange for smooth response:**

```typescript
<input
  type="range"
  min={min}
  max={max}
  step={step}
  value={value}
  // BOTH handlers required - onInput for real-time, onChange for final
  onInput={(e) => {
    const newValue = Number((e.target as HTMLInputElement).value);
    setValue(newValue);
    // Simulation updates IMMEDIATELY - no delay, no debounce
  }}
  onChange={(e) => setValue(Number(e.target.value))}
  style={{
    width: '100%',
    height: '8px',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
    // Visual progress indicator
    background: `linear-gradient(to right,
      ${activeColor} 0%,
      ${activeColor} ${percentage}%,
      ${inactiveColor} ${percentage}%,
      ${inactiveColor} 100%)`,
  }}
/>
```

### 17.3 Slider Visual Requirements

Every slider MUST have:

```
┌─────────────────────────────────────────────────────────────┐
│  Wavelength                              ← LABEL (what)     │
│                                                             │
│  400nm ═══════════●══════════════════ 700nm  ← MIN/MAX     │
│         ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░        ← TRACK FILL  │
│                                                             │
│              ┌─────────┐                                    │
│              │  523 nm │  ← VALUE DISPLAY (large, monospace)│
│              │  Green  │  ← MEANING (what this value means) │
│              └─────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

| Element | Requirement |
|---------|-------------|
| **Label** | Clear name of what's being controlled |
| **Value display** | Large, monospace font, updates in real-time |
| **Units** | ALWAYS show units (nm, μC, N, m/s, etc.) |
| **Track fill** | Visual progress from min to current |
| **Min/Max labels** | Values at both ends of track |
| **Thumb size** | Minimum 20px diameter for touch |

### 17.4 Slider → Simulation Binding Examples

**Coulomb's Law:**
```
Slider: Separation distance (1-50 cm)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTANT Visual Response:
  • Charges physically move apart/together in the graphic
  • Force arrow lengths scale with 1/r² (visibly shorter at distance)
  • Field line density changes (sparser at greater distance)
  • Numeric display updates: "F = 2.3 N → F = 0.6 N"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER DISCOVERS: "When I double the distance, force becomes 1/4!"
```

**Photoelectric Effect:**
```
Slider: Light wavelength (200-800 nm)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTANT Visual Response:
  • Light beam color changes through spectrum
  • Below threshold: electrons stay in metal (grayed out)
  • At threshold: electrons start ejecting (animated!)
  • Above threshold: electrons eject faster (longer trails)
  • Energy meter fills/empties based on photon energy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER DISCOVERS: "Color matters! Blue light ejects electrons, red doesn't!"
```

---

## 18. SELF-EXPLANATORY GRAPHICS (CRITICAL)

### 18.1 The "Mute Test"

> **If you removed ALL text outside the graphic and just watched the visualization,
> could a student understand the core physics concept?**

If the answer is NO → the graphic needs more visual teaching power.

**The graphic itself must communicate:**
1. **WHAT** is being shown (labeled components)
2. **WHAT TO LOOK FOR** (highlighted areas of interest)
3. **WHAT YOU SEE** (clear visual representation)
4. **WHY YOU SEE IT** (cause-effect visual connection)

### 18.2 The Four Questions Every Graphic Must Answer

For EVERY simulation graphic, ensure these are visually clear:

```
┌─────────────────────────────────────────────────────────────┐
│  ❶ WHAT IS IN THIS GRAPHIC?                                 │
│     • Every component is labeled IN the SVG                 │
│     • Labels use proper physics terminology                 │
│     • User knows what each element represents               │
│                                                             │
│  ❷ WHAT SHOULD I LOOK AT / LOOK FOR?                        │
│     • Key areas are highlighted or animated                 │
│     • Attention is drawn to where physics happens           │
│     • Visual hierarchy guides the eye                       │
│                                                             │
│  ❸ WHAT AM I SEEING HAPPEN?                                 │
│     • The physics phenomenon is clearly visible             │
│     • Changes are obvious, not subtle                       │
│     • State changes are unmistakable                        │
│                                                             │
│  ❹ WHY IS THIS HAPPENING?                                   │
│     • Cause → effect is visually connected                  │
│     • Arrows/lines show relationships                       │
│     • Before/after or comparison views available            │
└─────────────────────────────────────────────────────────────┘
```

### 18.3 Required In-Graphic Labels

**These labels must be INSIDE the SVG, not in surrounding text:**

| Label Type | Purpose | Example |
|------------|---------|---------|
| **Component labels** | What is this thing? | "CATHODE", "LENS", "WAVE SOURCE", "PIVOT" |
| **Value indicators** | Current state | "v = 2.5 m/s", "+3 μC", "F = 4.2 N" |
| **State indicators** | What's happening | "✓ BALANCED", "⚡ EJECTING", "BLOCKED" |
| **Relationship arrows** | What causes what | Arrow from light → electron with "E = hf" |
| **Threshold markers** | Critical points | Dashed line labeled "threshold λ = 540nm" |
| **Region labels** | Areas of interest | "INTERFERENCE ZONE", "SHADOW REGION" |

### 18.4 Visual Labeling Examples

**Example: Photoelectric Effect**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────────┐         LIGHT BEAM                           │
│   │  LIGHT  │    ════════════════►    ┌──────────────┐     │
│   │ SOURCE  │      λ = 420nm          │              │     │
│   │         │      (violet)           │    METAL     │     │
│   └─────────┘                         │    PLATE     │     │
│                         ↓             │              │     │
│              ┌─────────────────┐      │   ● ● ●     │     │
│              │ PHOTON ENERGY   │      │  electrons  │     │
│              │   E = 2.95 eV   │      │              │     │
│              │ ✓ > threshold   │      └──────┬───────┘     │
│              └─────────────────┘             │              │
│                                              ↓              │
│                              ┌──────────────────────────┐  │
│                              │  ⚡ ELECTRONS EJECTING   │  │
│                              │     KE = 0.65 eV         │  │
│                              └──────────────────────────┘  │
│                                                             │
│   [STATUS: EMISSION ACTIVE]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 18.5 Color-Meaning Standard (Consistent Across ALL Games)

```typescript
const physicsColors = {
  // === CHARGES ===
  positiveCharge: '#ef4444',    // red - ALWAYS red for positive
  negativeCharge: '#3b82f6',    // blue - ALWAYS blue for negative
  neutralObject: '#6b7280',     // gray - neutral/uncharged

  // === FORCES & VECTORS ===
  forceVector: '#f59e0b',       // amber - force arrows
  velocityVector: '#10b981',    // green - velocity arrows
  accelerationVector: '#8b5cf6', // purple - acceleration arrows
  momentumVector: '#ec4899',    // pink - momentum arrows

  // === STATES ===
  active: '#22c55e',            // green - threshold met, working
  inactive: '#64748b',          // gray - below threshold, off
  transitioning: '#f59e0b',     // amber - approaching threshold
  warning: '#ef4444',           // red - danger, observer on

  // === PHYSICS-SPECIFIC ===
  waveConstructive: '#22c55e',  // green - constructive interference
  waveDestructive: '#ef4444',   // red - destructive interference
  electricField: '#f59e0b',     // amber - E-field lines
  magneticField: '#8b5cf6',     // purple - B-field lines

  // === LIGHT SPECTRUM (accurate to physics) ===
  getWavelengthColor: (nm: number): string => {
    if (nm < 380) return '#7c3aed';      // UV - violet
    if (nm < 450) return '#6366f1';      // violet
    if (nm < 495) return '#3b82f6';      // blue
    if (nm < 570) return '#22c55e';      // green
    if (nm < 590) return '#eab308';      // yellow
    if (nm < 620) return '#f97316';      // orange
    if (nm < 750) return '#ef4444';      // red
    return '#7f1d1d';                     // IR - dark red
  }
};
```

### 18.6 The "What Am I Seeing?" Overlay Pattern

For complex simulations, include an optional overlay that explains what's visible:

```typescript
// Toggle-able explanation overlay
{showExplanation && (
  <g className="explanation-overlay">
    {/* Arrow pointing to phenomenon */}
    <line x1={100} y1={50} x2={150} y2={100} stroke="#fff" strokeWidth="2" markerEnd="url(#arrow)"/>

    {/* Explanation box */}
    <rect x={20} y={20} width={180} height={60} rx={8} fill="rgba(0,0,0,0.8)"/>
    <text x={30} y={45} fill="#fff" fontSize="12">
      These bands form because waves
    </text>
    <text x={30} y={62} fill="#fff" fontSize="12">
      from both slits interfere
    </text>
  </g>
)}
```

### 18.7 Before/After Comparison Pattern

When demonstrating a change, show both states:

```
┌────────────────────────┐    ┌────────────────────────┐
│   OBSERVER OFF         │    │   OBSERVER ON          │
│                        │    │                        │
│   ▓░▓░▓░▓░▓░▓░▓░▓     │    │      ▓▓    ▓▓         │
│   Wave Pattern         │    │    Two Bands          │
│                        │    │                        │
│   Electrons go         │    │   Electrons go        │
│   through BOTH slits   │    │   through ONE slit    │
└────────────────────────┘    └────────────────────────┘
         ↑                              ↑
    "Superposition"              "Wave Collapse"
```

---

## 19. BUTTON RELIABILITY (ZERO TOLERANCE)

### 19.1 The Single-Click Guarantee

**EVERY button in EVERY game MUST work on the FIRST click, EVERY time.**

There is ZERO tolerance for:
- Buttons requiring multiple clicks
- Buttons that don't respond on mobile
- Buttons blocked by overlays
- Buttons with delayed response

### 19.2 Required Button Implementation

**CRITICAL: Use this EXACT pattern for ALL interactive buttons:**

```typescript
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAction();
  }}
  style={{
    // === TOUCH TARGET ===
    minHeight: '48px',           // Minimum touch target
    minWidth: '48px',            // Minimum touch target
    padding: '14px 24px',        // Comfortable padding

    // === PREVENT MOBILE ISSUES ===
    touchAction: 'manipulation', // Prevents 300ms delay on mobile
    WebkitTapHighlightColor: 'transparent', // No tap highlight flash
    WebkitTouchCallout: 'none',  // Prevents callout on long-press

    // === PREVENT ACCIDENTAL TEXT SELECTION ===
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',

    // === VISUAL FEEDBACK ===
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.1s',

    // === ENSURE CLICKABLE ===
    position: 'relative',        // Establish stacking context
    zIndex: 1,                   // Above any background elements
  }}
  // Active state feedback
  onMouseDown={(e) => {
    (e.target as HTMLElement).style.transform = 'scale(0.98)';
  }}
  onMouseUp={(e) => {
    (e.target as HTMLElement).style.transform = 'scale(1)';
  }}
  onMouseLeave={(e) => {
    (e.target as HTMLElement).style.transform = 'scale(1)';
  }}
>
  Button Text
</button>
```

### 19.3 Selection Buttons (Predictions, Answers, Options)

For buttons where user selects one option:

```typescript
const handleSelect = useCallback((id: string) => {
  // CRITICAL: Early return if already selected - prevents re-processing
  if (selected === id) return;

  playSound('click');
  setSelected(id);
  emitGameEvent('selection_made', { selected: id });
}, [selected, playSound, emitGameEvent]);

// In render:
<button
  onClick={() => handleSelect(option.id)}
  style={{
    ...baseButtonStyles,
    // Visual feedback for selected state
    background: selected === option.id ? colors.successBg : colors.bgSurface,
    border: `2px solid ${selected === option.id ? colors.success : 'transparent'}`,
  }}
>
  {option.label}
  {selected === option.id && <span>✓</span>}
</button>
```

### 19.4 Navigation Buttons

```typescript
// Debounced navigation to prevent double-transitions
const isNavigating = useRef(false);
const lastClickRef = useRef(0);

const goToPhase = useCallback((targetPhase: Phase) => {
  const now = Date.now();

  // Debounce: ignore clicks within 300ms
  if (now - lastClickRef.current < 300) return;

  // Prevent concurrent navigation
  if (isNavigating.current) return;

  lastClickRef.current = now;
  isNavigating.current = true;

  // Perform navigation
  playSound('transition');
  setPhase(targetPhase);
  emitGameEvent('phase_changed', { phase: targetPhase });

  // Reset navigation lock after animation
  setTimeout(() => {
    isNavigating.current = false;
  }, 400);
}, [playSound, emitGameEvent]);
```

### 19.5 Button Reliability Checklist

**Before shipping, test EVERY button:**

- [ ] **Desktop mouse** - Single click works
- [ ] **Desktop trackpad** - Single tap works
- [ ] **Mobile touch** - Single tap works (test on REAL device)
- [ ] **Rapid clicks** - Doesn't break or double-fire
- [ ] **During animation** - Still responsive
- [ ] **After scroll** - Still responsive
- [ ] **With keyboard** - Enter/Space works when focused

### 19.6 Common Button Bugs and Fixes

| Bug | Cause | Fix |
|-----|-------|-----|
| Requires 2 clicks | Using onMouseDown + onTouchEnd | Use onClick only |
| 300ms delay on mobile | Missing touchAction | Add `touchAction: 'manipulation'` |
| Tap causes highlight flash | iOS default behavior | Add `WebkitTapHighlightColor: 'transparent'` |
| Click blocked by overlay | Decorative element above button | Add `pointerEvents: 'none'` to overlay |
| Double navigation | No debounce | Add isNavigating ref with timeout |
| Text selection on rapid click | Browser default | Add `userSelect: 'none'` |

### 19.7 Disabled Button States

Disabled buttons must be OBVIOUSLY disabled:

```typescript
<button
  onClick={handleAction}
  disabled={!canProceed}
  style={{
    ...baseStyles,
    // Clear visual distinction
    opacity: canProceed ? 1 : 0.4,
    cursor: canProceed ? 'pointer' : 'not-allowed',
    // Prevent any interaction
    pointerEvents: canProceed ? 'auto' : 'none',
  }}
>
  {canProceed ? 'Continue →' : 'Complete above first'}
</button>
```

---

## 20. PREMIUM DESIGN STANDARDS (Apple/Airbnb Level)

### 20.1 The 60-Second Quality Test

A new user should be able to:

| Time | User Should... |
|------|----------------|
| < 5 sec | Know what topic this game covers |
| < 10 sec | Understand what they'll learn |
| < 15 sec | Find and click "Begin" |
| < 30 sec | Successfully interact with simulation |
| < 60 sec | Discover a physics relationship through manipulation |

### 20.2 Visual Hierarchy

```
HOOK PAGE HIERARCHY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ┌─────────────┐
  │ ● CATEGORY  │  ← Small colored pill (least prominent)
  └─────────────┘

  THE IMPOSSIBLE     ← Hero title (MOST prominent)
  BALANCE               Gradient text, largest font

  How does a fork     ← Subtitle question
  balance on a glass?    Medium size, secondary color

  ┌─────────────────┐
  │                 │  ← Animated visualization
  │  [SIMULATION]   │     Second most prominent
  │                 │     Draws attention
  └─────────────────┘

  "Quote about        ← Quote (subtle)
   physics concept"      Italic, muted color

  ┌─────────────────┐
  │ Begin Experiment│  ← Primary CTA (prominent)
  └─────────────────┘     Gradient, large

  ⏱ 5 min • 🧪 Lab   ← Feature pills (least prominent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


PLAY PAGE HIERARCHY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step 3 • Experiment  ← Section label (small)

  Explore the Force    ← Section heading (medium)

  ┌─────────────────────────────────┐
  │                                 │
  │                                 │
  │      [SIMULATION - 70%]         │  ← MOST PROMINENT
  │      Continuously animated      │     Takes majority of screen
  │                                 │
  │                                 │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │  Charge: ═══●═══════  +5 μC    │  ← Controls (clear, usable)
  │  Distance: ══════●══   20 cm   │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │ 💡 Notice: Force quadruples    │  ← Insight hint (appears when
  │    when distance halves!       │     user discovers something)
  └─────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 20.3 Animation Timing Standards

| Animation Type | Duration | Easing | Purpose |
|----------------|----------|--------|---------|
| Button hover | 150ms | ease-out | Immediate feedback |
| Button press | 100ms | ease-in | Tactile feel |
| Slider track fill | 0ms | none | Instant response |
| Phase transition | 300ms | ease-in-out | Smooth navigation |
| Simulation physics | 16ms | linear | 60fps rendering |
| Milestone popup | 400ms | spring | Celebration |
| Error shake | 300ms | ease-out | Attention |

### 20.4 Spacing System (4px Grid)

```typescript
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',

  // Semantic
  pagePadding: { mobile: '16px', desktop: '24px' },
  cardPadding: { mobile: '16px', desktop: '20px' },
  sectionGap: { mobile: '24px', desktop: '32px' },
  elementGap: { mobile: '12px', desktop: '16px' },

  // Touch targets
  minTouchTarget: '48px',
  buttonPadding: '14px 24px',
};
```

---

## 21. PRE-FLIGHT CHECKLIST (Required Before Merge)

**NO GAME may be merged without passing ALL checks:**

### 21.1 Realism Check

- [ ] Simulation runs CONTINUOUSLY (not just on interaction)
- [ ] Materials look realistic (proper gradients, shadows, depth)
- [ ] Physics is accurate (colors match wavelengths, forces scale correctly)
- [ ] Animation is smooth (60fps, no jank)
- [ ] A physics teacher would use this in their classroom

### 21.2 Interactivity Check

- [ ] EVERY slider updates simulation in real-time (< 16ms)
- [ ] User can discover the physics relationship by experimenting
- [ ] No "apply" or "run" buttons - changes are instant
- [ ] Slider has: label, value display, units, min/max labels
- [ ] Moving slider causes VISIBLE change in simulation

### 21.3 Clarity Check (The Four Questions)

- [ ] **WHAT** is shown: All components labeled in the graphic
- [ ] **WHAT TO LOOK FOR**: Key areas highlighted/animated
- [ ] **WHAT YOU SEE**: Physics phenomenon clearly visible
- [ ] **WHY**: Cause-effect relationship visually obvious
- [ ] Passes the "Mute Test" - understandable without text

### 21.4 Button Reliability Check

- [ ] EVERY button works on FIRST click
- [ ] Tested on real mobile device (not just simulator)
- [ ] No double-click required anywhere
- [ ] No UI flashing or jumping when clicking
- [ ] Disabled buttons clearly look disabled
- [ ] Touch targets are minimum 48px
- [ ] Has `touchAction: 'manipulation'`
- [ ] Has `WebkitTapHighlightColor: 'transparent'`
- [ ] Has `userSelect: 'none'`

### 21.5 Design Check

- [ ] Hook page looks premium (Apple/Airbnb quality)
- [ ] Colors have proper contrast ratios
- [ ] Typography follows the scale system
- [ ] Spacing is consistent (4px grid)
- [ ] Visual hierarchy is clear

### 21.6 Flow Check

- [ ] All 10 phases implemented and accessible
- [ ] Transfer apps unlock sequentially (1 → 2 → 3 → 4)
- [ ] Test is LOCKED until all 4 transfer apps complete
- [ ] Test state resets when entering test phase
- [ ] Mastery shows correct pass/fail (70% threshold)
- [ ] Return to Dashboard works correctly

### 21.7 AI Coach Check

- [ ] `game_started` emitted on mount
- [ ] `phase_changed` emitted on every transition
- [ ] `prediction_made` emitted when user predicts
- [ ] `app_changed` includes app-specific screenDescription and coachMessage
- [ ] `game_completed` emitted with score and pass/fail

---

## 22. FINAL QUALITY CHECKLIST

Before marking any game as complete:

### A. Simulation Quality
- [ ] Animation runs CONTINUOUSLY (not static until interaction)
- [ ] Sliders update simulation in real-time (< 16ms response)
- [ ] Materials look realistic (gradients, shadows, depth)
- [ ] Physics is accurate (correct colors, proportions, equations)
- [ ] 60fps smooth animation (no jank or stuttering)

### B. Visual Clarity (The Four Questions)
- [ ] **WHAT IS IN THE GRAPHIC** - Every component is labeled IN the SVG
- [ ] **WHAT TO LOOK FOR** - Key areas are highlighted or animated
- [ ] **WHAT YOU SEE** - The physics phenomenon is clearly visible
- [ ] **WHY YOU SEE IT** - Cause-effect relationship is visually obvious
- [ ] Passes the "Mute Test" - understandable without any text

### C. Button Reliability (ZERO TOLERANCE)
- [ ] EVERY button works on FIRST click - no exceptions
- [ ] Tested on REAL mobile device (not simulator)
- [ ] Has `touchAction: 'manipulation'` on all buttons
- [ ] Has `WebkitTapHighlightColor: 'transparent'` on all buttons
- [ ] Has `userSelect: 'none'` on all buttons
- [ ] Minimum 48px touch targets
- [ ] No overlays blocking button clicks
- [ ] Disabled states are clearly visible

### D. Slider Implementation
- [ ] Uses BOTH `onInput` AND `onChange` handlers
- [ ] Shows current value with units (nm, μC, N, etc.)
- [ ] Has min/max labels at track ends
- [ ] Track fill shows visual progress
- [ ] Moving slider causes IMMEDIATE visible change in simulation

### E. Design Quality
- [ ] Hook page looks premium (Apple/Airbnb quality)
- [ ] Colors have proper contrast ratios (4.5:1 minimum)
- [ ] Typography follows the scale system
- [ ] Spacing is consistent (4px grid)
- [ ] Visual hierarchy guides the eye correctly

### F. Content Quality
- [ ] Hook has compelling title, subtitle, animated preview
- [ ] Predictions have 3 clear, distinct options
- [ ] Play phase teaches through manipulation, not reading
- [ ] Review CONFIRMS what user discovered (not explains from scratch)
- [ ] 4 transfer apps with real-world relevance
- [ ] 10 test questions with explanations

### G. Progressive Flow
- [ ] Transfer apps unlock sequentially (1 → 2 → 3 → 4)
- [ ] Test is LOCKED until ALL 4 transfer apps complete
- [ ] Test state resets when entering test phase
- [ ] Mastery shows different UI for pass (≥70%) vs fail
- [ ] Return to Dashboard button works correctly
- [ ] AI coach receives app-specific content on tab changes

---

## 23. QUICK REFERENCE: The Non-Negotiables

**If a game fails ANY of these, it cannot ship:**

| # | Requirement | Test |
|---|-------------|------|
| 1 | Buttons work on first click | Test every button on real mobile device |
| 2 | Simulation animates continuously | Watch it - does it move without interaction? |
| 3 | Sliders respond instantly | Drag slider - does visual change immediately? |
| 4 | Graphics are self-explanatory | Remove all text - can you understand it? |
| 5 | Components are labeled in SVG | Are labels part of the graphic, not outside it? |
| 6 | Test is locked until transfer complete | Try to access test early - is it blocked? |
| 7 | Pass/fail shows correctly | Get 60% and 80% - do you see different screens? |

---

## 24. COMMON MISTAKES TO AVOID

| Mistake | Why It's Bad | How to Fix |
|---------|--------------|------------|
| Static diagram that updates on click | User reads, doesn't discover | Animate continuously |
| Text block explaining the simulation | Passive learning | Let visual teach |
| Using `onMouseDown`/`onTouchEnd` | Causes multi-click issues | Use `onClick` only |
| Slider without `onInput` handler | Jerky, delayed updates | Add both `onInput` + `onChange` |
| Labels outside the graphic | User has to match text to visual | Label components IN the SVG |
| 300ms button delay on mobile | Feels broken | Add `touchAction: 'manipulation'` |
| "Apply" button for simulation changes | Breaks discovery flow | Update simulation instantly |
| Subtle visual changes | User misses the physics | Make changes OBVIOUS |
| Generic AI coach messages on tab change | Coach talks about wrong app | Override screenDescription/coachMessage |
| Test accessible before transfer complete | User skips learning content | Lock test until all 4 apps done |

---

## 25. AI VOICE COACH SYNCHRONIZATION

### 25.1 The Core Problem

When users progress quickly through screens, the AI voice must NOT:
- Talk about a screen the user has already left
- Queue up outdated messages
- Interrupt with stale information
- Feel "laggy" or disconnected from what's on screen

**The AI voice must feel like it's watching the SAME screen as the user, in real-time.**

### 25.2 The Dwell-Time Pattern

**Only speak when the user has "settled" on a screen.**

```typescript
// Track when user entered current phase
const phaseEnteredAt = useRef<number>(Date.now());
const speechTimeoutRef = useRef<NodeJS.Timeout>();

// When phase changes
const handlePhaseChange = (newPhase: Phase) => {
  // Cancel any pending speech from previous phase
  if (speechTimeoutRef.current) {
    clearTimeout(speechTimeoutRef.current);
  }
  cancelCurrentSpeech(); // Stop any in-progress audio

  // Record when we entered this phase
  phaseEnteredAt.current = Date.now();

  // Wait for user to "settle" before speaking (2 seconds)
  speechTimeoutRef.current = setTimeout(() => {
    // Only speak if still on the same phase
    if (currentPhase === newPhase) {
      speakPhaseIntroduction(newPhase);
    }
  }, 2000); // 2 second dwell time
};
```

**Dwell Time Guidelines:**

| Scenario | Dwell Time | Rationale |
|----------|------------|-----------|
| Phase introduction | 2 seconds | User needs time to see the screen |
| Slider hint | 3 seconds of inactivity | User hasn't interacted yet |
| Milestone celebration | 0 seconds (immediate) | Reward is time-sensitive |
| Error/struggle help | 5 seconds | Give user chance to self-correct |
| Transfer app intro | 2 seconds | New content to absorb |

### 25.3 Speech Queue Management

**Every new screen CLEARS the speech queue and stops current speech.**

```typescript
interface SpeechManager {
  queue: SpeechItem[];
  currentSpeech: SpeechSynthesisUtterance | null;
  currentPhase: string;

  // Called on ANY phase/screen change
  handleScreenChange(newPhase: string, newScreen: string): void;

  // Add speech to queue (only if still relevant)
  queueSpeech(item: SpeechItem): void;

  // Check if speech is still relevant before playing
  validateAndSpeak(): void;
}

const speechManager: SpeechManager = {
  queue: [],
  currentSpeech: null,
  currentPhase: '',

  handleScreenChange(newPhase, newScreen) {
    // CRITICAL: Clear everything from previous context
    this.queue = [];

    // Stop any in-progress speech immediately
    if (this.currentSpeech) {
      window.speechSynthesis.cancel();
      this.currentSpeech = null;
    }

    this.currentPhase = newPhase;
  },

  queueSpeech(item) {
    // Tag every speech item with its intended phase
    item.forPhase = this.currentPhase;
    this.queue.push(item);
  },

  validateAndSpeak() {
    const item = this.queue[0];
    if (!item) return;

    // CRITICAL: Check if speech is still relevant
    if (item.forPhase !== this.currentPhase) {
      // User has moved on - discard this speech
      this.queue.shift();
      this.validateAndSpeak(); // Try next item
      return;
    }

    // Speech is relevant - play it
    this.speak(item);
  }
};
```

### 25.4 Rapid Progression Detection

**Detect when user is "browsing" vs "learning" and adjust AI behavior.**

```typescript
interface ProgressionTracker {
  phaseHistory: { phase: string; timestamp: number }[];

  recordPhaseEntry(phase: string): void;
  isRapidProgression(): boolean;
  getAveragePhaseTime(): number;
}

const progressionTracker: ProgressionTracker = {
  phaseHistory: [],

  recordPhaseEntry(phase) {
    this.phaseHistory.push({ phase, timestamp: Date.now() });

    // Keep only last 5 transitions
    if (this.phaseHistory.length > 5) {
      this.phaseHistory.shift();
    }
  },

  isRapidProgression() {
    if (this.phaseHistory.length < 2) return false;

    // Check if last 3 transitions were all under 3 seconds
    const recent = this.phaseHistory.slice(-3);
    for (let i = 1; i < recent.length; i++) {
      const timeDiff = recent[i].timestamp - recent[i-1].timestamp;
      if (timeDiff > 3000) return false; // More than 3 seconds = not rapid
    }
    return true;
  },

  getAveragePhaseTime() {
    if (this.phaseHistory.length < 2) return Infinity;

    let total = 0;
    for (let i = 1; i < this.phaseHistory.length; i++) {
      total += this.phaseHistory[i].timestamp - this.phaseHistory[i-1].timestamp;
    }
    return total / (this.phaseHistory.length - 1);
  }
};

// AI Voice Decision Logic
const shouldAISpeak = (context: SpeechContext): boolean => {
  // If user is rapidly clicking through, stay quiet
  if (progressionTracker.isRapidProgression()) {
    return false;
  }

  // If average time per phase is under 5 seconds, reduce speech
  if (progressionTracker.getAveragePhaseTime() < 5000) {
    // Only speak for major milestones, not introductions
    return context.priority === 'high';
  }

  return true;
};
```

### 25.5 Speech Priority Levels

**Not all speech is equal. Prioritize what matters.**

```typescript
type SpeechPriority = 'critical' | 'high' | 'medium' | 'low';

interface SpeechItem {
  text: string;
  priority: SpeechPriority;
  forPhase: string;
  maxAge: number; // milliseconds before this speech becomes stale
}

const speechPriorities: Record<string, SpeechPriority> = {
  // CRITICAL - Always play (unless screen changes)
  'correct_answer': 'critical',
  'wrong_answer': 'critical',
  'test_complete': 'critical',
  'mastery_achieved': 'critical',

  // HIGH - Play unless rapid progression
  'milestone_reached': 'high',
  'discovery_made': 'high',
  'hint_after_struggle': 'high',

  // MEDIUM - Play only if user is taking their time
  'phase_introduction': 'medium',
  'app_introduction': 'medium',

  // LOW - Only play if specifically requested or very long dwell
  'detailed_explanation': 'low',
  'fun_fact': 'low',
  'encouragement': 'low',
};
```

### 25.6 Context-Aware Message Selection

**AI should have SHORT and LONG versions of every message.**

```typescript
const phaseMessages = {
  play: {
    short: "Try the sliders!", // 2 seconds
    medium: "Adjust the sliders to see how force changes.", // 4 seconds
    long: "Welcome to the experiment phase. Use the sliders on the right to adjust the charge and distance. Watch how the force changes in real-time as you explore.", // 10 seconds
  },
  twist_play: {
    short: "Toggle the observer!", // 2 seconds
    medium: "Turn the observer on and off to see the difference.", // 4 seconds
    long: "Now for the twist! Toggle the observer button to see how measurement affects the outcome. This is one of the strangest results in all of physics.", // 12 seconds
  }
};

// Select message length based on user behavior
const selectMessageLength = (): 'short' | 'medium' | 'long' => {
  const avgTime = progressionTracker.getAveragePhaseTime();

  if (avgTime < 5000) return 'short';      // Speed reader
  if (avgTime < 15000) return 'medium';    // Normal pace
  return 'long';                            // Taking time to learn
};
```

### 25.7 Real-Time Screen State Sync

**The AI must receive screen state updates, not just phase changes.**

```typescript
interface ScreenState {
  phase: string;
  subScreen?: string;          // e.g., which transfer app
  interactionState: {
    sliderValues: Record<string, number>;
    selectedPrediction: string | null;
    currentQuestion: number;
    hasInteracted: boolean;
  };
  timestamp: number;
}

// Emit on EVERY meaningful change
const emitScreenState = (state: Partial<ScreenState>) => {
  const fullState: ScreenState = {
    phase: currentPhase,
    subScreen: activeApp ? `app_${activeApp}` : undefined,
    interactionState: {
      sliderValues: { charge1, charge2, distance },
      selectedPrediction: prediction,
      currentQuestion,
      hasInteracted,
    },
    timestamp: Date.now(),
    ...state
  };

  // Send to AI voice system
  window.dispatchEvent(new CustomEvent('screenStateUpdate', {
    detail: fullState
  }));
};

// Call this on:
// - Phase changes
// - Transfer app tab changes
// - Slider movements (debounced)
// - Prediction selections
// - Question navigation
```

### 25.8 The "What's On Screen Now" Protocol

**AI should be able to answer: "What is the user looking at RIGHT NOW?"**

```typescript
const getCurrentScreenDescription = (): string => {
  const base = screenDescriptions[phase];

  // Add specific context
  switch (phase) {
    case 'transfer':
      const app = transferApps[activeApp];
      return `Transfer phase, viewing "${app.title}" - ${app.tagline}. ` +
             `Progress: ${completedApps.filter(Boolean).length}/4 apps completed.`;

    case 'play':
      return `Experiment phase. Current values: ` +
             `Charge 1 = ${charge1}μC, Distance = ${distance}cm. ` +
             `Force = ${calculateForce()}N. ` +
             `User has ${hasInteracted ? 'interacted' : 'not yet interacted'}.`;

    case 'test':
      return `Test phase, question ${currentQuestion + 1}/10. ` +
             `Current score: ${testScore}/${currentQuestion}. ` +
             `User has ${testAnswers[currentQuestion] !== null ? 'answered' : 'not answered'} this question.`;

    default:
      return base;
  }
};
```

### 25.9 Interruption Hierarchy

**When should new information interrupt current speech?**

```
ALWAYS INTERRUPT for:
├── Screen/phase changed (user navigated away)
├── User asked a question
├── Critical error occurred
└── User clicked "skip" or "stop talking"

INTERRUPT if higher priority:
├── Correct answer celebration interrupts explanation
├── Discovery milestone interrupts generic encouragement
└── Struggle detection interrupts scheduled hint

NEVER INTERRUPT for:
├── Lower priority messages
├── Same-priority messages (queue instead)
└── Messages for a different screen
```

### 25.10 Implementation Checklist for AI Voice Sync

- [ ] **Speech cancelled on screen change** - Any in-progress speech stops immediately
- [ ] **Queue cleared on navigation** - Pending messages discarded when user moves
- [ ] **Dwell time respected** - AI waits 2+ seconds before speaking on new screen
- [ ] **Rapid progression detected** - AI stays quiet when user is clicking through
- [ ] **Message length adapts** - Short messages for fast users, long for slow
- [ ] **Priority system implemented** - Critical messages always play, low-priority may skip
- [ ] **Screen state always current** - AI can describe exactly what's on screen NOW
- [ ] **Transfer app context sent** - AI knows which specific app user is viewing

### 25.11 Event Flow Example

```
USER ACTION                    AI VOICE BEHAVIOR
─────────────────────────────────────────────────────────────
Enters "play" phase         → Start 2-second dwell timer
                            → Clear any previous speech

User waits 2 seconds        → Timer fires
                            → Check: still on "play"? Yes
                            → Speak: "Try the sliders!"

User immediately moves      → CANCEL current speech mid-word
slider                      → Don't queue anything new yet

User pauses on slider       → After 3 sec inactivity:
                            → "Notice how force increases
                               when charges get closer?"

User clicks "Next" rapidly  → CANCEL speech
3 times in 2 seconds        → Detect rapid progression
                            → AI goes SILENT (watching mode)

User stays on "review"      → After 3 seconds: still silent
for 5 seconds               → After 5 seconds: rapid mode ends
                            → "This is the key insight..."

User gets question wrong    → IMMEDIATE (critical priority)
                            → "Not quite. The correct answer..."
                            → (No dwell time for feedback)
```

### 25.12 Testing AI Voice Sync

**Test these scenarios before shipping:**

| Test | Expected Behavior |
|------|-------------------|
| Click through 5 phases in 3 seconds | AI stays completely silent |
| Stay on play phase for 10 seconds | AI speaks introduction |
| Navigate away mid-sentence | Speech stops immediately |
| Switch transfer app tabs rapidly | AI only speaks about final tab |
| Return to earlier phase | AI speaks about THAT phase, not the one you left |
| Get question wrong | Immediate feedback, no delay |
| Idle on experiment for 30 seconds | AI offers help/hint |

### 25.13 Implementation: useAIVoiceSync Hook

**A ready-to-use hook is provided at `hooks/useAIVoiceSync.ts`**

```typescript
import {
  useAIVoiceSync,
  useDwellSpeech,
  useStruggleDetection,
  COMMON_MESSAGES,
} from '@/hooks/useAIVoiceSync';

// In your game renderer:
const voiceSync = useAIVoiceSync('coulombs_law', "Coulomb's Law");

// Update screen state on every change
useEffect(() => {
  voiceSync.updateScreenState({
    phase,
    phaseLabel: phaseLabels[phase],
    description: `Experiment phase with charge ${charge}μC`,
    interactionState: { hasInteracted, sliderValues: { charge } },
  });
}, [phase, charge, hasInteracted]);

// Auto-speak introductions after dwell time
useDwellSpeech(voiceSync, {
  phase: 'play',
  messages: COMMON_MESSAGES.experiment.intro,
});

// Detect struggling and offer help
useStruggleDetection(voiceSync, hasInteracted, {
  phase: 'play',
  helpMessage: "Try adjusting the sliders!",
});

// Queue important speech
voiceSync.queueSpeech("Correct!", 'critical');
```

**Hook Features:**
- ✅ Automatic speech cancellation on navigation
- ✅ Rapid progression detection (goes silent)
- ✅ Dwell time enforcement (waits before speaking)
- ✅ Priority-based speech queue
- ✅ Message length adaptation
- ✅ Screen state validation (won't speak about old screens)

**See full example:** `hooks/useAIVoiceSync.example.tsx`
