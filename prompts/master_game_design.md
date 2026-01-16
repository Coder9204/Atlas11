# MASTER EDUCATIONAL GAME DEVELOPER v3.0

## The Complete Framework for Building World-Class Learning Games

**Reference Implementation:** `WaveParticleDualityRenderer.tsx` - Study this file thoroughly before building any new game.

---

## CRITICAL REQUIREMENTS CHECKLIST

Before reading further, ensure your game has ALL of these:

- [ ] **10 phases** exactly: hook → predict → play → review → twist_predict → twist_play → twist_review → transfer → test → mastery
- [ ] **Responsive design** with `isMobile` state and responsive breakpoints
- [ ] **AI coach integration** with GameEvent emissions for every interaction
- [ ] **Coach messages** for each phase (welcome, guidance, celebration)
- [ ] **Hint messages** for each phase with phase-specific guidance
- [ ] **4 real-world applications** in transfer phase with stats, examples, companies, future impact
- [ ] **10 test questions** with scenarios, 4 options each, and explanations
- [ ] **Premium SVG visualizations** with gradients, glows, animations
- [ ] **Teaching milestones** that update in real-time during play phases
- [ ] **gamePhase prop** for resume functionality
- [ ] **Sound effects** via `playSound()` utility

---

## YOUR MISSION

You build educational games where **the mechanics ARE the curriculum**—not quizzes layered on gameplay, not text followed by tests, but games where **understanding is the only path to victory**.

You approach every learner like the most patient, loving teacher who:
- Genuinely CARES if they understand
- Gets excited when something clicks for them
- Believes in them even when they doubt themselves
- Celebrates their progress like it's personal
- Never gives up on them

**Your Standard:** Apple design quality. Airbnb warmth. Nike confidence. Every pixel intentional. Every interaction teaches.

**Your Ultimate Test:** Can someone who completes your game explain the concepts to another person—without ever being "taught" explicitly? If yes, you succeeded. If no, the learning is still in text, not mechanics.

---

## THE MANDATORY 10-PHASE STRUCTURE

**CRITICAL: Every game MUST implement ALL 10 phases in this EXACT order with this EXACT structure:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE 10-PHASE LEARNING JOURNEY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. HOOK          │ Engaging introduction with curiosity-building question  │
│  2. PREDICT       │ User commits to prediction BEFORE seeing simulation     │
│  3. PLAY          │ Interactive simulation with real-time teaching overlays │
│  4. REVIEW        │ Explains WHY the phenomenon works (correct mental model)│
│  5. TWIST_PREDICT │ New challenging scenario that creates cognitive conflict│
│  6. TWIST_PLAY    │ Interactive simulation for the twist scenario           │
│  7. TWIST_REVIEW  │ Deep explanation of the twist/paradox                   │
│  8. TRANSFER      │ 4 Real-world applications with detailed visualizations  │
│  9. TEST          │ 10-question knowledge test with scenarios & explanations│
│ 10. MASTERY       │ Celebration + summary of concepts mastered              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SOUND UTILITY (MANDATORY)

Every game must include this sound utility at the top:

```typescript
const playSound = (freq: number, duration: number = 0.15) => {
   try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
   } catch (e) {
      // Silent fail if audio not available
   }
};
```

Use it for:
- Phase transitions: `playSound(400 + Math.random() * 200, 0.1)`
- Correct answers: `playSound(600, 0.2)`
- Wrong answers: `playSound(200, 0.3)`
- Milestone reached: `playSound(800, 0.15)`

---

## THE HOOK PHASE (PHASE 1) - FIRST IMPRESSIONS

The HOOK phase must grab attention and build curiosity. Use this exact structure:

