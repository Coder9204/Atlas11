'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// P-WAVES VS S-WAVES RENDERER - Premium Apple/Airbnb Design
// Gold Standard: Sequential transfer navigation with completedApps tracking
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

interface PWavesSWavesRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// Premium Design System
const design = {
   colors: {
      bgPrimary: '#09090b',
      bgSecondary: '#18181b',
      bgTertiary: '#27272a',
      bgElevated: '#3f3f46',
      textPrimary: '#fafafa',
      textSecondary: '#a1a1aa',
      textTertiary: '#71717a',
      textMuted: '#52525b',
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryMuted: '#431407',
      secondary: '#8b5cf6',
      secondaryMuted: '#2e1065',
      success: '#22c55e',
      successMuted: '#052e16',
      warning: '#eab308',
      warningMuted: '#422006',
      danger: '#ef4444',
      dangerMuted: '#450a0a',
      pWave: '#fb923c',
      sWave: '#a78bfa',
      liquid: '#38bdf8',
      solid: '#a1a1aa',
      border: '#3f3f46',
      borderLight: '#52525b',
   },
   radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
   shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.3)',
      md: '0 4px 12px rgba(0,0,0,0.4)',
      lg: '0 8px 32px rgba(0,0,0,0.5)',
      glow: (color: string) => `0 0 40px ${color}40`,
   },
   font: { sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }
};

