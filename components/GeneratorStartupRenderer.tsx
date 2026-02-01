'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

interface GeneratorStartupRendererProps {
  phase?: Phase; // Optional - used for resume functionality
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const realWorldApps = [
  {
    icon: '🏥',
    title: 'Hospital Backup Power',
    short: 'Life-critical systems demand instant power transfer',
    tagline: 'When seconds determine survival',
    description: 'Hospitals maintain diesel generators that must start, synchronize, and accept load within 10 seconds of a power failure. ICU ventilators, surgical equipment, and life support systems cannot tolerate extended outages.',
    connection: 'The startup sequence you explored - engine acceleration, voltage stabilization, and load acceptance - is life-critical in hospitals where power transfer must be seamless.',
    howItWorks: 'Hospital generators use stored compressed air or battery starters for fast cranking. Automatic transfer switches detect outages within milliseconds. Generators must synchronize within 10 seconds and accept stepped loads to avoid frequency droop.',
    stats: [
      { value: '10 sec', label: 'Maximum transfer time required', icon: '⏱️' },
      { value: '96 hrs', label: 'Fuel reserve requirement', icon: '⛽' },
      { value: '$500K+', label: 'Typical hospital generator cost', icon: '💰' }
    ],
    examples: ['ICU backup power', 'Operating room systems', 'Pharmacy refrigeration', 'Medical imaging equipment'],
    companies: ['Caterpillar', 'Cummins', 'Kohler', 'Generac'],
    futureImpact: 'Battery-generator hybrids will provide instant power while generators start, eliminating even sub-second transfer gaps.',
    color: '#EF4444'
  },
  {
    icon: '💾',
    title: 'Data Center Reliability',
    short: 'Ensuring 99.999% uptime for the cloud',
    tagline: 'Five nines depends on perfect startup',
    description: 'Data centers promise 99.999% uptime (5.26 minutes downtime/year). Multiple generator systems, UPS batteries, and sophisticated load management ensure continuous power. Generator synchronization is critical for seamless failover.',
    connection: 'The load acceptance and frequency stability you studied are precisely engineered in data centers to prevent server crashes during power transitions.',
    howItWorks: 'UPS batteries provide instant bridge power. Generators start and synchronize within 10-15 seconds. Sophisticated controls manage load acceptance in steps to prevent frequency droop. Multiple generators operate in parallel for redundancy.',
    stats: [
      { value: '99.999%', label: 'Target uptime (Tier IV)', icon: '📊' },
      { value: '2N+1', label: 'Generator redundancy', icon: '🔌' },
      { value: '$10M/hr', label: 'Cost of major outage', icon: '💰' }
    ],
    examples: ['Amazon AWS facilities', 'Google data centers', 'Microsoft Azure', 'Facebook infrastructure'],
    companies: ['Equinix', 'Digital Realty', 'CyrusOne', 'QTS'],
    futureImpact: 'AI-predictive maintenance will anticipate generator issues before failure, achieving true continuous availability.',
    color: '#3B82F6'
  },
  {
    icon: '⛽',
    title: 'Oil & Gas Operations',
    short: 'Powering remote drilling and processing facilities',
    tagline: 'Isolated operations demand self-reliance',
    description: 'Offshore platforms and remote drilling sites operate as isolated microgrids with no utility connection. Multiple generators must coordinate startup, load sharing, and synchronization autonomously in harsh conditions.',
    connection: 'The frequency droop and governor response you explored are essential for load sharing when multiple generators operate in parallel without grid support.',
    howItWorks: 'Droop control allows multiple generators to share load proportionally. Each unit\'s governor reduces frequency slightly as load increases, naturally balancing load between units. Fast ramp rates handle sudden pump and compressor startups.',
    stats: [
      { value: '100+ MW', label: 'Large platform power demand', icon: '⚡' },
      { value: '6-8', label: 'Generators per major platform', icon: '🔧' },
      { value: '$1M/day', label: 'Platform operating cost', icon: '💰' }
    ],
    examples: ['Offshore drilling rigs', 'FPSO vessels', 'Remote pipeline stations', 'Arctic exploration camps'],
    companies: ['Schlumberger', 'Halliburton', 'Baker Hughes', 'Wärtsilä'],
    futureImpact: 'Hybrid systems combining generators with battery storage and wind will reduce fuel consumption and emissions at remote sites.',
    color: '#F59E0B'
  },
  {
    icon: '⚡',
    title: 'Grid Black Start Recovery',
    short: 'Restarting civilization after total blackout',
    tagline: 'The ultimate startup challenge',
    description: 'After a total grid blackout, power plants cannot restart without external power. Black start generators - specially designed for self-starting - provide the initial power to restart the grid in a careful, sequenced restoration.',
    connection: 'Black start extends everything you learned to extreme scale: massive generators must start from zero, synchronize, and gradually energize transmission lines and other power plants.',
    howItWorks: 'Black start units use battery banks or small diesel sets to crank. They energize local equipment, then transmission lines (energizing unloaded lines requires careful voltage control). Other plants are restarted in sequence until the grid is restored.',
    stats: [
      { value: '24-48 hrs', label: 'Full grid restoration time', icon: '⏰' },
      { value: '$1B+', label: 'Major blackout economic cost', icon: '💰' },
      { value: '50 MW', label: 'Typical black start unit size', icon: '⚡' }
    ],
    examples: ['2003 Northeast blackout recovery', 'Texas 2021 grid failure', 'Italy 2003 nationwide outage', 'India 2012 grid collapse'],
    companies: ['ERCOT', 'PJM Interconnection', 'National Grid', 'Électricité de France'],
    futureImpact: 'Grid-forming inverters on solar and battery systems will enable renewable-first black start, reducing reliance on fossil fuel generators.',
    color: '#8B5CF6'
  }
];

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'Why does a diesel generator take 10+ seconds to start?',
    options: [
      { text: 'The fuel takes time to reach the engine', correct: false },
      { text: 'Rotational inertia: heavy rotating mass must accelerate to full speed', correct: true },
      { text: 'The generator is in sleep mode', correct: false },
      { text: 'Safety regulations require a delay', correct: false },
    ],
  },
  {
    question: 'What does generator "synchronization" mean?',
    options: [
      { text: 'Connecting two generators via cable', correct: false },
      { text: 'Matching frequency, voltage, and phase before connecting to load', correct: true },
      { text: 'Starting multiple generators at once', correct: false },
      { text: 'Updating the generator software', correct: false },
    ],
  },
  {
    question: 'What causes frequency droop during load pickup?',
    options: [
      { text: 'The fuel runs out', correct: false },
      { text: 'Sudden load slows the engine before governor can compensate', correct: true },
      { text: 'The generator overheats', correct: false },
      { text: 'Electrical interference', correct: false },
    ],
  },
  {
    question: 'What is the standard AC frequency in North America?',
    options: [
      { text: '50 Hz', correct: false },
      { text: '60 Hz', correct: true },
      { text: '100 Hz', correct: false },
      { text: '120 Hz', correct: false },
    ],
  },
  {
    question: 'Why do data centers use "load acceptance rate" limits?',
    options: [
      { text: 'To save fuel', correct: false },
      { text: 'To prevent excessive frequency droop during load pickup', correct: true },
      { text: 'To make generators last longer', correct: false },
      { text: 'Government regulations require it', correct: false },
    ],
  },
  {
    question: 'What is the role of a flywheel on a generator?',
    options: [
      { text: 'Generate electricity directly', correct: false },
      { text: 'Store rotational energy for load stability and smoother operation', correct: true },
      { text: 'Cool the engine', correct: false },
      { text: 'Filter the fuel', correct: false },
    ],
  },
  {
    question: 'What happens if you connect a generator that is not synchronized?',
    options: [
      { text: 'Nothing - it will sync automatically', correct: false },
      { text: 'Severe mechanical stress and potential damage', correct: true },
      { text: 'The lights flicker briefly', correct: false },
      { text: 'The generator runs faster', correct: false },
    ],
  },
  {
    question: 'What is "black start" capability?',
    options: [
      { text: 'Starting a generator at night', correct: false },
      { text: 'Ability to start without external power (using batteries)', correct: true },
      { text: 'Starting with black fuel', correct: false },
      { text: 'Emergency shutdown procedure', correct: false },
    ],
  },
  {
    question: 'How does a governor control generator frequency?',
    options: [
      { text: 'By adjusting voltage output', correct: false },
      { text: 'By controlling fuel flow to maintain engine speed', correct: true },
      { text: 'By changing the number of poles', correct: false },
      { text: 'By heating the windings', correct: false },
    ],
  },
  {
    question: 'Why do most data center generators run at 1800 RPM (North America)?',
    options: [
      { text: 'It is the quietest speed', correct: false },
      { text: '4-pole generator at 1800 RPM produces 60 Hz', correct: true },
      { text: 'Fuel efficiency is best at that speed', correct: false },
      { text: 'Regulations require it', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Data Center Backup Power',
    icon: '🏢',
    description: 'Data centers use diesel generators as backup. The 10-15 second startup time is why UPS batteries bridge the gap. Critical facilities often have multiple redundant generators.',
  },
  {
    title: 'Hospital Emergency Power',
    icon: '🏥',
    description: 'Hospitals must maintain power to operating rooms and life support. Generators start within 10 seconds, with automatic transfer switches ensuring seamless transition.',
  },
  {
    title: 'Grid Frequency Regulation',
    icon: '⚡',
    description: 'Power grids constantly balance supply and demand. Large generators respond to frequency changes - too much load causes frequency to drop, triggering governor response.',
  },
  {
    title: 'Ship Propulsion Systems',
    icon: '🚢',
    description: 'Large ships use diesel-electric propulsion. Understanding generator dynamics is crucial for maneuvering - sudden propulsion demands cause significant frequency droop.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SCENARIO-BASED TEST QUESTIONS
// ────────────────────────────────────────────────────────────────────────────

const testQuestions = [
  {
    scenario: 'A technician is explaining to a new hire why data centers need UPS batteries that can bridge 10-15 seconds of load during power outages.',
    question: 'What is the fundamental principle that explains how generators produce electricity?',
    options: [
      { id: 'a', label: 'Chemical reactions in the fuel convert directly to electrical current' },
      { id: 'b', label: 'Electromagnetic induction - rotating magnetic fields induce current in stationary windings', correct: true },
      { id: 'c', label: 'Static electricity builds up in the generator housing during rotation' },
      { id: 'd', label: 'Piezoelectric effect from mechanical vibrations in the engine' },
    ],
    explanation: 'Generators work through electromagnetic induction, discovered by Michael Faraday. When a magnetic field rotates past conductive windings (or vice versa), it induces an electrical current. This is why the rotor must spin at a precise speed - the rotation speed directly determines the frequency of the AC output.',
  },
  {
    scenario: 'During a facility tour, an engineer notices that the emergency generator looks almost identical to a large electric motor. A visitor asks if they could be used interchangeably.',
    question: 'What is the relationship between electric generators and electric motors?',
    options: [
      { id: 'a', label: 'They are completely different devices with no common principles' },
      { id: 'b', label: 'Motors are more efficient because they only convert one form of energy' },
      { id: 'c', label: 'They are functionally reversible - the same machine can operate as either depending on energy input', correct: true },
      { id: 'd', label: 'Generators must be much larger than motors for the same power rating' },
    ],
    explanation: 'Motors and generators are electromagnetic duals of each other. A motor converts electrical energy to mechanical rotation, while a generator converts mechanical rotation to electrical energy. The same physical machine can often function as either, which is why regenerative braking in electric vehicles can use the drive motor as a generator to recharge batteries.',
  },
  {
    scenario: 'A data center is installing a second backup generator to run in parallel with the existing one. The installation team emphasizes that both generators must be perfectly synchronized before connecting them together.',
    question: 'What parameters must match during generator synchronization before paralleling with the grid or another generator?',
    options: [
      { id: 'a', label: 'Only voltage amplitude needs to match' },
      { id: 'b', label: 'Frequency, voltage magnitude, phase angle, and phase sequence must all match', correct: true },
      { id: 'c', label: 'Only frequency needs to match since voltage will self-adjust' },
      { id: 'd', label: 'Temperature and fuel level are the primary synchronization parameters' },
    ],
    explanation: 'Synchronization requires matching frequency (Hz), voltage magnitude, phase angle, and phase sequence. Connecting out-of-phase sources creates a short circuit condition, potentially causing massive current flow, severe mechanical stress on the generator shaft, and catastrophic equipment damage. Modern sync panels use synchroscopes and automatic synchronizers to ensure safe paralleling.',
  },
  {
    scenario: 'A generator maintenance technician notices that the excitation system has failed during routine testing. The diesel engine runs perfectly but the generator produces no output voltage.',
    question: 'Why is the excitation current critical for generator operation?',
    options: [
      { id: 'a', label: 'It preheats the fuel for better combustion efficiency' },
      { id: 'b', label: 'It creates the magnetic field in the rotor required for electromagnetic induction', correct: true },
      { id: 'c', label: 'It powers the cooling fans to prevent overheating' },
      { id: 'd', label: 'It synchronizes the engine speed with the electrical output' },
    ],
    explanation: 'The excitation system supplies DC current to the rotor windings, creating the magnetic field essential for electromagnetic induction. Without excitation, the spinning rotor has no magnetic field to induce voltage in the stator windings. Adjusting excitation current also controls the generator output voltage and reactive power capability.',
  },
  {
    scenario: 'During an emergency power transfer, the facility engineer notices the generator circuit breaker trips immediately when closed, even though the generator appears to be running normally at 60Hz.',
    question: 'What causes dangerous inrush current when a generator connects to a large load?',
    options: [
      { id: 'a', label: 'The fuel injection system cannot respond quickly enough' },
      { id: 'b', label: 'Transformers and motors draw 5-10x rated current during initial magnetization and startup', correct: true },
      { id: 'c', label: 'The generator windings have not reached operating temperature' },
      { id: 'd', label: 'Inrush current is a myth; generators can handle any instantaneous load' },
    ],
    explanation: 'Inrush current occurs because transformers need to establish their magnetic fields (magnetizing inrush) and motors need to accelerate from standstill (locked rotor current). This initial current can be 5-10 times the normal operating current. Generators must be sized and protected to handle these transients, and load sequencing strategies help manage the cumulative inrush.',
  },
  {
    scenario: 'A power plant operator notices that when a large industrial customer suddenly increases demand, the generator frequency briefly drops from 60.0Hz to 59.5Hz before recovering. The plant manager explains this is the governor system responding.',
    question: 'How does a governor control system maintain generator frequency under varying loads?',
    options: [
      { id: 'a', label: 'It adjusts the number of active magnetic poles in the generator' },
      { id: 'b', label: 'It senses speed deviation and modulates fuel flow to restore the setpoint speed', correct: true },
      { id: 'c', label: 'It connects additional generators automatically when load increases' },
      { id: 'd', label: 'It reduces the load by disconnecting non-critical circuits' },
    ],
    explanation: 'The governor is a closed-loop control system that continuously monitors shaft speed (which determines frequency). When load increases, the shaft slows down; the governor responds by increasing fuel flow to add more torque. Modern electronic governors respond within milliseconds and can include droop settings for load sharing between parallel generators.',
  },
  {
    scenario: 'After a complete grid blackout affecting an entire region, certain designated power plants must restart without any external power source to begin rebuilding the grid from scratch.',
    question: 'What is black start capability and why is it critical for grid restoration?',
    options: [
      { id: 'a', label: 'The ability to start generators at night using solar-charged batteries' },
      { id: 'b', label: 'The ability to start and bring a power plant online without external grid power, using on-site batteries or small auxiliary generators', correct: true },
      { id: 'c', label: 'Emergency shutdown procedures that protect equipment during blackouts' },
      { id: 'd', label: 'A testing mode that simulates blackout conditions for training' },
    ],
    explanation: 'Black start capability allows designated power plants to restart independently after a complete grid collapse. These plants use large battery banks, compressed air, or small diesel generators to start their main units without grid power. They then energize transmission lines and help restart other plants in a coordinated restoration sequence. Only about 10-15% of plants typically have this capability.',
  },
  {
    scenario: 'The grid operator notices that system frequency has dropped to 59.8Hz during peak demand. They request that several generators increase their output to restore the standard 60Hz frequency.',
    question: 'What determines the electrical frequency of a power grid, and how is it regulated?',
    options: [
      { id: 'a', label: 'Frequency is fixed by the wire gauge and transformer ratios in the grid' },
      { id: 'b', label: 'The balance between generation and load - excess load causes frequency to drop; excess generation causes it to rise', correct: true },
      { id: 'c', label: 'Each generator independently sets its own frequency, and they average out' },
      { id: 'd', label: 'Frequency is regulated by adjusting the grid voltage up or down' },
    ],
    explanation: 'Grid frequency reflects the real-time balance between power generation and consumption. When load exceeds generation, generator rotors slow down, reducing frequency. When generation exceeds load, rotors speed up. The formula f = (P × N) / 120 shows that frequency directly depends on rotational speed. Grid operators must continuously balance supply and demand to maintain 60Hz (or 50Hz in some regions).',
  },
  {
    scenario: 'A facility engineer is sizing a new generator and must account for both real power (kW) needs for running equipment and reactive power (kVAR) requirements for motors and transformers.',
    question: 'How do generators produce reactive power, and why is it important?',
    options: [
      { id: 'a', label: 'Reactive power is waste heat that must be dissipated through cooling systems' },
      { id: 'b', label: 'By adjusting excitation current to create leading or lagging current relationships, supporting voltage levels and motor operation', correct: true },
      { id: 'c', label: 'Reactive power is stored in batteries and released when needed' },
      { id: 'd', label: 'Generators cannot produce reactive power; it must come from capacitor banks' },
    ],
    explanation: 'Reactive power (VARs) is essential for maintaining voltage levels and supporting inductive loads like motors and transformers. Generators produce reactive power by overexciting or underexciting their field windings, which adjusts the phase relationship between voltage and current. An overexcited generator exports reactive power to the grid; an underexcited one absorbs it. Proper reactive power management prevents voltage collapse.',
  },
  {
    scenario: 'During commissioning of a new data center generator, the protection engineer programs multiple relay settings to trip the generator offline under various fault conditions, even though this causes downtime.',
    question: 'Why are comprehensive protection schemes necessary for generators despite the risk of unnecessary trips?',
    options: [
      { id: 'a', label: 'Protection systems are primarily for regulatory compliance and can be disabled in emergencies' },
      { id: 'b', label: 'To prevent catastrophic damage from faults - an unprotected fault can destroy a generator in seconds and create safety hazards', correct: true },
      { id: 'c', label: 'Protection schemes only matter for generators connected to the utility grid' },
      { id: 'd', label: 'Modern generators are self-protecting and do not require external protection relays' },
    ],
    explanation: 'Generator protection schemes guard against overcurrent, overvoltage, reverse power, loss of field, overfrequency, underfrequency, and ground faults. An unprotected fault can cause winding insulation failure, rotor damage, fire, or even explosion within seconds. The cost of occasional nuisance trips is far less than the repair cost and safety risk of an unprotected fault. Protection coordination ensures the right breaker trips first to isolate faults.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

// Phase labels for progress bar
const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

export default function GeneratorStartupRenderer({
  phase: initialPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: GeneratorStartupRendererProps) {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPhase && PHASES.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  });

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && PHASES.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Play phase state
  const [isStarting, setIsStarting] = useState(false);
  const [startupTime, setStartupTime] = useState(0);
  const [rpm, setRpm] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [generatorState, setGeneratorState] = useState<'stopped' | 'cranking' | 'warmup' | 'sync' | 'online'>('stopped');
  const [hasExperimented, setHasExperimented] = useState(false);

  // Twist phase state
  const [loadPercentage, setLoadPercentage] = useState(0);
  const [frequencyDroop, setFrequencyDroop] = useState(60);
  const [isLoadApplied, setIsLoadApplied] = useState(false);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const lastClickRef = useRef(0);
  const startupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Startup simulation
  useEffect(() => {
    if (isStarting && generatorState !== 'online') {
      startupIntervalRef.current = setInterval(() => {
        setStartupTime(prev => {
          const newTime = prev + 0.1;

          // State machine
          if (newTime < 2) {
            setGeneratorState('cranking');
            setRpm(Math.min(300, newTime * 150));
            setFrequency(0);
          } else if (newTime < 5) {
            setGeneratorState('warmup');
            setRpm(Math.min(1500, 300 + (newTime - 2) * 400));
            setFrequency(Math.max(0, (newTime - 3) * 30));
          } else if (newTime < 10) {
            setGeneratorState('sync');
            setRpm(Math.min(1800, 1500 + (newTime - 5) * 60));
            setFrequency(Math.min(60, 45 + (newTime - 5) * 3));
          } else {
            setGeneratorState('online');
            setRpm(1800);
            setFrequency(60);
            setHasExperimented(true);
            if (startupIntervalRef.current) {
              clearInterval(startupIntervalRef.current);
            }
          }

          return newTime;
        });
      }, 100);
    }

    return () => {
      if (startupIntervalRef.current) {
        clearInterval(startupIntervalRef.current);
      }
    };
  }, [isStarting, generatorState]);

  // Frequency droop calculation
  useEffect(() => {
    if (isLoadApplied) {
      // Simulate frequency droop - rapid initial drop, then recovery
      const droopAmount = (loadPercentage / 100) * 8; // Max 8% droop
      const newFreq = 60 - droopAmount + Math.random() * 0.5;
      setFrequencyDroop(Math.max(55, newFreq));
    } else {
      setFrequencyDroop(60);
    }
  }, [loadPercentage, isLoadApplied]);

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className={`p-2 rounded-lg transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-slate-700 text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 bg-orange-500'
                    : i < currentIdx
                    ? 'w-2 bg-emerald-500 cursor-pointer hover:bg-emerald-400'
                    : 'w-2 bg-slate-600'
                }`}
                title={PHASE_LABELS[p]}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400 ml-2">
            {currentIdx + 1}/{PHASES.length}
          </span>
        </div>

        <div className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
          {PHASE_LABELS[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex justify-between items-center px-6 py-4 bg-slate-900/80 border-t border-slate-700">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Back
        </button>

        <span className="text-sm text-slate-500 font-medium">
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            canGoNext
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {nextLabel} {canGoNext && <span className="ml-1">→</span>}
        </button>
      </div>
    );
  };

  // Handlers
  const handleStartGenerator = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setIsStarting(true);
    setStartupTime(0);
    setRpm(0);
    setFrequency(0);
    setGeneratorState('cranking');
  }, []);

  const handleResetGenerator = useCallback(() => {
    setIsStarting(false);
    setStartupTime(0);
    setRpm(0);
    setFrequency(0);
    setGeneratorState('stopped');
  }, []);

  const handlePrediction = useCallback((choice: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleApplyLoad = useCallback(() => {
    setIsLoadApplied(true);
    setHasExploredTwist(true);
  }, []);

  const handleReleaseLoad = useCallback(() => {
    setIsLoadApplied(false);
    setLoadPercentage(0);
  }, []);

  const handleCompleteApp = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer !== null && TEST_QUESTIONS[index].options[answer].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderGeneratorVisualization = () => {
    const rotationSpeed = rpm / 30; // Visual rotation
    const engineRunning = rpm > 100;
    const syncProgress = Math.min(100, (frequency / 60) * 100);
    const powerOutput = generatorState === 'online' ? 100 : syncProgress * 0.8;

    return (
      <div className="relative">
        <svg viewBox="0 0 400 260" className="w-full h-56">
          <defs>
            {/* Premium engine block gradient */}
            <linearGradient id="genEngineBlock" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#3f4a5c" />
              <stop offset="75%" stopColor="#2d3748" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Generator housing metallic gradient */}
            <linearGradient id="genHousingMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="80%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Flywheel metallic gradient */}
            <radialGradient id="genFlywheelMetal" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Copper winding gradient */}
            <linearGradient id="genCopperWinding" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Combustion glow gradient */}
            <radialGradient id="genCombustionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Power output glow */}
            <radialGradient id="genPowerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="30%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#16a34a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Sync indicator gradient */}
            <linearGradient id="genSyncIndicator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Background lab gradient */}
            <linearGradient id="genLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="genCombustionBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="genPowerOutputGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="genRotorGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="400" height="260" fill="url(#genLabBg)" rx="12" />

          {/* Diesel Engine Block */}
          <rect x="30" y="60" width="110" height="120" fill="url(#genEngineBlock)" rx="8" stroke="#64748b" strokeWidth="2" />

          {/* Engine top detail */}
          <rect x="40" y="55" width="90" height="8" fill="#475569" rx="2" />

          {/* Engine cylinders with combustion */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={45 + i * 32} y="75" width="24" height="45" fill="#1f2937" rx="3" stroke="#374151" strokeWidth="1" />
              {engineRunning && (
                <ellipse
                  cx={57 + i * 32}
                  cy={85 + Math.sin((animationFrame + i * 40) * rotationSpeed * 0.1) * 10 + 10}
                  rx="10"
                  ry={8 + Math.sin((animationFrame + i * 40) * 0.1) * 3}
                  fill="url(#genCombustionGlow)"
                  filter="url(#genCombustionBlur)"
                  opacity={0.7 + Math.sin((animationFrame + i * 40) * 0.15) * 0.3}
                />
              )}
            </g>
          ))}

          {/* Engine exhaust pipes */}
          <rect x="45" y="125" width="80" height="8" fill="#475569" rx="2" />
          {engineRunning && (
            <g opacity={0.5 + Math.sin(animationFrame * 0.1) * 0.2}>
              <circle cx="130" cy="129" r="3" fill="#6b7280" />
              <circle cx="138" cy="127 + Math.sin(animationFrame * 0.2) * 2" r="2" fill="#9ca3af" opacity="0.6" />
            </g>
          )}

          {/* Flywheel with spinning visualization */}
          <g transform={`translate(150, 120) rotate(${animationFrame * rotationSpeed * 0.5})`}>
            <circle cx="0" cy="0" r="35" fill="url(#genFlywheelMetal)" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="0" cy="0" r="28" fill="#374151" stroke="#475569" strokeWidth="1" />
            <circle cx="0" cy="0" r="8" fill="#64748b" />
            {/* Flywheel spokes */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1="10"
                y1="0"
                x2="26"
                y2="0"
                stroke="#64748b"
                strokeWidth="3"
                transform={`rotate(${angle})`}
              />
            ))}
            {/* Flywheel weight markers */}
            {[0, 90, 180, 270].map((angle, i) => (
              <circle
                key={i}
                cx="30"
                cy="0"
                r="4"
                fill="#475569"
                stroke="#64748b"
                strokeWidth="1"
                transform={`rotate(${angle})`}
              />
            ))}
          </g>

          {/* Coupling shaft */}
          <rect x="180" y="112" width="25" height="16" fill="#6b7280" rx="3" />
          <rect x="185" y="115" width="15" height="10" fill="#475569" rx="2" />

          {/* Generator Housing */}
          <rect x="205" y="70" width="95" height="100" fill="url(#genHousingMetal)" rx="8" stroke="#93c5fd" strokeWidth="2" />

          {/* Generator cooling fins */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="295" y={78 + i * 18} width="8" height="12" fill="#1d4ed8" rx="1" />
          ))}

          {/* Generator rotor with spinning windings */}
          <g transform={`translate(252, 120) rotate(${animationFrame * rotationSpeed * 0.5})`}>
            <circle cx="0" cy="0" r="38" fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="8,4" opacity="0.5" />
            <circle cx="0" cy="0" r="30" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
            {/* Rotor windings */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <rect
                  x="-4"
                  y="-28"
                  width="8"
                  height="16"
                  fill="url(#genCopperWinding)"
                  rx="2"
                  filter={rpm > 1500 ? "url(#genRotorGlow)" : undefined}
                />
              </g>
            ))}
            <circle cx="0" cy="0" r="10" fill="#475569" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* Power Output section */}
          {frequency > 30 && (
            <g>
              {/* Output cables with glow */}
              <line x1="300" y1="100" x2="345" y2="100" stroke={frequency > 50 ? "#22c55e" : "#f59e0b"} strokeWidth="4" filter={frequency > 50 ? "url(#genPowerOutputGlow)" : undefined} />
              <line x1="300" y1="140" x2="345" y2="140" stroke={frequency > 50 ? "#22c55e" : "#f59e0b"} strokeWidth="4" filter={frequency > 50 ? "url(#genPowerOutputGlow)" : undefined} />

              {/* Output terminal box */}
              <rect x="340" y="85" width="45" height="70" fill="#0f172a" rx="4" stroke={frequency > 50 ? "#22c55e" : "#f59e0b"} strokeWidth="2" />

              {/* Power meter inside terminal */}
              <rect x="348" y="93" width="30" height="8" fill="#1f2937" rx="2" />
              <rect x="348" y="93" width={powerOutput * 0.3} height="8" fill={frequency > 50 ? "#22c55e" : "#f59e0b"} rx="2" />

              {/* Power indicator LED */}
              {generatorState === 'online' && (
                <circle cx="363" cy="145" r="4" fill="url(#genPowerGlow)" filter="url(#genPowerOutputGlow)">
                  <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          )}

          {/* Synchronization indicator bar */}
          <g transform="translate(30, 195)">
            <rect x="0" y="0" width="340" height="20" fill="#0f172a" rx="4" stroke="#334155" strokeWidth="1" />
            <rect x="2" y="2" width="336" height="16" fill="#1f2937" rx="3" />
            {/* Sync progress fill */}
            <rect x="2" y="2" width={syncProgress * 3.36} height="16" fill="url(#genSyncIndicator)" rx="3" opacity="0.9" />
            {/* Target marker at 60Hz */}
            <line x1="336" y1="0" x2="336" y2="20" stroke="#22c55e" strokeWidth="2" strokeDasharray="3,2" />
          </g>

          {/* Status panel */}
          <rect x="30" y="220" width="340" height="32" fill="#0f172a" rx="6" stroke="#334155" strokeWidth="1" />

          {/* Status LED indicators */}
          <circle cx="50" cy="236" r="5" fill={
            generatorState === 'stopped' ? '#ef4444' :
            generatorState === 'cranking' ? '#f59e0b' :
            generatorState === 'warmup' ? '#fbbf24' :
            generatorState === 'sync' ? '#3b82f6' : '#22c55e'
          }>
            {generatorState !== 'stopped' && (
              <animate attributeName="opacity" values="1;0.4;1" dur={generatorState === 'online' ? "2s" : "0.5s"} repeatCount="indefinite" />
            )}
          </circle>
        </svg>

        {/* Status labels outside SVG using typo system */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-between px-8" style={{ fontSize: typo.small }}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-slate-500 uppercase tracking-wide" style={{ fontSize: typo.label }}>State</div>
              <div className={`font-bold ${
                generatorState === 'stopped' ? 'text-red-400' :
                generatorState === 'cranking' ? 'text-amber-400' :
                generatorState === 'warmup' ? 'text-yellow-400' :
                generatorState === 'sync' ? 'text-blue-400' : 'text-emerald-400'
              }`}>{generatorState.toUpperCase()}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 uppercase tracking-wide" style={{ fontSize: typo.label }}>RPM</div>
              <div className="font-bold text-white">{rpm.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 uppercase tracking-wide" style={{ fontSize: typo.label }}>Frequency</div>
              <div className="font-bold text-white">{frequency.toFixed(1)} Hz</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 uppercase tracking-wide" style={{ fontSize: typo.label }}>Time</div>
              <div className="font-bold text-white">{startupTime.toFixed(1)}s</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFrequencyDroopVisualization = () => {
    const targetFreq = 60;
    const droopPercentage = ((targetFreq - frequencyDroop) / targetFreq) * 100;
    const governorResponse = isLoadApplied ? Math.min(100, loadPercentage * 1.2) : 0;

    return (
      <div className="relative">
        <svg viewBox="0 0 400 240" className="w-full h-52">
          <defs>
            {/* Frequency meter gradient */}
            <linearGradient id="genFreqMeterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Load bar gradient */}
            <linearGradient id="genLoadBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#8b5cf6" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Governor response gradient */}
            <linearGradient id="genGovernorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            {/* Danger zone glow */}
            <linearGradient id="genDangerZone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.1" />
            </linearGradient>

            {/* Safe zone glow */}
            <linearGradient id="genSafeZone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.2" />
            </linearGradient>

            {/* Digital display gradient */}
            <linearGradient id="genDigitalDisplay" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Panel background */}
            <linearGradient id="genPanelBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="genFreqGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="genDangerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="genDigitalGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="400" height="240" fill="url(#genPanelBg)" rx="12" />

          {/* Frequency meter panel */}
          <rect x="20" y="15" width="220" height="140" fill="#0f172a" rx="8" stroke="#334155" strokeWidth="1" />

          {/* Safe zone (58-62 Hz) */}
          <rect x="30" y="25" width="200" height="30" fill="url(#genSafeZone)" rx="4" />

          {/* Danger zone (below 57 Hz) */}
          <rect x="30" y="95" width="200" height="50" fill="url(#genDangerZone)" rx="4" />

          {/* Frequency scale lines */}
          {[60, 59, 58, 57, 56, 55].map((freq, i) => (
            <g key={freq}>
              <line
                x1="30"
                y1={25 + i * 20}
                x2="230"
                y2={25 + i * 20}
                stroke={freq >= 58 ? "#22c55e" : freq >= 56 ? "#f59e0b" : "#ef4444"}
                strokeWidth="1"
                strokeDasharray={freq === 60 ? "0" : "3,3"}
                opacity={freq === 60 ? 1 : 0.5}
              />
            </g>
          ))}

          {/* Current frequency indicator line */}
          <line
            x1="30"
            y1={25 + (60 - frequencyDroop) * 20}
            x2="230"
            y2={25 + (60 - frequencyDroop) * 20}
            stroke={frequencyDroop < 57 ? "#ef4444" : frequencyDroop < 59 ? "#fbbf24" : "#22c55e"}
            strokeWidth="4"
            filter="url(#genFreqGlow)"
          >
            {isLoadApplied && (
              <animate
                attributeName="y1"
                values={`${25 + (60 - frequencyDroop) * 20};${27 + (60 - frequencyDroop) * 20};${25 + (60 - frequencyDroop) * 20}`}
                dur="0.3s"
                repeatCount="indefinite"
              />
            )}
          </line>

          {/* Digital frequency display */}
          <rect x="250" y="15" width="130" height="70" fill="url(#genDigitalDisplay)" rx="8" stroke="#334155" strokeWidth="1" />
          <rect x="258" y="23" width="114" height="54" fill="#0a0f1a" rx="4" />

          {/* Frequency readout segments */}
          <g filter="url(#genDigitalGlow)">
            {/* Main frequency value - no text element, handled outside SVG */}
          </g>

          {/* Governor response meter */}
          <rect x="250" y="95" width="130" height="60" fill="#0f172a" rx="8" stroke="#334155" strokeWidth="1" />
          <rect x="260" y="115" width="110" height="12" fill="#1f2937" rx="3" />
          <rect
            x="260"
            y="115"
            width={governorResponse * 1.1}
            height="12"
            fill="url(#genGovernorGrad)"
            rx="3"
            filter={governorResponse > 50 ? "url(#genFreqGlow)" : undefined}
          />

          {/* Governor activity indicator */}
          {isLoadApplied && (
            <circle cx="375" cy="105" r="4" fill="#06b6d4">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Load bar section */}
          <rect x="20" y="165" width="360" height="55" fill="#0f172a" rx="8" stroke="#334155" strokeWidth="1" />

          {/* Load bar track */}
          <rect x="30" y="190" width="340" height="20" fill="#1f2937" rx="6" />

          {/* Load bar fill with gradient */}
          <rect
            x="30"
            y="190"
            width={loadPercentage * 3.4}
            height="20"
            fill="url(#genLoadBarGrad)"
            rx="6"
            style={{ clipPath: `inset(0 ${100 - loadPercentage}% 0 0)` }}
          />

          {/* Load percentage markers */}
          {[25, 50, 75, 100].map((mark) => (
            <line
              key={mark}
              x1={30 + mark * 3.4}
              y1="188"
              x2={30 + mark * 3.4}
              y2="212"
              stroke="#475569"
              strokeWidth="1"
            />
          ))}

          {/* Danger threshold indicator at 80% */}
          <line x1="302" y1="185" x2="302" y2="215" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />

          {/* Warning LED for high load */}
          {loadPercentage > 80 && (
            <circle cx="350" cy="175" r="5" fill="#ef4444" filter="url(#genDangerGlow)">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="absolute top-4 left-0 right-0 px-6">
          {/* Frequency scale labels */}
          <div className="absolute left-6 top-3 flex flex-col gap-3" style={{ fontSize: typo.label }}>
            {[60, 59, 58, 57, 56, 55].map((freq) => (
              <div
                key={freq}
                className={`${freq >= 58 ? 'text-emerald-400' : freq >= 56 ? 'text-amber-400' : 'text-red-400'}`}
                style={{ lineHeight: '20px' }}
              >
                {freq}Hz
              </div>
            ))}
          </div>
        </div>

        {/* Digital frequency display overlay */}
        <div className="absolute top-6 right-6 text-center" style={{ width: '130px' }}>
          <div
            className={`font-mono font-bold ${
              frequencyDroop < 57 ? 'text-red-400' : frequencyDroop < 59 ? 'text-amber-400' : 'text-emerald-400'
            }`}
            style={{ fontSize: typo.heading, textShadow: '0 0 10px currentColor' }}
          >
            {frequencyDroop.toFixed(1)}
          </div>
          <div className="text-slate-500" style={{ fontSize: typo.label }}>HERTZ</div>
          <div className="text-slate-400 mt-1" style={{ fontSize: typo.label }}>
            {droopPercentage.toFixed(1)}% droop
          </div>
        </div>

        {/* Governor label */}
        <div className="absolute right-6" style={{ top: '95px', width: '130px' }}>
          <div className="text-cyan-400 font-medium text-center" style={{ fontSize: typo.label }}>
            GOVERNOR RESPONSE
          </div>
        </div>

        {/* Load label */}
        <div className="absolute bottom-14 left-8 right-8 flex justify-between items-center">
          <div className="text-slate-400 font-medium" style={{ fontSize: typo.small }}>LOAD</div>
          <div className="text-white font-bold" style={{ fontSize: typo.body }}>{loadPercentage}%</div>
        </div>

        {/* Status message */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <div className="text-slate-500" style={{ fontSize: typo.small }}>
            {isLoadApplied
              ? frequencyDroop < 57
                ? 'CRITICAL: Equipment protection may engage!'
                : frequencyDroop < 59
                ? `Governor compensating for ${loadPercentage}% load...`
                : 'Frequency stable - governor maintaining control'
              : 'Adjust load slider and apply to see frequency droop'}
          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-orange-400 tracking-wide">DATA CENTER PHYSICS</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/30">
          <span className="text-4xl">⚙️</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
          Diesel Generator Startup
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10">
          Why does it take 10 seconds for the backup generator to kick in?
        </p>

        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />
          <div className="relative flex items-start gap-4 text-left">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">The Critical Delay</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                When the grid fails, generators don&apos;t start instantly. Heavy rotating masses,
                synchronization requirements, and physics create an unavoidable 10+ second delay.
              </p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Explore Generator Startup')}
    </div>
  );

  const renderPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-xl">🤔</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Make Your Prediction</h2>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <p className="text-blue-800 leading-relaxed">
          A data center&apos;s power fails. The diesel generator needs to start and take over.
        </p>
        <p className="text-blue-700 mt-2 font-medium">
          Why can&apos;t the generator provide power instantly like flipping a switch?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'fuel', label: 'Diesel fuel takes time to ignite', icon: '🛢️' },
          { id: 'inertia', label: 'Heavy rotating parts must accelerate to full speed', icon: '⚙️' },
          { id: 'warmup', label: 'The engine needs to warm up first', icon: '🌡️' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'inertia'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          prediction === 'inertia' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${prediction === 'inertia' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {prediction === 'inertia' ? (
              <><strong>Exactly right!</strong> Rotational inertia is the main factor. A 2-ton flywheel and generator rotor must spin up to 1800 RPM (North America) before producing proper 60Hz power. Physics takes time!</>
            ) : (
              <><strong>Partially correct, but:</strong> The main delay is rotational inertia - heavy rotating masses need time to accelerate. The engine, flywheel, and generator rotor must all spin up to exactly 1800 RPM for 60Hz output.</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showPredictionFeedback, 'Watch a Generator Start')}
    </div>
  );

  const renderPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Generator Startup Simulator</h2>
          <p className="text-sm text-slate-500">Watch the startup sequence unfold</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderGeneratorVisualization()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {generatorState === 'stopped' ? (
          <button
            onClick={handleStartGenerator}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
          >
            Start Generator
          </button>
        ) : generatorState === 'online' ? (
          <button
            onClick={handleResetGenerator}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg"
          >
            Reset Simulation
          </button>
        ) : (
          <div className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-amber-100 text-amber-800 text-center">
            Starting... {startupTime.toFixed(1)}s
          </div>
        )}
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-orange-800 mb-2">Startup Sequence:</h4>
        <ul className="text-orange-700 text-sm space-y-1">
          <li className={generatorState === 'cranking' ? 'font-bold' : ''}>1. Cranking (0-2s): Starter motor spins engine</li>
          <li className={generatorState === 'warmup' ? 'font-bold' : ''}>2. Warmup (2-5s): Engine fires, RPM increases</li>
          <li className={generatorState === 'sync' ? 'font-bold' : ''}>3. Sync (5-10s): Speed stabilizes at 1800 RPM = 60Hz</li>
          <li className={generatorState === 'online' ? 'font-bold' : ''}>4. Online: Ready to accept load!</li>
        </ul>
      </div>

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : 'Start the generator first...')}
    </div>
  );

  const renderReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding Generator Physics</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">Generator Frequency Formula</p>
        <div className="text-2xl font-bold mb-2">f = (P x N) / 120</div>
        <p className="text-indigo-200 text-sm">
          f = frequency (Hz), P = poles, N = RPM
        </p>
        <p className="text-indigo-100 text-sm mt-2">
          4-pole @ 1800 RPM = 60 Hz
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '⚙️',
            title: 'Rotational Inertia',
            desc: 'Heavy flywheels and rotors resist speed changes. This provides stability but means slow startup. J = moment of inertia determines acceleration time.',
          },
          {
            icon: '🔄',
            title: 'Synchronization',
            desc: 'Before connecting to load, generator must match grid frequency (60Hz), voltage, and phase angle. Mismatched connection causes severe damage.',
          },
          {
            icon: '📊',
            title: 'Governor Control',
            desc: 'The governor adjusts fuel flow to maintain constant speed. When load increases, speed drops briefly until governor compensates.',
          },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {renderBottomBar(true, 'Now for a Twist...')}
    </div>
  );

  const renderTwistPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <span className="text-xl">🔄</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The Load Pickup Twist</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <p className="text-amber-800 leading-relaxed">
          The generator is running at perfect 60Hz. Suddenly, the UPS transfers 500kW of data center load to it.
        </p>
        <p className="text-amber-700 mt-2 font-medium">
          What happens to the frequency?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'stable', label: 'Stays at 60Hz - generator is designed for this', icon: '✓' },
          { id: 'droop', label: 'Frequency drops briefly then recovers (droop)', icon: '📉' },
          { id: 'increase', label: 'Frequency increases from the extra energy', icon: '📈' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'droop'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'droop' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${twistPrediction === 'droop' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {twistPrediction === 'droop' ? (
              <><strong>Exactly right!</strong> Sudden load acts like a brake on the engine. Frequency drops until the governor increases fuel flow. This &quot;frequency droop&quot; is why load acceptance rates are limited!</>
            ) : (
              <><strong>Physics says otherwise:</strong> Sudden load acts like a brake on the rotating mass. The frequency drops (droop) until the governor compensates by adding more fuel. Too fast = equipment damage!</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showTwistFeedback, 'Explore Frequency Droop')}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Frequency Droop Simulator</h2>
          <p className="text-sm text-slate-500">See how load affects generator frequency</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderFrequencyDroopVisualization()}
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-4">
        <label className="text-slate-700 text-sm font-medium block mb-2">
          Load Level: {loadPercentage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={loadPercentage}
          onChange={(e) => setLoadPercentage(parseInt(e.target.value))}
          className="w-full accent-orange-500"
          disabled={!isLoadApplied}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {!isLoadApplied ? (
          <button
            onClick={handleApplyLoad}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg"
          >
            Apply Load to Generator
          </button>
        ) : (
          <button
            onClick={handleReleaseLoad}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
          >
            Release Load
          </button>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
        <p className="text-red-800 text-sm leading-relaxed">
          <strong>Warning:</strong> If frequency drops below 57Hz for too long, sensitive equipment may disconnect for self-protection.
          Data centers limit load acceptance rate to 25-50% steps to prevent excessive droop!
        </p>
      </div>

      {renderBottomBar(hasExploredTwist, hasExploredTwist ? 'Continue' : 'Apply load to the generator...')}
    </div>
  );

  const renderTwistReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Managing Generator Dynamics</h2>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Load Management Strategies</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">📶</div>
            <div className="text-sm text-slate-700 font-medium">Stepped Loading</div>
            <div className="text-xs text-teal-600">25-50% steps</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-sm text-slate-700 font-medium">Time Delays</div>
            <div className="text-xs text-teal-600">5-10s between steps</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🔄</div>
            <div className="text-sm text-slate-700 font-medium">Flywheel Storage</div>
            <div className="text-xs text-teal-600">Smooths transients</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-700 font-medium">Fast Governors</div>
            <div className="text-xs text-teal-600">Electronic control</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-slate-800 mb-2">Data Center Best Practices</h4>
        <ul className="text-slate-600 text-sm space-y-2">
          <li>Limit load acceptance rate to prevent frequency droop</li>
          <li>Use multiple generators in parallel for redundancy</li>
          <li>Electronic governors respond faster than mechanical</li>
          <li>Regular testing ensures reliability during actual outages</li>
        </ul>
      </div>

      {renderBottomBar(true, 'See Real Applications')}
    </div>
  );

  const renderTransfer = () => {
    const allAppsCompleted = completedApps.size >= 4;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-xl">🌍</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Real-World Applications</h2>
            <p className="text-sm text-slate-500">Complete all 4 to unlock assessment</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TRANSFER_APPS.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                activeAppTab === index
                  ? 'bg-orange-500 text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {completedApps.has(index) && <span>✓</span>}
              {app.icon}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
              <h3 className="font-bold text-slate-800 text-lg">{TRANSFER_APPS[activeAppTab].title}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {TRANSFER_APPS[activeAppTab].description}
            </p>
            {!completedApps.has(activeAppTab) ? (
              <button
                onClick={() => handleCompleteApp(activeAppTab)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Mark as Complete
              </button>
            ) : (
              <div className="w-full py-3 bg-orange-100 text-orange-700 rounded-xl font-semibold text-center">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-orange-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedApps.size / 4) * 100}%` }}
            />
          </div>
        </div>

        {renderBottomBar(allAppsCompleted, allAppsCompleted ? 'Take the Assessment' : `Complete ${4 - completedApps.size} more`)}
      </div>
    );
  };

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <span className="text-xl">📝</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Knowledge Assessment</h2>
            <p className="text-sm text-slate-500">10 questions - 70% to pass</p>
          </div>
        </div>

        {!testSubmitted ? (
          <>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Progress</span>
                <span className="text-sm font-bold text-violet-600">{answeredCount}/10</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / 10) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-6 mb-6">
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                      testAnswers[qIndex] !== null ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {qIndex + 1}
                    </span>
                    <p className="font-medium text-slate-800 leading-relaxed">{q.question}</p>
                  </div>
                  <div className="space-y-2 ml-10">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={`w-full p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-violet-500 text-white shadow-lg'
                            : 'bg-slate-50 text-slate-700 hover:bg-violet-50 border border-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmitTest}
              disabled={!allAnswered}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
                allAnswered
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '⚙️' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7 ? 'Excellent! You understand generator dynamics!' : 'Review the concepts and try again.'}
            </p>

            {testScore >= 7 ? (
              renderBottomBar(true, 'Complete Lesson')
            ) : (
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-slate-200 text-slate-700"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="max-w-2xl mx-auto px-6 py-8 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-500/30 mb-6">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">Generator Dynamics Master!</h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand why generators need time to start and how to manage load dynamics.
      </p>

      <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'Rotational inertia causes 10+ second startup time',
            'Frequency = (Poles x RPM) / 120',
            'Synchronization must match frequency, voltage, and phase',
            'Frequency droop occurs during sudden load pickup',
            'Governors control speed by adjusting fuel flow',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm">✓</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-semibold"
        >
          Complete
        </button>
      </div>
    </div>
  );

  // Main render
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {renderProgressBar()}
      <div className="flex-1 overflow-auto">
        {renderPhase()}
      </div>
    </div>
  );
}
