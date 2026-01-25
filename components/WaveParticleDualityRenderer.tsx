import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
   eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
              'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
              'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
              'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
              'coach_prompt' | 'guide_paused' | 'guide_resumed';
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
      [key: string]: any;
   };
   timestamp: number;
}

interface WaveParticleDualityRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

// --- GLOBAL SOUND UTILITY ---
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
   if (typeof window === 'undefined') return;
   try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
         click: { freq: 600, duration: 0.1, type: 'sine' },
         success: { freq: 800, duration: 0.2, type: 'sine' },
         failure: { freq: 300, duration: 0.3, type: 'sine' },
         transition: { freq: 500, duration: 0.15, type: 'sine' },
         complete: { freq: 900, duration: 0.4, type: 'sine' }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
   } catch { /* Audio not available */ }
};

// --- WAVE-PARTICLE DUALITY RENDERER ---
const WaveParticleDualityRenderer: React.FC<WaveParticleDualityRendererProps> = ({ onGameEvent, gamePhase }) => {
   type WPDPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: WPDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   // Use gamePhase from props if valid, otherwise default to 'hook'
   const getInitialPhase = (): WPDPhase => {
      if (gamePhase && validPhases.includes(gamePhase as WPDPhase)) {
         return gamePhase as WPDPhase;
      }
      return 'hook';
   };

   const [phase, setPhase] = useState<WPDPhase>(getInitialPhase);

   // Sync phase with gamePhase prop changes (for resume functionality)
   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as WPDPhase) && gamePhase !== phase) {
         console.log('[WPD] Syncing phase from prop:', gamePhase);
         setPhase(gamePhase as WPDPhase);
      }
   }, [gamePhase]);
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [time, setTime] = useState(0);
   const [particleCount, setParticleCount] = useState(0);
   const [detectorOn, setDetectorOn] = useState(true); // Default ON for observer demo
   const [firingRate, setFiringRate] = useState(8);
   const [particleHits, setParticleHits] = useState<Array<{x: number, y: number, id: number}>>([]);
   const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'few' | 'pattern' | 'clear' | 'many'>('none');
   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);
   const [selectedApp, setSelectedApp] = useState(0); // For transfer phase
   const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]); // Track completed apps

   // --- RESPONSIVE DESIGN ---
   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // --- AI COACH GUIDED MODE ---
   const [guidedMode, setGuidedMode] = useState(true); // Default ON for guided experience
   const [lastCoachMessage, setLastCoachMessage] = useState<string>('');

   // Emit events to AI coach
   const emitGameEvent = useCallback((
      eventType: GameEvent['eventType'],
      details: GameEvent['details']
   ) => {
      if (onGameEvent) {
         onGameEvent({
            eventType,
            gameType: 'wave_particle_duality',
            gameTitle: 'Wave-Particle Duality',
            details,
            timestamp: Date.now()
         });
      }
   }, [onGameEvent]);

   // Coach messages for each phase
   const coachMessages: Record<WPDPhase, string> = {
      hook: "Welcome to the quantum world! 🌟 This experiment changed physics forever. Ready to see something mind-bending?",
      predict: "Time to make a prediction! What do YOU think will happen? There's no wrong answer here - scientists were surprised too!",
      play: "Now let's run the experiment! Watch carefully as electrons hit the screen. Notice any patterns forming?",
      review: "Wow! Did you expect THAT? Let's understand why this happens. The electrons are doing something truly strange...",
      twist_predict: "Here's where it gets REALLY interesting! What happens when we try to catch the electrons in the act?",
      twist_play: "Toggle the observer on and off. Watch how the pattern changes! This is one of the deepest mysteries in physics.",
      twist_review: "You've discovered the Observer Effect! The act of looking changes what happens. Mind-blowing, right?",
      transfer: "Now let's see how this quantum weirdness powers amazing real-world technology! 🚀",
      test: "Time to test your understanding! Take your time with each question. Need a hint? I'm here to help!",
      mastery: "Congratulations! You've mastered wave-particle duality! 🎉 You now understand one of the most profound concepts in physics!"
   };

   // Request hint from coach
   const requestHint = useCallback(() => {
      const hintMessages: Record<WPDPhase, string> = {
         hook: "Take a moment to read about the double-slit experiment. It's been called 'the most beautiful experiment in physics'!",
         predict: "Think about what you'd expect if you threw tiny balls through two slits. Would they make one pile or two?",
         play: "Keep watching! The pattern takes time to emerge. Each dot is one electron hitting the screen.",
         review: "Key insight: Each electron somehow goes through BOTH slits at once! That's superposition.",
         twist_predict: "If we watch which slit the electron goes through, does it still go through both? What would you guess?",
         twist_play: "Compare the patterns: Observer ON shows 2 bands (particle behavior). Observer OFF shows many bands (wave behavior).",
         twist_review: "The measurement doesn't push the electron - it's the INFORMATION that matters. Knowing which path collapses the wave!",
         transfer: "Each application uses a different aspect: superposition for computing, observer effect for security, wave nature for microscopy.",
         test: "Think back to what you observed. The key is understanding WHY patterns change with observation.",
         mastery: "You've got this! Review any section you'd like to revisit."
      };

      emitGameEvent('hint_requested', {
         phase,
         coachMessage: hintMessages[phase],
         message: 'User requested a hint'
      });
      setLastCoachMessage(hintMessages[phase]);
   }, [phase, emitGameEvent]);

   // Phase order for navigation
   const phaseOrder: WPDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const phaseLabels: Record<WPDPhase, string> = {
      hook: 'Introduction',
      predict: 'Predict',
      play: 'Experiment',
      review: 'Understanding',
      twist_predict: 'New Variable',
      twist_play: 'Observer Effect',
      twist_review: 'Deep Insight',
      transfer: 'Real World',
      test: 'Knowledge Test',
      mastery: 'Mastery'
   };

   // Navigation debouncing to prevent double-clicks
   const isNavigating = useRef(false);
   const lastClickRef = useRef(0);

   // Detailed screen descriptions for AI context
   const screenDescriptions: Record<WPDPhase, string> = {
      hook: 'INTRO SCREEN: Title "The Double-Slit Experiment", Feynman quote, Start button. User has not started yet.',
      predict: 'PREDICTION SCREEN: User must select what pattern electrons will make: (A) Two bands, (B) Multiple bands (interference), or (C) One blob. Shows diagram of electron gun → double slit → screen with "?" mark.',
      play: 'EXPERIMENT SCREEN: Live simulation firing electrons one at a time. User watches dots accumulate on detector screen. Pattern emerges over time. Controls: firing rate slider, reset button.',
      review: 'REVIEW SCREEN: Explains why interference pattern formed - each electron goes through BOTH slits as a wave. Key concept: wave-particle duality.',
      twist_predict: 'TWIST PREDICTION: New question - what happens if we ADD A DETECTOR to watch which slit electron goes through? Options: (A) Pattern disappears, (B) Same pattern, (C) Stronger pattern.',
      twist_play: 'OBSERVER EXPERIMENT: Toggle detector ON/OFF. When ON (observing): 2 distinct bands. When OFF (not observing): interference pattern. User can compare both modes.',
      twist_review: 'OBSERVER EFFECT REVIEW: Explains measurement collapses wave function. The act of knowing which path destroys interference. This is the heart of quantum weirdness.',
      transfer: 'REAL WORLD APPLICATIONS: 4 cards showing quantum tech - (1) Quantum Computing, (2) Quantum Cryptography, (3) Electron Microscopy, (4) Quantum Sensors.',
      test: 'KNOWLEDGE TEST: Multiple choice questions testing understanding of wave-particle duality and observer effect. Shows question number and progress.',
      mastery: 'COMPLETION SCREEN: Congratulations! Summary of concepts mastered. Options to restart or explore freely.'
   };

   const goToPhase = useCallback((p: WPDPhase) => {
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      if (isNavigating.current) return;

      lastClickRef.current = now;
      isNavigating.current = true;

      setPhase(p);
      if (p === 'play' || p === 'twist_play') {
         setParticleHits([]);
         setParticleCount(0);
      }
      if (p === 'twist_play') setDetectorOn(true);
      if (p === 'play') setDetectorOn(false);
      playSound('transition');

      // Emit detailed phase change to AI coach - includes full screen description
      const idx = phaseOrder.indexOf(p);
      emitGameEvent('phase_changed', {
         phase: p,
         phaseLabel: phaseLabels[p],
         currentScreen: idx + 1,
         totalScreens: phaseOrder.length,
         screenDescription: screenDescriptions[p], // Detailed description of what's on screen NOW
         userAction: `User navigated to screen ${idx + 1}: ${phaseLabels[p]}`,
         coachMessage: guidedMode ? coachMessages[p] : undefined,
         message: `NOW ON SCREEN ${idx + 1}/${phaseOrder.length}: ${phaseLabels[p]}. ${screenDescriptions[p]}`
      });
      if (guidedMode) {
         setLastCoachMessage(coachMessages[p]);
      }

      setTimeout(() => { isNavigating.current = false; }, 400);
   }, [emitGameEvent, guidedMode, coachMessages, phaseLabels, phaseOrder, screenDescriptions]);

   const goNext = useCallback(() => {
      const idx = phaseOrder.indexOf(phase);
      console.log('[goNext] current phase:', phase, 'idx:', idx, 'next:', phaseOrder[idx + 1]);
      if (idx < phaseOrder.length - 1) {
         console.log('[goNext] transitioning to:', phaseOrder[idx + 1]);
         goToPhase(phaseOrder[idx + 1]);
      }
   }, [phase, goToPhase]);

   const goBack = useCallback(() => {
      const idx = phaseOrder.indexOf(phase);
      if (idx > 0) goToPhase(phaseOrder[idx - 1]);
   }, [phase, goToPhase]);

   // Premium color palette
   const colors = {
      primary: '#06b6d4', // cyan-500
      primaryDark: '#0891b2', // cyan-600
      accent: '#a855f7', // purple-500
      accentDark: '#9333ea', // purple-600
      warning: '#f59e0b', // amber-500
      success: '#10b981', // emerald-500
      danger: '#ef4444', // red-500
      bgDark: '#020617', // slate-950
      bgCard: '#0f172a', // slate-900
      bgCardLight: '#1e293b', // slate-800
      border: '#334155', // slate-700
      textPrimary: '#f8fafc', // slate-50
      textSecondary: '#94a3b8', // slate-400
      textMuted: '#64748b', // slate-500
   };

   // Button component with debouncing to prevent double-clicks
   const Button: React.FC<{
      children: React.ReactNode;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
      size?: 'sm' | 'md' | 'lg';
      disabled?: boolean;
      fullWidth?: boolean;
      icon?: string;
   }> = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, fullWidth = false, icon }) => {
      const clickedRef = useRef(false);

      const handleClick = useCallback(() => {
         if (disabled || clickedRef.current) return;
         clickedRef.current = true;
         onClick();
         setTimeout(() => { clickedRef.current = false; }, 400);
      }, [disabled, onClick]);

      const baseStyles: React.CSSProperties = {
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         gap: '8px',
         borderRadius: size === 'sm' ? '8px' : '12px',
         fontWeight: 700,
         border: 'none',
         cursor: disabled ? 'not-allowed' : 'pointer',
         opacity: disabled ? 0.5 : 1,
         transition: 'all 0.2s ease',
         width: fullWidth ? '100%' : 'auto',
      };

      const sizeStyles: Record<string, React.CSSProperties> = {
         sm: { padding: '8px 16px', fontSize: '12px' },
         md: { padding: '12px 24px', fontSize: '14px' },
         lg: { padding: '16px 32px', fontSize: '16px' },
      };

      const variantStyles: Record<string, React.CSSProperties> = {
         primary: {
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: colors.textPrimary,
            boxShadow: `0 4px 20px ${colors.primary}40`,
         },
         secondary: {
            background: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
         },
         success: {
            background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
            color: colors.textPrimary,
            boxShadow: `0 4px 20px ${colors.success}40`,
         },
         danger: {
            background: `linear-gradient(135deg, ${colors.danger} 0%, #dc2626 100%)`,
            color: colors.textPrimary,
            boxShadow: `0 4px 20px ${colors.danger}40`,
         },
         ghost: {
            background: 'transparent',
            color: colors.textSecondary,
         },
      };

      return (
         <button
            style={{ ...baseStyles, ...sizeStyles[size], ...variantStyles[variant] }}
            onMouseDown={handleClick}
            disabled={disabled}
         >
            {icon && <span>{icon}</span>}
            {children}
         </button>
      );
   };

   // Emit initial game_started event on mount (always, for chat controls to appear)
   useEffect(() => {
      // Small delay to ensure parent component is ready to receive events
      const timer = setTimeout(() => {
         emitGameEvent('game_started', {
            phase: 'hook',
            phaseLabel: 'Introduction',
            currentScreen: 1,
            totalScreens: phaseOrder.length,
            screenDescription: screenDescriptions.hook,
            coachMessage: guidedMode ? coachMessages.hook : '',
            message: `GAME STARTED - NOW ON SCREEN 1/${phaseOrder.length}: Introduction. ${screenDescriptions.hook}`
         });
         if (guidedMode) {
            setLastCoachMessage(coachMessages.hook);
         }
      }, 100);
      return () => clearTimeout(timer);
   }, []); // Only run on mount

   const renderProgressBar = () => {
      const currentIdx = phaseOrder.indexOf(phase);
      return (
         <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '10px 12px' : '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            gap: isMobile ? '12px' : '16px'
         }}>
            {/* Progress dots - larger touch targets on mobile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
               <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
                  {phaseOrder.map((p, i) => (
                     <div
                        key={p}
                        onMouseDown={() => i < currentIdx && goToPhase(p)}
                        onTouchEnd={(e) => { if (i < currentIdx) { e.preventDefault(); goToPhase(p); } }}
                        style={{
                           height: isMobile ? '10px' : '8px',
                           width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                           borderRadius: '5px',
                           backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                           cursor: i < currentIdx ? 'pointer' : 'default',
                           transition: 'all 0.3s',
                           minWidth: isMobile ? '10px' : '8px',
                           minHeight: isMobile ? '10px' : '8px'
                        }}
                        title={phaseLabels[p]}
                     />
                  ))}
               </div>
               <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
                  {currentIdx + 1} / {phaseOrder.length}
               </span>
            </div>

            {/* Phase Label */}
            <div style={{
               padding: '4px 12px',
               borderRadius: '12px',
               background: `${colors.primary}20`,
               color: colors.primary,
               fontSize: '11px',
               fontWeight: 700
            }}>
               {phaseLabels[phase]}
            </div>
         </div>
      );
   };

   // Helper function to render bottom navigation bar inline
   // NOT a component - just returns JSX to avoid React component issues
   const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => {
      const currentIdx = phaseOrder.indexOf(phase);
      const buttonColor = accentColor || colors.primary;
      const canBack = canGoBack && currentIdx > 0;

      const handleBack = () => {
         if (canBack) {
            goToPhase(phaseOrder[currentIdx - 1]);
         }
      };

      const handleNext = () => {
         if (!canGoNext) return;
         if (onNext) {
            onNext();
         } else if (currentIdx < phaseOrder.length - 1) {
            goToPhase(phaseOrder[currentIdx + 1]);
         }
      };

      return (
         <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '12px' : '12px 16px',
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            gap: '12px',
            flexShrink: 0
         }}>
            {/* Back button */}
            <button
               style={{
                  padding: isMobile ? '10px 16px' : '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: isMobile ? '13px' : '14px',
                  backgroundColor: colors.bgCardLight,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  cursor: canBack ? 'pointer' : 'not-allowed',
                  opacity: canBack ? 1 : 0.3,
                  minHeight: '44px'
               }}
               onMouseDown={handleBack}
               onTouchEnd={(e) => { e.preventDefault(); handleBack(); }}
            >
               ← Back
            </button>

            {/* Phase indicator */}
            <span style={{
               fontSize: '12px',
               color: colors.textMuted,
               fontWeight: 600
            }}>
               {phaseLabels[phase]}
            </span>

            {/* Next button */}
            <button
               style={{
                  padding: isMobile ? '10px 20px' : '10px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: isMobile ? '13px' : '14px',
                  background: canGoNext ? `linear-gradient(135deg, ${buttonColor} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                  color: canGoNext ? colors.textPrimary : colors.textMuted,
                  border: 'none',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  opacity: canGoNext ? 1 : 0.4,
                  boxShadow: canGoNext ? `0 2px 12px ${buttonColor}30` : 'none',
                  minHeight: '44px'
               }}
               onMouseDown={handleNext}
               onTouchEnd={(e) => { e.preventDefault(); handleNext(); }}
            >
               {nextLabel} →
            </button>
         </div>
      );
   };

   // Helper function for key takeaway - NOT a component to avoid React reconciliation issues
   const renderKeyTakeaway = (icon: string, title: string, description: string, key?: number) => (
      <div key={key} style={{
         display: 'flex',
         gap: '16px',
         padding: '16px',
         borderRadius: '16px',
         background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
         border: `1px solid ${colors.border}`
      }}>
         <div style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</div>
         <div>
            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: colors.textPrimary }}>{title}</p>
            <p style={{ fontSize: '12px', lineHeight: 1.6, color: colors.textSecondary }}>{description}</p>
         </div>
      </div>
   );

   // Request to go home/close game
   const requestGoHome = useCallback(() => {
      emitGameEvent('button_clicked', {
         phase,
         phaseLabel: phaseLabels[phase],
         action: 'go_home',
         message: 'User requested to exit game and return home'
      });
   }, [phase, emitGameEvent, phaseLabels]);

   // Premium wrapper component - REDESIGNED for proper viewport layout
   // Uses absolute positioning to fill parent container from GeneratedDiagram
   const PremiumWrapper = ({ children }: { children: React.ReactNode }) => {
      const currentIdx = phaseOrder.indexOf(phase);

      return (
         <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: colors.bgDark,
            color: colors.textPrimary,
            overflow: 'hidden'
         }}>
            {/* Subtle background gradient - purely decorative */}
            <div style={{
               position: 'absolute',
               inset: 0,
               background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)',
               pointerEvents: 'none'
            }} />

            {/* HEADER - Part of flow, not fixed */}
            <div style={{
               flexShrink: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'space-between',
               padding: isMobile ? '8px 12px' : '10px 16px',
               backgroundColor: colors.bgCard,
               borderBottom: `1px solid ${colors.border}`,
               position: 'relative',
               zIndex: 10,
               gap: '8px'
            }}>
               {/* Home button */}
               <button
                  onMouseDown={requestGoHome}
                  onTouchEnd={(e) => { e.preventDefault(); requestGoHome(); }}
                  style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     width: '36px',
                     height: '36px',
                     borderRadius: '8px',
                     backgroundColor: colors.bgCardLight,
                     border: `1px solid ${colors.border}`,
                     color: colors.textSecondary,
                     cursor: 'pointer',
                     flexShrink: 0
                  }}
                  title="Go Home"
               >
                  <span style={{ fontSize: '16px' }}>🏠</span>
               </button>

               {/* Progress bar - centered */}
               <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flex: 1,
                  justifyContent: 'center'
               }}>
                  {phaseOrder.map((p, i) => (
                     <button
                        key={p}
                        onMouseDown={(e) => { e.preventDefault(); if (i <= currentIdx) goToPhase(p); }}
                        onTouchEnd={(e) => { e.preventDefault(); if (i <= currentIdx) goToPhase(p); }}
                        style={{
                           width: i === currentIdx ? '20px' : '10px',
                           height: '10px',
                           borderRadius: '5px',
                           border: 'none',
                           backgroundColor: i < currentIdx
                              ? colors.success
                              : i === currentIdx
                                 ? colors.primary
                                 : colors.border,
                           cursor: i <= currentIdx ? 'pointer' : 'default',
                           transition: 'all 0.2s',
                           opacity: i > currentIdx ? 0.5 : 1
                        }}
                        title={`${phaseLabels[p]} (${i + 1}/${phaseOrder.length})`}
                     />
                  ))}
               </div>

               {/* Phase label and count */}
               <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0
               }}>
                  <span style={{
                     fontSize: '11px',
                     fontWeight: 700,
                     color: colors.primary,
                     padding: '4px 8px',
                     borderRadius: '6px',
                     backgroundColor: `${colors.primary}15`
                  }}>
                     {currentIdx + 1}/{phaseOrder.length}
                  </span>
               </div>
            </div>

            {/* MAIN CONTENT - Fills remaining space, scrolls if needed */}
            <div style={{
               flex: 1,
               minHeight: 0, // Critical for flex overflow to work
               overflow: 'auto',
               overflowX: 'hidden',
               WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
               position: 'relative',
               zIndex: 5
            }}>
               {children}
            </div>
         </div>
      );
   };

   // Helper function for section header - NOT a component
   const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
      <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
         <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', color: colors.primary }}>{phaseName}</p>
         <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: colors.textPrimary, lineHeight: 1.2 }}>{title}</h2>
         {subtitle && <p style={{ fontSize: isMobile ? '12px' : '13px', marginTop: '6px', color: colors.textSecondary, lineHeight: 1.4 }}>{subtitle}</p>}
      </div>
   );

   // Animation loop
   useEffect(() => {
      const interval = setInterval(() => setTime(t => t + 0.02), 30);
      return () => clearInterval(interval);
   }, []);

   // Particle firing simulation - improved physics
   useEffect(() => {
      if ((phase === 'play' || phase === 'twist_play') && particleCount < 500) {
         const interval = setInterval(() => {
            // Generate hit position based on interference pattern (or not if detector is on)
            const generateHitY = () => {
               if (detectorOn) {
                  // TWO DISTINCT BANDS - particle behavior (no interference)
                  // When observing, electrons act like particles going through ONE slit
                  // Use UNIFORM distribution within fixed bands - NO particles in between!
                  const slit = Math.random() > 0.5 ? 0 : 1;
                  // Band 1: y=100-120 (renders at 60-80 on screen) - UPPER band
                  // Band 2: y=220-240 (renders at 180-200 on screen) - LOWER band
                  // Gap of 100px in between where ZERO particles appear!
                  if (slit === 0) {
                     return 100 + Math.random() * 20; // Upper band: 100-120
                  } else {
                     return 220 + Math.random() * 20; // Lower band: 220-240
                  }
               } else {
                  // INTERFERENCE PATTERN - wave behavior
                  // Multiple bands with varying intensity (center brightest)
                  const bands = [55, 85, 115, 137, 160, 190, 220];
                  const weights = [0.04, 0.10, 0.18, 0.36, 0.18, 0.10, 0.04]; // Central peak
                  const r = Math.random();
                  let cumulative = 0;
                  for (let i = 0; i < bands.length; i++) {
                     cumulative += weights[i];
                     if (r < cumulative) {
                        const u1 = Math.random(), u2 = Math.random();
                        const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                        return bands[i] + gaussian * 6; // Tight bands for clear interference
                     }
                  }
                  return 137;
               }
            };

            setParticleHits(prev => [...prev, {
               x: 580 + (Math.random() - 0.5) * 12,
               y: generateHitY(),
               id: Date.now() + Math.random()
            }]);
            setParticleCount(c => c + 1);
         }, 1000 / firingRate);
         return () => clearInterval(interval);
      }
   }, [phase, particleCount, firingRate, detectorOn]);

   // Teaching milestones with better thresholds
   useEffect(() => {
      if (phase === 'play' || phase === 'twist_play') {
         if (particleCount < 15) setTeachingMilestone('few');
         else if (particleCount < 60) setTeachingMilestone('pattern');
         else if (particleCount < 150) setTeachingMilestone('clear');
         else setTeachingMilestone('many');
      }
   }, [particleCount, phase]);

   // Emit visual state updates for AI coaching accuracy (throttled to milestones)
   useEffect(() => {
      if (onGameEvent && (phase === 'play' || phase === 'twist_play')) {
         const patternDescription =
            particleCount < 15 ? 'random dots' :
            particleCount < 60 ? 'bands starting to form' :
            particleCount < 150 ? 'clear interference pattern' : 'complete wave pattern';

         onGameEvent({
            eventType: 'visual_state_update',
            gameTitle: 'Wave Particle Duality',
            details: {
               electronCount: particleCount,
               pattern: patternDescription,
               observerMode: detectorOn,
               slitConfig: 'both_open',
               teachingMilestone
            }
         });
      }
   }, [teachingMilestone, detectorOn, onGameEvent, phase, particleCount]);

   // Confetti
   useEffect(() => {
      if (phase === 'mastery') {
         const confettiColors = ['#06b6d4', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
         setConfetti(Array.from({ length: 60 }, (_, i) => ({
            x: Math.random() * 100, y: Math.random() * 100,
            color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
         })));
      }
   }, [phase]);

   // Premium Double-Slit Experiment Visualizer with enhanced graphics
   // Helper function that returns JSX - NOT a component to avoid React reconciliation issues
   const renderQuantumLabVisualizer = (interactive: boolean = false, showDetector: boolean = false) => {
      return (
         <svg viewBox="0 0 700 350" className="w-full h-full" style={{ maxHeight: '100%' }}>
            <defs>
               {/* Premium electron gun metal gradient */}
               <linearGradient id="wpdGunMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="30%" stopColor="#475569" />
                  <stop offset="70%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
               </linearGradient>

               {/* Vacuum tube glass with depth */}
               <radialGradient id="wpdVacuumGlass" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
                  <stop offset="50%" stopColor="#0c4a6e" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.2" />
               </radialGradient>

               {/* Brushed metal for barrier */}
               <linearGradient id="wpdBrushedMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="20%" stopColor="#4b5563" />
                  <stop offset="40%" stopColor="#374151" />
                  <stop offset="60%" stopColor="#4b5563" />
                  <stop offset="80%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#4b5563" />
               </linearGradient>

               {/* Phosphor screen with glow effect */}
               <linearGradient id="wpdPhosphorScreen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#022c22" />
                  <stop offset="50%" stopColor="#064e3b" />
                  <stop offset="100%" stopColor="#022c22" />
               </linearGradient>

               {/* Premium electron glow */}
               <radialGradient id="wpdElectronGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                  <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
               </radialGradient>

               {/* Detector laser beam */}
               <linearGradient id="wpdLaserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                  <stop offset="30%" stopColor="#f87171" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#fca5a5" stopOpacity="1" />
                  <stop offset="70%" stopColor="#f87171" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
               </linearGradient>

               {/* Cathode glow */}
               <radialGradient id="wpdCathodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
               </radialGradient>

               <filter id="wpdElectronBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" />
               </filter>

               <filter id="wpdHitGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>

               <filter id="wpdInnerGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
            </defs>

            {/* Premium dark lab background with gradient */}
            <rect width="700" height="350" fill="url(#wpdLabBg)" />
            <linearGradient id="wpdLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#030712" />
               <stop offset="50%" stopColor="#0a0f1a" />
               <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <rect width="700" height="350" fill="url(#wpdLabBg)" />

            {/* Subtle grid pattern */}
            <pattern id="wpdLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
               <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
            <rect width="700" height="350" fill="url(#wpdLabGrid)" />

            {/* Premium optical table with depth */}
            <rect x="5" y="305" width="690" height="45" rx="4" fill="#111827" />
            <rect x="5" y="305" width="690" height="4" fill="#1f2937" />
            <rect x="5" y="346" width="690" height="4" rx="2" fill="#0a0a0a" />
            {/* Table holes */}
            {[50, 150, 250, 350, 450, 550, 650].map(x => (
               <circle key={x} cx={x} cy="325" r="3" fill="#0a0a0a" />
            ))}

            {/* === PREMIUM ELECTRON GUN === */}
            <g transform="translate(25, 175)">
               {/* Main housing with depth */}
               <rect x="0" y="-55" width="90" height="110" rx="10" fill="url(#wpdGunMetal)" stroke="#475569" strokeWidth="1.5" />
               <rect x="5" y="-50" width="80" height="100" rx="8" fill="#1e293b" opacity="0.3" />

               {/* Vacuum chamber - glass tube */}
               <ellipse cx="90" cy="0" rx="30" ry="45" fill="url(#wpdVacuumGlass)" stroke="#334155" strokeWidth="2" />
               <ellipse cx="90" cy="0" rx="28" ry="43" fill="none" stroke="#0ea5e9" strokeWidth="0.5" strokeOpacity="0.3" />

               {/* Cathode housing */}
               <rect x="10" y="-12" width="40" height="24" rx="4" fill="#292524" stroke="#44403c" />

               {/* Heated filament with glow */}
               <rect x="15" y="-8" width="30" height="16" rx="3" fill="#78350f" />
               <ellipse cx="30" cy="0" rx="12" ry="6" fill="url(#wpdCathodeGlow)">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="0.4s" repeatCount="indefinite" />
               </ellipse>

               {/* Anode with aperture */}
               <rect x="58" y="-20" width="12" height="40" rx="3" fill="#1e293b" stroke="#334155" />
               <rect x="61" y="-5" width="6" height="10" rx="1" fill="#030712" />

               {/* Control panel */}
               <rect x="5" y="60" width="80" height="35" rx="5" fill="#111827" stroke="#1f2937" />
               <circle cx="22" cy="77" r="6" fill="#22c55e">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
               </circle>
               <text x="22" y="95" textAnchor="middle" className="text-[5px] fill-emerald-400 font-bold">POWER</text>

               <rect x="38" y="68" width="40" height="18" rx="3" fill="#030712" stroke="#1f2937" />
               <text x="58" y="80" textAnchor="middle" className="text-[8px] fill-cyan-400 font-mono font-bold">READY</text>

               {/* Label */}
               <text x="45" y="-65" textAnchor="middle" className="text-[10px] fill-slate-300 font-bold uppercase tracking-wider">Electron Source</text>
            </g>

            {/* Beam path visualization */}
            <line x1="145" y1="175" x2="255" y2="175" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.15" strokeDasharray="6 4" />
            <line x1="145" y1="175" x2="255" y2="175" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.3" />

            {/* === PREMIUM DOUBLE SLIT BARRIER === */}
            <g transform="translate(255, 45)">
               {/* Outer frame */}
               <rect x="-20" y="-15" width="50" height="290" rx="6" fill="#111827" stroke="#1f2937" strokeWidth="1" />

               {/* Main barrier plate */}
               <rect x="-8" y="0" width="26" height="265" fill="url(#wpdBrushedMetal)" />

               {/* Top section with texture */}
               <rect x="-8" y="0" width="26" height="90" fill="#4b5563" />
               <rect x="-6" y="2" width="22" height="86" fill="#374151" opacity="0.5" />

               {/* Slit 1 - precision cut */}
               <rect x="-8" y="90" width="26" height="28" fill="#030712" />
               <rect x="-4" y="92" width="18" height="24" fill="#000000" />
               {/* Slit edge highlights */}
               <line x1="-8" y1="90" x2="18" y2="90" stroke="#6b7280" strokeWidth="0.5" />
               <line x1="-8" y1="118" x2="18" y2="118" stroke="#6b7280" strokeWidth="0.5" />

               {/* Middle section */}
               <rect x="-8" y="118" width="26" height="40" fill="#4b5563" />
               <rect x="-6" y="120" width="22" height="36" fill="#374151" opacity="0.5" />

               {/* Slit 2 - precision cut */}
               <rect x="-8" y="158" width="26" height="28" fill="#030712" />
               <rect x="-4" y="160" width="18" height="24" fill="#000000" />
               {/* Slit edge highlights */}
               <line x1="-8" y1="158" x2="18" y2="158" stroke="#6b7280" strokeWidth="0.5" />
               <line x1="-8" y1="186" x2="18" y2="186" stroke="#6b7280" strokeWidth="0.5" />

               {/* Bottom section */}
               <rect x="-8" y="186" width="26" height="79" fill="#4b5563" />
               <rect x="-6" y="188" width="22" height="75" fill="#374151" opacity="0.5" />

               {/* Slit labels with better visibility */}
               <rect x="22" y="96" width="35" height="16" rx="3" fill="#111827" />
               <text x="40" y="107" textAnchor="middle" className="text-[8px] fill-cyan-400 font-bold">Slit A</text>
               <rect x="22" y="164" width="35" height="16" rx="3" fill="#111827" />
               <text x="40" y="175" textAnchor="middle" className="text-[8px] fill-cyan-400 font-bold">Slit B</text>

               {/* Frame label */}
               <rect x="-15" y="-30" width="40" height="14" rx="3" fill="#111827" />
               <text x="5" y="-21" textAnchor="middle" className="text-[9px] fill-slate-200 font-bold uppercase">Barrier</text>
            </g>

            {/* === WHICH-PATH DETECTOR (enhanced) === */}
            {showDetector && detectorOn && (
               <g transform="translate(220, 130)">
                  {/* Detector housing */}
                  <rect x="-35" y="-25" width="35" height="50" rx="5" fill="#7f1d1d" stroke="#991b1b" strokeWidth="1" />
                  <rect x="-32" y="-22" width="29" height="44" rx="4" fill="#450a0a" opacity="0.5" />

                  {/* Laser emitter */}
                  <circle cx="-17" cy="0" r="10" fill="#dc2626">
                     <animate attributeName="opacity" values="0.6;1;0.6" dur="0.25s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="-17" cy="0" r="6" fill="#fca5a5">
                     <animate attributeName="opacity" values="0.7;1;0.7" dur="0.25s" repeatCount="indefinite" />
                  </circle>

                  {/* Laser beams through slits */}
                  <rect x="35" y="0" width="50" height="5" fill="url(#wpdLaserBeam)" opacity="0.9">
                     <animate attributeName="opacity" values="0.6;1;0.6" dur="0.15s" repeatCount="indefinite" />
                  </rect>
                  <rect x="35" y="68" width="50" height="5" fill="url(#wpdLaserBeam)" opacity="0.9">
                     <animate attributeName="opacity" values="0.7;1;0.7" dur="0.15s" repeatCount="indefinite" />
                  </rect>

                  {/* Label */}
                  <rect x="-30" y="-45" width="56" height="16" rx="3" fill="#450a0a" stroke="#7f1d1d" />
                  <text x="-2" y="-34" textAnchor="middle" className="text-[8px] fill-red-300 font-bold">DETECTOR</text>
               </g>
            )}

            {/* Flying electrons with trails */}
            {(phase === 'play' || phase === 'twist_play') && [...Array(4)].map((_, i) => {
               const progress = ((time * 1.8 + i * 0.25) % 1);
               const x = 145 + progress * 430;
               const slit1Y = 148, slit2Y = 216;
               const throughSlit = (i % 2 === 0) ? slit1Y : slit2Y;
               const y = x < 270 ? 175 : (x < 300 ? throughSlit : throughSlit + (x - 300) * (Math.random() - 0.5) * 0.2);

               if (progress > 0.08 && progress < 0.92) {
                  return (
                     <g key={i}>
                        {/* Trail */}
                        <line
                           x1={Math.max(145, x - 25)}
                           y1={x < 270 ? 175 : throughSlit}
                           x2={x}
                           y2={y}
                           stroke="#22d3ee"
                           strokeWidth="1.5"
                           strokeOpacity="0.3"
                        />
                        {/* Electron glow */}
                        <circle cx={x} cy={y} r="8" fill="url(#wpdElectronGlow)" filter="url(#wpdElectronBlur)" />
                        <circle cx={x} cy={y} r="3" fill="#67e8f9" />
                     </g>
                  );
               }
               return null;
            })}

            {/* === PREMIUM DETECTION SCREEN === */}
            <g transform="translate(560, 40)">
               {/* Screen frame with depth */}
               <rect x="-15" y="-15" width="75" height="295" rx="6" fill="#111827" stroke="#1f2937" strokeWidth="1" />
               <rect x="-12" y="-12" width="69" height="289" rx="5" fill="#0a0a0a" />

               {/* Phosphor surface with mode-specific glow */}
               <rect x="0" y="0" width="45" height="265" rx="3" fill="url(#wpdPhosphorScreen)" />
               <rect x="2" y="2" width="41" height="261" rx="2" fill={detectorOn ? "#3d0d0d" : "#0d3d3a"} opacity="0.3" />

               {/* Screen inner glow - RED when observing, CYAN when not */}
               {particleHits.length > 0 && (
                  <rect x="0" y="0" width="45" height="265" rx="3" fill={detectorOn ? "#ef4444" : "#22d3ee"} opacity="0.05" />
               )}

               {/* GUIDE LINES showing expected pattern */}
               {showDetector && (
                  <g opacity="0.5">
                     {detectorOn ? (
                        /* TWO BAND guides - EXACT zones where particles appear */
                        /* Band 1: y=60-80, Band 2: y=180-200 (100px gap!) */
                        <>
                           <rect x="0" y="60" width="45" height="20" fill="#ef4444" opacity="0.2" />
                           <line x1="0" y1="60" x2="45" y2="60" stroke="#ef4444" strokeWidth="1.5" />
                           <line x1="0" y1="80" x2="45" y2="80" stroke="#ef4444" strokeWidth="1.5" />
                           <text x="48" y="74" className="text-[7px] fill-red-400 font-bold">BAND 1</text>

                           <rect x="0" y="180" width="45" height="20" fill="#ef4444" opacity="0.2" />
                           <line x1="0" y1="180" x2="45" y2="180" stroke="#ef4444" strokeWidth="1.5" />
                           <line x1="0" y1="200" x2="45" y2="200" stroke="#ef4444" strokeWidth="1.5" />
                           <text x="48" y="194" className="text-[7px] fill-red-400 font-bold">BAND 2</text>

                           {/* Empty zone indicator */}
                           <line x1="22" y1="85" x2="22" y2="175" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />
                           <text x="26" y="130" className="text-[6px] fill-red-300 font-bold" opacity="0.5">NO HITS</text>
                        </>
                     ) : (
                        /* INTERFERENCE guides - multiple bands */
                        <>
                           {[15, 45, 75, 97, 120, 150, 180].map((y, i) => (
                              <line key={i} x1="0" y1={y} x2="45" y2={y} stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 3" opacity={i === 3 ? 0.6 : 0.3} />
                           ))}
                        </>
                     )}
                  </g>
               )}

               {/* Particle hits - RED when observing, CYAN when not */}
               {/* When observing, FILTER to only show particles in the 2 band zones */}
               <g filter="url(#wpdHitGlow)">
                  {particleHits
                     .filter(hit => {
                        if (!detectorOn) return true; // Show all particles when not observing
                        // When observing, ONLY show particles in Band 1 (y=100-120) or Band 2 (y=220-240)
                        const y = hit.y;
                        const inBand1 = y >= 95 && y <= 125;  // Upper band with small buffer
                        const inBand2 = y >= 215 && y <= 245; // Lower band with small buffer
                        return inBand1 || inBand2;
                     })
                     .map(hit => (
                        <circle
                           key={hit.id}
                           cx={hit.x - 560}
                           cy={hit.y - 40}
                           r="2.5"
                           fill={detectorOn ? "#f87171" : "#67e8f9"}
                           opacity="0.95"
                        />
                     ))}
               </g>

               {/* Pattern label on screen */}
               {showDetector && particleHits.length > 20 && (
                  <g>
                     <rect x="-2" y="268" width="49" height="18" rx="2" fill={detectorOn ? "#7f1d1d" : "#134e4a"} />
                     <text x="22" y="280" textAnchor="middle" className="text-[7px] font-black uppercase" fill={detectorOn ? "#fca5a5" : "#5eead4"}>
                        {detectorOn ? "2 BANDS" : "INTERFERENCE"}
                     </text>
                  </g>
               )}

               {/* Screen label */}
               <rect x="-5" y="-30" width="55" height="14" rx="3" fill="#111827" />
               <text x="22" y="-21" textAnchor="middle" className="text-[9px] fill-emerald-400 font-bold uppercase">Detector</text>
            </g>

            {/* === LIVE HISTOGRAM showing intensity distribution === */}
            {showDetector && particleHits.length > 10 && (
               <g transform="translate(640, 40)">
                  <rect x="0" y="0" width="35" height="265" rx="3" fill="#111827" stroke="#1f2937" strokeWidth="1" />
                  <text x="17" y="-8" textAnchor="middle" className="text-[7px] fill-slate-500 font-bold uppercase">Intensity</text>

                  {/* Histogram bars - calculate distribution (filtered when observing) */}
                  {(() => {
                     const bins = Array(13).fill(0); // 13 bins across 265px height
                     // Filter particles when observing - only count those in valid bands
                     const validHits = detectorOn
                        ? particleHits.filter(hit => {
                             const y = hit.y;
                             return (y >= 95 && y <= 125) || (y >= 215 && y <= 245);
                          })
                        : particleHits;

                     validHits.forEach(hit => {
                        const binIdx = Math.floor((hit.y - 40) / 20.4);
                        if (binIdx >= 0 && binIdx < 13) bins[binIdx]++;
                     });
                     const maxBin = Math.max(...bins, 1);
                     return bins.map((count, i) => (
                        <rect
                           key={i}
                           x="3"
                           y={i * 20.4 + 2}
                           width={Math.max(1, (count / maxBin) * 28)}
                           height="18"
                           rx="2"
                           fill={detectorOn ? "#ef4444" : "#22d3ee"}
                           opacity={0.3 + (count / maxBin) * 0.6}
                        />
                     ));
                  })()}

                  {/* Expected pattern indicator */}
                  <text x="17" y="278" textAnchor="middle" className="text-[6px] font-bold" fill={detectorOn ? "#f87171" : "#5eead4"}>
                     {detectorOn ? "PARTICLE" : "WAVE"}
                  </text>
               </g>
            )}

            {/* Premium particle counter */}
            {interactive && (
               <g transform="translate(625, 315)">
                  <rect x="-50" y="-25" width="100" height="35" rx="6" fill="#111827" stroke="#1f2937" />
                  <text x="0" y="-8" textAnchor="middle" className="text-[8px] fill-slate-400 uppercase tracking-wider font-bold">Electrons Fired</text>
                  <text x="0" y="12" textAnchor="middle" className="text-[16px] fill-cyan-400 font-mono font-black">{particleCount}</text>
               </g>
            )}
         </svg>
      );
   };

   // Enhanced test questions with deep understanding - covers core concepts, applications, and critical thinking
   const testQuestions = [
      // Q1: Core Concept - Interference (Easy) - Correct: C
      {
         scenario: "In the double-slit experiment, you fire single electrons one at a time—with a 10-second gap between each electron—toward two slits.",
         question: "After 1,000 electrons have been fired individually, what pattern appears on the detection screen?",
         options: [
            { id: 'two', label: "Two bright spots directly behind each slit" },
            { id: 'one', label: "A single bright spot in the center" },
            { id: 'interference', label: "An interference pattern with alternating bright and dark bands", correct: true },
            { id: 'random', label: "Random dots with no pattern since electrons don't interact" },
         ],
         explanation: "This is the mystery! Even though each electron travels alone (no interference with other electrons), an interference pattern still emerges. Each single electron must be passing through BOTH slits as a probability wave to interfere with itself!"
      },
      // Q2: Core Concept - Observer Effect (Medium) - Correct: A
      {
         scenario: "You place a detector at the slits to record which slit each electron passes through. The detector works perfectly and records data for every electron.",
         question: "What happens to the interference pattern, and why?",
         options: [
            { id: 'disappears', label: "Pattern disappears → measuring 'which path' collapses the wave function", correct: true },
            { id: 'same', label: "Pattern unchanged → the detector is too small to affect electrons" },
            { id: 'stronger', label: "Pattern becomes clearer → more data means better pattern" },
            { id: 'delayed', label: "Pattern appears later → measurement slows down electrons" },
         ],
         explanation: "The wave function collapses when which-path information exists! It's not the physical interaction with the detector—it's the INFORMATION. Even if you never look at the detector data, the pattern disappears because the information exists."
      },
      // Q3: Deep Concept - Superposition Understanding (Medium) - Correct: D
      {
         scenario: "A physicist claims: 'Before measurement, the electron doesn't have a definite position—it exists in a superposition of all possible positions.'",
         question: "Based on the double-slit experiment, what evidence supports this claim?",
         options: [
            { id: 'uncertainty', label: "We just can't measure the electron's position accurately enough" },
            { id: 'hidden', label: "The electron has a hidden variable that determines its path" },
            { id: 'wave', label: "Electrons are physically made of waves, not particles" },
            { id: 'interference', label: "Interference pattern requires the electron to explore both paths simultaneously", correct: true },
         ],
         explanation: "The interference pattern is only possible if each electron passes through BOTH slits simultaneously—this requires being in multiple places at once! When we force it to 'choose' by observing, it can no longer interfere with itself."
      },
      // Q4: Quantum Computing Application (Medium-Hard) - Correct: B
      {
         scenario: "Google's Sycamore quantum processor performed a calculation in 200 seconds that would take a classical supercomputer 10,000 years. The processor uses superconducting qubits.",
         question: "How does the double-slit principle explain quantum computing's massive speedup?",
         options: [
            { id: 'speed', label: "Quantum bits move at the speed of light, unlike electrical signals" },
            { id: 'parallel', label: "Qubits in superposition compute all possible answers simultaneously, like electrons taking all paths", correct: true },
            { id: 'small', label: "Qubits are atomic-sized, so more fit on a chip" },
            { id: 'cold', label: "Operating near absolute zero eliminates electrical resistance" },
         ],
         explanation: "Just as electrons in superposition go through BOTH slits, qubits in superposition represent BOTH 0 and 1. With 50 qubits, you can represent 2^50 (over 1 quadrillion) states simultaneously! This parallelism enables exponential speedup for certain problems."
      },
      // Q5: Quantum Encryption Application (Hard) - Correct: D
      {
         scenario: "China's Micius satellite established a quantum-encrypted video call between Beijing and Vienna (7,600 km). The encryption used polarized photons sent through space.",
         question: "If a spy satellite intercepted the photon transmission, what would happen and why?",
         options: [
            { id: 'copy', label: "The spy could copy the photons without disturbing the originals" },
            { id: 'decode', label: "With enough computing power, the spy could crack the encryption later" },
            { id: 'block', label: "The spy would block communication but not be detected" },
            { id: 'disturb', label: "Interception would change photon states, be detected by error rates, and expose the spy", correct: true },
         ],
         explanation: "The observer effect makes quantum encryption unique! Just like observing electrons destroys interference, measuring photons disturbs their quantum states. Alice and Bob check error rates—if too high, they know Eve intercepted. The laws of physics guarantee security!"
      },
      // Q6: Electron Microscopy Application (Medium) - Correct: A
      {
         scenario: "Scientists used cryo-electron microscopy (cryo-EM) to image the COVID-19 spike protein at atomic resolution, winning the 2017 Nobel Prize in Chemistry.",
         question: "Why does the double-slit experiment's discovery enable imaging at atomic scale?",
         options: [
            { id: 'wavelength', label: "Electrons are waves with wavelengths 100,000× shorter than light—resolving atomic details", correct: true },
            { id: 'penetrate', label: "Electrons penetrate samples better than light does" },
            { id: 'magnify', label: "Electron lenses can magnify more than optical lenses" },
            { id: 'contrast', label: "Electrons provide better contrast for organic molecules" },
         ],
         explanation: "The double-slit experiment proved electrons are waves with measurable wavelengths. The de Broglie wavelength of electrons (0.005nm at typical energies) is 100,000× shorter than visible light (500nm). Resolution is limited by wavelength—shorter wavelength = finer details!"
      },
      // Q7: MRI Application (Hard) - Correct: C
      {
         scenario: "A patient with a suspected brain tumor gets an MRI. The radiologist can distinguish tumor tissue from healthy brain tissue based on different signal intensities.",
         question: "How does the MRI use quantum principles similar to the observer effect to create tissue contrast?",
         options: [
            { id: 'density', label: "Different tissues have different hydrogen densities that absorb radio waves differently" },
            { id: 'temperature', label: "Tumors are warmer and emit more radio waves" },
            { id: 'spin', label: "Radio pulses 'observe' hydrogen spin states; different tissues have different relaxation times when returning to equilibrium", correct: true },
            { id: 'magnetic', label: "Tumor cells are more magnetic than healthy cells" },
         ],
         explanation: "Hydrogen atoms have quantum spin states. Strong magnets align spins, then radio pulses flip them (observation!). Different tissues relax back at different rates—fat quickly, water slowly. These timing differences create the contrast that reveals tumors!"
      },
      // Q8: Synthesis Question - Deep Understanding (Expert) - Correct: B
      {
         scenario: "Consider all four applications you learned: quantum computing, quantum encryption, electron microscopy, and MRI. Each uses a different aspect of wave-particle duality.",
         question: "What is the MOST fundamental insight from the double-slit experiment that underlies all these technologies?",
         options: [
            { id: 'small', label: "Quantum effects only matter at very small scales" },
            { id: 'information', label: "Information and physical reality are deeply connected—measurement/observation changes quantum states", correct: true },
            { id: 'random', label: "Quantum mechanics introduces fundamental randomness" },
            { id: 'wave', label: "Everything is made of waves, not particles" },
         ],
         explanation: "The deepest insight: INFORMATION has physical reality! Whether in computing (superposition collapses on readout), encryption (observation disturbs states), microscopy (wave properties enable resolution), or MRI (spin observation creates signals)—the act of gaining information physically changes the system. This isn't philosophy—it's exploitable physics!"
      },
      // Q9: Delayed Choice Experiment (Expert) - Correct: A
      {
         scenario: "In Wheeler's 'delayed choice' experiment, scientists decide whether to observe which-path information AFTER the electron has already passed through the slits—but BEFORE it hits the screen.",
         question: "What happens to the interference pattern when the observation decision is made after the electron passes through?",
         options: [
            { id: 'still_collapse', label: "Pattern still disappears if which-path is measured—as if the electron 'knew' the future choice", correct: true },
            { id: 'pattern_stays', label: "Pattern remains because the electron already 'committed' to being a wave" },
            { id: 'half_pattern', label: "Half interference, half particle—the electron is caught between states" },
            { id: 'depends', label: "It depends on how quickly the decision is made" },
         ],
         explanation: "This mind-bending result confirms quantum mechanics! The electron doesn't 'choose' wave or particle until measurement. Wheeler said it's as if the photon 'knows' what experiment it will face. This isn't time travel—it shows the electron had no definite path until information was extracted!"
      },
      // Q10: Practical Quantum Engineering Challenge (Hard) - Correct: C
      {
         scenario: "A quantum computer startup claims their 100-qubit processor can solve any problem instantly by exploring all solutions simultaneously. However, their device operates at room temperature in a normal office.",
         question: "Based on your understanding of wave-particle duality, why is this claim almost certainly false?",
         options: [
            { id: 'power', label: "100 qubits need more power than an office can supply" },
            { id: 'size', label: "Quantum computers must be larger than a room to work" },
            { id: 'decoherence', label: "Room temperature causes decoherence—thermal noise 'observes' the qubits, collapsing superposition", correct: true },
            { id: 'software', label: "There's no software that can program 100 qubits yet" },
         ],
         explanation: "Decoherence is the enemy of quantum computing! The observer effect applies to any interaction—including collisions with air molecules and thermal vibrations. At room temperature, trillions of such 'observations' per second destroy superposition. That's why real quantum computers operate at 15 millikelvin (-273.135°C), colder than outer space!"
      }
   ];

   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   // Emit first question content when entering test phase
   const prevPhaseRef = React.useRef<string>('');
   React.useEffect(() => {
      if (phase === 'test' && prevPhaseRef.current !== 'test') {
         // Entering test phase - emit first question so AI knows what's on screen
         const firstQ = testQuestions[0];
         emitGameEvent('question_changed', {
            phase: 'test',
            phaseLabel: 'Knowledge Test',
            questionNumber: 1,
            totalQuestions: testQuestions.length,
            questionScenario: firstQ.scenario,
            questionText: firstQ.question,
            allOptions: firstQ.options.map((o, idx) => `${String.fromCharCode(65 + idx)}: ${o.label}`).join(' | '),
            message: `Test started - Q1: Scenario: "${firstQ.scenario.substring(0, 80)}..." Question: "${firstQ.question}"`
         });
      }
      prevPhaseRef.current = phase;
   }, [phase, emitGameEvent]);

   // HOOK Screen - Clean, compact design
   if (phase === 'hook') {
      return (
         <PremiumWrapper>
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0
         }}>
            {/* Content area - centered */}
            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: isMobile ? '16px' : '24px',
               textAlign: 'center',
               overflow: 'auto'
            }}>
               {/* Icon */}
               <div style={{
                  width: isMobile ? '56px' : '70px',
                  height: isMobile ? '56px' : '70px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: isMobile ? '16px' : '20px',
                  boxShadow: '0 12px 40px rgba(6, 182, 212, 0.25)'
               }}>
                  <span style={{ fontSize: isMobile ? '24px' : '32px' }}>⚛️</span>
               </div>

               {/* Title */}
               <h1 style={{
                  fontSize: isMobile ? '22px' : '28px',
                  fontWeight: 800,
                  color: colors.textPrimary,
                  marginBottom: isMobile ? '8px' : '12px',
                  lineHeight: 1.2
               }}>
                  The Double-Slit Experiment
               </h1>

               {/* Subtitle */}
               <p style={{
                  fontSize: isMobile ? '13px' : '15px',
                  color: colors.textSecondary,
                  marginBottom: isMobile ? '20px' : '24px',
                  maxWidth: '400px',
                  lineHeight: 1.5
               }}>
                  Feynman called this <span style={{ color: colors.textPrimary, fontWeight: 600 }}>"the only mystery"</span> of quantum mechanics
               </p>

               {/* Feature cards */}
               <div style={{
                  display: 'flex',
                  gap: isMobile ? '8px' : '12px',
                  marginBottom: isMobile ? '20px' : '28px'
               }}>
                  {[
                     { icon: '🔬', text: 'Interactive' },
                     { icon: '🎯', text: 'Predict' },
                     { icon: '💡', text: 'Apply' }
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: isMobile ? '10px 14px' : '12px 18px',
                        borderRadius: '10px',
                        backgroundColor: colors.bgCardLight,
                        border: `1px solid ${colors.border}`
                     }}>
                        <div style={{ fontSize: isMobile ? '16px' : '20px', marginBottom: '4px' }}>{item.icon}</div>
                        <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 600, color: colors.textMuted }}>{item.text}</div>
                     </div>
                  ))}
               </div>

               {/* CTA Button */}
               <button
                  style={{
                     width: '100%',
                     maxWidth: '280px',
                     padding: isMobile ? '14px 20px' : '16px 28px',
                     fontSize: isMobile ? '14px' : '15px',
                     fontWeight: 700,
                     background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 6px 24px rgba(6, 182, 212, 0.3)',
                     minHeight: '48px'
                  }}
                  onMouseDown={() => goToPhase('predict')}
                  onTouchEnd={(e) => { e.preventDefault(); goToPhase('predict'); }}
               >
                  Start Experiment →
               </button>

               {/* Duration hint */}
               <p style={{
                  fontSize: '11px',
                  color: colors.textMuted,
                  marginTop: '12px'
               }}>
                  ~5 min • Interactive
               </p>
            </div>
         </div>
         </PremiumWrapper>
      );
   }

   // PREDICT Screen - Premium redesign (RESPONSIVE)
   if (phase === 'predict') {
      return (
         <PremiumWrapper>
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0
         }}>
            {/* Scrollable content area */}
            <div style={{
               flex: 1,
               overflowY: 'auto',
               padding: isMobile ? '12px' : '16px',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center'
            }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 1 • Make Your Prediction", "What Will Electrons Do?", "Think carefully — your intuition may not apply here.")}

                  {/* Setup diagram - compact */}
                  <div style={{
                     width: '100%',
                     padding: isMobile ? '8px' : '12px',
                     borderRadius: '12px',
                     marginBottom: '12px',
                     background: colors.bgCard,
                     border: `1px solid ${colors.border}`
                  }}>
                     <svg viewBox="0 0 400 100" style={{ width: '100%', height: isMobile ? '70px' : '80px' }}>
                        <rect x="25" y="25" width="50" height="40" rx="6" fill={colors.bgCardLight} stroke={colors.border} />
                        <circle cx="50" cy="45" r="8" fill={colors.primary} opacity="0.6">
                           <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite" />
                        </circle>
                        <text x="50" y="80" textAnchor="middle" style={{ fontSize: '8px', fill: colors.textMuted, fontWeight: 600 }}>e⁻ Gun</text>
                        <line x1="80" y1="45" x2="135" y2="45" stroke={colors.primary} strokeWidth="2" strokeDasharray="4 2" strokeOpacity="0.4" />
                        <rect x="135" y="10" width="14" height="30" fill={colors.bgCardLight} />
                        <rect x="135" y="43" width="14" height="8" fill="#000" />
                        <rect x="135" y="54" width="14" height="30" fill={colors.bgCardLight} />
                        <text x="142" y="95" textAnchor="middle" style={{ fontSize: '8px', fill: colors.textMuted, fontWeight: 600 }}>Slits</text>
                        <text x="230" y="55" style={{ fontSize: '28px', fill: colors.textMuted, fontWeight: 900 }}>?</text>
                        <rect x="320" y="10" width="30" height="74" rx="4" fill="#064e3b" stroke={colors.border} />
                        <text x="335" y="95" textAnchor="middle" style={{ fontSize: '8px', fill: colors.textMuted, fontWeight: 600 }}>Screen</text>
                     </svg>
                  </div>

                  {/* Question context - compact */}
                  <div style={{
                     padding: isMobile ? '10px' : '12px',
                     borderRadius: '10px',
                     marginBottom: '12px',
                     background: `${colors.primary}12`,
                     border: `1px solid ${colors.primary}25`
                  }}>
                     <p style={{ fontSize: isMobile ? '12px' : '13px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>
                        <strong style={{ color: colors.textPrimary }}>Setup:</strong> We fire electrons one at a time through two slits.
                        <strong style={{ color: colors.primary }}> What pattern forms on the screen?</strong>
                     </p>
                  </div>

                  {/* Options - more compact */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                     {[
                        { id: 'two', label: 'Two separate bands', desc: 'Particles choose one slit', icon: '▮ ▮' },
                        { id: 'interference', label: 'Multiple bands', desc: 'Wave-like interference pattern', icon: '▮▯▮▯▮' },
                        { id: 'one', label: 'One blob', desc: 'Random scatter', icon: '▓▓▓' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'predict',
                                 phaseLabel: 'Making Prediction',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted: ${opt.label}`
                              });
                           }}
                           onTouchEnd={(e) => {
                              e.preventDefault();
                              setPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'predict',
                                 phaseLabel: 'Making Prediction',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted: ${opt.label}`
                              });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: isMobile ? '12px' : '14px',
                              borderRadius: '12px',
                              textAlign: 'left',
                              background: prediction === opt.id ? `${colors.primary}18` : colors.bgCard,
                              border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                           }}
                        >
                           <div style={{
                              fontSize: '16px',
                              fontFamily: 'monospace',
                              color: prediction === opt.id ? colors.primary : colors.textMuted,
                              letterSpacing: '1px',
                              flexShrink: 0
                           }}>
                              {opt.icon}
                           </div>
                           <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                 fontWeight: 700,
                                 fontSize: isMobile ? '13px' : '14px',
                                 marginBottom: '2px',
                                 color: prediction === opt.id ? colors.textPrimary : colors.textSecondary
                              }}>{opt.label}</p>
                              <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>{opt.desc}</p>
                           </div>
                           {prediction === opt.id && (
                              <div style={{
                                 width: '22px',
                                 height: '22px',
                                 borderRadius: '50%',
                                 background: colors.primary,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 flexShrink: 0
                              }}>
                                 <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                              </div>
                           )}
                        </button>
                     ))}
                  </div>

                  {/* Hint - compact */}
                  <div style={{
                     padding: '10px',
                     borderRadius: '10px',
                     background: colors.bgCardLight,
                     border: `1px solid ${colors.border}`
                  }}>
                     <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', color: colors.warning }}>💡 Hint</p>
                     <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, lineHeight: 1.4 }}>
                        Particles → two bands. Waves → interference pattern.
                     </p>
                  </div>
               </div>
            </div>

            {/* Bottom bar - always visible */}
            {renderBottomBar(true, !!prediction, "Run Experiment")}
         </div>
         </PremiumWrapper>
      );
   }

   // PLAY Screen - Premium redesign
   if (phase === 'play') {
      const teachingMessages: Record<string, { title: string; message: string; color: string }> = {
         none: { title: '', message: '', color: colors.primary },
         few: {
            title: 'Observing Individual Hits',
            message: 'Each electron lands as a single dot — like a tiny particle. With few hits, it looks random. Keep watching as more accumulate...',
            color: colors.textMuted
         },
         pattern: {
            title: 'A Pattern Is Emerging',
            message: 'Wait — bands are starting to form! But electrons are fired ONE at a time. How can a single electron "know" about the slits?',
            color: colors.warning
         },
         clear: {
            title: 'Interference Pattern Confirmed!',
            message: 'This is unmistakably an INTERFERENCE pattern — the same pattern WAVES make! But we\'re firing individual particles. Each electron must be going through BOTH slits as a wave!',
            color: colors.primary
         },
         many: {
            title: 'The Quantum Reality',
            message: 'Single particles, fired one at a time, create a wave interference pattern. Each electron interferes with ITSELF. This is wave-particle duality — the heart of quantum mechanics.',
            color: colors.success
         },
      };

      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               {/* Main visualization area - min height on mobile for visibility */}
               <div className="flex-1 min-h-[45vh] lg:min-h-0 relative p-2 sm:p-3" style={{ background: colors.bgDark }}>
                  <div className="h-full rounded-xl sm:rounded-2xl overflow-hidden" style={{ background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderQuantumLabVisualizer(true, false)}
                  </div>

                  {/* Teaching milestone overlay - responsive positioning */}
                  {teachingMilestone !== 'none' && (
                     <div className="absolute bottom-3 sm:bottom-6 left-2 sm:left-6 right-2 sm:right-6 p-3 sm:p-5 rounded-xl sm:rounded-2xl backdrop-blur-md" style={{
                        background: `linear-gradient(135deg, ${colors.bgCard}ee 0%, ${colors.bgCardLight}dd 100%)`,
                        border: `1px solid ${teachingMessages[teachingMilestone].color}50`,
                        boxShadow: `0 8px 32px ${colors.bgDark}80`
                     }}>
                        <p className="text-xs sm:text-sm font-black mb-1 sm:mb-2" style={{ color: teachingMessages[teachingMilestone].color }}>
                           {teachingMessages[teachingMilestone].title}
                        </p>
                        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                           {teachingMessages[teachingMilestone].message}
                        </p>
                     </div>
                  )}
               </div>

               {/* Control panel - responsive padding and max height on mobile */}
               <div className="w-full lg:w-80 p-3 sm:p-5 flex flex-col gap-3 sm:gap-5 overflow-y-auto max-h-[45vh] lg:max-h-none" style={{
                  background: colors.bgCard,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none',
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`
               }}>
                  <div>
                     <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1" style={{ color: colors.primary }}>Step 2 • Run the Experiment</p>
                     <h3 className="text-base sm:text-lg font-black" style={{ color: colors.textPrimary }}>Double-Slit Lab</h3>
                  </div>

                  {/* Particle counter - compact on mobile */}
                  <div className="p-3 sm:p-4 rounded-xl text-center" style={{ background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2" style={{ color: colors.textMuted }}>Electrons Fired</p>
                     <p className="text-3xl sm:text-4xl font-black font-mono" style={{ color: colors.primary }}>{particleCount}</p>
                  </div>

                  {/* Firing rate control - touch-friendly slider */}
                  <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Firing Rate</label>
                        <span className="text-xs sm:text-sm font-bold font-mono" style={{ color: colors.primary }}>{firingRate}/sec</span>
                     </div>
                     <input
                        type="range" min="1" max="20" value={firingRate}
                        onChange={(e) => setFiringRate(parseInt(e.target.value))}
                        className="w-full h-3 sm:h-2 rounded-full appearance-none cursor-pointer"
                        style={{ background: colors.bgCardLight, accentColor: colors.primary, touchAction: 'manipulation' }}
                     />
                  </div>

                  {/* Reset button - touch-friendly */}
                  <button
                     onMouseDown={() => { setParticleHits([]); setParticleCount(0); setTeachingMilestone('none'); }}
                     style={{
                        width: '100%',
                        padding: isMobile ? '14px' : '12px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: isMobile ? '13px' : '14px',
                        background: colors.bgCardLight,
                        color: colors.textSecondary,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        minHeight: '44px'
                     }}
                  >
                     🔄 Reset Experiment
                  </button>

                  {/* Key insight - hide on very small screens to save space */}
                  <div className="hidden sm:block p-3 sm:p-4 rounded-xl" style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p className="text-xs sm:text-sm font-bold mb-1 sm:mb-2" style={{ color: colors.primary }}>What's Happening?</p>
                     <p className="text-[11px] sm:text-xs leading-relaxed" style={{ color: colors.textSecondary }}>
                        Each electron is fired <strong style={{ color: colors.textPrimary }}>individually</strong>. There's no way for electrons
                        to interact with each other — yet they build up an interference pattern that can only come from <strong style={{ color: colors.primary }}>wave behavior</strong>.
                     </p>
                  </div>

                  {/* Key takeaway - simplified on mobile */}
                  <div className="p-3 sm:p-4 rounded-xl" style={{ background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2" style={{ color: colors.warning }}>Key Insight</p>
                     <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                        Each electron passes through <strong style={{ color: colors.textPrimary }}>both slits at once</strong> as a wave!
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, particleCount >= 30, "Understand Why")}
         </div>
         </PremiumWrapper>
      );
   }

   // REVIEW Screen - Premium redesign
   if (phase === 'review') {
      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
               <div className="w-full max-w-2xl">
                  {renderSectionHeader("Step 3 • Understand the Result", "Wave-Particle Duality", "The electron isn't simply a particle OR a wave — it's something entirely new.")}

                  {/* Dual nature cards */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                     <div className="p-5 rounded-2xl" style={{
                        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`,
                        border: `1px solid ${colors.primary}40`
                     }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: `${colors.primary}30` }}>
                           <span className="text-2xl">⚫</span>
                        </div>
                        <p className="font-bold mb-2" style={{ color: colors.primary }}>Detected as Particles</p>
                        <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                           When an electron hits the screen, it appears at <strong style={{ color: colors.textPrimary }}>one specific point</strong> — like a tiny bullet striking a target.
                        </p>
                     </div>
                     <div className="p-5 rounded-2xl" style={{
                        background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}05 100%)`,
                        border: `1px solid ${colors.accent}40`
                     }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: `${colors.accent}30` }}>
                           <span className="text-2xl">〰️</span>
                        </div>
                        <p className="font-bold mb-2" style={{ color: colors.accent }}>Travels as Waves</p>
                        <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                           Between source and screen, electrons exist as <strong style={{ color: colors.textPrimary }}>probability waves</strong> that pass through BOTH slits simultaneously.
                        </p>
                     </div>
                  </div>

                  {/* Quote */}
                  <div className="p-6 rounded-2xl text-center mb-6" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>The Quantum Truth</p>
                     <p className="text-lg font-bold leading-relaxed mb-3" style={{ color: colors.textPrimary }}>
                        "The electron is not a wave OR a particle. It's something that has no classical analog."
                     </p>
                     <p className="text-sm" style={{ color: colors.textMuted }}>— Richard Feynman, Nobel Prize in Physics</p>
                  </div>

                  {/* Key takeaways */}
                  <div className="space-y-3 mb-6">
                     <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.warning }}>Key Takeaways</p>
                     {renderKeyTakeaway("🌊", "The Wave Function ψ", "|ψ|² gives the probability of finding the particle at each location. The wave passes through both slits and interferes with itself!")}
                     {renderKeyTakeaway("🎯", "Probability, Not Certainty", "We can never predict exactly where any single electron will land — only the probability distribution over many electrons.")}
                     {renderKeyTakeaway("🔀", "Superposition", "Until measured, the electron exists in a 'superposition' of going through both slits — it doesn't choose until we look.")}
                  </div>

                  {/* Why this matters */}
                  <div className="p-5 rounded-2xl" style={{ background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.success }}>Why This Matters</p>
                     <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        This isn't just a curiosity — it's the foundation of <strong style={{ color: colors.textPrimary }}>quantum computing</strong>.
                        Quantum computers exploit superposition to explore many solutions simultaneously, solving problems that would take classical computers billions of years.
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "The Observer Effect")}
         </div>
         </PremiumWrapper>
      );
   }

   // TWIST-PREDICT Screen - Premium redesign
   if (phase === 'twist_predict') {
      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
               <div className="w-full max-w-2xl">
                  {renderSectionHeader("Step 4 • The Observer Effect", "What If We Watch?", "This is where quantum mechanics gets truly mind-bending.")}

                  {/* Context */}
                  <div className="p-5 rounded-2xl mb-6" style={{ background: `${colors.danger}15`, border: `1px solid ${colors.danger}30` }}>
                     <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The New Question:</strong> We've seen that electrons create an interference pattern.
                        But what if we add a <strong style={{ color: colors.danger }}>detector at the slits</strong> to see which slit each electron passes through?
                        Will the pattern change when we're "watching"?
                     </p>
                  </div>

                  {/* Diagram with detector */}
                  <div className="w-full p-4 rounded-2xl mb-6" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 350 110" className="w-full h-28">
                        <rect x="30" y="35" width="50" height="45" rx="6" fill={colors.bgCardLight} stroke={colors.border} />
                        <circle cx="55" cy="57" r="8" fill={colors.primary} opacity="0.5" />
                        <text x="55" y="92" textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Source</text>

                        <line x1="85" y1="57" x2="130" y2="57" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="4" opacity="0.3" />

                        <rect x="130" y="10" width="15" height="40" fill={colors.bgCardLight} />
                        <rect x="130" y="54" width="15" height="10" fill="#000" />
                        <rect x="130" y="68" width="15" height="40" fill={colors.bgCardLight} />

                        {/* Detector */}
                        <rect x="100" y="42" width="25" height="30" rx="4" fill="#7f1d1d" stroke={colors.danger} />
                        <circle cx="112" cy="57" r="6" fill={colors.danger}>
                           <animate attributeName="opacity" values="0.4;1;0.4" dur="0.4s" repeatCount="indefinite" />
                        </circle>
                        <line x1="125" y1="52" x2="145" y2="52" stroke={colors.danger} strokeWidth="2" opacity="0.7" />
                        <line x1="125" y1="62" x2="145" y2="68" stroke={colors.danger} strokeWidth="2" opacity="0.7" />
                        <text x="112" y="32" textAnchor="middle" className="text-[7px] fill-red-400 font-bold">DETECTOR</text>

                        <text x="220" y="62" className="text-[32px] font-black" style={{ fill: colors.textMuted }}>?</text>

                        <rect x="290" y="10" width="30" height="90" rx="4" fill="#064e3b" stroke={colors.border} />
                        <text x="305" y="108" textAnchor="middle" className="text-[8px] fill-slate-400 font-bold">Screen</text>
                     </svg>
                  </div>

                  {/* Options */}
                  <p className="text-sm font-bold mb-4" style={{ color: colors.textSecondary }}>
                     When we measure which slit each electron passes through, what happens to the interference pattern?
                  </p>

                  <div className="grid gap-4 mb-6">
                     {[
                        { id: 'disappear', label: 'The interference pattern disappears', desc: 'We see two bands (one per slit) instead of the wave pattern', icon: '▮ ▮' },
                        { id: 'same', label: 'The pattern stays the same', desc: 'Simply watching shouldn\'t change the physics', icon: '▮▯▮▯▮' },
                        { id: 'stronger', label: 'The pattern becomes stronger', desc: 'More information should give a clearer result', icon: '▮▮▮▮▮' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setTwistPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'twist_predict',
                                 phaseLabel: 'Twist Prediction',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted observer effect: ${opt.label}`
                              });
                           }}
                           onTouchEnd={(e) => {
                              e.preventDefault();
                              setTwistPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'twist_predict',
                                 phaseLabel: 'Twist Prediction',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted observer effect: ${opt.label}`
                              });
                           }}
                           className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all"
                           style={{
                              background: twistPrediction === opt.id ? `${colors.danger}20` : colors.bgCard,
                              border: `2px solid ${twistPrediction === opt.id ? colors.danger : colors.border}`,
                              boxShadow: twistPrediction === opt.id ? `0 4px 20px ${colors.danger}20` : 'none'
                           }}
                        >
                           <div className="text-xl font-mono" style={{ color: twistPrediction === opt.id ? colors.danger : colors.textMuted }}>
                              {opt.icon}
                           </div>
                           <div className="flex-1">
                              <p className="font-bold mb-1" style={{ color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p className="text-sm" style={{ color: colors.textMuted }}>{opt.desc}</p>
                           </div>
                        </button>
                     ))}
                  </div>

                  {/* Think about it */}
                  <div className="p-4 rounded-xl" style={{ background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.warning }}>Think About It</p>
                     <p className="text-sm" style={{ color: colors.textMuted }}>
                        If the electron goes through BOTH slits as a wave to create interference, what happens when we force it to "reveal" which slit it actually used?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!twistPrediction, "Turn On Detector", undefined, colors.danger)}
         </div>
         </PremiumWrapper>
      );
   }

   // TWIST-PLAY Screen - Premium redesign
   if (phase === 'twist_play') {
      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               {/* Main visualization area */}
               <div className="flex-1 relative p-3" style={{ background: colors.bgDark }}>
                  <div className="h-full rounded-2xl overflow-hidden" style={{ background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderQuantumLabVisualizer(true, true)}
                  </div>

                  {/* Result overlay */}
                  <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl backdrop-blur-md" style={{
                     background: `linear-gradient(135deg, ${colors.bgCard}ee 0%, ${colors.bgCardLight}dd 100%)`,
                     border: `1px solid ${detectorOn ? colors.danger : colors.success}50`,
                     boxShadow: `0 8px 32px ${colors.bgDark}80`
                  }}>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                           background: detectorOn ? `${colors.danger}30` : `${colors.success}30`
                        }}>
                           <span className="text-xl">{detectorOn ? '👁️' : '🌊'}</span>
                        </div>
                        <div>
                           <p className="text-sm font-black" style={{ color: detectorOn ? colors.danger : colors.success }}>
                              {detectorOn ? '🔴 PARTICLE BEHAVIOR — 2 Bands' : '🔵 WAVE BEHAVIOR — Interference'}
                           </p>
                           <p className="text-xs font-bold" style={{ color: colors.textMuted }}>
                              {detectorOn ? 'Red dots = observed particles' : 'Cyan dots = wave interference'}
                           </p>
                        </div>
                     </div>
                     <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        {detectorOn
                           ? '👁️ Observation forces electrons to "choose" ONE slit → TWO distinct bands appear (look at the histogram!)'
                           : '🔒 No observation → electrons pass through BOTH slits as waves → MANY interference bands appear'}
                     </p>
                  </div>
               </div>

               {/* Control panel */}
               <div className="w-full lg:w-80 p-5 flex flex-col gap-5 overflow-y-auto" style={{
                  background: colors.bgCard,
                  borderLeft: `1px solid ${colors.border}`
               }}>
                  <div>
                     <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: colors.danger }}>Step 5 • The Observer Effect</p>
                     <h3 className="text-lg font-black" style={{ color: colors.textPrimary }}>Measurement Matters</h3>
                  </div>

                  {/* Particle counter */}
                  <div className="p-4 rounded-xl text-center" style={{ background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.textMuted }}>Electrons Fired</p>
                     <p className="text-4xl font-black font-mono" style={{ color: detectorOn ? colors.danger : colors.primary }}>{particleCount}</p>
                  </div>

                  {/* Observer Mode Toggle - Clear switch UI */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCardLight, border: `2px solid ${detectorOn ? colors.danger : colors.primary}40` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>
                        👁️ Toggle Observer — Watch What Happens!
                     </p>

                     {/* Toggle Switch */}
                     <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button
                           onMouseDown={() => { setDetectorOn(true); setParticleHits([]); setParticleCount(0); setTeachingMilestone('none'); }}
                           style={{
                              flex: 1,
                              padding: '14px',
                              borderRadius: '10px',
                              fontWeight: 700,
                              fontSize: '12px',
                              border: 'none',
                              cursor: 'pointer',
                              background: detectorOn ? `linear-gradient(135deg, ${colors.danger} 0%, #b91c1c 100%)` : 'transparent',
                              color: detectorOn ? 'white' : colors.textMuted,
                              outline: detectorOn ? 'none' : `2px solid ${colors.border}`,
                              boxShadow: detectorOn ? `0 4px 20px ${colors.danger}50` : 'none'
                           }}
                        >
                           👁️ WATCHING
                           <br/><span style={{ fontSize: '10px', opacity: 0.8 }}>🔴 2 Bands</span>
                        </button>
                        <button
                           onMouseDown={() => { setDetectorOn(false); setParticleHits([]); setParticleCount(0); setTeachingMilestone('none'); }}
                           style={{
                              flex: 1,
                              padding: '14px',
                              borderRadius: '10px',
                              fontWeight: 700,
                              fontSize: '12px',
                              border: 'none',
                              cursor: 'pointer',
                              background: !detectorOn ? `linear-gradient(135deg, ${colors.primary} 0%, #0891b2 100%)` : 'transparent',
                              color: !detectorOn ? 'white' : colors.textMuted,
                              outline: !detectorOn ? 'none' : `2px solid ${colors.border}`,
                              boxShadow: !detectorOn ? `0 4px 20px ${colors.primary}50` : 'none'
                           }}
                        >
                           🔒 NOT WATCHING
                           <br/><span style={{ fontSize: '10px', opacity: 0.8 }}>🔵 Interference</span>
                        </button>
                     </div>

                     {/* Expected result hint */}
                     <div style={{ padding: '10px', borderRadius: '8px', background: detectorOn ? `${colors.danger}15` : `${colors.primary}15`, textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: detectorOn ? colors.danger : colors.primary }}>
                           {detectorOn
                              ? '🔴 EXPECT: 2 separated bands (particle behavior)'
                              : '🔵 EXPECT: Multiple bands (wave interference)'}
                        </p>
                        <p style={{ fontSize: '10px', color: colors.textMuted, marginTop: '4px' }}>
                           Toggle to see the dramatic difference!
                        </p>
                     </div>
                  </div>

                  {/* Reset button */}
                  <button
                     onMouseDown={() => { setParticleHits([]); setParticleCount(0); setTeachingMilestone('none'); }}
                     style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: colors.bgCardLight,
                        color: colors.textSecondary,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer'
                     }}
                  >
                     🔄 Reset Experiment
                  </button>

                  {/* Key insight */}
                  <div className="p-4 rounded-xl" style={{ background: `${colors.danger}15`, border: `1px solid ${colors.danger}30` }}>
                     <p className="text-sm font-bold mb-2" style={{ color: colors.danger }}>The Shocking Truth</p>
                     <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>
                        The mere act of <strong style={{ color: colors.textPrimary }}>gaining information</strong> about which path
                        the electron took destroys the interference. It's not about disturbing the electron — it's about <strong style={{ color: colors.danger }}>knowledge itself</strong>.
                     </p>
                  </div>

                  {/* Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                     <div className="p-3 rounded-xl text-center" style={{ background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                        <p className="text-lg mb-1">〰️〰️〰️</p>
                        <p className="text-[10px] font-bold" style={{ color: colors.success }}>Not Watching</p>
                        <p className="text-[10px]" style={{ color: colors.textMuted }}>Wave → Interference</p>
                     </div>
                     <div className="p-3 rounded-xl text-center" style={{ background: `${colors.danger}15`, border: `1px solid ${colors.danger}30` }}>
                        <p className="text-lg mb-1">● ●</p>
                        <p className="text-[10px] font-bold" style={{ color: colors.danger }}>Watching</p>
                        <p className="text-[10px]" style={{ color: colors.textMuted }}>Particle → Two Bands</p>
                     </div>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, particleCount >= 30, "Deep Understanding", undefined, colors.danger)}
         </div>
         </PremiumWrapper>
      );
   }

   // TWIST-REVIEW Screen
   if (phase === 'twist_review') {
      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
               <div className="w-full max-w-2xl">
                  {renderSectionHeader("Step 6 • Deep Understanding", "The Measurement Problem", "One of the deepest unsolved mysteries in physics.")}

                  {/* Comparison cards */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                     <div className="p-5 rounded-2xl" style={{
                        background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}05 100%)`,
                        border: `1px solid ${colors.accent}40`
                     }}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${colors.accent}30` }}>
                              <span className="text-xl">🌊</span>
                           </div>
                           <p className="font-bold" style={{ color: colors.accent }}>Not Observed</p>
                        </div>
                        <p className="text-sm leading-relaxed mb-3" style={{ color: colors.textSecondary }}>
                           Electron exists as a probability wave, passing through <strong style={{ color: colors.textPrimary }}>both slits simultaneously</strong> and interfering with itself.
                        </p>
                        <div className="p-2 rounded-lg text-center" style={{ background: `${colors.accent}20` }}>
                           <p className="text-xs font-bold" style={{ color: colors.accent }}>Result: Interference Pattern</p>
                        </div>
                     </div>
                     <div className="p-5 rounded-2xl" style={{
                        background: `linear-gradient(135deg, ${colors.danger}20 0%, ${colors.danger}05 100%)`,
                        border: `1px solid ${colors.danger}40`
                     }}>
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${colors.danger}30` }}>
                              <span className="text-xl">👁️</span>
                           </div>
                           <p className="font-bold" style={{ color: colors.danger }}>Observed</p>
                        </div>
                        <p className="text-sm leading-relaxed mb-3" style={{ color: colors.textSecondary }}>
                           Wave function collapses — electron is forced to "choose" and goes through <strong style={{ color: colors.textPrimary }}>one slit only</strong>.
                        </p>
                        <div className="p-2 rounded-lg text-center" style={{ background: `${colors.danger}20` }}>
                           <p className="text-xs font-bold" style={{ color: colors.danger }}>Result: Two Bands</p>
                        </div>
                     </div>
                  </div>

                  {/* The deep question */}
                  <div className="p-6 rounded-2xl text-center mb-6" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.warning }}>The Unsolved Mystery</p>
                     <p className="text-lg font-bold leading-relaxed mb-3" style={{ color: colors.textPrimary }}>
                        What exactly causes the wave function to "collapse"?
                     </p>
                     <p className="text-sm" style={{ color: colors.textSecondary }}>
                        Is it consciousness? Any measurement device? The transfer of information? <strong style={{ color: colors.warning }}>Physicists still debate this today.</strong>
                     </p>
                  </div>

                  {/* Key takeaways */}
                  <div className="space-y-3 mb-6">
                     <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.success }}>Key Takeaways</p>
                     {renderKeyTakeaway("💥", "Wave Function Collapse", "ψ(both slits) → measurement → ψ(one slit). The superposition of 'both paths' collapses to 'one path' when observed.")}
                     {renderKeyTakeaway("📊", "Information Is Physical", "The act of gaining which-path information — even if we never look at it — is enough to destroy interference.")}
                     {renderKeyTakeaway("🔮", "Quantum Eraser", "Amazingly, if we 'erase' the which-path information before the particle hits the screen, interference returns!")}
                  </div>

                  {/* Why this matters */}
                  <div className="p-5 rounded-2xl" style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.primary }}>The Big Picture</p>
                     <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        This isn't just philosophy — it has <strong style={{ color: colors.textPrimary }}>practical consequences</strong>.
                        Quantum computers must carefully avoid "observing" their qubits during computation, or the superposition collapses.
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Real World Applications", undefined, colors.success)}
         </div>
         </PremiumWrapper>
      );
   }

   // TRANSFER Screen - Sequential Real-world applications
   if (phase === 'transfer') {
      const realWorldApps = [
         {
            icon: '💻',
            title: 'Quantum Computing',
            short: 'Qubits in superposition',
            tagline: 'The Next Computing Revolution',
            description: 'Just like electrons passing through both slits simultaneously, quantum bits (qubits) exist in a superposition of 0 AND 1 at the same time. This allows quantum computers to explore millions of possible solutions in parallel.',
            connection: 'The double-slit experiment demonstrates superposition — electrons exist in multiple states until measured. Qubits use this same principle to process exponentially more information.',
            howItWorks: 'Qubits are made from trapped ions, superconducting circuits, or photons. They maintain quantum coherence at near absolute zero temperatures.',
            stats: [
               { value: '1,000+', label: 'Qubits achieved', icon: '⚡' },
               { value: '$65B', label: 'Market by 2030', icon: '📈' },
               { value: '100M×', label: 'Faster for some tasks', icon: '🚀' }
            ],
            examples: ['Drug discovery: Simulate molecular interactions impossible for classical computers', 'Cryptography: Factor large primes to break/create encryption', 'AI/ML: Train models on quantum-enhanced algorithms', 'Finance: Portfolio optimization and risk analysis'],
            companies: ['IBM', 'Google', 'Microsoft', 'IonQ', 'Rigetti'],
            futureImpact: 'By 2030, quantum computers may solve problems in minutes that would take classical computers millions of years.',
            color: colors.primary
         },
         {
            icon: '🔒',
            title: 'Quantum Encryption',
            short: 'Observer effect security',
            tagline: 'Unhackable Communication',
            description: 'Quantum Key Distribution (QKD) uses the observer effect you just learned! Any eavesdropper trying to intercept quantum keys will disturb them — instantly revealing the intrusion.',
            connection: 'When you observed electrons in the double-slit experiment, the pattern changed. QKD exploits this: any observation of the quantum key changes it, alerting both parties.',
            howItWorks: 'Photons are sent with quantum states. If intercepted, the states collapse differently than expected, revealing tampering with near-certainty.',
            stats: [
               { value: '4,600km', label: 'China quantum network', icon: '🌐' },
               { value: '99.9%', label: 'Tamper detection rate', icon: '🛡️' },
               { value: '$3.2B', label: 'Market by 2028', icon: '💰' }
            ],
            examples: ['Banking: Ultra-secure financial transactions between institutions', 'Government: Protect classified national security communications', 'Satellites: Micius satellite demonstrated space-to-ground QKD', 'Healthcare: Secure transmission of patient medical records'],
            companies: ['ID Quantique', 'Toshiba', 'QuantumCTek', 'MagiQ'],
            futureImpact: 'As quantum computers threaten current encryption, quantum encryption will become essential for all sensitive communications.',
            color: colors.success
         },
         {
            icon: '🔬',
            title: 'Electron Microscopy',
            short: 'Wave nature imaging',
            tagline: 'Seeing Individual Atoms',
            description: 'The wave nature of electrons that creates interference patterns also enables imaging at the atomic scale. Electron wavelengths are 100,000× shorter than visible light, allowing resolution of structures invisible to optical microscopes.',
            connection: 'The interference pattern you observed proves electrons have wave properties. Electron microscopes use this wave behavior to resolve details smaller than light wavelengths allow.',
            howItWorks: 'Electrons are accelerated through a voltage and focused using magnetic lenses. Their short wavelength enables sub-angstrom resolution.',
            stats: [
               { value: '0.5Å', label: 'Resolution achieved', icon: '🔍' },
               { value: '100,000×', label: 'Shorter than light', icon: '〰️' },
               { value: '$4.8B', label: 'Market size', icon: '📊' }
            ],
            examples: ['Virology: Visualize virus structures for vaccine development (COVID-19 spike protein)', 'Semiconductors: Quality control for chips with features < 5nm', 'Materials: Study crystal defects at atomic level', 'Proteins: Determine 3D structures for drug design'],
            companies: ['JEOL', 'Thermo Fisher', 'Hitachi', 'ZEISS'],
            futureImpact: 'Cryo-EM (electron microscopy at cryogenic temps) won the 2017 Nobel Prize and is revolutionizing structural biology.',
            color: colors.accent
         },
         {
            icon: '🏥',
            title: 'Medical Imaging (MRI)',
            short: 'Quantum spin detection',
            tagline: 'Quantum Physics Inside You',
            description: 'MRI scanners exploit the quantum spin properties of hydrogen atoms in your body. Radio waves flip these spins, and the quantum relaxation process creates detailed images — all without harmful radiation.',
            connection: 'Just as electron behavior changes when observed, hydrogen atoms in MRI respond to radio wave "observation" by flipping their quantum spin states. The timing of relaxation reveals tissue type.',
            howItWorks: 'Strong magnets align hydrogen spins. Radio pulses flip them. As they relax back, they emit signals that vary by tissue type, creating contrast.',
            stats: [
               { value: '40M+', label: 'MRI scans per year', icon: '🏥' },
               { value: '0 rad', label: 'Radiation exposure', icon: '✅' },
               { value: '$8.2B', label: 'Market size', icon: '💎' }
            ],
            examples: ['Neurology: Detect brain tumors, strokes, and MS lesions', 'Cardiology: Real-time imaging of heart function and blood flow', 'Oncology: Cancer staging and treatment monitoring', 'Sports Medicine: Detailed soft tissue injury assessment'],
            companies: ['Siemens', 'GE Healthcare', 'Philips', 'Canon'],
            futureImpact: 'Quantum sensors are enabling next-gen MRI with higher resolution and faster scan times, potentially detecting diseases years earlier.',
            color: colors.warning
         }
      ];

      const currentApp = realWorldApps[selectedApp];
      const allCompleted = completedApps.every(c => c);
      const isCurrentCompleted = completedApps[selectedApp];
      const completedCount = completedApps.filter(c => c).length;

      // Handle completing current app and moving to next
      const handleCompleteApp = () => {
         const newCompleted = [...completedApps];
         newCompleted[selectedApp] = true;
         setCompletedApps(newCompleted);

         // Emit completion event with full app details
         emitGameEvent('app_completed', {
            phase: 'transfer',
            phaseLabel: 'Real World Applications',
            appNumber: selectedApp + 1,
            appTitle: currentApp.title,
            appDescription: currentApp.description,
            message: `Completed application ${selectedApp + 1}: ${currentApp.title}`
         });

         if (selectedApp < 3) {
            const nextAppIdx = selectedApp + 1;
            const nextApp = realWorldApps[nextAppIdx];
            setSelectedApp(nextAppIdx);

            // Emit event for next app with full details
            emitGameEvent('app_changed', {
               phase: 'transfer',
               phaseLabel: 'Real World Applications',
               appNumber: nextAppIdx + 1,
               totalApps: 4,
               appTitle: nextApp.title,
               appTagline: nextApp.tagline,
               appDescription: nextApp.description,
               appConnection: nextApp.connection,
               message: `Now viewing application ${nextAppIdx + 1}/4: ${nextApp.title} - ${nextApp.tagline}`
            });
         }
      };

      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">

            {/* Compact header with tabs */}
            <div className="px-4 pt-4 pb-2" style={{ background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
               <div className="flex items-center justify-between mb-3">
                  <div>
                     <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.success }}>Step 7 • Real World Applications</p>
                     <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{completedCount}/4 completed — {allCompleted ? 'Ready for test!' : 'Complete all to unlock test'}</p>
                  </div>
                  {/* Progress dots */}
                  <div className="flex gap-1.5">
                     {completedApps.map((completed, i) => (
                        <div key={i} className="w-3 h-3 rounded-full transition-all" style={{
                           background: completed ? colors.success : i === selectedApp ? realWorldApps[i].color : colors.bgCardLight,
                           boxShadow: i === selectedApp ? `0 0 8px ${realWorldApps[i].color}` : 'none'
                        }} />
                     ))}
                  </div>
               </div>

               {/* Horizontal tab buttons */}
               <div className="flex gap-2">
                  {realWorldApps.map((app, i) => {
                     const isCompleted = completedApps[i];
                     const isCurrent = selectedApp === i;
                     const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

                     return (
                        <button
                           key={i}
                           onMouseDown={() => {
                              if (!isLocked && i !== selectedApp) {
                                 setSelectedApp(i);
                                 // Emit event with full app details
                                 emitGameEvent('app_changed', {
                                    phase: 'transfer',
                                    phaseLabel: 'Real World Applications',
                                    appNumber: i + 1,
                                    totalApps: 4,
                                    appTitle: app.title,
                                    appTagline: app.tagline,
                                    appDescription: app.description,
                                    appConnection: app.connection,
                                    message: `Switched to application ${i + 1}/4: ${app.title} - ${app.tagline}`
                                 });
                              }
                           }}
                           className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-center transition-all"
                           style={{
                              background: isCurrent ? `${app.color}20` : 'transparent',
                              border: `2px solid ${isCurrent ? app.color : isCompleted ? colors.success : colors.border}`,
                              opacity: isLocked ? 0.4 : 1,
                              cursor: isLocked ? 'not-allowed' : 'pointer'
                           }}
                        >
                           <span className="text-lg">{app.icon}</span>
                           <span className="text-xs font-bold hidden sm:inline" style={{ color: isCurrent ? colors.textPrimary : colors.textSecondary }}>
                              {app.title.split(' ')[0]}
                           </span>
                           {isCompleted && <span className="text-xs" style={{ color: colors.success }}>✓</span>}
                           {isLocked && <span className="text-xs">🔒</span>}
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* Main content - rich visual layout */}
            <div className="flex-1 overflow-y-auto">
               <div className="p-4 max-w-6xl mx-auto">
                  {/* Hero header */}
                  <div className="rounded-2xl overflow-hidden mb-4" style={{ background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${currentApp.color}05 100%)`, border: `1px solid ${currentApp.color}30` }}>
                     {/* Top: Info */}
                     <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl" style={{ background: `${currentApp.color}30`, border: `3px solid ${currentApp.color}` }}>
                              {currentApp.icon}
                           </div>
                           <div>
                              <div className="flex items-center gap-3">
                                 <h2 className="text-3xl font-black" style={{ color: colors.textPrimary }}>{currentApp.title}</h2>
                                 {isCurrentCompleted && <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ background: colors.success, color: 'white' }}>✓ Completed</span>}
                              </div>
                              <p className="text-lg font-bold mt-1" style={{ color: currentApp.color }}>{currentApp.tagline}</p>
                           </div>
                        </div>
                        <p className="text-base leading-relaxed mb-5" style={{ color: colors.textSecondary }}>{currentApp.description}</p>

                        {/* Stats row */}
                        <div className="flex gap-3 flex-wrap">
                           {currentApp.stats.map((stat, i) => (
                              <div key={i} className="flex-1 min-w-[120px] p-4 rounded-xl text-center" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                                 <p className="text-2xl mb-1">{stat.icon}</p>
                                 <p className="text-2xl font-black" style={{ color: currentApp.color }}>{stat.value}</p>
                                 <p className="text-sm font-bold uppercase" style={{ color: colors.textMuted }}>{stat.label}</p>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Large Visual Diagram - Full width, much larger */}
                     <div className="p-4 mx-4 mb-4 rounded-xl" style={{ background: colors.bgDark }}>
                        <p className="text-center text-sm font-bold uppercase tracking-wider mb-3" style={{ color: currentApp.color }}>
                           🔬 How {currentApp.title} Uses Quantum Mechanics
                        </p>
                        <svg viewBox="0 0 600 320" className="w-full" style={{ maxHeight: '340px' }}>
                              {selectedApp === 0 && (
                                 /* Quantum Computing - Shows superposition like double-slit */
                                 <g>
                                    {/* Left side: Double-slit analogy */}
                                    <g transform="translate(20, 10)">
                                       <rect x="0" y="0" width="240" height="160" rx="10" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
                                       <text x="120" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.textMuted}>DOUBLE-SLIT</text>

                                       {/* Electron source */}
                                       <circle cx="40" cy="85" r="18" fill={currentApp.color} opacity="0.4" />
                                       <circle cx="40" cy="85" r="10" fill={currentApp.color} opacity="0.7">
                                          <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
                                       </circle>
                                       <text x="40" y="120" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Electron</text>

                                       {/* Barrier with slits */}
                                       <rect x="100" y="45" width="8" height="35" fill={colors.textMuted} rx="2" />
                                       <rect x="100" y="95" width="8" height="35" fill={colors.textMuted} rx="2" />

                                       {/* Wave through BOTH slits */}
                                       <path d="M 58 85 Q 78 60, 100 65" fill="none" stroke={currentApp.color} strokeWidth="2" opacity="0.7" />
                                       <path d="M 58 85 Q 78 110, 100 105" fill="none" stroke={currentApp.color} strokeWidth="2" opacity="0.7" />
                                       <text x="78" y="88" textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors.accent}>Both!</text>

                                       {/* Screen with interference pattern */}
                                       <rect x="170" y="40" width="22" height="90" fill={colors.bgCardLight} rx="3" stroke={colors.border} />
                                       {[0,1,2,3,4,5].map((i) => (
                                          <rect key={i} x="173" y={45 + i*14} width="16" height="9" fill={currentApp.color} opacity={i % 2 === 0 ? 0.9 : 0.3} rx="2" />
                                       ))}
                                       <text x="181" y="145" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>Pattern</text>
                                    </g>

                                    {/* Equals sign in middle */}
                                    <text x="300" y="80" textAnchor="middle" fontSize="32" fontWeight="bold" fill={colors.accent}>=</text>
                                    <text x="300" y="105" textAnchor="middle" fontSize="12" fill={colors.textMuted}>Same Principle!</text>

                                    {/* Right side: Qubit comparison - Coin analogy */}
                                    <g transform="translate(340, 10)">
                                       <rect x="0" y="0" width="240" height="160" rx="10" fill={colors.bgCard} stroke={currentApp.color} strokeWidth="2" />
                                       <text x="120" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill={currentApp.color}>QUBIT: Like a Spinning Coin</text>

                                       {/* Classical bit - coin landed (heads OR tails) */}
                                       <g transform="translate(10, 28)">
                                          <text x="50" y="10" textAnchor="middle" fontSize="8" fontWeight="bold" fill={colors.textMuted}>CLASSICAL BIT</text>
                                          <text x="50" y="20" textAnchor="middle" fontSize="7" fill={colors.textSecondary}>Coin landed</text>

                                          {/* Coin showing heads */}
                                          <circle cx="30" cy="48" r="18" fill={colors.warning} opacity="0.3" stroke={colors.warning} strokeWidth="2" />
                                          <text x="30" y="53" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colors.textPrimary}>0</text>

                                          {/* OR text */}
                                          <text x="50" y="50" textAnchor="middle" fontSize="8" fill={colors.textMuted}>OR</text>

                                          {/* Coin showing tails */}
                                          <circle cx="70" cy="48" r="18" fill={colors.warning} opacity="0.3" stroke={colors.warning} strokeWidth="2" />
                                          <text x="70" y="53" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colors.textPrimary}>1</text>

                                          <text x="50" y="78" textAnchor="middle" fontSize="7" fill={colors.warning}>Must be one or other</text>
                                       </g>

                                       {/* Divider */}
                                       <line x1="120" y1="32" x2="120" y2="118" stroke={colors.border} strokeWidth="1" strokeDasharray="3,3" />

                                       {/* Quantum qubit - spinning coin (both at once) */}
                                       <g transform="translate(130, 28)">
                                          <text x="50" y="10" textAnchor="middle" fontSize="8" fontWeight="bold" fill={currentApp.color}>QUANTUM QUBIT</text>
                                          <text x="50" y="20" textAnchor="middle" fontSize="7" fill={currentApp.color}>Coin spinning!</text>

                                          {/* Spinning coin - ellipse to show rotation */}
                                          <ellipse cx="50" cy="48" rx="22" ry="18" fill={currentApp.color} opacity="0.2" stroke={currentApp.color} strokeWidth="2">
                                             <animate attributeName="rx" values="22;8;22" dur="0.8s" repeatCount="indefinite" />
                                          </ellipse>

                                          {/* Both states shown */}
                                          <text x="50" y="45" textAnchor="middle" fontSize="9" fontWeight="bold" fill={currentApp.color}>0</text>
                                          <text x="50" y="56" textAnchor="middle" fontSize="8" fill={currentApp.color}>AND</text>
                                          <text x="50" y="65" textAnchor="middle" fontSize="9" fontWeight="bold" fill={currentApp.color}>1</text>

                                          <text x="50" y="78" textAnchor="middle" fontSize="7" fill={colors.success}>Both until measured!</text>
                                       </g>

                                       {/* Bottom explanation */}
                                       <rect x="8" y="108" width="224" height="46" rx="6" fill={`${currentApp.color}15`} />
                                       <text x="120" y="122" textAnchor="middle" fontSize="8" fontWeight="bold" fill={currentApp.color}>⚛️ SUPERPOSITION</text>
                                       <text x="120" y="134" textAnchor="middle" fontSize="8" fill={colors.textPrimary}>Like electrons through BOTH slits at once</text>
                                       <text x="120" y="146" textAnchor="middle" fontSize="7" fill={colors.textMuted}>50 qubits = 1 quadrillion possibilities!</text>
                                    </g>

                                    {/* Key insight box - well spaced */}
                                    <rect x="20" y="185" width="560" height="55" rx="8" fill={`${currentApp.color}20`} stroke={currentApp.color} strokeWidth="2" />
                                    <text x="300" y="208" textAnchor="middle" fontSize="14" fontWeight="bold" fill={currentApp.color}>💡 KEY INSIGHT</text>
                                    <text x="300" y="228" textAnchor="middle" fontSize="12" fill={colors.textPrimary}>Electrons through BOTH slits = Qubits in BOTH 0 AND 1 states</text>

                                    {/* Bottom tagline */}
                                    <rect x="20" y="250" width="560" height="55" rx="8" fill={colors.bgCard} stroke={colors.border} />
                                    <text x="300" y="273" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colors.textPrimary}>⚡ This enables exploring millions of solutions simultaneously!</text>
                                    <text x="300" y="293" textAnchor="middle" fontSize="11" fill={colors.textMuted}>Quantum supremacy: 200 seconds vs 10,000 years on classical computers</text>
                                 </g>
                              )}
                              {selectedApp === 1 && (
                                 /* Quantum Encryption - Observer effect for security */
                                 <g>
                                    {/* Scenario 1: Secure Channel */}
                                    <g transform="translate(20, 10)">
                                       <rect x="0" y="0" width="560" height="85" rx="10" fill={colors.bgCard} stroke={colors.success} strokeWidth="2" />
                                       <text x="280" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.success}>✓ SECURE CHANNEL (No Eavesdropper)</text>

                                       {/* Alice */}
                                       <rect x="30" y="35" width="80" height="40" rx="8" fill={`${currentApp.color}30`} stroke={currentApp.color} strokeWidth="2" />
                                       <text x="70" y="60" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colors.textPrimary}>👩 Alice</text>

                                       {/* Photon traveling */}
                                       <circle r="10" fill={currentApp.color}>
                                          <animate attributeName="cx" values="130;430" dur="2s" repeatCount="indefinite" />
                                          <animate attributeName="cy" values="55;55" dur="2s" repeatCount="indefinite" />
                                       </circle>

                                       {/* Bob */}
                                       <rect x="450" y="35" width="80" height="40" rx="8" fill={`${currentApp.color}30`} stroke={currentApp.color} strokeWidth="2" />
                                       <text x="490" y="60" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colors.textPrimary}>👨 Bob</text>

                                       <text x="280" y="80" textAnchor="middle" fontSize="11" fill={colors.success}>Quantum state preserved → Keys match ✓</text>
                                    </g>

                                    {/* Scenario 2: Eavesdropper Detected */}
                                    <g transform="translate(20, 100)">
                                       <rect x="0" y="0" width="560" height="100" rx="10" fill={colors.bgCard} stroke={colors.danger} strokeWidth="2" />
                                       <text x="280" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.danger}>⚠️ EAVESDROPPER DETECTED!</text>

                                       {/* Flow diagram: Alice → Eve → Bob → Alert */}
                                       <g transform="translate(0, 26)">
                                          {/* Alice */}
                                          <rect x="20" y="0" width="55" height="28" rx="5" fill={`${currentApp.color}20`} stroke={currentApp.color} />
                                          <text x="47" y="18" textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors.textPrimary}>👩 Alice</text>

                                          {/* Arrow 1 */}
                                          <line x1="80" y1="14" x2="140" y2="14" stroke={colors.danger} strokeWidth="2" markerEnd="url(#arrowhead)" />
                                          <text x="110" y="8" textAnchor="middle" fontSize="7" fill={colors.danger}>sends</text>

                                          {/* Eve */}
                                          <rect x="145" y="0" width="60" height="28" rx="5" fill={`${colors.danger}20`} stroke={colors.danger} strokeWidth="2" />
                                          <text x="175" y="12" textAnchor="middle" fontSize="12">👁️</text>
                                          <text x="175" y="24" textAnchor="middle" fontSize="8" fontWeight="bold" fill={colors.danger}>Eve</text>

                                          {/* Arrow 2 with "disturbed" label */}
                                          <line x1="210" y1="14" x2="270" y2="14" stroke={colors.danger} strokeWidth="2" strokeDasharray="4,2" />
                                          <text x="240" y="8" textAnchor="middle" fontSize="7" fill={colors.danger}>disturbed!</text>

                                          {/* Bob */}
                                          <rect x="275" y="0" width="55" height="28" rx="5" fill={`${currentApp.color}20`} stroke={currentApp.color} />
                                          <text x="302" y="18" textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors.textPrimary}>👨 Bob</text>

                                          {/* Arrow 3 */}
                                          <line x1="335" y1="14" x2="395" y2="14" stroke={colors.danger} strokeWidth="2" />
                                          <text x="365" y="8" textAnchor="middle" fontSize="7" fill={colors.danger}>mismatch!</text>

                                          {/* Alert */}
                                          <rect x="400" y="0" width="80" height="28" rx="5" fill={colors.danger} />
                                          <text x="440" y="18" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">🚨 DETECTED</text>
                                       </g>

                                       {/* Explanation - well spaced */}
                                       <text x="280" y="72" textAnchor="middle" fontSize="9" fontWeight="bold" fill={colors.danger}>
                                          Observation disturbs quantum state → Intrusion detected!
                                       </text>
                                       <text x="280" y="88" textAnchor="middle" fontSize="8" fill={colors.textMuted}>
                                          Physics guarantees: Any spy MUST leave evidence
                                       </text>
                                    </g>

                                    {/* Key insight box */}
                                    <rect x="20" y="210" width="560" height="45" rx="8" fill={`${currentApp.color}20`} stroke={currentApp.color} strokeWidth="2" />
                                    <text x="300" y="228" textAnchor="middle" fontSize="11" fontWeight="bold" fill={currentApp.color}>💡 OBSERVER EFFECT = UNBREAKABLE SECURITY</text>
                                    <text x="300" y="245" textAnchor="middle" fontSize="10" fill={colors.textPrimary}>Any eavesdropping changes quantum state → Impossible to hide!</text>

                                    {/* Bottom info */}
                                    <rect x="20" y="265" width="560" height="45" rx="8" fill={colors.bgCard} stroke={colors.border} />
                                    <text x="300" y="283" textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors.textPrimary}>🌐 Real-world: China's 4,600km quantum network operational</text>
                                    <text x="300" y="300" textAnchor="middle" fontSize="9" fill={colors.textMuted}>Banks & governments use quantum encryption for ultra-secure communications</text>
                                 </g>
                              )}
                              {selectedApp === 2 && (
                                 /* Electron Microscopy - Wave nature enables resolution */
                                 <g>
                                    {/* Side-by-side comparison */}
                                    <g transform="translate(20, 10)">
                                       {/* Light Microscope */}
                                       <rect x="0" y="0" width="250" height="140" rx="10" fill={colors.bgCard} stroke={colors.warning} strokeWidth="2" />
                                       <text x="125" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colors.warning}>🔦 LIGHT MICROSCOPE</text>
                                       <text x="125" y="40" textAnchor="middle" fontSize="10" fill={colors.textMuted}>λ = 500 nm</text>

                                       {/* Long wavelength */}
                                       <path d="M 30 65 Q 55 50, 80 65 T 130 65 T 180 65 T 220 65" fill="none" stroke={colors.warning} strokeWidth="3" opacity="0.7" />

                                       {/* Blurry result */}
                                       <circle cx="125" cy="100" r="22" fill={colors.warning} opacity="0.15" />
                                       <circle cx="125" cy="100" r="14" fill={colors.warning} opacity="0.25" />
                                       <text x="125" y="135" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.warning}>Cells visible</text>
                                    </g>

                                    {/* VS */}
                                    <text x="300" y="80" textAnchor="middle" fontSize="20" fontWeight="bold" fill={colors.textMuted}>VS</text>

                                    {/* Electron Microscope */}
                                    <g transform="translate(330, 10)">
                                       <rect x="0" y="0" width="250" height="140" rx="10" fill={colors.bgCard} stroke={currentApp.color} strokeWidth="2" />
                                       <text x="125" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill={currentApp.color}>⚡ ELECTRON MICROSCOPE</text>
                                       <text x="125" y="40" textAnchor="middle" fontSize="10" fill={colors.textMuted}>λ = 0.005 nm (100,000× shorter)</text>

                                       {/* Short wavelength */}
                                       <path d="M 30 65 Q 33 60, 36 65 T 42 65 T 48 65 T 54 65 T 60 65 T 66 65 T 72 65 T 78 65 T 84 65 T 90 65 T 96 65 T 102 65 T 108 65 T 114 65 T 120 65 T 126 65 T 132 65 T 138 65 T 144 65 T 150 65 T 156 65 T 162 65 T 168 65 T 174 65 T 180 65 T 186 65 T 192 65 T 198 65 T 204 65 T 210 65 T 216 65 T 220 65" fill="none" stroke={currentApp.color} strokeWidth="2" />

                                       {/* Sharp atoms */}
                                       <g transform="translate(125, 98)">
                                          {[-16, 0, 16].map((x, i) => (
                                             <circle key={i} cx={x} cy="-8" r="6" fill={currentApp.color} stroke="white" strokeWidth="1.5" />
                                          ))}
                                          {[-8, 8].map((x, i) => (
                                             <circle key={i} cx={x} cy="8" r="6" fill={currentApp.color} stroke="white" strokeWidth="1.5" />
                                          ))}
                                       </g>
                                       <text x="125" y="135" textAnchor="middle" fontSize="12" fontWeight="bold" fill={currentApp.color}>ATOMS visible!</text>
                                    </g>

                                    {/* Key insight row */}
                                    <rect x="20" y="165" width="280" height="45" rx="8" fill={`${colors.primary}15`} stroke={colors.primary} strokeWidth="1" />
                                    <text x="160" y="185" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.primary}>🔗 Double-Slit Connection</text>
                                    <text x="160" y="202" textAnchor="middle" fontSize="10" fill={colors.textPrimary}>Interference proves electrons are waves</text>

                                    <rect x="310" y="165" width="270" height="45" rx="8" fill={`${currentApp.color}20`} stroke={currentApp.color} strokeWidth="1" />
                                    <text x="445" y="185" textAnchor="middle" fontSize="12" fontWeight="bold" fill={currentApp.color}>💡 Shorter wavelength = Finer details</text>
                                    <text x="445" y="202" textAnchor="middle" fontSize="10" fill={colors.textPrimary}>See viruses, proteins, atoms!</text>

                                    {/* Resolution bar */}
                                    <rect x="20" y="220" width="560" height="40" rx="8" fill={colors.bgCard} stroke={colors.border} />
                                    <text x="60" y="245" fontSize="11" fontWeight="bold" fill={colors.textMuted}>Resolution:</text>
                                    <rect x="130" y="232" width="180" height="16" rx="3" fill={colors.warning} opacity="0.4" />
                                    <text x="220" y="244" textAnchor="middle" fontSize="10" fill={colors.textPrimary}>Light: ~200nm (cells)</text>
                                    <rect x="330" y="232" width="40" height="16" rx="3" fill={currentApp.color} />
                                    <text x="420" y="244" fontSize="10" fill={colors.textPrimary}>Electron: 0.5Å (atoms)</text>

                                    {/* Bottom fact */}
                                    <rect x="20" y="270" width="560" height="40" rx="8" fill={colors.bgCard} stroke={colors.border} />
                                    <text x="300" y="290" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colors.textPrimary}>🏆 2017 Nobel Prize: Cryo-EM imaged COVID-19 spike protein structure</text>
                                    <text x="300" y="305" textAnchor="middle" fontSize="10" fill={colors.textMuted}>Enabled rapid vaccine development by revealing virus structure at atomic level</text>
                                 </g>
                              )}
                              {selectedApp === 3 && (
                                 /* MRI - Quantum spin states + observation */
                                 <g>
                                    {/* 3-Step Process */}
                                    <g transform="translate(20, 10)">
                                       {/* Step 1: ALIGN */}
                                       <rect x="0" y="0" width="165" height="120" rx="10" fill={colors.bgCard} stroke={colors.border} strokeWidth="2" />
                                       <text x="82" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.textMuted}>1️⃣ ALIGN</text>
                                       <text x="82" y="35" textAnchor="middle" fontSize="9" fill={colors.textMuted}>Magnetic field</text>

                                       {/* Aligned spins */}
                                       {[40, 82, 124].map((x, i) => (
                                          <g key={i} transform={`translate(${x}, 72)`}>
                                             <circle r="10" fill={currentApp.color} opacity="0.3" />
                                             <line x1="0" y1="0" x2="0" y2="-20" stroke={currentApp.color} strokeWidth="2" />
                                             <polygon points="0,-24 -4,-16 4,-16" fill={currentApp.color} />
                                          </g>
                                       ))}
                                       <text x="82" y="110" textAnchor="middle" fontSize="9" fill={colors.textMuted}>H atoms aligned ↑</text>
                                    </g>

                                    {/* Arrow 1 */}
                                    <text x="200" y="70" fontSize="24" fontWeight="bold" fill={colors.textMuted}>→</text>

                                    {/* Step 2: OBSERVE */}
                                    <g transform="translate(218, 10)">
                                       <rect x="0" y="0" width="165" height="120" rx="10" fill={colors.bgCard} stroke={colors.danger} strokeWidth="2" />
                                       <text x="82" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.danger}>2️⃣ OBSERVE</text>
                                       <text x="82" y="35" textAnchor="middle" fontSize="9" fill={colors.textMuted}>Radio pulse flips</text>

                                       {/* Wobbling spins */}
                                       {[40, 82, 124].map((x, i) => (
                                          <g key={i} transform={`translate(${x}, 72)`}>
                                             <circle r="10" fill={colors.danger} opacity="0.3" />
                                             <line x1="0" y1="0" x2="6" y2="16" stroke={colors.danger} strokeWidth="2">
                                                <animateTransform attributeName="transform" type="rotate" from="0" to={i % 2 === 0 ? "360" : "-360"} dur={`${0.6 + i * 0.15}s`} repeatCount="indefinite" />
                                             </line>
                                          </g>
                                       ))}
                                       <text x="82" y="110" textAnchor="middle" fontSize="9" fill={colors.danger}>Spins disturbed ↺</text>
                                    </g>

                                    {/* Arrow 2 */}
                                    <text x="398" y="70" fontSize="24" fontWeight="bold" fill={colors.textMuted}>→</text>

                                    {/* Step 3: IMAGE */}
                                    <g transform="translate(416, 10)">
                                       <rect x="0" y="0" width="165" height="120" rx="10" fill={colors.bgCard} stroke={currentApp.color} strokeWidth="2" />
                                       <text x="82" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill={currentApp.color}>3️⃣ IMAGE</text>
                                       <text x="82" y="35" textAnchor="middle" fontSize="9" fill={colors.textMuted}>Relaxation → contrast</text>

                                       {/* Brain scan */}
                                       <ellipse cx="82" cy="72" rx="35" ry="30" fill={currentApp.color} opacity="0.15" stroke={currentApp.color} strokeWidth="1.5" />
                                       <path d="M 58 65 Q 82 58, 106 65" fill="none" stroke={currentApp.color} strokeWidth="1.5" />
                                       <path d="M 62 80 Q 82 86, 102 80" fill="none" stroke={currentApp.color} strokeWidth="1.5" />
                                       <text x="82" y="115" textAnchor="middle" fontSize="9" fill={currentApp.color}>MRI Scan 🧠</text>
                                    </g>

                                    {/* Tissue contrast */}
                                    <g transform="translate(20, 140)">
                                       <rect x="0" y="0" width="560" height="42" rx="6" fill={colors.bgCard} stroke={colors.border} />
                                       <text x="280" y="15" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colors.textMuted}>Different Tissues = Different Relaxation Times</text>

                                       <rect x="35" y="22" width="100" height="14" rx="3" fill={colors.bgCardLight} />
                                       <rect x="35" y="22" width="85" height="14" rx="3" fill={currentApp.color} opacity="0.7" />
                                       <text x="85" y="33" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">Fat: Fast ⚡</text>

                                       <rect x="230" y="22" width="100" height="14" rx="3" fill={colors.bgCardLight} />
                                       <rect x="230" y="22" width="50" height="14" rx="3" fill={currentApp.color} opacity="0.5" />
                                       <text x="280" y="33" textAnchor="middle" fontSize="9" fontWeight="bold" fill={colors.textPrimary}>Muscle: Med</text>

                                       <rect x="425" y="22" width="100" height="14" rx="3" fill={colors.bgCardLight} />
                                       <rect x="425" y="22" width="25" height="14" rx="3" fill={currentApp.color} opacity="0.3" />
                                       <text x="475" y="33" textAnchor="middle" fontSize="9" fontWeight="bold" fill={colors.textPrimary}>Water: Slow 🐢</text>
                                    </g>

                                    {/* Key insight */}
                                    <rect x="20" y="192" width="560" height="48" rx="8" fill={`${currentApp.color}20`} stroke={currentApp.color} strokeWidth="2" />
                                    <text x="300" y="212" textAnchor="middle" fontSize="12" fontWeight="bold" fill={currentApp.color}>💡 QUANTUM SPIN + OBSERVATION = DETAILED IMAGES</text>
                                    <text x="300" y="230" textAnchor="middle" fontSize="10" fill={colors.textPrimary}>Radio waves "observe" hydrogen spins → No radiation, soft tissue visibility!</text>

                                    {/* Bottom fact */}
                                    <rect x="20" y="250" width="560" height="55" rx="8" fill={colors.bgCard} stroke={colors.border} />
                                    <text x="300" y="272" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colors.textPrimary}>🏥 MRI scans 40+ million patients/year worldwide</text>
                                    <text x="300" y="290" textAnchor="middle" fontSize="10" fill={colors.textMuted}>Detects tumors, injuries, brain activity - all using quantum spin observation</text>
                                 </g>
                              )}
                           </svg>
                        </div>
                     </div>

                  {/* Content grid */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                     {/* Connection to Double-Slit */}
                     <div className="p-4 rounded-xl" style={{ background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-lg">🔗</span>
                           <p className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>Double-Slit Connection</p>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{currentApp.connection}</p>
                     </div>

                     {/* How it works */}
                     <div className="p-4 rounded-xl" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-lg">⚙️</span>
                           <p className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>How It Works</p>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{currentApp.howItWorks}</p>
                     </div>
                  </div>

                  {/* Real-world applications */}
                  <div className="p-4 rounded-xl mb-4" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.textMuted }}>Real-World Applications</p>
                     <div className="grid sm:grid-cols-2 gap-2">
                        {currentApp.examples.map((ex, i) => (
                           <div key={i} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: colors.bgCardLight }}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${currentApp.color}30` }}>
                                 <span className="text-xs font-bold" style={{ color: currentApp.color }}>{i + 1}</span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{ex}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Bottom row: Companies + Future */}
                  <div className="grid md:grid-cols-2 gap-4">
                     {/* Industry leaders */}
                     <div className="p-4 rounded-xl" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.textMuted }}>Industry Leaders</p>
                        <div className="flex flex-wrap gap-2">
                           {currentApp.companies.map((company, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: `${currentApp.color}15`, color: currentApp.color, border: `1px solid ${currentApp.color}30` }}>
                                 {company}
                              </span>
                           ))}
                        </div>
                     </div>

                     {/* Future impact */}
                     <div className="p-4 rounded-xl" style={{ background: `linear-gradient(135deg, ${currentApp.color}15 0%, ${colors.accent}10 100%)`, border: `1px solid ${currentApp.color}30` }}>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-lg">🚀</span>
                           <p className="text-xs font-bold uppercase tracking-wider" style={{ color: currentApp.color }}>Future Impact</p>
                        </div>
                        <p className="text-sm leading-relaxed font-medium" style={{ color: colors.textPrimary }}>{currentApp.futureImpact}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Fixed bottom action bar with CTA */}
            <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               padding: '12px 16px',
               borderTop: `1px solid ${colors.border}`,
               backgroundColor: colors.bgCard,
               gap: '12px'
            }}>
               <button
                  style={{
                     padding: '10px 16px',
                     borderRadius: '10px',
                     fontWeight: 600,
                     fontSize: '13px',
                     backgroundColor: colors.bgCardLight,
                     color: colors.textSecondary,
                     border: 'none',
                     cursor: 'pointer',
                     flexShrink: 0
                  }}
                  onMouseDown={() => goToPhase('twist_review')}
               >
                  ← Back
               </button>

               {/* Center: Current app action */}
               {!isCurrentCompleted ? (
                  <button
                     onMouseDown={handleCompleteApp}
                     className="flex-1 max-w-md transition-all hover:scale-[1.02]"
                     style={{
                        padding: '12px 20px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`,
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 20px ${currentApp.color}40`
                     }}
                  >
                     {selectedApp < 3 ? `✓ Complete & Continue →` : '✓ Complete Final Topic'}
                  </button>
               ) : (
                  <div className="flex-1 max-w-md text-center">
                     <span className="text-sm font-bold" style={{ color: colors.success }}>✓ {currentApp.title} completed!</span>
                  </div>
               )}

               {/* Right: Test button */}
               <button
                  style={{
                     padding: '12px 24px',
                     borderRadius: '10px',
                     fontWeight: 700,
                     fontSize: '14px',
                     background: allCompleted ? `linear-gradient(135deg, ${colors.warning} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                     color: allCompleted ? colors.textPrimary : colors.textMuted,
                     border: 'none',
                     cursor: allCompleted ? 'pointer' : 'not-allowed',
                     opacity: allCompleted ? 1 : 0.5,
                     boxShadow: allCompleted ? `0 4px 20px ${colors.warning}40` : 'none',
                     flexShrink: 0
                  }}
                  onMouseDown={() => allCompleted && goToPhase('test')}
               >
                  {allCompleted ? 'Take Test →' : `${completedCount}/4`}
               </button>
            </div>
         </div>
         </PremiumWrapper>
      );
   }

   // TEST Screen
   if (phase === 'test') {
      const currentQ = testQuestions[testQuestion];

      if (testSubmitted) {
         const score = calculateTestScore();
         const totalQuestions = testQuestions.length;
         const passed = score >= Math.ceil(totalQuestions * 0.7); // 70% to pass

         return (
            <PremiumWrapper>
            <div className="flex flex-col h-full overflow-hidden">
               <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
                  <div className="w-full max-w-2xl">
                     {/* Score Summary */}
                     <div className="text-center mb-6">
                        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl" style={{ background: passed ? `${colors.success}20` : `${colors.warning}20`, border: `3px solid ${passed ? colors.success : colors.warning}` }}>
                           {score === totalQuestions ? '🏆' : score >= Math.ceil(totalQuestions * 0.9) ? '🌟' : score >= Math.ceil(totalQuestions * 0.7) ? '👍' : '📚'}
                        </div>
                        <h2 className="text-2xl font-black mb-1" style={{ color: colors.textPrimary }}>{score}/{totalQuestions} Correct</h2>
                        <p className="text-sm mb-4" style={{ color: passed ? colors.success : colors.warning }}>
                           {score === totalQuestions ? "Perfect! You've mastered quantum duality!" : score >= Math.ceil(totalQuestions * 0.9) ? 'Excellent! You deeply understand quantum concepts.' : score >= Math.ceil(totalQuestions * 0.7) ? 'Great job! You understand the key concepts.' : 'Keep exploring — quantum mechanics takes time!'}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center mb-6">
                           <button
                              onMouseDown={() => { setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); }}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
                              style={{ background: colors.bgCard, color: colors.textSecondary, border: `1px solid ${colors.border}` }}
                           >
                              <span>🔄</span> Retake Test
                           </button>
                           <button
                              onMouseDown={() => goToPhase('mastery')}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
                              style={{ background: passed ? colors.success : colors.warning, color: 'white' }}
                           >
                              <span>{passed ? '🎓' : '📖'}</span> {passed ? 'Claim Mastery' : 'Review Lesson'}
                           </button>
                        </div>
                     </div>

                     {/* Question-by-Question Review */}
                     <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>📋 Question-by-Question Review</p>
                     </div>

                     <div className="space-y-4">
                        {testQuestions.map((q, i) => {
                           const correctOption = q.options.find(o => o.correct);
                           const correctId = correctOption?.id;
                           const userAnswer = testAnswers[i];
                           const userOption = q.options.find(o => o.id === userAnswer);
                           const isCorrect = userAnswer === correctId;

                           return (
                              <div key={i} className="rounded-2xl overflow-hidden" style={{ background: colors.bgCard, border: `2px solid ${isCorrect ? colors.success : colors.danger}40` }}>
                                 {/* Question Header */}
                                 <div className="p-4" style={{ background: isCorrect ? `${colors.success}15` : `${colors.danger}15` }}>
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: isCorrect ? colors.success : colors.danger, color: 'white' }}>
                                          {isCorrect ? '✓' : '✗'}
                                       </div>
                                       <div className="flex-1">
                                          <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>Question {i + 1}</p>
                                          <p className="text-xs" style={{ color: colors.textMuted }}>{q.question}</p>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Your Answer vs Correct Answer */}
                                 <div className="p-4 space-y-3">
                                    {/* Your Answer */}
                                    <div className="p-3 rounded-xl" style={{ background: isCorrect ? `${colors.success}10` : `${colors.danger}10`, border: `1px solid ${isCorrect ? colors.success : colors.danger}30` }}>
                                       <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: isCorrect ? colors.success : colors.danger }}>
                                          {isCorrect ? '✓ Your Answer (Correct!)' : '✗ Your Answer'}
                                       </p>
                                       <p className="text-sm" style={{ color: colors.textPrimary }}>{userOption?.label || 'No answer selected'}</p>
                                    </div>

                                    {/* Correct Answer - only show if wrong */}
                                    {!isCorrect && (
                                       <div className="p-3 rounded-xl" style={{ background: `${colors.success}10`, border: `1px solid ${colors.success}30` }}>
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: colors.success }}>✓ Correct Answer</p>
                                          <p className="text-sm" style={{ color: colors.textPrimary }}>{correctOption?.label}</p>
                                       </div>
                                    )}

                                    {/* Explanation - Why */}
                                    <div className="p-3 rounded-xl" style={{ background: colors.bgCardLight }}>
                                       <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: colors.accent }}>💡 Why?</p>
                                       <p className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{q.explanation}</p>

                                       {/* Gap Analysis - only show if wrong */}
                                       {!isCorrect && (
                                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                                             <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: colors.warning }}>🎯 Understanding Gap</p>
                                             <p className="text-xs" style={{ color: colors.textMuted }}>
                                                {userAnswer === null ? 'You skipped this question. Take time to read each scenario carefully.' :
                                                 'Your answer focused on a different aspect. The key insight is understanding how observation/measurement fundamentally changes quantum behavior.'}
                                             </p>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>

                     {/* Bottom Retake Button */}
                     <div className="mt-6 p-4 rounded-2xl text-center" style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                           {passed ? 'Want to improve your score?' : 'Review the explanations above and try again!'}
                        </p>
                        <button
                           onMouseDown={() => { setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); }}
                           className="px-6 py-3 rounded-xl font-bold text-sm"
                           style={{ background: colors.primary, color: 'white' }}
                        >
                           🔄 Retake Test
                        </button>
                     </div>
                  </div>
               </div>
            </div>
            </PremiumWrapper>
         );
      }

      const totalQuestions = testQuestions.length;
      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
               <div className="w-full max-w-2xl">
                  <div className="mb-6">
                     <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.warning }}>Step 8 • Knowledge Test</p>
                     <h2 className="text-2xl font-black mb-4" style={{ color: colors.textPrimary }}>Question {testQuestion + 1} of {totalQuestions}</h2>
                     <div className="flex gap-1">{Array.from({ length: totalQuestions }, (_, i) => (<div key={i} className="h-2 flex-1 rounded-full" style={{ background: i === testQuestion ? colors.warning : i < testQuestion ? colors.success : colors.bgCardLight }} />))}</div>
                  </div>
                  <div className="p-5 rounded-2xl mb-6" style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.primary }}>Scenario</p>
                     <p className="text-sm" style={{ color: colors.textSecondary }}>{currentQ.scenario}</p>
                  </div>
                  <p className="text-lg font-bold mb-6" style={{ color: colors.textPrimary }}>{currentQ.question}</p>
                  <div className="grid gap-3 mb-6">
                     {currentQ.options.map((opt, i) => (
                        <button key={opt.id} onMouseDown={() => {
                           const newAnswers = [...testAnswers];
                           newAnswers[testQuestion] = opt.id;
                           setTestAnswers(newAnswers);
                           // Emit event for AI coach to track progress - include actual question content
                           emitGameEvent('answer_selected', {
                              phase: 'test',
                              phaseLabel: 'Knowledge Test',
                              questionNumber: testQuestion + 1,
                              totalQuestions: totalQuestions,
                              questionScenario: currentQ.scenario,
                              questionText: currentQ.question,
                              selectedAnswer: opt.label,
                              allOptions: currentQ.options.map((o, idx) => `${String.fromCharCode(65 + idx)}: ${o.label}`).join(' | '),
                              message: `Q${testQuestion + 1}: "${currentQ.question}" - User selected: "${opt.label}"`
                           });
                        }} className="flex items-center gap-4 p-5 rounded-2xl text-left" style={{ background: testAnswers[testQuestion] === opt.id ? `${colors.warning}20` : colors.bgCard, border: `2px solid ${testAnswers[testQuestion] === opt.id ? colors.warning : colors.border}` }}>
                           <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: testAnswers[testQuestion] === opt.id ? colors.warning : colors.bgCardLight }}><span className="text-sm font-bold" style={{ color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textMuted }}>{String.fromCharCode(65 + i)}</span></div>
                           <p className="text-sm" style={{ color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            {renderBottomBar(true, !!testAnswers[testQuestion], testQuestion < totalQuestions - 1 ? `Question ${testQuestion + 2}` : 'Submit Test', () => {
               if (testQuestion < totalQuestions - 1) {
                  const nextQ = testQuestion + 1;
                  setTestQuestion(nextQ);
                  // Emit event with FULL question content so AI coach knows exactly what's on screen
                  const nextQuestion = testQuestions[nextQ];
                  emitGameEvent('question_changed', {
                     phase: 'test',
                     phaseLabel: 'Knowledge Test',
                     questionNumber: nextQ + 1,
                     totalQuestions: totalQuestions,
                     questionScenario: nextQuestion.scenario,
                     questionText: nextQuestion.question,
                     allOptions: nextQuestion.options.map((o, idx) => `${String.fromCharCode(65 + idx)}: ${o.label}`).join(' | '),
                     message: `Now on Q${nextQ + 1}: Scenario: "${nextQuestion.scenario.substring(0, 100)}..." Question: "${nextQuestion.question}"`
                  });
               } else {
                  setTestSubmitted(true);
                  // Calculate score and emit game_completed event
                  const finalScore = calculateTestScore();
                  emitGameEvent('game_completed', {
                     phase: 'test',
                     phaseLabel: 'Knowledge Test',
                     score: finalScore,
                     totalQuestions: totalQuestions,
                     percentage: Math.round((finalScore / totalQuestions) * 100),
                     passed: finalScore >= Math.ceil(totalQuestions * 0.7),
                     message: `User completed test with ${finalScore}/${totalQuestions} correct (${Math.round((finalScore / totalQuestions) * 100)}%)`
                  });
               }
            }, colors.warning)}
         </div>
         </PremiumWrapper>
      );
   }

   // MASTERY Screen
   if (phase === 'mastery') {
      const masteryItems = [
         { icon: '🌊', title: 'Wave-Particle Duality', desc: 'Particles travel as probability waves but are detected as particles' },
         { icon: '🔀', title: 'Superposition', desc: 'Quantum objects exist in multiple states simultaneously until measured' },
         { icon: '👁️', title: 'Observer Effect', desc: 'The act of measurement collapses the wave function' },
         { icon: '💻', title: 'Quantum Computing', desc: 'Exploits superposition to process information in parallel' },
         { icon: '🎲', title: 'Probabilistic Reality', desc: 'At the quantum level, we can only predict probabilities' },
      ];

      return (
         <PremiumWrapper>
         <div className="flex flex-col h-full overflow-hidden relative">
            {confetti.map((c, i) => (<div key={i} className="absolute w-3 h-3 rounded-full" style={{ left: `${c.x}%`, top: `${c.y}%`, backgroundColor: c.color, animation: `bounce ${1.5 + c.delay}s infinite` }} />))}
            <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto z-10">
               <div className="w-full max-w-2xl text-center">
                  <div className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-6xl" style={{ background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.accent}30 100%)`, border: `3px solid ${colors.primary}`, boxShadow: `0 0 60px ${colors.primary}40` }}>⚛️</div>
                  <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, #ec4899 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Quantum Explorer!</h1>
                  <p className="text-lg mb-8" style={{ color: colors.textSecondary }}>You've glimpsed the strange heart of reality. Here's what you've mastered:</p>
                  <div className="space-y-3 mb-8 text-left">
                     {masteryItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${colors.bgCard}80 0%, ${colors.bgCardLight}40 100%)`, border: `1px solid ${colors.border}` }}>
                           <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${colors.success}20` }}>{item.icon}</div>
                           <div className="flex-1"><p className="font-bold text-sm" style={{ color: colors.textPrimary }}>{item.title}</p><p className="text-xs" style={{ color: colors.textMuted }}>{item.desc}</p></div>
                           <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: colors.success }}><span className="text-white text-sm">✓</span></div>
                        </div>
                     ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     <button onMouseDown={() => { setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); setPrediction(null); setTwistPrediction(null); goToPhase('hook'); }} className="px-8 py-4 rounded-2xl font-bold" style={{ background: colors.bgCardLight, color: colors.textSecondary, border: `1px solid ${colors.border}` }}>Start Over</button>
                     <button onMouseDown={() => { setParticleHits([]); setParticleCount(0); setDetectorOn(false); goToPhase('play'); }} className="px-8 py-4 rounded-2xl font-bold" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: colors.textPrimary, boxShadow: `0 8px 32px ${colors.primary}40` }}>Free Exploration Mode</button>
                  </div>
               </div>
            </div>
            {renderBottomBar(true, false, "Complete!", undefined, colors.success)}
         </div>
         </PremiumWrapper>
      );
   }

   return null;
};

export default WaveParticleDualityRenderer;