const PWavesSWavesRenderer: React.FC<PWavesSWavesRendererProps> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
   const navigationLockRef = useRef(false);
   const lastClickRef = useRef(0);

   // Core state
   const [phase, setPhase] = useState<number>(() => {
      if (currentPhase !== undefined && PHASES.includes(currentPhase)) return currentPhase;
      return 0;
   });
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [waveType, setWaveType] = useState<'p' | 's'>('p');
   const [medium, setMedium] = useState<'solid' | 'liquid'>('solid');
   const [isWaveActive, setIsWaveActive] = useState(false);
   const [waveProgress, setWaveProgress] = useState(0);
   const [hasExperimented, setHasExperimented] = useState(false);
   const [hasSentSWaveInLiquid, setHasSentSWaveInLiquid] = useState(false);
   const [guidedMode, setGuidedMode] = useState(true);
   const [isMobile, setIsMobile] = useState(false);

   // Test state
   const [testIndex, setTestIndex] = useState(0);
   const [testScore, setTestScore] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
   const [showExplanation, setShowExplanation] = useState(false);

   // Transfer state - GOLD STANDARD: sequential navigation with completedApps
   const [activeApp, setActiveApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

   // Animation refs
   const animationRef = useRef<number>();
   const timeRef = useRef(0);

   // Mobile detection
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // Sync with external phase
   useEffect(() => {
      if (currentPhase !== undefined && PHASES.includes(currentPhase) && currentPhase !== phase) {
         setPhase(currentPhase);
      }
   }, [currentPhase, phase]);

   // Animation loop
   useEffect(() => {
      const animate = () => {
         timeRef.current += 0.05;
         if (isWaveActive) {
            setWaveProgress(prev => {
               if (prev >= 1) {
                  setIsWaveActive(false);
                  return 0;
               }
               return prev + 0.02;
            });
         }
         animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
   }, [isWaveActive]);

   // Sound effect
   const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
      try {
         const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
         const oscillator = audioContext.createOscillator();
         const gainNode = audioContext.createGain();
         oscillator.connect(gainNode);
         gainNode.connect(audioContext.destination);

         const sounds = {
            click: { freq: 600, duration: 0.08, type: 'sine' as OscillatorType, vol: 0.15 },
            success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType, vol: 0.2 },
            failure: { freq: 220, duration: 0.2, type: 'triangle' as OscillatorType, vol: 0.15 },
            transition: { freq: 440, duration: 0.12, type: 'sine' as OscillatorType, vol: 0.15 },
            complete: { freq: 660, duration: 0.25, type: 'sine' as OscillatorType, vol: 0.2 },
         };

         const s = sounds[type];
         oscillator.frequency.value = s.freq;
         oscillator.type = s.type;
         gainNode.gain.setValueAtTime(s.vol, audioContext.currentTime);
         gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.duration);
         oscillator.start();
         oscillator.stop(audioContext.currentTime + s.duration);
      } catch (e) { /* Audio not supported */ }
   }, []);

   // Event emitter
   const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
      onGameEvent?.({ type, data });
   }, [onGameEvent]);

   // Debounced navigation with 200ms debounce
   const goToPhase = useCallback((newPhase: number) => {
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;
      if (navigationLockRef.current) return;
      if (!PHASES.includes(newPhase)) return;
      navigationLockRef.current = true;
      setPhase(newPhase);
      playSound('transition');
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

   // Send wave
   const sendWave = useCallback(() => {
      if (isWaveActive) return;
      setIsWaveActive(true);
      setWaveProgress(0);
      setHasExperimented(true);
      if (waveType === 's' && medium === 'liquid') {
         setHasSentSWaveInLiquid(true);
      }
      emitEvent('simulation_started', { waveType, medium });
   }, [isWaveActive, waveType, medium, emitEvent]);

   // Test questions - 10 comprehensive questions
   const testQuestions = [
      { q: 'Which seismic wave arrives first at a monitoring station?', opts: ['S-wave (Secondary)', 'P-wave (Primary)', 'Surface wave', 'Both arrive together'], correct: 1, explain: 'P-waves (Primary waves) travel about 1.7x faster than S-waves through rock, so they always arrive first—hence the name "Primary."' },
      { q: 'How did scientists discover Earth\'s outer core is liquid?', opts: ['Temperature measurements', 'S-wave shadow zone', 'Drilling experiments', 'Satellite imagery'], correct: 1, explain: 'S-waves cannot travel through liquids. Scientists found that S-waves disappear on the opposite side of Earth after an earthquake, creating a "shadow zone" that proves the outer core is liquid.' },
      { q: 'How do particles move in a P-wave?', opts: ['Perpendicular to wave direction', 'Parallel to wave direction (compression)', 'In circular orbits', 'They don\'t move'], correct: 1, explain: 'P-waves are compression waves—particles push and pull back and forth parallel to the direction the wave travels, like a slinky being pushed from one end.' },
      { q: 'Why can\'t S-waves travel through liquids?', opts: ['Liquids are too dense', 'Liquids move too fast', 'Liquids cannot support shear stress', 'S-waves are always slower'], correct: 2, explain: 'S-waves require the material to "spring back" when displaced sideways (shear). Liquids flow instead of springing back—there\'s no restoring force to propagate the wave.' },
      { q: 'In an earthquake, what causes the first sharp jolt you feel?', opts: ['S-wave arrival', 'P-wave arrival', 'Surface wave', 'Aftershock'], correct: 1, explain: 'The faster P-wave arrives first as a sharp, quick jolt. The more damaging S-wave arrives seconds later with stronger shaking.' },
      { q: 'Medical ultrasound uses which type of wave principle?', opts: ['S-waves (shear)', 'P-waves (compression)', 'Surface waves', 'Electromagnetic waves'], correct: 1, explain: 'Ultrasound uses compression waves (same principle as P-waves) because they can travel through fluids like blood and amniotic fluid.' },
      { q: 'How do oil companies use P and S waves together?', opts: ['Only P-waves are used', 'S-waves reflect differently off fluid reservoirs', 'For legal compliance', 'They cannot be used together'], correct: 1, explain: 'S-waves are blocked by fluid-filled reservoirs while P-waves pass through. This difference helps locate underground oil and gas deposits.' },
      { q: 'If you wanted to detect a liquid layer inside another planet, what would you look for?', opts: ['Higher temperatures', 'S-wave shadow zone', 'Magnetic field changes', 'Visual light reflection'], correct: 1, explain: 'Just like on Earth, an S-wave shadow zone would indicate liquid layers—this is how planetary scientists study the interiors of planets and moons.' },
      { q: 'What happens when P-waves enter the liquid outer core?', opts: ['They stop completely', 'They speed up dramatically', 'They slow down and bend', 'They convert to S-waves'], correct: 2, explain: 'P-waves slow down in liquid (from ~14 km/s to ~8 km/s) and bend (refract) at the boundary. This creates a P-wave shadow zone between 104° and 140° from the epicenter.' },
      { q: 'Why do buildings often shake more during S-wave passage than P-wave?', opts: ['S-waves are always larger', 'S-wave shear motion causes more horizontal movement', 'P-waves are absorbed by ground', 'S-waves last longer'], correct: 1, explain: 'S-waves cause side-to-side (shear) motion which is more damaging to buildings than the back-and-forth compression of P-waves. Buildings are better at resisting vertical loads than horizontal shaking.' }
   ];

   // Real-world applications - 4 detailed applications
   const applications = [
      {
         icon: '🌍',
         title: 'Earthquake Early Warning',
         description: 'Modern seismometers detect P-waves within seconds of an earthquake. Since P-waves travel faster but cause less damage than S-waves, this gives precious seconds of warning before the destructive S-waves arrive.',
         details: [
            'Japan\'s system gives 5-40 seconds warning',
            'Trains automatically slow down',
            'Factories can shut off gas lines',
            'Elevators stop at nearest floor'
         ],
         stat: '500,000+ earthquakes detected yearly',
         color: design.colors.primary
      },
      {
         icon: '🛢️',
         title: 'Oil & Gas Exploration',
         description: 'Seismic surveys send controlled waves into the ground. Since S-waves don\'t travel through fluids but P-waves do, comparing their reflections reveals underground oil and gas reservoirs worth billions.',
         details: [
            'Artificial seismic sources create waves',
            'Thousands of sensors record reflections',
            'S-wave shadows indicate fluid pockets',
            'Computer models create 3D reservoir maps'
         ],
         stat: '$30 billion industry worldwide',
         color: design.colors.success
      },
      {
         icon: '🏥',
         title: 'Medical Ultrasound Imaging',
         description: 'Ultrasound uses compression waves (like P-waves) that can travel through body fluids. Echoes from different tissues create real-time images of babies, organs, and blood flow without radiation.',
         details: [
            'Frequencies: 2-18 MHz (vs 0.1 Hz for earthquakes)',
            'Works through amniotic fluid and blood',
            'Doppler effect measures blood flow speed',
            'Safe enough for routine pregnancy monitoring'
         ],
         stat: '3+ billion scans performed yearly',
         color: design.colors.secondary
      },
      {
         icon: '🏗️',
         title: 'Structural Integrity Testing',
         description: 'Non-destructive testing sends ultrasonic waves through bridges, pipelines, and aircraft. Waves reflect off hidden cracks and defects, revealing dangerous flaws before they cause failures.',
         details: [
            'Tests welds in nuclear reactors',
            'Inspects aircraft wings for fatigue cracks',
            'Monitors bridge supports for corrosion',
            'Checks pipelines for wall thinning'
         ],
         stat: '99.9% defect detection accuracy',
         color: design.colors.warning
      }
   ];

   // ============ HELPER FUNCTIONS (not React components) ============

   const renderButton = (
      text: string,
      onClick: () => void,
      variant: 'primary' | 'secondary' | 'ghost' = 'primary',
      disabled: boolean = false,
      fullWidth: boolean = false
   ) => {
      const baseStyle: React.CSSProperties = {
         padding: isMobile ? '14px 24px' : '16px 32px',
         borderRadius: design.radius.md,
         fontWeight: 600,
         fontSize: isMobile ? '15px' : '16px',
         fontFamily: design.font.sans,
         border: 'none',
         cursor: disabled ? 'not-allowed' : 'pointer',
         opacity: disabled ? 0.5 : 1,
         transition: 'all 0.2s ease',
         width: fullWidth ? '100%' : 'auto',
      };

      const variants = {
         primary: {
            background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`,
            color: 'white',
            boxShadow: design.shadow.md,
         },
         secondary: {
            background: design.colors.bgTertiary,
            color: design.colors.textSecondary,
            border: `1px solid ${design.colors.border}`,
         },
         ghost: {
            background: 'transparent',
            color: design.colors.textSecondary,
         }
      };

      return (
         <button
            onMouseDown={(e) => {
               e.preventDefault();
               if (!disabled && !navigationLockRef.current) {
                  navigationLockRef.current = true;
                  onClick();
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
               }
            }}
            style={{ ...baseStyle, ...variants[variant] }}
         >
            {text}
         </button>
      );
   };

   const renderProgressBar = () => {
      const currentIdx = PHASES.indexOf(phase);
      return (
         <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '16px',
            borderBottom: `1px solid ${design.colors.border}`,
            background: design.colors.bgSecondary,
         }}>
            {PHASES.map((_, i) => (
               <div
                  key={i}
                  style={{
                     width: i === currentIdx ? '24px' : '8px',
                     height: '8px',
                     borderRadius: design.radius.full,
                     background: i < currentIdx ? design.colors.success : i === currentIdx ? design.colors.primary : design.colors.bgElevated,
                     transition: 'all 0.3s ease',
                  }}
               />
            ))}
            <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 600, color: design.colors.textTertiary }}>
               {currentIdx + 1}/10
            </span>
         </div>
      );
   };

   const renderBottomNav = (backPhase: number | null, nextPhase: number | null, nextText: string = 'Continue →', nextDisabled: boolean = false) => (
      <div style={{
         padding: '20px 24px',
         borderTop: `1px solid ${design.colors.border}`,
         background: design.colors.bgSecondary,
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         gap: '12px',
      }}>
         {backPhase ? renderButton('← Back', () => goToPhase(backPhase), 'ghost') : <div />}
         {nextPhase && renderButton(nextText, () => goToPhase(nextPhase), 'primary', nextDisabled)}
      </div>
   );

   // Wave visualization component
   const renderWaveVisualization = () => {
      const sWaveBlocked = waveType === 's' && medium === 'liquid';
      const numParticles = 14;

      return (
         <svg viewBox="0 0 600 280" style={{ width: '100%', height: '100%', maxHeight: '280px' }}>
            <defs>
               <linearGradient id="solidMedium" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3f3f46" />
                  <stop offset="100%" stopColor="#27272a" />
               </linearGradient>
               <linearGradient id="liquidMedium" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0c4a6e" />
                  <stop offset="100%" stopColor="#082f49" />
               </linearGradient>
               <filter id="particleGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>
            </defs>

            {/* Title */}
            <text x="300" y="24" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 700, fill: design.colors.textPrimary }}>
               Wave Propagation Simulator
            </text>

            {/* Medium container */}
            <rect x="40" y="50" width="520" height="170" rx="12"
               fill={medium === 'solid' ? 'url(#solidMedium)' : 'url(#liquidMedium)'}
               stroke={design.colors.border} strokeWidth="2" />

            {/* Medium label */}
            <text x="300" y="72" textAnchor="middle"
               style={{ fontSize: '11px', fontWeight: 700, fill: design.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               {medium === 'solid' ? '🪨 Solid Medium (Rock)' : '💧 Liquid Medium (Water/Molten Iron)'}
            </text>

            {/* Wave source indicator */}
            <circle cx="65" cy="135" r="16"
               fill={waveType === 'p' ? design.colors.pWave : design.colors.sWave}
               filter="url(#particleGlow)"
               opacity={isWaveActive ? 1 : 0.6} />
            <text x="65" y="139" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 700, fill: design.colors.bgPrimary }}>
               SRC
            </text>

            {/* Particle chain */}
            {Array.from({ length: numParticles }).map((_, i) => {
               const baseX = 110 + i * 32;
               const waveReached = waveProgress * numParticles > i;
               const intensity = waveReached ? Math.max(0, 1 - Math.abs(waveProgress * numParticles - i) / 3) : 0;

               let offsetX = 0, offsetY = 0;
               if (waveType === 'p') {
                  // P-wave: compression (parallel motion)
                  offsetX = intensity * Math.sin(timeRef.current * 12 + i * 0.8) * 14;
               } else if (medium === 'solid') {
                  // S-wave in solid: shear (perpendicular motion)
                  offsetY = intensity * Math.sin(timeRef.current * 12 + i * 0.8) * 18;
               } else {
                  // S-wave in liquid: rapidly decays
                  offsetY = intensity * Math.sin(timeRef.current * 12 + i * 0.8) * 18 * Math.exp(-i * 0.5);
               }

               const particleColor = waveReached
                  ? (waveType === 'p' ? design.colors.pWave : design.colors.sWave)
                  : design.colors.textMuted;

               return (
                  <g key={i}>
                     {/* Connection line */}
                     {i < numParticles - 1 && (
                        <line
                           x1={baseX + offsetX}
                           y1={135 + offsetY}
                           x2={110 + (i + 1) * 32}
                           y2={135}
                           stroke={design.colors.textMuted}
                           strokeWidth="2"
                           opacity={sWaveBlocked && i > 2 ? 0.15 : 0.35}
                        />
                     )}
                     {/* Particle */}
                     <circle
                        cx={baseX + offsetX}
                        cy={135 + offsetY}
                        r="8"
                        fill={particleColor}
                        opacity={sWaveBlocked && i > 2 ? 0.2 : 0.9}
                        filter={waveReached ? 'url(#particleGlow)' : undefined}
                     />
                  </g>
               );
            })}

            {/* S-wave blocked indicator */}
            {sWaveBlocked && isWaveActive && waveProgress > 0.2 && (
               <g>
                  <rect x="220" y="100" width="160" height="70" rx="10"
                     fill={design.colors.dangerMuted} fillOpacity="0.95"
                     stroke={design.colors.danger} strokeWidth="2" />
                  <text x="300" y="128" textAnchor="middle"
                     style={{ fontSize: '14px', fontWeight: 800, fill: design.colors.danger }}>
                     ⚠️ S-WAVE BLOCKED
                  </text>
                  <text x="300" y="150" textAnchor="middle"
                     style={{ fontSize: '11px', fill: '#fca5a5' }}>
                     Liquids can't support shear
                  </text>
               </g>
            )}

            {/* Wave type indicator */}
            <rect x="480" y="85" width="70" height="100" rx="8"
               fill={design.colors.bgSecondary} stroke={design.colors.border} />
            <text x="515" y="108" textAnchor="middle"
               style={{ fontSize: '10px', fontWeight: 600, fill: design.colors.textTertiary }}>
               WAVE TYPE
            </text>
            <text x="515" y="135" textAnchor="middle"
               style={{ fontSize: '16px', fontWeight: 800, fill: waveType === 'p' ? design.colors.pWave : design.colors.sWave }}>
               {waveType === 'p' ? 'P-Wave' : 'S-Wave'}
            </text>
            <text x="515" y="155" textAnchor="middle"
               style={{ fontSize: '9px', fill: design.colors.textTertiary }}>
               {waveType === 'p' ? 'Compression' : 'Shear'}
            </text>
            <text x="515" y="175" textAnchor="middle"
               style={{ fontSize: '20px' }}>
               {waveType === 'p' ? '← →' : '↑ ↓'}
            </text>

            {/* Motion explanation */}
            <text x="300" y="245" textAnchor="middle"
               style={{ fontSize: '12px', fill: design.colors.textSecondary }}>
               {waveType === 'p'
                  ? 'P-Wave: Particles compress & expand parallel to wave direction'
                  : 'S-Wave: Particles move perpendicular to wave direction (shear)'}
            </text>

            {/* Speed comparison */}
            <text x="300" y="265" textAnchor="middle"
               style={{ fontSize: '11px', fill: design.colors.textTertiary }}>
               {waveType === 'p'
                  ? 'Speed: ~6-8 km/s in rock • Arrives FIRST (Primary)'
                  : 'Speed: ~3.5-4.5 km/s in rock • Arrives SECOND (Secondary)'}
            </text>
         </svg>
      );
   };

   // ============ PHASE RENDERS ============

   // HOOK PHASE
   if (phase === 0) {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#0a0f1a',
            fontFamily: design.font.sans,
            position: 'relative',
            overflow: 'hidden',
         }}>
            {/* Premium background glow circles */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
            <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: 'rgba(249, 115, 22, 0.05)', borderRadius: '50%', filter: 'blur(64px)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: '25%', width: 384, height: 384, background: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(64px)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 384, height: 384, background: 'rgba(34, 197, 94, 0.03)', borderRadius: '50%', filter: 'blur(64px)' }} />

            <div style={{
               position: 'relative',
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: isMobile ? '32px 20px' : '48px 32px',
               textAlign: 'center',
            }}>
               {/* Icon */}
               <div style={{
                  width: isMobile ? '80px' : '96px',
                  height: isMobile ? '80px' : '96px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${design.colors.primary} 0%, #c2410c 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '28px',
                  boxShadow: design.shadow.glow(design.colors.primary),
               }}>
                  <span style={{ fontSize: isMobile ? '36px' : '44px' }}>🌍</span>
               </div>

               {/* Mystery intro */}
               <div style={{
                  padding: '12px 24px',
                  borderRadius: design.radius.full,
                  background: design.colors.primaryMuted,
                  border: `1px solid ${design.colors.primary}30`,
                  marginBottom: '20px',
               }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.primary }}>
                     🔬 A Scientific Mystery
                  </span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '32px' : '40px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
               }}>
                  P-Waves vs S-Waves
               </h1>

               <p style={{
                  fontSize: isMobile ? '16px' : '18px',
                  color: design.colors.textSecondary,
                  marginBottom: '12px',
                  maxWidth: '440px',
                  lineHeight: 1.6,
               }}>
                  How did scientists prove Earth's outer core is{' '}
                  <span style={{ color: design.colors.liquid, fontWeight: 700 }}>liquid</span>
                  {' '}without ever drilling there?
               </p>

               <p style={{
                  fontSize: '15px',
                  color: design.colors.textTertiary,
                  marginBottom: '36px',
                  maxWidth: '400px',
               }}>
                  The answer lies in two types of seismic waves with very different properties...
               </p>

               {/* Feature grid */}
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  maxWidth: '440px',
                  width: '100%',
                  marginBottom: '36px',
               }}>
                  {[
                     { icon: '🌊', label: 'Two Wave Types' },
                     { icon: '💧', label: 'Liquid Mystery' },
                     { icon: '🔬', label: 'Virtual Lab' },
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: '18px 12px',
                        borderRadius: design.radius.lg,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{ fontSize: '26px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               {/* AI Coach toggle */}
               <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '28px',
                  padding: '12px 20px',
                  borderRadius: design.radius.full,
                  background: design.colors.bgSecondary,
                  border: `1px solid ${design.colors.border}`,
               }}>
                  <span style={{ fontSize: '14px', color: design.colors.textSecondary }}>AI Coach</span>
                  <button
                     onMouseDown={() => setGuidedMode(!guidedMode)}
                     style={{
                        width: '48px',
                        height: '26px',
                        borderRadius: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        background: guidedMode ? design.colors.success : design.colors.bgElevated,
                        position: 'relative',
                        transition: 'background 0.2s',
                     }}
                  >
                     <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '3px',
                        left: guidedMode ? '25px' : '3px',
                        transition: 'left 0.2s',
                        boxShadow: design.shadow.sm,
                     }} />
                  </button>
                  <span style={{
                     fontSize: '13px',
                     fontWeight: 600,
                     color: guidedMode ? design.colors.success : design.colors.textMuted
                  }}>
                     {guidedMode ? 'ON' : 'OFF'}
                  </span>
               </div>

               {renderButton('Begin Exploration →', () => goToPhase(1))}

               <p style={{
                  fontSize: '13px',
                  color: design.colors.textMuted,
                  marginTop: '20px',
               }}>
                  ~5 minutes • Interactive seismic simulation
               </p>
            </div>
         </div>
      );
   }

   // PREDICT PHASE
   if (phase === 1) {
      const options = [
         { id: 'p_only', label: 'Only P-waves (compression)', desc: 'Push-pull compression works everywhere', icon: '← →' },
         { id: 's_only', label: 'Only S-waves (shear)', desc: 'Side-to-side shearing works everywhere', icon: '↑ ↓' },
         { id: 'both', label: 'Both wave types', desc: 'All seismic waves travel through all materials', icon: '◈' },
         { id: 'neither', label: 'Neither wave type', desc: 'Liquids block all seismic waves completely', icon: '✕' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 2 • Make Your Prediction
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
               }}>
                  Which wave type can travel through liquids?
               </h2>
               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '28px',
                  lineHeight: 1.6,
                  maxWidth: '520px',
               }}>
                  Seismologists detect two distinct wave types after earthquakes. One arrives first (Primary), one arrives second (Secondary). But something strange happens when they hit Earth's liquid outer core...
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onMouseDown={() => {
                           setPrediction(opt.id);
                           emitEvent('prediction_made', { prediction: opt.id });
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '16px',
                           padding: '20px',
                           borderRadius: design.radius.lg,
                           border: `2px solid ${prediction === opt.id ? design.colors.primary : design.colors.border}`,
                           background: prediction === opt.id ? design.colors.primaryMuted : design.colors.bgSecondary,
                           textAlign: 'left',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                        }}
                     >
                        <div style={{
                           width: '44px',
                           height: '44px',
                           borderRadius: design.radius.md,
                           background: prediction === opt.id ? design.colors.primary : design.colors.bgTertiary,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '18px',
                           fontWeight: 700,
                           color: prediction === opt.id ? 'white' : design.colors.textTertiary,
                        }}>
                           {opt.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                           <p style={{
                              fontWeight: 600,
                              fontSize: '15px',
                              color: prediction === opt.id ? design.colors.primary : design.colors.textPrimary,
                              marginBottom: '4px',
                           }}>
                              {opt.label}
                           </p>
                           <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                        </div>
                     </button>
                  ))}
               </div>
            </div>
            {renderBottomNav(0, 2, 'Test Your Prediction →', !prediction)}
         </div>
      );
   }

   // PLAY PHASE
   if (phase === 2) {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
               }}>
                  {renderWaveVisualization()}
               </div>

               {/* Controls */}
               <div style={{
                  padding: '20px 24px',
                  background: design.colors.bgSecondary,
                  borderTop: `1px solid ${design.colors.border}`,
               }}>
                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.textTertiary,
                     marginBottom: '12px',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em',
                  }}>
                     Select Wave Type
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onMouseDown={() => setWaveType('p')}
                        style={{
                           flex: 1,
                           padding: '16px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                        }}
                     >
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>← →</div>
                        <div style={{
                           color: waveType === 'p' ? design.colors.pWave : design.colors.textSecondary,
                           fontWeight: 700,
                           fontSize: '14px',
                        }}>
                           P-Wave
                        </div>
                        <div style={{ fontSize: '11px', color: design.colors.textTertiary }}>Compression</div>
                     </button>
                     <button
                        onMouseDown={() => setWaveType('s')}
                        style={{
                           flex: 1,
                           padding: '16px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                        }}
                     >
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>↑ ↓</div>
                        <div style={{
                           color: waveType === 's' ? design.colors.sWave : design.colors.textSecondary,
                           fontWeight: 700,
                           fontSize: '14px',
                        }}>
                           S-Wave
                        </div>
                        <div style={{ fontSize: '11px', color: design.colors.textTertiary }}>Shear</div>
                     </button>
                  </div>

                  {renderButton(
                     isWaveActive ? '🌊 Wave Propagating...' : '🌊 Send Wave',
                     sendWave,
                     'primary',
                     isWaveActive,
                     true
                  )}

                  {guidedMode && (
                     <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: design.radius.md,
                        background: design.colors.bgTertiary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                           💡 Try both wave types and watch how particles move differently!
                        </p>
                     </div>
                  )}
               </div>
            </div>
            {renderBottomNav(1, 3, 'See What You Learned →', !hasExperimented)}
         </div>
      );
   }

   // REVIEW PHASE
   if (phase === 3) {
      const concepts = [
         {
            icon: '← →',
            title: 'P-Waves: Compression Waves',
            desc: 'Particles push and pull back-and-forth, parallel to the wave direction. Like pushing a slinky from one end.',
            color: design.colors.pWave,
         },
         {
            icon: '↑ ↓',
            title: 'S-Waves: Shear Waves',
            desc: 'Particles move side-to-side, perpendicular to the wave direction. Like shaking a slinky sideways.',
            color: design.colors.sWave,
         },
         {
            icon: '⚡',
            title: 'P = Primary (Faster)',
            desc: 'P-waves travel ~1.7x faster through rock (~6-8 km/s). They always arrive first at seismometers!',
            color: design.colors.primary,
         },
         {
            icon: '🐌',
            title: 'S = Secondary (Slower)',
            desc: 'S-waves travel slower (~3.5-4.5 km/s). They arrive after P-waves—the time gap helps locate earthquakes.',
            color: design.colors.secondary,
         },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.success,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 4 • What You Discovered
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  letterSpacing: '-0.02em',
               }}>
                  Two Types of Seismic Motion
               </h2>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '560px' }}>
                  {concepts.map((c, i) => (
                     <div key={i} style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '20px',
                        borderRadius: design.radius.lg,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{
                           width: '52px',
                           height: '52px',
                           borderRadius: design.radius.md,
                           background: `${c.color}20`,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '22px',
                           fontWeight: 700,
                           color: c.color,
                           flexShrink: 0,
                        }}>
                           {c.icon}
                        </div>
                        <div>
                           <p style={{
                              fontWeight: 700,
                              fontSize: '15px',
                              color: design.colors.textPrimary,
                              marginBottom: '6px',
                           }}>
                              {c.title}
                           </p>
                           <p style={{
                              fontSize: '13px',
                              color: design.colors.textSecondary,
                              lineHeight: 1.5,
                           }}>
                              {c.desc}
                           </p>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Key insight box */}
               <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  borderRadius: design.radius.lg,
                  background: design.colors.primaryMuted,
                  border: `1px solid ${design.colors.primary}40`,
                  maxWidth: '560px',
               }}>
                  <p style={{
                     fontSize: '14px',
                     fontWeight: 700,
                     color: design.colors.primary,
                     marginBottom: '8px',
                  }}>
                     🎯 Key Question
                  </p>
                  <p style={{
                     fontSize: '14px',
                     color: design.colors.textSecondary,
                     lineHeight: 1.6,
                  }}>
                     Both waves travel through solid rock. But what happens when they hit <strong style={{ color: design.colors.liquid }}>liquid</strong>? This is where the real discovery begins...
                  </p>
               </div>
            </div>
            {renderBottomNav(2, 4, 'The Liquid Puzzle →')}
         </div>
      );
   }

   // TWIST_PREDICT PHASE
   if (phase === 4) {
      const options = [
         { id: 'travels', label: 'Travels normally', desc: 'Waves work the same way in all materials', icon: '✓' },
         { id: 'slows', label: 'Slows down but continues', desc: 'Liquids just resist motion more than solids', icon: '🐌' },
         { id: 'blocked', label: 'Cannot travel through', desc: 'Something fundamental prevents propagation', icon: '🚫' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 5 • The Twist
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
               }}>
                  What happens to S-waves in liquid?
               </h2>
               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '8px',
                  lineHeight: 1.6,
                  maxWidth: '520px',
               }}>
                  Scientists in the early 1900s noticed something strange: S-waves from earthquakes <em>never arrived</em> on the opposite side of Earth.
               </p>
               <p style={{
                  fontSize: '14px',
                  color: design.colors.textTertiary,
                  marginBottom: '28px',
                  maxWidth: '520px',
               }}>
                  This "S-wave shadow zone" was the key to discovering what's hidden 2,900 km beneath your feet...
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onMouseDown={() => {
                           setTwistPrediction(opt.id);
                           emitEvent('twist_prediction_made', { prediction: opt.id });
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '16px',
                           padding: '20px',
                           borderRadius: design.radius.lg,
                           border: `2px solid ${twistPrediction === opt.id ? design.colors.secondary : design.colors.border}`,
                           background: twistPrediction === opt.id ? design.colors.secondaryMuted : design.colors.bgSecondary,
                           textAlign: 'left',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                        }}
                     >
                        <div style={{
                           width: '44px',
                           height: '44px',
                           borderRadius: design.radius.md,
                           background: twistPrediction === opt.id ? design.colors.secondary : design.colors.bgTertiary,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '20px',
                           color: twistPrediction === opt.id ? 'white' : design.colors.textTertiary,
                        }}>
                           {opt.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                           <p style={{
                              fontWeight: 600,
                              fontSize: '15px',
                              color: twistPrediction === opt.id ? design.colors.secondary : design.colors.textPrimary,
                              marginBottom: '4px',
                           }}>
                              {opt.label}
                           </p>
                           <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                        </div>
                     </button>
                  ))}
               </div>
            </div>
            {renderBottomNav(3, 5, 'Test in Liquid →', !twistPrediction)}
         </div>
      );
   }

   // TWIST_PLAY PHASE
   if (phase === 5) {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
               }}>
                  {renderWaveVisualization()}
               </div>

               {/* Controls */}
               <div style={{
                  padding: '20px 24px',
                  background: design.colors.bgSecondary,
                  borderTop: `1px solid ${design.colors.border}`,
               }}>
                  {/* Medium selector */}
                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.textTertiary,
                     marginBottom: '8px',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em',
                  }}>
                     Select Medium
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                     <button
                        onMouseDown={() => setMedium('solid')}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${medium === 'solid' ? design.colors.solid : design.colors.border}`,
                           background: medium === 'solid' ? `${design.colors.solid}15` : design.colors.bgTertiary,
                           color: medium === 'solid' ? design.colors.textPrimary : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                        }}
                     >
                        🪨 Solid Rock
                     </button>
                     <button
                        onMouseDown={() => setMedium('liquid')}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${medium === 'liquid' ? design.colors.liquid : design.colors.border}`,
                           background: medium === 'liquid' ? `${design.colors.liquid}15` : design.colors.bgTertiary,
                           color: medium === 'liquid' ? design.colors.liquid : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                        }}
                     >
                        💧 Liquid
                     </button>
                  </div>

                  {/* Wave type selector */}
                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.textTertiary,
                     marginBottom: '8px',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em',
                  }}>
                     Wave Type
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onMouseDown={() => setWaveType('p')}
                        style={{
                           flex: 1,
                           padding: '12px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           color: waveType === 'p' ? design.colors.pWave : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                        }}
                     >
                        ← → P-Wave
                     </button>
                     <button
                        onMouseDown={() => setWaveType('s')}
                        style={{
                           flex: 1,
                           padding: '12px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           color: waveType === 's' ? design.colors.sWave : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                        }}
                     >
                        ↑ ↓ S-Wave
                     </button>
                  </div>

                  {renderButton(
                     isWaveActive ? '🌊 Wave Propagating...' : '🌊 Send Wave',
                     sendWave,
                     'primary',
                     isWaveActive,
                     true
                  )}

                  {/* S-wave in liquid warning */}
                  {waveType === 's' && medium === 'liquid' && (
                     <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: design.radius.md,
                        background: design.colors.dangerMuted,
                        border: `1px solid ${design.colors.danger}40`,
                     }}>
                        <p style={{ fontSize: '13px', color: design.colors.danger, fontWeight: 600 }}>
                           ⚠️ S-waves cannot propagate through liquids!
                        </p>
                     </div>
                  )}

                  {guidedMode && !hasSentSWaveInLiquid && (
                     <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: design.radius.md,
                        background: design.colors.bgTertiary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                           💡 Try sending an S-wave through liquid to see what happens!
                        </p>
                     </div>
                  )}
               </div>
            </div>
            {renderBottomNav(4, 6, 'Understand Why →', !hasSentSWaveInLiquid)}
         </div>
      );
   }

   // TWIST_REVIEW PHASE
   if (phase === 6) {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 7 • The Key Insight
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  letterSpacing: '-0.02em',
               }}>
                  Why Liquids Block S-Waves
               </h2>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '560px' }}>
                  {/* Main insight */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.secondaryMuted,
                     border: `1px solid ${design.colors.secondary}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.secondary,
                        marginBottom: '12px',
                     }}>
                        🔬 The Fundamental Difference
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        S-waves need materials that <strong style={{ color: design.colors.textPrimary }}>"spring back"</strong> when pushed sideways. This is called <em>shear stress resistance</em>. When you push water sideways, it just <strong style={{ color: design.colors.liquid }}>flows</strong>—there's no restoring force to create a wave!
                     </p>
                  </div>

                  {/* P-wave explanation */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.primaryMuted,
                     border: `1px solid ${design.colors.primary}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.pWave,
                        marginBottom: '12px',
                     }}>
                        ✓ Why P-Waves Work Everywhere
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        P-waves use <strong style={{ color: design.colors.textPrimary }}>compression</strong>—pushing particles together and apart. Both solids AND liquids resist being compressed. That's why P-waves travel through Earth's liquid outer core!
                     </p>
                  </div>

                  {/* Earth discovery */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.successMuted,
                     border: `1px solid ${design.colors.success}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.success,
                        marginBottom: '12px',
                     }}>
                        🌍 How We Discovered Earth's Liquid Core
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        In 1906, geologist Richard Oldham noticed that S-waves <strong style={{ color: design.colors.textPrimary }}>never arrived</strong> at stations on the opposite side of Earth from an earthquake. This "S-wave shadow zone" proved the outer core is liquid—without anyone ever seeing it!
                     </p>
                  </div>

                  {/* Formula box */}
                  <div style={{
                     padding: '20px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                     textAlign: 'center',
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                     }}>
                        Key Physics
                     </p>
                     <p style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: design.colors.textPrimary,
                        fontFamily: 'monospace',
                     }}>
                        Shear Wave Speed = √(Shear Modulus / Density)
                     </p>
                     <p style={{
                        fontSize: '13px',
                        color: design.colors.textSecondary,
                        marginTop: '8px',
                     }}>
                        Liquids have shear modulus ≈ 0, so S-wave speed → 0
                     </p>
                  </div>
               </div>
            </div>
            {renderBottomNav(5, 7, 'Real-World Applications →')}
         </div>
      );
   }

   // TRANSFER PHASE - GOLD STANDARD with completedApps tracking
   if (phase === 7) {
      const app = applications[activeApp];
      const allAppsCompleted = completedApps.size >= applications.length;

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Tab navigation */}
               <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '16px',
                  borderBottom: `1px solid ${design.colors.border}`,
                  overflowX: 'auto',
                  background: design.colors.bgSecondary,
               }}>
                  {applications.map((a, i) => (
                     <button
                        key={i}
                        onMouseDown={() => setActiveApp(i)}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '8px',
                           padding: '10px 16px',
                           borderRadius: design.radius.md,
                           border: 'none',
                           background: i === activeApp ? a.color : design.colors.bgTertiary,
                           color: i === activeApp ? 'white' : design.colors.textSecondary,
                           fontSize: '13px',
                           fontWeight: 600,
                           cursor: 'pointer',
                           whiteSpace: 'nowrap',
                           transition: 'all 0.2s',
                        }}
                     >
                        <span>{a.icon}</span>
                        <span>{a.title.split(' ')[0]}</span>
                        {completedApps.has(i) && (
                           <span style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: i === activeApp ? 'rgba(255,255,255,0.3)' : design.colors.success,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                           }}>
                              ✓
                           </span>
                        )}
                     </button>
                  ))}
               </div>

               {/* Content area */}
               <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                  {/* App header */}
                  <div style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '16px',
                     marginBottom: '24px',
                  }}>
                     <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: design.radius.lg,
                        background: `${app.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                     }}>
                        {app.icon}
                     </div>
                     <div>
                        <h3 style={{
                           fontSize: '22px',
                           fontWeight: 800,
                           color: design.colors.textPrimary,
                           marginBottom: '4px',
                        }}>
                           {app.title}
                        </h3>
                        <p style={{
                           fontSize: '14px',
                           color: app.color,
                           fontWeight: 600,
                        }}>
                           {app.stat}
                        </p>
                     </div>
                  </div>

                  {/* Description */}
                  <p style={{
                     fontSize: '15px',
                     color: design.colors.textSecondary,
                     lineHeight: 1.7,
                     marginBottom: '24px',
                  }}>
                     {app.description}
                  </p>

                  {/* Details list */}
                  <div style={{
                     padding: '20px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                     }}>
                        How It Works
                     </p>
                     <div style={{ display: 'grid', gap: '10px' }}>
                        {app.details.map((detail, i) => (
                           <div key={i} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                           }}>
                              <div style={{
                                 width: '24px',
                                 height: '24px',
                                 borderRadius: '50%',
                                 background: `${app.color}20`,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '12px',
                                 fontWeight: 700,
                                 color: app.color,
                                 flexShrink: 0,
                              }}>
                                 {i + 1}
                              </div>
                              <p style={{
                                 fontSize: '14px',
                                 color: design.colors.textSecondary,
                                 lineHeight: 1.5,
                              }}>
                                 {detail}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Mark as read button - GOLD STANDARD sequential navigation */}
                  {!completedApps.has(activeApp) && (
                     <button
                        onMouseDown={() => {
                           const newCompleted = new Set(completedApps);
                           newCompleted.add(activeApp);
                           setCompletedApps(newCompleted);
                           // Auto-advance to next unread app
                           if (activeApp < applications.length - 1) {
                              setActiveApp(activeApp + 1);
                           }
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           gap: '8px',
                           width: '100%',
                           marginTop: '20px',
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${app.color}`,
                           background: `${app.color}15`,
                           color: app.color,
                           fontSize: '14px',
                           fontWeight: 600,
                           cursor: 'pointer',
                        }}
                     >
                        ✓ Mark "{app.title}" as Read
                     </button>
                  )}

                  {/* Progress indicator */}
                  <div style={{
                     marginTop: '20px',
                     padding: '16px',
                     borderRadius: design.radius.md,
                     background: design.colors.bgTertiary,
                     textAlign: 'center',
                  }}>
                     <p style={{
                        fontSize: '13px',
                        color: completedApps.size >= applications.length ? design.colors.success : design.colors.textSecondary,
                        fontWeight: 600,
                     }}>
                        {completedApps.size >= applications.length
                           ? '✓ All applications reviewed! Ready for quiz.'
                           : `Progress: ${completedApps.size} of ${applications.length} applications reviewed`}
                     </p>
                  </div>
               </div>
            </div>
            {renderBottomNav(6, 8, 'Take the Quiz →', !allAppsCompleted)}
         </div>
      );
   }

   // TEST PHASE
   if (phase === 8) {
      const q = testQuestions[testIndex];
      const isLast = testIndex === testQuestions.length - 1;

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '20px' : '24px' }}>
               {/* Question header */}
               <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
               }}>
                  <p style={{
                     fontSize: '13px',
                     fontWeight: 700,
                     color: design.colors.primary,
                  }}>
                     Question {testIndex + 1} of {testQuestions.length}
                  </p>
                  <div style={{
                     padding: '6px 12px',
                     borderRadius: design.radius.full,
                     background: design.colors.successMuted,
                     border: `1px solid ${design.colors.success}40`,
                  }}>
                     <p style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: design.colors.success,
                     }}>
                        Score: {testScore}/{testQuestions.length}
                     </p>
                  </div>
               </div>

               {/* Question */}
               <h3 style={{
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: 700,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  lineHeight: 1.4,
               }}>
                  {q.q}
               </h3>

               {/* Answer options */}
               <div style={{ display: 'grid', gap: '12px' }}>
                  {q.opts.map((opt, i) => {
                     const isCorrect = i === q.correct;
                     const isSelected = i === selectedAnswer;
                     let bg = design.colors.bgSecondary;
                     let border = design.colors.border;
                     let textColor = design.colors.textPrimary;

                     if (selectedAnswer !== null) {
                        if (isCorrect) {
                           bg = design.colors.successMuted;
                           border = design.colors.success;
                           textColor = design.colors.success;
                        } else if (isSelected) {
                           bg = design.colors.dangerMuted;
                           border = design.colors.danger;
                           textColor = design.colors.danger;
                        }
                     }

                     return (
                        <button
                           key={i}
                           onMouseDown={() => {
                              if (selectedAnswer !== null) return;
                              setSelectedAnswer(i);
                              setShowExplanation(true);
                              if (isCorrect) setTestScore(s => s + 1);
                              emitEvent('test_answered', { questionIndex: testIndex, answer: opt, isCorrect });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '16px',
                              borderRadius: design.radius.md,
                              border: `2px solid ${border}`,
                              background: bg,
                              textAlign: 'left',
                              cursor: selectedAnswer === null ? 'pointer' : 'default',
                              transition: 'all 0.2s',
                           }}
                        >
                           <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: selectedAnswer !== null && isCorrect ? design.colors.success : design.colors.bgTertiary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: selectedAnswer !== null && isCorrect ? 'white' : design.colors.textSecondary,
                              flexShrink: 0,
                           }}>
                              {selectedAnswer !== null && isCorrect ? '✓' : String.fromCharCode(65 + i)}
                           </div>
                           <p style={{ fontSize: '14px', color: textColor, lineHeight: 1.4 }}>{opt}</p>
                        </button>
                     );
                  })}
               </div>

               {/* Explanation */}
               {showExplanation && (
                  <div style={{
                     marginTop: '20px',
                     padding: '20px',
                     borderRadius: design.radius.lg,
                     background: design.colors.primaryMuted,
                     border: `1px solid ${design.colors.primary}40`,
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.primary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                     }}>
                        Explanation
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.6,
                     }}>
                        {q.explain}
                     </p>
                  </div>
               )}
            </div>

            {/* Next button */}
            {showExplanation && (
               <div style={{
                  padding: '20px 24px',
                  borderTop: `1px solid ${design.colors.border}`,
                  background: design.colors.bgSecondary,
               }}>
                  {renderButton(
                     isLast ? 'See Results →' : 'Next Question →',
                     () => {
                        if (isLast) {
                           emitEvent('test_completed', { score: testScore, maxScore: testQuestions.length });
                           goToPhase(9);
                        } else {
                           setTestIndex(i => i + 1);
                           setSelectedAnswer(null);
                           setShowExplanation(false);
                        }
                     },
                     'primary',
                     false,
                     true
                  )}
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
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #0a0a12 100%)`,
            fontFamily: design.font.sans,
            position: 'relative',
            overflow: 'hidden',
         }}>
            {/* Confetti animation */}
            {isPassing && Array.from({ length: 50 }).map((_, i) => (
               <div
                  key={i}
                  style={{
                     position: 'absolute',
                     left: `${Math.random() * 100}%`,
                     top: '-20px',
                     width: `${8 + Math.random() * 8}px`,
                     height: `${8 + Math.random() * 8}px`,
                     background: [design.colors.primary, design.colors.secondary, design.colors.success, design.colors.warning, design.colors.pWave, design.colors.sWave][i % 6],
                     borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                     animation: `confetti ${2 + Math.random() * 2}s ease-out ${Math.random() * 2}s infinite`,
                  }}
               />
            ))}
            <style>{`
               @keyframes confetti {
                  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
               }
            `}</style>

            {renderProgressBar()}
            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: '32px 24px',
               textAlign: 'center',
            }}>
               {/* Trophy icon */}
               <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: isPassing
                     ? `linear-gradient(135deg, ${design.colors.primary} 0%, #c2410c 100%)`
                     : design.colors.bgTertiary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: isPassing ? design.shadow.glow(design.colors.primary) : 'none',
               }}>
                  <span style={{ fontSize: '48px' }}>{isPassing ? '🏆' : '📚'}</span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '28px' : '36px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '8px',
               }}>
                  {isPassing ? 'Seismic Master!' : 'Keep Learning!'}
               </h1>

               <p style={{
                  fontSize: '18px',
                  color: design.colors.textSecondary,
                  marginBottom: '32px',
               }}>
                  You scored{' '}
                  <span style={{ color: isPassing ? design.colors.success : design.colors.warning, fontWeight: 700 }}>
                     {testScore}/{testQuestions.length}
                  </span>
                  {' '}({percentage}%)
               </p>

               {/* Key learnings */}
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  maxWidth: '400px',
                  width: '100%',
                  marginBottom: '32px',
               }}>
                  {[
                     { icon: '← →', label: 'P = Compression' },
                     { icon: '↑ ↓', label: 'S = Shear' },
                     { icon: '💧', label: 'No S in liquids' },
                     { icon: '🌍', label: 'Liquid outer core' },
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: '16px',
                        borderRadius: design.radius.md,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               {/* Action buttons */}
               <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {!isPassing && renderButton('Try Again', () => {
                     setTestIndex(0);
                     setTestScore(0);
                     setSelectedAnswer(null);
                     setShowExplanation(false);
                     goToPhase(8);
                  }, 'secondary')}
                  {renderButton(
                     isPassing ? 'Complete Lesson ✓' : 'Complete Anyway',
                     () => emitEvent('mastery_achieved', { score: testScore, maxScore: testQuestions.length, percentage })
                  )}
               </div>
            </div>
         </div>
      );
   }

   return null;
};

export default PWavesSWavesRenderer;