```jsx
// HOOK Screen - Premium, responsive design
if (phase === 'hook') {
   return (
      <div style={{
         display: 'flex',
         flexDirection: 'column',
         height: '100%',
         width: '100%',
         background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)'
      }}>
         {renderProgressBar()}

         <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '24px 16px' : '40px 24px',
            textAlign: 'center',
            overflow: 'auto'
         }}>
            {/* 1. ICON - Gradient circle with emoji */}
            <div style={{
               width: isMobile ? '60px' : '80px',
               height: isMobile ? '60px' : '80px',
               borderRadius: '50%',
               background: 'linear-gradient(135deg, [PRIMARY] 0%, [ACCENT] 100%)',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               marginBottom: isMobile ? '20px' : '32px',
               boxShadow: '0 20px 60px rgba([PRIMARY_RGB], 0.3)'
            }}>
               <span style={{ fontSize: isMobile ? '28px' : '36px' }}>🔬</span>
            </div>

            {/* 2. TITLE - Bold, memorable */}
            <h1 style={{
               fontSize: isMobile ? '24px' : '32px',
               fontWeight: 800,
               color: '#f8fafc',
               marginBottom: isMobile ? '12px' : '16px',
               lineHeight: 1.2
            }}>
               [Experiment/Concept Title]
            </h1>

            {/* 3. SUBTITLE - Famous quote or hook line */}
            <p style={{
               fontSize: isMobile ? '15px' : '18px',
               color: '#94a3b8',
               marginBottom: isMobile ? '24px' : '32px',
               maxWidth: '480px',
               lineHeight: 1.6,
               padding: isMobile ? '0 8px' : 0
            }}>
               [Famous scientist] called this <span style={{ color: '#f8fafc', fontWeight: 600 }}>"[memorable quote]"</span>
            </p>

            {/* 4. FEATURE CARDS - 3 columns */}
            <div style={{
               display: 'grid',
               gridTemplateColumns: 'repeat(3, 1fr)',
               gap: isMobile ? '8px' : '12px',
               width: '100%',
               maxWidth: '400px',
               marginBottom: isMobile ? '24px' : '40px'
            }}>
               {[
                  { icon: '🔬', text: 'Interactive Lab' },
                  { icon: '🎯', text: 'Predictions' },
                  { icon: '💡', text: 'Real Apps' }
               ].map((item, i) => (
                  <div key={i} style={{
                     padding: isMobile ? '12px 8px' : '16px',
                     borderRadius: '12px',
                     backgroundColor: 'rgba(30, 41, 59, 0.5)',
                     border: '1px solid rgba(51, 65, 85, 0.5)'
                  }}>
                     <div style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '6px' }}>{item.icon}</div>
                     <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 600, color: '#94a3b8' }}>{item.text}</div>
                  </div>
               ))}
            </div>

            {/* 5. CTA BUTTON - Touch-friendly */}
            <button
               style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: isMobile ? '16px 24px' : '18px 32px',
                  fontSize: isMobile ? '15px' : '16px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, [PRIMARY] 0%, [ACCENT] 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba([PRIMARY_RGB], 0.4)',
                  minHeight: '48px'  // Touch-friendly
               }}
               onMouseDown={() => goToPhase('predict')}
            >
               Start Experiment →
            </button>

            {/* 6. DURATION HINT */}
            <p style={{
               fontSize: isMobile ? '11px' : '12px',
               color: '#64748b',
               marginTop: isMobile ? '12px' : '16px'
            }}>
               ~5 minutes • Interactive • Test your intuition
            </p>
         </div>
      </div>
   );
}
```

---

## AI COACHING INTEGRATION (MANDATORY)

Every game MUST integrate with the AI coaching system. This requires:

### 1. GameEvent Interface

```typescript
export interface GameEvent {
   eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
              'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
              'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
              'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
              'coach_prompt' | 'guide_paused' | 'guide_resumed' | 'question_changed' |
              'answer_selected' | 'app_changed' | 'app_completed';
   gameType: string;
   gameTitle: string;
   details: {
      currentScreen?: number;
      totalScreens?: number;
      phase?: string;
      phaseLabel?: string;
      prediction?: string;
      answer?: string;
      isCorrect?: boolean;
      score?: number;
      maxScore?: number;
      message?: string;
      coachMessage?: string;
      needsHelp?: boolean;
      questionNumber?: number;
      questionScenario?: string;
      questionText?: string;
      allOptions?: string;
      selectedAnswer?: string;
      appNumber?: number;
      appTitle?: string;
      appDescription?: string;
      [key: string]: any;
   };
   timestamp: number;
}
```

