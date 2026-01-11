# SKILL 5: IMPLEMENTATION

## Purpose

Build the actual game with clean code, polished visuals, and adaptive systems.

**The goal:** Transform your designs into a working, beautiful, educational game.

---

## MASTER COMPONENT TEMPLATE

```jsx
import React, { useState, useEffect, useCallback } from 'react';

const EducationalGame = () => {
  // ─────────────────────────────────────────────────────────────────
  // CORE STATE
  // ─────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('home');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelState, setLevelState] = useState(null);
  const [result, setResult] = useState(null);

  // ─────────────────────────────────────────────────────────────────
  // PROGRESS & MASTERY STATE
  // ─────────────────────────────────────────────────────────────────
  const [progress, setProgress] = useState(() =>
    levels.map(() => ({
      completed: false,
      tier: null,
      attempts: 0,
      streak: 0,
      bestEfficiency: 0,
      hintsUsed: 0
    }))
  );

  // ─────────────────────────────────────────────────────────────────
  // ADAPTIVE STATE
  // ─────────────────────────────────────────────────────────────────
  const [adaptiveState, setAdaptiveState] = useState({
    difficulty: 'normal', // easy | normal | hard
    detectedMisconceptions: [],
    scaffoldingLevel: 3,
    hintLevel: 0,
    attemptHistory: []
  });

  // ─────────────────────────────────────────────────────────────────
  // TRUTH ENGINE
  // ─────────────────────────────────────────────────────────────────
  const engine = {
    getInitialState: (level) => ({ /* ... */ }),
    applyAction: (state, action) => ({ /* DETERMINISTIC */ }),
    checkSuccess: (state, level) => ({
      passed: false,
      metrics: {},
      efficiency: 0
    }),
    detectMisconceptions: (history) => []
  };

  // ─────────────────────────────────────────────────────────────────
  // ADAPTIVE LOGIC
  // ─────────────────────────────────────────────────────────────────
  const processAttempt = useCallback((attemptResult) => {
    const newHistory = [...adaptiveState.attemptHistory, attemptResult];
    const misconceptions = engine.detectMisconceptions(newHistory);

    const failureRate = newHistory.slice(-5).filter(a => !a.passed).length / 5;

    let newDifficulty = adaptiveState.difficulty;
    if (failureRate > 0.6) newDifficulty = 'easy';
    else if (failureRate < 0.2) newDifficulty = 'hard';

    setAdaptiveState({
      ...adaptiveState,
      difficulty: newDifficulty,
      detectedMisconceptions: misconceptions,
      attemptHistory: newHistory
    });

    return { misconceptions, difficulty: newDifficulty };
  }, [adaptiveState, engine]);

  // ─────────────────────────────────────────────────────────────────
  // HINT SYSTEM
  // ─────────────────────────────────────────────────────────────────
  const getHint = useCallback(() => {
    const level = levels[currentLevel];
    const attempts = progress[currentLevel].attempts;

    if (attempts === 1) return { text: level.hints.metacognitive, cost: 0 };
    if (attempts >= 4) return { text: level.hints.directional, cost: 0.1 };
    if (attempts >= 6) return { text: level.hints.specific, cost: 0.25 };
    return { text: level.hints.attention, cost: 0 };
  }, [currentLevel, progress, levels]);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
      {renderScreen()}
    </div>
  );
};
```

---

## THE 6 SCREENS TO IMPLEMENT

### Screen 1: Home
```jsx
const HomeScreen = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-indigo-900 to-purple-900">
    <div className="text-center mb-8">
      <div className="text-6xl mb-4">[ICON]</div>
      <h1 className="text-4xl font-bold text-white mb-2">[TITLE]</h1>
      <p className="text-indigo-200">[TAGLINE]</p>
    </div>

    <div className="space-y-4 w-full max-w-md">
      {/* Primary Mode - Emphasized */}
      <button
        onClick={() => setScreen('progress')}
        className="w-full p-5 min-h-[72px] bg-white/15 hover:bg-white/25 backdrop-blur rounded-2xl border-2 border-blue-400/50 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-2xl">
            📚
          </div>
          <div className="text-left">
            <div className="text-white font-bold text-lg">Learn</div>
            <div className="text-indigo-200 text-sm">Guided journey</div>
          </div>
        </div>
      </button>

      {/* Secondary Modes */}
      {/* ... Sandbox, Challenge ... */}
    </div>
  </div>
);
```

