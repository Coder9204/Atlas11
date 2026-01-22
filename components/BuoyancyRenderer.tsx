'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// BUOYANCY RENDERER - PREMIUM PHYSICS GAME
// Apparent Weight: Why you feel lighter in water
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

interface BuoyancyRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// Real-World Applications Data
const applications = [
  {
    id: 'ships',
    icon: '🚢',
    title: 'Ship Design',
    subtitle: 'Naval Architecture',
    color: '#3B82F6',
    description: 'A massive steel ship floats because its hull displaces an enormous volume of water. The key is shape, not material - the same steel rolled into a ball would sink immediately.',
    physics: 'Ships are designed so total weight < buoyant force. A ship\'s "displacement" refers to the weight of water it pushes aside, which equals its own weight when floating.',
    insight: 'The Plimsoll line on ships marks the maximum safe loading depth. In denser saltwater, ships float higher, so load limits differ by water type.',
    stats: [
      { value: '228k tons', label: 'Largest Ship' },
      { value: '400m', label: 'Symphony Length' },
      { value: '1.025', label: 'Seawater ρ' },
    ],
  },
  {
    id: 'submarines',
    icon: '🛥️',
    title: 'Submarine Control',
    subtitle: 'Underwater Engineering',
    color: '#06B6D4',
    description: 'Submarines control depth by adjusting buoyancy using ballast tanks. Fill tanks with water to dive (heavier), pump out water to surface (lighter).',
    physics: 'At neutral buoyancy, weight exactly equals buoyant force. Submarines fine-tune with trim tanks and can hover at any depth. Compressed air systems evacuate ballast for emergency surfacing.',
    insight: 'Modern submarines can dive to 600+ meters. The crush depth depends on hull strength vs. water pressure (which increases by 1 atm per 10m).',
    stats: [
      { value: '600m', label: 'Max Depth' },
      { value: '240', label: 'Days Submerged' },
      { value: '25 knots', label: 'Speed' },
    ],
  },
  {
    id: 'hotair',
    icon: '🎈',
    title: 'Hot Air Balloons',
    subtitle: 'Atmospheric Buoyancy',
    color: '#F59E0B',
    description: 'Hot air balloons use buoyancy in air! Heating air inside the balloon makes it less dense than surrounding cool air, creating an upward buoyant force.',
    physics: 'Same principle as water: F_buoyancy = ρ_air × V × g. Hot air (100°C) has ρ ≈ 0.95 kg/m³ vs cold air at 1.2 kg/m³. A 2800 m³ balloon can lift ~600 kg.',
    insight: 'Altitude control is through temperature - burn propane to rise, let air cool to descend. Morning flights are best due to stable, cool air conditions.',
    stats: [
      { value: '2800 m³', label: 'Envelope Vol' },
      { value: '100°C', label: 'Hot Air Temp' },
      { value: '600 kg', label: 'Lift Capacity' },
    ],
  },
  {
    id: 'swimming',
    icon: '🏊',
    title: 'Swimming & Diving',
    subtitle: 'Human Buoyancy',
    color: '#10B981',
    description: 'Your body\'s density is very close to water (~1.06 vs 1.0 g/cm³). Lungs full of air = you float. Exhale = you sink. Body fat affects buoyancy significantly.',
    physics: 'Average human floats with lungs inflated (total ρ < 1.0). Divers use weight belts to achieve neutral buoyancy underwater. Wetsuits add buoyancy (air bubbles in neoprene).',
    insight: 'In the Dead Sea (ρ = 1.24 g/cm³), you can\'t sink even if you try! The extreme salt content makes the water 24% denser than fresh water.',
    stats: [
      { value: '1.06', label: 'Human ρ' },
      { value: '1.24', label: 'Dead Sea ρ' },
      { value: '3%', label: 'Body Fat Diff' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A 5 kg object displaces 3 liters of water when fully submerged. What is the buoyant force? (g = 10 m/s²)',
    options: ['50 N', '30 N', '20 N', '15 N'],
    correct: 1,
    explanation: 'F_b = ρ_water × V × g = 1000 × 0.003 × 10 = 30 N',
  },
  {
    question: 'An object floats with 40% of its volume above water. What is its density relative to water?',
    options: ['0.4', '0.6', '1.0', '1.4'],
    correct: 1,
    explanation: 'If 40% above, 60% below. At equilibrium, ρ_object/ρ_water = fraction submerged = 0.6',
  },
  {
    question: 'A steel ship floats but a steel ball sinks. Why?',
    options: ['Ship steel is lighter', 'Ship shape displaces more water', 'Water pressure is different', 'Ships have special coatings'],
    correct: 1,
    explanation: 'The hollow ship shape displaces much more water than a ball of the same mass, creating greater buoyant force.',
  },
  {
    question: 'What happens to a floating object if you move it from fresh water (ρ=1.0) to salt water (ρ=1.025)?',
    options: ['Sinks lower', 'Floats higher', 'No change', 'Depends on object density'],
    correct: 1,
    explanation: 'Denser water provides more buoyant force per volume displaced, so less volume needs to be submerged.',
  },
  {
    question: 'A submarine wants to dive deeper. It should:',
    options: ['Pump air into ballast tanks', 'Pump water into ballast tanks', 'Heat the hull', 'Spin its propeller faster'],
    correct: 1,
    explanation: 'Adding water increases weight without changing volume, making weight > buoyant force, so it sinks.',
  },
  {
    question: 'A 60 kg person feels they weigh only 6 kg in a swimming pool. The buoyant force is:',
    options: ['60 N', '540 N', '600 N', '6 N'],
    correct: 1,
    explanation: 'Apparent weight = True weight - Buoyant force. 60 - 540 = 6 N apparent, so F_b = 540 N.',
  },
  {
    question: 'Two objects have the same mass. Object A floats, Object B sinks. Which has greater volume?',
    options: ['Object A', 'Object B', 'They have equal volume', 'Cannot determine'],
    correct: 0,
    explanation: 'Same mass but A floats means A has lower density, therefore greater volume (ρ = m/V).',
  },
  {
    question: 'A hot air balloon rises because:',
    options: ['Hot air is lighter than cold air', 'Heat creates upward convection', 'Fire produces lift gas', 'Thermal radiation pushes up'],
    correct: 0,
    explanation: 'Hot air has lower density than surrounding cold air, creating buoyancy in the atmosphere.',
  },
  {
    question: 'An ice cube floats with 90% of its volume underwater. When it melts, the water level:',
    options: ['Rises', 'Falls', 'Stays exactly the same', 'Depends on temperature'],
    correct: 2,
    explanation: 'The melted ice takes exactly the same volume as the water it was displacing while floating.',
  },
  {
    question: 'Archimedes\' principle states that buoyant force equals:',
    options: ['Weight of submerged object', 'Weight of displaced fluid', 'Volume of object × density of object', 'Pressure × surface area'],
    correct: 1,
    explanation: 'Buoyant force = weight of the fluid displaced by the submerged part of the object.',
  },
];

export default function BuoyancyRenderer({ onComplete, onGameEvent, currentPhase, onPhaseComplete }: BuoyancyRendererProps) {
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
  const [objectMass, setObjectMass] = useState(5); // kg
  const [objectVolume, setObjectVolume] = useState(6); // liters
  const [waterDensity, setWaterDensity] = useState(1.0); // g/cm³ = kg/L
  const [submersionDepth, setSubmersionDepth] = useState(0); // 0-100%
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation ref
  const animationRef = useRef<number | null>(null);

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
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' = 'click') => {
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

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
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


  // Calculate buoyancy values
  const calculateBuoyancy = useCallback(() => {
    const g = 10; // m/s²
    const volumeM3 = objectVolume / 1000; // liters to m³
    const densityKgM3 = waterDensity * 1000; // g/cm³ to kg/m³

    const weight = objectMass * g; // N
    const maxBuoyancy = densityKgM3 * volumeM3 * g; // N (fully submerged)
    const currentBuoyancy = maxBuoyancy * (submersionDepth / 100);

    const objectDensity = objectMass / objectVolume; // kg/L
    const floats = objectDensity < waterDensity;
    const equilibriumSubmersion = floats ? (objectDensity / waterDensity) * 100 : 100;

    const apparentWeight = weight - currentBuoyancy;

    return {
      weight,
      maxBuoyancy,
      currentBuoyancy,
      apparentWeight,
      objectDensity,
      floats,
      equilibriumSubmersion,
    };
  }, [objectMass, objectVolume, waterDensity, submersionDepth]);

  // Animation to equilibrium
  const animateToEquilibrium = useCallback(() => {
    const values = calculateBuoyancy();
    const targetSubmersion = Math.min(100, values.equilibriumSubmersion);

    setIsAnimating(true);

    let current = 0;
    const animate = () => {
      current += 2;
      const progress = Math.min(current / 50, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setSubmersionDepth(targetSubmersion * eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    setSubmersionDepth(0);
    animationRef.current = requestAnimationFrame(animate);
  }, [calculateBuoyancy]);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Water tank visualization
  const WaterTankVisualization = () => {
    const values = calculateBuoyancy();
    const objectTop = 20 + (100 - submersionDepth) * 0.6; // Object position in tank
    const waterTop = 80; // Water line at 80 from top

    return (
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        {/* Tank SVG */}
        <svg
          viewBox="0 0 300 200"
          className="w-full rounded-lg"
          style={{
            height: isMobile ? 180 : 220,
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f13 100%)',
          }}
        >
          {/* Tank walls */}
          <rect x="50" y="20" width="200" height="160" fill="none" stroke="#374151" strokeWidth="3" rx="5" />

          {/* Water */}
          <rect x="52" y={waterTop} width="196" height="98" fill="rgba(59, 130, 246, 0.2)" />

          {/* Water surface line */}
          <line x1="52" y1={waterTop} x2="248" y2={waterTop} stroke="#3B82F6" strokeWidth="2" strokeDasharray="4,2" />

          {/* Object (box) */}
          <g transform={`translate(125, ${objectTop})`}>
            <rect
              x="0"
              y="0"
              width="50"
              height="50"
              rx="5"
              fill={values.floats ? '#10B981' : '#EF4444'}
              opacity="0.8"
            />
            <text x="25" y="30" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold">
              {objectMass}kg
            </text>
          </g>

          {/* Force arrows */}
          {/* Weight (down) */}
          <g transform={`translate(200, ${objectTop + 25})`}>
            <line x1="0" y1="0" x2="0" y2="30" stroke="#EF4444" strokeWidth="3" />
            <polygon points="-5,25 5,25 0,35" fill="#EF4444" />
            <text x="15" y="20" fill="#EF4444" fontSize="10">W={values.weight.toFixed(0)}N</text>
          </g>

          {/* Buoyancy (up) - only show when in water */}
          {submersionDepth > 0 && (
            <g transform={`translate(100, ${objectTop + 25})`}>
              <line x1="0" y1="30" x2="0" y2="0" stroke="#06B6D4" strokeWidth="3" />
              <polygon points="-5,5 5,5 0,-5" fill="#06B6D4" />
              <text x="-40" y="20" fill="#06B6D4" fontSize="10">F_b={values.currentBuoyancy.toFixed(0)}N</text>
            </g>
          )}

          {/* Labels */}
          <text x="150" y="15" textAnchor="middle" fill="#9CA3AF" fontSize="11">
            {values.floats ? '✓ Floats' : '✗ Sinks'} | ρ_obj = {values.objectDensity.toFixed(2)} kg/L
          </text>
          <text x="260" y={waterTop + 5} fill="#3B82F6" fontSize="10">ρ={waterDensity}</text>
        </svg>

        {/* Force comparison bars */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-red-400">Weight</span>
              <span className="text-xs font-medium text-red-400">{values.weight.toFixed(0)}N</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(values.weight / Math.max(values.weight, values.maxBuoyancy)) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-cyan-400">Buoyancy</span>
              <span className="text-xs font-medium text-cyan-400">{values.currentBuoyancy.toFixed(0)}N</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-100"
                style={{ width: `${(values.currentBuoyancy / Math.max(values.weight, values.maxBuoyancy)) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-blue-400">Apparent</span>
              <span className="text-xs font-medium text-blue-400">{values.apparentWeight.toFixed(0)}N</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${Math.max(0, (values.apparentWeight / values.weight) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Why Do You Feel Lighter in Water?
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        A 70kg person feels like they weigh only 7kg in a pool. Where does the other 63kg go?
      </p>

      {/* Visual Preview */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="text-5xl mb-3">🧍</div>
            <div className="text-2xl font-bold text-red-400">70 kg</div>
            <div className="text-sm text-slate-400">On land</div>
          </div>
          <div className="text-3xl text-slate-500">→</div>
          <div className="text-center">
            <div className="text-5xl mb-3">🏊</div>
            <div className="text-2xl font-bold text-cyan-400">7 kg</div>
            <div className="text-sm text-slate-400">In water</div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Why
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 0, label: 'Water supports weight', icon: '💧', description: 'Water pushes up against you' },
      { id: 1, label: 'Gravity is weaker in water', icon: '🌍', description: 'Water blocks some gravity' },
      { id: 2, label: 'Body becomes less dense', icon: '🎈', description: 'Water makes you expand' },
      { id: 3, label: 'It\'s an illusion', icon: '🪄', description: 'You actually weigh the same' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Question */}
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2 block">
              YOUR PREDICTION
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              Why do you feel lighter when standing in water?
            </h2>
            <p className="text-slate-400">
              What causes your apparent weight to decrease?
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  prediction === p.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{p.icon}</span>
                <div>
                  <div className={`font-semibold ${prediction === p.id ? 'text-cyan-400' : 'text-white'}`}>
                    {p.label}
                  </div>
                  <div className="text-sm text-slate-400">
                    {p.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => goToPhase(2)}
              disabled={prediction === null}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                prediction !== null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Experiment →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPlay = () => {
    const values = calculateBuoyancy();

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2 block">
              BUOYANCY LAB
            </span>
            <h2 className="text-2xl font-bold text-white mb-1">
              Sink or Float?
            </h2>
            <p className="text-slate-400">
              Adjust the object's properties and see what happens
            </p>
          </div>

          {/* Visualization */}
          <WaterTankVisualization />

          {/* Controls */}
          <div className={`grid gap-3 mt-4 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {/* Mass */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-red-400">Mass</span>
                <span className="text-lg font-bold text-white">{objectMass} kg</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={objectMass}
                onChange={(e) => setObjectMass(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            {/* Volume */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-cyan-400">Volume</span>
                <span className="text-lg font-bold text-white">{objectVolume} L</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={objectVolume}
                onChange={(e) => setObjectVolume(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Drop button */}
          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={animateToEquilibrium}
              disabled={isAnimating}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                isAnimating
                  ? 'bg-slate-700 text-slate-400 cursor-default'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              {isAnimating ? 'Dropping...' : '💧 Drop in Water'}
            </button>
            <button
              onClick={() => setSubmersionDepth(0)}
              className="px-6 py-3 rounded-xl font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ↺ Reset
            </button>
          </div>

          {/* Density comparison */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
            <div className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3">
              DENSITY COMPARISON
            </div>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className={`text-2xl font-bold ${values.floats ? 'text-emerald-400' : 'text-red-400'}`}>
                  {values.objectDensity.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">Object (kg/L)</div>
              </div>
              <div className={`text-3xl font-bold ${values.floats ? 'text-emerald-400' : 'text-red-400'}`}>
                {values.floats ? '<' : '>'}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{waterDensity.toFixed(2)}</div>
                <div className="text-xs text-slate-400">Water (kg/L)</div>
              </div>
            </div>
            <div className={`text-center mt-3 font-semibold ${values.floats ? 'text-emerald-400' : 'text-red-400'}`}>
              {values.floats ? '✓ Object floats!' : '✗ Object sinks!'}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Continue to Review →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => {
    const userWasRight = prediction === 0;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Result */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {userWasRight ? '🎯' : '💧'}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {userWasRight ? 'Exactly Right!' : 'The Water Pushes Up!'}
            </h2>
            <p className="text-slate-400">
              Archimedes discovered this over 2000 years ago
            </p>
          </div>

          {/* Core Concept */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Archimedes' Principle
            </h3>

            <div className="bg-slate-900/60 rounded-lg p-4 text-center mb-4">
              <p className="text-xl font-bold text-cyan-400 mb-1">
                F<sub>buoyancy</sub> = ρ<sub>fluid</sub> × V × g
              </p>
              <p className="text-sm text-slate-400">
                Buoyant force = Weight of displaced fluid
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-red-400 mb-1">Weight ↓</div>
                <div className="text-sm text-slate-400">Gravity pulls down</div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-cyan-400 mb-1">Buoyancy ↑</div>
                <div className="text-sm text-slate-400">Water pushes up</div>
              </div>
            </div>
          </div>

          {/* Apparent Weight Explanation */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
            <p className="text-cyan-400 font-semibold mb-2">
              📊 Apparent Weight Formula
            </p>
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Apparent Weight = True Weight - Buoyant Force</strong>
              <br /><br />
              For a 70kg person (700N) displacing 63L of water:
              <br />
              Apparent = 700N - 630N = <strong className="text-cyan-400">70N (≈7kg)</strong>
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Try a Twist →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 0, label: 'Float higher in saltwater', icon: '⬆️', description: 'Less of you is submerged' },
      { id: 1, label: 'Float lower in saltwater', icon: '⬇️', description: 'More of you is submerged' },
      { id: 2, label: 'Float the same', icon: '⚖️', description: 'Salt doesn\'t affect floating' },
      { id: 3, label: 'Sink in saltwater', icon: '🫧', description: 'Salt makes water too heavy' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Twist Introduction */}
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-2 block">
              🔄 TWIST SCENARIO
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              Fresh Water vs Salt Water
            </h2>
            <p className="text-slate-400">
              If you float in a fresh water pool, what happens when you go to the ocean (saltwater)?
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {twistOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTwistPrediction(opt.id)}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  twistPrediction === opt.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <div className={`font-semibold ${twistPrediction === opt.id ? 'text-amber-400' : 'text-white'}`}>
                    {opt.label}
                  </div>
                  <div className="text-sm text-slate-400">
                    {opt.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={twistPrediction === null}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                twistPrediction !== null
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Test It →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistPlay = () => {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-2 block">
              TWIST EXPERIMENT
            </span>
            <h2 className="text-2xl font-bold text-white">
              Change Water Density
            </h2>
          </div>

          {/* Visualization */}
          <WaterTankVisualization />

          {/* Water density slider */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mt-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-blue-400">
                🧂 Water Density
              </span>
              <span className="text-xl font-bold text-blue-400">
                {waterDensity.toFixed(2)} kg/L
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.25"
              step="0.01"
              value={waterDensity}
              onChange={(e) => {
                setWaterDensity(Number(e.target.value));
                setSubmersionDepth(0);
              }}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-400">Fresh (1.00)</span>
              <span className="text-xs text-cyan-400">Ocean (1.025)</span>
              <span className="text-xs text-amber-400">Dead Sea (1.24)</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 justify-center flex-wrap mb-4">
            {[
              { label: 'Fresh Water', value: 1.0 },
              { label: 'Ocean', value: 1.025 },
              { label: 'Dead Sea', value: 1.24 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setWaterDensity(preset.value);
                  setSubmersionDepth(0);
                }}
                className={`px-5 py-2 rounded-lg font-semibold transition-all border-2 ${
                  waterDensity === preset.value
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Drop button */}
          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={animateToEquilibrium}
              disabled={isAnimating}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                isAnimating
                  ? 'bg-slate-700 text-slate-400 cursor-default'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              {isAnimating ? 'Dropping...' : '💧 Drop in Water'}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              See the Insight →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => {
    const userWasRight = twistPrediction === 0;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Result */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {userWasRight ? '🎯' : '⬆️'}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-amber-400'}`}>
              {userWasRight ? 'Correct!' : 'You Float Higher in Denser Water!'}
            </h2>
          </div>

          {/* Core Insight */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Why Denser Water = Less Submersion
            </h3>

            <div className="bg-slate-900/60 rounded-lg p-4 text-center mb-4">
              <p className="text-cyan-400">
                Each liter of denser water provides MORE buoyant force
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-white">Fresh Water</div>
                <div className="text-slate-400">ρ = 1.0 kg/L</div>
                <div className="text-xs text-slate-500 mt-2">
                  More submersion needed
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-amber-400">Dead Sea</div>
                <div className="text-slate-400">ρ = 1.24 kg/L</div>
                <div className="text-xs text-slate-500 mt-2">
                  Float nearly on top!
                </div>
              </div>
            </div>
          </div>

          {/* Fun Fact */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-amber-400 font-semibold mb-2">
              🌊 Fun Fact: The Dead Sea
            </p>
            <p className="text-slate-300 text-sm">
              The Dead Sea is so salty (34% salinity vs ocean's 3.5%) that it's nearly impossible to swim normally - you just bob on the surface like a cork! Reading a newspaper while floating is a popular tourist activity.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Real World Applications →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTransfer = () => {
    const app = applications[activeApp];
    const allRead = completedApps.size >= applications.length;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-sm text-slate-400">
              {completedApps.size} of {applications.length} applications read
            </span>
            <div className="flex gap-1.5">
              {applications.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 flex-wrap justify-center">
            {applications.map((a, i) => {
              const isUnlocked = i === 0 || completedApps.has(i - 1);
              const isCompleted = completedApps.has(i);
              return (
                <button
                  key={a.id}
                  onMouseDown={() => {
                    const now = Date.now();
                    if (now - lastClickRef.current < 200) return;
                    if (navigationLockRef.current || !isUnlocked) return;
                    lastClickRef.current = now;
                    navigationLockRef.current = true;
                    setActiveApp(i);
                    setTimeout(() => { navigationLockRef.current = false; }, 300);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    activeApp === i
                      ? 'text-white'
                      : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                  style={activeApp === i ? { background: a.color } : undefined}
                  disabled={!isUnlocked}
                >
                  {isCompleted ? '✓' : a.icon} {a.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ background: `${app.color}20` }}
              >
                {app.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{app.title}</h2>
                <p className="text-sm font-medium" style={{ color: app.color }}>{app.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-300 mb-4 leading-relaxed">{app.description}</p>

            {/* Physics Connection */}
            <div
              className="rounded-lg p-4 mb-4 border"
              style={{ background: `${app.color}10`, borderColor: `${app.color}30` }}
            >
              <p className="font-semibold mb-1" style={{ color: app.color }}>🔗 Physics Connection</p>
              <p className="text-sm text-slate-300">{app.physics}</p>
            </div>

            {/* Insight */}
            <div className="bg-slate-900/60 rounded-lg p-4 mb-4 border border-slate-700/50">
              <p className="font-semibold text-white mb-1">💡 Key Insight</p>
              <p className="text-sm text-slate-400">{app.insight}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {app.stats.map((stat, i) => (
                <div key={i} className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold" style={{ color: app.color }}>{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mark as Read Button */}
            {!completedApps.has(activeApp) ? (
              <button
                onMouseDown={() => {
                  const now = Date.now();
                  if (now - lastClickRef.current < 200) return;
                  if (navigationLockRef.current) return;
                  lastClickRef.current = now;
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
                className="w-full py-3 rounded-lg font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
              >
                ✓ Mark "{app.title}" as Read
              </button>
            ) : (
              <div className="w-full py-3 rounded-lg font-semibold text-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                ✓ Completed
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => goToPhase(8)}
              disabled={!allRead}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                allRead
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Take the Quiz →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (ans === testQuestions[i].correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-4">{passed ? '🎉' : '📚'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalCorrect}/10
            </div>
            <p className="text-slate-400 mb-8">
              {passed ? 'You\'ve mastered buoyancy!' : 'Review the concepts and try again.'}
            </p>
            <button
              onClick={() => passed ? goNext() : goToPhase(3)}
              className={`px-8 py-4 rounded-xl font-semibold text-lg ${
                passed
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
              }`}
            >
              {passed ? 'Complete! →' : 'Review Material'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Question Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
              QUESTION {testIndex + 1} OF 10
            </span>
            <div className="flex gap-1">
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    testAnswers[i] !== null
                      ? testAnswers[i] === testQuestions[i].correct ? 'bg-emerald-500' : 'bg-red-500'
                      : i === testIndex ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">
            {q.question}
          </h2>

          {/* Options */}
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
                      emitEvent('test_answered', { questionIndex: testIndex, correct: i === q.correct });
                    }
                  }}
                  className={`p-4 rounded-xl text-left transition-all border-2 ${
                    showResult
                      ? isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500'
                        : isSelected
                          ? 'bg-red-500/10 border-red-500'
                          : 'bg-slate-800/50 border-slate-700'
                      : isSelected
                        ? 'bg-cyan-500/10 border-cyan-500'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
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

          {/* Explanation (after answer) */}
          {testAnswers[testIndex] !== null && (
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
              <p className="font-semibold text-white mb-1">💡 Explanation</p>
              <p className="text-sm text-slate-400">{q.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            {testIndex > 0 ? (
              <button
                onClick={() => setTestIndex(testIndex - 1)}
                className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                ← Previous
              </button>
            ) : <div />}
            {testAnswers[testIndex] !== null && (
              testIndex < testQuestions.length - 1 ? (
                <button
                  onClick={() => setTestIndex(testIndex + 1)}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  onClick={() => setTestSubmitted(true)}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  See Results →
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-12 text-center">
      <div className="max-w-md">
        {/* Trophy */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center mx-auto mb-8 text-6xl">
          🏆
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Buoyancy Master!
        </h1>

        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          You now understand why things float or sink - from ships to submarines to hot air balloons!
        </p>

        {/* Achievements */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '🚢', label: 'Float/Sink' },
            { icon: '🧂', label: 'Density' },
            { icon: '⬆️', label: 'Archimedes' },
          ].map((achievement, i) => (
            <div key={i} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <div className="text-xs text-slate-400">{achievement.label}</div>
            </div>
          ))}
        </div>

        {/* Key Formula */}
        <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-8">
          <p className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-3">
            KEY FORMULA MASTERED
          </p>
          <p className="text-xl font-bold text-white">
            F<sub>buoyancy</sub> = ρ<sub>fluid</sub> × V × g
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => emitEvent('mastery_achieved', { game: 'buoyancy' })}
          className="px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          Complete Lesson 🎉
        </button>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Buoyancy</span>
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

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