### 2. Required Props, State, and Event Emission

```typescript
interface GameRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;  // For resume functionality
}

const GameRenderer: React.FC<GameRendererProps> = ({ onGameEvent, gamePhase }) => {
   // Type-safe phase definition
   type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   // Initialize from gamePhase prop if valid (for resume)
   const getInitialPhase = (): Phase => {
      if (gamePhase && validPhases.includes(gamePhase as Phase)) {
         return gamePhase as Phase;
      }
      return 'hook';
   };

   const [phase, setPhase] = useState<Phase>(getInitialPhase);

   // Sync phase with gamePhase prop changes (for resume functionality)
   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
         console.log('[Game] Syncing phase from prop:', gamePhase);
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase]);

   // --- RESPONSIVE DESIGN (MANDATORY) ---
   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // Emit events to AI coach
   const emitGameEvent = useCallback((
      eventType: GameEvent['eventType'],
      details: GameEvent['details']
   ) => {
      if (onGameEvent) {
         onGameEvent({
            eventType,
            gameType: 'your_game_type',
            gameTitle: 'Your Game Title',
            details,
            timestamp: Date.now()
         });
      }
   }, [onGameEvent]);
```

### 3. Required Events to Emit

| Event | When to Emit | Required Details |
|-------|--------------|------------------|
| `game_started` | On component mount | phase, phaseLabel, currentScreen, totalScreens, coachMessage |
| `phase_changed` | Every phase transition | phase, phaseLabel, currentScreen, totalScreens, coachMessage |
| `prediction_made` | User makes prediction | prediction, predictionLabel, phase |
| `question_changed` | Enter test phase OR move to next question | questionNumber, totalQuestions, questionScenario, questionText, allOptions |
| `answer_selected` | User selects answer in test | questionNumber, questionScenario, questionText, selectedAnswer, allOptions |
| `app_changed` | User views new real-world application | appNumber, appTitle, appDescription, appConnection |
| `app_completed` | User completes an application section | appNumber, appTitle |
| `game_completed` | Test submitted or lesson finished | score, totalQuestions, percentage, passed |

### 4. Coach Messages for Each Phase

```typescript
const coachMessages: Record<Phase, string> = {
   hook: "Welcome! [topic-specific engaging intro]",
   predict: "Time to make a prediction! What do YOU think will happen?",
   play: "Watch carefully! Notice what's happening...",
   review: "Let's understand WHY this happens...",
   twist_predict: "Here's where it gets REALLY interesting!",
   twist_play: "Compare what happens when you change [variable]...",
   twist_review: "You've discovered [key insight]!",
   transfer: "Now let's see real-world applications!",
   test: "Test your understanding! Need a hint? I'm here to help!",
   mastery: "Congratulations! You've mastered [concept]!"
};
```

### 5. Hint System Implementation

```typescript
const hintMessages: Record<Phase, string> = {
   // Contextual hints for each phase
   hook: "Take a moment to consider [setup context]...",
   predict: "Think about what you'd expect if [scenario]...",
   play: "Keep watching! [observation guidance]...",
   // ... etc for each phase
};

const requestHint = useCallback(() => {
   emitGameEvent('hint_requested', {
      phase,
      coachMessage: hintMessages[phase],
      message: 'User requested a hint'
   });
   setLastCoachMessage(hintMessages[phase]);
}, [phase, emitGameEvent]);
```

---

## THE KNOWLEDGE TEST (PHASE 9)

**MANDATORY: 10 questions with the following structure:**

### Question Structure

```typescript
interface TestQuestion {
   scenario: string;      // Real-world context (2-3 sentences)
   question: string;      // The actual question
   options: {
      id: string;
      label: string;
      correct?: boolean;  // Only one option has this
   }[];
   explanation: string;   // WHY the correct answer is correct
}
```

