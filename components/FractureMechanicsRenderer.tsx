'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface FractureMechanicsRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const realWorldApps = [
  {
    icon: '✈️',
    title: 'Aircraft Structural Integrity',
    short: 'Why airplane windows have rounded corners',
    tagline: 'The shape that saved aviation',
    description: 'After the de Havilland Comet disasters in 1954, engineers discovered that square window corners created stress concentrations up to 6x normal levels. Rounded corners distribute stress evenly, preventing crack initiation.',
    connection: 'The stress concentration factor (Kt) you learned about explains why sharp corners are deadly: local stress = Kt × average stress, and sharp corners have Kt > 3.',
    howItWorks: 'Sharp corners create geometric discontinuities where stress flow lines crowd together. Rounded corners allow stress to flow smoothly. Aircraft undergo regular inspection for microscopic fatigue cracks before they can propagate.',
    stats: [
      { value: '3-6x', label: 'Stress concentration at square corners', icon: '📐' },
      { value: '30,000+', label: 'Flight cycles before inspection', icon: '✈️' },
      { value: '$15B', label: 'Aircraft MRO market', icon: '💰' }
    ],
    examples: ['Boeing 737 window design', 'Airbus fuselage stress analysis', 'De Havilland Comet investigations', 'Spacecraft hatch design'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'SpaceX'],
    futureImpact: 'Composite materials with designed crack-arrest features will enable self-healing aircraft structures that stop cracks before they propagate.',
    color: '#3B82F6'
  },
  {
    icon: '🔧',
    title: 'Stop-Drill Crack Arrest',
    short: 'Drilling holes to stop cracks',
    tagline: 'The counterintuitive repair that works',
    description: 'When a crack forms in metal structures, engineers often drill a circular hole at the crack tip. This counterintuitive technique reduces stress concentration from near-infinite at a sharp crack tip to manageable levels.',
    connection: 'You learned that crack tips have extreme stress concentration. A drilled hole has Kt ≈ 3, while a sharp crack tip approaches infinity. The hole converts a dangerous crack into a manageable stress raiser.',
    howItWorks: 'The sharp crack tip concentrates stress to fracture-inducing levels. Drilling a hole blunts the tip, distributing stress over a larger area. The crack effectively becomes a hole with finite, manageable stress concentration.',
    stats: [
      { value: '∞ → 3', label: 'Stress reduction at crack tip', icon: '📉' },
      { value: '80%', label: 'Life extension possible', icon: '⏰' },
      { value: '$500M', label: 'Annual savings in repairs', icon: '💰' }
    ],
    examples: ['Aircraft fuselage repairs', 'Ship hull maintenance', 'Bridge girder cracks', 'Pressure vessel repairs'],
    companies: ['Textron Aviation', 'General Dynamics', 'Newport News Shipbuilding', 'AECOM'],
    futureImpact: 'Laser-drilled precision holes with crack-monitoring sensors will enable autonomous structural health monitoring.',
    color: '#EF4444'
  },
  {
    icon: '💎',
    title: 'Diamond Cutting & Scoring',
    short: 'Using stress concentration to cut the hardest material',
    tagline: 'Controlled fracture is precise cutting',
    description: 'Glass and diamonds are cut by creating controlled stress concentrations. A score line creates a crack initiation point with extreme stress concentration, allowing fracture along a precise path with minimal force.',
    connection: 'The scorer creates a V-notch - the highest stress concentration shape you studied. When bent, all fracture energy focuses at this notch, making the material break exactly where intended.',
    howItWorks: 'A hard point (diamond tip) creates a shallow scratch with a sharp V-bottom. When force is applied, stress concentrates at the scratch tip (Kt → ∞). The material fractures along this pre-determined path.',
    stats: [
      { value: '10 GPa', label: 'Diamond hardness', icon: '💎' },
      { value: '< 1 mm', label: 'Score depth needed', icon: '📏' },
      { value: '$85B', label: 'Global diamond market', icon: '💰' }
    ],
    examples: ['Diamond cleaving', 'Glass cutting', 'Silicon wafer dicing', 'Ceramic tile cutting'],
    companies: ['De Beers', 'Rio Tinto', 'Corning', 'Schott'],
    futureImpact: 'Laser-induced controlled fracture will enable precise cutting of advanced materials like synthetic sapphire and silicon carbide.',
    color: '#8B5CF6'
  },
  {
    icon: '🏗️',
    title: 'Fatigue-Resistant Design',
    short: 'Engineering structures to survive billions of cycles',
    tagline: 'Design for the millionth load, not the first',
    description: 'Bridges, engines, and aircraft experience millions of stress cycles. Fatigue failure occurs far below yield strength when repeated loading grows microscopic cracks. Engineers design for fatigue life, not static strength.',
    connection: 'Fatigue cracks initiate at stress concentrations you studied. Each load cycle grows the crack slightly until it reaches critical size and causes sudden catastrophic failure.',
    howItWorks: 'S-N curves show stress vs. cycles to failure. Below the fatigue limit, infinite life is possible. Above it, life is finite. Designs minimize stress concentrations, use shot peening to compress surfaces, and specify inspection intervals.',
    stats: [
      { value: '10^7', label: 'Cycles for infinite fatigue life', icon: '🔄' },
      { value: '50%', label: 'Of mechanical failures from fatigue', icon: '⚠️' },
      { value: '$100B', label: 'Annual fatigue-related costs', icon: '💰' }
    ],
    examples: ['Jet engine turbine blades', 'Suspension bridge cables', 'Automobile crankshafts', 'Railroad wheel axles'],
    companies: ['GE Aviation', 'Rolls-Royce', 'ANSYS', 'Siemens PLM'],
    futureImpact: 'Digital twins with real-time fatigue tracking will predict exact remaining life, enabling just-in-time maintenance.',
    color: '#22C55E'
  }
];

