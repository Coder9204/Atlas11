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

interface HeatTransferCapacityRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

// --- GLOBAL SOUND UTILITY ---
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
   } catch (e) {
      // Silent fail if audio not available
   }
};

// --- HEAT TRANSFER RENDERER ---
const HeatTransferCapacityRenderer: React.FC<HeatTransferCapacityRendererProps> = ({ onGameEvent, gamePhase }) => {
   type HTPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: HTPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   const getInitialPhase = (): HTPhase => {
      if (gamePhase && validPhases.includes(gamePhase as HTPhase)) {
         return gamePhase as HTPhase;
      }
      return 'hook';
   };

   const [phase, setPhase] = useState<HTPhase>(getInitialPhase);

   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as HTPhase) && gamePhase !== phase) {
         setPhase(gamePhase as HTPhase);
      }
   }, [gamePhase]);

   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [time, setTime] = useState(0);
   const [selectedMaterial, setSelectedMaterial] = useState<'copper' | 'aluminum' | 'steel' | 'glass' | 'wood'>('copper');
   const [heatSource, setHeatSource] = useState(100); // Temperature in °C
   const [barTemperatures, setBarTemperatures] = useState<number[]>(Array(20).fill(25)); // Temperature distribution along bar
   const [isHeating, setIsHeating] = useState(false);
   const [elapsedTime, setElapsedTime] = useState(0);

   // Twist phase - heat capacity
   const [selectedSubstance, setSelectedSubstance] = useState<'water' | 'oil' | 'aluminum' | 'iron'>('water');
   const [substanceTemps, setSubstanceTemps] = useState<Record<string, number>>({ water: 25, oil: 25, aluminum: 25, iron: 25 });
   const [heatingStarted, setHeatingStarted] = useState(false);

   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);
   const [selectedApp, setSelectedApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

   // --- RESPONSIVE DESIGN ---
   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // Emit events to AI coach
   const emitGameEvent = useCallback((
      eventType: GameEvent['eventType'],
      details: GameEvent['details']
   ) => {
      if (onGameEvent) {
         onGameEvent({
            eventType,
            gameType: 'heat_transfer_capacity',
            gameTitle: 'Heat Transfer & Capacity',
            details,
            timestamp: Date.now()
         });
      }
   }, [onGameEvent]);

   // Phase navigation
   const phaseOrder: HTPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const phaseLabels: Record<HTPhase, string> = {
      hook: 'Introduction',
      predict: 'Predict',
      play: 'Experiment',
      review: 'Understanding',
      twist_predict: 'New Variable',
      twist_play: 'Heat Capacity',
      twist_review: 'Deep Insight',
      transfer: 'Real World',
      test: 'Knowledge Test',
      mastery: 'Mastery'
   };

   const isNavigating = useRef(false);

   const goToPhase = useCallback((p: HTPhase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      setPhase(p);
      if (p === 'play') {
         setBarTemperatures(Array(20).fill(25));
         setIsHeating(false);
         setElapsedTime(0);
      }
      if (p === 'twist_play') {
         setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 });
         setHeatingStarted(false);
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

   // Premium color palette
   const colors = {
      primary: '#f97316', // orange-500
      primaryDark: '#ea580c', // orange-600
      accent: '#ef4444', // red-500
      accentDark: '#dc2626', // red-600
      secondary: '#3b82f6', // blue-500
      warning: '#eab308', // yellow-500
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

   // Material properties for thermal conductivity
   const materials: Record<string, { k: number; name: string; color: string; description: string }> = {
      copper: { k: 401, name: 'Copper', color: '#f97316', description: 'Excellent conductor - used in cookware, electronics' },
      aluminum: { k: 237, name: 'Aluminum', color: '#94a3b8', description: 'Good conductor - lightweight, used in heat sinks' },
      steel: { k: 50, name: 'Steel', color: '#64748b', description: 'Moderate conductor - durable, used in construction' },
      glass: { k: 1.05, name: 'Glass', color: '#22d3ee', description: 'Poor conductor - used for insulation, windows' },
      wood: { k: 0.12, name: 'Wood', color: '#a3e635', description: 'Excellent insulator - why wooden spoons stay cool' }
   };

   // Specific heat capacities (J/g·°C)
   const specificHeats: Record<string, { c: number; name: string; color: string }> = {
      water: { c: 4.18, name: 'Water', color: '#3b82f6' },
      oil: { c: 2.0, name: 'Cooking Oil', color: '#eab308' },
      aluminum: { c: 0.90, name: 'Aluminum', color: '#94a3b8' },
      iron: { c: 0.45, name: 'Iron', color: '#64748b' }
   };

   // Heat conduction simulation
   useEffect(() => {
      if (phase === 'play' && isHeating) {
         const interval = setInterval(() => {
            setElapsedTime(t => t + 0.1);
            setBarTemperatures(prev => {
               const newTemps = [...prev];
               const k = materials[selectedMaterial].k;
               const alpha = k * 0.0001; // Thermal diffusivity scale factor

               // Apply heat from source
               newTemps[0] = heatSource;

               // Diffusion equation (simplified 1D heat equation)
               for (let i = 1; i < newTemps.length - 1; i++) {
                  const heatFlow = alpha * (newTemps[i-1] - 2*newTemps[i] + newTemps[i+1]);
                  newTemps[i] = Math.min(heatSource, Math.max(25, newTemps[i] + heatFlow));
               }
               // End loses heat to environment
               newTemps[newTemps.length - 1] = Math.max(25, newTemps[newTemps.length - 1] + alpha * (newTemps[newTemps.length - 2] - newTemps[newTemps.length - 1]) - 0.1);

               return newTemps;
            });
         }, 100);
         return () => clearInterval(interval);
      }
   }, [phase, isHeating, selectedMaterial, heatSource]);

   // Heat capacity simulation
   useEffect(() => {
      if (phase === 'twist_play' && heatingStarted) {
         const interval = setInterval(() => {
            setSubstanceTemps(prev => {
               const newTemps = { ...prev };
               const heatInput = 50; // Joules per tick
               const mass = 100; // grams

               Object.keys(specificHeats).forEach(sub => {
                  if (newTemps[sub] < 100) {
                     // Q = mcΔT → ΔT = Q/(mc)
                     const deltaT = heatInput / (mass * specificHeats[sub].c);
                     newTemps[sub] = Math.min(100, newTemps[sub] + deltaT * 0.1);
                  }
               });

               return newTemps;
            });
         }, 100);
         return () => clearInterval(interval);
      }
   }, [phase, heatingStarted]);

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
            message: 'Heat Transfer & Capacity lesson started'
         });
      }, 100);
      return () => clearTimeout(timer);
   }, []);

   // Confetti for mastery
   useEffect(() => {
      if (phase === 'mastery') {
         const confettiColors = ['#f97316', '#ef4444', '#eab308', '#10b981', '#3b82f6', '#a855f7'];
         setConfetti(Array.from({ length: 60 }, (_, i) => ({
            x: Math.random() * 100, y: Math.random() * 100,
            color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
         })));
      }
   }, [phase]);

   // Helper: render progress bar
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
                        title={phaseLabels[p]}
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

   // Helper: render bottom navigation bar
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
               onMouseDown={() => {
                  if (canGoBack && currentIdx > 0) {
                     goToPhase(phaseOrder[currentIdx - 1]);
                  }
               }}
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
                  if (onNext) {
                     onNext();
                  } else if (currentIdx < phaseOrder.length - 1) {
                     goToPhase(phaseOrder[currentIdx + 1]);
                  }
                  setTimeout(() => { clickedRef.current = false; }, 400);
               }}
            >
               {nextLabel} →
            </button>
         </div>
      );
   };

   // Helper: render section header
   const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
      <div style={{ marginBottom: '24px' }}>
         <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>{phaseName}</p>
         <h2 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary }}>{title}</h2>
         {subtitle && <p style={{ fontSize: '14px', marginTop: '8px', color: colors.textSecondary }}>{subtitle}</p>}
      </div>
   );

   // Helper: key takeaway
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

   // Get temperature color
   const getTempColor = (temp: number) => {
      const t = (temp - 25) / 75; // 0 to 1 from 25°C to 100°C
      if (t < 0.33) return `rgb(${59 + t * 3 * 180}, ${130 - t * 3 * 80}, ${246 - t * 3 * 200})`;
      if (t < 0.66) return `rgb(${239}, ${${180 - (t - 0.33) * 3 * 100}}, ${46})`;
      return `rgb(${239}, ${80 - (t - 0.66) * 3 * 50}, ${68})`;
   };

   // Test questions
   const testQuestions = [
      {
         scenario: "You enter a room where both a metal chair and a wooden chair have been sitting overnight at room temperature (20°C).",
         question: "When you touch them, the metal feels much colder than the wood. Why?",
         options: [
            { id: 'metal_colder', label: "The metal is actually at a lower temperature than the wood" },
            { id: 'conduct', label: "Metal conducts heat away from your hand faster than wood", correct: true },
            { id: 'absorb', label: "Metal absorbs more heat from the room" },
            { id: 'reflect', label: "Metal reflects body heat while wood absorbs it" }
         ],
         explanation: "Both are at 20°C! Metal has high thermal conductivity (k), so it rapidly draws heat from your 37°C hand. Wood is an insulator, transferring heat slowly, so it feels warmer even at the same temperature."
      },
      {
         scenario: "You're cooking soup and want to stir it. You have a metal spoon and a wooden spoon available.",
         question: "After stirring hot soup, why does the wooden spoon handle stay cool while the metal spoon handle becomes hot?",
         options: [
            { id: 'fourier', label: "Fourier's Law: Heat transfer rate Q/t = kA(ΔT/Δx). Wood's low k means slower heat flow", correct: true },
            { id: 'absorb', label: "Wood absorbs all the heat before it reaches the handle" },
            { id: 'reflect', label: "Metal reflects heat toward the handle while wood doesn't" },
            { id: 'expand', label: "Wood expands to block the heat transfer" }
         ],
         explanation: "Fourier's Law governs heat conduction: Q/t = kA(ΔT/Δx). Wood's thermal conductivity is ~3000× lower than metal, meaning the rate of heat transfer through wood is dramatically slower, keeping the handle cool."
      },
      {
         scenario: "A pot of water and a pot of cooking oil (same mass) are placed on identical burners providing equal heat.",
         question: "The oil reaches 100°C much faster than the water. Why?",
         options: [
            { id: 'oil_thinner', label: "Oil is thinner and heat moves through it more easily" },
            { id: 'water_evaporates', label: "Water loses heat through evaporation" },
            { id: 'specific_heat', label: "Water has higher specific heat capacity (4.18 vs 2.0 J/g·°C) - needs more energy per degree", correct: true },
            { id: 'density', label: "Oil is less dense so heats faster" }
         ],
         explanation: "Specific heat capacity (c) is the energy needed to raise 1g by 1°C. Water's high c (4.18 J/g·°C) means it needs ~2× more energy than oil (2.0 J/g·°C) for the same temperature rise. Q = mcΔT!"
      },
      {
         scenario: "You're designing a heat sink for a computer processor that generates significant heat. You need to choose between copper and aluminum.",
         question: "Why is copper often preferred despite being heavier and more expensive?",
         options: [
            { id: 'color', label: "Copper's color helps it radiate heat better" },
            { id: 'higher_k', label: "Copper has higher thermal conductivity (401 vs 237 W/m·K) - transfers heat faster", correct: true },
            { id: 'cheaper', label: "Copper is actually cheaper for the same performance" },
            { id: 'specific_heat', label: "Copper has higher specific heat capacity" }
         ],
         explanation: "Copper's thermal conductivity (k = 401 W/m·K) is 69% higher than aluminum (k = 237 W/m·K). This means heat spreads faster from the processor through copper, preventing hotspots and enabling better cooling."
      },
      {
         scenario: "Coastal cities like San Francisco have much more stable temperatures than inland cities like Sacramento, despite being at similar latitudes.",
         question: "Why does the ocean moderate coastal temperatures?",
         options: [
            { id: 'wind', label: "Ocean breezes blow heat away from the coast" },
            { id: 'reflection', label: "The ocean reflects sunlight better than land" },
            { id: 'high_c', label: "Water's high specific heat capacity absorbs/releases huge amounts of energy with small temperature changes", correct: true },
            { id: 'evaporation', label: "Ocean evaporation cools the air equally day and night" }
         ],
         explanation: "Water's exceptional specific heat (4.18 J/g·°C) means oceans absorb enormous amounts of solar energy during day/summer and release it at night/winter with minimal temperature change. This buffers coastal air temperatures."
      },
      {
         scenario: "A blacksmith heats an iron rod until it glows red-hot (about 500°C) and then plunges it into a barrel of room-temperature water.",
         question: "Assuming no water loss, which final temperature is closest to what you'd expect?",
         options: [
            { id: '250', label: "About 250°C - halfway between" },
            { id: '100', label: "About 100°C - water boils and stops there" },
            { id: '35', label: "About 35-40°C - water barely warms because of its high heat capacity", correct: true },
            { id: '500', label: "About 500°C - the iron heats all the water" }
         ],
         explanation: "Water's high specific heat (4.18 J/g·°C) vs iron's low specific heat (0.45 J/g·°C) means the water can absorb the iron's heat with minimal temperature rise. If masses are similar, Q = mcΔT equilibrium gives a final temperature close to the water's initial temperature."
      },
      {
         scenario: "Double-pane windows have two glass panels with a gap of air or argon gas between them.",
         question: "Why is the air/gas gap so effective at insulating homes?",
         options: [
            { id: 'glass_k', label: "Glass is already an excellent insulator" },
            { id: 'air_k', label: "Air has extremely low thermal conductivity (0.025 W/m·K) - about 40× lower than glass", correct: true },
            { id: 'reflect', label: "The air reflects heat back into the room" },
            { id: 'specific_heat', label: "Air has very high specific heat capacity" }
         ],
         explanation: "Still air is an excellent insulator (k = 0.025 W/m·K), about 40× lower than glass (k = 1.05 W/m·K). The trapped air layer dramatically reduces conductive heat transfer. Argon (k = 0.016 W/m·K) is even better!"
      },
      {
         scenario: "You're comparing two identical-looking pans: one is solid aluminum, the other is aluminum with a copper-clad bottom.",
         question: "What advantage does the copper-clad bottom provide for even cooking?",
         options: [
            { id: 'appearance', label: "The copper looks more professional" },
            { id: 'lighter', label: "Copper makes the pan lighter" },
            { id: 'spread', label: "Copper spreads heat more evenly across the bottom, eliminating hot spots", correct: true },
            { id: 'hotter', label: "Copper can withstand higher temperatures than aluminum" }
         ],
         explanation: "Copper's superior thermal conductivity (401 vs 237 W/m·K) means heat spreads laterally across the pan bottom faster, creating more uniform temperature distribution. This prevents hot spots that can burn food."
      },
      {
         scenario: "A scientist needs to transport biological samples that must remain at exactly 37°C for several hours without active temperature control.",
         question: "What approach would best maintain stable temperature using thermal principles?",
         options: [
            { id: 'metal', label: "Pack samples in metal containers for even temperature" },
            { id: 'vacuum', label: "Use a vacuum container to prevent all heat transfer" },
            { id: 'water', label: "Surround samples with water at 37°C - its high heat capacity maintains temperature", correct: true },
            { id: 'ice', label: "Use ice packs to absorb excess heat" }
         ],
         explanation: "Water's high specific heat capacity (4.18 J/g·°C) makes it a thermal buffer. A large mass of water at 37°C will resist temperature changes, maintaining samples at the target temperature for extended periods despite heat exchange with the environment."
      },
      {
         scenario: "Consider Fourier's Law of heat conduction: Q/t = -kA(dT/dx), where k is thermal conductivity, A is cross-sectional area, and dT/dx is temperature gradient.",
         question: "If you want to MINIMIZE heat loss through a wall, which modification would be MOST effective?",
         options: [
            { id: 'area', label: "Reduce the wall's surface area by 50%" },
            { id: 'thick', label: "Double the wall thickness (reduces dT/dx by half)", correct: true },
            { id: 'temp', label: "Lower the indoor temperature by 5°C" },
            { id: 'paint', label: "Change the wall color to white" }
         ],
         explanation: "From Fourier's Law, Q/t ∝ ΔT/Δx. Doubling wall thickness (Δx) halves the temperature gradient, cutting heat loss in half. This is why thick insulation is so effective - it increases the distance heat must travel."
      }
   ];

   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   // Visualize heat conduction along a bar
   const renderHeatConductionViz = () => {
      const material = materials[selectedMaterial];

      return (
         <svg viewBox="0 0 700 300" style={{ width: '100%', height: '100%' }}>
            <defs>
               <linearGradient id="htFlame" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#fef08a" />
               </linearGradient>
               <filter id="htGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>
            </defs>

            {/* Background */}
            <rect width="700" height="300" fill={colors.bgDark} />

            {/* Heat source (flame) */}
            <g transform="translate(60, 120)">
               {/* Burner base */}
               <rect x="-30" y="80" width="60" height="20" rx="5" fill="#374151" />
               <rect x="-25" y="75" width="50" height="10" rx="3" fill="#1f2937" />

               {/* Flame */}
               {isHeating && (
                  <g>
                     <ellipse cx="0" cy="50" rx="20" ry="35" fill="url(#htFlame)" opacity="0.9">
                        <animate attributeName="ry" values="30;40;30" dur="0.3s" repeatCount="indefinite" />
                     </ellipse>
                     <ellipse cx="0" cy="45" rx="12" ry="25" fill="#fef9c3" opacity="0.8">
                        <animate attributeName="ry" values="20;28;20" dur="0.25s" repeatCount="indefinite" />
                     </ellipse>
                  </g>
               )}

               {/* Temperature indicator */}
               <text x="0" y="115" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.primary}>
                  {heatSource}°C
               </text>
            </g>

            {/* Metal bar */}
            <g transform="translate(100, 140)">
               {/* Bar shadow */}
               <rect x="0" y="5" width="500" height="40" rx="4" fill="#000" opacity="0.3" />

               {/* Bar segments with temperature colors */}
               {barTemperatures.map((temp, i) => {
                  const segmentWidth = 500 / barTemperatures.length;
                  const t = Math.min(1, Math.max(0, (temp - 25) / 75));

                  // Color interpolation: blue (cold) -> orange -> red (hot)
                  let r, g, b;
                  if (t < 0.5) {
                     r = Math.round(59 + t * 2 * 180);
                     g = Math.round(130 - t * 2 * 50);
                     b = Math.round(246 - t * 2 * 200);
                  } else {
                     r = 239;
                     g = Math.round(80 - (t - 0.5) * 2 * 50);
                     b = Math.round(46 + (t - 0.5) * 2 * 20);
                  }

                  return (
                     <rect
                        key={i}
                        x={i * segmentWidth}
                        y="0"
                        width={segmentWidth + 1}
                        height="40"
                        rx={i === 0 ? 4 : i === barTemperatures.length - 1 ? 4 : 0}
                        fill={`rgb(${r},${g},${b})`}
                        style={{ transition: 'fill 0.1s' }}
                     />
                  );
               })}

               {/* Bar outline */}
               <rect x="0" y="0" width="500" height="40" rx="4" fill="none" stroke={colors.border} strokeWidth="2" />

               {/* Material label */}
               <text x="250" y="28" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.textPrimary}>
                  {material.name} Bar (k = {material.k} W/m·K)
               </text>

               {/* Temperature markers */}
               <text x="0" y="60" textAnchor="start" fontSize="11" fill={colors.textMuted}>
                  Hot End: {Math.round(barTemperatures[0])}°C
               </text>
               <text x="500" y="60" textAnchor="end" fontSize="11" fill={colors.textMuted}>
                  Cold End: {Math.round(barTemperatures[barTemperatures.length - 1])}°C
               </text>
            </g>

            {/* Heat flow arrows */}
            {isHeating && (
               <g>
                  {[0, 1, 2, 3].map(i => {
                     const x = 150 + i * 120;
                     const opacity = Math.max(0.2, 1 - i * 0.25);
                     const speed = 2 - i * 0.3;
                     return (
                        <g key={i}>
                           <path
                              d={`M ${x} 160 L ${x + 40} 160`}
                              stroke={colors.primary}
                              strokeWidth="3"
                              opacity={opacity}
                              markerEnd="url(#htArrow)"
                           >
                              <animate attributeName="opacity" values={`${opacity};${opacity * 0.5};${opacity}`} dur={`${speed}s`} repeatCount="indefinite" />
                           </path>
                           <text x={x + 20} y="145" textAnchor="middle" fontSize="10" fill={colors.primary} opacity={opacity}>
                              Q →
                           </text>
                        </g>
                     );
                  })}
               </g>
            )}

            {/* Arrow marker */}
            <defs>
               <marker id="htArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill={colors.primary} />
               </marker>
            </defs>

            {/* Elapsed time */}
            <text x="650" y="30" textAnchor="end" fontSize="14" fontWeight="bold" fill={colors.textMuted}>
               Time: {elapsedTime.toFixed(1)}s
            </text>

            {/* Fourier's Law equation */}
            <g transform="translate(350, 250)">
               <rect x="-150" y="-15" width="300" height="40" rx="8" fill={colors.bgCard} stroke={colors.border} />
               <text x="0" y="10" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.primary}>
                  Fourier's Law: Q/t = -kA(dT/dx)
               </text>
            </g>
         </svg>
      );
   };

   // Visualize heat capacity comparison
   const renderHeatCapacityViz = () => {
      return (
         <svg viewBox="0 0 700 320" style={{ width: '100%', height: '100%' }}>
            {/* Background */}
            <rect width="700" height="320" fill={colors.bgDark} />

            {/* Four beakers with substances */}
            {Object.entries(specificHeats).map(([key, data], idx) => {
               const x = 90 + idx * 150;
               const temp = substanceTemps[key];
               const fillHeight = ((temp - 25) / 75) * 100;

               return (
                  <g key={key} transform={`translate(${x}, 40)`}>
                     {/* Beaker */}
                     <path
                        d="M 0 0 L 0 120 Q 0 140 20 140 L 60 140 Q 80 140 80 120 L 80 0 Z"
                        fill={colors.bgCard}
                        stroke={colors.border}
                        strokeWidth="2"
                     />

                     {/* Liquid with temperature-based fill */}
                     <clipPath id={`htBeaker${idx}`}>
                        <path d="M 2 2 L 2 118 Q 2 138 22 138 L 58 138 Q 78 138 78 118 L 78 2 Z" />
                     </clipPath>
                     <rect
                        x="2"
                        y={140 - fillHeight - 20}
                        width="76"
                        height={fillHeight + 20}
                        fill={data.color}
                        opacity={0.6 + (temp - 25) / 150}
                        clipPath={`url(#htBeaker${idx})`}
                     />

                     {/* Bubbles when hot */}
                     {heatingStarted && temp > 50 && (
                        <g>
                           {[0, 1, 2].map(i => (
                              <circle
                                 key={i}
                                 cx={20 + i * 20}
                                 r="4"
                                 fill={data.color}
                                 opacity="0.5"
                              >
                                 <animate
                                    attributeName="cy"
                                    values={`${130 - (temp - 50)};${80};${130 - (temp - 50)}`}
                                    dur={`${1 + i * 0.3}s`}
                                    repeatCount="indefinite"
                                 />
                              </circle>
                           ))}
                        </g>
                     )}

                     {/* Temperature reading */}
                     <rect x="10" y="50" width="60" height="25" rx="4" fill={colors.bgDark} opacity="0.8" />
                     <text x="40" y="68" textAnchor="middle" fontSize="14" fontWeight="bold" fill={temp > 80 ? colors.danger : colors.textPrimary}>
                        {Math.round(temp)}°C
                     </text>

                     {/* Label */}
                     <text x="40" y="165" textAnchor="middle" fontSize="12" fontWeight="bold" fill={data.color}>
                        {data.name}
                     </text>
                     <text x="40" y="180" textAnchor="middle" fontSize="10" fill={colors.textMuted}>
                        c = {data.c} J/g·°C
                     </text>

                     {/* Flame under each beaker */}
                     {heatingStarted && (
                        <g transform="translate(40, 145)">
                           <ellipse cx="0" cy="15" rx="15" ry="20" fill="url(#htFlame)" opacity="0.7">
                              <animate attributeName="ry" values="18;24;18" dur="0.3s" repeatCount="indefinite" />
                           </ellipse>
                        </g>
                     )}
                  </g>
               );
            })}

            {/* Flame gradient */}
            <defs>
               <linearGradient id="htFlame" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#fef08a" />
               </linearGradient>
            </defs>

            {/* Legend */}
            <g transform="translate(350, 220)">
               <rect x="-180" y="-10" width="360" height="90" rx="8" fill={colors.bgCard} stroke={colors.border} />
               <text x="0" y="15" textAnchor="middle" fontSize="14" fontWeight="bold" fill={colors.primary}>
                  Q = mcΔT
               </text>
               <text x="0" y="35" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>
                  Same heat input (Q), same mass (m)
               </text>
               <text x="0" y="52" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>
                  Higher specific heat (c) = smaller temperature change (ΔT)
               </text>
               <text x="0" y="72" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.warning}>
                  Water's high c makes it an excellent thermal buffer!
               </text>
            </g>
         </svg>
      );
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
                  background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: isMobile ? '20px' : '32px',
                  boxShadow: '0 20px 60px rgba(249, 115, 22, 0.3)'
               }}>
                  <span style={{ fontSize: isMobile ? '28px' : '36px' }}>🔥</span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '24px' : '32px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  marginBottom: isMobile ? '12px' : '16px',
                  lineHeight: 1.2
               }}>
                  Heat Transfer & Thermal Capacity
               </h1>

               <p style={{
                  fontSize: isMobile ? '15px' : '18px',
                  color: '#94a3b8',
                  marginBottom: isMobile ? '24px' : '32px',
                  maxWidth: '480px',
                  lineHeight: 1.6
               }}>
                  Why does metal feel <span style={{ color: '#f8fafc', fontWeight: 600 }}>cold</span> and wood feel <span style={{ color: '#f8fafc', fontWeight: 600 }}>warm</span> at the same temperature?
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
                     { icon: '🌡️', text: 'Temperature' },
                     { icon: '⚡', text: 'Conduction' },
                     { icon: '💧', text: 'Capacity' }
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
                     background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 8px 32px rgba(249, 115, 22, 0.4)',
                     minHeight: '48px'
                  }}
                  onMouseDown={() => goToPhase('predict')}
               >
                  Start Exploring →
               </button>

               <p style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: '#64748b',
                  marginTop: isMobile ? '12px' : '16px'
               }}>
                  ~5 minutes • Interactive • Fourier's Law
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
                  {renderSectionHeader("Step 1 • Make Your Prediction", "The Touch Test", "Both objects are at the same room temperature...")}

                  <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 400 150" style={{ width: '100%', height: '150px' }}>
                        {/* Metal spoon */}
                        <g transform="translate(50, 30)">
                           <ellipse cx="40" cy="20" rx="35" ry="18" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
                           <rect x="70" y="15" width="80" height="10" rx="5" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                           <text x="40" y="55" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Metal Spoon</text>
                           <text x="40" y="70" textAnchor="middle" fontSize="10" fill={colors.textMuted}>20°C</text>
                        </g>

                        {/* Wooden spoon */}
                        <g transform="translate(220, 30)">
                           <ellipse cx="40" cy="20" rx="35" ry="18" fill="#a3e635" stroke="#65a30d" strokeWidth="2" />
                           <rect x="70" y="15" width="80" height="10" rx="5" fill="#a3e635" stroke="#65a30d" strokeWidth="1" />
                           <text x="40" y="55" textAnchor="middle" fontSize="11" fill={colors.textSecondary}>Wooden Spoon</text>
                           <text x="40" y="70" textAnchor="middle" fontSize="10" fill={colors.textMuted}>20°C</text>
                        </g>

                        {/* Hand touching */}
                        <text x="200" y="110" textAnchor="middle" fontSize="30">✋</text>
                        <text x="200" y="140" textAnchor="middle" fontSize="12" fill={colors.primary}>Your hand: 37°C</text>
                     </svg>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Setup:</strong> A metal spoon and a wooden spoon have been sitting at room temperature (20°C) all day.
                        <strong style={{ color: colors.primary }}> When you touch them, which will feel colder?</strong>
                     </p>
                  </div>

                  <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                     {[
                        { id: 'metal', label: 'Metal feels colder', desc: "Metal feels cold even though it's the same temperature", icon: '🥄' },
                        { id: 'wood', label: 'Wood feels colder', desc: 'Wood feels cold because of its natural properties', icon: '🪵' },
                        { id: 'same', label: 'Both feel the same', desc: "They're the same temperature, so they should feel identical", icon: '=' },
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
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                           }}
                        >
                           <div style={{ fontSize: '24px' }}>{opt.icon}</div>
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, marginBottom: '4px', color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</p>
                           </div>
                           {prediction === opt.id && (
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.primary }}>
                                 <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                              </div>
                           )}
                        </button>
                     ))}
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.warning }}>Think About It</p>
                     <p style={{ fontSize: '13px', color: colors.textMuted }}>
                        If both objects are truly at the same temperature, why might they feel different to your touch?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!prediction, "Run the Experiment")}
         </div>
      );
   }

   // PLAY Screen - Heat conduction simulation
   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, minHeight: isMobile ? '50vh' : 'auto', padding: '12px', background: colors.bgDark }}>
                  <div style={{ height: '100%', borderRadius: '16px', overflow: 'hidden', background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderHeatConductionViz()}
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '320px',
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
                     <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>Heat Conduction Lab</h3>
                  </div>

                  {/* Material selector */}
                  <div>
                     <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.textMuted }}>Select Material:</p>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {Object.entries(materials).map(([key, mat]) => (
                           <button
                              key={key}
                              onMouseDown={() => {
                                 setSelectedMaterial(key as any);
                                 setBarTemperatures(Array(20).fill(25));
                                 setIsHeating(false);
                                 setElapsedTime(0);
                              }}
                              style={{
                                 padding: '10px',
                                 borderRadius: '8px',
                                 fontSize: '11px',
                                 fontWeight: 600,
                                 background: selectedMaterial === key ? `${mat.color}30` : colors.bgCardLight,
                                 border: `2px solid ${selectedMaterial === key ? mat.color : colors.border}`,
                                 color: selectedMaterial === key ? mat.color : colors.textSecondary,
                                 cursor: 'pointer'
                              }}
                           >
                              {mat.name}
                              <br />
                              <span style={{ fontSize: '9px', opacity: 0.7 }}>k={mat.k}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Heat source temperature */}
                  <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>Heat Source</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>{heatSource}°C</span>
                     </div>
                     <input
                        type="range"
                        min="50"
                        max="200"
                        value={heatSource}
                        onChange={(e) => setHeatSource(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: colors.primary }}
                     />
                  </div>

                  {/* Start/Reset buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button
                        onMouseDown={() => setIsHeating(!isHeating)}
                        style={{
                           flex: 1,
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
                        {isHeating ? '⏸ Pause' : '🔥 Start Heating'}
                     </button>
                     <button
                        onMouseDown={() => {
                           setBarTemperatures(Array(20).fill(25));
                           setIsHeating(false);
                           setElapsedTime(0);
                        }}
                        style={{
                           padding: '14px 20px',
                           borderRadius: '12px',
                           fontWeight: 600,
                           background: colors.bgCardLight,
                           color: colors.textSecondary,
                           border: `1px solid ${colors.border}`,
                           cursor: 'pointer'
                        }}
                     >
                        🔄
                     </button>
                  </div>

                  {/* Insight */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.primary }}>What's Happening?</p>
                     <p style={{ fontSize: '11px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>Thermal conductivity (k)</strong> determines how fast heat flows through a material.
                        Higher k = faster heat transfer!
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, elapsedTime > 3, "Understand Why")}
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
                  {renderSectionHeader("Step 3 • Understand the Result", "Thermal Conductivity", "It's not about temperature — it's about heat FLOW")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`, border: `1px solid ${colors.primary}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: `${colors.primary}30` }}>
                           <span style={{ fontSize: '24px' }}>🥄</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.primary }}>Metal (High k)</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Rapidly conducts heat <strong style={{ color: colors.textPrimary }}>away from your hand</strong>. Your nerves sense the fast heat loss as "cold."
                        </p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.success}20 0%, ${colors.success}05 100%)`, border: `1px solid ${colors.success}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: `${colors.success}30` }}>
                           <span style={{ fontSize: '24px' }}>🪵</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.success }}>Wood (Low k)</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Barely conducts heat. Your hand stays <strong style={{ color: colors.textPrimary }}>warm</strong> because heat isn't being drawn away quickly.
                        </p>
                     </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>Fourier's Law of Heat Conduction</p>
                     <p style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: colors.primary }}>
                        Q/t = -kA(dT/dx)
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                        Heat flow rate depends on: <strong style={{ color: colors.textPrimary }}>conductivity (k)</strong>, area (A), and temperature gradient (dT/dx)
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.warning }}>Key Takeaways</p>
                     {renderKeyTakeaway("🌡️", "Temperature ≠ Thermal Sensation", "What you feel is the RATE of heat transfer to/from your body, not the object's actual temperature.")}
                     {renderKeyTakeaway("⚡", "Conductivity Matters", "High-k materials (metals) feel cold because they rapidly draw heat from your warm hand.")}
                     {renderKeyTakeaway("🧤", "Why Insulators Feel Warm", "Low-k materials (wood, plastic) feel warm because they don't steal your body heat quickly.")}
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}30` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.secondary }}>Coming Up Next</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        What about <strong style={{ color: colors.textPrimary }}>storing heat</strong>? Why does water take forever to boil, but a metal pan heats up instantly?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Heat Capacity")}
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
                  {renderSectionHeader("Step 4 • Heat Capacity", "The Boiling Challenge", "Not all substances heat up at the same rate...")}

                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}30` }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The New Question:</strong> You put equal masses of water, oil, aluminum, and iron on identical burners providing equal heat.
                        <strong style={{ color: colors.secondary }}> Which reaches 100°C first?</strong>
                     </p>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px' }}>
                        {[
                           { name: 'Water', color: '#3b82f6', x: 40 },
                           { name: 'Oil', color: '#eab308', x: 130 },
                           { name: 'Aluminum', color: '#94a3b8', x: 220 },
                           { name: 'Iron', color: '#64748b', x: 310 }
                        ].map((item, i) => (
                           <g key={i} transform={`translate(${item.x}, 10)`}>
                              <rect x="0" y="0" width="50" height="50" rx="5" fill={item.color} opacity="0.3" stroke={item.color} strokeWidth="2" />
                              <text x="25" y="35" textAnchor="middle" fontSize="14" fill={colors.textPrimary}>?</text>
                              <text x="25" y="75" textAnchor="middle" fontSize="10" fill={colors.textMuted}>{item.name}</text>
                              {/* Flame */}
                              <ellipse cx="25" cy="90" rx="12" ry="8" fill="#f97316" opacity="0.5" />
                           </g>
                        ))}
                     </svg>
                  </div>

                  <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'water', label: 'Water heats fastest', desc: 'Water is the most common liquid' },
                        { id: 'oil', label: 'Oil heats fastest', desc: "Oil is used for frying because it gets hot" },
                        { id: 'metal', label: 'Metals heat fastest', desc: 'Metals conduct heat well, so they should heat quickly', correct: true },
                        { id: 'all_same', label: 'All heat at the same rate', desc: 'Same heat input means same temperature change' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setTwistPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'twist_predict',
                                 prediction: opt.id,
                                 predictionLabel: opt.label,
                                 message: `User predicted heat capacity: ${opt.label}`
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
                        Does conducting heat well (high k) mean a material heats up quickly? Or is there another property at play?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!twistPrediction, "Start Heating", undefined, colors.secondary)}
         </div>
      );
   }

   // TWIST-PLAY Screen - Heat capacity simulation
   if (phase === 'twist_play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, minHeight: isMobile ? '50vh' : 'auto', padding: '12px', background: colors.bgDark }}>
                  <div style={{ height: '100%', borderRadius: '16px', overflow: 'hidden', background: '#030712', border: `1px solid ${colors.border}` }}>
                     {renderHeatCapacityViz()}
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '320px',
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
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: colors.secondary }}>Step 5 • Heat Capacity</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>Heating Race</h3>
                  </div>

                  {/* Temperature display */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                     {Object.entries(specificHeats).map(([key, data]) => (
                        <div key={key} style={{
                           padding: '12px',
                           borderRadius: '8px',
                           textAlign: 'center',
                           background: colors.bgCardLight,
                           border: `2px solid ${substanceTemps[key] >= 100 ? colors.success : data.color}`
                        }}>
                           <p style={{ fontSize: '10px', fontWeight: 600, color: data.color }}>{data.name}</p>
                           <p style={{ fontSize: '20px', fontWeight: 800, color: substanceTemps[key] >= 100 ? colors.success : colors.textPrimary }}>
                              {Math.round(substanceTemps[key])}°C
                           </p>
                           <p style={{ fontSize: '9px', color: colors.textMuted }}>c = {data.c}</p>
                           {substanceTemps[key] >= 100 && <span style={{ fontSize: '12px' }}>🏆</span>}
                        </div>
                     ))}
                  </div>

                  {/* Start button */}
                  <button
                     onMouseDown={() => setHeatingStarted(!heatingStarted)}
                     style={{
                        padding: '14px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: heatingStarted ? colors.danger : `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 4px 20px ${heatingStarted ? colors.danger : colors.secondary}40`
                     }}
                  >
                     {heatingStarted ? '⏸ Pause Heating' : '🔥 Start All Burners'}
                  </button>

                  {/* Reset button */}
                  <button
                     onMouseDown={() => {
                        setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 });
                        setHeatingStarted(false);
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
                     🔄 Reset All
                  </button>

                  {/* Explanation */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: colors.secondary }}>Specific Heat Capacity</p>
                     <p style={{ fontSize: '11px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>c = energy needed to raise 1g by 1°C</strong>
                        <br /><br />
                        Water (c=4.18) needs 4× more energy than iron (c=0.45) for the same temperature rise!
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, Object.values(substanceTemps).some(t => t >= 100), "Deep Understanding", undefined, colors.secondary)}
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
                  {renderSectionHeader("Step 6 • Deep Understanding", "Heat Capacity Explained", "Why some materials resist temperature change")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.secondary}20 0%, ${colors.secondary}05 100%)`, border: `1px solid ${colors.secondary}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.secondary}30` }}>
                              <span style={{ fontSize: '20px' }}>💧</span>
                           </div>
                           <p style={{ fontWeight: 700, color: colors.secondary }}>High Specific Heat</p>
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '12px', color: colors.textSecondary }}>
                           Water (c = 4.18 J/g·°C) can absorb <strong style={{ color: colors.textPrimary }}>massive amounts of energy</strong> with small temperature changes.
                        </p>
                        <div style={{ padding: '8px', borderRadius: '8px', textAlign: 'center', background: `${colors.secondary}20` }}>
                           <p style={{ fontSize: '11px', fontWeight: 700, color: colors.secondary }}>Resists heating/cooling</p>
                        </div>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`, border: `1px solid ${colors.primary}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors.primary}30` }}>
                              <span style={{ fontSize: '20px' }}>🔩</span>
                           </div>
                           <p style={{ fontWeight: 700, color: colors.primary }}>Low Specific Heat</p>
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '12px', color: colors.textSecondary }}>
                           Metals (c ≈ 0.4-0.9 J/g·°C) heat up <strong style={{ color: colors.textPrimary }}>quickly</strong> with small energy input.
                        </p>
                        <div style={{ padding: '8px', borderRadius: '8px', textAlign: 'center', background: `${colors.primary}20` }}>
                           <p style={{ fontSize: '11px', fontWeight: 700, color: colors.primary }}>Rapid temperature change</p>
                        </div>
                     </div>
                  </div>

                  <div style={{ padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>The Heat Equation</p>
                     <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: colors.secondary }}>
                        Q = mcΔT
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                        Heat (Q) = mass (m) × specific heat (c) × temperature change (ΔT)
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>Key Takeaways</p>
                     {renderKeyTakeaway("💧", "Water: The Thermal Buffer", "Water's exceptionally high specific heat makes it ideal for cooling systems, climate regulation, and thermal storage.")}
                     {renderKeyTakeaway("🔥", "Metals: Quick to Heat", "Low specific heat means metals heat up fast (great for cooking) but also cool down fast.")}
                     {renderKeyTakeaway("🌡️", "Two Properties, Two Roles", "Thermal conductivity (k) = how fast heat spreads. Specific heat (c) = how much energy to change temperature.")}
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.success }}>The Big Picture</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                        These two properties explain everything from why <strong style={{ color: colors.textPrimary }}>coastal cities have mild weather</strong> (ocean's high heat capacity) to why
                        <strong style={{ color: colors.textPrimary }}> computer chips need heat sinks</strong> (high-k metals spreading heat away).
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Real World Applications", undefined, colors.success)}
         </div>
      );
   }

   // TRANSFER Screen - Real-world applications
   if (phase === 'transfer') {
      const realWorldApps = [
         {
            icon: '🍳',
            title: 'Cooking & Cookware',
            short: 'Heat distribution',
            tagline: 'Why Copper Pans Cost More',
            description: "High-quality cookware uses copper or aluminum bottoms for even heat distribution. Cast iron's high heat capacity maintains temperature when food is added. Wooden handles stay cool due to low thermal conductivity.",
            connection: "Fourier's Law explains why copper-clad pans cook more evenly: higher k means heat spreads faster laterally, eliminating hot spots that burn food.",
            howItWorks: 'Multi-layer pans combine materials: copper for spreading, stainless steel for durability, aluminum for lightweight heat distribution.',
            stats: [
               { value: '401', label: 'Copper k (W/m·K)', icon: '🥇' },
               { value: '50%', label: 'Less burning', icon: '✨' },
               { value: '$500+', label: 'Pro pan cost', icon: '💰' }
            ],
            examples: ['Copper pans spread heat evenly', 'Cast iron retains heat for searing', 'Wooden spoons stay cool', 'Double-wall mugs insulate'],
            companies: ['All-Clad', 'Le Creuset', 'Mauviel', 'Lodge'],
            futureImpact: 'Smart cookware with embedded sensors optimizes cooking based on thermal properties.',
            color: colors.primary
         },
         {
            icon: '🏠',
            title: 'Building Insulation',
            short: 'Energy efficiency',
            tagline: 'Keeping Heat Where You Want It',
            description: "Buildings use low-conductivity materials (fiberglass, foam, aerogel) to minimize heat transfer. Double-pane windows trap air—an excellent insulator with k = 0.025 W/m·K.",
            connection: "Fourier's Law shows that doubling wall thickness halves heat loss. Air gaps work because still air is 1,600× less conductive than concrete.",
            howItWorks: 'R-value measures thermal resistance: higher R = better insulation. R = thickness ÷ k',
            stats: [
               { value: 'R-60', label: 'Best attic insulation', icon: '🏠' },
               { value: '40%', label: 'Energy savings', icon: '💚' },
               { value: '0.014', label: 'Aerogel k', icon: '🧊' }
            ],
            examples: ['Double-pane windows', 'Fiberglass batting', 'Spray foam insulation', 'Thermal breaks in metal frames'],
            companies: ['Owens Corning', 'BASF', 'Dow', '3M'],
            futureImpact: 'Aerogel and vacuum insulation panels enable super-thin, highly efficient building envelopes.',
            color: colors.success
         },
         {
            icon: '💻',
            title: 'Electronics Cooling',
            short: 'Heat sink design',
            tagline: 'Keeping Processors Cool',
            description: "Computer processors generate intense heat in tiny areas. Heat sinks use high-k metals (copper, aluminum) to spread heat, while thermal paste fills microscopic air gaps that would otherwise insulate.",
            connection: 'Heat sinks exploit thermal conductivity to spread concentrated heat across large surface areas, where it can dissipate to air via convection.',
            howItWorks: 'Heat flows from CPU → thermal paste → heat sink base → fins → air. Each step requires high thermal conductivity.',
            stats: [
               { value: '150W', label: 'High-end CPU heat', icon: '🔥' },
               { value: '8.5', label: 'Thermal paste k', icon: '💧' },
               { value: '50°C', label: 'Target temp drop', icon: '❄️' }
            ],
            examples: ['CPU heat sinks', 'Liquid cooling loops', 'Thermal paste compounds', 'Vapor chamber cooling'],
            companies: ['Noctua', 'Corsair', 'Thermal Grizzly', 'NZXT'],
            futureImpact: 'Diamond-based thermal interface materials and 3D-printed heat sinks push cooling limits.',
            color: colors.accent
         },
         {
            icon: '🌊',
            title: 'Climate & Weather',
            short: 'Ocean heat capacity',
            tagline: "Earth's Temperature Buffer",
            description: "Oceans absorb 90% of global warming's excess heat. Water's high specific heat capacity (4.18 J/g·°C) moderates temperature swings, making coastal cities milder than inland areas.",
            connection: "The heat equation Q = mcΔT explains why oceans can absorb enormous energy with minimal temperature change—they're the planet's thermal battery.",
            howItWorks: 'During day/summer, water absorbs heat slowly. At night/winter, it releases heat slowly, buffering air temperatures.',
            stats: [
               { value: '4.18', label: 'Water c (J/g·°C)', icon: '💧' },
               { value: '90%', label: 'Heat absorbed', icon: '🌡️' },
               { value: '20°C', label: 'Land-sea diff', icon: '🏖️' }
            ],
            examples: ['Mild coastal climates', 'Lake-effect weather', 'Ocean heat storage', 'Water-cooled cities'],
            companies: ['NOAA', 'NASA', 'IPCC', 'Woods Hole'],
            futureImpact: 'Understanding ocean heat capacity is crucial for climate modeling and predicting extreme weather.',
            color: colors.secondary
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

         if (selectedApp < 3) {
            setSelectedApp(selectedApp + 1);
         }
      };

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            {/* Header with tabs */}
            <div style={{ padding: '16px', background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>Step 7 • Real World Applications</p>
                     <p style={{ fontSize: '11px', marginTop: '4px', color: colors.textMuted }}>{completedCount}/4 completed — {allCompleted ? 'Ready for test!' : 'Complete all to unlock test'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                     {completedApps.map((completed, i) => (
                        <div key={i} style={{
                           width: '12px',
                           height: '12px',
                           borderRadius: '50%',
                           background: completed ? colors.success : i === selectedApp ? realWorldApps[i].color : colors.bgCardLight,
                           boxShadow: i === selectedApp ? `0 0 8px ${realWorldApps[i].color}` : 'none',
                           transition: 'all 0.3s'
                        }} />
                     ))}
                  </div>
               </div>

               {/* Tab buttons */}
               <div style={{ display: 'flex', gap: '8px' }}>
                  {realWorldApps.map((app, i) => {
                     const isCompleted = completedApps[i];
                     const isCurrent = selectedApp === i;
                     const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

                     return (
                        <button
                           key={i}
                           onMouseDown={() => {
                              if (!isLocked) setSelectedApp(i);
                           }}
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

            {/* Main content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
               <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {/* Hero */}
                  <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${currentApp.color}05 100%)`, border: `1px solid ${currentApp.color}30` }}>
                     <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                           <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: `${currentApp.color}30`, border: `2px solid ${currentApp.color}` }}>
                              {currentApp.icon}
                           </div>
                           <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                 <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary }}>{currentApp.title}</h2>
                                 {isCurrentCompleted && <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: colors.success, color: 'white' }}>✓ Completed</span>}
                              </div>
                              <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', color: currentApp.color }}>{currentApp.tagline}</p>
                           </div>
                        </div>
                        <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '20px', color: colors.textSecondary }}>{currentApp.description}</p>

                        {/* Stats */}
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

                  {/* Connection to physics */}
                  <div style={{ padding: '20px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: currentApp.color }}>Physics Connection</p>
                     <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>{currentApp.connection}</p>
                  </div>

                  {/* Examples */}
                  <div style={{ padding: '20px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>Real Examples</p>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {currentApp.examples.map((ex, i) => (
                           <div key={i} style={{ padding: '10px', borderRadius: '8px', fontSize: '12px', background: colors.bgCardLight, color: colors.textSecondary }}>
                              • {ex}
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Continue button */}
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

               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
                  <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                     <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                        {percentage >= 90 ? 'You\'ve mastered heat transfer and thermal capacity!' :
                         percentage >= 70 ? 'Solid understanding of thermal physics!' :
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
                           cursor: 'pointer',
                           boxShadow: `0 4px 20px ${colors.primary}40`
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
                  {/* Question progress */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>Question {testQuestion + 1} of {testQuestions.length}</p>
                     <div style={{ display: 'flex', gap: '4px' }}>
                        {testQuestions.map((_, i) => (
                           <div
                              key={i}
                              style={{
                                 width: '8px',
                                 height: '8px',
                                 borderRadius: '50%',
                                 background: testAnswers[i] ? colors.success : i === testQuestion ? colors.primary : colors.border
                              }}
                           />
                        ))}
                     </div>
                  </div>

                  {/* Scenario */}
                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '16px', background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.textMuted }}>Scenario</p>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>{currentQ.scenario}</p>
                  </div>

                  {/* Question */}
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: colors.textPrimary }}>{currentQ.question}</h3>

                  {/* Options */}
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
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                              background: selectedAnswer === opt.id ? colors.primary : colors.bgCardLight,
                              color: selectedAnswer === opt.id ? 'white' : colors.textMuted
                           }}>
                              {String.fromCharCode(65 + i)}
                           </div>
                           <p style={{ flex: 1, fontSize: '14px', color: selectedAnswer === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                        </button>
                     ))}
                  </div>

                  {/* Navigation */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button
                        onMouseDown={() => testQuestion > 0 && setTestQuestion(testQuestion - 1)}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: '12px',
                           fontWeight: 600,
                           background: colors.bgCardLight,
                           color: colors.textSecondary,
                           border: `1px solid ${colors.border}`,
                           cursor: testQuestion > 0 ? 'pointer' : 'not-allowed',
                           opacity: testQuestion > 0 ? 1 : 0.3
                        }}
                     >
                        ← Previous
                     </button>
                     {testQuestion < testQuestions.length - 1 ? (
                        <button
                           onMouseDown={() => selectedAnswer && setTestQuestion(testQuestion + 1)}
                           style={{
                              flex: 1,
                              padding: '14px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              background: selectedAnswer ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                              color: colors.textPrimary,
                              border: 'none',
                              cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                              opacity: selectedAnswer ? 1 : 0.5
                           }}
                        >
                           Next →
                        </button>
                     ) : (
                        <button
                           onMouseDown={() => testAnswers.every(a => a !== null) && setTestSubmitted(true)}
                           style={{
                              flex: 1,
                              padding: '14px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              background: testAnswers.every(a => a !== null) ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : colors.bgCardLight,
                              color: colors.textPrimary,
                              border: 'none',
                              cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                              opacity: testAnswers.every(a => a !== null) ? 1 : 0.5
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

            {/* Confetti */}
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
                  background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '32px',
                  boxShadow: '0 20px 60px rgba(249, 115, 22, 0.4)'
               }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>

               <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '16px', color: '#f8fafc' }}>
                  Mastery Achieved!
               </h1>

               <p style={{ fontSize: '18px', marginBottom: '32px', maxWidth: '480px', lineHeight: 1.6, color: '#94a3b8' }}>
                  You've mastered <strong style={{ color: '#f8fafc' }}>heat transfer and thermal capacity</strong>!
                  You understand Fourier's Law, specific heat, and how these principles shape our world.
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '400px', marginBottom: '40px' }}>
                  {[
                     { icon: '⚡', label: "Fourier's Law", value: 'Mastered' },
                     { icon: '💧', label: 'Heat Capacity', value: 'Mastered' },
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
                        message: 'Heat Transfer & Capacity lesson completed!'
                     });
                  }}
                  style={{
                     padding: '18px 48px',
                     fontSize: '16px',
                     fontWeight: 700,
                     background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     boxShadow: '0 8px 32px rgba(249, 115, 22, 0.4)'
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

export default HeatTransferCapacityRenderer;