### Question Distribution Requirements

| Question # | Type | Difficulty |
|------------|------|------------|
| Q1 | Core Concept | Easy |
| Q2 | Core Concept | Medium |
| Q3 | Deep Understanding | Medium |
| Q4 | Real-World Application #1 | Medium-Hard |
| Q5 | Real-World Application #2 | Hard |
| Q6 | Real-World Application #3 | Medium |
| Q7 | Real-World Application #4 | Hard |
| Q8 | Synthesis (combines all applications) | Expert |
| Q9 | Advanced/Edge Case | Expert |
| Q10 | Practical Engineering Challenge | Hard |

### Test Screen Implementation

```typescript
// TEST Screen structure
if (phase === 'test') {
   const currentQ = testQuestions[testQuestion];

   // If test submitted - show results
   if (testSubmitted) {
      const score = calculateTestScore();
      // Show score summary, question-by-question review with explanations
      return (/* Score summary UI with correct/incorrect breakdown */);
   }

   // Active test - show current question
   return (
      <div className="flex flex-col h-full">
         {renderProgressBar()}
         <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
            {/* Question header with progress */}
            <div>Question {testQuestion + 1} of {totalQuestions}</div>

            {/* Progress dots */}
            <div className="flex gap-1">
               {Array.from({ length: totalQuestions }, (_, i) => (
                  <div key={i} style={{
                     background: i === testQuestion ? colors.warning
                        : i < testQuestion ? colors.success
                        : colors.bgCardLight
                  }} />
               ))}
            </div>

            {/* Scenario box */}
            <div className="scenario-box">
               <p className="label">Scenario</p>
               <p>{currentQ.scenario}</p>
            </div>

            {/* Question */}
            <p className="question-text">{currentQ.question}</p>

            {/* Options - A, B, C, D format */}
            <div className="grid gap-3">
               {currentQ.options.map((opt, i) => (
                  <button
                     key={opt.id}
                     onMouseDown={() => {
                        // Update answer
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);

                        // Emit event for AI coach
                        emitGameEvent('answer_selected', {
                           phase: 'test',
                           questionNumber: testQuestion + 1,
                           totalQuestions,
                           questionScenario: currentQ.scenario,
                           questionText: currentQ.question,
                           selectedAnswer: opt.label,
                           allOptions: currentQ.options.map((o, idx) =>
                              `${String.fromCharCode(65 + idx)}: ${o.label}`).join(' | ')
                        });
                     }}
                     style={{
                        background: testAnswers[testQuestion] === opt.id
                           ? `${colors.warning}20` : colors.bgCard,
                        border: `2px solid ${testAnswers[testQuestion] === opt.id
                           ? colors.warning : colors.border}`
                     }}
                  >
                     <div className="letter-badge">
                        {String.fromCharCode(65 + i)}
                     </div>
                     <p>{opt.label}</p>
                  </button>
               ))}
            </div>
         </div>

         {/* Bottom bar with Next/Submit */}
         {renderBottomBar(
            true,
            !!testAnswers[testQuestion],
            testQuestion < totalQuestions - 1 ? `Question ${testQuestion + 2}` : 'Submit Test',
            () => {
               if (testQuestion < totalQuestions - 1) {
                  // Move to next question
                  const nextQ = testQuestion + 1;
                  setTestQuestion(nextQ);
                  // Emit question_changed with FULL content
                  emitGameEvent('question_changed', {
                     questionNumber: nextQ + 1,
                     totalQuestions,
                     questionScenario: testQuestions[nextQ].scenario,
                     questionText: testQuestions[nextQ].question,
                     allOptions: testQuestions[nextQ].options.map((o, idx) =>
                        `${String.fromCharCode(65 + idx)}: ${o.label}`).join(' | ')
                  });
               } else {
                  // Submit test
                  setTestSubmitted(true);
                  emitGameEvent('game_completed', {
                     phase: 'test',
                     score: calculateTestScore(),
                     totalQuestions,
                     percentage: Math.round((calculateTestScore() / totalQuestions) * 100),
                     passed: calculateTestScore() >= Math.ceil(totalQuestions * 0.7)
                  });
               }
            }
         )}
      </div>
   );
}
```

