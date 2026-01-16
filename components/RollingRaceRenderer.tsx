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

interface RollingRaceRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
   onBack?: () => void;
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

// --- ROLLING RACE RENDERER ---
const RollingRaceRenderer: React.FC<RollingRaceRendererProps> = ({ onGameEvent, gamePhase, onBack }) => {
   type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   const getInitialPhase = (): Phase => {
      if (gamePhase && validPhases.includes(gamePhase as Phase)) {
         return gamePhase as Phase;
      }
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
   const [isRacing, setIsRacing] = useState(false);
   const [raceTime, setRaceTime] = useState(0);
   const [solidPosition, setSolidPosition] = useState(0);
   const [hollowPosition, setHollowPosition] = useState(0);
   const [raceComplete, setRaceComplete] = useState(false);
   const [rampAngle, setRampAngle] = useState(30);
   const [massDistribution, setMassDistribution] = useState(0.5); // 0 = all center, 1 = all edge
   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [selectedApp, setSelectedApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
   const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);

   // Responsive design
   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // AI Coach integration
   const [guidedMode, setGuidedMode] = useState(true);
   const [lastCoachMessage, setLastCoachMessage] = useState<string>('');

   const emitGameEvent = useCallback((
      eventType: GameEvent['eventType'],
      details: GameEvent['details']
   ) => {
      if (onGameEvent) {
         onGameEvent({
            eventType,
            gameType: 'rolling_race',
            gameTitle: 'Rolling Race: Solid vs Hollow',
            details,
            timestamp: Date.now()
         });
      }
   }, [onGameEvent]);

   const coachMessages: Record<Phase, string> = {
      hook: "Which wins down a ramp - a solid cylinder or a hollow one? The answer reveals a hidden law of physics!",
      predict: "Time to make your prediction! Think about where the mass is located in each cylinder.",
      play: "Watch the race! Notice which cylinder accelerates faster. Can you see the difference?",
      review: "The solid cylinder wins! But why? The secret lies in how energy is divided between rolling and spinning.",
      twist_predict: "What if we could change where the mass is located? How would that affect the race?",
      twist_play: "Adjust the mass distribution and see how it changes the speed. More mass at the edge means...?",
      twist_review: "You've discovered the moment of inertia principle! This is why wheels are designed the way they are.",
      transfer: "From racing wheels to figure skating spins - rotational inertia is everywhere!",
      test: "Time to test your understanding of rotational dynamics!",
      mastery: "Congratulations! You've mastered rotational inertia and its real-world applications!"
   };

   // Navigation debouncing
   const navigationLockRef = useRef(false);

   const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const phaseLabels: Record<Phase, string> = {
      hook: 'Introduction',
      predict: 'Predict',
      play: 'Race',
      review: 'Understanding',
      twist_predict: 'New Variable',
      twist_play: 'Mass Distribution',
      twist_review: 'Deep Insight',
      transfer: 'Real World',
      test: 'Knowledge Test',
      mastery: 'Mastery'
   };

   const goToPhase = useCallback((p: Phase) => {
      if (navigationLockRef.current) return;
      navigationLockRef.current = true;

      setPhase(p);
      if (p === 'play' || p === 'twist_play') {
         setIsRacing(false);
         setSolidPosition(0);
         setHollowPosition(0);
         setRaceComplete(false);
         setRaceTime(0);
      }
      playSound(400 + Math.random() * 200, 0.1);

      const idx = phaseOrder.indexOf(p);
      emitGameEvent('phase_changed', {
         phase: p,
         phaseLabel: phaseLabels[p],
         currentScreen: idx + 1,
         totalScreens: phaseOrder.length,
         coachMessage: guidedMode ? coachMessages[p] : undefined,
         message: `Entered phase: ${phaseLabels[p]}`
      });
      if (guidedMode) {
         setLastCoachMessage(coachMessages[p]);
      }

      setTimeout(() => { navigationLockRef.current = false; }, 400);
   }, [emitGameEvent, guidedMode, coachMessages, phaseLabels, phaseOrder]);

   // Premium color palette
   const colors = {
      primary: '#f97316', // orange-500
      primaryDark: '#ea580c', // orange-600
      accent: '#8b5cf6', // violet-500
      accentDark: '#7c3aed', // violet-600
      warning: '#eab308', // yellow-500
      success: '#22c55e', // green-500
      danger: '#ef4444', // red-500
      bgDark: '#0c0a09', // stone-950
      bgCard: '#1c1917', // stone-900
      bgCardLight: '#292524', // stone-800
      border: '#44403c', // stone-700
      textPrimary: '#fafaf9', // stone-50
      textSecondary: '#a8a29e', // stone-400
      textMuted: '#78716c', // stone-500
   };

   const space = { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px' };
   const radius = { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' };
   const shadows = {
      sm: '0 2px 8px rgba(0,0,0,0.3)',
      md: '0 4px 16px rgba(0,0,0,0.4)',
      lg: '0 8px 32px rgba(0,0,0,0.5)',
      glow: (color: string) => `0 0 20px ${color}40`
   };

   // Emit game started event
   useEffect(() => {
      const timer = setTimeout(() => {
         emitGameEvent('game_started', {
            phase: 'hook',
            phaseLabel: 'Introduction',
            currentScreen: 1,
            totalScreens: phaseOrder.length,
            coachMessage: guidedMode ? coachMessages.hook : '',
            message: 'Rolling Race lesson started'
         });
         if (guidedMode) {
            setLastCoachMessage(coachMessages.hook);
         }
      }, 100);
      return () => clearTimeout(timer);
   }, []);

   // Race simulation
   useEffect(() => {
      if (isRacing && !raceComplete) {
         const interval = setInterval(() => {
            setRaceTime(t => t + 0.016);

            // Physics: acceleration = g * sin(theta) / (1 + I/(mr^2))
            // For solid cylinder: I = 0.5*m*r^2, so denominator = 1.5
            // For hollow cylinder: I = m*r^2, so denominator = 2
            const g = 9.8;
            const sinTheta = Math.sin(rampAngle * Math.PI / 180);

            // Solid cylinder accelerates faster
            const solidAccel = g * sinTheta / 1.5;
            // Hollow cylinder accelerates slower
            const hollowAccel = g * sinTheta / 2.0;

            setSolidPosition(prev => {
               const newPos = Math.min(100, prev + solidAccel * 0.08);
               if (newPos >= 100 && !raceComplete) {
                  setRaceComplete(true);
                  setIsRacing(false);
               }
               return newPos;
            });
            setHollowPosition(prev => Math.min(100, prev + hollowAccel * 0.08));
         }, 16);
         return () => clearInterval(interval);
      }
   }, [isRacing, raceComplete, rampAngle]);

   // Confetti for mastery
   useEffect(() => {
      if (phase === 'mastery') {
         const confettiColors = ['#f97316', '#8b5cf6', '#ec4899', '#22c55e', '#eab308', '#3b82f6'];
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
               Back
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
                  if (!canGoNext) return;
                  if (onNext) {
                     onNext();
                  } else if (currentIdx < phaseOrder.length - 1) {
                     goToPhase(phaseOrder[currentIdx + 1]);
                  }
               }}
            >
               {nextLabel}
            </button>
         </div>
      );
   };

   // Helper: section header
   const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
      <div style={{ marginBottom: '24px' }}>
         <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>{phaseName}</p>
         <h2 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary, margin: 0 }}>{title}</h2>
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
            <p style={{ fontSize: '12px', lineHeight: 1.6, color: colors.textSecondary, margin: 0 }}>{description}</p>
         </div>
      </div>
   );

   // SVG Visualization for rolling race
   const renderRollingRaceViz = (showLabels: boolean = true) => (
      <svg viewBox="0 0 700 400" style={{ width: '100%', height: '100%', maxHeight: '400px' }}>
         <defs>
            <linearGradient id="rampGradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#44403c" />
               <stop offset="100%" stopColor="#292524" />
            </linearGradient>
            <linearGradient id="solidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor={colors.primary} />
               <stop offset="100%" stopColor={colors.primaryDark} />
            </linearGradient>
            <linearGradient id="hollowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor={colors.accent} />
               <stop offset="100%" stopColor={colors.accentDark} />
            </linearGradient>
            <filter id="cylinderShadow" x="-50%" y="-50%" width="200%" height="200%">
               <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5" />
            </filter>
         </defs>

         {/* Background */}
         <rect width="700" height="400" fill={colors.bgDark} />

         {/* Grid pattern */}
         <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke={colors.border} strokeWidth="0.5" strokeOpacity="0.3" />
         </pattern>
         <rect width="700" height="400" fill="url(#gridPattern)" />

         {/* Ramp */}
         <g transform={`translate(100, 100)`}>
            <polygon
               points="0,0 500,250 500,280 0,30"
               fill="url(#rampGradient)"
               stroke={colors.border}
               strokeWidth="2"
            />
            {/* Ramp surface highlight */}
            <line x1="0" y1="0" x2="500" y2="250" stroke={colors.textMuted} strokeWidth="1" opacity="0.3" />
         </g>

         {/* Solid cylinder (orange) - rolls faster */}
         <g transform={`translate(${150 + solidPosition * 4}, ${130 + solidPosition * 1.2})`}>
            {/* Cylinder body */}
            <ellipse cx="0" cy="0" rx="30" ry="30" fill="url(#solidGradient)" filter="url(#cylinderShadow)" />
            {/* Inner mass distribution (solid) */}
            <ellipse cx="0" cy="0" rx="25" ry="25" fill={colors.primary} opacity="0.8" />
            <ellipse cx="0" cy="0" rx="18" ry="18" fill={colors.primaryDark} opacity="0.7" />
            <ellipse cx="0" cy="0" rx="10" ry="10" fill={colors.primary} opacity="0.9" />
            {/* Rotation indicator */}
            <line x1="0" y1="-28" x2="0" y2="28" stroke={colors.textPrimary} strokeWidth="2" opacity="0.5"
               transform={`rotate(${solidPosition * 6})`} />
            {showLabels && (
               <text x="0" y="-45" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">SOLID</text>
            )}
         </g>

         {/* Hollow cylinder (purple) - rolls slower */}
         <g transform={`translate(${150 + hollowPosition * 4}, ${200 + hollowPosition * 1.2})`}>
            {/* Cylinder body */}
            <ellipse cx="0" cy="0" rx="30" ry="30" fill="url(#hollowGradient)" filter="url(#cylinderShadow)" />
            {/* Inner mass distribution (hollow) */}
            <ellipse cx="0" cy="0" rx="28" ry="28" fill={colors.accent} opacity="0.4" />
            <ellipse cx="0" cy="0" rx="20" ry="20" fill={colors.bgDark} />
            {/* Rotation indicator */}
            <line x1="0" y1="-28" x2="0" y2="28" stroke={colors.textPrimary} strokeWidth="2" opacity="0.5"
               transform={`rotate(${hollowPosition * 6})`} />
            {showLabels && (
               <text x="0" y="55" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">HOLLOW</text>
            )}
         </g>

         {/* Finish line */}
         <line x1="580" y1="350" x2="620" y2="370" stroke={colors.success} strokeWidth="4" strokeDasharray="10,5" />
         <text x="600" y="395" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="bold">FINISH</text>

         {/* Energy bars */}
         {showLabels && (
            <g transform="translate(20, 320)">
               <text x="0" y="0" fill={colors.textSecondary} fontSize="11" fontWeight="bold">ENERGY SPLIT:</text>

               {/* Solid: more translational energy */}
               <rect x="0" y="10" width="80" height="16" fill={colors.bgCardLight} rx="3" />
               <rect x="0" y="10" width="53" height="16" fill={colors.primary} rx="3" />
               <text x="85" y="22" fill={colors.primary} fontSize="10">Solid: 67% motion</text>

               {/* Hollow: more rotational energy */}
               <rect x="0" y="32" width="80" height="16" fill={colors.bgCardLight} rx="3" />
               <rect x="0" y="32" width="40" height="16" fill={colors.accent} rx="3" />
               <text x="85" y="44" fill={colors.accent} fontSize="10">Hollow: 50% motion</text>
            </g>
         )}

         {/* Winner indicator */}
         {raceComplete && (
            <g transform="translate(350, 50)">
               <rect x="-100" y="-20" width="200" height="40" rx="20" fill={colors.success} />
               <text x="0" y="6" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">SOLID WINS!</text>
            </g>
         )}
      </svg>
   );

   // Test questions
   const testQuestions = [
      {
         scenario: "You roll a solid sphere and a hollow sphere of the same mass and radius down an inclined ramp.",
         question: "Which reaches the bottom first?",
         options: [
            { id: 'solid', label: "The solid sphere reaches the bottom first", correct: true },
            { id: 'hollow', label: "The hollow sphere reaches the bottom first" },
            { id: 'same', label: "They reach at exactly the same time" },
            { id: 'depends', label: "It depends on how hard you push them" },
         ],
         explanation: "The solid sphere has less rotational inertia relative to its mass, so more energy goes into translation (forward motion) rather than rotation. Less energy 'wasted' on spinning means faster travel!"
      },
      {
         scenario: "A figure skater starts spinning with arms extended, then pulls their arms close to their body.",
         question: "What happens to their spin rate and why?",
         options: [
            { id: 'faster', label: "They spin faster - moving mass inward decreases moment of inertia, increasing angular velocity", correct: true },
            { id: 'slower', label: "They spin slower - pulling in takes energy from the spin" },
            { id: 'same', label: "No change - angular momentum is not affected by arm position" },
            { id: 'stop', label: "They stop spinning because of conservation of momentum" },
         ],
         explanation: "Angular momentum (L = I*omega) is conserved. When the skater pulls in their arms, moment of inertia (I) decreases, so angular velocity (omega) must increase to keep L constant. This is the same principle as the rolling race!"
      },
      {
         scenario: "A car manufacturer wants to design wheels that accelerate quickly from a stop.",
         question: "What wheel design would maximize acceleration?",
         options: [
            { id: 'heavy_rim', label: "Heavy rims with lightweight spokes" },
            { id: 'light_center', label: "Lightweight wheels with mass concentrated at the hub (center)", correct: true },
            { id: 'uniform', label: "Uniform mass distribution throughout the wheel" },
            { id: 'no_difference', label: "Wheel mass distribution doesn't affect acceleration" },
         ],
         explanation: "Mass near the center (hub) minimizes moment of inertia. Less rotational inertia means more energy goes into accelerating the car forward. Racing wheels are designed with this principle!"
      },
      {
         scenario: "You have two identical cans: one full of soup and one empty. You roll them down a ramp.",
         question: "Which reaches the bottom first?",
         options: [
            { id: 'full', label: "The full can - it has more mass to accelerate it", correct: true },
            { id: 'empty', label: "The empty can - it's lighter and rolls easier" },
            { id: 'same', label: "Same time - gravity affects them equally" },
            { id: 'full_slips', label: "The full can wins but only because it slides, not rolls" },
         ],
         explanation: "The full can has solid-like mass distribution (soup fills the center), while the empty can is hollow. The full can is closer to a solid cylinder, so it has lower rotational inertia relative to its mass and wins!"
      },
      {
         scenario: "A gymnast is rotating in the air during a flip. They want to speed up their rotation.",
         question: "What should they do?",
         options: [
            { id: 'tuck', label: "Tuck their body into a tight ball (move mass toward rotation axis)", correct: true },
            { id: 'extend', label: "Extend their arms and legs outward" },
            { id: 'kick', label: "Kick their legs forward" },
            { id: 'nothing', label: "Nothing - rotation speed can't change once airborne" },
         ],
         explanation: "By tucking into a ball, the gymnast moves mass closer to their rotation axis, decreasing moment of inertia. With angular momentum conserved, they spin faster. This is why flips are done in a tucked position!"
      },
      {
         scenario: "A flywheel is used to store energy in a mechanical system. Engineers want to maximize energy storage for a given mass.",
         question: "How should they design the flywheel?",
         options: [
            { id: 'rim_mass', label: "Concentrate mass at the outer rim", correct: true },
            { id: 'center_mass', label: "Concentrate mass at the center (hub)" },
            { id: 'uniform', label: "Distribute mass uniformly" },
            { id: 'spokes', label: "Use many thin spokes" },
         ],
         explanation: "Rotational kinetic energy = (1/2)*I*omega^2. Higher moment of inertia (I) means more energy stored at the same rotation rate. Mass at the rim maximizes I, maximizing energy storage. This is the opposite of what you want for acceleration!"
      },
      {
         scenario: "Two cylinders roll without slipping down a ramp. Cylinder A has I = 0.5MR^2 (solid) and Cylinder B has I = MR^2 (thin hoop).",
         question: "What fraction of the total energy is translational (motion) for each?",
         options: [
            { id: 'correct', label: "A: 67% translational, B: 50% translational", correct: true },
            { id: 'opposite', label: "A: 50% translational, B: 67% translational" },
            { id: 'equal', label: "Both have 50% translational energy" },
            { id: 'all_trans', label: "All energy is translational for rolling objects" },
         ],
         explanation: "For rolling: v = omega*R. Total KE = (1/2)Mv^2 + (1/2)I*omega^2. For solid: KE_trans/KE_total = 1/(1 + I/(MR^2)) = 1/(1 + 0.5) = 67%. For hoop: = 1/(1 + 1) = 50%. More goes to spinning for the hoop!"
      },
      {
         scenario: "A yo-yo is designed with all its mass concentrated in two discs at the edges, connected by a thin axle.",
         question: "How does this design affect the yo-yo's behavior?",
         options: [
            { id: 'stable', label: "It spins longer and more stably because mass at edges increases moment of inertia", correct: true },
            { id: 'fast', label: "It spins faster because the discs create less air resistance" },
            { id: 'short', label: "It returns faster because edge mass increases tension" },
            { id: 'same', label: "It has no effect on performance" },
         ],
         explanation: "Mass at the edges maximizes moment of inertia. Higher I means the yo-yo resists changes to its rotation (more gyroscopic stability) and stores more rotational energy for a given speed, making it spin longer!"
      },
      {
         scenario: "On icy roads, anti-lock brakes prevent wheels from locking (stopping rotation). A locked wheel slides rather than rolls.",
         question: "Why is sliding worse than rolling for braking?",
         options: [
            { id: 'friction', label: "Kinetic friction (sliding) is usually less than static friction (rolling contact)", correct: true },
            { id: 'inertia', label: "Locked wheels have infinite moment of inertia" },
            { id: 'energy', label: "Rolling converts more kinetic energy to heat" },
            { id: 'steering', label: "Sliding wheels can still steer (this is wrong but is a common misconception)" },
         ],
         explanation: "Static friction (rolling without slipping) typically exceeds kinetic friction (sliding). ABS keeps wheels rolling, maintaining the higher friction force for better braking. Plus, rolling wheels can still steer!"
      },
      {
         scenario: "A diver leaves the diving board and wants to complete a triple somersault before hitting the water.",
         question: "What sequence of body positions would maximize their rotation count?",
         options: [
            { id: 'tuck_late', label: "Start extended, tuck tight mid-flight, extend before entry", correct: true },
            { id: 'tuck_early', label: "Tuck immediately off the board, stay tucked until entry" },
            { id: 'extended', label: "Stay extended throughout - more air time" },
            { id: 'alternate', label: "Alternate between tucked and extended rapidly" },
         ],
         explanation: "Starting extended converts board energy to angular momentum. Tucking mid-flight decreases I, increasing omega to complete rotations quickly. Extending before entry increases I, slowing rotation for a clean entry. This is rotational inertia in action!"
      }
   ];

   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   // Real-world applications for transfer phase
   const realWorldApps = [
      {
         icon: '🚗',
         title: 'Racing Wheels',
         short: 'Lightweight rims for acceleration',
         tagline: 'Engineering for Speed',
         description: 'Racing wheels are designed with minimum mass, especially at the rim. This reduces rotational inertia, allowing faster acceleration and deceleration. Carbon fiber wheels can save 10+ lbs compared to steel, with most savings at the rim.',
         connection: 'Just like the solid cylinder wins because more energy goes to forward motion, lightweight wheels let more engine power translate to acceleration instead of spinning up the wheels.',
         howItWorks: 'Engineers use materials like carbon fiber and magnesium alloys. The spokes are thin while the hub is robust. Every gram saved at the rim is worth about 2 grams saved at the hub due to the r^2 relationship.',
         stats: [
            { value: '15-20%', label: 'Faster acceleration', icon: '⚡' },
            { value: '10+ lbs', label: 'Weight savings possible', icon: '🏎️' },
            { value: '$5,000+', label: 'Premium wheel cost', icon: '💰' }
         ],
         examples: ['Formula 1 uses ultra-light magnesium alloy wheels', 'Carbon fiber bicycle wheels cost $2000+ but accelerate noticeably faster', 'Motorcycle racers obsess over unsprung (wheel) weight', 'Drag racers use skinny wheels to minimize rotational mass'],
         companies: ['BBS', 'Enkei', 'HRE', 'Vossen', 'Forgiato'],
         futureImpact: 'Electric vehicles benefit even more from low-inertia wheels since regenerative braking effectiveness depends on wheel response time.',
         color: colors.primary
      },
      {
         icon: '🌀',
         title: 'Flywheels',
         short: 'Energy storage at the rim',
         tagline: 'Spinning Batteries',
         description: 'Flywheels store kinetic energy through rotation. Unlike racing wheels, flywheels want MAXIMUM moment of inertia - mass at the rim. Modern flywheels in vacuum enclosures can store energy for hours with minimal loss.',
         connection: 'This is the opposite of racing wheels! The hollow cylinder spins slower but stores more rotational energy. Flywheels maximize I to maximize energy storage at any given rotation rate.',
         howItWorks: 'Energy = (1/2)*I*omega^2. To maximize energy at safe rotation speeds, maximize I by putting mass at the rim. Carbon fiber allows higher speeds without flying apart.',
         stats: [
            { value: '25 kWh', label: 'Energy capacity (large units)', icon: '🔋' },
            { value: '95%+', label: 'Round-trip efficiency', icon: '♻️' },
            { value: '100,000+', label: 'Cycle lifetime', icon: '📊' }
         ],
         examples: ['Grid-scale energy storage for renewable power smoothing', 'UPS systems for data centers provide instant backup', 'Kinetic Energy Recovery Systems (KERS) in F1 cars', 'NASA spacecraft attitude control using momentum wheels'],
         companies: ['Beacon Power', 'Amber Kinetics', 'Temporal Power', 'Helix Power'],
         futureImpact: 'Flywheel energy storage may become key for grid stability as renewable energy grows, offering fast response times that batteries cannot match.',
         color: colors.accent
      },
      {
         icon: '⛸️',
         title: 'Figure Skating',
         short: 'Spin control through body position',
         tagline: 'Physics on Ice',
         description: 'Figure skaters demonstrate conservation of angular momentum perfectly. By pulling their arms in, they decrease their moment of inertia and spin faster - sometimes exceeding 300 RPM in championship performances.',
         connection: 'The skater\'s body is like our cylinders. Arms extended = hollow (high I, slow spin). Arms tucked = solid (low I, fast spin). Angular momentum (L = I*omega) stays constant!',
         howItWorks: 'Starting with arms out establishes angular momentum. Pulling in can reduce I by 50% or more, doubling (or more) the rotation rate. Extending arms slows the spin for a controlled stop.',
         stats: [
            { value: '300+ RPM', label: 'Peak spin rate', icon: '🌀' },
            { value: '50%+', label: 'I reduction possible', icon: '📉' },
            { value: '0.8 sec', label: 'Fastest triple axel', icon: '⏱️' }
         ],
         examples: ['Scratch spins start slow (arms out) and accelerate (arms in)', 'Triple axel requires tucking tight to complete 3.5 rotations', 'Pairs skaters use death spirals (arms extended = slow, controlled)', 'Ice dancers control speed by arm and leg position'],
         companies: ['ISU (governing body)', 'Jackson Ultima', 'Edea', 'Riedell'],
         futureImpact: 'Understanding rotational physics helps coaches design training programs and helps judges evaluate technical execution.',
         color: colors.success
      },
      {
         icon: '🎯',
         title: 'Gyroscopes & Stability',
         short: 'Resisting orientation changes',
         tagline: 'Physics of Balance',
         description: 'Gyroscopes resist changes to their orientation due to angular momentum. The higher the moment of inertia and spin rate, the more stable they are. This principle guides everything from bicycle balance to spacecraft orientation.',
         connection: 'A rapidly spinning disc with mass at the rim (like our hollow cylinder) has high angular momentum. This resists any attempt to change its orientation - the basis of gyroscopic stability.',
         howItWorks: 'Precession: When you try to tilt a gyroscope, it rotates perpendicular to the applied force instead. The faster it spins and the higher its I, the stronger this effect.',
         stats: [
            { value: '25,000 RPM', label: 'Typical gyro spin rate', icon: '💫' },
            { value: '0.01°', label: 'Precision per hour', icon: '🎯' },
            { value: '$50M+', label: 'Spacecraft gyroscope', icon: '🛸' }
         ],
         examples: ['Bicycle wheels create gyroscopic forces that help with balance', 'Smartphone gyros detect rotation for games and photos', 'Ship stabilizers use large gyros to reduce rolling', 'Hubble telescope uses reaction wheels for precise pointing'],
         companies: ['Honeywell', 'Northrop Grumman', 'Bosch', 'InvenSense'],
         futureImpact: 'MEMS (micro) gyroscopes are enabling new applications in drones, VR headsets, and autonomous vehicles that require precise motion sensing.',
         color: colors.warning
      }
   ];

   // --- RENDER PHASES ---

   // HOOK Phase
   if (phase === 'hook') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '800px' }}>
                  {renderSectionHeader("Step 1 • The Mystery", "Which Wins the Race?", "A simple question with a surprising answer that reveals hidden physics.")}

                  {/* Visual */}
                  <div style={{
                     background: colors.bgCard,
                     borderRadius: radius.xl,
                     padding: space.lg,
                     marginBottom: space.xl,
                     border: `1px solid ${colors.border}`
                  }}>
                     {renderRollingRaceViz(false)}
                  </div>

                  {/* Hook story */}
                  <div style={{
                     padding: space.xl,
                     borderRadius: radius.lg,
                     background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}10 100%)`,
                     border: `1px solid ${colors.primary}30`,
                     marginBottom: space.xl
                  }}>
                     <p style={{ fontSize: '18px', lineHeight: 1.7, color: colors.textSecondary, margin: 0 }}>
                        Imagine two cylinders at the top of a ramp - same size, same mass. One is <strong style={{ color: colors.primary }}>solid metal</strong>, the other is a <strong style={{ color: colors.accent }}>hollow pipe</strong>. You release them at the same moment...
                     </p>
                     <p style={{ fontSize: '22px', fontWeight: 700, color: colors.textPrimary, marginTop: space.lg, marginBottom: 0 }}>
                        Which reaches the bottom first?
                     </p>
                  </div>

                  {/* Teaser cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: space.lg }}>
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.lg,
                        background: colors.bgCard,
                        border: `2px solid ${colors.primary}40`
                     }}>
                        <div style={{ fontSize: '32px', marginBottom: space.md }}>🔴</div>
                        <p style={{ fontWeight: 700, color: colors.primary, marginBottom: space.sm }}>Solid Cylinder</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Mass evenly distributed throughout</p>
                     </div>
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.lg,
                        background: colors.bgCard,
                        border: `2px solid ${colors.accent}40`
                     }}>
                        <div style={{ fontSize: '32px', marginBottom: space.md }}>🟣</div>
                        <p style={{ fontWeight: 700, color: colors.accent, marginBottom: space.sm }}>Hollow Cylinder</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Mass concentrated at the rim</p>
                     </div>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Make Your Prediction")}
         </div>
      );
   }

   // PREDICT Phase
   if (phase === 'predict') {
      const options = [
         { id: 'solid', label: 'Solid cylinder wins', desc: 'The solid one has more "stuff" pushing it forward', icon: '🔴' },
         { id: 'hollow', label: 'Hollow cylinder wins', desc: 'The hollow one is easier to roll', icon: '🟣' },
         { id: 'same', label: 'They tie exactly', desc: 'Same mass + same gravity = same speed', icon: '🤝' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 2 • Make a Prediction", "What's Your Guess?", "Don't worry about being right - scientists were surprised too!")}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                     {options.map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'predict',
                                 prediction: opt.id,
                                 predictionLabel: opt.label
                              });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: space.lg,
                              padding: space.xl,
                              borderRadius: radius.lg,
                              textAlign: 'left',
                              background: prediction === opt.id ? `${colors.primary}20` : colors.bgCard,
                              border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                           }}
                        >
                           <span style={{ fontSize: '32px' }}>{opt.icon}</span>
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, marginBottom: '4px', color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{opt.desc}</p>
                           </div>
                           {prediction === opt.id && (
                              <div style={{
                                 width: '24px',
                                 height: '24px',
                                 borderRadius: '50%',
                                 background: colors.primary,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center'
                              }}>
                                 <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                              </div>
                           )}
                        </button>
                     ))}
                  </div>

                  <div style={{
                     marginTop: space.xl,
                     padding: space.lg,
                     borderRadius: radius.md,
                     background: colors.bgCardLight,
                     border: `1px solid ${colors.border}`
                  }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: space.sm, color: colors.warning }}>Think About It</p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>
                        Both have the same mass and start at the same height. Gravity pulls equally on both. So what could possibly make one faster?
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!prediction, "Run the Race")}
         </div>
      );
   }

   // PLAY Phase
   if (phase === 'play') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, padding: space.lg, minHeight: isMobile ? '300px' : 'auto' }}>
                  <div style={{
                     height: '100%',
                     borderRadius: radius.lg,
                     overflow: 'hidden',
                     background: colors.bgCard,
                     border: `1px solid ${colors.border}`
                  }}>
                     {renderRollingRaceViz(true)}
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '280px',
                  padding: space.lg,
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: space.lg
               }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.primary }}>Step 3 • The Race</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 900, color: colors.textPrimary, margin: `${space.sm} 0 0` }}>Watch Them Roll</h3>
                  </div>

                  {/* Race controls */}
                  <button
                     onMouseDown={() => {
                        if (!isRacing && !raceComplete) {
                           setIsRacing(true);
                           playSound(600, 0.2);
                        } else if (raceComplete) {
                           setSolidPosition(0);
                           setHollowPosition(0);
                           setRaceComplete(false);
                           setRaceTime(0);
                           setTimeout(() => setIsRacing(true), 100);
                        }
                     }}
                     style={{
                        width: '100%',
                        padding: space.lg,
                        borderRadius: radius.md,
                        fontWeight: 700,
                        fontSize: '16px',
                        background: isRacing ? colors.bgCardLight : `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: isRacing ? 'not-allowed' : 'pointer',
                        boxShadow: isRacing ? 'none' : shadows.md
                     }}
                     disabled={isRacing}
                  >
                     {isRacing ? 'Racing...' : raceComplete ? '🔄 Race Again' : '🏁 Start Race!'}
                  </button>

                  {/* Stats */}
                  <div style={{
                     padding: space.lg,
                     borderRadius: radius.md,
                     background: colors.bgCardLight,
                     border: `1px solid ${colors.border}`
                  }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: space.md }}>Race Progress</p>

                     <div style={{ marginBottom: space.md }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                           <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>Solid</span>
                           <span style={{ fontSize: '12px', color: colors.primary }}>{Math.round(solidPosition)}%</span>
                        </div>
                        <div style={{ height: '8px', background: colors.bgDark, borderRadius: '4px' }}>
                           <div style={{ height: '100%', width: `${solidPosition}%`, background: colors.primary, borderRadius: '4px', transition: 'width 0.1s' }} />
                        </div>
                     </div>

                     <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                           <span style={{ fontSize: '12px', color: colors.accent, fontWeight: 600 }}>Hollow</span>
                           <span style={{ fontSize: '12px', color: colors.accent }}>{Math.round(hollowPosition)}%</span>
                        </div>
                        <div style={{ height: '8px', background: colors.bgDark, borderRadius: '4px' }}>
                           <div style={{ height: '100%', width: `${hollowPosition}%`, background: colors.accent, borderRadius: '4px', transition: 'width 0.1s' }} />
                        </div>
                     </div>
                  </div>

                  {/* Result */}
                  {raceComplete && (
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.md,
                        background: `${colors.success}15`,
                        border: `2px solid ${colors.success}`
                     }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: colors.success, margin: 0 }}>
                           🏆 Solid Wins!
                        </p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: space.sm, marginBottom: 0 }}>
                           The solid cylinder reached the finish first. But why?
                        </p>
                     </div>
                  )}
               </div>
            </div>

            {renderBottomBar(true, raceComplete, "Understand Why")}
         </div>
      );
   }

   // REVIEW Phase
   if (phase === 'review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '700px' }}>
                  {renderSectionHeader("Step 4 • The Science", "Why Solid Wins", "The secret is how energy gets divided between motion and spin.")}

                  {/* Main insight */}
                  <div style={{
                     padding: space.xl,
                     borderRadius: radius.lg,
                     background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`,
                     border: `1px solid ${colors.primary}40`,
                     marginBottom: space.xl
                  }}>
                     <p style={{ fontSize: '16px', lineHeight: 1.7, color: colors.textSecondary, margin: 0 }}>
                        When a cylinder rolls, it has <strong style={{ color: colors.primary }}>two types of kinetic energy</strong>:
                     </p>
                     <ul style={{ margin: `${space.lg} 0`, paddingLeft: space.xl, color: colors.textSecondary }}>
                        <li style={{ marginBottom: space.sm }}><strong style={{ color: colors.textPrimary }}>Translational</strong> - moving forward (what we want!)</li>
                        <li><strong style={{ color: colors.textPrimary }}>Rotational</strong> - spinning around (necessary but "costs" energy)</li>
                     </ul>
                     <p style={{ fontSize: '16px', color: colors.textPrimary, fontWeight: 700, margin: 0 }}>
                        The hollow cylinder puts MORE energy into spinning, leaving LESS for forward motion!
                     </p>
                  </div>

                  {/* Key takeaways */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginBottom: space.xl }}>
                     {renderKeyTakeaway("⚡", "Energy Split Matters", "Total energy from gravity is the same, but hollow objects waste more on rotation.")}
                     {renderKeyTakeaway("🎯", "Moment of Inertia (I)", "I measures resistance to spinning. Mass far from center = high I = hard to spin up = slow down the ramp.")}
                     {renderKeyTakeaway("📐", "The Formula", "Solid cylinder: I = 0.5MR². Hollow cylinder: I = MR². The hollow has 2x the rotational inertia!")}
                  </div>

                  {/* Quote */}
                  <div style={{
                     padding: space.xl,
                     borderRadius: radius.lg,
                     background: colors.bgCard,
                     border: `1px solid ${colors.border}`,
                     textAlign: 'center'
                  }}>
                     <p style={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary, margin: 0, lineHeight: 1.6 }}>
                        "It's not about total mass - it's about <em>where</em> the mass is located."
                     </p>
                     <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: space.md, marginBottom: 0 }}>— The Principle of Rotational Inertia</p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "The Twist")}
         </div>
      );
   }

   // TWIST PREDICT Phase
   if (phase === 'twist_predict') {
      const options = [
         { id: 'faster', label: 'It rolls faster', desc: 'Spreading mass out helps somehow', icon: '⬆️' },
         { id: 'slower', label: 'It rolls slower', desc: 'More edge mass means more rotational energy wasted', icon: '⬇️' },
         { id: 'same', label: 'No change', desc: 'Total mass is what matters, not distribution', icon: '➡️' },
      ];

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '600px' }}>
                  {renderSectionHeader("Step 5 • New Variable", "What If You Move the Mass?", "Can we control how fast something rolls by changing where we put the mass?")}

                  <div style={{
                     padding: space.lg,
                     borderRadius: radius.lg,
                     background: `${colors.accent}15`,
                     border: `1px solid ${colors.accent}30`,
                     marginBottom: space.xl
                  }}>
                     <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>
                        Imagine you can slide mass between the center and the rim of a wheel. If you move mass <strong style={{ color: colors.accent }}>toward the edge</strong>, what happens to rolling speed?
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                     {options.map(opt => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              setTwistPrediction(opt.id);
                              emitGameEvent('prediction_made', {
                                 phase: 'twist_predict',
                                 prediction: opt.id,
                                 predictionLabel: opt.label
                              });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: space.lg,
                              padding: space.xl,
                              borderRadius: radius.lg,
                              textAlign: 'left',
                              background: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgCard,
                              border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                           }}
                        >
                           <span style={{ fontSize: '28px' }}>{opt.icon}</span>
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, marginBottom: '4px', color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>{opt.desc}</p>
                           </div>
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!twistPrediction, "Experiment")}
         </div>
      );
   }

   // TWIST PLAY Phase
   if (phase === 'twist_play') {
      // Calculate effective I based on mass distribution
      const effectiveI = 0.5 + massDistribution * 0.5; // Ranges from 0.5 (solid) to 1.0 (hollow)
      const rollSpeed = 1 / (1 + effectiveI); // Fraction of energy that's translational

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{ flex: 1, padding: space.lg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 400 400" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
                     <defs>
                        <linearGradient id="wheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                           <stop offset="0%" stopColor={colors.accent} />
                           <stop offset="100%" stopColor={colors.accentDark} />
                        </linearGradient>
                     </defs>

                     <rect width="400" height="400" fill={colors.bgDark} />

                     {/* Wheel */}
                     <g transform="translate(200, 180)">
                        {/* Outer rim - always present */}
                        <circle r="120" fill="none" stroke={colors.accent} strokeWidth={8 + massDistribution * 20} />

                        {/* Inner mass - varies with distribution */}
                        <circle r={100 - massDistribution * 60} fill={colors.accent} opacity={1 - massDistribution * 0.7} />

                        {/* Hub */}
                        <circle r="15" fill={colors.textPrimary} />

                        {/* Spokes */}
                        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                           <line
                              key={angle}
                              x1="15" y1="0" x2="110" y2="0"
                              stroke={colors.textMuted}
                              strokeWidth="3"
                              transform={`rotate(${angle})`}
                           />
                        ))}
                     </g>

                     {/* Labels */}
                     <text x="200" y="340" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
                        Mass Distribution
                     </text>
                     <text x="60" y="370" textAnchor="middle" fill={colors.primary} fontSize="12">Center (Fast)</text>
                     <text x="340" y="370" textAnchor="middle" fill={colors.accent} fontSize="12">Edge (Slow)</text>

                     {/* Speed indicator */}
                     <g transform="translate(200, 50)">
                        <rect x="-80" y="-15" width="160" height="30" rx="15" fill={colors.bgCard} stroke={colors.border} />
                        <text x="0" y="6" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
                           Speed: {Math.round(rollSpeed * 100)}%
                        </text>
                     </g>
                  </svg>
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '300px',
                  padding: space.xl,
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: space.xl
               }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.accent }}>Step 6 • Mass Distribution</p>
                     <h3 style={{ fontSize: '18px', fontWeight: 900, color: colors.textPrimary, margin: `${space.sm} 0 0` }}>Move the Mass</h3>
                  </div>

                  {/* Slider */}
                  <div>
                     <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={massDistribution}
                        onChange={(e) => setMassDistribution(parseFloat(e.target.value))}
                        style={{
                           width: '100%',
                           accentColor: colors.accent,
                           height: '8px'
                        }}
                     />
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: space.sm }}>
                        <span style={{ fontSize: '11px', color: colors.primary }}>Solid-like</span>
                        <span style={{ fontSize: '11px', color: colors.accent }}>Hollow-like</span>
                     </div>
                  </div>

                  {/* Explanation */}
                  <div style={{
                     padding: space.lg,
                     borderRadius: radius.md,
                     background: colors.bgCardLight,
                     border: `1px solid ${colors.border}`
                  }}>
                     <p style={{ fontSize: '14px', fontWeight: 600, color: colors.textPrimary, marginBottom: space.sm }}>
                        What's happening:
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
                        As you move mass to the edge, moment of inertia (I) increases. More energy goes to rotation, less to forward motion.
                     </p>
                     <div style={{
                        marginTop: space.lg,
                        padding: space.md,
                        background: colors.bgDark,
                        borderRadius: radius.sm,
                        fontFamily: 'monospace'
                     }}>
                        <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                           I = {effectiveI.toFixed(2)} × MR²
                        </p>
                        <p style={{ fontSize: '12px', color: colors.success, margin: `${space.xs} 0 0` }}>
                           Translation Energy: {Math.round(rollSpeed * 100)}%
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Deep Insight")}
         </div>
      );
   }

   // TWIST REVIEW Phase
   if (phase === 'twist_review') {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
               <div style={{ width: '100%', maxWidth: '700px' }}>
                  {renderSectionHeader("Step 7 • Deep Insight", "Mass Distribution Is Everything", "This principle shapes technology from racing wheels to satellites.")}

                  {/* Big insight */}
                  <div style={{
                     padding: space.xl,
                     borderRadius: radius.lg,
                     background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.primary}10 100%)`,
                     border: `1px solid ${colors.accent}40`,
                     marginBottom: space.xl,
                     textAlign: 'center'
                  }}>
                     <p style={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                        I = Σ m·r²
                     </p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: space.md, marginBottom: 0 }}>
                        Moment of inertia grows with the <strong style={{ color: colors.accent }}>square</strong> of distance. Moving mass twice as far from center increases I by <strong style={{ color: colors.accent }}>four times</strong>!
                     </p>
                  </div>

                  {/* Applications preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: space.lg, marginBottom: space.xl }}>
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.lg,
                        background: colors.bgCard,
                        border: `1px solid ${colors.success}40`
                     }}>
                        <p style={{ fontSize: '24px', marginBottom: space.sm }}>🏎️</p>
                        <p style={{ fontWeight: 700, color: colors.success, marginBottom: space.xs }}>Want Fast Acceleration?</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Minimize I → Mass at center → Light rims</p>
                     </div>
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.lg,
                        background: colors.bgCard,
                        border: `1px solid ${colors.warning}40`
                     }}>
                        <p style={{ fontSize: '24px', marginBottom: space.sm }}>🔋</p>
                        <p style={{ fontWeight: 700, color: colors.warning, marginBottom: space.xs }}>Want Energy Storage?</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Maximize I → Mass at rim → Flywheels</p>
                     </div>
                  </div>

                  {/* Key takeaways */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                     {renderKeyTakeaway("🎯", "Design Principle", "Engineers choose mass distribution based on whether they want quick response (low I) or stability/storage (high I).")}
                     {renderKeyTakeaway("⛸️", "Human Applications", "Figure skaters, divers, and gymnasts use this constantly - arms in = fast spin, arms out = slow spin.")}
                     {renderKeyTakeaway("🛸", "Space Applications", "Satellites use reaction wheels with carefully tuned I for precise attitude control.")}
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Real World Examples")}
         </div>
      );
   }

   // TRANSFER Phase
   if (phase === 'transfer') {
      const currentApp = realWorldApps[selectedApp];
      const allCompleted = completedApps.every(c => c);
      const isCurrentCompleted = completedApps[selectedApp];
      const completedCount = completedApps.filter(c => c).length;

      const handleCompleteApp = () => {
         const newCompleted = [...completedApps];
         newCompleted[selectedApp] = true;
         setCompletedApps(newCompleted);

         emitGameEvent('selection_made', {
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

            {/* Tab header */}
            <div style={{ padding: `${space.lg} ${space.lg} ${space.md}`, background: colors.bgCard, borderBottom: `1px solid ${colors.border}` }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
                  <div>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.success }}>Step 8 • Real World Applications</p>
                     <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{completedCount}/4 completed</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                     {completedApps.map((completed, i) => (
                        <div key={i} style={{
                           width: '12px',
                           height: '12px',
                           borderRadius: '50%',
                           background: completed ? colors.success : i === selectedApp ? realWorldApps[i].color : colors.bgCardLight,
                           boxShadow: i === selectedApp ? `0 0 8px ${realWorldApps[i].color}` : 'none'
                        }} />
                     ))}
                  </div>
               </div>

               {/* Tabs */}
               <div style={{ display: 'flex', gap: space.sm }}>
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
                              gap: space.sm,
                              padding: space.md,
                              borderRadius: radius.md,
                              background: isCurrent ? `${app.color}20` : 'transparent',
                              border: `2px solid ${isCurrent ? app.color : isCompleted ? colors.success : colors.border}`,
                              opacity: isLocked ? 0.4 : 1,
                              cursor: isLocked ? 'not-allowed' : 'pointer'
                           }}
                        >
                           <span style={{ fontSize: '18px' }}>{app.icon}</span>
                           {!isMobile && (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: isCurrent ? colors.textPrimary : colors.textSecondary }}>
                                 {app.title.split(' ')[0]}
                              </span>
                           )}
                           {isCompleted && <span style={{ color: colors.success }}>✓</span>}
                           {isLocked && <span>🔒</span>}
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: space.lg }}>
               <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  {/* Hero */}
                  <div style={{
                     padding: space.xl,
                     borderRadius: radius.lg,
                     background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${currentApp.color}05 100%)`,
                     border: `1px solid ${currentApp.color}30`,
                     marginBottom: space.xl
                  }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: space.lg, marginBottom: space.lg }}>
                        <div style={{
                           width: '70px',
                           height: '70px',
                           borderRadius: radius.lg,
                           background: `${currentApp.color}30`,
                           border: `2px solid ${currentApp.color}`,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '36px'
                        }}>
                           {currentApp.icon}
                        </div>
                        <div>
                           <h2 style={{ fontSize: '24px', fontWeight: 900, color: colors.textPrimary, margin: 0 }}>{currentApp.title}</h2>
                           <p style={{ fontSize: '14px', color: currentApp.color, fontWeight: 600, marginTop: '4px' }}>{currentApp.tagline}</p>
                        </div>
                     </div>
                     <p style={{ fontSize: '15px', lineHeight: 1.7, color: colors.textSecondary, margin: 0 }}>{currentApp.description}</p>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space.md, marginBottom: space.xl }}>
                     {currentApp.stats.map((stat, i) => (
                        <div key={i} style={{
                           padding: space.lg,
                           borderRadius: radius.md,
                           background: colors.bgCard,
                           border: `1px solid ${colors.border}`,
                           textAlign: 'center'
                        }}>
                           <p style={{ fontSize: '24px', margin: 0 }}>{stat.icon}</p>
                           <p style={{ fontSize: '20px', fontWeight: 900, color: currentApp.color, margin: `${space.sm} 0` }}>{stat.value}</p>
                           <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0, textTransform: 'uppercase' }}>{stat.label}</p>
                        </div>
                     ))}
                  </div>

                  {/* Connection + How it works */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: space.lg, marginBottom: space.xl }}>
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.md,
                        background: `${colors.primary}10`,
                        border: `1px solid ${colors.primary}30`
                     }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.primary, marginBottom: space.sm }}>🔗 Rolling Race Connection</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{currentApp.connection}</p>
                     </div>
                     <div style={{
                        padding: space.lg,
                        borderRadius: radius.md,
                        background: colors.bgCard,
                        border: `1px solid ${colors.border}`
                     }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: space.sm }}>⚙️ How It Works</p>
                        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{currentApp.howItWorks}</p>
                     </div>
                  </div>

                  {/* Examples */}
                  <div style={{
                     padding: space.lg,
                     borderRadius: radius.md,
                     background: colors.bgCard,
                     border: `1px solid ${colors.border}`,
                     marginBottom: space.xl
                  }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: space.md }}>Real Examples</p>
                     <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: space.sm }}>
                        {currentApp.examples.map((ex, i) => (
                           <div key={i} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: space.sm,
                              padding: space.md,
                              background: colors.bgCardLight,
                              borderRadius: radius.sm
                           }}>
                              <div style={{
                                 width: '20px',
                                 height: '20px',
                                 borderRadius: '50%',
                                 background: `${currentApp.color}30`,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '10px',
                                 fontWeight: 700,
                                 color: currentApp.color,
                                 flexShrink: 0
                              }}>
                                 {i + 1}
                              </div>
                              <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>{ex}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Bottom bar */}
            <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               padding: space.lg,
               borderTop: `1px solid ${colors.border}`,
               background: colors.bgCard,
               gap: space.md
            }}>
               <button
                  onMouseDown={() => goToPhase('twist_review')}
                  style={{
                     padding: `${space.md} ${space.lg}`,
                     borderRadius: radius.md,
                     fontWeight: 600,
                     fontSize: '14px',
                     background: colors.bgCardLight,
                     color: colors.textSecondary,
                     border: 'none',
                     cursor: 'pointer'
                  }}
               >
                  Back
               </button>

               {!isCurrentCompleted ? (
                  <button
                     onMouseDown={handleCompleteApp}
                     style={{
                        flex: 1,
                        maxWidth: '300px',
                        padding: `${space.md} ${space.xl}`,
                        borderRadius: radius.md,
                        fontWeight: 700,
                        fontSize: '14px',
                        background: `linear-gradient(135deg, ${currentApp.color}, ${colors.accent})`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: shadows.md
                     }}
                  >
                     ✓ Mark as Read
                  </button>
               ) : (
                  <div style={{ flex: 1, maxWidth: '300px', textAlign: 'center' }}>
                     <span style={{ color: colors.success, fontWeight: 600 }}>✓ Completed</span>
                  </div>
               )}

               <button
                  onMouseDown={() => allCompleted && goToPhase('test')}
                  style={{
                     padding: `${space.md} ${space.xl}`,
                     borderRadius: radius.md,
                     fontWeight: 700,
                     fontSize: '14px',
                     background: allCompleted ? `linear-gradient(135deg, ${colors.warning}, ${colors.primary})` : colors.bgCardLight,
                     color: allCompleted ? colors.textPrimary : colors.textMuted,
                     border: 'none',
                     cursor: allCompleted ? 'pointer' : 'not-allowed',
                     opacity: allCompleted ? 1 : 0.5
                  }}
               >
                  {allCompleted ? 'Take Test' : `${completedCount}/4`}
               </button>
            </div>
         </div>
      );
   }

   // TEST Phase
   if (phase === 'test') {
      const currentQ = testQuestions[testQuestion];

      if (testSubmitted) {
         const score = calculateTestScore();
         const totalQuestions = testQuestions.length;
         const passed = score >= Math.ceil(totalQuestions * 0.7);

         return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: colors.bgDark }}>
               {renderProgressBar()}
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto' }}>
                  <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                     <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        background: passed ? `${colors.success}20` : `${colors.warning}20`,
                        border: `3px solid ${passed ? colors.success : colors.warning}`
                     }}>
                        {score === totalQuestions ? '🏆' : passed ? '🌟' : '📚'}
                     </div>
                     <h2 style={{ fontSize: '28px', fontWeight: 900, color: colors.textPrimary, margin: 0 }}>{score}/{totalQuestions} Correct</h2>
                     <p style={{ color: passed ? colors.success : colors.warning, marginTop: space.sm }}>
                        {passed ? 'Great job! You understand rotational inertia!' : 'Keep exploring - this takes practice!'}
                     </p>

                     <div style={{ display: 'flex', gap: space.md, justifyContent: 'center', marginTop: space.xl }}>
                        <button
                           onMouseDown={() => { setTestQuestion(0); setTestAnswers(Array(10).fill(null)); setTestSubmitted(false); }}
                           style={{
                              padding: `${space.md} ${space.xl}`,
                              borderRadius: radius.md,
                              fontWeight: 600,
                              background: colors.bgCard,
                              color: colors.textSecondary,
                              border: `1px solid ${colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           🔄 Retake
                        </button>
                        <button
                           onMouseDown={() => goToPhase('mastery')}
                           style={{
                              padding: `${space.md} ${space.xl}`,
                              borderRadius: radius.md,
                              fontWeight: 700,
                              background: passed ? colors.success : colors.warning,
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer'
                           }}
                        >
                           {passed ? '🎓 Claim Mastery' : '📖 Review Lesson'}
                        </button>
                     </div>

                     {/* Question review */}
                     <div style={{ marginTop: space.xxl, textAlign: 'left' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, marginBottom: space.lg }}>Question Review</p>
                        {testQuestions.map((q, i) => {
                           const correct = q.options.find(o => o.correct)?.id;
                           const isCorrect = testAnswers[i] === correct;
                           return (
                              <div key={i} style={{
                                 padding: space.lg,
                                 borderRadius: radius.md,
                                 background: colors.bgCard,
                                 border: `2px solid ${isCorrect ? colors.success : colors.danger}40`,
                                 marginBottom: space.md
                              }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
                                    <div style={{
                                       width: '24px',
                                       height: '24px',
                                       borderRadius: '50%',
                                       background: isCorrect ? colors.success : colors.danger,
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       color: 'white',
                                       fontSize: '12px',
                                       fontWeight: 700
                                    }}>
                                       {isCorrect ? '✓' : '✗'}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>Q{i + 1}: {q.question.substring(0, 50)}...</span>
                                 </div>
                                 <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0, paddingLeft: '32px' }}>{q.explanation}</p>
                              </div>
                           );
                        })}
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
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.warning }}>Step 9 • Knowledge Test</p>
                     <h2 style={{ fontSize: '24px', fontWeight: 900, color: colors.textPrimary, margin: `${space.sm} 0` }}>Question {testQuestion + 1} of {testQuestions.length}</h2>
                     <div style={{ display: 'flex', gap: '4px' }}>
                        {testQuestions.map((_, i) => (
                           <div key={i} style={{
                              flex: 1,
                              height: '6px',
                              borderRadius: '3px',
                              background: i === testQuestion ? colors.warning : i < testQuestion ? colors.success : colors.bgCardLight
                           }} />
                        ))}
                     </div>
                  </div>

                  {/* Scenario */}
                  <div style={{
                     padding: space.lg,
                     borderRadius: radius.md,
                     background: `${colors.primary}15`,
                     border: `1px solid ${colors.primary}30`,
                     marginBottom: space.lg
                  }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.primary, marginBottom: space.sm }}>Scenario</p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>{currentQ.scenario}</p>
                  </div>

                  {/* Question */}
                  <p style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: space.lg }}>{currentQ.question}</p>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
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
                              gap: space.md,
                              padding: space.lg,
                              borderRadius: radius.md,
                              textAlign: 'left',
                              background: testAnswers[testQuestion] === opt.id ? `${colors.warning}20` : colors.bgCard,
                              border: `2px solid ${testAnswers[testQuestion] === opt.id ? colors.warning : colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: testAnswers[testQuestion] === opt.id ? colors.warning : colors.bgCardLight,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textMuted
                           }}>
                              {String.fromCharCode(65 + i)}
                           </div>
                           <p style={{ fontSize: '14px', color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textSecondary, margin: 0 }}>{opt.label}</p>
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!testAnswers[testQuestion], testQuestion < testQuestions.length - 1 ? `Question ${testQuestion + 2}` : 'Submit', () => {
               if (testQuestion < testQuestions.length - 1) {
                  setTestQuestion(testQuestion + 1);
               } else {
                  setTestSubmitted(true);
                  const finalScore = calculateTestScore();
                  emitGameEvent('game_completed', {
                     phase: 'test',
                     score: finalScore,
                     totalQuestions: testQuestions.length,
                     percentage: Math.round((finalScore / testQuestions.length) * 100)
                  });
               }
            }, colors.warning)}
         </div>
      );
   }

   // MASTERY Phase
   if (phase === 'mastery') {
      const masteryItems = [
         { icon: '🏎️', title: 'Rotational Inertia', desc: 'Mass distribution determines resistance to spinning' },
         { icon: '⚖️', title: 'Energy Division', desc: 'Rolling objects split energy between translation and rotation' },
         { icon: '📐', title: 'The I = mr² Relationship', desc: 'Distance from axis matters more than total mass' },
         { icon: '🎯', title: 'Engineering Trade-offs', desc: 'Low I for quick response, high I for stability/storage' },
         { icon: '⛸️', title: 'Human Applications', desc: 'Athletes use body position to control spin rates' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1a0f0a 50%, ${colors.bgDark} 100%)`
         }}>
            {confetti.map((c, i) => (
               <div key={i} style={{
                  position: 'absolute',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  backgroundColor: c.color,
                  animation: `bounce ${1.5 + c.delay}s infinite`
               }} />
            ))}
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: space.xl, overflowY: 'auto', zIndex: 10 }}>
               <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                  <div style={{
                     width: '100px',
                     height: '100px',
                     borderRadius: '50%',
                     margin: '0 auto 24px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     fontSize: '50px',
                     background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.accent}30 100%)`,
                     border: `3px solid ${colors.primary}`,
                     boxShadow: `0 0 60px ${colors.primary}40`
                  }}>
                     🏆
                  </div>

                  <h1 style={{
                     fontSize: '36px',
                     fontWeight: 900,
                     background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, #ec4899 100%)`,
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     margin: 0
                  }}>
                     Rotational Dynamics Master!
                  </h1>
                  <p style={{ fontSize: '16px', color: colors.textSecondary, marginTop: space.md }}>
                     You've unlocked the physics of spinning objects. Here's what you've mastered:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginTop: space.xxl, textAlign: 'left' }}>
                     {masteryItems.map((item, i) => (
                        <div key={i} style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: space.lg,
                           padding: space.lg,
                           borderRadius: radius.lg,
                           background: `linear-gradient(135deg, ${colors.bgCard}80 0%, ${colors.bgCardLight}40 100%)`,
                           border: `1px solid ${colors.border}`
                        }}>
                           <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: radius.md,
                              background: `${colors.success}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px'
                           }}>
                              {item.icon}
                           </div>
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, fontSize: '14px', color: colors.textPrimary, margin: 0 }}>{item.title}</p>
                              <p style={{ fontSize: '12px', color: colors.textMuted, margin: `4px 0 0` }}>{item.desc}</p>
                           </div>
                           <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: colors.success,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                           }}>
                              <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div style={{ display: 'flex', gap: space.lg, justifyContent: 'center', marginTop: space.xxl }}>
                     <button
                        onMouseDown={() => {
                           setTestQuestion(0);
                           setTestAnswers(Array(10).fill(null));
                           setTestSubmitted(false);
                           setPrediction(null);
                           setTwistPrediction(null);
                           setCompletedApps([false, false, false, false]);
                           goToPhase('hook');
                        }}
                        style={{
                           padding: `${space.lg} ${space.xxl}`,
                           borderRadius: radius.lg,
                           fontWeight: 700,
                           background: colors.bgCardLight,
                           color: colors.textSecondary,
                           border: `1px solid ${colors.border}`,
                           cursor: 'pointer'
                        }}
                     >
                        Start Over
                     </button>
                     <button
                        onMouseDown={() => {
                           setIsRacing(false);
                           setSolidPosition(0);
                           setHollowPosition(0);
                           setRaceComplete(false);
                           goToPhase('play');
                        }}
                        style={{
                           padding: `${space.lg} ${space.xxl}`,
                           borderRadius: radius.lg,
                           fontWeight: 700,
                           background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                           color: colors.textPrimary,
                           border: 'none',
                           cursor: 'pointer',
                           boxShadow: `0 8px 32px ${colors.primary}40`
                        }}
                     >
                        Free Exploration
                     </button>
                  </div>
               </div>
            </div>

            {/* Back to topics button */}
            <div style={{
               padding: space.lg,
               background: colors.bgCard,
               borderTop: `1px solid ${colors.border}`,
               display: 'flex',
               justifyContent: 'center'
            }}>
               {onBack && (
                  <button
                     onMouseDown={() => {
                        if (navigationLockRef.current) return;
                        navigationLockRef.current = true;
                        onBack();
                        setTimeout(() => { navigationLockRef.current = false; }, 400);
                     }}
                     style={{
                        padding: `${space.md} ${space.xxl}`,
                        borderRadius: radius.md,
                        fontWeight: 700,
                        fontSize: '16px',
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                        color: colors.textPrimary,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `${shadows.md}, ${shadows.glow(colors.primary)}`
                     }}
                  >
                     Back to Topics
                  </button>
               )}
            </div>
         </div>
      );
   }

   return null;
};

export default RollingRaceRenderer;
