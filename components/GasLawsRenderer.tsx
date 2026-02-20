'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAS LAWS RENDERER - Complete 10-Phase Learning Game
// Discover how pressure, volume, and temperature are interconnected
// ============================================================================

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

interface GasLawsRendererProps {
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

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "A scuba diver descends to 30 meters depth where the pressure is 4 atmospheres. She takes a deep breath from her tank, filling her lungs with 6 liters of air at that depth.",
    question: "If she ascends to the surface without exhaling, what would the volume of air in her lungs try to become (according to Boyle's Law)?",
    options: [
      { id: 'a', label: "1.5 liters - the air compresses at lower pressure" },
      { id: 'b', label: "6 liters - volume stays the same" },
      { id: 'c', label: "24 liters - volume increases 4x as pressure drops to 1 atm", correct: true },
      { id: 'd', label: "12 liters - volume doubles" }
    ],
    explanation: "According to Boyle's Law (P1V1 = P2V2), when pressure decreases from 4 atm to 1 atm, volume increases proportionally. 4 atm x 6L = 1 atm x V2, so V2 = 24 liters. This is why divers must exhale while ascending - lungs could rupture from expansion!"
  },
  {
    scenario: "A weather balloon is released at sea level where the atmospheric pressure is 1 atm. The balloon contains 100 cubic meters of helium. It rises to an altitude where the pressure is only 0.25 atm.",
    question: "What will be the approximate volume of the balloon at this altitude (assuming constant temperature)?",
    options: [
      { id: 'a', label: "25 cubic meters" },
      { id: 'b', label: "100 cubic meters" },
      { id: 'c', label: "400 cubic meters", correct: true },
      { id: 'd', label: "200 cubic meters" }
    ],
    explanation: "Using Boyle's Law: P1V1 = P2V2. At lower pressure (1/4 of original), the volume becomes 4 times larger. 1 atm x 100 m3 = 0.25 atm x V2, so V2 = 400 m3. This is why weather balloons must start small and eventually burst at high altitudes."
  },
  {
    scenario: "A sealed container holds gas at 300 K (27C). The container is placed in an oven and heated to 600 K (327C) while the pressure is kept constant by allowing the container to expand.",
    question: "According to Charles's Law, how does the volume change?",
    options: [
      { id: 'a', label: "Volume stays the same - only pressure changes" },
      { id: 'b', label: "Volume doubles from original", correct: true },
      { id: 'c', label: "Volume triples from original" },
      { id: 'd', label: "Volume decreases by half" }
    ],
    explanation: "Charles's Law states V1/T1 = V2/T2 at constant pressure. When temperature doubles from 300K to 600K, volume also doubles. The key is using absolute temperature (Kelvin) - at constant pressure, volume is directly proportional to absolute temperature."
  },
  {
    scenario: "A hot air balloon works by heating the air inside the envelope. The balloon contains 2800 cubic meters of air at 20C (293K). The burner heats this air to 100C (373K).",
    question: "What is the new volume of the heated air inside the balloon?",
    options: [
      { id: 'a', label: "About 2200 cubic meters" },
      { id: 'b', label: "About 2800 cubic meters - no change" },
      { id: 'c', label: "About 3565 cubic meters", correct: true },
      { id: 'd', label: "About 4200 cubic meters" }
    ],
    explanation: "Using Charles's Law: V2 = V1 x (T2/T1) = 2800 x (373/293) = 3565 m3. The heated air expands and spills out of the open bottom, reducing the mass of air inside while maintaining pressure equilibrium with outside air. This makes the balloon buoyant!"
  },
  {
    scenario: "A car tire is inflated to 35 psi (gauge pressure) on a cool morning when the temperature is 10C (283K). After driving on the highway, the tire temperature rises to 50C (323K).",
    question: "If the tire volume is essentially constant, what is the approximate new pressure (using Gay-Lussac's Law)?",
    options: [
      { id: 'a', label: "About 30 psi - pressure decreases" },
      { id: 'b', label: "About 35 psi - no significant change" },
      { id: 'c', label: "About 40 psi - pressure increases proportionally", correct: true },
      { id: 'd', label: "About 50 psi - pressure increases dramatically" }
    ],
    explanation: "Gay-Lussac's Law: P1/T1 = P2/T2 at constant volume. P2 = 35 x (323/283) = 40 psi. This is why tire pressure should be checked when tires are cold - hot tires give artificially high readings. The ~14% pressure increase matches the ~14% temperature increase in Kelvin."
  },
  {
    scenario: "The Ideal Gas Law is PV = nRT. A cylinder contains 2 moles of oxygen gas at 300K and 1 atm pressure, occupying about 49 liters. The gas is compressed to 10 liters while maintaining the same temperature.",
    question: "What is the new pressure of the gas?",
    options: [
      { id: 'a', label: "0.2 atm - proportional decrease" },
      { id: 'b', label: "2 atm - inverse relationship" },
      { id: 'c', label: "4.9 atm - inversely proportional to volume ratio", correct: true },
      { id: 'd', label: "10 atm - equals the volume in liters" }
    ],
    explanation: "At constant temperature and amount of gas, PV = constant (Boyle's Law from Ideal Gas Law). P2 = P1 x (V1/V2) = 1 atm x (49/10) = 4.9 atm. Compressing the gas to about 1/5 its original volume increases pressure about 5 times."
  },
  {
    scenario: "An aerosol can contains gas at 2.5 atm pressure at room temperature (20C or 293K). A warning label says not to expose the can to temperatures above 50C (323K).",
    question: "What would the pressure reach if the can were heated to 50C?",
    options: [
      { id: 'a', label: "About 2.0 atm" },
      { id: 'b', label: "About 2.5 atm - no change" },
      { id: 'c', label: "About 2.76 atm", correct: true },
      { id: 'd', label: "About 4.0 atm" }
    ],
    explanation: "Using Gay-Lussac's Law: P2 = P1 x (T2/T1) = 2.5 x (323/293) = 2.76 atm. This 10% pressure increase might seem small, but at high pressures, even small increases can exceed the can's structural limits. That's why aerosol cans must never be heated!"
  },
  {
    scenario: "At standard temperature and pressure (STP: 273K and 1 atm), one mole of any ideal gas occupies 22.4 liters. A chemist needs to store 5 moles of nitrogen gas at 2 atm and 300K.",
    question: "Using the Ideal Gas Law (PV = nRT with R = 0.0821 L-atm/mol-K), what volume container is needed?",
    options: [
      { id: 'a', label: "About 30 liters" },
      { id: 'b', label: "About 61.6 liters", correct: true },
      { id: 'c', label: "About 112 liters" },
      { id: 'd', label: "About 22.4 liters" }
    ],
    explanation: "Using PV = nRT: V = nRT/P = (5 mol x 0.0821 L-atm/mol-K x 300K) / 2 atm = 61.6 liters. Note that doubling the pressure halves the volume compared to STP conditions, while the higher temperature (300K vs 273K) slightly increases the volume."
  },
  {
    scenario: "A sealed rigid container holds air at 1 atm and 25C. The container is cooled to -50C (223K from 298K). The container cannot expand or contract.",
    question: "What happens to the pressure and the molecules inside?",
    options: [
      { id: 'a', label: "Pressure stays at 1 atm; molecules move faster" },
      { id: 'b', label: "Pressure drops to about 0.75 atm; molecules move slower", correct: true },
      { id: 'c', label: "Pressure increases; molecules collide more often" },
      { id: 'd', label: "Pressure drops to zero; molecules stop moving" }
    ],
    explanation: "At lower temperature, gas molecules have less kinetic energy and move slower, colliding with container walls less frequently and with less force. P2 = P1 x (T2/T1) = 1 x (223/298) = 0.75 atm. Molecules never completely stop until absolute zero (0K)."
  },
  {
    scenario: "Submarines must manage air pressure carefully. A sub at 100m depth (11 atm total pressure) has a compartment with 50 m3 of air at that pressure. During emergency surfacing, this compartment must vent to prevent over-pressurization.",
    question: "How much air (by volume at surface pressure) must be vented to equalize to 1 atm?",
    options: [
      { id: 'a', label: "50 m3 - equal to compartment volume" },
      { id: 'b', label: "450 m3 - most of the expanded air must escape" },
      { id: 'c', label: "500 m3 - the total expanded volume", correct: true },
      { id: 'd', label: "550 m3 - more than the expanded volume" }
    ],
    explanation: "At 11 atm, the 50 m3 of air would expand to 550 m3 at surface pressure (Boyle's Law). To keep only 50 m3 in the compartment at 1 atm, 500 m3 (at surface pressure) must be vented. Submarine engineers must account for these massive volume changes during depth changes."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications
// ============================================================================
const realWorldApps = [
  {
    icon: '🤿',
    title: 'Scuba Diving & Decompression',
    short: 'Life-saving gas law applications underwater',
    tagline: 'Understanding pressure keeps divers alive',
    description: "Scuba diving is perhaps the most critical real-world application of gas laws. As divers descend, water pressure increases by 1 atmosphere for every 10 meters of depth. This pressure change dramatically affects the air in a diver's lungs, sinuses, and equipment.",
    connection: "Boyle's Law (PV = constant) explains why divers must never hold their breath while ascending. Air in the lungs at 30m depth (4 atm) would expand to 4 times its volume at the surface, potentially causing fatal lung overexpansion. Henry's Law governs nitrogen absorption into tissues, requiring decompression stops.",
    howItWorks: "Dive computers continuously calculate tissue nitrogen saturation using algorithms based on gas laws. Regulators automatically adjust breathing gas pressure to match ambient water pressure. Emergency ascent procedures balance the risk of decompression sickness against lung barotrauma - both governed by gas laws.",
    stats: [
      { value: '4 atm', label: 'Pressure at 30m depth', icon: '📊' },
      { value: '18 m/min', label: 'Max safe ascent rate', icon: '⬆️' },
      { value: '5 min', label: 'Safety stop at 5m', icon: '⏱️' }
    ],
    examples: ['Recreational dive planning', 'Technical deep diving', 'Hyperbaric chamber treatment', 'Submarine rescue operations'],
    companies: ['PADI', 'Suunto', 'Shearwater Research', 'Aqua Lung', 'Mares'],
    futureImpact: 'Advanced dive computers with real-time tissue modeling, rebreather technology for extended bottom time, and AI-assisted dive planning are making underwater exploration safer. Gas law principles remain fundamental to all these innovations.',
    color: '#06B6D4'
  },
  {
    icon: '🎈',
    title: 'Weather Balloons & Meteorology',
    short: 'Probing the atmosphere with gas physics',
    tagline: 'Predicting weather through gas law principles',
    description: "Weather balloons carry instrument packages (radiosondes) to altitudes exceeding 30km, sampling temperature, humidity, pressure, and wind. As they rise through decreasing atmospheric pressure, the balloons expand according to Boyle's Law until they burst.",
    connection: "Charles's Law and the Ideal Gas Law together explain how air masses behave in the atmosphere. Rising air expands and cools adiabatically (without heat exchange), causing water vapor to condense into clouds. This process drives weather patterns from gentle showers to hurricanes.",
    howItWorks: "Twice daily, over 800 weather stations worldwide release balloons simultaneously. Each balloon starts about 1 meter in diameter and expands to 6-8 meters before bursting. The radiosonde transmits data every second during its 2-hour ascent, creating a vertical profile of atmospheric conditions.",
    stats: [
      { value: '35 km', label: 'Maximum altitude', icon: '🎈' },
      { value: '800+', label: 'Daily launches globally', icon: '🌍' },
      { value: '6-8 m', label: 'Diameter at burst', icon: '💥' }
    ],
    examples: ['Weather forecasting models', 'Climate research', 'Ozone layer monitoring', 'Hurricane tracking'],
    companies: ['NOAA', 'Vaisala', 'National Weather Service', 'ECMWF', 'Met Office'],
    futureImpact: 'Smaller, cheaper radiosondes and drone-based atmospheric sampling are increasing data density. Machine learning models trained on decades of radiosonde data are improving forecast accuracy, all built on fundamental gas law understanding.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Internal Combustion Engines',
    short: 'Converting fuel to motion through gas expansion',
    tagline: 'Millions of controlled explosions per minute',
    description: "Every internal combustion engine is a practical application of gas laws. The four-stroke cycle (intake, compression, combustion, exhaust) manipulates gas pressure, volume, and temperature to convert chemical energy into mechanical work.",
    connection: "The compression stroke demonstrates Boyle's Law - reducing volume increases pressure and temperature. Combustion rapidly increases temperature (and pressure) according to Gay-Lussac's Law. The power stroke harvests this pressure as the expanding gases push the piston down, following the Ideal Gas Law.",
    howItWorks: "A typical car engine compresses the air-fuel mixture to 1/10th its original volume (compression ratio of 10:1). Combustion raises temperature to ~2500C, dramatically increasing pressure. This high-pressure gas expands, pushing the piston and rotating the crankshaft. Engine efficiency is limited by the Carnot cycle, also derived from gas laws.",
    stats: [
      { value: '10:1', label: 'Typical compression ratio', icon: '🔧' },
      { value: '2500°C', label: 'Combustion temperature', icon: '🔥' },
      { value: '35-40%', label: 'Peak thermal efficiency', icon: '⚡' }
    ],
    examples: ['Gasoline car engines', 'Diesel truck engines', 'Jet aircraft turbines', 'Natural gas power plants'],
    companies: ['Toyota', 'Volkswagen', 'Cummins', 'General Electric', 'Rolls-Royce'],
    futureImpact: 'Variable compression ratio engines optimize efficiency across operating conditions. HCCI (Homogeneous Charge Compression Ignition) promises diesel-like efficiency with gasoline-like emissions. Even electric vehicles use gas law principles in their thermal management systems.',
    color: '#F59E0B'
  },
  {
    icon: '✈️',
    title: 'Aircraft Pressurization',
    short: 'Maintaining breathable air at 40,000 feet',
    tagline: 'Engineering comfort at extreme altitudes',
    description: "Commercial aircraft cruise at 35,000-40,000 feet where atmospheric pressure is only about 20% of sea level. Without pressurization, passengers would lose consciousness in seconds. Aircraft must maintain a safe, comfortable pressure while managing the enormous structural stresses this creates.",
    connection: "The Ideal Gas Law governs cabin pressurization. Outflow valves precisely regulate cabin pressure by controlling how fast air escapes. The pressure differential between cabin and outside air (up to 8.9 psi) creates enormous forces - a typical cabin door has over 10 tons of outward force pressing on it.",
    howItWorks: "Bleed air from the jet engines is cooled and fed into the cabin at a controlled rate. Outflow valves, typically in the rear fuselage, modulate cabin pressure to maintain 'cabin altitude' of 6,000-8,000 feet equivalent. The system automatically adjusts during climb and descent to prevent ear discomfort.",
    stats: [
      { value: '8.9 psi', label: 'Max pressure differential', icon: '📏' },
      { value: '6000 ft', label: 'Cabin altitude (787)', icon: '⛰️' },
      { value: '10+ tons', label: 'Force on cabin door', icon: '🚪' }
    ],
    examples: ['Commercial airliners', 'Private jets', 'Military transports', 'Space station modules'],
    companies: ['Boeing', 'Airbus', 'Honeywell', 'Collins Aerospace', 'Liebherr'],
    futureImpact: 'The Boeing 787 uses composite materials to safely maintain higher cabin pressure (lower cabin altitude), reducing passenger fatigue. Future aircraft may use electric compressors instead of engine bleed air, improving efficiency while maintaining gas law-governed pressurization.',
    color: '#3B82F6'
  }
];

// ============================================================================
// PHASE DEFINITIONS
// ============================================================================
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Prediction',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Completion'
};

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const colors = {
  bgPrimary: '#0a0f1a',
  bgSecondary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.7)',
  bgInput: 'rgba(51, 65, 85, 0.5)',
  accent: '#8B5CF6',
  accentAlt: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  border: '#334155',
  borderLight: '#475569',
};

