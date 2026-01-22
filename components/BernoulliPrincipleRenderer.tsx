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
  | 'flow_speed_changed'
  | 'airfoil_adjusted'
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

interface BernoulliPrincipleRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL SOUND UTILITY
// ═══════════════════════════════════════════════════════════════════════════
const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
   const soundConfig = {
      click: { frequency: 400, duration: 0.1 },
      success: { frequency: 600, duration: 0.15 },
      failure: { frequency: 200, duration: 0.2 },
      transition: { frequency: 500, duration: 0.1 },
      complete: { frequency: 800, duration: 0.3 }
   };
   const { frequency, duration } = soundConfig[soundType];
   try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
   } catch (e) {
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
  2: 'Wind Tunnel',
  3: 'Understanding',
  4: 'Curve Ball',
  5: 'Magnus Effect',
  6: 'Deep Insight',
  7: 'Real World',
  8: 'Knowledge Test',
  9: 'Mastery'
};

// Premium color palette - blue/cyan for air/fluid theme
const colors = {
   primary: '#3b82f6',      // blue-500
   primaryDark: '#2563eb',  // blue-600
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
      scenario: "You're blowing air between two ping pong balls hanging on strings. Surprisingly, they move together instead of apart.",
      question: "According to Bernoulli's Principle, why do the balls move together?",
      options: [
         { id: 'a', label: "The fast-moving air between them has LOWER pressure than the still air outside", correct: true },
         { id: 'b', label: "The fast-moving air pushes them together directly" },
         { id: 'c', label: "Static electricity from the air attracts them" },
         { id: 'd', label: "The balls create a vacuum between them" },
      ],
      explanation: "Bernoulli's Principle states that faster-moving fluid has lower pressure. The fast air stream between the balls creates a low-pressure zone. The higher-pressure still air on the outside pushes the balls into this low-pressure region - making them move together!"
   },
   {
      scenario: "An airplane wing is designed with a curved top and flatter bottom. Air flows over both surfaces.",
      question: "How does wing shape create lift according to Bernoulli's Principle?",
      options: [
         { id: 'a', label: "The curved top makes air travel farther, moving faster, creating lower pressure above the wing", correct: true },
         { id: 'b', label: "The flat bottom blocks air, creating more lift" },
         { id: 'c', label: "The wing pushes air down, and the air pushes back" },
         { id: 'd', label: "The curve creates a suction cup effect" },
      ],
      explanation: "Air traveling over the curved top must cover more distance in the same time, so it moves faster. Faster air = lower pressure (Bernoulli). The higher pressure below the wing pushes up against the lower pressure above, creating lift! (Note: Newton's Third Law also contributes via air deflection.)"
   },
   {
      scenario: "A shower curtain mysteriously billows inward when the hot water is running, even though no wind is blowing.",
      question: "Why does the shower curtain move inward?",
      options: [
         { id: 'a', label: "Hot air rises, pulling the curtain up" },
         { id: 'b', label: "Water droplets push the curtain" },
         { id: 'c', label: "Fast-moving water and air inside create lower pressure, and outside air pushes the curtain in", correct: true },
         { id: 'd', label: "The steam makes the curtain heavier" },
      ],
      explanation: "The falling water accelerates air downward inside the shower, creating fast-moving airflow. Fast air = low pressure (Bernoulli). The still, higher-pressure air outside the curtain pushes it into the low-pressure zone inside. This is called the Coandă effect combined with Bernoulli!"
   },
   {
      scenario: "A baseball pitcher throws a curveball. The ball spins rapidly as it travels toward the batter.",
      question: "How does spin make a baseball curve?",
      options: [
         { id: 'a', label: "Gravity pulls more on the spinning ball" },
         { id: 'b', label: "Spinning creates a high-pressure zone on one side and low pressure on the other, pushing the ball sideways", correct: true },
         { id: 'c', label: "Air friction slows one side of the ball" },
         { id: 'd', label: "The seams act like rudders steering the ball" },
      ],
      explanation: "This is the Magnus Effect, a consequence of Bernoulli. The spinning ball drags air faster on one side (spin direction matches airflow) and slower on the other. Fast side = low pressure, slow side = high pressure. The pressure difference pushes the ball toward the low-pressure side - making it curve!"
   },
   {
      scenario: "A carburetor in an older car mixes air and gasoline before sending the mixture to the engine.",
      question: "How does a carburetor use Bernoulli's Principle to mix fuel?",
      options: [
         { id: 'a', label: "The fuel pump forces gasoline through" },
         { id: 'b', label: "Air flowing through a narrow section creates low pressure, sucking fuel from a reservoir", correct: true },
         { id: 'c', label: "The fuel vaporizes from engine heat" },
         { id: 'd', label: "Gravity drips fuel into the airstream" },
      ],
      explanation: "The Venturi effect! Air accelerates through a narrow throat in the carburetor. Faster air = lower pressure. A fuel line opens into this low-pressure zone. The higher-pressure fuel reservoir pushes gasoline into the airstream, where it atomizes and mixes. No pump needed!"
   },
   {
      scenario: "You hold a strip of paper below your bottom lip and blow across the top of it. The paper rises.",
      question: "What makes the paper rise when you blow over it?",
      options: [
         { id: 'a', label: "Your breath pushes the paper up" },
         { id: 'b', label: "The fast air above creates lower pressure than the still air below, lifting the paper", correct: true },
         { id: 'c', label: "The paper catches the air like a sail" },
         { id: 'd', label: "Warm breath heats the paper, making it lighter" },
      ],
      explanation: "Classic Bernoulli demonstration! Blowing creates fast-moving air above the paper = low pressure. The still air below maintains normal atmospheric pressure. The pressure difference (higher below, lower above) pushes the paper upward. This is exactly how airplane wings work!"
   },
   {
      scenario: "A perfume atomizer sprays fine mist when you squeeze the bulb. Air rushes across a tube leading to the perfume.",
      question: "How does the atomizer draw perfume up and out?",
      options: [
         { id: 'a', label: "Squeezing pressurizes the perfume bottle" },
         { id: 'b', label: "Fast air across the tube top creates low pressure, pulling perfume up and breaking it into droplets", correct: true },
         { id: 'c', label: "Capillary action lifts the liquid" },
         { id: 'd', label: "The bulb pushes air down into the liquid" },
      ],
      explanation: "Bernoulli-powered atomization! Fast air from the squeezed bulb crosses the top of a vertical tube. This creates low pressure at the tube opening. Higher atmospheric pressure on the perfume surface pushes liquid up the tube. When it meets the airstream, it breaks into tiny droplets - a fine mist!"
   },
   {
      scenario: "Racing cars have wings (spoilers) mounted upside-down compared to airplane wings.",
      question: "Why are race car spoilers designed to push DOWN instead of up?",
      options: [
         { id: 'a', label: "To look more aerodynamic" },
         { id: 'b', label: "The inverted shape creates higher pressure above and lower below, generating downforce for grip", correct: true },
         { id: 'c', label: "To reduce wind noise" },
         { id: 'd', label: "To cool the engine" },
      ],
      explanation: "Same physics, opposite goal! Airplane wings create lift (upward force). Race car spoilers are inverted - curved surface on bottom, flat on top. Air moves faster below (low pressure) and slower above (high pressure). The pressure difference pushes the car DOWN onto the track, increasing tire grip for faster cornering!"
   },
   {
      scenario: "Engineers design a wind tunnel with a narrow test section where the model airplane sits.",
      question: "If air enters the tunnel at 50 m/s and the cross-section narrows by half, what happens to the air speed?",
      options: [
         { id: 'a', label: "It stays at 50 m/s" },
         { id: 'b', label: "It slows to 25 m/s" },
         { id: 'c', label: "It doubles to approximately 100 m/s", correct: true },
         { id: 'd', label: "It becomes turbulent and unmeasurable" },
      ],
      explanation: "The Continuity Equation: A₁v₁ = A₂v₂ (same volume of air must pass through). If area halves, velocity must double to maintain flow. This acceleration is what creates the pressure drop (Bernoulli) in devices like Venturi tubes, carburetors, and wind tunnel test sections."
   },
   {
      scenario: "Sailors can adjust their sails to catch wind from almost any direction, even sailing into the wind (tacking).",
      question: "How do sails generate forward force when the wind comes from the side?",
      options: [
         { id: 'a', label: "They bounce wind backward like a trampoline" },
         { id: 'b', label: "The curved sail shape makes wind flow faster on the outside, creating lower pressure that pulls the boat forward", correct: true },
         { id: 'c', label: "Friction between wind and sail drags the boat" },
         { id: 'd', label: "The mast redirects wind energy" },
      ],
      explanation: "Sails work like vertical airplane wings! The curved sail makes air flow faster on the convex side (low pressure) and slower on the concave side (high pressure). The pressure difference creates a force perpendicular to the sail. Combined with the keel's resistance to sideways motion, this converts to forward drive!"
   }
];

