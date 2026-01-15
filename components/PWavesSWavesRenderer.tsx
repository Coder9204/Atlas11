'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// P-WAVES VS S-WAVES RENDERER - Premium Apple/Airbnb Design
// ============================================================================

export interface GameEvent {
   eventType: 'phase_changed' | 'prediction_made' | 'experiment_action' | 'parameter_changed' |
              'answer_submitted' | 'hint_requested' | 'milestone_reached' | 'game_completed' |
              'game_started' | 'visual_state_update' | 'test_completed' | 'lesson_completed' |
              'twist_prediction_made' | 'wave_type_changed' | 'medium_changed' | 'wave_sent';
   gameType: string;
   gameTitle: string;
   details: Record<string, unknown>;
   timestamp: number;
}

interface PWavesSWavesRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// Premium Design System - Apple/Airbnb inspired
const design = {
   colors: {
      // Backgrounds - Deep, rich darks
      bgPrimary: '#09090b',     // zinc-950
      bgSecondary: '#18181b',   // zinc-900
      bgTertiary: '#27272a',    // zinc-800
      bgElevated: '#3f3f46',    // zinc-700

      // Text - Clear hierarchy
      textPrimary: '#fafafa',   // zinc-50
      textSecondary: '#a1a1aa', // zinc-400
      textTertiary: '#71717a',  // zinc-500
      textMuted: '#52525b',     // zinc-600

      // Accent Colors
      primary: '#f97316',       // orange-500
      primaryHover: '#ea580c',  // orange-600
      primaryMuted: '#431407',  // orange-950

      secondary: '#8b5cf6',     // violet-500
      secondaryMuted: '#2e1065', // violet-950

      success: '#22c55e',       // green-500
      successMuted: '#052e16',  // green-950

      warning: '#eab308',       // yellow-500
      danger: '#ef4444',        // red-500

      // Wave specific
      pWave: '#fb923c',         // orange-400
      sWave: '#a78bfa',         // violet-400
      liquid: '#38bdf8',        // sky-400
      solid: '#a1a1aa',         // zinc-400

      // Borders
      border: '#3f3f46',        // zinc-700
      borderLight: '#52525b',   // zinc-600
   },
   radius: {
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      full: '9999px',
   },
   shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.3)',
      md: '0 4px 12px rgba(0,0,0,0.4)',
      lg: '0 8px 32px rgba(0,0,0,0.5)',
      glow: (color: string) => `0 0 40px ${color}40`,
   },
   font: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
   }
};