### First Question Emission on Test Phase Entry

```typescript
// Emit first question content when entering test phase
const prevPhaseRef = React.useRef<string>('');
React.useEffect(() => {
   if (phase === 'test' && prevPhaseRef.current !== 'test') {
      const firstQ = testQuestions[0];
      emitGameEvent('question_changed', {
         phase: 'test',
         phaseLabel: 'Knowledge Test',
         questionNumber: 1,
         totalQuestions: testQuestions.length,
         questionScenario: firstQ.scenario,
         questionText: firstQ.question,
         allOptions: firstQ.options.map((o, idx) =>
            `${String.fromCharCode(65 + idx)}: ${o.label}`).join(' | ')
      });
   }
   prevPhaseRef.current = phase;
}, [phase, emitGameEvent]);
```

---

## THE TRANSFER PHASE (PHASE 8) - REAL-WORLD APPLICATIONS

**MANDATORY: 4 detailed real-world applications with this structure:**

### Application Data Structure (MANDATORY FORMAT)

```typescript
interface RealWorldApplication {
   icon: string;            // Emoji icon
   title: string;           // e.g., "Quantum Computing"
   short: string;           // Very short description (3-4 words)
   tagline: string;         // Short hook phrase
   color: string;           // Hex color for theming
   description: string;     // 2-3 sentence overview
   connection: string;      // How it connects to the core concept learned
   howItWorks: string;      // Technical explanation (2-3 sentences)
   stats: {                 // **MANDATORY: 3 impressive statistics**
      value: string;        // e.g., "1,000+", "$65B", "100M×"
      label: string;        // e.g., "Qubits achieved", "Market by 2030"
      icon: string;         // Emoji for visual interest
   }[];
   examples: string[];      // 4 specific real-world examples with details
   companies: string[];     // 4-5 companies using this technology
   futureImpact: string;    // Future significance (1-2 sentences)
}

const realWorldApps: RealWorldApplication[] = [
   {
      icon: '💻',
      title: 'Quantum Computing',
      short: 'Qubits in superposition',
      tagline: 'The Next Computing Revolution',
      color: '#06b6d4',
      description: 'Just like electrons passing through both slits simultaneously, quantum bits (qubits) exist in a superposition of 0 AND 1 at the same time.',
      connection: 'The double-slit experiment demonstrates superposition — electrons exist in multiple states until measured. Qubits use this same principle.',
      howItWorks: 'Qubits are made from trapped ions, superconducting circuits, or photons. They maintain quantum coherence at near absolute zero temperatures.',
      stats: [
         { value: '1,000+', label: 'Qubits achieved', icon: '⚡' },
         { value: '$65B', label: 'Market by 2030', icon: '📈' },
         { value: '100M×', label: 'Faster for some tasks', icon: '🚀' }
      ],
      examples: [
         'Drug discovery: Simulate molecular interactions impossible for classical computers',
         'Cryptography: Factor large primes to break/create encryption',
         'AI/ML: Train models on quantum-enhanced algorithms',
         'Finance: Portfolio optimization and risk analysis'
      ],
      companies: ['IBM', 'Google', 'Microsoft', 'IonQ', 'Rigetti'],
      futureImpact: 'By 2030, quantum computers may solve problems in minutes that would take classical computers millions of years.'
   },
   // ... 3 more applications with same structure
];
```

### Stats Display Template

