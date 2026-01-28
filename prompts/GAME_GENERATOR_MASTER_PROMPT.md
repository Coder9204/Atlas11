# Interactive Educational Game Generator - Master Prompt v2.0

## Overview
Generate premium interactive educational games with Apple/Airbnb-quality design, reliable button handling, 4 real-world applications, 10-question tests, and full AI coach integration.

---

## CRITICAL REQUIREMENTS (Non-Negotiable)

### 1. PHASE STRUCTURE (Exactly 12 Phases)
```typescript
type GamePhase =
   'hook' |           // Introduction with compelling hook
   'predict' |        // User makes prediction
   'play' |           // Interactive simulation
   'review' |         // Understanding the concept
   'twist_predict' |  // New variable introduction
   'twist_play' |     // Explore the twist
   'twist_review' |   // Deep insight
   'app_1' |          // Real-world app 1 (rename appropriately)
   'app_2' |          // Real-world app 2
   'app_3' |          // Real-world app 3
   'app_4' |          // Real-world app 4
   'test' |           // 10-question knowledge test
   'mastery';         // Celebration/completion

const validPhases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'app_1', 'app_2', 'app_3', 'app_4', 'test', 'mastery'];
```

### 2. REQUIRED STATE VARIABLES
```typescript
// Phase management
const [phase, setPhase] = useState<GamePhase>(getInitialPhase);

// Click lock (CRITICAL for reliability)
const isProcessingRef = useRef(false);
const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const hasEmittedStartRef = useRef(false);

// Responsive design
const [isMobile, setIsMobile] = useState(false);

// User responses
const [prediction, setPrediction] = useState<string | null>(null);
const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
const [twistRevealed, setTwistRevealed] = useState(false);

// Test state
const [testIndex, setTestIndex] = useState(0);
const [testScore, setTestScore] = useState(0);
const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
const [showExplanation, setShowExplanation] = useState(false);

// Application state
const [appInteractiveValue, setAppInteractiveValue] = useState(50);

// Celebration
const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);
```

### 3. CLICK LOCK PATTERN (MANDATORY)
```typescript
// Processing lock to prevent rapid clicks - COPY EXACTLY
const handleButtonClick = (callback: () => void, lockDuration: number = 300) => (e: React.MouseEvent) => {
   e.preventDefault();
   e.stopPropagation();
   if (isProcessingRef.current) return;
   isProcessingRef.current = true;
   if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
   callback();
   processingTimeoutRef.current = setTimeout(() => {
      isProcessingRef.current = false;
   }, lockDuration);
};
```

### 4. GAME STARTED EMISSION (MANDATORY PATTERN)
```typescript
// Emit game_started on mount (ONLY ONCE)
useEffect(() => {
   if (hasEmittedStartRef.current) return;
   hasEmittedStartRef.current = true;
   emitGameEvent('game_started', {
      phase: 'hook',
      phaseLabel: phaseLabels['hook'],
      currentScreen: 1,
      totalScreens: validPhases.length,
      conceptName: 'Your Concept Name'
   });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

### 5. PREMIUM DARK THEME COLOR PALETTE (REQUIRED)
```typescript
// Dark theme matching Wave Particle Duality gold standard
const colors = {
   // Backgrounds
   bgDark: '#0f172a',           // slate-900 - primary dark background
   bgCard: '#1e293b',           // slate-800 - card backgrounds
   bgGradientStart: '#1e1b4b',  // indigo-950 - gradient start
   bgGradientEnd: '#0f172a',    // slate-900 - gradient end

   // Brand (customize primary per game theme)
   primary: '#6366f1',          // indigo-500 - main brand color
   primaryDark: '#4f46e5',      // indigo-600 - darker shade
   accent: '#8b5cf6',           // violet-500 - secondary accent

   // Semantic
   success: '#22c55e',          // green-500 - correct/complete
   warning: '#f59e0b',          // amber-500 - caution/info
   danger: '#ef4444',           // red-500 - incorrect/error

   // Text (dark theme)
   textPrimary: '#f8fafc',      // slate-50 - primary text (white)
   textSecondary: '#cbd5e1',    // slate-300 - secondary text
   textMuted: '#64748b',        // slate-500 - muted/disabled

   // Borders
   border: '#334155',           // slate-700
};
```

### 6. HELPER FUNCTIONS (NOT Components!)
```typescript
// IMPORTANT: These are FUNCTIONS that return JSX, NOT React components
// This avoids React reconciliation issues that cause button click problems

