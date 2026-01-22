import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// GAME EVENT TYPE DEFINITIONS (GOLD STANDARD)
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'parameter_changed'
  | 'object_submerged'
  | 'displacement_measured'
  | 'material_changed'
  | 'milestone_reached'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'app_completed'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface ArchimedesPrincipleRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUND SYSTEM - TYPE-BASED PATTERN (GOLD STANDARD)
// ═══════════════════════════════════════════════════════════════════════════
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
   if (typeof window === 'undefined') return;
   try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
         click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
         success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
         failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
         transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
         complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
   } catch {
      // Silent fail if audio not available
   }
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS (NUMERIC PHASES)
// ═══════════════════════════════════════════════════════════════════════════
// Phase is now numeric 0-9 for consistency with gold standard
// 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const phaseLabels: Record<number, string> = {
  0: 'Introduction',
  1: 'Predict',
  2: 'Experiment',
  3: 'Understanding',
  4: 'New Challenge',
  5: 'Crown Test',
  6: 'Deep Insight',
  7: 'Real World',
  8: 'Knowledge Test',
  9: 'Mastery'
};

// Premium color palette
const colors = {
   primary: '#f59e0b',      // amber-500
   primaryDark: '#d97706',  // amber-600
   accent: '#06b6d4',       // cyan-500
   accentDark: '#0891b2',   // cyan-600
   warning: '#f59e0b',      // amber-500
   success: '#10b981',      // emerald-500
   danger: '#ef4444',       // red-500
   bgDark: '#020617',       // slate-950
   bgCard: '#0f172a',       // slate-900
   bgCardLight: '#1e293b',  // slate-800
   border: '#334155',       // slate-700
   textPrimary: '#f8fafc',  // slate-50
   textSecondary: '#94a3b8', // slate-400
   textMuted: '#64748b',    // slate-500
};

// ═══════════════════════════════════════════════════════════════════════════
// 10 TEST QUESTIONS WITH SCENARIOS AND EXPLANATIONS
// ═══════════════════════════════════════════════════════════════════════════
const testQuestions = [
   {
      scenario: "You're at a swimming pool and notice that a beach ball floats easily while a golf ball sinks immediately.",
      question: "According to Archimedes' Principle, what determines whether an object floats or sinks?",
      options: [
         { id: 'a', label: "The object's weight alone" },
         { id: 'b', label: "The object's color and surface texture" },
         { id: 'c', label: "Whether the object's average density is less than or greater than the fluid's density", correct: true },
         { id: 'd', label: "The depth of the water" },
      ],
      explanation: "An object floats when its average density is less than the fluid's density. The beach ball has very low density (mostly air inside), while the golf ball is denser than water. The buoyant force equals the weight of displaced fluid - if this exceeds the object's weight, it floats!"
   },
   {
      scenario: "Archimedes was asked to determine if King Hiero's crown was pure gold without melting or damaging it.",
      question: "How did water displacement allow Archimedes to solve this problem?",
      options: [
         { id: 'a', label: "By measuring how fast the crown sank" },
         { id: 'b', label: "By comparing the volume of water displaced to what pure gold of the same weight would displace", correct: true },
         { id: 'c', label: "By checking if the crown changed the water's color" },
         { id: 'd', label: "By weighing the water before and after" },
      ],
      explanation: "Pure gold has a specific density (19.3 g/cm³). If the crown was mixed with silver (less dense), it would need more volume to weigh the same. More volume = more water displaced. Archimedes compared the crown's displacement to a pure gold sample of equal weight - different displacement meant fraud!"
   },
   {
      scenario: "A steel ship weighing 50,000 tons floats on the ocean, yet a small steel bolt sinks immediately.",
      question: "How can a massive steel ship float while a tiny bolt sinks?",
      options: [
         { id: 'a', label: "Ships are made of special lightweight steel" },
         { id: 'b', label: "The ocean's salt makes everything float" },
         { id: 'c', label: "The ship's hull shape displaces a huge volume of water, creating buoyant force equal to its weight", correct: true },
         { id: 'd', label: "Ships float because of their engines" },
      ],
      explanation: "The key is AVERAGE density, not material density. A ship's hull encloses a massive air-filled volume. The total weight divided by total volume (including air space) gives a density less than water. The ship displaces enough water to generate a buoyant force equaling its weight - so it floats!"
   },
   {
      scenario: "A submarine captain needs to dive deeper. The sub currently floats at the surface.",
      question: "How does a submarine control whether it floats or sinks?",
      options: [
         { id: 'a', label: "By changing its propeller speed" },
         { id: 'b', label: "By filling or emptying ballast tanks with water to change average density", correct: true },
         { id: 'c', label: "By heating or cooling the water around it" },
         { id: 'd', label: "By turning the sub upside down" },
      ],
      explanation: "Submarines have ballast tanks. To dive: fill tanks with water → increases mass → average density exceeds water → negative buoyancy → sinks. To surface: blow compressed air into tanks, forcing water out → decreases mass → average density less than water → positive buoyancy → rises. Neutral buoyancy means hovering!"
   },
   {
      scenario: "A fish needs to maintain its depth without constantly swimming.",
      question: "How do most bony fish control their buoyancy?",
      options: [
         { id: 'a', label: "By swallowing water" },
         { id: 'b', label: "By changing color to absorb different amounts of light" },
         { id: 'c', label: "By adjusting the gas volume in their swim bladder", correct: true },
         { id: 'd', label: "By moving their fins very fast" },
      ],
      explanation: "Fish have a swim bladder - an internal gas-filled organ. To rise: transfer gas into the bladder → fish expands → displaces more water → buoyancy increases. To descend: absorb gas from bladder → fish compresses → displaces less water → buoyancy decreases. It's the same principle as submarine ballast tanks!"
   },
   {
      scenario: "You're wearing a life jacket and jump into a lake. The life jacket weighs 2 kg but keeps you afloat.",
      question: "If the life jacket displaces 20 liters of water when fully submerged, what buoyant force does it provide?",
      options: [
         { id: 'a', label: "2 N" },
         { id: 'b', label: "20 N" },
         { id: 'c', label: "200 N (approximately)", correct: true },
         { id: 'd', label: "2000 N" },
      ],
      explanation: "Buoyant force = weight of displaced fluid. 20 liters of water = 20 kg mass. Weight = mg = 20 × 10 = 200 N. The life jacket provides 200 N of upward force. Since it only weighs 2 kg (20 N), the net upward force is 180 N - enough to support an adult's head above water!"
   },
   {
      scenario: "An engineer is designing an oil tanker. The ship must carry 100,000 tons of crude oil without sinking.",
      question: "If crude oil is less dense than water, how does this affect the ship design?",
      options: [
         { id: 'a', label: "The ship can be smaller because oil weighs less than water" },
         { id: 'b', label: "The ship rides higher when full of oil than when full of water", correct: true },
         { id: 'c', label: "The ship needs extra engines to stay afloat" },
         { id: 'd', label: "Oil makes no difference to the design" },
      ],
      explanation: "When empty, the ship sits high. Loading with oil adds weight, so it sinks lower until buoyant force equals total weight. Since oil is less dense than water (about 0.85 g/cm³), a full oil cargo weighs less than the same volume of water would. The loaded tanker rides slightly higher than if carrying water cargo!"
   },
   {
      scenario: "A Hot air balloon weighs 250 kg (including basket, burner, and passengers). It's barely floating.",
      question: "If the balloon envelope contains 2500 m³ of air heated to 100°C (density 0.95 kg/m³) while surrounding air is 25°C (density 1.18 kg/m³), what's the lift?",
      options: [
         { id: 'a', label: "Zero - hot air balloons don't use Archimedes' principle" },
         { id: 'b', label: "About 575 kg of lift", correct: true },
         { id: 'c', label: "2500 kg of lift" },
         { id: 'd', label: "250 kg of lift" },
      ],
      explanation: "Archimedes' principle works for gases too! Lift = (ρ_cold - ρ_hot) × Volume = (1.18 - 0.95) × 2500 = 0.23 × 2500 = 575 kg. The balloon displaces 2500 m³ of cold air (2950 kg) but only contains 2375 kg of hot air. Net lift = 575 kg, minus 250 kg payload = 325 kg available lift!"
   },
   {
      scenario: "A hydrometer (density measuring device) is used to test battery acid. It floats higher in denser fluid.",
      question: "A car battery's acid should have density 1.265 g/cm³ when fully charged. If your hydrometer sinks too low, what does this indicate?",
      options: [
         { id: 'a', label: "The battery is overcharged" },
         { id: 'b', label: "The acid is too dense" },
         { id: 'c', label: "The battery is discharged (acid density has decreased)", correct: true },
         { id: 'd', label: "The hydrometer is broken" },
      ],
      explanation: "A hydrometer floats based on Archimedes' principle - it sinks until it displaces its own weight in fluid. Denser fluid = less volume needed to displace that weight = floats higher. Discharged battery acid has lower density (more water, less sulfuric acid). Lower density = hydrometer sinks deeper = battery needs charging!"
   },
   {
      scenario: "NASA trains astronauts underwater in a Neutral Buoyancy Laboratory to simulate spacewalks. Astronauts are weighted to achieve neutral buoyancy.",
      question: "Why must weights be precisely calibrated for each astronaut and spacesuit combination?",
      options: [
         { id: 'a', label: "To make them sink faster for dramatic training" },
         { id: 'b', label: "To exactly match buoyant force with gravitational force so they neither float nor sink", correct: true },
         { id: 'c', label: "To protect them from water pressure" },
         { id: 'd', label: "Weights are only for looking professional" },
      ],
      explanation: "Neutral buoyancy simulates zero-g because the net force is zero - buoyant force exactly equals weight. Too light: astronaut floats up. Too heavy: astronaut sinks. Precise weight adjustment accounts for the astronaut's body density, suit volume, and breathing (which changes displacement). This creates the most realistic spacewalk training on Earth!"
   }
];