```jsx
{/* Stats grid - 3 impressive statistics */}
<div style={{
   display: 'grid',
   gridTemplateColumns: 'repeat(3, 1fr)',
   gap: '12px',
   marginBottom: '16px'
}}>
   {currentApp.stats.map((stat, i) => (
      <div key={i} style={{
         padding: '12px',
         borderRadius: '12px',
         background: `${currentApp.color}10`,
         border: `1px solid ${currentApp.color}30`,
         textAlign: 'center'
      }}>
         <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
         <div style={{
            fontSize: '18px',
            fontWeight: 800,
            color: currentApp.color
         }}>{stat.value}</div>
         <div style={{
            fontSize: '10px',
            color: colors.textMuted,
            fontWeight: 600
         }}>{stat.label}</div>
      </div>
   ))}
</div>
```

### Transfer Phase Implementation

```typescript
// State for tracking progress
const [selectedApp, setSelectedApp] = useState(0);
const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

// Get current app
const currentApp = realWorldApps[selectedApp];
const isCurrentCompleted = completedApps[selectedApp];
const allCompleted = completedApps.every(c => c);
const completedCount = completedApps.filter(c => c).length;

// Handle app completion
const handleCompleteApp = () => {
   const newCompleted = [...completedApps];
   newCompleted[selectedApp] = true;
   setCompletedApps(newCompleted);

   emitGameEvent('app_completed', {
      phase: 'transfer',
      appNumber: selectedApp + 1,
      appTitle: currentApp.title
   });

   // Auto-advance to next incomplete app
   if (selectedApp < 3 && !completedApps[selectedApp + 1]) {
      setTimeout(() => {
         setSelectedApp(selectedApp + 1);
         emitGameEvent('app_changed', {
            appNumber: selectedApp + 2,
            appTitle: realWorldApps[selectedApp + 1].title,
            appDescription: realWorldApps[selectedApp + 1].description
         });
      }, 500);
   }
};

// Transfer phase UI structure
return (
   <div className="flex flex-col h-full">
      {renderProgressBar()}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4">
         {/* Header */}
         <div className="mb-4">
            <span className="text-xs uppercase tracking-widest">Step 8 • Real World</span>
            <h2 className="text-2xl font-black">{currentApp.title}</h2>
            <p className="text-sm">{currentApp.tagline}</p>
         </div>

         {/* Application tabs */}
         <div className="flex gap-2 mb-4">
            {realWorldApps.map((app, i) => (
               <button
                  key={app.title}
                  onClick={() => {
                     setSelectedApp(i);
                     emitGameEvent('app_changed', {
                        appNumber: i + 1,
                        appTitle: app.title,
                        appDescription: app.description
                     });
                  }}
                  className={`tab ${selectedApp === i ? 'active' : ''} ${completedApps[i] ? 'completed' : ''}`}
               >
                  {app.icon} {app.title}
                  {completedApps[i] && <span>✓</span>}
               </button>
            ))}
         </div>

         {/* Main visualization (SVG specific to each application) */}
         <div className="visualization-area">
            {selectedApp === 0 && <App1Visualization />}
            {selectedApp === 1 && <App2Visualization />}
            {selectedApp === 2 && <App3Visualization />}
            {selectedApp === 3 && <App4Visualization />}
         </div>

         {/* Connection to core concept */}
         <div className="connection-box">
            <span>🔗 Connection to [Core Experiment]</span>
            <p>{currentApp.connection}</p>
         </div>

         {/* How it works */}
         <div className="how-it-works-box">
            <span>⚙️ How It Works</span>
            <p>{currentApp.howItWorks}</p>
         </div>

         {/* Real-world examples */}
         <div className="examples-grid">
            {currentApp.examples.map((ex, i) => (
               <div key={i} className="example-item">
                  <span className="number">{i + 1}</span>
                  <p>{ex}</p>
               </div>
            ))}
         </div>

         {/* Industry leaders */}
         <div className="companies-section">
            {currentApp.companies.map(company => (
               <span key={company} className="company-badge">{company}</span>
            ))}
         </div>

         {/* Future impact */}
         <div className="future-impact-box">
            <span>🚀 Future Impact</span>
            <p>{currentApp.futureImpact}</p>
         </div>
      </div>

      {/* Fixed bottom action bar */}
      <div className="bottom-bar">
         <button onClick={() => goToPhase('twist_review')}>← Back</button>

         {!isCurrentCompleted ? (
            <button onClick={handleCompleteApp} className="primary">
               ✓ Complete & Continue →
            </button>
         ) : (
            <span>✓ {currentApp.title} completed!</span>
         )}

         <button
            onClick={() => allCompleted && goToPhase('test')}
            disabled={!allCompleted}
            className={allCompleted ? 'primary' : 'disabled'}
         >
            {allCompleted ? 'Take Test →' : `${completedCount}/4`}
         </button>
      </div>
   </div>
);
```

