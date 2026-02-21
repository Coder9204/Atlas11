'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// DAMPED OSCILLATIONS - Complete 10-Phase Learning Experience
// Physics: m(d²x/dt²) + c(dx/dt) + kx = 0
// Damping ratio: ζ = c / (2√(mk))
// Underdamped (ζ<1): oscillates with exponential decay
// Critically damped (ζ=1): fastest return to equilibrium without oscillation
// Overdamped (ζ>1): slow return without oscillation
// ─────────────────────────────────────────────────────────────────────────────

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

interface DampedOscillationsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'bounce') => {
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
      complete: { freq: 900, duration: 0.4, type: 'sine' },
      bounce: { freq: 250, duration: 0.08, type: 'triangle' }
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "You're driving over a pothole at highway speed. Your car's suspension compresses sharply, then the body moves up and down before settling. An engineer tells you the shock absorbers have a damping ratio of 0.3.",
    question: "Based on this damping ratio, how would you describe the suspension's behavior?",
    options: [
      { id: 'a', label: "The car will bounce several times before settling (underdamped)" , correct: true },
      { id: 'b', label: "The car will return to level in minimum time without bouncing" },
      { id: 'c', label: "The car will slowly creep back to level without any bounce" },
      { id: 'd', label: "The damping ratio tells us nothing about the motion" }
    ],
    explanation: "With ζ = 0.3 (less than 1), the system is underdamped. The car oscillates with decreasing amplitude because the damping force removes energy each cycle, but not enough to prevent oscillation. Most car suspensions are designed in the 0.2-0.4 range for comfort."
  },
  {
    scenario: "A door closer mechanism is being designed for a fire exit. The door must close completely without slamming and must not swing back open after closing.",
    question: "What damping ratio should the engineer specify?",
    options: [
      { id: 'a', label: "ζ = 0.2 for a quick, bouncy close" },
      { id: 'b', label: "ζ = 0.7 for slight overshoot that helps confirm closure" },
      { id: 'c', label: "ζ = 1.0 for fastest closing without any rebound", correct: true },
      { id: 'd', label: "ζ = 3.0 for maximum safety" }
    ],
    explanation: "Critical damping (ζ = 1) provides the fastest return to equilibrium without overshoot. For a fire door, this means the door closes quickly (safety) and doesn't swing back open (preventing draft and fire spread). Overdamping would close too slowly."
  },
  {
    scenario: "A precision voltmeter needle must indicate voltage changes accurately. Engineers notice that with ζ = 1.0 (critical damping), users have difficulty reading when the needle has finished moving.",
    question: "Why might engineers choose ζ = 0.7 instead of critical damping?",
    options: [
      { id: 'a', label: "To make the meter cheaper to manufacture" },
      { id: 'b', label: "Critical damping is impossible to achieve in practice" },
      { id: 'c', label: "A small overshoot helps users visually identify the final position", correct: true },
      { id: 'd', label: "ζ = 0.7 uses less energy" }
    ],
    explanation: "At ζ ≈ 0.7, there's about 4% overshoot - small enough not to mislead, but visible enough that the eye can track when the needle settles. This is called 'optimal damping' for visual instruments. The brief overshoot creates a visual cue that motion has stopped."
  },
  {
    scenario: "During an earthquake, a 50-story building sways back and forth. The building's natural frequency is 0.2 Hz. Engineers want to reduce the swaying amplitude by 40%.",
    question: "How does a tuned mass damper achieve this reduction?",
    options: [
      { id: 'a', label: "By making the building more rigid" },
      { id: 'b', label: "By oscillating out of phase with the building, absorbing and dissipating energy", correct: true },
      { id: 'c', label: "By increasing the building's natural frequency" },
      { id: 'd', label: "By reducing the earthquake's ground motion" }
    ],
    explanation: "A tuned mass damper (TMD) is a massive pendulum or spring-mass system tuned to the building's natural frequency. When the building sways right, the TMD swings left, creating an opposing force. Energy is dissipated through dampers attached to the TMD, reducing building oscillation amplitude."
  },
  {
    scenario: "A smartphone accelerometer is a tiny mass-spring system (MEMS device) that measures phone movement. It must respond quickly to motion changes without ringing.",
    question: "Why is near-critical damping (ζ ≈ 0.7-1.0) essential for accelerometers?",
    options: [
      { id: 'a', label: "To make the sensor more durable" },
      { id: 'b', label: "To filter out high-frequency vibrations" },
      { id: 'c', label: "To settle quickly after motion changes without false oscillation readings", correct: true },
      { id: 'd', label: "To increase the sensor's measurement range" }
    ],
    explanation: "If an accelerometer were underdamped, it would ring after sudden motions, producing false readings. If overdamped, it would respond too slowly to track rapid movements. Near-critical damping provides fast, accurate response - essential for gaming, navigation, and step counting."
  },
  {
    scenario: "In the damped oscillation equation m(d²x/dt²) + c(dx/dt) + kx = 0, you double the damping coefficient c while keeping mass m and spring constant k unchanged.",
    question: "What happens to the damping ratio ζ?",
    options: [
      { id: 'a', label: "ζ doubles", correct: true },
      { id: 'b', label: "ζ quadruples" },
      { id: 'c', label: "ζ is halved" },
      { id: 'd', label: "ζ stays the same" }
    ],
    explanation: "Since ζ = c / (2√(mk)), the damping ratio is directly proportional to c. Doubling c doubles ζ. This could change an underdamped system to critically damped or overdamped, fundamentally changing its response character."
  },
  {
    scenario: "A grandfather clock pendulum swings in a sealed glass case. Over 24 hours, it slowly loses amplitude and eventually stops, despite having no visible damping mechanism.",
    question: "What provides the damping that eventually stops the pendulum?",
    options: [
      { id: 'a', label: "Gravity slowly reduces the pendulum's energy" },
      { id: 'b', label: "The spring loses tension over time" },
      { id: 'c', label: "Internal friction in the hinge and air resistance", correct: true },
      { id: 'd', label: "Thermal radiation carries away kinetic energy" }
    ],
    explanation: "Even in a protected environment, the pivot bearing has internal friction, and air (even still air) provides viscous damping. These effects are small (ζ << 1), so the pendulum makes thousands of oscillations before stopping. This is why clocks need periodic energy input (winding) to maintain amplitude."
  },
  {
    scenario: "A diving board vibrates after a diver jumps off. The first oscillation has amplitude of 20 cm, the second has 15 cm, the third has 11.25 cm.",
    question: "What is the decay ratio (each amplitude divided by the previous) and what does it tell us?",
    options: [
      { id: 'a', label: "0.75; the board loses 25% of its amplitude each cycle", correct: true },
      { id: 'b', label: "0.75; the board is critically damped" },
      { id: 'c', label: "1.33; the oscillations are growing" },
      { id: 'd', label: "0.25; the board is heavily overdamped" }
    ],
    explanation: "15/20 = 0.75 and 11.25/15 = 0.75. This constant decay ratio is characteristic of exponential decay in underdamped systems. From this ratio, engineers can calculate the damping ratio: ζ ≈ 0.046. The board is very lightly damped, which is why it oscillates visibly for several cycles."
  },
  {
    scenario: "A car suspension is designed with adjustable damping. In 'Comfort' mode, ζ = 0.25. In 'Sport' mode, ζ = 0.5. In 'Track' mode, ζ = 0.8.",
    question: "Why would a driver choose different damping settings?",
    options: [
      { id: 'a', label: "Higher damping is always better for performance" },
      { id: 'b', label: "Lower damping absorbs more energy from bumps" },
      { id: 'c', label: "Lower damping gives a softer ride; higher damping gives better body control", correct: true },
      { id: 'd', label: "The settings only affect fuel economy" }
    ],
    explanation: "Lower damping (Comfort) allows more body motion, isolating passengers from bumps. Higher damping (Sport/Track) controls body roll in corners and reduces dive under braking, improving handling. The trade-off is between comfort and control - the physics of damped oscillations in action."
  },
  {
    scenario: "An engineer is designing a system where settling time (time to reach equilibrium) is critical. She compares three designs: ζ = 0.5, ζ = 1.0, and ζ = 2.0.",
    question: "Which design reaches equilibrium fastest?",
    options: [
      { id: 'a', label: "ζ = 0.5 - underdamped systems are faster" },
      { id: 'b', label: "ζ = 1.0 - critical damping is the mathematical optimum", correct: true },
      { id: 'c', label: "ζ = 2.0 - overdamped systems don't waste time oscillating" },
      { id: 'd', label: "All three have the same settling time" }
    ],
    explanation: "Critical damping (ζ = 1) represents the boundary between oscillatory and non-oscillatory behavior. It provides the fastest return to equilibrium without overshoot. Underdamped systems oscillate (taking time to settle); overdamped systems are sluggish. This is why critical damping is often the engineering target."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Automotive Suspension Systems',
    short: 'Turning bumpy roads into smooth rides',
    tagline: 'The art of controlled energy dissipation',
    description: 'Every vehicle from economy cars to Formula 1 racers relies on precisely tuned damped oscillators to balance comfort and control. Shock absorbers (dampers) work with springs to manage the 2,000+ bumps a typical car encounters every mile.',
    connection: 'When a wheel hits a bump, the spring stores energy (potential energy). Without damping, this energy would cause continuous bouncing. The shock absorber converts kinetic energy to heat through hydraulic fluid forced through small orifices, providing the damping force c(dx/dt) that removes energy each oscillation.',
    howItWorks: 'Inside a shock absorber, a piston moves through oil. Small valves control oil flow, creating velocity-dependent resistance. Modern adaptive dampers use magnetorheological fluid - oil containing iron particles that stiffen when magnetized - allowing real-time damping adjustment in 2-3 milliseconds.',
    stats: [
      { value: '85%', label: 'Energy absorbed per cycle', icon: '⚡' },
      { value: '50 ms', label: 'Damper response time', icon: '🔄' },
      { value: '250 W', label: 'Power dissipated per damper', icon: '📊' }
    ],
    examples: [
      'MacPherson struts in passenger cars - combines spring and damper in one unit',
      'Bose electromagnetic suspension - uses linear motors instead of hydraulics',
      'MagneRide adaptive dampers in GM/Ferrari - adjusts 1000 times per second',
      'Fox Racing semi-active shocks for off-road - position-sensitive damping'
    ],
    companies: ['Bilstein', 'KYB', 'Monroe', 'Ohlins', 'ZF Sachs', 'Tenneco'],
    futureImpact: 'Fully active suspension systems using AI prediction of road conditions will eliminate the comfort-handling trade-off. Preview cameras will detect potholes before contact, pre-adjusting damping for optimal response. Some systems may even add energy to "leap" over obstacles.',
    color: '#3B82F6'
  },
  {
    icon: '🏗️',
    title: 'Earthquake-Resistant Buildings',
    short: 'Engineering survival through controlled oscillation',
    tagline: 'When the ground shakes, smart buildings fight back',
    description: 'The 2011 Tohoku earthquake produced accelerations up to 2.9g, yet most modern high-rises in Tokyo survived with minimal damage. The secret: buildings designed as carefully tuned damped oscillators that dissipate seismic energy instead of transmitting it to structural elements.',
    connection: 'A building is a mass-spring system: the mass is the building itself, the "spring" is the structural stiffness. Earthquakes excite the building at various frequencies. If excitation matches natural frequency, resonance causes catastrophic amplification. Dampers add the energy dissipation term that limits amplitude regardless of excitation.',
    howItWorks: 'Three main strategies: Base isolation (building sits on rubber bearings that filter high frequencies), Tuned Mass Dampers (counter-oscillating masses that absorb energy), and Viscous dampers (hydraulic cylinders between floors that dissipate energy as heat). Many buildings combine all three.',
    stats: [
      { value: '730000 kg', label: 'Taipei 101 TMD mass', icon: '🏗️' },
      { value: '60%', label: 'Vibration reduction', icon: '📉' },
      { value: '500 m', label: 'Max building height protected', icon: '📊' }
    ],
    examples: [
      'Taipei 101 - 730-ton pendulum damper visible to tourists, reduces sway by 40%',
      'Shanghai Tower - dual TMD system, one of worlds tallest buildings',
      'Tokyo Skytree - central concrete shaft with multiple damping systems',
      'LA City Hall retrofit - 546 base isolators added to 1928 building'
    ],
    companies: ['Taylor Devices', 'Motioneering', 'Thornton Tomasetti', 'Arup', 'THK', 'Damptech'],
    futureImpact: 'Active mass dampers with AI control will predict earthquake motion from early P-waves (arriving 10-30 seconds before damaging S-waves) and pre-position damper masses. Buildings may eventually "surf" earthquakes, actively counteracting ground motion in real-time.',
    color: '#EF4444'
  },
  {
    icon: '🎸',
    title: 'Musical Instrument Acoustics',
    short: 'Where damping shapes the sound of music',
    tagline: 'From sustained piano notes to punchy drum hits',
    description: 'A concert piano can sustain notes for 20+ seconds, while a snare drum decays in under a second. This dramatic difference comes from deliberate engineering of damping characteristics. Instrument makers have spent centuries perfecting the art of controlled vibration decay.',
    connection: 'When a guitar string is plucked, it oscillates at its natural frequency (the musical pitch). The string couples energy to the body, which radiates sound. The damping ratio determines sustain: low damping (guitar, piano) = long sustain; high damping (drums, percussion) = quick decay. The same physics formula governs it all.',
    howItWorks: 'String instruments minimize damping: strings are high-tension steel or nylon with low internal friction. The bridge transfers energy to the soundboard, which couples to air. Each coupling adds some damping. Piano dampers are felt pads that musicians control via the sustain pedal, adding damping on demand.',
    stats: [
      { value: 'ζ ≈ 0.001', label: 'Guitar string damping', icon: '🎸' },
      { value: '10-20 sec', label: 'Piano sustain time', icon: '🎹' },
      { value: 'ζ ≈ 0.1', label: 'Drum head damping', icon: '🥁' }
    ],
    examples: [
      'Piano sustain pedal - lifts all dampers for extended resonance',
      'Guitar dead notes - player adds damping by touching strings lightly',
      'Drum moon gels - add damping to control ring and sustain',
      'Violin mutes - add mass/damping for softer, warmer tone'
    ],
    companies: ['Steinway', 'Yamaha', 'Gibson', 'Martin', 'DW Drums', 'Zildjian', 'Remo'],
    futureImpact: 'Smart instruments with electronic damping control will allow musicians to adjust sustain in real-time. Imagine a guitar that sustains like a piano on some notes and cuts short like a muted string on others - all controlled by the players expression.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'MEMS Accelerometers & Sensors',
    short: 'Microscopic oscillators sensing your every move',
    tagline: 'The physics of the digital age, shrunk to the microscale',
    description: 'Your smartphone contains at least three MEMS (Micro-Electro-Mechanical Systems) accelerometers - microscopic mass-spring-damper systems measuring acceleration. These 0.5mm devices use the same damped oscillation physics as car suspensions, just 10 million times smaller.',
    connection: 'A MEMS accelerometer is a tiny proof mass on microscopic springs. When the phone accelerates, the mass deflects. Capacitive plates measure this deflection with nanometer precision. The key challenge: achieving near-critical damping in a system where air molecules create significant forces.',
    howItWorks: 'The proof mass is typically a few micrograms of silicon, suspended on beam springs etched from the same chip. Damping comes from squeeze-film effects (air trapped between moving plates) or electrostatic forces. The system must settle quickly (high bandwidth) without ringing (requires adequate damping). Modern MEMS achieve ζ ≈ 0.5-0.7.',
    stats: [
      { value: 'ζ ≈ 0.5-0.7', label: 'Typical damping ratio', icon: '📊' },
      { value: '1-5 kHz', label: 'Resonant frequency', icon: '🔄' },
      { value: '<1 μg', label: 'Resolution (1 μg = 10⁻⁵ m/s²)', icon: '🎯' }
    ],
    examples: [
      'iPhone accelerometer - enables screen rotation, step counting, gaming',
      'Automotive airbag sensors - detect crash deceleration in milliseconds',
      'Drone IMUs - 6-axis motion sensing for stable flight control',
      'Seismometers - detect earthquakes anywhere in the world'
    ],
    companies: ['STMicroelectronics', 'Bosch Sensortec', 'InvenSense (TDK)', 'Analog Devices', 'NXP'],
    futureImpact: 'Next-generation MEMS will achieve quantum-limited sensitivity, enabling applications like indoor navigation without GPS, health monitoring through subtle vibration analysis, and earthquake early warning networks using crowdsourced smartphone data.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DampedOscillationsRenderer: React.FC<DampedOscillationsRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [dampingRatio, setDampingRatio] = useState(0.2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [displacement, setDisplacement] = useState(100);
  const [velocity, setVelocity] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - comparing damping scenarios
  const [twistDamping1, setTwistDamping1] = useState(0.3);
  const [twistDamping2, setTwistDamping2] = useState(1.0);
  const [twistSimulating, setTwistSimulating] = useState(false);
  const [twistTime, setTwistTime] = useState(0);
  const [twistDisp1, setTwistDisp1] = useState(100);
  const [twistDisp2, setTwistDisp2] = useState(100);

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
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Main simulation physics
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimTime(t => {
        const newTime = t + 0.05;
        const omega_n = 2; // Natural frequency

        let newDisp: number;
        if (dampingRatio < 1) {
          // Underdamped
          const omega_d = omega_n * Math.sqrt(1 - dampingRatio * dampingRatio);
          newDisp = 100 * Math.exp(-dampingRatio * omega_n * newTime) * Math.cos(omega_d * newTime);
        } else if (dampingRatio === 1) {
          // Critically damped
          newDisp = 100 * (1 + omega_n * newTime) * Math.exp(-omega_n * newTime);
        } else {
          // Overdamped
          const s1 = -omega_n * (dampingRatio - Math.sqrt(dampingRatio * dampingRatio - 1));
          const s2 = -omega_n * (dampingRatio + Math.sqrt(dampingRatio * dampingRatio - 1));
          const A = 100 * s2 / (s2 - s1);
          const B = -100 * s1 / (s2 - s1);
          newDisp = A * Math.exp(s1 * newTime) + B * Math.exp(s2 * newTime);
        }

        setDisplacement(newDisp);
        setVelocity((newDisp - displacement) / 0.05);

        // Sound on zero crossing for underdamped
        if (dampingRatio < 1 && Math.abs(newDisp) < 3 && Math.abs(displacement) > 3) {
          playSound('bounce');
        }

        if (newTime > 12 || Math.abs(newDisp) < 0.5) {
          setIsSimulating(false);
        }

        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, dampingRatio, displacement]);

  // Twist simulation physics (comparison)
  useEffect(() => {
    if (!twistSimulating) return;

    const interval = setInterval(() => {
      setTwistTime(t => {
        const newTime = t + 0.05;
        const omega_n = 2;

        // System 1
        let d1: number;
        if (twistDamping1 < 1) {
          const omega_d = omega_n * Math.sqrt(1 - twistDamping1 * twistDamping1);
          d1 = 100 * Math.exp(-twistDamping1 * omega_n * newTime) * Math.cos(omega_d * newTime);
        } else if (twistDamping1 === 1) {
          d1 = 100 * (1 + omega_n * newTime) * Math.exp(-omega_n * newTime);
        } else {
          const s1 = -omega_n * (twistDamping1 - Math.sqrt(twistDamping1 * twistDamping1 - 1));
          const s2 = -omega_n * (twistDamping1 + Math.sqrt(twistDamping1 * twistDamping1 - 1));
          d1 = (100 * s2 / (s2 - s1)) * Math.exp(s1 * newTime) + (-100 * s1 / (s2 - s1)) * Math.exp(s2 * newTime);
        }

        // System 2
        let d2: number;
        if (twistDamping2 < 1) {
          const omega_d = omega_n * Math.sqrt(1 - twistDamping2 * twistDamping2);
          d2 = 100 * Math.exp(-twistDamping2 * omega_n * newTime) * Math.cos(omega_d * newTime);
        } else if (twistDamping2 === 1) {
          d2 = 100 * (1 + omega_n * newTime) * Math.exp(-omega_n * newTime);
        } else {
          const s1 = -omega_n * (twistDamping2 - Math.sqrt(twistDamping2 * twistDamping2 - 1));
          const s2 = -omega_n * (twistDamping2 + Math.sqrt(twistDamping2 * twistDamping2 - 1));
          d2 = (100 * s2 / (s2 - s1)) * Math.exp(s1 * newTime) + (-100 * s1 / (s2 - s1)) * Math.exp(s2 * newTime);
        }

        setTwistDisp1(d1);
        setTwistDisp2(d2);

        if (newTime > 10) {
          setTwistSimulating(false);
        }

        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [twistSimulating, twistDamping1, twistDamping2]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Violet for oscillation
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#e2e8f0',
    border: '#2a2a3a',
    cyan: '#06B6D4',
    orange: '#F97316',
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
    twist_play: 'Explore Compare',
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
        gameType: 'damped-oscillations',
        gameTitle: 'Damped Oscillations',
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

  // Get damping regime label
  const getDampingLabel = (z: number) => {
    if (z < 0.95) return { label: 'Underdamped', color: colors.cyan };
    if (z > 1.05) return { label: 'Overdamped', color: colors.orange };
    return { label: 'Critical', color: colors.success };
  };

  // Start simulation
  const startSimulation = () => {
    setSimTime(0);
    setDisplacement(100);
    setVelocity(0);
    setIsSimulating(true);
    playSound('click');
  };

  // Start twist simulation
  const startTwistSimulation = () => {
    setTwistTime(0);
    setTwistDisp1(100);
    setTwistDisp2(100);
    setTwistSimulating(true);
    playSound('click');
  };

  // Oscillator Visualization
  const OscillatorVis = ({ disp, color, label }: { disp: number; color: string; label?: string }) => {
    const width = isMobile ? 160 : 200;
    const height = isMobile ? 200 : 240;
    const massY = 100 + (disp * 0.5);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Damped Oscillations visualization">
        <defs>
          <linearGradient id={`massGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title at top */}
        <text x={width / 2} y="8" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Spring-Mass-Damper</text>

        {/* Ceiling */}
        <rect x="20" y="14" width={width - 40} height="12" fill={colors.border} rx="3" />
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M0,10 L10,0" stroke={colors.textMuted} strokeWidth="1" />
        </pattern>
        <rect x="20" y="14" width={width - 40} height="12" fill="url(#hatch)" opacity="0.5" />

        {/* Spring */}
        <path
          d={`M${width/2} 26 ${Array.from({length: 8}, (_, i) => {
            const y = 26 + (i + 1) * ((massY - 26) / 9);
            const x = width/2 + (i % 2 === 0 ? -15 : 15);
            return `L${x} ${y}`;
          }).join(' ')} L${width/2} ${massY}`}
          fill="none"
          stroke={colors.warning}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Damper (simplified) */}
        <rect x={width/2 + 20} y="35" width="12" height={Math.max(10, massY - 55)} fill={colors.textMuted} rx="2" />
        <rect x={width/2 + 17} y={massY - 30} width="18" height="15" fill={colors.border} rx="2" />

        {/* Mass */}
        <rect
          x={width/2 - 25}
          y={massY}
          width="50"
          height="35"
          rx="6"
          fill={`url(#massGrad-${color})`}
          filter="url(#glow)"
        />

        {/* Equilibrium line */}
        <line x1="20" y1="150" x2={width - 20} y2="150" stroke={colors.textMuted} strokeDasharray="5,5" />
        <text x="25" y="165" fill={colors.textMuted} fontSize="11">Equilibrium</text>

        {/* Displacement indicator */}
        <line x1={width - 25} y1="150" x2={width - 25} y2={massY + 17} stroke={color} strokeWidth="1.5" />
        <text x={width - 22} y={Math.min(massY + 17, 150) + Math.abs(massY + 17 - 150) / 2 + 4} fill={color} fontSize="11">{Math.abs(disp).toFixed(0)}%</text>

        {/* Label */}
        {label && (
          <text x={width/2} y={height - 5} textAnchor="middle" fill={color} fontSize="12" fontWeight="600">
            {label}
          </text>
        )}
      </svg>
    );
  };

  // Response Graph
  const ResponseGraph = () => {
    const width = isMobile ? 340 : 440;
    const height = 260;
    const plotTop = 35;
    const plotBottom = 220;
    const plotMid = (plotTop + plotBottom) / 2;
    const plotLeft = 55;
    const plotRight = width - 25;
    const points: string[] = [];

    const omega_n = 2;
    for (let t = 0; t <= 10; t += 0.1) {
      let y: number;
      if (dampingRatio < 1) {
        const omega_d = omega_n * Math.sqrt(1 - dampingRatio * dampingRatio);
        y = Math.exp(-dampingRatio * omega_n * t) * Math.cos(omega_d * t);
      } else if (dampingRatio === 1) {
        y = (1 + omega_n * t) * Math.exp(-omega_n * t);
      } else {
        const s1 = -omega_n * (dampingRatio - Math.sqrt(dampingRatio * dampingRatio - 1));
        const s2 = -omega_n * (dampingRatio + Math.sqrt(dampingRatio * dampingRatio - 1));
        y = (s2 / (s2 - s1)) * Math.exp(s1 * t) + (-s1 / (s2 - s1)) * Math.exp(s2 * t);
      }
      const x = plotLeft + (t / 10) * (plotRight - plotLeft);
      const yPos = plotMid - y * 80;
      points.push(`${x} ${yPos}`);
    }

    const dampInfo = getDampingLabel(dampingRatio);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="responseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={dampInfo.color} />
            <stop offset="100%" stopColor={dampInfo.color} stopOpacity="0.4" />
          </linearGradient>
          <filter id="markerGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y="22" textAnchor="middle" fill={dampInfo.color} fontSize="14" fontWeight="700">
          Displacement vs Time
        </text>

        {/* Grid lines */}
        <g>
          {[0.25, 0.5, 0.75].map(frac => (
            <line key={`hgrid-${frac}`} x1={plotLeft} y1={plotTop + frac * (plotBottom - plotTop)} x2={plotRight} y2={plotTop + frac * (plotBottom - plotTop)} stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map(frac => (
            <line key={`vgrid-${frac}`} x1={plotLeft + frac * (plotRight - plotLeft)} y1={plotTop} x2={plotLeft + frac * (plotRight - plotLeft)} y2={plotBottom} stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
          ))}
        </g>

        {/* Axes */}
        <g>
          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={colors.textMuted} strokeWidth="1.5" />
          <line x1={plotLeft} y1={plotMid} x2={plotRight} y2={plotMid} stroke={colors.textMuted} strokeWidth="1.5" />
          {/* Y-axis tick marks */}
          <line x1={plotLeft - 5} y1={plotTop} x2={plotLeft} y2={plotTop} stroke={colors.textMuted} />
          <line x1={plotLeft - 5} y1={plotBottom} x2={plotLeft} y2={plotBottom} stroke={colors.textMuted} />
          {/* X-axis tick marks */}
          <line x1={plotRight} y1={plotMid - 3} x2={plotRight} y2={plotMid + 3} stroke={colors.textMuted} />
        </g>

        {/* Axis labels */}
        <text x="15" y={plotMid - 40} fill={colors.textSecondary} fontSize="12" transform={`rotate(-90, 15, ${plotMid})`} textAnchor="middle">Amplitude</text>
        <text x={(plotLeft + plotRight) / 2} y={plotBottom + 28} textAnchor="middle" fill={colors.textSecondary} fontSize="12">Time (s)</text>
        <text x={plotLeft - 8} y={plotTop + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">+1</text>
        <text x={plotLeft - 8} y={plotMid + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">0</text>
        <text x={plotLeft - 8} y={plotBottom + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">-1</text>
        <text x={plotRight} y={plotMid + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">10s</text>

        {/* Envelope for underdamped */}
        {dampingRatio < 1 && (
          <g>
            <path
              d={`M${plotLeft} ${plotTop} ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const env = Math.exp(-dampingRatio * omega_n * t);
                const x = plotLeft + (t / 10) * (plotRight - plotLeft);
                return `L${x} ${plotMid - env * 80}`;
              }).join(' ')}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <path
              d={`M${plotLeft} ${plotBottom} ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const env = Math.exp(-dampingRatio * omega_n * t);
                const x = plotLeft + (t / 10) * (plotRight - plotLeft);
                return `L${x} ${plotMid + env * 80}`;
              }).join(' ')}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <text x={plotLeft + 10} y={plotTop + 12} fill={colors.accent} fontSize="11" opacity="0.7">Envelope</text>
          </g>
        )}

        {/* Response curve */}
        <g>
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={dampInfo.color}
            strokeWidth="2.5"
          />
        </g>

        {/* Origin reference point */}
        <circle cx={plotLeft} cy={plotMid} r="3" fill={colors.textMuted} />

        {/* Current value marker - responds to damping ratio */}
        {(() => {
          // Show marker at representative time position based on damping ratio
          const markerT = isSimulating ? simTime : 2.0;
          const markerDisp = isSimulating ? displacement : (() => {
            const omega_n2 = 2;
            if (dampingRatio < 1) {
              const wd2 = omega_n2 * Math.sqrt(1 - dampingRatio * dampingRatio);
              return 100 * Math.exp(-dampingRatio * omega_n2 * markerT) * Math.cos(wd2 * markerT);
            } else if (dampingRatio === 1) {
              return 100 * (1 + omega_n2 * markerT) * Math.exp(-omega_n2 * markerT);
            } else {
              const s1m = -omega_n2 * (dampingRatio - Math.sqrt(dampingRatio * dampingRatio - 1));
              const s2m = -omega_n2 * (dampingRatio + Math.sqrt(dampingRatio * dampingRatio - 1));
              return 100 * ((s2m / (s2m - s1m)) * Math.exp(s1m * markerT) + (-s1m / (s2m - s1m)) * Math.exp(s2m * markerT));
            }
          })();
          return (
            <circle
              cx={plotLeft + (markerT / 10) * (plotRight - plotLeft)}
              cy={plotMid - (markerDisp / 100) * 80}
              r="8"
              fill={dampInfo.color}
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#markerGlow)"
            />
          );
        })()}

        {/* Regime label */}
        <text x={plotRight - 5} y={plotTop + 12} textAnchor="end" fill={dampInfo.color} fontSize="13" fontWeight="600">
          {dampInfo.label} (ζ = {dampingRatio.toFixed(2)})
        </text>

        {/* Legend */}
        <g>
          <rect x={plotLeft + 5} y={plotBottom + 34} width="10" height="10" fill={dampInfo.color} rx="2" />
          <text x={plotLeft + 20} y={plotBottom + 43} fill={colors.textSecondary} fontSize="11">Response Curve</text>
          {dampingRatio < 1 && (
            <>
              <line x1={plotLeft + 130} y1={plotBottom + 39} x2={plotLeft + 150} y2={plotBottom + 39} stroke={colors.accent} strokeDasharray="4,4" opacity="0.7" />
              <text x={plotLeft + 155} y={plotBottom + 43} fill={colors.textSecondary} fontSize="11">Decay Envelope</text>
            </>
          )}
        </g>
      </svg>
    );
  };

  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1002,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.cyan})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Phase indicators
  const renderPhaseIndicators = () => (
    <div style={{
      position: 'fixed',
      top: '4px',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      flexWrap: 'wrap',
      zIndex: 1001,
      background: colors.bgPrimary,
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          aria-label={`Go to ${phaseLabels[p]} phase`}
          style={{
            width: phase === p ? '32px' : '10px',
            height: '10px',
            borderRadius: '5px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '44px',
          }}
          title={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      textAlign: 'center',
    }}>
      {/* Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: `${colors.accent}20`,
        border: `1px solid ${colors.accent}40`,
        borderRadius: '999px',
        marginBottom: '24px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent, animation: 'pulse 2s infinite' }} />
        <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 600 }}>MECHANICS</span>
      </div>

      {/* Title */}
      <h1 style={{
        ...typo.h1,
        color: colors.textPrimary,
        marginBottom: '16px',
        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.accent})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Why Doesn't Your Car Bounce Forever?
      </h1>

      <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
        Springs want to oscillate. Roads have bumps. Yet you arrive unshaken.
      </p>

      {/* Animated illustration */}
      <div style={{
        background: colors.bgCard,
        borderRadius: '24px',
        padding: '32px',
        marginBottom: '32px',
        border: `1px solid ${colors.border}`,
      }}>
        <svg width={isMobile ? 280 : 380} height={isMobile ? 180 : 220} viewBox={`0 0 ${isMobile ? 280 : 380} ${isMobile ? 180 : 220}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="carGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
          </defs>

          {/* Road */}
          <rect x="0" y={isMobile ? 150 : 180} width={isMobile ? 280 : 380} height="40" fill="url(#roadGrad)" />
          <line x1="0" y1={isMobile ? 168 : 198} x2={isMobile ? 280 : 380} y2={isMobile ? 168 : 198} stroke="#fbbf24" strokeWidth="3" strokeDasharray="20,15" />

          {/* Bump */}
          <ellipse cx={isMobile ? 140 : 190} cy={isMobile ? 150 : 180} rx="35" ry="12" fill="#4b5563" />

          {/* Car with suspension animation */}
          <g transform={`translate(${isMobile ? 100 : 140}, ${isMobile ? 80 + Math.sin(animationFrame * 0.15) * 4 : 100 + Math.sin(animationFrame * 0.15) * 5})`}>
            {/* Car body */}
            <rect x="0" y="15" width="80" height="28" rx="5" fill="url(#carGrad)" />
            <rect x="12" y="0" width="56" height="20" rx="5" fill={colors.accent} opacity="0.8" />
            <rect x="18" y="4" width="20" height="12" rx="2" fill="#7dd3fc" opacity="0.7" />
            <rect x="44" y="4" width="20" height="12" rx="2" fill="#7dd3fc" opacity="0.7" />

            {/* Springs (animated) */}
            <path d={`M15 43 Q10 ${48 + Math.sin(animationFrame * 0.2) * 2} 15 53 Q20 ${58 + Math.sin(animationFrame * 0.2) * 2} 15 63`}
                  stroke={colors.warning} strokeWidth="3" fill="none" />
            <path d={`M65 43 Q60 ${48 + Math.sin(animationFrame * 0.2 + 1) * 2} 65 53 Q70 ${58 + Math.sin(animationFrame * 0.2 + 1) * 2} 65 63`}
                  stroke={colors.warning} strokeWidth="3" fill="none" />

            {/* Wheels */}
            <circle cx="15" cy={70 + Math.sin(animationFrame * 0.2) * 2} r="10" fill="#1f2937" />
            <circle cx="15" cy={70 + Math.sin(animationFrame * 0.2) * 2} r="4" fill="#6b7280" />
            <circle cx="65" cy={70 + Math.sin(animationFrame * 0.2 + 1) * 2} r="10" fill="#1f2937" />
            <circle cx="65" cy={70 + Math.sin(animationFrame * 0.2 + 1) * 2} r="4" fill="#6b7280" />
          </g>

          {/* Question marks */}
          <text x={isMobile ? 40 : 60} y="50" fill={colors.accent} fontSize="32" opacity={0.3 + 0.2 * Math.sin(animationFrame * 0.1)}>?</text>
          <text x={isMobile ? 220 : 300} y="70" fill={colors.cyan} fontSize="28" opacity={0.3 + 0.2 * Math.sin(animationFrame * 0.1 + 2)}>?</text>
        </svg>
      </div>

      <p style={{ ...typo.body, color: colors.cyan, fontWeight: 500, marginBottom: '24px' }}>
        What invisible force turns endless bouncing into smooth motion?
      </p>

      <button
        onClick={() => goToPhase('predict')}
        style={{
          padding: '16px 48px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: `0 4px 20px ${colors.accentGlow}`,
          minHeight: '44px',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        Discover the Physics
      </button>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );

  const renderPredict = () => {
    const options = [
      { id: 'A', text: 'Gravity eventually overcomes the spring force and pulls everything to rest' },
      { id: 'B', text: 'Damping forces convert kinetic energy to heat, removing energy each cycle', correct: true },
      { id: 'C', text: 'Springs naturally lose their elasticity after repeated compression' },
      { id: 'D', text: 'Air pressure equalizes above and below the car, stopping motion' }
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        minHeight: '80vh',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          Make Your Prediction
        </h2>

        {/* Static SVG showing damped oscillation concept */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <svg width={isMobile ? 280 : 360} height={140} viewBox={`0 0 ${isMobile ? 280 : 360} 140`} preserveAspectRatio="xMidYMid meet">
            {/* Decaying wave pattern */}
            <defs>
              <linearGradient id="predictWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.accent} />
                <stop offset="100%" stopColor={colors.cyan} stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Axis */}
            <line x1="30" y1="70" x2={isMobile ? 260 : 340} y2="70" stroke={colors.border} strokeWidth="1" />
            <line x1="30" y1="20" x2="30" y2="120" stroke={colors.border} strokeWidth="1" />

            {/* Decaying oscillation curve */}
            <path
              d={`M30,70 ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const amp = 40 * Math.exp(-0.25 * t);
                const y = 70 - amp * Math.sin(t * 1.5);
                const x = 30 + t * (isMobile ? 23 : 31);
                return `L${x},${y}`;
              }).join(' ')}`}
              fill="none"
              stroke="url(#predictWaveGrad)"
              strokeWidth="2.5"
            />

            {/* Envelope lines */}
            <path
              d={`M30,30 ${Array.from({length: 25}, (_, i) => {
                const t = i * 0.4;
                const amp = 40 * Math.exp(-0.25 * t);
                const x = 30 + t * (isMobile ? 23 : 31);
                return `L${x},${70 - amp}`;
              }).join(' ')}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <path
              d={`M30,110 ${Array.from({length: 25}, (_, i) => {
                const t = i * 0.4;
                const amp = 40 * Math.exp(-0.25 * t);
                const x = 30 + t * (isMobile ? 23 : 31);
                return `L${x},${70 + amp}`;
              }).join(' ')}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />

            {/* Labels */}
            <text x="15" y="25" fill={colors.textSecondary} fontSize="11">Amplitude</text>
            <text x={isMobile ? 240 : 310} y="85" fill={colors.textSecondary} fontSize="11">Time</text>
            <text x={(isMobile ? 280 : 360)/2} y="130" textAnchor="middle" fill={colors.textMuted} fontSize="11">Decaying Oscillation Pattern</text>
          </svg>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            Imagine pushing down on a car's hood and releasing it. The suspension compresses, then the car bounces up and down a few times before settling.
          </p>
          <p style={{ ...typo.body, color: colors.accent, fontWeight: 500 }}>
            What physical mechanism removes energy from this oscillating system?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '600px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setPrediction(opt.id);
                playSound(opt.correct ? 'success' : 'failure');
              }}
              disabled={prediction !== null}
              style={{
                padding: '16px 20px',
                background: prediction === opt.id
                  ? opt.correct ? `${colors.success}30` : `${colors.error}30`
                  : prediction !== null && opt.correct
                    ? `${colors.success}30`
                    : colors.bgCard,
                border: `2px solid ${
                  prediction === opt.id
                    ? opt.correct ? colors.success : colors.error
                    : prediction !== null && opt.correct
                      ? colors.success
                      : colors.border
                }`,
                borderRadius: '12px',
                color: colors.textPrimary,
                textAlign: 'left',
                cursor: prediction !== null ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: prediction !== null && prediction !== opt.id && !opt.correct ? 0.5 : 1,
                minHeight: '44px',
              }}
            >
              <span style={{ fontWeight: 700, marginRight: '12px', color: colors.accent }}>{opt.id}.</span>
              {opt.text}
            </button>
          ))}
        </div>

        {prediction && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: colors.bgCard,
            borderRadius: '12px',
            maxWidth: '600px',
            border: `1px solid ${prediction === 'B' ? colors.success : colors.warning}`,
          }}>
            <p style={{ color: prediction === 'B' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
              {prediction === 'B' ? 'Correct!' : 'Not quite!'} Damping is the key.
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Damping forces (like shock absorbers) oppose motion and convert kinetic energy to heat. This energy loss causes the oscillation amplitude to decrease with each cycle until the system reaches equilibrium.
            </p>
            <button
              onClick={nextPhase}
              style={{
                marginTop: '16px',
                padding: '12px 32px',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Explore the Physics
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPlay = () => {
    const dampInfo = getDampingLabel(dampingRatio);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
          Damped Oscillation Laboratory
        </h2>

        {/* Real-world relevance text */}
        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', textAlign: 'center', marginBottom: '12px' }}>
          Adjust the damping ratio to observe how car suspensions, building dampers, and instrument needles behave.
          This technology is used in real-world engineering applications from earthquake-resistant buildings to your smartphone's accelerometer.
        </p>

        {/* Observation guidance */}
        <div style={{
          background: `${colors.accent}15`,
          borderRadius: '12px',
          padding: '12px 20px',
          marginBottom: '24px',
          maxWidth: '600px',
          border: `1px solid ${colors.accent}30`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary }}>
            <strong style={{ color: colors.accent }}>What to Watch:</strong> Notice how when you increase the damping ratio, the oscillation amplitude decays faster. When you decrease it, the mass bounces more times before settling. Try adjusting the slider to see what happens at the critical point (ζ = 1).
          </p>
        </div>

        {/* Main response graph first (primary SVG) */}
        <ResponseGraph />

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '24px',
          marginBottom: '24px',
          marginTop: '16px',
        }}>
          <OscillatorVis disp={displacement} color={dampInfo.color} />
        </div>

        {/* Controls */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '600px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: colors.textSecondary }}>Damping Ratio (ζ)</span>
              <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                {dampingRatio.toFixed(2)} - {dampInfo.label} ({dampingRatio < 1 ? `${(2 * Math.sqrt(1 - dampingRatio * dampingRatio) / (2 * Math.PI)).toFixed(2)} Hz` : '0 Hz'} oscillation)
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="2.5"
              step="0.05"
              value={dampingRatio}
              onChange={(e) => setDampingRatio(parseFloat(e.target.value))}
              style={{ height: '20px', touchAction: 'pan-y', width: '100%', cursor: 'pointer', accentColor: colors.accent }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: '#7dd3fc' }}>0.05 (Underdamped)</span>
              <span style={{ ...typo.small, color: '#6ee7b7' }}>Critical (ζ=1)</span>
              <span style={{ ...typo.small, color: '#fdba74' }}>2.5 (Overdamped)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={startSimulation}
              disabled={isSimulating}
              style={{
                flex: 1,
                padding: '16px',
                background: isSimulating ? colors.border : colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: isSimulating ? 'default' : 'pointer',
                minHeight: '44px',
              }}
            >
              {isSimulating ? 'Oscillating...' : 'Release Mass'}
            </button>
            <div style={{
              padding: '16px',
              background: colors.bgSecondary,
              borderRadius: '8px',
              textAlign: 'center',
              minWidth: '100px',
            }}>
              <div style={{ color: colors.textPrimary, fontWeight: 700, fontSize: '20px' }}>
                {simTime.toFixed(1)}s
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Time</div>
            </div>
          </div>
        </div>

        {/* Regime explanation */}
        <div style={{
          marginTop: '24px',
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          maxWidth: '600px',
          width: '100%',
          border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>The Three Damping Regimes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: dampingRatio < 0.95 ? `${colors.cyan}20` : 'transparent',
              border: dampingRatio < 0.95 ? `1px solid ${colors.cyan}` : `1px solid ${colors.border}`,
            }}>
              <span style={{ color: '#7dd3fc', fontWeight: 600 }}>ζ &lt; 1 Underdamped:</span>
              <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>Oscillates with exponentially decaying amplitude</span>
            </div>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: dampingRatio >= 0.95 && dampingRatio <= 1.05 ? `${colors.success}20` : 'transparent',
              border: dampingRatio >= 0.95 && dampingRatio <= 1.05 ? `1px solid ${colors.success}` : `1px solid ${colors.border}`,
            }}>
              <span style={{ color: '#6ee7b7', fontWeight: 600 }}>ζ = 1 Critical:</span>
              <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>Fastest return to equilibrium without oscillation</span>
            </div>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: dampingRatio > 1.05 ? `${colors.orange}20` : 'transparent',
              border: dampingRatio > 1.05 ? `1px solid ${colors.orange}` : `1px solid ${colors.border}`,
            }}>
              <span style={{ color: '#fdba74', fontWeight: 600 }}>ζ &gt; 1 Overdamped:</span>
              <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>Slow, creeping return without oscillation</span>
            </div>
          </div>
        </div>

        <button
          onClick={nextPhase}
          style={{
            marginTop: '24px',
            padding: '16px 48px',
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Review the Concepts
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
    }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
        Understanding Damped Oscillations
      </h2>

      {/* Reference user's prediction */}
      <div style={{
        background: prediction === 'B' ? `${colors.success}20` : `${colors.warning}20`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        maxWidth: '700px',
        border: `1px solid ${prediction === 'B' ? colors.success : colors.warning}40`,
      }}>
        <p style={{ ...typo.body, color: colors.textSecondary }}>
          {prediction === 'B'
            ? 'You correctly predicted that damping forces remove energy from the system! Now let\'s understand exactly how this works mathematically.'
            : prediction
              ? 'Earlier you thought gravity or spring elasticity was the key. Actually, damping forces are what remove energy from oscillating systems. Let\'s see why this matters.'
              : 'As you observed in the experiment, damping forces remove energy from the oscillating system. Your prediction is now being validated by the physics. Let\'s understand exactly how this works mathematically.'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '20px',
        maxWidth: '800px',
        width: '100%',
      }}>
        {/* Governing Equation */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.cyan}20, ${colors.accent}20)`,
          borderRadius: '16px',
          padding: '24px',
          border: `1px solid ${colors.cyan}40`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.cyan, marginBottom: '16px' }}>The Governing Equation</h3>
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            fontFamily: 'monospace',
            marginBottom: '16px',
          }}>
            <span style={{ color: colors.textPrimary, fontSize: '18px' }}>m(d²x/dt²) + c(dx/dt) + kx = 0</span>
          </div>
          <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.textPrimary }}>m</strong> = mass (provides inertia)</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.textPrimary }}>c</strong> = damping coefficient (resistance to motion)</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.textPrimary }}>k</strong> = spring constant (restoring force)</li>
            <li><strong style={{ color: colors.textPrimary }}>c(dx/dt)</strong> = damping force (opposes velocity)</li>
          </ul>
        </div>

        {/* Damping Ratio */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.success}20, ${colors.accent}20)`,
          borderRadius: '16px',
          padding: '24px',
          border: `1px solid ${colors.success}40`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '16px' }}>The Damping Ratio</h3>
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            fontFamily: 'monospace',
            marginBottom: '16px',
          }}>
            <span style={{ color: colors.textPrimary, fontSize: '18px' }}>ζ = c / (2√(mk))</span>
          </div>
          <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.cyan }}>ζ &lt; 1</strong>: Underdamped (oscillates)</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.success }}>ζ = 1</strong>: Critical (fastest settling)</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.orange }}>ζ &gt; 1</strong>: Overdamped (sluggish)</li>
            <li>Engineers tune ζ for desired behavior</li>
          </ul>
        </div>

        {/* Energy Dissipation */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.warning}20, ${colors.accent}20)`,
          borderRadius: '16px',
          padding: '24px',
          border: `1px solid ${colors.warning}40`,
          gridColumn: isMobile ? '1' : '1 / -1',
        }}>
          <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>Energy Dissipation</h3>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Without Damping:</strong> Energy oscillates forever between kinetic (½mv²) and potential (½kx²).
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                <strong style={{ color: colors.textPrimary }}>With Damping:</strong> Energy is continuously removed by the damping force.
              </p>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              fontFamily: 'monospace',
            }}>
              <div style={{ color: colors.textMuted, marginBottom: '4px', fontSize: '12px' }}>Power dissipated</div>
              <span style={{ color: colors.textPrimary, fontSize: '18px' }}>P = c × v²</span>
            </div>
          </div>
          <p style={{ ...typo.small, color: colors.accent, marginTop: '16px' }}>
            This power becomes heat in shock absorbers, electrical resistance in eddy-current dampers, or sound in acoustic systems.
          </p>
        </div>
      </div>

      <button
        onClick={nextPhase}
        style={{
          marginTop: '32px',
          padding: '16px 48px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '44px',
        }}
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => {
    const options = [
      { id: 'A', text: 'Critical damping (ζ = 1) is too expensive to manufacture precisely' },
      { id: 'B', text: 'Underdamping makes the needle move faster to new readings' },
      { id: 'C', text: 'A slight overshoot helps users visually identify the final position', correct: true },
      { id: 'D', text: 'Overdamping looks more professional and scientific' }
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        minHeight: '80vh',
      }}>
        <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '24px', textAlign: 'center' }}>
          The Twist Challenge
        </h2>

        {/* SVG showing comparison of critical vs slightly underdamped */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.warning}40`,
        }}>
          <svg width={isMobile ? 320 : 400} height={220} viewBox={`0 0 ${isMobile ? 320 : 400} 220`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="twistPredGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.warning} />
                <stop offset="100%" stopColor={colors.accent} />
              </linearGradient>
            </defs>
            <text x={(isMobile ? 320 : 400) / 2} y="20" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="700">Comparison: ζ = 0.7 vs ζ = 1.0</text>
            {/* Grid */}
            <line x1="50" y1="35" x2="50" y2="180" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="50" y1="110" x2={(isMobile ? 300 : 380)} y2="110" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="50" y1="70" x2={(isMobile ? 300 : 380)} y2="70" stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
            <line x1="50" y1="150" x2={(isMobile ? 300 : 380)} y2="150" stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
            {/* Critical damping curve (ζ=1) */}
            <path
              d={`M50 40 ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const y = (1 + 2 * t) * Math.exp(-2 * t);
                const xp = 50 + (t / 10) * ((isMobile ? 250 : 330));
                return `L${xp} ${110 - y * 70}`;
              }).join(' ')}`}
              fill="none" stroke={colors.success} strokeWidth="2.5"
            />
            {/* ζ=0.7 curve with slight overshoot */}
            <path
              d={`M50 40 ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const wd = 2 * Math.sqrt(1 - 0.49);
                const y = Math.exp(-0.7 * 2 * t) * Math.cos(wd * t);
                const xp = 50 + (t / 10) * ((isMobile ? 250 : 330));
                return `L${xp} ${110 - y * 70}`;
              }).join(' ')}`}
              fill="none" stroke={colors.cyan} strokeWidth="2.5"
            />
            <text x="15" y="75" fill={colors.textSecondary} fontSize="11">Amplitude</text>
            <text x={(isMobile ? 270 : 350)} y="125" fill={colors.textSecondary} fontSize="11">Time</text>
            {/* Legend */}
            <rect x="60" y="190" width="12" height="8" fill={colors.cyan} rx="2" />
            <text x="78" y="198" fill={colors.textSecondary} fontSize="11">ζ = 0.7 (slight overshoot)</text>
            <rect x={(isMobile ? 200 : 240)} y="190" width="12" height="8" fill={colors.success} rx="2" />
            <text x={(isMobile ? 218 : 258)} y="198" fill={colors.textSecondary} fontSize="11">ζ = 1.0 (critical)</text>
          </svg>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          marginBottom: '24px',
          border: `1px solid ${colors.warning}40`,
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            You're designing a precision analog voltmeter. The needle must move to show new readings, then settle quickly so users can read the value accurately.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            Mathematically, critical damping (ζ = 1) provides the fastest settling time. But experienced engineers often choose <strong style={{ color: colors.accent }}>ζ ≈ 0.7</strong> instead.
          </p>
          <p style={{ ...typo.body, color: colors.warning, fontWeight: 500 }}>
            Why would engineers deliberately choose "imperfect" damping?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '600px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setTwistPrediction(opt.id);
                playSound(opt.correct ? 'success' : 'failure');
              }}
              disabled={twistPrediction !== null}
              style={{
                padding: '16px 20px',
                background: twistPrediction === opt.id
                  ? opt.correct ? `${colors.success}30` : `${colors.error}30`
                  : twistPrediction !== null && opt.correct
                    ? `${colors.success}30`
                    : colors.bgCard,
                border: `2px solid ${
                  twistPrediction === opt.id
                    ? opt.correct ? colors.success : colors.error
                    : twistPrediction !== null && opt.correct
                      ? colors.success
                      : colors.border
                }`,
                borderRadius: '12px',
                color: colors.textPrimary,
                textAlign: 'left',
                cursor: twistPrediction !== null ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: twistPrediction !== null && twistPrediction !== opt.id && !opt.correct ? 0.5 : 1,
              }}
            >
              <span style={{ fontWeight: 700, marginRight: '12px', color: colors.warning }}>{opt.id}.</span>
              {opt.text}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: colors.bgCard,
            borderRadius: '12px',
            maxWidth: '600px',
            border: `1px solid ${colors.success}`,
          }}>
            <p style={{ color: colors.success, fontWeight: 600, marginBottom: '8px' }}>
              The slight overshoot is actually useful!
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              At ζ ≈ 0.7, there's about 4% overshoot. This is small enough not to mislead readers, but visible enough that the human eye can clearly see when the needle has finished moving and settled on the final value. Pure critical damping approaches the final value so smoothly that it's hard to tell when motion has stopped.
            </p>
            <button
              onClick={nextPhase}
              style={{
                marginTop: '16px',
                padding: '12px 32px',
                background: `linear-gradient(135deg, ${colors.warning}, ${colors.orange})`,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              See the Difference
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => {
    const info1 = getDampingLabel(twistDamping1);
    const info2 = getDampingLabel(twistDamping2);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
      }}>
        <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '24px' }}>
          Comparing Damping Responses
        </h2>

        {/* Comparison response graph FIRST (primary SVG) - responds to both sliders */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`,
        }}>
          <svg width={isMobile ? 340 : 440} height={260} viewBox={`0 0 ${isMobile ? 340 : 440} 260`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="twistMarkerGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <text x={(isMobile ? 340 : 440) / 2} y="20" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="700">Response Comparison</text>
            {/* Axes */}
            <line x1="55" y1="35" x2="55" y2="220" stroke={colors.textMuted} strokeWidth="1.5" />
            <line x1="55" y1="127" x2={(isMobile ? 320 : 420)} y2="127" stroke={colors.textMuted} strokeWidth="1.5" />
            {/* Grid */}
            <line x1="55" y1="75" x2={(isMobile ? 320 : 420)} y2="75" stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
            <line x1="55" y1="180" x2={(isMobile ? 320 : 420)} y2="180" stroke={colors.border} strokeDasharray="4,4" opacity="0.4" />
            {[0.25, 0.5, 0.75].map(frac => (
              <line key={`tg-${frac}`} x1={55 + frac * ((isMobile ? 265 : 365))} y1="35" x2={55 + frac * ((isMobile ? 265 : 365))} y2="220" stroke={colors.border} strokeDasharray="4,4" opacity="0.3" />
            ))}
            {/* Axis labels */}
            <text x="15" y="130" fill={colors.textSecondary} fontSize="12" transform={`rotate(-90, 15, 130)`} textAnchor="middle">Amplitude</text>
            <text x={(isMobile ? 190 : 240)} y="245" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Time (s)</text>
            <text x="45" y="39" textAnchor="end" fill={colors.textMuted} fontSize="11">+1</text>
            <text x="45" y="131" textAnchor="end" fill={colors.textMuted} fontSize="11">0</text>
            <text x="45" y="224" textAnchor="end" fill={colors.textMuted} fontSize="11">-1</text>
            {/* System A curve */}
            <path
              d={`M55 ${127 - 85} ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const omega_n = 2;
                let y: number;
                if (twistDamping1 < 1) {
                  const wd = omega_n * Math.sqrt(1 - twistDamping1 * twistDamping1);
                  y = Math.exp(-twistDamping1 * omega_n * t) * Math.cos(wd * t);
                } else if (twistDamping1 === 1) {
                  y = (1 + omega_n * t) * Math.exp(-omega_n * t);
                } else {
                  const s1r = -omega_n * (twistDamping1 - Math.sqrt(twistDamping1 * twistDamping1 - 1));
                  const s2r = -omega_n * (twistDamping1 + Math.sqrt(twistDamping1 * twistDamping1 - 1));
                  y = (s2r / (s2r - s1r)) * Math.exp(s1r * t) + (-s1r / (s2r - s1r)) * Math.exp(s2r * t);
                }
                const xp = 55 + (t / 10) * ((isMobile ? 265 : 365));
                return `L${xp} ${127 - y * 85}`;
              }).join(' ')}`}
              fill="none" stroke={info1.color} strokeWidth="2.5"
            />
            {/* System B curve */}
            <path
              d={`M55 ${127 - 85} ${Array.from({length: 50}, (_, i) => {
                const t = i * 0.2;
                const omega_n = 2;
                let y: number;
                if (twistDamping2 < 1) {
                  const wd = omega_n * Math.sqrt(1 - twistDamping2 * twistDamping2);
                  y = Math.exp(-twistDamping2 * omega_n * t) * Math.cos(wd * t);
                } else if (twistDamping2 === 1) {
                  y = (1 + omega_n * t) * Math.exp(-omega_n * t);
                } else {
                  const s1r = -omega_n * (twistDamping2 - Math.sqrt(twistDamping2 * twistDamping2 - 1));
                  const s2r = -omega_n * (twistDamping2 + Math.sqrt(twistDamping2 * twistDamping2 - 1));
                  y = (s2r / (s2r - s1r)) * Math.exp(s1r * t) + (-s1r / (s2r - s1r)) * Math.exp(s2r * t);
                }
                const xp = 55 + (t / 10) * ((isMobile ? 265 : 365));
                return `L${xp} ${127 - y * 85}`;
              }).join(' ')}`}
              fill="none" stroke={info2.color} strokeWidth="2.5" strokeDasharray="6,3"
            />
            {/* Interactive markers at t=2s */}
            {(() => {
              const omega_n = 2;
              const t2 = 2.0;
              let y1: number;
              if (twistDamping1 < 1) { const wd = omega_n * Math.sqrt(1 - twistDamping1 * twistDamping1); y1 = Math.exp(-twistDamping1 * omega_n * t2) * Math.cos(wd * t2); }
              else if (twistDamping1 === 1) { y1 = (1 + omega_n * t2) * Math.exp(-omega_n * t2); }
              else { const s1r = -omega_n * (twistDamping1 - Math.sqrt(twistDamping1 * twistDamping1 - 1)); const s2r = -omega_n * (twistDamping1 + Math.sqrt(twistDamping1 * twistDamping1 - 1)); y1 = (s2r / (s2r - s1r)) * Math.exp(s1r * t2) + (-s1r / (s2r - s1r)) * Math.exp(s2r * t2); }
              let y2: number;
              if (twistDamping2 < 1) { const wd = omega_n * Math.sqrt(1 - twistDamping2 * twistDamping2); y2 = Math.exp(-twistDamping2 * omega_n * t2) * Math.cos(wd * t2); }
              else if (twistDamping2 === 1) { y2 = (1 + omega_n * t2) * Math.exp(-omega_n * t2); }
              else { const s1r = -omega_n * (twistDamping2 - Math.sqrt(twistDamping2 * twistDamping2 - 1)); const s2r = -omega_n * (twistDamping2 + Math.sqrt(twistDamping2 * twistDamping2 - 1)); y2 = (s2r / (s2r - s1r)) * Math.exp(s1r * t2) + (-s1r / (s2r - s1r)) * Math.exp(s2r * t2); }
              const mx = 55 + (t2 / 10) * ((isMobile ? 265 : 365));
              return (
                <>
                  <circle cx={mx} cy={127 - y1 * 85} r="7" fill={info1.color} stroke="#ffffff" strokeWidth="2" filter="url(#twistMarkerGlow)" />
                  <circle cx={mx} cy={127 - y2 * 85} r="7" fill={info2.color} stroke="#ffffff" strokeWidth="2" filter="url(#twistMarkerGlow)" />
                </>
              );
            })()}
            {/* Legend */}
            <g>
              <rect x="65" y="230" width="12" height="8" fill={info1.color} rx="2" />
              <text x="83" y="238" fill={colors.textSecondary} fontSize="11">System A (ζ={twistDamping1.toFixed(1)})</text>
              <line x1={(isMobile ? 210 : 260)} y1="234" x2={(isMobile ? 230 : 280)} y2="234" stroke={info2.color} strokeWidth="2" strokeDasharray="6,3" />
              <text x={(isMobile ? 235 : 285)} y="238" fill={colors.textSecondary} fontSize="11">System B (ζ={twistDamping2.toFixed(1)})</text>
            </g>
          </svg>
        </div>

        {/* Slider controls */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '24px',
          marginBottom: '24px',
        }}>
          {/* System 1 slider */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: info1.color, fontSize: '14px', fontWeight: 600 }}>System A: ζ = {twistDamping1.toFixed(1)} - {info1.label}</span>
            </div>
            <div>
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>0.1</span>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={twistDamping1}
                onChange={(e) => setTwistDamping1(parseFloat(e.target.value))}
                style={{ touchAction: 'pan-y', width: '150px', height: '20px', cursor: 'pointer', accentColor: info1.color }}
              />
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>2.0</span>
            </div>
          </div>

          {/* System 2 slider */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: info2.color, fontSize: '14px', fontWeight: 600 }}>System B: ζ = {twistDamping2.toFixed(1)} - {info2.label}</span>
            </div>
            <div>
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>0.1</span>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={twistDamping2}
                onChange={(e) => setTwistDamping2(parseFloat(e.target.value))}
                style={{ touchAction: 'pan-y', width: '150px', height: '20px', cursor: 'pointer', accentColor: info2.color }}
              />
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>2.0</span>
            </div>
          </div>
        </div>

        {/* Oscillator animations - secondary visualization */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '24px',
          marginBottom: '24px',
        }}>
          <OscillatorVis disp={twistDisp1} color={info1.color} label={`System A: ζ = ${twistDamping1.toFixed(1)}`} />
          <OscillatorVis disp={twistDisp2} color={info2.color} label={`System B: ζ = ${twistDamping2.toFixed(1)}`} />
        </div>

        <button
          onClick={startTwistSimulation}
          disabled={twistSimulating}
          style={{
            padding: '16px 48px',
            background: twistSimulating ? colors.border : colors.warning,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: twistSimulating ? 'default' : 'pointer',
            marginBottom: '24px',
            minHeight: '44px',
          }}
        >
          {twistSimulating ? `Comparing... ${twistTime.toFixed(1)}s` : 'Release Both Masses'}
        </button>

        {/* Insight panel */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.warning}20, ${colors.accent}20)`,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          border: `1px solid ${colors.warning}40`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>The 4% Overshoot Rule</h3>
          <ul style={{ ...typo.body, color: colors.textSecondary, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>At ζ ≈ 0.7, overshoot is about 4-5% of the step change</li>
            <li style={{ marginBottom: '8px' }}>Rise time is actually faster than critical damping!</li>
            <li style={{ marginBottom: '8px' }}>The overshoot provides a visual cue that settling has occurred</li>
            <li>Used in control systems, meters, and user interface animations</li>
          </ul>
          <p style={{ ...typo.small, color: colors.accent, marginTop: '16px' }}>
            Try setting one system to ζ = 0.7 and another to ζ = 1.0 to see the difference in visual clarity.
          </p>
        </div>

        <button
          onClick={nextPhase}
          style={{
            marginTop: '24px',
            padding: '16px 48px',
            background: `linear-gradient(135deg, ${colors.warning}, ${colors.orange})`,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Review This Discovery
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
    }}>
      <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '24px' }}>
        Key Discovery: Context Determines "Optimal"
      </h2>

      <div style={{
        background: `linear-gradient(135deg, ${colors.warning}20, ${colors.accent}20)`,
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '700px',
        border: `1px solid ${colors.warning}40`,
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px',
        }}>
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h4 style={{ color: colors.success, fontWeight: 600, marginBottom: '12px' }}>Use Critical Damping (ζ = 1)</h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '16px' }}>
              <li>Automated control systems</li>
              <li>Digital sensor readings</li>
              <li>Robotic positioning</li>
              <li>Emergency shutoff valves</li>
              <li>When machines read values</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h4 style={{ color: colors.cyan, fontWeight: 600, marginBottom: '12px' }}>Use Slight Underdamping (ζ ≈ 0.7)</h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '16px' }}>
              <li>Analog meter needles</li>
              <li>User interface animations</li>
              <li>Vehicle suspension feel</li>
              <li>Audio speaker response</li>
              <li>When humans observe values</li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: colors.bgCard,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <p style={{ color: colors.success, fontWeight: 600 }}>
            Engineering is about choosing the right trade-off for each situation!
          </p>
        </div>
      </div>

      <button
        onClick={nextPhase}
        style={{
          padding: '16px 48px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '44px',
        }}
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          Real-World Applications
        </h2>

        {/* App selector */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => setSelectedApp(i)}
              style={{
                padding: '12px 20px',
                background: selectedApp === i ? app.color : colors.bgCard,
                border: `2px solid ${selectedApp === i ? app.color : completedApps[i] ? colors.success : colors.border}`,
                borderRadius: '12px',
                color: colors.textPrimary,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '44px',
              }}
            >
              <span>{a.icon}</span>
              <span style={{ display: isMobile ? 'none' : 'inline' }}>{a.title.split(' ')[0]}</span>
              {completedApps[i] && <span style={{ color: colors.success }}>✓</span>}
            </button>
          ))}
        </div>

        {/* App content */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '700px',
          width: '100%',
          border: `1px solid ${app.color}40`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <span style={{ fontSize: '48px' }}>{app.icon}</span>
            <div>
              <h3 style={{ ...typo.h3, color: colors.textPrimary }}>{app.title}</h3>
              <p style={{ ...typo.small, color: app.color }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
            {app.description}
          </p>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.cyan, fontWeight: 600, marginBottom: '8px' }}>Physics Connection</h4>
            <p style={{ ...typo.small, color: colors.textSecondary }}>{app.connection}</p>
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '8px' }}>How It Works</h4>
            <p style={{ ...typo.small, color: colors.textSecondary }}>{app.howItWorks}</p>
          </div>

          {/* Stats */}
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
                <div style={{ color: colors.textPrimary, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples & Companies */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.warning, fontWeight: 600, marginBottom: '8px' }}>Examples</h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '16px', margin: 0 }}>
                {app.examples.slice(0, 3).map((ex, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '8px' }}>Leading Companies</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {app.companies.map((co, i) => (
                  <span key={i} style={{
                    background: colors.bgCard,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: colors.textSecondary,
                  }}>{co}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Future Impact */}
          <div style={{
            background: `linear-gradient(135deg, ${app.color}20, ${colors.accent}20)`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: app.color, fontWeight: 600, marginBottom: '4px' }}>Future Impact</h4>
            <p style={{ ...typo.small, color: colors.textSecondary }}>{app.futureImpact}</p>
          </div>

          {/* Mark complete button */}
          {!completedApps[selectedApp] && (
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: colors.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Mark as Understood
            </button>
          )}
          {/* Got It button for transfer phase navigation */}
          <button
            onClick={nextPhase}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Got It
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: colors.textSecondary }}>Progress:</span>
          {completedApps.map((c, i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: c ? colors.success : colors.border,
              }}
            />
          ))}
          <span style={{ color: colors.textSecondary }}>{completedApps.filter(c => c).length}/4</span>
        </div>

        {allCompleted && (
          <button
            onClick={nextPhase}
            style={{
              marginTop: '24px',
              padding: '16px 48px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;
    const allAnswered = testAnswers.every(a => a !== null);

    if (testSubmitted) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
        }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Test Results
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '16px',
            }}>
              {testScore >= 7 ? '🎉' : testScore >= 5 ? '📚' : '💪'}
            </div>
            <h3 style={{ ...typo.h2, color: testScore >= 7 ? colors.success : colors.warning }}>
              {testScore}/10 Correct
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px' }}>
              {testScore >= 7
                ? 'Excellent! You have mastered damped oscillations!'
                : testScore >= 5
                  ? 'Good progress! Review the concepts and try again.'
                  : 'Keep studying! The physics will click with practice.'}
            </p>
          </div>

          {/* Review answers */}
          <div style={{ maxWidth: '600px', width: '100%' }}>
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[i];
              const correctAnswer = q.options.find(o => o.correct)?.id;
              const isCorrect = userAnswer === correctAnswer;

              return (
                <div key={i} style={{
                  background: isCorrect ? `${colors.success}20` : `${colors.error}20`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{isCorrect ? '✓' : '✗'}</span>
                    Q{i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '4px' }}>
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {testScore >= 7 ? (
            <button
              onClick={() => {
                playSound('complete');
                goToPhase('mastery');
              }}
              style={{
                marginTop: '24px',
                padding: '16px 48px',
                background: `linear-gradient(135deg, ${colors.success}, ${colors.accent})`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => {
                setTestAnswers(Array(10).fill(null));
                setTestSubmitted(false);
                setCurrentQuestion(0);
                goToPhase('review');
              }}
              style={{
                marginTop: '24px',
                padding: '16px 48px',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Review and Try Again
            </button>
          )}
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Knowledge Assessment
        </h2>
        <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>
          Question {currentQuestion + 1} of 10
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
          {testAnswers.map((a, i) => (
            <div
              key={i}
              onClick={() => setCurrentQuestion(i)}
              style={{
                width: currentQuestion === i ? '24px' : '10px',
                height: '10px',
                borderRadius: '5px',
                background: a !== null ? colors.accent : colors.border,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          border: `1px solid ${colors.border}`,
        }}>
          {/* Scenario */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontStyle: 'italic',
          }}>
            <p style={{ ...typo.small, color: colors.cyan }}>{question.scenario}</p>
          </div>

          {/* Question */}
          <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px', fontWeight: 500 }}>
            {question.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                  playSound('click');
                }}
                style={{
                  padding: '14px 16px',
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}30` : colors.bgSecondary,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
              >
                <span style={{ fontWeight: 600, marginRight: '8px', color: colors.accent }}>{opt.id.toUpperCase()}.</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              style={{
                padding: '12px 24px',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
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
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={!answered}
              style={{
                padding: '12px 24px',
                background: answered ? colors.accent : colors.border,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: answered ? 'pointer' : 'default',
                minHeight: '44px',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                const score = testAnswers.reduce((acc, answer, i) => {
                  const correct = testQuestions[i].options.find(o => o.correct)?.id;
                  return acc + (answer === correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setTestSubmitted(true);
              }}
              disabled={!allAnswered}
              style={{
                padding: '12px 32px',
                background: allAnswered ? colors.success : colors.border,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                cursor: allAnswered ? 'pointer' : 'default',
                minHeight: '44px',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.accent}30, ${colors.cyan}30, ${colors.success}30)`,
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '600px',
        border: `2px solid ${colors.success}`,
      }}>
        <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Damped Oscillations Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
          You've mastered the physics of damped harmonic motion - from the governing equation to real-world engineering applications.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>ζ</div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Damping Ratio</p>
          </div>
          <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Energy Dissipation</p>
          </div>
          <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚗</div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Suspension Systems</p>
          </div>
          <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏗️</div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Seismic Protection</p>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ ...typo.small, color: colors.cyan }}>
            <strong>Key Insight:</strong> The damping ratio ζ = c/(2√mk) determines whether systems oscillate (ζ&lt;1), settle optimally (ζ=1), or respond sluggishly (ζ&gt;1). Engineers choose the right ζ for each application.
          </p>
        </div>

        <button
          onClick={() => goToPhase('hook')}
          style={{
            padding: '12px 32px',
            background: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.textSecondary,
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Explore Again
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Damped Oscillations"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradients */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: isMobile ? '250px' : '400px',
        height: isMobile ? '250px' : '400px',
        background: `radial-gradient(circle, ${colors.accent}10, transparent)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: `radial-gradient(circle, ${colors.cyan}10, transparent)`,
        pointerEvents: 'none',
      }} />

      {renderProgressBar()}

      <div style={{ position: 'relative', zIndex: 10, paddingTop: '80px', paddingBottom: '16px', overflowY: 'auto', flex: 1, minHeight: '100dvh' }}>
        {renderPhaseIndicators()}
        {renderPhase()}
      </div>

      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 1003,
      }}>
        <button
          onClick={() => {
            const idx = phaseOrder.indexOf(phase);
            if (idx > 0) goToPhase(phaseOrder[idx - 1]);
          }}
          disabled={phase === 'hook'}
          style={{
            padding: '10px 24px',
            background: phase === 'hook' ? colors.border : colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: phase === 'hook' ? colors.textMuted : colors.textPrimary,
            cursor: phase === 'hook' ? 'default' : 'pointer',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '13px' }}>
          {phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={nextPhase}
          disabled={phase === 'mastery'}
          style={{
            padding: '10px 24px',
            background: phase === 'mastery' ? colors.border : `linear-gradient(135deg, ${colors.accent}, ${colors.cyan})`,
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: phase === 'mastery' ? 'default' : 'pointer',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </nav>
    </div>
  );
};

export default DampedOscillationsRenderer;