// ═══════════════════════════════════════════════════════════════════════════
// 4 COMPREHENSIVE REAL-WORLD APPLICATIONS
// ═══════════════════════════════════════════════════════════════════════════
const realWorldApps = [
   {
      icon: '🚢',
      title: 'Ship Design & Naval Architecture',
      short: 'Hull design optimization',
      tagline: 'How Steel Giants Float',
      description: 'Every ship from kayaks to aircraft carriers relies on Archimedes\' principle. Naval architects calculate hull volume to ensure sufficient water displacement for any cargo configuration.',
      connection: 'The experiment you performed shows how displacement creates buoyant force. Ship designers use the same principle - they calculate the hull volume needed to displace enough water to support the ship\'s maximum weight.',
      howItWorks: 'Hull shape maximizes internal volume while minimizing drag. Double hulls, bulkheads, and precise loading calculations ensure the ship\'s center of gravity stays low and buoyancy remains positive.',
      stats: [
         { value: '500,000+', label: 'DWT largest tankers', icon: '⚓' },
         { value: '24,000', label: 'TEU container ships', icon: '📦' },
         { value: '$14B', label: 'Ship design market', icon: '💰' }
      ],
      examples: [
         'Container ships: Precisely calculate how many containers can be loaded at each port',
         'Cruise liners: Balance passenger comfort (high decks) with stability (low center of gravity)',
         'Oil tankers: Use ballast water to maintain safe draft when empty',
         'Icebreakers: Hull shape rides up on ice, using weight to break through'
      ],
      companies: ['Hyundai Heavy Industries', 'Daewoo Shipbuilding', 'Fincantieri', 'Meyer Werft'],
      futureImpact: 'Autonomous cargo ships will use real-time buoyancy calculations to optimize loading and fuel efficiency across variable sea conditions.',
      color: colors.primary
   },
   {
      icon: '🤿',
      title: 'Scuba Diving & Buoyancy Control',
      short: 'Precise depth control',
      tagline: 'Weightless Exploration',
      description: 'Divers use buoyancy control devices (BCDs) to achieve neutral buoyancy at any depth, allowing them to hover effortlessly while conserving energy and air.',
      connection: 'Just like adjusting the object\'s volume in the experiment changes buoyant force, divers inflate or deflate their BCD to fine-tune their buoyancy underwater.',
      howItWorks: 'BCDs are inflatable vests. Adding air increases volume → more water displaced → greater buoyancy. Releasing air does the opposite. Wetsuits compress at depth, requiring adjustment.',
      stats: [
         { value: '6M+', label: 'Active divers worldwide', icon: '🌊' },
         { value: '130ft', label: 'Recreational limit', icon: '📏' },
         { value: '~$6B', label: 'Dive industry value', icon: '💎' }
      ],
      examples: [
         'Technical diving: Carry multiple gases, adjust buoyancy as tanks empty',
         'Underwater photography: Achieve perfect stillness for sharp images',
         'Marine research: Hover at precise depths for specimen collection',
         'Rescue diving: Control ascent rate to prevent decompression sickness'
      ],
      companies: ['PADI', 'SSI', 'Scubapro', 'Aqua Lung'],
      futureImpact: 'Smart BCDs with pressure sensors will automatically maintain neutral buoyancy, reducing training time and improving safety.',
      color: colors.accent
   },
   {
      icon: '⚗️',
      title: 'Density Measurement & Quality Control',
      short: 'Non-destructive testing',
      tagline: 'Archimedes\' Legacy in Labs',
      description: 'Modern hydrometers, pycnometers, and density balances all use displacement principles to measure liquid and solid densities with extreme precision.',
      connection: 'The crown test you performed is exactly how scientists and engineers verify material purity today - comparing expected vs. actual density through displacement.',
      howItWorks: 'Hydrometers float at different heights based on liquid density. Pycnometers measure exact volumes. Density balances weigh samples in air and water to calculate density from buoyancy difference.',
      stats: [
         { value: '0.0001', label: 'g/cm³ precision', icon: '🎯' },
         { value: '24/7', label: 'Industrial monitoring', icon: '⏱️' },
         { value: '$2.1B', label: 'Density meter market', icon: '📊' }
      ],
      examples: [
         'Brewing: Monitor fermentation progress by tracking density drop',
         'Battery testing: Check acid density for charge level',
         'Jewelry appraisal: Verify gold purity without acid tests',
         'Fuel quality: Ensure correct gasoline/diesel density'
      ],
      companies: ['Mettler Toledo', 'Anton Paar', 'Emerson', 'Krüss'],
      futureImpact: 'Inline density sensors enable real-time process control in pharmaceutical, food, and chemical manufacturing.',
      color: colors.success
   },
   {
      icon: '🎈',
      title: 'Aerostatics & Lighter-Than-Air',
      short: 'Atmospheric buoyancy',
      tagline: 'Floating on Air',
      description: 'Hot air balloons, weather balloons, and airships all use Archimedes\' principle applied to gases - displacing heavier air with lighter gas creates lift.',
      connection: 'The same principle that makes objects float in water makes balloons float in air. A balloon displaces air, and if the displaced air weighs more than the balloon, it rises!',
      howItWorks: 'Hot air balloons heat air to reduce density. Helium/hydrogen balloons use naturally less dense gases. Airships combine buoyant lift with aerodynamic control surfaces.',
      stats: [
         { value: '2,000+', label: 'Weather balloons daily', icon: '🌤️' },
         { value: '120,000ft', label: 'Stratospheric balloons', icon: '🚀' },
         { value: '500+', label: 'Hot air balloon fests/yr', icon: '🎪' }
      ],
      examples: [
         'Weather forecasting: Radiosondes carried by balloons measure atmosphere',
         'Stratospheric research: NASA launches balloons for cosmic ray detection',
         'Advertising blimps: Stable platforms for aerial coverage',
         'Tourism: Hot air balloon rides offer unique perspective'
      ],
      companies: ['Cameron Balloons', 'Lindstrand', 'Zeppelin NT', 'Raven Aerostar'],
      futureImpact: 'Solar-powered stratospheric platforms could provide internet coverage and surveillance at a fraction of satellite costs.',
      color: colors.warning
   }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const ArchimedesPrincipleRenderer: React.FC<ArchimedesPrincipleRendererProps> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
   // ─── State ─────────────────────────────────────────────────────────────────
   const [phase, setPhase] = useState<number>(currentPhase ?? 0);
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [time, setTime] = useState(0);
   const [testQuestion, setTestQuestion] = useState(0);
   const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
   const [testSubmitted, setTestSubmitted] = useState(false);
   const [selectedApp, setSelectedApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
   const [confetti, setConfetti] = useState<Array<{x: number, y: number, color: string, delay: number}>>([]);

   // Experiment-specific state
   const [objectMass, setObjectMass] = useState(500);
   const [objectVolume, setObjectVolume] = useState(100);
   const [submergeProgress, setSubmergeProgress] = useState(0);
   const [isSubmerged, setIsSubmerged] = useState(false);
   const [selectedMaterial, setSelectedMaterial] = useState<'gold' | 'silver' | 'alloy'>('gold');
   const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'start' | 'submerging' | 'displaced' | 'complete'>('none');

   // ─── RESPONSIVE DESIGN ─────────────────────────────────────────────────────
   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // ─── Sync with external phase control ──────────────────────────────────────
   useEffect(() => {
      if (currentPhase !== undefined && currentPhase !== phase) {
         setPhase(currentPhase);
      }
   }, [currentPhase, phase]);

   // ─── Navigation (DUAL DEBOUNCE PATTERN - GOLD STANDARD) ────────────────────
   const isNavigating = useRef(false);
   const lastClickRef = useRef(0);

   const goToPhase = useCallback((p: number) => {
      // DUAL DEBOUNCE: Both time check AND flag check
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;  // Time-based debounce
      if (isNavigating.current) return;               // Flag-based debounce

      lastClickRef.current = now;
      isNavigating.current = true;

      setPhase(p);
      playSound('transition');

      onGameEvent?.({ type: 'phase_change', data: { phase: p, phaseName: phaseLabels[p] } });
      onPhaseComplete?.(p);

      setTimeout(() => { isNavigating.current = false; }, 400);
   }, [onGameEvent, onPhaseComplete]);

   const goNext = useCallback(() => {
      if (phase < PHASES.length - 1) {
         goToPhase(phase + 1);
      }
   }, [phase, goToPhase]);

   const goBack = useCallback(() => {
      if (phase > 0) goToPhase(phase - 1);
   }, [phase, goToPhase]);

   // ─── Animation Loop ────────────────────────────────────────────────────────
   useEffect(() => {
      const interval = setInterval(() => setTime(t => t + 0.02), 30);
      return () => clearInterval(interval);
   }, []);

   // Emit game_started on mount
   useEffect(() => {
      const timer = setTimeout(() => {
         onGameEvent?.({ type: 'phase_change', data: { phase: 0, phaseName: 'Introduction' } });
      }, 100);
      return () => clearTimeout(timer);
   }, [onGameEvent]);

   // Confetti effect
   useEffect(() => {
      if (phase === 9) {
         const confettiColors = ['#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#a855f7', '#3b82f6'];
         setConfetti(Array.from({ length: 60 }, (_, i) => ({
            x: Math.random() * 100, y: Math.random() * 100,
            color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
         })));
      }
   }, [phase]);

   // Submerge animation
   useEffect(() => {
      if (submergeProgress > 0 && submergeProgress < 100) {
         const interval = setInterval(() => {
            setSubmergeProgress(p => {
               if (p >= 100) {
                  setIsSubmerged(true);
                  setTeachingMilestone('complete');
                  return 100;
               }
               if (p > 50) setTeachingMilestone('displaced');
               else if (p > 0) setTeachingMilestone('submerging');
               return p + 2;
            });
         }, 30);
         return () => clearInterval(interval);
      }
   }, [submergeProgress]);

   // ─── Calculations ──────────────────────────────────────────────────────────
   const objectDensity = objectMass / objectVolume;
   const waterDensity = 1.0;
   const displacedVolume = isSubmerged ? objectVolume : (submergeProgress / 100) * objectVolume;
   const buoyantForce = displacedVolume * waterDensity * 9.81 / 1000;
   const weightInAir = objectMass * 9.81 / 1000;
   const apparentWeight = Math.max(0, weightInAir - buoyantForce);

   const materials = {
      gold: { density: 19.3, name: 'Pure Gold' },
      silver: { density: 10.5, name: 'Pure Silver' },
      alloy: { density: 14.2, name: 'Gold-Silver Alloy' }
   };

   // ─── Test Score ────────────────────────────────────────────────────────────
   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   // ═══════════════════════════════════════════════════════════════════════════
   // RENDER HELPER FUNCTIONS (NOT COMPONENTS)
   // ═══════════════════════════════════════════════════════════════════════════

   const renderProgressBar = () => {
      const currentIdx = PHASES.indexOf(phase);
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
            <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
               {PHASES.map((p, i) => (
                  <div
                     key={p}
                     onMouseDown={() => i < currentIdx && goToPhase(p)}
                     style={{
                        height: isMobile ? '10px' : '8px',
                        width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                        borderRadius: '5px',
                        backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                        cursor: i < currentIdx ? 'pointer' : 'default',
                        transition: 'all 0.3s',
                     }}
                     title={phaseLabels[p]}
                  />
               ))}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
               {currentIdx + 1} / {PHASES.length}
            </span>
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

   const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string) => {
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
                  cursor: canGoBack ? 'pointer' : 'not-allowed',
                  opacity: canGoBack ? 1 : 0.3,
                  minHeight: '44px'
               }}
               onMouseDown={() => canGoBack && goBack()}
            >
               ← Back
            </button>
            <button
               style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  background: canGoNext ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                  color: colors.textPrimary,
                  border: 'none',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  opacity: canGoNext ? 1 : 0.3,
                  boxShadow: canGoNext ? `0 4px 20px ${colors.primary}40` : 'none',
                  minHeight: '44px'
               }}
               onMouseDown={() => canGoNext && goNext()}
            >
               {nextLabel} →
            </button>
         </div>
      );
   };

   const renderKeyTakeaway = (icon: string, title: string, description: string, key?: number) => (
      <div key={key} style={{
         display: 'flex',
         gap: '16px',
         padding: '16px',
         borderRadius: '16px',
         background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
         border: `1px solid ${colors.border}`,
         marginBottom: '12px'
      }}>
         <div style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</div>
         <div>
            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: colors.textPrimary }}>{title}</p>
            <p style={{ fontSize: '12px', lineHeight: 1.6, color: colors.textSecondary }}>{description}</p>
         </div>
      </div>
   );

   const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
      <div style={{ marginBottom: '24px' }}>
         <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>{phaseName}</p>
         <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: colors.textPrimary }}>{title}</h2>
         {subtitle && <p style={{ fontSize: '14px', marginTop: '8px', color: colors.textSecondary }}>{subtitle}</p>}
      </div>
   );

   // ═══════════════════════════════════════════════════════════════════════════
   // PREMIUM SVG VISUALIZATION
   // ═══════════════════════════════════════════════════════════════════════════
   const renderDisplacementTank = (interactive: boolean = false) => {
      const submergeY = 60 + (submergeProgress / 100) * 100;
      const waterRise = (submergeProgress / 100) * (objectVolume / 3);

      return (
         <svg viewBox="0 0 500 320" style={{ width: '100%', maxHeight: '320px' }}>
            <defs>
               <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
               </linearGradient>
               <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
               </linearGradient>
               <linearGradient id="tankGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
               </linearGradient>
               <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>
            </defs>

            {/* Background */}
            <rect width="500" height="320" fill="#0f172a" />

            {/* Measurement scale */}
            <rect x="50" y="50" width="20" height="220" fill="#1e293b" stroke="#475569" strokeWidth="1" rx="3" />
            {[0, 50, 100, 150, 200].map((mark, i) => (
               <g key={i}>
                  <line x1="50" y1={270 - mark} x2="70" y2={270 - mark} stroke="#94a3b8" strokeWidth="1" />
                  <text x="40" y={274 - mark} textAnchor="end" fill="#94a3b8" fontSize="10">{mark}</text>
               </g>
            ))}
            <text x="35" y="160" textAnchor="middle" fill="#64748b" fontSize="9" transform="rotate(-90, 35, 160)">mL</text>

            {/* Main tank */}
            <rect x="80" y="50" width="180" height="220" fill="none" stroke="url(#tankGlass)" strokeWidth="6" rx="4" />
            <rect x="83" y="53" width="174" height="214" fill="#020617" opacity="0.3" rx="2" />

            {/* Water */}
            <rect x="86" y={270 - 150 - waterRise} width="168" height={150 + waterRise} fill="url(#waterGradient)" opacity="0.6" rx="2">
               <animate attributeName="opacity" values="0.5;0.7;0.5" dur="3s" repeatCount="indefinite" />
            </rect>

            {/* Water surface ripples */}
            {submergeProgress > 0 && submergeProgress < 100 && (
               <g>
                  <ellipse cx="170" cy={120 - waterRise} rx="80" ry="3" fill="none" stroke="#67e8f9" strokeWidth="1" opacity="0.5">
                     <animate attributeName="rx" values="70;85;70" dur="1s" repeatCount="indefinite" />
                  </ellipse>
               </g>
            )}

            {/* Crown/Object */}
            <g transform={`translate(170, ${submergeY})`} filter={isSubmerged ? "url(#glow)" : ""}>
               <path
                  d="M-35,0 L-30,-25 L-18,-35 L0,-40 L18,-35 L30,-25 L35,0 L25,15 L-25,15 Z"
                  fill="url(#goldGradient)"
                  stroke="#b45309"
                  strokeWidth="2"
               />
               {/* Crown gems */}
               <circle cx="-15" cy="-20" r="5" fill="#ef4444" />
               <circle cx="0" cy="-28" r="5" fill="#3b82f6" />
               <circle cx="15" cy="-20" r="5" fill="#22c55e" />
               {/* Crown detail lines */}
               <path d="M-25,0 L-20,-15 M25,0 L20,-15" stroke="#92400e" strokeWidth="1" fill="none" />
            </g>

            {/* String */}
            <line x1="170" y1="20" x2="170" y2={submergeY - 40} stroke="#78716c" strokeWidth="2" strokeDasharray="4 2" />

            {/* Scale at top */}
            <rect x="130" y="5" width="80" height="25" rx="5" fill="#1e293b" stroke="#475569" />
            <text x="170" y="22" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
               {isSubmerged ? apparentWeight.toFixed(1) : weightInAir.toFixed(1)} N
            </text>

            {/* Overflow container */}
            <rect x="280" y="150" width="80" height="120" fill="none" stroke="#475569" strokeWidth="3" rx="3" />
            <rect x="283" y={270 - waterRise * 2} width="74" height={waterRise * 2} fill="url(#waterGradient)" opacity="0.6" rx="2" />

            {/* Overflow spout */}
            <path d="M260,150 L280,150 L280,160 L270,160" fill="none" stroke="#475569" strokeWidth="3" />

            {/* Displaced volume label */}
            {submergeProgress > 50 && (
               <g>
                  <rect x="275" y="275" width="90" height="30" rx="5" fill="#022c22" stroke="#16a34a" />
                  <text x="320" y="285" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold">Displaced</text>
                  <text x="320" y="298" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">{displacedVolume.toFixed(0)} cm³</text>
               </g>
            )}

            {/* Buoyancy force arrow */}
            {isSubmerged && (
               <g>
                  <line x1="220" y1={submergeY + 30} x2="220" y2={submergeY - 20} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowUp)" />
                  <text x="240" y={submergeY + 10} fill="#22c55e" fontSize="10" fontWeight="bold">F_b = {buoyantForce.toFixed(2)} N</text>
               </g>
            )}

            {/* Weight arrow */}
            {isSubmerged && (
               <g>
                  <line x1="120" y1={submergeY - 20} x2="120" y2={submergeY + 30} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowDown)" />
                  <text x="95" y={submergeY + 10} fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="end">W = {weightInAir.toFixed(2)} N</text>
               </g>
            )}

            <defs>
               <marker id="arrowUp" markerWidth="10" markerHeight="10" refX="5" refY="10" orient="auto">
                  <path d="M0,10 L5,0 L10,10 L5,7 Z" fill="#22c55e" />
               </marker>
               <marker id="arrowDown" markerWidth="10" markerHeight="10" refX="5" refY="0" orient="auto">
                  <path d="M0,0 L5,10 L10,0 L5,3 Z" fill="#ef4444" />
               </marker>
            </defs>

            {/* Teaching labels */}
            <text x="170" y="310" textAnchor="middle" fill="#94a3b8" fontSize="11">
               Water Level: {(150 + waterRise).toFixed(0)} mL
            </text>
         </svg>
      );
   };

   // ═══════════════════════════════════════════════════════════════════════════
   // PHASE RENDERS
   // ═══════════════════════════════════════════════════════════════════════════

   // HOOK Screen
   if (phase === 0) {
      return (
         <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
            {/* Premium background gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-600/3 rounded-full blur-3xl" />

            {renderProgressBar()}

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
               {/* Premium badge */}
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-amber-400 tracking-wide">FLUID MECHANICS</span>
               </div>

               {/* Main title with gradient */}
               <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent">
                  Archimedes' Principle: Eureka!
               </h1>
               <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
                  The king suspected his golden crown was fake. How could Archimedes prove it <span className="text-white font-semibold">without melting the crown</span>?
               </p>

               {/* Premium card */}
               <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-md border border-slate-700/50 shadow-2xl shadow-amber-500/5 mb-8">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                     {[
                        { icon: '🔬', text: 'Interactive Lab' },
                        { icon: '⚖️', text: 'Buoyancy' },
                        { icon: '🚢', text: 'Ship Design' }
                     ].map((item, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                           <div className="text-2xl mb-2">{item.icon}</div>
                           <div className="text-xs font-semibold text-slate-400">{item.text}</div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Premium CTA button */}
               <button
                  onMouseDown={() => goToPhase(1)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 to-cyan-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
               >
                  <span className="relative z-10 flex items-center gap-2">
                     Discover the Principle
                     <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                     </svg>
                  </span>
               </button>
               <p className="mt-6 text-sm text-slate-500">~5 minutes - The bathtub discovery</p>
            </div>
         </div>
      );
   }

   // PREDICT Screen
   if (phase === 1) {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflow: 'auto' }}>
               <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  {renderSectionHeader("Step 1 • Make Your Prediction", "What Creates Buoyancy?", "When you lower an object into water, it seems to weigh less. Why?")}

                  <div style={{
                     padding: '16px',
                     borderRadius: '16px',
                     background: `${colors.primary}15`,
                     border: `1px solid ${colors.primary}30`,
                     marginBottom: '24px'
                  }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Setup:</strong> An object is lowered into water. You notice the water level rises, and the object seems lighter.
                        <strong style={{ color: colors.primary }}> What determines the upward buoyant force?</strong>
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'depth', label: 'The depth of the water', desc: 'Deeper water means more force' },
                        { id: 'weight', label: 'The weight of the object', desc: 'Heavier objects feel more buoyancy' },
                        { id: 'displaced', label: 'The weight of water displaced', desc: 'The rising water pushes back', correct: true },
                        { id: 'shape', label: 'The shape of the object', desc: 'Streamlined shapes float better' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => {
                              setPrediction(opt.id);
                              onGameEvent?.({ type: 'prediction_made', data: { prediction: opt.id, label: opt.label } });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              padding: '16px',
                              borderRadius: '16px',
                              textAlign: 'left',
                              background: prediction === opt.id ? `${colors.primary}20` : colors.bgCard,
                              border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                           }}
                        >
                           <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, marginBottom: '4px', color: prediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</p>
                              <p style={{ fontSize: '12px', color: colors.textMuted }}>{opt.desc}</p>
                           </div>
                           {prediction === opt.id && (
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                              </div>
                           )}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!prediction, "Run the Experiment")}
         </div>
      );
   }

   // PLAY Screen
   if (phase === 2) {
      const teachingMessages: Record<string, { title: string; message: string }> = {
         none: { title: '', message: '' },
         start: { title: 'Ready to Test', message: 'Lower the crown into the water and observe what happens to the water level and the scale reading.' },
         submerging: { title: 'Watch the Water Rise!', message: 'As the crown enters the water, it pushes water out of the way. The water level is rising!' },
         displaced: { title: 'Displacement in Action', message: 'Notice the overflow - the crown is displacing its volume in water. The scale shows reduced weight!' },
         complete: { title: 'Archimedes\' Principle Revealed!', message: `The buoyant force (${buoyantForce.toFixed(2)} N) equals the weight of water displaced. Apparent weight = ${apparentWeight.toFixed(2)} N!` }
      };

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: '16px', minHeight: isMobile ? '45vh' : 'auto' }}>
                  <div style={{ height: '100%', borderRadius: '16px', background: '#030712', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                     {renderDisplacementTank(true)}
                  </div>

                  {teachingMilestone !== 'none' && (
                     <div style={{
                        position: 'absolute',
                        bottom: isMobile ? '60px' : '80px',
                        left: '16px',
                        right: isMobile ? '16px' : '350px',
                        padding: '16px',
                        borderRadius: '16px',
                        background: `${colors.bgCard}ee`,
                        border: `1px solid ${colors.primary}50`
                     }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: colors.primary, marginBottom: '4px' }}>{teachingMessages[teachingMilestone].title}</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary }}>{teachingMessages[teachingMilestone].message}</p>
                     </div>
                  )}
               </div>

               <div style={{
                  width: isMobile ? '100%' : '320px',
                  padding: '16px',
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  borderTop: isMobile ? `1px solid ${colors.border}` : 'none',
                  overflow: 'auto'
               }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>Step 2 • Experiment</p>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>Displacement Lab</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                     <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: colors.primary }}>{objectMass} g</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>Mass</p>
                     </div>
                     <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: colors.accent }}>{objectVolume} cm³</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>Volume</p>
                     </div>
                     <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: colors.warning }}>{objectDensity.toFixed(2)}</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>Density g/cm³</p>
                     </div>
                     <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: colors.success }}>{buoyantForce.toFixed(2)} N</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>Buoyant Force</p>
                     </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Mass: {objectMass} g</label>
                     <input type="range" min="100" max="2000" value={objectMass}
                        onChange={(e) => { setObjectMass(Number(e.target.value)); setSubmergeProgress(0); setIsSubmerged(false); setTeachingMilestone('none'); }}
                        style={{ width: '100%', accentColor: colors.primary }} />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Volume: {objectVolume} cm³</label>
                     <input type="range" min="50" max="300" value={objectVolume}
                        onChange={(e) => { setObjectVolume(Number(e.target.value)); setSubmergeProgress(0); setIsSubmerged(false); setTeachingMilestone('none'); }}
                        style={{ width: '100%', accentColor: colors.accent }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                     <button
                        onMouseDown={() => { setSubmergeProgress(1); setTeachingMilestone('start'); }}
                        disabled={submergeProgress > 0}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: '12px',
                           fontWeight: 700,
                           fontSize: '13px',
                           background: submergeProgress === 0 ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                           color: colors.textPrimary,
                           border: 'none',
                           cursor: submergeProgress === 0 ? 'pointer' : 'not-allowed',
                           opacity: submergeProgress === 0 ? 1 : 0.5
                        }}
                     >
                        👇 Submerge
                     </button>
                     <button
                        onMouseDown={() => { setSubmergeProgress(0); setIsSubmerged(false); setTeachingMilestone('none'); }}
                        style={{
                           padding: '14px 20px',
                           borderRadius: '12px',
                           fontWeight: 700,
                           fontSize: '13px',
                           background: colors.bgCardLight,
                           color: colors.textSecondary,
                           border: 'none',
                           cursor: 'pointer'
                        }}
                     >
                        ↺ Reset
                     </button>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '12px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, marginBottom: '4px' }}>Archimedes' Principle:</p>
                     <p style={{ fontSize: '13px', fontFamily: 'monospace', color: colors.textPrimary, textAlign: 'center', padding: '8px', background: colors.bgDark, borderRadius: '8px' }}>
                        F_buoyant = ρ × V × g
                     </p>
                     <p style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '8px', textAlign: 'center' }}>
                        Buoyant force = Weight of displaced fluid
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, isSubmerged, "Understand Why")}
         </div>
      );
   }

   // REVIEW Screen
   if (phase === 3) {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflow: 'auto' }}>
               <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  {renderSectionHeader("Step 3 • Understanding", "Why Objects Float or Sink", "The buoyant force is nature's response to displacement")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`, border: `1px solid ${colors.primary}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                           <span style={{ fontSize: '24px' }}>⬆️</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.primary }}>Buoyant Force</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           When an object enters water, it pushes water aside. The water pushes back with a force equal to <strong style={{ color: colors.textPrimary }}>the weight of the displaced water</strong>.
                        </p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}05 100%)`, border: `1px solid ${colors.accent}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                           <span style={{ fontSize: '24px' }}>⚖️</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.accent }}>Float vs Sink</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           If buoyant force {'>'} weight → floats<br />
                           If buoyant force {'<'} weight → sinks<br />
                           If equal → <strong style={{ color: colors.textPrimary }}>neutral buoyancy!</strong>
                        </p>
                     </div>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: colors.bgCard, border: `1px solid ${colors.border}`, marginBottom: '24px', textAlign: 'center' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>The Eureka Moment</p>
                     <p style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
                        "The upward buoyant force equals the weight of the fluid displaced."
                     </p>
                     <p style={{ fontSize: '13px', color: colors.textMuted }}>— Archimedes, ~250 BCE</p>
                  </div>

                  {renderKeyTakeaway("🌊", "Displacement is Key", "The volume of water displaced equals the volume of the submerged part of the object. More volume = more buoyancy.")}
                  {renderKeyTakeaway("📊", "Density Determines Fate", "Objects denser than water sink. Objects less dense float. Ships float because their hulls enclose air, lowering average density.")}
                  {renderKeyTakeaway("⚡", "It's About Weight, Not Volume", "A small lead weight sinks while a huge ship floats. What matters is whether the displaced water's weight exceeds the object's weight.")}
               </div>
            </div>

            {renderBottomBar(true, true, "The Crown Test")}
         </div>
      );
   }

   // TWIST_PREDICT Screen
   if (phase === 4) {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflow: 'auto' }}>
               <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  {renderSectionHeader("Step 4 • The Crown Challenge", "Was the Crown Pure Gold?", "Archimedes' brilliant application of his discovery")}

                  <div style={{
                     padding: '16px',
                     borderRadius: '16px',
                     background: `${colors.danger}15`,
                     border: `1px solid ${colors.danger}30`,
                     marginBottom: '24px'
                  }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Problem:</strong> A 1000g crown is delivered. Pure gold has density 19.3 g/cm³.
                        <strong style={{ color: colors.danger }}> How much water should a pure gold crown of this mass displace?</strong>
                     </p>
                     <p style={{ fontSize: '12px', marginTop: '8px', color: colors.warning }}>Hint: Volume = Mass ÷ Density</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'a', label: '1000 cm³ (same number as mass)' },
                        { id: 'b', label: '193 cm³ (1000 ÷ 5.18)' },
                        { id: 'c', label: '51.8 cm³ (1000 ÷ 19.3)', correct: true },
                        { id: 'd', label: '19.3 cm³ (same as density)' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => {
                              setTwistPrediction(opt.id);
                              onGameEvent?.({ type: 'twist_prediction_made', data: { prediction: opt.id, label: opt.label } });
                           }}
                           style={{
                              padding: '16px',
                              borderRadius: '16px',
                              textAlign: 'left',
                              background: twistPrediction === opt.id ? `${colors.danger}20` : colors.bgCard,
                              border: `2px solid ${twistPrediction === opt.id ? colors.danger : colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           <span style={{ fontWeight: 700, color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</span>
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {renderBottomBar(true, !!twistPrediction, "Test the Crown")}
         </div>
      );
   }

   // TWIST_PLAY Screen
   if (phase === 5) {
      const currentMaterial = materials[selectedMaterial];
      const crownMass = 1000;
      const expectedVolume = crownMass / currentMaterial.density;
      const pureGoldVolume = crownMass / 19.3;
      const isFake = selectedMaterial !== 'gold';

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflow: 'auto' }}>
               <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  {renderSectionHeader("Step 5 • The Crown Test", "Compare Materials", "Different materials with the same mass displace different volumes")}

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                     {(Object.keys(materials) as Array<keyof typeof materials>).map(mat => (
                        <button
                           key={mat}
                           onMouseDown={() => setSelectedMaterial(mat)}
                           style={{
                              padding: '12px 20px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              fontSize: '13px',
                              background: selectedMaterial === mat ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                              color: selectedMaterial === mat ? colors.textPrimary : colors.textSecondary,
                              border: 'none',
                              cursor: 'pointer'
                           }}
                        >
                           {materials[mat].name}
                        </button>
                     ))}
                  </div>

                  <svg viewBox="0 0 400 200" style={{ width: '100%', maxHeight: '200px', marginBottom: '24px' }}>
                     <rect width="400" height="200" fill="#0f172a" />

                     {/* Pure Gold Reference */}
                     <g transform="translate(80, 30)">
                        <text x="50" y="0" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">Pure Gold</text>
                        <rect x="10" y="10" width="80" height="120" fill="none" stroke="#475569" strokeWidth="3" rx="3" />
                        <rect x="13" y={130 - pureGoldVolume} width="74" height={pureGoldVolume} fill="#38bdf8" opacity="0.6" />
                        <text x="50" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">{pureGoldVolume.toFixed(1)} cm³</text>
                     </g>

                     {/* Selected Material */}
                     <g transform="translate(220, 30)">
                        <text x="50" y="0" textAnchor="middle" fill={isFake ? '#ef4444' : '#22c55e'} fontSize="11" fontWeight="bold">{currentMaterial.name}</text>
                        <rect x="10" y="10" width="80" height="120" fill="none" stroke="#475569" strokeWidth="3" rx="3" />
                        <rect x="13" y={130 - expectedVolume} width="74" height={expectedVolume} fill={isFake ? '#f87171' : '#38bdf8'} opacity="0.6" />
                        <text x="50" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">{expectedVolume.toFixed(1)} cm³</text>
                     </g>

                     {/* Verdict */}
                     <g transform="translate(200, 170)">
                        <rect x="-60" y="-15" width="120" height="30" rx="8" fill={isFake ? '#7f1d1d' : '#14532d'} />
                        <text x="0" y="5" textAnchor="middle" fill={isFake ? '#fca5a5' : '#86efac'} fontSize="14" fontWeight="bold">
                           {isFake ? '🚨 FRAUD DETECTED!' : '✓ PURE GOLD'}
                        </text>
                     </g>
                  </svg>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                     <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCard, textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: colors.primary }}>1000 g</p>
                        <p style={{ fontSize: '11px', color: colors.textMuted }}>Crown Mass</p>
                     </div>
                     <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCard, textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: colors.accent }}>{currentMaterial.density}</p>
                        <p style={{ fontSize: '11px', color: colors.textMuted }}>Density g/cm³</p>
                     </div>
                     <div style={{ padding: '16px', borderRadius: '12px', background: isFake ? `${colors.danger}20` : `${colors.success}20`, textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: isFake ? colors.danger : colors.success }}>{expectedVolume.toFixed(1)}</p>
                        <p style={{ fontSize: '11px', color: colors.textMuted }}>Volume cm³</p>
                     </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '16px', background: `${colors.warning}15`, border: `1px solid ${colors.warning}30` }}>
                     <p style={{ fontSize: '13px', fontWeight: 700, color: colors.warning, marginBottom: '8px' }}>The Detection Method:</p>
                     <ul style={{ fontSize: '12px', color: colors.textSecondary, margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
                        <li>Pure gold (19.3 g/cm³): 1000g displaces 51.8 cm³</li>
                        <li>Silver (10.5 g/cm³): Same mass displaces 95.2 cm³</li>
                        <li>If crown displaces MORE than expected → Not pure gold!</li>
                     </ul>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, true, "Key Insight")}
         </div>
      );
   }

   // TWIST_REVIEW Screen
   if (phase === 6) {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflow: 'auto' }}>
               <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  {renderSectionHeader("Step 6 • The Insight", "Non-Destructive Testing", "Archimedes' method works without damaging the sample")}

                  <div style={{ padding: '24px', borderRadius: '16px', background: colors.bgCard, border: `1px solid ${colors.border}`, marginBottom: '24px', textAlign: 'center' }}>
                     <p style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: '12px' }}>
                        Density = Mass ÷ Volume
                     </p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                        Measure mass with a balance.<br />
                        Measure volume by displacement.<br />
                        <strong style={{ color: colors.primary }}>Compare to known material density.</strong>
                     </p>
                  </div>

                  {renderKeyTakeaway("💡", "Volume Reveals the Truth", "A fake crown with the same weight as gold must have MORE volume (because it's less dense). More volume = more water displaced!")}
                  {renderKeyTakeaway("🔬", "Non-Destructive Testing", "This method doesn't damage the sample. Today it's used to verify precious metals, gemstones, and archaeological artifacts.")}
                  {renderKeyTakeaway("🌍", "Universal Principle", "The same physics applies to submarine buoyancy, ship loading, hot air balloons, and even how fish swim!")}
               </div>
            </div>

            {renderBottomBar(true, true, "Real World Apps")}
         </div>
      );
   }

   // TRANSFER Screen
   if (phase === 7) {
      const currentApp = realWorldApps[selectedApp];
      const allCompleted = completedApps.every(c => c);

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '12px' : '20px', overflow: 'auto' }}>
               <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {renderSectionHeader("Step 7 • Real World", "Archimedes' Principle Today", "Discover how buoyancy shapes our world")}

                  {/* App selector tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
                     {realWorldApps.map((app, i) => (
                        <button
                           key={i}
                           onMouseDown={() => setSelectedApp(i)}
                           style={{
                              padding: '10px 16px',
                              borderRadius: '12px',
                              fontWeight: 600,
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              background: selectedApp === i ? `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                              color: selectedApp === i ? colors.textPrimary : colors.textSecondary,
                              border: completedApps[i] ? `2px solid ${colors.success}` : 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                           }}
                        >
                           <span>{app.icon}</span>
                           <span>{app.title.split(' ')[0]}</span>
                           {completedApps[i] && <span>✓</span>}
                        </button>
                     ))}
                  </div>

                  {/* App content */}
                  <div style={{ padding: '20px', borderRadius: '16px', background: colors.bgCard, border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '32px' }}>{currentApp.icon}</span>
                        <div>
                           <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>{currentApp.title}</h3>
                           <p style={{ fontSize: '12px', color: currentApp.color }}>{currentApp.tagline}</p>
                        </div>
                     </div>

                     <p style={{ fontSize: '14px', lineHeight: 1.7, color: colors.textSecondary, marginBottom: '16px' }}>{currentApp.description}</p>

                     <div style={{ padding: '12px', borderRadius: '12px', background: `${currentApp.color}15`, border: `1px solid ${currentApp.color}30`, marginBottom: '16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: currentApp.color, marginBottom: '4px' }}>Connection to the Principle:</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary }}>{currentApp.connection}</p>
                     </div>

                     {/* Stats */}
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        {currentApp.stats.map((stat, i) => (
                           <div key={i} style={{ padding: '12px', borderRadius: '10px', background: colors.bgCardLight, textAlign: 'center' }}>
                              <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                              <p style={{ fontSize: '16px', fontWeight: 800, color: currentApp.color }}>{stat.value}</p>
                              <p style={{ fontSize: '9px', color: colors.textMuted }}>{stat.label}</p>
                           </div>
                        ))}
                     </div>

                     {/* Examples */}
                     <p style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '8px' }}>REAL EXAMPLES:</p>
                     <ul style={{ fontSize: '12px', color: colors.textSecondary, margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
                        {currentApp.examples.slice(0, 3).map((ex, i) => <li key={i}>{ex}</li>)}
                     </ul>

                     {/* Complete button */}
                     {!completedApps[selectedApp] && (
                        <button
                           onMouseDown={() => {
                              const newCompleted = [...completedApps];
                              newCompleted[selectedApp] = true;
                              setCompletedApps(newCompleted);
                              playSound('success');
                              onGameEvent?.({ type: 'app_completed', data: { appIndex: selectedApp, appTitle: currentApp.title } });
                           }}
                           style={{
                              width: '100%',
                              marginTop: '16px',
                              padding: '14px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              background: `linear-gradient(135deg, ${currentApp.color} 0%, ${colors.accent} 100%)`,
                              color: colors.textPrimary,
                              border: 'none',
                              cursor: 'pointer'
                           }}
                        >
                           ✓ Mark as Understood
                        </button>
                     )}
                  </div>

                  {/* Progress indicator */}
                  <div style={{ textAlign: 'center', padding: '12px', borderRadius: '12px', background: colors.bgCardLight }}>
                     <p style={{ fontSize: '12px', color: colors.textMuted }}>
                        Applications completed: {completedApps.filter(c => c).length} / 4
                        {allCompleted && <span style={{ color: colors.success, marginLeft: '8px' }}>✓ Ready for test!</span>}
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, allCompleted, "Take the Test")}
         </div>
      );
   }

   // TEST Screen
   if (phase === 8) {
      const currentQ = testQuestions[testQuestion];
      const score = calculateTestScore();
      const passed = score >= 7;

      if (testSubmitted) {
         return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
               {renderProgressBar()}
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                  <div style={{
                     width: '80px', height: '80px', borderRadius: '50%',
                     background: passed ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : `linear-gradient(135deg, ${colors.danger} 0%, #dc2626 100%)`,
                     display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
                  }}>
                     <span style={{ fontSize: '36px' }}>{passed ? '🎉' : '📚'}</span>
                  </div>
                  <h2 style={{ fontSize: '28px', fontWeight: 800, color: colors.textPrimary, marginBottom: '8px' }}>
                     {passed ? 'Excellent Work!' : 'Keep Learning!'}
                  </h2>
                  <p style={{ fontSize: '48px', fontWeight: 800, color: passed ? colors.success : colors.danger, marginBottom: '16px' }}>
                     {score}/10
                  </p>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '24px', maxWidth: '400px' }}>
                     {passed ? 'You\'ve mastered Archimedes\' Principle! The buoyant force holds no secrets from you.' : 'Review the concepts and try again. You need 7/10 to pass.'}
                  </p>
                  {passed ? (
                     <button
                        onMouseDown={() => goToPhase(9)}
                        style={{
                           padding: '16px 48px', borderRadius: '12px', fontWeight: 700,
                           background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                           color: colors.textPrimary, border: 'none', cursor: 'pointer'
                        }}
                     >
                        Claim Mastery Badge →
                     </button>
                  ) : (
                     <button
                        onMouseDown={() => { setTestAnswers(Array(10).fill(null)); setTestQuestion(0); setTestSubmitted(false); }}
                        style={{
                           padding: '16px 48px', borderRadius: '12px', fontWeight: 700,
                           background: colors.bgCardLight, color: colors.textSecondary, border: 'none', cursor: 'pointer'
                        }}
                     >
                        Try Again
                     </button>
                  )}
               </div>
            </div>
         );
      }

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflow: 'auto' }}>
               <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>QUESTION {testQuestion + 1} OF 10</p>
                     <div style={{ display: 'flex', gap: '4px' }}>
                        {testQuestions.map((_, i) => (
                           <div key={i} style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: testAnswers[i] ? colors.primary : colors.border
                           }} />
                        ))}
                     </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', background: colors.bgCardLight, marginBottom: '16px' }}>
                     <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>SCENARIO:</p>
                     <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>{currentQ.scenario}</p>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, marginBottom: '16px' }}>{currentQ.question}</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                     {currentQ.options.map((opt, i) => (
                        <button
                           key={opt.id}
                           onMouseDown={() => {
                              const newAnswers = [...testAnswers];
                              newAnswers[testQuestion] = opt.id;
                              setTestAnswers(newAnswers);
                           }}
                           style={{
                              padding: '14px 16px',
                              borderRadius: '12px',
                              textAlign: 'left',
                              background: testAnswers[testQuestion] === opt.id ? `${colors.primary}20` : colors.bgCard,
                              border: `2px solid ${testAnswers[testQuestion] === opt.id ? colors.primary : colors.border}`,
                              cursor: 'pointer'
                           }}
                        >
                           <span style={{ fontWeight: 700, color: colors.primary, marginRight: '8px' }}>{String.fromCharCode(65 + i)}.</span>
                           <span style={{ color: testAnswers[testQuestion] === opt.id ? colors.textPrimary : colors.textSecondary }}>{opt.label}</span>
                        </button>
                     ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <button
                        onMouseDown={() => setTestQuestion(Math.max(0, testQuestion - 1))}
                        disabled={testQuestion === 0}
                        style={{
                           padding: '12px 24px', borderRadius: '12px', fontWeight: 600,
                           background: colors.bgCardLight, color: colors.textSecondary, border: 'none',
                           cursor: testQuestion === 0 ? 'not-allowed' : 'pointer', opacity: testQuestion === 0 ? 0.5 : 1
                        }}
                     >
                        ← Previous
                     </button>

                     {testQuestion < 9 ? (
                        <button
                           onMouseDown={() => setTestQuestion(testQuestion + 1)}
                           disabled={!testAnswers[testQuestion]}
                           style={{
                              padding: '12px 32px', borderRadius: '12px', fontWeight: 700,
                              background: testAnswers[testQuestion] ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
                              color: colors.textPrimary, border: 'none',
                              cursor: testAnswers[testQuestion] ? 'pointer' : 'not-allowed',
                              opacity: testAnswers[testQuestion] ? 1 : 0.5
                           }}
                        >
                           Next →
                        </button>
                     ) : (
                        <button
                           onMouseDown={() => setTestSubmitted(true)}
                           disabled={testAnswers.some(a => a === null)}
                           style={{
                              padding: '12px 32px', borderRadius: '12px', fontWeight: 700,
                              background: !testAnswers.some(a => a === null) ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : colors.bgCardLight,
                              color: colors.textPrimary, border: 'none',
                              cursor: testAnswers.some(a => a === null) ? 'not-allowed' : 'pointer',
                              opacity: testAnswers.some(a => a === null) ? 0.5 : 1
                           }}
                        >
                           Submit Test
                        </button>
                     )}
                  </div>
               </div>
            </div>
         </div>
      );
   }

   // MASTERY Screen
   if (phase === 9) {
      return (
         <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
            position: 'relative', overflow: 'hidden'
         }}>
            {renderProgressBar()}

            {/* Confetti */}
            {confetti.map((c, i) => (
               <div key={i} style={{
                  position: 'absolute',
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  width: '10px',
                  height: '10px',
                  background: c.color,
                  borderRadius: '2px',
                  animation: `fall 3s ease-in-out ${c.delay}s infinite`,
                  opacity: 0.8
               }} />
            ))}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', zIndex: 10 }}>
               <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #06b6d4 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '24px', boxShadow: '0 20px 60px rgba(245, 158, 11, 0.4)'
               }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>

               <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
                  Archimedes Master!
               </h1>

               <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px' }}>
                  You've discovered why objects float, how to measure density, and how this 2000-year-old principle powers modern technology!
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                  {[
                     { icon: '🌊', label: 'Buoyancy Expert' },
                     { icon: '⚖️', label: 'Density Detective' },
                     { icon: '👑', label: 'Crown Tester' }
                  ].map((badge, i) => (
                     <div key={i} style={{
                        padding: '16px', borderRadius: '16px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                     }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{badge.icon}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b' }}>{badge.label}</div>
                     </div>
                  ))}
               </div>

               <button
                  onMouseDown={() => goToPhase(0)}
                  style={{
                     padding: '16px 48px', borderRadius: '12px', fontWeight: 700,
                     background: colors.bgCardLight, color: colors.textSecondary, border: 'none', cursor: 'pointer'
                  }}
               >
                  Review Lesson
               </button>
            </div>

            <style>{`
               @keyframes fall {
                  0%, 100% { transform: translateY(0) rotate(0deg); }
                  50% { transform: translateY(100vh) rotate(720deg); }
               }
            `}</style>
         </div>
      );
   }

   return null;
};

export default ArchimedesPrincipleRenderer;