const typo = {
  h1: { fontSize: '32px', fontWeight: 700, lineHeight: 1.2, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  h2: { fontSize: '24px', fontWeight: 600, lineHeight: 1.3, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  h3: { fontSize: '18px', fontWeight: 600, lineHeight: 1.4, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  body: { fontSize: '16px', fontWeight: 400, lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  small: { fontSize: '14px', fontWeight: 400, lineHeight: 1.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  label: { fontSize: '12px', fontWeight: 500, lineHeight: 1.4, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const GasLawsRenderer: React.FC<GasLawsRendererProps> = ({ onGameEvent, gamePhase }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Boyle's Law simulation
  const [volume, setVolume] = useState(100);
  const [pressure, setPressure] = useState(1);

  // Charles's Law simulation
  const [twistTemp, setTwistTemp] = useState(300);
  const [twistVolume, setTwistVolume] = useState(100);

  // Molecule animation
  const [molecules, setMolecules] = useState<Array<{x: number, y: number, vx: number, vy: number}>>([]);

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [appsVisited, setAppsVisited] = useState<Set<number>>(new Set([0]));

  // Phase sync from external prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);

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
      setPressure(100 / volume);
    }
  }, [volume, phase]);

  // Charles's Law: V/T = constant (at constant P)
  useEffect(() => {
    if (phase === 'twist_play') {
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

          if (newX < 10 || newX > 190) {
            newVx = -newVx;
            newX = Math.max(10, Math.min(190, newX));
          }
          if (newY < 10 || newY > 10 + containerHeight) {
            newVy = -newVy;
            newY = Math.max(10, Math.min(10 + containerHeight, newY));
          }

          newVx += (Math.random() - 0.5) * 0.5 * speed;
          newVy += (Math.random() - 0.5) * 0.5 * speed;

          return { x: newX, y: newY, vx: newVx, vy: newVy };
        });
      });
    }, 30);
    return () => clearInterval(interval);
  }, [phase, volume, twistVolume, twistTemp]);

  // Navigation functions
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (newPhase === 'play') {
      setVolume(100);
      setPressure(1);
    }
    if (newPhase === 'twist_play') {
      setTwistTemp(300);
      setTwistVolume(100);
    }
    onGameEvent?.({
      eventType: 'phase_changed',
      gameType: 'gas-laws',
      gameTitle: 'Gas Laws',
      details: { phase: newPhase },
      timestamp: Date.now()
    });
  }, [onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
    onGameEvent?.({
      eventType: 'prediction_made',
      gameType: 'gas-laws',
      gameTitle: 'Gas Laws',
      details: { prediction, correct: prediction === 'C' },
      timestamp: Date.now()
    });
  }, [onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({
      eventType: 'prediction_made',
      gameType: 'gas-laws',
      gameTitle: 'Gas Laws',
      details: { prediction, correct: prediction === 'B', phase: 'twist_predict' },
      timestamp: Date.now()
    });
  }, [onGameEvent]);

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswer(answerId);
    playSound('click');
  };

  const handleConfirmAnswer = () => {
    const question = testQuestions[currentQuestion];
    const correct = question.options.find(o => o.id === selectedAnswer)?.correct || false;
    if (correct) {
      setScore(s => s + 1);
      playSound('success');
    } else {
      playSound('failure');
    }
    setShowExplanation(true);
    onGameEvent?.({
      eventType: correct ? 'correct_answer' : 'incorrect_answer',
      gameType: 'gas-laws',
      gameTitle: 'Gas Laws',
      details: { questionIndex: currentQuestion, answer: selectedAnswer, correct },
      timestamp: Date.now()
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);
      onGameEvent?.({
        eventType: 'game_completed',
        gameType: 'gas-laws',
        gameTitle: 'Gas Laws',
        details: { score, total: testQuestions.length },
        timestamp: Date.now()
      });
    }
  };

  // Common styles
  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '12px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentAlt})`,
    color: colors.textPrimary,
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: `0 4px 20px ${colors.accent}40`,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.textSecondary,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: '24px',
    border: `1px solid ${colors.border}`,
  };

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '8px 0',
    }} aria-label="Progress indicator">
      {phaseOrder.map((p, i) => (
        <div
          key={p}
          onClick={() => { if (phaseOrder.indexOf(phase) > i) goToPhase(p); }}
          role="progressbar"
          aria-valuenow={phaseOrder.indexOf(phase)}
          aria-valuemin={0}
          aria-valuemax={phaseOrder.length - 1}
          aria-label={phaseLabels[p]}
          style={{
            width: phase === p ? '24px' : '12px',
            height: '12px',
            borderRadius: '6px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: phaseOrder.indexOf(phase) > i ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );

  // Bottom Navigation Bar component
  const renderBottomNav = (backPhase: Phase | null, nextPhase: Phase | null, nextLabel?: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '12px 24px',
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100,
    }}>
      {backPhase ? (
        <button onClick={() => goToPhase(backPhase)} style={{ ...secondaryButtonStyle, minHeight: '44px' }}>
          ← Back
        </button>
      ) : (
        <div style={{ width: '80px' }} />
      )}
      {renderNavDots()}
      {nextPhase ? (
        <button onClick={() => goToPhase(nextPhase)} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
          {nextLabel || 'Next →'}
        </button>
      ) : (
        <div style={{ width: '80px' }} />
      )}
    </div>
  );

  // Back button
  const renderBackButton = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex === 0) return null;
    return (
      <button
        onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
        style={secondaryButtonStyle}
      >
        ← Back
      </button>
    );
  };

  // Piston SVG for Boyle's Law - PV chart with curve
  const renderPistonSVG = () => {
    // Chart dimensions inside the SVG
    const chartLeft = 80;
    const chartRight = 420;
    const chartTop = 35;
    const chartBottom = 250;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    // Generate Boyle's Law curve: P = 100/V, V from 25 to 200
    // Map P range 0.5 to 4.0 across full chartH
    const pMin = 0.5;
    const pMax = 4.0;
    const curvePoints: string[] = [];
    for (let v = 25; v <= 200; v += 5) {
      const p = 100 / v; // PV = 100
      const x = chartLeft + ((v - 25) / 175) * chartW;
      const y = chartBottom - ((p - pMin) / (pMax - pMin)) * chartH;
      curvePoints.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = `M ${curvePoints[0]} ${curvePoints.slice(1).map(pt => `L ${pt}`).join(' ')}`;

    // Current operating point
    const pointX = chartLeft + ((volume - 25) / 175) * chartW;
    const pointY = chartBottom - ((pressure - pMin) / (pMax - pMin)) * chartH;

    // Color based on pressure level
    const pointColor = pressure > 2.5 ? colors.error : pressure > 1.5 ? colors.warning : colors.success;

    // Color zone indicator (low = green, high = red)
    const lowZoneY = chartBottom;
    const highZoneY = chartTop;

    return (
      <svg viewBox="0 0 450 300" style={{ width: '100%', height: '100%' }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="pvCurveGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="pressureZoneGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Background */}
        <g id="bg-layer">
          <rect width="450" height="300" fill={colors.bgPrimary} rx="8" />
          <rect x={chartLeft} y={chartTop} width={chartW} height={chartH} fill="url(#pressureZoneGrad)" />
        </g>

        {/* Grid lines */}
        <g id="grid-layer">
          {[0.25, 0.5, 0.75].map((frac, i) => (
            <line key={`hg${i}`} x1={chartLeft} y1={chartTop + frac * chartH} x2={chartRight} y2={chartTop + frac * chartH}
              stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          ))}
          {[0.25, 0.5, 0.75].map((frac, i) => (
            <line key={`vg${i}`} x1={chartLeft + frac * chartW} y1={chartTop} x2={chartLeft + frac * chartW} y2={chartBottom}
              stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          ))}
        </g>

        {/* Axes */}
        <g id="axes-layer">
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={colors.textSecondary} strokeWidth="2" />
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.textSecondary} strokeWidth="2" />
        </g>

        {/* Y axis label - Pressure */}
        <text x="20" y={chartTop + chartH / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="bold"
          transform={`rotate(-90, 20, ${chartTop + chartH / 2})`}>P (atm)</text>

        {/* X axis label - Volume */}
        <text x={chartLeft + chartW / 2} y="286" textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="bold">Volume (%)</text>

        {/* Y tick labels */}
        <text x={chartLeft - 8} y={chartBottom + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">0.5</text>
        <text x={chartLeft - 8} y={chartTop + chartH * 0.5 + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">2.3</text>
        <text x={chartLeft - 8} y={chartTop + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">4.0</text>

        {/* X tick labels */}
        <text x={chartLeft} y={chartBottom + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">25</text>
        <text x={chartLeft + chartW * 0.5} y={chartBottom + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">113</text>
        <text x={chartRight} y={chartBottom + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">200</text>

        {/* Data layer */}
        <g id="data-layer">
          {/* PV curve */}
          <path d={curvePath} fill="none" stroke={colors.accent} strokeWidth="3" opacity="0.8" />

          {/* Reference line at P=1 (baseline) */}
          <line x1={chartLeft} y1={chartBottom - ((1 - pMin) / (pMax - pMin)) * chartH}
            x2={chartRight} y2={chartBottom - ((1 - pMin) / (pMax - pMin)) * chartH}
            stroke={colors.success} strokeWidth="1" strokeDasharray="6 3" opacity="0.5" />
          <text x={chartRight + 4} y={chartBottom - ((1 - pMin) / (pMax - pMin)) * chartH + 4}
            fill={colors.success} fontSize="11">baseline</text>

          {/* Interactive point */}
          <circle cx={pointX} cy={pointY} r={8} fill={pointColor} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

          {/* Value label near point */}
          <text x={Math.min(pointX + 14, chartRight - 60)} y={Math.max(pointY - 14, chartTop + 16)} fill={pointColor} fontSize="12" fontWeight="bold">
            P={pressure.toFixed(2)}
          </text>
        </g>

        {/* Color zone legend */}
        <g id="legend-layer">
          <circle cx={chartRight - 80} cy={chartTop + 12} r={4} fill="#10B981" />
          <text x={chartRight - 72} y={chartTop + 16} fill={colors.textMuted} fontSize="11">Low</text>
          <circle cx={chartRight - 40} cy={chartTop + 12} r={4} fill="#EF4444" />
          <text x={chartRight - 32} y={chartTop + 16} fill={colors.textMuted} fontSize="11">High</text>
        </g>

        {/* Title */}
        <text x={chartLeft + chartW / 2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
          Boyle's Law: P × V = constant
        </text>
      </svg>
    );
  };

  // Balloon SVG for Charles's Law - VT chart with curve
  const renderBalloonSVG = () => {
    const isHot = twistTemp > 350;
    const isCold = twistTemp < 250;

    // Chart dimensions
    const chartLeft = 70;
    const chartRight = 420;
    const chartTop = 30;
    const chartBottom = 240;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    // Charles's Law curve: V = (T/300)*100, T from 200 to 500
    const curvePoints: string[] = [];
    for (let t = 200; t <= 500; t += 10) {
      const v = (t / 300) * 100;
      const x = chartLeft + ((t - 200) / 300) * chartW;
      const y = chartBottom - ((v - 50) / 130) * chartH;
      curvePoints.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = `M ${curvePoints[0]} ${curvePoints.slice(1).map(pt => `L ${pt}`).join(' ')}`;

    // Current operating point
    const currentV = (twistTemp / 300) * 100;
    const pointX = chartLeft + ((twistTemp - 200) / 300) * chartW;
    const pointY = chartBottom - ((currentV - 50) / 130) * chartH;

    const pointColor = isHot ? colors.error : isCold ? '#3b82f6' : colors.warning;

    return (
      <svg viewBox="0 0 450 300" style={{ width: '100%', height: '100%' }}>
        <defs>
          <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="450" height="300" fill={colors.bgPrimary} rx="8" />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line key={`hg2${i}`} x1={chartLeft} y1={chartTop + frac * chartH} x2={chartRight} y2={chartTop + frac * chartH}
            stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line key={`vg2${i}`} x1={chartLeft + frac * chartW} y1={chartTop} x2={chartLeft + frac * chartW} y2={chartBottom}
            stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Axes */}
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Y axis label */}
        <text x="18" y={chartTop + chartH / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="bold"
          transform={`rotate(-90, 18, ${chartTop + chartH / 2})`}>Volume (%)</text>

        {/* X axis label */}
        <text x={chartLeft + chartW / 2} y="280" textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="bold">Temperature (K)</text>

        {/* Y tick labels */}
        <text x={chartLeft - 8} y={chartBottom + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">50</text>
        <text x={chartLeft - 8} y={chartTop + chartH * 0.5 + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">115</text>
        <text x={chartLeft - 8} y={chartTop + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">180</text>

        {/* X tick labels */}
        <text x={chartLeft} y={chartBottom + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">200</text>
        <text x={chartLeft + chartW * 0.5} y={chartBottom + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">350</text>
        <text x={chartRight} y={chartBottom + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">500</text>

        {/* VT curve */}
        <path d={curvePath} fill="none" stroke={colors.warning} strokeWidth="3" opacity="0.8" />

        {/* Interactive point */}
        <circle cx={pointX} cy={pointY} r={8} fill={pointColor} filter="url(#glow2)" stroke="#fff" strokeWidth={2} />

        {/* Value label near point */}
        <text x={pointX + 14} y={pointY - 12} fill={pointColor} fontSize="12" fontWeight="bold">
          V={currentV.toFixed(0)}%
        </text>

        {/* Title */}
        <text x={chartLeft + chartW / 2} y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
          Charles's Law: V / T = constant
        </text>
      </svg>
    );
  };

  // ============================================================================
  // RENDER PHASES
  // ============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: '#ffffff',
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '24px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px', textAlign: 'center', maxWidth: '600px', margin: '0 auto', overflowY: 'auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}30`,
            borderRadius: '20px',
            marginBottom: '24px',
          }}>
            <span style={{ width: '8px', height: '8px', background: colors.accent, borderRadius: '50%' }} />
            <span style={{ ...typo.label, color: colors.accent }}>PHYSICS EXPLORATION</span>
          </div>

          <h1 style={{ ...typo.h1, color: '#ffffff', marginBottom: '16px' }}>
            Gas Laws: PVT Relationships
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
            Why do balloons <span style={{ color: '#ffffff', fontWeight: 600 }}>expand</span> when heated?
            What makes sealed containers <span style={{ color: '#ffffff', fontWeight: 600 }}>dangerous</span> in fires?
            Discover how pressure, volume, and temperature are interconnected.
          </p>

          <div style={{ ...cardStyle, width: '100%', marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { icon: '📊', text: 'Pressure' },
                { icon: '📦', text: 'Volume' },
                { icon: '🌡️', text: 'Temperature' }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: colors.bgInput,
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>{item.text}</div>
                </div>
              ))}
            </div>
            <p style={{ ...typo.body, color: '#ffffff' }}>
              These three variables are always connected. Change one, and the others must respond. This relationship governs everything from breathing to rocket engines.
            </p>
          </div>

          <button onClick={() => goToPhase('predict')} style={primaryButtonStyle}>
            Start Exploring →
          </button>
        </div>
        {renderBottomNav(null, 'predict', 'Next →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px' }}>Make Your Prediction</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>Think about what will happen before we test it</p>

          <div style={{ ...cardStyle, width: '100%', marginBottom: '24px' }}>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px' }}>
              You seal a syringe containing <strong>20 mL of air</strong> at 1 atm pressure.
              You push the plunger to compress the air to <strong>10 mL</strong> (half the volume).
            </p>
            <p style={{ ...typo.body, color: colors.accent, fontWeight: 600 }}>
              What happens to the pressure inside?
            </p>

            {/* Simple syringe visualization */}
            <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px', marginTop: '16px' }}>
              <rect width="400" height="100" fill="transparent" />
              {/* Before */}
              <rect x="30" y="30" width="120" height="40" rx="6" fill={colors.bgInput} stroke={colors.border} strokeWidth="2" />
              <text x="90" y="55" textAnchor="middle" fill={colors.textPrimary} fontSize="14">20 mL</text>
              <text x="90" y="85" textAnchor="middle" fill={colors.textMuted} fontSize="12">Before</text>
              {/* Arrow */}
              <path d="M170 50 L210 50 M200 40 L210 50 L200 60" stroke={colors.accent} strokeWidth="3" fill="none" />
              {/* After */}
              <rect x="230" y="30" width="60" height="40" rx="6" fill={colors.bgInput} stroke={colors.accent} strokeWidth="2" />
              <text x="260" y="55" textAnchor="middle" fill={colors.textPrimary} fontSize="14">10 mL</text>
              <text x="260" y="85" textAnchor="middle" fill={colors.textMuted} fontSize="12">After</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '24px' }}>
            {[
              { id: 'A', text: 'Pressure decreases to 0.5 atm' },
              { id: 'B', text: 'Pressure stays at 1 atm' },
              { id: 'C', text: 'Pressure increases to 2 atm' },
              { id: 'D', text: 'Pressure increases to 4 atm' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => handlePrediction(option.id)}
                disabled={showPredictionFeedback}
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: `2px solid ${
                    showPredictionFeedback && selectedPrediction === option.id
                      ? option.id === 'C' ? colors.success : colors.error
                      : showPredictionFeedback && option.id === 'C' ? colors.success
                      : colors.border
                  }`,
                  background: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'C')
                    ? option.id === 'C' ? `${colors.success}20` : `${colors.error}20`
                    : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: showPredictionFeedback ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                <span style={{ fontWeight: 700 }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>

          {showPredictionFeedback && (
            <div style={{ ...cardStyle, width: '100%', background: `${colors.success}15`, borderColor: colors.success }}>
              <p style={{ ...typo.body, color: colors.success, marginBottom: '12px', fontWeight: 600 }}>
                {selectedPrediction === 'C' ? 'Correct!' : 'Not quite!'} This is Boyle's Law: P1V1 = P2V2
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                When you halve the volume, the pressure doubles. The same number of molecules hitting half the surface area means twice as many collisions per unit area = double pressure.
              </p>
              <button
                onClick={() => goToPhase('play')}
                style={{ ...primaryButtonStyle, marginTop: '16px' }}
              >
                Explore the Physics →
              </button>
            </div>
          )}

          {!showPredictionFeedback && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {renderBackButton()}
            </div>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px', maxWidth: '600px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px' }}>Boyle's Law Lab</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>
            Adjust the volume and observe how pressure changes - this demonstrates why compressing gases takes work and releases heat.
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
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ ...cardStyle, width: '100%', marginBottom: '16px' }}>
                <div style={{ height: '220px', marginBottom: '16px' }}>
                  {renderPistonSVG()}
                </div>

                {/* Legend Section */}
                <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px', marginTop: '8px' }}>
                  <p style={{ ...typo.label, color: colors.textMuted, marginBottom: '8px' }}>LEGEND</p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors.accent }} />
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Gas Molecules</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '16px', height: '8px', background: colors.borderLight, borderRadius: '2px' }} />
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Piston</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '16px', height: '12px', border: `2px solid ${colors.borderLight}`, borderRadius: '2px' }} />
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Cylinder</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PV display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginBottom: '16px' }}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ ...typo.h2, color: colors.accent }}>{pressure.toFixed(2)}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Pressure (atm)</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ ...typo.h2, color: colors.accentAlt }}>{volume}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Volume (%)</div>
                </div>
              </div>

              {/* PV constant */}
              <div style={{ ...cardStyle, width: '100%', background: `${colors.success}15`, borderColor: colors.success, textAlign: 'center' }}>
                <div style={{ ...typo.h1, color: colors.success }}>{(pressure * volume).toFixed(0)}</div>
                <div style={{ ...typo.small, color: colors.success }}>P x V = Constant! (Boyle's Law)</div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Slider control */}
              <div style={{ ...cardStyle, width: '100%', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ ...typo.body, color: colors.textPrimary }}>Volume</label>
                  <span style={{ ...typo.body, color: colors.accent, fontWeight: 700 }}>{volume}%</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="200"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ ...typo.label, color: colors.textMuted }}>Compressed (25%)</span>
                  <span style={{ ...typo.label, color: colors.textMuted }}>Expanded (200%)</span>
                </div>
              </div>

              {/* Cause-Effect Explanation */}
              <div style={{ ...cardStyle, width: '100%', background: `${colors.accent}10` }}>
                <p style={{ ...typo.body, color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>
                  {volume < 100 ? 'When you decrease the volume...' : volume > 100 ? 'When you increase the volume...' : 'At the baseline...'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  {volume < 100
                    ? `The pressure increases to ${pressure.toFixed(2)} atm because the same number of molecules now collide with a smaller surface area more frequently. This causes higher pressure.`
                    : volume > 100
                    ? `The pressure decreases to ${pressure.toFixed(2)} atm because molecules now have more space to move, resulting in fewer collisions per unit area. This leads to lower pressure.`
                    : `The gas is at equilibrium with P = 1 atm and V = 100%. As you adjust the volume, the pressure will change inversely to maintain PV = constant.`
                  }
                </p>
              </div>
            </div>
          </div>

          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            This relationship is important in engineering - compressing the fuel-air mixture in engines increases the force of the explosion, making vehicles more powerful.
          </p>
        </div>

        {renderBottomNav('predict', 'review', 'Next →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px' }}>Boyle's Law Explained</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>Same molecules, different space</p>

          <div style={{ ...cardStyle, width: '100%', textAlign: 'center', marginBottom: '24px', background: `linear-gradient(135deg, ${colors.accent}15, ${colors.accentAlt}15)` }}>
            <div style={{ ...typo.h1, color: colors.accent, marginBottom: '8px' }}>P₁V₁ = P₂V₂</div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>At constant temperature, pressure and volume are inversely proportional</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔬</div>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Molecular View</h3>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Gas pressure comes from molecules hitting container walls. Smaller volume = same molecules hit walls more often = higher pressure.
              </p>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
              <h3 style={{ ...typo.h3, color: colors.accentAlt, marginBottom: '8px' }}>Inverse Relationship</h3>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                P and V are inversely proportional. When one doubles, the other halves. Their product stays constant.
              </p>
            </div>
          </div>

          <div style={{ ...cardStyle, width: '100%', marginBottom: '24px' }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>Key Takeaways</h3>
            {[
              { icon: '🤿', title: 'Scuba Diving', desc: "Air in lungs expands as divers ascend - never hold your breath while ascending!" },
              { icon: '🎈', title: 'Weather Balloons', desc: 'Balloons expand as they rise because atmospheric pressure decreases with altitude.' },
              { icon: '💉', title: 'Syringes', desc: 'Pulling the plunger expands volume, lowering pressure and drawing liquid in.' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: i < 2 ? '16px' : 0 }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <div>
                  <h4 style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.title}</h4>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
            You correctly predicted that halving the volume doubles the pressure! Now let's explore what happens when temperature changes.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            {renderBackButton()}
            <button onClick={() => goToPhase('twist_predict')} style={primaryButtonStyle}>
              Explore Temperature Effects →
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px' }}>New Variable: Temperature</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>How does heating a gas affect its volume?</p>

          <div style={{ ...cardStyle, width: '100%', marginBottom: '24px' }}>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px' }}>
              A balloon at room temperature <strong>(300 K)</strong> is heated to <strong>450 K</strong> while the external pressure stays constant at 1 atm.
            </p>
            <p style={{ ...typo.body, color: colors.warning, fontWeight: 600 }}>
              What happens to the balloon's volume?
            </p>

            {/* Balloon visualization */}
            <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px', marginTop: '16px' }}>
              <rect width="400" height="100" fill="transparent" />
              {/* Before */}
              <circle cx="80" cy="45" r="30" fill={`${colors.accentAlt}20`} stroke={colors.accentAlt} strokeWidth="2" />
              <text x="80" y="50" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">300K</text>
              <text x="80" y="88" textAnchor="middle" fill={colors.textMuted} fontSize="11">Cool</text>
              {/* Arrow + fire */}
              <text x="150" y="45" fontSize="20">🔥</text>
              <path d="M175 45 L215 45" stroke={colors.warning} strokeWidth="3" fill="none" />
              <path d="M205 35 L215 45 L205 55" stroke={colors.warning} strokeWidth="3" fill="none" />
              {/* After */}
              <ellipse cx="280" cy="45" rx="45" ry="35" fill={`${colors.warning}20`} stroke={colors.warning} strokeWidth="2" strokeDasharray="5 3" />
              <text x="280" y="50" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="bold">?</text>
              <text x="280" y="88" textAnchor="middle" fill={colors.textMuted} fontSize="11">Hot (450K)</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '24px' }}>
            {[
              { id: 'A', text: 'Balloon shrinks' },
              { id: 'B', text: 'Balloon expands (1.5x volume)' },
              { id: 'C', text: 'Volume stays the same' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => handleTwistPrediction(option.id)}
                disabled={showTwistFeedback}
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: `2px solid ${
                    showTwistFeedback && twistPrediction === option.id
                      ? option.id === 'B' ? colors.success : colors.error
                      : showTwistFeedback && option.id === 'B' ? colors.success
                      : colors.border
                  }`,
                  background: showTwistFeedback && (twistPrediction === option.id || option.id === 'B')
                    ? option.id === 'B' ? `${colors.success}20` : `${colors.error}20`
                    : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: showTwistFeedback ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                <span style={{ fontWeight: 700 }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>

          {showTwistFeedback && (
            <div style={{ ...cardStyle, width: '100%', background: `${colors.success}15`, borderColor: colors.success }}>
              <p style={{ ...typo.body, color: colors.success, marginBottom: '12px', fontWeight: 600 }}>
                {twistPrediction === 'B' ? 'Correct!' : 'Not quite!'} This is Charles's Law: V₁/T₁ = V₂/T₂
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                450K/300K = 1.5, so volume increases by 50%! At constant pressure, volume is directly proportional to absolute temperature (Kelvin).
              </p>
              <button
                onClick={() => goToPhase('twist_play')}
                style={{ ...primaryButtonStyle, marginTop: '16px', background: `linear-gradient(135deg, ${colors.warning}, #ea580c)` }}
              >
                Explore Temperature Effects →
              </button>
            </div>
          )}

          {!showTwistFeedback && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {renderBackButton()}
            </div>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px' }}>Charles's Law Lab</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>
            Adjust temperature and watch the balloon expand or contract - this explains how hot air balloons float!
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
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ ...cardStyle, width: '100%', marginBottom: '16px' }}>
                <div style={{ height: '220px', marginBottom: '16px' }}>
                  {renderBalloonSVG()}
                </div>
              </div>

              {/* T and V display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginBottom: '16px' }}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ ...typo.h2, color: colors.warning }}>{twistTemp}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Temperature (K)</div>
                </div>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ ...typo.h2, color: colors.accentAlt }}>{twistVolume.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Volume (%)</div>
                </div>
              </div>

              {/* V/T constant */}
              <div style={{ ...cardStyle, width: '100%', background: `${colors.success}15`, borderColor: colors.success, textAlign: 'center' }}>
                <div style={{ ...typo.h1, color: colors.success }}>{(twistVolume / twistTemp).toFixed(3)}</div>
                <div style={{ ...typo.small, color: colors.success }}>V / T = Constant! (Charles's Law)</div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature slider */}
              <div style={{ ...cardStyle, width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ ...typo.body, color: colors.textPrimary }}>Temperature</label>
                  <span style={{ ...typo.body, color: colors.warning, fontWeight: 700 }}>{twistTemp} K</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="500"
                  value={twistTemp}
                  onChange={(e) => setTwistTemp(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ ...typo.label, color: colors.textMuted }}>Cold (200 K / -73°C)</span>
                  <span style={{ ...typo.label, color: colors.textMuted }}>Hot (500 K / 227°C)</span>
                </div>
              </div>
            </div>
          </div>

          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Notice how the molecules move faster when hot - they collide with walls more forcefully. At constant pressure, the balloon must expand to maintain equilibrium.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            {renderBackButton()}
            <button onClick={() => goToPhase('twist_review')} style={{ ...primaryButtonStyle, background: `linear-gradient(135deg, ${colors.warning}, #ea580c)` }}>
              Deep Understanding →
            </button>
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
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px' }}>The Ideal Gas Law</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>Combining all three variables into one powerful equation</p>

          <div style={{ ...cardStyle, width: '100%', textAlign: 'center', marginBottom: '24px', background: `linear-gradient(135deg, ${colors.accent}15, ${colors.warning}15)` }}>
            <div style={{ fontSize: '48px', fontWeight: 800, background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
              PV = nRT
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Pressure × Volume = moles × gas constant × Temperature
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '24px' }}>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', background: `${colors.accent}15` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: colors.accent }}>PV</div>
              <div>
                <h4 style={{ ...typo.body, color: colors.accent, fontWeight: 600 }}>Boyle's Law</h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>P₁V₁ = P₂V₂ (constant T)</p>
              </div>
            </div>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', background: `${colors.warning}15` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.warning}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: colors.warning }}>V/T</div>
              <div>
                <h4 style={{ ...typo.body, color: colors.warning, fontWeight: 600 }}>Charles's Law</h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>V₁/T₁ = V₂/T₂ (constant P)</p>
              </div>
            </div>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', background: `${colors.accentAlt}15` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${colors.accentAlt}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: colors.accentAlt }}>P/T</div>
              <div>
                <h4 style={{ ...typo.body, color: colors.accentAlt, fontWeight: 600 }}>Gay-Lussac's Law</h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>P₁/T₁ = P₂/T₂ (constant V)</p>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, width: '100%', background: `${colors.success}15`, borderColor: colors.success }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>The Big Picture</h3>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              PV = nRT connects macroscopic measurements (P, V, T) to the microscopic world of molecules. This single equation explains balloons, scuba diving, engines, weather, and countless other phenomena!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {renderBackButton()}
            <button onClick={() => goToPhase('transfer')} style={{ ...primaryButtonStyle, background: `linear-gradient(135deg, ${colors.success}, ${colors.accentAlt})` }}>
              Real World Applications →
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
        conceptName="Gas Laws"
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
    const currentApp = realWorldApps[selectedApp];
    const allAppsVisited = appsVisited.size >= realWorldApps.length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '800px', margin: '0 auto', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, marginBottom: '8px', textAlign: 'center' }}>Real-World Applications</h2>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>Gas laws in action everywhere</p>

          {/* App tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
            {realWorldApps.map((app, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedApp(i);
                  setAppsVisited(prev => new Set([...prev, i]));
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: selectedApp === i ? 'none' : `1px solid ${colors.border}`,
                  background: selectedApp === i ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentAlt})` : 'transparent',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  fontWeight: selectedApp === i ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedApp === i ? `0 4px 15px ${colors.accent}40` : 'none',
                }}
              >
                {appsVisited.has(i) && <span style={{ marginRight: '6px' }}>✓</span>}
                {app.icon} {app.title}
              </button>
            ))}
          </div>

          {/* Current app content */}
          <div style={{ ...cardStyle, marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{currentApp.icon}</span>
              <div>
                <h3 style={{ ...typo.h2, color: colors.textPrimary }}>{currentApp.title}</h3>
                <p style={{ ...typo.small, color: currentApp.color }}>{currentApp.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>{currentApp.description}</p>

            <div style={{ padding: '16px', background: `${currentApp.color}15`, borderRadius: '12px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.body, color: currentApp.color, fontWeight: 600, marginBottom: '8px' }}>Gas Law Connection</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>{currentApp.connection}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{ padding: '12px', background: colors.bgInput, borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: currentApp.color }}>{stat.value}</div>
                  <div style={{ ...typo.label, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Industry Leaders</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentApp.companies.map((company, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: colors.bgInput, borderRadius: '6px', fontSize: '12px', color: colors.textSecondary }}>{company}</span>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setAppsVisited(prev => new Set([...prev, selectedApp]));
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                  setAppsVisited(prev => new Set([...prev, selectedApp + 1]));
                }
              }}
              style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${currentApp.color}, ${colors.accent})` }}
            >
              {selectedApp < realWorldApps.length - 1 ? 'Next Application →' : 'Got It!'}
            </button>
          </div>

          {/* Progress */}
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '8px' }}>
            {appsVisited.size} of {realWorldApps.length} applications explored
          </p>
          <div style={{ width: '100%', height: '8px', background: colors.border, borderRadius: '4px', marginBottom: '24px' }}>
            <div style={{
              width: `${(appsVisited.size / realWorldApps.length) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentAlt})`,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>

          {allAppsVisited && (
            <button
              onClick={() => goToPhase('test')}
              style={{ ...primaryButtonStyle, background: `linear-gradient(135deg, ${colors.success}, ${colors.accentAlt})` }}
            >
              Take the Test →
            </button>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            {renderBackButton()}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    // Quiz complete view
    if (quizComplete) {
      const percentage = (score / testQuestions.length) * 100;
      const passed = percentage >= 70;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
          color: colors.textPrimary,
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: passed ? `${colors.success}20` : `${colors.warning}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ fontSize: '50px' }}>{passed ? '🎉' : '📚'}</span>
            </div>

            <h2 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>

            <div style={{ ...typo.h1, fontSize: '64px', color: passed ? colors.success : colors.warning, marginBottom: '8px' }}>
              {score}/{testQuestions.length}
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              You scored {percentage.toFixed(0)}%
            </p>

            <button
              onClick={() => {
                if (passed) {
                  goToPhase('mastery');
                } else {
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  setScore(0);
                  setQuizComplete(false);
                }
              }}
              style={primaryButtonStyle}
            >
              {passed ? 'Complete Lesson →' : 'Review & Try Again'}
            </button>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Quiz question view
    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ ...typo.h3, color: colors.textPrimary }}>Question {currentQuestion + 1} of {testQuestions.length}</h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: i < currentQuestion ? colors.success : i === currentQuestion ? colors.accent : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{ ...cardStyle, marginBottom: '16px' }}>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>SCENARIO</p>
            <p style={{ ...typo.body, color: colors.textSecondary }}>{question.scenario}</p>
          </div>

          {/* Question */}
          <div style={{ ...cardStyle, marginBottom: '24px', borderColor: colors.accent }}>
            <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{question.question}</p>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option.id;
              const showResult = showExplanation;
              const isCorrect = option.correct;

              return (
                <button
                  key={option.id}
                  onClick={() => !showExplanation && handleAnswerSelect(option.id)}
                  disabled={showExplanation}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: `2px solid ${
                      showResult
                        ? isCorrect ? colors.success : isSelected ? colors.error : colors.border
                        : isSelected ? colors.accent : colors.border
                    }`,
                    background: showResult
                      ? isCorrect ? `${colors.success}20` : isSelected ? `${colors.error}20` : colors.bgCard
                      : isSelected ? `${colors.accent}20` : colors.bgCard,
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: showExplanation ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: showResult && !isCorrect && !isSelected ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{option.id.toUpperCase()})</span>
                  <span style={{ marginLeft: '8px' }}>{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div style={{ ...cardStyle, background: `${colors.success}15`, borderColor: colors.success, marginBottom: '24px' }}>
              <h4 style={{ ...typo.body, color: colors.success, fontWeight: 600, marginBottom: '8px' }}>Explanation</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>{question.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {!showExplanation && selectedAnswer && (
              <button onClick={handleConfirmAnswer} style={primaryButtonStyle}>
                Check Answer
              </button>
            )}
            {showExplanation && (
              <button onClick={handleNextQuestion} style={primaryButtonStyle}>
                {currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results'}
              </button>
            )}
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
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        color: colors.textPrimary,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentAlt})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: `0 8px 30px ${colors.accent}40`,
          }}>
            <span style={{ fontSize: '60px' }}>🏆</span>
          </div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
            Gas Laws Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px', maxWidth: '400px' }}>
            You've mastered the relationships between pressure, volume, and temperature!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px', maxWidth: '400px' }}>
            {[
              { icon: '📊', label: "Boyle's Law", value: 'Mastered' },
              { icon: '🌡️', label: "Charles's Law", value: 'Mastered' },
              { icon: '🎈', label: 'Ideal Gas Law', value: 'Mastered' }
            ].map((item, i) => (
              <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ ...typo.label, color: colors.textMuted }}>{item.label}</div>
                <div style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle, background: `${colors.success}15`, borderColor: colors.success, marginBottom: '32px', maxWidth: '300px' }}>
            <div style={{ ...typo.h1, color: colors.success }}>{score}/10</div>
            <div style={{ ...typo.small, color: colors.success }}>Test Score</div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => goToPhase('hook')} style={secondaryButtonStyle}>
              Play Again
            </button>
            <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none' }}>
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

export default GasLawsRenderer;
