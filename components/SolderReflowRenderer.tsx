'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Solder Reflow Profile - Complete 10-Phase Game (#280)
// Understanding the temperature vs time curve for PCB solder reflow assembly
// Four zones: preheat, thermal soak, reflow (peak), and cooling
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

interface SolderReflowRendererProps {
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
    scenario: "A PCB assembler notices that several QFN packages on a board have intermittent connections after reflow. X-ray inspection reveals incomplete wetting of solder paste to the pads.",
    question: "Which reflow profile error most likely caused this defect?",
    options: [
      { id: 'a', label: "Peak temperature too high, burning the flux" },
      { id: 'b', label: "Peak temperature too low or time above liquidus too short for complete wetting", correct: true },
      { id: 'c', label: "Cooling rate too slow" },
      { id: 'd', label: "Preheat rate too slow" }
    ],
    explanation: "Cold joints occur when peak temperature is insufficient or the time above liquidus (TAL) is too short. The solder must fully melt and wet to both the pad and the component lead. Insufficient TAL means the solder never fully flows, resulting in incomplete joints that appear dull and have poor mechanical/electrical connection."
  },
  {
    scenario: "After switching to a lead-free solder paste (SAC305), a manufacturer runs the same reflow profile they used for leaded solder (Sn63/Pb37). Many boards come out with cracked BGA solder balls.",
    question: "Why did using the leaded profile with lead-free paste cause failures?",
    options: [
      { id: 'a', label: "SAC305 has a higher liquidus temperature (217-220C vs 183C) and needs a hotter profile", correct: true },
      { id: 'b', label: "Lead-free solder is inherently unreliable" },
      { id: 'c', label: "The cooling rate was too fast for lead-free" },
      { id: 'd', label: "Lead-free solder requires a longer preheat zone" }
    ],
    explanation: "SAC305 (Sn96.5/Ag3.0/Cu0.5) melts at 217-220C, about 37C higher than Sn63/Pb37 at 183C. Using a leaded profile with a peak around 210-220C may barely reach the SAC305 liquidus, resulting in inadequate reflow. Lead-free profiles typically peak at 240-250C with correspondingly adjusted soak and preheat zones."
  },
  {
    scenario: "A board with both small 0201 chip capacitors and a large BGA processor shows tombstoning on the small caps after reflow. The BGA joints look perfect.",
    question: "What reflow profile issue contributes to tombstoning on small components?",
    options: [
      { id: 'a', label: "The soak zone was too long, drying out flux" },
      { id: 'b', label: "Uneven heating during preheat creates thermal gradients that pull small parts off-balance", correct: true },
      { id: 'c', label: "Peak temperature was too high" },
      { id: 'd', label: "Cooling was too rapid" }
    ],
    explanation: "Tombstoning occurs when one end of a small component melts before the other, creating an imbalanced surface tension force that stands the part upright. A preheat rate that is too aggressive creates thermal gradients across the board. Large components like BGAs act as heat sinks, slowing local heating, while small parts heat unevenly. A proper thermal soak zone equalizes temperatures and reduces tombstoning."
  },
  {
    scenario: "An electronics manufacturer is profiling a new reflow oven. The thermocouple data shows the board reaching peak temperature in the right range (245C), but the flux residue looks charred and dark brown instead of clear amber.",
    question: "What is the most likely cause of the charred flux?",
    options: [
      { id: 'a', label: "Wrong flux chemistry in the solder paste" },
      { id: 'b', label: "Time above liquidus (TAL) is too long, over-exposing flux to high temperatures", correct: true },
      { id: 'c', label: "Soak temperature is too low" },
      { id: 'd', label: "Preheat is too fast" }
    ],
    explanation: "Flux is designed to be active for a limited time at elevated temperatures. If TAL exceeds the recommended window (typically 60-90 seconds for SAC305), the flux decomposes and chars. Charred flux indicates excessive thermal exposure during reflow, which also degrades joint quality and can leave hard-to-clean residues that cause reliability issues."
  },
  {
    scenario: "A military contractor is qualifying a board assembly for thermal cycling from -55C to +125C. After 500 cycles, BGA joints on boards with fast cooling rates show more cracks than boards with controlled cooling.",
    question: "Why does rapid cooling during reflow affect long-term thermal cycling reliability?",
    options: [
      { id: 'a', label: "Fast cooling traps voids in the solder joint" },
      { id: 'b', label: "Rapid cooling creates a finer grain structure with higher residual stress and reduced fatigue life", correct: true },
      { id: 'c', label: "Fast cooling prevents proper intermetallic formation" },
      { id: 'd', label: "Cooling rate has no effect on long-term reliability" }
    ],
    explanation: "Cooling rate directly affects the solder microstructure. Rapid cooling (>6C/s) creates fine-grained structures with high residual stress. While initially strong, these joints are more brittle and crack sooner under thermal cycling. Controlled cooling (2-4C/s) allows a more relaxed microstructure with larger grains that better accommodate thermal expansion mismatch over thousands of cycles."
  },
  {
    scenario: "During solder paste inspection (SPI), all deposits look good. After reflow, several 0402 capacitors are displaced from their pads. The reflow profile shows a preheat ramp rate of 4C/second.",
    question: "What caused the component displacement?",
    options: [
      { id: 'a', label: "The fast preheat rate caused volatile solvents in the paste to boil, spattering components", correct: true },
      { id: 'b', label: "The stencil aperture was too large" },
      { id: 'c', label: "Component placement force was too low" },
      { id: 'd', label: "Nitrogen atmosphere was not used" }
    ],
    explanation: "A preheat ramp rate exceeding 2-3C/s causes the volatile solvents in solder paste to boil rapidly rather than evaporate gently. This outgassing creates micro-explosions that can displace small components from their pads. The IPC standard recommends 1-2C/s for the preheat ramp to allow gradual solvent evaporation and prevent solder splattering."
  },
  {
    scenario: "A board with a large ground plane and many via-in-pad designs shows inconsistent reflow results. Components near the board edge reflow properly, but those in the center over the ground plane show cold joints.",
    question: "What thermal management issue is causing the center-of-board cold joints?",
    options: [
      { id: 'a', label: "The ground plane acts as a heat sink, creating a cold spot that prevents the center from reaching proper peak temperature", correct: true },
      { id: 'b', label: "The oven heating elements are only on the edges" },
      { id: 'c', label: "Via-in-pad designs are incompatible with reflow soldering" },
      { id: 'd', label: "The board is too thick for standard reflow" }
    ],
    explanation: "Large copper ground planes have high thermal mass and conductivity, acting as heat sinks that absorb energy from surrounding areas. The thermal soak zone is specifically designed to equalize temperature across the board, but if the ground plane is massive enough, the center may still lag. Solutions include extending the soak time, increasing peak temperature, or using bottom-side preheat."
  },
  {
    scenario: "A contract manufacturer switches from a 5-zone to a 10-zone reflow oven. Their first-pass yield immediately improves from 97% to 99.5% on complex mixed-technology boards.",
    question: "Why does having more heating zones improve reflow quality?",
    options: [
      { id: 'a', label: "More zones allow longer total time in the oven" },
      { id: 'b', label: "More zones provide finer control over the temperature profile, enabling tighter process windows", correct: true },
      { id: 'c', label: "More zones generate more total heat energy" },
      { id: 'd', label: "More zones reduce the need for flux in the solder paste" }
    ],
    explanation: "Each zone in a reflow oven is independently controlled. More zones allow engineers to shape the temperature profile more precisely: gentler ramps, flatter soaks, controlled peak regions, and managed cooling. Complex boards with components of varying thermal mass require tight profile control. A 10-zone oven can create the ideal preheat, soak, reflow, and cooling stages with minimal compromise."
  },
  {
    scenario: "An engineer measures the actual board temperature during reflow and finds a 15C difference between a tiny 0201 resistor and a large connector on the same board. Both need to be properly soldered.",
    question: "Which reflow profile adjustment best addresses this thermal delta?",
    options: [
      { id: 'a', label: "Increase the peak temperature to ensure the connector reaches liquidus" },
      { id: 'b', label: "Extend the thermal soak zone duration to allow thermal equalization before reflow", correct: true },
      { id: 'c', label: "Speed up the conveyor to reduce overall time in the oven" },
      { id: 'd', label: "Remove the connector and hand-solder it separately" }
    ],
    explanation: "The thermal soak zone (150-200C for SAC305) exists precisely to equalize temperature across components of different thermal mass. During soak, the small resistor reaches temperature quickly and waits while the large connector catches up. Extending the soak from 60 to 120 seconds can reduce the delta from 15C to under 5C, ensuring both components experience proper reflow conditions."
  },
  {
    scenario: "A company is transitioning from nitrogen-atmosphere reflow to air reflow to reduce costs. They notice that their SAC305 solder joints now appear duller and rougher, though they pass electrical testing.",
    question: "What effect does the air atmosphere have on the reflow process, and is it a concern?",
    options: [
      { id: 'a', label: "Air causes oxidation of the solder surface during reflow, affecting appearance but not necessarily reliability", correct: true },
      { id: 'b', label: "Air atmosphere makes the solder paste completely unable to wet to pads" },
      { id: 'c', label: "Nitrogen is only used for cosmetic reasons and has no functional benefit" },
      { id: 'd', label: "Air reflow requires a completely different temperature profile" }
    ],
    explanation: "Nitrogen prevents oxidation during reflow, producing shinier joints. In air, surface oxides form on the molten solder, giving a duller matte finish. For SAC305, this surface oxidation is mostly cosmetic if the flux is properly activated - the flux removes pad and component lead oxides for proper wetting. However, nitrogen can improve wetting on difficult-to-solder finishes and reduce voiding in BGAs."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications for TransferPhaseView
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔧',
    title: 'BGA Rework & Reballing',
    short: 'Reflow repair',
    tagline: 'Precision reflow for individual component replacement',
    description: 'When a BGA chip fails on an assembled board, technicians must remove the defective IC and replace it with a new one. This requires locally reflowing the solder joints using specialized rework stations that apply a controlled temperature profile to just the target component while protecting surrounding parts from overheating.',
    connection: 'The reflow profile principles you learned apply directly to rework, but with added complexity. The rework station must achieve proper peak temperature and TAL on the target BGA while keeping nearby components below their reflow temperatures. This requires precise profiling with multiple thermocouples.',
    howItWorks: 'BGA rework stations use focused infrared or hot-air heating from above and below the board. A component-specific nozzle directs heat to the target area. The operator programs a multi-zone profile similar to oven reflow but with careful preheating of the entire board to reduce thermal gradients and warping.',
    stats: [
      { value: '30-50C', label: 'Below peak nearby', icon: '🌡️' },
      { value: '$50-500', label: 'Per rework', icon: '💰' },
      { value: '85-95%', label: 'Success rate', icon: '📊' }
    ],
    examples: ['GPU replacement on gaming laptops', 'Server CPU socket rework', 'iPhone baseband IC replacement', 'Automotive ECU BGA rework'],
    companies: ['Ersa', 'Finetech', 'Pace', 'Weller', 'JBC'],
    futureImpact: 'As package-on-package (PoP) and 3D stacking become common, rework requires even more precise thermal control to avoid damaging stacked dies. AI-assisted profiling and machine vision alignment are emerging to improve first-pass rework success rates.',
    color: '#3B82F6'
  },
  {
    icon: '🏭',
    title: 'High-Volume SMT Production',
    short: 'Factory reflow',
    tagline: 'Millions of boards per day through precisely controlled ovens',
    description: 'Modern SMT production lines process thousands of boards per hour through reflow ovens with 10-14 independently controlled heating zones. Each zone is tuned to achieve the ideal temperature profile for the specific board design, solder paste, and component mix. Process engineers continuously monitor thermal profiles to maintain quality.',
    connection: 'The four reflow zones you explored (preheat, soak, reflow, cooling) correspond directly to physical zones in production ovens. Zone temperatures, conveyor speed, and airflow rates are all adjusted to achieve the target profile measured at the actual board surface with embedded thermocouples.',
    howItWorks: 'Boards enter the oven on a mesh belt conveyor. Forced convection fans circulate heated nitrogen or air across the board surfaces. IR pyrometers and board-mounted thermocouples verify the profile in real-time. Statistical process control (SPC) monitors critical parameters like peak temperature, TAL, and ramp rates to detect drift before defects occur.',
    stats: [
      { value: '10-14', label: 'Heating zones', icon: '🔥' },
      { value: '99.9%+', label: 'Target yield', icon: '🎯' },
      { value: '0.5-2m/min', label: 'Belt speed', icon: '⏱️' }
    ],
    examples: ['Smartphone motherboard assembly', 'Automotive ECU production', 'Medical device PCB lines', 'Server and networking boards'],
    companies: ['Heller', 'Rehm', 'BTU', 'Vitronics', 'Ersa'],
    futureImpact: 'Industry 4.0 integration enables real-time profile adjustment based on incoming board characteristics. Machine learning models predict optimal profiles for new board designs, reducing the number of test runs needed. Closed-loop feedback from inline inspection adjusts oven parameters automatically.',
    color: '#10B981'
  },
  {
    icon: '🛰️',
    title: 'Aerospace & Defense Assembly',
    short: 'Hi-rel reflow',
    tagline: 'Zero-defect soldering for mission-critical electronics',
    description: 'Aerospace and defense electronics require the highest reliability solder joints that must withstand extreme thermal cycling, vibration, and decades of operation. Class 3 IPC standards demand precise reflow profiles with tight process windows and extensive documentation. Every board may be individually profiled and inspected.',
    connection: 'The concepts of liquidus temperature, time above liquidus, and cooling rate become critical quality parameters in aerospace. Exceeding the process window in any direction can cause latent defects that manifest years later in orbit or during a mission - where repair is impossible.',
    howItWorks: 'Each board design undergoes extensive thermal profiling with multiple thermocouples at critical locations. Profile data is archived with each production lot for traceability. Post-reflow inspection includes X-ray of every BGA and cross-sectional analysis of sample joints to verify proper intermetallic thickness, voiding levels, and microstructure.',
    stats: [
      { value: 'Class 3', label: 'IPC standard', icon: '📋' },
      { value: '<5%', label: 'Max voiding', icon: '🔍' },
      { value: '25+ yrs', label: 'Service life', icon: '⏳' }
    ],
    examples: ['Satellite communication boards', 'Missile guidance electronics', 'Aircraft avionics modules', 'Space telescope control systems'],
    companies: ['L3Harris', 'Raytheon', 'Northrop Grumman', 'BAE Systems', 'Lockheed Martin'],
    futureImpact: 'New space initiatives with commercial-grade components require adapted reflow processes that balance cost with reliability. Advanced inspection techniques like computed tomography (CT) scanning enable full 3D analysis of every solder joint without destruction.',
    color: '#F59E0B'
  },
  {
    icon: '🔬',
    title: 'Profile Optimization & Thermal Analysis',
    short: 'Process engineering',
    tagline: 'The science of finding the perfect temperature curve',
    description: 'Process engineers use sophisticated thermal profiling systems to measure, analyze, and optimize reflow profiles. Multiple thermocouples attached to test boards capture real-time temperature data at different locations. Software then calculates process windows, identifies thermal gradients, and recommends oven settings to achieve the ideal profile.',
    connection: 'Profile optimization directly applies everything you learned: balancing preheat rate to prevent thermal shock while activating flux, setting soak duration to equalize temperatures, controlling peak temperature and TAL for proper wetting, and managing cooling rate for optimal joint microstructure.',
    howItWorks: 'A profile board with 6-12 thermocouples at strategic locations (hottest spot, coldest spot, BGA center, small components, board edge) runs through the oven. The profiler records data and overlays it on the solder paste manufacturer\'s recommended window. Engineers adjust zone temperatures and conveyor speed iteratively until all thermocouples fall within the process window simultaneously.',
    stats: [
      { value: '6-12', label: 'Thermocouples', icon: '🌡️' },
      { value: '+/- 5C', label: 'Target accuracy', icon: '🎯' },
      { value: '2-5', label: 'Iterations', icon: '🔄' }
    ],
    examples: ['New product introduction (NPI) profiling', 'Paste qualification testing', 'Oven preventive maintenance verification', 'Process transfer between factories'],
    companies: ['KIC', 'ECD', 'Solderstar', 'Datapaq', 'Wickon'],
    futureImpact: 'Digital twin technology will enable virtual profiling before any physical board is run, reducing NPI time. Real-time profile prediction from oven sensor data will eliminate the need for embedded thermocouples in production. AI optimization will find optimal profiles in a single run.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// Solder reflow profile specifications
// -----------------------------------------------------------------------------
const LEADED_SPEC = {
  name: 'Sn63/Pb37 (Leaded)',
  liquidus: 183,
  preheatRateMin: 1.0, preheatRateMax: 3.0,
  soakTempMin: 150, soakTempMax: 200,
  soakDurationMin: 60, soakDurationMax: 120,
  peakTempMin: 210, peakTempMax: 230,
  talMin: 45, talMax: 75,
  coolingRateMin: -6, coolingRateMax: -2,
};

const LEADFREE_SPEC = {
  name: 'SAC305 (Lead-Free)',
  liquidus: 217,
  preheatRateMin: 1.0, preheatRateMax: 3.0,
  soakTempMin: 150, soakTempMax: 200,
  soakDurationMin: 60, soakDurationMax: 120,
  peakTempMin: 235, peakTempMax: 250,
  talMin: 60, talMax: 90,
  coolingRateMin: -6, coolingRateMax: -3,
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const SolderReflowRenderer: React.FC<SolderReflowRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Profile parameters (leaded defaults)
  const [preheatRate, setPreheatRate] = useState(2.0); // C/s
  const [soakTemp, setSoakTemp] = useState(170); // C
  const [soakDuration, setSoakDuration] = useState(90); // seconds
  const [peakTemp, setPeakTemp] = useState(225); // C
  const [timeAboveLiquidus, setTimeAboveLiquidus] = useState(60); // seconds
  const [coolingRate, setCoolingRate] = useState(-3); // C/s (negative)

  // Twist state: lead-free vs leaded
  const [solderType, setSolderType] = useState<'leaded' | 'leadfree'>('leaded');

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);

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

  // Get active spec
  const spec = solderType === 'leaded' ? LEADED_SPEC : LEADFREE_SPEC;

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange theme for reflow / heat
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#2a2a3a',
    hot: '#EF4444',
    warm: '#F59E0B',
    cool: '#3B82F6',
    solder: '#C0C0C0',
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
    twist_play: 'Twist Explore',
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
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'solder_reflow_profile',
        gameTitle: 'Solder Reflow Profile',
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

  // Evaluate profile quality against spec
  const evaluateProfile = useCallback(() => {
    const checks = [
      { name: 'Preheat Rate', value: preheatRate, min: spec.preheatRateMin, max: spec.preheatRateMax, unit: 'C/s' },
      { name: 'Soak Temp', value: soakTemp, min: spec.soakTempMin, max: spec.soakTempMax, unit: 'C' },
      { name: 'Soak Duration', value: soakDuration, min: spec.soakDurationMin, max: spec.soakDurationMax, unit: 's' },
      { name: 'Peak Temp', value: peakTemp, min: spec.peakTempMin, max: spec.peakTempMax, unit: 'C' },
      { name: 'Time Above Liquidus', value: timeAboveLiquidus, min: spec.talMin, max: spec.talMax, unit: 's' },
      { name: 'Cooling Rate', value: Math.abs(coolingRate), min: Math.abs(spec.coolingRateMax), max: Math.abs(spec.coolingRateMin), unit: 'C/s' },
    ];
    const results = checks.map(c => ({
      ...c,
      inSpec: c.value >= c.min && c.value <= c.max,
      status: c.value < c.min ? 'low' : c.value > c.max ? 'high' : 'ok',
    }));
    const passCount = results.filter(r => r.inSpec).length;
    return { results, passCount, total: results.length, allPass: passCount === results.length };
  }, [preheatRate, soakTemp, soakDuration, peakTemp, timeAboveLiquidus, coolingRate, spec]);

  const profileEval = evaluateProfile();

  // Determine solder paste state based on profile position
  const getSolderState = useCallback(() => {
    if (peakTemp >= spec.liquidus + 5 && timeAboveLiquidus >= spec.talMin) return { state: 'Liquid (Reflowed)', color: colors.hot, icon: '🔴' };
    if (soakTemp >= spec.soakTempMin && peakTemp >= spec.liquidus) return { state: 'Active (Flux)', color: colors.warm, icon: '🟡' };
    if (preheatRate > 0 && soakTemp > 100) return { state: 'Warming (Paste)', color: colors.cool, icon: '🟢' };
    return { state: 'Solid (Cooled)', color: colors.solder, icon: '⚪' };
  }, [peakTemp, soakTemp, preheatRate, timeAboveLiquidus, spec, colors]);

  const solderState = getSolderState();

  // Generate profile curve points for SVG
  const generateProfilePoints = useCallback((w: number, h: number, margin: number) => {
    const activeSpec = solderType === 'leaded' ? LEADED_SPEC : LEADFREE_SPEC;
    const maxTemp = 280;
    const totalTime = 360; // seconds, approximate full profile
    const scaleX = (t: number) => margin + (t / totalTime) * (w - 2 * margin);
    const scaleY = (temp: number) => h - margin - (temp / maxTemp) * (h - 2 * margin);

    // Time points
    const t0 = 0;
    const t1 = (soakTemp - 25) / preheatRate; // end of preheat
    const t2 = t1 + soakDuration; // end of soak
    const t3 = t2 + (peakTemp - soakTemp) / 2.5; // rise to peak
    const t4 = t3 + timeAboveLiquidus * 0.3; // peak hold
    const t5 = t4 + (peakTemp - activeSpec.liquidus) / Math.abs(coolingRate); // drop below liquidus
    const t6 = t5 + (activeSpec.liquidus - 50) / Math.abs(coolingRate); // continue cooling

    const points = [
      { x: scaleX(t0), y: scaleY(25) },
      { x: scaleX(t1), y: scaleY(soakTemp) },
      { x: scaleX(t1 + soakDuration * 0.3), y: scaleY(soakTemp + 5) },
      { x: scaleX(t2), y: scaleY(soakTemp + 10) },
      { x: scaleX(t3 * 0.95), y: scaleY(peakTemp - 10) },
      { x: scaleX(t3), y: scaleY(peakTemp) },
      { x: scaleX(t4), y: scaleY(peakTemp - 3) },
      { x: scaleX(t5), y: scaleY(activeSpec.liquidus) },
      { x: scaleX(t6), y: scaleY(50) },
    ];

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Zone boundaries
    const zones = [
      { label: 'Preheat', x1: scaleX(t0), x2: scaleX(t1), color: '#3B82F6' },
      { label: 'Soak', x1: scaleX(t1), x2: scaleX(t2), color: '#F59E0B' },
      { label: 'Reflow', x1: scaleX(t2), x2: scaleX(t5), color: '#EF4444' },
      { label: 'Cooling', x1: scaleX(t5), x2: scaleX(t6), color: '#06B6D4' },
    ];

    return { points, pathD, zones, scaleX, scaleY, t1, t2, t3, t4, t5, t6, maxTemp, totalTime, margin, activeSpec };
  }, [preheatRate, soakTemp, soakDuration, peakTemp, timeAboveLiquidus, coolingRate, solderType]);

  // Render the reflow profile SVG
  const renderReflowProfileSVG = useCallback(() => {
    const w = isMobile ? 340 : 460;
    const h = isMobile ? 260 : 300;
    const margin = 45;
    const { pathD, zones, scaleY, activeSpec } = generateProfilePoints(w, h, margin);

    // Liquidus line
    const liquidusY = scaleY(activeSpec.liquidus);

    // Acceptable peak zone shading
    const peakMinY = scaleY(activeSpec.peakTempMax);
    const peakMaxY = scaleY(activeSpec.peakTempMin);

    // Animate a dot along the profile curve
    const cycleLen = 200;
    const progress = (animationFrame % cycleLen) / cycleLen;

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Solder reflow temperature profile">
        <defs>
          <linearGradient id="profileGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="30%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="dangerZone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="safeZone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Background grid */}
        <pattern id="reflow-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke={colors.border} strokeWidth="0.5" />
        </pattern>
        <rect x={margin} y={margin - 20} width={w - 2 * margin} height={h - 2 * margin + 20} fill="url(#reflow-grid)" opacity="0.3" />

        {/* Danger zone above max peak */}
        <rect x={margin} y={margin - 20} width={w - 2 * margin} height={peakMinY - margin + 20} fill="url(#dangerZone)" />

        {/* Safe peak zone */}
        <rect x={zones[2].x1} y={peakMinY} width={zones[2].x2 - zones[2].x1} height={peakMaxY - peakMinY} fill="url(#safeZone)" rx={4} />

        {/* Zone shading */}
        {zones.map((z, i) => (
          <g key={i}>
            <rect x={z.x1} y={h - margin + 5} width={z.x2 - z.x1} height={16} rx={3} fill={z.color} opacity={0.6} />
            <text x={(z.x1 + z.x2) / 2} y={h - margin + 16} textAnchor="middle" fill="white" fontSize="9" fontWeight="600">{z.label}</text>
          </g>
        ))}

        {/* Liquidus line */}
        <line x1={margin} y1={liquidusY} x2={w - margin} y2={liquidusY} stroke={colors.hot} strokeWidth="1.5" strokeDasharray="6,4" />
        <text x={w - margin + 4} y={liquidusY + 4} fill={colors.hot} fontSize="10" fontWeight="600">{activeSpec.liquidus}C</text>

        {/* Y-axis temperature labels */}
        {[0, 50, 100, 150, 200, 250].map(temp => (
          <g key={temp}>
            <line x1={margin - 4} y1={scaleY(temp)} x2={margin} y2={scaleY(temp)} stroke={colors.textMuted} strokeWidth="1" />
            <text x={margin - 8} y={scaleY(temp) + 4} textAnchor="end" fill={colors.textMuted} fontSize="9">{temp}</text>
          </g>
        ))}

        {/* Y-axis label */}
        <text x={12} y={h / 2} textAnchor="middle" fill={colors.textMuted} fontSize="10" transform={`rotate(-90, 12, ${h / 2})`}>Temp (C)</text>

        {/* X-axis label */}
        <text x={w / 2} y={h - 5} textAnchor="middle" fill={colors.textMuted} fontSize="10">Time (s)</text>

        {/* Profile curve */}
        <path d={pathD} fill="none" stroke="url(#profileGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Animated dot traveling along curve */}
        {(() => {
          const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathEl.setAttribute('d', pathD);
          // fallback: just use progress to interpolate x
          const dotX = margin + progress * (w - 2 * margin);
          const dotY = scaleY(25 + progress * (peakTemp - 25) * (progress < 0.5 ? progress * 2 : 2 - progress * 2));
          return (
            <circle cx={dotX} cy={dotY} r={5} fill={colors.accent} opacity={0.8}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })()}

        {/* Peak temp marker */}
        <line x1={zones[2].x1} y1={scaleY(peakTemp)} x2={zones[2].x2} y2={scaleY(peakTemp)} stroke={peakTemp > activeSpec.peakTempMax ? colors.error : peakTemp < activeSpec.peakTempMin ? colors.cool : colors.success} strokeWidth="2" strokeDasharray="3,3" />
        <text x={zones[2].x1 - 4} y={scaleY(peakTemp) - 6} textAnchor="end" fill={peakTemp > activeSpec.peakTempMax ? colors.error : colors.success} fontSize="11" fontWeight="700">{peakTemp}C</text>

        {/* Soak temp marker */}
        <line x1={zones[1].x1} y1={scaleY(soakTemp)} x2={zones[1].x2} y2={scaleY(soakTemp)} stroke={colors.warm} strokeWidth="1" strokeDasharray="3,3" />
      </svg>
    );
  }, [isMobile, generateProfilePoints, animationFrame, colors, peakTemp, soakTemp]);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '2px',
      padding: '0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            minWidth: '16px',
            minHeight: '44px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            display: 'block',
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestPhase = phase === 'test';
    const nextDisabled = currentIndex >= phaseOrder.length - 1 || isTestPhase;
    return (
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1001,
      }}>
        <button
          onClick={() => { if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]); }}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: currentIndex > 0 ? colors.textSecondary : colors.border,
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: currentIndex > 0 ? 'pointer' : 'default',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Back
        </button>
        {renderNavDots()}
        <button
          disabled={nextDisabled}
          onClick={() => { if (!nextDisabled) nextPhase(); }}
          style={{
            background: !nextDisabled ? colors.accent : colors.border,
            border: 'none',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: !nextDisabled ? 'pointer' : 'not-allowed',
            opacity: nextDisabled ? 0.4 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #EA580C)`,
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

  // Fixed navigation bar at top
  const renderNavigationBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1001,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🔥</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
          Solder Reflow Profile
        </span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{
          flex: '1',
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔥💀
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Solder Reflow Profile
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Half the solder joints on your board are cracked - <span style={{ color: colors.accent }}>what went wrong?</span> The answer lies in a temperature curve that must be followed with surgical precision. Too hot and you destroy components. Too cold and joints never form properly."
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
            "Every solder joint on a PCB passes through four critical temperature zones in about 5 minutes. Get the profile right and you have reliable connections for decades. Get it wrong, and you have a pile of scrap."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            -- PCB Assembly Engineering
          </p>
        </div>

        <button
          onClick={() => {
            playSound('click');
            if (onGameEvent) {
              onGameEvent({
                eventType: 'game_started',
                gameType: 'solder_reflow_profile',
                gameTitle: 'Solder Reflow Profile',
                details: {},
                timestamp: Date.now()
              });
            }
            nextPhase();
          }}
          style={{ ...primaryButtonStyle, minHeight: '44px' }}
        >
          Investigate the Failure
        </button>

        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The preheat was too fast, causing thermal shock that cracked ceramic capacitors' },
      { id: 'b', text: 'The peak temperature was too low, so solder never fully melted (cold joints)', correct: true },
      { id: 'c', text: 'The cooling was too slow, allowing tin whiskers to grow immediately' },
      { id: 'd', text: 'The soak zone was skipped, but that only affects aesthetics, not reliability' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A PCB has cracked solder joints after reflow. Which zone error is the most likely cause?
          </h2>

          {/* Static SVG showing a bad profile */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 300 : 400} height={120} viewBox={`0 0 ${isMobile ? 300 : 400} 120`} preserveAspectRatio="xMidYMid meet">
              <rect x={0} y={0} width={isMobile ? 300 : 400} height={120} fill="#1a1a24" rx={8} />
              {/* Simplified bad profile */}
              <path d={`M 30 100 L 80 60 L 130 55 L 160 55 L 200 35 L 220 30 L 260 35 L 300 80 L ${isMobile ? 280 : 370} 95`} fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray="6,3" />
              {/* Correct profile ghost */}
              <path d={`M 30 100 L 80 60 L 130 55 L 160 55 L 210 20 L 230 18 L 260 22 L 300 70 L ${isMobile ? 280 : 370} 95`} fill="none" stroke="#10B981" strokeWidth="2" opacity={0.4} />
              {/* Labels */}
              <text x={60} y={16} fill="#EF4444" fontSize="10" fontWeight="600">Bad Profile</text>
              <text x={200} y={16} fill="#10B981" fontSize="10" opacity={0.5}>Ideal Profile</text>
              <text x={220} y={45} fill="#F59E0B" fontSize="11" fontWeight="700">?</text>
              {/* Crack indicator */}
              <text x={(isMobile ? 240 : 320)} y={90} fill="#EF4444" fontSize="24">💀</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'prediction_made',
                      gameType: 'solder_reflow_profile',
                      gameTitle: 'Solder Reflow Profile',
                      details: { prediction: opt.id, correct: !!opt.correct },
                      timestamp: Date.now()
                    });
                  }
                }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
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
              Test Your Prediction
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '900px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Design the Reflow Profile
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust parameters to keep all values within spec ({spec.name})
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            {/* Left: SVG Profile */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
              }}>
                {renderReflowProfileSVG()}

                {/* Solder paste state indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: '12px',
                  padding: '10px',
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '20px' }}>{solderState.icon}</span>
                  <span style={{ ...typo.small, color: solderState.color, fontWeight: 600 }}>
                    Solder: {solderState.state}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
              }}>
                {/* Preheat rate */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Preheat Rate</span>
                    <span style={{
                      ...typo.small,
                      fontWeight: 600,
                      color: preheatRate >= spec.preheatRateMin && preheatRate <= spec.preheatRateMax ? colors.success : colors.error,
                    }}>{preheatRate.toFixed(1)} C/s</span>
                  </div>
                  <input type="range" min="0.5" max="5.0" step="0.1" value={preheatRate}
                    onChange={(e) => setPreheatRate(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>0.5</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Spec: {spec.preheatRateMin}-{spec.preheatRateMax}</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>5.0</span>
                  </div>
                </div>

                {/* Soak Temperature */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Soak Temp</span>
                    <span style={{
                      ...typo.small, fontWeight: 600,
                      color: soakTemp >= spec.soakTempMin && soakTemp <= spec.soakTempMax ? colors.success : colors.error,
                    }}>{soakTemp}C</span>
                  </div>
                  <input type="range" min="100" max="220" value={soakTemp}
                    onChange={(e) => setSoakTemp(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>100</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Spec: {spec.soakTempMin}-{spec.soakTempMax}</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>220</span>
                  </div>
                </div>

                {/* Soak Duration */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Soak Duration</span>
                    <span style={{
                      ...typo.small, fontWeight: 600,
                      color: soakDuration >= spec.soakDurationMin && soakDuration <= spec.soakDurationMax ? colors.success : colors.error,
                    }}>{soakDuration}s</span>
                  </div>
                  <input type="range" min="30" max="180" value={soakDuration}
                    onChange={(e) => setSoakDuration(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>30</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Spec: {spec.soakDurationMin}-{spec.soakDurationMax}</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>180</span>
                  </div>
                </div>

                {/* Peak Temperature */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Peak Temp</span>
                    <span style={{
                      ...typo.small, fontWeight: 600,
                      color: peakTemp >= spec.peakTempMin && peakTemp <= spec.peakTempMax ? colors.success : colors.error,
                    }}>{peakTemp}C</span>
                  </div>
                  <input type="range" min="180" max="270" value={peakTemp}
                    onChange={(e) => setPeakTemp(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>180</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Spec: {spec.peakTempMin}-{spec.peakTempMax}</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>270</span>
                  </div>
                </div>

                {/* Time Above Liquidus */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Time Above Liquidus</span>
                    <span style={{
                      ...typo.small, fontWeight: 600,
                      color: timeAboveLiquidus >= spec.talMin && timeAboveLiquidus <= spec.talMax ? colors.success : colors.error,
                    }}>{timeAboveLiquidus}s</span>
                  </div>
                  <input type="range" min="20" max="150" value={timeAboveLiquidus}
                    onChange={(e) => setTimeAboveLiquidus(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>20</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Spec: {spec.talMin}-{spec.talMax}</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>150</span>
                  </div>
                </div>

                {/* Cooling Rate */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Cooling Rate</span>
                    <span style={{
                      ...typo.small, fontWeight: 600,
                      color: Math.abs(coolingRate) >= Math.abs(spec.coolingRateMax) && Math.abs(coolingRate) <= Math.abs(spec.coolingRateMin) ? colors.success : colors.error,
                    }}>{coolingRate} C/s</span>
                  </div>
                  <input type="range" min="-10" max="-1" step="0.5" value={coolingRate}
                    onChange={(e) => setCoolingRate(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: colors.accent, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>-10</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Spec: {spec.coolingRateMin} to {spec.coolingRateMax}</span>
                    <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>-1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scorecard */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
            gap: '8px',
            marginBottom: '24px',
          }}>
            {profileEval.results.map((r, i) => (
              <div key={i} style={{
                background: r.inSpec ? `${colors.success}22` : `${colors.error}22`,
                border: `1px solid ${r.inSpec ? colors.success : colors.error}`,
                borderRadius: '8px',
                padding: '10px 6px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: r.inSpec ? colors.success : colors.error, fontWeight: 700, fontSize: '11px' }}>
                  {r.inSpec ? 'OK' : r.status === 'low' ? 'LOW' : 'HIGH'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px', marginTop: '2px' }}>{r.name}</div>
              </div>
            ))}
          </div>

          {/* Status message */}
          <div style={{
            background: profileEval.allPass ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${profileEval.allPass ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: profileEval.allPass ? colors.success : colors.warning, margin: 0 }}>
              {profileEval.allPass
                ? 'All parameters within spec! Your reflow profile produces reliable solder joints.'
                : `${profileEval.passCount}/${profileEval.total} parameters in spec. Adjust the highlighted parameters to achieve a good profile.`
              }
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Science
          </button>
        </div>
        </div>
        {renderBottomNav()}
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
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Four Zones of Reflow
          </h2>

          {/* Reference to prediction */}
          <div style={{
            background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
              {prediction === 'b'
                ? "Correct! Insufficient peak temperature is the primary cause of cold solder joints - the solder never fully melts and wets to the pads."
                : prediction
                  ? "Your prediction touches on a real issue, but the most common cause of cracked joints is insufficient reflow - the peak temperature was too low or time above liquidus too short for proper wetting."
                  : "The most common cause of cracked joints is an improper reflow zone - peak temperature too low or insufficient time above liquidus for the solder to fully melt and wet."
              }
            </p>
          </div>

          {/* Zone explanations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid #3B82F6`,
            }}>
              <h3 style={{ ...typo.h3, color: '#3B82F6', margin: '0 0 12px 0' }}>Zone 1: Preheat (Ramp)</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Rate: 1-3C/s.</strong> Gradually heats the board from room temperature to the soak zone. Too fast causes thermal shock - ceramic capacitors crack, paste solvents boil and splatter components. Too slow wastes time and may not activate flux properly.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid #F59E0B`,
            }}>
              <h3 style={{ ...typo.h3, color: '#F59E0B', margin: '0 0 12px 0' }}>Zone 2: Thermal Soak (Equalize)</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>150-200C for 60-120s.</strong> The critical equalization zone. Large components (BGAs, connectors) absorb heat slower than small parts (0201 caps). The soak lets everything reach the same temperature before reflow, preventing tombstoning and cold joints. Flux activates here, removing oxides from pads and leads.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid #EF4444`,
            }}>
              <h3 style={{ ...typo.h3, color: '#EF4444', margin: '0 0 12px 0' }}>Zone 3: Reflow (Peak)</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Peak above liquidus ({spec.liquidus}C for {spec.name}).</strong> Solder melts and wets to pads and component leads through capillary action. Time above liquidus (TAL) must be sufficient for complete wetting but not so long that flux chars or intermetallic compounds grow too thick. The process window is tight: typically 20-30C range.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid #06B6D4`,
            }}>
              <h3 style={{ ...typo.h3, color: '#06B6D4', margin: '0 0 12px 0' }}>Zone 4: Cooling</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Rate: 2-6C/s.</strong> Controls solder microstructure. Too fast creates brittle fine-grained joints with residual stress. Too slow grows excessive intermetallic layers. The cooling rate determines the grain structure that governs long-term fatigue resistance under thermal cycling.
              </p>
            </div>
          </div>

          {/* Liquidus explanation */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Liquidus Temperature
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The liquidus is the temperature above which solder is completely liquid. For Sn63/Pb37 it is 183C (eutectic - melts at a single temperature). For SAC305 it is 217-220C. The profile must exceed liquidus for a controlled duration to allow proper wetting without thermal damage to components.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Lead-Free Challenge
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Lead-free solder requires a lower peak temperature since it melts easier' },
      { id: 'b', text: 'Lead-free solder (SAC305) has a higher liquidus and needs a hotter profile with a narrower process window', correct: true },
      { id: 'c', text: 'Lead-free and leaded solder use identical reflow profiles' },
      { id: 'd', text: 'Lead-free solder only differs in cooling rate requirements' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <div style={{
            background: `${colors.error}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.error}44`,
          }}>
            <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
              New Variable: Solder Alloy
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            RoHS regulations ban lead. Your factory must switch from Sn63/Pb37 to SAC305. How does this affect the reflow profile?
          </h2>

          {/* Comparison graphic */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 300 : 380} height={100} viewBox={`0 0 ${isMobile ? 300 : 380} 100`} preserveAspectRatio="xMidYMid meet">
              <rect x={0} y={0} width={isMobile ? 300 : 380} height={100} fill="#1a1a24" rx={8} />
              <g transform="translate(30, 15)">
                <rect x={0} y={0} width={100} height={70} rx={6} fill="#10B981" opacity={0.15} stroke="#10B981" strokeWidth="1" />
                <text x={50} y={25} textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Sn63/Pb37</text>
                <text x={50} y={45} textAnchor="middle" fill="#cbd5e1" fontSize="11">183C liquidus</text>
                <text x={50} y={60} textAnchor="middle" fill="#cbd5e1" fontSize="10">Peak: 210-230C</text>
              </g>
              <text x={(isMobile ? 150 : 190)} y={55} textAnchor="middle" fill="#F59E0B" fontSize="22" fontWeight="700">vs</text>
              <g transform={`translate(${isMobile ? 170 : 210}, 15)`}>
                <rect x={0} y={0} width={100} height={70} rx={6} fill="#EF4444" opacity={0.15} stroke="#EF4444" strokeWidth="1" />
                <text x={50} y={25} textAnchor="middle" fill="#EF4444" fontSize="13" fontWeight="700">SAC305</text>
                <text x={50} y={45} textAnchor="middle" fill="#cbd5e1" fontSize="11">217C liquidus</text>
                <text x={50} y={60} textAnchor="middle" fill="#cbd5e1" fontSize="10">Peak: ???</text>
              </g>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.error}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.error : colors.border}`,
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
                  background: twistPrediction === opt.id ? colors.error : colors.bgSecondary,
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
              onClick={() => {
                playSound('success');
                setSolderType('leadfree');
                // Reset profile to lead-free defaults
                setPeakTemp(245);
                setTimeAboveLiquidus(75);
                nextPhase();
              }}
              style={primaryButtonStyle}
            >
              Compare the Profiles
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const leadedSpec = LEADED_SPEC;
    const leadfreeSpec = LEADFREE_SPEC;
    const tempDelta = leadfreeSpec.liquidus - leadedSpec.liquidus;
    const peakDelta = leadfreeSpec.peakTempMin - leadedSpec.peakTempMin;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '900px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Lead-Free vs Leaded Profiles
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Switch between alloys and observe how the profile requirements change
          </p>

          {/* Solder type toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <button
              onClick={() => {
                playSound('click');
                setSolderType('leaded');
                setPeakTemp(225);
                setTimeAboveLiquidus(60);
              }}
              style={{
                background: solderType === 'leaded' ? `${colors.success}22` : colors.bgCard,
                border: `2px solid ${solderType === 'leaded' ? colors.success : colors.border}`,
                borderRadius: '10px',
                padding: '12px 24px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              <span style={{ ...typo.body, color: solderType === 'leaded' ? colors.success : colors.textSecondary, fontWeight: 600 }}>
                Sn63/Pb37 (Leaded)
              </span>
            </button>
            <button
              onClick={() => {
                playSound('click');
                setSolderType('leadfree');
                setPeakTemp(245);
                setTimeAboveLiquidus(75);
              }}
              style={{
                background: solderType === 'leadfree' ? `${colors.error}22` : colors.bgCard,
                border: `2px solid ${solderType === 'leadfree' ? colors.error : colors.border}`,
                borderRadius: '10px',
                padding: '12px 24px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              <span style={{ ...typo.body, color: solderType === 'leadfree' ? colors.error : colors.textSecondary, fontWeight: 600 }}>
                SAC305 (Lead-Free)
              </span>
            </button>
          </div>

          {/* Side-by-side */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
              }}>
                {renderReflowProfileSVG()}
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
              }}>
                {/* Current spec display */}
                <h4 style={{ ...typo.h3, color: solderType === 'leaded' ? colors.success : colors.error, marginBottom: '16px' }}>
                  {spec.name}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.hot }}>{spec.liquidus}C</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Liquidus</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{spec.peakTempMin}-{spec.peakTempMax}C</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Peak Range</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.warm }}>{spec.talMin}-{spec.talMax}s</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>TAL Window</div>
                  </div>
                  <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ ...typo.h3, color: colors.textPrimary }}>{spec.peakTempMax - spec.peakTempMin}C</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Process Window</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key comparison insight */}
          <div style={{
            background: `${colors.error}22`,
            border: `1px solid ${colors.error}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.error }}>Key insight:</strong> SAC305 liquidus is {tempDelta}C higher than Sn63/Pb37, requiring ~{peakDelta}C higher peak temperatures. But component damage limits are the same, so the process window is narrower and more demanding.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Deeper Physics
          </button>
        </div>
        </div>
        {renderBottomNav()}
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
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Lead-Free: The Narrower Window
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌡️</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>Higher Temperatures, Same Component Limits</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                SAC305 needs peak temperatures of 235-250C vs 210-230C for leaded solder. But many components (especially plastic BGAs and connectors) have maximum rated temperatures around 260C. This leaves only about 10-15C of margin for lead-free vs 30-50C for leaded.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔬</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Wetting and Intermetallics</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                SAC305 has poorer wetting characteristics than Sn63/Pb37. It needs more time above liquidus for complete wetting, but too much time grows thick, brittle intermetallic compound (IMC) layers at the solder-pad interface. Cu6Sn5 and Cu3Sn layers must be thin (1-3 microns) for reliable joints.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧊</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Microstructure Matters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                SAC305 solidifies into a complex microstructure of tin dendrites with Ag3Sn and Cu6Sn5 precipitates. Cooling rate controls precipitate size and distribution, which directly affects fatigue resistance. Controlled cooling at 2-4C/s produces the optimal microstructure for long-term reliability.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why This Matters</h4>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>RoHS mandates lead-free in most consumer electronics since 2006</li>
                <li style={{ marginBottom: '8px' }}>Military/aerospace exempt, but increasingly adopting lead-free</li>
                <li style={{ marginBottom: '8px' }}>Mixed assemblies (lead-free paste + leaded component finishes) add complexity</li>
                <li>Profile optimization is more critical with lead-free than ever before</li>
              </ul>
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
        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Solder Reflow Profile"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
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
          {renderNavigationBar()}
          {renderProgressBar()}
          <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
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
                ? 'You understand solder reflow profiles and PCB assembly!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer key */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Key</h3>
              {testQuestions.map((q, i) => {
                const correctOpt = q.options.find(o => o.correct);
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer === correctOpt?.id;
                return (
                  <div key={i} style={{
                    padding: '10px 0',
                    borderBottom: i < testQuestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700 }}>
                        {isCorrect ? 'O' : 'X'}
                      </span>
                      <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : `You: ${userAnswer?.toUpperCase()} | Answer: ${correctOpt?.id.toUpperCase()}`}
                      </span>
                    </div>
                    {!isCorrect && (
                      <p style={{ ...typo.small, color: colors.textMuted, margin: '4px 0 0 24px' }}>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {passed ? (
              <button
                onClick={() => {
                  playSound('complete');
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'game_completed',
                      gameType: 'solder_reflow_profile',
                      gameTitle: 'Solder Reflow Profile',
                      details: { score: testScore, total: 10, passed: true },
                      timestamp: Date.now()
                    });
                  }
                  nextPhase();
                }}
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
          {renderBottomNav()}
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
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
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
                  minHeight: '44px',
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
                  flex: 1,
                  padding: '14px',
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
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const grade = testScore >= 10 ? 'A+' : testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : 'C';

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{
          flex: '1',
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Solder Reflow Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how temperature profiles govern solder joint quality and can apply this knowledge to PCB assembly, process optimization, and reliability engineering.
        </p>

        {/* Score and grade */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${colors.accent}, #EA580C)`,
            borderRadius: '12px',
            padding: '16px 32px',
          }}>
            <p style={{ ...typo.body, color: 'white', margin: 0, fontWeight: 700 }}>
              Score: {testScore}/10
            </p>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${colors.success}, #059669)`,
            borderRadius: '12px',
            padding: '16px 32px',
          }}>
            <p style={{ ...typo.body, color: 'white', margin: 0, fontWeight: 700 }}>
              Grade: {grade}
            </p>
          </div>
        </div>

        {/* Key takeaways */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '450px',
          textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'Four zones: preheat, soak, reflow, cooling - each critical',
              'Liquidus temperature determines when solder melts (183C leaded, 217C SAC305)',
              'Time above liquidus (TAL) must be sufficient but not excessive',
              'Preheat rate controls thermal shock risk (1-3C/s)',
              'Cooling rate determines solder joint microstructure and fatigue life',
              'Lead-free has a narrower process window than leaded solder',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: colors.success, fontSize: '16px', flexShrink: 0 }}>OK</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Answer key summary */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '450px',
          textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
            Full Answer Key:
          </h3>
          {testQuestions.map((q, i) => {
            const correctOpt = q.options.find(o => o.correct);
            const userAnswer = testAnswers[i];
            const isCorrect = userAnswer === correctOpt?.id;
            return (
              <div key={i} style={{
                padding: '8px 0',
                borderBottom: i < testQuestions.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700, fontSize: '12px' }}>
                    Q{i + 1} {isCorrect ? 'OK' : 'X'}
                  </span>
                  <span style={{ ...typo.small, color: colors.textMuted, fontSize: '11px' }}>
                    Answer: {correctOpt?.id.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setTestScore(0);
              setPrediction(null);
              setTwistPrediction(null);
              setSolderType('leaded');
              setPeakTemp(225);
              setTimeAboveLiquidus(60);
              setCompletedApps([false, false, false, false]);
              goToPhase('hook');
            }}
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
          <button
            onClick={() => {
              playSound('complete');
              if (onGameEvent) {
                onGameEvent({
                  eventType: 'game_completed',
                  gameType: 'solder_reflow_profile',
                  gameTitle: 'Solder Reflow Profile',
                  details: { score: testScore, total: 10, grade, mastery: true },
                  timestamp: Date.now()
                });
              }
              window.location.href = '/games';
            }}
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Complete Game
          </button>
        </div>

        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default SolderReflowRenderer;
