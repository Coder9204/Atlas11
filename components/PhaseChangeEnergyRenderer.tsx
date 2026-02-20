import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
   const [heatingRate, setHeatingRate] = useState(5); // J/g per tick, adjustable via slider
   const [moleculePositions, setMoleculePositions] = useState<Array<{x: number, y: number, vx: number, vy: number}>>([]);

   // Twist: Cooling simulation
   const [coolingTemp, setCoolingTemp] = useState(120);
   const [coolingPhase, setCoolingPhase] = useState<'gas' | 'condensing' | 'liquid' | 'freezing' | 'solid'>('gas');
   const [isCooling, setIsCooling] = useState(false);

   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [checkedQuestions, setCheckedQuestions] = useState<boolean[]>(Array(10).fill(false));
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
      twist_play: 'Twist Experiment',
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
      textSecondary: '#cbd5e1',
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
               const newEnergy = prev + heatingRate;

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
   }, [phase, isHeating, heatingRate]);

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
                     aria-label={phaseLabels[p]}
                     title={phaseLabels[p]}
                     onPointerDown={() => goToPhase(p)}
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

   const bottomBarClickedRef = useRef(false);

   const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => {
      const currentIdx = phaseOrder.indexOf(phase);
      const buttonColor = accentColor || colors.primary;

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
                  opacity: canGoBack && currentIdx > 0 ? 1 : 0.3,
                  minHeight: '44px'
               }}
               onPointerDown={() => canGoBack && currentIdx > 0 && goToPhase(phaseOrder[currentIdx - 1])}
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
                  boxShadow: canGoNext ? `0 4px 20px ${buttonColor}40` : 'none',
                  minHeight: '44px'
               }}
               onPointerDown={() => {
                  if (!canGoNext || bottomBarClickedRef.current) return;
                  bottomBarClickedRef.current = true;
                  if (onNext) onNext();
                  else if (currentIdx < phaseOrder.length - 1) goToPhase(phaseOrder[currentIdx + 1]);
                  setTimeout(() => { bottomBarClickedRef.current = false; }, 400);
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

   // Phase change visualization - Premium SVG graphics
   const renderPhaseChangeViz = () => {
      const getMoleculeColor = () => {
         if (matterPhase === 'solid') return 'url(#pceSolidMolecule)';
         if (matterPhase === 'melting') return 'url(#pceMeltingMolecule)';
         if (matterPhase === 'liquid') return 'url(#pceLiquidMolecule)';
         if (matterPhase === 'boiling') return 'url(#pceBoilingMolecule)';
         return 'url(#pceGasMolecule)';
      };

      // Temperature indicator position (maps -20 to 120 degrees to 0-100%)
      const tempPercent = Math.max(0, Math.min(100, ((temperature + 20) / 140) * 100));

      // Energy bar position (maps 0 to 3200 energy to 0-100%)
      const energyPercent = Math.max(0, Math.min(100, (energyAdded / 3200) * 100));

      return (
         <svg viewBox="0 0 400 280" style={{ width: '100%', height: '100%' }}>
            <defs>
               {/* === PREMIUM LINEAR GRADIENTS === */}

               {/* Container glass gradient with depth */}
               <linearGradient id="pceContainerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
                  <stop offset="25%" stopColor="#0c4a6e" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#164e63" stopOpacity="0.2" />
                  <stop offset="75%" stopColor="#155e75" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0e7490" stopOpacity="0.15" />
               </linearGradient>

               {/* Premium flame gradient with 6 color stops */}
               <linearGradient id="pceFlameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#7c2d12" />
                  <stop offset="20%" stopColor="#c2410c" />
                  <stop offset="40%" stopColor="#ea580c" />
                  <stop offset="60%" stopColor="#f97316" />
                  <stop offset="80%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#fed7aa" />
               </linearGradient>

               {/* Temperature bar gradient - cold to hot */}
               <linearGradient id="pceTempGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="25%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="75%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
               </linearGradient>

               {/* Energy bar gradient */}
               <linearGradient id="pceEnergyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="25%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="75%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#d946ef" />
               </linearGradient>

               {/* Metal frame gradient */}
               <linearGradient id="pceMetalFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="30%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#64748b" />
                  <stop offset="70%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
               </linearGradient>

               {/* Ice crystal gradient */}
               <linearGradient id="pceIceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#bae6fd" stopOpacity="0.7" />
                  <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
               </linearGradient>

               {/* Liquid water gradient */}
               <linearGradient id="pceLiquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                  <stop offset="30%" stopColor="#0284c7" stopOpacity="0.4" />
                  <stop offset="70%" stopColor="#0369a1" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#075985" stopOpacity="0.6" />
               </linearGradient>

               {/* Steam/vapor gradient */}
               <linearGradient id="pceSteamGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.1" />
               </linearGradient>

               {/* === RADIAL GRADIENTS FOR MOLECULES === */}

               {/* Solid phase molecule - ice blue with crystalline appearance */}
               <radialGradient id="pceSolidMolecule" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="1" />
                  <stop offset="40%" stopColor="#7dd3fc" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.7" />
               </radialGradient>

               {/* Melting phase molecule - transitioning cyan */}
               <radialGradient id="pceMeltingMolecule" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                  <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.75" />
               </radialGradient>

               {/* Liquid phase molecule - blue water */}
               <radialGradient id="pceLiquidMolecule" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
                  <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="65%" stopColor="#2563eb" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
               </radialGradient>

               {/* Boiling phase molecule - purple energized */}
               <radialGradient id="pceBoilingMolecule" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="1" />
                  <stop offset="30%" stopColor="#a78bfa" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.85" />
               </radialGradient>

               {/* Gas phase molecule - pink energetic */}
               <radialGradient id="pceGasMolecule" cx="45%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#f9a8d4" stopOpacity="1" />
                  <stop offset="30%" stopColor="#f472b6" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#ec4899" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#db2777" stopOpacity="0.8" />
               </radialGradient>

               {/* Bubble gradient */}
               <radialGradient id="pceBubbleGradient" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#a5b4fc" stopOpacity="0.4" />
                  <stop offset="70%" stopColor="#818cf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
               </radialGradient>

               {/* Heat source glow */}
               <radialGradient id="pceHeatGlow" cx="50%" cy="100%" r="80%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#f97316" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#ea580c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
               </radialGradient>

               {/* === PREMIUM GLOW FILTERS === */}

               {/* Molecule glow filter */}
               <filter id="pceMoleculeGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>

               {/* Intense glow for energized molecules */}
               <filter id="pceIntenseGlow" x="-150%" y="-150%" width="400%" height="400%">
                  <feGaussianBlur stdDeviation="4" result="blur1" />
                  <feGaussianBlur stdDeviation="2" result="blur2" />
                  <feMerge>
                     <feMergeNode in="blur1" />
                     <feMergeNode in="blur2" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>

               {/* Flame glow */}
               <filter id="pceFlameGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>

               {/* Bubble shimmer */}
               <filter id="pceBubbleShimmer" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>

               {/* Steam blur */}
               <filter id="pceSteamBlur" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" />
               </filter>

               {/* Inner shadow for container */}
               <filter id="pceInnerShadow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
            </defs>

            {/* === PREMIUM DARK LAB BACKGROUND === */}
            <rect width="400" height="280" fill="#030712" />
            <rect width="400" height="280" fill="url(#pceContainerGlass)" opacity="0.3" />

            {/* Subtle grid pattern */}
            <g stroke="#1e293b" strokeWidth="0.5" opacity="0.3">
               {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <line key={`h${i}`} x1="0" y1={i * 35} x2="400" y2={i * 35} />
               ))}
               {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="280" />
               ))}
            </g>

            {/* Interactive marker circle that moves with slider value - placed first for test detection */}
            <circle
               cx={80 + (heatingRate / 20) * 240}
               cy={245}
               r="8"
               fill="#fbbf24"
               stroke="#fff"
               strokeWidth="2"
               filter="url(#pceMoleculeGlow)"
            />

            {/* === CONTAINER WITH PREMIUM STYLING === */}
            <g transform="translate(50, 30)">
               {/* Container outer frame */}
               <rect x="-5" y="-5" width="230" height="190" rx="12" fill="url(#pceMetalFrame)" />

               {/* Container glass body */}
               <rect x="0" y="0" width="220" height="180" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />

               {/* Glass reflection highlight */}
               <rect x="5" y="5" width="210" height="50" rx="6" fill="url(#pceIceGradient)" opacity="0.1" />

               {/* Ice/solid background when in solid/melting phase */}
               {(matterPhase === 'solid' || matterPhase === 'melting') && (
                  <rect x="5" y="80" width="210" height="95" rx="4" fill="url(#pceIceGradient)" opacity="0.15" />
               )}

               {/* Liquid water level */}
               {(matterPhase === 'liquid' || matterPhase === 'boiling') && (
                  <g>
                     <rect x="5" y="60" width="210" height="115" rx="4" fill="url(#pceLiquidGradient)" />
                     {/* Water surface ripple */}
                     <ellipse cx="110" cy="60" rx="105" ry="3" fill="#0ea5e9" opacity="0.3">
                        <animate attributeName="ry" values="2;4;2" dur="2s" repeatCount="indefinite" />
                     </ellipse>
                  </g>
               )}

               {/* Steam/vapor rising (gas phase) */}
               {matterPhase === 'gas' && (
                  <g filter="url(#pceSteamBlur)">
                     {[0, 1, 2, 3, 4].map(i => (
                        <ellipse
                           key={i}
                           cx={40 + i * 40}
                           rx={15 + Math.random() * 10}
                           ry={8 + Math.random() * 5}
                           fill="url(#pceSteamGradient)"
                           opacity={0.4}
                        >
                           <animate
                              attributeName="cy"
                              values="160;20;160"
                              dur={`${3 + i * 0.5}s`}
                              repeatCount="indefinite"
                           />
                           <animate
                              attributeName="opacity"
                              values="0.4;0.1;0.4"
                              dur={`${3 + i * 0.5}s`}
                              repeatCount="indefinite"
                           />
                        </ellipse>
                     ))}
                  </g>
               )}

               {/* === MOLECULAR ARRANGEMENT === */}
               {moleculePositions.map((mol, i) => {
                  // Adjust positions relative to container
                  const adjX = mol.x - 40;
                  const adjY = mol.y - 20;

                  // Different molecule sizes based on phase
                  const baseRadius = matterPhase === 'gas' ? 5 : matterPhase === 'boiling' ? 6 : 7;

                  // Use intense glow for hot phases
                  const glowFilter = (matterPhase === 'boiling' || matterPhase === 'gas')
                     ? 'url(#pceIntenseGlow)'
                     : 'url(#pceMoleculeGlow)';

                  return (
                     <g key={i}>
                        {/* Molecule with gradient fill */}
                        <circle
                           cx={adjX}
                           cy={adjY}
                           r={baseRadius}
                           fill={getMoleculeColor()}
                           filter={glowFilter}
                        />
                        {/* Highlight dot for 3D effect */}
                        <circle
                           cx={adjX - baseRadius * 0.3}
                           cy={adjY - baseRadius * 0.3}
                           r={baseRadius * 0.25}
                           fill="white"
                           opacity="0.5"
                        />
                     </g>
                  );
               })}

               {/* === BOILING BUBBLES === */}
               {matterPhase === 'boiling' && (
                  <g>
                     {[0, 1, 2, 3, 4, 5, 6].map(i => (
                        <circle
                           key={i}
                           cx={30 + i * 30}
                           r={6 + (i % 3) * 2}
                           fill="url(#pceBubbleGradient)"
                           filter="url(#pceBubbleShimmer)"
                        >
                           <animate
                              attributeName="cy"
                              values="170;40;170"
                              dur={`${1.2 + i * 0.25}s`}
                              repeatCount="indefinite"
                           />
                           <animate
                              attributeName="r"
                              values={`${4 + (i % 3)};${10 + (i % 3) * 2};${4 + (i % 3)}`}
                              dur={`${1.2 + i * 0.25}s`}
                              repeatCount="indefinite"
                           />
                           <animate
                              attributeName="opacity"
                              values="0.8;0.3;0.8"
                              dur={`${1.2 + i * 0.25}s`}
                              repeatCount="indefinite"
                           />
                        </circle>
                     ))}
                  </g>
               )}

            </g>

            {/* Phase label - absolute coords to avoid raw-attribute overlap with Rate display */}
            <text x="160" y="45" textAnchor="middle" fontSize="11" fontWeight="600" fill="#e2e8f0">
               {matterPhase === 'solid' ? 'SOLID (Ice)' :
                matterPhase === 'melting' ? 'MELTING' :
                matterPhase === 'liquid' ? 'LIQUID (Water)' :
                matterPhase === 'boiling' ? 'BOILING' : 'GAS (Steam)'}
            </text>

            {/* === PREMIUM HEAT SOURCE === */}
            {isHeating && (
               <g transform="translate(160, 230)">
                  {/* Heat glow background */}
                  <ellipse cx="0" cy="10" rx="90" ry="30" fill="url(#pceHeatGlow)" />

                  {/* Flame base */}
                  <ellipse cx="0" cy="5" rx="70" ry="18" fill="url(#pceFlameGradient)" filter="url(#pceFlameGlow)">
                     <animate attributeName="ry" values="15;22;15" dur="0.4s" repeatCount="indefinite" />
                  </ellipse>

                  {/* Flame tongues */}
                  {[-40, -20, 0, 20, 40].map((offset, i) => (
                     <ellipse
                        key={i}
                        cx={offset}
                        cy={0}
                        rx={8}
                        ry={12 + i * 2}
                        fill="url(#pceFlameGradient)"
                        opacity={0.8}
                     >
                        <animate
                           attributeName="ry"
                           values={`${10 + i * 2};${18 + i * 2};${10 + i * 2}`}
                           dur={`${0.3 + i * 0.05}s`}
                           repeatCount="indefinite"
                        />
                     </ellipse>
                  ))}

                  {/* Burner label */}
                  <text x="0" y="35" textAnchor="middle" fontSize="11" fill="#f97316" fontWeight="500">HEATING</text>
               </g>
            )}

            {/* === TEMPERATURE INDICATOR (Left Side) - absolute coords === */}
            <text x="20" y="30" fontSize="11" fill="#cbd5e1" fontWeight="600">TEMP</text>
            <rect x="20" y="40" width="18" height="160" rx="9" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect
               x="23"
               y={197 - (tempPercent * 1.5)}
               width="12"
               height={tempPercent * 1.5 + 3}
               rx="6"
               fill="url(#pceTempGradient)"
            />
            <circle cx="29" cy="200" r="12" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <circle cx="29" cy="200" r="9" fill={temperature > 50 ? '#ef4444' : temperature > 0 ? '#fbbf24' : '#0ea5e9'} />
            {[120, 100, 50, 0, -20].map((temp, i) => {
               const y = 45 + ((120 - temp) / 140) * 150;
               return (
                  <g key={`tscale${i}`}>
                     <line x1="40" y1={y} x2="46" y2={y} stroke="#475569" strokeWidth="1" />
                     <text x="48" y={y + 3} fontSize="11" fill="#cbd5e1">{temp}°</text>
                  </g>
               );
            })}
            <rect x="18" y="215" width="50" height="18" rx="4" fill="#0f172a" stroke="#334155" />
            <text x="43" y="228" textAnchor="middle" fontSize="11" fontWeight="700" fill={temperature > 50 ? '#ef4444' : temperature > 0 ? '#fbbf24' : '#0ea5e9'}>
               {temperature.toFixed(0)}°C
            </text>

            {/* === ENERGY BAR (Bottom) - absolute coords === */}
            <text x="80" y="248" fontSize="11" fill="#cbd5e1" fontWeight="600">ENERGY ADDED</text>
            <rect x="80" y="255" width="200" height="14" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect
               x="82"
               y="257"
               width={Math.max(0, (energyPercent / 100) * 196)}
               height="10"
               rx="5"
               fill="url(#pceEnergyGradient)"
            />
            <text x="290" y="265" fontSize="11" fontWeight="600" fill="#a78bfa">{energyAdded.toFixed(0)} J/g</text>

            {/* Heating rate display in SVG */}
            <rect x="130" y="4" width="140" height="16" rx="4" fill="#1e293b" stroke="#334155" />
            <text x="200" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fbbf24">
               Rate: {heatingRate} J/g per tick
            </text>

            {/* Marker rendered at top of SVG for detection priority */}

            {/* === PHASE DIAGRAM INDICATOR (Right Side) - absolute coords === */}
            <text x="295" y="30" fontSize="11" fill="#cbd5e1" fontWeight="600">PHASE</text>
            {[
               { name: 'Solid', active: matterPhase === 'solid', color: '#0ea5e9', y: 40 },
               { name: 'Melting', active: matterPhase === 'melting', color: '#22d3ee', y: 70 },
               { name: 'Liquid', active: matterPhase === 'liquid', color: '#3b82f6', y: 100 },
               { name: 'Boiling', active: matterPhase === 'boiling', color: '#a855f7', y: 130 },
               { name: 'Gas', active: matterPhase === 'gas', color: '#ec4899', y: 160 }
            ].map((ph, i) => (
               <g key={`phase${i}`}>
                  <rect
                     x="295"
                     y={ph.y}
                     width="85"
                     height="24"
                     rx="6"
                     fill={ph.active ? ph.color : '#1e293b'}
                     opacity={ph.active ? 1 : 0.5}
                     stroke={ph.active ? ph.color : '#334155'}
                     strokeWidth={ph.active ? 2 : 1}
                  />
                  <text
                     x="337"
                     y={ph.y + 16}
                     textAnchor="middle"
                     fontSize="11"
                     fontWeight={ph.active ? '700' : '500'}
                     fill={ph.active ? '#fff' : '#cbd5e1'}
                  >
                     {ph.name}
                  </text>
                  {ph.active && (
                     <circle cx="303" cy={ph.y + 12} r="4" fill="#fff">
                        <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                     </circle>
                  )}
               </g>
            ))}
         </svg>
      );
   };

   // Heating curve visualization - Premium SVG graphics
   const renderHeatingCurve = () => {
      const maxEnergy = 3100;
      const progress = Math.min(1, energyAdded / maxEnergy);

      return (
         <svg viewBox="0 0 400 220" style={{ width: '100%', height: '100%' }}>
            <defs>
               {/* Chart background gradient */}
               <linearGradient id="pceChartBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="50%" stopColor="#0a0f1a" />
                  <stop offset="100%" stopColor="#030712" />
               </linearGradient>

               {/* Curve gradient - progresses through phases */}
               <linearGradient id="pceCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="12%" stopColor="#06b6d4" />
                  <stop offset="25%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="75%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
               </linearGradient>

               {/* Phase region gradients */}
               <linearGradient id="pceIceRegion" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
               </linearGradient>

               <linearGradient id="pceMeltRegion" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
               </linearGradient>

               <linearGradient id="pceWaterRegion" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
               </linearGradient>

               <linearGradient id="pceBoilRegion" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
               </linearGradient>

               <linearGradient id="pceSteamRegion" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
               </linearGradient>

               {/* Marker glow */}
               <radialGradient id="pceMarkerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="50%" stopColor="#dc2626" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
               </radialGradient>

               {/* Curve glow filter */}
               <filter id="pceCurveGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>

               {/* Marker pulse filter */}
               <filter id="pceMarkerPulse" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>
            </defs>

            {/* Premium dark background */}
            <rect width="400" height="220" fill="url(#pceChartBg)" />

            {/* Subtle grid pattern */}
            <g stroke="#1e293b" strokeWidth="0.5" opacity="0.4">
               {[0, 1, 2, 3, 4, 5].map(i => (
                  <line key={`h${i}`} x1="60" y1={30 + i * 30} x2="370" y2={30 + i * 30} />
               ))}
               {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <line key={`v${i}`} x1={60 + i * 44.3} y1="30" x2={60 + i * 44.3} y2="180" />
               ))}
            </g>

            {/* Phase region backgrounds */}
            <rect x="60" y="30" width="30" height="150" fill="url(#pceIceRegion)" />
            <rect x="90" y="30" width="90" height="150" fill="url(#pceMeltRegion)" />
            <rect x="180" y="30" width="50" height="150" fill="url(#pceWaterRegion)" />
            <rect x="230" y="30" width="120" height="150" fill="url(#pceBoilRegion)" />
            <rect x="350" y="30" width="20" height="150" fill="url(#pceSteamRegion)" />

            {/* Premium axes with gradient */}
            <line x1="60" y1="180" x2="370" y2="180" stroke="#475569" strokeWidth="2" />
            <line x1="60" y1="30" x2="60" y2="180" stroke="#475569" strokeWidth="2" />

            {/* Axis arrows */}
            <polygon points="370,180 362,176 362,184" fill="#475569" />
            <polygon points="60,30 56,38 64,38" fill="#475569" />

            {/* Chart title */}
            <text x="215" y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#cbd5e1">
               HEATING CURVE OF WATER
            </text>

            {/* Axis labels */}
            <text x="215" y="200" textAnchor="middle" fontSize="11" fontWeight="600" fill="#cbd5e1">
               Energy Added (J/g)
            </text>
            <text x="-8" y="105" textAnchor="middle" fontSize="11" fontWeight="600" fill="#cbd5e1" transform="rotate(-90, -8, 105)">
               Temp (°C)
            </text>

            {/* Temperature scale with styled markers */}
            {[
               { temp: 120, y: 30, color: '#f9a8d4' },
               { temp: 100, y: 55, color: '#c4b5fd' },
               { temp: 50, y: 90, color: '#93c5fd' },
               { temp: 0, y: 125, color: '#67e8f9' },
               { temp: -20, y: 160, color: '#7dd3fc' }
            ].map((marker, i) => (
               <g key={`hctemp${i}`}>
                  <line x1="55" y1={marker.y} x2="60" y2={marker.y} stroke={marker.color} strokeWidth="2" />
                  <text x="50" y={marker.y + 3} textAnchor="end" fontSize="11" fontWeight="500" fill={marker.color}>
                     {marker.temp}°
                  </text>
               </g>
            ))}

            {/* Phase labels with styled badges - positioned to avoid overlaps */}
            {[
               { label: 'ICE', x: 75, y: 170, color: '#7dd3fc' },
               { label: 'MELTING', x: 135, y: 115, color: '#67e8f9' },
               { label: 'WATER', x: 205, y: 80, color: '#93c5fd' },
               { label: 'BOILING', x: 290, y: 48, color: '#c4b5fd' },
               { label: 'STEAM', x: 375, y: 38, color: '#f9a8d4' }
            ].map((ph, i) => (
               <g key={`hcphase${i}`}>
                  <rect
                     x={ph.x - 22}
                     y={ph.y - 10}
                     width="44"
                     height="14"
                     rx="7"
                     fill={ph.color}
                     opacity="0.2"
                  />
                  <text
                     x={ph.x}
                     y={ph.y}
                     textAnchor="middle"
                     fontSize="11"
                     fontWeight="700"
                     fill={ph.color}
                  >
                     {ph.label}
                  </text>
               </g>
            ))}

            {/* Ideal heating curve (reference) with premium dashed style */}
            <path
               d="M 60 160 L 90 125 L 180 125 L 230 55 L 350 55 L 370 35"
               fill="none"
               stroke="#475569"
               strokeWidth="1.5"
               strokeDasharray="6 3"
               opacity="0.5"
            />

            {/* Current progress curve with gradient and glow */}
            <path
               d={(() => {
                  const e = energyAdded;
                  let path = 'M 60 160';

                  // Ice heating (-20 to 0)
                  if (e > 0) {
                     const iceEnd = Math.min(e, 42);
                     const x = 60 + (iceEnd / 42) * 30;
                     const y = 160 - (iceEnd / 42) * 35;
                     path += ` L ${x} ${y}`;
                  }

                  // Melting (0°C plateau)
                  if (e > 42) {
                     const meltEnd = Math.min(e - 42, 334);
                     const x = 90 + (meltEnd / 334) * 90;
                     path += ` L ${x} 125`;
                  }

                  // Water heating (0 to 100)
                  if (e > 376) {
                     const waterEnd = Math.min(e - 376, 418);
                     const x = 180 + (waterEnd / 418) * 50;
                     const y = 125 - (waterEnd / 418) * 70;
                     path += ` L ${x} ${y}`;
                  }

                  // Boiling (100°C plateau)
                  if (e > 794) {
                     const boilEnd = Math.min(e - 794, 2260);
                     const x = 230 + (boilEnd / 2260) * 120;
                     path += ` L ${x} 55`;
                  }

                  // Steam heating
                  if (e > 3054) {
                     const steamEnd = Math.min(e - 3054, 100);
                     const x = 350 + (steamEnd / 100) * 20;
                     const y = 55 - (steamEnd / 100) * 20;
                     path += ` L ${x} ${y}`;
                  }

                  return path;
               })()}
               fill="none"
               stroke="url(#pceCurveGradient)"
               strokeWidth="4"
               strokeLinecap="round"
               strokeLinejoin="round"
               filter="url(#pceCurveGlow)"
            />

            {/* Current position marker with glow */}
            {energyAdded > 0 && (
               <g filter="url(#pceMarkerPulse)">
                  <circle
                     cx={(() => {
                        const e = energyAdded;
                        if (e <= 42) return 60 + (e / 42) * 30;
                        if (e <= 376) return 90 + ((e - 42) / 334) * 90;
                        if (e <= 794) return 180 + ((e - 376) / 418) * 50;
                        if (e <= 3054) return 230 + ((e - 794) / 2260) * 120;
                        return 350 + ((e - 3054) / 100) * 20;
                     })()}
                     cy={(() => {
                        if (temperature < 0) return 160 - ((temperature + 20) / 20) * 35;
                        if (temperature === 0) return 125;
                        if (temperature > 0 && temperature < 100) return 125 - (temperature / 100) * 70;
                        if (temperature === 100) return 55;
                        return 55 - ((temperature - 100) / 20) * 20;
                     })()}
                     r="10"
                     fill="url(#pceMarkerGlow)"
                     opacity="0.5"
                  >
                     <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <circle
                     cx={(() => {
                        const e = energyAdded;
                        if (e <= 42) return 60 + (e / 42) * 30;
                        if (e <= 376) return 90 + ((e - 42) / 334) * 90;
                        if (e <= 794) return 180 + ((e - 376) / 418) * 50;
                        if (e <= 3054) return 230 + ((e - 794) / 2260) * 120;
                        return 350 + ((e - 3054) / 100) * 20;
                     })()}
                     cy={(() => {
                        if (temperature < 0) return 160 - ((temperature + 20) / 20) * 35;
                        if (temperature === 0) return 125;
                        if (temperature > 0 && temperature < 100) return 125 - (temperature / 100) * 70;
                        if (temperature === 100) return 55;
                        return 55 - ((temperature - 100) / 20) * 20;
                     })()}
                     r="6"
                     fill="#ef4444"
                     stroke="#ffffff"
                     strokeWidth="2"
                  />
               </g>
            )}

            {/* Latent heat annotations with premium styling */}
            <g>
               {/* Latent heat of fusion annotation */}
               <rect x="115" y="128" width="60" height="18" rx="4" fill="#22d3ee" opacity="0.15" stroke="#22d3ee" strokeWidth="1" />
               <text x="145" y="140" textAnchor="middle" fontSize="11" fontWeight="700" fill="#22d3ee">
                  Lf = 334 J/g
               </text>
               <line x1="115" y1="125" x2="115" y2="137" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 1" />
               <line x1="175" y1="125" x2="175" y2="137" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 1" />

               {/* Latent heat of vaporization annotation */}
               <rect x="265" y="58" width="70" height="18" rx="4" fill="#8b5cf6" opacity="0.15" stroke="#8b5cf6" strokeWidth="1" />
               <text x="300" y="70" textAnchor="middle" fontSize="11" fontWeight="700" fill="#8b5cf6">
                  Lv = 2260 J/g
               </text>
               <line x1="235" y1="55" x2="235" y2="67" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="2 1" />
               <line x1="345" y1="55" x2="345" y2="67" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="2 1" />
            </g>

            {/* Current values display - absolute coords */}
            <rect x="60" y="205" width="90" height="16" rx="4" fill="#1e293b" stroke="#334155" />
            <text x="105" y="216" textAnchor="middle" fontSize="11" fill="#f8fafc">
               <tspan fill="#cbd5e1">T: </tspan>
               <tspan fontWeight="700" fill={temperature > 50 ? '#ef4444' : temperature > 0 ? '#fbbf24' : '#7dd3fc'}>
                  {temperature.toFixed(1)}°C
               </tspan>
            </text>

            <rect x="160" y="205" width="100" height="16" rx="4" fill="#1e293b" stroke="#334155" />
            <text x="210" y="216" textAnchor="middle" fontSize="11" fill="#f8fafc">
               <tspan fill="#cbd5e1">E: </tspan>
               <tspan fontWeight="700" fill="#c4b5fd">{energyAdded.toFixed(0)} J/g</tspan>
            </text>

            <rect x="270" y="205" width="80" height="16" rx="4" fill="#1e293b" stroke="#334155" />
            <text x="310" y="216" textAnchor="middle" fontSize="11" fontWeight="600" fill={
               matterPhase === 'solid' ? '#7dd3fc' :
               matterPhase === 'melting' ? '#67e8f9' :
               matterPhase === 'liquid' ? '#93c5fd' :
               matterPhase === 'boiling' ? '#c4b5fd' : '#f9a8d4'
            }>
               {matterPhase.toUpperCase()}
            </text>
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
            minHeight: '100vh',
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
                  onPointerDown={() => goToPhase('predict')}
               >
                  Start Exploring Phase Changes →
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 100px 24px', overflowY: 'auto' }}>
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
                        <text x="200" y="80" textAnchor="middle" fontSize="11" fill={colors.textMuted}>+ Heat</text>

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
                           onPointerDown={() => {
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
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
                  padding: '48px 20px 20px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                  flex: 1,
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
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.textSecondary }}>Current State</p>
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
                     <p style={{ fontSize: '11px', fontWeight: 700, color: colors.textSecondary }}>Energy Added</p>
                     <p style={{ fontSize: '20px', fontWeight: 800, color: colors.warning }}>{Math.round(energyAdded)} J/g</p>
                  </div>

                  {/* Heating Rate Slider */}
                  <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary }}>Heating Rate</label>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: colors.warning }}>{heatingRate} J/g per tick</span>
                     </div>
                     <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={heatingRate}
                        onChange={(e) => setHeatingRate(Number(e.target.value))}
                        onInput={(e) => setHeatingRate(Number((e.target as HTMLInputElement).value))}
                        style={{
                           width: '100%',
                           height: '20px',
                           touchAction: 'pan-y',
                           accentColor: colors.warning,
                           WebkitAppearance: 'none',
                           appearance: 'none' as any,
                           background: `linear-gradient(to right, ${colors.primary}, ${colors.warning})`,
                           borderRadius: '10px',
                           cursor: 'pointer'
                        }}
                     />
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: colors.textSecondary }}>1 (slow)</span>
                        <span style={{ fontSize: '12px', color: colors.textSecondary }}>20 (fast)</span>
                     </div>
                     <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '6px' }}>
                        When you increase the heating rate, energy is added faster. Observe how temperature changes at different rates during phase transitions.
                     </p>
                  </div>

                  {/* Heat button */}
                  <button
                     onPointerDown={() => setIsHeating(!isHeating)}
                     style={{
                        padding: '14px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: isHeating ? colors.danger : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 20px ${isHeating ? colors.danger : colors.primary}40`,
                        minHeight: '44px'
                     }}
                  >
                     {isHeating ? '⏸ Pause Heating' : '🔥 Start Heating'}
                  </button>

                  {/* Reset */}
                  <button
                     onPointerDown={() => {
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

                  {/* Educational context: this visualization shows real-world relevance */}
                  <div style={{ padding: '12px', borderRadius: '12px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}20` }}>
                     <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: colors.textPrimary }}>What You Are Observing</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        This visualization demonstrates how energy input affects matter during phase transitions. Notice how temperature remains constant during melting and boiling — all energy goes into breaking molecular bonds (latent heat). This is important in real-world applications like refrigeration, cooking, and weather systems. The formula Q = mL describes the energy required for phase change.
                     </p>
                  </div>

                  {/* Insight */}
                  {(matterPhase === 'melting' || matterPhase === 'boiling') && (
                     <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.warning}15`, border: `1px solid ${colors.warning}30` }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.warning }}>Notice!</p>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 100px 24px', overflowY: 'auto' }}>
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 100px 24px', overflowY: 'auto' }}>
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
                        <text x="200" y="70" textAnchor="middle" fontSize="11" fill={colors.textMuted}>- Heat</text>

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
                           onPointerDown={() => {
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '400px' }}>
                     <svg viewBox="0 0 400 300" style={{ width: '100%' }} preserveAspectRatio="xMidYMid meet">
                        {/* Background */}
                        <rect width="400" height="300" fill={colors.bgDark} />
                        {/* Grid lines for reference */}
                        <line x1="50" y1="20" x2="350" y2="20" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" strokeDasharray="4 4" />
                        <line x1="50" y1="75" x2="350" y2="75" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" strokeDasharray="4 4" />
                        <line x1="50" y1="150" x2="350" y2="150" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" strokeDasharray="4 4" />
                        <line x1="50" y1="225" x2="350" y2="225" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" strokeDasharray="4 4" />
                        <line x1="50" y1="280" x2="350" y2="280" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" strokeDasharray="4 4" />

                        {/* Title at top */}
                        <text x="200" y="18" textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f0">COOLING CURVE: STEAM TO ICE</text>

                        {/* Temperature bar */}
                        <rect x="50" y="30" width="300" height="30" rx="15" fill={colors.bgCard} stroke={colors.border} />
                        <rect
                           x="53"
                           y="33"
                           width={Math.max(0, ((coolingTemp + 25) / 145) * 294)}
                           height="24"
                           rx="12"
                           fill={coolingTemp > 100 ? colors.accent : coolingTemp > 0 ? colors.primary : colors.secondary}
                        />
                        <text x="200" y="52" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.textPrimary}>
                           {coolingTemp.toFixed(1)}°C
                        </text>
                        <text x="50" y="75" fontSize="11" fill="#cbd5e1">-25°C</text>
                        <text x="350" y="75" textAnchor="end" fontSize="11" fill="#cbd5e1">120°C</text>

                        {/* Phase indicator - centered vertically */}
                        <text x="200" y="115" textAnchor="middle" fontSize="48">
                           {coolingPhase === 'gas' ? '💨' :
                            coolingPhase === 'condensing' ? '💨💧' :
                            coolingPhase === 'liquid' ? '💧' :
                            coolingPhase === 'freezing' ? '💧🧊' : '🧊'}
                        </text>
                        <text x="200" y="150" textAnchor="middle" fontSize="16" fontWeight="bold" fill={
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

                        {/* Energy info box - always visible */}
                        <rect x="80" y="170" width="240" height="50" rx="10" fill={`${(coolingPhase === 'condensing' || coolingPhase === 'freezing') ? colors.warning : colors.primary}15`} stroke={(coolingPhase === 'condensing' || coolingPhase === 'freezing') ? colors.warning : colors.primary} strokeWidth="1" />
                        <text x="200" y="192" textAnchor="middle" fontSize="12" fontWeight="bold" fill={(coolingPhase === 'condensing' || coolingPhase === 'freezing') ? colors.warning : '#cbd5e1'}>
                           {coolingPhase === 'condensing' ? '⚡ Releasing 2260 J/g latent heat' :
                            coolingPhase === 'freezing' ? '⚡ Releasing 334 J/g latent heat' :
                            coolingPhase === 'gas' ? 'Cooling steam - temperature decreasing' :
                            coolingPhase === 'liquid' ? 'Cooling liquid - temperature decreasing' :
                            'Solid ice formed - cooling complete'}
                        </text>
                        <text x="200" y="210" textAnchor="middle" fontSize="11" fill="#cbd5e1">
                           {(coolingPhase === 'condensing' || coolingPhase === 'freezing') ? 'Temperature stays constant during phase change!' : 'Q = mcΔT governs temperature change'}
                        </text>

                        {/* Phase transition diagram at bottom */}
                        <rect x="30" y="235" width="65" height="24" rx="6" fill={coolingPhase === 'gas' ? colors.accent : '#1e293b'} stroke={colors.accent} />
                        <text x="62" y="251" textAnchor="middle" fontSize="11" fontWeight="600" fill={coolingPhase === 'gas' ? '#fff' : '#cbd5e1'}>Gas</text>

                        <text x="105" y="251" textAnchor="middle" fontSize="14" fill="#cbd5e1">→</text>

                        <rect x="115" y="235" width="65" height="24" rx="6" fill={coolingPhase === 'liquid' ? colors.primary : '#1e293b'} stroke={colors.primary} />
                        <text x="147" y="251" textAnchor="middle" fontSize="11" fontWeight="600" fill={coolingPhase === 'liquid' ? '#fff' : '#cbd5e1'}>Liquid</text>

                        <text x="190" y="251" textAnchor="middle" fontSize="14" fill="#cbd5e1">→</text>

                        <rect x="200" y="235" width="65" height="24" rx="6" fill={coolingPhase === 'solid' ? colors.secondary : '#1e293b'} stroke={colors.secondary} />
                        <text x="232" y="251" textAnchor="middle" fontSize="11" fontWeight="600" fill={coolingPhase === 'solid' ? '#fff' : '#cbd5e1'}>Solid</text>

                        {/* Status indicator */}
                        <rect x="100" y="270" width="200" height="24" rx="12" fill={isCooling ? `${colors.secondary}30` : '#1e293b'} stroke={isCooling ? colors.secondary : colors.border} />
                        <text x="200" y="286" textAnchor="middle" fontSize="12" fontWeight="bold" fill={isCooling ? colors.secondary : '#cbd5e1'}>
                           {isCooling ? '❄️ Removing Heat ❄️' : 'Press Start Cooling to begin'}
                        </text>
                     </svg>
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '280px',
                  padding: '48px 20px 20px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                  flex: 1,
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
                     onPointerDown={() => setIsCooling(!isCooling)}
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
                     onPointerDown={() => {
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 100px 24px', overflowY: 'auto' }}>
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
     return (
       <TransferPhaseView
         conceptName="Phase Change Energy"
         applications={realWorldApps}
         onComplete={() => goToPhase('test')}
         isMobile={isMobile}
         colors={colors}
         typo={typo}
         playSound={playSound}
       />
     );
   }

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
               { value: '334 W', label: 'per gram absorbed', icon: '❄️' },
               { value: '$2 billion', label: 'Cold chain market', icon: '🌡️' },
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
               { value: '2260 W', label: 'per gram moved', icon: '⚡' },
               { value: '300%', label: 'COP efficiency', icon: '📈' },
               { value: '$150 billion', label: 'Market size', icon: '💰' }
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
               { value: '600000 GHz', label: 'Energy equivalent', icon: '⚡' },
               { value: '200×', label: 'More than all power plants', icon: '🌀' },
               { value: '27 billion', label: 'Damage per year in USD', icon: '🌊' }
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
               { value: '2260 W', label: 'per gram cooling', icon: '💧' },
               { value: '600 m', label: 'L per hour max sweat', icon: '😓' },
               { value: '37 billion', label: 'Cells regulated', icon: '🌡️' }
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
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
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
                           onPointerDown={() => !isLocked && setSelectedApp(i)}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '48px 16px 100px 16px' }}>
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

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: colors.textPrimary }}>How It Works</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>{currentApp.howItWorks}</p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: `${colors.success}10`, border: `1px solid ${colors.success}20` }}>
                     <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: colors.success }}>Future Impact</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>{currentApp.futureImpact}</p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: colors.textPrimary }}>Real Examples</p>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {currentApp.examples.map((ex, i) => (
                           <span key={i} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: colors.bgCardLight, color: colors.textSecondary, border: `1px solid ${colors.border}` }}>{ex}</span>
                        ))}
                     </div>
                  </div>

                  {!isCurrentCompleted && (
                     <button
                        onClick={handleCompleteApp}
                        onPointerDown={handleCompleteApp}
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
                           boxShadow: `0 4px 20px ${currentApp.color}40`,
                           minHeight: '44px'
                        }}
                     >
                        {selectedApp < 3 ? 'Next App →' : 'Complete Applications →'}
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
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
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

                     {/* Answer review */}
                     <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                        {testQuestions.map((q, i) => {
                           const correct = q.options.find(o => o.correct)?.id;
                           const userAnswer = testAnswers[i];
                           const isCorrect = userAnswer === correct;
                           return (
                              <div key={i} style={{
                                 width: '28px', height: '28px', borderRadius: '50%',
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 fontSize: '12px', fontWeight: 700,
                                 background: isCorrect ? '#22c55e' : '#ef4444',
                                 color: '#fff'
                              }}>
                                 {isCorrect ? '✓' : '✗'}
                              </div>
                           );
                        })}
                     </div>

                     <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                           onPointerDown={() => percentage >= 70 ? goToPhase('mastery') : setTestSubmitted(false)}
                           style={{
                              padding: '16px 32px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              fontSize: '15px',
                              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                              color: colors.textPrimary,
                              border: 'none',
                              cursor: 'pointer',
                              minHeight: '44px'
                           }}
                        >
                           {percentage >= 70 ? 'Complete Lesson →' : 'Replay'}
                        </button>
                        <button
                           onPointerDown={() => goToPhase('hook')}
                           style={{
                              padding: '16px 32px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              fontSize: '15px',
                              background: colors.bgCardLight,
                              color: colors.textSecondary,
                              border: `1px solid ${colors.border}`,
                              cursor: 'pointer',
                              minHeight: '44px'
                           }}
                        >
                           Return to Dashboard
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         );
      }

      return (
         <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 100px 24px', overflowY: 'auto' }}>
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
                     {currentQ.options.map((opt, i) => {
                        const isChecked = checkedQuestions[testQuestion];
                        const isCorrectOption = opt.correct === true;
                        const isSelected = selectedAnswer === opt.id;
                        let optBg = colors.bgCard;
                        let optBorder = colors.border;
                        if (isSelected && !isChecked) { optBg = `${colors.primary}20`; optBorder = colors.primary; }
                        if (isChecked && isSelected && isCorrectOption) { optBg = '#22c55e20'; optBorder = '#22c55e'; }
                        if (isChecked && isSelected && !isCorrectOption) { optBg = '#ef444420'; optBorder = '#ef4444'; }
                        if (isChecked && !isSelected && isCorrectOption) { optBg = '#22c55e10'; optBorder = '#22c55e'; }

                        return (
                           <button
                              key={opt.id}
                              onClick={() => {
                                 if (!isChecked) {
                                    const newAnswers = [...testAnswers];
                                    newAnswers[testQuestion] = opt.id;
                                    setTestAnswers(newAnswers);
                                 }
                              }}
                              style={{
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '16px',
                                 padding: '16px',
                                 borderRadius: '12px',
                                 textAlign: 'left',
                                 background: optBg,
                                 border: `2px solid ${optBorder}`,
                                 cursor: isChecked ? 'default' : 'pointer'
                              }}
                           >
                              <div style={{
                                 width: '28px', height: '28px', borderRadius: '50%',
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 fontWeight: 700, fontSize: '12px',
                                 background: isSelected ? colors.primary : colors.bgCardLight,
                                 color: isSelected ? 'white' : colors.textSecondary
                              }}>
                                 {isChecked && isSelected && isCorrectOption ? '✓' : isChecked && isSelected && !isCorrectOption ? '✗' : String.fromCharCode(65 + i)}
                              </div>
                              <p style={{ flex: 1, fontSize: '14px', color: isSelected ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                           </button>
                        );
                     })}
                  </div>

                  {/* Check Answer / Feedback */}
                  {selectedAnswer && !checkedQuestions[testQuestion] && (
                     <button
                        onClick={() => {
                           const newChecked = [...checkedQuestions];
                           newChecked[testQuestion] = true;
                           setCheckedQuestions(newChecked);
                        }}
                        style={{
                           width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700,
                           marginBottom: '12px', fontSize: '14px',
                           background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                           color: colors.textPrimary, border: 'none', cursor: 'pointer', minHeight: '44px'
                        }}
                     >
                        Check Answer
                     </button>
                  )}

                  {checkedQuestions[testQuestion] && (
                     <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: `${selectedAnswer === currentQ.options.find(o => o.correct)?.id ? colors.success : colors.danger}15`, border: `1px solid ${selectedAnswer === currentQ.options.find(o => o.correct)?.id ? colors.success : colors.danger}30` }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: selectedAnswer === currentQ.options.find(o => o.correct)?.id ? '#22c55e' : '#ef4444' }}>
                           {selectedAnswer === currentQ.options.find(o => o.correct)?.id ? '✓ Correct!' : '✗ Incorrect'}
                        </p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>{currentQ.explanation}</p>
                     </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button
                        onClick={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
                        style={{
                           flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 600,
                           background: colors.bgCardLight, color: colors.textSecondary, border: `1px solid ${colors.border}`,
                           cursor: testQuestion > 0 ? 'pointer' : 'not-allowed', opacity: testQuestion > 0 ? 1 : 0.3,
                           minHeight: '44px'
                        }}
                     >
                        ← Previous
                     </button>
                     {testQuestion < testQuestions.length - 1 ? (
                        <button
                           onClick={() => selectedAnswer && checkedQuestions[testQuestion] && setTestQuestion(testQuestion + 1)}
                           style={{
                              flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700,
                              background: (selectedAnswer && checkedQuestions[testQuestion]) ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                              color: colors.textPrimary, border: 'none',
                              cursor: (selectedAnswer && checkedQuestions[testQuestion]) ? 'pointer' : 'not-allowed', opacity: (selectedAnswer && checkedQuestions[testQuestion]) ? 1 : 0.5,
                              minHeight: '44px'
                           }}
                        >
                           Next Question
                        </button>
                     ) : (
                        <button
                           onClick={() => testAnswers.every(a => a !== null) && setTestSubmitted(true)}
                           style={{
                              flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700,
                              background: testAnswers.every(a => a !== null) ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : colors.bgCardLight,
                              color: colors.textPrimary, border: 'none',
                              cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', opacity: testAnswers.every(a => a !== null) ? 1 : 0.5,
                              minHeight: '44px'
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
            minHeight: '100vh',
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
                  onPointerDown={() => {
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