### Screen 2: Progress Map
```jsx
const ProgressScreen = () => (
  <div className="h-full bg-slate-900 p-6 overflow-y-auto">
    <div className="flex items-center justify-between mb-6">
      <button onClick={() => setScreen('home')} className="text-white/60 hover:text-white">
        ← Back
      </button>
      <h2 className="text-xl font-bold text-white">Your Journey</h2>
      <div className="w-16" />
    </div>

    <div className="space-y-3 max-w-md mx-auto">
      {levels.map((level, i) => {
        const status = getStatus(i);
        return (
          <button
            key={i}
            onClick={() => status !== 'locked' && goToLevel(i)}
            disabled={status === 'locked'}
            className={`w-full p-4 rounded-xl border transition-all ${
              status === 'locked' ? 'opacity-50 cursor-not-allowed' :
              status === 'current' ? 'bg-blue-50 border-blue-500' :
              'hover:border-blue-300'
            }`}
          >
            {/* Level content */}
          </button>
        );
      })}
    </div>
  </div>
);
```

### Screen 3: Mission Brief
```jsx
const MissionScreen = () => (
  <div className="h-full bg-slate-900 p-6 flex flex-col">
    <button onClick={() => setScreen('progress')} className="text-white/60 self-start mb-4">
      ← Back to Map
    </button>

    <div className="flex-1 space-y-4">
      {/* Objective Card */}
      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
        <h3 className="text-white/50 text-sm uppercase mb-2">Your Mission</h3>
        <p className="text-white text-lg">{level.objective}</p>
      </div>

      {/* Success Criteria */}
      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
        <h3 className="text-white/50 text-sm uppercase mb-3">Success Looks Like</h3>
        <ul className="space-y-2">
          {level.successCriteria.map((c, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-emerald-400">✓</span>
              <span className="text-white/80">{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tools */}
      <div className="flex flex-wrap gap-2">
        {level.tools.map((tool, i) => (
          <span key={i} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
            {tool}
          </span>
        ))}
      </div>
    </div>

    {/* Primary CTA */}
    <button
      onClick={() => setScreen('build')}
      className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl mt-4"
    >
      Start Level →
    </button>

    {/* Collapsible Hint */}
    <details className="mt-4">
      <summary className="text-gray-400 text-sm cursor-pointer">Show hint ▼</summary>
      <div className="mt-2 p-4 bg-amber-500/10 rounded-xl text-amber-200 text-sm">
        {level.hint}
      </div>
    </details>
  </div>
);
```

### Screen 4: Build/Plan
```jsx
const BuildScreen = () => (
  <div className="h-full flex flex-col">
    {/* Sticky Header with Objective */}
    <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <button onClick={() => setScreen('mission')} className="text-gray-500">← Back</button>
      <div className="text-center">
        <div className="font-bold text-gray-800">{level.title}</div>
      </div>
      <div className="text-sm text-gray-500">Goal: {level.targetDisplay}</div>
    </div>

    {/* Workspace */}
    <div className="flex-1 relative">
      {/* SVG visualization or interactive area */}
    </div>

    {/* Controls */}
    <div className="bg-white border-t p-4 space-y-4">
      {/* Sliders, inputs, etc. */}

      {/* Action Bar - Reset LEFT, Run RIGHT */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl"
        >
          ↶ Reset
        </button>
        <button
          onClick={runSimulation}
          className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl"
        >
          ▶ Run
        </button>
      </div>
    </div>
  </div>
);
```

