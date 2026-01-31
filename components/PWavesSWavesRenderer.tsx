'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// P-WAVES VS S-WAVES RENDERER - Premium Apple/Airbnb Design
// Gold Standard: Sequential transfer navigation with completedApps tracking
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
   hook: 'Hook',
   predict: 'Predict',
   play: 'Lab',
   review: 'Review',
   twist_predict: 'Twist Predict',
   twist_play: 'Twist Lab',
   twist_review: 'Twist Review',
   transfer: 'Transfer',
   test: 'Test',
   mastery: 'Mastery'
};

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

interface PWavesSWavesRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
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

const PWavesSWavesRenderer: React.FC<PWavesSWavesRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
   // Core state
   const [phase, setPhase] = useState<Phase>(() => {
      if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
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

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

   // Sync with external phase
   useEffect(() => {
      if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase, phase]);

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

   // Simplified navigation
   const goToPhase = useCallback((newPhase: Phase) => {
      if (!phaseOrder.includes(newPhase)) return;
      setPhase(newPhase);
      playSound('transition');
      emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
      onPhaseComplete?.(newPhase);
   }, [phase, playSound, emitEvent, onPhaseComplete]);

   const goNext = useCallback(() => {
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
   }, [phase, goToPhase]);

   const goBack = useCallback(() => {
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
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
      {
         question: 'Which seismic wave arrives first at a monitoring station?',
         options: [
            { text: 'S-wave (Secondary)', correct: false },
            { text: 'P-wave (Primary)', correct: true },
            { text: 'Surface wave', correct: false },
            { text: 'Both arrive together', correct: false }
         ],
         explanation: 'P-waves (Primary waves) travel about 1.7x faster than S-waves through rock, so they always arrive first—hence the name "Primary."'
      },
      {
         question: 'How did scientists discover Earth\'s outer core is liquid?',
         options: [
            { text: 'Temperature measurements', correct: false },
            { text: 'S-wave shadow zone', correct: true },
            { text: 'Drilling experiments', correct: false },
            { text: 'Satellite imagery', correct: false }
         ],
         explanation: 'S-waves cannot travel through liquids. Scientists found that S-waves disappear on the opposite side of Earth after an earthquake, creating a "shadow zone" that proves the outer core is liquid.'
      },
      {
         question: 'How do particles move in a P-wave?',
         options: [
            { text: 'Perpendicular to wave direction', correct: false },
            { text: 'Parallel to wave direction (compression)', correct: true },
            { text: 'In circular orbits', correct: false },
            { text: 'They don\'t move', correct: false }
         ],
         explanation: 'P-waves are compression waves—particles push and pull back and forth parallel to the direction the wave travels, like a slinky being pushed from one end.'
      },
      {
         question: 'Why can\'t S-waves travel through liquids?',
         options: [
            { text: 'Liquids are too dense', correct: false },
            { text: 'Liquids move too fast', correct: false },
            { text: 'Liquids cannot support shear stress', correct: true },
            { text: 'S-waves are always slower', correct: false }
         ],
         explanation: 'S-waves require the material to "spring back" when displaced sideways (shear). Liquids flow instead of springing back—there\'s no restoring force to propagate the wave.'
      },
      {
         question: 'In an earthquake, what causes the first sharp jolt you feel?',
         options: [
            { text: 'S-wave arrival', correct: false },
            { text: 'P-wave arrival', correct: true },
            { text: 'Surface wave', correct: false },
            { text: 'Aftershock', correct: false }
         ],
         explanation: 'The faster P-wave arrives first as a sharp, quick jolt. The more damaging S-wave arrives seconds later with stronger shaking.'
      },
      {
         question: 'Medical ultrasound uses which type of wave principle?',
         options: [
            { text: 'S-waves (shear)', correct: false },
            { text: 'P-waves (compression)', correct: true },
            { text: 'Surface waves', correct: false },
            { text: 'Electromagnetic waves', correct: false }
         ],
         explanation: 'Ultrasound uses compression waves (same principle as P-waves) because they can travel through fluids like blood and amniotic fluid.'
      },
      {
         question: 'How do oil companies use P and S waves together?',
         options: [
            { text: 'Only P-waves are used', correct: false },
            { text: 'S-waves reflect differently off fluid reservoirs', correct: true },
            { text: 'For legal compliance', correct: false },
            { text: 'They cannot be used together', correct: false }
         ],
         explanation: 'S-waves are blocked by fluid-filled reservoirs while P-waves pass through. This difference helps locate underground oil and gas deposits.'
      },
      {
         question: 'If you wanted to detect a liquid layer inside another planet, what would you look for?',
         options: [
            { text: 'Higher temperatures', correct: false },
            { text: 'S-wave shadow zone', correct: true },
            { text: 'Magnetic field changes', correct: false },
            { text: 'Visual light reflection', correct: false }
         ],
         explanation: 'Just like on Earth, an S-wave shadow zone would indicate liquid layers—this is how planetary scientists study the interiors of planets and moons.'
      },
      {
         question: 'What happens when P-waves enter the liquid outer core?',
         options: [
            { text: 'They stop completely', correct: false },
            { text: 'They speed up dramatically', correct: false },
            { text: 'They slow down and bend', correct: true },
            { text: 'They convert to S-waves', correct: false }
         ],
         explanation: 'P-waves slow down in liquid (from ~14 km/s to ~8 km/s) and bend (refract) at the boundary. This creates a P-wave shadow zone between 104° and 140° from the epicenter.'
      },
      {
         question: 'Why do buildings often shake more during S-wave passage than P-wave?',
         options: [
            { text: 'S-waves are always larger', correct: false },
            { text: 'S-wave shear motion causes more horizontal movement', correct: true },
            { text: 'P-waves are absorbed by ground', correct: false },
            { text: 'S-waves last longer', correct: false }
         ],
         explanation: 'S-waves cause side-to-side (shear) motion which is more damaging to buildings than the back-and-forth compression of P-waves. Buildings are better at resisting vertical loads than horizontal shaking.'
      }
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
         zIndex: 10,
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
            onClick={(e) => {
               e.preventDefault();
               if (!disabled) {
                  onClick();
               }
            }}
            style={{ ...baseStyle, ...variants[variant] }}
         >
            {text}
         </button>
      );
   };

   const renderProgressBar = () => {
      const currentIdx = phaseOrder.indexOf(phase);
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
            {phaseOrder.map((_, i) => (
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

   const renderBottomNav = (backPhase: Phase | null, nextPhase: Phase | null, nextText: string = 'Continue →', nextDisabled: boolean = false) => (
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

   // Wave visualization component - Premium SVG Graphics
   const renderWaveVisualization = () => {
      const sWaveBlocked = waveType === 's' && medium === 'liquid';
      const numParticles = 14;

      return (
         <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 600 240" style={{ width: '100%', height: '100%', maxHeight: '240px' }}>
               <defs>
                  {/* ========== PREMIUM GRADIENT DEFINITIONS ========== */}

                  {/* P-Wave gradient - warm orange/amber tones */}
                  <linearGradient id="pswPWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="#fcd34d" />
                     <stop offset="25%" stopColor="#fbbf24" />
                     <stop offset="50%" stopColor="#f97316" />
                     <stop offset="75%" stopColor="#ea580c" />
                     <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>

                  {/* S-Wave gradient - cool purple/violet tones */}
                  <linearGradient id="pswSWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="#e9d5ff" />
                     <stop offset="25%" stopColor="#c4b5fd" />
                     <stop offset="50%" stopColor="#a78bfa" />
                     <stop offset="75%" stopColor="#8b5cf6" />
                     <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>

                  {/* Solid medium gradient - rocky/granite appearance */}
                  <linearGradient id="pswSolidMedium" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#52525b" />
                     <stop offset="20%" stopColor="#3f3f46" />
                     <stop offset="50%" stopColor="#27272a" />
                     <stop offset="80%" stopColor="#1f1f23" />
                     <stop offset="100%" stopColor="#18181b" />
                  </linearGradient>

                  {/* Liquid medium gradient - deep ocean/molten appearance */}
                  <linearGradient id="pswLiquidMedium" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                     <stop offset="25%" stopColor="#0284c7" stopOpacity="0.35" />
                     <stop offset="50%" stopColor="#0369a1" stopOpacity="0.3" />
                     <stop offset="75%" stopColor="#075985" stopOpacity="0.25" />
                     <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.2" />
                  </linearGradient>

                  {/* Wave source radial gradient */}
                  <radialGradient id="pswSourceGlow" cx="50%" cy="50%" r="50%">
                     <stop offset="0%" stopColor={waveType === 'p' ? '#fbbf24' : '#c4b5fd'} stopOpacity="1" />
                     <stop offset="40%" stopColor={waveType === 'p' ? '#f97316' : '#a78bfa'} stopOpacity="0.8" />
                     <stop offset="70%" stopColor={waveType === 'p' ? '#ea580c' : '#8b5cf6'} stopOpacity="0.5" />
                     <stop offset="100%" stopColor={waveType === 'p' ? '#c2410c' : '#7c3aed'} stopOpacity="0" />
                  </radialGradient>

                  {/* Earth cross-section gradient for background depth */}
                  <radialGradient id="pswEarthCrossSection" cx="50%" cy="120%" r="100%">
                     <stop offset="0%" stopColor="#78350f" stopOpacity="0.15" />
                     <stop offset="30%" stopColor="#451a03" stopOpacity="0.1" />
                     <stop offset="60%" stopColor="#1c0a00" stopOpacity="0.05" />
                     <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
                  </radialGradient>

                  {/* Compression zone gradient for P-wave visualization */}
                  <linearGradient id="pswCompressionZone" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                     <stop offset="40%" stopColor="#fb923c" stopOpacity="0.4" />
                     <stop offset="50%" stopColor="#fdba74" stopOpacity="0.6" />
                     <stop offset="60%" stopColor="#fb923c" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>

                  {/* Shear zone gradient for S-wave visualization */}
                  <linearGradient id="pswShearZone" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
                     <stop offset="40%" stopColor="#c4b5fd" stopOpacity="0.4" />
                     <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.6" />
                     <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </linearGradient>

                  {/* ========== GLOW FILTERS ========== */}

                  {/* Particle glow filter */}
                  <filter id="pswParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Intense source glow */}
                  <filter id="pswSourceGlowFilter" x="-150%" y="-150%" width="400%" height="400%">
                     <feGaussianBlur stdDeviation="5" result="blur1" />
                     <feGaussianBlur stdDeviation="2" result="blur2" />
                     <feMerge>
                        <feMergeNode in="blur1" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Wave propagation pulse filter */}
                  <filter id="pswWavePulse" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="4" result="blur" />
                     <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Danger glow for blocked indicator */}
                  <filter id="pswDangerGlow" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Connection line gradient */}
                  <linearGradient id="pswConnectionLine" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#71717a" stopOpacity="0.6" />
                     <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#71717a" stopOpacity="0.6" />
                  </linearGradient>
               </defs>

               {/* Background with earth cross-section effect */}
               <rect width="600" height="240" fill="#09090b" />
               <rect width="600" height="240" fill="url(#pswEarthCrossSection)" />

               {/* Subtle grid pattern for scientific feel */}
               {Array.from({ length: 12 }).map((_, i) => (
                  <line key={`vgrid-${i}`} x1={50 + i * 50} y1="30" x2={50 + i * 50} y2="200" stroke="#27272a" strokeWidth="1" opacity="0.3" />
               ))}
               {Array.from({ length: 4 }).map((_, i) => (
                  <line key={`hgrid-${i}`} x1="40" y1={50 + i * 50} x2="560" y2={50 + i * 50} stroke="#27272a" strokeWidth="1" opacity="0.3" />
               ))}

               {/* Medium container with premium styling */}
               <rect x="40" y="40" width="520" height="150" rx="12"
                  fill={medium === 'solid' ? 'url(#pswSolidMedium)' : 'url(#pswLiquidMedium)'}
                  stroke={medium === 'solid' ? '#52525b' : '#0ea5e9'}
                  strokeWidth="2"
                  opacity="0.95" />

               {/* Medium inner glow effect */}
               <rect x="42" y="42" width="516" height="146" rx="10"
                  fill="none"
                  stroke={medium === 'solid' ? '#71717a' : '#38bdf8'}
                  strokeWidth="1"
                  opacity="0.3" />

               {/* Liquid wave effect when in liquid medium */}
               {medium === 'liquid' && (
                  <g opacity="0.4">
                     {Array.from({ length: 3 }).map((_, i) => (
                        <path
                           key={`liquidwave-${i}`}
                           d={`M 40 ${60 + i * 40} Q ${100 + Math.sin(timeRef.current + i) * 10} ${55 + i * 40} 160 ${60 + i * 40} T 280 ${60 + i * 40} T 400 ${60 + i * 40} T 520 ${60 + i * 40} T 560 ${60 + i * 40}`}
                           fill="none"
                           stroke="#38bdf8"
                           strokeWidth="1"
                           opacity={0.3 - i * 0.08}
                        />
                     ))}
                  </g>
               )}

               {/* Wave source with pulsing glow */}
               <g filter="url(#pswSourceGlowFilter)">
                  {/* Outer pulse ring */}
                  <circle cx="65" cy="115" r={isWaveActive ? 24 + Math.sin(timeRef.current * 8) * 4 : 22}
                     fill="none"
                     stroke={waveType === 'p' ? '#f97316' : '#a78bfa'}
                     strokeWidth="2"
                     opacity={isWaveActive ? 0.6 : 0.3} />

                  {/* Main source circle */}
                  <circle cx="65" cy="115" r="16"
                     fill="url(#pswSourceGlow)"
                     opacity={isWaveActive ? 1 : 0.7} />

                  {/* Inner bright core */}
                  <circle cx="65" cy="115" r="8"
                     fill={waveType === 'p' ? '#fcd34d' : '#e9d5ff'}
                     opacity={isWaveActive ? 0.9 : 0.6} />
               </g>

               {/* Wave propagation effect - compression rings for P-wave */}
               {waveType === 'p' && isWaveActive && (
                  <g>
                     {Array.from({ length: 3 }).map((_, i) => {
                        const ringProgress = (waveProgress - i * 0.1);
                        if (ringProgress <= 0 || ringProgress > 1) return null;
                        const ringX = 65 + ringProgress * 450;
                        return (
                           <ellipse
                              key={`pring-${i}`}
                              cx={ringX}
                              cy="115"
                              rx={12 + ringProgress * 8}
                              ry={40 - ringProgress * 10}
                              fill="url(#pswCompressionZone)"
                              opacity={0.5 * (1 - ringProgress)}
                              filter="url(#pswWavePulse)"
                           />
                        );
                     })}
                  </g>
               )}

               {/* Wave propagation effect - shear bands for S-wave */}
               {waveType === 's' && isWaveActive && !sWaveBlocked && (
                  <g>
                     {Array.from({ length: 3 }).map((_, i) => {
                        const bandProgress = (waveProgress - i * 0.1);
                        if (bandProgress <= 0 || bandProgress > 1) return null;
                        const bandX = 65 + bandProgress * 450;
                        return (
                           <rect
                              key={`sband-${i}`}
                              x={bandX - 10}
                              y={70}
                              width={20}
                              height={90}
                              rx={5}
                              fill="url(#pswShearZone)"
                              opacity={0.4 * (1 - bandProgress)}
                              filter="url(#pswWavePulse)"
                           />
                        );
                     })}
                  </g>
               )}

               {/* Particle chain with premium styling */}
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

                  const isBlocked = sWaveBlocked && i > 2;
                  const particleGradient = waveReached
                     ? (waveType === 'p' ? 'url(#pswPWaveGrad)' : 'url(#pswSWaveGrad)')
                     : '#52525b';

                  return (
                     <g key={i}>
                        {/* Connection line with gradient */}
                        {i < numParticles - 1 && (
                           <line
                              x1={baseX + offsetX}
                              y1={115 + offsetY}
                              x2={110 + (i + 1) * 32}
                              y2={115}
                              stroke="url(#pswConnectionLine)"
                              strokeWidth={isBlocked ? 1 : 2}
                              opacity={isBlocked ? 0.15 : 0.5}
                           />
                        )}

                        {/* Particle outer glow */}
                        {waveReached && !isBlocked && (
                           <circle
                              cx={baseX + offsetX}
                              cy={115 + offsetY}
                              r="12"
                              fill={waveType === 'p' ? '#f97316' : '#a78bfa'}
                              opacity={intensity * 0.3}
                              filter="url(#pswParticleGlow)"
                           />
                        )}

                        {/* Main particle */}
                        <circle
                           cx={baseX + offsetX}
                           cy={115 + offsetY}
                           r="8"
                           fill={particleGradient}
                           opacity={isBlocked ? 0.2 : 0.95}
                           filter={waveReached && !isBlocked ? 'url(#pswParticleGlow)' : undefined}
                        />

                        {/* Particle highlight */}
                        {!isBlocked && (
                           <circle
                              cx={baseX + offsetX - 2}
                              cy={115 + offsetY - 2}
                              r="3"
                              fill="white"
                              opacity={waveReached ? 0.4 : 0.15}
                           />
                        )}
                     </g>
                  );
               })}

               {/* S-wave blocked indicator with premium styling */}
               {sWaveBlocked && isWaveActive && waveProgress > 0.2 && (
                  <g filter="url(#pswDangerGlow)">
                     {/* Blocked zone visualization */}
                     <rect x="200" y="60" width="180" height="110" rx="10"
                        fill="#450a0a" fillOpacity="0.9"
                        stroke="#ef4444" strokeWidth="2" />

                     {/* X pattern */}
                     <line x1="220" y1="80" x2="360" y2="150" stroke="#ef4444" strokeWidth="3" opacity="0.6" />
                     <line x1="360" y1="80" x2="220" y2="150" stroke="#ef4444" strokeWidth="3" opacity="0.6" />

                     {/* Warning icon area */}
                     <circle cx="290" cy="100" r="18" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
                     <text x="290" y="107" textAnchor="middle" style={{ fontSize: '18px' }}>!</text>
                  </g>
               )}

               {/* Wave type indicator panel with premium styling */}
               <rect x="470" y="50" width="80" height="90" rx="10"
                  fill="#18181b"
                  stroke={waveType === 'p' ? '#f97316' : '#a78bfa'}
                  strokeWidth="2"
                  opacity="0.95" />

               {/* Wave type icon */}
               <circle cx="510" cy="80" r="18"
                  fill={waveType === 'p' ? 'url(#pswPWaveGrad)' : 'url(#pswSWaveGrad)'}
                  filter="url(#pswParticleGlow)" />

               {/* Direction arrows inside circle */}
               <text x="510" y="86" textAnchor="middle"
                  style={{ fontSize: '14px', fontWeight: 700, fill: '#18181b' }}>
                  {waveType === 'p' ? '\u2194' : '\u2195'}
               </text>
            </svg>

            {/* Labels outside SVG using typo system */}
            <div style={{
               width: '100%',
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'flex-start',
               padding: '8px 40px',
               marginTop: '4px'
            }}>
               {/* Left: Medium label */}
               <div style={{
                  fontSize: typo.small,
                  fontWeight: 700,
                  color: medium === 'solid' ? design.colors.solid : design.colors.liquid,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
               }}>
                  {medium === 'solid' ? 'Solid Medium (Rock)' : 'Liquid Medium'}
               </div>

               {/* Center: Motion explanation */}
               <div style={{
                  textAlign: 'center',
                  flex: 1,
                  padding: '0 16px'
               }}>
                  <div style={{
                     fontSize: typo.small,
                     color: design.colors.textSecondary,
                     marginBottom: '2px'
                  }}>
                     {waveType === 'p'
                        ? 'P-Wave: Compression motion parallel to direction'
                        : 'S-Wave: Shear motion perpendicular to direction'}
                  </div>
                  <div style={{
                     fontSize: typo.label,
                     color: design.colors.textTertiary
                  }}>
                     {waveType === 'p'
                        ? 'Speed: ~6-8 km/s in rock \u2022 Arrives FIRST'
                        : 'Speed: ~3.5-4.5 km/s in rock \u2022 Arrives SECOND'}
                  </div>
               </div>

               {/* Right: Wave type label */}
               <div style={{
                  textAlign: 'right'
               }}>
                  <div style={{
                     fontSize: typo.body,
                     fontWeight: 800,
                     color: waveType === 'p' ? design.colors.pWave : design.colors.sWave
                  }}>
                     {waveType === 'p' ? 'P-Wave' : 'S-Wave'}
                  </div>
                  <div style={{
                     fontSize: typo.label,
                     color: design.colors.textTertiary
                  }}>
                     {waveType === 'p' ? 'Compression' : 'Shear'}
                  </div>
               </div>
            </div>

            {/* S-wave blocked message outside SVG */}
            {sWaveBlocked && isWaveActive && waveProgress > 0.2 && (
               <div style={{
                  marginTop: '8px',
                  padding: '10px 20px',
                  borderRadius: design.radius.md,
                  background: design.colors.dangerMuted,
                  border: `2px solid ${design.colors.danger}`,
                  textAlign: 'center'
               }}>
                  <div style={{
                     fontSize: typo.body,
                     fontWeight: 800,
                     color: design.colors.danger,
                     marginBottom: '2px'
                  }}>
                     S-WAVE BLOCKED
                  </div>
                  <div style={{
                     fontSize: typo.small,
                     color: '#fca5a5'
                  }}>
                     Liquids cannot support shear stress
                  </div>
               </div>
            )}
         </div>
      );
   };

   // ============ PHASE RENDERS ============

   // HOOK PHASE
   if (phase === 'hook') {
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
                     onClick={() => setGuidedMode(!guidedMode)}
                     style={{
                        width: '48px',
                        height: '26px',
                        borderRadius: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        background: guidedMode ? design.colors.success : design.colors.bgElevated,
                        position: 'relative',
                        transition: 'background 0.2s',
                        zIndex: 10,
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

               {renderButton('Begin Exploration →', () => goToPhase('predict'))}

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
   if (phase === 'predict') {
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
                        onClick={() => {
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
                           zIndex: 10,
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
            {renderBottomNav('hook', 'play', 'Test Your Prediction →', !prediction)}
         </div>
      );
   }

   // PLAY PHASE
   if (phase === 'play') {
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
                        onClick={() => setWaveType('p')}
                        style={{
                           flex: 1,
                           padding: '16px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           zIndex: 10,
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
                        onClick={() => setWaveType('s')}
                        style={{
                           flex: 1,
                           padding: '16px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           zIndex: 10,
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
            {renderBottomNav('predict', 'review', 'See What You Learned →', !hasExperimented)}
         </div>
      );
   }

   // REVIEW PHASE
   if (phase === 'review') {
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
            {renderBottomNav('play', 'twist_predict', 'The Liquid Puzzle →')}
         </div>
      );
   }

   // TWIST_PREDICT PHASE
   if (phase === 'twist_predict') {
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
                        onClick={() => {
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
                           zIndex: 10,
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
            {renderBottomNav('review', 'twist_play', 'Test in Liquid →', !twistPrediction)}
         </div>
      );
   }

   // TWIST_PLAY PHASE
   if (phase === 'twist_play') {
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
                        onClick={() => setMedium('solid')}
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
                           zIndex: 10,
                        }}
                     >
                        🪨 Solid Rock
                     </button>
                     <button
                        onClick={() => setMedium('liquid')}
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
                           zIndex: 10,
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
                        onClick={() => setWaveType('p')}
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
                           zIndex: 10,
                        }}
                     >
                        ← → P-Wave
                     </button>
                     <button
                        onClick={() => setWaveType('s')}
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
                           zIndex: 10,
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
            {renderBottomNav('twist_predict', 'twist_review', 'Understand Why →', !hasSentSWaveInLiquid)}
         </div>
      );
   }

   // TWIST_REVIEW PHASE
   if (phase === 'twist_review') {
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
            {renderBottomNav('twist_play', 'transfer', 'Real-World Applications →')}
         </div>
      );
   }

   // TRANSFER PHASE - GOLD STANDARD with completedApps tracking
   if (phase === 'transfer') {
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
                        onClick={() => setActiveApp(i)}
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
                           zIndex: 10,
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

                  {/* Next Application button - advances through 4 real world applications */}
                  {activeApp < applications.length - 1 && (
                     <button
                        onClick={() => {
                           const newCompleted = new Set(completedApps);
                           newCompleted.add(activeApp);
                           setCompletedApps(newCompleted);
                           setActiveApp(activeApp + 1);
                           emitEvent('app_explored', { appIndex: activeApp, appTitle: app.title });
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
                           border: 'none',
                           background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`,
                           color: 'white',
                           fontSize: '14px',
                           fontWeight: 600,
                           cursor: 'pointer',
                           boxShadow: design.shadow.md,
                           zIndex: 10,
                        }}
                     >
                        Next Application →
                     </button>
                  )}

                  {/* Mark last app as complete */}
                  {activeApp === applications.length - 1 && !completedApps.has(activeApp) && (
                     <button
                        onClick={() => {
                           const newCompleted = new Set(completedApps);
                           newCompleted.add(activeApp);
                           setCompletedApps(newCompleted);
                           emitEvent('app_explored', { appIndex: activeApp, appTitle: app.title });
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
                           zIndex: 10,
                        }}
                     >
                        ✓ Complete All Applications
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
            {renderBottomNav('twist_review', 'test', 'Take the Quiz →', !allAppsCompleted)}
         </div>
      );
   }

   // TEST PHASE
   if (phase === 'test') {
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
                  {q.question}
               </h3>

               {/* Answer options */}
               <div style={{ display: 'grid', gap: '12px' }}>
                  {q.options.map((opt, i) => {
                     const isCorrect = opt.correct;
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
                           onClick={() => {
                              if (selectedAnswer !== null) return;
                              setSelectedAnswer(i);
                              setShowExplanation(true);
                              if (isCorrect) setTestScore(s => s + 1);
                              emitEvent('test_answered', { questionIndex: testIndex, answer: opt.text, isCorrect });
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
                              zIndex: 10,
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
                           <p style={{ fontSize: '14px', color: textColor, lineHeight: 1.4 }}>{opt.text}</p>
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
                        {q.explanation}
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
                           goToPhase('mastery');
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
   if (phase === 'mastery') {
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
                     goToPhase('test');
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