const TEST_QUESTIONS = [
  {
    question: 'Why do airplane windows have rounded corners?',
    options: [
      { text: 'Rounded corners look more modern', correct: false },
      { text: 'Sharp corners create stress concentration that can cause cracks', correct: true },
      { text: 'Rounded corners are easier to manufacture', correct: false },
      { text: 'It helps with air pressure equalization', correct: false }
    ],
  },
  {
    question: 'What is stress concentration factor (Kt)?',
    options: [
      { text: 'The total stress on a material', correct: false },
      { text: 'The ratio of maximum local stress to average stress', correct: true },
      { text: 'The temperature at which stress increases', correct: false },
      { text: 'The speed of crack propagation', correct: false }
    ],
  },
  {
    question: 'How can you stop a crack from propagating?',
    options: [
      { text: 'Apply more force to close it', correct: false },
      { text: 'Heat the material', correct: false },
      { text: 'Drill a hole at the crack tip to reduce stress concentration', correct: true },
      { text: 'Cover it with tape', correct: false }
    ],
  },
  {
    question: 'Which shape has the HIGHEST stress concentration?',
    options: [
      { text: 'Circular hole', correct: false },
      { text: 'Ellipse with long axis perpendicular to stress', correct: false },
      { text: 'Sharp V-notch', correct: true },
      { text: 'Rounded notch', correct: false }
    ],
  },
  {
    question: 'What is the difference between brittle and ductile fracture?',
    options: [
      { text: 'Brittle fracture occurs with little deformation; ductile fracture involves significant plastic deformation', correct: true },
      { text: 'Brittle fracture only happens in metals; ductile fracture happens in ceramics', correct: false },
      { text: 'There is no difference, they are the same type of failure', correct: false },
      { text: 'Ductile fracture is faster than brittle fracture', correct: false }
    ],
  },
  {
    question: 'Why does glass break suddenly without warning?',
    options: [
      { text: 'Glass is too thin to show deformation', correct: false },
      { text: 'Glass is a brittle material with no plastic deformation before fracture', correct: true },
      { text: 'Glass always has internal cracks that are invisible', correct: false },
      { text: 'Glass breaks slowly but we cannot see it', correct: false }
    ],
  },
  {
    question: 'What is fatigue failure in materials?',
    options: [
      { text: 'Failure due to the material getting tired over time', correct: false },
      { text: 'Failure caused by repeated cyclic loading below the yield strength', correct: true },
      { text: 'Failure from a single large overload', correct: false },
      { text: 'Failure due to chemical corrosion', correct: false }
    ],
  },
  {
    question: 'According to Griffith criterion, when does a crack propagate?',
    options: [
      { text: 'When the crack is longer than 1 cm', correct: false },
      { text: 'When energy released by crack growth exceeds energy needed to create new surfaces', correct: true },
      { text: 'When the material temperature increases', correct: false },
      { text: 'When the crack is perpendicular to the stress', correct: false }
    ],
  },
  {
    question: 'What does the stress intensity factor (K) describe?',
    options: [
      { text: 'The average stress in a material', correct: false },
      { text: 'The intensity of the stress field near a crack tip', correct: true },
      { text: 'The number of stress cycles before failure', correct: false },
      { text: 'The ratio of applied stress to yield stress', correct: false }
    ],
  },
  {
    question: 'Why are airplane fuselages regularly inspected for fatigue cracks?',
    options: [
      { text: 'Repeated pressurization cycles cause small cracks to grow over time', correct: true },
      { text: 'Airplanes are made of brittle materials that crack easily', correct: false },
      { text: 'Cracks only form during takeoff, not flight', correct: false },
      { text: 'Inspection is only required for older aircraft', correct: false }
    ],
  },
];

const TRANSFER_APPS = [
  {
    title: 'Aircraft Design',
    description: 'De Havilland Comet crashes led to rounded windows - stress at corners caused fuselage failures.',
    icon: '✈️'
  },
  {
    title: 'Crack-Stop Holes',
    description: 'Drilling a hole at a crack tip reduces Kt, stopping propagation. Used in ship repair!',
    icon: '🕳️'
  },
  {
    title: 'Fillet Radii',
    description: 'Engineers add rounded transitions (fillets) at corners to reduce stress concentration.',
    icon: '⚙️'
  },
  {
    title: 'Perforation Lines',
    description: 'Toilet paper tears easily along perforations - intentional stress concentrators!',
    icon: '🧻'
  }
];

