/**
 * Per-Game SEO Metadata
 *
 * Provides title, description, and concept tags for each game.
 * Used by GameShell to set page meta tags and JSON-LD structured data.
 *
 * Games not in this map get auto-generated metadata from their slug.
 */

export interface GameSEOEntry {
  title: string;
  description: string;
  concepts?: string[];
  difficulty?: string;
  estimatedMinutes?: number;
}

export const gameSEOData: Record<string, GameSEOEntry> = {
  // === Classical Mechanics ===
  'newtons-third-law': {
    title: "Newton's Third Law",
    description: 'Explore action-reaction force pairs through interactive collisions. See why equal forces create unequal accelerations.',
    concepts: ['action-reaction pairs', 'force', 'acceleration', 'mass'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
  },
  'drag-force': {
    title: 'Drag Force',
    description: 'Understand how air resistance affects motion at different speeds. Explore the quadratic relationship between velocity and drag.',
    concepts: ['air resistance', 'drag coefficient', 'terminal velocity', 'fluid dynamics'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'centripetal-force': {
    title: 'Centripetal Force',
    description: 'Discover the force that keeps objects moving in circles. Adjust radius, mass, and speed to see how centripetal force changes.',
    concepts: ['circular motion', 'centripetal acceleration', 'angular velocity'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
  },
  'torque': {
    title: 'Torque',
    description: 'Learn about rotational force and mechanical advantage. Balance torques on a beam and explore lever arms.',
    concepts: ['torque', 'lever arm', 'rotational equilibrium', 'mechanical advantage'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
  },
  'hookes-law': {
    title: "Hooke's Law",
    description: 'Explore spring forces and elastic behavior. Measure spring constants and discover the limits of linear elasticity.',
    concepts: ['spring constant', 'elastic deformation', 'restoring force'],
    difficulty: 'beginner',
    estimatedMinutes: 7,
  },
  'momentum-conservation': {
    title: 'Momentum Conservation',
    description: 'See how momentum transfers between objects in collisions. Verify that total momentum is conserved in every interaction.',
    concepts: ['linear momentum', 'impulse', 'conservation laws', 'collisions'],
    difficulty: 'beginner',
    estimatedMinutes: 10,
  },
  'energy-conservation': {
    title: 'Energy Conservation',
    description: 'Track energy transformations between kinetic, potential, and thermal forms in dynamic systems.',
    concepts: ['kinetic energy', 'potential energy', 'work-energy theorem', 'conservation of energy'],
    difficulty: 'beginner',
    estimatedMinutes: 10,
  },
  'angular-momentum': {
    title: 'Angular Momentum',
    description: 'Explore conservation of angular momentum. Watch ice skaters spin faster as they pull in their arms.',
    concepts: ['angular momentum', 'moment of inertia', 'angular velocity', 'conservation'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'projectile-independence': {
    title: 'Projectile Independence',
    description: 'Discover that horizontal and vertical motion are independent. Drop and launch objects simultaneously to see the proof.',
    concepts: ['projectile motion', 'independence of motion', 'free fall', 'kinematics'],
    difficulty: 'beginner',
    estimatedMinutes: 7,
  },

  // === Oscillations & Waves ===
  'pendulum-period': {
    title: 'Pendulum Period',
    description: 'Explore what affects the period of a pendulum. Discover that mass does not matter but length does.',
    concepts: ['simple harmonic motion', 'period', 'frequency', 'gravitational acceleration'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
  },
  'standing-waves': {
    title: 'Standing Waves',
    description: 'Create stationary wave patterns by adjusting frequency and tension. Visualize nodes and antinodes.',
    concepts: ['standing waves', 'harmonics', 'nodes', 'antinodes', 'resonance'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'doppler-effect': {
    title: 'Doppler Effect',
    description: 'Hear and see frequency shifts from moving sources. Understand why ambulance sirens change pitch as they pass.',
    concepts: ['Doppler shift', 'frequency', 'wavelength', 'relative motion'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'resonance': {
    title: 'Resonance',
    description: 'Amplify oscillations by matching the driving frequency to the natural frequency of a system.',
    concepts: ['natural frequency', 'resonance', 'amplitude', 'damping'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },

  // === Fluid Mechanics ===
  'bernoulli': {
    title: "Bernoulli's Principle",
    description: 'Discover why fast-moving fluids create low pressure. Simulate airfoils, pipes, and spray bottles.',
    concepts: ["Bernoulli's equation", 'fluid pressure', 'flow velocity', 'continuity equation'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'buoyancy': {
    title: 'Buoyancy',
    description: "Explore Archimedes' principle of floating. Predict which objects sink or float based on density.",
    concepts: ['buoyant force', "Archimedes' principle", 'density', 'displacement'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
  },
  'venturi-effect': {
    title: 'Venturi Effect',
    description: 'See how fluid speeds up and pressure drops in a constricted pipe section.',
    concepts: ['Venturi effect', 'flow constriction', 'pressure drop', 'continuity'],
    difficulty: 'intermediate',
    estimatedMinutes: 9,
  },

  // === Thermodynamics ===
  'convection': {
    title: 'Convection',
    description: 'Watch heat transfer through fluid motion. See convection cells form and understand natural vs forced convection.',
    concepts: ['convection', 'heat transfer', 'fluid circulation', 'thermal gradients'],
    difficulty: 'beginner',
    estimatedMinutes: 8,
  },
  'latent-heat': {
    title: 'Latent Heat',
    description: 'Explore the energy absorbed and released during phase changes. See why temperature plateaus during melting and boiling.',
    concepts: ['latent heat', 'phase transitions', 'heat of fusion', 'heat of vaporization'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },

  // === Electricity & Magnetism ===
  'electric-field': {
    title: 'Electric Field',
    description: 'Visualize electric force fields around point charges. Place charges and watch field lines emerge.',
    concepts: ['electric field', 'field lines', 'point charges', "Coulomb's law"],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'circuits': {
    title: 'Circuits',
    description: 'Build and analyze electric circuits with resistors, capacitors, and voltage sources.',
    concepts: ["Ohm's law", 'series circuits', 'parallel circuits', 'voltage', 'current'],
    difficulty: 'beginner',
    estimatedMinutes: 12,
  },
  'kirchhoffs-laws': {
    title: "Kirchhoff's Laws",
    description: 'Apply current and voltage rules to solve complex circuits. Master junction and loop equations.',
    concepts: ["Kirchhoff's current law", "Kirchhoff's voltage law", 'circuit analysis'],
    difficulty: 'intermediate',
    estimatedMinutes: 12,
  },

  // === Optics ===
  'snells-law': {
    title: "Snell's Law",
    description: 'Calculate refraction angles as light passes between materials. Explore total internal reflection.',
    concepts: ["Snell's law", 'refraction', 'index of refraction', 'critical angle'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'lens-focusing': {
    title: 'Lens Focusing',
    description: 'Understand how lenses form images. Move objects and see how focal length affects image size and position.',
    concepts: ['thin lens equation', 'focal length', 'magnification', 'real and virtual images'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
  'diffraction': {
    title: 'Diffraction',
    description: 'See light bend around obstacles and through slits. Explore single-slit and double-slit patterns.',
    concepts: ['diffraction', 'interference', 'wave nature of light', 'slit width'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
  },
  'total-internal-reflection': {
    title: 'Total Internal Reflection',
    description: 'Discover how light gets trapped inside materials above the critical angle. The physics behind fiber optics.',
    concepts: ['total internal reflection', 'critical angle', 'fiber optics', 'refraction'],
    difficulty: 'intermediate',
    estimatedMinutes: 9,
  },

  // === AI & Computing ===
  'a-i-inference-latency': {
    title: 'AI Inference Latency',
    description: 'Understand GPU computation timing for neural network inference. Optimize batch size and model parallelism.',
    concepts: ['inference latency', 'GPU compute', 'batch processing', 'model parallelism'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
  },
  'g-p-u-occupancy': {
    title: 'GPU Occupancy',
    description: 'Maximize GPU utilization by balancing thread blocks, shared memory, and register usage.',
    concepts: ['GPU occupancy', 'thread blocks', 'shared memory', 'warp scheduling'],
    difficulty: 'advanced',
    estimatedMinutes: 15,
  },
  'tensor-core': {
    title: 'Tensor Core',
    description: 'Explore matrix multiply accelerators that power modern AI training and inference.',
    concepts: ['tensor cores', 'matrix multiplication', 'mixed precision', 'FLOPS'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
  },
  'g-p-u-memory-bandwidth': {
    title: 'GPU Memory Bandwidth',
    description: 'Understand why memory bandwidth is the bottleneck for most GPU workloads. Optimize data access patterns.',
    concepts: ['memory bandwidth', 'HBM', 'cache hierarchy', 'data movement'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
  },

  // === Solar & Energy ===
  'solar-cell': {
    title: 'Solar Cell',
    description: 'Explore photovoltaic fundamentals. See how photons create electron-hole pairs and generate electricity.',
    concepts: ['photovoltaic effect', 'bandgap', 'p-n junction', 'solar spectrum'],
    difficulty: 'intermediate',
    estimatedMinutes: 12,
  },
  'm-p-p-t': {
    title: 'Maximum Power Point Tracking',
    description: 'Optimize solar panel output by finding the voltage that maximizes power extraction.',
    concepts: ['MPPT', 'maximum power point', 'IV curve', 'DC-DC conversion'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
  },

  // === Semiconductors ===
  'photolithography': {
    title: 'Photolithography',
    description: 'Pattern silicon wafers with light. Explore resolution limits, exposure dose, and feature sizes.',
    concepts: ['photolithography', 'photoresist', 'diffraction limit', 'EUV'],
    difficulty: 'advanced',
    estimatedMinutes: 15,
  },
  'm-o-s-f-e-t-switching': {
    title: 'MOSFET Switching',
    description: 'Understand how transistors switch between on and off states. Explore threshold voltage and gate capacitance.',
    concepts: ['MOSFET', 'threshold voltage', 'gate capacitance', 'switching speed'],
    difficulty: 'advanced',
    estimatedMinutes: 12,
  },

  // === Space ===
  'orbital-mechanics': {
    title: 'Orbital Mechanics',
    description: "Explore Kepler's laws and orbit dynamics. Launch satellites, transfer orbits, and understand escape velocity.",
    concepts: ["Kepler's laws", 'orbital velocity', 'escape velocity', 'Hohmann transfer'],
    difficulty: 'intermediate',
    estimatedMinutes: 12,
  },
  'tidal-forces': {
    title: 'Tidal Forces',
    description: "Explore the Moon's gravitational effects on Earth's oceans. See how tidal bulges form and move.",
    concepts: ['tidal forces', 'gravitational gradient', 'tidal bulge', 'spring and neap tides'],
    difficulty: 'intermediate',
    estimatedMinutes: 10,
  },
};

/**
 * Get SEO data for a game by slug.
 * Falls back to auto-generated data from the slug if not in the map.
 */
export function getGameSEO(slug: string): GameSEOEntry {
  if (gameSEOData[slug]) {
    return gameSEOData[slug];
  }

  // Auto-generate from slug
  const title = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    title,
    description: `Explore ${title} through an interactive simulation. Predict outcomes, experiment with variables, and test your understanding with AI-powered coaching.`,
    estimatedMinutes: 10,
  };
}
