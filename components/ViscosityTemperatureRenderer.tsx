'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
// Gold standard types
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

interface ViscosityTemperatureRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TEST_QUESTIONS = [
  {
    question: 'What happens to the viscosity of most liquids when temperature increases?',
    options: [
      'Viscosity increases (gets thicker)',
      'Viscosity decreases (gets thinner)',
      'Viscosity stays constant',
      'Viscosity becomes unpredictable'
    ],
    correct: 1
  },
  {
    question: 'Why is cold-starting an engine in winter particularly hard on the engine?',
    options: [
      'The battery is weaker in cold weather',
      'Fuel burns inefficiently when cold',
      'Oil is too thick to flow and lubricate properly',
      'Metal parts shrink and jam together'
    ],
    correct: 2
  },
  {
    question: 'What does the "W" in a multi-grade oil like 10W-40 stand for?',
    options: [
      'Weight',
      'Winter (cold viscosity rating)',
      'Warranty',
      'Water resistance'
    ],
    correct: 1
  },
  {
    question: 'Which physical mechanism causes viscosity to decrease with temperature?',
    options: [
      'Molecules evaporate at higher temperatures',
      'Increased molecular motion overcomes intermolecular attractions',
      'The liquid expands and molecules spread apart',
      'Chemical bonds break at high temperatures'
    ],
    correct: 1
  },
  {
    question: 'What is "viscosity index" (VI)?',
    options: [
      'The exact viscosity at a specific temperature',
      'A measure of how much viscosity changes with temperature',
      'The maximum temperature an oil can withstand',
      'The density of the oil'
    ],
    correct: 1
  },
  {
    question: 'Why would honey flow faster when heated?',
    options: [
      'It evaporates and becomes lighter',
      'Sugar crystals dissolve',
      'Higher temperature reduces its viscosity',
      'Heat adds pressure that pushes it out'
    ],
    correct: 2
  },
  {
    question: 'In the Arrhenius equation for viscosity, what happens when temperature doubles?',
    options: [
      'Viscosity exactly doubles',
      'Viscosity decreases by half',
      'Viscosity decreases exponentially (by a large factor)',
      'Viscosity increases exponentially'
    ],
    correct: 2
  },
  {
    question: 'Why are synthetic oils often preferred over conventional oils?',
    options: [
      'They are cheaper to produce',
      'They maintain better viscosity stability across temperature ranges',
      'They change color when worn out',
      'They last forever without changing'
    ],
    correct: 1
  },
  {
    question: 'What type of volcano tends to have more explosive eruptions?',
    options: [
      'Volcanoes with low-viscosity (runny) lava',
      'Volcanoes with high-viscosity (thick) lava',
      'Underwater volcanoes',
      'Volcanoes at higher altitudes'
    ],
    correct: 1
  },
  {
    question: 'Why do injection molding machines heat plastic pellets?',
    options: [
      'To sterilize the plastic',
      'To reduce viscosity so plastic flows into molds',
      'To make the plastic stronger',
      'To change the plastic color'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Engine Lubrication',
    description: 'Motor oil must flow quickly to lubricate engine parts at cold startup, yet maintain enough thickness at operating temperatures (100°C+) to protect against wear.',
    icon: '🚗'
  },
  {
    title: 'Cooking & Food',
    description: 'Butter solidifies when cold but melts and flows when heated. Honey pours slowly from the fridge but quickly when warmed. Understanding this helps in cooking and food processing.',
    icon: '🍯'
  },
  {
    title: 'Volcanic Activity',
    description: 'Lava viscosity determines eruption style. Low-viscosity basaltic lava flows smoothly (Hawaii), while high-viscosity rhyolitic lava traps gas and explodes violently (Mt. St. Helens).',
    icon: '🌋'
  },
  {
    title: 'Plastic Manufacturing',
    description: 'Injection molding heats plastic to reduce viscosity for mold filling. The exact temperature controls flow rate, surface finish, and prevents defects.',
    icon: '🏭'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
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
  } catch {
    // Audio not available
  }
}

// Calculate viscosity based on Arrhenius-like equation
function calculateViscosity(tempCelsius: number): number {
  // Simplified model: viscosity decreases exponentially with temperature
  const baseVisc = 1000; // centipoise at 0°C
  const activationFactor = 0.03;
  return baseVisc * Math.exp(-activationFactor * tempCelsius);
}

// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
const ProgressIndicator: React.FC<{ phases: number[]; currentPhase: number }> = ({ phases, currentPhase }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                index < currentPhase
                  ? 'bg-amber-500 text-white'
                  : index === currentPhase
                  ? 'bg-amber-400 text-white ring-4 ring-amber-400/30'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
            {index < phases.length - 1 && (
              <div
                className={`w-6 h-1 mx-1 rounded ${
                  index < currentPhase ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-slate-400">{phaseLabels[currentPhase]}</p>
    </div>
  );
};

const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}> = ({ children, onMouseDown, variant = 'primary', disabled = false }) => {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onMouseDown(e);
      }}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
        variant === 'primary'
          ? disabled
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:scale-105 active:scale-95'
          : disabled
          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
          : 'bg-slate-700 text-white hover:bg-slate-600 hover:scale-105 active:scale-95'
      }`}
    >
      {children}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION GRAPHICS
// ═══════════════════════════════════════════════════════════════════════════
const EngineGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);
  const [temperature, setTemperature] = useState(20);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
      // Slowly warm up
      setTemperature(t => Math.min(t + 0.5, 100));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const viscosity = calculateViscosity(temperature);
  const oilFlowSpeed = Math.max(1, 10 - viscosity / 50);
  const oilY = (animPhase * oilFlowSpeed) % 80;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="oilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="25" textAnchor="middle" className="fill-white text-sm font-bold">
        Engine Oil Circulation
      </text>

      {/* Engine block outline */}
      <rect x="60" y="50" width="180" height="150" fill="url(#metalGrad)" rx="8" />
      <rect x="70" y="60" width="160" height="130" fill="#334155" rx="4" />

      {/* Pistons */}
      {[0, 1, 2].map(i => {
        const pistonY = 80 + Math.sin((animPhase + i * 67) * 0.1) * 20;
        return (
          <g key={i} transform={`translate(${90 + i * 50}, 0)`}>
            <rect x="0" y={pistonY} width="30" height="40" fill="url(#metalGrad)" rx="2" />
            <rect x="5" y={pistonY + 5} width="20" height="3" fill="#1e293b" />
            <rect x="5" y={pistonY + 15} width="20" height="3" fill="#1e293b" />
          </g>
        );
      })}

      {/* Oil flow animation */}
      <g>
        {/* Oil channel */}
        <rect x="250" y="80" width="15" height="100" fill="#1e293b" />
        {/* Flowing oil droplets */}
        {[0, 20, 40, 60].map((offset, i) => (
          <rect
            key={i}
            x="252"
            y={82 + ((oilY + offset) % 80)}
            width="11"
            height="8"
            fill="url(#oilGrad)"
            rx="4"
            opacity={0.9 - i * 0.15}
          />
        ))}
      </g>

      {/* Oil pan */}
      <path d="M 60 200 L 60 220 Q 60 240, 80 240 L 220 240 Q 240 240, 240 220 L 240 200 Z"
            fill="url(#oilGrad)" />
      <text x="150" y="225" textAnchor="middle" className="fill-amber-200 text-xs">
        Oil Pan
      </text>

      {/* Temperature gauge */}
      <g transform="translate(290, 60)">
        <rect width="90" height="120" fill="#1e293b" rx="8" />
        <text x="45" y="20" textAnchor="middle" className="fill-slate-400 text-xs font-semibold">
          Temperature
        </text>
        <text x="45" y="45" textAnchor="middle" className="fill-amber-400 text-lg font-bold">
          {temperature.toFixed(0)}°C
        </text>

        {/* Thermometer */}
        <rect x="20" y="55" width="50" height="15" fill="#334155" rx="7" />
        <rect
          x="22"
          y="57"
          width={Math.min(46, temperature / 100 * 46)}
          height="11"
          fill={temperature < 40 ? '#3b82f6' : temperature < 70 ? '#22c55e' : '#ef4444'}
          rx="5"
        />

        <text x="45" y="85" textAnchor="middle" className="fill-slate-500 text-xs">
          Viscosity
        </text>
        <text x="45" y="105" textAnchor="middle" className="fill-orange-400 text-sm font-bold">
          {viscosity.toFixed(0)} cP
        </text>
      </g>

      {/* Status */}
      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        {temperature < 40 ? 'Cold start: Thick oil, poor lubrication' :
         temperature < 70 ? 'Warming up: Oil flowing better' :
         'Operating temp: Optimal viscosity for protection'}
      </text>
    </svg>
  );
};

const HoneyGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);
  const [isHeating, setIsHeating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
      if (animPhase === 100) setIsHeating(true);
      if (animPhase === 0) setIsHeating(false);
    }, 50);
    return () => clearInterval(interval);
  }, [animPhase]);

  const temperature = isHeating ? 60 : 20;
  const dripSpeed = isHeating ? 3 : 0.5;
  const dripY = 100 + ((animPhase * dripSpeed) % 100);

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="honeyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="jarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="25" textAnchor="middle" className="fill-white text-sm font-bold">
        Honey Viscosity & Temperature
      </text>

      {/* Comparison boxes */}
      {/* Cold honey */}
      <g transform="translate(40, 45)">
        <rect width="140" height="180" fill="#1e293b" rx="12" />
        <text x="70" y="25" textAnchor="middle" className="fill-blue-400 text-xs font-semibold">
          Cold (20°C)
        </text>

        {/* Jar */}
        <rect x="35" y="40" width="70" height="90" fill="url(#jarGrad)" rx="8" stroke="#94a3b8" strokeWidth="1" />
        <rect x="40" y="45" width="60" height="80" fill="url(#honeyGrad)" rx="6" />

        {/* Slow drip */}
        <ellipse
          cx="70"
          cy={40 + (animPhase * 0.3 % 50)}
          rx="8"
          ry="15"
          fill="url(#honeyGrad)"
          opacity={animPhase % 100 < 50 ? 0.9 : 0}
        />

        <text x="70" y="150" textAnchor="middle" className="fill-slate-400 text-[10px]">
          Thick &amp; slow
        </text>
        <text x="70" y="165" textAnchor="middle" className="fill-blue-300 text-xs font-bold">
          ~10,000 cP
        </text>
      </g>

      {/* Hot honey */}
      <g transform="translate(220, 45)">
        <rect width="140" height="180" fill="#1e293b" rx="12" />
        <text x="70" y="25" textAnchor="middle" className="fill-orange-400 text-xs font-semibold">
          Warm (60°C)
        </text>

        {/* Jar */}
        <rect x="35" y="40" width="70" height="90" fill="url(#jarGrad)" rx="8" stroke="#94a3b8" strokeWidth="1" />
        <rect x="40" y="45" width="60" height="80" fill="url(#honeyGrad)" rx="6" />

        {/* Fast stream */}
        <rect
          x="66"
          y="40"
          width="8"
          height={(animPhase * 2) % 80}
          fill="url(#honeyGrad)"
          rx="4"
        />

        {/* Heat waves */}
        {[0, 1, 2].map(i => (
          <path
            key={i}
            d={`M ${45 + i * 25} 135 Q ${50 + i * 25} ${130 - (animPhase % 20)}, ${55 + i * 25} 135`}
            stroke="#ef4444"
            strokeWidth="2"
            fill="none"
            opacity={0.5}
          />
        ))}

        <text x="70" y="150" textAnchor="middle" className="fill-slate-400 text-[10px]">
          Thin &amp; fast
        </text>
        <text x="70" y="165" textAnchor="middle" className="fill-orange-300 text-xs font-bold">
          ~200 cP
        </text>
      </g>

      {/* Arrow showing relationship */}
      <g transform="translate(170, 235)">
        <path d="M 0 0 L 60 0 L 55 -5 M 60 0 L 55 5" stroke="#f59e0b" strokeWidth="2" fill="none" />
        <text x="30" y="-8" textAnchor="middle" className="fill-amber-400 text-xs">
          +40°C
        </text>
      </g>

      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        Temperature increase → 50× lower viscosity!
      </text>
    </svg>
  );
};

const VolcanoGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 200);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="lavaGradLow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="lavaGradHigh" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <radialGradient id="explosionGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Lava Viscosity &amp; Eruption Style
      </text>

      {/* Shield volcano (low viscosity) */}
      <g transform="translate(20, 50)">
        <text x="85" y="15" textAnchor="middle" className="fill-red-400 text-xs font-semibold">
          Low Viscosity (Basalt)
        </text>

        {/* Gentle slope */}
        <path d="M 10 180 Q 85 100, 160 180" fill="#374151" />
        <path d="M 70 120 L 85 105 L 100 120" fill="#1f2937" />

        {/* Flowing lava */}
        <path
          d={`M 85 105 Q ${80 + Math.sin(animPhase * 0.1) * 5} ${130 + animPhase % 50}, ${60 - animPhase % 30} 180`}
          stroke="url(#lavaGradLow)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 85 105 Q ${90 - Math.sin(animPhase * 0.1) * 5} ${130 + animPhase % 50}, ${110 + animPhase % 30} 180`}
          stroke="url(#lavaGradLow)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        <text x="85" y="200" textAnchor="middle" className="fill-slate-400 text-[10px]">
          Hawaii-type
        </text>
        <text x="85" y="212" textAnchor="middle" className="fill-green-400 text-[10px]">
          Gentle flows
        </text>
      </g>

      {/* Stratovolcano (high viscosity) */}
      <g transform="translate(210, 50)">
        <text x="85" y="15" textAnchor="middle" className="fill-orange-400 text-xs font-semibold">
          High Viscosity (Rhyolite)
        </text>

        {/* Steep cone */}
        <path d="M 30 180 L 85 80 L 140 180 Z" fill="#374151" />
        <path d="M 70 90 L 85 75 L 100 90" fill="#1f2937" />

        {/* Explosion! */}
        {animPhase % 100 < 30 && (
          <g>
            <circle cx="85" cy="70" r={15 + (animPhase % 30)} fill="url(#explosionGrad)" opacity={1 - (animPhase % 30) / 30} />
            {/* Flying debris */}
            {[0, 1, 2, 3, 4].map(i => (
              <circle
                key={i}
                cx={85 + Math.cos(i * 1.2) * (animPhase % 30) * 2}
                cy={70 - (animPhase % 30) * 2 + Math.sin(i * 1.5) * 20}
                r="4"
                fill="#ef4444"
                opacity={1 - (animPhase % 30) / 30}
              />
            ))}
          </g>
        )}

        {/* Thick lava dome */}
        <ellipse cx="85" cy="85" rx="15" ry="8" fill="url(#lavaGradHigh)" />

        <text x="85" y="200" textAnchor="middle" className="fill-slate-400 text-[10px]">
          Mt. St. Helens-type
        </text>
        <text x="85" y="212" textAnchor="middle" className="fill-red-400 text-[10px]">
          Explosive!
        </text>
      </g>

      {/* Explanation */}
      <g transform="translate(50, 235)">
        <rect width="300" height="35" fill="#1e293b" rx="6" />
        <text x="150" y="15" textAnchor="middle" className="fill-slate-300 text-[10px]">
          High-viscosity lava traps gas → pressure builds → BOOM!
        </text>
        <text x="150" y="28" textAnchor="middle" className="fill-slate-500 text-[9px]">
          Low-viscosity lava lets gas escape gently
        </text>
      </g>
    </svg>
  );
};

