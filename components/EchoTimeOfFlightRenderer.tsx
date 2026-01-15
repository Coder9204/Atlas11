'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// ECHO TIME-OF-FLIGHT RENDERER - Premium Apple/Airbnb Design
// ============================================================================

export interface GameEvent {
   eventType: 'phase_changed' | 'prediction_made' | 'experiment_action' | 'parameter_changed' |
              'answer_submitted' | 'hint_requested' | 'milestone_reached' | 'game_completed' |
              'game_started' | 'visual_state_update' | 'test_completed' | 'lesson_completed' |
              'twist_prediction_made' | 'clap_sent' | 'echo_received' | 'distance_calculated';
   gameType: string;
   gameTitle: string;
   details: Record<string, unknown>;
   timestamp: number;
}

interface EchoTimeOfFlightRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// Premium Design System
const design = {
   colors: {
      bgPrimary: '#020617',     // slate-950
      bgSecondary: '#0f172a',   // slate-900
      bgTertiary: '#1e293b',    // slate-800
      bgElevated: '#334155',    // slate-700

      textPrimary: '#f8fafc',   // slate-50
      textSecondary: '#94a3b8', // slate-400
      textTertiary: '#64748b',  // slate-500
      textMuted: '#475569',     // slate-600

      primary: '#0ea5e9',       // sky-500
      primaryHover: '#0284c7',  // sky-600
      primaryMuted: '#082f49',  // sky-950

      secondary: '#a855f7',     // purple-500
      secondaryMuted: '#3b0764', // purple-950

      success: '#22c55e',
      successMuted: '#052e16',
      warning: '#eab308',
      danger: '#ef4444',

      border: '#334155',
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

const EchoTimeOfFlightRenderer: React.FC<EchoTimeOfFlightRendererProps> = ({ onGameEvent, gamePhase }) => {
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   const [phase, setPhase] = useState<Phase>(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
      return 'hook';
   });
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [distance, setDistance] = useState(34);
   const [clapSent, setClapSent] = useState(false);
   const [echoReceived, setEchoReceived] = useState(false);
   const [waveProgress, setWaveProgress] = useState(0);
   const [hasExperimented, setHasExperimented] = useState(false);
   const [environment, setEnvironment] = useState<'indoor' | 'outdoor'>('indoor');
   const [hasTriedOutdoor, setHasTriedOutdoor] = useState(false);
   const [guidedMode, setGuidedMode] = useState(true);

   const [testIndex, setTestIndex] = useState(0);
   const [testScore, setTestScore] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
   const [showExplanation, setShowExplanation] = useState(false);
   const [transferIndex, setTransferIndex] = useState(0);

   const animationRef = useRef<number>();
   const isNavigating = useRef(false);

   const soundSpeed = 343;
   const echoDelay = (2 * distance) / soundSpeed;

   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase]);

   useEffect(() => {
      const animate = () => {
         if (clapSent && !echoReceived) {
            setWaveProgress(prev => {
               if (prev >= 1) {
                  setEchoReceived(true);
                  return 1;
               }
               return prev + 0.025;
            });
         }
         animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
   }, [clapSent, echoReceived]);

   const emit = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
      onGameEvent?.({
         eventType,
         gameType: 'echo_time_of_flight',
         gameTitle: 'Echo Time-of-Flight',
         details: { phase, guidedMode, ...details },
         timestamp: Date.now()
      });
   }, [onGameEvent, phase, guidedMode]);

   const goToPhase = useCallback((newPhase: Phase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      setPhase(newPhase);
      emit('phase_changed', { newPhase });
      setTimeout(() => { isNavigating.current = false; }, 300);
   }, [emit]);

   const sendClap = useCallback(() => {
      if (clapSent) return;
      setClapSent(true);
      setEchoReceived(false);
      setWaveProgress(0);
      setHasExperimented(true);
      if (environment === 'outdoor') setHasTriedOutdoor(true);
      emit('clap_sent', { distance, environment });
   }, [clapSent, distance, environment, emit]);

   const resetExperiment = useCallback(() => {
      setClapSent(false);
      setEchoReceived(false);
      setWaveProgress(0);
   }, []);

   const testQuestions = [
      { q: 'If an echo returns 0.2s after a clap, how far is the wall?', opts: ['~68m', '~34m', '~17m', '~7m'], correct: 1, explain: 'Distance = (343 × 0.2) ÷ 2 = 34.3m. Divide by 2 because sound travels to wall AND back.' },
      { q: 'Why do we divide the time by 2?', opts: ['Sound slows down', 'Sound makes a round trip', 'Air resistance', 'Temperature effect'], correct: 1, explain: 'Sound travels TO the object and BACK, so the measured time is twice the one-way travel time.' },
      { q: 'How fast does sound travel in air at room temp?', opts: ['~100 m/s', '~343 m/s', '~1000 m/s', '~3000 m/s'], correct: 1, explain: 'Sound travels at approximately 343 m/s (767 mph) at 20°C in air.' },
      { q: 'Why do we not hear echoes outdoors easily?', opts: ['Sound is faster outside', 'No reflective surfaces nearby', 'Wind blocks echoes', 'Sunlight absorbs sound'], correct: 1, explain: 'Echoes require reflective surfaces. Open spaces lack nearby walls to reflect sound back.' },
      { q: 'What technology uses echo principles?', opts: ['Cameras', 'Sonar and radar', 'Thermometers', 'Barometers'], correct: 1, explain: 'Sonar (sound) and radar (radio waves) both use time-of-flight to measure distances.' },
      { q: 'A bat hears an echo 0.01s after squeaking. How far is the insect?', opts: ['~3.4m', '~1.7m', '~6.8m', '~0.34m'], correct: 1, explain: 'Distance = (343 × 0.01) ÷ 2 = 1.715m. The insect is about 1.7 meters away.' },
      { q: 'If temperature increases, sound speed...', opts: ['Decreases', 'Stays the same', 'Increases', 'Becomes zero'], correct: 2, explain: 'Sound travels faster in warmer air because molecules move faster and transmit vibrations quicker.' },
      { q: 'Submarines use sonar because...', opts: ['Light works better underwater', 'Sound travels well in water', 'Radio works in water', 'Water is transparent'], correct: 1, explain: 'Sound travels excellently in water (faster than air!), while light and radio are absorbed quickly.' },
      { q: 'Car parking sensors use...', opts: ['Light reflection', 'Ultrasonic echoes', 'Magnetic fields', 'Heat detection'], correct: 1, explain: 'Parking sensors emit ultrasonic pulses and measure the echo time to detect obstacles.' },
      { q: 'For a 0.1s echo delay, the wall is at...', opts: ['~34m', '~17m', '~68m', '~3.4m'], correct: 1, explain: 'Distance = (343 × 0.1) ÷ 2 = 17.15m. Always divide by 2 for round-trip!' }
   ];

   const apps = [
      { icon: '🦇', title: 'Bat Echolocation', desc: 'Bats emit ultrasonic squeaks (20-200 kHz) and listen for echoes to navigate and hunt insects in complete darkness.', stat: '1mm precision', color: design.colors.primary },
      { icon: '🚢', title: 'Submarine Sonar', desc: 'Ships and submarines use sonar to detect underwater objects, map the ocean floor, and navigate safely.', stat: '10km+ range', color: design.colors.success },
      { icon: '🚗', title: 'Parking Sensors', desc: 'Ultrasonic sensors in cars measure distance to obstacles, beeping faster as you get closer to objects.', stat: '0-5m range', color: design.colors.secondary },
      { icon: '🏥', title: 'Medical Ultrasound', desc: 'Doctors use sound echoes to create images of organs, fetuses, and blood flow without radiation.', stat: '20MHz frequency', color: design.colors.warning }
   ];

   // Premium Button Component
   const Button = ({ children, onClick, variant = 'primary', disabled = false, fullWidth = false }: {
      children: React.ReactNode;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost';
      disabled?: boolean;
      fullWidth?: boolean;
   }) => (
      <button
         onClick={() => !disabled && onClick()}
         style={{
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
            ...(variant === 'primary' ? {
               background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`,
               color: 'white',
               boxShadow: design.shadow.md,
            } : variant === 'ghost' ? {
               background: 'transparent',
               color: design.colors.textSecondary,
            } : {
               background: design.colors.bgTertiary,
               color: design.colors.textSecondary,
            })
         }}
      >
         {children}
      </button>
   );

   const ProgressBar = () => {
      const currentIdx = validPhases.indexOf(phase);
      return (
         <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '16px', borderBottom: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary,
         }}>
            {validPhases.map((_, i) => (
               <div key={i} style={{
                  width: i === currentIdx ? '24px' : '8px', height: '8px', borderRadius: design.radius.full,
                  background: i < currentIdx ? design.colors.success : i === currentIdx ? design.colors.primary : design.colors.bgElevated,
                  transition: 'all 0.3s ease',
               }} />
            ))}
            <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 600, color: design.colors.textTertiary }}>
               {currentIdx + 1}/10
            </span>
         </div>
      );
   };

   // Echo Visualization
   const EchoVis = () => {
      const showEcho = environment === 'indoor';
      return (
         <svg viewBox="0 0 600 220" style={{ width: '100%', height: '100%', maxHeight: '220px' }}>
            <defs>
               <linearGradient id="wallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
               </linearGradient>
               <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>
            </defs>

            {/* Background */}
            <rect width="600" height="220" fill={design.colors.bgPrimary} />

            {/* Environment label */}
            <text x="300" y="20" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 700, fill: design.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               {environment === 'indoor' ? 'Indoor (Wall Nearby)' : 'Outdoor (Open Space)'}
            </text>

            {/* Person */}
            <g transform="translate(80, 110)">
               <circle cx="0" cy="-20" r="15" fill={design.colors.primary} />
               <rect x="-10" y="0" width="20" height="40" rx="5" fill={design.colors.primary} />
               <text x="0" y="70" textAnchor="middle" style={{ fontSize: '10px', fill: design.colors.textSecondary }}>You</text>
            </g>

            {/* Wall (indoor only) */}
            {environment === 'indoor' && (
               <g>
                  <rect x="520" y="40" width="30" height="140" rx="4" fill="url(#wallGrad)" stroke={design.colors.border} />
                  <text x="535" y="200" textAnchor="middle" style={{ fontSize: '10px', fill: design.colors.textSecondary }}>Wall</text>
               </g>
            )}

            {/* Sound waves */}
            {clapSent && (
               <g>
                  {/* Outgoing wave */}
                  <circle
                     cx={80 + waveProgress * (showEcho ? 440 : 500)}
                     cy="100"
                     r={12}
                     fill={design.colors.primary}
                     filter="url(#glow)"
                     opacity={waveProgress < 0.5 ? 1 : 1 - (waveProgress - 0.5) * 2}
                  />
                  {/* Wave trail */}
                  {[0.8, 0.6, 0.4].map((opacity, i) => (
                     <circle
                        key={i}
                        cx={80 + Math.max(0, waveProgress - 0.1 * (i + 1)) * (showEcho ? 440 : 500)}
                        cy="100"
                        r={8 - i * 2}
                        fill={design.colors.primary}
                        opacity={opacity * (waveProgress < 0.5 ? 1 : 0)}
                     />
                  ))}

                  {/* Echo (indoor only) */}
                  {showEcho && waveProgress > 0.5 && (
                     <circle
                        cx={520 - (waveProgress - 0.5) * 2 * 440}
                        cy="100"
                        r={10}
                        fill={design.colors.secondary}
                        filter="url(#glow)"
                        opacity={echoReceived ? 0 : 1}
                     />
                  )}
               </g>
            )}

            {/* Distance indicator */}
            {environment === 'indoor' && (
               <g>
                  <line x1="100" y1="180" x2="520" y2="180" stroke={design.colors.textMuted} strokeWidth="1" strokeDasharray="4,4" />
                  <text x="310" y="195" textAnchor="middle" style={{ fontSize: '11px', fill: design.colors.textSecondary }}>
                     {distance}m
                  </text>
               </g>
            )}

            {/* Status */}
            {clapSent && (
               <g>
                  <rect x="200" y="30" width="200" height="30" rx="6" fill={design.colors.bgSecondary} fillOpacity="0.9" />
                  <text x="300" y="50" textAnchor="middle" style={{ fontSize: '12px', fontWeight: 600, fill: echoReceived ? design.colors.success : design.colors.primary }}>
                     {echoReceived ? (showEcho ? `Echo received! (${(echoDelay * 1000).toFixed(0)}ms)` : 'No echo - no surfaces!') : 'Sound traveling...'}
                  </text>
               </g>
            )}
         </svg>
      );
   };

   // ============ PHASE RENDERS ============

   if (phase === 'hook') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #030712 100%)`, fontFamily: design.font.sans }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
               <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: design.shadow.glow(design.colors.primary) }}>
                  <span style={{ fontSize: '40px' }}>👏</span>
               </div>

               <h1 style={{ fontSize: '36px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '16px', letterSpacing: '-0.02em' }}>
                  Echo Time-of-Flight
               </h1>

               <p style={{ fontSize: '18px', color: design.colors.textSecondary, marginBottom: '40px', maxWidth: '400px', lineHeight: 1.6 }}>
                  Discover how{' '}
                  <span style={{ color: design.colors.primary, fontWeight: 600 }}>echoes reveal distance</span>
                  —the same physics used by bats and submarines.
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '420px', width: '100%', marginBottom: '40px' }}>
                  {[
                     { icon: '🔊', label: 'Sound Waves' },
                     { icon: '⏱️', label: 'Time Measurement' },
                     { icon: '📏', label: 'Distance Calculation' },
                  ].map((item, i) => (
                     <div key={i} style={{ padding: '20px 12px', borderRadius: design.radius.lg, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '12px 20px', borderRadius: design.radius.full, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
                  <span style={{ fontSize: '14px', color: design.colors.textSecondary }}>AI Coach</span>
                  <button onClick={() => setGuidedMode(!guidedMode)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: guidedMode ? design.colors.success : design.colors.bgElevated, position: 'relative', transition: 'background 0.2s' }}>
                     <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: guidedMode ? '23px' : '3px', transition: 'left 0.2s', boxShadow: design.shadow.sm }} />
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: guidedMode ? design.colors.success : design.colors.textMuted }}>{guidedMode ? 'ON' : 'OFF'}</span>
               </div>

               <Button onClick={() => goToPhase('predict')}>Start Experiment →</Button>
               <p style={{ fontSize: '13px', color: design.colors.textMuted, marginTop: '20px' }}>~5 minutes • Interactive experience</p>
            </div>
         </div>
      );
   }

   if (phase === 'predict') {
      const options = [
         { id: '30m', label: '~30 meters away', desc: 'Sound would travel 60m total (there and back)' },
         { id: '3m', label: '~3 meters away', desc: 'Sound would travel 6m total' },
         { id: '300m', label: '~300 meters away', desc: 'Sound would travel 600m total' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 2 • Prediction</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                  If an echo returns in 0.2 seconds...
               </h2>
               <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '500px' }}>
                  Sound travels at ~343 m/s. How far is the wall?
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onClick={() => { setPrediction(opt.id); emit('prediction_made', { prediction: opt.id }); }}
                        style={{
                           padding: '20px', borderRadius: design.radius.lg,
                           border: `2px solid ${prediction === opt.id ? design.colors.primary : design.colors.border}`,
                           background: prediction === opt.id ? design.colors.primaryMuted : design.colors.bgSecondary,
                           textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                     >
                        <p style={{ fontWeight: 600, fontSize: '15px', color: prediction === opt.id ? design.colors.primary : design.colors.textPrimary, marginBottom: '4px' }}>{opt.label}</p>
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

   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EchoVis />
               </div>
               <div style={{ padding: '20px 24px', background: design.colors.bgSecondary, borderTop: `1px solid ${design.colors.border}` }}>
                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary, marginBottom: '8px', display: 'block' }}>
                        Distance to wall: {distance}m
                     </label>
                     <input
                        type="range" min="10" max="100" value={distance}
                        onChange={(e) => { setDistance(Number(e.target.value)); resetExperiment(); }}
                        style={{ width: '100%', accentColor: design.colors.primary }}
                     />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                     <Button onClick={clapSent ? resetExperiment : sendClap} fullWidth>
                        {clapSent ? '🔄 Reset' : '👏 Send Clap!'}
                     </Button>
                  </div>
                  {echoReceived && (
                     <div style={{ marginTop: '12px', padding: '12px', borderRadius: design.radius.md, background: design.colors.successMuted, border: `1px solid ${design.colors.success}40` }}>
                        <p style={{ fontSize: '13px', color: design.colors.success, fontWeight: 600 }}>
                           ✓ Echo delay: {(echoDelay * 1000).toFixed(0)}ms • Distance = (343 × {echoDelay.toFixed(3)}) ÷ 2 = {distance}m
                        </p>
                     </div>
                  )}
               </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('predict')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('review')} disabled={!hasExperimented}>Continue →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'review') {
      const points = [
         { icon: '🔊', title: 'Sound Speed', desc: 'Sound travels at ~343 m/s in air at room temperature (20°C).' },
         { icon: '↔️', title: 'Round Trip', desc: 'The echo travels TO the object AND BACK—total distance is 2× the object distance.' },
         { icon: '📐', title: 'The Formula', desc: 'Distance = (Speed × Time) ÷ 2. Divide by 2 because it\'s a round trip!' },
         { icon: '⏱️', title: '0.2s Echo = 34m', desc: '343 m/s × 0.2s = 68.6m total, divided by 2 = 34.3m to the wall.' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 4 • Review</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                  Measuring Distance with Sound
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
               <Button onClick={() => goToPhase('twist_predict')}>The Outdoor Puzzle →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'twist_predict') {
      const options = [
         { id: 'same', label: 'Same - echoes work everywhere', desc: 'Sound always bounces back' },
         { id: 'louder', label: 'Louder echo - more space for sound', desc: 'Open areas amplify echoes' },
         { id: 'none', label: 'No clear echo', desc: 'Something is different outdoors' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 5 • The Outdoor Puzzle</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                  What happens when you clap outdoors?
               </h2>
               <p style={{ fontSize: '15px', color: design.colors.textSecondary, marginBottom: '32px', lineHeight: 1.6, maxWidth: '500px' }}>
                  In an open field with no walls nearby, what happens to the echo?
               </p>
               <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onClick={() => { setTwistPrediction(opt.id); emit('twist_prediction_made', { prediction: opt.id }); }}
                        style={{
                           padding: '20px', borderRadius: design.radius.lg,
                           border: `2px solid ${twistPrediction === opt.id ? design.colors.secondary : design.colors.border}`,
                           background: twistPrediction === opt.id ? design.colors.secondaryMuted : design.colors.bgSecondary,
                           textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                     >
                        <p style={{ fontWeight: 600, fontSize: '15px', color: twistPrediction === opt.id ? design.colors.secondary : design.colors.textPrimary, marginBottom: '4px' }}>{opt.label}</p>
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

   if (phase === 'twist_play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EchoVis />
               </div>
               <div style={{ padding: '20px 24px', background: design.colors.bgSecondary, borderTop: `1px solid ${design.colors.border}` }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onClick={() => { setEnvironment('indoor'); resetExperiment(); }}
                        style={{
                           flex: 1, padding: '14px', borderRadius: design.radius.md,
                           border: `2px solid ${environment === 'indoor' ? design.colors.primary : design.colors.border}`,
                           background: environment === 'indoor' ? design.colors.primaryMuted : design.colors.bgTertiary,
                           color: environment === 'indoor' ? design.colors.primary : design.colors.textSecondary,
                           fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                     >
                        🏠 Indoor
                     </button>
                     <button
                        onClick={() => { setEnvironment('outdoor'); resetExperiment(); }}
                        style={{
                           flex: 1, padding: '14px', borderRadius: design.radius.md,
                           border: `2px solid ${environment === 'outdoor' ? design.colors.secondary : design.colors.border}`,
                           background: environment === 'outdoor' ? design.colors.secondaryMuted : design.colors.bgTertiary,
                           color: environment === 'outdoor' ? design.colors.secondary : design.colors.textSecondary,
                           fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                     >
                        🌳 Outdoor
                     </button>
                  </div>
                  <Button onClick={clapSent ? resetExperiment : sendClap} fullWidth>
                     {clapSent ? '🔄 Reset' : '👏 Send Clap!'}
                  </Button>
               </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_predict')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('twist_review')} disabled={!hasTriedOutdoor}>Understand Why →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'twist_review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 7 • Key Insight</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                  Echoes Need Reflectors
               </h2>
               <div style={{ display: 'grid', gap: '16px', maxWidth: '550px' }}>
                  <div style={{ padding: '24px', borderRadius: design.radius.lg, background: design.colors.secondaryMuted, border: `1px solid ${design.colors.secondary}40` }}>
                     <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.secondary, marginBottom: '8px' }}>🔬 Why No Outdoor Echo?</p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                        Sound spreads out as it travels. Without nearby surfaces to reflect it, the returning sound is <strong style={{ color: design.colors.textPrimary }}>too weak to hear</strong>.
                     </p>
                  </div>
                  <div style={{ padding: '24px', borderRadius: design.radius.lg, background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40` }}>
                     <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.primary, marginBottom: '8px' }}>📉 Inverse Square Law</p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                        Sound intensity drops with distance squared. A wall 100m away gives an echo 10,000× weaker than one at 10m!
                     </p>
                  </div>
                  <div style={{ padding: '24px', borderRadius: design.radius.lg, background: design.colors.successMuted, border: `1px solid ${design.colors.success}40` }}>
                     <p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.success, marginBottom: '8px' }}>🦇 How Bats Solve This</p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>
                        Bats use high-frequency, focused ultrasound and have extremely sensitive ears to detect even weak echoes from small insects.
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

   if (phase === 'transfer') {
      const app = apps[transferIndex];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               <div style={{ display: 'flex', gap: '8px', padding: '16px', borderBottom: `1px solid ${design.colors.border}`, overflowX: 'auto' }}>
                  {apps.map((a, i) => (
                     <button key={i} onClick={() => setTransferIndex(i)} style={{ padding: '10px 16px', borderRadius: design.radius.md, border: 'none', background: i === transferIndex ? a.color : design.colors.bgTertiary, color: i === transferIndex ? 'white' : design.colors.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {a.icon} {a.title}
                     </button>
                  ))}
               </div>
               <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                     <div style={{ width: '56px', height: '56px', borderRadius: design.radius.lg, background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{app.icon}</div>
                     <div>
                        <h3 style={{ fontSize: '22px', fontWeight: 800, color: design.colors.textPrimary }}>{app.title}</h3>
                        <p style={{ fontSize: '14px', color: app.color, fontWeight: 600 }}>{app.stat}</p>
                     </div>
                  </div>
                  <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7 }}>{app.desc}</p>
               </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_review')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('test')}>Take the Test →</Button>
            </div>
         </div>
      );
   }

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
                     let bg = design.colors.bgSecondary, border = design.colors.border, textColor = design.colors.textPrimary;
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
                           style={{ padding: '16px', borderRadius: design.radius.md, border: `2px solid ${border}`, background: bg, textAlign: 'left', cursor: selectedAnswer === null ? 'pointer' : 'default' }}
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
                        if (isLast) { emit('test_completed', { score: testScore, maxScore: testQuestions.length }); goToPhase('mastery'); }
                        else { setTestIndex(i => i + 1); setSelectedAnswer(null); setShowExplanation(false); }
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

   if (phase === 'mastery') {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #030712 100%)`, fontFamily: design.font.sans, position: 'relative', overflow: 'hidden' }}>
            {Array.from({ length: 40 }).map((_, i) => (
               <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px', width: '10px', height: '10px', background: [design.colors.primary, design.colors.secondary, design.colors.success, design.colors.warning][i % 4], borderRadius: '2px', animation: `confetti 3s ease-out ${Math.random() * 2}s infinite` }} />
            ))}
            <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
               <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: design.shadow.glow(design.colors.primary) }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>
               <h1 style={{ fontSize: '32px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '8px' }}>Echo Master!</h1>
               <p style={{ fontSize: '18px', color: design.colors.textSecondary, marginBottom: '32px' }}>
                  You scored <span style={{ color: design.colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
               </p>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '360px', width: '100%', marginBottom: '32px' }}>
                  {[
                     { icon: '🔊', label: 'Speed = 343 m/s' },
                     { icon: '↔️', label: 'Divide by 2' },
                     { icon: '📐', label: 'd = (v×t)/2' },
                     { icon: '🦇', label: 'Echolocation' },
                  ].map((item, i) => (
                     <div key={i} style={{ padding: '16px', borderRadius: design.radius.md, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                        <div style={{ fontSize: '12px', color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>
               <Button onClick={() => emit('game_completed', { score: testScore, maxScore: testQuestions.length })}>Complete Lesson ✓</Button>
            </div>
         </div>
      );
   }

   return null;
};

export default EchoTimeOfFlightRenderer;
