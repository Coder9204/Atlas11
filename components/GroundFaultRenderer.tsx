'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Ground Fault Detection - Complete 10-Phase Game
// How GFCIs detect current imbalance and protect against electrocution
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

interface GroundFaultRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A homeowner is using a hair dryer in their bathroom when the cord gets wet from splashed water. Suddenly, the GFCI outlet trips and cuts power before anyone feels a shock.",
    question: "What did the GFCI detect that caused it to trip?",
    options: [
      { id: 'a', label: "The hair dryer drew too much current, exceeding the outlet's capacity" },
      { id: 'b', label: "An imbalance between hot and neutral current, indicating leakage to ground", correct: true },
      { id: 'c', label: "High voltage on the line due to the wet cord" },
      { id: 'd', label: "Excessive heat from the hair dryer motor" }
    ],
    explanation: "GFCIs continuously compare the current flowing through the hot wire to the current returning through the neutral wire. When water created a leakage path, some current escaped to ground instead of returning through neutral. This imbalance (as little as 5 milliamps) triggers the GFCI to trip within 25 milliseconds, preventing electrocution."
  },
  {
    scenario: "An electrician is explaining GFCI protection to an apprentice. They describe how in a normal, healthy circuit, all current that flows out through the hot wire must return through the neutral wire.",
    question: "In a properly functioning 120V circuit with no faults, if 10 amps flows through the hot wire, how much current returns through the neutral wire?",
    options: [
      { id: 'a', label: "Less than 10 amps, because some is lost to heat" },
      { id: 'b', label: "Exactly 10 amps - all current must return through neutral", correct: true },
      { id: 'c', label: "More than 10 amps due to back-EMF from the load" },
      { id: 'd', label: "It varies depending on the type of load" }
    ],
    explanation: "Conservation of charge requires that all current leaving the source must return to the source. In a healthy circuit with no ground faults, every electron that flows out through the hot wire must return through the neutral wire. A GFCI uses this principle - any difference between hot and neutral current means current is escaping through an unintended path."
  },
  {
    scenario: "A new pool pump is being installed. The electrician connects it to a GFCI-protected circuit. During testing, the GFCI keeps tripping even though the pump appears to work fine.",
    question: "What is the most likely cause of the nuisance tripping?",
    options: [
      { id: 'a', label: "The pump motor has a small insulation leak allowing a few milliamps to ground", correct: true },
      { id: 'b', label: "The GFCI is defective and needs replacement" },
      { id: 'c', label: "Pool pumps are incompatible with GFCI protection" },
      { id: 'd', label: "The pump is drawing more power than the GFCI can handle" }
    ],
    explanation: "Many motors, especially when new, have minor insulation imperfections that allow small leakage currents (1-3 mA) to flow to the equipment ground. While not dangerous by themselves, these currents accumulate. A motor with 3 mA leakage on a circuit with other equipment leaking 2 mA totals 5 mA - the GFCI trip threshold. This is why some equipment requires special GFCI-compatible designs."
  },
  {
    scenario: "During a safety inspection, an inspector tests GFCI outlets by pressing the TEST button. One outlet's TEST button trips it, but the RESET button won't stay engaged when pressed.",
    question: "What does this indicate about the GFCI's condition?",
    options: [
      { id: 'a', label: "The outlet is functioning perfectly and is extra safe" },
      { id: 'b', label: "There is an actual ground fault on the circuit that must be cleared first", correct: true },
      { id: 'c', label: "The RESET button spring is broken" },
      { id: 'd', label: "The outlet needs more voltage to reset" }
    ],
    explanation: "Modern GFCIs include a lock-out feature: if they detect an actual ground fault condition when you try to reset, they refuse to reset. This prevents users from restoring power to a genuinely faulted circuit. The cause could be damaged wiring, a faulty appliance, or moisture in a junction box. The fault must be identified and cleared before the GFCI will reset."
  },
  {
    scenario: "A laboratory uses sensitive electronic equipment that occasionally causes GFCI outlets to trip unexpectedly. The lab manager asks about alternatives that provide ground fault protection without false trips.",
    question: "What characteristic of some electronic equipment causes nuisance GFCI trips?",
    options: [
      { id: 'a', label: "High-frequency components in their power draw can appear as ground faults to standard GFCIs", correct: true },
      { id: 'b', label: "Electronic equipment uses DC power which GFCIs cannot measure" },
      { id: 'c', label: "Computers emit radio waves that interfere with GFCI sensors" },
      { id: 'd', label: "Electronic equipment grounds are different from standard grounds" }
    ],
    explanation: "Switching power supplies in computers and lab equipment create high-frequency electrical noise. Some of this noise couples to ground through parasitic capacitance in power supplies and cables. While not a true ground fault, standard GFCIs may interpret this high-frequency current as leakage. Special GFCI designs with high-frequency filtering or equipment isolation transformers can solve this problem."
  },
  {
    scenario: "A utility worker finds a downed power line lying on wet grass. The line is still energized at 7,200 volts, but the protection system hasn't tripped because only 50 amps is flowing through the fault.",
    question: "Why hasn't the substation breaker tripped even though the line is on the ground?",
    options: [
      { id: 'a', label: "50 amps is below the overcurrent pickup setting for the feeder; high-impedance ground faults are difficult to detect", correct: true },
      { id: 'b', label: "The breaker is faulty and needs maintenance" },
      { id: 'c', label: "Ground faults don't affect utility-scale equipment" },
      { id: 'd', label: "The grass is providing sufficient insulation" }
    ],
    explanation: "High-impedance ground faults are extremely dangerous. Wet grass, soil, or pavement provides enough resistance to limit fault current below the overcurrent relay pickup (often 400-600 amps). Yet 50 amps at 7,200V is still 360 kW - enough to electrocute people and start fires. Detecting these faults requires specialized ground fault relays or waveform analysis, not simple overcurrent protection."
  },
  {
    scenario: "A building's electrical system uses 480V three-phase power with a high-resistance grounded neutral. A ground fault occurs on one phase, but the system continues operating normally with just an alarm.",
    question: "What is the advantage of high-resistance grounding that allows continued operation during a ground fault?",
    options: [
      { id: 'a', label: "It prevents any current from flowing during a ground fault" },
      { id: 'b', label: "It limits ground fault current to safe levels while maintaining production; the first fault becomes a monitored condition", correct: true },
      { id: 'c', label: "It eliminates the need for ground fault protection entirely" },
      { id: 'd', label: "It automatically fixes ground faults through self-healing" }
    ],
    explanation: "High-resistance grounding (HRG) intentionally limits ground fault current to typically 5-10 amps by inserting a resistor between the neutral and ground. This prevents arc flash and equipment damage while allowing the system to continue operating. However, a second ground fault on a different phase would create a phase-to-phase fault through ground, so the first fault must be located and repaired promptly."
  },
  {
    scenario: "An arc-fault circuit interrupter (AFCI) breaker trips in a bedroom circuit. Investigation reveals a damaged lamp cord where insulation has worn through and conductors are nearly touching but not quite making contact.",
    question: "How does an AFCI detect this hazard differently from how a GFCI would?",
    options: [
      { id: 'a', label: "AFCIs measure temperature while GFCIs measure current" },
      { id: 'b', label: "AFCIs detect the unique electrical signature of arcing (high-frequency chaos) while GFCIs detect current imbalance to ground", correct: true },
      { id: 'c', label: "AFCIs are more sensitive versions of GFCIs" },
      { id: 'd', label: "AFCIs only work on bedroom circuits" }
    ],
    explanation: "Arc faults produce a distinctive electrical signature: random, chaotic current spikes at 10-100 kHz as electricity jumps across the air gap. AFCIs use microprocessors to analyze current waveforms and distinguish dangerous arcing from normal arcing (like switch contacts). A GFCI wouldn't detect this hazard because no current is flowing to ground - it's arcing between hot and neutral or hot and hot."
  },
  {
    scenario: "A solar panel installation on a residential roof includes ground fault detection in the inverter. A fault develops in the wiring between panels, but it goes undetected for weeks until a fire starts.",
    question: "Why are ground faults in DC photovoltaic systems particularly dangerous and difficult to detect?",
    options: [
      { id: 'a', label: "DC systems don't have ground faults" },
      { id: 'b', label: "DC arcs can sustain at lower currents than AC arcs, and distributed PV systems have many potential fault points across large areas", correct: true },
      { id: 'c', label: "Solar panels automatically prevent ground faults" },
      { id: 'd', label: "Inverters convert DC ground faults into AC before detection" }
    ],
    explanation: "AC arcs naturally extinguish 120 times per second as voltage crosses zero. DC arcs have no zero crossings and can sustain at much lower currents. A DC arc at just 1-2 amps can generate enough heat to ignite roofing materials. Additionally, PV systems spread across rooftops with many connection points and long wire runs, creating numerous potential fault locations that are difficult to pinpoint."
  },
  {
    scenario: "A hospital's operating room has an isolated power system with a line isolation monitor (LIM) that shows 2.5 milliamps of hazard current. The anesthesiologist asks if this is dangerous.",
    question: "What does the line isolation monitor's hazard current reading indicate?",
    options: [
      { id: 'a', label: "2.5 mA is currently flowing through a patient" },
      { id: 'b', label: "If a ground fault occurred, up to 2.5 mA would flow - this is the system's total leakage capacity and should be monitored", correct: true },
      { id: 'c', label: "The power system has 2.5 mA of excess capacity" },
      { id: 'd', label: "An alarm will sound if current drops below 2.5 mA" }
    ],
    explanation: "Isolated power systems in operating rooms separate the power supply from ground using an isolation transformer. The LIM continuously measures how much current WOULD flow if a ground fault occurred (hazard current), based on the system's total capacitive leakage to ground. At 2.5 mA, there's headroom before reaching the 5 mA alarm threshold. This gives early warning of degrading insulation before a dangerous first fault occurs."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏠',
    title: 'GFCI Outlets in Homes',
    short: 'The outlets that save lives near water',
    tagline: 'Trip in 25 milliseconds to prevent electrocution',
    description: 'GFCI outlets continuously compare hot and neutral current. If as little as 5 mA difference is detected (indicating current flowing through a person to ground), the outlet trips in under 25 milliseconds - fast enough to prevent fatal electrocution.',
    connection: 'The current imbalance detection you explored is exactly what GFCIs do: a toroidal transformer senses the difference between outgoing and returning current, triggering a trip when they do not match.',
    howItWorks: 'Both hot and neutral wires pass through a toroidal current transformer. If currents are equal, net flux is zero. Any imbalance induces a voltage in the sensing coil, which triggers a solenoid to open the circuit instantly.',
    stats: [
      { value: '5 mA', label: 'Trip threshold', icon: '⚡' },
      { value: '<25 ms', label: 'Response time', icon: '⏱️' },
      { value: '300+', label: 'Lives saved/year', icon: '❤️' }
    ],
    examples: ['Bathroom outlets', 'Kitchen countertops', 'Outdoor receptacles', 'Pool equipment'],
    companies: ['Leviton', 'Eaton', 'Hubbell', 'Legrand'],
    futureImpact: 'Smart GFCIs will report fault patterns and predict equipment degradation before dangerous faults occur.',
    color: '#EF4444'
  },
  {
    icon: '⚡',
    title: 'Arc Fault Circuit Interrupters',
    short: 'Preventing electrical fires from damaged wiring',
    tagline: 'Hearing the dangerous crackle in the current',
    description: 'Arc faults from damaged wiring cause 30,000+ home fires annually. AFCIs analyze current waveforms to detect the characteristic signature of dangerous arcing, tripping before wires ignite insulation.',
    connection: 'While GFCIs detect current imbalance to ground, AFCIs detect high-frequency noise and irregular current patterns of arcing - complementary protection technologies that together address most electrical hazards.',
    howItWorks: 'Microprocessors analyze current waveforms thousands of times per second. Algorithms distinguish dangerous arcing (damaged wires) from normal arcing (switch contacts, motor brushes). When dangerous patterns persist, the breaker trips.',
    stats: [
      { value: '30,000+', label: 'Fires prevented/yr', icon: '🔥' },
      { value: '8-15 kHz', label: 'Arc signature', icon: '📊' },
      { value: '50%', label: 'Fire reduction', icon: '📉' }
    ],
    examples: ['Bedroom circuits', 'Living room outlets', 'Home theater wiring', 'Older home renovations'],
    companies: ['Siemens', 'Square D', 'Eaton', 'GE'],
    futureImpact: 'AI-enhanced AFCIs will learn each home\'s normal patterns, reducing nuisance trips while catching more dangerous faults.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Industrial Ground Fault Protection',
    short: 'Protecting motors and equipment from insulation breakdown',
    tagline: 'Catching faults before they become explosions',
    description: 'Industrial motors and equipment use ground fault relays to detect insulation degradation. Continuous monitoring catches small leakage currents before they escalate to arc flashes, equipment damage, or explosions.',
    connection: 'Industrial ground fault protection extends the current-balance principle to higher currents and adjustable thresholds, often using zero-sequence current transformers that measure the sum of all three phase currents.',
    howItWorks: 'Zero-sequence CTs encircle all three phase conductors. In a balanced system, the magnetic fields cancel. Any ground fault creates an imbalance detected by the relay. Settings allow different trip thresholds and time delays for coordination.',
    stats: [
      { value: '2,000+', label: 'Arc flash incidents/yr', icon: '⚡' },
      { value: '5-1200 A', label: 'Adjustable range', icon: '🎛️' },
      { value: '$15B', label: 'Annual fire losses', icon: '💰' }
    ],
    examples: ['Motor protection', 'Transformer monitoring', 'Mining equipment', 'Petrochemical plants'],
    companies: ['Schweitzer Engineering', 'ABB', 'Siemens', 'GE Grid'],
    futureImpact: 'Predictive monitoring will use insulation resistance trending to schedule maintenance before faults occur.',
    color: '#3B82F6'
  },
  {
    icon: '🔌',
    title: 'EV Charging Safety Systems',
    short: 'Protecting against faults in high-power charging',
    tagline: 'Safe charging from 240V to 800V',
    description: 'Electric vehicle chargers handle high currents (up to 350 kW) in outdoor, wet environments. Multiple layers of ground fault protection ensure charging is safe even if cables are damaged or connections get wet.',
    connection: 'EV charging combines DC ground fault monitoring for the high-voltage battery side with AC ground fault protection for the grid connection, using the same current-balance principles you have learned.',
    howItWorks: 'Chargers monitor ground fault current on both AC and DC sides. Pilot signals verify ground connection before energizing. Continuous insulation monitoring detects degradation. Any fault triggers immediate shutdown.',
    stats: [
      { value: '350 kW', label: 'DC fast charge power', icon: '⚡' },
      { value: '800V', label: 'Next-gen voltage', icon: '🔋' },
      { value: '<100 ms', label: 'Fault response', icon: '⏱️' }
    ],
    examples: ['Tesla Superchargers', 'Electrify America', 'Home Level 2 chargers', 'Fleet charging'],
    companies: ['Tesla', 'ChargePoint', 'ABB', 'Tritium'],
    futureImpact: 'Vehicle-to-grid systems will require bidirectional ground fault protection as EVs become mobile power sources.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GroundFaultRenderer: React.FC<GroundFaultRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [hotCurrent, setHotCurrent] = useState(10); // Amps flowing through load
  const [leakageCurrent, setLeakageCurrent] = useState(0); // mA escaping to ground
  const [gfciTripped, setGfciTripped] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - high impedance faults
  const [faultImpedance, setFaultImpedance] = useState(1000); // Ohms
  const [showArcingSparks, setShowArcingSparks] = useState(false);

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

  // GFCI trip logic
  useEffect(() => {
    if (leakageCurrent >= 5 && !gfciTripped) {
      setGfciTripped(true);
      playSound('failure');
    }
  }, [leakageCurrent, gfciTripped]);

  // Calculate derived values
  const neutralCurrent = hotCurrent - (leakageCurrent / 1000); // Neutral returns less when there's leakage
  const currentImbalance = leakageCurrent; // In mA
  const lineVoltage = 120; // V
  const highImpedanceFaultCurrent = (lineVoltage / faultImpedance) * 1000; // mA
  const canTripGFCI = highImpedanceFaultCurrent >= 5;
  const canTripBreaker = highImpedanceFaultCurrent >= 15000; // 15A breaker

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for electrical danger theme
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#2a2a3a',
    hot: '#EF4444',
    neutral: '#3B82F6',
    ground: '#10B981',
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
    twist_play: 'Explore Faults',
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
        gameType: 'ground-fault',
        gameTitle: 'Ground Fault Detection',
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

  // Get GFCI status
  const getGFCIStatus = () => {
    if (gfciTripped) return { status: 'TRIPPED', color: colors.error };
    if (currentImbalance >= 4) return { status: 'WARNING', color: colors.warning };
    if (currentImbalance > 0) return { status: 'MONITORING', color: colors.warning };
    return { status: 'NORMAL', color: colors.success };
  };

  const gfciStatus = getGFCIStatus();

  // Previous phase helper
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Navigation bar component
  const renderNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1 && phase !== 'test';

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: colors.bgSecondary,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={prevPhase}
          disabled={!canGoBack}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            minHeight: '44px',
            opacity: canGoBack ? 1 : 0.5,
          }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
            {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
          </span>
        </div>
        <button
          onClick={nextPhase}
          disabled={!canGoNext}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: canGoNext ? colors.accent : colors.border,
            color: 'white',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            minHeight: '44px',
            opacity: canGoNext ? 1 : 0.5,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
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
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
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

  // Circuit Visualization render function
  const renderCircuitVisualization = (showLeakage = true) => {
    const width = 480;
    const height = 340;
    // Chart area for current imbalance graph
    const chartLeft = 60;
    const chartRight = width - 20;
    const chartTop = 230;
    const chartBottom = height - 20;
    const chartH = chartBottom - chartTop;
    // Build current imbalance curve data points
    const curvePoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = chartLeft + (i / 20) * (chartRight - chartLeft);
      const leakVal = (i / 20) * 10;
      const y = chartBottom - (leakVal / 10) * chartH;
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = curvePoints.join(' ');
    // Interactive point position based on leakageCurrent
    const pointX = chartLeft + (leakageCurrent / 10) * (chartRight - chartLeft);
    const pointY = chartBottom - (leakageCurrent / 10) * chartH;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ground Fault visualization">
        <defs>
          <linearGradient id="hotWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.hot} stopOpacity="0.8" />
            <stop offset="50%" stopColor={colors.hot} />
            <stop offset="100%" stopColor={colors.hot} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="neutralWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.neutral} stopOpacity="0.8" />
            <stop offset="50%" stopColor={colors.neutral} />
            <stop offset="100%" stopColor={colors.neutral} stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Circuit schematic group */}
        <g>
          {/* Power source */}
          <rect x="20" y="55" width="50" height="100" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="2" />
          <text x="45" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">120V</text>
          <text x="45" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">AC Source</text>

          {/* Hot wire (top) */}
          <line x1="70" y1="75" x2="380" y2="75" stroke={gfciTripped ? colors.textMuted : "url(#hotWireGrad)"} strokeWidth="4" filter={gfciTripped ? undefined : "url(#glow)"} />

          {/* Animated current flow on hot wire */}
          {!gfciTripped && Array.from({ length: 6 }).map((_, i) => (
            <circle key={`hot-${i}`} cx={70 + ((animationFrame * 3 + i * 52) % 310)} cy={75} r="5" fill={colors.hot} opacity="0.8" />
          ))}
        </g>

        {/* GFCI box group */}
        <g>
          <rect x="200" y="50" width="80" height="120" rx="8" fill={colors.bgSecondary} stroke={gfciTripped ? colors.error : colors.accent} strokeWidth="3" />
          <text x="240" y="72" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="bold">GFCI</text>
          <ellipse cx="240" cy="95" rx="25" ry="8" fill="none" stroke={colors.textMuted} strokeWidth="2" />
          <ellipse cx="240" cy="95" rx="18" ry="5" fill="none" stroke={colors.textSecondary} strokeWidth="1" />
          <circle cx="240" cy="140" r="5" fill={gfciTripped ? colors.error : colors.success} filter="url(#glow)" />
          <text x="240" y="162" textAnchor="middle" fill={gfciStatus.color} fontSize="11" fontWeight="bold">{gfciStatus.status}</text>
        </g>

        {/* Neutral wire group */}
        <g>
          <line x1="70" y1="135" x2="380" y2="135" stroke={gfciTripped ? colors.textMuted : "url(#neutralWireGrad)"} strokeWidth="4" filter={gfciTripped ? undefined : "url(#glow)"} />
          {!gfciTripped && Array.from({ length: Math.max(1, 6 - Math.floor(leakageCurrent / 2)) }).map((_, i) => (
            <circle key={`neutral-${i}`} cx={380 - ((animationFrame * 3 + i * 52) % 310)} cy={135} r="5" fill={colors.neutral} opacity="0.8" />
          ))}
        </g>

        {/* Load group */}
        <g>
          <rect x="390" y="55" width="60" height="100" rx="8" fill={colors.bgSecondary} stroke={colors.warning} strokeWidth="2" />
          <text x="420" y="95" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="bold">LOAD</text>
          <path d={`M 395 115 l 5 0 l 2 -8 l 4 16 l 4 -16 l 4 16 l 4 -16 l 4 16 l 2 -8 l 5 0`} fill="none" stroke={colors.warning} strokeWidth="2" />
        </g>

        {/* Leakage path group */}
        {showLeakage && leakageCurrent > 0 && !gfciTripped && (
          <g>
            <circle cx="340" cy="195" r="12" fill="none" stroke={colors.warning} strokeWidth="2" />
            <circle cx="340" cy="185" r="5" fill="none" stroke={colors.warning} strokeWidth="2" />
            <line x1="340" y1="75" x2="340" y2="180" stroke={colors.warning} strokeWidth="2" strokeDasharray="5,3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <circle key={`spark-${i}`} cx={340 + Math.sin(animationFrame * 0.5 + i * 2) * 10} cy={80 + Math.cos(animationFrame * 0.5 + i * 2) * 5} r={3 + Math.sin(animationFrame * 0.3 + i) * 2} fill="url(#sparkGlow)" />
            ))}
            <g transform="translate(340, 210)">
              <line x1="0" y1="0" x2="0" y2="8" stroke={colors.ground} strokeWidth="2" />
              <line x1="-10" y1="8" x2="10" y2="8" stroke={colors.ground} strokeWidth="3" />
              <line x1="-6" y1="13" x2="6" y2="13" stroke={colors.ground} strokeWidth="2" />
              <line x1="-3" y1="18" x2="3" y2="18" stroke={colors.ground} strokeWidth="1" />
            </g>
            <text x="370" y="200" fill={colors.warning} fontSize="11" fontWeight="bold">{leakageCurrent} mA</text>
          </g>
        )}

        {/* Current readings */}
        <g>
          <text x="90" y="65" fill={colors.hot} fontSize="11" fontWeight="600">HOT: {gfciTripped ? '0' : hotCurrent.toFixed(3)} A</text>
          <text x="90" y="150" fill={colors.neutral} fontSize="11" fontWeight="600">NEUTRAL: {gfciTripped ? '0' : neutralCurrent.toFixed(3)} A</text>
        </g>

        {/* Current imbalance chart group */}
        <g>
          {/* Grid lines */}
          <line x1={chartLeft} y1={chartTop} x2={chartRight} y2={chartTop} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          <line x1={chartLeft} y1={chartTop + chartH * 0.25} x2={chartRight} y2={chartTop + chartH * 0.25} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          <line x1={chartLeft} y1={chartTop + chartH * 0.5} x2={chartRight} y2={chartTop + chartH * 0.5} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          <line x1={chartLeft} y1={chartTop + chartH * 0.75} x2={chartRight} y2={chartTop + chartH * 0.75} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          {/* Axes */}
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={colors.textMuted} strokeWidth="1" />
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.textMuted} strokeWidth="1" />
          {/* Axis labels */}
          <text x={chartLeft - 5} y={chartTop + 5} textAnchor="end" fill={colors.textMuted} fontSize="11">10</text>
          <text x={chartLeft - 5} y={chartBottom} textAnchor="end" fill={colors.textMuted} fontSize="11">0</text>
          <text x={(chartLeft + chartRight) / 2} y={chartBottom + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">Current Leakage (mA)</text>
          <text x={chartLeft - 8} y={(chartTop + chartBottom) / 2} textAnchor="middle" fill={colors.textMuted} fontSize="11" transform={`rotate(-90, ${chartLeft - 8}, ${(chartTop + chartBottom) / 2})`}>Current (mA)</text>
          {/* Trip threshold line */}
          <line x1={chartLeft} y1={chartBottom - (5 / 10) * chartH} x2={chartRight} y2={chartBottom - (5 / 10) * chartH} stroke={colors.error} strokeWidth="1" strokeDasharray="6,3" />
          <text x={chartRight - 2} y={chartBottom - (5 / 10) * chartH - 3} textAnchor="end" fill={colors.error} fontSize="11">5 mA Trip</text>
          {/* Curve path */}
          <path d={curvePath} fill="none" stroke={colors.accent} strokeWidth="2" />
          {/* Interactive point */}
          <circle cx={pointX} cy={pointY} r={8} fill={colors.accent} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
        </g>

        {/* Imbalance indicator */}
        <g>
          <rect x="200" y="170" width="100" height="28" rx="6" fill={colors.bgSecondary} stroke={gfciStatus.color} strokeWidth="2" />
          <text x="250" y="189" textAnchor="middle" fill={gfciStatus.color} fontSize="12" fontWeight="bold">Imbalance: {currentImbalance} mA</text>
        </g>
      </svg>
    );
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '84px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🛡️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Ground Fault Detection
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "If current flows through YOU instead of the neutral wire, how does the electrical system know? The answer has saved <span style={{ color: colors.accent }}>thousands of lives</span> since GFCI protection became mandatory."
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
            "In a healthy circuit, current flows out through hot and returns through neutral. If current escapes through another path - like a person - there's an imbalance. That imbalance is detectable, and it saves lives."
          </p>
          <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>
            - Electrical Safety Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Ground Fault Detection →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Both stay at 10A - the fault doesn\'t affect current flow' },
      { id: 'b', text: 'Hot stays at 10A, Neutral drops to 9.995A - the difference is detectable', correct: true },
      { id: 'c', text: 'Both increase to handle the additional fault current' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            A circuit draws 10 amps normally. If someone touches a live wire and 5 milliamps (0.005A) flows through them to ground, what happens to hot and neutral current?
          </h2>

          {/* Static SVG diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="360" height="200" viewBox="0 0 360 200" style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
              {/* Power source */}
              <rect x="20" y="60" width="50" height="80" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="2" />
              <text x="45" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">120V</text>
              <text x="45" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">Source</text>

              {/* Hot wire */}
              <line x1="70" y1="75" x2="140" y2="75" stroke={colors.hot} strokeWidth="3" />
              <line x1="220" y1="75" x2="290" y2="75" stroke={colors.hot} strokeWidth="3" />
              <text x="105" y="65" fill={colors.hot} fontSize="11" fontWeight="600">Hot: 10A</text>

              {/* Load */}
              <rect x="140" y="55" width="80" height="90" rx="6" fill={colors.bgSecondary} stroke={colors.warning} strokeWidth="2" />
              <text x="180" y="95" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="bold">LOAD</text>
              <text x="180" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">10A</text>

              {/* Neutral wire */}
              <line x1="70" y1="125" x2="140" y2="125" stroke={colors.neutral} strokeWidth="3" />
              <line x1="220" y1="125" x2="290" y2="125" stroke={colors.neutral} strokeWidth="3" />
              <text x="255" y="115" fill={colors.neutral} fontSize="11" fontWeight="600">Neutral: ?A</text>

              {/* Person symbol */}
              <circle cx="310" y="100" r="12" fill="none" stroke={colors.warning} strokeWidth="2" />
              <line x1="310" y1="112" x2="310" y2="140" stroke={colors.warning} strokeWidth="2" />
              <line x1="290" y1="75" x2="310" y2="88" stroke={colors.warning} strokeWidth="2" strokeDasharray="4,2" />

              {/* Ground symbol */}
              <line x1="310" y1="145" x2="310" y2="155" stroke={colors.ground} strokeWidth="2" />
              <line x1="298" y1="155" x2="322" y2="155" stroke={colors.ground} strokeWidth="2" />
              <line x1="302" y1="160" x2="318" y2="160" stroke={colors.ground} strokeWidth="1.5" />
              <line x1="306" y1="165" x2="314" y2="165" stroke={colors.ground} strokeWidth="1" />

              {/* Leakage label */}
              <text x="330" y="130" fill={colors.warning} fontSize="11" fontWeight="600">5 mA</text>
            </svg>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
              <p style={{ ...typo.small, color: colors.warning }}>
                5 mA is escaping through a person to ground...
              </p>
            </div>
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

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // Slider style helper
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  };

  // PLAY PHASE - Interactive GFCI Simulator
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

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            GFCI Circuit Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Introduce a ground fault and watch the GFCI detect the current imbalance. When you increase leakage, neutral current decreases because current escapes to ground instead of returning through the neutral wire.
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
            Real-world relevance: GFCIs in bathrooms and kitchens use this exact principle to save over 300 lives annually
          </p>
          <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', textAlign: 'center', marginBottom: '24px' }}>
            The current imbalance is calculated as I_hot - I_neutral = I_leakage. The formula is: Imbalance = V / R × 1000 (mA)
          </p>

          {/* Main visualization */}
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
                  {renderCircuitVisualization()}
                </div>

                {/* Status display */}
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
                    <div style={{ ...typo.h3, color: colors.hot }}>{gfciTripped ? '0' : hotCurrent.toFixed(3)} A</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Hot Current</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.neutral }}>{gfciTripped ? '0' : neutralCurrent.toFixed(3)} A</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Neutral Current</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: gfciStatus.color }}>{gfciStatus.status}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>GFCI Status</div>
                  </div>
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Leakage current slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Ground Fault Leakage</span>
                    <span style={{
                      ...typo.small,
                      color: leakageCurrent >= 5 ? colors.error : leakageCurrent > 0 ? colors.warning : colors.success,
                      fontWeight: 600
                    }}>
                      {leakageCurrent} mA {leakageCurrent >= 5 && '(TRIP!)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={leakageCurrent}
                    onChange={(e) => !gfciTripped && setLeakageCurrent(parseInt(e.target.value))}
                    disabled={gfciTripped}
                    style={{
                      ...sliderStyle,
                      cursor: gfciTripped ? 'not-allowed' : 'pointer',
                      opacity: gfciTripped ? 0.5 : 1,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>0 mA (Safe)</span>
                    <span style={{ ...typo.small, color: colors.error }}>5 mA (Trip)</span>
                  </div>
                </div>

                {/* Load current slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Load Current</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{hotCurrent} A</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={hotCurrent}
                    onChange={(e) => setHotCurrent(parseInt(e.target.value))}
                    style={sliderStyle}
                  />
                </div>

                {/* Reset button */}
                {gfciTripped && (
                  <button
                    onClick={() => {
                      setGfciTripped(false);
                      setLeakageCurrent(0);
                      playSound('click');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${colors.error}`,
                      background: 'transparent',
                      color: colors.error,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Reset GFCI
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {gfciTripped && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                🛡️ GFCI Tripped! The 5 mA imbalance was detected in under 25 milliseconds.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand How GFCIs Work →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionCorrect = prediction === 'b';
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How GFCIs Detect Ground Faults
          </h2>

          {/* Reference user's prediction */}
          <div style={{
            background: predictionCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${predictionCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: predictionCorrect ? colors.success : colors.warning, margin: 0 }}>
              {predictionCorrect
                ? "Your prediction was correct! Hot stays at 10A while neutral drops to 9.995A - the GFCI detects this 5mA difference."
                : "Your prediction helped you explore the concept. The key insight: hot stays at 10A, but neutral drops because 5mA escapes to ground instead of returning through neutral."}
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
                <strong style={{ color: colors.textPrimary }}>The Core Principle: Current Balance</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                In a healthy circuit, <span style={{ color: colors.hot }}>I_hot</span> = <span style={{ color: colors.neutral }}>I_neutral</span>. All current flowing out must return.
              </p>
              <p style={{ marginBottom: '16px' }}>
                If current escapes to ground (through a person, damaged insulation, or water), there is an <span style={{ color: colors.warning }}>imbalance</span>: I_hot - I_neutral = I_leakage
              </p>
              <p>
                GFCIs use a <span style={{ color: colors.accent, fontWeight: 600 }}>differential current transformer</span> to detect this imbalance. Both wires pass through a toroidal core - if currents are equal, magnetic fields cancel. Any imbalance induces a voltage that triggers the trip mechanism.
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
              💡 Why 5 Milliamps?
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Human physiology drives the threshold:</strong>
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              1 mA - Barely perceptible tingling
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              5 mA - Maximum "let-go" current for most people
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              10-30 mA - Can cause ventricular fibrillation
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The 5 mA trip threshold ensures GFCIs act <strong>before</strong> dangerous current levels are reached.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Low current means low danger - nothing to worry about' },
      { id: 'b', text: 'The circuit breaker will eventually trip when current builds up' },
      { id: 'c', text: 'Even low current can cause arcing and fires without tripping any protection', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🔥 New Variable: High-Impedance Faults
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A damaged wire touches a wooden beam. The fault impedance is 1000 ohms, limiting current to only 120 mA. What's the danger?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="400" height="220" viewBox="0 0 400 220" style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="twistGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.warning} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={colors.error} stopOpacity="0.3" />
                </linearGradient>
                <filter id="twistGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <g>
                <rect x="20" y="40" width="360" height="140" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
                <text x="200" y="30" textAnchor="middle" fill={colors.warning} fontSize="14" fontWeight="bold">High-Impedance Fault Scenario</text>
              </g>
              <g>
                <line x1="50" y1="80" x2="160" y2="80" stroke={colors.hot} strokeWidth="3" />
                <text x="105" y="70" textAnchor="middle" fill={colors.hot} fontSize="11">Hot Wire 120V</text>
                <rect x="160" y="60" width="80" height="40" rx="4" fill="url(#twistGrad)" stroke={colors.warning} strokeWidth="2" />
                <text x="200" y="85" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="bold">1000 Ohms</text>
                <line x1="240" y1="80" x2="350" y2="80" stroke={colors.hot} strokeWidth="3" />
              </g>
              <g>
                <line x1="200" y1="100" x2="200" y2="160" stroke={colors.warning} strokeWidth="2" strokeDasharray="5,3" />
                <circle cx="200" cy="130" r="12" fill="none" stroke={colors.error} strokeWidth="2" />
                <text x="230" y="135" fill={colors.error} fontSize="11" fontWeight="bold">Arcing</text>
                <rect x="185" y="155" width="30" height="12" rx="2" fill="#8B4513" stroke={colors.warning} strokeWidth="1" />
                <text x="200" y="178" textAnchor="middle" fill={colors.textMuted} fontSize="11">Wood beam</text>
              </g>
              <g>
                <text x="200" y="200" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">I = V/R = 120V / 1000 Ohms = 120 mA</text>
                <text x="200" y="216" textAnchor="middle" fill={colors.textMuted} fontSize="11">P = I² × R = 14.4 W concentrated at fault</text>
              </g>
            </svg>
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
              Well below the 15A circuit breaker threshold, but 14.4 watts concentrated at the fault point
            </p>
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Explore High-Impedance Faults →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const faultPower = Math.pow(highImpedanceFaultCurrent / 1000, 2) * faultImpedance;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            High-Impedance Fault Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See when different protection devices can detect the fault
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
          {/* Fault current vs impedance SVG */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="480" height="260" viewBox="0 0 480 260" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="twistPointGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {/* Grid lines */}
              <line x1="60" y1="30" x2="460" y2="30" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              <line x1="60" y1="85" x2="460" y2="85" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              <line x1="60" y1="140" x2="460" y2="140" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              <line x1="60" y1="195" x2="460" y2="195" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              {/* Axes */}
              <line x1="60" y1="30" x2="60" y2="220" stroke={colors.textMuted} strokeWidth="1" />
              <line x1="60" y1="220" x2="460" y2="220" stroke={colors.textMuted} strokeWidth="1" />
              {/* Axis labels */}
              <text x="55" y="35" textAnchor="end" fill={colors.textMuted} fontSize="11">120A</text>
              <text x="55" y="90" textAnchor="end" fill={colors.textMuted} fontSize="11">90A</text>
              <text x="55" y="145" textAnchor="end" fill={colors.textMuted} fontSize="11">60A</text>
              <text x="55" y="200" textAnchor="end" fill={colors.textMuted} fontSize="11">30A</text>
              <text x="55" y="225" textAnchor="end" fill={colors.textMuted} fontSize="11">0</text>
              <text x="260" y="250" textAnchor="middle" fill={colors.textMuted} fontSize="11">Fault Impedance (Ohms)</text>
              <text x="20" y="130" textAnchor="middle" fill={colors.textMuted} fontSize="11" transform="rotate(-90, 20, 130)">Fault Current</text>
              {/* GFCI threshold */}
              <line x1="60" y1={220 - (5 / 120000) * 190} x2="460" y2={220 - (5 / 120000) * 190} stroke={colors.success} strokeWidth="1" strokeDasharray="6,3" />
              <text x="462" y={220 - (5 / 120000) * 190 + 4} textAnchor="start" fill={colors.success} fontSize="11">5mA GFCI</text>
              {/* Breaker threshold */}
              <line x1="60" y1={220 - (15 / 120) * 190} x2="460" y2={220 - (15 / 120) * 190} stroke={colors.error} strokeWidth="1" strokeDasharray="6,3" />
              <text x="462" y={220 - (15 / 120) * 190 + 4} textAnchor="start" fill={colors.error} fontSize="11">15A Breaker</text>
              {/* Curve: I = 120/R, scaled logarithmically for display */}
              <path d={(() => {
                const pts: string[] = [];
                for (let i = 0; i <= 40; i++) {
                  const frac = i / 40;
                  const imp = 1 + frac * 49999; // 1 to 50000
                  const current = 120 / imp; // Amps
                  const x = 60 + frac * 400;
                  const y = 220 - (current / 120) * 190;
                  pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
                }
                return pts.join(' ');
              })()} fill="none" stroke={colors.warning} strokeWidth="2" />
              {/* Interactive point */}
              {(() => {
                const frac = (faultImpedance - 1) / 49999;
                const current = 120 / faultImpedance;
                const px = 60 + frac * 400;
                const py = 220 - (current / 120) * 190;
                return <circle cx={px} cy={py} r={8} fill={colors.warning} filter="url(#twistPointGlow)" stroke="#fff" strokeWidth={2} />;
              })()}
            </svg>
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Impedance slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>⚡ Fault Impedance</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{faultImpedance} Ω</span>
              </div>
              <input
                type="range"
                min="1"
                max="50000"
                step="100"
                value={faultImpedance}
                onChange={(e) => {
                  setFaultImpedance(parseInt(e.target.value));
                  setShowArcingSparks(parseInt(e.target.value) > 100 && parseInt(e.target.value) < 10000);
                }}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>1Ω (Direct short)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>50kΩ (Dry wood)</span>
              </div>
            </div>

            {/* Results display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{highImpedanceFaultCurrent.toFixed(0)} mA</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Fault Current</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: faultPower > 10 ? colors.error : colors.warning }}>{faultPower.toFixed(1)} W</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Power at Fault</div>
              </div>
            </div>

            {/* Protection status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                background: canTripGFCI ? `${colors.success}22` : `${colors.error}22`,
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>GFCI Protection (5 mA threshold)</span>
                <span style={{ ...typo.small, color: canTripGFCI ? colors.success : colors.error, fontWeight: 600 }}>
                  {canTripGFCI ? '✓ WILL TRIP' : '✗ NO TRIP'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                background: canTripBreaker ? `${colors.success}22` : `${colors.error}22`,
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Circuit Breaker (15A threshold)</span>
                <span style={{ ...typo.small, color: canTripBreaker ? colors.success : colors.error, fontWeight: 600 }}>
                  {canTripBreaker ? '✓ WILL TRIP' : '✗ NO TRIP'}
                </span>
              </div>
            </div>

            {/* Danger warning */}
            {!canTripGFCI && !canTripBreaker && faultPower > 1 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '8px',
                background: `${colors.error}22`,
                border: `1px solid ${colors.error}`,
              }}>
                <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                  🔥 <strong>Danger!</strong> {faultPower.toFixed(1)}W concentrated at the fault can cause arcing and ignite materials over time - but neither GFCI nor breaker will trip!
                </p>
              </div>
            )}
          </div>
          </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Protection Layers →
          </button>
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
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Layered Electrical Protection
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>GFCI - Personnel Protection</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Detects <span style={{ color: colors.accent }}>5 mA</span> current imbalance. Protects against <strong>electrocution</strong>. Required near water and outdoors. Response: ~25 ms.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔥</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>AFCI - Fire Prevention</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Detects <span style={{ color: colors.warning }}>arcing signatures</span> from damaged wiring. Protects against <strong>electrical fires</strong>. Required in bedrooms and living areas.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Circuit Breaker - Overcurrent</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Trips at <span style={{ color: colors.textPrimary }}>15-20A</span> for branch circuits. Protects against <strong>overloads and short circuits</strong>. Basic protection present in all circuits.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔒</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Dual-Function AFCI/GFCI</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Modern code increasingly requires <strong>combination devices</strong> that provide both arc-fault and ground-fault protection in a single breaker or outlet.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Ground Fault"
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} completed)
          </p>

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
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '44px',
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
                How Ground Fault Detection Connects:
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
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
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

            {/* Got It button for current app */}
            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  background: app.color,
                }}
              >
                Got It
              </button>
            )}
            {completedApps[selectedApp] && selectedApp < realWorldApps.length - 1 && (
              <button
                onClick={() => {
                  playSound('click');
                  setSelectedApp(selectedApp + 1);
                }}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  background: colors.success,
                }}
              >
                Next Application →
              </button>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}
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
          padding: '24px',
          paddingTop: '84px',
          overflowY: 'auto',
        }}>
          {renderNavigationBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand ground fault detection and electrical safety!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                Review & Try Again
              </button>
            )}
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
        padding: '24px',
        paddingTop: '84px',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

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
                ← Previous
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
                Next →
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
        paddingTop: '84px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavigationBar()}
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
          Ground Fault Detection Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how GFCIs protect against electrocution and why layered electrical protection saves lives.
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
              'GFCIs detect current imbalance between hot and neutral',
              '5 mA trip threshold protects against electrocution',
              'High-impedance faults can cause fires without tripping breakers',
              'AFCIs detect arcing for fire prevention',
              'Layered protection provides defense in depth',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default GroundFaultRenderer;