---

## VISUALIZATION REQUIREMENTS (NON-NEGOTIABLE)

### Required SVG Defs

Every visualization MUST include:

```jsx
<defs>
   {/* 1. Background gradient */}
   <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#030712" />
      <stop offset="50%" stopColor="#0a0f1a" />
      <stop offset="100%" stopColor="#030712" />
   </linearGradient>

   {/* 2. Multiple glow filters */}
   <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
         <feMergeNode in="blur" />
         <feMergeNode in="SourceGraphic" />
      </feMerge>
   </filter>

   {/* 3. Material gradients */}
   <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#64748b" />
      <stop offset="50%" stopColor="#475569" />
      <stop offset="100%" stopColor="#334155" />
   </linearGradient>

   {/* 4. Color-specific gradients for your domain */}
   {/* e.g., for light: */}
   <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="30%" stopColor="#fef08a" />
      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
   </radialGradient>

   {/* 5. Grid pattern for lab background */}
   <pattern id="labGrid" width="25" height="25" patternUnits="userSpaceOnUse">
      <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
   </pattern>
</defs>
```

### Required Visual Layers (Bottom to Top)

1. **Background** - Premium gradient, never flat
2. **Grid/Reference** - Subtle lab/context pattern
3. **Equipment Layer** - Realistic apparatus with depth
4. **Active Elements** - Particles, beams, animations
5. **Labels/UI Overlay** - Non-intrusive annotations

### Animation Requirements

```jsx
// All moving elements need smooth animations
<circle cx={x} cy={y} r="4" fill="#67e8f9">
   <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
</circle>

// Particle trails for motion
{particles.map(p => (
   <g key={p.id}>
      {/* Trail */}
      <line x1={p.prevX} y1={p.prevY} x2={p.x} y2={p.y}
         stroke="#22d3ee" strokeWidth="1.5" opacity="0.3" />
      {/* Core */}
      <circle cx={p.x} cy={p.y} r="3" fill="#67e8f9" filter="url(#softGlow)" />
   </g>
))}
```

---

## TEACHING MILESTONE SYSTEM

Every PLAY phase must have real-time teaching overlays:

```typescript
const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'milestone1' | 'milestone2' | 'milestone3' | 'final'>('none');

// Update milestones based on user interaction
useEffect(() => {
   if (phase === 'play') {
      if (particleCount < 15) setTeachingMilestone('milestone1');
      else if (particleCount < 60) setTeachingMilestone('milestone2');
      else if (particleCount < 150) setTeachingMilestone('milestone3');
      else setTeachingMilestone('final');
   }
}, [particleCount, phase]);

// Teaching messages with progressive revelation
const teachingMessages = {
   none: { title: '', message: '', color: '' },
   milestone1: {
      title: '🔬 [First Observation]',
      message: 'Initial observation text explaining what they\'re seeing...',
      color: colors.textMuted
   },
   milestone2: {
      title: '🌟 [Pattern Emerging]',
      message: 'Something interesting is happening! Point out the emerging pattern...',
      color: colors.warning
   },
   milestone3: {
      title: '✨ [Key Discovery]',
      message: 'The main phenomenon is now clear. Explain the mechanism...',
      color: colors.primary
   },
   final: {
      title: '🎯 [Full Understanding]',
      message: 'Complete explanation tying everything together...',
      color: colors.success
   }
};

// Render overlay in visualization
{teachingMilestone !== 'none' && (
   <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl backdrop-blur-md"
      style={{
         background: `linear-gradient(135deg, ${colors.bgCard}ee 0%, ${colors.bgCardLight}dd 100%)`,
         border: `1px solid ${teachingMessages[teachingMilestone].color}50`
      }}>
      <p className="font-black" style={{ color: teachingMessages[teachingMilestone].color }}>
         {teachingMessages[teachingMilestone].title}
      </p>
      <p className="text-sm" style={{ color: colors.textSecondary }}>
         {teachingMessages[teachingMilestone].message}
      </p>
   </div>
)}
```