### Screen 5: Simulate
```jsx
const SimulateScreen = () => (
  <div className="h-full bg-slate-900 flex flex-col">
    {/* Stats Header */}
    <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
      <div className="text-white font-bold">Simulation Running</div>
      <div className="flex gap-4 text-sm font-mono">
        <span className="text-emerald-400">t = {time}s</span>
        <span className="text-blue-400">x = {position}m</span>
      </div>
    </div>

    {/* Viewport */}
    <div className="flex-1">
      {/* SVG animation */}
    </div>

    {/* Playback Controls */}
    <div className="bg-slate-800 p-4 flex items-center justify-center gap-4">
      {[0.5, 1, 2].map(speed => (
        <button
          key={speed}
          onClick={() => setSimSpeed(speed)}
          className={`px-3 py-1 rounded ${simSpeed === speed ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          {speed}x
        </button>
      ))}
      <button onClick={() => setIsPaused(!isPaused)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>
    </div>
  </div>
);
```

### Screen 6: Debrief
```jsx
const DebriefScreen = () => (
  <div className="h-full bg-slate-900 p-6 flex flex-col">
    {/* Result Header */}
    <div className={`text-center p-6 rounded-2xl mb-6 ${
      result.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'
    } border`}>
      <div className="text-5xl mb-3">{result.passed ? '🎉' : '💡'}</div>
      <h2 className="text-2xl font-bold text-white">{result.passed ? 'Success!' : 'Not Quite...'}</h2>

      {/* Mastery Badge */}
      {result.tier && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4 ${
          result.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-300' :
          result.tier === 'silver' ? 'bg-gray-400/20 text-gray-300' :
          'bg-amber-600/20 text-amber-300'
        }`}>
          <span className="text-2xl">{result.tier === 'gold' ? '🥇' : result.tier === 'silver' ? '🥈' : '🥉'}</span>
          <span className="font-bold uppercase">{result.tier}</span>
        </div>
      )}
    </div>

    {/* Progress Bars */}
    <div className="space-y-4 mb-6">
      <ProgressBar label="Accuracy" value={result.accuracy} />
      <ProgressBar label="Efficiency" value={result.efficiency} />
    </div>

    {/* Path to Gold */}
    {result.tier !== 'gold' && result.passed && (
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6">
        <div className="flex items-start gap-3">
          <span>💡</span>
          <div>
            <div className="text-yellow-300 font-medium text-sm">Path to Gold</div>
            <div className="text-yellow-100/70 text-sm">{result.pathToGold}</div>
          </div>
        </div>
      </div>
    )}

    {/* Actions */}
    <div className="flex gap-3 mt-auto">
      <button onClick={retry} className="flex-1 py-4 bg-white text-gray-700 rounded-xl border-2 border-gray-200">
        {result.passed ? '🔄 Optimize' : '← Try Again'}
      </button>
      {result.passed && (
        <button onClick={nextLevel} className="flex-1 py-4 bg-blue-500 text-white font-bold rounded-xl">
          Next Level →
        </button>
      )}
    </div>
  </div>
);
```

---

## COMPONENT LIBRARY

### Buttons
```jsx
// PRIMARY
<button className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
  Continue →
</button>

// SECONDARY
<button className="w-full py-3 px-6 bg-white hover:bg-gray-50 text-gray-700 font-medium border-2 border-gray-200 rounded-xl">
  ← Try Again
</button>
```

### Mastery Badge
```jsx
const MasteryBadge = ({ tier }) => {
  const config = {
    bronze: { icon: '🥉', bg: 'bg-amber-100', text: 'text-amber-700' },
    silver: { icon: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' },
    gold: { icon: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-700' }
  };
  const c = config[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>
      <span className="text-xs font-medium capitalize">{tier}</span>
    </span>
  );
};
```

### Progress Bar
```jsx
const ProgressBar = ({ label, value, threshold = 100 }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="font-medium text-gray-300">{label}</span>
      <span className="text-white">{value}%</span>
    </div>
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          value >= threshold ? 'bg-green-500' : value >= 70 ? 'bg-blue-500' : 'bg-amber-500'
        }`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  </div>
);
```

---

## COMMON PITFALLS

### ❌ DON'T: Use localStorage
```jsx
// BAD - fails in artifacts
localStorage.setItem('progress', JSON.stringify(progress));

// GOOD
const [progress, setProgress] = useState(initialProgress);
```

### ❌ DON'T: Use form elements
```jsx
// BAD
<form onSubmit={...}><button type="submit">Go</button></form>

// GOOD
<button onClick={handleSubmit}>Go</button>
```

### ❌ DON'T: Forget accessibility
```jsx
// BAD - small touch targets
<button className="p-1">X</button>

// GOOD - 44px minimum
<button className="p-3 min-w-[44px] min-h-[44px]">X</button>
```

---

## BUILD ORDER

1. **Truth Engine** — Get simulation working first
2. **Core gameplay** — One level, fully functional
3. **Mastery system** — Scoring, tiers, gates
4. **Adaptive system** — Difficulty adjustment, misconception detection
5. **Navigation** — Connect all 6 screens
6. **Polish** — Animations, edge cases

---

## VISUALIZATION EXCELLENCE REQUIREMENTS

**THIS IS NON-NEGOTIABLE. Basic graphics = failed learning.**

### The Quality Ladder

| Level | Example | Verdict |
|-------|---------|---------|
| Level 1: BASIC | `<rect fill="blue" />` | ❌ NEVER |
| Level 2: STYLED | `<rect fill="blue" rx="8" />` | ❌ NOT ENOUGH |
| Level 3: POLISHED | Gradients + shadows | ⚠️ MINIMUM |
| Level 4: PREMIUM | Particles + physics | ✅ TARGET |
| Level 5: INSPIRING | Cinematic quality | 🌟 EXCELLENCE |

**Every game must be Level 4+.**

---

### REQUIRED SVG DEFS (Copy-paste into every renderer)

```jsx
<defs>
  {/* Background gradient */}
  <radialGradient id="bgGradient" cx="30%" cy="30%">
    <stop offset="0%" stopColor="#1e1b4b" />
    <stop offset="50%" stopColor="#0f172a" />
    <stop offset="100%" stopColor="#020617" />
  </radialGradient>

  {/* Glow filters - MANDATORY */}
  <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur stdDeviation="8" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
  <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="4" result="blur" />
    <feComposite in="SourceGraphic" in2="blur" operator="over" />
  </filter>

  {/* Material gradients */}
  <linearGradient id="glassBlue" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
  </linearGradient>
  <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#f1f5f9" />
    <stop offset="50%" stopColor="#94a3b8" />
    <stop offset="100%" stopColor="#64748b" />
  </linearGradient>
</defs>
```

---

### PARTICLE SYSTEM TEMPLATE

```jsx
// State for particles
const [particles, setParticles] = useState<Array<{
  id: number; x: number; y: number;
  vx: number; vy: number;
  hue: number; size: number;
  trail: {x: number; y: number}[];
}>>([]);

// Spawn particles
useEffect(() => {
  const interval = setInterval(() => {
    setParticles(prev => [...prev.slice(-30), {
      id: Date.now(),
      x: spawnX, y: spawnY,
      vx: 2 + Math.random(), vy: (Math.random() - 0.5) * 2,
      hue: 40 + Math.random() * 40,
      size: 2 + Math.random() * 3,
      trail: []
    }]);
  }, 100);
  return () => clearInterval(interval);
}, []);

// Update particles with physics
useEffect(() => {
  const interval = setInterval(() => {
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      trail: [...p.trail, {x: p.x, y: p.y}].slice(-8)
    })).filter(p => p.x < maxX));
  }, 30);
  return () => clearInterval(interval);
}, []);

