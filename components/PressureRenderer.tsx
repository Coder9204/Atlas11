'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// PRESSURE RENDERER - PREMIUM PHYSICS GAME
// The Bed of Nails: Why standing on 1 nail hurts, but 1000 nails is fine
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface PressureRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// Real-World Applications Data
const applications = [
  {
    id: 'shoes',
    icon: '👠',
    title: 'High Heels vs Snowshoes',
    subtitle: 'Fashion & Function',
    color: '#EC4899',
    description: 'A 60kg woman in stilettos (1 cm² heel) exerts 30 MPa - enough to damage hardwood floors! The same woman in snowshoes (2000 cm²) exerts just 300 Pa - she can walk on snow without sinking.',
    physics: 'Pressure = Force/Area. Stiletto: 600N / 0.0001m² = 6 MPa per heel. Snowshoes: 600N / 0.2m² = 3000 Pa. That\'s 2000× less pressure!',
    insight: 'This is why many historic buildings ban high heels, and why we use snowshoes, skis, and wide tires on soft surfaces.',
    stats: [
      { value: '6 MPa', label: 'Stiletto' },
      { value: '3 kPa', label: 'Snowshoe' },
      { value: '2000×', label: 'Difference' },
    ],
  },
  {
    id: 'knives',
    icon: '🔪',
    title: 'Sharp vs Dull Knives',
    subtitle: 'Kitchen Science',
    color: '#EF4444',
    description: 'A sharp knife has an edge thickness of ~0.1mm, creating extreme pressure with minimal force. A dull knife (1mm edge) needs 10× more force to cut, which is why dull knives are actually MORE dangerous.',
    physics: 'Sharp edge: Force concentrated on tiny area → high pressure → clean cut. Dull edge: Same force spread over larger area → must push harder → more likely to slip.',
    insight: 'Surgeons use obsidian scalpels (sharper than steel) for delicate operations. The pressure at the edge can exceed 1 GPa.',
    stats: [
      { value: '0.1mm', label: 'Sharp Edge' },
      { value: '10×', label: 'Force Diff' },
      { value: '1 GPa', label: 'Edge Pressure' },
    ],
  },
  {
    id: 'tires',
    icon: '🚗',
    title: 'Tire Pressure & Contact',
    subtitle: 'Automotive Engineering',
    color: '#3B82F6',
    description: 'Car tires at 32 PSI (220 kPa) support a 1500kg car because the contact patch adjusts. Under-inflate to 20 PSI and the contact patch grows larger to maintain the same force support.',
    physics: 'Tire pressure × contact area = weight supported. If tire pressure drops, contact area increases proportionally. P₁A₁ = P₂A₂ = mg.',
    insight: 'Race cars use wide, soft tires for maximum grip (larger contact patch), while eco cars use narrow, hard tires for low rolling resistance.',
    stats: [
      { value: '32 PSI', label: 'Normal' },
      { value: '~200 cm²', label: 'Contact Area' },
      { value: '4×', label: 'Per Tire' },
    ],
  },
  {
    id: 'scuba',
    icon: '🤿',
    title: 'Scuba Diving Pressure',
    subtitle: 'Underwater Physics',
    color: '#06B6D4',
    description: 'Water pressure increases by 1 atmosphere (101 kPa) every 10 meters. At 30m depth, you experience 4 atm - your lungs compress to 1/4 their surface volume!',
    physics: 'P = P₀ + ρgh. Water density ~1000 kg/m³, so every 10m adds ~100 kPa. Scuba regulators deliver air at ambient pressure to let you breathe normally.',
    insight: 'Deep divers must ascend slowly to avoid "the bends" - nitrogen dissolved in blood at high pressure can form bubbles if pressure drops too fast.',
    stats: [
      { value: '1 atm', label: 'Per 10m' },
      { value: '4 atm', label: 'At 30m' },
      { value: '332m', label: 'Record Dive' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A 70kg person stands on one foot (100 cm² contact area). What pressure do they exert? (g = 10 m/s²)',
    options: ['700 Pa', '7,000 Pa', '70,000 Pa', '700,000 Pa'],
    correct: 2,
    explanation: 'P = F/A = mg/A = (70 × 10) / 0.01m² = 70,000 Pa = 70 kPa',
  },
  {
    question: 'Standing on a bed of 1000 nails vs 1 nail (same total area), the pressure per nail is:',
    options: ['1000× higher on many nails', '1000× lower on many nails', 'Same for both', 'Cannot determine'],
    correct: 1,
    explanation: 'With 1000 nails, force is divided among them. Each nail receives 1/1000 of the force, so pressure per nail is 1000× less.',
  },
  {
    question: 'A sharp knife with 0.5mm edge width needs 10N to cut a tomato. A dull knife with 5mm edge needs:',
    options: ['1N', '10N', '100N', '1000N'],
    correct: 2,
    explanation: 'Same pressure needed to cut. Dull edge is 10× wider, so needs 10× more force to achieve same pressure.',
  },
  {
    question: 'Why do camels have large flat feet?',
    options: ['To kick predators', 'To reduce pressure on sand', 'To run faster', 'To store water'],
    correct: 1,
    explanation: 'Large feet spread weight over larger area, reducing pressure on soft sand so they don\'t sink.',
  },
  {
    question: 'If you double the force AND double the area, what happens to pressure?',
    options: ['Doubles', 'Quadruples', 'Stays the same', 'Halves'],
    correct: 2,
    explanation: 'P = F/A. If both F and A double: P = 2F/2A = F/A. Pressure unchanged.',
  },
  {
    question: 'A hydraulic press has pistons with area ratio 1:100. If you push with 10N on the small piston, the force on the large piston is:',
    options: ['10N', '100N', '1000N', '0.1N'],
    correct: 2,
    explanation: 'Pressure is equal throughout. F₁/A₁ = F₂/A₂. So F₂ = F₁ × (A₂/A₁) = 10 × 100 = 1000N.',
  },
  {
    question: 'At 20m underwater, the total pressure on a diver is approximately:',
    options: ['1 atmosphere', '2 atmospheres', '3 atmospheres', '20 atmospheres'],
    correct: 2,
    explanation: 'Pressure increases by 1 atm per 10m depth. At 20m: 1 atm (surface) + 2 atm (water) = 3 atm total.',
  },
  {
    question: 'Why is it easier to push a thumbtack into wood than a blunt nail?',
    options: ['Thumbtack is sharper', 'Thumbtack has less mass', 'Thumbtack creates more friction', 'Thumbtack is made of harder material'],
    correct: 0,
    explanation: 'Sharp point concentrates force on tiny area → extremely high pressure → penetrates wood easily.',
  },
  {
    question: 'A tank full of water has a small hole at the bottom. If you double the water height, the water shoots out:',
    options: ['At the same speed', '2× faster', '√2 faster', '4× faster'],
    correct: 2,
    explanation: 'Exit velocity v = √(2gh). Doubling h gives v₂ = √(2×2gh) = √2 × √(2gh) = √2 × v₁.',
  },
  {
    question: 'Standard atmospheric pressure (101 kPa) pushes on every square meter of your body with a force of:',
    options: ['101 N', '1,010 N', '10,100 N', '101,000 N'],
    correct: 3,
    explanation: 'P = F/A, so F = P × A = 101,000 Pa × 1 m² = 101,000 N (about 10 tons per square meter!).',
  },
];

export default function PressureRenderer({ onComplete, onGameEvent, currentPhase, onPhaseComplete }: PressureRendererProps) {
  // Core state
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Simulation state
  const [numNails, setNumNails] = useState(1);
  const [personWeight] = useState(700); // Newtons
  const [nailTipArea] = useState(1); // mm²

  // Button debounce lock
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Emit events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // Phase navigation with 200ms debouncing
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, onPhaseComplete, emitEvent]);

  const goNext = useCallback(() => {
    if (phase < PHASES.length - 1) {
      goToPhase(phase + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    if (phase > 0) {
      goToPhase(phase - 1);
    }
  }, [phase, goToPhase]);


  // Calculate pressure values
  const calculatePressure = useCallback(() => {
    const totalArea = numNails * nailTipArea * 1e-6; // Convert mm² to m²
    const forcePerNail = personWeight / numNails;
    const pressurePerNail = forcePerNail / (nailTipArea * 1e-6); // Pa

    // Pain threshold is roughly 1 MPa
    const painThreshold = 1e6; // 1 MPa
    const painLevel = Math.min(100, (pressurePerNail / painThreshold) * 100);
    const isSafe = pressurePerNail < painThreshold;

    return {
      forcePerNail,
      pressurePerNail,
      totalPressure: personWeight / totalArea,
      painLevel,
      isSafe,
      pressurePerNailMPa: pressurePerNail / 1e6,
    };
  }, [numNails, personWeight, nailTipArea]);

  // Helper function: Progress bar - premium phase dots
  const ProgressBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
        <span className="text-sm font-semibold text-white/80 tracking-wide">Pressure</span>
        <div className="flex items-center gap-1.5">
          {PHASES.map((p) => (
            <button
              key={p}
              onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                phase === p
                  ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                  : phase > p
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-700 w-2 hover:bg-slate-600'
              }`}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
      </div>
    </div>
  );

  // Helper function: Nail bed visualization
  const NailBedVisualization = () => {
    const values = calculatePressure();
    const displayNails = Math.min(numNails, 100);
    const gridSize = Math.ceil(Math.sqrt(displayNails));

    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[220px]" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f13 100%)', borderRadius: '12px' }}>
          {/* Person silhouette */}
          <g transform="translate(150, 30)">
            <ellipse cx="0" cy="0" rx="25" ry="15" fill="#374151" />
            <rect x="-20" y="15" width="40" height="60" rx="5" fill="#374151" />
            <text x="0" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">
              {(personWeight / 10).toFixed(0)}kg
            </text>
          </g>

          {/* Force arrows */}
          <line x1="150" y1="100" x2="150" y2="130" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>
          <text x="165" y="120" fill="#3b82f6" fontSize="10">{personWeight}N</text>

          {/* Nail bed */}
          <rect x="50" y="140" width="200" height="10" fill="#1f2937" rx="2" />

          {/* Individual nails */}
          {Array.from({ length: displayNails }).map((_, i) => {
            const col = i % gridSize;
            const row = Math.floor(i / gridSize);
            const startX = 150 - (gridSize * 10) / 2;
            const x = startX + col * 12 + 6;
            const y = 140 - row * 8;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x} y2={y + 10} stroke={values.isSafe ? '#10b981' : '#ef4444'} strokeWidth="2" />
                <circle cx={x} cy={y} r="2" fill={values.isSafe ? '#10b981' : '#ef4444'} />
              </g>
            );
          })}
          {numNails > 100 && (
            <text x="150" y="170" textAnchor="middle" fill="#64748b" fontSize="10">
              (showing 100 of {numNails} nails)
            </text>
          )}

          {/* Pain indicator */}
          <text x="150" y="190" textAnchor="middle" fill={values.isSafe ? '#10b981' : '#ef4444'} fontSize="14" fontWeight="bold">
            {values.isSafe ? 'Comfortable' : 'Painful!'}
          </text>
        </svg>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">Force Per Nail</div>
            <div className="text-xl font-bold text-white">{values.forcePerNail.toFixed(1)} N</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Pressure</div>
            <div className="text-xl font-bold text-white">{values.pressurePerNailMPa.toFixed(2)} MPa</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Pain Level</div>
            <div className={`text-xl font-bold ${values.painLevel > 100 ? 'text-red-400' : values.painLevel > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {Math.min(values.painLevel, 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Pain threshold bar */}
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-slate-500">Pressure vs Pain Threshold (1 MPa)</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-amber-500 z-10" />
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, values.painLevel)}%`,
                background: values.painLevel > 100 ? '#ef4444' : values.painLevel > 50 ? '#f59e0b' : '#10b981'
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-emerald-500">Safe</span>
            <span className="text-xs text-amber-500">Threshold</span>
            <span className="text-xs text-red-500">Painful</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================
  if (phase === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        {/* Premium background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/3 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-16 pb-12">
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
              The Bed of Nails
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10">
              Why does standing on ONE nail hurt terribly, but lying on 1000 nails is perfectly comfortable?
            </p>

            {/* Premium card with graphic */}
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

              <div className="relative">
                <div className="flex justify-around items-center mb-8">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📍</div>
                    <div className="text-lg font-bold text-red-400">1 Nail</div>
                    <div className="text-xs text-red-400/80">OUCH!</div>
                  </div>
                  <div className="w-px h-16 bg-slate-700" />
                  <div className="text-center">
                    <div className="text-4xl mb-2">📍📍📍</div>
                    <div className="text-lg font-bold text-emerald-400">1000 Nails</div>
                    <div className="text-xs text-emerald-400/80">Comfortable!</div>
                  </div>
                </div>

                <p className="text-xl text-white/90 font-medium leading-relaxed">
                  Discover the physics behind this seemingly impossible feat
                </p>
              </div>
            </div>

            {/* Premium CTA button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
              className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Discover Why
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Feature hints */}
            <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">*</span>
                Interactive Lab
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">*</span>
                Real-World Examples
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">*</span>
                Knowledge Test
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  if (phase === 1) {
    const predictions = [
      { id: 0, label: 'Magic or illusion', icon: '🎩', description: 'It\'s just a circus trick' },
      { id: 1, label: 'The nails are blunt', icon: '🔨', description: 'They use special dull nails' },
      { id: 2, label: 'Force is distributed', icon: '📊', description: 'Each nail shares the weight' },
      { id: 3, label: 'Training and practice', icon: '🧘', description: 'Performers build up tolerance' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Your Prediction</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-3">
                Why can someone lie comfortably on 1000 sharp nails?
              </h2>
              <p className="text-slate-400">What's the physics behind this seemingly impossible feat?</p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${
                    prediction === p.id
                      ? 'bg-cyan-500/20 border-2 border-cyan-500'
                      : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <div className={`font-semibold ${prediction === p.id ? 'text-cyan-400' : 'text-white'}`}>
                      {p.label}
                    </div>
                    <div className="text-sm text-slate-400">{p.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (prediction !== null) goToPhase(2); }}
                disabled={prediction === null}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                  prediction !== null
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Test It Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PLAY
  // ============================================================================
  if (phase === 2) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Pressure Simulator</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-2">
                Adjust the Number of Nails
              </h2>
              <p className="text-slate-400">See how pressure changes as you add more nails</p>
            </div>

            <NailBedVisualization />

            {/* Nail count slider */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-white">Number of Nails</span>
                <span className="text-2xl font-bold text-cyan-400">{numNails.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                value={numNails}
                onChange={(e) => setNumNails(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-red-400">1 (Ouch!)</span>
                <span className="text-xs text-amber-400">100</span>
                <span className="text-xs text-emerald-400">1000 (Safe)</span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-6 justify-center flex-wrap">
              {[1, 10, 100, 500, 1000].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumNails(n)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    numNails === n
                      ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                      : 'bg-slate-800/50 border-2 border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {n} nail{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goNext(); }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl"
              >
                Continue to Review
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  if (phase === 3) {
    const userWasRight = prediction === 2;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{userWasRight ? '🎯' : '💡'}</div>
              <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {userWasRight ? 'Exactly Right!' : 'It\'s All About Pressure!'}
              </h2>
              <p className="text-slate-400">The secret is force distribution over area</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">The Pressure Equation</h3>

              <div className="bg-slate-900/50 rounded-xl p-4 text-center mb-4">
                <p className="text-3xl font-bold text-cyan-400 mb-1">P = F / A</p>
                <p className="text-sm text-slate-500">Pressure = Force / Area</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30 text-center">
                  <div className="text-lg font-bold text-red-400 mb-1">1 Nail</div>
                  <div className="text-sm text-slate-400">700N / 1mm²</div>
                  <div className="text-lg font-bold text-red-400 mt-2">= 700 MPa</div>
                </div>
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 text-center">
                  <div className="text-lg font-bold text-emerald-400 mb-1">1000 Nails</div>
                  <div className="text-sm text-slate-400">700N / 1000mm²</div>
                  <div className="text-lg font-bold text-emerald-400 mt-2">= 0.7 MPa</div>
                </div>
              </div>
            </div>

            <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/30 mb-6">
              <p className="font-semibold text-cyan-400 mb-2">Key Insight</p>
              <p className="text-slate-300 text-sm">
                Skin can tolerate about <strong className="text-white">1 MPa</strong> of pressure. One nail creates 700× this threshold. 1000 nails spread the same force to safe levels!
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goNext(); }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl"
              >
                Try a Twist
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PREDICT
  // ============================================================================
  if (phase === 4) {
    const twistOptions = [
      { id: 0, label: 'Double the pressure', icon: '📈', description: 'More force = more pressure' },
      { id: 1, label: 'Same pressure', icon: '⚖️', description: 'More nails compensate for more force' },
      { id: 2, label: 'Half the pressure', icon: '📉', description: 'The extra nails reduce it more' },
      { id: 3, label: 'Cannot determine', icon: '❓', description: 'Need more information' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Twist Scenario</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-3">
                Double the Force, Double the Nails
              </h2>
              <p className="text-slate-400">If you double the weight AND double the number of nails, what happens to the pressure per nail?</p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {twistOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTwistPrediction(opt.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${
                    twistPrediction === opt.id
                      ? 'bg-amber-500/20 border-2 border-amber-500'
                      : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <div className={`font-semibold ${twistPrediction === opt.id ? 'text-amber-400' : 'text-white'}`}>
                      {opt.label}
                    </div>
                    <div className="text-sm text-slate-400">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (twistPrediction !== null) goNext(); }}
                disabled={twistPrediction === null}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                  twistPrediction !== null
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Explore
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PLAY
  // ============================================================================
  if (phase === 5) {
    const [twistWeight, setTwistWeight] = useState(700);
    const [twistNails, setTwistNails] = useState(100);

    const basePressure = 700 / (100 * 1e-6);
    const currentPressure = twistWeight / (twistNails * 1e-6);
    const pressureRatio = currentPressure / basePressure;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Twist Experiment</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">Play with Force and Area</h2>
            </div>

            {/* Pressure Display */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-6 text-center">
              <div className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">Current Pressure</div>
              <div className={`text-5xl font-bold ${pressureRatio > 1.1 ? 'text-red-400' : pressureRatio < 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {(currentPressure / 1e6).toFixed(2)} MPa
              </div>
              <div className="text-slate-400 mt-2">{pressureRatio.toFixed(2)}× baseline</div>
            </div>

            {/* Sliders */}
            <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-400 font-semibold">Force</span>
                  <span className="text-white font-bold">{twistWeight} N</span>
                </div>
                <input
                  type="range"
                  min="350"
                  max="1400"
                  value={twistWeight}
                  onChange={(e) => setTwistWeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between mb-2">
                  <span className="text-emerald-400 font-semibold">Nails</span>
                  <span className="text-white font-bold">{twistNails}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={twistNails}
                  onChange={(e) => setTwistNails(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Formula visualization */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-6">
              <div className="text-lg text-slate-400 text-center mb-4">P = F / A</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{twistWeight}N</div>
                  <div className="text-xs text-slate-500">Force</div>
                </div>
                <div className="text-2xl text-slate-500">/</div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">{twistNails}mm²</div>
                  <div className="text-xs text-slate-500">Area</div>
                </div>
                <div className="text-2xl text-slate-500">=</div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">{(currentPressure / 1e6).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">MPa</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goNext(); }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                See the Insight
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST REVIEW
  // ============================================================================
  if (phase === 6) {
    const userWasRight = twistPrediction === 1;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{userWasRight ? '🎯' : '⚖️'}</div>
              <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-amber-400'}`}>
                {userWasRight ? 'Exactly!' : 'They Cancel Out!'}
              </h2>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">The Proportional Relationship</h3>

              <div className="bg-slate-900/50 rounded-xl p-4 text-center mb-4">
                <p className="text-lg font-bold text-cyan-400 mb-1">If F × 2 and A × 2, then P stays the same</p>
                <p className="text-slate-400">P = 2F / 2A = F / A</p>
              </div>

              <p className="text-slate-400 mb-4">This is why:</p>

              <div className="flex flex-col gap-3">
                {[
                  { icon: '🐘', text: 'Elephants don\'t sink - their huge weight is matched by huge feet' },
                  { icon: '🏗️', text: 'Skyscrapers need wide foundations to spread their weight' },
                  { icon: '🚛', text: 'Heavy trucks have more wheels to distribute the load' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-sm text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goNext(); }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl"
              >
                Real World Applications
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER (Real World Applications)
  // ============================================================================
  if (phase === 7) {
    const app = applications[activeApp];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Real-World Applications</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">Pressure Everywhere</h2>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-slate-400">Application {activeApp + 1} of {applications.length}</span>
              <div className="flex gap-1">
                {applications.map((_, idx) => (
                  <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx <= activeApp ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                ))}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {applications.map((a, idx) => {
                const isUnlocked = idx === 0 || completedApps.has(idx - 1);
                const isCompleted = completedApps.has(idx);
                const isCurrent = idx === activeApp;
                return (
                  <button
                    key={a.id}
                    onMouseDown={() => {
                      if (navigationLockRef.current || !isUnlocked) return;
                      navigationLockRef.current = true;
                      setActiveApp(idx);
                      setTimeout(() => { navigationLockRef.current = false; }, 300);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                          : 'bg-slate-800/50 text-slate-400'
                    } ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={isCurrent ? { background: a.color } : {}}
                  >
                    {isCompleted ? '✓' : a.icon} {a.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style={{ background: `${app.color}30` }}>
                  {app.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{app.title}</h3>
                  <p className="text-sm" style={{ color: app.color }}>{app.subtitle}</p>
                </div>
              </div>

              <p className="text-slate-300 mb-4">{app.description}</p>

              <div className="rounded-xl p-4 mb-4 border" style={{ background: `${app.color}15`, borderColor: `${app.color}40` }}>
                <p className="font-semibold mb-1" style={{ color: app.color }}>Physics Connection</p>
                <p className="text-sm text-slate-400">{app.physics}</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700/50">
                <p className="font-semibold text-white mb-1">Key Insight</p>
                <p className="text-sm text-slate-400">{app.insight}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {app.stats.map((stat, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <div className="font-bold" style={{ color: app.color }}>{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Mark as Read Button */}
              {!completedApps.has(activeApp) ? (
                <button
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    playSound('complete');
                    if (activeApp < applications.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-white"
                  style={{ background: app.color }}
                >
                  Mark "{app.title}" as Read
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-semibold text-emerald-400 bg-emerald-500/20 border border-emerald-500 text-center">
                  Completed
                </div>
              )}
            </div>

            {/* Navigation Row */}
            <div className="flex justify-between mt-6">
              {activeApp > 0 ? (
                <button
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setActiveApp(activeApp - 1);
                    setTimeout(() => { navigationLockRef.current = false; }, 300);
                  }}
                  className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Previous
                </button>
              ) : <div />}
              <button
                onMouseDown={() => {
                  if (navigationLockRef.current || completedApps.size < applications.length) return;
                  navigationLockRef.current = true;
                  goToPhase(8);
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
                }}
                disabled={completedApps.size < applications.length}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  completedApps.size >= applications.length
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                Take the Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  if (phase === 8) {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (ans === testQuestions[i].correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

          <ProgressBar />

          <div className="relative pt-20 pb-12 px-4">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="text-7xl mb-4">{passed ? '🎉' : '📚'}</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {passed ? 'Excellent Work!' : 'Keep Learning!'}
              </h2>
              <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalCorrect}/10
              </div>
              <p className="text-slate-400 mb-8">
                {passed ? 'You\'ve mastered pressure!' : 'Review the concepts and try again.'}
              </p>
              <button
                onMouseDown={(e) => { e.preventDefault(); passed ? goNext() : goToPhase(3); }}
                className={`px-8 py-4 rounded-xl font-semibold text-lg ${
                  passed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                }`}
              >
                {passed ? 'Complete!' : 'Review Material'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">Question {testIndex + 1} of 10</span>
              <div className="flex gap-1">
                {testQuestions.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${
                    testAnswers[i] !== null
                      ? testAnswers[i] === testQuestions[i].correct ? 'bg-emerald-500' : 'bg-red-500'
                      : i === testIndex ? 'bg-cyan-400' : 'bg-slate-700'
                  }`} />
                ))}
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-6">{q.question}</h2>

            <div className="flex flex-col gap-3 mb-6">
              {q.options.map((opt, i) => {
                const isSelected = testAnswers[testIndex] === i;
                const isCorrect = i === q.correct;
                const showResult = testAnswers[testIndex] !== null;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (testAnswers[testIndex] === null) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testIndex] = i;
                        setTestAnswers(newAnswers);
                        playSound(i === q.correct ? 'success' : 'failure');
                        emitEvent('test_answered', { questionIndex: testIndex, correct: i === q.correct });
                      }
                    }}
                    className={`p-4 rounded-xl text-left transition-all ${
                      showResult
                        ? isCorrect
                          ? 'bg-emerald-500/20 border-2 border-emerald-500'
                          : isSelected
                            ? 'bg-red-500/20 border-2 border-red-500'
                            : 'bg-slate-800/50 border-2 border-transparent'
                        : isSelected
                          ? 'bg-cyan-500/20 border-2 border-cyan-500'
                          : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
                    }`}
                  >
                    <span className={`font-bold mr-3 ${
                      showResult
                        ? isCorrect ? 'text-emerald-400' : isSelected ? 'text-red-400' : 'text-slate-500'
                        : 'text-cyan-400'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-white">{opt}</span>
                  </button>
                );
              })}
            </div>

            {testAnswers[testIndex] !== null && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-6">
                <p className="font-semibold text-white mb-1">Explanation</p>
                <p className="text-sm text-slate-400">{q.explanation}</p>
              </div>
            )}

            <div className="flex justify-between">
              {testIndex > 0 ? (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setTestIndex(testIndex - 1); }}
                  className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Previous
                </button>
              ) : <div />}
              {testAnswers[testIndex] !== null && (
                testIndex < testQuestions.length - 1 ? (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setTestIndex(testIndex + 1); }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setTestSubmitted(true); }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
                  >
                    See Results
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  if (phase === 9) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center mb-6">
              <span className="text-6xl">🏆</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Pressure Expert!</h1>
            <p className="text-lg text-slate-400 mb-8 max-w-md">
              You now understand why force distribution over area is crucial - from knives to skyscrapers!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: '📍', label: 'P = F/A' },
                { icon: '👠', label: 'Area Matters' },
                { icon: '🤿', label: 'Fluid Pressure' },
              ].map((achievement, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-xs text-slate-400">{achievement.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-8 max-w-md w-full">
              <p className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-2">Key Formula Mastered</p>
              <p className="text-2xl font-bold text-white">Pressure = Force / Area</p>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); onComplete?.(); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg rounded-xl shadow-lg shadow-emerald-500/25"
            >
              Complete Lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </div>
  );
}
