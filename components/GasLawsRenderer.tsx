import React, { useState, useEffect, useCallback, useRef } from 'react';

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

interface GasLawsRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

const playSound = (freq: number, duration: number = 0.15) => {
   try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
   } catch (e) {}
};

const GasLawsRenderer: React.FC<GasLawsRendererProps> = ({ onGameEvent, gamePhase }) => {
   type GLPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: GLPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   const getInitialPhase = (): GLPhase => {
      if (gamePhase && validPhases.includes(gamePhase as GLPhase)) {
         return gamePhase as GLPhase;
      }
      return 'hook';
   };

   const [phase, setPhase] = useState<GLPhase>(getInitialPhase);

   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as GLPhase) && gamePhase !== phase) {
         setPhase(gamePhase as GLPhase);
      }
   }, [gamePhase]);

   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [time, setTime] = useState(0);

   // Boyle's Law simulation
   const [volume, setVolume] = useState(100); // Percentage (100 = full)
   const [pressure, setPressure] = useState(1); // atm
   const [temperature, setTemperature] = useState(300); // Kelvin

   // Twist: Charles's Law
   const [twistTemp, setTwistTemp] = useState(300);
   const [twistVolume, setTwistVolume] = useState(100);
   const [constantPressure] = useState(1);

   // Molecule positions
   const [molecules, setMolecules] = useState<Array<{x: number, y: number, vx: number, vy: number}>>([]);

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
            gameType: 'gas_laws',
            gameTitle: 'Gas Laws',
            details,
            timestamp: Date.now()
         });
      }
   }, [onGameEvent]);

   const phaseOrder: GLPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const phaseLabels: Record<GLPhase, string> = {
      hook: 'Introduction',
      predict: 'Predict',
      play: 'Experiment',
      review: 'Understanding',
      twist_predict: 'New Variable',
      twist_play: 'Temperature',
      twist_review: 'Deep Insight',
      transfer: 'Real World',
      test: 'Knowledge Test',
      mastery: 'Mastery'
   };

   const isNavigating = useRef(false);

   const goToPhase = useCallback((p: GLPhase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      setPhase(p);
      if (p === 'play') {
         setVolume(100);
         setPressure(1);
      }
      if (p === 'twist_play') {
         setTwistTemp(300);
         setTwistVolume(100);
      }
      playSound(400 + Math.random() * 200, 0.1);

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
      primary: '#8b5cf6', // violet
      primaryDark: '#7c3aed',
      accent: '#06b6d4', // cyan
      secondary: '#f59e0b', // amber
      warning: '#ef4444',
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

   // Initialize molecules
   useEffect(() => {
      const mols = Array.from({ length: 30 }, () => ({
         x: Math.random() * 180 + 10,
         y: Math.random() * 150 + 10,
         vx: (Math.random() - 0.5) * 4,
         vy: (Math.random() - 0.5) * 4
      }));
      setMolecules(mols);
   }, []);

   // Boyle's Law: PV = constant (at constant T)
   useEffect(() => {
      if (phase === 'play') {
         // P1V1 = P2V2
         // Initial: P=1, V=100
         // So P = 100/V
         setPressure(100 / volume);
      }
   }, [volume, phase]);

   // Charles's Law: V/T = constant (at constant P)
   useEffect(() => {
      if (phase === 'twist_play') {
         // V1/T1 = V2/T2
         // Initial: V=100, T=300
         // So V = 100 * T/300 = T/3
         setTwistVolume((twistTemp / 300) * 100);
      }
   }, [twistTemp, phase]);

   // Molecule animation
   useEffect(() => {
      const interval = setInterval(() => {
         setMolecules(prev => {
            const containerHeight = phase === 'play' ? (volume / 100) * 150 : (twistVolume / 100) * 150;
            const speed = phase === 'twist_play' ? Math.sqrt(twistTemp / 300) : 1;

            return prev.map(mol => {
               let newX = mol.x + mol.vx * speed;
               let newY = mol.y + mol.vy * speed;
               let newVx = mol.vx;
               let newVy = mol.vy;

               // Bounce off walls
               if (newX < 10 || newX > 190) {
                  newVx = -newVx;
                  newX = Math.max(10, Math.min(190, newX));
               }
               if (newY < 10 || newY > 10 + containerHeight) {
                  newVy = -newVy;
                  newY = Math.max(10, Math.min(10 + containerHeight, newY));
               }

               // Random perturbation based on temperature
               newVx += (Math.random() - 0.5) * 0.5 * speed;
               newVy += (Math.random() - 0.5) * 0.5 * speed;

               return { x: newX, y: newY, vx: newVx, vy: newVy };
            });
         });
      }, 30);
      return () => clearInterval(interval);
   }, [phase, volume, twistVolume, twistTemp]);

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
            message: 'Gas Laws lesson started'
         });
      }, 100);
      return () => clearTimeout(timer);
   }, []);

   // Confetti
   useEffect(() => {
      if (phase === 'mastery') {
         const confettiColors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
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
            justifyContent: 'center',
            padding: isMobile ? '10px 12px' : '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            gap: isMobile ? '12px' : '16px'
         }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
               <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
                  {phaseOrder.map((p, i) => (
                     <div
                        key={p}
                        onMouseDown={() => i < currentIdx && goToPhase(p)}
                        style={{
                           height: isMobile ? '10px' : '8px',
                           width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                           borderRadius: '5px',
                           backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                           cursor: i < currentIdx ? 'pointer' : 'default',
                           transition: 'all 0.3s'
                        }}
                     />
                  ))}
               </div>
               <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
                  {currentIdx + 1} / {phaseOrder.length}
               </span>
            </div>
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

   // Piston visualization for Boyle's Law
   const renderPistonViz = () => {
      const containerHeight = (volume / 100) * 150;

      return (
         <svg viewBox="0 0 250 220" style={{ width: '100%', height: '100%' }}>
            <defs>
               <linearGradient id="glPiston" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
               </linearGradient>
               <linearGradient id="glCylinder" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="30%" stopColor="#334155" />
                  <stop offset="70%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
               </linearGradient>
            </defs>

            {/* Background */}
            <rect width="250" height="220" fill={colors.bgDark} />

            {/* Cylinder walls */}
            <rect x="25" y="10" width="200" height="180" rx="5" fill="url(#glCylinder)" stroke={colors.border} strokeWidth="2" />

            {/* Piston */}
            <rect x="30" y={15 + (150 - containerHeight)} width="190" height="20" rx="4" fill="url(#glPiston)" stroke="#475569" strokeWidth="1" />

            {/* Piston handle */}
            <rect x="115" y={0} width="20" height={20 + (150 - containerHeight)} fill="#64748b" />

            {/* Gas molecules */}
            {molecules.map((mol, i) => {
               // Only show molecules within the current container volume
               const adjustedY = mol.y - (150 - containerHeight) + 25;
               if (adjustedY > 35 + (150 - containerHeight) && adjustedY < 185) {
                  return (
                     <circle
                        key={i}
                        cx={mol.x + 25}
                        cy={adjustedY}
                        r="5"
                        fill={colors.primary}
                        opacity="0.8"
                     />
                  );
               }
               return null;
            })}

            {/* Pressure indicator */}
            <g transform="translate(125, 200)">
               <text x="0" y="0" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.primary}>
                  P = {pressure.toFixed(2)} atm
               </text>
            </g>

            {/* Volume label */}
            <g transform="translate(125, 215)">
               <text x="0" y="0" textAnchor="middle" fontSize="11" fill={colors.textMuted}>
                  V = {volume}%
               </text>
            </g>
         </svg>
      );
   };

   // Temperature effect visualization for Charles's Law
   const renderTempViz = () => {
      const containerHeight = (twistVolume / 100) * 150;
      const moleculeSpeed = Math.sqrt(twistTemp / 300);

      return (
         <svg viewBox="0 0 250 220" style={{ width: '100%', height: '100%' }}>
            <defs>
               <linearGradient id="glBalloon" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
                  <stop offset="50%" stopColor={colors.primary} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity="0.3" />
               </linearGradient>
            </defs>

            {/* Background */}
            <rect width="250" height="220" fill={colors.bgDark} />

            {/* Balloon (flexible container at constant pressure) */}
            <ellipse
               cx="125"
               cy={110 - (containerHeight - 100) / 3}
               rx={80 + (twistVolume - 100) * 0.3}
               ry={containerHeight / 2 + 25}
               fill="url(#glBalloon)"
               stroke={colors.accent}
               strokeWidth="2"
            />

            {/* Molecules inside balloon */}
            {molecules.map((mol, i) => {
               const cx = 125 + (mol.x - 100) * 0.8;
               const cy = 110 - (containerHeight - 100) / 3 + (mol.y - 80) * (containerHeight / 150);
               return (
                  <circle
                     key={i}
                     cx={cx}
                     cy={cy}
                     r="4"
                     fill={twistTemp > 350 ? colors.warning : twistTemp < 250 ? colors.accent : colors.primary}
                     opacity="0.8"
                  >
                     {/* Vibration animation based on temperature */}
                     <animate
                        attributeName="cx"
                        values={`${cx - moleculeSpeed * 2};${cx + moleculeSpeed * 2};${cx - moleculeSpeed * 2}`}
                        dur={`${0.3 / moleculeSpeed}s`}
                        repeatCount="indefinite"
                     />
                  </circle>
               );
            })}

            {/* Temperature indicator with color coding */}
            <g transform="translate(125, 200)">
               <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill={twistTemp > 350 ? colors.warning : twistTemp < 250 ? colors.accent : colors.textPrimary}
               >
                  T = {twistTemp} K ({Math.round(twistTemp - 273)}°C)
               </text>
            </g>

            {/* Volume indicator */}
            <g transform="translate(125, 215)">
               <text x="0" y="0" textAnchor="middle" fontSize="11" fill={colors.textMuted}>
                  V = {twistVolume.toFixed(0)}% (P = constant)
               </text>
            </g>
         </svg>
      );
   };

   // Test questions
   const testQuestions = [
      {
         scenario: "You have a sealed syringe containing 20 mL of air at atmospheric pressure (1 atm). You push the plunger in, compressing the air to 10 mL.",
         question: "What is the new pressure inside the syringe (assuming temperature stays constant)?",
         options: [
            { id: '0.5', label: "0.5 atm (pressure decreases)" },
            { id: '1', label: "1 atm (pressure unchanged)" },
            { id: '2', label: "2 atm (pressure doubles)", correct: true },
            { id: '4', label: "4 atm (pressure quadruples)" }
         ],
         explanation: "Boyle's Law: P₁V₁ = P₂V₂. (1 atm)(20 mL) = P₂(10 mL). P₂ = 2 atm. Halving the volume doubles the pressure because the same molecules are now hitting the walls twice as often."
      },
      {
         scenario: "A weather balloon is released at sea level where the atmospheric pressure is 1 atm and temperature is 20°C (293 K). The balloon's volume is 1 m³.",
         question: "As the balloon rises to where pressure is 0.5 atm (same temperature), what happens to its volume?",
         options: [
            { id: 'stays', label: "Stays at 1 m³" },
            { id: 'halves', label: "Decreases to 0.5 m³" },
            { id: 'doubles', label: "Expands to 2 m³", correct: true },
            { id: 'quadruples', label: "Expands to 4 m³" }
         ],
         explanation: "Boyle's Law again: P₁V₁ = P₂V₂. (1 atm)(1 m³) = (0.5 atm)V₂. V₂ = 2 m³. Lower external pressure allows the gas to expand — this is why weather balloons grow as they ascend."
      },
      {
         scenario: "A car tire is inflated to 32 psi (gauge pressure) on a cold winter morning when the temperature is -10°C (263 K). You drive the car and the tires warm up to 40°C (313 K).",
         question: "Approximately what is the tire pressure now? (Assume volume is constant)",
         options: [
            { id: '27', label: "27 psi (pressure decreases)" },
            { id: '32', label: "32 psi (pressure unchanged)" },
            { id: '38', label: "38 psi (pressure increases)", correct: true },
            { id: '52', label: "52 psi (pressure nearly doubles)" }
         ],
         explanation: "Gay-Lussac's Law: P₁/T₁ = P₂/T₂. Using absolute pressure (32 + 14.7 ≈ 47 psi): 47/263 = P₂/313. P₂ ≈ 56 psi absolute, or ~41 psi gauge. Higher temperature means faster molecules hitting walls harder — higher pressure!"
      },
      {
         scenario: "You heat a balloon from room temperature (300 K) to 450 K while keeping the external pressure constant at 1 atm.",
         question: "What happens to the balloon's volume according to Charles's Law?",
         options: [
            { id: 'same', label: "Volume stays the same" },
            { id: 'halves', label: "Volume decreases by half" },
            { id: '1.5x', label: "Volume increases by 50% (1.5× original)", correct: true },
            { id: 'doubles', label: "Volume doubles" }
         ],
         explanation: "Charles's Law: V₁/T₁ = V₂/T₂. V₁/300 = V₂/450. V₂ = 1.5V₁. Temperature and volume are directly proportional at constant pressure. This is how hot air balloons work!"
      },
      {
         scenario: "A scuba diver at 30 meters depth breathes from a tank. The water pressure at this depth is about 4 atm (including surface pressure). A small bubble of air (1 mL) escapes from the diver's regulator.",
         question: "What volume will this bubble be when it reaches the surface (1 atm)?",
         options: [
            { id: '0.25', label: "0.25 mL (bubble shrinks)" },
            { id: '1', label: "1 mL (bubble unchanged)" },
            { id: '4', label: "4 mL (bubble expands 4×)", correct: true },
            { id: '16', label: "16 mL (bubble expands 16×)" }
         ],
         explanation: "Boyle's Law: P₁V₁ = P₂V₂. (4 atm)(1 mL) = (1 atm)V₂. V₂ = 4 mL. This is why divers must never hold their breath while ascending — air in the lungs would expand and cause fatal lung damage!"
      },
      {
         scenario: "The Ideal Gas Law is PV = nRT, where R = 8.314 J/(mol·K). You have 1 mole of gas at 1 atm (101,325 Pa) and 273 K.",
         question: "What volume does this gas occupy?",
         options: [
            { id: '11.2', label: "11.2 liters" },
            { id: '22.4', label: "22.4 liters (molar volume at STP)", correct: true },
            { id: '44.8', label: "44.8 liters" },
            { id: '8.314', label: "8.314 liters" }
         ],
         explanation: "V = nRT/P = (1 mol)(8.314 J/mol·K)(273 K)/(101,325 Pa) = 0.0224 m³ = 22.4 L. This is the famous 'molar volume at STP' — one mole of ANY ideal gas at standard conditions occupies 22.4 liters!"
      },
      {
         scenario: "An aerosol can contains gas at 3 atm when at 25°C (298 K). The label warns: 'Do not expose to temperatures above 50°C.'",
         question: "What would the pressure be at 60°C (333 K), and why is this dangerous?",
         options: [
            { id: '2.7', label: "2.7 atm — pressure decreases with heat" },
            { id: '3', label: "3 atm — pressure stays constant" },
            { id: '3.35', label: "3.35 atm — can may rupture under increased pressure", correct: true },
            { id: '6', label: "6 atm — pressure doubles" }
         ],
         explanation: "Gay-Lussac's Law: P₁/T₁ = P₂/T₂. 3/298 = P₂/333. P₂ = 3.35 atm. The 12% pressure increase may exceed the can's structural limit, causing explosion. Even small temperature changes significantly affect pressure!"
      },
      {
         scenario: "On the molecular level, temperature is related to average kinetic energy of molecules: KE = (3/2)kT, where k is Boltzmann's constant.",
         question: "Why does pressure increase when you heat a gas at constant volume?",
         options: [
            { id: 'more', label: "More molecules are created by heating" },
            { id: 'bigger', label: "Molecules get physically larger" },
            { id: 'faster', label: "Molecules move faster and hit walls harder and more often", correct: true },
            { id: 'attract', label: "Molecules become more attracted to each other" }
         ],
         explanation: "Temperature IS molecular kinetic energy! Higher T means molecules move faster (KE ∝ T). Faster molecules hit the container walls more frequently AND with more force. Both effects increase pressure. P = (1/3)ρv̄², where v̄ increases with T."
      },
      {
         scenario: "Consider the Combined Gas Law: P₁V₁/T₁ = P₂V₂/T₂. A gas at 2 atm, 10 L, and 300 K is changed to 1 atm and 400 K.",
         question: "What is the new volume?",
         options: [
            { id: '6.67', label: "6.67 L" },
            { id: '13.3', label: "13.3 L" },
            { id: '26.7', label: "26.7 L", correct: true },
            { id: '40', label: "40 L" }
         ],
         explanation: "P₁V₁/T₁ = P₂V₂/T₂. (2)(10)/300 = (1)V₂/400. V₂ = (2 × 10 × 400)/(300 × 1) = 26.7 L. Lower pressure (×2) AND higher temperature (×1.33) both increase volume: total factor ≈ 2.67."
      },
      {
         scenario: "Real gases deviate from ideal behavior at high pressures and low temperatures. The Van der Waals equation adds corrections: (P + a/V²)(V - b) = nRT.",
         question: "What do the correction terms 'a' and 'b' account for?",
         options: [
            { id: 'mass', label: "'a' for molecular mass, 'b' for molecule count" },
            { id: 'attraction', label: "'a' for intermolecular attraction (reduces P), 'b' for molecular volume (reduces available V)", correct: true },
            { id: 'temp', label: "'a' for temperature error, 'b' for pressure error" },
            { id: 'shape', label: "'a' for molecular shape, 'b' for container shape" }
         ],
         explanation: "Real molecules attract each other (reducing effective pressure by a/V²) and have actual volume (reducing available space by nb). At high pressure/low temperature, molecules are close together, making these effects significant. Ideal gas assumes point particles with no attraction."
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
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)'
         }}>
            {renderProgressBar()}

            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: isMobile ? '24px 16px' : '40px 24px',
               textAlign: 'center',
               overflow: 'auto'
            }}>
               <div style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: isMobile ? '20px' : '32px',
                  boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
               }}>
                  <span style={{ fontSize: isMobile ? '28px' : '36px' }}>🎈</span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '24px' : '32px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  marginBottom: isMobile ? '12px' : '16px',
                  lineHeight: 1.2
               }}>
                  Gas Laws: PVT Relationships
               </h1>

               <p style={{
                  fontSize: isMobile ? '15px' : '18px',
                  color: '#94a3b8',
                  marginBottom: isMobile ? '24px' : '32px',
                  maxWidth: '480px',
                  lineHeight: 1.6
               }}>
                  Why do balloons <span style={{ color: '#f8fafc', fontWeight: 600 }}>expand</span> when heated and <span style={{ color: '#f8fafc', fontWeight: 600 }}>pop</span> when squeezed?
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
                     { icon: '📊', text: 'Pressure' },
                     { icon: '📦', text: 'Volume' },
                     { icon: '🌡️', text: 'Temperature' }
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
                     background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
                     minHeight: '48px'
                  }}
                  onMouseDown={() => goToPhase('predict')}
               >
                  Explore Gas Behavior →
               </button>

               <p style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: '#64748b',
                  marginTop: isMobile ? '12px' : '16px'
               }}>
                  ~5 minutes • Interactive • Ideal Gas Law
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
                  {renderSectionHeader("Step 1 • Make Your Prediction", "The Syringe Test", "What happens when you compress a gas?")}

                  <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px' }}>
                        {/* Syringe before */}
                        <g transform="translate(30, 20)">
                           <rect x="0" y="10" width="120" height="40" rx="5" fill={colors.bgCardLight} stroke={colors.border} strokeWidth="2" />
                           <rect x="110" y="5" width="10" height="50" fill={colors.textMuted} />
                           <rect x="120" y="20" width="40" height="20" rx="3" fill="#64748b" />
                           <text x="60" y="75" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>Before: V = 20mL</text>
                        </g>

                        {/* Arrow */}
                        <text x="200" y="45" textAnchor="middle" fontSize="20" fill={colors.primary}>→</text>
                        <text x="200" y="65" textAnchor="middle" fontSize="9" fill={colors.textMuted}>Push</text>

                        {/* Syringe after */}
                        <g transform="translate(230, 20)">
                           <rect x="0" y="10" width="60" height="40" rx="5" fill={colors.bgCardLight} stroke={colors.border} strokeWidth="2" />
                           <rect x="50" y="5" width="10" height="50" fill={colors.textMuted} />
                           <rect x="60" y="20" width="40" height="20" rx="3" fill="#64748b" />
                           <text x="60" y="75" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>After: V = 10mL</text>
                        </g>
                     </svg>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Setup:</strong> You seal a syringe containing 20 mL of air at 1 atm pressure. Then you push the plunger to compress the air to 10 mL (half the original volume).
                        <strong style={{ color: colors.primary }}> What happens to the pressure?</strong>
                     </p>
                  </div>

                  <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                     {[
                        { id: 'half', label: 'Pressure decreases to 0.5 atm', desc: 'Less space = less pressure', icon: '📉' },
                        { id: 'same', label: 'Pressure stays at 1 atm', desc: "It's the same amount of air", icon: '➡️' },
                        { id: 'double', label: 'Pressure increases to 2 atm', desc: 'Same molecules in half the space', icon: '📈' },
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
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.secondary }}>Think About It</p>
                     <p style={{ fontSize: '13px', color: colors.textMuted }}>
                        The same number of air molecules are now in half the space. How often will they hit the walls?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!prediction, "Run the Experiment")}
         </div>
      );
   }

   // PLAY Screen - Boyle's Law simulation
   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, minHeight: isMobile ? '45vh' : 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '300px', height: '250px', borderRadius: '16px', overflow: 'hidden', background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderPistonViz()}
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '300px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  overflowY: 'auto',
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none'
               }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.primary }}>Step 2 • Experiment</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>Boyle's Law Lab</h3>
                  </div>

                  {/* P and V display */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted }}>Pressure</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: colors.primary }}>{pressure.toFixed(2)}</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>atm</p>
                     </div>
                     <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted }}>Volume</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: colors.accent }}>{volume}</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>%</p>
                     </div>
                  </div>

                  {/* PV product */}
                  <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.success }}>P × V (Constant!)</p>
                     <p style={{ fontSize: '28px', fontWeight: 800, color: colors.success }}>{(pressure * volume).toFixed(0)}</p>
                  </div>

                  {/* Volume slider */}
                  <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>Volume</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.accent }}>{volume}%</span>
                     </div>
                     <input
                        type="range"
                        min="25"
                        max="200"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: colors.accent }}
                     />
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
                        <span>Compressed</span>
                        <span>Expanded</span>
                     </div>
                  </div>

                  {/* Insight */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.primary }}>Boyle's Law</p>
                     <p style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: colors.textPrimary }}>P₁V₁ = P₂V₂</p>
                     <p style={{ fontSize: '11px', lineHeight: 1.6, color: colors.textSecondary }}>
                        At constant temperature, pressure and volume are <strong style={{ color: colors.textPrimary }}>inversely proportional</strong>.
                        Double the volume → half the pressure!
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, Math.abs(pressure - 1) > 0.5 || Math.abs(volume - 100) > 30, "Understand Why")}
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
                  {renderSectionHeader("Step 3 • Understand the Result", "Boyle's Law Explained", "Same molecules, different space")}

                  <div style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>Boyle's Law (1662)</p>
                     <p style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', color: colors.primary }}>
                        P₁V₁ = P₂V₂
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                        At constant temperature, the product of pressure and volume is constant
                     </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`, border: `1px solid ${colors.primary}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: `${colors.primary}30` }}>
                           <span style={{ fontSize: '24px' }}>🔬</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.primary }}>Molecular Explanation</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Gas pressure comes from molecules <strong style={{ color: colors.textPrimary }}>hitting container walls</strong>.
                           Smaller volume = same molecules hit walls more often = higher pressure.
                        </p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}05 100%)`, border: `1px solid ${colors.accent}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: `${colors.accent}30` }}>
                           <span style={{ fontSize: '24px' }}>📊</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.accent }}>Inverse Relationship</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           P and V are <strong style={{ color: colors.textPrimary }}>inversely proportional</strong>.
                           When one doubles, the other halves. Their product stays constant.
                        </p>
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.secondary }}>Key Takeaways</p>
                     {renderKeyTakeaway("🏊", "Scuba Diving", "Air in lungs expands as divers ascend (lower pressure). Never hold breath while ascending — lung rupture danger!")}
                     {renderKeyTakeaway("🎈", "Weather Balloons", "Balloons expand as they rise because atmospheric pressure decreases with altitude.")}
                     {renderKeyTakeaway("💉", "Syringes", "Pulling the plunger expands volume, lowering pressure and drawing liquid in.")}
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.success }}>Coming Up Next</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        What about <strong style={{ color: colors.textPrimary }}>temperature</strong>? How does heating a gas change its volume or pressure?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Temperature Effects")}
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
                  {renderSectionHeader("Step 4 • Temperature Effects", "Charles's Law", "What happens when you heat a gas?")}

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}30` }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The New Question:</strong> A balloon at room temperature (300 K) is heated to 450 K while kept at constant atmospheric pressure.
                        <strong style={{ color: colors.secondary }}> What happens to its volume?</strong>
                     </p>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px' }}>
                        {/* Balloon before */}
                        <g transform="translate(60, 10)">
                           <ellipse cx="40" cy="35" rx="30" ry="35" fill={colors.accent} opacity="0.3" stroke={colors.accent} strokeWidth="2" />
                           <text x="40" y="40" textAnchor="middle" fontSize="12" fill={colors.textPrimary}>300 K</text>
                           <text x="40" y="90" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>Cool balloon</text>
                        </g>

                        {/* Arrow + heat */}
                        <g transform="translate(175, 30)">
                           <text x="25" y="15" textAnchor="middle" fontSize="20" fill={colors.secondary}>→</text>
                           <text x="25" y="35" textAnchor="middle" fontSize="24">🔥</text>
                        </g>

                        {/* Balloon after */}
                        <g transform="translate(260, 10)">
                           <ellipse cx="50" cy="35" rx="45" ry="40" fill={colors.secondary} opacity="0.2" stroke={colors.secondary} strokeWidth="2" strokeDasharray="4 2" />
                           <text x="50" y="40" textAnchor="middle" fontSize="16" fill={colors.textMuted}>?</text>
                           <text x="50" y="90" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>Hot balloon (450 K)</text>
                        </g>
                     </svg>
                  </div>

                  <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'shrinks', label: 'Balloon shrinks', desc: 'Heat makes molecules move faster and escape' },
                        { id: 'same', label: 'Volume stays the same', desc: "Temperature doesn't affect volume" },
                        { id: 'expands', label: 'Balloon expands (1.5× volume)', desc: 'Hot molecules push outward, increasing volume', correct: true },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setTwistPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'twist_predict',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted Charles's Law: ${opt.label}`
                              });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              padding: '16px',
                              borderRadius: '12px',
                              textAlign: 'left',
                              background: twistPrediction === opt.id ? `${colors.secondary}20` : colors.bgCard,
                              border: `2px solid ${twistPrediction === opt.id ? colors.secondary : colors.border}`,
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
                        Higher temperature means molecules move faster. If pressure stays constant, how does the balloon accommodate faster-moving molecules?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!twistPrediction, "Heat the Balloon", undefined, colors.secondary)}
         </div>
      );
   }

   // TWIST-PLAY Screen - Charles's Law
   if (phase === 'twist_play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, minHeight: isMobile ? '45vh' : 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '300px', height: '250px', borderRadius: '16px', overflow: 'hidden', background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderTempViz()}
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '300px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  overflowY: 'auto',
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none'
               }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.secondary }}>Step 5 • Temperature Effects</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>Charles's Law Lab</h3>
                  </div>

                  {/* T and V display */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted }}>Temperature</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: colors.secondary }}>{twistTemp}</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>K</p>
                     </div>
                     <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted }}>Volume</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: colors.accent }}>{twistVolume.toFixed(0)}</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>%</p>
                     </div>
                  </div>

                  {/* V/T ratio */}
                  <div style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.success }}>V / T (Constant!)</p>
                     <p style={{ fontSize: '28px', fontWeight: 800, color: colors.success }}>{(twistVolume / twistTemp).toFixed(3)}</p>
                  </div>

                  {/* Temperature slider */}
                  <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>Temperature</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.secondary }}>{twistTemp} K</span>
                     </div>
                     <input
                        type="range"
                        min="200"
                        max="500"
                        value={twistTemp}
                        onChange={(e) => setTwistTemp(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: colors.secondary }}
                     />
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
                        <span>Cold (200 K)</span>
                        <span>Hot (500 K)</span>
                     </div>
                  </div>

                  {/* Insight */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.secondary }}>Charles's Law</p>
                     <p style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: colors.textPrimary }}>V₁/T₁ = V₂/T₂</p>
                     <p style={{ fontSize: '11px', lineHeight: 1.6, color: colors.textSecondary }}>
                        At constant pressure, volume and temperature are <strong style={{ color: colors.textPrimary }}>directly proportional</strong>.
                        This is how hot air balloons work!
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, Math.abs(twistTemp - 300) > 50, "Deep Understanding", undefined, colors.secondary)}
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
                  {renderSectionHeader("Step 6 • The Complete Picture", "The Ideal Gas Law", "Combining all three variables")}

                  <div style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>The Ideal Gas Law</p>
                     <p style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px', color: colors.primary }}>
                        PV = nRT
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                        Pressure × Volume = moles × gas constant × Temperature
                     </p>
                  </div>

                  {/* Three gas laws */}
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                     <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCard, border: `1px solid ${colors.primary}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.primary}30`, fontSize: '18px' }}>P·V</div>
                           <div>
                              <p style={{ fontWeight: 700, color: colors.primary }}>Boyle's Law</p>
                              <p style={{ fontSize: '12px', color: colors.textSecondary }}>P₁V₁ = P₂V₂ (constant T)</p>
                           </div>
                        </div>
                     </div>
                     <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCard, border: `1px solid ${colors.secondary}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.secondary}30`, fontSize: '18px' }}>V/T</div>
                           <div>
                              <p style={{ fontWeight: 700, color: colors.secondary }}>Charles's Law</p>
                              <p style={{ fontSize: '12px', color: colors.textSecondary }}>V₁/T₁ = V₂/T₂ (constant P)</p>
                           </div>
                        </div>
                     </div>
                     <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCard, border: `1px solid ${colors.accent}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.accent}30`, fontSize: '18px' }}>P/T</div>
                           <div>
                              <p style={{ fontWeight: 700, color: colors.accent }}>Gay-Lussac's Law</p>
                              <p style={{ fontSize: '12px', color: colors.textSecondary }}>P₁/T₁ = P₂/T₂ (constant V)</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>Key Takeaways</p>
                     {renderKeyTakeaway("🔬", "Kinetic Theory", "Temperature is molecular kinetic energy. Faster molecules = higher T, more wall collisions = higher P, need more space = larger V.")}
                     {renderKeyTakeaway("📊", "Absolute Zero", "At 0 K (-273.15°C), molecular motion stops. Gas laws predict V → 0 as T → 0 K (theoretical limit).")}
                     {renderKeyTakeaway("⚠️", "Real Gases", "Ideal gas law assumes point particles with no attraction. Real gases deviate at high P (molecules close) and low T (attraction matters).")}
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.success }}>The Big Picture</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        PV = nRT connects <strong style={{ color: colors.textPrimary }}>macroscopic measurements</strong> (P, V, T) to the <strong style={{ color: colors.textPrimary }}>microscopic world</strong> of molecules.
                        This single equation explains balloons, scuba diving, engines, weather, and countless other phenomena!
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
            icon: '🏊',
            title: 'Scuba Diving',
            short: 'Pressure & depth',
            tagline: 'Life-or-Death Gas Laws',
            description: "At depth, divers breathe compressed air. As they ascend, the air in their lungs expands (Boyle's Law). Rising too fast without exhaling can cause fatal lung overexpansion — air volume can quadruple from 30m depth!",
            connection: "P₁V₁ = P₂V₂. At 30m, pressure is 4 atm. A 1L breath at depth becomes 4L at surface. Decompression stops allow dissolved nitrogen to safely release.",
            howItWorks: 'Regulators deliver air at ambient pressure. Divers must exhale continuously during ascent. Safety stops at 5m allow gas equilibration.',
            stats: [
               { value: '4×', label: 'Volume change 30m→0m', icon: '🫁' },
               { value: '1 atm', label: 'Per 10m depth', icon: '📊' },
               { value: '18m/min', label: 'Safe ascent rate', icon: '⬆️' }
            ],
            examples: ['Lung overexpansion injury', 'Decompression sickness (the bends)', 'Nitrogen narcosis', 'Oxygen toxicity at depth'],
            companies: ['PADI', 'SSI', 'NAUI', 'Suunto'],
            futureImpact: 'Rebreathers recycle gas, extending dive time and reducing decompression needs.',
            color: colors.primary
         },
         {
            icon: '🎈',
            title: 'Hot Air Balloons',
            short: "Charles's Law flying",
            tagline: 'Temperature Lifts You Up',
            description: "Hot air balloons exploit Charles's Law: heating air makes it expand and become less dense. The balloon envelope traps this lighter air, creating buoyancy. Temperature difference of just 100°C provides significant lift!",
            connection: "V₁/T₁ = V₂/T₂. Heating air from 300K to 400K increases volume by 33%. Same mass in larger volume = lower density = floats on cooler surrounding air.",
            howItWorks: 'Propane burners heat air to ~100°C above ambient. Pilots control altitude by varying burner intensity. Vents release hot air to descend.',
            stats: [
               { value: '100°C', label: 'Typical ΔT', icon: '🔥' },
               { value: '30%', label: 'Density reduction', icon: '⬆️' },
               { value: '300kg', label: 'Typical payload', icon: '🧺' }
            ],
            examples: ['Recreational ballooning', 'Weather observation', 'Advertising', 'Balloon festivals'],
            companies: ['Cameron Balloons', 'Lindstrand', 'Ultra Magic', 'Kubicek'],
            futureImpact: 'Solar-powered stratospheric balloons provide internet access to remote areas (Project Loon concept).',
            color: colors.secondary
         },
         {
            icon: '🚗',
            title: 'Car Engines & Tires',
            short: 'PVT in vehicles',
            tagline: 'Pressure Powers Motion',
            description: "Internal combustion engines compress fuel-air mixture (Boyle's), then ignite it. Rapid heating causes explosive expansion (Gay-Lussac's + Charles's), pushing pistons. Tires also demonstrate gas laws — pressure increases when hot from driving.",
            connection: "Engine: Compress V → increase P → ignite → T skyrockets → P explodes → expands against piston → work! Tires: Constant V + increasing T = increasing P (Gay-Lussac's).",
            howItWorks: "Compression ratio (typically 10:1) determines efficiency. Higher compression = higher peak pressure = more work extracted per cycle.",
            stats: [
               { value: '10:1', label: 'Compression ratio', icon: '🔧' },
               { value: '2500°C', label: 'Combustion temp', icon: '🔥' },
               { value: '10%', label: 'Tire P increase hot', icon: '🛞' }
            ],
            examples: ['Otto cycle (gasoline engines)', 'Diesel cycle (higher compression)', 'Tire pressure monitoring', 'Turbochargers'],
            companies: ['Ford', 'Toyota', 'BMW', 'Michelin'],
            futureImpact: 'Electric vehicles eliminate combustion, but thermal management of batteries still involves gas law principles.',
            color: colors.accent
         },
         {
            icon: '🌡️',
            title: 'Weather & Atmosphere',
            short: 'Atmospheric physics',
            tagline: 'Gas Laws Shape Weather',
            description: "Atmospheric pressure decreases with altitude (Boyle's). Rising air expands and cools adiabatically (Charles's), causing cloud formation. High and low pressure systems drive global weather patterns.",
            connection: "Rising air: Lower P → higher V → temperature drops → water vapor condenses → clouds and rain. This adiabatic cooling rate is ~10°C/km for dry air, ~6°C/km for moist air.",
            howItWorks: "Warm surface air rises, expands, cools. If it cools below dew point, water condenses, releasing latent heat, fueling further rise. This drives thunderstorms!",
            stats: [
               { value: '10°C/km', label: 'Dry adiabatic rate', icon: '📉' },
               { value: '50%', label: 'P at 5.5km', icon: '⛰️' },
               { value: '1013', label: 'Sea level P (hPa)', icon: '🌊' }
            ],
            examples: ['Cloud formation', 'Mountain weather', 'High/low pressure systems', 'Jet streams'],
            companies: ['NOAA', 'Met Office', 'ECMWF', 'WeatherBug'],
            futureImpact: 'Better understanding of atmospheric gas dynamics improves climate models and weather prediction accuracy.',
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
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '32px',
                  boxShadow: '0 20px 60px rgba(139, 92, 246, 0.4)'
               }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>

               <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '16px', color: '#f8fafc' }}>
                  Mastery Achieved!
               </h1>

               <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '480px', lineHeight: 1.6, color: '#94a3b8' }}>
                  You've mastered the <strong style={{ color: '#f8fafc' }}>Gas Laws</strong>!
                  PV = nRT now makes perfect sense.
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '400px', marginBottom: '40px' }}>
                  {[
                     { icon: '📊', label: "Boyle's Law", value: 'Mastered' },
                     { icon: '🌡️', label: "Charles's Law", value: 'Mastered' },
                     { icon: '🎈', label: 'Ideal Gas', value: 'Mastered' }
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
                        message: 'Gas Laws lesson completed!'
                     });
                  }}
                  style={{
                     padding: '18px 48px',
                     fontSize: '16px',
                     fontWeight: 700,
                     background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)'
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

export default GasLawsRenderer;
