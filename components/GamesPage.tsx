'use client';

import React, { useState, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// GAMES LIBRARY PAGE - Browse all 260+ interactive games
// ─────────────────────────────────────────────────────────────────────────────

// Game categories and metadata
const gameCategories = {
  mechanics: {
    name: 'Mechanics',
    icon: '⚙️',
    color: '#3B82F6',
    description: 'Forces, motion, and energy',
  },
  thermodynamics: {
    name: 'Thermodynamics',
    icon: '🔥',
    color: '#EF4444',
    description: 'Heat, temperature, and energy transfer',
  },
  electromagnetism: {
    name: 'Electromagnetism',
    icon: '⚡',
    color: '#F59E0B',
    description: 'Electric and magnetic phenomena',
  },
  waves: {
    name: 'Waves & Optics',
    icon: '🌊',
    color: '#8B5CF6',
    description: 'Light, sound, and wave behavior',
  },
  fluids: {
    name: 'Fluids',
    icon: '💧',
    color: '#06B6D4',
    description: 'Liquids, gases, and flow',
  },
  modern: {
    name: 'Modern Physics',
    icon: '⚛️',
    color: '#EC4899',
    description: 'Quantum mechanics and relativity',
  },
  engineering: {
    name: 'Engineering',
    icon: '🔧',
    color: '#10B981',
    description: 'Applied physics and technology',
  },
  computing: {
    name: 'Computing',
    icon: '💻',
    color: '#6366F1',
    description: 'Hardware and AI concepts',
  },
  elon: {
    name: 'ELON Games',
    icon: '🚀',
    color: '#F97316',
    description: 'Systems thinking across energy, space, chips, and more',
  },
};

// Game list with categories
const games = [
  // Mechanics
  { name: 'Center of Mass', slug: 'center-of-mass', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Momentum Conservation', slug: 'momentum-conservation', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Angular Momentum', slug: 'angular-momentum', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Projectile Independence', slug: 'projectile-independence', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Torque', slug: 'torque', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Inclined Plane', slug: 'inclined-plane', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Hookes Law', slug: 'hookes-law', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Pendulum Period', slug: 'pendulum-period', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Inertia', slug: 'inertia', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Newtons Third Law', slug: 'newtons-third-law', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Static Kinetic Friction', slug: 'static-kinetic-friction', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Rolling vs Sliding', slug: 'rolling-vs-sliding', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Moment of Inertia', slug: 'moment-of-inertia', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Gyroscopic Precession', slug: 'gyroscopic-precession', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Two Ball Collision', slug: 'two-ball-collision', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Inelastic Collisions', slug: 'inelastic-collisions', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Ballistic Pendulum', slug: 'ballistic-pendulum', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Egg Drop', slug: 'egg-drop', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Buckling', slug: 'buckling', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Orbital Mechanics', slug: 'orbital-mechanics', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Tidal Forces', slug: 'tidal-forces', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Coriolis Effect', slug: 'coriolis-effect', category: 'mechanics', difficulty: 'intermediate' },

  // Thermodynamics
  { name: 'Thermal Expansion', slug: 'thermal-expansion', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Thermal Contact', slug: 'thermal-contact', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Newton Cooling', slug: 'newton-cooling', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Convection', slug: 'convection', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Carnot Cycle', slug: 'carnot-cycle', category: 'thermodynamics', difficulty: 'advanced' },
  { name: 'Entropy', slug: 'entropy', category: 'thermodynamics', difficulty: 'advanced' },
  { name: 'Phase Change Energy', slug: 'phase-change-energy', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Latent Heat', slug: 'latent-heat', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Kinetic Theory Gases', slug: 'kinetic-theory-gases', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Gas Laws', slug: 'gas-laws', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Boiling Pressure', slug: 'boiling-pressure', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Evaporative Cooling', slug: 'evaporative-cooling', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Leidenfrost', slug: 'leidenfrost', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Heat Sink Thermal', slug: 'heat-sink-thermal', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Bimetal Thermostat', slug: 'bimetal-thermostat', category: 'thermodynamics', difficulty: 'beginner' },

  // Electromagnetism
  { name: 'Coulombs Law', slug: 'coulombs-law', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Electric Field', slug: 'electric-field', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Electric Potential', slug: 'electric-potential', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Magnetic Field', slug: 'magnetic-field', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Electromagnetic Induction', slug: 'electromagnetic-induction', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Kirchhoffs Laws', slug: 'kirchhoffs-laws', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'RC Time Constant', slug: 'r-c-time-constant', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Transformer', slug: 'transformer', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Classic DC Motor', slug: 'classic-d-c-motor', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Homopolar Motor', slug: 'homopolar-motor', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Oersted Experiment', slug: 'oersted-experiment', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Faraday Cage', slug: 'faraday-cage', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Static Electricity', slug: 'static-electricity', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Eddy Currents', slug: 'eddy-currents', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'LC Resonance', slug: 'l-c-resonance', category: 'electromagnetism', difficulty: 'advanced' },
  { name: 'Wireless Charging', slug: 'wireless-charging', category: 'electromagnetism', difficulty: 'intermediate' },

  // Waves & Optics
  { name: 'Wave Particle Duality', slug: 'wave-particle-duality', category: 'waves', difficulty: 'advanced' },
  { name: 'Wave Interference', slug: 'wave-interference', category: 'waves', difficulty: 'intermediate' },
  { name: 'Diffraction', slug: 'diffraction', category: 'waves', difficulty: 'intermediate' },
  { name: 'Snells Law', slug: 'snells-law', category: 'waves', difficulty: 'beginner' },
  { name: 'Refraction', slug: 'refraction', category: 'waves', difficulty: 'beginner' },
  { name: 'Total Internal Reflection', slug: 'total-internal-reflection', category: 'waves', difficulty: 'intermediate' },
  { name: 'Dispersion', slug: 'dispersion', category: 'waves', difficulty: 'beginner' },
  { name: 'Polarization', slug: 'polarization', category: 'waves', difficulty: 'intermediate' },
  { name: 'Doppler Effect', slug: 'doppler-effect', category: 'waves', difficulty: 'intermediate' },
  { name: 'Standing Waves', slug: 'standing-waves', category: 'waves', difficulty: 'intermediate' },
  { name: 'Resonance', slug: 'resonance', category: 'waves', difficulty: 'intermediate' },
  { name: 'Beats', slug: 'beats', category: 'waves', difficulty: 'beginner' },
  { name: 'Speed of Sound', slug: 'speed-of-sound', category: 'waves', difficulty: 'beginner' },
  { name: 'Sound Interference', slug: 'sound-interference', category: 'waves', difficulty: 'intermediate' },
  { name: 'Thin Film Interference', slug: 'thin-film-interference', category: 'waves', difficulty: 'intermediate' },
  { name: 'Laser Speckle', slug: 'laser-speckle', category: 'waves', difficulty: 'advanced' },
  { name: 'Photoelectric Effect', slug: 'photoelectric-effect', category: 'modern', difficulty: 'intermediate' },

  // Fluids
  { name: 'Bernoulli', slug: 'bernoulli', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Buoyancy', slug: 'buoyancy', category: 'fluids', difficulty: 'beginner' },
  { name: 'Pascal Law', slug: 'pascal-law', category: 'fluids', difficulty: 'beginner' },
  { name: 'Hydrostatic Pressure', slug: 'hydrostatic-pressure', category: 'fluids', difficulty: 'beginner' },
  { name: 'Venturi Effect', slug: 'venturi-effect', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Capillary Action', slug: 'capillary-action', category: 'fluids', difficulty: 'beginner' },
  { name: 'Viscosity Temperature', slug: 'viscosity-temperature', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Laminar Turbulent', slug: 'laminar-turbulent', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Lift Force', slug: 'lift-force', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Magnus Effect', slug: 'magnus-effect', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Cavitation', slug: 'cavitation', category: 'fluids', difficulty: 'advanced' },
  { name: 'Siphon', slug: 'siphon', category: 'fluids', difficulty: 'beginner' },
  { name: 'Shower Curtain', slug: 'shower-curtain', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Marangoni Tears', slug: 'marangoni-tears', category: 'fluids', difficulty: 'advanced' },

  // Engineering
  { name: 'MOSFET Switching', slug: 'm-o-s-f-e-t-switching', category: 'engineering', difficulty: 'advanced' },
  { name: 'Solar Cell', slug: 'solar-cell', category: 'engineering', difficulty: 'intermediate' },
  { name: 'LED As Solar Cell', slug: 'l-e-d-as-solar-cell', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Fill Factor', slug: 'fill-factor', category: 'engineering', difficulty: 'advanced' },
  { name: 'Anti Reflective Coating', slug: 'anti-reflective-coating', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Induction Heating', slug: 'induction-heating', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Power Factor', slug: 'power-factor', category: 'engineering', difficulty: 'advanced' },
  { name: 'SRAM Cell', slug: 's-r-a-m-cell', category: 'engineering', difficulty: 'advanced' },
  { name: 'HDD Physics', slug: 'h-d-d-physics', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Liquid Cooling', slug: 'liquid-cooling', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Server Airflow', slug: 'server-airflow', category: 'engineering', difficulty: 'intermediate' },

  // Computing
  { name: 'GPU Power States', slug: 'g-p-u-power-states', category: 'computing', difficulty: 'intermediate' },
  { name: 'GPU Memory Bandwidth', slug: 'g-p-u-memory-bandwidth', category: 'computing', difficulty: 'intermediate' },
  { name: 'TPU vs GPU', slug: 't-p-uvs-g-p-u', category: 'computing', difficulty: 'intermediate' },
  { name: 'Tensor Core', slug: 'tensor-core', category: 'computing', difficulty: 'advanced' },
  { name: 'Memory Hierarchy', slug: 'memory-hierarchy', category: 'computing', difficulty: 'intermediate' },
  { name: 'Network Latency', slug: 'network-latency', category: 'computing', difficulty: 'intermediate' },
  { name: 'AI Inference Latency', slug: 'a-i-inference-latency', category: 'computing', difficulty: 'advanced' },
  { name: 'Energy Per Token', slug: 'energy-per-token', category: 'computing', difficulty: 'advanced' },

  // ELON Games — Module 0: Meta-Skills
  { name: 'ELON Constraint Cascade', slug: 'e-l-o-n_-constraint-cascade', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Precision Budget', slug: 'e-l-o-n_-precision-budget', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Module 1: Energy & Grid
  { name: 'ELON Grid Balance', slug: 'e-l-o-n_-grid-balance', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Transformer Timeline', slug: 'e-l-o-n_-transformer-timeline', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Interconnect Queue', slug: 'e-l-o-n_-interconnect-queue', category: 'elon', difficulty: 'advanced' },

  // ELON Games — Module 2: Power Generation
  { name: 'ELON Power Plant Picker', slug: 'e-l-o-n_-power-plant-picker', category: 'elon', difficulty: 'beginner' },
  { name: 'ELON Fuel Delivery', slug: 'e-l-o-n_-fuel-delivery', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Blade Factory', slug: 'e-l-o-n_-blade-factory', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Module 3: Data Centers
  { name: 'ELON Facility Power', slug: 'e-l-o-n_-facility-power', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Cooling Strategy', slug: 'e-l-o-n_-cooling-strategy', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Uptime Architect', slug: 'e-l-o-n_-uptime-architect', category: 'elon', difficulty: 'advanced' },

  // ELON Games — Module 4: Solar + Storage
  { name: 'ELON Solar Manufacturing', slug: 'e-l-o-n_-solar-manufacturing', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Solar Deployment', slug: 'e-l-o-n_-solar-deployment', category: 'elon', difficulty: 'beginner' },
  { name: 'ELON Battery System', slug: 'e-l-o-n_-battery-system', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Module 5: Materials & Mining
  { name: 'ELON Ore To Metal', slug: 'e-l-o-n_-ore-to-metal', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Mining Bottleneck', slug: 'e-l-o-n_-mining-bottleneck', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Critical Minerals', slug: 'e-l-o-n_-critical-minerals', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Module 6: Semiconductors
  { name: 'ELON Fab Yield Curve', slug: 'e-l-o-n_-fab-yield-curve', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Chip Supply Web', slug: 'e-l-o-n_-chip-supply-web', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Packaging Limit', slug: 'e-l-o-n_-packaging-limit', category: 'elon', difficulty: 'advanced' },

  // ELON Games — Module 7: Networking & Comms
  { name: 'ELON Cluster Comms', slug: 'e-l-o-n_-cluster-comms', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Optical Link', slug: 'e-l-o-n_-optical-link', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Space Comms', slug: 'e-l-o-n_-space-comms', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Module 8: Space Systems
  { name: 'ELON Orbit Designer', slug: 'e-l-o-n_-orbit-designer', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Radiation Armor', slug: 'e-l-o-n_-radiation-armor', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Space Radiator', slug: 'e-l-o-n_-space-radiator', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Orbital Factory', slug: 'e-l-o-n_-orbital-factory', category: 'elon', difficulty: 'advanced' },

  // ELON Games — Module 9: Rockets & Reusability
  { name: 'ELON Rocket Materials', slug: 'e-l-o-n_-rocket-materials', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON TPS Turnaround', slug: 'e-l-o-n_-t-p-s-turnaround', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Module 10: Robotics & Autonomy
  { name: 'ELON Actuator Limits', slug: 'e-l-o-n_-actuator-limits', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Robot Learning', slug: 'e-l-o-n_-robot-learning', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Recursive Bot', slug: 'e-l-o-n_-recursive-bot', category: 'elon', difficulty: 'advanced' },

  // ELON Games — Module 11: Execution, Finance & Policy
  { name: 'ELON Throughput Cadence', slug: 'e-l-o-n_-throughput-cadence', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Capital Stack', slug: 'e-l-o-n_-capital-stack', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Policy Risk', slug: 'e-l-o-n_-policy-risk', category: 'elon', difficulty: 'intermediate' },

  // ELON Games — Capstone
  { name: 'ELON Gigawatt Blueprint', slug: 'e-l-o-n_-gigawatt-blueprint', category: 'elon', difficulty: 'advanced' },
];

const GamesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || game.category === selectedCategory;
      const matchesDifficulty = !selectedDifficulty || game.difficulty === selectedDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        background: colors.bgPrimary,
        zIndex: 100,
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>
            🎓
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary }}>
            Atlas Coach
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="/pricing" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>
            Pricing
          </a>
          <button style={{
            background: colors.accent,
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}>
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section style={{
        padding: '48px 24px 32px',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>
          300+ Interactive Games
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
          Master complex concepts through hands-on simulations
        </p>
      </section>

      {/* Search & Filters */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 32px',
      }}>
        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '14px 20px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: colors.bgCard,
              color: colors.textPrimary,
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>

        {/* Category filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
        }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              border: `1px solid ${!selectedCategory ? colors.accent : colors.border}`,
              background: !selectedCategory ? colors.accent : 'transparent',
              color: !selectedCategory ? 'white' : colors.textSecondary,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {Object.entries(gameCategories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                border: `1px solid ${selectedCategory === key ? cat.color : colors.border}`,
                background: selectedCategory === key ? `${cat.color}22` : 'transparent',
                color: selectedCategory === key ? cat.color : colors.textSecondary,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Difficulty filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['beginner', 'intermediate', 'advanced'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff === selectedDifficulty ? null : diff)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${selectedDifficulty === diff ? getDifficultyColor(diff) : colors.border}`,
                background: selectedDifficulty === diff ? `${getDifficultyColor(diff)}22` : 'transparent',
                color: selectedDifficulty === diff ? getDifficultyColor(diff) : colors.textMuted,
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {diff}
            </button>
          ))}
        </div>
      </section>

      {/* Games Grid */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 80px',
      }}>
        <p style={{ color: colors.textMuted, marginBottom: '24px', fontSize: '14px' }}>
          Showing {filteredGames.length} games
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {filteredGames.map((game) => {
            const category = gameCategories[game.category as keyof typeof gameCategories];
            return (
              <a
                key={game.slug}
                href={`/games/${game.slug}`}
                style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = category.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '24px' }}>{category.icon}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: getDifficultyColor(game.difficulty),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {game.difficulty}
                  </span>
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}>
                  {game.name}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: colors.textMuted,
                  margin: 0,
                }}>
                  {category.name}
                </p>
              </a>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: colors.bgSecondary,
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
          Unlock all 300+ games
        </h2>
        <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
          Start with 15 free games, or upgrade for unlimited access
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/pricing" style={{
            background: colors.accent,
            color: 'white',
            padding: '14px 32px',
            borderRadius: '10px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '15px',
          }}>
            View Pricing →
          </a>
          <button style={{
            background: 'transparent',
            color: colors.textPrimary,
            padding: '14px 32px',
            borderRadius: '10px',
            fontWeight: 600,
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
            fontSize: '15px',
          }}>
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '14px' }}>
          © 2025 Atlas Coach. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default GamesPage;
