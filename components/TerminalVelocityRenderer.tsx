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

interface TerminalVelocityRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
   onBack?: () => void;
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

const TerminalVelocityRenderer: React.FC<TerminalVelocityRendererProps> = ({ onGameEvent, gamePhase, onBack }) => {
   type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   const getInitialPhase = (): Phase => {
      if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
      return 'hook';
   };

   const [phase, setPhase] = useState<Phase>(getInitialPhase);
   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase]);

   // Core state
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [isDropping, setIsDropping] = useState(false);
   const [dropTime, setDropTime] = useState(0);
   const [filterCount, setFilterCount] = useState(1);
   const [filterPositions, setFilterPositions] = useState<number[]>([0, 0, 0, 0]);
   const [filterVelocities, setFilterVelocities] = useState<number[]>([0, 0, 0, 0]);
   const [dropComplete, setDropComplete] = useState(false);
   const [filterShape, setFilterShape] = useState<'open' | 'crumpled'>('open');
   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [selectedApp, setSelectedApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
   const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);

   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   const [guidedMode] = useState(true);
   const [lastCoachMessage, setLastCoachMessage] = useState<string>('');

   const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: GameEvent['details']) => {
      if (onGameEvent) {
         onGameEvent({ eventType, gameType: 'terminal_velocity', gameTitle: 'Terminal Velocity', details, timestamp: Date.now() });
      }
   }, [onGameEvent]);

   const coachMessages: Record<Phase, string> = {
      hook: "What happens when you stack coffee filters and drop them? Does double the weight mean double the speed?",
      predict: "Think about it: if you double the mass, what happens to falling speed? Make your prediction!",
      play: "Watch the filters fall! Notice how the speed changes over time - it doesn't keep increasing forever.",
      review: "You've discovered terminal velocity! When drag equals weight, acceleration stops.",
      twist_predict: "What if we change the shape? How will crumpling the filter affect its fall?",
      twist_play: "Compare open vs crumpled filters. Shape dramatically affects drag!",
      twist_review: "Area matters as much as mass! This is why parachutes work.",
      transfer: "From skydivers to raindrops - terminal velocity is everywhere!",
      test: "Test your understanding of drag, terminal velocity, and falling objects!",
      mastery: "You've mastered the physics of falling! You understand why parachutes save lives."
   };

   const navigationLockRef = useRef(false);
   const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const phaseLabels: Record<Phase, string> = {
      hook: 'Introduction', predict: 'Predict', play: 'Drop Test', review: 'Understanding',
      twist_predict: 'New Variable', twist_play: 'Shape Effect', twist_review: 'Deep Insight',
      transfer: 'Real World', test: 'Knowledge Test', mastery: 'Mastery'
   };

   const goToPhase = useCallback((p: Phase) => {
      if (navigationLockRef.current) return;
      navigationLockRef.current = true;
      setPhase(p);
      if (p === 'play' || p === 'twist_play') {
         setIsDropping(false);
         setFilterPositions([0, 0, 0, 0]);
         setFilterVelocities([0, 0, 0, 0]);
         setDropComplete(false);
         setDropTime(0);
      }
      playSound(400 + Math.random() * 200, 0.1);
      const idx = phaseOrder.indexOf(p);
      emitGameEvent('phase_changed', { phase: p, phaseLabel: phaseLabels[p], currentScreen: idx + 1, totalScreens: phaseOrder.length });
      if (guidedMode) setLastCoachMessage(coachMessages[p]);
      setTimeout(() => { navigationLockRef.current = false; }, 400);
   }, [emitGameEvent, guidedMode, coachMessages, phaseLabels, phaseOrder]);

   // Colors
   const colors = {
      primary: '#0ea5e9', primaryDark: '#0284c7', accent: '#14b8a6', accentDark: '#0d9488',
      warning: '#f59e0b', success: '#22c55e', danger: '#ef4444',
      bgDark: '#0c1222', bgCard: '#1e293b', bgCardLight: '#334155', border: '#475569',
      textPrimary: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b'
   };
   const space = { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px' };
   const radius = { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' };
   const shadows = { sm: '0 2px 8px rgba(0,0,0,0.3)', md: '0 4px 16px rgba(0,0,0,0.4)', glow: (c: string) => `0 0 20px ${c}40` };

   useEffect(() => {
      const timer = setTimeout(() => {
         emitGameEvent('game_started', { phase: 'hook', phaseLabel: 'Introduction', currentScreen: 1, totalScreens: phaseOrder.length });
         if (guidedMode) setLastCoachMessage(coachMessages.hook);
      }, 100);
      return () => clearTimeout(timer);
   }, []);

   // Drop simulation with terminal velocity physics
   useEffect(() => {
      if (isDropping && !dropComplete) {
         const interval = setInterval(() => {
            setDropTime(t => t + 0.016);
            const g = 9.8;
            const maxY = 100;

            setFilterPositions(prev => {
               const newPos = [...prev];
               let allDone = true;

               for (let i = 0; i < 4; i++) {
                  if (i < filterCount && prev[i] < maxY) {
                     allDone = false;
                     // Terminal velocity depends on mass (# filters) and shape
                     const mass = i + 1; // 1, 2, 3, 4 filters
                     const dragCoeff = filterShape === 'open' ? 0.8 : 0.3;
                     const area = filterShape === 'open' ? 1.0 : 0.4;

                     // Terminal velocity: v_t = sqrt(2mg / (rho * Cd * A))
                     // Simplified: v_t proportional to sqrt(mass / (Cd * A))
                     const terminalV = Math.sqrt(mass / (dragCoeff * area)) * 15;

                     // Update velocity with drag: dv/dt = g - (v^2 / v_t^2) * g
                     const currentV = filterVelocities[i];
                     const dragFactor = (currentV * currentV) / (terminalV * terminalV);
                     const acceleration = g * (1 - dragFactor);
                     const newV = Math.min(terminalV, currentV + acceleration * 0.016 * 3);

                     setFilterVelocities(prevV => {
                        const newVels = [...prevV];
                        newVels[i] = newV;
                        return newVels;
                     });

                     newPos[i] = Math.min(maxY, prev[i] + newV * 0.1);
                  }
               }

               if (allDone || newPos.slice(0, filterCount).every(p => p >= maxY)) {
                  setDropComplete(true);
                  setIsDropping(false);
               }

               return newPos;
            });
         }, 16);
         return () => clearInterval(interval);
      }
   }, [isDropping, dropComplete, filterCount, filterShape]);

   useEffect(() => {
      if (phase === 'mastery') {
         const confettiColors = ['#0ea5e9', '#14b8a6', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6'];
         setConfetti(Array.from({ length: 60 }, (_, i) => ({
            x: Math.random() * 100, y: Math.random() * 100,
            color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
         })));
      }
   }, [phase]);

   const renderProgressBar = () => {
      const currentIdx = phaseOrder.indexOf(phase);
      return (
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, gap: isMobile ? '12px' : '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
               <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
                  {phaseOrder.map((p, i) => (
                     <div key={p} onMouseDown={() => i < currentIdx && goToPhase(p)} style={{ height: isMobile ? '10px' : '8px', width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'), borderRadius: '5px', backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border, cursor: i < currentIdx ? 'pointer' : 'default', transition: 'all 0.3s' }} />
                  ))}
               </div>
               <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>{currentIdx + 1} / {phaseOrder.length}</span>
            </div>
            <div style={{ padding: '4px 12px', borderRadius: '12px', background: `${colors.primary}20`, color: colors.primary, fontSize: '11px', fontWeight: 700 }}>{phaseLabels[phase]}</div>
         </div>
      );
   };

   const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => {
      const currentIdx = phaseOrder.indexOf(phase);
      const buttonColor = accentColor || colors.primary;
      return (
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgCard }}>
            <button style={{ padding: '12px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', backgroundColor: colors.bgCardLight, color: colors.textSecondary, border: 'none', cursor: canGoBack && currentIdx > 0 ? 'pointer' : 'not-allowed', opacity: canGoBack && currentIdx > 0 ? 1 : 0.3 }} onMouseDown={() => { if (canGoBack && currentIdx > 0) goToPhase(phaseOrder[currentIdx - 1]); }}>Back</button>
            <button style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', background: canGoNext ? `linear-gradient(135deg, ${buttonColor} 0%, ${colors.accent} 100%)` : colors.bgCardLight, color: colors.textPrimary, border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.3, boxShadow: canGoNext ? `0 4px 20px ${buttonColor}40` : 'none' }} onMouseDown={() => { if (!canGoNext) return; if (onNext) onNext(); else if (currentIdx < phaseOrder.length - 1) goToPhase(phaseOrder[currentIdx + 1]); }}>{nextLabel}</button>
         </div>
      );
   };

   const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
      <div style={{ marginBottom: '24px' }}>
         <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>{phaseName}</p>
         <h2 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary, margin: 0 }}>{title}</h2>
         {subtitle && <p style={{ fontSize: '14px', marginTop: '8px', color: colors.textSecondary }}>{subtitle}</p>}
      </div>
   );

   const renderKeyTakeaway = (icon: string, title: string, description: string, key?: number) => (
      <div key={key} style={{ display: 'flex', gap: '16px', padding: '16px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`, border: `1px solid ${colors.border}` }}>
         <div style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</div>
         <div><p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: colors.textPrimary }}>{title}</p><p style={{ fontSize: '12px', lineHeight: 1.6, color: colors.textSecondary, margin: 0 }}>{description}</p></div>
      </div>
   );

   // SVG visualization
   const renderDropViz = () => (
      <svg viewBox="0 0 600 450" style={{ width: '100%', height: '100%', maxHeight: '450px' }}>
         <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
               <stop offset="0%" stopColor="#0c4a6e" />
               <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
            <filter id="filterShadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" /></filter>
         </defs>

         <rect width="600" height="450" fill="url(#skyGrad)" />

         {/* Ground */}
         <rect x="0" y="400" width="600" height="50" fill="#1e3a5f" />
         <line x1="0" y1="400" x2="600" y2="400" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10,5" />

         {/* Drop zone markers */}
         {[1, 2, 3, 4].slice(0, filterCount).map((n, i) => (
            <g key={i} transform={`translate(${100 + i * 120}, 0)`}>
               {/* Filter visualization */}
               <g transform={`translate(0, ${40 + filterPositions[i] * 3.5})`}>
                  {filterShape === 'open' ? (
                     // Open filter - cup shape
                     <>
                        <ellipse cx="0" cy="0" rx={25 + n * 3} ry={8 + n} fill={colors.textPrimary} opacity="0.9" filter="url(#filterShadow)" />
                        <path d={`M ${-(20 + n * 2)} 0 Q 0 ${20 + n * 4} ${20 + n * 2} 0`} fill="none" stroke={colors.textSecondary} strokeWidth="2" />
                        {/* Stack lines for multiple filters */}
                        {Array.from({ length: n - 1 }).map((_, j) => (
                           <ellipse key={j} cx="0" cy={-2 - j * 2} rx={24 + n * 3 - j} ry={7 + n - j * 0.5} fill="none" stroke={colors.textMuted} strokeWidth="1" />
                        ))}
                     </>
                  ) : (
                     // Crumpled filter - ball shape
                     <circle cx="0" cy="0" r={12 + n * 2} fill={colors.textPrimary} opacity="0.9" filter="url(#filterShadow)" />
                  )}
                  <text x="0" y={filterShape === 'open' ? 50 : 35} textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
                     {n} filter{n > 1 ? 's' : ''}
                  </text>
               </g>

               {/* Velocity indicator */}
               {isDropping && (
                  <g transform={`translate(50, ${60 + filterPositions[i] * 3.5})`}>
                     <text x="0" y="0" fill={colors.accent} fontSize="10" fontWeight="bold">
                        v={filterVelocities[i].toFixed(1)}
                     </text>
                  </g>
               )}
            </g>
         ))}

         {/* Velocity vs Time graph (mini) */}
         <g transform="translate(430, 60)">
            <rect x="0" y="0" width="150" height="100" rx="8" fill={colors.bgCard} stroke={colors.border} />
            <text x="75" y="20" textAnchor="middle" fill={colors.textSecondary} fontSize="10" fontWeight="bold">Speed vs Time</text>

            {/* Axes */}
            <line x1="25" y1="85" x2="140" y2="85" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="25" y1="30" x2="25" y2="85" stroke={colors.textMuted} strokeWidth="1" />
            <text x="75" y="95" textAnchor="middle" fill={colors.textMuted} fontSize="8">time</text>
            <text x="15" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="8" transform="rotate(-90, 15, 55)">speed</text>

            {/* Terminal velocity curve */}
            <path d="M 25 85 Q 60 50, 90 40 L 140 40" fill="none" stroke={colors.primary} strokeWidth="2" />
            <line x1="25" y1="40" x2="140" y2="40" stroke={colors.warning} strokeWidth="1" strokeDasharray="4,3" />
            <text x="145" y="42" fill={colors.warning} fontSize="8">v_t</text>
         </g>

         {/* Force diagram */}
         <g transform="translate(430, 180)">
            <rect x="0" y="0" width="150" height="80" rx="8" fill={colors.bgCard} stroke={colors.border} />
            <text x="75" y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="10" fontWeight="bold">Forces</text>

            {/* Object */}
            <circle cx="75" cy="50" r="12" fill={colors.textMuted} />

            {/* Weight arrow (down) */}
            <line x1="75" y1="62" x2="75" y2="75" stroke={colors.danger} strokeWidth="3" markerEnd="url(#arrowDown)" />
            <polygon points="75,78 71,70 79,70" fill={colors.danger} />
            <text x="90" y="75" fill={colors.danger} fontSize="9">W</text>

            {/* Drag arrow (up) - size varies with velocity */}
            <line x1="75" y1="38" x2="75" y2="25" stroke={colors.success} strokeWidth="3" />
            <polygon points="75,22 71,30 79,30" fill={colors.success} />
            <text x="58" y="28" fill={colors.success} fontSize="9">D</text>
         </g>

         {/* Legend */}
         <g transform="translate(20, 410)">
            <text x="0" y="15" fill={colors.textSecondary} fontSize="10">At terminal velocity: Drag = Weight (no acceleration)</text>
         </g>
      </svg>
   );

   // Test questions
   const testQuestions = [
      {
         scenario: "You drop two coffee filters from the same height. One is a single filter, the other is 4 filters stacked together.",
         question: "Which hits the ground first?",
         options: [
            { id: '4filters', label: "The 4 stacked filters hit first", correct: true },
            { id: '1filter', label: "The single filter hits first" },
            { id: 'same', label: "They land at exactly the same time" },
            { id: 'depends', label: "It depends on how flat they are" }
         ],
         explanation: "More mass means higher terminal velocity. Weight increases with mass, but drag depends on area (same for both). So the heavier stack reaches equilibrium at a higher speed."
      },
      {
         scenario: "A skydiver jumps from a plane and falls for 10 seconds before opening their parachute.",
         question: "What happens to their acceleration during those 10 seconds?",
         options: [
            { id: 'decreases', label: "Acceleration decreases from 9.8 m/s² toward zero as they approach terminal velocity", correct: true },
            { id: 'constant', label: "Acceleration stays constant at 9.8 m/s² the whole time" },
            { id: 'increases', label: "Acceleration increases as they go faster" },
            { id: 'zero', label: "Acceleration is zero because air resistance cancels gravity immediately" }
         ],
         explanation: "At first, drag is small and acceleration is ~g. As speed increases, drag increases (∝v²), reducing net force and acceleration. At terminal velocity, drag = weight, acceleration = 0."
      },
      {
         scenario: "A skydiver in spread-eagle position has terminal velocity of 55 m/s. They then tuck into a ball.",
         question: "What happens to their terminal velocity?",
         options: [
            { id: 'increases', label: "Terminal velocity increases because they have less drag area", correct: true },
            { id: 'decreases', label: "Terminal velocity decreases because they're more compact" },
            { id: 'same', label: "Terminal velocity stays the same - it only depends on mass" },
            { id: 'zero', label: "They stop accelerating because they're already at terminal velocity" }
         ],
         explanation: "Terminal velocity v_t = √(2mg/ρCdA). Tucking reduces area (A), so v_t increases. Skydivers tuck to go faster and spread out to slow down."
      },
      {
         scenario: "A feather and a hammer are dropped on the Moon (no atmosphere). On Earth, the hammer hits first.",
         question: "On the Moon, which hits first?",
         options: [
            { id: 'same', label: "They hit at exactly the same time", correct: true },
            { id: 'hammer', label: "The hammer still hits first because it's heavier" },
            { id: 'feather', label: "The feather hits first because it's lighter" },
            { id: 'neither', label: "Neither falls because Moon's gravity is too weak" }
         ],
         explanation: "Without air resistance, all objects fall at the same rate regardless of mass (a = g). Apollo 15 astronaut David Scott famously demonstrated this on the Moon!"
      },
      {
         scenario: "Rain clouds are typically 1-2 km above the ground. If there were no air resistance, a raindrop would hit the ground at over 500 km/h.",
         question: "Why are actual raindrops much slower (about 25 km/h)?",
         options: [
            { id: 'terminal', label: "Raindrops reach terminal velocity quickly because of air resistance", correct: true },
            { id: 'evaporate', label: "Raindrops slow down because water evaporates as they fall" },
            { id: 'wind', label: "Upward winds slow them down" },
            { id: 'size', label: "Raindrops are too small to accelerate properly" }
         ],
         explanation: "Small raindrops have low terminal velocity (high drag-to-weight ratio). They reach terminal velocity within a few meters of falling. Big drops fall faster but break apart!"
      },
      {
         scenario: "A peregrine falcon dives at prey, reaching speeds over 320 km/h - the fastest animal on Earth.",
         question: "How does the falcon achieve this speed when a human skydiver maxes out at ~200 km/h?",
         options: [
            { id: 'shape', label: "The falcon tucks its wings for minimal drag area and streamlined shape", correct: true },
            { id: 'weight', label: "The falcon weighs more than a human" },
            { id: 'feathers', label: "Feathers have special anti-drag properties" },
            { id: 'altitude', label: "Falcons dive from higher altitudes" }
         ],
         explanation: "Falcons have evolved a teardrop dive shape with minimal frontal area and extremely low drag coefficient. They're literally designed by evolution for maximum terminal velocity."
      },
      {
         scenario: "You're designing a parachute for an egg drop competition. You want the egg to fall as slowly as possible.",
         question: "What design change would MOST reduce terminal velocity?",
         options: [
            { id: 'area', label: "Increase the parachute's surface area", correct: true },
            { id: 'weight', label: "Add more weight to the system" },
            { id: 'string', label: "Use longer strings to attach the egg" },
            { id: 'hole', label: "Add a hole in the center (like real parachutes)" }
         ],
         explanation: "v_t = √(2mg/ρCdA). Increasing A (area) directly decreases terminal velocity. This is why parachutes are large! The hole in real parachutes helps stability, not speed."
      },
      {
         scenario: "A weather balloon rises until it reaches a certain altitude, then stops rising and floats.",
         question: "Why does it stop rising?",
         options: [
            { id: 'buoyancy', label: "At that altitude, the air is thin enough that buoyancy equals weight", correct: true },
            { id: 'string', label: "The tether reaches its maximum length" },
            { id: 'gas', label: "The helium runs out" },
            { id: 'drag', label: "Drag force stops it like terminal velocity stops falling objects" }
         ],
         explanation: "Buoyancy decreases as air density decreases with altitude. The balloon rises until buoyancy equals weight (equilibrium). This is like an 'upward terminal velocity'!"
      },
      {
         scenario: "In 2012, Felix Baumgartner jumped from 39 km altitude and reached 1,357 km/h - faster than the speed of sound.",
         question: "Why could he exceed normal terminal velocity?",
         options: [
            { id: 'thin_air', label: "At that altitude, air is so thin that drag is much lower", correct: true },
            { id: 'suit', label: "His special suit was designed to be slippery" },
            { id: 'gravity', label: "Gravity is stronger at high altitude" },
            { id: 'speed', label: "He pushed off the capsule to start with speed" }
         ],
         explanation: "At 39 km, air density is about 1% of sea level. With almost no drag, he accelerated to supersonic speeds. As he descended into thicker air, drag slowed him back down."
      },
      {
         scenario: "Dust particles can stay suspended in the air for hours or even days.",
         question: "Why don't dust particles fall like larger objects?",
         options: [
            { id: 'low_vt', label: "Their terminal velocity is so low (mm/s) that tiny air currents keep them aloft", correct: true },
            { id: 'static', label: "Static electricity makes them float" },
            { id: 'light', label: "They're lighter than air" },
            { id: 'shape', label: "Their irregular shapes make them impossible to fall" }
         ],
         explanation: "Very small particles have extreme drag-to-weight ratios. Their terminal velocity is so slow (mm per second) that the slightest air movement carries them up faster than they fall!"
      }
   ];

   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   const realWorldApps = [
      {
         icon: '🪂', title: 'Parachutes', short: 'Controlled descent', tagline: 'Saving Lives with Drag',
         description: 'Parachutes dramatically increase drag area, reducing terminal velocity from 200+ km/h to about 25 km/h - a survivable landing speed.',
         connection: 'Just like more filters fall faster (more mass), a parachute works by massively increasing area. v_t = √(2mg/ρCdA) - bigger A means slower fall.',
         howItWorks: 'Modern parachutes use ram-air design (like a wing) for control. The canopy fills with air, creating both drag and lift for steerable descent.',
         stats: [{ value: '25 km/h', label: 'Landing speed', icon: '🎯' }, { value: '400 m²', label: 'Main canopy area', icon: '📐' }, { value: '99.97%', label: 'Success rate', icon: '✅' }],
         examples: ['Military paratroopers deploy at 250m altitude for fast insertion', 'BASE jumpers use rapid-deploy chutes for low-altitude jumps', 'Mars rovers used supersonic parachutes in thin atmosphere', 'Cargo drops supply remote areas inaccessible by road'],
         companies: ['Performance Designs', 'UPT', 'Icarus Canopies', 'Precision Aerodynamics'],
         futureImpact: 'SpaceX is developing large parachute systems for Starship crew return, and NASA uses increasingly sophisticated chutes for Mars missions.',
         color: colors.primary
      },
      {
         icon: '🌧️', title: 'Rainfall Physics', short: 'Drop size matters', tagline: 'Why Rain Doesnt Kill Us',
         description: 'Raindrops reach terminal velocity within meters of forming. Larger drops fall faster (30 km/h) but break apart; small droplets drift slowly.',
         connection: 'Coffee filters show that mass increases terminal velocity. Raindrops follow the same physics - bigger drops are heavier and fall faster.',
         howItWorks: 'As drops grow, they become unstable and break into smaller droplets. This limits maximum raindrop size to about 4-5mm diameter.',
         stats: [{ value: '9 m/s', label: 'Large drop speed', icon: '💧' }, { value: '5mm', label: 'Max drop size', icon: '📏' }, { value: '2-4m', label: 'Distance to reach v_t', icon: '📍' }],
         examples: ['Drizzle: tiny drops (~0.5mm) fall slowly, staying suspended longer', 'Thunderstorms produce larger drops from violent updrafts', 'Fog droplets are so small they essentially float', 'Hail requires strong updrafts to grow before falling'],
         companies: ['National Weather Service', 'NOAA', 'Met Office', 'Weather Underground'],
         futureImpact: 'Understanding raindrop physics helps predict flooding, design drainage systems, and model climate patterns.',
         color: colors.accent
      },
      {
         icon: '🏃', title: 'Sprinting & Cycling', short: 'Speed vs drag', tagline: 'The Square Law of Speed',
         description: 'At high speeds, drag dominates. Drag force increases with velocity squared, so going twice as fast requires 4x the power to overcome air resistance.',
         connection: 'Terminal velocity occurs when drag equals weight. In sprinting, athletes are limited by how much power they can produce to overcome drag.',
         howItWorks: 'Drag = ½ρCdAv². Power needed = Drag × velocity = ½ρCdAv³. The cubic relationship means small speed gains require huge power increases.',
         stats: [{ value: '90%', label: 'Energy lost to drag at 40 km/h', icon: '💨' }, { value: '0.7', label: 'Cyclist drag coefficient', icon: '🚴' }, { value: '30%', label: 'Drafting energy savings', icon: '📉' }],
         examples: ['Cyclists draft behind others to reduce drag by 30-40%', 'Usain Bolt faced increasing drag as he set world records', 'Tour de France pelotons form aerodynamic groups', 'Speed skaters wear skin-tight suits to minimize drag'],
         companies: ['Specialized', 'Trek', 'Nike', 'Speedo'],
         futureImpact: 'Wind tunnel testing and CFD simulations optimize athlete positions and equipment for marginal gains.',
         color: colors.warning
      },
      {
         icon: '🛬', title: 'Aircraft Landing', short: 'Controlled descent', tagline: 'Fighting Gravity with Drag',
         description: 'Aircraft use flaps, spoilers, and landing gear as "speed brakes" to increase drag for controlled descent without gaining excess speed.',
         connection: 'Like crumpling a coffee filter changes its fall, aircraft change their shape to control descent rate.',
         howItWorks: 'Deploying flaps and spoilers increases drag area and coefficient. This allows steep descents at safe speeds without excessive acceleration.',
         stats: [{ value: '250 km/h', label: 'Typical landing speed', icon: '✈️' }, { value: '3°', label: 'Normal glide slope', icon: '📐' }, { value: '50%', label: 'Drag increase with flaps', icon: '⬆️' }],
         examples: ['Spoilers on wings disrupt lift and add drag for rapid descent', 'Speed brakes extend from fuselage during landing approach', 'Thrust reversers redirect engine power forward after touchdown', 'Drogue parachutes slow spacecraft and racing cars'],
         companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'SpaceX'],
         futureImpact: 'Electric aircraft need precise drag management for efficient descent, and supersonic jets use drag modulation for sonic boom reduction.',
         color: colors.success
      }
   ];

   // --- RENDER PHASES ---
   if (phase === 'hook') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '800px' }}>
                  {renderSectionHeader("Step 1 • The Mystery", "Do Heavier Objects Fall Faster?", "Galileo said no. But is that really true?")}

                  <div style={{ background: colors.bgCard, borderRadius: radius.xl, padding: space.lg, marginBottom: space.xl, border: `1px solid ${colors.border}` }}>
                     {renderDropViz()}
                  </div>

                  <div style={{ padding: space.xl, borderRadius: radius.lg, background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}10 100%)`, border: `1px solid ${colors.primary}30`, marginBottom: space.xl }}>
                     <p style={{ fontSize: '18px', lineHeight: 1.7, color: colors.textSecondary, margin: 0 }}>
                        Stack coffee filters and drop them. One filter, two filters, four filters. They all have the same <strong style={{ color: colors.primary }}>shape and size</strong>, but different <strong style={{ color: colors.accent }}>masses</strong>...
                     </p>
                     <p style={{ fontSize: '22px', fontWeight: 700, color: colors.textPrimary, marginTop: space.lg, marginBottom: 0 }}>
                        Does stacking them make them fall faster?
                     </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: space.lg }}>
                     <div style={{ padding: space.lg, borderRadius: radius.lg, background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '40px' }}>☕</span>
                        <p style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.sm }}>1 Filter</p>
                        <p style={{ fontSize: '12px', color: colors.textMuted }}>Light & floaty</p>
                     </div>
                     <div style={{ padding: space.lg, borderRadius: radius.lg, background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '40px' }}>☕☕</span>
                        <p style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.sm }}>2 Filters</p>
                        <p style={{ fontSize: '12px', color: colors.textMuted }}>Same shape, 2x mass</p>
                     </div>
                     <div style={{ padding: space.lg, borderRadius: radius.lg, background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '40px' }}>☕☕☕☕</span>
                        <p style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.sm }}>4 Filters</p>
                        <p style={{ fontSize: '12px', color: colors.textMuted }}>Same shape, 4x mass</p>
                     </div>
                  </div>
               </div>
            </div>
            {renderBottomBar(true, true, "Make Your Prediction")}
         </div>
      );
   }

   if (phase === 'predict') {
      const options = [
         { id: 'same', label: 'They all fall at the same rate', desc: 'Galileo proved mass doesn\'t affect falling speed', icon: '🤝' },
         { id: 'linear', label: 'Double mass = double speed', desc: 'Heavier things should fall proportionally faster', icon: '📈' },
         { id: 'nonlinear', label: 'Heavier falls faster, but not proportionally', desc: 'The relationship is more complex', icon: '📊' },
      ];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 2 • Make a Prediction", "What's Your Hypothesis?", "Think about what you know about falling objects.")}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                     {options.map(opt => (
                        <button key={opt.id} onMouseDown={() => { setPrediction(opt.id); emitGameEvent('prediction_made', { phase: 'predict', prediction: opt.id }); }} style={{ display: 'flex', alignItems: 'center', gap: space.lg, padding: space.xl, borderRadius: radius.lg, textAlign: 'left', background: prediction === opt.id ? `${colors.primary}20` : colors.bgCard, border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`, cursor: 'pointer' }}>
                           <span style={{ fontSize: '32px' }}>{opt.icon}</span>
                           <div style={{ flex: 1 }}><p style={{ fontWeight: 700, marginBottom: '4px', color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p><p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{opt.desc}</p></div>
                           {prediction === opt.id && <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: '14px' }}>✓</span></div>}
                        </button>
                     ))}
                  </div>
                  <div style={{ marginTop: space.xl, padding: space.lg, borderRadius: radius.md, background: colors.bgCardLight, border: `1px solid ${colors.border}` }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.warning, marginBottom: space.sm }}>Remember</p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>In a vacuum, all objects fall at the same rate. But we don't live in a vacuum...</p>
                  </div>
               </div>
            </div>
            {renderBottomBar(true, !!prediction, "Run the Experiment")}
         </div>
      );
   }

   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: space.lg, minHeight: isMobile ? '350px' : 'auto' }}>
                  <div style={{ height: '100%', borderRadius: radius.lg, overflow: 'hidden', background: colors.bgCard, border: `1px solid ${colors.border}` }}>{renderDropViz()}</div>
               </div>
               <div style={{ width: isMobile ? '100%' : '280px', padding: space.lg, background: colors.bgCard, borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: space.lg }}>
                  <div><p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.primary }}>Step 3 • Drop Test</p><h3 style={{ fontSize: '18px', fontWeight: 900, color: colors.textPrimary, margin: `${space.sm} 0 0` }}>Watch Them Fall</h3></div>

                  {/* Filter count selector */}
                  <div>
                     <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: space.sm }}>How many filter stacks to compare?</p>
                     <div style={{ display: 'flex', gap: space.sm }}>
                        {[1, 2, 3, 4].map(n => (
                           <button key={n} onMouseDown={() => { setFilterCount(n); setFilterPositions([0, 0, 0, 0]); setFilterVelocities([0, 0, 0, 0]); setDropComplete(false); }} style={{ flex: 1, padding: space.md, borderRadius: radius.sm, fontWeight: 700, background: filterCount >= n ? colors.primary : colors.bgCardLight, color: filterCount >= n ? 'white' : colors.textMuted, border: 'none', cursor: 'pointer' }}>{n}</button>
                        ))}
                     </div>
                  </div>

                  <button onMouseDown={() => { if (!isDropping && !dropComplete) { setIsDropping(true); playSound(600, 0.2); } else if (dropComplete) { setFilterPositions([0, 0, 0, 0]); setFilterVelocities([0, 0, 0, 0]); setDropComplete(false); setDropTime(0); setTimeout(() => setIsDropping(true), 100); } }} disabled={isDropping} style={{ width: '100%', padding: space.lg, borderRadius: radius.md, fontWeight: 700, fontSize: '16px', background: isDropping ? colors.bgCardLight : `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.textPrimary, border: 'none', cursor: isDropping ? 'not-allowed' : 'pointer', boxShadow: isDropping ? 'none' : shadows.md }}>
                     {isDropping ? 'Dropping...' : dropComplete ? '🔄 Drop Again' : '🎯 Drop!'}
                  </button>

                  {dropComplete && (
                     <div style={{ padding: space.lg, borderRadius: radius.md, background: `${colors.success}15`, border: `2px solid ${colors.success}` }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: colors.success, margin: 0 }}>Heavier stacks fell faster!</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: space.sm, marginBottom: 0 }}>But wait - didn't Galileo say mass doesn't matter? Let's find out why...</p>
                     </div>
                  )}
               </div>
            </div>
            {renderBottomBar(true, dropComplete, "Understand Why")}
         </div>
      );
   }

   if (phase === 'review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '700px' }}>
                  {renderSectionHeader("Step 4 • The Science", "Terminal Velocity Explained", "Galileo was right about gravity, but he ignored something important.")}

                  <div style={{ padding: space.xl, borderRadius: radius.lg, background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`, border: `1px solid ${colors.primary}40`, marginBottom: space.xl }}>
                     <p style={{ fontSize: '16px', lineHeight: 1.7, color: colors.textSecondary, margin: 0 }}>
                        As an object falls faster, <strong style={{ color: colors.primary }}>air resistance (drag) increases</strong>. Eventually, drag equals weight, and acceleration stops. This maximum speed is <strong style={{ color: colors.accent }}>terminal velocity</strong>.
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginBottom: space.xl }}>
                     {renderKeyTakeaway("⚖️", "Force Balance", "At terminal velocity: Drag Force = Weight. No net force means no acceleration.")}
                     {renderKeyTakeaway("📐", "The Formula", "Terminal velocity: v_t = √(2mg / ρCdA). More mass (m) or less area (A) = faster fall.")}
                     {renderKeyTakeaway("📈", "Why Mass Matters Here", "Stacking filters increases mass but NOT drag area. More weight needs more drag to balance, which requires higher speed.")}
                  </div>

                  <div style={{ padding: space.xl, borderRadius: radius.lg, background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                     <p style={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary, margin: 0, lineHeight: 1.6 }}>"In a vacuum, Galileo is right. In air, terminal velocity is proportional to √(mass/area)."</p>
                     <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: space.md, marginBottom: 0 }}>— The physics of real falling objects</p>
                  </div>
               </div>
            </div>
            {renderBottomBar(true, true, "The Shape Factor")}
         </div>
      );
   }

   if (phase === 'twist_predict') {
      const options = [
         { id: 'same', label: 'Same speed', desc: 'Shape shouldn\'t matter if mass is the same', icon: '🤝' },
         { id: 'crumpled_faster', label: 'Crumpled falls faster', desc: 'Smaller size means less air resistance', icon: '⬇️' },
         { id: 'open_faster', label: 'Open falls faster', desc: 'Flat shapes "cut through" air better', icon: '⬆️' },
      ];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 5 • New Variable", "What About Shape?", "Same mass, different shapes - how does that change things?")}
                  <div style={{ padding: space.lg, borderRadius: radius.lg, background: `${colors.accent}15`, border: `1px solid ${colors.accent}30`, marginBottom: space.xl }}>
                     <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>Take a coffee filter and crumple it into a tight ball. It has the <strong style={{ color: colors.accent }}>same mass</strong> but a <strong style={{ color: colors.primary }}>different shape</strong>. Which falls faster?</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                     {options.map(opt => (
                        <button key={opt.id} onMouseDown={() => { setTwistPrediction(opt.id); emitGameEvent('prediction_made', { phase: 'twist_predict', prediction: opt.id }); }} style={{ display: 'flex', alignItems: 'center', gap: space.lg, padding: space.xl, borderRadius: radius.lg, textAlign: 'left', background: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgCard, border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`, cursor: 'pointer' }}>
                           <span style={{ fontSize: '28px' }}>{opt.icon}</span>
                           <div style={{ flex: 1 }}><p style={{ fontWeight: 700, marginBottom: '4px', color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p><p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{opt.desc}</p></div>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            {renderBottomBar(true, !!twistPrediction, "Test It")}
         </div>
      );
   }

   if (phase === 'twist_play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: space.lg }}>
                  <div style={{ height: '100%', borderRadius: radius.lg, overflow: 'hidden', background: colors.bgCard, border: `1px solid ${colors.border}` }}>{renderDropViz()}</div>
               </div>
               <div style={{ width: isMobile ? '100%' : '300px', padding: space.xl, background: colors.bgCard, borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: space.xl }}>
                  <div><p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.accent }}>Step 6 • Shape Effect</p><h3 style={{ fontSize: '18px', fontWeight: 900, color: colors.textPrimary, margin: `${space.sm} 0 0` }}>Open vs Crumpled</h3></div>

                  <div style={{ display: 'flex', gap: space.md }}>
                     <button onMouseDown={() => { setFilterShape('open'); setFilterPositions([0, 0, 0, 0]); setFilterVelocities([0, 0, 0, 0]); setDropComplete(false); }} style={{ flex: 1, padding: space.lg, borderRadius: radius.md, fontWeight: 700, background: filterShape === 'open' ? colors.accent : colors.bgCardLight, color: filterShape === 'open' ? 'white' : colors.textMuted, border: 'none', cursor: 'pointer' }}>☕ Open</button>
                     <button onMouseDown={() => { setFilterShape('crumpled'); setFilterPositions([0, 0, 0, 0]); setFilterVelocities([0, 0, 0, 0]); setDropComplete(false); }} style={{ flex: 1, padding: space.lg, borderRadius: radius.md, fontWeight: 700, background: filterShape === 'crumpled' ? colors.accent : colors.bgCardLight, color: filterShape === 'crumpled' ? 'white' : colors.textMuted, border: 'none', cursor: 'pointer' }}>⚫ Ball</button>
                  </div>

                  <button onMouseDown={() => { if (!isDropping && !dropComplete) { setIsDropping(true); } else if (dropComplete) { setFilterPositions([0, 0, 0, 0]); setFilterVelocities([0, 0, 0, 0]); setDropComplete(false); setTimeout(() => setIsDropping(true), 100); } }} disabled={isDropping} style={{ width: '100%', padding: space.lg, borderRadius: radius.md, fontWeight: 700, background: isDropping ? colors.bgCardLight : `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`, color: colors.textPrimary, border: 'none', cursor: isDropping ? 'not-allowed' : 'pointer' }}>
                     {isDropping ? 'Dropping...' : dropComplete ? '🔄 Drop Again' : '🎯 Drop!'}
                  </button>

                  <div style={{ padding: space.lg, borderRadius: radius.md, background: colors.bgCardLight }}>
                     <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
                        {filterShape === 'open'
                           ? 'Open filters have large area = high drag = slow fall'
                           : 'Crumpled filters have small area = low drag = fast fall'}
                     </p>
                  </div>
               </div>
            </div>
            {renderBottomBar(true, true, "Deep Insight")}
         </div>
      );
   }

   if (phase === 'twist_review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '700px' }}>
                  {renderSectionHeader("Step 7 • Deep Insight", "Area Is Everything", "This is why parachutes work!")}

                  <div style={{ padding: space.xl, borderRadius: radius.lg, background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.primary}10 100%)`, border: `1px solid ${colors.accent}40`, marginBottom: space.xl, textAlign: 'center' }}>
                     <p style={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>v_t = √(2mg / ρCdA)</p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: space.md, marginBottom: 0 }}>Terminal velocity <strong style={{ color: colors.accent }}>decreases</strong> as area (A) <strong style={{ color: colors.accent }}>increases</strong></p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: space.lg, marginBottom: space.xl }}>
                     <div style={{ padding: space.lg, borderRadius: radius.lg, background: colors.bgCard, border: `1px solid ${colors.danger}40` }}>
                        <p style={{ fontSize: '24px', marginBottom: space.sm }}>⚫</p>
                        <p style={{ fontWeight: 700, color: colors.danger }}>Small Area = Fast</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Crumpled ball, diving hawk, bullet</p>
                     </div>
                     <div style={{ padding: space.lg, borderRadius: radius.lg, background: colors.bgCard, border: `1px solid ${colors.success}40` }}>
                        <p style={{ fontSize: '24px', marginBottom: space.sm }}>🪂</p>
                        <p style={{ fontWeight: 700, color: colors.success }}>Large Area = Slow</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Parachute, maple seed, spread-eagle skydiver</p>
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                     {renderKeyTakeaway("🪂", "Parachute Design", "Parachutes work by massively increasing area, reducing terminal velocity to ~25 km/h.")}
                     {renderKeyTakeaway("🦅", "Animal Adaptations", "Falcons tuck to dive at 320 km/h; flying squirrels spread membranes to glide slowly.")}
                     {renderKeyTakeaway("🌧️", "Raindrop Size", "Large raindrops fall faster but break apart; that's why rain doesn't hurt!")}
                  </div>
               </div>
            </div>
            {renderBottomBar(true, true, "Real World Examples")}
         </div>
      );
   }

   if (phase === 'transfer') {
      const currentApp = realWorldApps[selectedApp];
      const allCompleted = completedApps.every(c => c);
      const isCurrentCompleted = completedApps[selectedApp];
      const completedCount = completedApps.filter(c => c).length;

      const handleCompleteApp = () => {
         const newCompleted = [...completedApps];
         newCompleted[selectedApp] = true;
         setCompletedApps(newCompleted);
         if (selectedApp < 3) setSelectedApp(selectedApp + 1);
      };

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ padding: `${space.lg} ${space.lg} ${space.md}`, background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
                  <div><p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.success }}>Step 8 • Real World</p><p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{completedCount}/4 completed</p></div>
                  <div style={{ display: 'flex', gap: '6px' }}>{completedApps.map((c, i) => <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c ? colors.success : i === selectedApp ? realWorldApps[i].color : colors.bgCardLight }} />)}</div>
               </div>
               <div style={{ display: 'flex', gap: space.sm }}>
                  {realWorldApps.map((app, i) => {
                     const isLocked = i > 0 && !completedApps[i - 1] && !completedApps[i];
                     return (
                        <button key={i} onMouseDown={() => !isLocked && setSelectedApp(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, background: selectedApp === i ? `${app.color}20` : 'transparent', border: `2px solid ${selectedApp === i ? app.color : completedApps[i] ? colors.success : colors.border}`, opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                           <span style={{ fontSize: '18px' }}>{app.icon}</span>
                           {completedApps[i] && <span style={{ color: colors.success }}>✓</span>}
                        </button>
                     );
                  })}
               </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: space.lg }}>
               <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  <div style={{ padding: space.xl, borderRadius: radius.lg, background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${currentApp.color}05 100%)`, border: `1px solid ${currentApp.color}30`, marginBottom: space.xl }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: space.lg, marginBottom: space.lg }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: radius.lg, background: `${currentApp.color}30`, border: `2px solid ${currentApp.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>{currentApp.icon}</div>
                        <div><h2 style={{ fontSize: '24px', fontWeight: 900, color: colors.textPrimary, margin: 0 }}>{currentApp.title}</h2><p style={{ fontSize: '14px', color: currentApp.color, fontWeight: 600, marginTop: '4px' }}>{currentApp.tagline}</p></div>
                     </div>
                     <p style={{ fontSize: '15px', lineHeight: 1.7, color: colors.textSecondary, margin: 0 }}>{currentApp.description}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space.md, marginBottom: space.xl }}>
                     {currentApp.stats.map((stat, i) => (
                        <div key={i} style={{ padding: space.lg, borderRadius: radius.md, background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                           <p style={{ fontSize: '24px', margin: 0 }}>{stat.icon}</p>
                           <p style={{ fontSize: '20px', fontWeight: 900, color: currentApp.color, margin: `${space.sm} 0` }}>{stat.value}</p>
                           <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0, textTransform: 'uppercase' }}>{stat.label}</p>
                        </div>
                     ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: space.lg, marginBottom: space.xl }}>
                     <div style={{ padding: space.lg, borderRadius: radius.md, background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.primary, marginBottom: space.sm }}>🔗 Connection</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{currentApp.connection}</p>
                     </div>
                     <div style={{ padding: space.lg, borderRadius: radius.md, background: colors.bgCard, border: `1px solid ${colors.border}` }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: space.sm }}>⚙️ How It Works</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{currentApp.howItWorks}</p>
                     </div>
                  </div>
               </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: space.lg, borderTop: `1px solid ${colors.border}`, background: colors.bgCard, gap: space.md }}>
               <button onMouseDown={() => goToPhase('twist_review')} style={{ padding: `${space.md} ${space.lg}`, borderRadius: radius.md, fontWeight: 600, background: colors.bgCardLight, color: colors.textSecondary, border: 'none', cursor: 'pointer' }}>Back</button>
               {!isCurrentCompleted ? (
                  <button onMouseDown={handleCompleteApp} style={{ flex: 1, maxWidth: '300px', padding: `${space.md} ${space.xl}`, borderRadius: radius.md, fontWeight: 700, background: `linear-gradient(135deg, ${currentApp.color}, ${colors.accent})`, color: colors.textPrimary, border: 'none', cursor: 'pointer', boxShadow: shadows.md }}>✓ Mark as Read</button>
               ) : (
                  <div style={{ flex: 1, maxWidth: '300px', textAlign: 'center' }}><span style={{ color: colors.success, fontWeight: 600 }}>✓ Completed</span></div>
               )}
               <button onMouseDown={() => allCompleted && goToPhase('test')} style={{ padding: `${space.md} ${space.xl}`, borderRadius: radius.md, fontWeight: 700, background: allCompleted ? `linear-gradient(135deg, ${colors.warning}, ${colors.primary})` : colors.bgCardLight, color: allCompleted ? colors.textPrimary : colors.textMuted, border: 'none', cursor: allCompleted ? 'pointer' : 'not-allowed', opacity: allCompleted ? 1 : 0.5 }}>{allCompleted ? 'Take Test' : `${completedCount}/4`}</button>
            </div>
         </div>
      );
   }

   if (phase === 'test') {
      const currentQ = testQuestions[testQuestion];
      if (testSubmitted) {
         const score = calculateTestScore();
         const passed = score >= 7;
         return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
               {renderProgressBar()}
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
                  <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                     <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: passed ? `${colors.success}20` : `${colors.warning}20`, border: `3px solid ${passed ? colors.success : colors.warning}` }}>{score === 10 ? '🏆' : passed ? '🌟' : '📚'}</div>
                     <h2 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary, margin: 0 }}>{score}/10 Correct</h2>
                     <p style={{ color: passed ? colors.success : colors.warning, marginTop: space.sm }}>{passed ? 'Excellent! You understand terminal velocity!' : 'Keep practicing!'}</p>
                     <div style={{ display: 'flex', gap: space.md, justifyContent: 'center', marginTop: space.xl }}>
                        <button onMouseDown={() => { setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); }} style={{ padding: `${space.md} ${space.xl}`, borderRadius: radius.md, fontWeight: 600, background: colors.bgCard, color: colors.textSecondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>🔄 Retake</button>
                        <button onMouseDown={() => goToPhase('mastery')} style={{ padding: `${space.md} ${space.xl}`, borderRadius: radius.md, fontWeight: 700, background: passed ? colors.success : colors.warning, color: 'white', border: 'none', cursor: 'pointer' }}>{passed ? '🎓 Mastery' : '📖 Review'}</button>
                     </div>
                  </div>
               </div>
            </div>
         );
      }
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  <div style={{ marginBottom: space.xl }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.warning }}>Step 9 • Knowledge Test</p>
                     <h2 style={{ fontSize: '24px', fontWeight: 900, color: colors.textPrimary, margin: `${space.sm} 0` }}>Question {testQuestion + 1} of 10</h2>
                     <div style={{ display: 'flex', gap: '4px' }}>{testQuestions.map((_, i) => <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i === testQuestion ? colors.warning : i < testQuestion ? colors.success : colors.bgCardLight }} />)}</div>
                  </div>
                  <div style={{ padding: space.lg, borderRadius: radius.md, background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, marginBottom: space.lg }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.primary, marginBottom: space.sm }}>Scenario</p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>{currentQ.scenario}</p>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: space.lg }}>{currentQ.question}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
                     {currentQ.options.map((opt, i) => (
                        <button key={opt.id} onMouseDown={() => { const newAns = [...testAnswers]; newAns[testQuestion] = opt.id; setTestAnswers(newAns); }} style={{ display: 'flex', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, textAlign: 'left', background: testAnswers[testQuestion] === opt.id ? `${colors.warning}20` : colors.bgCard, border: `2px solid ${testAnswers[testQuestion] === opt.id ? colors.warning : colors.border}`, cursor: 'pointer' }}>
                           <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: testAnswers[testQuestion] === opt.id ? colors.warning : colors.bgCardLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textMuted }}>{String.fromCharCode(65 + i)}</div>
                           <p style={{ fontSize: '14px', color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textSecondary, margin: 0 }}>{opt.label}</p>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            {renderBottomBar(true, !!testAnswers[testQuestion], testQuestion < 9 ? `Question ${testQuestion + 2}` : 'Submit', () => { if (testQuestion < 9) setTestQuestion(testQuestion + 1); else { setTestSubmitted(true); emitGameEvent('game_completed', { score: calculateTestScore(), totalQuestions: 10 }); } }, colors.warning)}
         </div>
      );
   }

   if (phase === 'mastery') {
      const masteryItems = [
         { icon: '🌬️', title: 'Air Resistance', desc: 'Drag force increases with velocity squared' },
         { icon: '⚖️', title: 'Terminal Velocity', desc: 'Maximum speed when drag equals weight' },
         { icon: '📐', title: 'The Formula', desc: 'v_t = √(2mg/ρCdA) - depends on mass AND area' },
         { icon: '🪂', title: 'Parachutes Work', desc: 'Large area dramatically reduces terminal velocity' },
         { icon: '🌧️', title: 'Real Impacts', desc: 'From raindrops to skydiving to aircraft landing' }
      ];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', background: `linear-gradient(135deg, ${colors.bgDark} 0%, #0a1628 50%, ${colors.bgDark} 100%)` }}>
            {confetti.map((c, i) => <div key={i} style={{ position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', left: `${c.x}%`, top: `${c.y}%`, backgroundColor: c.color, animation: `bounce ${1.5 + c.delay}s infinite` }} />)}
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto', zIndex: 10 }}>
               <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.accent}30 100%)`, border: `3px solid ${colors.primary}`, boxShadow: `0 0 60px ${colors.primary}40` }}>🪂</div>
                  <h1 style={{ fontSize: '36px', fontWeight: 900, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, #ec4899 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Terminal Velocity Master!</h1>
                  <p style={{ fontSize: '16px', color: colors.textSecondary, marginTop: space.md }}>You understand why parachutes save lives!</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginTop: space.xxl, textAlign: 'left' }}>
                     {masteryItems.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg, background: `linear-gradient(135deg, ${colors.bgCard}80 0%, ${colors.bgCardLight}40 100%)`, border: `1px solid ${colors.border}` }}>
                           <div style={{ width: '48px', height: '48px', borderRadius: radius.md, background: `${colors.success}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{item.icon}</div>
                           <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: '14px', color: colors.textPrimary, margin: 0 }}>{item.title}</p><p style={{ fontSize: '12px', color: colors.textMuted, margin: '4px 0 0' }}>{item.desc}</p></div>
                           <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: '14px' }}>✓</span></div>
                        </div>
                     ))}
                  </div>
                  <div style={{ display: 'flex', gap: space.lg, justifyContent: 'center', marginTop: space.xxl }}>
                     <button onMouseDown={() => { setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); setPrediction(null); setTwistPrediction(null); setCompletedApps([false, false, false, false]); goToPhase('hook'); }} style={{ padding: `${space.lg} ${space.xxl}`, borderRadius: radius.lg, fontWeight: 700, background: colors.bgCardLight, color: colors.textSecondary, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>Start Over</button>
                     <button onMouseDown={() => { setFilterPositions([0, 0, 0, 0]); setFilterVelocities([0, 0, 0, 0]); setDropComplete(false); goToPhase('play'); }} style={{ padding: `${space.lg} ${space.xxl}`, borderRadius: radius.lg, fontWeight: 700, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: colors.textPrimary, border: 'none', cursor: 'pointer', boxShadow: `0 8px 32px ${colors.primary}40` }}>Free Exploration</button>
                  </div>
               </div>
            </div>
            <div style={{ padding: space.lg, background: colors.bgCard, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center' }}>
               {onBack && <button onMouseDown={() => { if (navigationLockRef.current) return; navigationLockRef.current = true; onBack(); setTimeout(() => { navigationLockRef.current = false; }, 400); }} style={{ padding: `${space.md} ${space.xxl}`, borderRadius: radius.md, fontWeight: 700, fontSize: '16px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: colors.textPrimary, border: 'none', cursor: 'pointer', boxShadow: `${shadows.md}, ${shadows.glow(colors.primary)}` }}>Back to Topics</button>}
            </div>
         </div>
      );
   }

   return null;
};

export default TerminalVelocityRenderer;
