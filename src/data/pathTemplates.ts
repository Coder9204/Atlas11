// Pre-built learning pathway templates organized by topic and difficulty level.
// Slugs match the router convention: PascalCase component names converted via
//   name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')

export interface PathTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  gameSequence: string[]; // ordered slugs
  estimatedHours: number;
}

export const pathTemplates: PathTemplate[] = [
  // ── MECHANICS ──────────────────────────────────────────────
  {
    id: 'mechanics-fundamentals',
    title: 'Mechanics Fundamentals',
    description:
      'Build a solid foundation in classical mechanics — from inertia and Newton\'s laws through energy conservation and circular motion.',
    category: 'mechanics',
    difficulty: 'beginner',
    gameSequence: [
      'inertia',
      'newtons-third-law',
      'inclined-plane',
      'center-of-mass',
      'projectile-independence',
      'energy-conservation',
      'work-power',
      'elastic-potential-energy',
      'hookes-law',
      'centripetal-force',
    ],
    estimatedHours: 0.83,
  },
  {
    id: 'forces-friction-deep-dive',
    title: 'Forces & Friction Deep Dive',
    description:
      'Explore friction, drag, torque, and momentum transfer through collisions and real-world scenarios.',
    category: 'mechanics',
    difficulty: 'intermediate',
    gameSequence: [
      'static-kinetic-friction',
      'drag-force',
      'torque',
      'rolling-vs-sliding',
      'stick-slip',
      'momentum-conservation',
      'two-ball-collision',
      'inelastic-collisions',
    ],
    estimatedHours: 1.07,
  },
  {
    id: 'rotational-mechanics',
    title: 'Rotational Mechanics',
    description:
      'Master angular momentum, moment of inertia, gyroscopic effects, and exotic rotational phenomena like the rattleback.',
    category: 'mechanics',
    difficulty: 'advanced',
    gameSequence: [
      'angular-momentum',
      'angular-momentum-transfer',
      'moment-of-inertia',
      'gyroscope-stability',
      'gyroscopic-precession',
      'precession-nutation',
      'sleeping-top',
      'rattleback',
    ],
    estimatedHours: 1.6,
  },

  // ── OSCILLATIONS & WAVES ───────────────────────────────────
  {
    id: 'intro-to-waves',
    title: 'Intro to Waves',
    description:
      'Discover how waves travel, reflect, refract, and produce sound — from tension waves to lenses and echoes.',
    category: 'waves',
    difficulty: 'beginner',
    gameSequence: [
      'wave-speed-tension',
      'reflection',
      'law-of-reflection',
      'refraction',
      'snells-law',
      'dispersion',
      'beats',
      'speed-of-sound',
      'echo-time-of-flight',
      'camera-obscura',
      'lens-focusing',
    ],
    estimatedHours: 0.92,
  },
  {
    id: 'wave-phenomena',
    title: 'Wave Phenomena',
    description:
      'Investigate interference, standing waves, diffraction, the Doppler effect, resonance, and polarization.',
    category: 'waves',
    difficulty: 'intermediate',
    gameSequence: [
      'wave-interference',
      'standing-waves',
      'diffraction',
      'sound-interference',
      'doppler-effect',
      'resonance',
      'polarization',
      'thin-film-interference',
      'chladni-patterns',
    ],
    estimatedHours: 1.2,
  },
  {
    id: 'advanced-optics',
    title: 'Advanced Optics',
    description:
      'Tackle Brewster\'s angle, total internal reflection, wave-particle duality, laser speckle, Fresnel zones, and photoelasticity.',
    category: 'waves',
    difficulty: 'advanced',
    gameSequence: [
      'brewster-angle',
      'total-internal-reflection',
      'wave-particle-duality',
      'laser-speckle',
      'fresnel-zones',
      'photoelasticity',
      'chromatic-aberration',
    ],
    estimatedHours: 1.4,
  },

  // ── THERMODYNAMICS ─────────────────────────────────────────
  {
    id: 'heat-temperature-basics',
    title: 'Heat & Temperature Basics',
    description:
      'Learn how heat moves and materials respond — thermal contact, expansion, convection, gas laws, and chemical heat packs.',
    category: 'thermodynamics',
    difficulty: 'beginner',
    gameSequence: [
      'thermal-contact',
      'thermal-expansion',
      'convection',
      'evaporative-cooling',
      'gas-laws',
      'bimetal-thermostat',
      'endothermic-exothermic',
      'hand-warmer',
    ],
    estimatedHours: 0.67,
  },
  {
    id: 'thermodynamics-in-depth',
    title: 'Thermodynamics in Depth',
    description:
      'Dive into Newton\'s cooling law, phase changes, latent heat, the Leidenfrost effect, and adiabatic processes.',
    category: 'thermodynamics',
    difficulty: 'intermediate',
    gameSequence: [
      'newton-cooling',
      'convection-currents',
      'phase-change-energy',
      'latent-heat',
      'kinetic-theory-gases',
      'boiling-pressure',
      'leidenfrost',
      'adiabatic-heating',
      'heat-transfer-capacity',
    ],
    estimatedHours: 1.2,
  },
  {
    id: 'thermodynamics-mastery',
    title: 'Thermodynamics Mastery',
    description:
      'Conquer the Carnot cycle, entropy, and the Arrhenius equation — the pillars of advanced thermodynamics.',
    category: 'thermodynamics',
    difficulty: 'advanced',
    gameSequence: [
      'carnot-cycle',
      'entropy',
      'arrhenius',
    ],
    estimatedHours: 0.6,
  },

  // ── ELECTROMAGNETISM ───────────────────────────────────────
  {
    id: 'electricity-basics',
    title: 'Electricity Basics',
    description:
      'Start with static charge, Coulomb\'s law, simple circuits, magnetic fields, and the Oersted experiment.',
    category: 'electromagnetism',
    difficulty: 'beginner',
    gameSequence: [
      'static-electricity',
      'coulombs-law',
      'circuits',
      'magnetic-field',
      'electromagnet',
      'homopolar-motor',
      'oersted-experiment',
    ],
    estimatedHours: 0.58,
  },
  {
    id: 'circuits-and-fields',
    title: 'Circuits & Fields',
    description:
      'Map electric fields and potentials, apply Kirchhoff\'s laws, and explore induction, eddy currents, and Faraday cages.',
    category: 'electromagnetism',
    difficulty: 'intermediate',
    gameSequence: [
      'electric-field',
      'electric-field-mapping',
      'electric-potential',
      'magnetic-mapping',
      'kirchhoffs-laws',
      'r-c-time-constant',
      'electromagnetic-induction',
      'eddy-currents',
      'faraday-cage',
    ],
    estimatedHours: 1.2,
  },
  {
    id: 'advanced-em',
    title: 'Advanced E&M',
    description:
      'Explore LC resonance, transformers, DC motors, wireless charging, and inductive kickback.',
    category: 'electromagnetism',
    difficulty: 'advanced',
    gameSequence: [
      'l-c-resonance',
      'transformer',
      'classic-d-c-motor',
      'wireless-charging',
      'inductive-kickback',
    ],
    estimatedHours: 1.0,
  },

  // ── FLUIDS ─────────────────────────────────────────────────
  {
    id: 'fluid-fundamentals',
    title: 'Fluid Fundamentals',
    description:
      'Understand buoyancy, Pascal\'s law, hydrostatic pressure, capillary action, siphons, and surface tension tricks.',
    category: 'fluids',
    difficulty: 'beginner',
    gameSequence: [
      'buoyancy',
      'pascal-law',
      'hydrostatic-pressure',
      'capillary-action',
      'siphon',
      'soap-boat',
      'jar-lid-expansion',
    ],
    estimatedHours: 0.58,
  },
  {
    id: 'flow-and-viscosity',
    title: 'Flow & Viscosity',
    description:
      'From Bernoulli\'s principle to turbulent flow, lift forces, the Magnus effect, water hammer, and terminal velocity.',
    category: 'fluids',
    difficulty: 'intermediate',
    gameSequence: [
      'bernoulli',
      'venturi-effect',
      'laminar-turbulent',
      'laminar-flow',
      'viscosity-temperature',
      'lift-force',
      'magnus-effect',
      'pressure-drop',
      'hydraulic-jump',
      'terminal-velocity',
      'water-hammer',
    ],
    estimatedHours: 1.47,
  },
  {
    id: 'advanced-fluid-dynamics',
    title: 'Advanced Fluid Dynamics',
    description:
      'Study cavitation, Marangoni tears, Karman vortex streets, and droplet breakup mechanics.',
    category: 'fluids',
    difficulty: 'advanced',
    gameSequence: [
      'cavitation',
      'marangoni-tears',
      'karman-vortex',
      'droplet-breakup',
    ],
    estimatedHours: 0.8,
  },

  // ── SEMICONDUCTOR ──────────────────────────────────────────
  {
    id: 'semiconductor-basics',
    title: 'Semiconductor Basics',
    description:
      'Walk through the core fab processes: photolithography, doping, etching, ion implantation, deposition, and yield.',
    category: 'semiconductor',
    difficulty: 'intermediate',
    gameSequence: [
      'photolithography',
      'doping-diffusion',
      'etch-anisotropy',
      'ion-implantation',
      'deposition-types',
      'cleanroom-yield',
      'process-variation',
    ],
    estimatedHours: 0.93,
  },
  {
    id: 'chip-interconnects',
    title: 'Chip Interconnects',
    description:
      'Master RC delay, decoupling capacitors, leakage, EMI shielding, ESD protection, and overlay errors.',
    category: 'semiconductor',
    difficulty: 'intermediate',
    gameSequence: [
      'r-c-delay',
      'r-c-delay-interconnect',
      'decoupling-capacitor',
      'leakage-current',
      'leakage-power',
      'e-m-i-shielding',
      'e-s-d-protection',
      'overlay-error',
    ],
    estimatedHours: 1.07,
  },
  {
    id: 'advanced-semiconductor',
    title: 'Advanced Semiconductor',
    description:
      'Tackle CMP, lithography focus-dose, clock distribution, electromigration, metastability, chiplet architecture, and more.',
    category: 'semiconductor',
    difficulty: 'advanced',
    gameSequence: [
      'c-m-p-planarization',
      'litho-focus-dose',
      'clock-distribution',
      'clock-jitter',
      'electromigration',
      'ground-bounce',
      'metastability',
      'flip-chip-wirebond',
      'interconnect-topology',
      's-r-a-m-yield-redundancy',
      'chiplet-architecture',
      'design-to-fab-translation',
    ],
    estimatedHours: 2.4,
  },

  // ── COMPUTING ──────────────────────────────────────────────
  {
    id: 'computing-hardware-basics',
    title: 'Computing Hardware Basics',
    description:
      'Explore the memory hierarchy, DRAM refresh, ECC, PCIe bandwidth, GPU power states, DVFS, and data-movement energy.',
    category: 'computing',
    difficulty: 'intermediate',
    gameSequence: [
      'memory-hierarchy',
      'd-r-a-m-refresh',
      'e-c-c-memory',
      'p-c-ie-bandwidth',
      'g-p-u-power-states',
      'g-p-u-memory-bandwidth',
      'd-v-f-s',
      'network-latency',
      'data-movement-energy',
    ],
    estimatedHours: 1.2,
  },
  {
    id: 'ai-ml-hardware',
    title: 'AI & ML Hardware',
    description:
      'Understand tensor cores, systolic arrays, GPU occupancy, inference latency, KV caches, batching, quantization, and sparsity.',
    category: 'computing',
    difficulty: 'advanced',
    gameSequence: [
      'tensor-core',
      'systolic-array',
      'g-p-u-occupancy',
      'a-i-inference-latency',
      'energy-per-token',
      'k-v-cache',
      'batching-latency',
      'attention-memory',
      'attention-loves-bandwidth',
      'sparsity',
      'quantization-precision',
    ],
    estimatedHours: 2.2,
  },
  {
    id: 'ai-prompting-techniques',
    title: 'AI Prompting Techniques',
    description:
      'Learn structured prompting strategies: spec-first, test-first, tool-aware, model-as-reviewer, and safety techniques.',
    category: 'computing',
    difficulty: 'intermediate',
    gameSequence: [
      'ask-for-assumptions',
      'spec-first-prompting',
      'test-first-prompting',
      'tool-aware-prompting',
      'model-as-reviewer',
      'prompt-injection-safety',
      'verification-harness',
      'patch-discipline',
    ],
    estimatedHours: 1.07,
  },
  {
    id: 'compute-architectures',
    title: 'Compute Architectures',
    description:
      'Compare TPUs vs GPUs, ASICs vs GPUs, and see how manufacturing constraints shape architecture choices.',
    category: 'computing',
    difficulty: 'intermediate',
    gameSequence: [
      't-p-uvs-g-p-u',
      'a-s-i-cvs-g-p-u',
      'manufacturing-drives-architecture',
    ],
    estimatedHours: 0.4,
  },

  // ── SOLAR ──────────────────────────────────────────────────
  {
    id: 'solar-cell-fundamentals',
    title: 'Solar Cell Fundamentals',
    description:
      'Learn PV I-V curves, bypass diodes, series-parallel configurations, temperature coefficients, and bifacial design.',
    category: 'solar',
    difficulty: 'intermediate',
    gameSequence: [
      'p-v-i-v-curve',
      'bypass-diodes',
      'series-parallel-p-v',
      'cell-to-module-losses',
      'solar-temp-coefficient',
      'solar-thermal-derating',
      'bifacial-albedo',
      'spectral-mismatch',
    ],
    estimatedHours: 1.07,
  },
  {
    id: 'solar-manufacturing',
    title: 'Solar Manufacturing',
    description:
      'Explore silicon texturing, screen-printing metallization, lithography comparison, purity requirements, and UV encapsulation.',
    category: 'solar',
    difficulty: 'intermediate',
    gameSequence: [
      'silicon-texturing',
      'screen-printing-metallization',
      'texturing-vs-lithography',
      'solar-vs-i-c-purity',
      'encapsulation-u-v-aging',
    ],
    estimatedHours: 0.67,
  },
  {
    id: 'solar-system-design',
    title: 'Solar System Design',
    description:
      'Design real solar systems with MPPT, string sizing, yield prediction, hotspot analysis, and passivation.',
    category: 'solar',
    difficulty: 'intermediate',
    gameSequence: [
      'm-p-p-t',
      'string-sizing',
      'solar-yield-prediction',
      'hotspots',
      'shunt-series-defects',
      'passivation-recombination',
    ],
    estimatedHours: 0.8,
  },

  // ── ENGINEERING ────────────────────────────────────────────
  {
    id: 'sound-and-acoustics',
    title: 'Sound & Acoustics',
    description:
      'Build microphones, make straw instruments, learn speaker principles, and test your reaction time.',
    category: 'engineering',
    difficulty: 'beginner',
    gameSequence: [
      'microphone',
      'make-microphone',
      'straw-instrument',
      'speaker-principle',
      'reaction-time',
    ],
    estimatedHours: 0.42,
  },
  {
    id: 'power-systems',
    title: 'Power Systems',
    description:
      'Understand DC-DC converters, inverters, power loss, power factor, grid frequency, ground faults, and battery resistance.',
    category: 'engineering',
    difficulty: 'intermediate',
    gameSequence: [
      'd-c-d-c-converter',
      'inverter-sine-wave',
      'power-loss',
      'power-factor',
      'grid-frequency',
      'ground-fault',
      'cable-sizing',
      'battery-internal-resistance',
    ],
    estimatedHours: 1.07,
  },
  {
    id: 'thermal-engineering',
    title: 'Thermal Engineering',
    description:
      'Design cooling systems: liquid cooling, server airflow, thermal throttling, heat sinks, chillers, and fan laws.',
    category: 'engineering',
    difficulty: 'intermediate',
    gameSequence: [
      'liquid-cooling',
      'server-airflow',
      'thermal-throttling',
      'heat-sink-thermal',
      'chiller-c-o-p',
      'fan-laws',
      'p-u-e-calculator',
    ],
    estimatedHours: 0.93,
  },
  {
    id: 'rf-and-communications',
    title: 'RF & Communications',
    description:
      'Explore antenna gain and polarization, direction finding, link budgets, fiber loss, noise margins, and crosstalk.',
    category: 'engineering',
    difficulty: 'intermediate',
    gameSequence: [
      'antenna-gain',
      'antenna-polarization',
      'direction-finding',
      'link-budget',
      'fiber-signal-loss',
      'noise-margin',
      'transmission-line',
      'crosstalk',
    ],
    estimatedHours: 1.07,
  },

  // ── ELON ───────────────────────────────────────────────────
  {
    id: 'elon-energy-systems',
    title: 'ELON: Energy Systems',
    description:
      'Pick power plants, balance grids, deploy solar at scale, size batteries, and design facility cooling strategies.',
    category: 'elon',
    difficulty: 'intermediate',
    gameSequence: [
      'e-l-o-n_-power-plant-picker',
      'e-l-o-n_-grid-balance',
      'e-l-o-n_-solar-deployment',
      'e-l-o-n_-solar-manufacturing',
      'e-l-o-n_-battery-system',
      'e-l-o-n_-facility-power',
      'e-l-o-n_-cooling-strategy',
    ],
    estimatedHours: 0.93,
  },
  {
    id: 'elon-space-and-manufacturing',
    title: 'ELON: Space & Manufacturing',
    description:
      'Design orbits, plan space communications and radiators, select rocket materials, and manage TPS turnaround.',
    category: 'elon',
    difficulty: 'intermediate',
    gameSequence: [
      'e-l-o-n_-orbit-designer',
      'e-l-o-n_-space-comms',
      'e-l-o-n_-space-radiator',
      'e-l-o-n_-rocket-materials',
      'e-l-o-n_-t-p-s-turnaround',
      'e-l-o-n_-actuator-limits',
    ],
    estimatedHours: 0.8,
  },
  {
    id: 'elon-advanced-systems',
    title: 'ELON: Advanced Systems',
    description:
      'Tackle constraint cascades, interconnect queues, uptime architecture, mining bottlenecks, fab yields, and orbital factories.',
    category: 'elon',
    difficulty: 'advanced',
    gameSequence: [
      'e-l-o-n_-constraint-cascade',
      'e-l-o-n_-interconnect-queue',
      'e-l-o-n_-uptime-architect',
      'e-l-o-n_-mining-bottleneck',
      'e-l-o-n_-fab-yield-curve',
      'e-l-o-n_-packaging-limit',
      'e-l-o-n_-cluster-comms',
      'e-l-o-n_-radiation-armor',
      'e-l-o-n_-orbital-factory',
      'e-l-o-n_-capital-stack',
      'e-l-o-n_-gigawatt-blueprint',
    ],
    estimatedHours: 2.2,
  },

  // ── FUN EXPERIMENTS ────────────────────────────────────────
  {
    id: 'fun-experiments',
    title: 'Fun Experiments',
    description:
      'Hands-on demos and cool phenomena: bottle tornados, Cartesian divers, floating paperclips, chain fountains, and more.',
    category: 'mechanics',
    difficulty: 'beginner',
    gameSequence: [
      'bottle-tornado',
      'cartesian-diver',
      'floating-paperclip',
      'helium-balloon-car',
      'egg-drop',
      'rolling-race',
      'swing-pumping',
      'tipping-point',
      'cloud-in-bottle',
      'chain-fountain',
    ],
    estimatedHours: 0.83,
  },
];

// ── Helper functions ─────────────────────────────────────────

/** Look up a single path template by its unique id. */
export function getPathTemplate(id: string): PathTemplate | undefined {
  return pathTemplates.find((t) => t.id === id);
}

/** Return all path templates that belong to a given category. */
export function getPathsByCategory(category: string): PathTemplate[] {
  return pathTemplates.filter((t) => t.category === category);
}

export default pathTemplates;