// Render particles with trails
{particles.map(p => (
  <g key={p.id}>
    {p.trail.map((t, i) => (
      <circle key={i} cx={t.x} cy={t.y}
        r={p.size * (i / p.trail.length) * 0.5}
        fill={`hsl(${p.hue}, 80%, 70%)`}
        opacity={(i / p.trail.length) * 0.4} />
    ))}
    <circle cx={p.x} cy={p.y} r={p.size}
      fill={`hsl(${p.hue}, 90%, 75%)`}
      filter="url(#strongGlow)" />
  </g>
))}
```

---

### REAL-WORLD VISUAL ANCHORING

Every physics concept needs proper visual treatment:

| Element | ❌ Basic | ✅ Premium |
|---------|----------|-----------|
| **Light Source** | Yellow circle | Multi-layer glow + animated rays + pulsing |
| **Polarizer** | Gray rectangle | Glass gradient + refraction lines + reflection |
| **Resistor** | Zigzag line | 3D cylinder + color bands + heat glow |
| **Capacitor** | Parallel lines | Metal plates + field lines + charge particles |
| **Spring** | Coil path | 3D helix + tension colors + compression animation |
| **Wave** | Sine curve | Animated oscillation + amplitude glow + frequency color |
| **Electron** | Blue dot | Glowing particle + orbital trail + charge indicator |

---

### ANIMATION REQUIREMENTS

```jsx
// Animation state
const [animTime, setAnimTime] = useState(0);
const animRef = useRef<number>();

// 60fps animation loop
useEffect(() => {
  const animate = () => {
    setAnimTime(t => t + 0.03);
    animRef.current = requestAnimationFrame(animate);
  };
  animRef.current = requestAnimationFrame(animate);
  return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
}, []);

// Use animTime for smooth animations:
// - Pulsing: Math.sin(animTime * 2) * 0.1 + 1
// - Rotation: animTime * 30 (degrees)
// - Waves: Math.sin(animTime * 3 + x * 0.1)
// - Opacity: 0.5 + Math.sin(animTime) * 0.3
```

---

## QUALITY CHECKLIST

Before moving to Skill 6, verify:

### Functionality
- [ ] All 6 screens implemented
- [ ] Truth engine is deterministic
- [ ] Mastery tiers calculated correctly
- [ ] Adaptive difficulty responds
- [ ] Navigation works both directions
- [ ] Reset/Undo always available
- [ ] Touch targets are 44px minimum
- [ ] No console errors

### Visualization Excellence (NEW - CRITICAL)
- [ ] **No flat shapes** - Every shape has gradient/shadow/glow
- [ ] **Background gradient** - Never flat color background
- [ ] **Glow filters defined** - softGlow and strongGlow in defs
- [ ] **Particle system** - Moving elements have particles + trails
- [ ] **Realistic materials** - Glass, metal, light look real
- [ ] **Physics visualization** - Can SEE the mechanism working
- [ ] **Smooth animations** - 60fps animation loop running
- [ ] **Depth layers** - Clear foreground/midground/background
- [ ] **Premium polish** - Would look good in Apple commercial?

**If visualization fails, DO NOT PROCEED. Fix graphics first.**
