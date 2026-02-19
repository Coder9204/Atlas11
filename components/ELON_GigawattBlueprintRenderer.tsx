'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON GAME #36 CAPSTONE: GIGAWATT BLUEPRINT - Complete 10-Phase Game
// Integrated GW-scale clean energy + compute + manufacturing campus
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

interface ELON_GigawattBlueprintRendererProps {
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
    scenario: "You are designing a 2GW integrated campus that includes a solar farm, battery storage, a hyperscale data center, and a battery manufacturing facility. The site must be self-sufficient for 95% of its energy needs while maintaining grid interconnection for backup.",
    question: "What is the most critical systems integration challenge for this campus?",
    options: [
      { id: 'a', label: "Matching the intermittent solar generation profile with the constant 24/7 power demands of the data center and manufacturing line using storage as a buffer", correct: true },
      { id: 'b', label: "Choosing the correct color for the solar panels to match the building aesthetics" },
      { id: 'c', label: "Ensuring all buildings are the same height for visual uniformity" },
      { id: 'd', label: "Selecting a single vendor for all equipment to simplify procurement" }
    ],
    explanation: "Systems integration is the fundamental challenge: solar generates during daylight hours with weather variability, but data centers demand constant power (99.999% uptime) and manufacturing lines need stable baseload. Battery storage must bridge the gap between generation and consumption profiles, requiring careful sizing of solar overcapacity and storage duration."
  },
  {
    scenario: "A project team is evaluating three potential sites for a 1.5GW integrated campus: (A) Arizona desert with excellent solar but limited water, (B) coastal Texas with good wind and solar but hurricane risk, (C) rural Midwest with moderate solar and wind but strong grid access and cheap land.",
    question: "Which factor is most important for site selection of an integrated energy-compute-manufacturing campus?",
    options: [
      { id: 'a', label: "Grid interconnection capacity and proximity to transmission infrastructure, because even with on-site generation, reliable grid backup is essential for 99.999% uptime", correct: true },
      { id: 'b', label: "The average annual temperature, because it determines employee comfort levels" },
      { id: 'c', label: "Proximity to the nearest major airport for executive travel convenience" },
      { id: 'd', label: "The local tax rate, which is the sole determinant of project economics" }
    ],
    explanation: "Grid interconnection is paramount because even a campus with 95% self-generation needs reliable grid backup for the remaining 5% and during extended weather events. Interconnection queue times can exceed 4-5 years and transmission upgrades can cost hundreds of millions. Sites with existing high-voltage infrastructure dramatically reduce timeline and backup risk."
  },
  {
    scenario: "An integrated campus needs 1.8GW of solar capacity to achieve 95% energy self-sufficiency. The solar farm requires approximately 15 square kilometers of land. Battery storage of 8GWh is planned to bridge overnight and cloudy periods.",
    question: "How should the solar-to-storage ratio be optimized for this campus?",
    options: [
      { id: 'a', label: "Oversize solar by 30-50% beyond peak demand and pair with 4-6 hours of storage to cover overnight demand, accepting some curtailment during peak sun", correct: true },
      { id: 'b', label: "Match solar capacity exactly to peak demand with no oversizing to minimize cost" },
      { id: 'c', label: "Install minimal solar and rely primarily on 24 hours of battery storage" },
      { id: 'd', label: "Use only solar with no storage, accepting that the campus will shut down at night" }
    ],
    explanation: "Solar oversizing is essential because the campus needs 24/7 power but solar only generates for 6-8 peak hours. A 1.3-1.5x oversize ratio generates surplus during peak hours to charge batteries for overnight use. The 4-6 hour storage duration balances cost (batteries are expensive per GWh) against reliability. Some curtailment during peak sun is more economical than adding more storage."
  },
  {
    scenario: "The campus requires a 500MW grid interconnection for backup power and to export surplus solar during peak generation. The local utility estimates 42 months for interconnection studies and upgrades, with $350M in network upgrade costs assigned to the project.",
    question: "What is the primary risk of grid interconnection for this project?",
    options: [
      { id: 'a', label: "Timeline uncertainty and cost escalation -- interconnection studies often reveal unexpected upgrade requirements, and queue positions can be lost, delaying the entire project by years", correct: true },
      { id: 'b', label: "The utility will refuse to connect the project under any circumstances" },
      { id: 'c', label: "Grid interconnection is instant and free for all renewable energy projects" },
      { id: 'd', label: "The only risk is choosing the wrong color for the transmission towers" }
    ],
    explanation: "The US interconnection queue has over 2,000GW of projects waiting, with average wait times of 4-5 years. Network upgrade cost estimates frequently increase 2-3x during detailed studies. Projects that fail to meet milestones lose their queue position. For a GW-scale campus, this timeline risk can delay the entire $10B+ investment by years, making early interconnection application critical."
  },
  {
    scenario: "The campus data center is designed for 300MW of IT load. With a PUE of 1.1 in a temperate climate, total facility power is 330MW. The data center will host AI training workloads that require consistent power quality with less than 1ms of transfer time to backup systems.",
    question: "What determines the total power requirement for the data center portion of the campus?",
    options: [
      { id: 'a', label: "IT load multiplied by PUE (power usage effectiveness), where PUE captures cooling, power distribution losses, lighting, and other overhead -- making cooling the largest variable factor", correct: true },
      { id: 'b', label: "Only the number of servers matters; all other power consumption is negligible" },
      { id: 'c', label: "Data center power is fixed at exactly 100MW regardless of the number of servers" },
      { id: 'd', label: "The power requirement depends solely on the building's square footage" }
    ],
    explanation: "Total data center power = IT load x PUE. A PUE of 1.1 means 10% overhead beyond IT load, mostly for cooling. In temperate climates, free-air cooling keeps PUE low (1.05-1.15), but tropical locations can push PUE to 1.3-1.5 due to mechanical cooling needs. For 300MW IT load, the difference between PUE 1.1 and 1.4 is 90MW of additional power -- equivalent to hundreds of millions in additional solar and storage investment."
  },
  {
    scenario: "The campus is relocated from a temperate US site (average 18C) to a tropical developing nation (average 32C, 85% humidity). The data center PUE increases from 1.1 to 1.4, and the manufacturing facility requires additional climate control for precision processes.",
    question: "How does tropical relocation affect total campus energy requirements?",
    options: [
      { id: 'a', label: "Total campus power increases 15-25% due to higher cooling loads across all facilities, requiring more solar and storage capacity, and potentially making the project uneconomic without cheaper land or labor offsets", correct: true },
      { id: 'b', label: "Tropical locations require less energy because warm air is easier to manage" },
      { id: 'c', label: "Location has no effect on energy requirements for any facility type" },
      { id: 'd', label: "Only the data center is affected; manufacturing and other facilities are unchanged" }
    ],
    explanation: "Tropical relocation impacts every facility: data center PUE rises from 1.1 to 1.4 (adding 90MW for 300MW IT load), manufacturing needs additional dehumidification and climate control, and battery storage degrades faster in heat. However, solar irradiance improves 15-25% near the equator, partially offsetting increased demand. The net effect is typically a 15-25% increase in total power needs."
  },
  {
    scenario: "The battery manufacturing facility requires 200MW of stable baseload power for electrode coating, cell assembly, and formation cycling. Any power interruption exceeding 100ms causes a batch of 50,000 cells to be scrapped, worth approximately $2M.",
    question: "What makes manufacturing power requirements different from data center power requirements?",
    options: [
      { id: 'a', label: "Manufacturing needs extremely stable baseload power with zero tolerance for interruptions during batch processes, while data centers can use UPS systems for brief outages -- making manufacturing the harder load to serve from intermittent renewables", correct: true },
      { id: 'b', label: "Manufacturing uses far less power than data centers in all cases" },
      { id: 'c', label: "Manufacturing and data center power requirements are identical" },
      { id: 'd', label: "Manufacturing facilities can easily restart after power interruptions with no losses" }
    ],
    explanation: "Manufacturing power differs fundamentally from data center power. Data centers use UPS (battery backup) systems that can bridge 10-15 minutes of outage while generators start. Manufacturing batch processes cannot tolerate even brief interruptions -- electrode coating lines must maintain precise temperature and speed continuously. This requires dedicated on-site storage with sub-millisecond transfer times and potentially dedicated natural gas backup for critical process power."
  },
  {
    scenario: "The total campus budget is $12B. The project team must decide how to phase construction: (A) build everything simultaneously over 4 years, (B) phase solar+storage first, then data center, then manufacturing over 6 years, or (C) build the data center first with grid power, then add solar+storage, then manufacturing over 5 years.",
    question: "Which phasing strategy optimizes capital deployment and risk management?",
    options: [
      { id: 'a', label: "Option C -- data center first generates revenue immediately from cloud/AI services using grid power, funding subsequent phases; solar+storage then reduces operating costs; manufacturing comes last as it has the longest payback period", correct: true },
      { id: 'b', label: "Option A is always best because building everything at once is always cheaper" },
      { id: 'c', label: "The manufacturing facility should always be built first because it creates products" },
      { id: 'd', label: "Phasing does not matter; all approaches yield identical financial outcomes" }
    ],
    explanation: "Revenue-first phasing (Option C) is standard for mega-projects. The data center can generate $500M+/year in revenue while running on grid power, creating cash flow to fund subsequent phases. Solar+storage in Phase 2 reduces the data center's $150M+/year energy bill. Manufacturing in Phase 3 leverages the established power infrastructure. This approach reduces peak capital needs, generates early returns, and allows course correction between phases."
  },
  {
    scenario: "The campus is planned for a developing nation that offers 20-year tax holidays, free land, and subsidized grid power at $0.03/kWh. However, the country has no existing data center permitting framework, environmental review processes take 3-5 years, and the grid experiences 50+ hours of unplanned outages annually.",
    question: "What is the biggest policy and permitting risk for this mega-project?",
    options: [
      { id: 'a', label: "Regulatory uncertainty and lack of established permitting frameworks -- without clear processes for data center environmental review, power purchase agreements, and foreign investment protections, the project faces unpredictable delays and potential policy changes that could strand $12B in investment", correct: true },
      { id: 'b', label: "Tax holidays eliminate all financial risk, so there are no policy concerns" },
      { id: 'c', label: "Grid outages are the only risk; all other factors are irrelevant" },
      { id: 'd', label: "Developing nations always have faster permitting than developed nations" }
    ],
    explanation: "Regulatory uncertainty is the greatest risk for GW-scale projects. Without established frameworks, every permit becomes a negotiation rather than a process. Policy changes mid-construction (e.g., revoking tax holidays, changing environmental requirements) can be catastrophic. The Foxconn Wisconsin experience showed how political promises can evaporate. Successful mega-projects require stable legal frameworks, enforceable contracts, and sovereign risk insurance."
  },
  {
    scenario: "After 25 years of operation, the integrated campus has a total cost of ownership including $12B construction, $8B in operations and maintenance, $3B in major equipment replacements (solar panels at year 15, batteries every 10 years), and generated $35B in cumulative revenue from data center services, manufacturing output, and energy sales.",
    question: "What determines the true total cost of ownership for a GW-scale integrated campus?",
    options: [
      { id: 'a', label: "TCO includes initial capex, ongoing opex, periodic equipment replacement, decommissioning reserves, and opportunity cost of capital -- the $23B construction+maintenance cost represents only 65% of the $35B in revenue, yielding thin margins that require precise financial planning", correct: true },
      { id: 'b', label: "Only the initial construction cost matters for TCO calculation" },
      { id: 'c', label: "TCO equals total revenue minus initial construction cost" },
      { id: 'd', label: "Equipment never needs replacement over a 25-year project life" }
    ],
    explanation: "True TCO for integrated campuses must account for: initial capex ($12B), cumulative opex ($8B over 25 years), major replacements ($3B for solar repowering, battery cycling, cooling system overhauls), financing costs (interest on $12B over construction), and decommissioning. The thin margin between $23B total cost and $35B revenue (34% lifetime margin) shows why precise budgeting, technology choices, and phasing decisions are critical to project viability."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F50B}',
    title: 'Tesla Gigafactory Nevada',
    short: '$6B integrated campus combining battery manufacturing, solar generation, and grid-scale storage',
    tagline: 'The original gigawatt-scale integrated energy-manufacturing campus',
    description: 'Tesla\'s Gigafactory Nevada represents the first attempt to co-locate battery manufacturing with on-site renewable energy at gigawatt scale. The 5.4 million square foot facility in Storey County combines 70GWh/year of battery cell and pack production with a 3.2MW rooftop solar array (planned to expand to 70MW) and grid-connected energy storage. The campus demonstrates that manufacturing and clean energy generation can share infrastructure, reducing costs and carbon footprint simultaneously.',
    connection: 'The Gigafactory embodies the gigawatt blueprint concept by integrating energy generation, storage, and industrial consumption on a single campus. Tesla\'s experience showed that co-location reduces transmission losses, enables direct DC coupling between solar and battery formation equipment, and creates a living laboratory for testing storage products under real manufacturing conditions.',
    howItWorks: 'The facility operates with a combination of on-site solar, grid power from NV Energy, and battery storage systems that provide peak shaving and backup power. Manufacturing processes like electrode coating and cell formation require extremely stable power, which is managed through dedicated power conditioning equipment and on-site storage buffers.',
    stats: [
      { value: '$6B+', label: 'Total Investment' },
      { value: '70GWh/yr', label: 'Cell Production' },
      { value: '~7,000', label: 'Employees' }
    ],
    examples: ['Rooftop solar integrated with manufacturing', 'Battery storage for grid peak shaving', 'DC-coupled solar for formation cycling', 'Waste heat recovery for building climate control'],
    companies: ['Tesla', 'Panasonic', 'NV Energy', 'Storey County'],
    futureImpact: 'Tesla\'s next Gigafactories (Texas, Berlin, Mexico) incorporate lessons learned, with larger solar installations, integrated Megapack storage, and designs that target 100% renewable operation within 5 years of commissioning.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F3D9}\uFE0F',
    title: 'NEOM / The Line - Saudi Arabia',
    short: '$500B+ integrated city with energy, compute, and manufacturing at unprecedented scale',
    tagline: 'The most ambitious integrated energy-city project ever attempted',
    description: 'NEOM in northwest Saudi Arabia aims to build an entirely new city powered by 100% renewable energy, including integrated data centers, advanced manufacturing, and the world\'s largest green hydrogen facility. The project\'s energy plan calls for over 30GW of solar and wind capacity, 100GWh+ of battery storage, and a dedicated hydrogen production facility exporting green ammonia globally. If completed as planned, NEOM would represent the largest integrated energy-compute-manufacturing campus in history.',
    connection: 'NEOM tests the gigawatt blueprint concept at maximum scale: can you design an entire city around integrated renewable energy, computing, and manufacturing? The project faces every challenge discussed in this game -- site selection in extreme heat, grid independence, storage sizing for 24/7 operation, phased construction of a $500B+ project, and policy risk in a developing regulatory environment.',
    howItWorks: 'The energy system is designed as a self-contained microgrid with solar PV farms, onshore and offshore wind turbines, battery energy storage systems, and green hydrogen electrolyzers that convert surplus renewable electricity into storable fuel. Data centers and manufacturing facilities receive power through a dedicated distribution network with multiple redundancy layers.',
    stats: [
      { value: '$500B+', label: 'Planned Investment' },
      { value: '30GW+', label: 'Renewable Target' },
      { value: '2030+', label: 'Phase 1 Target' }
    ],
    examples: ['30GW+ solar and wind farm', 'Green hydrogen export hub', 'Integrated AI data center district', 'Desalination powered by renewables'],
    companies: ['NEOM', 'Saudi PIF', 'ACWA Power', 'Air Products'],
    futureImpact: 'Whether NEOM succeeds or struggles, it will provide critical data on the feasibility of GW-scale integrated development, the limits of top-down energy planning, and the real costs of building greenfield infrastructure at city scale in extreme climates.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F916}',
    title: 'xAI Memphis + Tesla Manufacturing Vision',
    short: 'Co-locating AI compute with energy-intensive manufacturing for shared infrastructure',
    tagline: 'When AI training meets industrial power demand',
    description: 'xAI\'s Memphis data center (Colossus) represents a new model of co-locating massive AI compute with nearby energy infrastructure. The facility started with 100,000 NVIDIA H100 GPUs consuming over 150MW, with plans to scale significantly. The broader vision of co-locating AI compute facilities near Tesla manufacturing operations would create integrated campuses where shared power infrastructure (solar, storage, grid connections) serves both AI training workloads and manufacturing processes, reducing the per-unit cost of energy infrastructure.',
    connection: 'This model directly applies the gigawatt blueprint concept: AI data centers and manufacturing facilities have complementary power profiles. Data centers run 24/7 but can flex compute scheduling by 10-20%, while manufacturing has predictable shift-based demand. Co-location allows shared solar farms, battery systems, grid interconnections, and cooling infrastructure, potentially reducing total energy infrastructure costs by 20-30% versus separate facilities.',
    howItWorks: 'The shared infrastructure model works by oversizing solar and storage for combined peak demand, then using intelligent load management to shift flexible AI workloads (like training batch jobs) to peak solar hours while maintaining manufacturing baseload. Grid interconnection costs are shared, and backup power systems serve both facilities through a common switchgear arrangement.',
    stats: [
      { value: '150MW+', label: 'Initial AI Compute' },
      { value: '100K', label: 'H100 GPUs' },
      { value: '20-30%', label: 'Shared Infra Savings' }
    ],
    examples: ['Shared solar farm for AI + manufacturing', 'Common battery storage system', 'Intelligent load shifting between facilities', 'Shared cooling water infrastructure'],
    companies: ['xAI', 'Tesla', 'NVIDIA', 'Memphis Light Gas & Water'],
    futureImpact: 'As AI compute demand grows to hundreds of GW globally, the co-location model with manufacturing could become the dominant approach for new industrial campuses, creating integrated energy ecosystems that are more efficient and resilient than standalone facilities.',
    color: '#3B82F6'
  },
  {
    icon: '\u{26A0}\uFE0F',
    title: 'Foxconn Wisconsin - Cautionary Tale',
    short: 'A $10B mega-project that collapsed due to overambition, political promises, and execution failures',
    tagline: 'What happens when gigawatt-scale ambition meets reality',
    description: 'In 2017, Foxconn announced a $10B manufacturing campus in Mount Pleasant, Wisconsin, promising 13,000 jobs and a "Generation 10.5" LCD display factory. The project received $4.5B in state and local incentives -- the largest subsidy package in US history. By 2021, the project had been dramatically scaled back to a small facility with fewer than 1,500 jobs. The original campus plan included on-site power generation, water treatment, and integrated supply chain facilities -- a gigawatt blueprint that was never realized.',
    connection: 'Foxconn Wisconsin demonstrates every failure mode of mega-project planning: unrealistic scale assumptions, politically-driven site selection (far from supply chains and skilled labor), inadequate infrastructure assessment (water supply, power grid capacity), and dependency on incentives that created perverse incentives to announce ambitious plans without rigorous engineering validation. It is the anti-pattern for the gigawatt blueprint approach.',
    howItWorks: 'The original plan called for a 20 million square foot manufacturing complex with on-site power generation, a dedicated water supply from Lake Michigan (7 million gallons/day), rail connections, and integrated supplier parks. The project was structured as a series of phases, but Phase 1 was never completed to original specifications. The $4.5B incentive package was renegotiated down to $80M after the project failed to meet employment and investment milestones.',
    stats: [
      { value: '$10B', label: 'Promised Investment' },
      { value: '$80M', label: 'Actual Incentives Paid' },
      { value: '~1,500', label: 'Actual Jobs (vs 13K)' }
    ],
    examples: ['Political announcement before engineering validation', 'Site selection driven by incentives not logistics', 'Water and power infrastructure underestimated', 'Phased milestones not enforced by contracts'],
    companies: ['Foxconn', 'State of Wisconsin', 'Mount Pleasant', 'Racine County'],
    futureImpact: 'The Foxconn debacle has reshaped how states negotiate mega-project incentives, leading to clawback provisions, milestone-based disbursements, and independent engineering reviews. It serves as a critical case study in why gigawatt-scale projects require rigorous bottom-up engineering before top-down political commitments.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_GigawattBlueprintRenderer: React.FC<ELON_GigawattBlueprintRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const [animFrame, setAnimFrame] = useState(0);
  const [totalBudget, setTotalBudget] = useState(10); // $B
  const [tropicalLocation, setTropicalLocation] = useState(false); // twist
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [selectedApp, setSelectedApp] = useState(0);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Physics/economics calculations
  const solarCostPerGW = 1.0; // $B/GW
  const storageCostPerGWh = 0.3; // $B/GWh
  const dataCenterCostPerMW = 0.01; // $B per MW IT load
  const mfgFacilityCost = 2.0; // $B baseline
  const gridInterconnectCost = 0.5; // $B

  const solarCapacity = Math.min(totalBudget * 0.3 / solarCostPerGW, 3); // GW
  const storageCapacity = Math.min(totalBudget * 0.15 / storageCostPerGWh, 12); // GWh
  const dataCenterPower = Math.min(totalBudget * 0.25 / dataCenterCostPerMW, 500); // MW
  const coolingOverhead = tropicalLocation ? 1.4 : 1.1; // PUE multiplier
  const effectiveCompute = dataCenterPower / coolingOverhead;

  const solarCost = solarCapacity * solarCostPerGW;
  const storageCost = storageCapacity * storageCostPerGWh;
  const dcCost = dataCenterPower * dataCenterCostPerMW;
  const totalAllocated = solarCost + storageCost + dcCost + mfgFacilityCost + gridInterconnectCost;
  const budgetRemaining = totalBudget - totalAllocated;
  const selfSufficiency = Math.min(95, (solarCapacity * 1000 * 0.25 + storageCapacity * 365) / ((dataCenterPower * coolingOverhead + 200) * 8.76) * 100);
  const campusPowerMW = dataCenterPower * coolingOverhead + 200; // DC + mfg
  const solarGenerationMW = solarCapacity * 1000 * 0.25; // avg capacity factor

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    solar: '#F59E0B',
    wind: '#06B6D4',
    storage: '#8B5CF6',
    compute: '#3B82F6',
    mfg: '#10B981',
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
        gameType: 'gigawatt-blueprint',
        gameTitle: 'Gigawatt Blueprint',
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
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          style={{
            width: phase === p ? '24px' : '12px',
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundClip: 'content-box',
            padding: '18px 2px',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.success})`,
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

  // Master Site Plan SVG Visualization
  const SitePlanVisualization = ({ showTropical }: { showTropical?: boolean }) => {
    const width = isMobile ? 340 : 560;
    const height = 500;
    const pue = showTropical && tropicalLocation ? 1.4 : 1.1;
    const effComp = dataCenterPower / pue;
    const pulse = Math.sin(animFrame * 0.03) * 3;
    const flowOffset = (animFrame * 2) % 40;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="gwSolarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.solar} />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="gwComputeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.compute} />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="gwStorageGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.storage} />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="gwMfgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.mfg} />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="gwWindGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.wind} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <filter id="gwGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="gwSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          GW Campus Master Site Plan | Budget: ${totalBudget}B
        </text>
        <text x={width / 2} y={36} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Solar: {solarCapacity.toFixed(1)}GW | Storage: {storageCapacity.toFixed(1)}GWh | DC: {dataCenterPower.toFixed(0)}MW | PUE: {pue.toFixed(1)}
        </text>

        {/* Campus boundary */}
        <rect x={20} y={50} width={width - 40} height={380} rx="12" fill="none" stroke={colors.border} strokeWidth="1.5" strokeDasharray="6,4" />

        {/* --- SOLAR FARM (top-left) --- */}
        <rect x={35} y={65} width={isMobile ? 120 : 180} height={100} rx="8" fill="rgba(245,158,11,0.08)" stroke={colors.solar} strokeWidth="1.5" />
        {/* Solar panel rows */}
        {[0, 1, 2, 3, 4].map(row => (
          <rect key={`sp-${row}`} x={45 + row * (isMobile ? 22 : 34)} y={80} width={isMobile ? 18 : 28} height={55} rx="2"
            fill="url(#gwSolarGrad)" opacity={0.6 + Math.sin(animFrame * 0.02 + row * 0.5) * 0.15} />
        ))}
        <circle cx={95 + (isMobile ? 0 : 30)} cy={155} r="5" fill={colors.solar} opacity="0.9" />
        <text x={95 + (isMobile ? 0 : 30)} y={175} fill={colors.solar} fontSize="11" fontWeight="700" textAnchor="middle">
          Solar Farm
        </text>
        <text x={95 + (isMobile ? 0 : 30)} y={188} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          {solarCapacity.toFixed(1)} GW
        </text>

        {/* --- WIND TURBINES (top-right) --- */}
        {[0, 1, 2].map(i => {
          const bx = (isMobile ? 200 : 320) + i * (isMobile ? 40 : 55);
          const by = 90;
          const bladeAngle = animFrame * 2 + i * 120;
          return (
            <g key={`wind-${i}`}>
              {/* Tower */}
              <rect x={bx - 2} y={by} width={4} height={55} fill={colors.wind} opacity="0.6" />
              {/* Hub */}
              <circle cx={bx} cy={by} r="5" fill={colors.wind} filter="url(#gwSoftGlow)" />
              {/* Blades */}
              {[0, 120, 240].map(offset => (
                <line key={`blade-${i}-${offset}`}
                  x1={bx} y1={by}
                  x2={bx + Math.cos((bladeAngle + offset) * Math.PI / 180) * 20}
                  y2={by + Math.sin((bladeAngle + offset) * Math.PI / 180) * 20}
                  stroke={colors.wind} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
              ))}
            </g>
          );
        })}
        <text x={isMobile ? 240 : 375} y={175} fill={colors.wind} fontSize="11" fontWeight="700" textAnchor="middle">
          Wind Array
        </text>
        <text x={isMobile ? 240 : 375} y={188} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Supplemental
        </text>

        {/* --- BATTERY STORAGE (center-left) --- */}
        <rect x={35} y={210} width={isMobile ? 100 : 140} height={80} rx="8" fill="rgba(139,92,246,0.08)" stroke={colors.storage} strokeWidth="1.5" />
        {[0, 1, 2, 3].map(col => (
          <rect key={`bat-${col}`} x={48 + col * (isMobile ? 22 : 30)} y={225} width={isMobile ? 18 : 24} height={40} rx="4"
            fill="url(#gwStorageGrad)" opacity={0.5 + (storageCapacity / 12) * 0.4} />
        ))}
        <circle cx={85 + (isMobile ? 0 : 20)} cy={300} r="5" fill={colors.storage} opacity="0.9" />
        <text x={85 + (isMobile ? 0 : 20)} y={316} fill={colors.storage} fontSize="11" fontWeight="700" textAnchor="middle">
          Storage
        </text>
        <text x={85 + (isMobile ? 0 : 20)} y={329} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          {storageCapacity.toFixed(1)} GWh
        </text>

        {/* --- DATA CENTER (center-right) --- */}
        <rect x={isMobile ? 155 : 220} y={210} width={isMobile ? 100 : 150} height={80} rx="8" fill="rgba(59,130,246,0.08)" stroke={colors.compute} strokeWidth="1.5" />
        {/* Server rack rows */}
        {[0, 1, 2].map(row => (
          <rect key={`rack-${row}`} x={(isMobile ? 165 : 235) + row * (isMobile ? 30 : 44)} y={225} width={isMobile ? 24 : 36} height={50} rx="3"
            fill="url(#gwComputeGrad)" opacity="0.6" />
        ))}
        {/* Blinking status lights */}
        {[0, 1, 2].map(row => (
          <circle key={`light-${row}`} cx={(isMobile ? 177 : 253) + row * (isMobile ? 30 : 44)} cy={232}
            r="3" fill={animFrame % 60 < 30 + row * 5 ? colors.success : colors.compute} />
        ))}
        <circle cx={isMobile ? 205 : 295} cy={300} r="5" fill={colors.compute} opacity="0.9" />
        <text x={isMobile ? 205 : 295} y={316} fill={colors.compute} fontSize="11" fontWeight="700" textAnchor="middle">
          Data Center
        </text>
        <text x={isMobile ? 205 : 295} y={329} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          {dataCenterPower.toFixed(0)}MW | PUE {pue.toFixed(1)}
        </text>

        {/* --- MANUFACTURING FACILITY (bottom) --- */}
        <rect x={isMobile ? 70 : 130} y={350} width={isMobile ? 160 : 220} height={65} rx="8" fill="rgba(16,185,129,0.08)" stroke={colors.mfg} strokeWidth="1.5" />
        {/* Assembly line */}
        <path d={`M ${isMobile ? 85 : 150} 375 L ${isMobile ? 215 : 330} 375`} stroke={colors.mfg} strokeWidth="2" strokeDasharray={`8,${6}`} strokeDashoffset={-flowOffset * 0.5} opacity="0.6" />
        {[0, 1, 2, 3].map(i => (
          <rect key={`mfg-${i}`} x={(isMobile ? 90 : 155) + i * (isMobile ? 32 : 45)} y={365} width={isMobile ? 24 : 35} height={22} rx="3"
            fill="url(#gwMfgGrad)" opacity="0.6" />
        ))}
        <circle cx={isMobile ? 150 : 240} cy={425} r="5" fill={colors.mfg} opacity="0.9" />
        <text x={isMobile ? 150 : 240} y={441} fill={colors.mfg} fontSize="11" fontWeight="700" textAnchor="middle">
          Manufacturing
        </text>
        <text x={isMobile ? 150 : 240} y={454} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          200MW Baseload
        </text>

        {/* --- GRID INTERCONNECT (far right) --- */}
        <rect x={width - 75} y={220} width={50} height={60} rx="6" fill="rgba(249,115,22,0.1)" stroke={colors.accent} strokeWidth="1.5" />
        <text x={width - 50} y={245} fill={colors.accent} fontSize="20" textAnchor="middle">{'\u26A1'}</text>
        <text x={width - 50} y={265} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">Grid</text>
        <text x={width - 50} y={280} fill={colors.textMuted} fontSize="11" textAnchor="middle">500MW</text>

        {/* --- RESOURCE FLOW ARROWS --- */}
        {/* Solar to Storage */}
        <path d={`M ${95 + (isMobile ? 0 : 30)} 190 L ${85 + (isMobile ? 0 : 20)} 210`}
          stroke={colors.solar} strokeWidth="2" fill="none" strokeDasharray="6,4" strokeDashoffset={-flowOffset} opacity="0.7" />

        {/* Solar to Data Center */}
        <path d={`M ${isMobile ? 140 : 200} 130 L ${isMobile ? 175 : 240} 210`}
          stroke={colors.solar} strokeWidth="1.5" fill="none" strokeDasharray="6,4" strokeDashoffset={-flowOffset} opacity="0.5" />

        {/* Storage to Data Center */}
        <path d={`M ${isMobile ? 135 : 175} 250 L ${isMobile ? 155 : 220} 250`}
          stroke={colors.storage} strokeWidth="2" fill="none" strokeDasharray="5,3" strokeDashoffset={-flowOffset} opacity="0.7" />

        {/* Storage to Manufacturing */}
        <path d={`M ${85 + (isMobile ? 0 : 20)} 290 L ${isMobile ? 120 : 180} 350`}
          stroke={colors.storage} strokeWidth="1.5" fill="none" strokeDasharray="5,3" strokeDashoffset={-flowOffset} opacity="0.5" />

        {/* Grid to Data Center */}
        <path d={`M ${width - 75} 250 L ${isMobile ? 255 : 370} 250`}
          stroke={colors.accent} strokeWidth="1.5" fill="none" strokeDasharray="4,4" strokeDashoffset={-flowOffset * 0.7} opacity="0.4" />

        {/* Data Center to Manufacturing (shared cooling) */}
        <path d={`M ${isMobile ? 205 : 295} 290 L ${isMobile ? 180 : 260} 350`}
          stroke={colors.compute} strokeWidth="1" fill="none" strokeDasharray="3,3" strokeDashoffset={-flowOffset * 0.5} opacity="0.3" />

        {/* Animated flow particles */}
        {[0, 1, 2].map(i => {
          const t = ((animFrame * 0.8 + i * 120) % 360) / 360;
          const px = 35 + t * (width - 70);
          const py = 200 + Math.sin(t * Math.PI * 4) * 30;
          return (
            <circle key={`particle-${i}`} cx={px} cy={py} r="2" fill={colors.accent} opacity={0.3 + Math.sin(t * Math.PI) * 0.4} />
          );
        })}

        {/* Tropical indicator */}
        {showTropical && tropicalLocation && (
          <g>
            <rect x={width / 2 - 60} y={46} width="120" height="20" rx="10" fill="rgba(239,68,68,0.2)" stroke={colors.error} strokeWidth="1" />
            <text x={width / 2} y={60} fill={colors.error} fontSize="11" fontWeight="700" textAnchor="middle">TROPICAL SITE</text>
          </g>
        )}

        {/* Budget indicator */}
        <rect x={20} y={height - 30} width={width - 40} height="12" rx="6" fill="rgba(255,255,255,0.05)" />
        <rect x={20} y={height - 30} width={Math.max(0, Math.min(1, totalAllocated / totalBudget)) * (width - 40)} height="12" rx="6"
          fill={budgetRemaining >= 0 ? `url(#gwSolarGrad)` : colors.error} opacity="0.7" />
        <text x={width / 2} y={height - 20} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
          ${totalAllocated.toFixed(1)}B / ${totalBudget}B allocated {budgetRemaining < 0 ? '(OVER BUDGET)' : `($${budgetRemaining.toFixed(1)}B remaining)`}
        </text>

        {/* Power Allocation Chart - mini chart showing budget vs power */}
        {(() => {
          const chartX = width - (isMobile ? 130 : 170);
          const chartW = isMobile ? 110 : 150;
          const chartY = 65;
          const chartH = 200;
          const points = [2, 3.3, 4.6, 5.9, 7.2, 8.5, 9.8, 11.1, 12.4, 13.7, 15, 16.3, 17.6, 18.8, 20].map(b => {
            const sc = Math.min(b * 0.3 / 1.0, 3);
            const dc = Math.min(b * 0.25 / 0.01, 500);
            const pw = dc * 1.1 + 200;
            const gen = sc * 1000 * 0.25;
            const suff = Math.min(95, (gen + Math.min(b * 0.15 / 0.3, 12) * 365) / (pw * 8.76) * 100);
            return { budget: b, power: pw, suff };
          });
          const maxPower = Math.max(...points.map(p => p.power));
          const pathD = points.map((p, i) => {
            const px = chartX + (p.budget - 2) / 18 * chartW;
            const py = chartY + chartH - (p.power / maxPower) * chartH;
            return (i === 0 ? 'M' : 'L') + ' ' + px.toFixed(1) + ' ' + py.toFixed(1);
          }).join(' ');
          const markerX = chartX + (totalBudget - 2) / 18 * chartW;
          const markerPow = campusPowerMW;
          const markerY = chartY + chartH - (markerPow / maxPower) * chartH;
          return (
            <>
              <rect x={chartX - 5} y={chartY - 15} width={chartW + 10} height={chartH + 30} rx='6' fill='rgba(255,255,255,0.03)' stroke={colors.border} strokeWidth='0.5' />
              <text x={chartX + chartW / 2} y={chartY - 4} fill={colors.textMuted} fontSize='11' fontWeight='600' textAnchor='middle'>Power vs Budget</text>
              <text x={chartX + chartW / 2} y={chartY + chartH + 28} fill={colors.textMuted} fontSize='11' textAnchor='middle' opacity='0.6'>Budget</text>
              <text x={chartX + 5} y={chartY + 12} fill={colors.textMuted} fontSize='11' textAnchor='start'>Power (MW)</text>
              <path d={pathD} stroke={colors.accent} strokeWidth='2' fill='none' />
              <circle cx={markerX} cy={markerY} r='8' fill={colors.accent} stroke='#ffffff' strokeWidth='2' filter='url(#gwGlow)' />
            </>
          );
        })()}

                {/* Legend */}
        <g>
          <circle cx={35} cy={height - 5} r="4" fill={colors.solar} />
          <text x={43} y={height - 1} fill={colors.textMuted} fontSize="11">Solar</text>
          <circle cx={90} cy={height - 5} r="4" fill={colors.wind} />
          <text x={98} y={height - 1} fill={colors.textMuted} fontSize="11">Wind</text>
          <circle cx={140} cy={height - 5} r="4" fill={colors.storage} />
          <text x={148} y={height - 1} fill={colors.textMuted} fontSize="11">Storage</text>
          <circle cx={210} cy={height - 5} r="4" fill={colors.compute} />
          <text x={218} y={height - 1} fill={colors.textMuted} fontSize="11">Compute</text>
          <circle cx={290} cy={height - 5} r="4" fill={colors.mfg} />
          <text x={298} y={height - 1} fill={colors.textMuted} fontSize="11">Mfg</text>
        </g>
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
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{26A1}\u{1F3ED}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Gigawatt Blueprint
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"You have been tasked with designing a "}
            <span style={{ color: colors.accent }}>gigawatt-scale integrated campus</span>
            {" combining solar generation, battery storage, a hyperscale data center, and advanced manufacturing. With a limited budget of $2-20 billion, every dollar allocation forces tradeoffs between energy independence, compute capacity, and manufacturing output."}
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
              "The future belongs to integrated campuses where energy generation, storage, computing, and manufacturing share infrastructure. The economics of co-location are transformative — but the systems integration challenge is the hardest engineering problem in industrial development."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - GW-Scale Project Engineer
            </p>
          </div>

          <SitePlanVisualization />
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
              Start Designing
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
      { id: 'a', text: 'Budget allocation does not matter — all subsystems scale equally regardless of spending distribution' },
      { id: 'b', text: 'The data center and manufacturing facility should receive the majority of budget because they generate direct revenue, while energy infrastructure is secondary' },
      { id: 'c', text: 'Solar and storage must be oversized relative to consumption because intermittent generation requires overcapacity and buffering to achieve 95% self-sufficiency', correct: true },
      { id: 'd', text: 'Grid interconnection is unnecessary if on-site solar and storage are large enough' },
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
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              When designing a GW-scale integrated campus with a fixed budget, what is the most important budget allocation principle?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    setPrediction(opt.id);
                    if (onGameEvent) {
                      onGameEvent({
                        eventType: 'prediction_made',
                        gameType: 'gigawatt-blueprint',
                        gameTitle: 'Gigawatt Blueprint',
                        details: { prediction: opt.id },
                        timestamp: Date.now()
                      });
                    }
                  }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
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
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '24px' }}>
              <SitePlanVisualization />
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
                Test Your Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE
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
              Design Your GW-Scale Campus
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Adjust the total budget and observe how subsystem allocations change. Watch the site plan update in real-time. When you increase the budget, more power capacity becomes available because each subsystem allocation scales proportionally. Total campus power is calculated as P = DC_Power × PUE + Manufacturing_Baseload. Self-sufficiency is defined as the ratio of on-site generation to total consumption. Higher budgets result in greater solar overcapacity, which leads to improved energy independence.
            </p>

            {/* Total Budget Slider */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ ...typo.h3, color: colors.accent }}>Total Budget</span>
                <span style={{ ...typo.h2, color: colors.textPrimary }}>${totalBudget}B</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={totalBudget}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTotalBudget(val);
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'slider_changed',
                      gameType: 'gigawatt-blueprint',
                      gameTitle: 'Gigawatt Blueprint',
                      details: { totalBudget: val },
                      timestamp: Date.now()
                    });
                  }
                }}
                style={sliderStyle(colors.accent, totalBudget, 2, 20)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>$2B (Minimal)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>$20B (Maximum)</span>
              </div>
            </div>

            {/* SVG Visualization */}
            <div style={{ marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
              <SitePlanVisualization />
            </div>

            {/* Subsystem Breakdown */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${colors.solar}` }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Solar Farm</div>
                <div style={{ ...typo.h3, color: colors.solar }}>{solarCapacity.toFixed(2)} GW</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>${solarCost.toFixed(1)}B ({((solarCost / totalBudget) * 100).toFixed(0)}% of budget)</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Avg gen: {solarGenerationMW.toFixed(0)} MW</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${colors.storage}` }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Battery Storage</div>
                <div style={{ ...typo.h3, color: colors.storage }}>{storageCapacity.toFixed(1)} GWh</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>${storageCost.toFixed(1)}B ({((storageCost / totalBudget) * 100).toFixed(0)}% of budget)</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Duration: {(storageCapacity * 1000 / Math.max(1, campusPowerMW)).toFixed(1)} hrs</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${colors.compute}` }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Data Center</div>
                <div style={{ ...typo.h3, color: colors.compute }}>{dataCenterPower.toFixed(0)} MW IT</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>${dcCost.toFixed(1)}B ({((dcCost / totalBudget) * 100).toFixed(0)}% of budget)</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Effective: {effectiveCompute.toFixed(0)} MW (PUE {coolingOverhead})</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${colors.mfg}` }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Manufacturing</div>
                <div style={{ ...typo.h3, color: colors.mfg }}>200 MW Baseload</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>${mfgFacilityCost.toFixed(1)}B (fixed baseline)</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>+ Grid: ${gridInterconnectCost}B</div>
              </div>
            </div>

            {/* Summary metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Self-Sufficiency</div>
                <div style={{ ...typo.h3, color: selfSufficiency > 80 ? colors.success : selfSufficiency > 50 ? colors.warning : colors.error }}>
                  {selfSufficiency.toFixed(0)}%
                </div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Campus Power</div>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>{campusPowerMW.toFixed(0)} MW</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Budget Status</div>
                <div style={{ ...typo.h3, color: budgetRemaining >= 0 ? colors.success : colors.error }}>
                  {budgetRemaining >= 0 ? `$${budgetRemaining.toFixed(1)}B left` : `$${Math.abs(budgetRemaining).toFixed(1)}B over`}
                </div>
              </div>
            </div>

            {/* Insight callout */}
            {budgetRemaining < 0 && (
              <div style={{
                background: `${colors.error}15`,
                border: `1px solid ${colors.error}44`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.body, color: colors.error, fontWeight: 600, margin: 0 }}>
                  Over budget! In reality, this would require phased construction, debt financing, or scope reduction. Try reducing the total budget to see how tradeoffs emerge.
                </p>
              </div>
            )}

            {totalBudget <= 5 && (
              <div style={{
                background: `${colors.warning}15`,
                border: `1px solid ${colors.warning}44`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.body, color: colors.warning, fontWeight: 600, margin: 0 }}>
                  At ${totalBudget}B, the campus is severely constrained. The fixed costs of manufacturing ($2B) and grid interconnection ($0.5B) consume most of the budget, leaving little for solar, storage, or compute.
                </p>
              </div>
            )}
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
              Understand the Tradeoffs
            </button>
          </div>
          {renderNavDots()}
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              Understanding Integrated Campus Economics: As You Observed
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Overcapacity Imperative</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  As you predicted and observed in the experiment, solar panels only generate during daylight hours with a typical capacity factor of 20-30%. A campus consuming power 24/7 must oversize solar capacity by 3-5x peak demand and pair it with storage to bridge overnight and cloudy periods. At ${totalBudget}B, your campus allocates {((solarCost / totalBudget) * 100).toFixed(0)}% to solar and {((storageCost / totalBudget) * 100).toFixed(0)}% to storage — the key question is whether this ratio achieves reliable power delivery.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Fixed vs Variable Costs</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Manufacturing ($2B) and grid interconnection ($0.5B) are largely fixed costs — they do not scale with budget. This creates a "budget floor" of $2.5B before any solar, storage, or compute can be funded. At low budgets ($2-5B), these fixed costs dominate, leaving minimal capacity for the energy and compute systems that make the campus viable. This is why GW-scale projects require $10B+ budgets.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Co-location Advantage</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Integrating solar, storage, data centers, and manufacturing on a single campus reduces total infrastructure cost by 20-30% versus building separate facilities. Shared grid interconnections, common cooling systems, waste heat recovery between data centers and manufacturing processes, and unified power management all contribute to this efficiency gain.
                </p>
              </div>
            </div>

            {/* Current configuration summary */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Your Current Design (${totalBudget}B)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Solar: {solarCapacity.toFixed(1)} GW ({solarGenerationMW.toFixed(0)} MW avg)</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Storage: {storageCapacity.toFixed(1)} GWh</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Data Center: {dataCenterPower.toFixed(0)} MW IT</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Manufacturing: 200 MW</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Self-sufficiency: {selfSufficiency.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: budgetRemaining >= 0 ? colors.success : colors.error }}>
                  Budget: {budgetRemaining >= 0 ? `$${budgetRemaining.toFixed(1)}B remaining` : `$${Math.abs(budgetRemaining).toFixed(1)}B over`}
                </div>
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
              Explore the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'a', text: 'Tropical location has no significant impact on campus design or economics' },
      { id: 'b', text: 'Higher solar irradiance in the tropics fully compensates for all increased costs, making the project cheaper overall' },
      { id: 'c', text: 'Cooling costs increase dramatically (PUE 1.1 to 1.4), partially offset by better solar, but net campus power demand rises 15-25% and grid reliability concerns add backup costs', correct: true },
      { id: 'd', text: 'The only impact is that employees prefer tropical weather, improving retention' },
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
              background: `${colors.error}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.error}44`,
            }}>
              <p style={{ ...typo.small, color: colors.error, margin: 0, fontWeight: 700 }}>
                TWIST: Location Change!
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 0' }}>
                The project site has been relocated from a temperate US location to a tropical developing nation. Solar irradiance improves, but average temperature rises from 18C to 32C with 85% humidity. The local grid has 50+ hours of unplanned outages annually.
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              How will relocating to a tropical developing nation affect your campus design?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {twistOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    setTwistPrediction(opt.id);
                    if (onGameEvent) {
                      onGameEvent({
                        eventType: 'prediction_made',
                        gameType: 'gigawatt-blueprint',
                        gameTitle: 'Gigawatt Blueprint',
                        details: { twistPrediction: opt.id, phase: 'twist_predict' },
                        timestamp: Date.now()
                      });
                    }
                  }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.error}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.error : colors.border}`,
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
                    background: twistPrediction === opt.id ? colors.error : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '24px' }}>
              <SitePlanVisualization />
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
                See the Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const tropicalPUE = 1.4;
    const temperatePUE = 1.1;
    const tropicalEffective = dataCenterPower / tropicalPUE;
    const temperateEffective = dataCenterPower / temperatePUE;
    const tropicalCampusPower = dataCenterPower * tropicalPUE + 200;
    const temperateCampusPower = dataCenterPower * temperatePUE + 200;
    const additionalCoolingMW = dataCenterPower * (tropicalPUE - temperatePUE);
    const additionalCoolingCost = additionalCoolingMW * 0.01; // rough $B

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
              Tropical Location Impact
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Toggle the tropical location to see how cooling, grid reliability, and solar output change your campus design.
            </p>

            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The campus site plan dynamically recalculates all power flows and subsystem allocations when you toggle between temperate and tropical locations, revealing how PUE changes cascade through the entire energy system.</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you switch to a tropical site, the higher PUE (1.4 vs 1.1) increases cooling overhead by 30%, which raises total campus power demand and reduces effective compute capacity -- requiring more solar and storage to maintain self-sufficiency.</p>
            </div>

            {/* Tropical toggle */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${tropicalLocation ? colors.error : colors.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ ...typo.h3, color: tropicalLocation ? colors.error : colors.textPrimary }}>
                  {tropicalLocation ? 'Tropical Developing Nation (32C, 85% humidity)' : 'Temperate US Location (18C)'}
                </span>
                <button
                  onClick={() => {
                    setTropicalLocation(!tropicalLocation);
                    playSound('click');
                    if (onGameEvent) {
                      onGameEvent({
                        eventType: 'value_changed',
                        gameType: 'gigawatt-blueprint',
                        gameTitle: 'Gigawatt Blueprint',
                        details: { tropicalLocation: !tropicalLocation },
                        timestamp: Date.now()
                      });
                    }
                  }}
                  style={{
                    background: tropicalLocation ? colors.error : colors.border,
                    border: 'none',
                    borderRadius: '20px',
                    width: '56px',
                    height: '28px',
                    cursor: 'pointer',
                    position: 'relative' as const,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute' as const,
                    top: '3px',
                    left: tropicalLocation ? '31px' : '3px',
                    transition: 'left 0.3s ease',
                  }} />
                </button>
              </div>

              {/* Budget slider stays available */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.accent }}>Total Budget</span>
                  <span style={{ ...typo.h3, color: colors.textPrimary }}>${totalBudget}B</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={20}
                  step={0.5}
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(parseFloat(e.target.value))}
                  style={sliderStyle(colors.accent, totalBudget, 2, 20)}
                />
              </div>
            </div>

            {/* SVG with tropical flag */}
            <div style={{ marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
              <SitePlanVisualization showTropical={true} />
            </div>

            {/* Side-by-side comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Temperate (US)</div>
                <div style={{ ...typo.h3, color: colors.compute }}>PUE 1.1</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>
                  Campus: {temperateCampusPower.toFixed(0)}MW | Eff Compute: {temperateEffective.toFixed(0)}MW
                </div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Tropical (Developing)</div>
                <div style={{ ...typo.h3, color: colors.error }}>PUE 1.4</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>
                  Campus: {tropicalCampusPower.toFixed(0)}MW | Eff Compute: {tropicalEffective.toFixed(0)}MW
                </div>
              </div>
            </div>

            {/* Impact details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ background: `${colors.error}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}33` }}>
                <div style={{ ...typo.small, color: colors.error, fontWeight: 700, marginBottom: '4px' }}>Additional Cooling</div>
                <div style={{ ...typo.h3, color: colors.error }}>+{additionalCoolingMW.toFixed(0)} MW</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>+${additionalCoolingCost.toFixed(1)}B cost</div>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}33` }}>
                <div style={{ ...typo.small, color: colors.success, fontWeight: 700, marginBottom: '4px' }}>Better Solar</div>
                <div style={{ ...typo.h3, color: colors.success }}>+15-25%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Higher irradiance</div>
              </div>
              <div style={{ background: `${colors.warning}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.warning}33` }}>
                <div style={{ ...typo.small, color: colors.warning, fontWeight: 700, marginBottom: '4px' }}>Grid Risk</div>
                <div style={{ ...typo.h3, color: colors.warning }}>50+ hrs/yr</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Unplanned outages</div>
              </div>
            </div>

            {/* Warning */}
            {tropicalLocation && (
              <div style={{
                background: `${colors.error}15`,
                border: `1px solid ${colors.error}44`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.error, fontWeight: 700, margin: 0 }}>
                  Tropical relocation increases total campus power by {(tropicalCampusPower - temperateCampusPower).toFixed(0)}MW ({((tropicalCampusPower / temperateCampusPower - 1) * 100).toFixed(0)}% increase).
                  Effective compute drops from {temperateEffective.toFixed(0)}MW to {tropicalEffective.toFixed(0)}MW due to cooling overhead.
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Unreliable grid (50+ outage hours/year) requires oversized on-site storage and backup generation, adding $0.5-1B to project cost.
                </p>
              </div>
            )}
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
              Understand Location Impact
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              Climate and Infrastructure: The Hidden Variables
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The PUE Multiplier Effect</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Moving from PUE 1.1 to 1.4 does not just add 30% more cooling power — it cascades through the entire system. The additional {(dataCenterPower * 0.3).toFixed(0)}MW of cooling requires more solar capacity, more storage, a larger grid interconnection, and more land. For a 300MW data center, this PUE shift adds approximately $1.5B in total system cost when you account for all downstream effects. This is why Google, Microsoft, and Meta all prioritize cool-climate locations for their largest data centers.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Grid Reliability as a Design Variable</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  In temperate US locations, grid reliability is typically 99.97%+ (less than 3 hours of outages per year). In many developing nations, 50-200 hours of annual outages are common. For a data center requiring 99.999% uptime, this means the on-site storage and backup generation system must be dramatically oversized — not just for solar intermittency, but for grid failure events that can last hours or days. This alone can add $0.5-1B to campus cost.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Offsetting Advantages of Tropical Sites</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Tropical locations near the equator receive 15-25% more annual solar irradiance than temperate sites, improving the economics of solar generation. Additionally, developing nations often offer generous incentives: free land, tax holidays, subsidized power during construction, and expedited permitting. Labor costs can be 40-60% lower. The question for each project is whether these advantages outweigh the cooling, reliability, and regulatory risks.
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Blueprint Connection:</p>
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
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app, or to test phase if all done
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > idx);
                      const anyUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1 && anyUncompleted === -1) {
                        // All apps completed
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
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed
                  ? 'You understand integrated GW-scale campus design, systems integration, site selection, and multi-objective optimization!'
                  : 'Review the concepts around energy integration, cooling, budget allocation, and site selection, then try again.'}
              </p>

              {/* Show answers review */}
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const isCorrect = testAnswers[i] === correctId;
                  return (
                    <div key={i} style={{
                      background: colors.bgCard,
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '8px',
                      borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`,
                    }}>
                      <div style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, fontWeight: 600 }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                      {!isCorrect && (
                        <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
              Knowledge Test: Gigawatt Blueprint
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of integrated energy systems, site selection, capital budgeting, and multi-objective optimization to real-world GW-scale campus design scenarios.
            </p>

            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'game_completed',
                      gameType: 'gigawatt-blueprint',
                      gameTitle: 'Gigawatt Blueprint',
                      details: { testScore: score, totalQuestions: 10 },
                      timestamp: Date.now()
                    });
                  }
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
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Gigawatt Blueprint Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You have mastered the principles of integrated GW-scale campus design. You understand how solar, storage, compute, and manufacturing interact as a system, how budget constraints force tradeoffs, and how location and climate fundamentally reshape project economics.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Solar overcapacity and storage duration must be co-optimized to achieve 24/7 campus self-sufficiency',
                'Fixed infrastructure costs (manufacturing, grid interconnection) create a budget floor that constrains all other allocations',
                'PUE differences between climates cascade through the entire system, multiplying cooling costs into solar, storage, and grid requirements',
                'Phased construction with revenue-first sequencing (data center before manufacturing) reduces peak capital needs and enables course correction',
                'Site selection integrates grid reliability, climate, regulatory stability, incentives, and supply chain proximity into a multi-objective optimization problem',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: colors.success, marginTop: '2px' }}>{'\u2713'}</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Final campus visualization */}
          <div style={{ marginBottom: '32px', width: '100%', maxWidth: '560px' }}>
            <SitePlanVisualization />
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

export default ELON_GigawattBlueprintRenderer;