// ═══════════════════════════════════════════════════════════════════════════
// 4 COMPREHENSIVE REAL-WORLD APPLICATIONS
// ═══════════════════════════════════════════════════════════════════════════
const realWorldApps = [
   {
      icon: '✈️',
      title: 'Aircraft Wing Design',
      short: 'Lift generation',
      tagline: 'How 500 Tons Get Airborne',
      description: 'Every aircraft from paper airplanes to A380s relies on Bernoulli\'s principle for lift. Wing shape creates pressure differences that overcome gravity.',
      connection: 'The airfoil simulation you experimented with shows exactly how real wings work - curved top surface accelerates air, creating lower pressure than the flat bottom. The pressure difference is lift!',
      howItWorks: 'Wing cross-sections (airfoils) are carefully designed using computational fluid dynamics. The camber, thickness, and angle of attack are optimized for specific flight regimes.',
      stats: [
         { value: '575 tons', label: 'A380 max weight', icon: '⚖️' },
         { value: '640 mph', label: 'Cruise speed', icon: '✈️' },
         { value: '~90,000', label: 'Flights per day', icon: '🌍' }
      ],
      examples: [
         'Commercial jets: Supercritical airfoils delay shockwaves at transonic speeds',
         'Gliders: High aspect ratio wings maximize lift-to-drag for soaring',
         'Fighter jets: Variable geometry wings adapt to different speed regimes',
         'Drones: Micro air vehicles use similar principles at small Reynolds numbers'
      ],
      companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'Dassault'],
      futureImpact: 'Morphing wings with adaptive surfaces will continuously optimize shape in-flight, improving efficiency by 10-15%.',
      color: colors.primary
   },
   {
      icon: '⚾',
      title: 'Sports Ball Aerodynamics',
      short: 'The Magnus Effect',
      tagline: 'Making Balls Curve, Dip & Swerve',
      description: 'From baseball curveballs to soccer free kicks, athletes exploit the Magnus Effect - a direct consequence of Bernoulli\'s principle applied to spinning objects.',
      connection: 'The spinning ball demo shows how rotation creates pressure asymmetry. Topspin, backspin, and sidespin all produce different movement patterns as the ball "rides" the pressure gradient.',
      howItWorks: 'Spinning balls drag air faster on one side (where spin matches airflow) than the other. The pressure difference produces a force perpendicular to both the velocity and spin axis.',
      stats: [
         { value: '19 inches', label: 'Max curveball break', icon: '⚾' },
         { value: '3,000 rpm', label: 'Pro pitcher spin', icon: '🔄' },
         { value: '80+ mph', label: 'Pro kick speed', icon: '⚽' }
      ],
      examples: [
         'Baseball: Curveballs drop up to 19 inches; sliders move horizontally',
         'Soccer: Banana kicks bend around defensive walls',
         'Golf: Backspin creates lift, extending carry distance 20%+',
         'Tennis: Topspin loops dip sharply, allowing aggressive play'
      ],
      companies: ['Titleist', 'Callaway', 'Nike', 'Wilson'],
      futureImpact: 'Ball tracking AI will quantify every pitch and kick in real-time, revolutionizing coaching and player development.',
      color: colors.danger
   },
   {
      icon: '🏎️',
      title: 'Automotive Aerodynamics',
      short: 'Downforce & drag',
      tagline: 'Pushing Cars Onto the Road',
      description: 'F1 cars generate up to 5x their weight in downforce - they could theoretically drive upside-down on a ceiling. This extreme performance comes from inverted Bernoulli applications.',
      connection: 'Remember how wings create lift? Race car wings are inverted - they create "negative lift" (downforce). The faster the car goes, the more the wings push it onto the track.',
      howItWorks: 'Front and rear wings, underbody diffusers, and carefully shaped bodywork create low-pressure zones that suck the car toward the ground, improving tire grip.',
      stats: [
         { value: '5G', label: 'Corner G-force', icon: '🔄' },
         { value: '230 mph', label: 'F1 top speed', icon: '🏎️' },
         { value: '3.5 tons', label: 'Peak downforce', icon: '⬇️' }
      ],
      examples: [
         'F1 cars: Complex front wings with 50+ elements for precise control',
         'Le Mans prototypes: Ground-effect tunnels generate massive downforce',
         'Road cars: Active aerodynamics adjust for efficiency vs. cornering',
         'Hypercars: Drag reduction systems open for straight-line speed'
      ],
      companies: ['Red Bull Racing', 'Mercedes AMG', 'Ferrari', 'McLaren'],
      futureImpact: 'Active morphing body panels will dynamically optimize between low drag and high downforce based on real-time conditions.',
      color: colors.accent
   },
   {
      icon: '🏥',
      title: 'Medical & Industrial Devices',
      short: 'Venturi applications',
      tagline: 'Bernoulli Saves Lives',
      description: 'The Venturi effect powers medical devices from oxygen therapy to surgical suction, and industrial applications from carburetors to paint sprayers.',
      connection: 'The narrow tube experiment demonstrated Venturi effect - flow speeds up through constrictions, dropping pressure. This pressure drop can lift, mix, or atomize fluids without pumps.',
      howItWorks: 'A fluid accelerates through a constriction (throat). Pressure drops. Secondary inlet at the throat draws in another fluid by suction. Simple, reliable, no moving parts.',
      stats: [
         { value: '24/7', label: 'Hospital use', icon: '🏥' },
         { value: '0 moving', label: 'Parts in Venturi', icon: '⚙️' },
         { value: '~$8B', label: 'Medical device market', icon: '💰' }
      ],
      examples: [
         'Venturi masks: Precise oxygen concentration for respiratory therapy',
         'Surgical suction: Removes fluids without electrical pumps',
         'Carburetors: Mix fuel and air for combustion engines',
         'Paint sprayers: Atomize paint for even coating'
      ],
      companies: ['Fisher & Paykel', '3M', 'Philips', 'Dräger'],
      futureImpact: 'Micro-Venturi devices in lab-on-chip technology will enable point-of-care diagnostics with no external power.',
      color: colors.success
   }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const BernoulliPrincipleRenderer: React.FC<BernoulliPrincipleRendererProps> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
   const [airSpeed, setAirSpeed] = useState(50);
   const [wingAngle, setWingAngle] = useState(5);
   const [showPressure, setShowPressure] = useState(true);
   const [showStreamlines, setShowStreamlines] = useState(true);
   const [ballSpin, setBallSpin] = useState(50);
   const [spinDirection, setSpinDirection] = useState<'topspin' | 'backspin' | 'sidespin'>('topspin');
   const [teachingMilestone, setTeachingMilestone] = useState<'none' | 'slow' | 'medium' | 'fast' | 'stall'>('none');

   // ─── RESPONSIVE DESIGN ─────────────────────────────────────────────────────
   const [isMobile, setIsMobile] = useState(false);
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // ─── Sync external phase control ──────────────────────────────────────────
   useEffect(() => {
      if (currentPhase !== undefined && currentPhase !== phase) {
         setPhase(currentPhase);
      }
   }, [currentPhase, phase]);

   // ─── Navigation ────────────────────────────────────────────────────────────
   const isNavigating = useRef(false);

   const goToPhase = useCallback((p: number) => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      setPhase(p);
      playSound('transition');
      onPhaseComplete?.(p);

      const idx = PHASES.indexOf(p);
      onGameEvent?.({
         type: 'phase_change',
         data: {
            phase: p,
            phaseLabel: phaseLabels[p],
            currentScreen: idx + 1,
            totalScreens: PHASES.length,
            message: `Entered phase: ${phaseLabels[p]}`
         }
      });

      setTimeout(() => { isNavigating.current = false; }, 400);
   }, [onGameEvent, onPhaseComplete]);

   const goNext = useCallback(() => {
      const idx = PHASES.indexOf(phase);
      if (idx < PHASES.length - 1) {
         goToPhase(PHASES[idx + 1]);
      }
   }, [phase, goToPhase]);

   const goBack = useCallback(() => {
      const idx = PHASES.indexOf(phase);
      if (idx > 0) goToPhase(PHASES[idx - 1]);
   }, [phase, goToPhase]);

   // ─── Animation Loop ────────────────────────────────────────────────────────
   useEffect(() => {
      const interval = setInterval(() => setTime(t => t + 0.03), 30);
      return () => clearInterval(interval);
   }, []);

   // Emit game_started on mount
   useEffect(() => {
      const timer = setTimeout(() => {
         onGameEvent?.({
            type: 'phase_change',
            data: {
               phase: 0,
               phaseLabel: 'Introduction',
               currentScreen: 1,
               totalScreens: PHASES.length,
               message: 'Bernoulli\'s Principle lesson started'
            }
         });
      }, 100);
      return () => clearTimeout(timer);
   }, [onGameEvent]);

   // Confetti effect
   useEffect(() => {
      if (phase === 9) {
         const confettiColors = ['#3b82f6', '#06b6d4', '#ec4899', '#10b981', '#a855f7', '#f59e0b'];
         setConfetti(Array.from({ length: 60 }, (_, i) => ({
            x: Math.random() * 100, y: Math.random() * 100,
            color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
         })));
      }
   }, [phase]);

   // Teaching milestones based on air speed
   useEffect(() => {
      if (airSpeed < 30) setTeachingMilestone('slow');
      else if (airSpeed < 60) setTeachingMilestone('medium');
      else if (airSpeed < 90) setTeachingMilestone('fast');
      else setTeachingMilestone('stall');
   }, [airSpeed]);

   // ─── Calculations ──────────────────────────────────────────────────────────
   const rho = 1.2; // air density
   const wingArea = 20;
   const Cl = Math.min(1.5, 0.1 + wingAngle * 0.12); // lift coefficient with stall
   const liftForce = 0.5 * rho * airSpeed * airSpeed * wingArea * Cl / 1000;
   const pressureDiff = 0.5 * rho * airSpeed * airSpeed * (1 / 1000); // simplified

   // ─── Test Score ────────────────────────────────────────────────────────────
   const calculateTestScore = () => {
      return testAnswers.reduce((score, ans, i) => {
         const correct = testQuestions[i].options.find(o => o.correct)?.id;
         return score + (ans === correct ? 1 : 0);
      }, 0);
   };

   // ═══════════════════════════════════════════════════════════════════════════
   // RENDER HELPER FUNCTIONS
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

   const renderKeyTakeaway = (icon: string, title: string, description: string) => (
      <div style={{
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
   // PREMIUM SVG VISUALIZATIONS
   // ═══════════════════════════════════════════════════════════════════════════
   const renderWingVisualization = () => {
      const streamlineOffset = time * 100 * (airSpeed / 50);

      return (
         <svg viewBox="0 0 500 320" style={{ width: '100%', maxHeight: '320px' }}>
            <defs>
               <linearGradient id="wingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
               </linearGradient>
               <linearGradient id="lowPressure" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
               </linearGradient>
               <linearGradient id="highPressure" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
               </linearGradient>
               <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
               </filter>
            </defs>

            {/* Background */}
            <rect width="500" height="320" fill="#0f172a" />

            {/* Pressure zones */}
            {showPressure && (
               <>
                  {/* Low pressure above */}
                  <ellipse cx="250" cy={140 - wingAngle * 2} rx="120" ry="50"
                     fill="url(#lowPressure)" opacity={airSpeed / 100} />
                  {/* High pressure below */}
                  <ellipse cx="250" cy={200 + wingAngle * 2} rx="100" ry="40"
                     fill="url(#highPressure)" opacity={airSpeed / 100} />
               </>
            )}

            {/* Streamlines */}
            {showStreamlines && Array.from({ length: 8 }, (_, i) => {
               const y = 80 + i * 25;
               const isAbove = y < 160;
               const curveAmount = isAbove ? -30 - (airSpeed / 5) : 15 + (airSpeed / 8);
               const speed = isAbove ? 1.3 : 0.8;

               return (
                  <g key={i}>
                     {/* Moving particles */}
                     {Array.from({ length: 5 }, (_, j) => {
                        const baseX = ((streamlineOffset * speed + j * 100) % 500);
                        const progress = baseX / 500;
                        const curveY = progress > 0.3 && progress < 0.7
                           ? Math.sin((progress - 0.3) * Math.PI / 0.4) * curveAmount
                           : 0;

                        return (
                           <circle
                              key={j}
                              cx={baseX}
                              cy={y + curveY}
                              r={isAbove ? 3 : 2}
                              fill={isAbove ? '#38bdf8' : '#f87171'}
                              opacity={0.7}
                           />
                        );
                     })}
                  </g>
               );
            })}

            {/* Wing */}
            <g transform={`translate(250, 160) rotate(${-wingAngle})`}>
               {/* Wing shape - airfoil */}
               <path
                  d="M-100,0 Q-60,-35 0,-25 Q60,-15 100,0 Q60,8 0,8 Q-60,8 -100,0 Z"
                  fill="url(#wingGradient)"
                  stroke="#94a3b8"
                  strokeWidth="2"
               />
               {/* Leading edge highlight */}
               <ellipse cx="-95" cy="0" rx="8" ry="6" fill="#94a3b8" opacity="0.5" />
            </g>

            {/* Lift arrow */}
            <g filter="url(#glowBlue)">
               <line
                  x1="250" y1={160 - wingAngle}
                  x2="250" y2={160 - wingAngle - liftForce * 3}
                  stroke="#22c55e" strokeWidth="4"
                  markerEnd="url(#arrowUp)"
               />
            </g>

            {/* Labels */}
            {showPressure && (
               <>
                  <text x="250" y="100" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">
                     LOW PRESSURE
                  </text>
                  <text x="250" y="110" textAnchor="middle" fill="#38bdf8" fontSize="10">
                     (Fast air)
                  </text>
                  <text x="250" y="240" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                     HIGH PRESSURE
                  </text>
                  <text x="250" y="250" textAnchor="middle" fill="#f87171" fontSize="10">
                     (Slow air)
                  </text>
               </>
            )}

            {/* Lift value */}
            <rect x="400" y="10" width="90" height="50" rx="8" fill={colors.bgCardLight} stroke={colors.border} />
            <text x="445" y="30" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="bold">LIFT</text>
            <text x="445" y="48" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
               {liftForce.toFixed(1)} kN
            </text>

            {/* Speed indicator */}
            <text x="250" y="300" textAnchor="middle" fill={colors.textMuted} fontSize="12">
               Air Speed: {airSpeed} m/s → Wind direction
            </text>

            <defs>
               <marker id="arrowUp" markerWidth="10" markerHeight="10" refX="5" refY="10" orient="auto">
                  <path d="M0,10 L5,0 L10,10 L5,7 Z" fill="#22c55e" />
               </marker>
            </defs>
         </svg>
      );
   };

   const renderSpinningBall = () => {
      const ballX = 150 + Math.sin(time * 2) * 20;
      const curveAmount = ballSpin * (spinDirection === 'topspin' ? 1 : spinDirection === 'backspin' ? -1 : 0);
      const ballY = 160 + curveAmount * 0.3;
      const sideAmount = spinDirection === 'sidespin' ? ballSpin * 0.3 : 0;

      return (
         <svg viewBox="0 0 400 320" style={{ width: '100%', maxHeight: '320px' }}>
            <rect width="400" height="320" fill="#0f172a" />

            {/* Ball path */}
            <path
               d={`M 100 160 Q 200 ${160 + curveAmount * 0.5} 300 ${ballY}`}
               fill="none"
               stroke="#64748b"
               strokeWidth="2"
               strokeDasharray="8 4"
            />

            {/* Pressure zones on ball */}
            <g transform={`translate(${ballX + sideAmount}, ${ballY})`}>
               {/* Ball */}
               <circle cx="0" cy="0" r="25" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />

               {/* Seams */}
               <path d="M-15,-15 Q0,-25 15,-15" fill="none" stroke="#ef4444" strokeWidth="2" />
               <path d="M-15,15 Q0,25 15,15" fill="none" stroke="#ef4444" strokeWidth="2" />

               {/* Spin direction indicator */}
               <circle cx="0" cy="0" r="30" fill="none" stroke={colors.primary} strokeWidth="1" strokeDasharray="5 3" opacity="0.5">
                  <animateTransform
                     attributeName="transform"
                     type="rotate"
                     from={spinDirection === 'backspin' ? '0' : '360'}
                     to={spinDirection === 'backspin' ? '360' : '0'}
                     dur={`${2 - ballSpin / 100}s`}
                     repeatCount="indefinite"
                  />
               </circle>

               {/* Pressure arrows */}
               <line x1="-40" y1="0" x2="-30" y2="0" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRight)" />
               <text x="-50" y="-10" fill="#ef4444" fontSize="9" textAnchor="middle">HIGH</text>

               <line x1="30" y1="0" x2="40" y2="0" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowLeft)" opacity="0.3" />
               <text x="50" y="-10" fill="#3b82f6" fontSize="9" textAnchor="middle">LOW</text>
            </g>

            {/* Force arrow */}
            {spinDirection === 'topspin' && (
               <g transform={`translate(${ballX}, ${ballY})`}>
                  <line x1="0" y1="-35" x2="0" y2="-55" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowDown2)" />
                  <text x="0" y="-60" textAnchor="middle" fill="#22c55e" fontSize="10">DIP</text>
               </g>
            )}
            {spinDirection === 'backspin' && (
               <g transform={`translate(${ballX}, ${ballY})`}>
                  <line x1="0" y1="35" x2="0" y2="55" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowUp)" />
                  <text x="0" y="70" textAnchor="middle" fill="#22c55e" fontSize="10">LIFT</text>
               </g>
            )}
            {spinDirection === 'sidespin' && (
               <g transform={`translate(${ballX + sideAmount}, ${ballY})`}>
                  <line x1="35" y1="0" x2="55" y2="0" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowRight)" />
                  <text x="70" y="4" fill="#22c55e" fontSize="10">CURVE</text>
               </g>
            )}

            <text x="200" y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
               The Magnus Effect
            </text>
            <text x="200" y="300" textAnchor="middle" fill={colors.textMuted} fontSize="11">
               Spin: {ballSpin} RPM • {spinDirection.charAt(0).toUpperCase() + spinDirection.slice(1)}
            </text>

            <defs>
               <marker id="arrowRight" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto">
                  <path d="M0,0 L10,5 L0,10" fill="#ef4444" />
               </marker>
               <marker id="arrowLeft" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                  <path d="M10,0 L0,5 L10,10" fill="#ef4444" />
               </marker>
               <marker id="arrowDown2" markerWidth="10" markerHeight="10" refX="5" refY="0" orient="auto">
                  <path d="M0,0 L5,10 L10,0" fill="#22c55e" />
               </marker>
            </defs>
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
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/3 rounded-full blur-3xl" />

            {renderProgressBar()}

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
               {/* Premium badge */}
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-blue-400 tracking-wide">FLUID DYNAMICS</span>
               </div>

               {/* Main title with gradient */}
               <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-200 via-white to-cyan-200 bg-clip-text text-transparent">
                  Bernoulli's Principle
               </h1>
               <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
                  Why do airplanes fly? How do curveballs curve? The answer lies in a <span className="text-white font-semibold">counterintuitive truth about moving fluids</span>.
               </p>

               {/* Premium card */}
               <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-md border border-slate-700/50 shadow-2xl shadow-blue-500/5 mb-8">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                     {[
                        { icon: '💨', text: 'Wind Tunnel' },
                        { icon: '⚾', text: 'Curveballs' },
                        { icon: '🏎️', text: 'Race Cars' }
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
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
               >
                  <span className="relative z-10 flex items-center gap-2">
                     Discover the Principle
                     <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                     </svg>
                  </span>
               </button>
               <p className="mt-6 text-sm text-slate-500">~5 minutes - Interactive flight physics</p>
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
                  {renderSectionHeader("Step 1 • Make Your Prediction", "What Creates Lift?", "How do 500-ton airplanes stay in the sky?")}

                  <div style={{
                     padding: '16px',
                     borderRadius: '16px',
                     background: `${colors.primary}15`,
                     border: `1px solid ${colors.primary}30`,
                     marginBottom: '24px'
                  }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Puzzle:</strong> An airplane wing is curved on top and flatter on bottom. Air flows over both surfaces.
                        <strong style={{ color: colors.primary }}> What creates the upward lift force?</strong>
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'faster', label: 'Faster air above has LOWER pressure, creating lift', desc: 'The curved top makes air move faster', correct: true },
                        { id: 'push', label: 'Air pushes up directly on the bottom', desc: 'Like wind filling a sail' },
                        { id: 'vacuum', label: 'The wing creates a vacuum above it', desc: 'Suction pulls the wing up' },
                        { id: 'lighter', label: 'Hot engine air makes the plane lighter', desc: 'Warm air rises' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => {
                              setPrediction(opt.id);
                              onGameEvent?.({
                                 type: 'prediction_made',
                                 data: {
                                    phase: 1,
                                    prediction: opt.id,
                                    message: `User predicted: ${opt.label}`
                                 }
                              });
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
                              cursor: 'pointer'
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

            {renderBottomBar(true, !!prediction, "Enter Wind Tunnel")}
         </div>
      );
   }

   // PLAY Screen
   if (phase === 2) {
      const teachingMessages: Record<string, { title: string; message: string }> = {
         none: { title: '', message: '' },
         slow: { title: 'Low Speed', message: 'Not much is happening yet. Increase the air speed to see the pressure difference develop.' },
         medium: { title: 'Lift Developing', message: 'See how air flows faster over the curved top (blue particles)? That creates lower pressure above!' },
         fast: { title: 'Strong Lift!', message: 'High speed = big pressure difference = strong lift. Real jets fly at 200+ m/s!' },
         stall: { title: 'Watch the Angle!', message: 'Too steep an angle can cause a "stall" - air separates from the wing and lift drops suddenly.' }
      };

      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: '16px', minHeight: isMobile ? '45vh' : 'auto', position: 'relative' }}>
                  <div style={{ height: '100%', borderRadius: '16px', background: '#030712', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                     {renderWingVisualization()}
                  </div>

                  {teachingMilestone !== 'none' && (
                     <div style={{
                        position: 'absolute',
                        bottom: '24px',
                        left: '24px',
                        right: isMobile ? '24px' : '340px',
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
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.primary }}>Step 2 • Wind Tunnel</p>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>Airfoil Lab</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                     <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: colors.primary }}>{airSpeed} m/s</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>Air Speed</p>
                     </div>
                     <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight, textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: colors.success }}>{liftForce.toFixed(1)} kN</p>
                        <p style={{ fontSize: '10px', color: colors.textMuted }}>Lift Force</p>
                     </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Air Speed: {airSpeed} m/s</label>
                     <input type="range" min="10" max="100" value={airSpeed}
                        onChange={(e) => setAirSpeed(Number(e.target.value))}
                        style={{ width: '100%', accentColor: colors.primary }} />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Angle of Attack: {wingAngle}°</label>
                     <input type="range" min="0" max="15" value={wingAngle}
                        onChange={(e) => setWingAngle(Number(e.target.value))}
                        style={{ width: '100%', accentColor: colors.accent }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                     <button
                        onMouseDown={() => setShowPressure(!showPressure)}
                        style={{
                           flex: 1,
                           padding: '10px',
                           borderRadius: '10px',
                           fontSize: '11px',
                           fontWeight: 600,
                           background: showPressure ? `${colors.primary}30` : colors.bgCardLight,
                           color: showPressure ? colors.primary : colors.textMuted,
                           border: `1px solid ${showPressure ? colors.primary : colors.border}`,
                           cursor: 'pointer'
                        }}
                     >
                        {showPressure ? '✓' : ''} Pressure
                     </button>
                     <button
                        onMouseDown={() => setShowStreamlines(!showStreamlines)}
                        style={{
                           flex: 1,
                           padding: '10px',
                           borderRadius: '10px',
                           fontSize: '11px',
                           fontWeight: 600,
                           background: showStreamlines ? `${colors.accent}30` : colors.bgCardLight,
                           color: showStreamlines ? colors.accent : colors.textMuted,
                           border: `1px solid ${showStreamlines ? colors.accent : colors.border}`,
                           cursor: 'pointer'
                        }}
                     >
                        {showStreamlines ? '✓' : ''} Streamlines
                     </button>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '12px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30` }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, marginBottom: '4px' }}>Bernoulli's Equation:</p>
                     <p style={{ fontSize: '13px', fontFamily: 'monospace', color: colors.textPrimary, textAlign: 'center', padding: '8px', background: colors.bgDark, borderRadius: '8px' }}>
                        P + ½ρv² = constant
                     </p>
                     <p style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '8px', textAlign: 'center' }}>
                        Fast air = Low pressure
                     </p>
                  </div>
               </div>
            </div>

            {renderBottomBar(true, airSpeed >= 50, "Understand Why")}
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
                  {renderSectionHeader("Step 3 • Understanding", "Why Faster Means Lower Pressure", "The counterintuitive truth about flowing fluids")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}05 100%)`, border: `1px solid ${colors.primary}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                           <span style={{ fontSize: '24px' }}>💨</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.primary }}>Energy Conservation</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           A fluid's total energy (pressure + kinetic) stays constant. When speed increases, kinetic energy goes up, so <strong style={{ color: colors.textPrimary }}>pressure must decrease</strong>.
                        </p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}05 100%)`, border: `1px solid ${colors.accent}40` }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                           <span style={{ fontSize: '24px' }}>📐</span>
                        </div>
                        <p style={{ fontWeight: 700, marginBottom: '8px', color: colors.accent }}>Wing Shape</p>
                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>
                           Curved top → air travels farther → moves faster → lower pressure<br />
                           Flat bottom → air slower → higher pressure<br />
                           <strong style={{ color: colors.textPrimary }}>Pressure difference = LIFT!</strong>
                        </p>
                     </div>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: colors.bgCard, border: `1px solid ${colors.border}`, marginBottom: '24px', textAlign: 'center' }}>
                     <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>Daniel Bernoulli (1738)</p>
                     <p style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
                        "An increase in the speed of a fluid occurs simultaneously with a decrease in pressure."
                     </p>
                  </div>

                  {renderKeyTakeaway("🔬", "It's About Speed", "The FASTER a fluid moves, the LOWER its pressure. This applies to air, water, and all fluids.")}
                  {renderKeyTakeaway("✈️", "Wings Create Speed Difference", "Wing shape forces air to move faster over the top. This speed difference creates the pressure difference that lifts planes.")}
                  {renderKeyTakeaway("⚡", "Lift ∝ v²", "Lift increases with the SQUARE of velocity. Double the speed = 4× the lift. That's why takeoff requires high speed!")}
               </div>
            </div>

            {renderBottomBar(true, true, "The Curve Ball")}
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
                  {renderSectionHeader("Step 4 • The Spinning Ball", "Why Do Curveballs Curve?", "Bernoulli's principle applies to spinning objects too")}

                  <div style={{
                     padding: '16px',
                     borderRadius: '16px',
                     background: `${colors.danger}15`,
                     border: `1px solid ${colors.danger}30`,
                     marginBottom: '24px'
                  }}>
                     <p style={{ fontSize: '14px', lineHeight: 1.6, color: colors.textSecondary }}>
                        <strong style={{ color: colors.textPrimary }}>The Mystery:</strong> A pitcher throws a ball with heavy topspin. As it travels through the air,
                        <strong style={{ color: colors.danger }}> what makes it suddenly dip downward?</strong>
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                     {[
                        { id: 'gravity', label: 'Gravity pulls harder on spinning objects' },
                        { id: 'friction', label: 'Air friction slows the bottom of the ball' },
                        { id: 'magnus', label: 'Spin creates a pressure difference that pushes the ball toward the spin direction', correct: true },
                        { id: 'seams', label: 'The ball\'s seams act like rudders' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => {
                              setTwistPrediction(opt.id);
                              onGameEvent?.({
                                 type: 'twist_prediction_made',
                                 data: {
                                    phase: 4,
                                    prediction: opt.id,
                                    message: `User predicted: ${opt.label}`
                                 }
                              });
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

            {renderBottomBar(true, !!twistPrediction, "See the Magnus Effect")}
         </div>
      );
   }

   // TWIST_PLAY Screen
   if (phase === 5) {
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bgDark }}>
            {renderProgressBar()}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               <div style={{ flex: 1, padding: '16px', minHeight: isMobile ? '45vh' : 'auto' }}>
                  <div style={{ height: '100%', borderRadius: '16px', background: '#030712', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                     {renderSpinningBall()}
                  </div>
               </div>

               <div style={{
                  width: isMobile ? '100%' : '320px',
                  padding: '16px',
                  background: colors.bgCard,
                  borderLeft: isMobile ? 'none' : `1px solid ${colors.border}`,
                  overflow: 'auto'
               }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.danger }}>Step 5 • Magnus Effect</p>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>Spin Control</h3>

                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Spin Type</label>
                     <div style={{ display: 'flex', gap: '8px' }}>
                        {(['topspin', 'backspin', 'sidespin'] as const).map(type => (
                           <button
                              key={type}
                              onMouseDown={() => setSpinDirection(type)}
                              style={{
                                 flex: 1,
                                 padding: '10px 8px',
                                 borderRadius: '10px',
                                 fontSize: '11px',
                                 fontWeight: 600,
                                 background: spinDirection === type ? `${colors.danger}30` : colors.bgCardLight,
                                 color: spinDirection === type ? colors.danger : colors.textMuted,
                                 border: `1px solid ${spinDirection === type ? colors.danger : colors.border}`,
                                 cursor: 'pointer'
                              }}
                           >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                     <label style={{ fontSize: '11px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Spin Rate: {ballSpin} RPM</label>
                     <input type="range" min="10" max="100" value={ballSpin}
                        onChange={(e) => setBallSpin(Number(e.target.value))}
                        style={{ width: '100%', accentColor: colors.danger }} />
                  </div>

                  <div style={{ padding: '12px', borderRadius: '12px', background: `${colors.danger}15`, border: `1px solid ${colors.danger}30`, marginBottom: '16px' }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: colors.danger, marginBottom: '8px' }}>Magnus Effect:</p>
                     <ul style={{ fontSize: '11px', color: colors.textSecondary, margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
                        <li><strong>Topspin:</strong> Ball dips down sharply</li>
                        <li><strong>Backspin:</strong> Ball floats longer (golf!)</li>
                        <li><strong>Sidespin:</strong> Ball curves left/right</li>
                     </ul>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '12px', background: colors.bgCardLight }}>
                     <p style={{ fontSize: '11px', color: colors.textMuted, lineHeight: 1.6 }}>
                        Spin drags air faster on one side → low pressure there → ball moves toward low pressure zone!
                     </p>
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
                  {renderSectionHeader("Step 6 • The Insight", "From Wings to Balls", "Bernoulli's principle is universal")}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                     <div style={{ padding: '20px', borderRadius: '16px', background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '36px' }}>✈️</span>
                        <p style={{ fontWeight: 700, color: colors.primary, margin: '8px 0 4px' }}>Wings</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary }}>Shape creates speed difference</p>
                     </div>
                     <div style={{ padding: '20px', borderRadius: '16px', background: colors.bgCard, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                        <span style={{ fontSize: '36px' }}>⚾</span>
                        <p style={{ fontWeight: 700, color: colors.danger, margin: '8px 0 4px' }}>Spinning Balls</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary }}>Rotation creates speed difference</p>
                     </div>
                  </div>

                  <div style={{ padding: '20px', borderRadius: '16px', background: `${colors.success}15`, border: `1px solid ${colors.success}30`, marginBottom: '24px', textAlign: 'center' }}>
                     <p style={{ fontSize: '16px', fontWeight: 700, color: colors.textPrimary }}>
                        Same Physics: Speed difference → Pressure difference → Force!
                     </p>
                  </div>

                  {renderKeyTakeaway("🔄", "Spin = Asymmetric Airflow", "Rotation makes air move faster on one side of the ball than the other - creating the pressure imbalance that causes curve.")}
                  {renderKeyTakeaway("🏆", "Athletes Exploit Physics", "Pitchers, soccer players, golfers, and tennis players all use Magnus Effect to control ball flight - even if they don't know the physics!")}
                  {renderKeyTakeaway("🌊", "It Works in Water Too", "Swimmers use sculling motions that create Bernoulli lift. Ships' propellers work on the same principle.")}
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
                  {renderSectionHeader("Step 7 • Real World", "Bernoulli Everywhere", "From airplanes to sports to medicine")}

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
                        <p style={{ fontSize: '12px', fontWeight: 700, color: currentApp.color, marginBottom: '4px' }}>Connection to Bernoulli:</p>
                        <p style={{ fontSize: '12px', color: colors.textSecondary }}>{currentApp.connection}</p>
                     </div>

                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        {currentApp.stats.map((stat, i) => (
                           <div key={i} style={{ padding: '12px', borderRadius: '10px', background: colors.bgCardLight, textAlign: 'center' }}>
                              <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                              <p style={{ fontSize: '16px', fontWeight: 800, color: currentApp.color }}>{stat.value}</p>
                              <p style={{ fontSize: '9px', color: colors.textMuted }}>{stat.label}</p>
                           </div>
                        ))}
                     </div>

                     <p style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '8px' }}>EXAMPLES:</p>
                     <ul style={{ fontSize: '12px', color: colors.textSecondary, margin: 0, paddingLeft: '16px', lineHeight: 1.8 }}>
                        {currentApp.examples.slice(0, 3).map((ex, i) => <li key={i}>{ex}</li>)}
                     </ul>

                     {!completedApps[selectedApp] && (
                        <button
                           onMouseDown={() => {
                              const newCompleted = [...completedApps];
                              newCompleted[selectedApp] = true;
                              setCompletedApps(newCompleted);
                              playSound('click');
                              onGameEvent?.({ type: 'app_completed', data: { appNumber: selectedApp + 1, appTitle: currentApp.title } });
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
                     {passed ? 'You\'ve mastered Bernoulli\'s Principle! You now understand how airplanes fly and balls curve.' : 'Review the concepts and try again. You need 7/10 to pass.'}
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
                  background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '24px', boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4)'
               }}>
                  <span style={{ fontSize: '48px' }}>🏆</span>
               </div>

               <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
                  Fluid Dynamics Master!
               </h1>

               <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px' }}>
                  You've unlocked the secrets of how airplanes fly, curveballs curve, and race cars grip the track!
               </p>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                  {[
                     { icon: '✈️', label: 'Flight Engineer' },
                     { icon: '⚾', label: 'Magnus Master' },
                     { icon: '💨', label: 'Fluid Expert' }
                  ].map((badge, i) => (
                     <div key={i} style={{
                        padding: '16px', borderRadius: '16px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                     }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{badge.icon}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6' }}>{badge.label}</div>
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

export default BernoulliPrincipleRenderer;
