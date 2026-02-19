'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON TPS TURNAROUND - Complete 10-Phase Game (#29 of 36)
// Reusability turnaround: inspection, refurbishment, and testing between flights
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

interface Props {
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
    scenario: 'Airlines achieve 99.5% dispatch reliability by treating aircraft like buses — land, refuel, inspect, and fly again within 45 minutes.',
    question: 'What is the key principle that makes airline-model reuse economically viable?',
    options: [
      { id: 'a', label: 'Using the cheapest possible materials' },
      { id: 'b', label: 'Rapid turnaround with minimal between-flight inspection, enabled by high-reliability design', correct: true },
      { id: 'c', label: 'Never inspecting the aircraft' },
      { id: 'd', label: 'Flying only short routes' }
    ],
    explanation: 'The airline model works because aircraft are designed for high reliability with known maintenance intervals. Minimal between-flight checks keep turnaround fast, while scheduled deep maintenance catches wear items.'
  },
  {
    scenario: 'The "bathtub curve" describes failure rates over a component\'s life: high early failures (infant mortality), low random failures (useful life), then increasing wearout failures.',
    question: 'Where on the bathtub curve should a reusable rocket engine ideally operate?',
    options: [
      { id: 'a', label: 'In the infant mortality zone — new is always better' },
      { id: 'b', label: 'In the flat middle region — past burn-in but before wearout', correct: true },
      { id: 'c', label: 'In the wearout zone — getting maximum use' },
      { id: 'd', label: 'The curve does not apply to rocket engines' }
    ],
    explanation: 'The flat middle of the bathtub curve represents the lowest failure rate. A flight-proven engine has passed infant mortality screening but has not yet reached wearout — the ideal operating zone.'
  },
  {
    scenario: 'Some failures are random (bird strikes, lightning) while others are wearout (turbine blade fatigue, bearing degradation). Each type requires a different maintenance strategy.',
    question: 'Why is scheduled replacement effective for wearout failures but not for random failures?',
    options: [
      { id: 'a', label: 'Random failures can be predicted by looking at the part' },
      { id: 'b', label: 'Wearout failures have a predictable life distribution, so replacement before the wearout zone prevents them; random failures have no such pattern', correct: true },
      { id: 'c', label: 'Random failures never happen to rocket engines' },
      { id: 'd', label: 'Wearout failures only happen on the ground' }
    ],
    explanation: 'Wearout follows a predictable distribution — replace at 80% of expected life and you prevent most failures. Random failures, by definition, are equally likely at any time, so scheduled replacement wastes parts without improving reliability.'
  },
  {
    scenario: 'The Space Shuttle required tile-by-tile TPS inspection after every flight. Each of 24,000+ tiles was individually checked, often requiring removal and replacement.',
    question: 'What made this inspection approach so costly compared to modern alternatives?',
    options: [
      { id: 'a', label: 'The tiles were expensive to manufacture' },
      { id: 'b', label: 'The labor-intensive serial inspection of thousands of unique parts created a 6-month critical path', correct: true },
      { id: 'c', label: 'The Shuttle flew too frequently' },
      { id: 'd', label: 'NASA had too few employees' }
    ],
    explanation: 'With 24,000+ unique tiles each requiring individual inspection, the TPS check alone took months. This serial process was the single largest driver of Shuttle turnaround time and cost.'
  },
  {
    scenario: 'A Merlin engine on Falcon 9 is rated for multiple flights. SpaceX tracks cycle counts on turbopumps, thermal cycles on the chamber, and actuator movements.',
    question: 'What determines when a Merlin engine reaches its reuse limit?',
    options: [
      { id: 'a', label: 'A fixed number of flights regardless of conditions' },
      { id: 'b', label: 'The component with the lowest remaining cycle life — the life-limiting part', correct: true },
      { id: 'c', label: 'Visual inspection only' },
      { id: 'd', label: 'It never reaches a limit' }
    ],
    explanation: 'Engine life is determined by the weakest link — typically turbopump bearings or turbine blades. The component closest to its certified life limit dictates when the engine must be overhauled or retired.'
  },
  {
    scenario: 'SpaceX reduced Falcon 9 booster turnaround from 6+ months (early reuse) to under 3 weeks. The key changes were design-for-reuse and streamlined inspection protocols.',
    question: 'What is the primary economic benefit of faster turnaround?',
    options: [
      { id: 'a', label: 'Each booster flies more often, spreading fixed costs over more flights and reducing cost per flight', correct: true },
      { id: 'b', label: 'Faster turnaround means less fuel is used' },
      { id: 'c', label: 'The rockets become lighter' },
      { id: 'd', label: 'Customers pay more for faster service' }
    ],
    explanation: 'A booster that flies 15 times per year vs 2 times per year amortizes its $30M+ build cost over 7.5x more flights, dramatically reducing the capital cost per launch.'
  },
  {
    scenario: 'During post-flight inspection, an engine shows slightly elevated turbopump vibration readings but remains within specification limits.',
    question: 'In a condition-based maintenance approach, what should happen?',
    options: [
      { id: 'a', label: 'Immediately replace the engine regardless of readings' },
      { id: 'b', label: 'Ignore it — the readings are within spec' },
      { id: 'c', label: 'Flag for trend monitoring, increase inspection frequency, and set a threshold for removal', correct: true },
      { id: 'd', label: 'Ground the entire fleet' }
    ],
    explanation: 'Condition-based maintenance tracks trends. An elevated-but-in-spec reading is a leading indicator. Increasing monitoring frequency catches degradation early while avoiding unnecessary removals.'
  },
  {
    scenario: 'Starship uses stainless steel heat shielding tiles that are designed to be quickly replaceable, unlike the Shuttle\'s custom ceramic tiles.',
    question: 'What design philosophy change does this represent?',
    options: [
      { id: 'a', label: 'From inspect-every-tile to replace-damaged-tiles with standardized, interchangeable parts', correct: true },
      { id: 'b', label: 'From ceramic to metal for weight savings' },
      { id: 'c', label: 'Eliminating thermal protection entirely' },
      { id: 'd', label: 'Making tiles more expensive but longer-lasting' }
    ],
    explanation: 'Standardized, interchangeable tiles that can be quickly swapped eliminate the need for individual inspection of each tile. Damaged tiles are replaced rather than repaired — trading material cost for labor savings.'
  },
  {
    scenario: 'A Gantt chart shows that engine inspection (5 days), TPS repair (3 days), and avionics check (2 days) can be done simultaneously, but pressure testing (2 days) must wait until all three are complete.',
    question: 'What is the critical path duration for these tasks?',
    options: [
      { id: 'a', label: '12 days — sum of all tasks' },
      { id: 'b', label: '7 days — the longest parallel task (5) plus the serial task (2)', correct: true },
      { id: 'c', label: '5 days — just the longest task' },
      { id: 'd', label: '2 days — just the pressure test' }
    ],
    explanation: 'The critical path runs through the longest parallel branch (engine inspection, 5 days) then through the serial pressure test (2 days) = 7 days total. Parallel tasks shorten total duration.'
  },
  {
    scenario: 'SpaceX\'s Starship vision targets "aircraft-like" operations: land, inspect, refuel, refly within hours, with engines rated for 1000+ flights.',
    question: 'What is the single biggest technical barrier to achieving this vision?',
    options: [
      { id: 'a', label: 'Fuel costs' },
      { id: 'b', label: 'Demonstrating engine and TPS reliability sufficient to eliminate between-flight teardown inspection', correct: true },
      { id: 'c', label: 'Finding enough customers' },
      { id: 'd', label: 'Building enough launchpads' }
    ],
    explanation: 'Hours-turnaround requires confidence that no teardown inspection is needed between flights. This requires demonstrated reliability data from hundreds of flights showing wearout patterns are well-understood.'
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F680}',
    title: 'Falcon 9 Booster Reuse',
    short: 'The world\'s first operational rapidly-reusable orbital booster',
    tagline: 'From expendable to 23 flights on a single booster',
    description: 'SpaceX\'s Falcon 9 Block 5 booster B1058 holds the record at 23 flights. The booster lands propulsively, is transported back to the hangar, inspected, and prepared for the next flight in approximately two weeks. Each reuse avoids building a new $30M+ booster.',
    connection: 'Turnaround optimization directly maps to this game\'s Gantt chart — parallel inspection tasks, critical path management, and condition-based maintenance reduce the 6-month early turnaround to ~2 weeks.',
    howItWorks: 'Post-landing inspection focuses on engines, grid fins, landing legs, and TPS. Octaweb engine inspection uses borescopes rather than removal. Standardized procedures enable predictable turnaround.',
    stats: [
      { value: '23', label: 'flights record', icon: '\u{1F680}' },
      { value: '~2 week', label: 'turnaround', icon: '\u{23F1}\u{FE0F}' },
      { value: 'B1058', label: 'record holder', icon: '\u{1F3C6}' }
    ],
    examples: ['Starlink missions', 'Crew Dragon ISS flights', 'Commercial satellite launches', 'National security missions'],
    companies: ['SpaceX', 'Cape Canaveral', 'Vandenberg SFB', 'McGregor Test Site'],
    futureImpact: 'Block 5 data feeds directly into Starship reuse design, targeting 1000+ flights per vehicle.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F6F8}',
    title: 'Space Shuttle Turnaround',
    short: 'The cautionary tale of reusability without rapid turnaround',
    tagline: 'Reusable in name, expendable in cost',
    description: 'The Space Shuttle was technically reusable but required a 6-month refurbishment between flights costing approximately $1.5B per mission. The TPS system alone had 24,000+ unique tiles, each requiring individual inspection. The SSME engines were removed and rebuilt between flights.',
    connection: 'The Shuttle demonstrates what happens when inspection dominates the critical path — the turnaround Gantt chart becomes almost entirely serial, with tile inspection as the bottleneck.',
    howItWorks: 'After landing, each of 24,000+ tiles was inspected, damaged tiles removed and replaced, SSMEs removed for overhaul, ET manufactured new, SRBs recovered and refurbished. The entire process took 6+ months.',
    stats: [
      { value: '6 month', label: 'refurb time', icon: '\u{1F4C5}' },
      { value: '$1.5B/flight', label: 'mission cost', icon: '\u{1F4B0}' },
      { value: 'tile-by-tile', label: 'inspection', icon: '\u{1F50D}' }
    ],
    examples: ['Columbia (STS-107)', 'Challenger (STS-51L)', 'Discovery fleet leader', 'Atlantis final flight'],
    companies: ['NASA', 'Rockwell International', 'Thiokol', 'Lockheed Martin'],
    futureImpact: 'Shuttle lessons directly informed SpaceX\'s design-for-reuse philosophy: avoid the inspection trap.',
    color: '#EF4444'
  },
  {
    icon: '\u{2B50}',
    title: 'Starship Vision',
    short: 'Aircraft-like operations for orbital-class rockets',
    tagline: 'Hours between flights, not months',
    description: 'SpaceX\'s Starship aims for aircraft-like turnaround: land, inspect, refuel, and refly within hours. Stainless steel construction enables rapid visual inspection. Standardized hex tiles replace the Shuttle\'s unique tiles. Raptor engines target 1000+ flights each.',
    connection: 'Starship\'s design collapses the Gantt chart by eliminating serial inspection tasks. Standardized tiles, robust engines, and condition monitoring replace teardown inspection.',
    howItWorks: 'Stainless steel body enables simple visual inspection. Hex TPS tiles are interchangeable — damaged ones are swapped, not individually assessed. Raptor engines stay installed with borescope-only checks.',
    stats: [
      { value: 'hours', label: 'target turnaround', icon: '\u{26A1}' },
      { value: 'aircraft-like', label: 'operations', icon: '\u{2708}\u{FE0F}' },
      { value: '1000', label: 'flights/engine', icon: '\u{1F527}' }
    ],
    examples: ['Earth-to-Earth transport', 'Lunar missions', 'Mars colonization', 'Satellite mega-constellations'],
    companies: ['SpaceX', 'Starbase TX', 'Cape Canaveral', 'Raptor engine team'],
    futureImpact: 'If achieved, reduces launch cost below $10/kg to orbit — enabling space industrialization.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1FA82}',
    title: 'Rocket Lab Electron',
    short: 'Small launcher reuse via helicopter mid-air recovery',
    tagline: 'A different approach to booster recovery and reuse',
    description: 'Rocket Lab recovers Electron first stages by parachute, with helicopter mid-air catch attempts. The smaller vehicle enables simpler refurbishment. Rather than propulsive landing, the parachute approach avoids the mass penalty of landing fuel and legs on a small vehicle.',
    connection: 'Electron\'s turnaround is simpler because the vehicle is smaller with fewer components. The Gantt chart has fewer parallel branches, and the critical path is shorter by nature of scale.',
    howItWorks: 'After stage separation, the booster reenters with a heat shield, deploys a drogue then main parachute, and is caught mid-air by helicopter (or recovered from ocean). Refurbishment focuses on the Rutherford engines.',
    stats: [
      { value: 'helicopter', label: 'catch method', icon: '\u{1F681}' },
      { value: 'simpler', label: 'refurb process', icon: '\u{1F527}' },
      { value: 'mid-air', label: 'recovery', icon: '\u{1FA82}' }
    ],
    examples: ['There And Back Again mission', 'Ocean recovery tests', 'Helicopter catch attempts', 'Neutron (next-gen reusable)'],
    companies: ['Rocket Lab', 'Launch Complex 1 NZ', 'Wallops VA', 'Neutron team'],
    futureImpact: 'Neutron will use propulsive landing, applying Electron reuse lessons at medium-lift scale.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// TURNAROUND TASK DATA
// -----------------------------------------------------------------------------
interface TurnaroundTask {
  name: string;
  baseDays: number;
  category: 'recovery' | 'transport' | 'inspection' | 'repair' | 'test' | 'integration';
  parallel: boolean;
  dependsOn: number[];
  criticalPath: boolean;
  color: string;
}

const baseTasks: TurnaroundTask[] = [
  { name: 'Recovery', baseDays: 1, category: 'recovery', parallel: false, dependsOn: [], criticalPath: true, color: '#3B82F6' },
  { name: 'Transport to Hangar', baseDays: 2, category: 'transport', parallel: false, dependsOn: [0], criticalPath: true, color: '#6366F1' },
  { name: 'Engine Inspection', baseDays: 5, category: 'inspection', parallel: true, dependsOn: [1], criticalPath: true, color: '#F59E0B' },
  { name: 'TPS Repair', baseDays: 3, category: 'repair', parallel: true, dependsOn: [1], criticalPath: false, color: '#EF4444' },
  { name: 'Avionics Check', baseDays: 2, category: 'inspection', parallel: true, dependsOn: [1], criticalPath: false, color: '#8B5CF6' },
  { name: 'Pressure Test', baseDays: 2, category: 'test', parallel: false, dependsOn: [2, 3, 4], criticalPath: true, color: '#10B981' },
  { name: 'Gimbal Check', baseDays: 1, category: 'test', parallel: false, dependsOn: [5], criticalPath: true, color: '#06B6D4' },
  { name: 'Static Fire', baseDays: 1, category: 'test', parallel: false, dependsOn: [6], criticalPath: true, color: '#F97316' },
  { name: 'Payload Integration', baseDays: 2, category: 'integration', parallel: false, dependsOn: [7], criticalPath: true, color: '#EC4899' },
  { name: 'Launch', baseDays: 1, category: 'integration', parallel: false, dependsOn: [8], criticalPath: true, color: '#22C55E' },
];

// Vehicle comparison data
interface VehicleData {
  name: string;
  turnaroundDays: number;
  costPerFlight: number;
  flightsPerVehicle: number;
  color: string;
}

const vehicleComparisons: VehicleData[] = [
  { name: 'Shuttle', turnaroundDays: 180, costPerFlight: 1500, flightsPerVehicle: 30, color: '#EF4444' },
  { name: 'Falcon 9', turnaroundDays: 14, costPerFlight: 28, flightsPerVehicle: 20, color: '#3B82F6' },
  { name: 'Starship', turnaroundDays: 1, costPerFlight: 2, flightsPerVehicle: 1000, color: '#F59E0B' },
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_TPSTurnaroundRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [inspectionDepth, setInspectionDepth] = useState(40);
  const [anomalyDetected, setAnomalyDetected] = useState(false);

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

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate turnaround based on inspection depth (0-100)
  const getScaledTasks = useCallback(() => {
    const depthFactor = 0.5 + (inspectionDepth / 100) * 1.5;
    return baseTasks.map(task => ({
      ...task,
      scaledDays: Math.max(0.5, task.baseDays * depthFactor),
    }));
  }, [inspectionDepth]);

  const getTotalTurnaroundDays = useCallback(() => {
    const tasks = getScaledTasks();
    // Critical path: recovery(0) -> transport(1) -> engine inspection(2) -> pressure test(5) -> gimbal(6) -> static fire(7) -> payload(8) -> launch(9)
    const criticalDays = [0, 1, 2, 5, 6, 7, 8, 9].reduce((sum, idx) => sum + tasks[idx].scaledDays, 0);
    const anomalyPenalty = anomalyDetected ? 14 * (0.5 + (inspectionDepth / 100) * 1.5) : 0;
    return criticalDays + anomalyPenalty;
  }, [getScaledTasks, anomalyDetected, inspectionDepth]);

  const getCostPerFlight = useCallback(() => {
    const days = getTotalTurnaroundDays();
    const baseCost = 5;
    const dailyCost = 0.8;
    const inspectionCost = (inspectionDepth / 100) * 20;
    return baseCost + (days * dailyCost) + inspectionCost;
  }, [getTotalTurnaroundDays, inspectionDepth]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'elon-tps-turnaround',
        gameTitle: 'TPS Turnaround',
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
  }, [phase, goToPhase]);

  // Progress bar component
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.hot})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // =========================================================================
  // GANTT CHART SVG VISUALIZATION (complexity >= 15 elements)
  // =========================================================================
  const GanttVisualization = () => {
    const width = isMobile ? 360 : 560;
    const height = 400;
    const tasks = getScaledTasks();
    const totalDays = getTotalTurnaroundDays();
    const maxDay = Math.max(totalDays, 20);
    const barHeight = 22;
    const barGap = 6;
    const leftMargin = isMobile ? 80 : 120;
    const topMargin = 50;
    const chartWidth = width - leftMargin - 20;

    // Calculate task positions (start times)
    const taskStarts: number[] = [];
    tasks.forEach((task, idx) => {
      if (task.dependsOn.length === 0) {
        taskStarts.push(0);
      } else {
        const maxDepEnd = Math.max(...task.dependsOn.map(dep => taskStarts[dep] + tasks[dep].scaledDays));
        taskStarts.push(maxDepEnd);
      }
    });

    // Anomaly insertion point (after engine inspection)
    const anomalyStart = anomalyDetected ? taskStarts[2] + tasks[2].scaledDays : 0;
    const anomalyDuration = anomalyDetected ? 14 * (0.5 + (inspectionDepth / 100) * 1.5) : 0;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          {/* Gradient 1: Recovery blue */}
          <linearGradient id="ganttRecovery" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          {/* Gradient 2: Transport purple */}
          <linearGradient id="ganttTransport" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          {/* Gradient 3: Inspection amber */}
          <linearGradient id="ganttInspection" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          {/* Gradient 4: Repair red */}
          <linearGradient id="ganttRepair" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          {/* Gradient 5: Test green */}
          <linearGradient id="ganttTest" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          {/* Gradient 6: Integration pink */}
          <linearGradient id="ganttIntegration" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
          {/* Gradient 7: Critical path highlight */}
          <linearGradient id="criticalPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* Gradient 8: Anomaly red pulse */}
          <linearGradient id="anomalyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          {/* Filter 1: Glow for critical path */}
          <filter id="criticalGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Filter 2: Anomaly pulse */}
          <filter id="anomalyGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#EF4444" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Filter 3: Drop shadow */}
          <filter id="ganttShadow" x="-5%" y="-5%" width="110%" height="130%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
          </filter>
          {/* Animate for critical path pulse */}
          <animate id="criticalPulse" attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          {/* Pattern for anomaly striping */}
          <pattern id="anomalyStripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#EF4444" strokeWidth="2" opacity="0.4" />
          </pattern>
        </defs>

        {/* Background grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`grid-${i}`} x1={leftMargin + (chartWidth / 5) * i} y1={topMargin - 5} x2={leftMargin + (chartWidth / 5) * i} y2={height - 30} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        ))}

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Turnaround Gantt Chart — {totalDays.toFixed(1)} Days Total
        </text>
        <text x={width / 2} y={35} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Inspection Depth: {inspectionDepth}% | Cost: ${getCostPerFlight().toFixed(1)}M/flight
        </text>

        {/* Task bars */}
        {tasks.map((task, idx) => {
          const y = topMargin + idx * (barHeight + barGap);
          const startX = leftMargin + (taskStarts[idx] / maxDay) * chartWidth;
          const barW = Math.max(8, (task.scaledDays / maxDay) * chartWidth);
          const gradientMap: Record<string, string> = {
            recovery: 'url(#ganttRecovery)',
            transport: 'url(#ganttTransport)',
            inspection: 'url(#ganttInspection)',
            repair: 'url(#ganttRepair)',
            test: 'url(#ganttTest)',
            integration: 'url(#ganttIntegration)',
          };
          return (
            <g key={idx}>
              {/* Task label */}
              <text
                x={leftMargin - 4}
                y={y + barHeight / 2 + 4}
                fill={task.criticalPath ? colors.accent : colors.textMuted}
                fontSize='11'
                textAnchor="end"
                fontWeight={task.criticalPath ? '600' : '400'}
              >
                {task.name}
              </text>
              {/* Critical path indicator */}
              {task.criticalPath && (
                <rect x={startX - 1} y={y - 1} width={barW + 2} height={barHeight + 2} rx="4" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
              )}
              {/* Task bar */}
              <rect
                x={startX}
                y={y}
                width={barW}
                height={barHeight}
                rx="3"
                fill={gradientMap[task.category]}
                filter={task.criticalPath ? 'url(#criticalGlow)' : 'url(#ganttShadow)'}
                opacity={task.criticalPath ? 1 : 0.75}
              />
              {/* Duration label */}
              {barW > 20 && (
                <text x={startX + barW / 2} y={y + barHeight / 2 + 4} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">
                  {task.scaledDays.toFixed(1)}d
                </text>
              )}
            </g>
          );
        })}

        {/* Anomaly overlay */}
        {anomalyDetected && (
          <g>
            <rect
              x={leftMargin + (anomalyStart / maxDay) * chartWidth}
              y={topMargin + 2 * (barHeight + barGap) - 2}
              width={Math.max(12, (anomalyDuration / maxDay) * chartWidth)}
              height={barHeight + 4}
              rx="4"
              fill="url(#anomalyStripes)"
              stroke="#EF4444"
              strokeWidth="1.5"
              filter="url(#anomalyGlow)"
            />
            <text
              x={leftMargin + ((anomalyStart + anomalyDuration / 2) / maxDay) * chartWidth}
              y={topMargin + 2 * (barHeight + barGap) + barHeight + 14}
              fill="#EF4444"
              fontSize="11"
              textAnchor="middle"
              fontWeight="700"
            >
              ENGINE ANOMALY +{anomalyDuration.toFixed(0)}d
            </text>
          </g>
        )}

        {/* Critical path arrow line */}
        <line
          x1={leftMargin}
          y1={height - 25}
          x2={leftMargin + (totalDays / maxDay) * chartWidth}
          y2={height - 25}
          stroke="url(#criticalPathGrad)"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        <circle cx={leftMargin + (totalDays / maxDay) * chartWidth} cy={height - 25} r="4" fill={colors.accent} />

        {/* Day scale */}
        {Array.from({ length: 6 }).map((_, i) => {
          const day = Math.round((maxDay / 5) * i);
          return (
            <text key={`day-${i}`} x={leftMargin + (chartWidth / 5) * i} y={height - 10} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              Day {day}
            </text>
          );
        })}

        {/* Legend */}
        <rect x={leftMargin} y={height - 45} width="8" height="8" rx="2" fill="url(#ganttInspection)" />
        <text x={leftMargin + 12} y={height - 38} fill={colors.textMuted} fontSize="11">Critical</text>
        <rect x={leftMargin + 55} y={height - 45} width="8" height="8" rx="2" fill="url(#ganttRepair)" opacity="0.6" />
        <text x={leftMargin + 67} y={height - 38} fill={colors.textMuted} fontSize="11">Parallel</text>
        {anomalyDetected && (
          <>
            <rect x={leftMargin + 115} y={height - 45} width="8" height="8" rx="2" fill="url(#anomalyStripes)" stroke="#EF4444" strokeWidth="0.5" />
            <text x={leftMargin + 127} y={height - 38} fill="#EF4444" fontSize="11">Anomaly</text>
          </>
        )}
      </svg>
    );
  };

  // =========================================================================
  // COST COMPARISON SVG
  // =========================================================================
  const CostComparisonSVG = () => {
    const width = isMobile ? 340 : 520;
    const height = 280;
    const chartLeft = 70;
    const chartRight = width - 30;
    const chartTop = 50;
    const chartBottom = height - 50;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;
    const maxCost = 1600;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="costShuttleGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="costF9Grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="costStarshipGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="costCurrentGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="barShadow" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.4)" />
          </filter>
        </defs>

        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Cost Per Flight Comparison ($M)
        </text>
        <text x={width / 2} y={35} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Your config: ${getCostPerFlight().toFixed(1)}M vs historical vehicles
        </text>

        {/* Y-axis */}
        {[0, 400, 800, 1200, 1600].map((val, i) => (
          <g key={`y-${i}`}>
            <line x1={chartLeft} y1={chartBottom - (val / maxCost) * chartH} x2={chartRight} y2={chartBottom - (val / maxCost) * chartH} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
            <text x={chartLeft - 5} y={chartBottom - (val / maxCost) * chartH + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">${val}M</text>
          </g>
        ))}

        {/* Bars */}
        {vehicleComparisons.map((v, i) => {
          const barW = chartW / 5;
          const x = chartLeft + (i + 0.3) * (chartW / 4);
          const barH = (v.costPerFlight / maxCost) * chartH;
          const gradients = ['url(#costShuttleGrad)', 'url(#costF9Grad)', 'url(#costStarshipGrad)'];
          return (
            <g key={v.name}>
              <rect x={x} y={chartBottom - barH} width={barW} height={barH} rx="4" fill={gradients[i]} filter="url(#barShadow)" />
              <text x={x + barW / 2} y={chartBottom - barH - 5} fill={v.color} fontSize="11" textAnchor="middle" fontWeight="700">
                ${v.costPerFlight}M
              </text>
              <text x={x + barW / 2} y={chartBottom + 14} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                {v.name}
              </text>
              <text x={x + barW / 2} y={chartBottom + 30} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                {v.turnaroundDays}d turn
              </text>
            </g>
          );
        })}

        {/* Current config bar */}
        {(() => {
          const barW = chartW / 5;
          const x = chartLeft + 3.3 * (chartW / 4);
          const cost = getCostPerFlight();
          const barH = Math.min((cost / maxCost) * chartH, chartH);
          return (
            <g>
              <rect x={x} y={chartBottom - barH} width={barW} height={barH} rx="4" fill="url(#costCurrentGrad)" filter="url(#barShadow)" />
              <text x={x + barW / 2} y={chartBottom - barH - 5} fill="#10B981" fontSize="11" textAnchor="middle" fontWeight="700">
                ${cost.toFixed(1)}M
              </text>
              <text x={x + barW / 2} y={chartBottom + 14} fill="#10B981" fontSize="11" textAnchor="middle" fontWeight="600">
                Your Config
              </text>
              <text x={x + barW / 2} y={chartBottom + 30} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                {getTotalTurnaroundDays().toFixed(0)}d turn
              </text>
            </g>
          );
        })()}
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F504}\u{1F680}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            TPS Turnaround
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;The fundamental breakthrough is not making a rocket that can fly again — it is making one that can fly again <span style={{ color: colors.accent }}>tomorrow</span>. Rapid reuse is the key to cheap spaceflight.&quot;
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              &quot;An airplane that flew once and was thrown away would cost $500 million per flight. The only reason air travel is affordable is that we reuse the same aircraft thousands of times with rapid turnaround.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Elon Musk, on rocket reusability economics
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '500px',
            width: '100%',
          }}>
            {[
              { value: '$1.5B', label: 'Shuttle per flight', color: colors.error },
              { value: '$28M', label: 'Falcon 9 reused', color: colors.cold },
              { value: '$2M', label: 'Starship target', color: colors.accent },
            ].map((stat, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ ...typo.h3, color: stat.color }}>{stat.value}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Fuel costs — propellant is the main expense for each launch' },
      { id: 'b', text: 'Tile-by-tile TPS inspection and 6-month turnaround killed economics', correct: true },
      { id: 'c', text: 'Engine replacement — new SSMEs were needed each flight' },
      { id: 'd', text: 'Payload costs — each payload was uniquely expensive to integrate' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
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
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              The Space Shuttle was &quot;reusable&quot; but cost $1.5B per flight. The main reason was...
            </h2>

            {/* Static SVG showing Shuttle turnaround timeline */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="180" viewBox="0 0 440 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 440 }}>
                <defs>
                  <linearGradient id="shuttleTimeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <linearGradient id="f9TimeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                </defs>
                <text x="220" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Turnaround Time Comparison</text>

                {/* Shuttle bar */}
                <text x="20" y="55" fill="#EF4444" fontSize="11" fontWeight="600">Shuttle</text>
                <rect x="80" y="40" width="340" height="24" rx="4" fill="url(#shuttleTimeGrad)" />
                <text x="250" y="57" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">~180 days (6 months)</text>

                {/* Falcon 9 bar */}
                <text x="20" y="100" fill="#3B82F6" fontSize="11" fontWeight="600">Falcon 9</text>
                <rect x="80" y="85" width="26" height="24" rx="4" fill="url(#f9TimeGrad)" />
                <text x="120" y="102" fill="#60A5FA" fontSize="11" fontWeight="700">~14 days</text>

                {/* Starship target */}
                <text x="20" y="145" fill="#F59E0B" fontSize="11" fontWeight="600">Starship*</text>
                <rect x="80" y="130" width="4" height="24" rx="2" fill="#F59E0B" />
                <text x="100" y="147" fill="#F59E0B" fontSize="11" fontWeight="700">Hours (target)</text>

                <text x="220" y="175" textAnchor="middle" fill={colors.textMuted} fontSize="11">What caused the 180-day Shuttle turnaround?</text>
              </svg>
            </div>

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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Turnaround Timeline Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Turnaround Timeline Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Turnaround time directly determines cost per flight. Every day a rocket sits in a hangar is money spent on labor, facilities, and lost launch revenue. The critical path — the longest chain of serial tasks — sets the minimum turnaround.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Critical Path</strong> is defined as the longest sequence of dependent tasks that determines the minimum project duration. It is calculated by summing the durations along each dependency chain and finding the maximum.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Inspection Depth</strong> ranges from minimal walk-around checks to full teardown with component-level inspection.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.hot }}>Parallel Tasks</strong> are tasks that can happen simultaneously, shortening total turnaround below the sum of all task durations.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Adjust the inspection thoroughness slider to see how inspection depth affects the turnaround Gantt chart, total time, and cost per flight. Watch how parallel tasks compress the timeline compared to serial processing. The cost per flight is calculated as: C = B/N + T × R, where B is build cost, N is number of flights, T is turnaround days, and R is daily overhead rate.
            </p>

            {/* Main Gantt visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', maxHeight: '50vh', overflow: 'hidden' }}>
                <GanttVisualization />
              </div>

              {/* Inspection depth slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Inspection Thoroughness</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {inspectionDepth}% — {inspectionDepth < 25 ? 'Minimal (launch-day)' : inspectionDepth < 50 ? 'Standard check' : inspectionDepth < 75 ? 'Detailed inspection' : 'Full teardown (6-month refurb)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={inspectionDepth}
                  onChange={(e) => setInspectionDepth(parseInt(e.target.value))}
                  onInput={(e) => setInspectionDepth(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Inspection Thoroughness"
                  style={sliderStyle(colors.accent, inspectionDepth, 0, 100)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>Minimal</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Standard</span>
                  <span style={{ ...typo.small, color: colors.error }}>Full Teardown</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{getTotalTurnaroundDays().toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Days Total</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>${getCostPerFlight().toFixed(1)}M</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cost/Flight</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.cold }}>{Math.floor(365 / getTotalTurnaroundDays())}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Flights/Year</div>
                </div>
              </div>

              {/* Cost comparison */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CostComparisonSVG />
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Economics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Economics of Turnaround
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! As you predicted, the Shuttle\'s tile-by-tile inspection and 6-month turnaround was the primary cost driver, not fuel or engines. Your observation from the experiment confirmed this.'
                : 'As you observed in the experiment, turnaround time and inspection overhead — not fuel or hardware — dominated the Shuttle\'s per-flight cost. Your prediction helped frame the result: propellant is less than 1% of launch cost.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Cost = Build Cost / Flights + Turnaround Cost</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The Shuttle&apos;s <span style={{ color: colors.error }}>$1.5B per flight</span> was driven by the labor-intensive turnaround: 24,000+ unique TPS tiles individually inspected, SSMEs removed and rebuilt, and a 6-month critical path. Meanwhile, <span style={{ color: colors.accent }}>fuel cost was only ~$500K</span> — less than 0.04% of total cost.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Shuttle: $2B build / 30 flights + $50M/month {'\u00D7'} 6 months = <strong>~$367M amortized + $300M turnaround</strong>
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
                The Airline Model
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                A Boeing 737 costs ~$100M but flies 3,000+ times over 30 years. The amortized cost is ~$33K per flight. Similarly, a reusable rocket that flies 100+ times amortizes its build cost to near-zero per flight. The key is fast turnaround enabling high flight rate.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Shuttle vs Falcon 9 vs Starship
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {vehicleComparisons.map(v => (
                  <div key={v.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{v.name}</div>
                    <div style={{ ...typo.h3, color: v.color }}>${v.costPerFlight}M</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{v.turnaroundDays}d turnaround</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{v.flightsPerVehicle} flights/vehicle</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Quick patch fix — the engine can be repaired in place with minimal schedule impact' },
      { id: 'b', text: 'Entire vehicle timeline cascades — engine removal, repair, reinstall, and retest delay everything', correct: true },
      { id: 'c', text: 'Skip the inspection next time to avoid finding more anomalies' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
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
                New Variable: Engine Anomaly Detected
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              During post-flight engine inspection, a turbopump shows abnormal vibration signatures. When an engine anomaly is found during inspection...
            </h2>

            {/* Static SVG showing anomaly cascade */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 440 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 440 }}>
                <defs>
                  <linearGradient id="anomalyCascadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <text x="220" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Engine Anomaly Cascade</text>

                {/* Normal flow */}
                <rect x="20" y="40" width="80" height="28" rx="4" fill="#3B82F6" opacity="0.6" />
                <text x="60" y="59" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Inspect</text>

                {/* Anomaly detected */}
                <rect x="110" y="40" width="28" height="28" rx="14" fill="#EF4444" />
                <text x="124" y="58" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">!</text>

                {/* Cascade steps */}
                {['Remove', 'Repair', 'Reinstall', 'Retest'].map((step, i) => (
                  <g key={step}>
                    <rect x={150 + i * 72} y="40" width="65" height="28" rx="4" fill="url(#anomalyCascadeGrad)" opacity={0.6 + i * 0.1} />
                    <text x={182 + i * 72} y="59" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">{step}</text>
                    {i < 3 && <text x={219 + i * 72} y="59" fill={colors.textMuted} fontSize="12">{'\u2192'}</text>}
                  </g>
                ))}

                <text x="220" y="95" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">+ 14+ days added to critical path</text>
                <text x="220" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">All downstream tasks must wait for engine requalification</text>
                <text x="220" y="132" textAnchor="middle" fill={colors.textMuted} fontSize="11">Pressure test, gimbal check, static fire all delayed</text>
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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Cascade
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Anomaly Impact Simulator
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Engine Anomaly Impact Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Toggle the anomaly to see how a single engine problem cascades through the entire turnaround schedule
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              {/* Gantt with anomaly */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', maxHeight: '50vh', overflow: 'hidden' }}>
                <GanttVisualization />
              </div>

              {/* Educational panel */}
              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The Gantt chart shows how an engine anomaly inserts a repair cascade into the turnaround timeline, pushing all downstream tasks and extending the critical path by weeks.</p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Toggling the anomaly on and adjusting inspection depth reveals that deeper inspection catches more problems but each problem found extends the schedule -- the fundamental inspection-turnaround tradeoff.</p>
              </div>

              {/* Anomaly toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                marginBottom: '20px',
              }}>
                <span style={{ ...typo.body, color: colors.textSecondary }}>Engine Anomaly:</span>
                <button
                  onClick={() => {
                    playSound(anomalyDetected ? 'click' : 'failure');
                    setAnomalyDetected(!anomalyDetected);
                  }}
                  style={{
                    background: anomalyDetected ? colors.error : colors.success,
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '16px',
                    minHeight: '44px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {anomalyDetected ? 'ANOMALY ACTIVE' : 'No Anomaly'}
                </button>
              </div>

              {/* Inspection depth slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Inspection Thoroughness</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {inspectionDepth}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={inspectionDepth}
                  onChange={(e) => setInspectionDepth(parseInt(e.target.value))}
                  onInput={(e) => setInspectionDepth(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Inspection Thoroughness"
                  style={sliderStyle(colors.accent, inspectionDepth, 0, 100)}
                />
              </div>

              {/* Impact comparison */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: anomalyDetected ? colors.error : colors.success }}>
                    {getTotalTurnaroundDays().toFixed(1)} days
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Total Turnaround</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: anomalyDetected ? colors.error : colors.success }}>
                    ${getCostPerFlight().toFixed(1)}M
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cost Per Flight</div>
                </div>
              </div>

              {/* Anomaly warning */}
              {anomalyDetected && (
                <div style={{
                  background: `${colors.error}22`,
                  border: `1px solid ${colors.error}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.error, fontWeight: 700, marginBottom: '8px' }}>
                    Cascading Schedule Impact
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    Engine removal (+3d) {'\u2192'} Repair (+5d) {'\u2192'} Reinstall (+3d) {'\u2192'} Retest (+3d) = +14 base days added to critical path. All downstream tasks (pressure test, gimbal check, static fire, payload integration, launch) are pushed back.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Cascade
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Anomaly Cascade: Why Design-for-Reuse Matters
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Cascade Effect</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  A single engine anomaly does not just add the repair time — it cascades. The engine must be <span style={{ color: colors.error }}>removed</span> (requiring disassembly of surrounding structure), <span style={{ color: colors.accent }}>repaired or replaced</span>, <span style={{ color: colors.cold }}>reinstalled</span>, and then <span style={{ color: colors.success }}>re-qualified</span> through the entire test sequence. Every downstream task shifts.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Design-for-Reuse Solutions</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  SpaceX designs Falcon 9 and Starship for rapid engine access. Engines can be swapped without major vehicle disassembly. Modular engine mounts, standardized interfaces, and accessible inspection ports minimize the cascade impact of any single anomaly.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Inspection Paradox</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  More thorough inspection catches more problems — but each problem found extends the schedule. The solution is not less inspection, but better design: make components reliable enough that inspection rarely finds issues, and make them easy to swap when it does. This is why &quot;design for reuse&quot; is fundamentally about design for maintenance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Turnaround Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Key players: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      // Auto-advance to next uncompleted app, or to test if all done
                      const nextUncompleted = newCompleted.findIndex((c) => !c);
                      if (nextUncompleted !== -1) {
                        setSelectedApp(nextUncompleted);
                      } else {
                        setSelectedApp(idx);
                        setTimeout(() => goToPhase('test'), 400);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '80px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand turnaround economics, maintenance strategies, and the critical path to rapid reuse!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: TPS Turnaround
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of turnaround economics, maintenance strategies, and reuse engineering. Each question presents a real-world scenario where turnaround optimization determines success or failure.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
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
                    minHeight: '44px',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
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
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            TPS Turnaround Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why rapid reuse is the key to cheap spaceflight — and why inspection and turnaround, not fuel or hardware, dominate launch economics.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Turnaround time drives cost more than fuel or hardware',
                'Critical path analysis optimizes parallel vs serial tasks',
                'Engine anomalies cascade through the entire schedule',
                'Design-for-reuse minimizes inspection overhead',
                'The airline model: high flight rate amortizes build cost',
                'Condition-based maintenance vs scheduled replacement',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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
                minHeight: '44px',
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_TPSTurnaroundRenderer;
