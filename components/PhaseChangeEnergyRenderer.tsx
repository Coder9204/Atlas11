import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- GAME EVENT INTERFACE ---
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

interface PhaseChangeEnergyRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
   try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + s.duration);
   } catch (e) {}
};

const PhaseChangeEnergyRenderer: React.FC<PhaseChangeEnergyRendererProps> = ({ onGameEvent, gamePhase }) => {
   type PCPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: PCPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   const getInitialPhase = (): PCPhase => {
      if (gamePhase && validPhases.includes(gamePhase as PCPhase)) {
         return gamePhase as PCPhase;
      }
      return 'hook';
   };

   const [phase, setPhase] = useState<PCPhase>(getInitialPhase);

   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as PCPhase) && gamePhase !== phase) {
         setPhase(gamePhase as PCPhase);
      }
   }, [gamePhase]);

   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [time, setTime] = useState(0);

   // Heating simulation state
   const [temperature, setTemperature] = useState(-20); // Start at -20°C
   const [energyAdded, setEnergyAdded] = useState(0);
   const [matterPhase, setMatterPhase] = useState<'solid' | 'melting' | 'liquid' | 'boiling' | 'gas'>('solid');
   const [isHeating, setIsHeating] = useState(false);
   const [moleculePositions, setMoleculePositions] = useState<Array<{x: number, y: number, vx: number, vy: number}>>([]);

   // Twist: Cooling simulation
   const [coolingTemp, setCoolingTemp] = useState(120);
   const [coolingPhase, setCoolingPhase] = useState<'gas' | 'condensing' | 'liquid' | 'freezing' | 'solid'>('gas');
   const [isCooling, setIsCooling] = useState(false);

   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);
   const [selectedApp, setSelectedApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   const emitGameEvent = useCallback((
      eventType: GameEvent['eventType'],
      details: GameEvent['details']
   ) => {
      if (onGameEvent) {
         onGameEvent({
            eventType,
            gameType: 'phase_change_energy',
            gameTitle: 'Phase Change Energy',
            details,
            timestamp: Date.now()
         });
      }
   }, [onGameEvent]);

   const phaseOrder: PCPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const phaseLabels: Record<PCPhase, string> = {
      hook: 'Introduction',
      predict: 'Predict',
      play: 'Experiment',
      review: 'Understanding',
      twist_predict: 'New Variable',
      twist_play: 'Cooling Down',
      twist_review: 'Deep Insight',
      transfer: 'Real World',
      test: 'Knowledge Test',
      mastery: 'Mastery'
   };

   const isNavigating = useRef(false);
   const lastClickRef = useRef(0);

   const goToPhase = useCallback((p: PCPhase) => {
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;
      if (isNavigating.current) return;
      isNavigating.current = true;

      setPhase(p);
      if (p === 'play') {
         setTemperature(-20);
         setEnergyAdded(0);
         setMatterPhase('solid');
         setIsHeating(false);
      }
      if (p === 'twist_play') {
         setCoolingTemp(120);
         setCoolingPhase('gas');
         setIsCooling(false);
      }
      playSound('transition');

      const idx = phaseOrder.indexOf(p);
      emitGameEvent('phase_changed', {
         phase: p,
         phaseLabel: phaseLabels[p],
         currentScreen: idx + 1,
         totalScreens: phaseOrder.length,
         message: `Entered phase: ${phaseLabels[p]}`
      });

      setTimeout(() => { isNavigating.current = false; }, 400);
   }, [emitGameEvent, phaseLabels, phaseOrder]);

   const colors = {
      primary: '#3b82f6', // blue
      primaryDark: '#2563eb',
      accent: '#8b5cf6', // violet
      secondary: '#06b6d4', // cyan
      warning: '#f59e0b',
      success: '#10b981',
      danger: '#ef4444',
      bgDark: '#020617',
      bgCard: '#0f172a',
      bgCardLight: '#1e293b',
      border: '#334155',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
   };

   // Latent heat values for water (simplified)
   const LATENT_FUSION = 334; // J/g
   const LATENT_VAPORIZATION = 2260; // J/g
   const SPECIFIC_HEAT_ICE = 2.09; // J/g·°C
   const SPECIFIC_HEAT_WATER = 4.18; // J/g·°C
   const SPECIFIC_HEAT_STEAM = 2.01; // J/g·°C

   // Initialize molecules
   useEffect(() => {
      const molecules = Array.from({ length: 25 }, () => ({
         x: Math.random() * 200 + 50,
         y: Math.random() * 150 + 25,
         vx: 0,
         vy: 0
      }));
      setMoleculePositions(molecules);
   }, []);

   // Heating simulation
   useEffect(() => {
      if (phase === 'play' && isHeating) {
         const interval = setInterval(() => {
            setEnergyAdded(prev => {
               const newEnergy = prev + 5;

               // Calculate temperature based on phase
               if (newEnergy < 42) {
                  // Heating ice: -20 to 0°C
                  setMatterPhase('solid');
                  setTemperature(-20 + (newEnergy / 42) * 20);
               } else if (newEnergy < 42 + 334) {
                  // Melting at 0°C (latent heat of fusion)
                  setMatterPhase('melting');
                  setTemperature(0);
               } else if (newEnergy < 42 + 334 + 418) {
                  // Heating water: 0 to 100°C
                  setMatterPhase('liquid');
                  setTemperature(((newEnergy - 42 - 334) / 418) * 100);
               } else if (newEnergy < 42 + 334 + 418 + 2260) {
                  // Boiling at 100°C (latent heat of vaporization)
                  setMatterPhase('boiling');
                  setTemperature(100);
               } else {
                  // Steam above 100°C
                  setMatterPhase('gas');
                  setTemperature(100 + ((newEnergy - 42 - 334 - 418 - 2260) / 40) * 20);
                  if (newEnergy > 3200) setIsHeating(false);
               }

               return newEnergy;
            });
         }, 50);
         return () => clearInterval(interval);
      }
   }, [phase, isHeating]);

   // Cooling simulation
   useEffect(() => {
      if (phase === 'twist_play' && isCooling) {
         const interval = setInterval(() => {
            setCoolingTemp(prev => {
               const newTemp = prev - 0.5;

               if (newTemp > 100) {
                  setCoolingPhase('gas');
               } else if (newTemp > 99 && newTemp <= 100) {
                  setCoolingPhase('condensing');
                  return 100; // Hold at 100°C during condensation
               } else if (newTemp > 0) {
                  setCoolingPhase('liquid');
               } else if (newTemp > -1 && newTemp <= 0) {
                  setCoolingPhase('freezing');
                  return 0; // Hold at 0°C during freezing
               } else {
                  setCoolingPhase('solid');
                  if (newTemp < -20) setIsCooling(false);
               }

               return Math.max(-25, newTemp);
            });
         }, 100);
         return () => clearInterval(interval);
      }
   }, [phase, isCooling]);

   // Update molecule animation based on phase
   useEffect(() => {
      const interval = setInterval(() => {
         setMoleculePositions(prev => {
            return prev.map(mol => {
               let newVx = mol.vx;
               let newVy = mol.vy;
               let newX = mol.x;
               let newY = mol.y;

               const vibrationStrength = matterPhase === 'solid' ? 0.5 :
                  matterPhase === 'melting' ? 2 :
                  matterPhase === 'liquid' ? 3 :
                  matterPhase === 'boiling' ? 6 : 10;

               if (matterPhase === 'solid' || matterPhase === 'melting') {
                  // Vibration in place
                  newVx = (Math.random() - 0.5) * vibrationStrength;
                  newVy = (Math.random() - 0.5) * vibrationStrength;
               } else {
                  // Free movement
                  newVx += (Math.random() - 0.5) * vibrationStrength * 0.5;
                  newVy += (Math.random() - 0.5) * vibrationStrength * 0.5;
                  newVx *= 0.98;
                  newVy *= 0.98;
               }

               newX += newVx;
               newY += newVy;

               // Bounds
               if (matterPhase === 'gas') {
                  if (newX < 20 || newX > 280) newVx *= -1;
                  if (newY < 10 || newY > 180) newVy *= -1;
               } else {
                  if (newX < 50 || newX > 250) { newVx *= -1; newX = Math.max(50, Math.min(250, newX)); }
                  if (newY < 50 || newY > 170) { newVy *= -1; newY = Math.max(50, Math.min(170, newY)); }
               }

               return { x: newX, y: newY, vx: newVx, vy: newVy };
            });
         });
      }, 50);
      return () => clearInterval(interval);
   }, [matterPhase]);

   // Animation loop
   useEffect(() => {
      const interval = setInterval(() => setTime(t => t + 0.02), 30);
      return () => clearInterval(interval);
   }, []);

   // Initial event
   useEffect(() => {
      const timer = setTimeout(() => {
         emitGameEvent('game_started', {
            phase: 'hook',
            phaseLabel: 'Introduction',
            currentScreen: 1,
            totalScreens: phaseOrder.length,
            message: 'Phase Change Energy lesson started'
         });
      }, 100);
      return () => clearTimeout(timer);
   }, []);

   // Confetti for mastery
   useEffect(() => {
      if (phase === 'mastery') {
         const confettiColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
         setConfetti(Array.from({ length: 60 }, (_, i) => ({
            x: Math.random() * 100, y: Math.random() * 100,
            color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
         })));
      }
   }, [phase]);

   // Helper functions
   const renderProgressBar = () => {
      const currentIdx = phaseOrder.indexOf(phase);
      return (
         <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)'
         }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>
               Phase Changes
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               {phaseOrder.map((p, i) => (
                  <button
                     key={p}
                     onMouseDown={() => goToPhase(p)}
                     style={{
                        height: 8,
                        width: i === currentIdx ? 24 : 8,
                        borderRadius: 9999,
                        border: 'none',
                        cursor: 'pointer',
                        background: i === currentIdx
                           ? colors.primary
                           : i < currentIdx
                              ? colors.success
                              : colors.border,
                        boxShadow: i === currentIdx ? `0 0 12px ${colors.primary}40` : 'none',
                        transition: 'all 0.3s ease'
                     }}
                  />
               ))}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: colors.primary }}>
               {phaseLabels[phase]}
            </span>
         </div>
      );
   };

   const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => {
      const currentIdx = phaseOrder.indexOf(phase);
      const buttonColor = accentColor || colors.primary;
      const clickedRef = useRef(false);

      return (
         <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard
         }}>
            <button
               style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  backgroundColor: colors.bgCardLight,
                  color: colors.textSecondary,
                  border: 'none',
                  cursor: canGoBack && currentIdx > 0 ? 'pointer' : 'not-allowed',
                  opacity: canGoBack && currentIdx > 0 ? 1 : 0.3
               }}
               onMouseDown={() => canGoBack && currentIdx > 0 && goToPhase(phaseOrder[currentIdx - 1])}
            >
               ← Back
            </button>

            <button
               style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  background: canGoNext ? `linear-gradient(135deg, ${buttonColor} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                  color: colors.textPrimary,
                  border: 'none',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  opacity: canGoNext ? 1 : 0.3,
                  boxShadow: canGoNext ? `0 4px 20px ${buttonColor}40` : 'none'
               }}
               onMouseDown={() => {
                  if (!canGoNext || clickedRef.current) return;
                  clickedRef.current = true;
                  if (onNext) onNext();
                  else if (currentIdx < phaseOrder.length - 1) goToPhase(phaseOrder[currentIdx + 1]);
                  setTimeout(() => { clickedRef.current = false; }, 400);
               }}
            >
               {nextLabel} →
            </button>
         </div>
      );
   };

   const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
      <div style={{ marginBottom: '24px' }}>
         <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>{phaseName}</p>
         <h2 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary }}>{title}</h2>
         {subtitle && <p style={{ fontSize: '14px', marginTop: '8px', color: colors.textSecondary }}>{subtitle}</p>}
      </div>
   );

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

   // Phase change visualization
   const renderPhaseChangeViz = () => {
      const getMoleculeColor = () => {
         if (matterPhase === 'solid') return colors.secondary;
         if (matterPhase === 'melting') return '#22d3ee';
         if (matterPhase === 'liquid') return colors.primary;
         if (matterPhase === 'boiling') return '#a855f7';
         return '#f472b6';
      };

      return (
         <svg viewBox="0 0 300 200" style={{ width: '100%', height: '100%' }}>
            <defs>
               <linearGradient id="pcFlame" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#fef08a" />
               </linearGradient>
               <filter id="pcGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="glow" />
                  <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>
            </defs>

            {/* Background */}
            <rect width="300" height="200" fill={colors.bgDark} />

            {/* Container */}
            <rect x="40" y="20" width="220" height="160" rx="10" fill={colors.bgCard} stroke={colors.border} strokeWidth="2" />

            {/* Liquid level indicator */}
            {(matterPhase === 'liquid' || matterPhase === 'boiling') && (
               <rect x="45" y="100" width="210" height="75" rx="5" fill={colors.primary} opacity="0.2" />
            )}

            {/* Molecules */}
            {moleculePositions.map((mol, i) => (
               <circle
                  key={i}
                  cx={mol.x}
                  cy={mol.y}
                  r={matterPhase === 'gas' ? 5 : 6}
                  fill={getMoleculeColor()}
                  opacity={0.9}
                  filter="url(#pcGlow)"
               />
            ))}

            {/* Bubbles when boiling */}
            {matterPhase === 'boiling' && (
               <g>
                  {[0, 1, 2, 3, 4].map(i => (
                     <circle
                        key={i}
                        cx={80 + i * 40}
                        r="8"
                        fill={colors.accent}
                        opacity="0.3"
                     >
                        <animate
                           attributeName="cy"
                           values="170;40;170"
                           dur={`${1.5 + i * 0.3}s`}
                           repeatCount="indefinite"
                        />
                        <animate
                           attributeName="r"
                           values="4;10;4"
                           dur={`${1.5 + i * 0.3}s`}
                           repeatCount="indefinite"
                        />
                     </circle>
                  ))}
               </g>
            )}

            {/* Heat source */}
            {isHeating && (
               <g transform="translate(150, 185)">
                  <ellipse cx="0" cy="0" rx="60" ry="15" fill="url(#pcFlame)" opacity="0.9">
                     <animate attributeName="ry" values="12;18;12" dur="0.3s" repeatCount="indefinite" />
                  </ellipse>
               </g>
            )}
         </svg>
      );
   };

   // Heating curve visualization
   const renderHeatingCurve = () => {
      const maxEnergy = 3100;
      const progress = Math.min(1, energyAdded / maxEnergy);

      return (
         <svg viewBox="0 0 350 180" style={{ width: '100%', height: '100%' }}>
            {/* Background */}
            <rect width="350" height="180" fill={colors.bgDark} />

            {/* Grid */}
            <g stroke={colors.border} strokeWidth="0.5" opacity="0.3">
               {[0, 1, 2, 3, 4].map(i => (
                  <line key={`h${i}`} x1="50" y1={20 + i * 35} x2="330" y2={20 + i * 35} />
               ))}
               {[0, 1, 2, 3, 4, 5, 6].map(i => (
                  <line key={`v${i}`} x1={50 + i * 46.67} y1="20" x2={50 + i * 46.67} y2="160" />
               ))}
            </g>

            {/* Axes */}
            <line x1="50" y1="160" x2="330" y2="160" stroke={colors.textMuted} strokeWidth="2" />
            <line x1="50" y1="20" x2="50" y2="160" stroke={colors.textMuted} strokeWidth="2" />

            {/* Labels */}
            <text x="190" y="175" textAnchor="middle" fontSize="10" fill={colors.textMuted}>Energy Added (J/g)</text>
            <text x="20" y="90" textAnchor="middle" fontSize="10" fill={colors.textMuted} transform="rotate(-90, 20, 90)">Temperature (°C)</text>

            {/* Temperature scale */}
            <text x="45" y="160" textAnchor="end" fontSize="8" fill={colors.textMuted}>-20</text>
            <text x="45" y="125" textAnchor="end" fontSize="8" fill={colors.textMuted}>0</text>
            <text x="45" y="55" textAnchor="end" fontSize="8" fill={colors.textMuted}>100</text>

            {/* Ideal heating curve (background) */}
            <path
               d={`M 50 160 L 75 125 L 155 125 L 195 55 L 305 55 L 330 35`}
               fill="none"
               stroke={colors.textMuted}
               strokeWidth="1"
               strokeDasharray="4 2"
               opacity="0.3"
            />

            {/* Phase labels */}
            <text x="62" y="145" fontSize="7" fill={colors.secondary}>Ice</text>
            <text x="100" y="115" fontSize="7" fill={colors.secondary}>Melting</text>
            <text x="170" y="85" fontSize="7" fill={colors.primary}>Water</text>
            <text x="245" y="45" fontSize="7" fill={colors.accent}>Boiling</text>

            {/* Current progress curve */}
            <path
               d={(() => {
                  const e = energyAdded;
                  let path = 'M 50 160';

                  // Ice heating (-20 to 0)
                  if (e > 0) {
                     const iceEnd = Math.min(e, 42);
                     const x = 50 + (iceEnd / 42) * 25;
                     const y = 160 - (iceEnd / 42) * 35;
                     path += ` L ${x} ${y}`;
                  }

                  // Melting (0°C plateau)
                  if (e > 42) {
                     const meltEnd = Math.min(e - 42, 334);
                     const x = 75 + (meltEnd / 334) * 80;
                     path += ` L ${x} 125`;
                  }

                  // Water heating (0 to 100)
                  if (e > 376) {
                     const waterEnd = Math.min(e - 376, 418);
                     const x = 155 + (waterEnd / 418) * 40;
                     const y = 125 - (waterEnd / 418) * 70;
                     path += ` L ${x} ${y}`;
                  }

                  // Boiling (100°C plateau)
                  if (e > 794) {
                     const boilEnd = Math.min(e - 794, 2260);
                     const x = 195 + (boilEnd / 2260) * 110;
                     path += ` L ${x} 55`;
                  }

                  // Steam heating
                  if (e > 3054) {
                     const steamEnd = Math.min(e - 3054, 100);
                     const x = 305 + (steamEnd / 100) * 25;
                     const y = 55 - (steamEnd / 100) * 20;
                     path += ` L ${x} ${y}`;
                  }

                  return path;
               })()}
               fill="none"
               stroke={colors.primary}
               strokeWidth="3"
               strokeLinecap="round"
            />

            {/* Current position marker */}
            {energyAdded > 0 && (
               <circle
                  cx={(() => {
                     const e = energyAdded;
                     if (e <= 42) return 50 + (e / 42) * 25;
                     if (e <= 376) return 75 + ((e - 42) / 334) * 80;
                     if (e <= 794) return 155 + ((e - 376) / 418) * 40;
                     if (e <= 3054) return 195 + ((e - 794) / 2260) * 110;
                     return 305 + ((e - 3054) / 100) * 25;
                  })()}
                  cy={(() => {
                     if (temperature < 0) return 160 - ((temperature + 20) / 20) * 35;
                     if (temperature === 0) return 125;
                     if (temperature > 0 && temperature < 100) return 125 - (temperature / 100) * 70;
                     if (temperature === 100) return 55;
                     return 55 - ((temperature - 100) / 20) * 20;
                  })()}
                  r="6"
                  fill={colors.danger}
                  stroke={colors.textPrimary}
                  strokeWidth="2"
               />
            )}

            {/* Latent heat annotations */}
            <rect x="90" y="127" width="50" height="15" rx="3" fill={colors.secondary} opacity="0.3" />
            <text x="115" y="137" textAnchor="middle" fontSize="7" fill={colors.secondary}>Lf = 334 J/g</text>

            <rect x="230" y="57" width="55" height="15" rx="3" fill={colors.accent} opacity="0.3" />
            <text x="257" y="67" textAnchor="middle" fontSize="7" fill={colors.accent}>Lv = 2260 J/g</text>
         </svg>
      );
   };

   // Test questions
   const testQuestions = [
      {
         scenario: "You put an ice cube at exactly 0°C into a drink at room temperature. The ice starts melting.",
         question: "During the entire melting process, what happens to the ice's temperature?",
         options: [
            { id: 'increases', label: "It gradually increases from 0°C toward room temperature" },
            { id: 'stays', label: "It stays at exactly 0°C until all the ice has melted", correct: true },
            { id: 'fluctuates', label: "It fluctuates as heat is absorbed and released" },
            { id: 'decreases', label: "It decreases below 0°C due to evaporative cooling" }
         ],
         explanation: "During a phase change, temperature remains constant! All absorbed energy goes into breaking molecular bonds (latent heat), not increasing kinetic energy (temperature). The ice stays at 0°C until completely melted."
      },
      {
         scenario: "Water requires 334 J/g to melt (Lf) and only 4.18 J/g to raise its temperature by 1°C (c).",
         question: "How much energy does it take to melt 100g of ice at 0°C compared to heating 100g of water from 0°C to 80°C?",
         options: [
            { id: 'less', label: "Melting requires less energy (about half)" },
            { id: 'same', label: "They require approximately the same energy" },
            { id: 'more', label: "Melting requires about the same energy as heating 80°C", correct: true },
            { id: 'much_more', label: "Melting requires 10× more energy" }
         ],
         explanation: "Melting: Q = mLf = 100g × 334 J/g = 33,400 J. Heating water: Q = mcΔT = 100g × 4.18 J/g·°C × 80°C = 33,440 J. Nearly identical! This is why ice is so effective at cooling — it absorbs huge energy without temperature change."
      },
      {
         scenario: "A pot of water is boiling vigorously on a stove at sea level. You turn the heat up even higher.",
         question: "What happens to the water's temperature and the rate of boiling?",
         options: [
            { id: 'both_increase', label: "Both temperature and boiling rate increase" },
            { id: 'temp_increases', label: "Temperature increases but boiling rate stays the same" },
            { id: 'rate_increases', label: "Temperature stays at 100°C but boiling rate increases", correct: true },
            { id: 'neither', label: "Neither changes — there's a maximum boiling rate" }
         ],
         explanation: "At sea level, water cannot exceed 100°C while boiling — extra energy goes into the phase change (vaporization), not temperature increase. More heat = faster evaporation rate, but same temperature. This is why pressure cookers work — higher pressure raises the boiling point."
      },
      {
         scenario: "Water's latent heat of vaporization (2260 J/g) is about 7× higher than its latent heat of fusion (334 J/g).",
         question: "Why does vaporization require so much more energy than melting?",
         options: [
            { id: 'temperature', label: "Because boiling occurs at a higher temperature" },
            { id: 'bonds', label: "Vaporization must completely separate molecules that melting only loosens", correct: true },
            { id: 'volume', label: "Because gas takes up more volume than liquid" },
            { id: 'pressure', label: "Because of atmospheric pressure pushing down on the liquid" }
         ],
         explanation: "Melting only loosens the rigid crystal structure — molecules still touch and attract each other. Vaporization must completely overcome ALL intermolecular attractions to let molecules fly free. This requires much more energy to break all those bonds."
      },
      {
         scenario: "On a hot day, you're sweating. As sweat evaporates from your skin, you feel cooler.",
         question: "Explain the physics of why evaporation cools you down.",
         options: [
            { id: 'water_cold', label: "Sweat is colder than your body temperature" },
            { id: 'latent', label: "Evaporation requires latent heat, which is drawn from your skin", correct: true },
            { id: 'wind', label: "Air movement from evaporation creates a cooling breeze" },
            { id: 'reflection', label: "Water on skin reflects heat radiation" }
         ],
         explanation: "Evaporation requires latent heat (2260 J/g for water). This energy is drawn from the highest-energy molecules on your skin's surface. When they evaporate, your skin loses that energy and cools down. This is why humid days feel hotter — less evaporation occurs!"
      },
      {
         scenario: "A refrigerator uses a refrigerant that evaporates inside the fridge (absorbing heat) and condenses outside (releasing heat).",
         question: "How does this phase-change cycle move heat from a cold space to a warm space?",
         options: [
            { id: 'pressure', label: "Compressing gas raises its temperature above room temperature, allowing heat release", correct: true },
            { id: 'conduction', label: "Direct heat conduction through metal pipes" },
            { id: 'convection', label: "Fans blow hot air out of the fridge" },
            { id: 'chemical', label: "Chemical reactions generate and absorb heat" }
         ],
         explanation: "The refrigerant evaporates at low pressure (inside fridge) where its boiling point is below fridge temperature, absorbing heat. It's then compressed, raising both pressure and temperature above room temperature. Now it can condense outside, releasing that absorbed heat. Phase changes enable 'heat pumping'!"
      },
      {
         scenario: "You're making ice cream by mixing cream with salt and ice. The ice-salt mixture gets much colder than 0°C.",
         question: "Why does adding salt to ice lower the temperature below freezing?",
         options: [
            { id: 'chemical', label: "Salt reacts with ice in an endothermic reaction" },
            { id: 'dissolving', label: "Salt dissolving absorbs heat and lowers the melting point, causing more melting which absorbs more heat", correct: true },
            { id: 'insulation', label: "Salt acts as an insulator, preventing heat from entering" },
            { id: 'conduction', label: "Salt increases thermal conductivity of the mixture" }
         ],
         explanation: "Salt lowers ice's melting point (colligative property). At 0°C, salty ice wants to melt — but melting requires latent heat. This heat is drawn from the surroundings, cooling everything down. The more salt, the lower the equilibrium temperature (down to about -21°C)."
      },
      {
         scenario: "Clouds form when water vapor in rising air condenses into tiny droplets. This releases latent heat.",
         question: "How does the release of latent heat affect cloud formation and weather?",
         options: [
            { id: 'stops', label: "It stops cloud formation by warming the air" },
            { id: 'enhances', label: "Released heat makes air more buoyant, causing it to rise faster and condense more", correct: true },
            { id: 'neutral', label: "It has no significant effect on weather" },
            { id: 'cools', label: "It cools the surrounding air, creating downdrafts" }
         ],
         explanation: "When water vapor condenses, it releases latent heat (2260 J/g). This warms the air, making it less dense and more buoyant. The warmer air rises faster, cools, and more vapor condenses — a positive feedback loop! This is why thunderstorms can grow so powerful so quickly."
      },
      {
         scenario: "In the heating curve for water, there are two flat 'plateaus' where temperature doesn't increase despite continuous heating.",
         question: "What is physically happening during these plateaus?",
         options: [
            { id: 'equilibrium', label: "The system is in thermal equilibrium with surroundings" },
            { id: 'phase_change', label: "Energy breaks molecular bonds (phase change) instead of increasing kinetic energy", correct: true },
            { id: 'saturated', label: "The substance has reached its maximum heat capacity" },
            { id: 'heat_loss', label: "Heat is being lost to the environment at the same rate it's added" }
         ],
         explanation: "During phase changes, added energy goes entirely into breaking intermolecular bonds (potential energy), not increasing molecular speed (kinetic energy/temperature). The first plateau is melting (breaking crystal lattice), the second is boiling (separating liquid molecules completely)."
      },
      {
         scenario: "Consider the complete energy budget to convert 1g of ice at -20°C to steam at 120°C.",
         question: "Which statement correctly orders the energy requirements from smallest to largest?",
         options: [
            { id: 'wrong1', label: "Heating ice < Melting < Heating water < Boiling < Heating steam" },
            { id: 'wrong2', label: "Heating steam < Heating ice < Melting < Heating water < Boiling" },
            { id: 'correct', label: "Heating ice ≈ Heating steam < Melting << Heating water < Boiling", correct: true },
            { id: 'wrong3', label: "All stages require approximately equal energy" }
         ],
         explanation: "Ice to 0°C: 42 J. Melting: 334 J. Water to 100°C: 418 J. Boiling: 2260 J. Steam to 120°C: 40 J. The phase changes (especially boiling) dominate! Boiling alone requires 5× more energy than heating water and 54× more than heating the steam."
      }
   ];

   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   // HOOK Screen
   if (phase === 'hook') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            background: '#0a0f1a',
            position: 'relative',
            overflow: 'hidden'
         }}>
            {/* Premium background glow circles */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
            <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', filter: 'blur(64px)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: '25%', width: 384, height: 384, background: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(64px)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 384, height: 384, background: 'rgba(6, 182, 212, 0.03)', borderRadius: '50%', filter: 'blur(64px)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
               {renderProgressBar()}
            </div>

            <div style={{
               position: 'relative',
               zIndex: 1,
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: isMobile ? '24px 16px' : '40px 24px',
               textAlign: 'center',
               overflow: 'auto'
            }}>
               {/* Premium badge */}
               <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 9999,
                  marginBottom: 32
               }}>
                  <span style={{ width: 8, height: 8, background: '#60a5fa', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#60a5fa', letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
               </div>

               <div style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: isMobile ? '20px' : '32px',
                  boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)'
               }}>
                  <span style={{ fontSize: isMobile ? '28px' : '36px' }}>🧊</span>
               </div>

               {/* Gradient title */}
               <h1 style={{
                  fontSize: isMobile ? '28px' : '40px',
                  fontWeight: 800,
                  background: 'linear-gradient(to right, #ffffff, #93c5fd, #c4b5fd)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: isMobile ? '12px' : '16px',
                  lineHeight: 1.2
               }}>
                  Phase Changes & Latent Heat
               </h1>

               <p style={{
                  fontSize: isMobile ? '15px' : '18px',
                  color: '#94a3b8',
                  marginBottom: isMobile ? '24px' : '32px',
                  maxWidth: '480px',
                  lineHeight: 1.6
               }}>
                  Why does ice at 0°C cool your drink <span style={{ color: '#f8fafc', fontWeight: 600 }}>more effectively</span> than water at 0°C?
               </p>

               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: isMobile ? '8px' : '12px',
                  width: '100%',
                  maxWidth: '400px',
                  marginBottom: isMobile ? '24px' : '40px'
               }}>
                  {[
                     { icon: '🧊', text: 'Solid' },
                     { icon: '💧', text: 'Liquid' },
                     { icon: '💨', text: 'Gas' }
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: isMobile ? '12px 8px' : '16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid rgba(51, 65, 85, 0.5)'
                     }}>
                        <div style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '6px' }}>{item.icon}</div>
                        <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 600, color: '#94a3b8' }}>{item.text}</div>
                     </div>
                  ))}
               </div>

               <button
                  style={{
                     width: '100%',
                     maxWidth: '320px',
                     padding: isMobile ? '16px 24px' : '18px 32px',
                     fontSize: isMobile ? '15px' : '16px',
                     fontWeight: 700,
                     background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
                     minHeight: '48px'
                  }}
                  onMouseDown={() => goToPhase('predict')}
               >
                  Explore Phase Changes →
               </button>

               <p style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: '#64748b',
                  marginTop: isMobile ? '12px' : '16px'
               }}>
                  ~5 minutes • Interactive • Latent Heat
               </p>
            </div>
         </div>
      );
   }

   // PREDICT Screen
   if (phase === 'predict') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 1 • Make Your Prediction", "The Ice Cube Mystery", "What happens to temperature during melting?")}

                  <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 400 120" style={{ width: '100%', height: '120px' }}>
                        {/* Ice cube */}
                        <g transform="translate(70, 20)">
                           <rect x="0" y="0" width="60" height="60" rx="8" fill={colors.secondary} opacity="0.6" stroke={colors.secondary} strokeWidth="2" />
                           <text x="30" y="35" textAnchor="middle" fontSize="24">🧊</text>
                           <text x="30" y="90" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Ice at 0°C</text>
                        </g>

                        {/* Arrow */}
                        <text x="200" y="55" textAnchor="middle" fontSize="24" fill={colors.primary}>→</text>
                        <text x="200" y="80" textAnchor="middle" fontSize="10" fill={colors.textMuted}>+ Heat</text>

                        {/* Result with question mark */}
                        <g transform="translate(270, 20)">
                           <rect x="0" y="0" width="60" height="60" rx="8" fill={colors.bgCardLight} stroke={colors.border} strokeWidth="2" strokeDasharray="4 2" />
                           <text x="30" y="40" textAnchor="middle" fontSize="28" fill={colors.textMuted}>?</text>
                           <text x="30" y="90" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Temperature?</text>
                        </g>
                     </svg>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Setup:</strong> You heat ice at exactly 0°C. As it melts, what happens to the temperature of the ice/water mixture?
                     </p>
                  </div>

                  <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                     {[
                        { id: 'increases', label: 'Temperature rises gradually', desc: 'Heat energy should increase temperature', icon: '📈' },
                        { id: 'stays', label: 'Temperature stays at 0°C', desc: 'Temperature remains constant during melting', icon: '➡️' },
                        { id: 'fluctuates', label: 'Temperature goes up and down', desc: 'Energy is absorbed and released in cycles', icon: '📊' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'predict',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted: ${opt.label}`
                              });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              padding: '20px',
                              borderRadius: '16px',
                              textAlign: 'left',
                              background: prediction === opt.id ? `${colors.primary}20` : colors.bgCard,
                              border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           <div style={{ fontSize: '24px' }}>{opt.icon}</div>
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, marginBottom: '4px', color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</p>
                           </div>
                        </button>
                     ))}
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.warning }}>Think About It</p>
                     <p style={{ fontSize: '13px', color: colors.textMuted }}>
                        If you add heat energy to something, its temperature should increase, right? But what if the energy goes somewhere else?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!prediction, "Run the Experiment")}
         </div>
      );
   }

   // PLAY Screen - Heating simulation
   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualizations */}
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '12px' }}>
                  {/* Molecule visualization */}
                  <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderPhaseChangeViz()}
                  </div>

                  {/* Heating curve */}
                  <div style={{ height: '180px', borderRadius: '16px', overflow: 'hidden', background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderHeatingCurve()}
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '280px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none'
               }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.primary }}>Step 2 • Experiment</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>Heating Ice to Steam</h3>
                  </div>

                  {/* Current state */}
                  <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.textMuted }}>Current State</p>
                     <p style={{ fontSize: '32px', fontWeight: 800, color: colors.primary }}>{temperature.toFixed(1)}°C</p>
                     <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', color:
                        matterPhase === 'solid' ? colors.secondary :
                        matterPhase === 'melting' ? '#22d3ee' :
                        matterPhase === 'liquid' ? colors.primary :
                        matterPhase === 'boiling' ? colors.accent : '#f472b6'
                     }}>
                        {matterPhase === 'solid' ? '🧊 Solid (Ice)' :
                         matterPhase === 'melting' ? '🧊💧 Melting...' :
                         matterPhase === 'liquid' ? '💧 Liquid (Water)' :
                         matterPhase === 'boiling' ? '💧💨 Boiling...' : '💨 Gas (Steam)'}
                     </p>
                  </div>

                  {/* Energy counter */}
                  <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted }}>Energy Added</p>
                     <p style={{ fontSize: '20px', fontWeight: 800, color: colors.warning }}>{Math.round(energyAdded)} J/g</p>
                  </div>

                  {/* Heat button */}
                  <button
                     onMouseDown={() => setIsHeating(!isHeating)}
                     style={{
                        padding: '14px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: isHeating ? colors.danger : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 20px ${isHeating ? colors.danger : colors.primary}40`
                     }}
                  >
                     {isHeating ? '⏸ Pause Heating' : '🔥 Start Heating'}
                  </button>

                  {/* Reset */}
                  <button
                     onMouseDown={() => {
                        setTemperature(-20);
                        setEnergyAdded(0);
                        setMatterPhase('solid');
                        setIsHeating(false);
                     }}
                     style={{
                        padding: '12px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: colors.bgCardLight,
                        color: colors.textSecondary,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer'
                     }}
                  >
                     🔄 Reset
                  </button>

                  {/* Insight */}
                  {(matterPhase === 'melting' || matterPhase === 'boiling') && (
                     <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.warning}15`, border: `1px solid ${colors.warning}30` }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.warning }}>Notice!</p>
                        <p style={{ fontSize: '11px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Temperature is <strong style={{ color: colors.textPrimary }}>constant</strong> during phase change!
                           All energy goes into breaking molecular bonds.
                        </p>
                     </div>
                  )}
               </div>
            </div>

            {renderBottomBar(true, matterPhase === 'gas', "Understand Why")}
         </div>
      );
   }

   // REVIEW Screen
   if (phase === 'review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 3 • Understand the Result", "Latent Heat", "Energy that changes state, not temperature")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.secondary}20 0%, ${colors.secondary}05 100%)`, border: `1px solid ${colors.secondary}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: `${colors.secondary}30` }}>
                           <span style={{ fontSize: '24px' }}>🧊</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.secondary }}>Latent Heat of Fusion</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: colors.textPrimary }}>Lf = 334 J/g</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Energy to melt ice <strong style={{ color: colors.textPrimary }}>without changing temperature</strong>
                        </p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}05 100%)`, border: `1px solid ${colors.accent}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: `${colors.accent}30` }}>
                           <span style={{ fontSize: '24px' }}>💨</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.accent }}>Latent Heat of Vaporization</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: colors.textPrimary }}>Lv = 2260 J/g</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Energy to boil water — <strong style={{ color: colors.textPrimary }}>7× more than melting!</strong>
                        </p>
                     </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>The Phase Change Equation</p>
                     <p style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', color: colors.primary }}>
                        Q = mL
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                        Heat = mass × latent heat (no temperature change!)
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.warning }}>Key Takeaways</p>
                     {renderKeyTakeaway("🔒", "Hidden Energy", "Latent means 'hidden' — this energy changes molecular bonds, not temperature. That's why it's invisible to a thermometer.")}
                     {renderKeyTakeaway("⚡", "Breaking Bonds", "Phase changes require energy to overcome intermolecular forces. Vaporization breaks ALL bonds, needing much more energy than melting.")}
                     {renderKeyTakeaway("🧊", "Why Ice Cools So Well", "Ice absorbs 334 J/g while melting at constant 0°C — that's like heating water 80°C! Perfect for cooling drinks.")}
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.success }}>Coming Up Next</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        What about the <strong style={{ color: colors.textPrimary }}>reverse process</strong>? Does condensing release the same energy that boiling absorbed?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Cooling Process")}
         </div>
      );
   }

   // TWIST-PREDICT Screen
   if (phase === 'twist_predict') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 4 • Reversing the Process", "Cooling Down", "What happens when steam condenses?")}

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', background: `${colors.accent}15`, border: `1px solid ${colors.accent}30` }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The New Question:</strong> You have steam at 120°C. As it cools and condenses, what happens to the energy that was absorbed during boiling?
                     </p>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px' }}>
                        {/* Steam */}
                        <g transform="translate(70, 20)">
                           <circle cx="30" cy="30" r="25" fill={colors.accent} opacity="0.3" />
                           <text x="30" y="35" textAnchor="middle" fontSize="24">💨</text>
                           <text x="30" y="75" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Steam 120°C</text>
                        </g>

                        {/* Arrow */}
                        <text x="200" y="45" textAnchor="middle" fontSize="24" fill={colors.secondary}>→</text>
                        <text x="200" y="70" textAnchor="middle" fontSize="10" fill={colors.textMuted}>- Heat</text>

                        {/* Result */}
                        <g transform="translate(270, 20)">
                           <rect x="5" y="5" width="50" height="50" rx="8" fill={colors.bgCardLight} stroke={colors.border} strokeDasharray="4 2" />
                           <text x="30" y="38" textAnchor="middle" fontSize="20" fill={colors.textMuted}>?</text>
                           <text x="30" y="75" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Energy?</text>
                        </g>
                     </svg>
                  </div>

                  <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'absorbed', label: 'Energy is absorbed from surroundings', desc: 'Condensation requires energy input' },
                        { id: 'released', label: 'Energy is released to surroundings', desc: 'The stored latent heat is released', correct: true },
                        { id: 'destroyed', label: 'Energy is destroyed', desc: 'The phase change eliminates the energy' },
                        { id: 'neutral', label: 'No energy transfer occurs', desc: 'Condensation is a neutral process' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setTwistPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'twist_predict',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted cooling: ${opt.label}`
                              });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              padding: '16px',
                              borderRadius: '12px',
                              textAlign: 'left',
                              background: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgCard,
                              border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, marginBottom: '4px', color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p style={{ fontSize: '12px', color: colors.textMuted }}>{opt.desc}</p>
                           </div>
                        </button>
                     ))}
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.warning }}>Think About It</p>
                     <p style={{ fontSize: '13px', color: colors.textMuted }}>
                        Conservation of energy: if boiling absorbed 2260 J/g, where does that energy go when steam turns back to water?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!twistPrediction, "See the Cooling", undefined, colors.accent)}
         </div>
      );
   }

   // TWIST-PLAY Screen - Cooling demonstration
   if (phase === 'twist_play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '400px' }}>
                     <svg viewBox="0 0 400 300" style={{ width: '100%' }}>
                        {/* Background */}
                        <rect width="400" height="300" fill={colors.bgDark} />

                        {/* Temperature bar */}
                        <g transform="translate(50, 30)">
                           <rect x="0" y="0" width="300" height="30" rx="15" fill={colors.bgCard} stroke={colors.border} />
                           <rect
                              x="3"
                              y="3"
                              width={Math.max(0, ((coolingTemp + 25) / 145) * 294)}
                              height="24"
                              rx="12"
                              fill={coolingTemp > 100 ? colors.accent : coolingTemp > 0 ? colors.primary : colors.secondary}
                           />
                           <text x="150" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.textPrimary}>
                              {coolingTemp.toFixed(1)}°C
                           </text>
                        </g>

                        {/* Phase indicator */}
                        <text x="200" y="90" textAnchor="middle" fontSize="48">
                           {coolingPhase === 'gas' ? '💨' :
                            coolingPhase === 'condensing' ? '💨💧' :
                            coolingPhase === 'liquid' ? '💧' :
                            coolingPhase === 'freezing' ? '💧🧊' : '🧊'}
                        </text>
                        <text x="200" y="130" textAnchor="middle" fontSize="16" fontWeight="bold" fill={
                           coolingPhase === 'gas' ? colors.accent :
                           coolingPhase === 'condensing' ? '#c084fc' :
                           coolingPhase === 'liquid' ? colors.primary :
                           coolingPhase === 'freezing' ? '#22d3ee' : colors.secondary
                        }>
                           {coolingPhase === 'gas' ? 'Gas (Steam)' :
                            coolingPhase === 'condensing' ? 'Condensing...' :
                            coolingPhase === 'liquid' ? 'Liquid (Water)' :
                            coolingPhase === 'freezing' ? 'Freezing...' : 'Solid (Ice)'}
                        </text>

                        {/* Energy release indicator */}
                        {(coolingPhase === 'condensing' || coolingPhase === 'freezing') && (
                           <g>
                              <rect x="100" y="160" width="200" height="50" rx="10" fill={`${colors.warning}20`} stroke={colors.warning} strokeWidth="2" />
                              <text x="200" y="185" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.warning}>
                                 {coolingPhase === 'condensing' ? '⚡ Releasing 2260 J/g' : '⚡ Releasing 334 J/g'}
                              </text>
                              <text x="200" y="202" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>
                                 Latent heat released to surroundings!
                              </text>
                           </g>
                        )}

                        {/* Cooling indicator */}
                        {isCooling && (
                           <g transform="translate(200, 250)">
                              <rect x="-60" y="-15" width="120" height="30" rx="15" fill={colors.secondary} opacity="0.3" />
                              <text x="0" y="5" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.secondary}>
                                 ❄️ Removing Heat ❄️
                              </text>
                           </g>
                        )}
                     </svg>
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '280px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none'
               }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.accent }}>Step 5 • Reverse Process</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>Cooling Steam to Ice</h3>
                  </div>

                  {/* Cool button */}
                  <button
                     onMouseDown={() => setIsCooling(!isCooling)}
                     style={{
                        padding: '14px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: isCooling ? colors.danger : `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 20px ${isCooling ? colors.danger : colors.secondary}40`
                     }}
                  >
                     {isCooling ? '⏸ Pause Cooling' : '❄️ Start Cooling'}
                  </button>

                  {/* Reset */}
                  <button
                     onMouseDown={() => {
                        setCoolingTemp(120);
                        setCoolingPhase('gas');
                        setIsCooling(false);
                     }}
                     style={{
                        padding: '12px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: colors.bgCardLight,
                        color: colors.textSecondary,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer'
                     }}
                  >
                     🔄 Reset to Steam
                  </button>

                  {/* Insight */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.accent}15`, border: `1px solid ${colors.accent}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.accent }}>Energy Conservation!</p>
                     <p style={{ fontSize: '11px', lineHeight: 1.6, color: colors.textSecondary }}>
                        Condensing <strong style={{ color: colors.textPrimary }}>releases</strong> the same 2260 J/g that boiling absorbed.
                        This is why steam burns are so dangerous — latent heat transfers to your skin!
                     </p>
                  </div>

                  {/* Warning about steam burns */}
                  {coolingPhase === 'condensing' && (
                     <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.danger}15`, border: `1px solid ${colors.danger}30` }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: colors.danger }}>⚠️ Steam Burns</p>
                        <p style={{ fontSize: '11px', color: colors.textSecondary }}>
                           Steam at 100°C causes worse burns than water at 100°C because condensation releases extra latent heat into your skin!
                        </p>
                     </div>
                  )}
               </div>
            </div>

            {renderBottomBar(true, coolingPhase === 'solid', "Deep Understanding", undefined, colors.accent)}
         </div>
      );
   }

   // TWIST-REVIEW Screen
   if (phase === 'twist_review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 6 • Deep Understanding", "Energy Conservation in Phase Changes", "What goes in must come out")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.danger}20 0%, ${colors.danger}05 100%)`, border: `1px solid ${colors.danger}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                           <span style={{ fontSize: '24px' }}>🔥</span>
                           <p style={{ fontWeight: 700, color: colors.danger }}>Heating (Endothermic)</p>
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           <strong style={{ color: colors.textPrimary }}>Melting & Boiling</strong> absorb energy from surroundings.
                           Energy stored in broken molecular bonds.
                        </p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.secondary}20 0%, ${colors.secondary}05 100%)`, border: `1px solid ${colors.secondary}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                           <span style={{ fontSize: '24px' }}>❄️</span>
                           <p style={{ fontWeight: 700, color: colors.secondary }}>Cooling (Exothermic)</p>
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           <strong style={{ color: colors.textPrimary }}>Condensing & Freezing</strong> release energy to surroundings.
                           Molecular bonds reform, releasing stored energy.
                        </p>
                     </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>The Fundamental Principle</p>
                     <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: colors.textPrimary }}>
                        Boiling absorbs <span style={{ color: colors.danger }}>+2260 J/g</span> → Condensing releases <span style={{ color: colors.secondary }}>-2260 J/g</span>
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                        Energy is conserved — phase changes store and release energy reversibly
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>Key Takeaways</p>
                     {renderKeyTakeaway("⚠️", "Steam Burns", "Steam at 100°C is far more dangerous than water at 100°C because it releases 2260 J/g of latent heat when it condenses on your skin.")}
                     {renderKeyTakeaway("🌧️", "Weather Energy", "Hurricanes are powered by ocean water evaporating (absorbing solar energy) and condensing in clouds (releasing massive energy as wind).")}
                     {renderKeyTakeaway("🔄", "Refrigeration Cycle", "Refrigerators work by evaporating coolant inside (absorbing heat) and condensing outside (releasing heat) — using phase changes to move heat.")}
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.success }}>The Big Picture</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        Phase changes are nature's way of <strong style={{ color: colors.textPrimary }}>storing and transferring energy</strong>.
                        From ice packs to power plants, understanding latent heat lets us engineer efficient cooling, heating, and energy storage systems.
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Real World Applications", undefined, colors.success)}
         </div>
      );
   }

   // TRANSFER Screen
   if (phase === 'transfer') {
      const realWorldApps = [
         {
            icon: '🧊',
            title: 'Ice Packs & Cold Therapy',
            short: 'Medical cooling',
            tagline: 'Absorbing Heat Without Temperature Rise',
            description: "Ice packs exploit latent heat of fusion. As ice melts at constant 0°C, it absorbs 334 J/g — equivalent to heating water by 80°C! This provides sustained, controlled cooling for injuries.",
            connection: "The flat plateau in the heating curve during melting means ice maintains 0°C while absorbing enormous energy — perfect for keeping things cold longer than cold water would.",
            howItWorks: 'Commercial ice packs often use gel or salt solutions that melt below 0°C, providing even colder sustained temperatures.',
            stats: [
               { value: '334', label: 'J/g absorbed', icon: '❄️' },
               { value: '0°C', label: 'Constant temp', icon: '🌡️' },
               { value: '6×', label: 'More than cold water', icon: '💪' }
            ],
            examples: ['Sports injury treatment', 'Food transportation', 'Medical cold therapy', 'Organ transport'],
            companies: ['3M', 'Pelican', 'Medline', 'Igloo'],
            futureImpact: 'Phase-change materials in clothing provide temperature regulation for athletes and outdoor workers.',
            color: colors.secondary
         },
         {
            icon: '💨',
            title: 'Air Conditioning',
            short: 'Refrigeration cycle',
            tagline: 'Phase Changes Move Heat',
            description: "Air conditioners use the refrigeration cycle: liquid refrigerant evaporates inside (absorbing 2260 J/g of room heat), then condenses outside (releasing that heat). Phase changes efficiently pump heat out of buildings.",
            connection: "The huge latent heat of vaporization means a small amount of refrigerant can absorb massive amounts of heat when it evaporates, then dump that heat outside when it condenses.",
            howItWorks: 'A compressor increases pressure, raising condensation temperature above outdoor temp. An expansion valve drops pressure, lowering evaporation temperature below indoor temp.',
            stats: [
               { value: '2260', label: 'J/g moved', icon: '⚡' },
               { value: '300%+', label: 'COP efficiency', icon: '📈' },
               { value: '$150B', label: 'Market size', icon: '💰' }
            ],
            examples: ['Home air conditioning', 'Refrigerators', 'Heat pumps', 'Industrial chillers'],
            companies: ['Carrier', 'Daikin', 'Trane', 'LG'],
            futureImpact: 'New refrigerants with lower global warming potential are replacing older CFCs and HFCs.',
            color: colors.primary
         },
         {
            icon: '🌧️',
            title: 'Weather & Hurricanes',
            short: 'Atmospheric energy',
            tagline: 'Latent Heat Powers Storms',
            description: "Hurricanes are giant heat engines powered by phase changes. Ocean water evaporates (absorbing solar energy as latent heat), rises, and condenses in clouds — releasing that stored energy as the kinetic energy of 150+ mph winds.",
            connection: "The 2260 J/g released when water vapor condenses is the primary energy source for hurricanes. Warm oceans = more evaporation = stronger storms.",
            howItWorks: 'Warm ocean → evaporation → moist air rises → cools → condensation releases heat → air rises faster → low pressure → more evaporation → feedback loop!',
            stats: [
               { value: '6×10¹⁴', label: 'Watts (hurricane)', icon: '⚡' },
               { value: '200×', label: 'More than all power plants', icon: '🌀' },
               { value: '80°F+', label: 'Ocean temp for formation', icon: '🌊' }
            ],
            examples: ['Hurricane formation', 'Thunderstorm development', 'Monsoons', 'Fog formation'],
            companies: ['NOAA', 'NASA', 'ECMWF', 'NWS'],
            futureImpact: 'Climate change is increasing ocean temperatures, leading to more intense hurricanes powered by more latent heat release.',
            color: colors.accent
         },
         {
            icon: '😓',
            title: 'Sweating & Evaporative Cooling',
            short: 'Body temperature regulation',
            tagline: 'Your Built-In Air Conditioner',
            description: "Your body uses evaporative cooling to maintain 37°C. When sweat evaporates, it absorbs 2260 J/g of latent heat from your skin — the same principle as air conditioning, but using your body as the heat source!",
            connection: "The reason humid days feel hotter is that high humidity slows evaporation, reducing the cooling effect. Less evaporation = less latent heat removed = you feel hotter.",
            howItWorks: 'Sweat glands produce water. Evaporation takes highest-energy molecules (they escape as vapor), leaving cooler molecules behind on your skin.',
            stats: [
               { value: '2260', label: 'J/g cooling', icon: '💧' },
               { value: '~600', label: 'mL/hour max sweat', icon: '😓' },
               { value: '37°C', label: 'Body temp maintained', icon: '🌡️' }
            ],
            examples: ['Exercise cooling', 'Fever response', 'Hot weather adaptation', 'Evaporative coolers (swamp coolers)'],
            companies: ['Nike', 'Under Armour', 'Columbia', 'Portacool'],
            futureImpact: 'Wearable cooling technologies use evaporative cooling and phase-change materials for extreme heat protection.',
            color: colors.warning
         }
      ];

      const currentApp = realWorldApps[selectedApp];
      const allCompleted = completedApps.every(c => c);
      const isCurrentCompleted = completedApps[selectedApp];
      const completedCount = completedApps.filter(c => c).length;

      const handleCompleteApp = () => {
         const newCompleted = [...completedApps];
         newCompleted[selectedApp] = true;
         setCompletedApps(newCompleted);

         emitGameEvent('app_completed', {
            phase: 'transfer',
            appNumber: selectedApp + 1,
            appTitle: currentApp.title,
            message: `Completed application ${selectedApp + 1}: ${currentApp.title}`
         });

         if (selectedApp < 3) setSelectedApp(selectedApp + 1);
      };

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ padding: '16px', background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>Step 7 • Real World Applications</p>
                     <p style={{ fontSize: '11px', marginTop: '4px', color: colors.textMuted }}>{completedCount}/4 completed</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                     {completedApps.map((completed, i) => (
                        <div key={i} style={{
                           width: '12px', height: '12px', borderRadius: '50%',
                           background: completed ? colors.success : i === selectedApp ? realWorldApps[i].color : colors.bgCardLight,
                           boxShadow: i === selectedApp ? `0 0 8px ${realWorldApps[i].color}` : 'none'
                        }} />
                     ))}
                  </div>
               </div>

               <div style={{ display: 'flex', gap: '8px' }}>
                  {realWorldApps.map((app, i) => {
                     const isCompleted = completedApps[i];
                     const isCurrent = selectedApp === i;
                     const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

                     return (
                        <button
                           key={i}
                           onMouseDown={() => !isLocked && setSelectedApp(i)}
                           style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px',
                              borderRadius: '8px',
                              background: isCurrent ? `${app.color}20` : 'transparent',
                              border: `2px solid ${isCurrent ? app.color : isCompleted ? colors.success : colors.border}`,
                              opacity: isLocked ? 0.4 : 1,
                              cursor: isLocked ? 'not-allowed' : 'pointer'
                           }}
                        >
                           <span style={{ fontSize: '18px' }}>{app.icon}</span>
                           {!isMobile && <span style={{ fontSize: '11px', fontWeight: 600, color: isCurrent ? colors.textPrimary : colors.textSecondary }}>{app.title.split(' ')[0]}</span>}
                           {isCompleted && <span style={{ color: colors.success }}>✓</span>}
                           {isLocked && <span>🔒</span>}
                        </button>
                     );
                  })}
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
               <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${currentApp.color}05 100%)`, border: `1px solid ${currentApp.color}30` }}>
                     <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                           <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: `${currentApp.color}30`, border: `2px solid ${currentApp.color}` }}>
                              {currentApp.icon}
                           </div>
                           <div>
                              <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary }}>{currentApp.title}</h2>
                              <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', color: currentApp.color }}>{currentApp.tagline}</p>
                           </div>
                        </div>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '20px', color: colors.textSecondary }}>{currentApp.description}</p>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                           {currentApp.stats.map((stat, i) => (
                              <div key={i} style={{ flex: '1 1 100px', padding: '16px', borderRadius: '12px', textAlign: 'center', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                                 <p style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</p>
                                 <p style={{ fontSize: '18px', fontWeight: 800, color: currentApp.color }}>{stat.value}</p>
                                 <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: colors.textMuted }}>{stat.label}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: currentApp.color }}>Physics Connection</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>{currentApp.connection}</p>
                  </div>

                  {!isCurrentCompleted && (
                     <button
                        onMouseDown={handleCompleteApp}
                        style={{
                           width: '100%',
                           padding: '16px',
                           borderRadius: '12px',
                           fontWeight: 700,
                           fontSize: '15px',
                           background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`,
                           color: colors.textPrimary,
                           border: 'none',
                           cursor: 'pointer',
                           boxShadow: `0 4px 20px ${currentApp.color}40`
                        }}
                     >
                        {selectedApp < 3 ? 'Continue to Next Application →' : 'Complete Applications →'}
                     </button>
                  )}
               </div>
            </div>

            {renderBottomBar(true, allCompleted, "Take the Test", () => goToPhase('test'), colors.success)}
         </div>
      );
   }

   // TEST Screen
   if (phase === 'test') {
      const currentQ = testQuestions[testQuestion];
      const selectedAnswer = testAnswers[testQuestion];

      if (testSubmitted) {
         const score = calculateTestScore();
         const percentage = (score / testQuestions.length) * 100;

         return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
               {renderProgressBar()}

               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                  <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                     <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        background: percentage >= 70 ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : `linear-gradient(135deg, ${colors.warning} 0%, #d97706 100%)`,
                        boxShadow: `0 20px 60px ${percentage >= 70 ? colors.success : colors.warning}40`
                     }}>
                        <span style={{ fontSize: '36px' }}>{percentage >= 70 ? '🎉' : '📚'}</span>
                     </div>

                     <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', color: colors.textPrimary }}>
                        {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Learning!'}
                     </h2>

                     <p style={{ fontSize: '48px', fontWeight: 900, marginBottom: '8px', color: percentage >= 70 ? colors.success : colors.warning }}>
                        {score}/{testQuestions.length}
                     </p>

                     <p style={{ fontSize: '14px', marginBottom: '32px', color: colors.textSecondary }}>
                        {percentage >= 90 ? "You've mastered phase changes and latent heat!" :
                         percentage >= 70 ? 'Solid understanding of latent heat!' :
                         'Review the concepts and try again!'}
                     </p>

                     <button
                        onMouseDown={() => percentage >= 70 ? goToPhase('mastery') : setTestSubmitted(false)}
                        style={{
                           padding: '16px 32px',
                           borderRadius: '12px',
                           fontWeight: 700,
                           fontSize: '15px',
                           background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                           color: colors.textPrimary,
                           border: 'none',
                           cursor: 'pointer'
                        }}
                     >
                        {percentage >= 70 ? 'Complete Lesson →' : 'Review & Retry'}
                     </button>
                  </div>
               </div>
            </div>
         );
      }

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>Question {testQuestion + 1} of {testQuestions.length}</p>
                     <div style={{ display: 'flex', gap: '4px' }}>
                        {testQuestions.map((_, i) => (
                           <div key={i} style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: testAnswers[i] ? colors.success : i === testQuestion ? colors.primary : colors.border
                           }} />
                        ))}
                     </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.textMuted }}>Scenario</p>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>{currentQ.scenario}</p>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: colors.textPrimary }}>{currentQ.question}</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     {currentQ.options.map((opt, i) => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              const newAnswers = [...testAnswers];
                              newAnswers[testQuestion] = opt.id;
                              setTestAnswers(newAnswers);
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              padding: '16px',
                              borderRadius: '12px',
                              textAlign: 'left',
                              background: selectedAnswer === opt.id ? `${colors.primary}20` : colors.bgCard,
                              border: `2px solid ${selectedAnswer === opt.id ? colors.primary : colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '12px',
                              background: selectedAnswer === opt.id ? colors.primary : colors.bgCardLight,
                              color: selectedAnswer === opt.id ? 'white' : colors.textMuted
                           }}>
                              {String.fromCharCode(65 + i)}
                           </div>
                           <p style={{ flex: 1, fontSize: '14px', color: selectedAnswer === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                        </button>
                     ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button
                        onMouseDown={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
                        style={{
                           flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 600,
                           background: colors.bgCardLight, color: colors.textSecondary, border: `1px solid ${colors.border}`,
                           cursor: testQuestion > 0 ? 'pointer' : 'not-allowed', opacity: testQuestion > 0 ? 1 : 0.3
                        }}
                     >
                        ← Previous
                     </button>
                     {testQuestion < testQuestions.length - 1 ? (
                        <button
                           onMouseDown={() => selectedAnswer && setTestQuestion(testQuestion + 1)}
                           style={{
                              flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700,
                              background: selectedAnswer ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                              color: colors.textPrimary, border: 'none',
                              cursor: selectedAnswer ? 'pointer' : 'not-allowed', opacity: selectedAnswer ? 1 : 0.5
                           }}
                        >
                           Next →
                        </button>
                     ) : (
                        <button
                           onMouseDown={() => testAnswers.every(a => a !== null) && setTestSubmitted(true)}
                           style={{
                              flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700,
                              background: testAnswers.every(a => a !== null) ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : colors.bgCardLight,
                              color: colors.textPrimary, border: 'none',
                              cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', opacity: testAnswers.every(a => a !== null) ? 1 : 0.5
                           }}
                        >
                           Submit Test ✓
                        </button>
                     )}
                  </div>
               </div>
            </div>
         </div>
      );
   }

   // MASTERY Screen
   if (phase === 'mastery') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
            position: 'relative',
            overflow: 'hidden'
         }}>
            {renderProgressBar()}

            {confetti.map((c, i) => (
               <div
                  key={i}
                  style={{
                     position: 'absolute',
                     left: `${c.x}%`,
                     top: `${c.y}%`,
                     width: '10px',
                     height: '10px',
                     backgroundColor: c.color,
                     borderRadius: '50%',
                     animation: `fall 3s ease-in-out ${c.delay}s infinite`,
                     opacity: 0.8
                  }}
               />
            ))}

            <style>{`
               @keyframes fall {
                  0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
               }
            `}</style>

            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: '40px 24px',
               textAlign: 'center',
               position: 'relative',
               zIndex: 1
            }}>
               <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '32px',
                  boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4)'
               }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>

               <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '16px', color: '#f8fafc' }}>
                  Mastery Achieved!
               </h1>

               <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '480px', lineHeight: 1.6, color: '#94a3b8' }}>
                  You've mastered <strong style={{ color: '#f8fafc' }}>phase changes and latent heat</strong>!
                  You understand how energy transforms matter without changing temperature.
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '400px', marginBottom: '40px' }}>
                  {[
                     { icon: '🧊', label: 'Latent Heat', value: 'Mastered' },
                     { icon: '🔄', label: 'Phase Changes', value: 'Mastered' },
                     { icon: '🔬', label: 'Applications', value: '4 Explored' }
                  ].map((item, i) => (
                     <div key={i} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: colors.primary }}>{item.value}</div>
                     </div>
                  ))}
               </div>

               <button
                  onMouseDown={() => {
                     emitGameEvent('game_completed', {
                        phase: 'mastery',
                        score: calculateTestScore(),
                        maxScore: testQuestions.length,
                        message: 'Phase Change Energy lesson completed!'
                     });
                  }}
                  style={{
                     padding: '18px 48px',
                     fontSize: '16px',
                     fontWeight: 700,
                     background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)'
                  }}
               >
                  Complete Lesson 🎓
               </button>
            </div>
         </div>
      );
   }

   return null;
};

export default PhaseChangeEnergyRenderer;