const testQuestions = [
  {
    scenario: 'A pressure vessel has a small scratch on its inner surface. Under repeated pressurization cycles, engineers notice the scratch has grown into a visible crack.',
    question: 'Why does stress concentrate at the tip of a crack or sharp defect?',
    options: [
      { id: 'a', label: 'The material is weaker at those locations due to manufacturing defects' },
      { id: 'b', label: 'Stress flow lines crowd together at sharp features, amplifying local stress', correct: true },
      { id: 'c', label: 'Cracks absorb heat which weakens the surrounding material' },
      { id: 'd', label: 'Sharp corners reflect stress waves back into the material' }
    ],
    explanation: 'Stress flows through a material like fluid through a channel. When it encounters a sharp feature like a crack tip, the stress flow lines must crowd together to go around the obstacle. This crowding effect dramatically amplifies the local stress at the tip, often by factors of 5-10x or more for sharp cracks.'
  },
  {
    scenario: 'A glass window in a skyscraper develops a tiny edge chip during installation. Six months later, during a cold snap, the entire pane suddenly shatters.',
    question: 'According to the Griffith criterion, what causes a crack to propagate?',
    options: [
      { id: 'a', label: 'The crack reaches a critical length regardless of applied stress' },
      { id: 'b', label: 'Temperature changes always cause crack growth in brittle materials' },
      { id: 'c', label: 'Energy released by crack growth exceeds energy needed to create new surfaces', correct: true },
      { id: 'd', label: 'Vibrations from wind cause resonance at the crack tip' }
    ],
    explanation: 'Griffith showed that cracks propagate when the strain energy released by crack extension exceeds the surface energy required to create new crack surfaces. Below this threshold, cracks remain stable. The cold snap increased thermal stresses enough to tip the energy balance, causing catastrophic propagation.'
  },
  {
    scenario: 'Two identical steel components fail under the same load. Component A shows a rough, grainy fracture surface with shear lips at the edges. Component B has a smooth, mirror-like fracture surface with no plastic deformation.',
    question: 'Which component experienced brittle fracture and why is this distinction important?',
    options: [
      { id: 'a', label: 'Component A; rough surfaces indicate rapid crack propagation' },
      { id: 'b', label: 'Component B; smooth surface and no plastic deformation indicate brittle failure', correct: true },
      { id: 'c', label: 'Both experienced brittle fracture at different temperatures' },
      { id: 'd', label: 'Neither; steel always fails in a ductile manner' }
    ],
    explanation: 'Brittle fracture occurs with little to no plastic deformation, producing smooth, often mirror-like fracture surfaces. Ductile fracture involves significant plastic deformation before failure, creating rough surfaces with shear lips. This distinction matters because brittle failures are sudden and catastrophic with no warning, while ductile failures show visible deformation first.'
  },
  {
    scenario: 'An aircraft wing undergoes approximately 10,000 pressurization cycles per year. After 15 years of service, routine inspection discovers small cracks emanating from rivet holes, despite the wing never experiencing loads above 60% of its design limit.',
    question: 'What mechanism caused these cracks to form below the yield strength?',
    options: [
      { id: 'a', label: 'Hydrogen embrittlement from atmospheric moisture' },
      { id: 'b', label: 'Fatigue failure from repeated cyclic loading below yield strength', correct: true },
      { id: 'c', label: 'Creep deformation from sustained loading over time' },
      { id: 'd', label: 'Galvanic corrosion between dissimilar metals' }
    ],
    explanation: 'Fatigue failure occurs when materials are subjected to repeated cyclic stresses well below their yield strength. Each cycle causes microscopic damage accumulation at stress concentrators like rivet holes. Over thousands of cycles, these micro-cracks coalesce and grow into visible cracks. This is why aircraft have mandatory inspection intervals based on flight cycles.'
  },
  {
    scenario: 'An engineer is analyzing a cracked pipeline and calculates the stress intensity factor K to be 45 MPa-sqrt(m). The pipeline material has a fracture toughness KIC of 50 MPa-sqrt(m).',
    question: 'What does the stress intensity factor K represent and what should the engineer conclude?',
    options: [
      { id: 'a', label: 'K measures crack length; the crack is 90% of critical size' },
      { id: 'b', label: 'K measures stress field intensity at crack tip; crack is near critical - immediate action needed', correct: true },
      { id: 'c', label: 'K measures material hardness; the pipe needs heat treatment' },
      { id: 'd', label: 'K measures average stress; the pipe is operating safely within limits' }
    ],
    explanation: 'The stress intensity factor K characterizes the magnitude of the stress field around a crack tip, combining effects of applied stress and crack geometry. When K approaches the material\'s fracture toughness KIC, unstable crack propagation occurs. At K = 45 vs KIC = 50, the crack is at 90% of critical - the engineer should immediately reduce pressure and schedule repair.'
  },
  {
    scenario: 'A materials testing lab needs to determine the fracture toughness (KIC) of a new aluminum alloy for aerospace applications. They must choose an appropriate test specimen geometry.',
    question: 'Why do fracture toughness tests require specific specimen thickness requirements?',
    options: [
      { id: 'a', label: 'Thicker specimens are easier to machine with precise crack geometries' },
      { id: 'b', label: 'Thin specimens give artificially high toughness due to plane stress conditions', correct: true },
      { id: 'c', label: 'Specimen thickness must match the intended application thickness exactly' },
      { id: 'd', label: 'Testing equipment can only grip specimens above a minimum thickness' }
    ],
    explanation: 'Fracture toughness depends on the stress state at the crack tip. Thin specimens experience plane stress (triaxial stress relieved at free surfaces), allowing more plastic deformation and higher apparent toughness. Thick specimens develop plane strain conditions, giving lower, more conservative KIC values. Standards specify minimum thickness to ensure plane strain and reproducible results.'
  },
  {
    scenario: 'A ceramic furnace lining repeatedly cracks after rapid temperature changes during startup, even though the material easily withstands the maximum operating temperature when heated slowly.',
    question: 'What causes thermal shock fracture in ceramics?',
    options: [
      { id: 'a', label: 'Chemical reactions with furnace gases at high temperature' },
      { id: 'b', label: 'Differential expansion creates internal stresses exceeding fracture strength', correct: true },
      { id: 'c', label: 'Thermal radiation damages the crystal structure' },
      { id: 'd', label: 'Phase transformations occur only during rapid heating' }
    ],
    explanation: 'During rapid temperature change, the surface and interior of a ceramic heat at different rates. This temperature gradient causes differential thermal expansion - the hot surface wants to expand while the cooler interior constrains it. These internal stresses can exceed the material\'s fracture strength, causing cracking. Slow heating allows temperature equalization, preventing thermal shock.'
  },
  {
    scenario: 'A pipeline weld passes visual inspection but fails catastrophically during a pressure test. Post-failure analysis reveals a lack-of-fusion defect hidden at the weld root.',
    question: 'Why are internal weld defects like lack-of-fusion particularly dangerous from a fracture mechanics perspective?',
    options: [
      { id: 'a', label: 'They reduce the total cross-sectional area of the weld' },
      { id: 'b', label: 'They create sharp crack-like flaws with high stress concentration factors', correct: true },
      { id: 'c', label: 'They trap corrosive gases that weaken the weld metal' },
      { id: 'd', label: 'They indicate the welder was not properly certified' }
    ],
    explanation: 'Lack-of-fusion defects create planar, crack-like discontinuities within the weld. These sharp-tipped flaws act as pre-existing cracks with very high stress concentration factors. Unlike rounded pores that have Kt around 2-3, lack-of-fusion defects can have Kt approaching infinity at their tips, making them far more likely to initiate catastrophic fracture under load.'
  },
  {
    scenario: 'A carbon fiber composite wing skin shows visible whitening (stress whitening) along a line after a hard landing. Ultrasonic inspection reveals the layers have separated in that region.',
    question: 'What is delamination in composite materials and why is it a critical failure mode?',
    options: [
      { id: 'a', label: 'Surface paint damage that exposes fibers to UV degradation' },
      { id: 'b', label: 'Separation between composite layers that propagates under load and reduces strength', correct: true },
      { id: 'c', label: 'Chemical breakdown of the resin matrix at high temperatures' },
      { id: 'd', label: 'Fiber breakage that occurs during manufacturing' }
    ],
    explanation: 'Delamination is the separation of adjacent layers in a laminated composite, typically occurring at the weak resin-rich interface between plies. Once initiated, delamination can propagate rapidly under continued loading, especially under compression or cyclic loads. This dramatically reduces the load-carrying capacity of the composite structure and is difficult to detect visually, making it a critical failure mode.'
  },
  {
    scenario: 'Engineers designing a large ship hull incorporate "crack arrestor strakes" - thick steel strips welded perpendicular to the hull plating at regular intervals. During service, a crack initiates but stops when it reaches an arrestor.',
    question: 'How do crack arrestor features prevent catastrophic failure?',
    options: [
      { id: 'a', label: 'They chemically bond with the crack surfaces to seal them shut' },
      { id: 'b', label: 'They provide tougher material and geometry changes that reduce crack driving force', correct: true },
      { id: 'c', label: 'They create electrical barriers that prevent electrochemical crack growth' },
      { id: 'd', label: 'They absorb vibrations that would otherwise drive crack propagation' }
    ],
    explanation: 'Crack arrestors work through multiple mechanisms: the thicker, tougher material requires more energy to crack through, the geometry change disrupts the stress field at the crack tip reducing the stress intensity factor, and the material transition can blunt the crack tip. Together, these effects reduce the crack driving force below the critical value, arresting propagation and preventing a local crack from becoming a catastrophic hull failure.'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FractureMechanicsRenderer({ phase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: FractureMechanicsRendererProps) {
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

  // ─── State ───────────────────────────────────────────────────────────────────
  const [currentPhase, setCurrentPhase] = useState<Phase>(phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [notchType, setNotchType] = useState<'none' | 'round' | 'vsharp' | 'crack'>('none');
  const [appliedStress, setAppliedStress] = useState(0);
  const [isFractured, setIsFractured] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - crack stop hole
  const [hasCrackStopHole, setHasCrackStopHole] = useState(false);
  const [crackLength, setCrackLength] = useState(20);
  const [twistStress, setTwistStress] = useState(0);

  const navigationLockRef = useRef(false);

  // Stress concentration factors
  const getStressConcentration = (type: string): number => {
    switch (type) {
      case 'none': return 1;
      case 'round': return 2; // Circular hole ≈ 2-3
      case 'vsharp': return 5; // Sharp V-notch can be 5+
      case 'crack': return 10; // Crack tip approaches infinity (limited here)
      default: return 1;
    }
  };

  const getFractureStress = (type: string): number => {
    // Lower fracture threshold for higher stress concentration
    const kt = getStressConcentration(type);
    return 100 / kt;
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setCurrentPhase(newPhase);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(currentPhase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Check for fracture
  useEffect(() => {
    const fractureThreshold = getFractureStress(notchType);
    if (appliedStress > fractureThreshold && !isFractured) {
      setIsFractured(true);
      playSound('failure');
    }
  }, [appliedStress, notchType, isFractured]);

  // Twist - crack propagation
  useEffect(() => {
    if (phase !== 'twist_play') return;

    const effectiveKt = hasCrackStopHole ? 2 : 8;
    const criticalStress = 100 / effectiveKt;

    if (twistStress > criticalStress && !hasCrackStopHole) {
      const interval = setInterval(() => {
        setCrackLength(l => {
          if (l >= 150) return 150;
          return l + 5;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase, twistStress, hasCrackStopHole]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setNotchType('none');
      setAppliedStress(0);
      setIsFractured(false);
    }
    if (phase === 'twist_play') {
      setHasCrackStopHole(false);
      setCrackLength(20);
      setTwistStress(0);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderStressScene = () => {
    const kt = getStressConcentration(notchType);
    const localStress = appliedStress * kt;
    const stretch = appliedStress / 10;

    // Get label text based on notch type
    const notchLabel = notchType === 'none' ? 'Solid material' :
      notchType === 'round' ? 'Circular hole (Kt = 2-3)' :
        notchType === 'vsharp' ? 'Sharp V-notch (Kt = 5+)' :
          'Crack (Kt -> very high!)';

    return (
      <div className="relative">
        <svg viewBox="0 0 400 260" className="w-full h-56">
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="fracLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Material gradient - realistic steel/metal look */}
            <linearGradient id="fracMaterial" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="25%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Fractured material gradient */}
            <linearGradient id="fracMaterialBroken" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="30%" stopColor="#991b1b" />
              <stop offset="60%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>

            {/* Stress arrow gradient */}
            <linearGradient id="fracStressArrow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Stress concentration zone gradient */}
            <radialGradient id="fracStressZone" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#facc15" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </radialGradient>

            {/* Crack propagation gradient */}
            <linearGradient id="fracCrackLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="fracInfoPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Glow filter for stress arrows */}
            <filter id="fracArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow for stress concentration */}
            <filter id="fracStressGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Fracture line glow */}
            <filter id="fracLineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Material edge highlight */}
            <linearGradient id="fracEdgeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
          </defs>

          {/* Premium background */}
          <rect width="400" height="260" fill="url(#fracLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="fracGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="400" height="260" fill="url(#fracGrid)" />

          {/* Stress arrows (top and bottom) with glow */}
          <g filter="url(#fracArrowGlow)">
            {/* Top arrows (pulling up) */}
            {[...Array(5)].map((_, i) => (
              <g key={`top-${i}`} transform={`translate(${80 + i * 60}, 15)`}>
                <line x1="0" y1={25 + stretch} x2="0" y2="8" stroke="url(#fracStressArrow)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="-6,12 6,12 0,0" fill="url(#fracStressArrow)" />
              </g>
            ))}
            {/* Bottom arrows (pulling down) */}
            {[...Array(5)].map((_, i) => (
              <g key={`bot-${i}`} transform={`translate(${80 + i * 60}, 245)`}>
                <line x1="0" y1={-25 - stretch} x2="0" y2="-8" stroke="url(#fracStressArrow)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="-6,-12 6,-12 0,0" fill="url(#fracStressArrow)" />
              </g>
            ))}
          </g>

          {/* Material specimen */}
          <g transform="translate(100, 45)">
            {/* Shadow under material */}
            <rect
              x="5"
              y={-stretch + 5}
              width="200"
              height={150 + stretch * 2}
              rx="2"
              fill="#000"
              opacity="0.3"
            />

            {/* Main body with gradient */}
            <rect
              x="0"
              y={-stretch}
              width="200"
              height={150 + stretch * 2}
              rx="2"
              fill={isFractured ? 'url(#fracMaterialBroken)' : 'url(#fracMaterial)'}
              stroke={isFractured ? '#ef4444' : 'url(#fracEdgeHighlight)'}
              strokeWidth="2"
            />

            {/* Material surface highlights */}
            {!isFractured && (
              <>
                <rect x="0" y={-stretch} width="200" height="3" rx="1" fill="#9ca3af" opacity="0.3" />
                <rect x="0" y={-stretch + 147 + stretch * 2} width="200" height="3" rx="1" fill="#1f2937" opacity="0.5" />
              </>
            )}

            {/* Notch/defect with internal shadows */}
            {notchType === 'round' && (
              <g>
                <circle cx="100" cy={75} r="16" fill="#0a0f1a" />
                <circle cx="100" cy={75} r="15" fill="url(#fracLabBg)" stroke="#1f2937" strokeWidth="1" />
                <circle cx="97" cy={72} r="4" fill="#1e293b" opacity="0.5" />
              </g>
            )}
            {notchType === 'vsharp' && (
              <g>
                <polygon points="100,58 82,75 100,92 118,75" fill="#0a0f1a" />
                <polygon points="100,60 84,75 100,90 116,75" fill="url(#fracLabBg)" stroke="#1f2937" strokeWidth="1" />
              </g>
            )}
            {notchType === 'crack' && (
              <g>
                <line x1="48" y1="75" x2="102" y2="75" stroke="#0a0f1a" strokeWidth="5" strokeLinecap="round" />
                <line x1="50" y1="75" x2="100" y2="75" stroke="url(#fracCrackLine)" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* Stress field visualization with premium glow */}
            {appliedStress > 0 && notchType !== 'none' && !isFractured && (
              <g filter="url(#fracStressGlow)">
                {/* Stress concentration zone */}
                <circle
                  cx={100}
                  cy={75}
                  r={15 + (localStress / 5)}
                  fill="url(#fracStressZone)"
                  opacity={0.5 + appliedStress / 200}
                />
                {/* Animated stress rings */}
                {[...Array(6)].map((_, i) => {
                  const baseRadius = notchType === 'crack' ? 8 : 18;
                  const intensityRadius = baseRadius + (localStress / 8) * Math.sin(animPhase + i * 0.8);
                  return (
                    <circle
                      key={i}
                      cx={100}
                      cy={75}
                      r={intensityRadius}
                      fill="none"
                      stroke={i % 2 === 0 ? '#ef4444' : '#f97316'}
                      strokeWidth={2 - i * 0.2}
                      opacity={0.6 - i * 0.08}
                    />
                  );
                })}
              </g>
            )}

            {/* Fracture visualization with glow */}
            {isFractured && (
              <g filter="url(#fracLineGlow)">
                <line x1="0" y1="75" x2="200" y2="75" stroke="url(#fracCrackLine)" strokeWidth="5" strokeDasharray="12,6" />
                {/* Fracture sparks */}
                {[...Array(5)].map((_, i) => (
                  <circle
                    key={i}
                    cx={20 + i * 40 + Math.sin(animPhase + i) * 5}
                    cy={75 + Math.cos(animPhase * 2 + i) * 8}
                    r={2 + Math.sin(animPhase * 3 + i) * 1}
                    fill="#fbbf24"
                    opacity={0.6 + Math.sin(animPhase + i) * 0.4}
                  />
                ))}
              </g>
            )}
          </g>

          {/* Info panel with gradient */}
          <g transform="translate(315, 70)">
            <rect x="0" y="0" width="75" height="105" fill="url(#fracInfoPanel)" rx="8" stroke="#374151" strokeWidth="1" />
            <rect x="0" y="0" width="75" height="2" rx="1" fill="#4b5563" opacity="0.5" />
          </g>
        </svg>

        {/* Info panel labels - outside SVG using typo system */}
        <div
          className="absolute text-center"
          style={{
            right: isMobile ? '8px' : '12px',
            top: isMobile ? '78px' : '82px',
            width: '70px'
          }}
        >
          <div style={{ fontSize: typo.label }} className="text-gray-400">Applied</div>
          <div style={{ fontSize: typo.body }} className="text-white font-bold">{appliedStress.toFixed(0)} MPa</div>
          <div style={{ fontSize: typo.label, marginTop: '4px' }} className="text-gray-400">Kt</div>
          <div style={{ fontSize: typo.body }} className="text-yellow-400 font-bold">x{kt}</div>
          <div style={{ fontSize: typo.label, marginTop: '4px' }} className="text-red-400">Local: {localStress.toFixed(0)}</div>
        </div>

        {/* Notch type label - outside SVG */}
        <div className="text-center mt-1" style={{ fontSize: typo.small }}>
          <span className="text-gray-400">{notchLabel}</span>
        </div>

        {/* Fractured label - outside SVG */}
        {isFractured && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: isMobile ? '50px' : '55px' }}>
            <span className="text-red-400 font-bold animate-pulse" style={{ fontSize: typo.heading }}>FRACTURED!</span>
          </div>
        )}
      </div>
    );
  };

  const renderCrackStopScene = () => {
    const crackTipX = 100 + crackLength;

    // Explanation text based on state
    const explanationText = hasCrackStopHole
      ? 'Hole converts sharp crack tip to rounded edge - lower Kt'
      : 'Sharp crack tip has extreme stress concentration';

    return (
      <div className="relative">
        <svg viewBox="0 0 400 220" className="w-full h-48">
          <defs>
            {/* Lab background gradient */}
            <linearGradient id="fracCrackLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Metal plate gradient - industrial steel */}
            <linearGradient id="fracPlate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Stress arrow gradient for crack scene */}
            <linearGradient id="fracCrackArrow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Crack gradient - dark to bright at tip */}
            <linearGradient id="fracCrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Propagating crack gradient */}
            <linearGradient id="fracPropagating" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Stop hole success gradient */}
            <radialGradient id="fracStopHole" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="70%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>

            {/* Stop hole glow */}
            <radialGradient id="fracStopHoleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>

            {/* Crack tip stress gradient */}
            <radialGradient id="fracCrackTipStress" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#facc15" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </radialGradient>

            {/* Info panel gradient */}
            <linearGradient id="fracCrackInfo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Arrow glow filter */}
            <filter id="fracCrackArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Crack tip intense glow */}
            <filter id="fracTipGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stop hole glow filter */}
            <filter id="fracHoleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium background */}
          <rect width="400" height="220" fill="url(#fracCrackLabBg)" />

          {/* Subtle grid */}
          <pattern id="fracCrackGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="400" height="220" fill="url(#fracCrackGrid)" />

          {/* Metal plate with shadow */}
          <rect x="55" y="45" width="300" height="130" rx="3" fill="#000" opacity="0.3" />
          <rect x="50" y="40" width="300" height="130" rx="3" fill="url(#fracPlate)" stroke="#6b7280" strokeWidth="2" />

          {/* Plate surface highlights */}
          <rect x="50" y="40" width="300" height="3" rx="1" fill="#94a3b8" opacity="0.3" />
          <rect x="50" y="167" width="300" height="3" rx="1" fill="#1f2937" opacity="0.5" />

          {/* Stress arrows with glow */}
          {twistStress > 0 && (
            <g filter="url(#fracCrackArrowGlow)">
              {[...Array(4)].map((_, i) => (
                <g key={i}>
                  <line x1={80 + i * 80} y1="25" x2={80 + i * 80} y2="40" stroke="url(#fracCrackArrow)" strokeWidth="4" strokeLinecap="round" />
                  <polygon points={`${74 + i * 80},35 ${86 + i * 80},35 ${80 + i * 80},22`} fill="url(#fracCrackArrow)" />
                  <line x1={80 + i * 80} y1="195" x2={80 + i * 80} y2="170" stroke="url(#fracCrackArrow)" strokeWidth="4" strokeLinecap="round" />
                  <polygon points={`${74 + i * 80},175 ${86 + i * 80},175 ${80 + i * 80},198`} fill="url(#fracCrackArrow)" />
                </g>
              ))}
            </g>
          )}

          {/* Crack with gradient */}
          <line
            x1="48"
            y1="105"
            x2={crackTipX + 2}
            y2="105"
            stroke="#0a0f1a"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="105"
            x2={crackTipX}
            y2="105"
            stroke={crackLength >= 150 ? 'url(#fracPropagating)' : 'url(#fracCrackGrad)'}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Crack tip stress field with glow */}
          {twistStress > 0 && !hasCrackStopHole && crackLength < 150 && (
            <g filter="url(#fracTipGlow)">
              <circle
                cx={crackTipX}
                cy={105}
                r={12 + twistStress / 5}
                fill="url(#fracCrackTipStress)"
              />
              {[1, 2, 3, 4].map(r => (
                <circle
                  key={r}
                  cx={crackTipX}
                  cy={105}
                  r={r * 6 + Math.sin(animPhase + r) * 2}
                  fill="none"
                  stroke={r % 2 === 0 ? '#f97316' : '#ef4444'}
                  strokeWidth={2.5 - r * 0.4}
                  opacity={0.7 - r * 0.12}
                />
              ))}
            </g>
          )}

          {/* Crack-stop hole with glow */}
          {hasCrackStopHole && (
            <g>
              {/* Glow behind hole */}
              <circle cx={crackTipX + 15} cy={105} r={20} fill="url(#fracStopHoleGlow)" filter="url(#fracHoleGlow)" />
              {/* Hole shadow */}
              <circle cx={crackTipX + 16} cy={106} r={12} fill="#000" opacity="0.3" />
              {/* Hole */}
              <circle cx={crackTipX + 15} cy={105} r={12} fill="url(#fracStopHole)" stroke="#22c55e" strokeWidth="2" />
              {/* Inner highlight */}
              <circle cx={crackTipX + 12} cy={102} r={4} fill="#1e293b" opacity="0.5" />
            </g>
          )}

          {/* Info panel */}
          <g transform="translate(310, 50)">
            <rect x="0" y="0" width="70" height="65" fill="url(#fracCrackInfo)" rx="8" stroke="#374151" strokeWidth="1" />
            <rect x="0" y="0" width="70" height="2" rx="1" fill="#4b5563" opacity="0.5" />
          </g>
        </svg>

        {/* Info panel labels - outside SVG */}
        <div
          className="absolute text-center"
          style={{
            right: isMobile ? '15px' : '20px',
            top: isMobile ? '55px' : '60px',
            width: '65px'
          }}
        >
          <div style={{ fontSize: typo.label }} className="text-gray-400">Kt at tip</div>
          <div
            style={{ fontSize: typo.heading }}
            className={`font-bold ${hasCrackStopHole ? 'text-green-400' : 'text-red-400'}`}
          >
            {hasCrackStopHole ? '~2' : '~8+'}
          </div>
        </div>

        {/* Stop hole label - outside SVG */}
        {hasCrackStopHole && (
          <div
            className="absolute text-center"
            style={{
              left: `${(crackTipX + 15) / 4}%`,
              top: isMobile ? '38px' : '42px',
              transform: 'translateX(-50%)'
            }}
          >
            <span style={{ fontSize: typo.small }} className="text-green-400 font-medium">Stop hole</span>
          </div>
        )}

        {/* Status messages - outside SVG */}
        {crackLength >= 150 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-2">
            <span style={{ fontSize: typo.body }} className="text-red-400 font-bold">Complete Fracture!</span>
          </div>
        )}

        {hasCrackStopHole && twistStress > 20 && crackLength < 150 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-2">
            <span style={{ fontSize: typo.body }} className="text-green-400 font-bold">Crack Arrested!</span>
          </div>
        )}

        {/* Explanation text - outside SVG */}
        <div className="text-center mt-1" style={{ fontSize: typo.small }}>
          <span className="text-gray-400">{explanationText}</span>
        </div>
      </div>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mb-8 shadow-2xl shadow-red-500/30">
        <span className="text-4xl">✈️</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
        Why Airplane Windows Have Rounded Corners
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        In the 1950s, three de Havilland Comet jets broke apart mid-flight. The cause?
        <span className="text-red-400 font-semibold"> Square windows</span>. The sharp corners created
        stress concentrations that grew into catastrophic cracks.
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 rounded-3xl" />
        <div className="relative">
          <p className="text-xl text-red-300 font-medium">
            Why are sharp corners so dangerous in materials?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onPointerDown={(e) => { e.preventDefault(); playSound('click'); nextPhase(); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-red-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-red-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You have two identical metal plates. One has a circular hole, one has a sharp V-notch.
        Which breaks first under the same load?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'vnotch', text: 'Sharp V-notch - stress concentrates more at sharp corners', icon: '📐' },
          { id: 'circle', text: 'Circular hole - it removes more material', icon: '⭕' },
          { id: 'same', text: 'Same - both weaken the plate equally', icon: '=' },
          { id: 'neither', text: 'Neither - small defects don\'t matter', icon: '✓' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={() => {
              playSound('click');
              setPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-red-500 bg-red-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <button
            onPointerDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Stress Concentration</h2>

      {renderStressScene()}

      <div className="max-w-lg mx-auto space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Defect Type:</label>
          <div className="flex gap-2 mt-1">
            {[
              { id: 'none', label: 'None' },
              { id: 'round', label: 'Round Hole' },
              { id: 'vsharp', label: 'V-Notch' },
              { id: 'crack', label: 'Crack' }
            ].map((opt) => (
              <button
                key={opt.id}
                onPointerDown={() => {
                  playSound('click');
                  setNotchType(opt.id as typeof notchType);
                  setAppliedStress(0);
                  setIsFractured(false);
                }}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  notchType === opt.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm">Applied Stress: {appliedStress.toFixed(0)} MPa</label>
          <input
            type="range"
            min="0"
            max="100"
            value={appliedStress}
            onChange={(e) => setAppliedStress(Number(e.target.value))}
            disabled={isFractured}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>Fracture: {getFractureStress(notchType).toFixed(0)} MPa</span>
            <span>100</span>
          </div>
        </div>

        {isFractured && (
          <button
            onPointerDown={() => {
              playSound('click');
              setIsFractured(false);
              setAppliedStress(0);
            }}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            🔄 Reset
          </button>
        )}
      </div>

      <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-red-300 text-sm text-center">
          <strong>Stress concentration factor Kt:</strong> The ratio of maximum local stress to average stress.
          Sharper features → higher Kt → earlier fracture!
        </p>
      </div>

      <div className="text-center">
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Why Sharp Corners Fail</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Stress Flow</h3>
              <p className="text-gray-400 text-sm">Stress &quot;flows&quot; through material like water - it must go around obstacles</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Concentration at Corners</h3>
              <p className="text-gray-400 text-sm">Sharp corners force stress into a tiny area → local stress skyrockets</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Crack Initiation</h3>
              <p className="text-gray-400 text-sm">When local stress exceeds material strength, cracks begin and propagate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-red-300 font-semibold">Engineering Rule</p>
        <p className="text-gray-400 text-sm mt-1">
          Always use fillets (rounded transitions) at corners.
          A fillet radius of just 1-2mm can reduce Kt by 50%!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-red-400 font-semibold">{prediction === 'vnotch' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">🔄 The Twist!</h2>
      <p className="text-gray-300 text-center max-w-lg mx-auto">
        A ship hull has developed a crack. Surprisingly, the repair involves
        <span className="text-green-400 font-semibold"> drilling a HOLE</span> at the crack tip!
        Why would making the defect bigger help?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'blunt', text: 'Hole blunts the sharp crack tip → reduces stress concentration', icon: '⭕' },
          { id: 'drain', text: 'Hole lets water drain out of the crack', icon: '💧' },
          { id: 'weld', text: 'Makes it easier to weld the crack closed', icon: '🔥' },
          { id: 'bad', text: 'It\'s actually a bad idea and will make things worse', icon: '❌' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={() => {
              playSound('click');
              setTwistPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-orange-500 bg-orange-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <button
            onPointerDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Crack-Stop Hole</h2>

      {renderCrackStopScene()}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onPointerDown={() => {
            playSound('click');
            setHasCrackStopHole(!hasCrackStopHole);
            setCrackLength(20);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            hasCrackStopHole
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {hasCrackStopHole ? '✓ Stop Hole Added' : '+ Add Stop Hole'}
        </button>
        <button
          onPointerDown={() => {
            playSound('click');
            setCrackLength(20);
            setTwistStress(0);
          }}
          className="px-4 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          🔄 Reset
        </button>
      </div>

      <div className="max-w-lg mx-auto">
        <label className="text-gray-400 text-sm">Applied Stress: {twistStress.toFixed(0)} MPa</label>
        <input
          type="range"
          min="0"
          max="50"
          value={twistStress}
          onChange={(e) => setTwistStress(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-orange-300 text-sm text-center">
          <strong>The crack-stop hole</strong> converts the infinitely sharp crack tip into a rounded edge.
          This dramatically reduces Kt and arrests crack growth!
        </p>
      </div>

      <div className="text-center">
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Fighting Cracks with Holes</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Counter-intuitive but effective!
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-red-900/30 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Sharp Crack Tip</div>
            <div className="text-gray-500">Kt approaches infinity → crack grows under any stress</div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="text-green-400 font-semibold">After Stop Hole</div>
            <div className="text-gray-500">Kt drops to ~2-3 (like circular hole) → crack arrested!</div>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Used In Practice</div>
            <div className="text-gray-500">Ships, aircraft, bridges - drill and fill for permanent repair</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-orange-400 font-semibold">{twistPrediction === 'blunt' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-yellow-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onPointerDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, index]));
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-red-500 bg-red-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onPointerDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
          >
            Take the Quiz →
          </button>
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    if (testSubmitted) {
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">{testScore >= 7 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="text-gray-300">You got {testScore} out of {TEST_QUESTIONS.length} correct!</p>

          {/* Show answers review */}
          <div className="space-y-4 max-w-lg mx-auto text-left">
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
                  <p className="text-white font-medium mb-2">{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`py-1 px-2 rounded ${opt.correct ? 'text-green-400' : userAnswer === oIndex ? 'text-red-400' : 'text-gray-400'}`}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            onPointerDown={() => {
              playSound(testScore >= 7 ? 'complete' : 'click');
              nextPhase();
            }}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
          >
            {testScore >= 7 ? 'Complete! 🎊' : 'Continue →'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Quiz</h2>
        <p className="text-gray-400 text-center">Answer all {TEST_QUESTIONS.length} questions</p>

        <div className="space-y-6 max-w-lg mx-auto">
          {TEST_QUESTIONS.map((question, qIndex) => (
            <div key={qIndex} className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-200 font-medium mb-3">{qIndex + 1}. {question.question}</p>
              <div className="space-y-2">
                {question.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onPointerDown={() => handleTestAnswer(qIndex, oIndex)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'border-red-500 bg-red-900/30 text-white'
                        : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onPointerDown={submitTest}
            disabled={testAnswers.includes(null)}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              testAnswers.includes(null)
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500'
            }`}
          >
            Submit Quiz
          </button>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">Fracture Mechanics Master!</h2>
      <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-red-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Stress concentration at defects and sharp corners</li>
          <li>✓ Why airplane windows need rounded corners</li>
          <li>✓ Kt = stress concentration factor</li>
          <li>✓ Crack-stop holes reduce Kt and arrest cracks</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        You now know why engineers obsess over corner radii! 📐✈️
      </p>
      <button
        onPointerDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all"
      >
        Complete! 🎊
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Fracture Mechanics</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onPointerDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-red-400 w-6 shadow-lg shadow-red-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-red-400">
            {phase.charAt(0).toUpperCase() + phase.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
