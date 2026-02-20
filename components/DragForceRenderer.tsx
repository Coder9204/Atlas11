'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// DRAG FORCE - Premium Design with 10-Phase Learning Structure
// Physics of aerodynamic drag, air resistance, and terminal velocity
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Explore',
  twist_review: 'Twist Review',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Sound utility
const playSoundEffect = (type: 'click' | 'correct' | 'incorrect' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number }> = {
      click: { freq: 600, duration: 0.1 },
      correct: { freq: 800, duration: 0.2 },
      incorrect: { freq: 300, duration: 0.3 },
      complete: { freq: 900, duration: 0.4 },
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ============================================================================
// COLORS & DESIGN TOKENS
// ============================================================================

const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#f97316',
  secondary: '#8b5cf6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgCard: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148, 163, 184, 0.7)',
  border: '#334155',
  dragForce: '#ef4444',
  velocity: '#22c55e',
  terminal: '#f59e0b',
};

const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';

// ============================================================================
// REAL-WORLD APPLICATIONS DATA
// ============================================================================

const realWorldApps = [
  {
    icon: '🏎️',
    title: 'Formula 1 Aerodynamics',
    short: 'Racing vehicle design',
    tagline: 'Engineering Speed Through Air Management',
    description: 'Formula 1 cars are the ultimate expression of drag force engineering. Teams spend over $100 million annually on aerodynamic development, using wind tunnels and CFD simulations to shave milliseconds per lap. Every surface is designed to manage airflow for minimum drag and maximum downforce.',
    connection: 'The drag equation F = ½ρv²CdA is the foundation of F1 aerodynamics. At 200+ mph, drag force can exceed 1,500 pounds. Engineers constantly trade drag reduction against downforce generation.',
    howItWorks: 'F1 cars use complex front and rear wings, bargeboards, and floor diffusers to channel airflow. DRS opens a rear wing slot to reduce drag by 10-15% on straights.',
    stats: [
      { value: '0.7-1.0', label: 'F1 car Cd (with downforce)' },
      { value: '1,500+ lbs', label: 'Drag at top speed' },
      { value: '$150M+', label: 'Annual aero R&D budget' }
    ],
    examples: [
      'Mercedes zero-sidepod design in 2022 minimized frontal area for drag reduction',
      'DRS can add 10-15 km/h on straights by opening a slot in the rear wing',
      'Teams test over 1,000 aerodynamic configurations per season in wind tunnels'
    ],
    companies: ['Red Bull Racing', 'Mercedes-AMG', 'Ferrari', 'McLaren', 'Aston Martin'],
    color: '#ef4444'
  },
  {
    icon: '🪂',
    title: 'Parachute Engineering',
    short: 'Controlled drag deployment',
    tagline: 'Maximizing Air Resistance for Safe Descent',
    description: 'Parachutes are precision-engineered maximum-drag devices. They harness air resistance to slow descent from terminal velocity speeds of 120+ mph to safe landing speeds of 10-15 mph. Modern designs balance stability, control, glide ratio, and reliable deployment under extreme conditions.',
    connection: 'While vehicles minimize the drag equation F = ½ρv²CdA, parachutes maximize it. The massive canopy surface area combined with a high drag coefficient (Cd ≈ 1.5) creates enough force to balance gravitational weight.',
    howItWorks: 'When deployed, the canopy inflates and presents a large cross-sectional area to the airflow. Ram-air parachutes use airfoil cells that inflate to create lift as well as drag.',
    stats: [
      { value: '1.3-1.5', label: 'Typical parachute Cd' },
      { value: '120→12 mph', label: 'Speed reduction' },
      { value: '99.97%', label: 'Modern reliability rate' }
    ],
    examples: [
      'Military round canopies (T-11) are 35 feet diameter for stable vertical descent',
      'SpaceX Crew Dragon uses 4 main chutes with 116 ft combined diameter',
      'Drogue chutes stabilize supersonic vehicles before main deployment'
    ],
    companies: ['Airborne Systems', 'Performance Designs', 'Precision Aerodynamics', 'ParaGear'],
    color: '#22c55e'
  },
  {
    icon: '🚴',
    title: 'Cycling Aerodynamics',
    short: 'Human-powered efficiency',
    tagline: 'Defeating Air Resistance at Human Scale',
    description: 'At racing speeds above 25 mph, over 90% of a cyclist\'s effort goes to overcoming air resistance. Professional cycling has become an aerodynamic arms race, with every piece of equipment optimized using wind tunnel testing.',
    connection: 'The drag equation reveals why cycling is so sensitive to aerodynamics: drag force scales with v², so doubling speed quadruples the resistance. At 30 mph, a cyclist fights roughly 25 pounds of drag force.',
    howItWorks: 'Cyclists minimize all three controllable drag factors: frontal area through tucked positions, drag coefficient through streamlined equipment, and even air density by racing at altitude.',
    stats: [
      { value: '90%+', label: 'Effort fighting drag at 30mph' },
      { value: '0.88', label: 'Elite TT rider CdA (m²)' },
      { value: '20-40%', label: 'Draft energy savings' }
    ],
    examples: [
      'Aero helmets with tail fairings reduce drag by 7% over standard helmets',
      'Skinsuit fabric texture is optimized for boundary layer management',
      'Team time trials exploit drafting to maintain speeds 2-3 mph higher'
    ],
    companies: ['Specialized', 'Trek', 'Pinarello', 'Cervelo', 'Canyon'],
    color: '#3b82f6'
  },
  {
    icon: '✈️',
    title: 'Commercial Aviation Efficiency',
    short: 'Fuel economy at 35,000 feet',
    tagline: 'Billion-Dollar Drag Reduction',
    description: 'Airlines spend over $200 billion annually on jet fuel. A 1% reduction in drag saves approximately $140 million per year industry-wide. Modern aircraft design obsessively minimizes drag through wing shape, surface smoothness, and innovative technologies like winglets.',
    connection: 'At cruise speeds of 550 mph, the drag equation F = ½ρv²CdA produces forces exceeding 10,000 pounds on a 737. Every 1% drag reduction directly translates to 1% fuel savings.',
    howItWorks: 'Aircraft drag comes from induced drag from lift generation (40%), parasitic drag from skin friction and form (55%), and wave drag near sonic speeds (5%). Winglets reduce induced drag by blocking wingtip vortices.',
    stats: [
      { value: '0.023-0.027', label: 'Modern airliner Cd' },
      { value: '$140M/year', label: 'Savings per 1% drag cut' },
      { value: '3-5%', label: 'Winglet fuel savings' }
    ],
    examples: [
      'Boeing 787 uses 50% composite materials for smoother surfaces and 20% better efficiency',
      'Split-tip winglets on 737 MAX save 1.8% fuel versus older designs',
      'Shark-skin riblet coatings tested by Lufthansa showed 1% fuel reduction'
    ],
    companies: ['Boeing', 'Airbus', 'Bombardier', 'Embraer', 'Aviation Partners'],
    color: '#8b5cf6'
  }
];

// ============================================================================
// TEST QUESTIONS DATA - 10 Scenario-Based Questions
// ============================================================================

const testQuestions = [
  {
    scenario: 'A cyclist is riding at 20 mph and decides to increase speed to 40 mph. They notice it becomes dramatically harder to pedal.',
    question: 'How much more power must the cyclist produce to maintain 40 mph compared to 20 mph?',
    options: [
      { id: 'a', label: 'A) Twice as much power (2x)' },
      { id: 'b', label: 'B) Four times as much power (4x)' },
      { id: 'c', label: 'C) Eight times as much power (8x)', correct: true },
      { id: 'd', label: 'D) Sixteen times as much power (16x)' }
    ],
    explanation: 'Power to overcome drag scales with velocity cubed (P = Fd × v = ½ρv²CdA × v = ½ρv³CdA). Doubling speed means 2³ = 8 times the power required.'
  },
  {
    scenario: 'A skydiver jumps from 15,000 feet. After the initial acceleration, they notice their speedometer stabilizes at 120 mph despite continuing to fall.',
    question: 'Why does the skydiver stop accelerating even though gravity is still pulling them down?',
    options: [
      { id: 'a', label: 'A) They have reached maximum gravitational speed' },
      { id: 'b', label: 'B) The air becomes too thick to fall faster' },
      { id: 'c', label: 'C) Drag force has increased to equal their weight, resulting in zero net force', correct: true },
      { id: 'd', label: 'D) Wind resistance creates an upward lift force' }
    ],
    explanation: 'As velocity increases, drag force (F = ½ρv²CdA) grows until it equals the gravitational force (weight). At this point, net force is zero, so acceleration is zero. This constant velocity is called terminal velocity.'
  },
  {
    scenario: 'Two identical cars are driving: one at sea level and one at 10,000 feet elevation in the mountains where air is 30% less dense.',
    question: 'How does the drag force on the mountain car compare to the sea-level car at the same speed?',
    options: [
      { id: 'a', label: 'A) 30% less drag force', correct: true },
      { id: 'b', label: 'B) 30% more drag force' },
      { id: 'c', label: 'C) Same drag force - altitude does not matter' },
      { id: 'd', label: 'D) 60% less drag force due to reduced air pressure' }
    ],
    explanation: 'Drag force is directly proportional to air density (ρ) in the equation F = ½ρv²CdA. If air density decreases by 30%, drag force decreases by 30%.'
  },
  {
    scenario: 'A golf ball manufacturer creates a perfectly smooth ball. Surprisingly, it travels only half as far as a dimpled ball.',
    question: 'Why do dimples make a golf ball travel farther despite adding surface roughness?',
    options: [
      { id: 'a', label: 'A) Dimples store compressed air that provides thrust' },
      { id: 'b', label: 'B) Dimples reduce the ball weight' },
      { id: 'c', label: 'C) Dimples create turbulent boundary layer that delays flow separation and reduces pressure drag', correct: true },
      { id: 'd', label: 'D) Dimples increase spin rate for more Magnus effect' }
    ],
    explanation: 'A smooth ball has laminar flow that separates early, creating a large turbulent wake and high pressure drag. Dimples trigger transition to a turbulent boundary layer that clings longer, reducing overall drag by up to 50%.'
  },
  {
    scenario: 'An engineer designs two spacecraft heat shields: one flat and one cone-shaped. Both have the same diameter base.',
    question: 'Which heat shield shape experiences more drag during atmospheric re-entry?',
    options: [
      { id: 'a', label: 'A) The flat shield has more drag, which is bad because it slows the vehicle too much' },
      { id: 'b', label: 'B) The cone has more drag because it has more surface area' },
      { id: 'c', label: 'C) The flat shield has more drag, which is beneficial for maximum deceleration', correct: true },
      { id: 'd', label: 'D) Both have equal drag since they have the same diameter' }
    ],
    explanation: 'The flat shield (Cd ≈ 1.2) has much higher drag than a cone (Cd ≈ 0.5). Higher drag is actually beneficial for re-entry as it maximizes deceleration in the upper atmosphere.'
  },
  {
    scenario: 'A truck driver notices fuel economy drops when driving with an empty flatbed versus hauling a streamlined cargo container.',
    question: 'How does the empty flatbed create more drag than a container that adds weight and size?',
    options: [
      { id: 'a', label: 'A) The container weight pushes the truck lower for better ground effect' },
      { id: 'b', label: 'B) The empty flatbed creates turbulent separation and a large low-pressure wake', correct: true },
      { id: 'c', label: 'C) The container generates thrust as air flows around it' },
      { id: 'd', label: 'D) Empty flatbeds attract more wind due to electromagnetic effects' }
    ],
    explanation: 'Without cargo, air separates violently at the back of the cab creating a massive turbulent wake with very low pressure. A container fills this gap, allowing air to flow smoothly off the back.'
  },
  {
    scenario: 'During the 2012 Olympics, US swimmers wore full-body suits that reduced drag by 5% compared to traditional swimwear.',
    question: 'Why is a 5% drag reduction so significant in competitive swimming?',
    options: [
      { id: 'a', label: 'A) Swimming is very slow, so any reduction feels significant' },
      { id: 'b', label: 'B) Water is 800x denser than air, so even small drag reductions save substantial energy', correct: true },
      { id: 'c', label: 'C) The suits also reduced body weight' },
      { id: 'd', label: 'D) 5% improvement is unusual in any sport' }
    ],
    explanation: 'Water density (ρ ≈ 1000 kg/m³) is about 800 times that of air. In the drag equation F = ½ρv²CdA, this means swimmers face enormous resistance.'
  },
  {
    scenario: 'A wildlife documentary shows a peregrine falcon diving at 240 mph to catch prey, making it the fastest animal on Earth.',
    question: 'How does the falcon achieve such extreme speeds compared to other birds?',
    options: [
      { id: 'a', label: 'A) Falcons have more powerful muscles than other birds' },
      { id: 'b', label: 'B) Falcons dive from higher altitudes where gravity is stronger' },
      { id: 'c', label: 'C) Falcons tuck their wings to minimize frontal area and drag coefficient', correct: true },
      { id: 'd', label: 'D) Falcons have special feathers that eliminate air resistance' }
    ],
    explanation: 'During a stoop (hunting dive), falcons fold their wings tight, reducing both frontal area (A) and drag coefficient (Cd) dramatically to Cd ≈ 0.04-0.08.'
  },
  {
    scenario: 'NASCAR teams noticed that cars drafting closely behind the leader can sometimes achieve higher top speeds than the leading car itself.',
    question: 'What aerodynamic phenomenon allows a trailing car to be faster than the leader?',
    options: [
      { id: 'a', label: 'A) The trailing car engine runs more efficiently in cleaner air' },
      { id: 'b', label: 'B) The leading car creates a low-pressure wake that reduces drag on the trailing car', correct: true },
      { id: 'c', label: 'C) The trailing car weighs less due to fuel consumption' },
      { id: 'd', label: 'D) Track surface is smoother in the racing line' }
    ],
    explanation: 'The leader pushes through undisturbed air, creating a turbulent low-pressure wake. The trailing car sits in this zone with reduced relative air velocity and less drag.'
  },
  {
    scenario: 'The Bloodhound LSR car attempting the land speed record uses both a jet engine and a rocket to reach 1,000 mph.',
    question: 'At 1,000 mph, how does drag force scale compared to 100 mph (same Cd and A)?',
    options: [
      { id: 'a', label: 'A) 10 times the drag force' },
      { id: 'b', label: 'B) 50 times the drag force' },
      { id: 'c', label: 'C) 100 times the drag force', correct: true },
      { id: 'd', label: 'D) 1,000 times the drag force' }
    ],
    explanation: 'Drag force scales with velocity squared: F = ½ρv²CdA. At 10 times the velocity (1,000 vs 100 mph), drag increases by 10² = 100 times.'
  }
];

// ============================================================================
// COMPONENT
// ============================================================================

const DragForceRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase
  const [velocity, setVelocity] = useState(20);
  const [surfaceArea, setSurfaceArea] = useState(0.5);
  const [dragCoefficient, setDragCoefficient] = useState(0.5);

  // Twist play
  const [twistMass, setTwistMass] = useState(70);

  // Transfer
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Test
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Reset test on entry
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setShowExplanation(false);
      setTestScore(0);
      setTestSubmitted(false);
    }
  }, [phase]);

  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'drag_force',
      gameTitle: 'Drag Force',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSoundEffect('click');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    onPhaseComplete?.(newPhase);
    emit('phase_change', { phase: newPhase });
  }, [onPhaseComplete, emit]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  const currentIndex = phaseOrder.indexOf(phase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === phaseOrder.length - 1;
  const canGoNext = !isLast && phase !== 'test';

  // Computed drag
  const airDensity = 1.2;
  const calculatedDrag = 0.5 * airDensity * velocity * velocity * dragCoefficient * surfaceArea;

  // Twist computed terminal velocity
  const g = 9.8;
  const twistTerminalV = Math.sqrt((2 * twistMass * g) / (airDensity * dragCoefficient * surfaceArea));

  // ============================================================================
  // BOTTOM BAR
  // ============================================================================
  const renderBottomBar = () => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      fontFamily,
    }}>
      <button
        onClick={() => !isFirst && prevPhase()}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: isFirst ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: isFirst ? 'not-allowed' : 'pointer',
          opacity: isFirst ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily,
        }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => i <= currentIndex && goToPhase(p)}
            aria-label={`Go to ${phaseLabels[p]} phase`}
            style={{
              width: p === phase ? '20px' : '10px',
              minHeight: '44px',
              borderRadius: '5px',
              background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIndex ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
              border: 'none',
              padding: '0',
            }}
          />
        ))}
      </div>
      <button
        onClick={() => canGoNext && nextPhase()}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: 'none',
          background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : 0.4,
          transition: 'all 0.3s ease',
          fontFamily,
        }}
      >
        Next →
      </button>
    </div>
  );

  // ============================================================================
  // PROGRESS BAR
  // ============================================================================
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.border,
      zIndex: 1001,
    }}>
      <div style={{
        width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        transition: 'width 0.5s ease',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );

  // Style for the muted text helper
  const style_muted = `
    .muted-secondary { color: rgba(148, 163, 184, 0.7); }
  `;

  // ============================================================================
  // HOOK PHASE
  // ============================================================================
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, #020617 100%)`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {renderProgressBar()}
          <style>{style_muted}</style>

          <h1 style={{ fontSize: '36px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', fontFamily, lineHeight: '1.2' }}>
            Drag Force
          </h1>
          <p style={{ fontSize: '18px', fontWeight: 400, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px', lineHeight: '1.6', fontFamily }}>
            The invisible wall that fights every object moving through air. Discover how aerodynamic drag shapes everything from Formula 1 cars to falling skydivers.
          </p>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '100%', marginBottom: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#22d3ee', marginBottom: '12px', fontFamily }}>
              Think About This...
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 400, color: colors.textSecondary, lineHeight: '1.6', marginBottom: '12px', fontFamily }}>
              A Formula 1 car produces over <span style={{ color: '#f59e0b', fontWeight: 700 }}>1,000 horsepower</span>, yet at top speed, <span style={{ color: '#ef4444', fontWeight: 700 }}>90% of that power</span> goes to just pushing through the air.
            </p>
            <p style={{ fontSize: '16px', fontWeight: 400, color: colors.textSecondary, lineHeight: '1.6', fontFamily }}>
              Meanwhile, a skydiver falling from 15,000 feet somehow <span style={{ color: '#22c55e', fontWeight: 700 }}>stops accelerating</span> despite gravity constantly pulling them down. What invisible force is at work?
            </p>
          </div>

          <button
            onClick={() => goToPhase('predict')}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily,
              boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
            }}
          >
            Start Discovery →
          </button>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // PREDICT PHASE
  // ============================================================================
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontFamily }}>
              Make Your Prediction
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 400, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', fontFamily, lineHeight: '1.5' }}>
              What do you think will happen to the drag force when speed changes?
            </p>

            {/* SVG diagram */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg viewBox="0 0 400 200" width="100%" style={{ maxWidth: '400px', background: colors.bgCard, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="predAirGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <rect x="0" y="150" width="400" height="50" fill="#374151" />
                <line x1="0" y1="175" x2="400" y2="175" stroke="#fbbf24" strokeWidth="2" strokeDasharray="20,10" />
                <rect x="120" y="100" width="80" height="40" rx="5" fill="#3b82f6" />
                <rect x="135" y="85" width="50" height="20" rx="3" fill="#60a5fa" />
                <circle cx="140" cy="140" r="10" fill="#1f2937" />
                <circle cx="180" cy="140" r="10" fill="#1f2937" />
                {[75, 95, 115].map((y, i) => (
                  <line key={i} x1="220" y1={y} x2="350" y2={y} stroke="url(#predAirGrad)" strokeWidth="2" strokeDasharray="8,4" />
                ))}
                <line x1="220" y1="115" x2="300" y2="115" stroke="#ef4444" strokeWidth="4" />
                <polygon points="300,115 290,109 290,121" fill="#ef4444" />
                <text x="260" y="105" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Drag Force</text>
                <line x1="120" y1="115" x2="60" y2="115" stroke="#22c55e" strokeWidth="4" />
                <polygon points="60,115 70,109 70,121" fill="#22c55e" />
                <text x="90" y="105" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">Velocity</text>
              </svg>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: '16px', fontWeight: 500, color: colors.textSecondary, lineHeight: '1.6', marginBottom: '12px', fontFamily }}>
                A car is driving on the highway at <span style={{ color: '#22d3ee', fontWeight: 700 }}>30 mph</span>. The driver accelerates to <span style={{ color: '#f59e0b', fontWeight: 700 }}>60 mph</span> (doubling their speed).
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, textAlign: 'center', fontFamily }}>
                What happens to the drag force pushing against the car?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'A', text: 'A) Drag force doubles (2x)' },
                { id: 'B', text: 'B) Drag force quadruples (4x)' },
                { id: 'C', text: 'C) Drag force stays the same' },
                { id: 'D', text: 'D) Drag force increases by 50%' }
              ].map(option => {
                const isSelected = selectedPrediction === option.id;
                const isCorrect = option.id === 'B';
                let bg = colors.bgCard;
                let borderColor = colors.border;
                if (showPredictionFeedback) {
                  if (isCorrect) { bg = `${colors.success}22`; borderColor = colors.success; }
                  else if (isSelected && !isCorrect) { bg = `${colors.error}22`; borderColor = colors.error; }
                } else if (isSelected) {
                  bg = `${colors.primary}22`; borderColor = colors.primary;
                }
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (!showPredictionFeedback) {
                        setSelectedPrediction(option.id);
                        setShowPredictionFeedback(true);
                        playSoundEffect(option.id === 'B' ? 'correct' : 'incorrect');
                        emit('prediction_made', { prediction: option.id });
                      }
                    }}
                    disabled={showPredictionFeedback}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      color: colors.textPrimary,
                      textAlign: 'left',
                      cursor: showPredictionFeedback ? 'default' : 'pointer',
                      fontSize: '15px',
                      fontWeight: 500,
                      fontFamily,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>

            {showPredictionFeedback && (
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: selectedPrediction === 'B' ? colors.success : colors.primary, marginBottom: '8px', fontFamily }}>
                  {selectedPrediction === 'B' ? 'Exactly Right!' : 'Surprising, isn\'t it?'}
                </p>
                <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: '1.5', fontFamily }}>
                  Drag force depends on velocity <span style={{ color: '#f59e0b', fontWeight: 700 }}>squared</span>! F = ½ρv²CdA. Double velocity = 2² = <span style={{ color: colors.success, fontWeight: 700 }}>4× the drag!</span>
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // PLAY PHASE
  // ============================================================================
  if (phase === 'play') {
    // Build drag curve path
    const chartW = 380;
    const chartH = 200;
    const chartLeft = 55;
    const chartTop = 30;
    const maxV = 50;
    const maxDrag = 0.5 * airDensity * maxV * maxV * dragCoefficient * surfaceArea * 1.15;

    const curvePts: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const v = (i / 20) * maxV;
      const fd = 0.5 * airDensity * v * v * dragCoefficient * surfaceArea;
      const x = chartLeft + (v / maxV) * (chartW - chartLeft - 10);
      const y = chartTop + chartH - (fd / maxDrag) * (chartH - 10);
      curvePts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = curvePts.join(' ');

    // Interactive point
    const ptX = chartLeft + (velocity / maxV) * (chartW - chartLeft - 10);
    const ptFd = 0.5 * airDensity * velocity * velocity * dragCoefficient * surfaceArea;
    const ptY = chartTop + chartH - (ptFd / maxDrag) * (chartH - 10);

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '800px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px', fontFamily }}>
              Drag Force Laboratory
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 400, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px', fontFamily, lineHeight: '1.5' }}>
              Adjust the sliders to observe how velocity, area, and drag coefficient affect the drag force. Watch how drag force grows with velocity squared. This is why doubling speed quadruples the resistance.
            </p>
            <p style={{ fontSize: '14px', fontWeight: 400, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontFamily, lineHeight: '1.5' }}>
              Drag force is defined as the aerodynamic resistance that opposes an object's motion through a fluid. The drag equation is calculated as F = ½ × ρ × v² × Cd × A. This is important because it determines fuel efficiency in real-world engineering applications from vehicles to aircraft design.
            </p>

            {/* Formula */}
            <p style={{ fontSize: '18px', fontWeight: 700, color: colors.primary, textAlign: 'center', marginBottom: '16px', fontFamily: 'monospace' }}>
              F_drag = ½ × ρ × v² × Cd × A
            </p>

            {/* SVG chart title */}
            <p style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontFamily }}>
              Drag Force vs Velocity Chart
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {/* SVG chart */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg viewBox={`0 0 ${chartW} ${chartH + 60}`} width="100%" style={{ maxWidth: '600px', background: colors.bgCard, borderRadius: '12px' }}>
                    <defs>
                      <linearGradient id="dragGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="areaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                      </linearGradient>
                      <radialGradient id="pointGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fff" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </radialGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="chartShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Background */}
                    <rect x="0" y="0" width={chartW} height={chartH + 60} fill={colors.bgCard} rx="12" />

                    {/* Grid lines */}
                    <g>
                      {[0, 1, 2, 3, 4, 5].map(i => {
                        const gy = chartTop + (i / 5) * chartH;
                        return <line key={`hg${i}`} x1={chartLeft} y1={gy} x2={chartW - 10} y2={gy} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />;
                      })}
                      {[0, 1, 2, 3, 4].map(i => {
                        const gx = chartLeft + (i / 4) * (chartW - chartLeft - 10);
                        return <line key={`vg${i}`} x1={gx} y1={chartTop} x2={gx} y2={chartTop + chartH} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />;
                      })}
                    </g>

                    {/* Axes */}
                    <g>
                      <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartTop + chartH} stroke={colors.textSecondary} strokeWidth="2" />
                      <line x1={chartLeft} y1={chartTop + chartH} x2={chartW - 10} y2={chartTop + chartH} stroke={colors.textSecondary} strokeWidth="2" />
                    </g>

                    {/* Axis labels */}
                    <text x="12" y={chartTop + chartH / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${chartTop + chartH / 2})`}>F (N)</text>
                    <text x={(chartLeft + chartW - 10) / 2} y={chartTop + chartH + 40} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Velocity (m/s)</text>

                    {/* Tick labels */}
                    <g>
                      <text x={chartLeft - 4} y={chartTop + 5} fill={colors.textSecondary} fontSize="11" textAnchor="end">{maxDrag.toFixed(0)}</text>
                      <text x={chartLeft - 4} y={chartTop + chartH * 0.5} fill={colors.textSecondary} fontSize="11" textAnchor="end">{(maxDrag * 0.5).toFixed(0)}</text>
                      <text x={chartLeft - 4} y={chartTop + chartH - 2} fill={colors.textSecondary} fontSize="11" textAnchor="end">0</text>
                    </g>
                    <g>
                      <text x={chartLeft} y={chartTop + chartH + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle">0</text>
                      <text x={chartLeft + (chartW - chartLeft - 10) / 2} y={chartTop + chartH + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle">{(maxV / 2).toFixed(0)}</text>
                      <text x={chartW - 10} y={chartTop + chartH + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle">{maxV}</text>
                    </g>

                    {/* Curve */}
                    <g filter="url(#chartShadow)">
                      <path d={curvePath} fill="none" stroke={colors.dragForce} strokeWidth="3" />
                    </g>

                    {/* Area fill */}
                    <path d={`${curvePath} L ${chartW - 10} ${chartTop + chartH} L ${chartLeft} ${chartTop + chartH} Z`} fill="url(#dragGrad)" />

                    {/* Interactive point */}
                    <circle cx={ptX} cy={ptY} r={8} fill={colors.dragForce} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

                    {/* Value label at point */}
                    <text x={ptX + 12} y={ptY - 8} fill={colors.textPrimary} fontSize="12" fontWeight="bold">
                      {calculatedDrag.toFixed(1)} N
                    </text>

                    {/* Legend */}
                    <g>
                      <rect x={chartW - 140} y={chartTop + 5} width="12" height="12" rx="2" fill={colors.dragForce} />
                      <text x={chartW - 124} y={chartTop + 15} fill={colors.textSecondary} fontSize="11">Drag Force Curve</text>
                      <circle cx={chartW - 134} cy={chartTop + 32} r={5} fill={colors.dragForce} stroke="#fff" strokeWidth={1} />
                      <text x={chartW - 124} y={chartTop + 35} fill={colors.textSecondary} fontSize="11">Current Value</text>
                    </g>
                  </svg>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Key insight box */}
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.6', fontFamily, margin: 0 }}>
                    The quadratic relationship between velocity and drag means small speed increases create large force increases. At {velocity} m/s the drag force is {calculatedDrag.toFixed(1)} N, which changes dramatically as you adjust the sliders below.
                  </p>
                </div>

                {/* Data readout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '12px 16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, fontFamily }}>Velocity</span>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: colors.velocity, fontFamily }}>{velocity} m/s</div>
                  </div>
                  <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '12px 16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, fontFamily }}>Drag Force</span>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: colors.dragForce, fontFamily }}>{calculatedDrag.toFixed(1)} N</div>
                  </div>
                  <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '12px 16px', border: `1px solid ${colors.border}`, textAlign: 'center', gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, fontFamily }}>Before vs After</span>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.warning, fontFamily }}>
                      {velocity <= 25 ? 'Low drag' : velocity <= 35 ? 'Medium drag' : 'High drag'}
                    </div>
                  </div>
                </div>

                {/* Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}` }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, fontFamily, display: 'block', marginBottom: '8px' }}>
                      Velocity: {velocity} m/s
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={velocity}
                      onChange={(e) => setVelocity(Number(e.target.value))}
                      style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                    />
                  </div>
                  <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}` }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, fontFamily, display: 'block', marginBottom: '8px' }}>
                      Surface Area: {surfaceArea.toFixed(1)} m²
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.1"
                      value={surfaceArea}
                      onChange={(e) => setSurfaceArea(Number(e.target.value))}
                      style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                    />
                  </div>
                  <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}` }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, fontFamily, display: 'block', marginBottom: '8px' }}>
                      Drag Coefficient: {dragCoefficient.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.1"
                      value={dragCoefficient}
                      onChange={(e) => setDragCoefficient(Number(e.target.value))}
                      style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // REVIEW PHASE
  // ============================================================================
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px', fontFamily }}>
              The Physics of Drag Force
            </h2>

            <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '16px', fontFamily }}>
              As you observed in the experiment, drag force grows dramatically with velocity. Your prediction about what happens when speed doubles demonstrates the key insight: the velocity squared relationship.
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#22d3ee', textAlign: 'center', marginBottom: '16px', fontFamily }}>
                The Drag Equation
              </h3>
              <div style={{ background: '#020617', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: colors.primary, fontFamily: 'monospace' }}>
                  F = ½ × ρ × v² × Cd × A
                </span>
              </div>

              {/* SVG formula diagram */}
              <svg viewBox="0 0 400 200" width="100%" style={{ maxWidth: '400px', display: 'block', margin: '0 auto 16px' }}>
                <defs>
                  <linearGradient id="revGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="200" fill={colors.bgCard} rx="8" />
                <g>
                  <rect x="20" y="20" width="80" height="60" rx="8" fill="#22d3ee22" stroke="#22d3ee" strokeWidth="1" />
                  <text x="60" y="45" fill="#22d3ee" fontSize="14" fontWeight="bold" textAnchor="middle">ρ (rho)</text>
                  <text x="60" y="65" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Air density</text>
                </g>
                <g>
                  <rect x="110" y="20" width="80" height="60" rx="8" fill="#f59e0b22" stroke="#f59e0b" strokeWidth="1" />
                  <text x="150" y="45" fill="#f59e0b" fontSize="14" fontWeight="bold" textAnchor="middle">v² (key!)</text>
                  <text x="150" y="65" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Vel squared</text>
                </g>
                <g>
                  <rect x="200" y="20" width="80" height="60" rx="8" fill="#22c55e22" stroke="#22c55e" strokeWidth="1" />
                  <text x="240" y="45" fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="middle">Cd</text>
                  <text x="240" y="65" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Shape factor</text>
                </g>
                <g>
                  <rect x="290" y="20" width="90" height="60" rx="8" fill="#a855f722" stroke="#a855f7" strokeWidth="1" />
                  <text x="335" y="45" fill="#a855f7" fontSize="14" fontWeight="bold" textAnchor="middle">A (area)</text>
                  <text x="335" y="65" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Frontal area</text>
                </g>
                <g>
                  <text x="200" y="120" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">Power to overcome drag:</text>
                  <rect x="80" y="130" width="240" height="50" rx="8" fill="#ef444422" stroke="#ef4444" strokeWidth="1" />
                  <text x="200" y="160" fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="middle">P = ½ × ρ × v³ × Cd × A</text>
                </g>
              </svg>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#020617', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: colors.textSecondary, fontFamily }}>30 mph</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: colors.success, fontFamily }}>1× power</div>
                </div>
                <div style={{ background: '#020617', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: colors.textSecondary, fontFamily }}>60 mph</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: colors.warning, fontFamily }}>8× power</div>
                </div>
                <div style={{ background: '#020617', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: colors.textSecondary, fontFamily }}>90 mph</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: colors.error, fontFamily }}>27× power</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // TWIST PREDICT PHASE
  // ============================================================================
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.secondary, textAlign: 'center', marginBottom: '8px', fontFamily }}>
              The Twist: Terminal Velocity
            </h2>
            <p style={{ fontSize: '16px', color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', fontFamily, lineHeight: '1.5' }}>
              Watch what happens when objects fall through air. Something unexpected occurs...
            </p>

            {/* SVG showing falling objects */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg viewBox="0 0 400 280" width="100%" style={{ maxWidth: '400px', background: colors.bgCard, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="twistSky" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.5" />
                  </linearGradient>
                  <filter id="twistGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="400" height="280" fill="url(#twistSky)" rx="8" />
                <text x="200" y="22" fill={colors.textPrimary} fontSize="13" fontWeight="bold" textAnchor="middle">Terminal Velocity Comparison</text>
                {/* Altitude lines */}
                <line x1="30" y1="35" x2="30" y2="235" stroke={colors.textSecondary} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <text x="26" y="40" fill={colors.textSecondary} fontSize="11" textAnchor="end">15,000 ft</text>
                <text x="26" y="135" fill={colors.textSecondary} fontSize="11" textAnchor="end">7,500 ft</text>
                <text x="26" y="230" fill={colors.textSecondary} fontSize="11" textAnchor="end">Ground</text>
                <rect x="0" y="235" width="400" height="45" fill="#2d5a27" />
                {/* Spread eagle path */}
                <g>
                  <line x1="120" y1="40" x2="120" y2="120" stroke={colors.success} strokeWidth="2" strokeDasharray="6 3" />
                  <text x="120" y="155" fill={colors.success} fontSize="12" fontWeight="bold" textAnchor="middle">Spread Eagle</text>
                  <text x="120" y="170" fill={colors.textSecondary} fontSize="11" textAnchor="middle">~55 m/s terminal</text>
                  <g transform="translate(120, 90)">
                    <ellipse cx="0" cy="0" rx="25" ry="12" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
                    <circle cx="0" cy="-16" r="9" fill="#374151" />
                    <line x1="-25" y1="0" x2="-40" y2="-8" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                    <line x1="25" y1="0" x2="40" y2="-8" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                    <line x1="-8" y1="12" x2="-20" y2="28" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
                    <line x1="8" y1="12" x2="20" y2="28" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
                  </g>
                </g>
                {/* Tucked path */}
                <g>
                  <line x1="280" y1="40" x2="280" y2="180" stroke={colors.warning} strokeWidth="2" strokeDasharray="6 3" />
                  <text x="280" y="215" fill={colors.warning} fontSize="12" fontWeight="bold" textAnchor="middle">Tucked Position</text>
                  <text x="280" y="230" fill={colors.textSecondary} fontSize="11" textAnchor="middle">~70 m/s terminal</text>
                  <g transform="translate(280, 130)">
                    <ellipse cx="0" cy="0" rx="10" ry="22" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
                    <circle cx="0" cy="-22" r="9" fill="#374151" />
                  </g>
                </g>
                {/* Drag arrows */}
                <line x1="155" y1="85" x2="155" y2="55" stroke={colors.dragForce} strokeWidth="3" />
                <polygon points="155,52 151,60 159,60" fill={colors.dragForce} />
                <text x="175" y="70" fill={colors.dragForce} fontSize="11" fontWeight="bold">High Drag</text>
                <line x1="315" y1="125" x2="315" y2="105" stroke={colors.dragForce} strokeWidth="2" />
                <polygon points="315,103 312,109 318,109" fill={colors.dragForce} />
                <text x="340" y="115" fill={colors.dragForce} fontSize="11">Low Drag</text>
                {/* Weight arrows */}
                <line x1="85" y1="95" x2="85" y2="125" stroke="#fff" strokeWidth="2" />
                <polygon points="85,128 81,122 89,122" fill="#fff" />
                <text x="65" y="115" fill="#fff" fontSize="11">Weight</text>
                <line x1="245" y1="135" x2="245" y2="170" stroke="#fff" strokeWidth="2" />
                <polygon points="245,173 241,167 249,167" fill="#fff" />
                <text x="225" y="158" fill="#fff" fontSize="11">Weight</text>
              </svg>
            </div>

            <div style={{ background: `${colors.secondary}15`, borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${colors.secondary}33` }}>
              <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '12px', fontFamily }}>
                A skydiver jumps from 15,000 feet. They accelerate faster and faster... but after about 12 seconds, their speedometer stops increasing. They fall at a constant 120 mph.
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, textAlign: 'center', fontFamily }}>
                If gravity never stops pulling, why do they stop accelerating?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { id: 'A', text: 'A) Gravity gets weaker as they fall' },
                { id: 'B', text: 'B) Air pressure pushes up on them' },
                { id: 'C', text: 'C) Drag force grows until it equals their weight' },
                { id: 'D', text: 'D) They run out of gravitational potential energy' }
              ].map(option => {
                const isSelected = twistPrediction === option.id;
                const isCorrect = option.id === 'C';
                let bg = colors.bgCard;
                let borderColor = colors.border;
                if (showTwistFeedback) {
                  if (isCorrect) { bg = `${colors.success}22`; borderColor = colors.success; }
                  else if (isSelected && !isCorrect) { bg = `${colors.error}22`; borderColor = colors.error; }
                } else if (isSelected) {
                  bg = `${colors.secondary}22`; borderColor = colors.secondary;
                }
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (!showTwistFeedback) {
                        setTwistPrediction(option.id);
                        setShowTwistFeedback(true);
                        playSoundEffect(option.id === 'C' ? 'correct' : 'incorrect');
                      }
                    }}
                    disabled={showTwistFeedback}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      color: colors.textPrimary,
                      textAlign: 'left',
                      cursor: showTwistFeedback ? 'default' : 'pointer',
                      fontSize: '15px',
                      fontWeight: 500,
                      fontFamily,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>

            {showTwistFeedback && (
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: twistPrediction === 'C' ? colors.success : colors.secondary, marginBottom: '8px', fontFamily }}>
                  {twistPrediction === 'C' ? 'Excellent reasoning!' : 'Great thinking!'}
                </p>
                <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: '1.5', fontFamily }}>
                  As speed increases, drag force grows with v². Eventually drag equals weight: net force = 0, acceleration = 0. This is <span style={{ color: colors.warning, fontWeight: 700 }}>terminal velocity</span>.
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // TWIST PLAY PHASE
  // ============================================================================
  if (phase === 'twist_play') {
    // Terminal velocity chart
    const tvChartW = 380;
    const tvChartH = 200;
    const tvLeft = 55;
    const tvTop = 30;
    const maxMass = 120;
    const maxTermV = Math.sqrt((2 * maxMass * g) / (airDensity * dragCoefficient * surfaceArea)) * 1.15;

    const tvCurvePts: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const m = (i / 20) * maxMass;
      const tv = Math.sqrt((2 * m * g) / (airDensity * dragCoefficient * surfaceArea));
      const x = tvLeft + (m / maxMass) * (tvChartW - tvLeft - 10);
      const y = tvTop + tvChartH - Math.min((tv / maxTermV) * (tvChartH - 10), tvChartH - 10);
      tvCurvePts.push(`${i === 1 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const tvCurvePath = tvCurvePts.join(' ');

    const tvPtX = tvLeft + (twistMass / maxMass) * (tvChartW - tvLeft - 10);
    const tvPtY = tvTop + tvChartH - Math.min((twistTerminalV / maxTermV) * (tvChartH - 10), tvChartH - 10);

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '800px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.secondary, textAlign: 'center', marginBottom: '8px', fontFamily }}>
              Terminal Velocity Explorer
            </h2>
            <p style={{ fontSize: '16px', color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontFamily, lineHeight: '1.5' }}>
              Observe how mass affects terminal velocity. When you increase the mass, the object needs a higher speed to generate enough drag to balance its weight. This demonstrates how heavier objects fall faster in air.
            </p>

            <p style={{ fontSize: '16px', fontWeight: 700, color: colors.warning, textAlign: 'center', marginBottom: '16px', fontFamily: 'monospace' }}>
              v_terminal = √(2mg / ρ × Cd × A)
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg viewBox={`0 0 ${tvChartW} ${tvChartH + 60}`} width="100%" style={{ maxWidth: '600px', background: colors.bgCard, borderRadius: '12px' }}>
                    <defs>
                      <linearGradient id="tvGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                      </linearGradient>
                      <filter id="tvGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    <rect x="0" y="0" width={tvChartW} height={tvChartH + 60} fill={colors.bgCard} rx="12" />

                    {/* Grid */}
                    <g>
                      {[0, 1, 2, 3, 4, 5].map(i => {
                        const gy = tvTop + (i / 5) * tvChartH;
                        return <line key={`hg${i}`} x1={tvLeft} y1={gy} x2={tvChartW - 10} y2={gy} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />;
                      })}
                      {[0, 1, 2, 3, 4].map(i => {
                        const gx = tvLeft + (i / 4) * (tvChartW - tvLeft - 10);
                        return <line key={`vg${i}`} x1={gx} y1={tvTop} x2={gx} y2={tvTop + tvChartH} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />;
                      })}
                    </g>

                    {/* Axes */}
                    <g>
                      <line x1={tvLeft} y1={tvTop} x2={tvLeft} y2={tvTop + tvChartH} stroke={colors.textSecondary} strokeWidth="2" />
                      <line x1={tvLeft} y1={tvTop + tvChartH} x2={tvChartW - 10} y2={tvTop + tvChartH} stroke={colors.textSecondary} strokeWidth="2" />
                    </g>

                    <text x="15" y={tvTop + tvChartH / 2} fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform={`rotate(-90, 15, ${tvTop + tvChartH / 2})`}>Terminal V (m/s)</text>
                    <text x={(tvLeft + tvChartW - 10) / 2} y={tvTop + tvChartH + 40} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Mass (kg)</text>

                    <path d={tvCurvePath} fill="none" stroke={colors.warning} strokeWidth="3" />
                    <circle cx={tvPtX} cy={tvPtY} r={8} fill={colors.warning} filter="url(#tvGlow)" stroke="#fff" strokeWidth={2} />
                    <text x={tvPtX + 12} y={tvPtY - 8} fill={colors.textPrimary} fontSize="12" fontWeight="bold">{twistTerminalV.toFixed(1)} m/s</text>
                  </svg>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Slider */}
                <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary, fontFamily, display: 'block', marginBottom: '8px' }}>
                    Mass: {twistMass} kg
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={twistMass}
                    onChange={(e) => setTwistMass(Number(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                </div>

                <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}` }}>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5', fontFamily }}>
                    <span style={{ color: colors.success, fontWeight: 700 }}>Spread eagle (large area):</span> Lower terminal velocity (~55 m/s)
                  </p>
                  <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5', fontFamily, marginTop: '4px' }}>
                    <span style={{ color: colors.warning, fontWeight: 700 }}>Tucked (small area):</span> Higher terminal velocity (~70 m/s)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // TWIST REVIEW PHASE
  // ============================================================================
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.secondary, textAlign: 'center', marginBottom: '16px', fontFamily }}>
              Understanding Terminal Velocity
            </h2>

            <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '16px', fontFamily }}>
              As you observed in the experiment, heavier objects reach higher terminal velocities because they need more drag force to balance their greater weight.
            </p>

            <div style={{ background: `${colors.secondary}15`, borderRadius: '12px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.secondary}33` }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f472b6', textAlign: 'center', marginBottom: '16px', fontFamily }}>
                The Balance Point
              </h3>
              <div style={{ background: '#020617', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: colors.warning, fontFamily: 'monospace' }}>
                  F_drag = Weight = m × g
                </span>
              </div>

              {/* SVG diagram */}
              <svg viewBox="0 0 400 200" width="100%" style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}>
                <rect x="0" y="0" width="400" height="200" fill={colors.bgCard} rx="8" />
                <g>
                  <rect x="20" y="30" width="170" height="50" rx="8" fill={`${colors.primary}22`} stroke={colors.primary} strokeWidth="1" />
                  <text x="105" y="50" fill={colors.primary} fontSize="13" fontWeight="bold" textAnchor="middle">Step 1: Object falls</text>
                  <text x="105" y="68" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Gravity accelerates down</text>
                </g>
                <g>
                  <rect x="210" y="30" width="170" height="50" rx="8" fill={`${colors.warning}22`} stroke={colors.warning} strokeWidth="1" />
                  <text x="295" y="50" fill={colors.warning} fontSize="13" fontWeight="bold" textAnchor="middle">Step 2: Speed increases</text>
                  <text x="295" y="68" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Drag grows with v²</text>
                </g>
                <g>
                  <rect x="20" y="100" width="170" height="50" rx="8" fill={`${colors.success}22`} stroke={colors.success} strokeWidth="1" />
                  <text x="105" y="120" fill={colors.success} fontSize="13" fontWeight="bold" textAnchor="middle">Step 3: Forces balance</text>
                  <text x="105" y="138" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Drag = Weight</text>
                </g>
                <g>
                  <rect x="210" y="100" width="170" height="50" rx="8" fill={`${colors.error}22`} stroke={colors.error} strokeWidth="1" />
                  <text x="295" y="120" fill={colors.error} fontSize="13" fontWeight="bold" textAnchor="middle">Step 4: Constant speed!</text>
                  <text x="295" y="138" fill={colors.textSecondary} fontSize="11" textAnchor="middle">No net force = no accel</text>
                </g>
                <line x1="190" y1="55" x2="210" y2="55" stroke={colors.textSecondary} strokeWidth="2" markerEnd="url(#arrow)" />
                <line x1="190" y1="125" x2="210" y2="125" stroke={colors.textSecondary} strokeWidth="2" />
                <line x1="105" y1="80" x2="105" y2="100" stroke={colors.textSecondary} strokeWidth="2" />
                <line x1="295" y1="80" x2="295" y2="100" stroke={colors.textSecondary} strokeWidth="2" />
                <text x="200" y="180" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">Terminal Velocity = √(2mg / ρCdA)</text>
              </svg>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5', fontFamily }}>
                Higher mass (m) or lower area (A) results in a faster terminal velocity. That is why a tucked skydiver falls faster than one spread-eagle!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // TRANSFER PHASE
  // ============================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Drag Force"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const currentApp = realWorldApps[activeAppTab];
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.success, textAlign: 'center', marginBottom: '8px', fontFamily }}>
              Real-World Applications
            </h2>
            <p style={{ fontSize: '16px', color: colors.textSecondary, textAlign: 'center', marginBottom: '12px', fontFamily, lineHeight: '1.5' }}>
              Drag force shapes technology across every industry. Explore how engineers apply the drag equation in practice.
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', marginBottom: '20px', fontFamily }}>
              App {activeAppTab + 1} of {realWorldApps.length} | {completedApps.size} completed
            </p>

            {/* App tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {realWorldApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: activeAppTab === index ? 'none' : `1px solid ${colors.border}`,
                    background: activeAppTab === index ? app.color : colors.bgCard,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily,
                  }}
                >
                  {app.icon} {app.short}
                </button>
              ))}
            </div>

            {/* App card */}
            <div style={{ background: `linear-gradient(135deg, ${currentApp.color}22, ${currentApp.color}11)`, borderRadius: '16px', padding: '24px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px', fontFamily }}>
                {currentApp.icon} {currentApp.title}
              </h3>
              <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '12px', fontFamily, fontStyle: 'italic' }}>
                {currentApp.tagline}
              </p>

              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '16px', fontFamily }}>
                {currentApp.description}
              </p>

              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '16px', fontFamily }}>
                {currentApp.connection}
              </p>

              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '16px', fontFamily }}>
                {currentApp.howItWorks}
              </p>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {currentApp.stats.map((stat, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: currentApp.color, fontFamily }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, fontFamily }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Examples */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#22d3ee', marginBottom: '8px', fontFamily }}>Real Examples</h4>
                {currentApp.examples.map((ex, i) => (
                  <p key={i} style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', marginBottom: '4px', fontFamily }}>
                    • {ex}
                  </p>
                ))}
              </div>

              {/* Companies */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#22d3ee', marginBottom: '8px', fontFamily }}>Key Companies</h4>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {currentApp.companies.map((company, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '12px', color: colors.textSecondary, fontFamily }}>
                      {company}
                    </span>
                  ))}
                </div>
              </div>

              {/* Got It button */}
              {!completedApps.has(activeAppTab) ? (
                <button
                  onClick={() => {
                    setCompletedApps(prev => new Set([...prev, activeAppTab]));
                    playSoundEffect('complete');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: currentApp.color,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily,
                  }}
                >
                  Got It
                </button>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', color: colors.success, fontWeight: 700, fontSize: '16px', fontFamily }}>
                  ✓ Completed
                </div>
              )}
            </div>

            {/* Take the Test */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => goToPhase('test')}
                style={{
                  padding: '14px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily,
                  boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                }}
              >
                Take the Test
              </button>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // TEST PHASE
  // ============================================================================
  if (phase === 'test') {
    if (testSubmitted) {
      // Results view
      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
            {renderProgressBar()}

            <div style={{ maxWidth: '700px', margin: '24px auto 0', textAlign: 'center' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '16px', fontFamily }}>
                Test Complete!
              </h2>
              <p style={{ fontSize: '36px', fontWeight: 800, color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '16px', fontFamily }}>
                {testScore} / 10
              </p>
              <p style={{ fontSize: '18px', color: colors.textSecondary, marginBottom: '24px', fontFamily }}>
                {testScore >= 7 ? 'Excellent! You have mastered drag force!' : 'Good effort! Review the material and try again.'}
              </p>

              {/* Answer review */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
                {testQuestions.map((q, i) => {
                  const ans = testAnswers[i];
                  const correct = q.options.find(o => o.correct)?.id;
                  const isCorrect = ans === correct;
                  return (
                    <div key={i} style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isCorrect ? colors.success : colors.error,
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700,
                      fontFamily,
                    }}>
                      {isCorrect ? '✓' : '✗'}
                    </div>
                  );
                })}
              </div>

              {testScore >= 7 && (
                <button
                  onClick={() => goToPhase('mastery')}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontFamily,
                  }}
                >
                  Complete Lesson
                </button>
              )}
            </div>
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const selectedAnswer = testAnswers[currentQuestion];
    const correctId = question.options.find(o => o.correct)?.id;
    const isCorrect = selectedAnswer === correctId;

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: colors.textPrimary, textAlign: 'center', marginBottom: '6px', fontFamily }}>
              Drag Force Knowledge Test
            </h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontFamily, lineHeight: '1.5' }}>
              Apply your understanding of the drag equation F = half rho v squared Cd A to real-world scenarios. Each question tests a different aspect of aerodynamic drag and terminal velocity concepts you explored in the interactive laboratory and twist phases.
            </p>

            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', color: colors.textSecondary, fontFamily }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.primary : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.primary}` }}>
              <p style={{ fontSize: '14px', color: colors.textSecondary, fontStyle: 'italic', lineHeight: '1.5', fontFamily }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, marginBottom: '16px', fontFamily, lineHeight: '1.4' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {question.options.map(opt => {
                const isSelected = selectedAnswer === opt.id;
                let borderColor = colors.border;
                let bgColor = colors.bgCard;

                if (showExplanation) {
                  if (opt.correct) { borderColor = colors.success; bgColor = `${colors.success}22`; }
                  else if (isSelected && !opt.correct) { borderColor = colors.error; bgColor = `${colors.error}22`; }
                } else if (isSelected) {
                  borderColor = colors.primary; bgColor = `${colors.primary}22`;
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!showExplanation) {
                        playSoundEffect('click');
                        const newAnswers = [...testAnswers];
                        newAnswers[currentQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                      }
                    }}
                    disabled={showExplanation}
                    style={{
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: showExplanation ? 'default' : 'pointer',
                      color: colors.textPrimary,
                      fontSize: '14px',
                      fontFamily,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div style={{
                background: isCorrect ? `${colors.success}22` : `${colors.error}22`,
                border: `1px solid ${isCorrect ? colors.success : colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '15px', color: isCorrect ? colors.success : colors.error, fontWeight: 700, marginBottom: '8px', fontFamily }}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5', fontFamily }}>
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Quiz navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {!showExplanation && selectedAnswer && (
                <button
                  onClick={() => {
                    playSoundEffect(isCorrect ? 'correct' : 'incorrect');
                    setShowExplanation(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.primary,
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Confirm Answer
                </button>
              )}

              {showExplanation && currentQuestion < 9 && (
                <button
                  onClick={() => {
                    setCurrentQuestion(currentQuestion + 1);
                    setShowExplanation(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.primary,
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Next Question
                </button>
              )}

              {showExplanation && currentQuestion === 9 && (
                <button
                  onClick={() => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correct = testQuestions[i].options.find(o => o.correct)?.id;
                      return acc + (ans === correct ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSoundEffect(score >= 7 ? 'complete' : 'incorrect');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.success,
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // ============================================================================
  // MASTERY PHASE
  // ============================================================================
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, #020617 100%)`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {renderProgressBar()}

          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏆</div>

          <h2 style={{ fontSize: '32px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px', fontFamily }}>
            Drag Force Master!
          </h2>

          <p style={{ fontSize: '18px', color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px', lineHeight: '1.6', fontFamily }}>
            Congratulations! You have mastered the physics of air resistance. You scored {testScore}/10 on the test.
          </p>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '100%', marginBottom: '24px', border: `1px solid ${colors.border}`, textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#22d3ee', marginBottom: '16px', fontFamily }}>What You Learned:</h3>
            {[
              'The drag equation: F = ½ρv²CdA',
              'Velocity squared relationship - why speed is so costly',
              'Terminal velocity - when drag balances weight',
              'Real applications: F1, parachutes, cycling, aviation'
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '15px', color: colors.textSecondary, fontFamily }}>{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily,
            }}
          >
            Play Again
          </button>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // Default fallback - should never reach here
  return (
    <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: colors.textSecondary, fontFamily }}>Loading Drag Force...</p>
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default DragForceRenderer;