// Progress bar - NOT a component
const renderProgressBar = () => {
   const currentIdx = validPhases.indexOf(phase);
   return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, gap: isMobile ? '8px' : '16px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
            <div style={{ display: 'flex', gap: isMobile ? '3px' : '6px' }}>
               {validPhases.map((p, i) => (
                  <button key={p} type="button" onClick={handleButtonClick(() => { if (i < currentIdx) goToPhase(p); })} style={{
                     height: isMobile ? '8px' : '8px',
                     width: i === currentIdx ? (isMobile ? '16px' : '24px') : (isMobile ? '8px' : '8px'),
                     borderRadius: '5px',
                     backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                     cursor: i < currentIdx ? 'pointer' : 'default',
                     transition: 'all 0.3s',
                     border: 'none'
                  }} title={phaseLabels[p]} />
               ))}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: colors.textMuted }}>{currentIdx + 1}/{validPhases.length}</span>
         </div>
         <div style={{ padding: '4px 10px', borderRadius: '10px', background: `${colors.primary}20`, color: colors.primary, fontSize: '10px', fontWeight: 700 }}>{phaseLabels[phase]}</div>
      </div>
   );
};

// Bottom navigation bar - NOT a component
const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
   const currentIdx = validPhases.indexOf(phase);
   return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgCard }}>
         <button type="button" style={{ padding: '12px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', backgroundColor: colors.bgCardLight, color: colors.textSecondary, border: 'none', cursor: canGoBack && currentIdx > 0 ? 'pointer' : 'not-allowed', opacity: canGoBack && currentIdx > 0 ? 1 : 0.3, minHeight: '48px' }} onClick={handleButtonClick(() => { if (canGoBack && currentIdx > 0) goToPhase(validPhases[currentIdx - 1]); })}>← Back</button>
         <button type="button" style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', background: canGoNext ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight, color: colors.textPrimary, border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.3, boxShadow: canGoNext ? `0 4px 20px ${colors.primary}40` : 'none', minHeight: '48px' }} onClick={handleButtonClick(() => { if (!canGoNext) return; if (onNext) onNext(); else if (currentIdx < validPhases.length - 1) goToPhase(validPhases[currentIdx + 1]); })}>{nextLabel} →</button>
      </div>
   );
};
```

### 7. BUTTON REQUIREMENTS
- ALL buttons MUST have `type="button"` attribute
- ALL buttons MUST use `onClick={handleButtonClick(() => { ... })}` wrapper
- ALL buttons MUST have `minHeight: '48px'` for touch targets
- NEVER use `onClick` directly without the wrapper

### 8. TEST QUESTIONS SCHEMA (Exactly 10 - LOCAL VALIDATION)
```typescript
// CRITICAL: Use `correct: true` marker - NO Firebase dependency!
const testQuestions = [
   {
      scenario: "A real-world context setting up the question (1-2 sentences)",
      question: "The actual question being asked?",
      options: [
         { id: 'a', label: "First option text" },
         { id: 'b', label: "Second option text" },
         { id: 'c', label: "Third option text (correct)", correct: true }, // <-- REQUIRED
         { id: 'd', label: "Fourth option text" },
      ],
      explanation: "Why this answer is correct and what the learner should understand"
   },
   // ... 9 more questions with increasing difficulty
];

// LOCAL VALIDATION (no Firebase)
const checkAnswer = (qIndex: number, selectedId: string): boolean => {
   return testQuestions[qIndex].options.find(o => o.id === selectedId)?.correct === true;
};
```

### 9. REAL-WORLD APPLICATIONS SCHEMA (Exactly 4 - RICH TRANSFER PHASE)
```typescript
// CRITICAL: Apps unlock SEQUENTIALLY - user cannot skip ahead!
const realWorldApps = [
   {
      icon: '📷',                              // Single emoji
      title: 'Application Title',              // 2-4 words
      short: 'Brief summary',                  // 3-word compact descriptor
      tagline: 'Catchy Tagline',               // Compelling hook
      color: '#6366f1',                        // Unique color (primary/success/accent/warning)
      description: 'Detailed description of how the physics enables this technology (2-3 sentences).',
      connection: 'Explicit link: "The [concept] you explored demonstrates X. This app uses the same principle to..."',
      howItWorks: 'Step-by-step technical explanation in accessible language.',
      stats: [
         { value: '1B+', label: 'Metric label', icon: '⚡' },
         { value: '$50B', label: 'Market value', icon: '📈' },
         { value: '90%+', label: 'Efficiency', icon: '🎯' }
      ],
      examples: [
         'Industry: Specific example with description',
         'Healthcare: Specific example with description',
         'Research: Specific example with description',
         'Everyday: Specific example with description'
      ],
      companies: ['Company1', 'Company2', 'Company3', 'Company4', 'Company5'],
      futureImpact: 'One compelling sentence about future implications.'
   },
   // app_2 (success color), app_3 (accent color), app_4 (warning color)
];