const PlasticGraphic: React.FC = () => {
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 150);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const injectionProgress = Math.min(animPhase, 100);
  const isCooling = animPhase > 100;

  return (
    <svg viewBox="0 0 400 280" className="w-full h-64">
      <defs>
        <linearGradient id="plasticHot" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="plasticCool" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="steelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="280" fill="#0f172a" />

      {/* Title */}
      <text x="200" y="22" textAnchor="middle" className="fill-white text-sm font-bold">
        Injection Molding Process
      </text>

      {/* Hopper with pellets */}
      <g transform="translate(30, 40)">
        <path d="M 15 0 L 0 30 L 30 30 Z" fill="url(#steelGrad)" />
        {/* Pellets */}
        {[0, 1, 2, 3, 4].map(i => (
          <circle
            key={i}
            cx={10 + (i % 2) * 10}
            cy={10 + Math.floor(i / 2) * 8}
            r="4"
            fill="#3b82f6"
          />
        ))}
      </g>

      {/* Barrel with heaters */}
      <g transform="translate(30, 70)">
        <rect width="150" height="40" fill="url(#steelGrad)" rx="4" />

        {/* Heater bands */}
        {[0, 1, 2, 3].map(i => (
          <rect
            key={i}
            x={10 + i * 35}
            y="-5"
            width="25"
            height="50"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            rx="4"
          />
        ))}

        {/* Screw inside */}
        <rect x="5" y="15" width="140" height="10" fill="#475569" rx="5" />

        {/* Melting plastic */}
        <rect
          x="10"
          y="17"
          width={Math.min(130, animPhase * 1.3)}
          height="6"
          fill={isCooling ? 'url(#plasticCool)' : 'url(#plasticHot)'}
          rx="3"
        />

        {/* Temperature labels */}
        <text x="25" y="55" className="fill-red-400 text-[8px]">
          200°C
        </text>
        <text x="60" y="55" className="fill-red-400 text-[8px]">
          220°C
        </text>
        <text x="95" y="55" className="fill-red-400 text-[8px]">
          240°C
        </text>
        <text x="125" y="55" className="fill-red-400 text-[8px]">
          250°C
        </text>
      </g>

      {/* Nozzle */}
      <g transform="translate(180, 75)">
        <polygon points="0,5 0,25 30,15" fill="url(#steelGrad)" />
      </g>

      {/* Mold */}
      <g transform="translate(210, 50)">
        <rect width="150" height="80" fill="url(#steelGrad)" rx="8" />
        {/* Mold cavity (cup shape) */}
        <path d="M 20 15 L 20 65 L 130 65 L 130 15 Q 75 25, 20 15 Z" fill="#1e293b" />

        {/* Filling plastic */}
        {injectionProgress > 0 && (
          <path
            d={`M 20 65 L 20 ${65 - injectionProgress * 0.5} L 130 ${65 - injectionProgress * 0.5} L 130 65 Z`}
            fill={isCooling ? 'url(#plasticCool)' : 'url(#plasticHot)'}
          />
        )}

        <text x="75" y="95" textAnchor="middle" className="fill-slate-400 text-xs">
          Mold
        </text>
      </g>

      {/* Process steps */}
      <g transform="translate(30, 160)">
        <rect width="340" height="80" fill="#1e293b" rx="8" />

        {/* Step 1 */}
        <g transform="translate(15, 10)">
          <circle cx="15" cy="20" r="12" fill={animPhase < 30 ? '#f59e0b' : '#475569'} />
          <text x="15" y="24" textAnchor="middle" className="fill-white text-xs font-bold">1</text>
          <text x="15" y="50" textAnchor="middle" className="fill-slate-400 text-[9px]">Heat</text>
          <text x="15" y="60" textAnchor="middle" className="fill-slate-500 text-[8px]">↓ viscosity</text>
        </g>

        {/* Step 2 */}
        <g transform="translate(100, 10)">
          <circle cx="15" cy="20" r="12" fill={animPhase >= 30 && animPhase < 100 ? '#f59e0b' : '#475569'} />
          <text x="15" y="24" textAnchor="middle" className="fill-white text-xs font-bold">2</text>
          <text x="15" y="50" textAnchor="middle" className="fill-slate-400 text-[9px]">Inject</text>
          <text x="15" y="60" textAnchor="middle" className="fill-slate-500 text-[8px]">flows easy</text>
        </g>

        {/* Step 3 */}
        <g transform="translate(185, 10)">
          <circle cx="15" cy="20" r="12" fill={animPhase >= 100 ? '#3b82f6' : '#475569'} />
          <text x="15" y="24" textAnchor="middle" className="fill-white text-xs font-bold">3</text>
          <text x="15" y="50" textAnchor="middle" className="fill-slate-400 text-[9px]">Cool</text>
          <text x="15" y="60" textAnchor="middle" className="fill-slate-500 text-[8px]">↑ viscosity</text>
        </g>

        {/* Step 4 */}
        <g transform="translate(270, 10)">
          <circle cx="15" cy="20" r="12" fill={animPhase >= 140 ? '#22c55e' : '#475569'} />
          <text x="15" y="24" textAnchor="middle" className="fill-white text-xs font-bold">4</text>
          <text x="15" y="50" textAnchor="middle" className="fill-slate-400 text-[9px]">Eject</text>
          <text x="15" y="60" textAnchor="middle" className="fill-slate-500 text-[8px]">solid part</text>
        </g>
      </g>

      <text x="200" y="268" textAnchor="middle" className="fill-slate-400 text-xs">
        Precise temperature control = perfect viscosity for quality parts
      </text>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ViscosityTemperatureRenderer({ onGameEvent, currentPhase, onPhaseComplete }: ViscosityTemperatureRendererProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [showTestResults, setShowTestResults] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [temperature, setTemperature] = useState(0);
  const [oilType, setOilType] = useState<'conventional' | 'multigrade'>('conventional');

  // CRITICAL: Navigation debouncing refs
  const navigationLockRef = useRef(false);

  // Mobile detection
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // ─── Navigation (CRITICAL PATTERN) ─────────────────────────────────────────
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [onPhaseComplete, onGameEvent]);

  const nextPhase = useCallback(() => {
    if (phase < 9) {
      goToPhase(phase + 1);
    }
  }, [phase, goToPhase]);

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handlePrediction = useCallback((id: string) => {
    playSound('click');
    setPrediction(id);
  }, []);

  const handleTwistPrediction = useCallback((id: string) => {
    playSound('click');
    setTwistPrediction(id);
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    playSound(answerIndex === TEST_QUESTIONS[questionIndex].correct ? 'success' : 'failure');
  }, [testAnswers]);

  const handleAppComplete = useCallback((index: number) => {
    playSound('click');
    setCompletedApps(prev => new Set([...prev, index]));
  }, []);

  // ─── Report Event ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (onEvent) {
      onEvent({
        type: phase === 'mastery' ? 'completion' : 'interaction',
        phase,
        data: { prediction, twistPrediction, testAnswers: [...testAnswers], completedApps: [...completedApps] }
      });
    }
  }, [phase, prediction, twistPrediction, testAnswers, completedApps, onEvent]);

  // ─── Phase Renderers ───────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Premium Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-amber-400/80 text-sm font-medium tracking-wide uppercase">Fluid Mechanics</span>
      </div>

      {/* Gradient Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
        The Cold Engine Mystery
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8">
        Why does temperature change how liquids flow?
      </p>

      {/* Premium Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 max-w-lg border border-slate-700/50 shadow-2xl">
        <div className="text-6xl mb-6">🚗</div>
        <p className="text-xl text-slate-300 mb-6">
          On a freezing winter morning, your car struggles to start. The mechanic says &quot;let it warm up first.&quot;
        </p>
        <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
          <p className="text-lg text-amber-400 font-semibold mb-2">
            Why does temperature matter so much for engine oil?
          </p>
          <p className="text-slate-400">
            Discover how temperature transforms liquid behavior!
          </p>
        </div>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(e); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold rounded-2xl hover:from-amber-400 hover:to-orange-400 transition-all duration-300 shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          Find Out Why
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="text-slate-500 text-sm mt-4">
        Tap to explore viscosity and temperature
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Make Your Prediction
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        What happens to motor oil&apos;s viscosity as it heats up from cold to operating temperature?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'thicker', label: 'It gets thicker (higher viscosity)' },
          { id: 'thinner', label: 'It gets thinner (lower viscosity)' },
          { id: 'same', label: 'It stays exactly the same' },
          { id: 'solid', label: 'It solidifies into a gel' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              prediction === option.id
                ? 'bg-amber-500/20 border-2 border-amber-500 text-white'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase} disabled={!prediction}>
          Test Your Prediction →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderPlay = () => {
    const viscosity = calculateViscosity(temperature);
    const flowSpeed = Math.max(0.5, 5 - viscosity / 100);

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Temperature vs Viscosity
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 250" className="w-full h-56">
            <rect width="400" height="250" fill="#0f172a" />

            {/* Thermometer */}
            <g transform="translate(40, 30)">
              <rect x="10" y="0" width="30" height="180" fill="#334155" rx="15" />
              <rect x="15" y={180 - temperature * 1.6} width="20" height={temperature * 1.6} fill={
                temperature < 30 ? '#3b82f6' : temperature < 60 ? '#22c55e' : '#ef4444'
              } rx="10" />
              <circle cx="25" cy="180" r="20" fill={
                temperature < 30 ? '#3b82f6' : temperature < 60 ? '#22c55e' : '#ef4444'
              } />
              <text x="25" y="210" textAnchor="middle" className="fill-white text-sm font-bold">
                {temperature}°C
              </text>
            </g>

            {/* Oil container */}
            <g transform="translate(120, 40)">
              <rect width="100" height="150" fill="#334155" rx="8" stroke="#475569" strokeWidth="2" />
              <rect x="5" y="5" width="90" height="140" fill="#78350f" rx="6" />

              {/* Oil ripples based on viscosity */}
              {[0, 1, 2].map(i => (
                <ellipse
                  key={i}
                  cx="50"
                  cy={50 + i * 30}
                  rx={30 + flowSpeed * 5}
                  ry={5 + flowSpeed}
                  fill="none"
                  stroke="#92400e"
                  strokeWidth="2"
                  opacity={0.5}
                />
              ))}

              <text x="50" y="170" textAnchor="middle" className="fill-amber-200 text-xs">
                Motor Oil
              </text>
            </g>

            {/* Viscosity meter */}
            <g transform="translate(260, 40)">
              <rect width="120" height="150" fill="#1e293b" rx="8" />
              <text x="60" y="25" textAnchor="middle" className="fill-slate-400 text-xs font-semibold">
                Viscosity
              </text>

              {/* Bar */}
              <rect x="20" y="40" width="80" height="80" fill="#334155" rx="4" />
              <rect
                x="25"
                y={120 - Math.min(70, viscosity / 10)}
                width="70"
                height={Math.min(70, viscosity / 10)}
                fill={viscosity > 500 ? '#ef4444' : viscosity > 200 ? '#f59e0b' : '#22c55e'}
                rx="3"
              />

              <text x="60" y="140" textAnchor="middle" className="fill-amber-400 text-lg font-bold">
                {viscosity.toFixed(0)} cP
              </text>
            </g>

            {/* Flow indicator */}
            <text x="200" y="230" textAnchor="middle" className="fill-slate-400 text-xs">
              {temperature < 20 ? 'Very thick - struggles to flow' :
               temperature < 50 ? 'Getting thinner - flows better' :
               temperature < 80 ? 'Thin - flows easily' :
               'Very thin - may be too thin for protection!'}
            </text>
          </svg>
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 mb-2 text-center">
            Adjust Temperature: {temperature}°C
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full h-3 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Cold (0°C)</span>
            <span>Room temp</span>
            <span>Operating (100°C)</span>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-center">
            As temperature increases, oil viscosity <strong className="text-amber-400">decreases dramatically</strong>.
            {temperature > 80 && ' Be careful - too thin and it won\'t protect the engine!'}
          </p>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onMouseDown={nextPhase}>
            Understand Why →
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        The Science Revealed
      </h2>

      {prediction === 'thinner' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Excellent prediction!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: It gets thinner as temperature increases!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">🔬 Molecular Motion</h3>
          <p className="text-slate-300">
            At higher temperatures, molecules move faster. This extra kinetic energy helps them
            overcome the <strong>intermolecular attractions</strong> that make liquids viscous.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">📐 The Arrhenius Equation</h3>
          <p className="text-slate-300">
            η = A × e<sup>(E/RT)</sup> — Viscosity decreases <strong>exponentially</strong> with temperature.
            Double the temperature? Viscosity drops by much more than half!
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ The Engine Dilemma</h3>
          <p className="text-slate-300">
            Cold oil is too thick to flow and protect. Hot oil might be too thin.
            Engineers need oil that works across <strong>all temperatures</strong>!
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase}>
          See the Solution →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        🔄 The Twist: Multi-Grade Oils
      </h2>
      <p className="text-slate-300 mb-6 text-center">
        What if we could make an oil that doesn&apos;t thin out as much when heated?
        What might multi-grade oils like &quot;10W-40&quot; do differently?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'constant', label: 'Maintain exactly the same viscosity at all temperatures' },
          { id: 'reduce_change', label: 'Reduce how much viscosity changes with temperature' },
          { id: 'thicken_hot', label: 'Get thicker when hot instead of thinner' },
          { id: 'freeze', label: 'Freeze at high temperatures to protect the engine' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleTwistPrediction(option.id);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              twistPrediction === option.id
                ? 'bg-orange-500/20 border-2 border-orange-500 text-white'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase} disabled={!twistPrediction}>
          See How It Works →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTwistPlay = () => {
    const tempC = temperature;
    const convViscosity = calculateViscosity(tempC);
    // Multi-grade oil has a higher viscosity index - less change with temperature
    const multiViscosity = 300 * Math.exp(-0.015 * tempC);

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Conventional vs Multi-Grade Oil
        </h2>

        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <svg viewBox="0 0 400 250" className="w-full h-56">
            <rect width="400" height="250" fill="#0f172a" />

            {/* Graph axes */}
            <line x1="60" y1="200" x2="360" y2="200" stroke="#475569" strokeWidth="2" />
            <line x1="60" y1="30" x2="60" y2="200" stroke="#475569" strokeWidth="2" />

            {/* Labels */}
            <text x="210" y="230" textAnchor="middle" className="fill-slate-400 text-xs">
              Temperature (°C)
            </text>
            <text x="25" y="115" textAnchor="middle" className="fill-slate-400 text-xs" transform="rotate(-90, 25, 115)">
              Viscosity (cP)
            </text>

            {/* X-axis markers */}
            {[0, 25, 50, 75, 100].map((t, i) => (
              <text key={i} x={60 + i * 75} y="215" textAnchor="middle" className="fill-slate-500 text-xs">
                {t}°
              </text>
            ))}

            {/* Conventional oil curve (steep drop) */}
            <path
              d="M 60 40 Q 100 50, 135 80 Q 200 140, 280 180 Q 320 190, 360 195"
              stroke="#ef4444"
              strokeWidth="3"
              fill="none"
            />

            {/* Multi-grade oil curve (gentler drop) */}
            <path
              d="M 60 70 Q 120 85, 180 110 Q 240 130, 300 155 Q 340 165, 360 170"
              stroke="#22c55e"
              strokeWidth="3"
              fill="none"
            />

            {/* Current temperature line */}
            <line
              x1={60 + temperature * 3}
              y1="30"
              x2={60 + temperature * 3}
              y2="200"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="4"
            />

            {/* Legend */}
            <g transform="translate(240, 40)">
              <rect width="110" height="50" fill="#1e293b" rx="6" />
              <line x1="10" y1="18" x2="30" y2="18" stroke="#ef4444" strokeWidth="3" />
              <text x="38" y="22" className="fill-slate-300 text-xs">Conventional</text>
              <line x1="10" y1="38" x2="30" y2="38" stroke="#22c55e" strokeWidth="3" />
              <text x="38" y="42" className="fill-slate-300 text-xs">Multi-grade</text>
            </g>

            {/* Current values */}
            <g transform="translate(70, 35)">
              <rect width="140" height="55" fill="#1e293b" rx="6" />
              <text x="10" y="18" className="fill-slate-400 text-xs">At {temperature}°C:</text>
              <text x="10" y="35" className="fill-red-400 text-xs">Conv: {convViscosity.toFixed(0)} cP</text>
              <text x="10" y="50" className="fill-green-400 text-xs">Multi: {multiViscosity.toFixed(0)} cP</text>
            </g>
          </svg>
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 mb-2 text-center">
            Temperature: {temperature}°C
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full h-3 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-red-500/10 rounded-xl p-3 text-center">
            <p className="text-red-400 font-semibold">Conventional</p>
            <p className="text-2xl font-bold text-red-300">{convViscosity.toFixed(0)} cP</p>
            <p className="text-xs text-slate-400">Changes a lot</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <p className="text-green-400 font-semibold">Multi-Grade</p>
            <p className="text-2xl font-bold text-green-300">{multiViscosity.toFixed(0)} cP</p>
            <p className="text-xs text-slate-400">More stable</p>
          </div>
        </div>

        <div className="flex justify-center">
          <PrimaryButton onMouseDown={nextPhase}>
            Learn the Secret →
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Viscosity Index Improvers
      </h2>

      {twistPrediction === 'reduce_change' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold">✓ Exactly right!</p>
        </div>
      ) : (
        <div className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-6">
          <p className="text-amber-400">The answer: They reduce how much viscosity changes!</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">🧪 Polymer Additives</h3>
          <p className="text-slate-300">
            Multi-grade oils contain long-chain polymers that <strong>coil up when cold</strong>
            (low resistance) but <strong>expand when hot</strong> (more resistance), compensating
            for the natural viscosity drop.
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2">📊 The 10W-40 Rating</h3>
          <p className="text-slate-300">
            <strong>10W</strong> = Behaves like 10-weight oil when cold (Winter)
            <br />
            <strong>40</strong> = Behaves like 40-weight oil when hot
            <br />
            Best of both worlds!
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-green-400 mb-2">✅ Benefits</h3>
          <ul className="text-slate-300 space-y-1">
            <li>• Easier cold starts (thinner when cold)</li>
            <li>• Better protection at operating temp (thick enough when hot)</li>
            <li>• Year-round usability</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-center">
        <PrimaryButton onMouseDown={nextPhase}>
          Real-World Applications →
        </PrimaryButton>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const appGraphics = [
      <EngineGraphic key="engine" />,
      <HoneyGraphic key="honey" />,
      <VolcanoGraphic key="volcano" />,
      <PlasticGraphic key="plastic" />
    ];

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Real-World Applications
        </h2>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TRANSFER_APPS.map((app, index) => (
            <button
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppTab(index);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeAppTab === index
                  ? 'bg-amber-500 text-white'
                  : completedApps.has(index)
                  ? 'bg-green-600/20 text-green-400 border border-green-600'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{app.icon}</span>
              <span className="text-sm font-medium">{app.title}</span>
              {completedApps.has(index) && <span>✓</span>}
            </button>
          ))}
        </div>

        {/* Active application content */}
        <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{TRANSFER_APPS[activeAppTab].icon}</span>
            <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
          </div>

          <p className="text-slate-300 mb-4">{TRANSFER_APPS[activeAppTab].description}</p>

          {/* Application graphic */}
          <div className="bg-slate-900 rounded-xl overflow-hidden mb-4">
            {appGraphics[activeAppTab]}
          </div>

          {!completedApps.has(activeAppTab) && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleAppComplete(activeAppTab);
              }}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
            >
              Mark as Understood ✓
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="text-center mb-6">
          <p className="text-slate-400">
            Completed: {completedApps.size} / {TRANSFER_APPS.length}
          </p>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedApps.size / TRANSFER_APPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <PrimaryButton
            onMouseDown={nextPhase}
            disabled={completedApps.size < TRANSFER_APPS.length}
          >
            {completedApps.size < TRANSFER_APPS.length
              ? `Complete all ${TRANSFER_APPS.length} applications to continue`
              : 'Take the Knowledge Test →'}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const score = testAnswers.reduce((acc, answer, index) =>
      answer === TEST_QUESTIONS[index].correct ? acc + 1 : acc, 0
    );
    const allAnswered = testAnswers.every(a => a !== -1);
    const passed = score >= 7;

    if (showTestResults) {
      return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Test Results
          </h2>

          <div className={`text-center p-8 rounded-xl mb-6 ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
            <p className={`text-3xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {score} / {TEST_QUESTIONS.length}
            </p>
            <p className="text-slate-300 mt-2">
              {passed ? 'Congratulations! You passed!' : 'Keep learning! You need 70% to pass.'}
            </p>
          </div>

          {/* Review answers */}
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {TEST_QUESTIONS.map((q, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  testAnswers[index] === q.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <p className="text-sm text-slate-300">Q{index + 1}: {q.question}</p>
                <p className={`text-xs mt-1 ${
                  testAnswers[index] === q.correct ? 'text-green-400' : 'text-red-400'
                }`}>
                  {testAnswers[index] === q.correct ? '✓ Correct' : `✗ Correct: ${q.options[q.correct]}`}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            {passed ? (
              <PrimaryButton onMouseDown={nextPhase}>
                Complete Mastery →
              </PrimaryButton>
            ) : (
              <PrimaryButton onMouseDown={() => {
                setTestAnswers(Array(10).fill(-1));
                setShowTestResults(false);
              }}>
                Try Again
              </PrimaryButton>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          Knowledge Test
        </h2>
        <p className="text-slate-400 text-center mb-6">
          Answer all 10 questions (70% to pass)
        </p>

        <div className="space-y-6 max-h-96 overflow-y-auto mb-6">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? testAnswers[qIndex] === q.correct
                          ? 'bg-green-500/20 border border-green-500 text-green-300'
                          : 'bg-red-500/20 border border-red-500 text-red-300'
                        : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <PrimaryButton
            onMouseDown={() => setShowTestResults(true)}
            disabled={!allAnswered}
          >
            {allAnswered ? 'Submit Answers' : `Answer all questions (${testAnswers.filter(a => a !== -1).length}/${TEST_QUESTIONS.length})`}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
      <div className="text-7xl mb-6">🏆</div>
      <h1 className="text-3xl font-bold text-white mb-4">
        Viscosity-Temperature Master!
      </h1>
      <p className="text-xl text-slate-300 mb-6">
        You now understand why temperature transforms liquid behavior!
      </p>

      <div className="bg-slate-700/30 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Key Takeaways</h3>
        <ul className="text-left text-slate-300 space-y-2">
          <li>• Viscosity decreases exponentially with temperature</li>
          <li>• Increased molecular motion overcomes intermolecular forces</li>
          <li>• Multi-grade oils use polymers to stabilize viscosity</li>
          <li>• Temperature control is critical in engineering applications</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-amber-400">4</p>
          <p className="text-sm text-slate-400">Applications Mastered</p>
        </div>
        <div className="bg-orange-500/20 rounded-xl p-4">
          <p className="text-3xl font-bold text-orange-400">10</p>
          <p className="text-sm text-slate-400">Questions Completed</p>
        </div>
      </div>

      <p className="text-slate-400 text-sm">
        Next time you warm up your car or heat honey, you&apos;ll know the physics!
      </p>
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />

      {/* Premium Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Viscosity & Temperature</span>
          <div className="flex gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-amber-400 w-6' : phase > p ? 'bg-amber-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 pt-16 pb-8 px-6">
        <div className="max-w-2xl mx-auto">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