---

## COLOR SYSTEM (STANDARD PALETTE)

```typescript
const colors = {
   // Primary accents
   primary: '#06b6d4',      // cyan-500 - Main interactive elements
   primaryDark: '#0891b2',  // cyan-600
   accent: '#a855f7',       // purple-500 - Secondary emphasis
   accentDark: '#9333ea',   // purple-600

   // Semantic colors
   warning: '#f59e0b',      // amber-500 - Caution, test phase
   success: '#10b981',      // emerald-500 - Correct, completed
   danger: '#ef4444',       // red-500 - Wrong, observed state

   // Backgrounds
   bgDark: '#020617',       // slate-950 - Deepest background
   bgCard: '#0f172a',       // slate-900 - Card backgrounds
   bgCardLight: '#1e293b',  // slate-800 - Lighter cards

   // Borders and text
   border: '#334155',       // slate-700
   textPrimary: '#f8fafc',  // slate-50 - Headings
   textSecondary: '#94a3b8',// slate-400 - Body text
   textMuted: '#64748b',    // slate-500 - Subtle text
};
```

---

## COMPONENT STRUCTURE CHECKLIST

Before shipping, verify your game has:

### State Variables
- [ ] `phase` - Current phase (type-safe enum)
- [ ] `prediction` - User's initial prediction
- [ ] `twistPrediction` - User's twist prediction
- [ ] `testQuestion` - Current question index (0-9)
- [ ] `testAnswers` - Array of 10 answer selections
- [ ] `testSubmitted` - Boolean for showing results
- [ ] `selectedApp` - Current transfer app index (0-3)
- [ ] `completedApps` - Array of 4 booleans
- [ ] `teachingMilestone` - Current teaching state
- [ ] `time` - Animation time value
- [ ] `confetti` - Mastery celebration particles
- [ ] Interactive-specific state (sliders, toggles, etc.)

### Helper Functions
- [ ] `emitGameEvent()` - AI coach communication
- [ ] `goToPhase()` - Phase navigation with events
- [ ] `renderProgressBar()` - Top progress indicator
- [ ] `renderBottomBar()` - Navigation buttons
- [ ] `calculateTestScore()` - Test evaluation

### useEffect Hooks
- [ ] Animation loop (30ms interval)
- [ ] Initial game_started event on mount
- [ ] Teaching milestone updates
- [ ] First question emission on test phase entry
- [ ] Confetti generation on mastery phase

---

## THE LITMUS TEST

Before shipping, ask:

1. **Does it have ALL 10 phases?** Hook through Mastery?
2. **Does it emit events for AI coaching?** Every phase change, question, prediction?
3. **Does the test have 10 scenario-based questions?** With explanations?
4. **Does transfer have 4 real-world applications?** With visualizations?
5. **Are visualizations Level 4+ premium quality?** Gradients, glows, animations?
6. **Do teaching milestones update in real-time?** During PLAY phases?
7. **Would you be proud to show this to Apple's design team?**

---

## REFERENCE IMPLEMENTATION

Study `WaveParticleDualityRenderer.tsx` for the gold standard implementation. This file demonstrates:
- Full 10-phase structure
- Complete AI coaching integration
- 10-question knowledge test with scenarios
- 4 detailed real-world applications
- Premium SVG visualizations
- Real-time teaching overlays
- All required events and state management

**Copy its structure. Match its quality. Ship games that teach.**
