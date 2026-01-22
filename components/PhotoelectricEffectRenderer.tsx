'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// PHOTOELECTRIC EFFECT RENDERER - Premium Apple/Airbnb Design
// ============================================================================

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

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook',
  1: 'Predict',
  2: 'Lab',
  3: 'Review',
  4: 'Twist Predict',
  5: 'Twist Lab',
  6: 'Twist Review',
  7: 'Transfer',
  8: 'Test',
  9: 'Mastery'
};

interface PhotoelectricEffectRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const PhotoelectricEffectRenderer: React.FC<PhotoelectricEffectRendererProps> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // Navigation lock - prevents double-clicks
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Phase state
  const [phase, setPhase] = useState<number>(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) return currentPhase;
    return 0;
  });

  // Sync phase with external prop
  useEffect(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) {
      setPhase(currentPhase);
    }
  }, [currentPhase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [wavelength, setWavelength] = useState(400); // nm
  const [intensity, setIntensity] = useState(70); // %
  const [workFunction, setWorkFunction] = useState(2.3); // eV (Sodium)
  const [hasExperimented, setHasExperimented] = useState(false);
  const [hasTestedIntensity, setHasTestedIntensity] = useState(false);
  const [guidedMode, setGuidedMode] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Test state
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Transfer state - sequential navigation with completedApps
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Animation refs
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Physics constants
  const h = 4.136e-15; // Planck's constant in eV·s
  const c = 3e8; // Speed of light in m/s

  // Calculated values
  const photonEnergy = (h * c) / (wavelength * 1e-9);
  const maxKE = Math.max(0, photonEnergy - workFunction);
  const emissionOccurs = photonEnergy >= workFunction;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.05;
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

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

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Debounced navigation
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    if (!PHASES.includes(newPhase)) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) goToPhase(PHASES[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex > 0) goToPhase(PHASES[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Wavelength to visible color
  const wavelengthToColor = (wl: number): string => {
    if (wl < 380) return '#a78bfa'; // UV - purple
    if (wl < 450) return '#3b82f6'; // Blue
    if (wl < 495) return '#06b6d4'; // Cyan
    if (wl < 570) return '#22c55e'; // Green
    if (wl < 590) return '#eab308'; // Yellow
    if (wl < 620) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  // Test questions - 10 comprehensive questions
  const testQuestions = [
    { q: 'Red light shines on a metal surface but no electrons escape. You switch to blue light of the same intensity. What happens?', opts: ['Still no electrons - color doesn\'t matter', 'Electrons are emitted because blue has higher frequency', 'Same number of electrons, but slower', 'Cannot determine without knowing the metal'], correct: 1, explain: 'Blue light has higher frequency, meaning each photon carries more energy (E = hf). If blue photon energy exceeds the work function, electrons will be emitted even though red couldn\'t do it.' },
    { q: 'You double the intensity of UV light hitting a metal surface. How does this affect the ejected electrons?', opts: ['Electrons move twice as fast', 'Twice as many electrons are emitted at the same speed', 'No change at all', 'Electrons have more kinetic energy'], correct: 1, explain: 'Doubling intensity means twice as many photons per second. Each photon can eject one electron, so you get twice as many electrons. But each photon has the same energy (E = hf), so electron speed is unchanged.' },
    { q: 'Einstein won the 1921 Nobel Prize for explaining the photoelectric effect. What was his key insight?', opts: ['Light travels in waves like water', 'Light consists of discrete packets called photons', 'Electrons have wave properties', 'Energy is continuously distributed'], correct: 1, explain: 'Einstein proposed that light energy comes in discrete quanta (photons), each with energy E = hf. This explained why only frequency (not intensity) determines whether electrons can escape.' },
    { q: 'Metal A has work function 2.0 eV. Metal B has work function 4.5 eV. You shine 3.0 eV photons on both. What happens?', opts: ['Both metals emit electrons', 'Neither metal emits electrons', 'Only Metal A emits electrons', 'Only Metal B emits electrons'], correct: 2, explain: 'Electrons escape only when photon energy exceeds work function. For Metal A: 3.0 > 2.0 eV (emission). For Metal B: 3.0 < 4.5 eV (no emission). Metal A emits electrons with 1.0 eV kinetic energy.' },
    { q: 'Classical physics predicted that brighter light should eject faster electrons. Why was this prediction wrong?', opts: ['Light doesn\'t interact with electrons', 'Energy comes in discrete packets, not continuous waves', 'Metals absorb all light energy as heat', 'Electrons are too heavy to accelerate'], correct: 1, explain: 'Classical wave theory assumed energy accumulates continuously, so brighter = more total energy = faster electrons. But light comes in photons with fixed energy E = hf. More photons (brighter) gives more electrons, but each photon\'s energy depends only on frequency.' },
    { q: 'The maximum kinetic energy of ejected electrons is measured as 1.5 eV. The metal\'s work function is 2.3 eV. What was the photon energy?', opts: ['0.8 eV', '2.3 eV', '3.8 eV', '1.5 eV'], correct: 2, explain: 'Using Einstein\'s equation: E_photon = Work Function + KE_max. So E_photon = 2.3 + 1.5 = 3.8 eV. The photon energy minus work function equals the leftover kinetic energy.' },
    { q: 'Why do solar cells need photons with energy greater than the semiconductor\'s band gap?', opts: ['To heat up the material', 'To free electrons from bound states', 'To make the cell vibrate', 'To change the cell\'s color'], correct: 1, explain: 'Just like the photoelectric effect, electrons in solar cells need enough energy to escape their bound states. The band gap is analogous to the work function - photons with less energy cannot free electrons.' },
    { q: 'Night vision devices amplify starlight using the photoelectric effect. How do they work?', opts: ['They heat up the light', 'One photon triggers a cascade of electrons', 'They slow down light', 'They change infrared to visible'], correct: 1, explain: 'Photomultiplier tubes use the photoelectric effect: one photon releases one electron, which is accelerated and releases more electrons on impact, creating a cascade that amplifies the original signal millions of times.' },
    { q: 'The threshold frequency for a certain metal is 5 x 10^14 Hz. What happens if you shine light at 6 x 10^14 Hz?', opts: ['No emission - frequency too high', 'Electrons are emitted with kinetic energy', 'Light passes through the metal', 'Electrons are absorbed'], correct: 1, explain: 'Since 6 x 10^14 Hz > threshold of 5 x 10^14 Hz, each photon has enough energy to exceed the work function. Electrons will be emitted, and the excess energy (E_photon - Work Function) becomes kinetic energy.' },
    { q: 'In a digital camera sensor, what determines how bright each pixel appears?', opts: ['The color of light hitting it', 'The number of photons hitting that pixel', 'The temperature of the sensor', 'The size of the camera'], correct: 1, explain: 'Each photon hitting a pixel can free one electron (if it has enough energy). More photons = more freed electrons = stronger electrical signal = brighter pixel in the final image.' }
  ];

  // Real-world applications - 4 detailed applications
  const applications = [
    {
      icon: '☀️',
      title: 'Solar Cells',
      description: 'Photovoltaic cells convert sunlight directly into electricity using the photoelectric effect. When photons with energy greater than the semiconductor\'s band gap hit the cell, they free electrons that flow as electrical current.',
      details: [
        'Silicon band gap: 1.1 eV (requires wavelength < 1100nm)',
        'Photons with less energy pass through without absorption',
        'Multi-junction cells use different band gaps to capture more spectrum',
        'Global solar capacity exceeded 1 terawatt in 2022'
      ],
      stat: '1+ Terawatt global capacity',
      color: 'amber'
    },
    {
      icon: '📷',
      title: 'Digital Camera Sensors',
      description: 'CCD and CMOS sensors are arrays of photoelectric cells. Each pixel converts incoming photons into electrons, measuring light intensity across millions of points to create digital images.',
      details: [
        'Each pixel is a tiny photodiode (photoelectric cell)',
        'More photons = more electrons = brighter pixel',
        'Color filters (Bayer pattern) separate R, G, B channels',
        'Low-light performance depends on quantum efficiency'
      ],
      stat: '200+ Megapixel sensors',
      color: 'violet'
    },
    {
      icon: '🌙',
      title: 'Night Vision',
      description: 'Photomultiplier tubes amplify tiny amounts of starlight by cascading the photoelectric effect. One photon releases one electron, which triggers more electrons in a chain reaction, amplifying light up to 50,000x.',
      details: [
        'Photocathode converts photons to electrons',
        'Microchannel plate multiplies electrons exponentially',
        'Each stage multiplies electron count 10-100x',
        'Gen 3+ devices can see in starlight only'
      ],
      stat: '50,000x light amplification',
      color: 'emerald'
    },
    {
      icon: '🚪',
      title: 'Light Sensors',
      description: 'Automatic doors, elevator safety systems, and industrial automation use photoelectric sensors. When you break a light beam, fewer photons reach the detector, triggering the response.',
      details: [
        'Emitter sends infrared or visible light beam',
        'Receiver detects beam using photoelectric effect',
        'Broken beam = fewer photons = signal change',
        'Response time: milliseconds or faster'
      ],
      stat: 'Used in 5M+ automatic doors',
      color: 'yellow'
    }
  ];

  // Metal options for experiments
  const metals = [
    { name: 'Sodium', workFunction: 2.3 },
    { name: 'Calcium', workFunction: 3.0 },
    { name: 'Zinc', workFunction: 4.3 },
    { name: 'Copper', workFunction: 4.7 },
    { name: 'Platinum', workFunction: 5.6 }
  ];

  // ============ PROGRESS BAR COMPONENT ============
  const ProgressBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
        <span className="text-sm font-semibold text-white/80 tracking-wide">Photoelectric Effect</span>
        <div className="flex items-center gap-1.5">
          {PHASES.map((p) => (
            <button
              key={p}
              onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                phase === p
                  ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                  : phase > p
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-700 w-2 hover:bg-slate-600'
              }`}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
      </div>
    </div>
  );

  // Photoelectric lab visualization
  const renderPhotoelectricLab = () => {
    const lightColor = wavelengthToColor(wavelength);
    const numPhotons = Math.floor(intensity / 12);
    const numElectrons = emissionOccurs ? numPhotons : 0;

    return (
      <svg viewBox="0 0 600 320" className="w-full h-full max-h-80">
        <defs>
          <linearGradient id="metalPlate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="30%" stopColor="#a8a29e" />
            <stop offset="60%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#57534e" />
          </linearGradient>
          <radialGradient id="photonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={lightColor} stopOpacity="1" />
            <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="electronGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
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

        {/* Background */}
        <rect width="600" height="320" fill="#0a0a12" />

        {/* Title */}
        <text x="300" y="28" textAnchor="middle" className="text-sm font-bold fill-white">
          Photoelectric Effect Simulator
        </text>

        {/* Vacuum chamber */}
        <rect x="60" y="50" width="480" height="220" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <text x="300" y="68" textAnchor="middle" className="text-xs font-semibold fill-slate-500 uppercase tracking-widest">
          Vacuum Chamber
        </text>

        {/* Light source */}
        <g transform="translate(100, 160)">
          <rect x="-20" y="-50" width="40" height="100" rx="6" fill="#374151" stroke="#4b5563" strokeWidth="2" />
          <circle cx="0" cy="0" r="18" fill={lightColor} filter="url(#glow)" opacity="0.9">
            <animate attributeName="r" values="16;20;16" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="8" fill="white" />
          <text x="0" y="70" textAnchor="middle" className="text-xs font-semibold fill-slate-400">
            Light Source
          </text>
          <text x="0" y="85" textAnchor="middle" className="text-xs font-bold" fill={lightColor}>
            {wavelength} nm
          </text>
        </g>

        {/* Photon beam */}
        <g opacity={intensity / 100}>
          {Array.from({ length: numPhotons }).map((_, i) => {
            const progress = ((timeRef.current * 50 + i * 30) % 240) / 240;
            const x = 140 + progress * 240;
            const y = 130 + i * 10 + Math.sin(progress * Math.PI * 3) * 5;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill="url(#photonGlow)" />
                <circle cx={x} cy={y} r="3" fill={lightColor} />
                <path
                  d={`M ${x-20},${y} Q ${x-10},${y-6} ${x},${y} Q ${x+10},${y+6} ${x+20},${y}`}
                  fill="none" stroke={lightColor} strokeWidth="1.5" opacity="0.5"
                />
              </g>
            );
          })}
        </g>

        {/* Metal plate */}
        <g transform="translate(390, 90)">
          <rect x="0" y="0" width="30" height="140" rx="4" fill="url(#metalPlate)" stroke="#a8a29e" strokeWidth="1" />
          {Array.from({ length: 10 }).map((_, i) => (
            <circle key={i} cx="15" cy={10 + i * 13} r="4" fill="#57534e" opacity="0.5" />
          ))}
          <text x="15" y="160" textAnchor="middle" className="text-xs font-semibold fill-slate-400">
            {metals.find(m => m.workFunction === workFunction)?.name || 'Metal'}
          </text>
          <text x="15" y="175" textAnchor="middle" className="text-xs fill-amber-500">
            Φ = {workFunction} eV
          </text>
        </g>

        {/* Ejected electrons */}
        {emissionOccurs && (
          <g filter="url(#glow)">
            {Array.from({ length: numElectrons }).map((_, i) => {
              const baseProgress = ((timeRef.current * 40 + i * 25) % 180) / 180;
              const delay = 0.55;
              if (baseProgress < delay) return null;
              const progress = (baseProgress - delay) / (1 - delay);
              const speed = Math.sqrt(maxKE) * 0.7 + 0.3;
              const x = 430 + progress * speed * 100;
              const y = 130 + i * 10 + Math.sin(progress * Math.PI * 2) * 8;
              if (x > 530) return null;
              return (
                <g key={`e-${i}`}>
                  <circle cx={x} cy={y} r="7" fill="url(#electronGlow)" />
                  <circle cx={x} cy={y} r="3" fill="#38bdf8" />
                  <text x={x} y={y + 2} textAnchor="middle" className="text-xs font-bold fill-slate-900" style={{ fontSize: '6px' }}>
                    e-
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* No emission indicator */}
        {!emissionOccurs && (
          <g transform="translate(480, 160)">
            <rect x="-45" y="-25" width="90" height="50" rx="8" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
            <text x="0" y="-5" textAnchor="middle" className="text-xs font-bold fill-red-500">
              NO EMISSION
            </text>
            <text x="0" y="12" textAnchor="middle" className="text-xs fill-red-300" style={{ fontSize: '9px' }}>
              E_photon &lt; Φ
            </text>
          </g>
        )}

        {/* Energy comparison panel */}
        <g transform="translate(80, 280)">
          <rect x="-15" y="-15" width="240" height="50" rx="8" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
          <rect x="0" y="0" width={Math.min(photonEnergy * 20, 100)} height="12" rx="2" fill="#f59e0b" />
          <text x="105" y="10" className="text-xs font-semibold fill-amber-500">
            E_photon = {photonEnergy.toFixed(2)} eV
          </text>
          <line x1={workFunction * 20} y1="-5" x2={workFunction * 20} y2="20" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />
          <text x={workFunction * 20 + 3} y="26" className="fill-red-500" style={{ fontSize: '8px' }}>
            Φ = {workFunction} eV
          </text>
        </g>

        {/* KE indicator */}
        {emissionOccurs && (
          <g transform="translate(480, 280)">
            <rect x="-50" y="-15" width="100" height="50" rx="8" fill="#052e16" stroke="#22c55e" strokeWidth="1" />
            <text x="0" y="2" textAnchor="middle" className="text-xs font-bold fill-emerald-500">
              KE_max
            </text>
            <text x="0" y="18" textAnchor="middle" className="text-sm font-extrabold fill-emerald-500">
              {maxKE.toFixed(2)} eV
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ============ PHASE RENDERS ============

  // HOOK PHASE
  if (phase === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        {/* Premium background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/3 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
          </div>

          {/* Icon */}
          <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} rounded-full bg-gradient-to-br from-amber-500 to-violet-500 flex items-center justify-center mb-7 shadow-lg shadow-amber-500/20`}>
            <span className={`${isMobile ? 'text-4xl' : 'text-5xl'}`}>💡</span>
          </div>

          {/* Nobel badge */}
          <div className="px-6 py-3 rounded-full bg-amber-950/50 border border-amber-500/30 mb-5">
            <span className="text-sm font-semibold text-amber-400">Nobel Prize in Physics 1921</span>
          </div>

          <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-extrabold mb-4 tracking-tight bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent`}>
            The Photoelectric Effect
          </h1>

          <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-400 mb-3 max-w-md leading-relaxed`}>
            Einstein called it{' '}
            <span className="text-amber-400 font-bold">"the most revolutionary discovery in physics"</span>
          </p>

          <p className="text-base text-slate-500 mb-9 max-w-sm">
            Discover why light knocking electrons off metal proved that light is made of particles...
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-3 gap-3 max-w-md w-full mb-9">
            {[
              { icon: '🔬', label: 'Light Lab' },
              { icon: '⚡', label: 'Photon Energy' },
              { icon: '🏆', label: 'Nobel Discovery' },
            ].map((item, i) => (
              <div key={i} className="py-4 px-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs font-semibold text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>

          {/* AI Coach toggle */}
          <div className="flex items-center gap-3 mb-7 px-5 py-3 rounded-full bg-slate-800/50 border border-slate-700/50">
            <span className="text-sm text-slate-400">AI Coach</span>
            <button
              onMouseDown={(e) => { e.preventDefault(); setGuidedMode(!guidedMode); }}
              className={`relative w-12 h-6 rounded-full transition-colors ${guidedMode ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${guidedMode ? 'left-6' : 'left-0.5'}`} />
            </button>
            <span className={`text-sm font-semibold ${guidedMode ? 'text-emerald-400' : 'text-slate-500'}`}>
              {guidedMode ? 'ON' : 'OFF'}
            </span>
          </div>

          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
            className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              Begin Experiment
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          <p className="text-sm text-slate-500 mt-5">
            ~5 minutes - Interactive quantum physics lab
          </p>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 1) {
    const options = [
      { id: 'brighter', label: 'Brighter light ejects faster electrons', desc: 'More light energy = more electron energy', icon: '☀️' },
      { id: 'color', label: 'Light color determines electron speed', desc: 'Frequency matters more than brightness', icon: '🌈' },
      { id: 'both', label: 'Both brightness and color matter', desc: 'Energy accumulates from both factors', icon: '⚖️' },
      { id: 'neither', label: 'Light cannot eject electrons', desc: 'Not enough energy in visible light', icon: '❌' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-20 pb-12 px-6">
          <div className="max-w-xl mx-auto">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
              Step 2 - Make Your Prediction
            </p>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold mb-3 tracking-tight`}>
              What makes electrons fly out faster?
            </h2>
            <p className="text-base text-slate-400 mb-7 leading-relaxed">
              When light hits a metal surface, electrons can be knocked free. What do you think determines how fast they fly out?
            </p>

            <div className="space-y-3">
              {options.map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPrediction(opt.id);
                    emitEvent('prediction_made', { prediction: opt.id });
                  }}
                  className={`flex items-center gap-4 w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    prediction === opt.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                    prediction === opt.id ? 'bg-amber-500' : 'bg-slate-700'
                  }`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${prediction === opt.id ? 'text-amber-400' : 'text-white'}`}>
                      {opt.label}
                    </p>
                    <p className="text-sm text-slate-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (prediction) goNext(); }}
                disabled={!prediction}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  prediction
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                Test Your Prediction →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAY PHASE (Lab)
  if (phase === 2) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-16">
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-[calc(100vh-4rem)]`}>
            {/* Visualization */}
            <div className={`${isMobile ? 'h-72' : 'flex-1'} p-4 flex items-center justify-center`}>
              {renderPhotoelectricLab()}
            </div>

            {/* Controls */}
            <div className={`${isMobile ? 'flex-1' : 'w-72'} p-5 bg-slate-900/50 ${isMobile ? 'border-t' : 'border-l'} border-slate-800/50 overflow-auto`}>
              {/* Wavelength slider */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
                  Wavelength (λ)
                </label>
                <input
                  type="range"
                  min="200"
                  max="700"
                  value={wavelength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setWavelength(val);
                    setHasExperimented(true);
                    emitEvent('parameter_changed', { wavelength: val });
                  }}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>UV (200nm)</span>
                  <span className="font-bold" style={{ color: wavelengthToColor(wavelength) }}>{wavelength} nm</span>
                  <span>Red (700nm)</span>
                </div>
              </div>

              {/* Metal selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Metal Type
                </label>
                <select
                  value={workFunction}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setWorkFunction(val);
                    emitEvent('parameter_changed', { workFunction: val });
                  }}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white"
                >
                  {metals.map(m => (
                    <option key={m.name} value={m.workFunction}>
                      {m.name} (Φ = {m.workFunction} eV)
                    </option>
                  ))}
                </select>
              </div>

              {/* Results panel */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Results</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Photon Energy:</span>
                    <span className="text-sm font-bold text-amber-400">{photonEnergy.toFixed(2)} eV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Work Function:</span>
                    <span className="text-sm font-bold text-red-400">{workFunction} eV</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between">
                    <span className="text-sm text-slate-400">Electron KE:</span>
                    <span className={`text-sm font-bold ${emissionOccurs ? 'text-emerald-400' : 'text-red-400'}`}>
                      {emissionOccurs ? `${maxKE.toFixed(2)} eV` : 'No emission'}
                    </span>
                  </div>
                </div>
              </div>

              {guidedMode && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-slate-400">
                    💡 Try adjusting wavelength to find the threshold where electrons start/stop being emitted!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (hasExperimented) goNext(); }}
                disabled={!hasExperimented}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  hasExperimented
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                See What Happened →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 3) {
    const concepts = [
      {
        icon: '⚡',
        title: 'Photon Energy = hf',
        desc: 'Each photon carries energy proportional to its frequency. Higher frequency (bluer light) = more energy per photon.',
        color: 'amber',
      },
      {
        icon: '🚧',
        title: 'Work Function Barrier',
        desc: 'Electrons are bound to the metal with minimum energy Φ. Photons must have energy ≥ Φ to free electrons.',
        color: 'red',
      },
      {
        icon: '🏃',
        title: 'Kinetic Energy = E - Φ',
        desc: 'Extra energy beyond the work function becomes kinetic energy of the ejected electron.',
        color: 'emerald',
      },
      {
        icon: '📊',
        title: 'Threshold Frequency',
        desc: 'Below a certain frequency, NO electrons escape—regardless of how bright the light is!',
        color: 'violet',
      },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-20 pb-24 px-6">
          <div className="max-w-xl mx-auto">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
              Step 4 - What You Discovered
            </p>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold mb-6 tracking-tight`}>
              Einstein's Key Insight
            </h2>

            <div className="space-y-4">
              {concepts.map((c, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <div className={`w-13 h-13 rounded-xl bg-${c.color}-500/20 flex items-center justify-center text-2xl flex-shrink-0`}>
                    {c.icon}
                  </div>
                  <div>
                    <p className="font-bold text-white mb-1">{c.title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Einstein's equation */}
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-violet-500/10 border border-amber-500/30 text-center">
              <p className="text-xs font-bold text-amber-400 mb-3 uppercase">Einstein's Photoelectric Equation</p>
              <p className="text-3xl font-extrabold text-white font-serif">
                KE<sub>max</sub> = hf - Φ
              </p>
              <p className="text-xs text-slate-400 mt-3">
                h = Planck's constant - f = frequency - Φ = work function
              </p>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goNext(); }}
                className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                The Paradox →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 4) {
    const options = [
      { id: 'brighter_faster', label: 'Brighter light = faster electrons', desc: 'More photons = more total energy delivered', icon: '⬆️' },
      { id: 'same_speed', label: 'Brightness doesn\'t change speed', desc: 'Each photon has fixed energy E = hf', icon: '➡️' },
      { id: 'slower', label: 'Brighter light = slower electrons', desc: 'Energy gets divided among more electrons', icon: '⬇️' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-20 pb-12 px-6">
          <div className="max-w-xl mx-auto">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">
              Step 5 - The Paradox
            </p>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold mb-3 tracking-tight`}>
              Classical Physics Got It Wrong!
            </h2>
            <p className="text-base text-slate-400 mb-2 leading-relaxed">
              Before Einstein, physicists expected brighter light (more total energy) would make electrons fly faster.
            </p>
            <p className="text-sm text-slate-500 mb-7">
              What do YOU predict happens if we increase brightness while keeping wavelength constant?
            </p>

            <div className="space-y-3">
              {options.map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { prediction: opt.id });
                  }}
                  className={`flex items-center gap-4 w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    twistPrediction === opt.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                    twistPrediction === opt.id ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${twistPrediction === opt.id ? 'text-violet-400' : 'text-white'}`}>
                      {opt.label}
                    </p>
                    <p className="text-sm text-slate-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (twistPrediction) goNext(); }}
                disabled={!twistPrediction}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  twistPrediction
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                Test It! →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 5) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-16">
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-[calc(100vh-4rem)]`}>
            {/* Visualization */}
            <div className={`${isMobile ? 'h-64' : 'flex-1'} p-4 flex items-center justify-center`}>
              {renderPhotoelectricLab()}
            </div>

            {/* Controls */}
            <div className={`${isMobile ? 'flex-1' : 'w-72'} p-5 bg-slate-900/50 ${isMobile ? 'border-t' : 'border-l'} border-slate-800/50 overflow-auto`}>
              <p className="text-sm font-bold text-violet-400 mb-5">Intensity vs Frequency Test</p>

              {/* Intensity slider */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                  Intensity (# of photons)
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={intensity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setIntensity(val);
                    setHasTestedIntensity(true);
                    emitEvent('parameter_changed', { intensity: val });
                  }}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {intensity}% → {emissionOccurs ? Math.floor(intensity / 12) : 0} electrons/cycle
                </p>
              </div>

              {/* Wavelength slider */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-amber-400 mb-2 uppercase">
                  Wavelength (photon energy)
                </label>
                <input
                  type="range"
                  min="200"
                  max="700"
                  value={wavelength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setWavelength(val);
                    setHasTestedIntensity(true);
                  }}
                  className="w-full accent-amber-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {wavelength}nm → {photonEnergy.toFixed(2)} eV/photon
                </p>
              </div>

              {/* Results comparison */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-xs font-bold text-white mb-3">Key Observation:</p>
                <p className="text-sm text-slate-400 mb-2">
                  - Electron count: <span className="text-violet-400 font-bold">{emissionOccurs ? Math.floor(intensity / 12) : 0}</span> (from intensity)
                </p>
                <p className="text-sm text-slate-400">
                  - Electron speed: <span className="text-amber-400 font-bold">{maxKE.toFixed(2)} eV</span> (from wavelength)
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 font-semibold">
                    ✓ Speed only depends on wavelength—not intensity!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (hasTestedIntensity) goNext(); }}
                disabled={!hasTestedIntensity}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  hasTestedIntensity
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                Understand Why →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 6) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-20 pb-24 px-6">
          <div className="max-w-xl mx-auto">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">
              Step 7 - The Quantum Truth
            </p>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold mb-6 tracking-tight`}>
              Light Comes in Packets!
            </h2>

            <div className="space-y-4">
              {/* Classical wrong */}
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
                <p className="font-bold text-red-400 mb-3">❌ Classical Prediction (WRONG)</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  "Brighter light delivers more total energy, so electrons should fly faster."
                  <br /><br />
                  This assumes light energy accumulates continuously like a water wave.
                </p>
              </div>

              {/* Quantum correct */}
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="font-bold text-emerald-400 mb-3">✓ Quantum Reality (CORRECT)</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Light comes in <strong className="text-white">discrete packets (photons)</strong>, each with energy E = hf.
                  <br /><br />
                  More photons = more electrons, but each electron's energy depends only on the photon's frequency!
                </p>
              </div>

              {/* Nobel Prize */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-violet-500/10 border border-amber-500/30">
                <p className="font-bold text-amber-400 mb-3">🏆 Einstein's Nobel Prize (1921)</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  This explanation proved that light has <strong className="text-white">particle-like properties</strong>. Light isn't just a wave—it's also made of discrete quanta called photons.
                  <br /><br />
                  This launched the quantum revolution!
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goNext(); }}
                className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                Real-World Applications →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 7) {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size >= applications.length;

    const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
      amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400' },
      violet: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-400' },
      emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400' },
      yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-400' },
    };

    const colors = colorClasses[app.color] || colorClasses.amber;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-16 flex flex-col h-screen">
          {/* Tab navigation */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-slate-900/50 border-b border-slate-800/50">
            {applications.map((a, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); setActiveApp(i); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-semibold text-sm transition-all ${
                  i === activeApp
                    ? `${colorClasses[a.color].bg} text-white`
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span>{a.icon}</span>
                <span>{a.title.split(' ')[0]}</span>
                {completedApps.has(i) && (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    i === activeApp ? 'bg-white/30' : 'bg-emerald-500'
                  }`}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-6 pb-32">
            {/* App header */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl ${colors.bg}/20 flex items-center justify-center text-3xl`}>
                {app.icon}
              </div>
              <div>
                <h3 className="text-xl font-extrabold">{app.title}</h3>
                <p className={`text-sm font-semibold ${colors.text}`}>{app.stat}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-base text-slate-400 leading-relaxed mb-6">
              {app.description}
            </p>

            {/* Details list */}
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">
                How It Works
              </p>
              <div className="space-y-2.5">
                {app.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full ${colors.bg}/20 flex items-center justify-center text-xs font-bold ${colors.text} flex-shrink-0`}>
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mark as read button */}
            {!completedApps.has(activeApp) && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  if (activeApp < applications.length - 1) {
                    setActiveApp(activeApp + 1);
                  }
                }}
                className={`flex items-center justify-center gap-2 w-full mt-5 py-3.5 rounded-xl border-2 ${colors.border} ${colors.bg}/10 ${colors.text} font-semibold transition-all hover:${colors.bg}/20`}
              >
                ✓ Mark "{app.title}" as Read
              </button>
            )}

            {/* Progress indicator */}
            <div className="mt-5 p-4 rounded-xl bg-slate-800/50 text-center">
              <p className={`text-sm font-semibold ${allAppsCompleted ? 'text-emerald-400' : 'text-slate-400'}`}>
                {allAppsCompleted
                  ? '✓ All applications reviewed! Ready for quiz.'
                  : `Progress: ${completedApps.size} of ${applications.length} applications reviewed`}
              </p>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <button
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (allAppsCompleted) goNext(); }}
                disabled={!allAppsCompleted}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  allAppsCompleted
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                Take the Quiz →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 8) {
    const q = testQuestions[testIndex];
    const isLast = testIndex === testQuestions.length - 1;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        <ProgressBar />
        <div className="relative pt-20 pb-32 px-6">
          <div className="max-w-xl mx-auto">
            {/* Question header */}
            <div className="flex justify-between items-center mb-5">
              <p className="text-sm font-bold text-amber-400">
                Question {testIndex + 1} of {testQuestions.length}
              </p>
              <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-sm font-bold text-emerald-400">
                  Score: {testScore}/{testQuestions.length}
                </p>
              </div>
            </div>

            {/* Question */}
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-6 leading-relaxed`}>
              {q.q}
            </h3>

            {/* Answer options */}
            <div className="space-y-3">
              {q.opts.map((opt, i) => {
                const isCorrect = i === q.correct;
                const isSelected = i === selectedAnswer;
                let bgClass = 'bg-slate-800/50';
                let borderClass = 'border-slate-700';
                let textClass = 'text-white';

                if (selectedAnswer !== null) {
                  if (isCorrect) {
                    bgClass = 'bg-emerald-500/10';
                    borderClass = 'border-emerald-500';
                    textClass = 'text-emerald-400';
                  } else if (isSelected) {
                    bgClass = 'bg-red-500/10';
                    borderClass = 'border-red-500';
                    textClass = 'text-red-400';
                  }
                }

                return (
                  <button
                    key={i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (selectedAnswer !== null) return;
                      setSelectedAnswer(i);
                      setShowExplanation(true);
                      if (isCorrect) setTestScore(s => s + 1);
                      emitEvent('test_answered', { questionIndex: testIndex, answer: opt, isCorrect });
                    }}
                    className={`flex items-center gap-3.5 w-full p-4 rounded-xl border-2 text-left transition-all ${bgClass} ${borderClass}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      selectedAnswer !== null && isCorrect
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {selectedAnswer !== null && isCorrect ? '✓' : String.fromCharCode(65 + i)}
                    </div>
                    <p className={`text-sm ${textClass} leading-relaxed`}>{opt}</p>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="mt-5 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs font-bold text-amber-400 mb-2 uppercase">Explanation</p>
                <p className="text-sm text-slate-400 leading-relaxed">{q.explain}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next button */}
        {showExplanation && (
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
            <div className="max-w-xl mx-auto">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (isLast) {
                    emitEvent('test_completed', { score: testScore, maxScore: testQuestions.length });
                    goToPhase(9);
                  } else {
                    setTestIndex(i => i + 1);
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                  }
                }}
                className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                {isLast ? 'See Results →' : 'Next Question →'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 9) {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const isPassing = percentage >= 70;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

        {/* Confetti animation */}
        {isPassing && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  width: `${8 + Math.random() * 8}px`,
                  height: `${8 + Math.random() * 8}px`,
                  backgroundColor: ['#f59e0b', '#8b5cf6', '#22c55e', '#eab308', '#38bdf8', '#fbbf24'][i % 6],
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti ease-out infinite;
          }
        `}</style>

        <ProgressBar />
        <div className="relative pt-20 pb-12 px-6 flex flex-col items-center justify-center min-h-screen text-center">
          {/* Trophy icon */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
            isPassing
              ? 'bg-gradient-to-br from-amber-500 to-violet-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-800'
          }`}>
            <span className="text-5xl">{isPassing ? '🏆' : '📚'}</span>
          </div>

          <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-extrabold mb-2`}>
            {isPassing ? 'Quantum Master!' : 'Keep Learning!'}
          </h1>

          <p className="text-lg text-slate-400 mb-8">
            You scored{' '}
            <span className={`font-bold ${isPassing ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {testScore}/{testQuestions.length}
            </span>
            {' '}({percentage}%)
          </p>

          {/* Key learnings */}
          <div className="grid grid-cols-2 gap-3 max-w-sm w-full mb-8">
            {[
              { icon: '💡', label: 'Light = Photons' },
              { icon: '⚡', label: 'E = hf' },
              { icon: '🚧', label: 'Work Function Φ' },
              { icon: '🏆', label: 'Nobel Prize 1921' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl mb-1.5">{item.icon}</div>
                <div className="text-xs font-semibold text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            {!isPassing && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setTestIndex(0);
                  setTestScore(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  goToPhase(8);
                }}
                className="px-6 py-3 rounded-xl font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
              >
                Try Again
              </button>
            )}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                emitEvent('mastery_achieved', { score: testScore, maxScore: testQuestions.length, percentage });
              }}
              className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              {isPassing ? 'Complete Lesson ✓' : 'Complete Anyway'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PhotoelectricEffectRenderer;
