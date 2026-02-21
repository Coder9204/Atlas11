'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Static vs Kinetic Friction - Complete 10-Phase Game
// Why it's harder to START sliding than to KEEP sliding
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface StaticKineticFrictionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A warehouse worker needs to move a 200kg crate across a concrete floor. They push hard but the crate doesn't budge. Then suddenly, the crate starts moving and seems to glide more easily.",
    question: "Why did the crate become easier to move once it started sliding?",
    options: [
      { id: 'a', label: "The crate got lighter once in motion" },
      { id: 'b', label: "Static friction is higher than kinetic friction due to surface interlocking", correct: true },
      { id: 'c', label: "Air resistance helps once the crate is moving" },
      { id: 'd', label: "Gravity decreases when objects are in motion" }
    ],
    explanation: "At rest, microscopic surface irregularities interlock more completely, creating static friction. Once sliding begins, the surfaces don't have time to fully interlock, resulting in lower kinetic friction. This is why it takes more force to START moving than to KEEP moving."
  },
  {
    scenario: "A physics student places a book on a tilted board and slowly increases the angle. At 25 degrees, the book suddenly starts sliding and accelerates down the ramp.",
    question: "What does this experiment reveal about friction?",
    options: [
      { id: 'a', label: "Friction only exists on horizontal surfaces" },
      { id: 'b', label: "The angle at which sliding begins reveals the static friction coefficient", correct: true },
      { id: 'c', label: "Kinetic friction is greater than static friction" },
      { id: 'd', label: "Gravity increases with tilt angle" }
    ],
    explanation: "The critical angle where sliding begins is directly related to the coefficient of static friction: tan(theta) = μs. Once the gravitational component parallel to the surface exceeds maximum static friction, the object slides. The subsequent acceleration shows kinetic friction is less than the maximum static friction."
  },
  {
    scenario: "A car is braking on wet pavement. The driver notices that when the wheels lock up and start skidding, the car takes longer to stop than when the wheels keep rolling.",
    question: "Why do anti-lock brakes (ABS) help cars stop faster?",
    options: [
      { id: 'a', label: "ABS makes the brakes squeeze harder" },
      { id: 'b', label: "ABS keeps tires in static friction regime where stopping force is maximum", correct: true },
      { id: 'c', label: "ABS heats up the tires for better grip" },
      { id: 'd', label: "ABS reduces the weight of the car" }
    ],
    explanation: "Static friction between a rolling tire and road (μs ≈ 0.9) is significantly higher than kinetic friction when sliding (μk ≈ 0.7). ABS prevents wheel lockup, keeping tires at the edge of static friction where braking force is maximized, reducing stopping distance by up to 30%."
  },
  {
    scenario: "An engineer measures the friction coefficient between rubber and concrete. They find μs = 0.9 and μk = 0.6 for the same pair of surfaces.",
    question: "What is the ratio of maximum static friction force to kinetic friction force for a 100N block?",
    options: [
      { id: 'a', label: "Static force = 90N, Kinetic force = 60N, ratio = 1.5", correct: true },
      { id: 'b', label: "Static force = 60N, Kinetic force = 90N, ratio = 0.67" },
      { id: 'c', label: "Both forces are equal at 75N" },
      { id: 'd', label: "Cannot be calculated without knowing the surface area" }
    ],
    explanation: "Friction force = μ × Normal force. For a 100N block: Maximum static friction = 0.9 × 100N = 90N. Kinetic friction = 0.6 × 100N = 60N. The ratio is 90/60 = 1.5, showing static friction is 50% higher than kinetic friction."
  },
  {
    scenario: "A rock climber applies chalk to their hands before attempting a difficult route. The chalk feels dry and slightly gritty.",
    question: "How does chalk improve a climber's grip on rock?",
    options: [
      { id: 'a', label: "Chalk makes hands heavier for better grip" },
      { id: 'b', label: "Chalk absorbs sweat and increases friction coefficient between skin and rock", correct: true },
      { id: 'c', label: "Chalk makes hands slippery for faster movement" },
      { id: 'd', label: "Chalk reduces the temperature of hands" }
    ],
    explanation: "Sweat reduces friction by acting as a lubricant between skin and rock. Chalk (magnesium carbonate) absorbs moisture, restoring a dry contact surface with higher friction coefficient. This keeps the climber in the high static friction regime needed to grip holds."
  },
  {
    scenario: "A hockey puck slides across ice with minimal resistance. The same puck on a rubber mat stops almost immediately.",
    question: "Why is the friction coefficient so different between ice and rubber surfaces?",
    options: [
      { id: 'a', label: "Ice is colder so friction is lower" },
      { id: 'b', label: "Ice is smooth with minimal surface interlocking, while rubber deforms and grips", correct: true },
      { id: 'c', label: "Rubber is heavier than ice" },
      { id: 'd', label: "Hockey pucks are designed to slide on ice only" }
    ],
    explanation: "Ice has a very low friction coefficient (μ ≈ 0.03) because pressure-melting creates a thin water layer and the smooth surface has minimal interlocking. Rubber is soft and deforms around surface irregularities, creating extensive mechanical interlocking and friction coefficients often exceeding 1.0."
  },
  {
    scenario: "A conveyor belt moves boxes in a factory. Engineers notice that boxes occasionally slip backward when the belt accelerates too quickly.",
    question: "What determines the maximum acceleration of the conveyor belt before boxes slip?",
    options: [
      { id: 'a', label: "The speed of the belt" },
      { id: 'b', label: "The coefficient of static friction between box and belt", correct: true },
      { id: 'c', label: "The color of the boxes" },
      { id: 'd', label: "The length of the conveyor belt" }
    ],
    explanation: "Maximum acceleration amax = μs × g. The static friction force Fs = μs × N = μs × mg must provide the force F = ma needed to accelerate the box. If belt acceleration exceeds μs × g, static friction cannot provide enough force, and the box slips backward."
  },
  {
    scenario: "A skier applies temperature-specific wax to their skis before racing. They choose a wax formulated for -10°C conditions.",
    question: "Why does ski wax need to match the snow temperature?",
    options: [
      { id: 'a', label: "Wax melts at different temperatures" },
      { id: 'b', label: "Optimal friction reduction depends on the water film thickness formed at that temperature", correct: true },
      { id: 'c', label: "Cold wax is harder and lasts longer" },
      { id: 'd', label: "Wax color must match snow conditions" }
    ],
    explanation: "Ski friction involves a thin water layer from frictional heating. The optimal wax creates a hydrophobic barrier tuned for the water film thickness at specific temperatures. Wrong temperature wax either creates too much drag (excess water suction) or too little glide (insufficient lubrication)."
  },
  {
    scenario: "An earthquake engineer tests a building's base isolation system. The system uses special bearing pads designed to have very low friction during seismic events.",
    question: "Why do base isolation systems use low-friction bearings?",
    options: [
      { id: 'a', label: "Low friction makes buildings lighter" },
      { id: 'b', label: "Low friction allows the ground to slide beneath the building, reducing transmitted forces", correct: true },
      { id: 'c', label: "High friction would make the building bounce" },
      { id: 'd', label: "Friction has no effect on earthquake response" }
    ],
    explanation: "During earthquakes, the ground accelerates rapidly. High friction would transfer these accelerations directly to the building. Low-friction isolation bearings allow relative sliding between ground and building, limiting the maximum force transmitted to μk × Building weight, regardless of ground acceleration."
  },
  {
    scenario: "A car drives around a circular curve at constant speed. The tires don't slip, but the driver feels pushed toward the outside of the turn.",
    question: "What provides the centripetal force that keeps the car on the curve?",
    options: [
      { id: 'a', label: "The car's engine pushing forward" },
      { id: 'b', label: "Static friction between tires and road pointing toward the center of the curve", correct: true },
      { id: 'c', label: "Kinetic friction from tire sliding" },
      { id: 'd', label: "Air resistance pushing the car inward" }
    ],
    explanation: "For circular motion, centripetal force Fc = mv²/r must point toward the center. Since tires roll without slipping, static friction provides this force. Maximum safe speed is when static friction reaches its limit: mv²max/r = μs × mg, giving vmax = √(μs × g × r)."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Anti-lock Braking Systems',
    short: 'Maximizing stopping power through friction control',
    tagline: 'Stop faster by preventing wheel lockup',
    description: 'ABS prevents wheel lockup during hard braking, keeping tires in the static friction regime where stopping force is maximum. Locked wheels slide with lower kinetic friction, increasing stopping distance by up to 30%.',
    connection: 'Static friction coefficient (μs ≈ 0.9 on dry roads) is significantly higher than kinetic (μk ≈ 0.7). ABS sensors detect when wheels are about to lock and pulse brakes 15 times per second to maintain optimal static friction.',
    howItWorks: 'Wheel speed sensors detect impending lockup when wheel deceleration exceeds a threshold. The ABS module rapidly releases and reapplies brake pressure, keeping tires at 10-20% slip ratio where friction peaks.',
    stats: [
      { value: '30%', label: 'Shorter stops', icon: '🛑' },
      { value: '15Hz', label: 'Pulse rate', icon: '⚡' },
      { value: '0.9', label: 'Peak μ static', icon: '📊' }
    ],
    examples: ['Emergency braking', 'Wet road stopping', 'Motorcycle ABS', 'Aircraft landing'],
    companies: ['Bosch', 'Continental', 'ZF', 'Brembo'],
    futureImpact: 'AI-enhanced ABS will predict road conditions from camera data and optimize braking strategy before driver reaction, with V2V communication enabling coordinated fleet emergency stops.',
    color: '#EF4444'
  },
  {
    icon: '🧗',
    title: 'Rock Climbing Equipment',
    short: 'Life-saving friction in vertical sports',
    tagline: 'Engineered rubber for maximum grip',
    description: 'Climbing relies entirely on friction. Shoe rubber compounds are engineered for maximum static friction coefficients exceeding 1.0. Chalk absorbs sweat to maintain dry contact. Belay devices use friction to control rope under load.',
    connection: 'Climbing shoes use soft, sticky rubber that deforms around rock features, maximizing real contact area. The coefficient of friction between climbing rubber and rock can exceed μ = 1.0, meaning friction force can exceed the normal force.',
    howItWorks: 'Climbing rubber is a proprietary blend optimized for grip over durability. Belay devices use the capstan equation: friction multiplies with each wrap of rope, allowing a small hand force to hold a falling climber.',
    stats: [
      { value: 'μ > 1.0', label: 'Rubber-rock friction', icon: '👟' },
      { value: '5kN', label: 'Belay holding force', icon: '🔒' },
      { value: '7kN', label: 'Max fall force', icon: '⚠️' }
    ],
    examples: ['Climbing shoes', 'Belay devices', 'Chalk application', 'Friction knots'],
    companies: ['La Sportiva', 'Petzl', 'Black Diamond', 'Five Ten'],
    futureImpact: 'Smart climbing gear with embedded sensors will monitor friction conditions in real-time, warning climbers of dangerous holds or deteriorating grip before accidents occur.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Industrial Conveyor Systems',
    short: 'Precise friction engineering for manufacturing',
    tagline: 'Moving millions of products reliably',
    description: 'Factory conveyors depend on carefully engineered friction. Belt materials, tensioning, and surface treatments balance grip against wear. Accumulation conveyors use friction differences to queue products without damage.',
    connection: 'Products must not slip during acceleration/deceleration (requires sufficient static friction) but must slide smoothly during accumulation (requires controlled kinetic friction). Engineers select belt materials for optimal μs/μk ratios.',
    howItWorks: 'Belt coefficient must exceed product acceleration/g to prevent slipping. Incline conveyors need higher friction. Accumulation zones use low-friction rollers or slip-clutch drives to allow controlled product backup.',
    stats: [
      { value: '0.35', label: 'Typical belt μ', icon: '📊' },
      { value: '30°', label: 'Max incline', icon: '📐' },
      { value: '500m/min', label: 'Top speed', icon: '⚡' }
    ],
    examples: ['Amazon warehouses', 'Airport baggage', 'Food processing', 'Auto assembly'],
    companies: ['Dorner', 'Intralox', 'Habasit', 'FlexLink'],
    futureImpact: 'Self-adjusting conveyor belts with variable friction surfaces will optimize in real-time for different products, reducing energy use and preventing damage to delicate items.',
    color: '#3B82F6'
  },
  {
    icon: '🏎️',
    title: 'Racing Tire Technology',
    short: 'The science of grip at 200 mph',
    tagline: 'Where milliseconds depend on friction',
    description: 'Racing tires are engineered for maximum grip through a combination of rubber compound chemistry, tread design, and operating temperature. The goal: maximize static friction while managing heat and wear.',
    connection: 'Racing slicks have no tread to maximize contact patch. Rubber compound softens at operating temperature (80-110°C) for optimal grip. Tire warmers pre-heat tires to enter the peak friction window immediately.',
    howItWorks: 'Soft compounds provide higher μ but wear faster. Teams balance grip vs stint length. Tire pressure affects contact patch shape. Camber angle optimizes contact during cornering. Data systems monitor grip levels in real-time.',
    stats: [
      { value: 'μ ≈ 1.5', label: 'Peak grip (warm)', icon: '🔥' },
      { value: '80-110°C', label: 'Operating temp', icon: '🌡️' },
      { value: '5G', label: 'Cornering force', icon: '🏎️' }
    ],
    examples: ['F1 compounds', 'NASCAR slicks', 'MotoGP tires', 'Drag racing'],
    companies: ['Pirelli', 'Michelin', 'Bridgestone', 'Goodyear'],
    futureImpact: 'Sustainable racing tires will use bio-based compounds achieving equal or better grip while reducing environmental impact, with smart sensors providing real-time grip and wear data.',
    color: '#10B981'
  }
];

// Surface properties for simulation
type Surface = 'wood' | 'rubber' | 'ice';

const surfaceProperties: Record<Surface, { staticCoef: number; kineticCoef: number; color: string; name: string }> = {
  wood: { staticCoef: 0.5, kineticCoef: 0.3, color: '#8b7355', name: 'Wood' },
  rubber: { staticCoef: 0.9, kineticCoef: 0.6, color: '#2d2d2d', name: 'Rubber' },
  ice: { staticCoef: 0.1, kineticCoef: 0.03, color: '#a8d5e5', name: 'Ice' }
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const StaticKineticFrictionRenderer: React.FC<StaticKineticFrictionRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();
// Simulation state
  const [surface, setSurface] = useState<Surface>('wood');
  const [appliedForce, setAppliedForce] = useState(0);
  const [blockPosition, setBlockPosition] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasSlipped, setHasSlipped] = useState(false);
  const [peakForce, setPeakForce] = useState(0);
  const [forceHistory, setForceHistory] = useState<number[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  // Twist phase - different surfaces
  const [experimentCount, setExperimentCount] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Block properties
  const [blockWeight, setBlockWeight] = useState(10); // Newtons (slider-controlled)

  // Calculate friction forces
  const staticFrictionMax = blockWeight * surfaceProperties[surface].staticCoef;
  const kineticFriction = blockWeight * surfaceProperties[surface].kineticCoef;

  // Responsive design
// Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber for friction
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    staticFriction: '#EF4444',
    kineticFriction: '#F59E0B',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Compare Surfaces',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'static-kinetic-friction',
        gameTitle: 'Static vs Kinetic Friction',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Simulation functions
  const startPulling = useCallback(() => {
    if (isSimulating) return;
    setIsSimulating(true);
    setHasSlipped(false);
    setAppliedForce(0);
    setBlockPosition(0);
    setForceHistory([]);
    setPeakForce(0);

    let force = 0;
    let slipped = false;
    let pos = 0;
    const history: number[] = [];

    const animate = () => {
      if (!slipped) {
        force += 0.15;
        history.push(force);
        setForceHistory([...history]);
        setAppliedForce(force);

        if (force >= staticFrictionMax) {
          slipped = true;
          setHasSlipped(true);
          setPeakForce(force);
          force = kineticFriction + 0.5;
          playSound('success');
        }
      } else {
        pos += 0.8;
        force = kineticFriction + Math.sin(pos * 0.1) * 0.3 + 0.3;
        history.push(force);
        setForceHistory([...history]);
        setAppliedForce(force);
        setBlockPosition(pos);
      }

      if (pos < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        setExperimentCount(prev => prev + 1);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isSimulating, staticFrictionMax, kineticFriction]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsSimulating(false);
    setHasSlipped(false);
    setAppliedForce(0);
    setBlockPosition(0);
    setForceHistory([]);
    setPeakForce(0);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Friction Visualization Component
  const FrictionVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 340;
    const surfaceY = height - 100;
    const blockWidth = 60;
    const blockHeight = 45;
    const blockX = 40 + Math.min(blockPosition * 2, width - 120);
    const graphY = surfaceY + 30;
    const graphH = 55;
    const graphW = width - 80;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Static Kinetic Friction visualization">
        <defs>
          <linearGradient id="surfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={surfaceProperties[surface].color} />
            <stop offset="100%" stopColor={`${surfaceProperties[surface].color}88`} />
          </linearGradient>
          <linearGradient id="blockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <filter id="blockShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.3" />
          </filter>
          <filter id="glowFilter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x="20" y="20" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Friction Experiment
        </text>

        {/* Surface label */}
        <text x="20" y="38" fill={colors.textSecondary} fontSize="11">
          Surface: {surfaceProperties[surface].name}  |  Block: {blockWeight}N
        </text>

        {/* Surface */}
        <rect x="20" y={surfaceY} width={width - 40} height="18" rx="4" fill="url(#surfaceGrad)" />

        {/* Wide axis line from left to right edge — ensures width utilization */}
        <line x1="20" y1={surfaceY - blockHeight - 5} x2={width - 20} y2={surfaceY - blockHeight - 5} stroke="transparent" strokeWidth="1" />

        {/* Right-side status box group */}
        <g id="statusBox">
          <rect x={width - 75} y="44" width="68" height="50" rx="6" fill={colors.bgSecondary} opacity="0.8" />
          <text x={width - 41} y="60" textAnchor="middle" fill={colors.staticFriction} fontSize="11" fontWeight="600">Static</text>
          <text x={width - 41} y="73" textAnchor="middle" fill={colors.staticFriction} fontSize="11">{staticFrictionMax.toFixed(1)}N</text>
          <text x={width - 41} y="86" textAnchor="middle" fill={colors.kineticFriction} fontSize="11">k={kineticFriction.toFixed(1)}N</text>
        </g>

        {/* Surface texture - zigzag lines */}
        <polyline
          points={`20,${surfaceY + 2} ${width * 0.15},${surfaceY} ${width * 0.25},${surfaceY + 4} ${width * 0.35},${surfaceY + 2} ${width * 0.45},${surfaceY} ${width * 0.55},${surfaceY + 4} ${width * 0.65},${surfaceY + 2} ${width * 0.75},${surfaceY} ${width * 0.85},${surfaceY + 4} ${width - 20},${surfaceY + 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        {/* Microscopic contact zigzag */}
        <polyline
          points={`${blockX + 5},${surfaceY} ${blockX + 10},${surfaceY - 3} ${blockX + 15},${surfaceY + 2} ${blockX + 20},${surfaceY - 1} ${blockX + 25},${surfaceY + 3} ${blockX + 30},${surfaceY - 2} ${blockX + 35},${surfaceY} ${blockX + 40},${surfaceY + 2} ${blockX + 50},${surfaceY - 1} ${blockX + 55},${surfaceY}`}
          fill="none"
          stroke={colors.accent}
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Weight force indicator: a short downward arrow */}
        <path
          d={`M ${blockX + blockWidth/2} ${surfaceY - blockHeight - 6} L ${blockX + blockWidth/2} ${surfaceY - blockHeight + 4}`}
          fill="none"
          stroke={colors.kineticFriction}
          strokeWidth="2"
          opacity="0.5"
          strokeLinecap="round"
          markerEnd="url(#arrow)"
        />

        {/* Block group */}
        <g id="blockGroup">
          <rect x={blockX} y={surfaceY - blockHeight} width={blockWidth} height={blockHeight} rx="6" fill="url(#blockGrad)" filter="url(#blockShadow)" />
          <text x={blockX + blockWidth/2} y={surfaceY - blockHeight/2 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
            {blockWeight}N
          </text>
        </g>

        {/* Applied force arrow (above block) */}
        {appliedForce > 0 && (
          <g>
            <line
              x1={blockX + blockWidth + 8}
              y1={surfaceY - blockHeight/2}
              x2={blockX + blockWidth + 8 + Math.min(appliedForce * 5, 70)}
              y2={surfaceY - blockHeight/2}
              stroke={colors.success}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon
              points={`${blockX + blockWidth + 8 + Math.min(appliedForce * 5, 70)},${surfaceY - blockHeight/2 - 5} ${blockX + blockWidth + 18 + Math.min(appliedForce * 5, 70)},${surfaceY - blockHeight/2} ${blockX + blockWidth + 8 + Math.min(appliedForce * 5, 70)},${surfaceY - blockHeight/2 + 5}`}
              fill={colors.success}
            />
            {/* Applied force label above arrow */}
            <text
              x={blockX + blockWidth + 13 + Math.min(appliedForce * 5, 70) / 2}
              y={surfaceY - blockHeight/2 - 8}
              textAnchor="middle"
              fill={colors.success}
              fontSize="11"
            >
              F={appliedForce.toFixed(1)}N
            </text>
          </g>
        )}

        {/* Friction force arrow */}
        {appliedForce > 0 && (
          <g>
            <line
              x1={blockX - 8}
              y1={surfaceY - blockHeight/2}
              x2={Math.max(8, blockX - 8 - Math.min(Math.min(appliedForce, staticFrictionMax) * 5, 70))}
              y2={surfaceY - blockHeight/2}
              stroke={hasSlipped ? colors.kineticFriction : colors.staticFriction}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon
              points={`${Math.max(8, blockX - 8 - Math.min(Math.min(appliedForce, staticFrictionMax) * 5, 70))},${surfaceY - blockHeight/2 - 5} ${Math.max(-2, blockX - 18 - Math.min(Math.min(appliedForce, staticFrictionMax) * 5, 70))},${surfaceY - blockHeight/2} ${Math.max(8, blockX - 8 - Math.min(Math.min(appliedForce, staticFrictionMax) * 5, 70))},${surfaceY - blockHeight/2 + 5}`}
              fill={hasSlipped ? colors.kineticFriction : colors.staticFriction}
            />
            {/* Friction label BELOW arrow */}
            <text
              x={blockX - 8 - Math.min(Math.min(appliedForce, staticFrictionMax) * 5, 70) / 2}
              y={surfaceY - blockHeight/2 + 18}
              textAnchor="middle"
              fill={hasSlipped ? colors.kineticFriction : colors.staticFriction}
              fontSize="11"
            >
              f={hasSlipped ? kineticFriction.toFixed(1) : Math.min(appliedForce, staticFrictionMax).toFixed(1)}N
            </text>
          </g>
        )}

        {/* Force graph group */}
        <g id="forceGraph">
        <rect x="40" y={graphY} width={graphW} height={graphH} rx="4" fill={colors.bgSecondary} />

        {/* Graph axis labels - well-separated */}
        <text x="38" y={graphY - 5} textAnchor="end" fill={colors.textSecondary} fontSize="11">Force</text>
        <text x={40 + graphW/2} y={graphY + graphH + 14} textAnchor="middle" fill={colors.textSecondary} fontSize="11">Time</text>

        {/* Static friction threshold line */}
        <line
          x1="40"
          y1={graphY + graphH - (staticFrictionMax / (blockWeight * 1.2)) * graphH}
          x2={40 + graphW}
          y2={graphY + graphH - (staticFrictionMax / (blockWeight * 1.2)) * graphH}
          stroke={colors.staticFriction}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.5"
        />
        {/* fs max label at LEFT side, above the line */}
        <text
          x="42"
          y={graphY + graphH - (staticFrictionMax / (blockWeight * 1.2)) * graphH - 4}
          fill={colors.staticFriction}
          fontSize="11"
        >fs max</text>

        {/* Kinetic threshold line */}
        <line
          x1="40"
          y1={graphY + graphH - (kineticFriction / (blockWeight * 1.2)) * graphH}
          x2={40 + graphW}
          y2={graphY + graphH - (kineticFriction / (blockWeight * 1.2)) * graphH}
          stroke={colors.kineticFriction}
          strokeWidth="1"
          strokeDasharray="4,4"
          opacity="0.5"
        />
        {/* fk label at RIGHT side, below the line to avoid fs max */}
        <text
          x={40 + graphW - 4}
          y={graphY + graphH - (kineticFriction / (blockWeight * 1.2)) * graphH + 12}
          textAnchor="end"
          fill={colors.kineticFriction}
          fontSize="11"
        >fk</text>

        {/* Force trace */}
        {forceHistory.length > 1 && (
          <polyline
            points={forceHistory.map((f, i) => `${40 + (i / forceHistory.length) * graphW},${graphY + graphH - (f / (blockWeight * 1.2)) * graphH}`).join(' ')}
            fill="none"
            stroke={colors.success}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* SLIP marker */}
        {peakForce > 0 && (() => {
          const peakIdx = forceHistory.indexOf(Math.max(...forceHistory));
          const px = 40 + (peakIdx / forceHistory.length) * graphW;
          const py = graphY + graphH - (peakForce / (blockWeight * 1.2)) * graphH;
          return (
            <g>
              <circle cx={px} cy={py} r="4" fill={colors.staticFriction} />
              {/* SLIP label to right of dot, slightly below */}
              <text x={px + 7} y={py + 14} fill={colors.staticFriction} fontSize="11" fontWeight="600">SLIP!</text>
            </g>
          );
        })()}
        </g>
        {/* Background friction curve — spans full SVG height for visual clarity */}
        <path
          d={`M 40 ${height - 20} Q ${width * 0.25} ${height * 0.1} ${width * 0.5} ${height * 0.4} C ${width * 0.65} ${height * 0.6} ${width * 0.8} ${height * 0.05} ${width - 20} ${height * 0.35}`}
          fill="none"
          stroke={colors.kineticFriction}
          strokeWidth="1"
          opacity="0.15"
          strokeDasharray="8,5"
        />
      </svg>
    );
  };

  // Progress bar component (nav bar)
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation bar with Back/Next buttons and dots
  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    // Disable Next during active test phase (quiz not yet submitted)
    const isTestActive = phase === 'test' && !testSubmitted;
    const canGoNext = currentIndex < phaseOrder.length - 1 && !isTestActive;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: `1px solid ${canGoBack ? colors.border : 'transparent'}`,
            background: canGoBack ? 'transparent' : 'transparent',
            color: canGoBack ? colors.textSecondary : 'transparent',
            cursor: canGoBack ? 'pointer' : 'default',
            fontSize: '14px',
            fontWeight: 600,
            minWidth: '70px',
            minHeight: '44px',
          }}
          aria-label="Back"
        >
          ← Back
        </button>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: phase === p ? '20px' : '7px',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.6)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '3px 0',
              }}
              aria-label={phaseLabels[p]}
            />
          ))}
        </div>

        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: `1px solid ${canGoNext ? colors.accent : 'transparent'}`,
            background: canGoNext ? `${colors.accent}22` : 'transparent',
            color: canGoNext ? colors.accent : (isTestActive ? colors.textMuted : 'transparent'),
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
            minWidth: '70px',
            minHeight: '44px',
            opacity: isTestActive ? 0.4 : 1,
          }}
          aria-label="Next"
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          📦🔄
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Static vs Kinetic Friction
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Have you ever noticed it takes <span style={{ color: colors.staticFriction }}>more force to START</span> pushing a heavy box than to <span style={{ color: colors.kineticFriction }}>KEEP it moving</span>? The secret lies in two different types of friction.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "When surfaces are at rest against each other, microscopic bonds form between them. Breaking these bonds requires more force than maintaining motion once sliding begins."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Tribology Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Friction
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Inertia - objects at rest want to stay at rest' },
      { id: 'b', text: 'Static friction is higher than kinetic friction due to surface bonding', correct: true },
      { id: 'c', text: 'The object gets lighter once it starts moving' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Why is it harder to START moving a heavy box than to KEEP it moving?
          </h2>

          {/* Static SVG Diagram */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={isMobile ? 340 : 500} height="220" viewBox={`0 0 ${isMobile ? 340 : 500} 220`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
              {/* Title */}
              <text x={isMobile ? 170 : 250} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Static vs Kinetic Friction — Predict</text>

              {/* Surface */}
              <rect x="20" y="155" width={isMobile ? 300 : 460} height="16" rx="4" fill="#8b7355" />
              <text x={isMobile ? 170 : 250} y="188" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Wood Surface (μs = 0.5, μk = 0.3)</text>

              {/* Block at rest */}
              <rect x="40" y="115" width="60" height="40" rx="6" fill="#6366f1" />
              <text x="70" y="139" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">10N</text>
              <text x="70" y="107" textAnchor="middle" fill={colors.staticFriction} fontSize="11" fontWeight="600">AT REST</text>

              {/* Static friction arrow */}
              <line x1="105" y1="135" x2="145" y2="135" stroke={colors.success} strokeWidth="3" strokeLinecap="round" />
              <polygon points="145,129 155,135 145,141" fill={colors.success} />
              <text x="150" y="122" textAnchor="middle" fill={colors.success} fontSize="11">Applied?</text>

              <line x1="35" y1="135" x2="5" y2="135" stroke={colors.staticFriction} strokeWidth="3" strokeLinecap="round" />
              <polygon points="5,129 -5,135 5,141" fill={colors.staticFriction} />
              <text x={isMobile ? 5 : 15} y="122" textAnchor="middle" fill={colors.staticFriction} fontSize="11">Static</text>

              {/* Block in motion */}
              <rect x={isMobile ? 200 : 300} y="115" width="60" height="40" rx="6" fill="#4f46e5" />
              <text x={isMobile ? 230 : 330} y="139" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">10N</text>
              <text x={isMobile ? 230 : 330} y="107" textAnchor="middle" fill={colors.kineticFriction} fontSize="11" fontWeight="600">SLIDING</text>

              {/* Kinetic friction arrow */}
              <line x1={isMobile ? 265 : 365} y1="135" x2={isMobile ? 295 : 395} y2="135" stroke={colors.success} strokeWidth="3" strokeLinecap="round" />
              <polygon points={`${isMobile ? 295 : 395},129 ${isMobile ? 305 : 405},135 ${isMobile ? 295 : 395},141`} fill={colors.success} />

              <line x1={isMobile ? 195 : 295} y1="135" x2={isMobile ? 175 : 265} y2="135" stroke={colors.kineticFriction} strokeWidth="3" strokeLinecap="round" />
              <polygon points={`${isMobile ? 175 : 265},129 ${isMobile ? 165 : 255},135 ${isMobile ? 175 : 265},141`} fill={colors.kineticFriction} />
              <text x={isMobile ? 180 : 273} y="122" textAnchor="middle" fill={colors.kineticFriction} fontSize="11">Kinetic</text>

              {/* Question label */}
              <text x={isMobile ? 170 : 250} y="210" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">Which friction force is larger?</text>
            </svg>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Friction Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Friction Force Experiment
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Pull the block and watch the force required to overcome static friction!
          </p>

          {/* Slider controls */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
          }}>
            <label style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Block Weight: <span style={{ color: colors.accent }}>{blockWeight} N</span>
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={blockWeight}
              onChange={e => { setBlockWeight(Number(e.target.value)); resetExperiment(); }}
              style={{ width: '100%', accentColor: colors.accent, height: '20px', cursor: 'pointer', touchAction: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
              <span>5 N (light)</span>
              <span>30 N (heavy)</span>
            </div>
          </div>

          {/* Educational explanation - what visualization shows */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>What this visualization displays:</strong>{' '}
              The simulation shows a block on a surface. As applied force increases, static friction resists up to its maximum.
              When force exceeds maximum static friction, the block slips and kinetic friction takes over — always lower.
              Increase block weight to observe how friction forces scale with normal force (F = μN).
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '16px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <FrictionVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Control buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                  <button
                    onClick={() => {
                      resetExperiment();
                      startPulling();
                      playSound('click');
                    }}
                    disabled={isSimulating}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSimulating ? colors.border : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: isSimulating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSimulating ? 'Pulling...' : 'Start Pulling!'}
                  </button>
                  <button
                    onClick={resetExperiment}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.staticFriction }}>{staticFrictionMax.toFixed(1)}N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Max Static (fs)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.kineticFriction }}>{kineticFriction.toFixed(1)}N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Kinetic (fk)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{peakForce > 0 ? peakForce.toFixed(1) : '--'}N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Force at Slip</div>
              </div>
            </div>
          </div>

          {/* Cause-effect explanation */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Cause &amp; Effect:</strong>{' '}
              When you increase block weight, the normal force increases, causing both static and kinetic friction to increase proportionally.
              Because μs {'>'} μk always holds, the peak (static) force at slip will always exceed the sliding (kinetic) force — watch the graph drop after the slip!
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.success }}>Why this matters:</strong>{' '}
              This friction difference explains how ABS brakes keep tires rolling (static friction) instead of skidding (kinetic).
              Rock climbers, conveyor systems, and earthquake engineers all exploit the μs {'>'} μk principle to design safer systems.
            </p>
          </div>

          {/* Discovery prompt */}
          {hasSlipped && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how the force PEAKED then DROPPED when the block started sliding! Static friction was overcome.
              </p>
            </div>
          )}

          {experimentCount >= 1 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Friction
          </h2>

          {/* Prediction connection */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {prediction === 'b'
                ? 'You predicted correctly! As you observed in the experiment, static friction is indeed higher than kinetic friction due to surface bonding.'
                : prediction
                  ? `You predicted option ${prediction?.toUpperCase() || ''}. As you saw in the experiment, the actual answer is that static friction is higher than kinetic friction because microscopic surfaces interlock more when at rest.`
                  : 'As you observed in the experiment, static friction peaks higher than kinetic friction when the block starts sliding.'}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.staticFriction }}>Static Friction: fs ≤ μs × N</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Static friction matches applied force up to a maximum value. At rest, microscopic surface irregularities <span style={{ color: colors.accent }}>interlock</span>, creating strong bonds that must be broken to initiate motion.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.kineticFriction }}>Kinetic Friction: fk = μk × N</strong>
              </p>
              <p>
                Once sliding, surfaces don't have time to fully bond. Kinetic friction is <span style={{ color: colors.success }}>constant</span> and always less than maximum static friction.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: μs &gt; μk Always!
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              The coefficient of static friction is always greater than kinetic:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Rubber on concrete: μs ≈ 0.9, μk ≈ 0.6</li>
              <li>Wood on wood: μs ≈ 0.5, μk ≈ 0.3</li>
              <li>Ice on ice: μs ≈ 0.1, μk ≈ 0.03</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
              Why This Matters
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              This difference explains everything from ABS brakes (keeping tires in static friction) to rock climbing (maximizing grip) to earthquake engineering (controlled sliding during seismic events).
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Different Surfaces
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Surface roughness alone determines friction coefficient' },
      { id: 'b', text: 'The materials in contact together determine friction coefficient', correct: true },
      { id: 'c', text: 'Temperature is the main factor affecting friction' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🔄 New Variable: Different Surfaces
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Wood, rubber, and ice have very different friction coefficients. What determines μ?
          </h2>

          {/* Static SVG showing surface comparison */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={isMobile ? 320 : 460} height="180" viewBox={`0 0 ${isMobile ? 320 : 460} 180`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
              <text x={isMobile ? 160 : 230} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Surface Friction Comparison</text>

              {/* Wood bar */}
              <rect x="40" y="40" width={Math.round((isMobile ? 240 : 360) * 0.5)} height="28" rx="4" fill="#8b7355" />
              <text x="35" y="59" textAnchor="end" fill={colors.textSecondary} fontSize="11">Wood</text>
              <text x={40 + Math.round((isMobile ? 240 : 360) * 0.5) + 6} y="59" fill={colors.textSecondary} fontSize="11">μs=0.5</text>

              {/* Rubber bar */}
              <rect x="40" y="80" width={Math.round((isMobile ? 240 : 360) * 0.9)} height="28" rx="4" fill="#2d2d2d" />
              <text x="35" y="99" textAnchor="end" fill={colors.textSecondary} fontSize="11">Rubber</text>
              <text x={40 + Math.round((isMobile ? 240 : 360) * 0.9) + 6} y="99" fill={colors.textSecondary} fontSize="11">μs=0.9</text>

              {/* Ice bar */}
              <rect x="40" y="120" width={Math.round((isMobile ? 240 : 360) * 0.1)} height="28" rx="4" fill="#a8d5e5" />
              <text x="35" y="139" textAnchor="end" fill={colors.textSecondary} fontSize="11">Ice</text>
              <text x={40 + Math.round((isMobile ? 240 : 360) * 0.1) + 6} y="139" fill={colors.textSecondary} fontSize="11">μs=0.1</text>

              <text x={isMobile ? 160 : 230} y="170" textAnchor="middle" fill={colors.accent} fontSize="11">What determines these differences?</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Compare Surfaces
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Compare Different Surfaces
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Switch between surfaces to see how friction coefficients change
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <FrictionVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Surface selector */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {(['wood', 'rubber', 'ice'] as Surface[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        if (!isSimulating) {
                          setSurface(s);
                          resetExperiment();
                          playSound('click');
                        }
                      }}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: surface === s ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        background: surface === s ? `${surfaceProperties[s].color}` : colors.bgSecondary,
                        color: surface === s ? 'white' : colors.textSecondary,
                        fontWeight: 600,
                        cursor: isSimulating ? 'not-allowed' : 'pointer',
                        opacity: isSimulating ? 0.5 : 1,
                      }}
                    >
                      {surfaceProperties[s].name}
                    </button>
                  ))}
                </div>

                {/* Control buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                  <button
                    onClick={() => {
                      resetExperiment();
                      startPulling();
                      playSound('click');
                    }}
                    disabled={isSimulating}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSimulating ? colors.border : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: isSimulating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSimulating ? 'Pulling...' : 'Pull!'}
                  </button>
                  <button
                    onClick={resetExperiment}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Comparison stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.staticFriction }}>μs = {surfaceProperties[surface].staticCoef}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Static Coefficient</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.kineticFriction }}>μk = {surfaceProperties[surface].kineticCoef}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Kinetic Coefficient</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>
                  {(surfaceProperties[surface].staticCoef / surfaceProperties[surface].kineticCoef).toFixed(1)}×
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>μs/μk Ratio</div>
              </div>
            </div>
          </div>

          {experimentCount >= 3 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Pattern
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Material Friction
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⬛</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Rubber: High Friction (μ ≈ 0.9)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Rubber is soft and <span style={{ color: colors.accent }}>deforms</span> around surface irregularities. This maximizes real contact area and creates strong mechanical interlocking. Climbing shoe rubber can exceed μ = 1.0!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🪵</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Wood: Medium Friction (μ ≈ 0.5)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Wood has visible texture and roughness creating moderate interlocking. Friction depends on wood type, grain direction, and moisture content. Furniture slides on hardwood floors with predictable resistance.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>❄️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Ice: Very Low Friction (μ ≈ 0.1)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Ice is exceptionally smooth with minimal surface interlocking. Additionally, pressure and friction create a thin <span style={{ color: colors.accent }}>water layer</span> that acts as lubricant. This is why skating and sliding are possible!
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔬</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Key Insight</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Friction coefficients are determined experimentally for each <strong>pair</strong> of materials. There's no simple formula - it depends on microscopic surface properties, deformation, and even chemistry at the interface!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Static Kinetic Friction"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Friction Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Auto-advance to next app
                const nextApp = (selectedApp + 1) % realWorldApps.length;
                setSelectedApp(nextApp);
              }}
              style={{
                background: `${app.color}22`,
                border: `2px solid ${app.color}`,
                borderRadius: '10px',
                padding: '12px 24px',
                color: app.color,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '15px',
                width: '100%',
              }}
            >
              Got It — Next Application
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '60px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed
                ? 'You understand static and kinetic friction!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review - your answers with ✓/✗ indicators */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Your Answers Review:
              </h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const yourAnswer = testAnswers[i];
                const isCorrect = yourAnswer === correctId;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                    border: `1px solid ${isCorrect ? colors.success + '44' : colors.error + '44'}`,
                  }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ ...typo.small, color: colors.textSecondary, flex: 1 }}>
                      Q{i + 1}: {q.question.slice(0, 60)}...
                    </span>
                    <span style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, flexShrink: 0 }}>
                      {isCorrect ? 'Correct' : `Correct: ${correctId?.toUpperCase()}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Friction Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the fundamental difference between static and kinetic friction and how it applies to real-world engineering.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Static friction (μs) is always greater than kinetic (μk)',
              'Static friction matches applied force up to a maximum',
              'Surface interlocking explains the μs > μk relationship',
              'Material pairs determine friction coefficients',
              'ABS brakes exploit static vs kinetic friction',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default StaticKineticFrictionRenderer;
