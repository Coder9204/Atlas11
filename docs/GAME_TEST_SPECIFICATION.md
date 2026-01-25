# Game Test Specification

Based on the **Wave Particle Duality** game implementation, this document provides the definitive specification for all interactive physics games in Project Atlas.

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

**Custom Footer for Transfer:**
- Back button (← to twist_review)
- **"Take Test →" button ONLY when `allComplete === true`**
- When not all complete: show disabled "Complete all 4 apps first"
- **WRONG:** Showing "Take Test" on first application
- **CORRECT:** User must complete all 4 apps before seeing "Take Test"

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