// SEQUENTIAL UNLOCK STATE
const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
const isAppLocked = (i: number) => i > 0 && !completedApps[i - 1];
const isTestUnlocked = completedApps.every(c => c); // All 4 required
```

### 10. INTERACTIVE SVG VISUALIZATION TEMPLATE
Each application phase MUST have an interactive SVG visualization:
```typescript
const renderAppVisualization = (appKey: string) => {
   switch(appKey) {
      case 'app_1':
         return (
            <svg viewBox="0 0 400 250" style={{ width: '100%', maxHeight: '280px' }}>
               <defs>
                  {/* Gradients and filters */}
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                     <stop offset="100%" stopColor={colors.accent} stopOpacity="0.5" />
                  </linearGradient>
               </defs>
               <rect width="400" height="250" fill="#0a0a1a" />
               <text x="200" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="bold">TITLE</text>
               {/* Interactive elements that respond to appInteractiveValue slider */}
               {/* Use appInteractiveValue (0-100) to modify visual elements */}
            </svg>
         );
      // ... other cases
   }
};
```

---

## PHASE TEMPLATE PATTERNS

### HOOK Phase Pattern
```typescript
if (phase === 'hook') {
   return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}>
         {renderProgressBar()}
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '40px 24px', textAlign: 'center', overflow: 'auto' }}>
            {/* Icon circle */}
            <div style={{ width: isMobile ? '70px' : '90px', height: isMobile ? '70px' : '90px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? '20px' : '32px', boxShadow: `0 20px 60px ${colors.primary}30` }}>
               <span style={{ fontSize: isMobile ? '32px' : '42px' }}>🎯</span>
            </div>
            {/* Title */}
            <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: colors.textPrimary, marginBottom: isMobile ? '12px' : '16px', lineHeight: 1.2 }}>Concept Title</h1>
            {/* Subtitle with highlighted terms */}
            <p style={{ fontSize: isMobile ? '14px' : '18px', color: colors.textSecondary, marginBottom: isMobile ? '24px' : '32px', maxWidth: '480px', lineHeight: 1.6 }}>
               Hook question with <span style={{ color: colors.primary, fontWeight: 600 }}>key term</span> highlighted.
            </p>
            {/* Feature cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '8px' : '12px', width: '100%', maxWidth: '400px', marginBottom: isMobile ? '24px' : '40px' }}>
               {[{ icon: '🔬', text: 'Feature 1' }, { icon: '💡', text: 'Feature 2' }, { icon: '✨', text: 'Feature 3' }].map((item, i) => (
                  <div key={i} style={{ padding: isMobile ? '12px 8px' : '16px', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                     <div style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '6px' }}>{item.icon}</div>
                     <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 600, color: colors.textSecondary }}>{item.text}</div>
                  </div>
               ))}
            </div>
            {/* CTA Button */}
            <button type="button" style={{ width: '100%', maxWidth: '320px', padding: isMobile ? '16px 24px' : '18px 32px', fontSize: isMobile ? '15px' : '16px', fontWeight: 700, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}40`, minHeight: '52px' }} onClick={handleButtonClick(() => goToPhase('predict'))}>What Do You Think? →</button>
            {/* Duration note */}
            <p style={{ fontSize: isMobile ? '11px' : '12px', color: colors.textMuted, marginTop: isMobile ? '12px' : '16px' }}>~8 minutes • Interactive • Real-World Applications</p>
         </div>
      </div>
   );
}
```

### PREDICT Phase Pattern
```typescript
if (phase === 'predict') {
   const predictions = [
      { id: 'option1', label: 'Prediction Option 1', desc: 'Brief description', icon: '🎯' },
      { id: 'option2', label: 'Prediction Option 2', desc: 'Brief description', icon: '💡' },
      { id: 'option3', label: 'Prediction Option 3', desc: 'Brief description', icon: '🔬' }
   ];
   return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
         {renderProgressBar()}
         <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>Step 2 • Predict</p>
            <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 900, color: colors.textPrimary, marginBottom: '16px' }}>Make Your Prediction</h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '24px', maxWidth: '600px' }}>Context question that sets up the prediction.</p>
            <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
               {predictions.map(p => (
                  <button key={p.id} type="button" onClick={handleButtonClick(() => { setPrediction(p.id); playSound(500, 0.1); emitGameEvent('prediction_made', { prediction: p.label, phase: 'predict' }); })} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${prediction === p.id ? colors.primary : colors.border}`, backgroundColor: prediction === p.id ? `${colors.primary}15` : colors.bgCard, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <span style={{ fontSize: '28px' }}>{p.icon}</span>
                     <div>
                        <p style={{ fontWeight: 700, fontSize: '14px', color: prediction === p.id ? colors.primary : colors.textPrimary }}>{p.label}</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>{p.desc}</p>
                     </div>
                  </button>
               ))}
            </div>
         </div>
         {renderBottomBar(true, !!prediction, "Let's Find Out!")}
      </div>
   );
}
```

### TWIST Phase Pattern (with stable reveal)
```typescript
if (phase === 'twist_predict') {
   const handleTwistPrediction = (choice: string) => {
      setTwistPrediction(choice);
      playSound(500, 0.1);
      emitGameEvent('prediction_made', { prediction: choice, context: 'twist' });
      setTimeout(() => setTwistRevealed(true), 100); // Delayed reveal for stability
   };

   if (!twistPrediction) {
      return (
         <div style={{ /* prediction UI */ }}>
            {renderProgressBar()}
            {/* Prediction options */}
            {renderBottomBar(true, false, 'Select to Continue')}
         </div>
      );
   }

   // After prediction made - show reveal
   return (
      <div style={{ /* reveal UI */ }}>
         {renderProgressBar()}
         {/* Revealed content */}
         {renderBottomBar(true, twistRevealed, 'Continue')}
      </div>
   );
}
```

### TEST Phase Pattern
```typescript
if (phase === 'test') {
   const q = testQuestions[testIndex];
   const isLastQuestion = testIndex === testQuestions.length - 1;

   return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
         {renderProgressBar()}
         <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <p style={{ fontSize: '12px', fontWeight: 800, color: colors.primary }}>Question {testIndex + 1} of {testQuestions.length}</p>
               <p style={{ fontSize: '12px', fontWeight: 700, color: colors.success }}>Score: {testScore}/{testQuestions.length}</p>
            </div>

            {/* Scenario card */}
            <div style={{ padding: '14px', borderRadius: '12px', background: colors.bgCard, marginBottom: '16px' }}>
               <p style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '6px', fontWeight: 600 }}>SCENARIO</p>
               <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>{q.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.textPrimary, marginBottom: '16px' }}>{q.question}</h3>

            {/* Answer options */}
            <div style={{ display: 'grid', gap: '10px' }}>
               {q.options.map((opt, i) => (
                  <button key={i} type="button" onClick={handleButtonClick(() => {
                     if (selectedAnswer !== null) return;
                     setSelectedAnswer(i);
                     setShowExplanation(true);
                     if (i === q.correct) { setTestScore(s => s + 1); playSound(600, 0.2); }
                     else { playSound(200, 0.3); }
                     emitGameEvent('answer_submitted', { questionIndex: testIndex, answer: opt, isCorrect: i === q.correct });
                  })} style={{
                     padding: '14px',
                     borderRadius: '12px',
                     border: `2px solid ${selectedAnswer === null ? colors.border : i === q.correct ? colors.success : i === selectedAnswer ? colors.danger : colors.border}`,
                     background: selectedAnswer === null ? colors.bgCard : i === q.correct ? `${colors.success}15` : i === selectedAnswer ? `${colors.danger}15` : colors.bgCard,
                     textAlign: 'left',
                     cursor: selectedAnswer === null ? 'pointer' : 'default',
                     minHeight: '52px'
                  }}>
                     <p style={{ fontSize: '13px', color: selectedAnswer === null ? colors.textPrimary : i === q.correct ? colors.success : i === selectedAnswer ? colors.danger : colors.textSecondary }}>{opt}</p>
                  </button>
               ))}
            </div>

            {/* Explanation */}
            {showExplanation && (
               <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}40` }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: colors.primary, marginBottom: '6px' }}>Explanation</p>
                  <p style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>{q.explanation}</p>
               </div>
            )}
         </div>

         {/* Next button only shows after answering */}
         {showExplanation && (
            <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgCard }}>
               <button type="button" onClick={handleButtonClick(() => {
                  if (isLastQuestion) { goToPhase('mastery'); }
                  else { setTestIndex(i => i + 1); setSelectedAnswer(null); setShowExplanation(false); }
               })} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', minHeight: '52px' }}>
                  {isLastQuestion ? 'See Results →' : 'Next Question →'}
               </button>
            </div>
         )}
      </div>
   );
}
```

### MASTERY Phase Pattern
```typescript
if (phase === 'mastery') {
   return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: `linear-gradient(180deg, ${colors.bgDark} 0%, #0c0118 100%)`, position: 'relative', overflow: 'hidden' }}>
         {/* Confetti */}
         {confetti.map((c, i) => (
            <div key={i} style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, width: '10px', height: '10px', backgroundColor: c.color, borderRadius: '2px', animation: `confettiFall 3s ease-out ${c.delay}s infinite`, opacity: 0.8 }} />
         ))}
         {renderProgressBar()}
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            {/* Trophy icon */}
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: `0 20px 60px ${colors.primary}40` }}>
               <span style={{ fontSize: '48px' }}>🏆</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px' }}>You scored {testScore}/{testQuestions.length} on the test</p>
            {/* Achievement badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '400px', width: '100%', marginBottom: '24px' }}>
               {[{ icon: '🔬', label: 'Skill 1' }, { icon: '💡', label: 'Skill 2' }, { icon: '📷', label: 'Skill 3' }, { icon: '🌟', label: 'Skill 4' }].map((badge, i) => (
                  <div key={i} style={{ padding: '16px', borderRadius: '12px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '24px', marginBottom: '4px' }}>{badge.icon}</p>
                     <p style={{ fontSize: '11px', color: colors.textMuted }}>{badge.label}</p>
                  </div>
               ))}
            </div>
            <button type="button" onClick={handleButtonClick(() => emitGameEvent('game_completed', { score: testScore, maxScore: testQuestions.length }))} style={{ padding: '16px 32px', borderRadius: '12px', background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`, color: 'white', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', minHeight: '52px' }}>Complete Lesson ✓</button>
         </div>
      </div>
   );
}
```

---

## COMMON MISTAKES TO AVOID

1. **DON'T** use `onClick` directly - always use `handleButtonClick` wrapper
2. **DON'T** forget `type="button"` on buttons
3. **DON'T** create nested React components - use functions that return JSX
4. **DON'T** put `emitGameEvent` in useEffect dependency arrays - use empty `[]` with eslint-disable
5. **DON'T** use Tailwind classes - use inline styles for full control
6. **DON'T** forget `minHeight: '48px'` for touch targets
7. **DON'T** forget to add `hasEmittedStartRef` check before emitting game_started
8. **DON'T** use `useState` for refs like processing locks - use `useRef`
9. **DON'T** forget to call `playSound()` on button clicks for feedback
10. **DON'T** forget the delayed reveal pattern for twist phases (`setTimeout`)

---

## CHECKLIST BEFORE SUBMISSION

### Core Requirements
- [ ] 10 phases defined with proper type (hook through mastery)
- [ ] `handleButtonClick` wrapper implemented and used on ALL buttons
- [ ] `hasEmittedStartRef` used for game_started emission
- [ ] **Dark theme color palette** (bgDark: #0f172a, bgCard: #1e293b)
- [ ] `isMobile` responsive state implemented
- [ ] `renderProgressBar()` and `renderBottomBar()` as functions (NOT components)
- [ ] All buttons have `type="button"` and `minHeight: '48px'`
- [ ] `playSound()` called on user interactions

### Test Phase (LOCAL VALIDATION - NO FIREBASE)
- [ ] 10 test questions with scenario, question, options, explanation
- [ ] **`correct: true` marker on correct option** (not index-based)
- [ ] Local validation function (no Firebase calls)
- [ ] Immediate feedback after each answer

### Transfer Phase (RICH MODULES with SEQUENTIAL LOCK)
- [ ] 4 real-world applications with ALL 11 fields
- [ ] **SEQUENTIAL UNLOCK**: App N locked until App N-1 complete (🔒 icon)
- [ ] All 4 required before test phase unlocks
- [ ] Interactive SVG diagram for each application (100+ lines)
- [ ] Hero header, stats grid, examples, "Got It!" button per app

### Polish
- [ ] Confetti effect on mastery phase
- [ ] Phase labels object defined
- [ ] `goToPhase` function with event emission
- [ ] `twistRevealed` state for stable twist transitions
