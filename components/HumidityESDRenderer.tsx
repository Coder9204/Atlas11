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

interface HumidityESDRendererProps {
  phase?: Phase; // Optional - used for resume functionality
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

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

// ────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const realWorldApps = [
  {
    icon: '💾',
    title: 'Semiconductor Manufacturing',
    short: 'Where a 100V spark kills a million-dollar wafer',
    tagline: 'Cleanrooms are humidity-controlled fortresses',
    description: 'Chip fabrication requires precise humidity control (40-60% RH) to prevent ESD damage to nanometer-scale transistors. A single static discharge can destroy thousands of chips on a wafer worth millions of dollars.',
    connection: 'The humidity-ESD relationship you explored is critical here: too dry allows charge buildup that arcs across microscopic gaps; too humid causes particle contamination and corrosion.',
    howItWorks: 'Cleanrooms maintain 45% RH using HVAC systems with humidifiers and dehumidifiers. Workers wear grounded suits and wrist straps. Ionizers neutralize surface charges. Every surface is conductive or static-dissipative.',
    stats: [
      { value: '45% RH', label: 'Typical cleanroom humidity', icon: '💧' },
      { value: '<10V', label: 'Damage threshold for advanced chips', icon: '⚡' },
      { value: '$100M+', label: 'Cleanroom construction cost', icon: '💰' }
    ],
    examples: ['Intel fabs', 'TSMC cleanrooms', 'Samsung foundries', 'ASML lithography systems'],
    companies: ['TSMC', 'Intel', 'Samsung', 'Applied Materials'],
    futureImpact: 'As transistors shrink below 2nm, even lower voltage thresholds will require humidity control within ±2% RH.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Operating Room Environment',
    short: 'Balancing infection control with static safety',
    tagline: 'Where sparks near oxygen can be explosive',
    description: 'Operating rooms maintain specific humidity (30-60% RH) to balance infection risk, ESD prevention near electronic equipment, and fire safety around supplemental oxygen and anesthetic gases.',
    connection: 'The trade-off you learned - low humidity increases ESD, high humidity enables microbes - plays out critically in surgical settings with sensitive equipment and flammable gases.',
    howItWorks: 'HVAC systems with HEPA filtration control humidity precisely. Conductive flooring grounds personnel. All equipment is tested for ESD safety. Oxygen-enriched areas have stricter static controls.',
    stats: [
      { value: '30-60% RH', label: 'OR humidity range', icon: '💧' },
      { value: '20 air changes/hr', label: 'Typical ventilation rate', icon: '💨' },
      { value: '$20M', label: 'Average OR construction cost', icon: '💰' }
    ],
    examples: ['Cardiac surgery suites', 'Neurosurgery ORs', 'Laser surgery rooms', 'Hybrid operating rooms'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Stryker'],
    futureImpact: 'Smart OR systems will dynamically adjust humidity based on procedure type and real-time ESD monitoring.',
    color: '#22C55E'
  },
  {
    icon: '💻',
    title: 'Data Center Operations',
    short: 'Protecting servers from static and corrosion',
    tagline: 'Humidity determines uptime',
    description: 'Data centers maintain 40-60% relative humidity across thousands of square feet of servers. Too dry causes ESD damage to components; too humid causes condensation, corrosion, and electrical shorts.',
    connection: 'Your simulation showed the ESD risk curve - data centers operate in the "sweet spot" where charge dissipation is sufficient but condensation doesn\'t occur.',
    howItWorks: 'Precision cooling units (CRACs/CRAHs) control both temperature and humidity. Sensors monitor conditions continuously. Hot/cold aisle containment optimizes airflow. Ultrasonic humidifiers add moisture without water droplets.',
    stats: [
      { value: '40-60% RH', label: 'Target humidity range', icon: '💧' },
      { value: '$10M/hr', label: 'Cost of major outage', icon: '💰' },
      { value: '99.999%', label: 'Uptime target', icon: '📊' }
    ],
    examples: ['Google data centers', 'AWS facilities', 'Microsoft Azure', 'Facebook infrastructure'],
    companies: ['Equinix', 'Digital Realty', 'Vertiv', 'Schneider Electric'],
    futureImpact: 'AI-controlled environmental systems will predict and prevent humidity excursions before they cause damage.',
    color: '#8B5CF6'
  },
  {
    icon: '📦',
    title: 'Electronics Packaging & Shipping',
    short: 'Protecting components before they reach you',
    tagline: 'The pink bag has a purpose',
    description: 'Electronic components are packaged in antistatic (pink) or static-shielding (silver) bags to prevent ESD damage during shipping. Humidity indicator cards monitor conditions, and desiccants control moisture.',
    connection: 'Since shipping environments have uncontrolled humidity, packaging must protect against both low-humidity ESD (antistatic bags) and high-humidity corrosion (desiccants and moisture barriers).',
    howItWorks: 'Static-shielding bags form a Faraday cage. Antistatic bags have surface treatments that bleed charge slowly. Humidity indicator cards change color when thresholds are exceeded. Desiccants maintain <30% RH inside sealed packages.',
    stats: [
      { value: '$5B', label: 'Annual ESD damage in transit', icon: '💰' },
      { value: '<20% RH', label: 'Dry pack requirement', icon: '💧' },
      { value: '10+ years', label: 'Moisture-sensitive component shelf life', icon: '⏰' }
    ],
    examples: ['Chip packaging', 'Circuit board shipping', 'Hard drive storage', 'Medical device transport'],
    companies: ['Desco', 'SCS (Static Control)', 'Protektive Pak', '3M'],
    futureImpact: 'Smart packaging with IoT sensors will track ESD events and humidity excursions throughout the supply chain.',
    color: '#F59E0B'
  }
];

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What is the optimal humidity range for data centers?',
    options: [
      { text: '10-20% RH (very dry)', correct: false },
      { text: '40-60% RH (moderate)', correct: true },
      { text: '80-90% RH (very humid)', correct: false },
      { text: 'Humidity does not matter', correct: false },
    ],
  },
  {
    question: 'What does ESD stand for?',
    options: [
      { text: 'Electronic System Design', correct: false },
      { text: 'Electrostatic Discharge', correct: true },
      { text: 'Electrical Safety Device', correct: false },
      { text: 'Energy Storage Device', correct: false },
    ],
  },
  {
    question: 'Why does low humidity increase ESD risk?',
    options: [
      { text: 'Low humidity makes equipment run hotter', correct: false },
      { text: 'Dry air is a better insulator, allowing more charge to accumulate', correct: true },
      { text: 'Low humidity damages components directly', correct: false },
      { text: 'It does not affect ESD', correct: false },
    ],
  },
  {
    question: 'What voltage can a typical static shock reach?',
    options: [
      { text: '12V - like a car battery', correct: false },
      { text: '120V - like wall outlet', correct: false },
      { text: '3,000-25,000V - thousands of volts', correct: true },
      { text: '1V - barely noticeable', correct: false },
    ],
  },
  {
    question: 'What happens when humidity is too high (>60%)?',
    options: [
      { text: 'Equipment runs faster', correct: false },
      { text: 'Condensation and corrosion risk increases', correct: true },
      { text: 'ESD becomes more dangerous', correct: false },
      { text: 'No negative effects', correct: false },
    ],
  },
  {
    question: 'What is the dew point temperature?',
    options: [
      { text: 'When electronics overheat', correct: false },
      { text: 'Temperature at which air becomes saturated and moisture condenses', correct: true },
      { text: 'The coldest temperature in a data center', correct: false },
      { text: 'The temperature of morning dew', correct: false },
    ],
  },
  {
    question: 'How much voltage can damage a sensitive IC chip?',
    options: [
      { text: 'Over 10,000V only', correct: false },
      { text: 'Less than 100V can damage sensitive components', correct: true },
      { text: 'Only visible sparks cause damage', correct: false },
      { text: 'ICs are immune to ESD', correct: false },
    ],
  },
  {
    question: 'What is an ESD wrist strap designed to do?',
    options: [
      { text: 'Keep your wrist warm', correct: false },
      { text: 'Ground the technician to prevent static buildup', correct: true },
      { text: 'Measure static voltage', correct: false },
      { text: 'Prevent electric shock', correct: false },
    ],
  },
  {
    question: 'Why do data centers monitor both humidity AND dew point?',
    options: [
      { text: 'Only for regulatory compliance', correct: false },
      { text: 'To prevent both ESD (low humidity) AND condensation (dew point)', correct: true },
      { text: 'Humidity and dew point are the same thing', correct: false },
      { text: 'To calculate energy costs', correct: false },
    ],
  },
  {
    question: 'What material is most likely to generate static electricity?',
    options: [
      { text: 'Metal surfaces', correct: false },
      { text: 'Grounded equipment', correct: false },
      { text: 'Synthetic materials like carpet and plastic', correct: true },
      { text: 'Water', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SCENARIO-BASED TEST QUESTIONS
// ────────────────────────────────────────────────────────────────────────────

const testQuestions = [
  {
    scenario: "It's a cold January morning and the indoor heating has been running all night. The relative humidity inside your home has dropped to 15%.",
    question: "Why does low humidity cause increased static electricity buildup?",
    options: [
      { id: 'a', label: "Cold air holds more electrical charge than warm air" },
      { id: 'b', label: "Dry air is an excellent insulator, preventing charge from dissipating and allowing it to accumulate on surfaces", correct: true },
      { id: 'c', label: "Low humidity creates more friction between surfaces" },
      { id: 'd', label: "Water molecules in humid air generate static electricity" }
    ],
    explanation: "Dry air acts as an excellent electrical insulator. When humidity is low, there are fewer water molecules in the air to provide a conductive path for static charges to dissipate. This allows electrical charge to accumulate on insulating surfaces like clothing, carpets, and skin until it reaches thousands of volts and discharges as a spark."
  },
  {
    scenario: "You've been walking across a carpeted office floor on a dry winter day. As you reach for the metal doorknob, you see a bright spark jump from your finger and feel a sharp zap.",
    question: "What voltage level did that static shock likely reach?",
    options: [
      { id: 'a', label: "About 12 volts, similar to a car battery" },
      { id: 'b', label: "Around 120 volts, like a wall outlet" },
      { id: 'c', label: "Between 3,000 and 25,000 volts", correct: true },
      { id: 'd', label: "Less than 1 volt, barely enough to feel" }
    ],
    explanation: "Visible static sparks and the sensation of a shock typically indicate voltages between 3,000 and 25,000 volts. Humans generally cannot feel discharges below about 3,000V. While the voltage is extremely high, the current is very low (microamps) and the duration is nanoseconds, which is why it's startling but not dangerous to humans. However, these same voltages can instantly destroy sensitive electronics."
  },
  {
    scenario: "A technician is about to replace a RAM module in a server. The data center maintains 50% relative humidity, but the technician skips wearing an ESD wrist strap because 'the humidity is high enough.'",
    question: "What is the risk of handling the RAM module without ESD protection?",
    options: [
      { id: 'a', label: "No risk - 50% humidity completely eliminates static" },
      { id: 'b', label: "Even unfelt static discharges below 100V can damage sensitive CMOS components in the RAM", correct: true },
      { id: 'c', label: "The only risk is if the technician feels a shock" },
      { id: 'd', label: "RAM modules are immune to ESD damage" }
    ],
    explanation: "Modern semiconductor components, especially CMOS-based chips like RAM, can be damaged by ESD events as low as 10-100 volts - far below the human perception threshold of ~3,000V. While higher humidity reduces ESD risk, it doesn't eliminate it. This 'latent damage' may not cause immediate failure but can degrade components over time, leading to intermittent errors or premature failure."
  },
  {
    scenario: "At an electronics manufacturing facility, all workers handling circuit boards must wear grounding straps connected to their workstations. A new employee asks why this is necessary when they could just touch a grounded metal surface occasionally.",
    question: "Why are continuous grounding straps required instead of periodic grounding?",
    options: [
      { id: 'a', label: "Grounding straps are more comfortable to wear" },
      { id: 'b', label: "Periodic grounding is equally effective" },
      { id: 'c', label: "Continuous grounding prevents charge from ever accumulating, while periodic grounding allows charge to build up between touches", correct: true },
      { id: 'd', label: "It's purely a regulatory requirement with no technical basis" }
    ],
    explanation: "Static charge can build up within seconds of movement. A continuous grounding strap maintains constant electrical connection to ground, ensuring charge dissipates immediately as it forms. Periodic grounding creates windows where charge can accumulate to damaging levels. The strap typically includes a 1-megohm resistor to limit current for safety while still allowing charge to drain continuously."
  },
  {
    scenario: "During winter, a homeowner notices they get shocked frequently when touching metal objects. They consider buying a humidifier but wonder if it could cause problems if humidity gets too high.",
    question: "What is the optimal indoor humidity range to prevent both static shocks and humidity-related problems?",
    options: [
      { id: 'a', label: "10-20% RH - as dry as possible to prevent mold" },
      { id: 'b', label: "80-90% RH - maximum humidity eliminates all static" },
      { id: 'c', label: "40-60% RH - balances static prevention with condensation and mold risk", correct: true },
      { id: 'd', label: "Humidity level doesn't matter for static prevention" }
    ],
    explanation: "The 40-60% RH range is optimal for both homes and data centers. Below 40%, static electricity becomes problematic. Above 60%, excess moisture leads to condensation on cold surfaces (windows, pipes, cold walls), promoting mold growth, wood warping, and in electronics environments, corrosion and short circuits. This 'Goldilocks zone' provides enough moisture to dissipate static while avoiding water damage."
  },
  {
    scenario: "A semiconductor cleanroom manufactures microprocessors worth thousands of dollars each. The environmental controls maintain humidity at exactly 45% ±2% RH, with continuous monitoring and backup humidification systems.",
    question: "Why is such precise humidity control critical in semiconductor manufacturing?",
    options: [
      { id: 'a', label: "Worker comfort requires exact humidity levels" },
      { id: 'b', label: "Precise humidity prevents ESD damage to chips where even minor static can destroy nanometer-scale transistors, while avoiding condensation contamination", correct: true },
      { id: 'c', label: "It's primarily for reducing static cling on workers' cleanroom suits" },
      { id: 'd', label: "Humidity variations affect chip coloring and appearance" }
    ],
    explanation: "Modern microprocessors have transistors measuring just nanometers across. These microscopic structures can be destroyed by ESD events that humans cannot detect. Simultaneously, any water condensation would introduce contamination particles larger than the chip features. The tight ±2% tolerance ensures the environment stays in the safe zone where both risks are minimized. Ionizing air bars and extensive grounding provide additional protection layers."
  },
  {
    scenario: "An engineer is selecting materials for a product that will be handled frequently. They reference the triboelectric series, which ranks materials by their tendency to gain or lose electrons through friction.",
    question: "Based on the triboelectric series, which material combination would generate the MOST static electricity when rubbed together?",
    options: [
      { id: 'a', label: "Cotton rubbed against cotton" },
      { id: 'b', label: "Glass (highly positive) rubbed against Teflon (highly negative)", correct: true },
      { id: 'c', label: "Aluminum rubbed against steel" },
      { id: 'd', label: "Wood rubbed against paper" }
    ],
    explanation: "The triboelectric series ranks materials from most positive (readily loses electrons) to most negative (readily gains electrons). Glass is near the positive end, while Teflon is at the extreme negative end. When materials far apart on this series contact and separate, maximum charge transfer occurs. This is why Teflon-coated surfaces and glass create significant static. Metals don't appear far apart on the series and also conduct, so they generate less problematic static."
  },
  {
    scenario: "A contract manufacturer is setting up a new production line for assembled circuit boards. They need to implement a comprehensive ESD protection program that goes beyond just humidity control.",
    question: "Which combination provides the most effective ESD protection for electronics manufacturing?",
    options: [
      { id: 'a', label: "High humidity (80%) alone is sufficient protection" },
      { id: 'b', label: "ESD-safe flooring, grounded workstations, wrist straps, ionizers, humidity control (40-60%), and conductive packaging", correct: true },
      { id: 'c', label: "Rubber-soled shoes and wooden workbenches" },
      { id: 'd', label: "Air conditioning set to maximum cooling" }
    ],
    explanation: "Effective ESD control requires multiple layers: ESD-dissipative flooring prevents charge buildup from walking; grounded workstations and wrist straps keep workers at ground potential; ionizers neutralize charge on insulating surfaces; humidity control (40-60%) aids dissipation; conductive or static-shielding packaging protects components in transit. No single measure is sufficient - the 'defense in depth' approach ensures components remain protected even if one control fails."
  },
  {
    scenario: "At a fuel depot, workers notice static discharge warnings posted everywhere. Before refueling aircraft or transferring fuel between tanks, strict grounding procedures must be followed even on humid summer days.",
    question: "Why is static electricity particularly dangerous in fuel handling operations?",
    options: [
      { id: 'a', label: "Static makes fuel flow more slowly" },
      { id: 'b', label: "Fuel vapors mixed with air create explosive atmospheres that can be ignited by static sparks as small as 0.2 millijoules", correct: true },
      { id: 'c', label: "Static electricity changes the chemical composition of fuel" },
      { id: 'd', label: "It's only a concern for jet fuel, not automotive gasoline" }
    ],
    explanation: "Fuel vapors create explosive air-fuel mixtures within specific concentration ranges. These mixtures have extremely low minimum ignition energies - gasoline vapor can ignite from sparks containing less than 0.2 millijoules, far less than a typical static discharge. Fuel flowing through pipes generates static through friction with pipe walls. Bonding (connecting containers electrically) and grounding (connecting to earth) ensure any charge buildup has a safe path to ground rather than sparking across a gap."
  },
  {
    scenario: "An electronics distributor ships sensitive components in special pink or silver bags. A customer asks why they can't just use regular plastic bags, which seem sturdier and cheaper.",
    question: "What property makes antistatic packaging materials effective at protecting electronics?",
    options: [
      { id: 'a', label: "The color of the bag reflects harmful radiation" },
      { id: 'b', label: "Antistatic materials have surface resistivity that allows charge to dissipate slowly rather than accumulating or discharging rapidly, while static-shielding bags block external fields", correct: true },
      { id: 'c', label: "The bags are airtight to prevent humidity changes" },
      { id: 'd', label: "Regular plastic is too thin to protect from physical damage" }
    ],
    explanation: "Regular plastic is highly insulating and readily accumulates static charge. Pink antistatic bags contain additives that reduce surface resistivity, allowing charge to dissipate rather than build up - but they don't block external static fields. Silver static-shielding bags (metallized or metal-in construction) create a Faraday cage effect, blocking external electric fields from reaching components inside. The choice depends on protection level needed: antistatic for low-sensitivity parts, static-shielding for high-sensitivity ICs."
  }
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Data Center HVAC Design',
    icon: '🏢',
    description: 'Modern data centers maintain 40-60% RH with precision HVAC systems. Too dry = ESD damage. Too humid = condensation on cold surfaces. Millions of dollars in equipment depend on this balance.',
  },
  {
    title: 'Semiconductor Manufacturing',
    icon: '💻',
    description: 'Chip fabs maintain extreme humidity control (45% +/- 2%). A single static discharge can destroy chips worth thousands. Workers wear special suits and use ionizing air bars.',
  },
  {
    title: 'Hospital Operating Rooms',
    icon: '🏥',
    description: 'OR humidity is kept at 40-60% to prevent static sparks near flammable anesthetics and oxygen, while avoiding bacterial growth from high humidity.',
  },
  {
    title: 'Winter Static Shocks',
    icon: '❄️',
    description: 'Indoor humidity drops to 10-20% in winter when heating cold air. This is why you get shocked touching doorknobs! Humidifiers help, but too much causes window condensation.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function HumidityESDRenderer({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: HumidityESDRendererProps) {
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
  const [humidity, setHumidity] = useState(50);
  const [temperature, setTemperature] = useState(22);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [staticCharge, setStaticCharge] = useState(0);
  const [showSpark, setShowSpark] = useState(false);

  // Twist phase state
  const [twistHumidity, setTwistHumidity] = useState(70);
  const [coldSurfaceTemp, setColdSurfaceTemp] = useState(15);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);
  const [showCondensation, setShowCondensation] = useState(false);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const lastClickRef = useRef(0);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate dew point (simplified Magnus formula)
  const calculateDewPoint = useCallback((temp: number, rh: number): number => {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100);
    return (b * alpha) / (a - alpha);
  }, []);

  // Calculate ESD risk based on humidity
  const calculateESDRisk = useCallback((rh: number): { risk: string; voltage: number; color: string } => {
    if (rh < 20) return { risk: 'CRITICAL', voltage: 25000, color: '#ef4444' };
    if (rh < 30) return { risk: 'HIGH', voltage: 15000, color: '#f97316' };
    if (rh < 40) return { risk: 'MODERATE', voltage: 5000, color: '#eab308' };
    if (rh < 60) return { risk: 'LOW', voltage: 1500, color: '#22c55e' };
    return { risk: 'MINIMAL', voltage: 500, color: '#3b82f6' };
  }, []);

  // Check for condensation risk
  const hasCondensationRisk = useCallback((surfaceTemp: number, ambientTemp: number, rh: number): boolean => {
    const dewPoint = calculateDewPoint(ambientTemp, rh);
    return surfaceTemp <= dewPoint;
  }, [calculateDewPoint]);

  const dewPoint = calculateDewPoint(temperature, humidity);
  const esdRisk = calculateESDRisk(humidity);
  const twistDewPoint = calculateDewPoint(22, twistHumidity);
  const condensationRisk = hasCondensationRisk(coldSurfaceTemp, 22, twistHumidity);

  // Handlers
  const handleSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleSimulateSpark = useCallback(() => {
    if (humidity < 40) {
      setStaticCharge(esdRisk.voltage);
      setShowSpark(true);
      setTimeout(() => setShowSpark(false), 500);
    }
  }, [humidity, esdRisk.voltage]);

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

  const handleTwistSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, value: number) => {
    setter(value);
    setHasExploredTwist(true);
    setShowCondensation(hasCondensationRisk(coldSurfaceTemp, 22, twistHumidity));
  }, [hasCondensationRisk, coldSurfaceTemp, twistHumidity]);

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
                    ? 'w-6 bg-cyan-500'
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

        <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
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
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {nextLabel} {canGoNext && <span className="ml-1">→</span>}
        </button>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHumidityVisualization = () => {
    const waterMolecules = Math.floor(humidity / 5);
    const chargeIntensity = humidity < 40 ? (40 - humidity) / 40 : 0;

    return (
      <div className="relative">
        <svg viewBox="0 0 400 300" className="w-full h-64">
          <defs>
            {/* Premium air atmosphere gradient */}
            <linearGradient id="hesdAirGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="25%" stopColor="#172554" />
              <stop offset="50%" stopColor="#1e1b4b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Water vapor particle gradient */}
            <radialGradient id="hesdVaporGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>

            {/* Electric spark gradient */}
            <linearGradient id="hesdSparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
              <stop offset="20%" stopColor="#fde047" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="80%" stopColor="#fde047" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </linearGradient>

            {/* Charge buildup glow */}
            <radialGradient id="hesdChargeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Person silhouette gradient */}
            <linearGradient id="hesdPersonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Metal doorknob gradient */}
            <radialGradient id="hesdMetalGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="30%" stopColor="#9ca3af" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </radialGradient>

            {/* Humidity meter gradient */}
            <linearGradient id="hesdMeterBg" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Humidity level gradient - dynamic based on value */}
            <linearGradient id="hesdMeterFill" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={humidity < 30 ? '#dc2626' : humidity < 40 ? '#ea580c' : humidity > 60 ? '#2563eb' : '#16a34a'} />
              <stop offset="50%" stopColor={humidity < 30 ? '#ef4444' : humidity < 40 ? '#f59e0b' : humidity > 60 ? '#3b82f6' : '#22c55e'} />
              <stop offset="100%" stopColor={humidity < 30 ? '#f87171' : humidity < 40 ? '#fbbf24' : humidity > 60 ? '#60a5fa' : '#4ade80'} />
            </linearGradient>

            {/* Stats panel gradient */}
            <linearGradient id="hesdStatsBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glow filter for spark */}
            <filter id="hesdSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for charge indicators */}
            <filter id="hesdChargeFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Vapor particle glow */}
            <filter id="hesdVaporFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Meter glow filter */}
            <filter id="hesdMeterGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background - premium air atmosphere */}
          <rect width="400" height="300" fill="url(#hesdAirGrad)" rx="12" />

          {/* Subtle grid pattern for depth */}
          <g opacity="0.1">
            {[...Array(10)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 30} x2="400" y2={i * 30} stroke="#60a5fa" strokeWidth="0.5" />
            ))}
            {[...Array(14)].map((_, i) => (
              <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="300" stroke="#60a5fa" strokeWidth="0.5" />
            ))}
          </g>

          {/* Water vapor particles with premium glow */}
          {[...Array(waterMolecules)].map((_, i) => {
            const baseX = 30 + (i % 10) * 30;
            const baseY = 40 + Math.floor(i / 10) * 35;
            const x = baseX + Math.sin(animationFrame / 20 + i) * 12;
            const y = baseY + Math.cos(animationFrame / 25 + i) * 10;
            const size = 3 + Math.sin(animationFrame / 15 + i * 0.5) * 1.5;
            const opacity = 0.4 + Math.sin(animationFrame / 30 + i) * 0.3;

            return (
              <g key={i} filter="url(#hesdVaporFilter)">
                {/* Outer glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={size * 2}
                  fill="url(#hesdVaporGlow)"
                  opacity={opacity * 0.5}
                />
                {/* Core particle */}
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill="#93c5fd"
                  opacity={opacity}
                />
                {/* Bright center */}
                <circle
                  cx={x - size * 0.3}
                  cy={y - size * 0.3}
                  r={size * 0.4}
                  fill="#ffffff"
                  opacity={opacity * 0.8}
                />
              </g>
            );
          })}

          {/* Person silhouette with premium gradient */}
          <g transform="translate(100, 120)">
            {/* Body shadow */}
            <ellipse cx="3" cy="95" rx="30" ry="8" fill="#000000" opacity="0.3" />

            {/* Head */}
            <ellipse cx="0" cy="0" rx="15" ry="20" fill="url(#hesdPersonGrad)" />
            <ellipse cx="-4" cy="-5" rx="4" ry="6" fill="#9ca3af" opacity="0.3" />

            {/* Body */}
            <rect x="-25" y="20" width="50" height="70" fill="url(#hesdPersonGrad)" rx="10" />

            {/* Left arm extended toward doorknob */}
            <rect x="20" y="35" width="60" height="12" fill="url(#hesdPersonGrad)" rx="6" transform="rotate(-15, 20, 41)" />

            {/* Right arm */}
            <rect x="-35" y="30" width="15" height="50" fill="url(#hesdPersonGrad)" rx="5" />

            {/* Charge buildup visualization */}
            {humidity < 40 && (
              <g filter="url(#hesdChargeFilter)">
                {/* Glowing charge aura around person */}
                <ellipse
                  cx="0"
                  cy="40"
                  rx={35 + chargeIntensity * 10}
                  ry={55 + chargeIntensity * 10}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity={0.2 + chargeIntensity * 0.3}
                  strokeDasharray="4,4"
                >
                  <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
                </ellipse>

                {/* Floating charge symbols */}
                {[...Array(Math.floor((40 - humidity) / 5))].map((_, i) => {
                  const angle = (animationFrame / 20 + i * (360 / Math.max(1, Math.floor((40 - humidity) / 5)))) * (Math.PI / 180);
                  const radius = 35 + Math.sin(animationFrame / 10 + i) * 5;
                  const cx = Math.cos(angle) * radius;
                  const cy = 30 + Math.sin(angle) * radius * 0.6;

                  return (
                    <g key={i} transform={`translate(${cx}, ${cy})`}>
                      <circle r="8" fill="url(#hesdChargeGlow)" opacity={0.6 + Math.sin(animationFrame / 10 + i) * 0.3} />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fef3c7"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        +
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>

          {/* Doorknob/metal surface with premium materials */}
          <g transform="translate(280, 160)">
            {/* Door frame with depth */}
            <rect x="-8" y="-60" width="16" height="120" fill="#374151" rx="2" />
            <rect x="-6" y="-58" width="12" height="116" fill="#4b5563" rx="2" />
            <rect x="-4" y="-56" width="8" height="112" fill="#374151" rx="1" />

            {/* Door panel */}
            <rect x="8" y="-60" width="80" height="120" fill="#1f2937" rx="4" />
            <rect x="12" y="-56" width="72" height="112" fill="#111827" rx="3" />

            {/* Knob base */}
            <circle cx="0" cy="0" r="25" fill="#4b5563" />

            {/* Premium metal knob with gradient */}
            <circle cx="0" cy="0" r="22" fill="url(#hesdMetalGrad)" />

            {/* Knob highlight */}
            <ellipse cx="-6" cy="-6" rx="8" ry="6" fill="#e5e7eb" opacity="0.4" />

            {/* Center of knob */}
            <circle cx="0" cy="0" r="10" fill="#4b5563" />
            <circle cx="0" cy="0" r="8" fill="#374151" />

            {/* ESD Spark effect */}
            {showSpark && (
              <g filter="url(#hesdSparkGlow)">
                {/* Multiple spark branches */}
                <path
                  d="M -22 0 L -35 -8 L -30 0 L -45 -15 L -38 -5 L -55 -10"
                  fill="none"
                  stroke="url(#hesdSparkGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M -22 0 L -40 5 L -35 0 L -50 12 L -42 5 L -58 8"
                  fill="none"
                  stroke="url(#hesdSparkGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M -22 0 L -38 -3 L -32 2 L -52 -2 L -45 3 L -60 0"
                  fill="none"
                  stroke="url(#hesdSparkGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Central flash */}
                <circle cx="-30" cy="0" r="20" fill="#fef08a" opacity="0.6">
                  <animate attributeName="r" values="15;30;15" dur="0.2s" />
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.2s" />
                </circle>
                <circle cx="-30" cy="0" r="10" fill="#ffffff" opacity="0.9">
                  <animate attributeName="r" values="8;15;8" dur="0.2s" />
                </circle>
              </g>
            )}

            {/* Continuous low charge spark when very dry */}
            {humidity < 25 && !showSpark && (
              <g opacity={0.3 + Math.sin(animationFrame / 5) * 0.2} filter="url(#hesdChargeFilter)">
                <path
                  d={`M -22 0 L ${-30 - Math.sin(animationFrame / 3) * 5} ${Math.cos(animationFrame / 4) * 8}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>

          {/* Premium Humidity Meter */}
          <g transform="translate(355, 35)">
            {/* Meter background with depth */}
            <rect x="-2" y="-2" width="34" height="164" fill="#374151" rx="6" />
            <rect x="0" y="0" width="30" height="160" fill="url(#hesdMeterBg)" rx="5" />

            {/* Scale markings */}
            {[0, 20, 40, 60, 80, 100].map((val, i) => (
              <g key={i} transform={`translate(0, ${155 - val * 1.5})`}>
                <line x1="3" y1="0" x2="8" y2="0" stroke="#4b5563" strokeWidth="1" />
                <text x="-2" y="3" fill="#64748b" fontSize="6" textAnchor="end">{val}</text>
              </g>
            ))}

            {/* Danger zone indicator (below 30%) */}
            <rect x="5" y="110" width="20" height="45" fill="#ef4444" opacity="0.15" rx="2" />

            {/* Caution zone (30-40%) */}
            <rect x="5" y="95" width="20" height="15" fill="#f59e0b" opacity="0.15" rx="2" />

            {/* Safe zone (40-60%) */}
            <rect x="5" y="65" width="20" height="30" fill="#22c55e" opacity="0.15" rx="2" />

            {/* High humidity zone (>60%) */}
            <rect x="5" y="5" width="20" height="60" fill="#3b82f6" opacity="0.15" rx="2" />

            {/* Liquid fill with glow */}
            <g filter="url(#hesdMeterGlow)">
              <rect
                x="5"
                y={155 - humidity * 1.5}
                width="20"
                height={humidity * 1.5}
                fill="url(#hesdMeterFill)"
                rx="2"
              />
            </g>

            {/* Current level indicator */}
            <polygon
              points={`30,${155 - humidity * 1.5} 38,${150 - humidity * 1.5} 38,${160 - humidity * 1.5}`}
              fill={humidity < 30 ? '#ef4444' : humidity < 40 ? '#f59e0b' : humidity > 60 ? '#3b82f6' : '#22c55e'}
            />
          </g>

          {/* Stats panel with premium gradient */}
          <rect x="15" y="220" width="320" height="70" fill="url(#hesdStatsBg)" rx="10" stroke="#334155" strokeWidth="1" />
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4" style={{ pointerEvents: 'none' }}>
          <div className="flex justify-between items-end">
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Humidity</div>
              <div style={{ fontSize: typo.bodyLarge, color: esdRisk.color, fontWeight: 700 }}>{humidity}% RH</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ESD Risk</div>
              <div style={{ fontSize: typo.bodyLarge, color: esdRisk.color, fontWeight: 700 }}>{esdRisk.risk}</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Static</div>
              <div style={{ fontSize: typo.bodyLarge, color: esdRisk.color, fontWeight: 700 }}>{(esdRisk.voltage / 1000).toFixed(0)}kV</div>
            </div>
            <div className="text-center">
              <div style={{ fontSize: typo.label, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dew Point</div>
              <div style={{ fontSize: typo.bodyLarge, color: '#60a5fa', fontWeight: 700 }}>{dewPoint.toFixed(1)}C</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCondensationVisualization = () => {
    const isCondensing = coldSurfaceTemp <= twistDewPoint;
    const condensationIntensity = isCondensing ? Math.min(1, (twistDewPoint - coldSurfaceTemp) / 10) : 0;

    return (
      <div className="relative">
        <svg viewBox="0 0 400 300" className="w-full h-64">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="hesdCondBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e1b4b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Premium pipe/surface metal gradient */}
            <linearGradient id="hesdPipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="15%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="85%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Cold pipe frost effect */}
            <linearGradient id="hesdFrostGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.1" />
            </linearGradient>

            {/* Water droplet gradient */}
            <radialGradient id="hesdDropletGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#93c5fd" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
            </radialGradient>

            {/* Falling droplet gradient */}
            <linearGradient id="hesdFallingDrop" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Temperature scale gradient */}
            <linearGradient id="hesdTempScale" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Dew point line gradient */}
            <linearGradient id="hesdDewLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>

            {/* Diagram panel gradient */}
            <linearGradient id="hesdDiagramBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Droplet glow filter */}
            <filter id="hesdDropGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Frost shimmer filter */}
            <filter id="hesdFrostFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Status glow filter */}
            <filter id="hesdStatusGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Temperature indicator glow */}
            <filter id="hesdTempGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background with premium gradient */}
          <rect width="400" height="300" fill="url(#hesdCondBg)" rx="12" />

          {/* Ambient vapor particles in the air */}
          {[...Array(Math.floor(twistHumidity / 8))].map((_, i) => {
            const x = 20 + (i % 12) * 30 + Math.sin(animationFrame / 25 + i) * 8;
            const y = 20 + Math.floor(i / 12) * 25 + Math.cos(animationFrame / 30 + i) * 6;
            const opacity = 0.2 + Math.sin(animationFrame / 20 + i * 0.7) * 0.15;

            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={2 + Math.sin(animationFrame / 15 + i) * 0.5}
                fill="#93c5fd"
                opacity={opacity}
              />
            );
          })}

          {/* Cold pipe/surface with premium metal look */}
          <g transform="translate(50, 75)">
            {/* Pipe shadow */}
            <ellipse cx="150" cy="50" rx="105" ry="8" fill="#000000" opacity="0.3" />

            {/* Main pipe body */}
            <rect x="0" y="0" width="300" height="45" fill="url(#hesdPipeGrad)" rx="22" />

            {/* Pipe highlight */}
            <rect x="5" y="5" width="290" height="8" fill="#94a3b8" opacity="0.3" rx="4" />

            {/* Frost effect when cold */}
            {coldSurfaceTemp < 15 && (
              <g filter="url(#hesdFrostFilter)">
                <rect
                  x="0"
                  y="0"
                  width="300"
                  height="45"
                  fill="url(#hesdFrostGrad)"
                  rx="22"
                  opacity={0.3 + (15 - coldSurfaceTemp) * 0.04}
                />
                {/* Ice crystals */}
                {[...Array(10)].map((_, i) => (
                  <polygon
                    key={i}
                    points={`${30 + i * 28},${5 + Math.sin(i) * 3} ${35 + i * 28},${-2} ${40 + i * 28},${5 + Math.sin(i) * 3}`}
                    fill="#e0f2fe"
                    opacity={0.4 + Math.sin(animationFrame / 10 + i) * 0.2}
                  />
                ))}
              </g>
            )}

            {/* Condensation droplets */}
            {isCondensing && (
              <g filter="url(#hesdDropGlow)">
                {[...Array(15)].map((_, i) => {
                  const x = 15 + (i % 10) * 28;
                  const baseY = 48;
                  const dropProgress = ((animationFrame + i * 25) % 100) / 100;
                  const isFalling = dropProgress > 0.6;
                  const dropY = isFalling ? baseY + (dropProgress - 0.6) * 150 : baseY;
                  const opacity = isFalling ? 1 - (dropProgress - 0.6) * 2.5 : 1;
                  const dropSize = 3 + condensationIntensity * 3 + Math.sin(animationFrame / 12 + i) * 1.5;

                  return (
                    <g key={i}>
                      {/* Droplet forming on surface */}
                      {!isFalling && (
                        <ellipse
                          cx={x}
                          cy={baseY}
                          rx={dropSize}
                          ry={dropSize * 0.7 + dropProgress * 4}
                          fill="url(#hesdDropletGrad)"
                        />
                      )}
                      {/* Falling droplet */}
                      {isFalling && (
                        <g opacity={opacity}>
                          <ellipse
                            cx={x}
                            cy={dropY}
                            rx={dropSize * 0.6}
                            ry={dropSize * 1.2}
                            fill="url(#hesdFallingDrop)"
                          />
                          {/* Droplet highlight */}
                          <ellipse
                            cx={x - dropSize * 0.2}
                            cy={dropY - dropSize * 0.3}
                            rx={dropSize * 0.2}
                            ry={dropSize * 0.3}
                            fill="#ffffff"
                            opacity="0.6"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </g>

          {/* Temperature/humidity diagram panel */}
          <rect x="40" y="165" width="320" height="105" fill="url(#hesdDiagramBg)" rx="10" stroke="#334155" strokeWidth="1" />

          {/* Temperature scale bar */}
          <rect x="60" y="220" width="280" height="8" fill="url(#hesdTempScale)" rx="4" opacity="0.3" />

          {/* Dew point line with glow */}
          <g filter="url(#hesdStatusGlow)">
            <line
              x1="60"
              y1="224"
              x2={60 + (twistDewPoint / 30) * 280}
              y2="224"
              stroke="url(#hesdDewLine)"
              strokeWidth="3"
              strokeDasharray="6,4"
            />
          </g>

          {/* Surface temperature indicator with premium glow */}
          <g filter="url(#hesdTempGlow)">
            <circle
              cx={60 + (coldSurfaceTemp / 30) * 280}
              cy={224}
              r="12"
              fill={isCondensing ? '#ef4444' : '#22c55e'}
            />
            <circle
              cx={60 + (coldSurfaceTemp / 30) * 280}
              cy={224}
              r="8"
              fill={isCondensing ? '#fca5a5' : '#86efac'}
            />
            <circle
              cx={60 + (coldSurfaceTemp / 30) * 280}
              cy={224}
              r="4"
              fill="#ffffff"
            />
          </g>

          {/* Scale labels */}
          <g opacity="0.6">
            <text x="60" y="245" fill="#94a3b8" fontSize="8" textAnchor="middle">0C</text>
            <text x="153" y="245" fill="#94a3b8" fontSize="8" textAnchor="middle">10C</text>
            <text x="247" y="245" fill="#94a3b8" fontSize="8" textAnchor="middle">20C</text>
            <text x="340" y="245" fill="#94a3b8" fontSize="8" textAnchor="middle">30C</text>
          </g>

          {/* Status indicator panel */}
          <g filter="url(#hesdStatusGlow)">
            <rect
              x="100"
              y="175"
              width="200"
              height="32"
              fill={isCondensing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}
              rx="8"
              stroke={isCondensing ? '#ef4444' : '#22c55e'}
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div className="absolute top-6 left-0 right-0 px-4" style={{ pointerEvents: 'none' }}>
          <div className="flex justify-between items-start">
            {/* Left side - pipe info */}
            <div className="text-center bg-slate-900/60 rounded-lg px-3 py-2">
              <div style={{ fontSize: typo.label, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Surface</div>
              <div style={{ fontSize: typo.bodyLarge, color: coldSurfaceTemp < 10 ? '#60a5fa' : '#94a3b8', fontWeight: 700 }}>{coldSurfaceTemp}C</div>
            </div>

            {/* Right side - humidity info */}
            <div className="text-center bg-slate-900/60 rounded-lg px-3 py-2">
              <div style={{ fontSize: typo.label, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Humidity</div>
              <div style={{ fontSize: typo.bodyLarge, color: '#60a5fa', fontWeight: 700 }}>{twistHumidity}%</div>
              <div style={{ fontSize: typo.small, color: '#64748b' }}>Dew: {twistDewPoint.toFixed(1)}C</div>
            </div>
          </div>
        </div>

        {/* Status text outside SVG */}
        <div className="absolute" style={{ top: '175px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <div style={{
            fontSize: typo.body,
            color: isCondensing ? '#ef4444' : '#22c55e',
            fontWeight: 700,
            textAlign: 'center',
            textShadow: isCondensing ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 0 10px rgba(34, 197, 94, 0.5)',
          }}>
            {isCondensing ? 'CONDENSATION OCCURRING!' : 'No Condensation Risk'}
          </div>
        </div>

        {/* Bottom legend */}
        <div className="absolute bottom-2 left-0 right-0 px-6" style={{ pointerEvents: 'none' }}>
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" style={{ boxShadow: '0 0 6px rgba(96, 165, 250, 0.5)' }}></div>
              <span style={{ fontSize: typo.small, color: '#64748b' }}>Dew Point Line</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{
                backgroundColor: isCondensing ? '#ef4444' : '#22c55e',
                boxShadow: isCondensing ? '0 0 6px rgba(239, 68, 68, 0.5)' : '0 0 6px rgba(34, 197, 94, 0.5)'
              }}></div>
              <span style={{ fontSize: typo.small, color: '#64748b' }}>Surface Temp</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/30">
        <span className="text-4xl">💧</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Humidity & Static Discharge
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do data centers control humidity so precisely?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Goldilocks Zone</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Too dry = static discharge fries components. Too humid = condensation corrodes circuits.
              Data centers walk a tightrope between these two failure modes.
            </p>
          </div>
        </div>
      </div>

      {renderBottomBar(true, 'Explore Humidity Control')}
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
          It&apos;s a dry winter day with <strong>15% relative humidity</strong>.
          You walk across a carpet and reach for a server&apos;s metal case.
        </p>
        <p className="text-blue-700 mt-2 font-medium">
          What voltage might the static spark reach?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'low', label: '12V - like touching a battery', icon: '🔋' },
          { id: 'medium', label: '120V - like a wall outlet', icon: '🔌' },
          { id: 'high', label: '25,000V - thousands of volts!', icon: '⚡' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'high'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-red-300 bg-red-50'
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
          prediction === 'high' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${prediction === 'high' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {prediction === 'high' ? (
              <><strong>Exactly right!</strong> Static discharge can reach 25,000V or more! You feel sparks above ~3,000V, but even unfelt discharges below 100V can damage sensitive electronics. Dry air is an excellent insulator, allowing massive charge buildup.</>
            ) : (
              <><strong>Much higher!</strong> Static sparks routinely reach 3,000-25,000V. The spark you see/feel is thousands of volts! Even unfelt ESD under 100V can damage sensitive chips. This is why humidity control is critical.</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showPredictionFeedback, 'Explore ESD Physics')}
    </div>
  );

  const renderPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Static Discharge Simulator</h2>
          <p className="text-sm text-slate-500">See how humidity affects ESD risk</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderHumidityVisualization()}
      </div>

      <div className="space-y-4 mb-4">
        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Relative Humidity: {humidity}%
          </label>
          <input
            type="range"
            min="10"
            max="80"
            value={humidity}
            onChange={(e) => handleSliderChange(setHumidity, parseInt(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10% (Desert)</span>
            <span>40-60% (Optimal)</span>
            <span>80% (Tropical)</span>
          </div>
        </div>
      </div>

      {humidity < 40 && (
        <button
          onClick={handleSimulateSpark}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="w-full py-3 mb-4 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
        >
          Simulate Static Discharge
        </button>
      )}

      <div className={`rounded-2xl p-4 mb-6 ${
        humidity < 30 ? 'bg-red-50 border border-red-200' :
        humidity < 40 ? 'bg-amber-50 border border-amber-200' :
        humidity > 60 ? 'bg-blue-50 border border-blue-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <p className={`text-sm leading-relaxed ${
          humidity < 30 ? 'text-red-800' :
          humidity < 40 ? 'text-amber-800' :
          humidity > 60 ? 'text-blue-800' :
          'text-green-800'
        }`}>
          {humidity < 30 ? (
            <><strong>DANGER!</strong> Extremely dry. Static can build to 25,000V+. High risk of component damage from ESD.</>
          ) : humidity < 40 ? (
            <><strong>Warning:</strong> Low humidity. Static voltages can reach 5,000-15,000V. Use ESD protection.</>
          ) : humidity > 60 ? (
            <><strong>Caution:</strong> High humidity. ESD risk is low, but watch for condensation on cold surfaces.</>
          ) : (
            <><strong>Optimal range!</strong> 40-60% RH balances ESD prevention and condensation risk. This is the data center sweet spot.</>
          )}
        </p>
      </div>

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : `Adjust humidity ${Math.max(0, 5 - experimentCount)} more times...`)}
    </div>
  );

  const renderReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding ESD and Humidity</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">Optimal Data Center Humidity</p>
        <div className="text-4xl font-bold mb-2">40-60% RH</div>
        <p className="text-indigo-200 text-sm">
          The Goldilocks zone: not too dry, not too humid
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '⚡',
            title: 'ESD Mechanism',
            desc: 'Dry air is an excellent insulator. Walking on carpet separates electrons, building thousands of volts. When you touch metal, discharge occurs in nanoseconds!',
          },
          {
            icon: '🛡️',
            title: 'Why Humidity Helps',
            desc: 'Humid air conducts slightly, allowing charge to dissipate before it builds up. Above 40% RH, dangerous charge accumulation is much harder.',
          },
          {
            icon: '💔',
            title: 'Component Damage',
            desc: 'Modern ICs can be damaged by <100V - you would not even feel it. CMOS gates, MOSFET transistors, and memory chips are especially vulnerable.',
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
        <h2 className="text-xl font-bold text-slate-800">The High Humidity Twist</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <p className="text-amber-800 leading-relaxed">
          If low humidity causes ESD, why not just run data centers at <strong>80% humidity</strong>?
          That would eliminate static completely!
        </p>
        <p className="text-amber-700 mt-2 font-medium">
          What&apos;s wrong with this plan?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'nothing', label: 'Nothing - high humidity would be better', icon: '✅' },
          { id: 'condensation', label: 'Condensation! Water forms on cold surfaces', icon: '💧' },
          { id: 'cost', label: 'Too expensive to maintain', icon: '💰' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'condensation'
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
          twistPrediction === 'condensation' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${twistPrediction === 'condensation' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {twistPrediction === 'condensation' ? (
              <><strong>Exactly!</strong> High humidity causes condensation on any surface below the dew point. Cold water pipes, air conditioning coils, and even server intake fans can collect water droplets - leading to short circuits and corrosion.</>
            ) : (
              <><strong>The real danger:</strong> Condensation! When humid air contacts cold surfaces (pipes, AC coils, server intakes), water condenses. Liquid water + electronics = short circuits and corrosion. Too humid is just as bad as too dry!</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showTwistFeedback, 'Explore Dew Point')}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-xl">💧</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Condensation Simulator</h2>
          <p className="text-sm text-slate-500">See when moisture forms on cold surfaces</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderCondensationVisualization()}
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Room Humidity: {twistHumidity}% (Dew Point: {twistDewPoint.toFixed(1)}C)
          </label>
          <input
            type="range"
            min="30"
            max="90"
            value={twistHumidity}
            onChange={(e) => handleTwistSliderChange(setTwistHumidity, parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="bg-slate-100 rounded-xl p-4">
          <label className="text-slate-700 text-sm font-medium block mb-2">
            Cold Surface Temperature: {coldSurfaceTemp}C
          </label>
          <input
            type="range"
            min="5"
            max="25"
            value={coldSurfaceTemp}
            onChange={(e) => handleTwistSliderChange(setColdSurfaceTemp, parseInt(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5C (Cold pipe)</span>
            <span>15C (AC vent)</span>
            <span>25C (Room temp)</span>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl p-4 mb-6 ${
        condensationRisk ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
      }`}>
        <p className={`text-sm leading-relaxed ${condensationRisk ? 'text-red-800' : 'text-green-800'}`}>
          {condensationRisk ? (
            <><strong>CONDENSATION!</strong> Surface ({coldSurfaceTemp}C) is below dew point ({twistDewPoint.toFixed(1)}C). Water is forming! This can cause short circuits and corrosion.</>
          ) : (
            <><strong>Safe:</strong> Surface ({coldSurfaceTemp}C) is above dew point ({twistDewPoint.toFixed(1)}C). No condensation will form.</>
          )}
        </p>
      </div>

      {renderBottomBar(hasExploredTwist, hasExploredTwist ? 'Continue' : 'Adjust the sliders...')}
    </div>
  );

  const renderTwistReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The Complete Picture</h2>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Two Failure Modes, One Solution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4 border-2 border-red-200">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-700 font-medium">Too Dry (&lt;40%)</div>
            <div className="text-xs text-red-600 font-bold">ESD Damage</div>
            <div className="text-xs text-slate-500">Up to 25,000V</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4 border-2 border-blue-200">
            <div className="text-3xl mb-2">💧</div>
            <div className="text-sm text-slate-700 font-medium">Too Humid (&gt;60%)</div>
            <div className="text-xs text-blue-600 font-bold">Condensation</div>
            <div className="text-xs text-slate-500">Corrosion, shorts</div>
          </div>
        </div>
        <div className="mt-4 text-center bg-green-100 rounded-xl p-4 border-2 border-green-300">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-sm text-slate-700 font-medium">40-60% RH</div>
          <div className="text-xs text-green-600 font-bold">The Safe Zone</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-slate-800 mb-2">Data Center Best Practices</h4>
        <ul className="text-slate-600 text-sm space-y-2">
          <li>Monitor both humidity AND dew point continuously</li>
          <li>Keep surfaces above dew point (especially cold pipes)</li>
          <li>Use precision HVAC with humidity control</li>
          <li>Implement ESD procedures regardless of humidity</li>
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
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
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
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Mark as Complete
              </button>
            ) : (
              <div className="w-full py-3 bg-cyan-100 text-cyan-700 rounded-xl font-semibold text-center">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-cyan-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
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
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7 ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '💧' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7 ? 'Excellent! You understand humidity and ESD!' : 'Review the concepts and try again.'}
            </p>

            {testScore < 7 && (
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-slate-200 text-slate-700 mb-4"
              >
                Try Again
              </button>
            )}
            {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Lesson' : 'Review and Retry')}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="max-w-2xl mx-auto px-6 py-8 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/30 mb-6">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">Humidity Control Master!</h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand the critical balance between ESD prevention and condensation control.
      </p>

      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'Optimal humidity: 40-60% RH for data centers',
            'Low humidity (<30%) allows 25,000V+ static buildup',
            'High humidity (>60%) causes condensation on cold surfaces',
            'Dew point temperature determines when water condenses',
            'Monitor both humidity AND dew point for complete protection',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm">✓</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {renderBottomBar(true, 'Complete')}
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