const PWavesSWavesRenderer: React.FC<PWavesSWavesRendererProps> = ({ onGameEvent, gamePhase }) => {
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   // Core state
   const [phase, setPhase] = useState<Phase>(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
      return 'hook';
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

   // Test state
   const [testIndex, setTestIndex] = useState(0);
   const [testScore, setTestScore] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
   const [showExplanation, setShowExplanation] = useState(false);

   // Transfer state
   const [transferIndex, setTransferIndex] = useState(0);

   // Animation
   const animationRef = useRef<number>();
   const timeRef = useRef(0);

   // Prevent double-clicks
   const isNavigating = useRef(false);

   // Sync with external phase
   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase]);

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
               return prev + 0.025;
            });
         }
         animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
   }, [isWaveActive]);

   // Event emitter
   const emit = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
      onGameEvent?.({
         eventType,
         gameType: 'p_waves_s_waves',
         gameTitle: 'P-Waves vs S-Waves',
         details: { phase, guidedMode, ...details },
         timestamp: Date.now()
      });
   }, [onGameEvent, phase, guidedMode]);

   // Navigation - single click, debounced
   const goToPhase = useCallback((newPhase: Phase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      setPhase(newPhase);
      emit('phase_changed', { newPhase });
      setTimeout(() => { isNavigating.current = false; }, 300);
   }, [emit]);

   // Send wave
   const sendWave = useCallback(() => {
      if (isWaveActive) return;
      setIsWaveActive(true);
      setWaveProgress(0);
      setHasExperimented(true);
      if (waveType === 's' && medium === 'liquid') {
         setHasSentSWaveInLiquid(true);
      }
      emit('wave_sent', { waveType, medium });
   }, [isWaveActive, waveType, medium, emit]);

   // Test data
   const testQuestions = [
      { q: 'Which wave arrives first at a seismometer?', opts: ['S-wave', 'P-wave', 'Both arrive together', 'Depends on distance'], correct: 1, explain: 'P-waves (Primary) travel faster than S-waves, arriving first.' },
      { q: 'What proves Earth\'s outer core is liquid?', opts: ['Temperature readings', 'S-wave shadow zone', 'P-wave speed', 'Magnetic field'], correct: 1, explain: 'S-waves cannot travel through liquids, creating a shadow zone.' },
      { q: 'How do particles move in a P-wave?', opts: ['Up and down', 'In circles', 'Back and forth (parallel)', 'Side to side'], correct: 2, explain: 'P-waves are compression waves—particles move parallel to wave direction.' },
      { q: 'Why can\'t S-waves travel through liquids?', opts: ['Too slow', 'Too fast', 'Liquids don\'t support shear stress', 'Liquids absorb all waves'], correct: 2, explain: 'Liquids flow instead of springing back—no restoring force for shear.' },
      { q: 'What type of wave does ultrasound use?', opts: ['S-waves', 'Compression waves (like P)', 'Electromagnetic', 'Surface waves'], correct: 1, explain: 'Ultrasound uses compression waves because they travel through fluids.' },
      { q: 'In seismic surveys, why use both P and S waves?', opts: ['Cost savings', 'They reflect differently off fluids', 'Legal requirement', 'Only P works'], correct: 1, explain: 'S-waves are blocked by fluid reservoirs; P-waves pass through.' },
      { q: 'During an earthquake, what causes the first jolt?', opts: ['S-wave', 'P-wave arrival', 'Surface wave', 'Aftershock'], correct: 1, explain: 'The faster P-wave arrives first as a sharp jolt.' },
      { q: 'How would you detect a liquid core on another planet?', opts: ['Temperature only', 'S-wave shadow zone', 'Visual observation', 'Radio waves'], correct: 1, explain: 'An S-wave shadow indicates liquid layers—same as on Earth.' },
      { q: 'What happens to S-waves in water?', opts: ['Speed up', 'Travel normally', 'Cannot propagate', 'Become P-waves'], correct: 2, explain: 'S-waves require shear strength; water cannot support shear stress.' },
      { q: 'How do engineers find cracks in structures?', opts: ['X-rays only', 'Wave reflections', 'Temperature scans', 'Visual only'], correct: 1, explain: 'Waves reflect off boundaries between materials, revealing hidden defects.' }
   ];

   // Real-world apps
   const apps = [
      { icon: '🌍', title: 'Earthquake Detection', desc: 'Seismometers detect P and S waves to locate epicenters. The time difference between arrivals tells us earthquake distance.', stat: '500K+ quakes/year detected', color: design.colors.primary },
      { icon: '🛢️', title: 'Oil Exploration', desc: 'Seismic surveys map underground formations. S-waves reflect differently off fluid reservoirs, helping locate oil deposits.', stat: '$30B+ industry', color: design.colors.success },
      { icon: '🏥', title: 'Medical Ultrasound', desc: 'Compression waves travel through body fluids to create images. Same principle as P-waves through Earth\'s liquid core.', stat: '3B+ scans/year', color: design.colors.secondary },
      { icon: '🏗️', title: 'Structural Testing', desc: 'Non-destructive testing finds hidden cracks in bridges, aircraft, and pipelines using wave reflections.', stat: '99.9% accuracy', color: design.colors.warning }
   ];

   // Premium Button Component
   const Button = ({ children, onClick, variant = 'primary', disabled = false, fullWidth = false }: {
      children: React.ReactNode;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost';
      disabled?: boolean;
      fullWidth?: boolean;
   }) => {
      const baseStyle: React.CSSProperties = {
         padding: '14px 28px',
         borderRadius: design.radius.md,
         fontWeight: 600,
         fontSize: '15px',
         fontFamily: design.font.sans,
         border: 'none',
         cursor: disabled ? 'not-allowed' : 'pointer',
         opacity: disabled ? 0.4 : 1,
         transition: 'all 0.2s ease',
         width: fullWidth ? '100%' : 'auto',
      };

      const variants = {
         primary: {
            background: `linear-gradient(135deg, ${design.colors.primary} 0%, #ea580c 100%)`,
            color: 'white',
            boxShadow: design.shadow.md,
         },
         secondary: {
            background: design.colors.bgTertiary,
            color: design.colors.textSecondary,
            boxShadow: 'none',
         },
         ghost: {
            background: 'transparent',
            color: design.colors.textSecondary,
            boxShadow: 'none',
         }
      };

      return (
         <button
            onClick={() => !disabled && onClick()}
            style={{ ...baseStyle, ...variants[variant] }}
         >
            {children}
         </button>
      );
   };

   // Progress indicator
   const ProgressBar = () => {
      const currentIdx = validPhases.indexOf(phase);
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
            {validPhases.map((_, i) => (
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

   // Wave visualization
   const WaveVis = () => {
      const sWaveBlocked = waveType === 's' && medium === 'liquid';
      const numParticles = 16;

      return (
         <svg viewBox="0 0 600 240" style={{ width: '100%', height: '100%', maxHeight: '240px' }}>
            <defs>
               <linearGradient id="solidBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3f3f46" />
                  <stop offset="100%" stopColor="#27272a" />
               </linearGradient>
               <linearGradient id="liquidBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0c4a6e" />
                  <stop offset="100%" stopColor="#082f49" />
               </linearGradient>
               <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>
            </defs>

            {/* Medium background */}
            <rect x="40" y="40" width="520" height="160" rx="12"
               fill={medium === 'solid' ? 'url(#solidBg)' : 'url(#liquidBg)'}
               stroke={design.colors.border} strokeWidth="1" />

            {/* Medium label */}
            <text x="300" y="28" textAnchor="middle"
               style={{ fontSize: '11px', fontWeight: 700, fill: design.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               {medium === 'solid' ? 'Solid Medium' : 'Liquid Medium'}
            </text>

            {/* Wave source */}
            <circle cx="60" cy="120" r="12" fill={waveType === 'p' ? design.colors.pWave : design.colors.sWave} filter="url(#glow)" />

            {/* Particles */}
            {Array.from({ length: numParticles }).map((_, i) => {
               const baseX = 100 + i * 30;
               const waveReached = waveProgress * numParticles > i;
               const intensity = waveReached ? Math.max(0, 1 - Math.abs(waveProgress * numParticles - i) / 3) : 0;

               let offsetX = 0, offsetY = 0;
               if (waveType === 'p') {
                  offsetX = intensity * Math.sin(timeRef.current * 10 + i) * 12;
               } else if (medium === 'solid') {
                  offsetY = intensity * Math.sin(timeRef.current * 10 + i) * 16;
               } else {
                  offsetY = intensity * Math.sin(timeRef.current * 10 + i) * 16 * Math.exp(-i * 0.4);
               }

               return (
                  <g key={i}>
                     <circle
                        cx={baseX + offsetX}
                        cy={120 + offsetY}
                        r="6"
                        fill={waveReached ? (waveType === 'p' ? design.colors.pWave : design.colors.sWave) : design.colors.textMuted}
                        opacity={sWaveBlocked && i > 3 ? 0.2 : 0.9}
                     />
                     {i < numParticles - 1 && (
                        <line x1={baseX + offsetX} y1={120 + offsetY} x2={100 + (i + 1) * 30} y2={120}
                           stroke={design.colors.textMuted} strokeWidth="2" opacity="0.3" />
                     )}
                  </g>
               );
            })}

            {/* S-wave blocked */}
            {sWaveBlocked && isWaveActive && (
               <g>
                  <rect x="200" y="90" width="140" height="60" rx="8" fill="#450a0a" fillOpacity="0.9" stroke="#dc2626" />
                  <text x="270" y="118" textAnchor="middle" style={{ fontSize: '13px', fontWeight: 700, fill: '#ef4444' }}>S-WAVE BLOCKED</text>
                  <text x="270" y="138" textAnchor="middle" style={{ fontSize: '11px', fill: '#fca5a5' }}>No shear in liquids</text>
               </g>
            )}

            {/* Wave label */}
            <text x="540" y="120" textAnchor="middle" dominantBaseline="middle"
               style={{ fontSize: '12px', fontWeight: 700, fill: waveType === 'p' ? design.colors.pWave : design.colors.sWave }}>
               {waveType === 'p' ? 'P-Wave' : 'S-Wave'}
            </text>

            {/* Motion indicator */}
            <text x="300" y="220" textAnchor="middle" style={{ fontSize: '11px', fill: design.colors.textTertiary }}>
               {waveType === 'p' ? '← → Compression (parallel to wave)' : '↑ ↓ Shear (perpendicular to wave)'}
            </text>
         </svg>
      );
   };

   // ============ PHASE RENDERS ============

   // HOOK - Premium first page
   if (phase === 'hook') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #0c0c10 100%)`,
            fontFamily: design.font.sans,
         }}>
            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: '40px 24px',
               textAlign: 'center',
            }}>
               {/* Icon */}
               <div style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${design.colors.primary} 0%, #c2410c 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '32px',
                  boxShadow: design.shadow.glow(design.colors.primary),
               }}>
                  <span style={{ fontSize: '40px' }}>🌍</span>
               </div>

               {/* Title */}
               <h1 style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
               }}>
                  P-Waves vs S-Waves
               </h1>

               {/* Subtitle */}
               <p style={{
                  fontSize: '18px',
                  color: design.colors.textSecondary,
                  marginBottom: '40px',
                  maxWidth: '400px',
                  lineHeight: 1.6,
               }}>
                  Discover how scientists proved Earth's outer core is{' '}
                  <span style={{ color: design.colors.primary, fontWeight: 600 }}>liquid</span>
                  —without ever seeing it.
               </p>

               {/* Feature cards */}
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  maxWidth: '420px',
                  width: '100%',
                  marginBottom: '40px',
               }}>
                  {[
                     { icon: '🔬', label: 'Virtual Slinky Lab' },
                     { icon: '🌊', label: 'Two Wave Types' },
                     { icon: '💎', label: "Earth's Secret" },
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: '20px 12px',
                        borderRadius: design.radius.lg,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               {/* AI Coach toggle */}
               <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '32px',
                  padding: '12px 20px',
                  borderRadius: design.radius.full,
                  background: design.colors.bgSecondary,
                  border: `1px solid ${design.colors.border}`,
               }}>
                  <span style={{ fontSize: '14px', color: design.colors.textSecondary }}>AI Coach</span>
                  <button
                     onClick={() => setGuidedMode(!guidedMode)}
                     style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        background: guidedMode ? design.colors.success : design.colors.bgElevated,
                        position: 'relative',
                        transition: 'background 0.2s',
                     }}
                  >
                     <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '3px',
                        left: guidedMode ? '23px' : '3px',
                        transition: 'left 0.2s',
                        boxShadow: design.shadow.sm,
                     }} />
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: guidedMode ? design.colors.success : design.colors.textMuted }}>
                     {guidedMode ? 'ON' : 'OFF'}
                  </span>
               </div>

               {/* CTA Button */}
               <Button onClick={() => goToPhase('predict')} variant="primary">
                  Start Experiment →
               </Button>

               <p style={{
                  fontSize: '13px',
                  color: design.colors.textMuted,
                  marginTop: '20px',
               }}>
                  ~5 minutes • Interactive experience
               </p>
            </div>
         </div>
      );
   }

   // PREDICT
   if (phase === 'predict') {
      const options = [
         { id: 'p_only', label: 'P-waves (compression)', desc: 'Push-pull motion works in fluids' },
         { id: 's_only', label: 'S-waves (shear)', desc: 'Side-to-side motion works in fluids' },
         { id: 'both', label: 'Both wave types', desc: 'All waves travel everywhere' },
         { id: 'neither', label: 'Neither', desc: 'Liquids block all waves' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Step 2 • Prediction
               </p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                  Which wave travels through liquids?
               </h2>
               <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '500px' }}>
                  Scientists detect two types of seismic waves. One mysteriously disappears when passing through Earth's core...
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onClick={() => { setPrediction(opt.id); emit('prediction_made', { prediction: opt.id }); }}
                        style={{
                           padding: '20px',
                           borderRadius: design.radius.lg,
                           border: `2px solid ${prediction === opt.id ? design.colors.primary : design.colors.border}`,
                           background: prediction === opt.id ? design.colors.primaryMuted : design.colors.bgSecondary,
                           textAlign: 'left',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                        }}
                     >
                        <p style={{ fontWeight: 600, fontSize: '15px', color: prediction === opt.id ? design.colors.primary : design.colors.textPrimary, marginBottom: '4px' }}>
                           {opt.label}
                        </p>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                     </button>
                  ))}
               </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('hook')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('play')} disabled={!prediction}>Test It →</Button>
            </div>
         </div>
      );
   }

   // PLAY
   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WaveVis />
               </div>

               {/* Controls */}
               <div style={{ padding: '20px 24px', background: design.colors.bgSecondary, borderTop: `1px solid ${design.colors.border}` }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onClick={() => setWaveType('p')}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           color: waveType === 'p' ? design.colors.pWave : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                        }}
                     >
                        P-Wave (Compression)
                     </button>
                     <button
                        onClick={() => setWaveType('s')}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           color: waveType === 's' ? design.colors.sWave : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                        }}
                     >
                        S-Wave (Shear)
                     </button>
                  </div>

                  <Button onClick={sendWave} disabled={isWaveActive} fullWidth>
                     {isWaveActive ? 'Wave Traveling...' : '🌊 Send Wave'}
                  </Button>
               </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('predict')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('review')} disabled={!hasExperimented}>Continue →</Button>
            </div>
         </div>
      );
   }

   // REVIEW
   if (phase === 'review') {
      const points = [
         { icon: '➡️', title: 'P-Waves: Compression', desc: 'Particles push and pull parallel to wave direction. Like pushing a slinky.' },
         { icon: '↕️', title: 'S-Waves: Shear', desc: 'Particles move perpendicular to wave direction. Like shaking a slinky sideways.' },
         { icon: '⚡', title: 'P = Primary (Faster)', desc: 'P-waves travel ~1.7x faster than S-waves. They arrive first!' },
         { icon: '🌊', title: 'S = Secondary (Slower)', desc: 'S-waves arrive after P-waves. This time gap helps locate earthquakes.' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Step 4 • Review
               </p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                  Two Types of Motion
               </h2>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '550px' }}>
                  {points.map((p, i) => (
                     <div key={i} style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: design.radius.lg, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
                        <div style={{ fontSize: '28px' }}>{p.icon}</div>
                        <div>
                           <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.textPrimary, marginBottom: '4px' }}>{p.title}</p>
                           <p style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.5 }}>{p.desc}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('play')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('twist_predict')}>The Liquid Puzzle →</Button>
            </div>
         </div>
      );
   }

   // TWIST_PREDICT
   if (phase === 'twist_predict') {
      const options = [
         { id: 'travels', label: 'Travels normally', desc: 'Waves work the same in all materials' },
         { id: 'slows', label: 'Slows down but continues', desc: 'Liquids just resist motion more' },
         { id: 'blocked', label: 'Cannot travel through liquid', desc: 'Something fundamental is different' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Step 5 • The Liquid Puzzle
               </p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                  What happens to S-waves in liquid?
               </h2>
               <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '500px' }}>
                  This puzzle helped scientists discover Earth's liquid outer core—without drilling there!
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onClick={() => { setTwistPrediction(opt.id); emit('twist_prediction_made', { prediction: opt.id }); }}
                        style={{
                           padding: '20px',
                           borderRadius: design.radius.lg,
                           border: `2px solid ${twistPrediction === opt.id ? design.colors.secondary : design.colors.border}`,
                           background: twistPrediction === opt.id ? design.colors.secondaryMuted : design.colors.bgSecondary,
                           textAlign: 'left',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                        }}
                     >
                        <p style={{ fontWeight: 600, fontSize: '15px', color: twistPrediction === opt.id ? design.colors.secondary : design.colors.textPrimary, marginBottom: '4px' }}>
                           {opt.label}
                        </p>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                     </button>
                  ))}
               </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('review')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('twist_play')} disabled={!twistPrediction}>Test It →</Button>
            </div>
         </div>
      );
   }

   // TWIST_PLAY
   if (phase === 'twist_play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WaveVis />
               </div>

               <div style={{ padding: '20px 24px', background: design.colors.bgSecondary, borderTop: `1px solid ${design.colors.border}` }}>
                  {/* Medium toggle */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                     <button
                        onClick={() => setMedium('solid')}
                        style={{
                           flex: 1, padding: '12px', borderRadius: design.radius.md,
                           border: `2px solid ${medium === 'solid' ? design.colors.solid : design.colors.border}`,
                           background: medium === 'solid' ? `${design.colors.solid}20` : design.colors.bgTertiary,
                           color: medium === 'solid' ? design.colors.textPrimary : design.colors.textSecondary,
                           fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                     >
                        🪨 Solid
                     </button>
                     <button
                        onClick={() => setMedium('liquid')}
                        style={{
                           flex: 1, padding: '12px', borderRadius: design.radius.md,
                           border: `2px solid ${medium === 'liquid' ? design.colors.liquid : design.colors.border}`,
                           background: medium === 'liquid' ? `${design.colors.liquid}20` : design.colors.bgTertiary,
                           color: medium === 'liquid' ? design.colors.liquid : design.colors.textSecondary,
                           fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                     >
                        💧 Liquid
                     </button>
                  </div>

                  {/* Wave type toggle */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onClick={() => setWaveType('p')}
                        style={{
                           flex: 1, padding: '12px', borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           color: waveType === 'p' ? design.colors.pWave : design.colors.textSecondary,
                           fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                     >
                        P-Wave
                     </button>
                     <button
                        onClick={() => setWaveType('s')}
                        style={{
                           flex: 1, padding: '12px', borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           color: waveType === 's' ? design.colors.sWave : design.colors.textSecondary,
                           fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                     >
                        S-Wave
                     </button>
                  </div>

                  <Button onClick={sendWave} disabled={isWaveActive} fullWidth>
                     {isWaveActive ? 'Wave Traveling...' : '🌊 Send Wave'}
                  </Button>

                  {waveType === 's' && medium === 'liquid' && (
                     <div style={{ marginTop: '12px', padding: '12px', borderRadius: design.radius.md, background: `${design.colors.danger}20`, border: `1px solid ${design.colors.danger}40` }}>
                        <p style={{ fontSize: '12px', color: design.colors.danger, fontWeight: 600 }}>⚠️ S-wave cannot propagate in liquid!</p>
                     </div>
                  )}
               </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_predict')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('twist_review')} disabled={!hasSentSWaveInLiquid}>Understand Why →</Button>
            </div>
         </div>
      );
   }

   // TWIST_REVIEW
   if (phase === 'twist_review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Step 7 • Key Insight
               </p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                  Liquids Can't Support Shear
               </h2>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '550px' }}>
                  <div style={{ padding: '24px', borderRadius: design.radius.lg, background: design.colors.secondaryMuted, border: `1px solid ${design.colors.secondary}40` }}>
                     <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.secondary, marginBottom: '8px' }}>🔬 The Key Insight</p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                        S-waves need materials that "spring back" when displaced sideways. <strong style={{ color: design.colors.textPrimary }}>Liquids flow instead of springing back</strong>—no restoring force means no wave!
                     </p>
                  </div>

                  <div style={{ padding: '24px', borderRadius: design.radius.lg, background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40` }}>
                     <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.primary, marginBottom: '8px' }}>✓ Why P-Waves Work Everywhere</p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                        P-waves use compression. Both solids AND liquids resist being compressed—that's why P-waves travel through Earth's liquid core!
                     </p>
                  </div>

                  <div style={{ padding: '24px', borderRadius: design.radius.lg, background: design.colors.successMuted, border: `1px solid ${design.colors.success}40` }}>
                     <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.success, marginBottom: '8px' }}>🌍 Earth's Liquid Core Discovery</p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                        Scientists noticed an "S-wave shadow zone"—S-waves never arrived on Earth's opposite side. This proved the outer core is liquid!
                     </p>
                  </div>
               </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_play')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('transfer')}>Real-World Uses →</Button>
            </div>
         </div>
      );
   }

   // TRANSFER
   if (phase === 'transfer') {
      const app = apps[transferIndex];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Tab bar */}
               <div style={{ display: 'flex', gap: '8px', padding: '16px', borderBottom: `1px solid ${design.colors.border}`, overflowX: 'auto' }}>
                  {apps.map((a, i) => (
                     <button
                        key={i}
                        onClick={() => setTransferIndex(i)}
                        style={{
                           padding: '10px 16px',
                           borderRadius: design.radius.md,
                           border: 'none',
                           background: i === transferIndex ? a.color : design.colors.bgTertiary,
                           color: i === transferIndex ? 'white' : design.colors.textSecondary,
                           fontSize: '13px',
                           fontWeight: 600,
                           cursor: 'pointer',
                           whiteSpace: 'nowrap',
                        }}
                     >
                        {a.icon} {a.title}
                     </button>
                  ))}
               </div>

               {/* Content */}
               <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                     <div style={{
                        width: '56px', height: '56px', borderRadius: design.radius.lg,
                        background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px'
                     }}>
                        {app.icon}
                     </div>
                     <div>
                        <h3 style={{ fontSize: '22px', fontWeight: 800, color: design.colors.textPrimary }}>{app.title}</h3>
                        <p style={{ fontSize: '14px', color: app.color, fontWeight: 600 }}>{app.stat}</p>
                     </div>
                  </div>

                  <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>
                     {app.desc}
                  </p>
               </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_review')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('test')}>Take the Test →</Button>
            </div>
         </div>
      );
   }

   // TEST
   if (phase === 'test') {
      const q = testQuestions[testIndex];
      const isLast = testIndex === testQuestions.length - 1;

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.primary }}>Question {testIndex + 1} of {testQuestions.length}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.success }}>Score: {testScore}/{testQuestions.length}</p>
               </div>

               <h3 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '20px', lineHeight: 1.4 }}>{q.q}</h3>

               <div style={{ display: 'grid', gap: '10px' }}>
                  {q.opts.map((opt, i) => {
                     const isCorrect = i === q.correct;
                     const isSelected = i === selectedAnswer;
                     let bg = design.colors.bgSecondary;
                     let border = design.colors.border;
                     let textColor = design.colors.textPrimary;

                     if (selectedAnswer !== null) {
                        if (isCorrect) { bg = design.colors.successMuted; border = design.colors.success; textColor = design.colors.success; }
                        else if (isSelected) { bg = `${design.colors.danger}20`; border = design.colors.danger; textColor = design.colors.danger; }
                     }

                     return (
                        <button
                           key={i}
                           onClick={() => {
                              if (selectedAnswer !== null) return;
                              setSelectedAnswer(i);
                              setShowExplanation(true);
                              if (isCorrect) setTestScore(s => s + 1);
                              emit('answer_submitted', { questionIndex: testIndex, answer: opt, isCorrect });
                           }}
                           style={{
                              padding: '16px',
                              borderRadius: design.radius.md,
                              border: `2px solid ${border}`,
                              background: bg,
                              textAlign: 'left',
                              cursor: selectedAnswer === null ? 'pointer' : 'default',
                           }}
                        >
                           <p style={{ fontSize: '14px', color: textColor }}>{opt}</p>
                        </button>
                     );
                  })}
               </div>

               {showExplanation && (
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: design.radius.md, background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary, marginBottom: '6px' }}>Explanation</p>
                     <p style={{ fontSize: '13px', color: design.colors.textSecondary, lineHeight: 1.5 }}>{q.explain}</p>
                  </div>
               )}
            </div>

            {showExplanation && (
               <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary }}>
                  <Button
                     onClick={() => {
                        if (isLast) {
                           emit('test_completed', { score: testScore, maxScore: testQuestions.length });
                           goToPhase('mastery');
                        } else {
                           setTestIndex(i => i + 1);
                           setSelectedAnswer(null);
                           setShowExplanation(false);
                        }
                     }}
                     fullWidth
                  >
                     {isLast ? 'See Results →' : 'Next Question →'}
                  </Button>
               </div>
            )}
         </div>
      );
   }

   // MASTERY
   if (phase === 'mastery') {
      const percentage = Math.round((testScore / testQuestions.length) * 100);

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
            {/* Confetti */}
            {Array.from({ length: 40 }).map((_, i) => (
               <div
                  key={i}
                  style={{
                     position: 'absolute',
                     left: `${Math.random() * 100}%`,
                     top: '-20px',
                     width: '10px',
                     height: '10px',
                     background: [design.colors.primary, design.colors.secondary, design.colors.success, design.colors.warning][i % 4],
                     borderRadius: '2px',
                     animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
                  }}
               />
            ))}
            <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>

            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
               <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${design.colors.primary} 0%, #c2410c 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '24px', boxShadow: design.shadow.glow(design.colors.primary),
               }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>

               <h1 style={{ fontSize: '32px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '8px' }}>
                  Seismic Master!
               </h1>
               <p style={{ fontSize: '18px', color: design.colors.textSecondary, marginBottom: '32px' }}>
                  You scored <span style={{ color: design.colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '360px', width: '100%', marginBottom: '32px' }}>
                  {[
                     { icon: '🌊', label: 'P = Compression' },
                     { icon: '↕️', label: 'S = Shear' },
                     { icon: '💧', label: 'No S in liquids' },
                     { icon: '🌍', label: 'Liquid outer core' },
                  ].map((item, i) => (
                     <div key={i} style={{ padding: '16px', borderRadius: design.radius.md, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                        <div style={{ fontSize: '12px', color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               <Button onClick={() => emit('game_completed', { score: testScore, maxScore: testQuestions.length })}>
                  Complete Lesson ✓
               </Button>
            </div>
         </div>
      );
   }

   return null;
};

export default PWavesSWavesRenderer;
