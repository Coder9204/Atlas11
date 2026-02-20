'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { isOnboardingComplete, getAllGameProgress, GameRecord } from '../services/GameProgressService';

// ─────────────────────────────────────────────────────────────────────────────
// GAMES LIBRARY PAGE - Browse all 340+ interactive games
// ─────────────────────────────────────────────────────────────────────────────

const gameCategories = {
  mechanics: { name: 'Mechanics', icon: '⚙️', color: '#3B82F6', description: 'Forces, motion, and energy' },
  thermodynamics: { name: 'Thermo', icon: '🔥', color: '#EF4444', description: 'Heat, temperature, and energy transfer' },
  electromagnetism: { name: 'E&M', icon: '⚡', color: '#F59E0B', description: 'Electric and magnetic phenomena' },
  waves: { name: 'Waves & Optics', icon: '🌊', color: '#8B5CF6', description: 'Light, sound, and wave behavior' },
  fluids: { name: 'Fluids', icon: '💧', color: '#06B6D4', description: 'Liquids, gases, and flow' },
  modern: { name: 'Modern', icon: '⚛️', color: '#EC4899', description: 'Quantum and modern physics' },
  engineering: { name: 'Engineering', icon: '🔧', color: '#10B981', description: 'Applied physics and power systems' },
  computing: { name: 'Computing & AI', icon: '💻', color: '#6366F1', description: 'Hardware, AI, and ML concepts' },
  semiconductor: { name: 'Semiconductor', icon: '🔬', color: '#14B8A6', description: 'Chip design and fabrication' },
  solar: { name: 'Solar & PV', icon: '☀️', color: '#FBBF24', description: 'Solar cells and photovoltaics' },
  elon: { name: 'ELON', icon: '🚀', color: '#F97316', description: 'Systems thinking across energy, space, chips' },
};

// Search keywords/tags for better discoverability
const searchTags: Record<string, string[]> = {
  'center-of-mass': ['balance', 'gravity', 'equilibrium', 'COM'],
  'momentum-conservation': ['collision', 'crash', 'impact', 'p=mv'],
  'angular-momentum': ['spin', 'rotation', 'L=Iw'],
  'angular-momentum-transfer': ['spin', 'rotation', 'ice skater'],
  'projectile-independence': ['throw', 'launch', 'trajectory', 'horizontal vertical'],
  'torque': ['lever', 'wrench', 'rotation', 'moment'],
  'inclined-plane': ['ramp', 'slope', 'angle', 'friction'],
  'hookes-law': ['spring', 'elastic', 'F=kx', 'stretch'],
  'pendulum-period': ['swing', 'clock', 'T=2pi', 'SHM'],
  'inertia': ['mass', 'resistance', 'Newton first law'],
  'newtons-third-law': ['action reaction', 'equal opposite', 'N3L'],
  'static-kinetic-friction': ['slip', 'slide', 'mu', 'coefficient'],
  'rolling-vs-sliding': ['wheel', 'tire', 'roll', 'slide'],
  'moment-of-inertia': ['rotational mass', 'I=mr2', 'flywheel'],
  'gyroscopic-precession': ['gyro', 'spin', 'wobble', 'bicycle'],
  'two-ball-collision': ['elastic', 'bounce', 'billiard'],
  'inelastic-collisions': ['sticky', 'deform', 'energy loss'],
  'ballistic-pendulum': ['bullet', 'projectile', 'momentum energy'],
  'egg-drop': ['impact', 'cushion', 'protection', 'force'],
  'orbital-mechanics': ['orbit', 'satellite', 'Kepler', 'gravity'],
  'orbital-mechanics-basics': ['orbit', 'satellite', 'Kepler', 'gravity'],
  'tidal-forces': ['moon', 'ocean', 'gravity gradient', 'bulge'],
  'tidal-locking': ['moon', 'synchronous', 'rotation period'],
  'coriolis-effect': ['rotation', 'wind', 'hurricane', 'deflection'],
  'bottle-tornado': ['vortex', 'spin', 'water'],
  'brownian-motion': ['random walk', 'particles', 'diffusion', 'pollen'],
  'centripetal-force': ['circular', 'radius', 'spin', 'orbit'],
  'carnot-cycle': ['engine', 'efficiency', 'heat engine', 'PV diagram'],
  'entropy': ['disorder', 'second law', 'thermodynamics', 'S'],
  'thermal-expansion': ['heat', 'expand', 'contract', 'coefficient'],
  'thermal-contact': ['heat transfer', 'conduction', 'temperature'],
  'newton-cooling': ['cooling curve', 'temperature', 'exponential'],
  'convection': ['heat flow', 'rising', 'fluid circulation'],
  'gas-laws': ['PV=nRT', 'ideal gas', 'Boyle', 'Charles'],
  'phase-change-energy': ['melting', 'freezing', 'boiling', 'latent heat'],
  'latent-heat': ['melting', 'boiling', 'phase change', 'energy'],
  'kinetic-theory-gases': ['molecules', 'speed', 'temperature', 'pressure'],
  'wave-interference': ['constructive', 'destructive', 'superposition'],
  'wave-speed-tension': ['string', 'frequency', 'wavelength'],
  'diffraction': ['slit', 'grating', 'pattern', 'bending'],
  'snells-law': ['refraction', 'angle', 'n1 sin', 'glass'],
  'doppler-effect': ['frequency shift', 'ambulance', 'redshift'],
  'resonance': ['natural frequency', 'amplitude', 'oscillation'],
  'photoelectric-effect': ['photon', 'electron', 'Einstein', 'threshold'],
  'coulombs-law': ['charge', 'force', 'electrostatic', 'q1q2'],
  'electric-field': ['charge', 'force field', 'E=F/q'],
  'magnetic-field': ['magnet', 'compass', 'B field', 'Tesla'],
  'electromagnetic-induction': ['Faraday', 'EMF', 'generator', 'flux'],
  'kirchhoffs-laws': ['circuit', 'KVL', 'KCL', 'voltage current'],
  'circuits': ['resistor', 'series', 'parallel', 'Ohm'],
  'r-c-time-constant': ['capacitor', 'charge', 'discharge', 'tau'],
  'transformer': ['voltage', 'turns ratio', 'step up', 'step down'],
  'bernoulli': ['pressure', 'velocity', 'fluid flow', 'airplane'],
  'buoyancy': ['float', 'sink', 'Archimedes', 'density'],
  'pascal-law': ['pressure', 'hydraulic', 'piston'],
  'hydrostatic-pressure': ['depth', 'water', 'rho g h'],
  'venturi-effect': ['constriction', 'pressure drop', 'flow speed'],
  'laminar-turbulent': ['Reynolds', 'flow', 'smooth', 'chaotic'],
  'solar-cell': ['photovoltaic', 'PV', 'electricity', 'sunlight'],
  'm-o-s-f-e-t-switching': ['transistor', 'gate', 'switch', 'MOSFET'],
  's-r-a-m-cell': ['memory', 'flip-flop', 'cache', 'SRAM'],
  'power-factor': ['AC', 'reactive', 'real power', 'cosine'],
  'tensor-core': ['matrix', 'GPU', 'AI', 'multiply'],
  'systolic-array': ['TPU', 'matrix', 'pipeline', 'parallel'],
  'k-v-cache': ['transformer', 'attention', 'LLM', 'inference'],
  'energy-per-token': ['LLM', 'AI', 'power', 'efficiency'],
  'attention-memory': ['transformer', 'self-attention', 'LLM', 'QKV'],
  'sparsity': ['pruning', 'sparse', 'efficiency', 'zero'],
  'quantization-precision': ['int8', 'fp16', 'model compression', 'bits'],
  'photolithography': ['mask', 'wafer', 'UV', 'pattern'],
  'e-s-d-protection': ['static', 'discharge', 'ESD', 'zap'],
  'electromigration': ['current', 'wire', 'failure', 'atoms'],
  'process-variation': ['manufacturing', 'sigma', 'yield', 'variation'],
};

const games: { name: string; slug: string; category: string; difficulty: string }[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MECHANICS (55 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Center of Mass', slug: 'center-of-mass', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Momentum Conservation', slug: 'momentum-conservation', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Angular Momentum', slug: 'angular-momentum', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Angular Momentum Transfer', slug: 'angular-momentum-transfer', category: 'mechanics', difficulty: 'intermediate' },
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
  { name: 'Orbital Mechanics Basics', slug: 'orbital-mechanics-basics', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Tidal Forces', slug: 'tidal-forces', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Tidal Locking', slug: 'tidal-locking', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Coriolis Effect', slug: 'coriolis-effect', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Bottle Tornado', slug: 'bottle-tornado', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Brachistochrone', slug: 'brachistochrone', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Brownian Motion', slug: 'brownian-motion', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Cartesian Diver', slug: 'cartesian-diver', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Centripetal Force', slug: 'centripetal-force', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Chain Fountain', slug: 'chain-fountain', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Coupled Pendulums', slug: 'coupled-pendulums', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Cycloid Motion', slug: 'cycloid-motion', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Damped Oscillations', slug: 'damped-oscillations', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Damping', slug: 'damping', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Drag Force', slug: 'drag-force', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Elastic Potential Energy', slug: 'elastic-potential-energy', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Energy Conservation', slug: 'energy-conservation', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Floating Paperclip', slug: 'floating-paperclip', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Forced Oscillations', slug: 'forced-oscillations', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Fracture Mechanics', slug: 'fracture-mechanics', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Gyroscope Stability', slug: 'gyroscope-stability', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Helium Balloon Car', slug: 'helium-balloon-car', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Minimal Surfaces', slug: 'minimal-surfaces', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Non-Newtonian Armor', slug: 'non-newtonian-armor', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Poisson Ratio', slug: 'poisson-ratio', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Precession Nutation', slug: 'precession-nutation', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Rattleback', slug: 'rattleback', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Rolling Race', slug: 'rolling-race', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Sleeping Top', slug: 'sleeping-top', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Stick Slip', slug: 'stick-slip', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Swing Pumping', slug: 'swing-pumping', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Tipping Point', slug: 'tipping-point', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Tuned Mass Damper', slug: 'tuned-mass-damper', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Viscoelasticity', slug: 'viscoelasticity', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Vortex Rings', slug: 'vortex-rings', category: 'mechanics', difficulty: 'intermediate' },
  { name: 'Work Power', slug: 'work-power', category: 'mechanics', difficulty: 'beginner' },
  { name: 'Stable Levitation', slug: 'stable-levitation', category: 'mechanics', difficulty: 'advanced' },
  { name: 'Eddy Current Pendulum', slug: 'eddy-current-pendulum', category: 'mechanics', difficulty: 'intermediate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // THERMODYNAMICS (23 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Thermal Expansion', slug: 'thermal-expansion', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Thermal Contact', slug: 'thermal-contact', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Newton Cooling', slug: 'newton-cooling', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Convection', slug: 'convection', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Convection Currents', slug: 'convection-currents', category: 'thermodynamics', difficulty: 'intermediate' },
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
  { name: 'Adiabatic Heating', slug: 'adiabatic-heating', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Arrhenius', slug: 'arrhenius', category: 'thermodynamics', difficulty: 'advanced' },
  { name: 'Endothermic Exothermic', slug: 'endothermic-exothermic', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Hand Warmer', slug: 'hand-warmer', category: 'thermodynamics', difficulty: 'beginner' },
  { name: 'Heat Transfer Capacity', slug: 'heat-transfer-capacity', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Infrared Emissivity', slug: 'infrared-emissivity', category: 'thermodynamics', difficulty: 'intermediate' },
  { name: 'Thermal Interface', slug: 'thermal-interface', category: 'thermodynamics', difficulty: 'intermediate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELECTROMAGNETISM (24 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Coulombs Law', slug: 'coulombs-law', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Electric Field', slug: 'electric-field', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Electric Field Mapping', slug: 'electric-field-mapping', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Electric Potential', slug: 'electric-potential', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Magnetic Field', slug: 'magnetic-field', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Magnetic Mapping', slug: 'magnetic-mapping', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Electromagnetic Induction', slug: 'electromagnetic-induction', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Electromagnet', slug: 'electromagnet', category: 'electromagnetism', difficulty: 'beginner' },
  { name: 'Kirchhoffs Laws', slug: 'kirchhoffs-laws', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Circuits', slug: 'circuits', category: 'electromagnetism', difficulty: 'beginner' },
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
  { name: 'Capacitive Touch', slug: 'capacitive-touch', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Inductive Kickback', slug: 'inductive-kickback', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Galvanic Corrosion', slug: 'galvanic-corrosion', category: 'electromagnetism', difficulty: 'intermediate' },
  { name: 'Humidity ESD', slug: 'humidity-e-s-d', category: 'electromagnetism', difficulty: 'intermediate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // WAVES & OPTICS (43 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Wave Particle Duality', slug: 'wave-particle-duality', category: 'waves', difficulty: 'advanced' },
  { name: 'Wave Interference', slug: 'wave-interference', category: 'waves', difficulty: 'intermediate' },
  { name: 'Wave Speed Tension', slug: 'wave-speed-tension', category: 'waves', difficulty: 'beginner' },
  { name: 'Diffraction', slug: 'diffraction', category: 'waves', difficulty: 'intermediate' },
  { name: 'Diffusion Convection', slug: 'diffusion-convection', category: 'waves', difficulty: 'intermediate' },
  { name: 'Snells Law', slug: 'snells-law', category: 'waves', difficulty: 'beginner' },
  { name: 'Refraction', slug: 'refraction', category: 'waves', difficulty: 'beginner' },
  { name: 'Reflection', slug: 'reflection', category: 'waves', difficulty: 'beginner' },
  { name: 'Law of Reflection', slug: 'law-of-reflection', category: 'waves', difficulty: 'beginner' },
  { name: 'Total Internal Reflection', slug: 'total-internal-reflection', category: 'waves', difficulty: 'intermediate' },
  { name: 'Retroreflection', slug: 'retroreflection', category: 'waves', difficulty: 'intermediate' },
  { name: 'Dispersion', slug: 'dispersion', category: 'waves', difficulty: 'beginner' },
  { name: 'Polarization', slug: 'polarization', category: 'waves', difficulty: 'intermediate' },
  { name: 'Polarized Sky', slug: 'polarized-sky', category: 'waves', difficulty: 'intermediate' },
  { name: 'Doppler Effect', slug: 'doppler-effect', category: 'waves', difficulty: 'intermediate' },
  { name: 'Standing Waves', slug: 'standing-waves', category: 'waves', difficulty: 'intermediate' },
  { name: 'Resonance', slug: 'resonance', category: 'waves', difficulty: 'intermediate' },
  { name: 'Beats', slug: 'beats', category: 'waves', difficulty: 'beginner' },
  { name: 'Speed of Sound', slug: 'speed-of-sound', category: 'waves', difficulty: 'beginner' },
  { name: 'Sound Interference', slug: 'sound-interference', category: 'waves', difficulty: 'intermediate' },
  { name: 'Thin Film Interference', slug: 'thin-film-interference', category: 'waves', difficulty: 'intermediate' },
  { name: 'Laser Speckle', slug: 'laser-speckle', category: 'waves', difficulty: 'advanced' },
  { name: 'Brewster Angle', slug: 'brewster-angle', category: 'waves', difficulty: 'intermediate' },
  { name: 'Camera Obscura', slug: 'camera-obscura', category: 'waves', difficulty: 'beginner' },
  { name: 'Chladni Patterns', slug: 'chladni-patterns', category: 'waves', difficulty: 'intermediate' },
  { name: 'Chromatic Aberration', slug: 'chromatic-aberration', category: 'waves', difficulty: 'intermediate' },
  { name: 'Depth of Field', slug: 'depth-of-field', category: 'waves', difficulty: 'intermediate' },
  { name: 'Echo Time of Flight', slug: 'echo-time-of-flight', category: 'waves', difficulty: 'beginner' },
  { name: 'Fluorescence', slug: 'fluorescence', category: 'waves', difficulty: 'intermediate' },
  { name: 'Fresnel Zones', slug: 'fresnel-zones', category: 'waves', difficulty: 'advanced' },
  { name: 'Lens Focusing', slug: 'lens-focusing', category: 'waves', difficulty: 'beginner' },
  { name: 'Microwave Standing Wave', slug: 'microwave-standing-wave', category: 'waves', difficulty: 'intermediate' },
  { name: 'Moire Patterns', slug: 'moire-patterns', category: 'waves', difficulty: 'intermediate' },
  { name: 'Photoelasticity', slug: 'photoelasticity', category: 'waves', difficulty: 'intermediate' },
  { name: 'Rayleigh Mie Scattering', slug: 'rayleigh-mie-scattering', category: 'waves', difficulty: 'intermediate' },
  { name: 'Reverberation', slug: 'reverberation', category: 'waves', difficulty: 'intermediate' },
  { name: 'Rolling Shutter', slug: 'rolling-shutter', category: 'waves', difficulty: 'intermediate' },
  { name: 'Tape Birefringence', slug: 'tape-birefringence', category: 'waves', difficulty: 'intermediate' },
  { name: 'Wagon Wheel Aliasing', slug: 'wagon-wheel-aliasing', category: 'waves', difficulty: 'intermediate' },
  { name: 'P-Waves S-Waves', slug: 'p-waves-s-waves', category: 'waves', difficulty: 'intermediate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // FLUIDS (27 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Bernoulli', slug: 'bernoulli', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Buoyancy', slug: 'buoyancy', category: 'fluids', difficulty: 'beginner' },
  { name: 'Pascal Law', slug: 'pascal-law', category: 'fluids', difficulty: 'beginner' },
  { name: 'Hydrostatic Pressure', slug: 'hydrostatic-pressure', category: 'fluids', difficulty: 'beginner' },
  { name: 'Venturi Effect', slug: 'venturi-effect', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Capillary Action', slug: 'capillary-action', category: 'fluids', difficulty: 'beginner' },
  { name: 'Viscosity Temperature', slug: 'viscosity-temperature', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Laminar Turbulent', slug: 'laminar-turbulent', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Laminar Flow', slug: 'laminar-flow', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Lift Force', slug: 'lift-force', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Magnus Effect', slug: 'magnus-effect', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Cavitation', slug: 'cavitation', category: 'fluids', difficulty: 'advanced' },
  { name: 'Siphon', slug: 'siphon', category: 'fluids', difficulty: 'beginner' },
  { name: 'Shower Curtain', slug: 'shower-curtain', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Marangoni Tears', slug: 'marangoni-tears', category: 'fluids', difficulty: 'advanced' },
  { name: 'Fluid Inertia', slug: 'fluid-inertia', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Hydraulic Jump', slug: 'hydraulic-jump', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Jar Lid Expansion', slug: 'jar-lid-expansion', category: 'fluids', difficulty: 'beginner' },
  { name: 'Karman Vortex', slug: 'karman-vortex', category: 'fluids', difficulty: 'advanced' },
  { name: 'Pressure Drop', slug: 'pressure-drop', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Shear Thinning', slug: 'shear-thinning', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Supercooling', slug: 'supercooling', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Superhydrophobic', slug: 'superhydrophobic', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Terminal Velocity', slug: 'terminal-velocity', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Water Hammer', slug: 'water-hammer', category: 'fluids', difficulty: 'intermediate' },
  { name: 'Soap Boat', slug: 'soap-boat', category: 'fluids', difficulty: 'beginner' },
  { name: 'Droplet Breakup', slug: 'droplet-breakup', category: 'fluids', difficulty: 'advanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODERN PHYSICS (3 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Photoelectric Effect', slug: 'photoelectric-effect', category: 'modern', difficulty: 'intermediate' },
  { name: 'Molecular Orbitals', slug: 'molecular-orbitals', category: 'modern', difficulty: 'advanced' },
  { name: 'Radiation Effects', slug: 'radiation-effects', category: 'modern', difficulty: 'advanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINEERING (42 games)
  // ═══════════════════════════════════════════════════════════════════════════
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
  { name: 'Antenna Gain', slug: 'antenna-gain', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Antenna Polarization', slug: 'antenna-polarization', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Cable Sizing', slug: 'cable-sizing', category: 'engineering', difficulty: 'intermediate' },
  { name: 'DC-DC Converter', slug: 'd-c-d-c-converter', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Direction Finding', slug: 'direction-finding', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Fan Laws', slug: 'fan-laws', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Generator Startup', slug: 'generator-startup', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Grid Frequency', slug: 'grid-frequency', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Ground Fault', slug: 'ground-fault', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Inverter Sine Wave', slug: 'inverter-sine-wave', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Link Budget', slug: 'link-budget', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Network Congestion', slug: 'network-congestion', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Power Delivery Network', slug: 'power-delivery-network', category: 'engineering', difficulty: 'advanced' },
  { name: 'Power Loss', slug: 'power-loss', category: 'engineering', difficulty: 'intermediate' },
  { name: 'UPS Battery Sizing', slug: 'u-p-s-battery-sizing', category: 'engineering', difficulty: 'intermediate' },
  { name: 'UPS Efficiency', slug: 'u-p-s-efficiency', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Thermal Throttling', slug: 'thermal-throttling', category: 'engineering', difficulty: 'intermediate' },
  { name: 'PUE Calculator', slug: 'p-u-e-calculator', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Microphone', slug: 'microphone', category: 'engineering', difficulty: 'beginner' },
  { name: 'Make Microphone', slug: 'make-microphone', category: 'engineering', difficulty: 'beginner' },
  { name: 'Speaker Principle', slug: 'speaker-principle', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Straw Instrument', slug: 'straw-instrument', category: 'engineering', difficulty: 'beginner' },
  { name: 'String Sizing', slug: 'string-sizing', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Metronome Sync', slug: 'metronome-sync', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Phone Seismometer', slug: 'phone-seismometer', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Reaction Time', slug: 'reaction-time', category: 'engineering', difficulty: 'beginner' },
  { name: 'Cloud In Bottle', slug: 'cloud-in-bottle', category: 'engineering', difficulty: 'beginner' },
  { name: 'Battery Internal Resistance', slug: 'battery-internal-resistance', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Fiber Signal Loss', slug: 'fiber-signal-loss', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Noise Margin', slug: 'noise-margin', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Transmission Line', slug: 'transmission-line', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Crosstalk', slug: 'crosstalk', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Chiller COP', slug: 'chiller-c-o-p', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Satellite Doppler', slug: 'satellite-doppler', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Satellite Solar Angle', slug: 'satellite-solar-angle', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Satellite Thermal', slug: 'satellite-thermal', category: 'engineering', difficulty: 'intermediate' },
  { name: 'Space Radiation', slug: 'space-radiation', category: 'engineering', difficulty: 'advanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTING & AI (33 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'GPU Power States', slug: 'g-p-u-power-states', category: 'computing', difficulty: 'intermediate' },
  { name: 'GPU Memory Bandwidth', slug: 'g-p-u-memory-bandwidth', category: 'computing', difficulty: 'intermediate' },
  { name: 'GPU Occupancy', slug: 'g-p-u-occupancy', category: 'computing', difficulty: 'advanced' },
  { name: 'TPU vs GPU', slug: 't-p-uvs-g-p-u', category: 'computing', difficulty: 'intermediate' },
  { name: 'ASIC vs GPU', slug: 'a-s-i-cvs-g-p-u', category: 'computing', difficulty: 'intermediate' },
  { name: 'Tensor Core', slug: 'tensor-core', category: 'computing', difficulty: 'advanced' },
  { name: 'Systolic Array', slug: 'systolic-array', category: 'computing', difficulty: 'advanced' },
  { name: 'Memory Hierarchy', slug: 'memory-hierarchy', category: 'computing', difficulty: 'intermediate' },
  { name: 'Network Latency', slug: 'network-latency', category: 'computing', difficulty: 'intermediate' },
  { name: 'AI Inference Latency', slug: 'a-i-inference-latency', category: 'computing', difficulty: 'advanced' },
  { name: 'Energy Per Token', slug: 'energy-per-token', category: 'computing', difficulty: 'advanced' },
  { name: 'PCIe Bandwidth', slug: 'p-c-ie-bandwidth', category: 'computing', difficulty: 'intermediate' },
  { name: 'ECC Memory', slug: 'e-c-c-memory', category: 'computing', difficulty: 'intermediate' },
  { name: 'DRAM Refresh', slug: 'd-r-a-m-refresh', category: 'computing', difficulty: 'intermediate' },
  { name: 'DVFS', slug: 'd-v-f-s', category: 'computing', difficulty: 'intermediate' },
  { name: 'KV Cache', slug: 'k-v-cache', category: 'computing', difficulty: 'advanced' },
  { name: 'Data Movement Energy', slug: 'data-movement-energy', category: 'computing', difficulty: 'intermediate' },
  { name: 'Batching Latency', slug: 'batching-latency', category: 'computing', difficulty: 'intermediate' },
  { name: 'Attention Memory', slug: 'attention-memory', category: 'computing', difficulty: 'intermediate' },
  { name: 'Attention Loves Bandwidth', slug: 'attention-loves-bandwidth', category: 'computing', difficulty: 'intermediate' },
  { name: 'Sparsity', slug: 'sparsity', category: 'computing', difficulty: 'intermediate' },
  { name: 'Quantization Precision', slug: 'quantization-precision', category: 'computing', difficulty: 'intermediate' },
  { name: 'LLM to SPICE', slug: 'l-l-m-to-s-p-i-c-e', category: 'computing', difficulty: 'advanced' },
  { name: 'Ask for Assumptions', slug: 'ask-for-assumptions', category: 'computing', difficulty: 'beginner' },
  { name: 'Model as Reviewer', slug: 'model-as-reviewer', category: 'computing', difficulty: 'intermediate' },
  { name: 'Patch Discipline', slug: 'patch-discipline', category: 'computing', difficulty: 'intermediate' },
  { name: 'Prompt Injection Safety', slug: 'prompt-injection-safety', category: 'computing', difficulty: 'intermediate' },
  { name: 'Spec First Prompting', slug: 'spec-first-prompting', category: 'computing', difficulty: 'intermediate' },
  { name: 'Test First Prompting', slug: 'test-first-prompting', category: 'computing', difficulty: 'intermediate' },
  { name: 'Tool Aware Prompting', slug: 'tool-aware-prompting', category: 'computing', difficulty: 'intermediate' },
  { name: 'Verification Harness', slug: 'verification-harness', category: 'computing', difficulty: 'intermediate' },
  { name: 'Remote Game', slug: 'remote-game', category: 'computing', difficulty: 'intermediate' },
  { name: 'Manufacturing Drives Architecture', slug: 'manufacturing-drives-architecture', category: 'computing', difficulty: 'advanced' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMICONDUCTOR (29 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'CMP Planarization', slug: 'c-m-p-planarization', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Cleanroom Yield', slug: 'cleanroom-yield', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Clock Distribution', slug: 'clock-distribution', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Clock Jitter', slug: 'clock-jitter', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Decoupling Capacitor', slug: 'decoupling-capacitor', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Deposition Types', slug: 'deposition-types', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Design to Fab Translation', slug: 'design-to-fab-translation', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Doping Diffusion', slug: 'doping-diffusion', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Electromigration', slug: 'electromigration', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'EMI Shielding', slug: 'e-m-i-shielding', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'ESD Protection', slug: 'e-s-d-protection', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Etch Anisotropy', slug: 'etch-anisotropy', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Flip Chip Wirebond', slug: 'flip-chip-wirebond', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Ground Bounce', slug: 'ground-bounce', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Interconnect Topology', slug: 'interconnect-topology', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Ion Implantation', slug: 'ion-implantation', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'IR Drop', slug: 'i-r-drop', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Leakage Current', slug: 'leakage-current', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Leakage Power', slug: 'leakage-power', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Litho Focus Dose', slug: 'litho-focus-dose', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Metastability', slug: 'metastability', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Overlay Error', slug: 'overlay-error', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Photolithography', slug: 'photolithography', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'Process Variation', slug: 'process-variation', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'RC Delay', slug: 'r-c-delay', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'RC Delay Interconnect', slug: 'r-c-delay-interconnect', category: 'semiconductor', difficulty: 'intermediate' },
  { name: 'SRAM Yield Redundancy', slug: 's-r-a-m-yield-redundancy', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Chiplet Architecture', slug: 'chiplet-architecture', category: 'semiconductor', difficulty: 'advanced' },
  { name: 'Chiplets vs Monoliths', slug: 'chiplets-vs-monoliths', category: 'semiconductor', difficulty: 'intermediate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLAR & PV (18 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'Bifacial Albedo', slug: 'bifacial-albedo', category: 'solar', difficulty: 'intermediate' },
  { name: 'Bypass Diodes', slug: 'bypass-diodes', category: 'solar', difficulty: 'intermediate' },
  { name: 'Cell to Module Losses', slug: 'cell-to-module-losses', category: 'solar', difficulty: 'intermediate' },
  { name: 'Encapsulation UV Aging', slug: 'encapsulation-u-v-aging', category: 'solar', difficulty: 'intermediate' },
  { name: 'Hotspots', slug: 'hotspots', category: 'solar', difficulty: 'intermediate' },
  { name: 'MPPT', slug: 'm-p-p-t', category: 'solar', difficulty: 'intermediate' },
  { name: 'Passivation Recombination', slug: 'passivation-recombination', category: 'solar', difficulty: 'advanced' },
  { name: 'PV IV Curve', slug: 'p-v-i-v-curve', category: 'solar', difficulty: 'intermediate' },
  { name: 'Screen Printing Metallization', slug: 'screen-printing-metallization', category: 'solar', difficulty: 'intermediate' },
  { name: 'Series Parallel PV', slug: 'series-parallel-p-v', category: 'solar', difficulty: 'intermediate' },
  { name: 'Shunt Series Defects', slug: 'shunt-series-defects', category: 'solar', difficulty: 'intermediate' },
  { name: 'Silicon Texturing', slug: 'silicon-texturing', category: 'solar', difficulty: 'intermediate' },
  { name: 'Solar Temp Coefficient', slug: 'solar-temp-coefficient', category: 'solar', difficulty: 'intermediate' },
  { name: 'Solar Thermal Derating', slug: 'solar-thermal-derating', category: 'solar', difficulty: 'intermediate' },
  { name: 'Solar vs IC Purity', slug: 'solar-vs-i-c-purity', category: 'solar', difficulty: 'intermediate' },
  { name: 'Solar Yield Prediction', slug: 'solar-yield-prediction', category: 'solar', difficulty: 'intermediate' },
  { name: 'Spectral Mismatch', slug: 'spectral-mismatch', category: 'solar', difficulty: 'intermediate' },
  { name: 'Texturing vs Lithography', slug: 'texturing-vs-lithography', category: 'solar', difficulty: 'intermediate' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELON GAMES (38 games)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: 'ELON Constraint Cascade', slug: 'e-l-o-n_-constraint-cascade', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Precision Budget', slug: 'e-l-o-n_-precision-budget', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Grid Balance', slug: 'e-l-o-n_-grid-balance', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Transformer Timeline', slug: 'e-l-o-n_-transformer-timeline', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Interconnect Queue', slug: 'e-l-o-n_-interconnect-queue', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Power Plant Picker', slug: 'e-l-o-n_-power-plant-picker', category: 'elon', difficulty: 'beginner' },
  { name: 'ELON Fuel Delivery', slug: 'e-l-o-n_-fuel-delivery', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Blade Factory', slug: 'e-l-o-n_-blade-factory', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Facility Power', slug: 'e-l-o-n_-facility-power', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Cooling Strategy', slug: 'e-l-o-n_-cooling-strategy', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Uptime Architect', slug: 'e-l-o-n_-uptime-architect', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Solar Manufacturing', slug: 'e-l-o-n_-solar-manufacturing', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Solar Deployment', slug: 'e-l-o-n_-solar-deployment', category: 'elon', difficulty: 'beginner' },
  { name: 'ELON Battery System', slug: 'e-l-o-n_-battery-system', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Ore To Metal', slug: 'e-l-o-n_-ore-to-metal', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Mining Bottleneck', slug: 'e-l-o-n_-mining-bottleneck', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Critical Minerals', slug: 'e-l-o-n_-critical-minerals', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Fab Yield Curve', slug: 'e-l-o-n_-fab-yield-curve', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Chip Supply Web', slug: 'e-l-o-n_-chip-supply-web', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Packaging Limit', slug: 'e-l-o-n_-packaging-limit', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Cluster Comms', slug: 'e-l-o-n_-cluster-comms', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Optical Link', slug: 'e-l-o-n_-optical-link', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Space Comms', slug: 'e-l-o-n_-space-comms', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Orbit Designer', slug: 'e-l-o-n_-orbit-designer', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Radiation Armor', slug: 'e-l-o-n_-radiation-armor', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Space Radiator', slug: 'e-l-o-n_-space-radiator', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Orbital Factory', slug: 'e-l-o-n_-orbital-factory', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Rocket Materials', slug: 'e-l-o-n_-rocket-materials', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON TPS Turnaround', slug: 'e-l-o-n_-t-p-s-turnaround', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Actuator Limits', slug: 'e-l-o-n_-actuator-limits', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Robot Learning', slug: 'e-l-o-n_-robot-learning', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Recursive Bot', slug: 'e-l-o-n_-recursive-bot', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Throughput Cadence', slug: 'e-l-o-n_-throughput-cadence', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Capital Stack', slug: 'e-l-o-n_-capital-stack', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Policy Risk', slug: 'e-l-o-n_-policy-risk', category: 'elon', difficulty: 'intermediate' },
  { name: 'ELON Gigawatt Blueprint', slug: 'e-l-o-n_-gigawatt-blueprint', category: 'elon', difficulty: 'advanced' },
  { name: 'ELON Power Plant Picker', slug: 'e-l-o-n_-power-plant-picker', category: 'elon', difficulty: 'beginner' },
];

// Featured games for quick launch (curated selection)
const featuredSlugs = [
  'pendulum-period', 'wave-interference', 'doppler-effect', 'bernoulli',
  'entropy', 'solar-cell', 'orbital-mechanics', 'faraday-cage',
  'e-l-o-n_-grid-balance', 'tensor-core', 'photolithography', 'buoyancy',
];

// Highlight matching text in search results
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: 'rgba(59,130,246,0.3)', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
};

// Simple fuzzy match: checks if all characters of query appear in order in target
const fuzzyMatch = (query: string, target: string): number => {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  // Exact substring match = highest score
  if (t.includes(q)) return 100;
  // Word-start match (e.g. "rc" matches "RC Time Constant")
  const words = t.split(/[\s\-_]+/);
  const initials = words.map(w => w[0] || '').join('').toLowerCase();
  if (initials.includes(q)) return 80;
  // Fuzzy: all chars appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return 50;
  return 0;
};

const GamesPage: React.FC = () => {
  // Parse URL query params for initial state
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { q: '', cat: null as string | null, diff: null as string | null };
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q') || '',
      cat: params.get('category') || null,
      diff: params.get('difficulty') || null,
    };
  };

  const initial = getInitialParams();
  const [searchQuery, setSearchQuery] = useState(initial.q);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initial.cat);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(initial.diff);
  const searchRef = useRef<HTMLInputElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);
  const [progressMap, setProgressMap] = useState<Map<string, GameRecord>>(new Map());

  // Onboarding redirect
  useEffect(() => {
    if (!isOnboardingComplete()) {
      window.location.href = '/onboarding';
    }
  }, []);

  // Load game progress on mount
  useEffect(() => {
    const records = getAllGameProgress();
    const map = new Map<string, GameRecord>();
    for (const r of records) {
      map.set(r.slug, r);
    }
    setProgressMap(map);
  }, []);

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

  // Sync filters to URL params (without page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  // Auto-focus search on page load
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearchQuery('');
        searchRef.current?.blur();
        setHighlightIndex(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Deduplicate games by slug (in case of duplicates)
  const uniqueGames = useMemo(() => {
    const seen = new Set<string>();
    return games.filter(g => {
      if (seen.has(g.slug)) return false;
      seen.add(g.slug);
      return true;
    });
  }, []);

  // Relevance-ranked, fuzzy search with tag support
  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchesCategory = (game: typeof games[0]) => !selectedCategory || game.category === selectedCategory;
    const matchesDifficulty = (game: typeof games[0]) => !selectedDifficulty || game.difficulty === selectedDifficulty;

    if (!q) {
      return uniqueGames
        .filter(g => matchesCategory(g) && matchesDifficulty(g))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Score each game for relevance
    const scored = uniqueGames
      .filter(g => matchesCategory(g) && matchesDifficulty(g))
      .map(game => {
        const cat = gameCategories[game.category as keyof typeof gameCategories];
        const tags = searchTags[game.slug] || [];
        const tagString = tags.join(' ').toLowerCase();
        // Decode slug for searching (e.g., "m-o-s-f-e-t" → "mosfet")
        const decodedSlug = game.slug.replace(/-/g, '').toLowerCase();

        let score = 0;
        // Exact name match (highest priority)
        if (game.name.toLowerCase() === q) score = 1000;
        // Name starts with query
        else if (game.name.toLowerCase().startsWith(q)) score = 500;
        // Name contains query as substring
        else if (game.name.toLowerCase().includes(q)) score = 400;
        // Decoded slug contains query (handles "mosfet", "gpu", "sram", etc.)
        else if (decodedSlug.includes(q.replace(/[\s\-]/g, ''))) score = 350;
        // Tag exact match
        else if (tags.some(t => t.toLowerCase() === q)) score = 300;
        // Tag substring match
        else if (tagString.includes(q)) score = 250;
        // Category name match
        else if (cat && cat.name.toLowerCase().includes(q)) score = 200;
        // Category description match
        else if (cat && cat.description.toLowerCase().includes(q)) score = 150;
        // Fuzzy match on name
        else {
          const fs = fuzzyMatch(q, game.name);
          if (fs > 0) score = fs;
        }

        return { game, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name));

    return scored.map(s => s.game);
  }, [searchQuery, selectedCategory, selectedDifficulty, uniqueGames]);

  // Reset highlight when results change
  useEffect(() => { setHighlightIndex(-1); }, [filteredGames]);

  // Arrow key navigation through results
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filteredGames.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < filteredGames.length) {
      e.preventDefault();
      window.location.href = `/games/${filteredGames[highlightIndex].slug}`;
    }
  }, [filteredGames, highlightIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('a[data-game-card]');
      cards[highlightIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightIndex]);

  const featuredGames = useMemo(() => {
    return featuredSlugs
      .map(slug => uniqueGames.find(g => g.slug === slug))
      .filter(Boolean) as typeof games;
  }, [uniqueGames]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    uniqueGames.forEach(g => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return counts;
  }, [uniqueGames]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  const isFiltering = searchQuery || selectedCategory || selectedDifficulty;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ─── Sticky Header ─── */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        background: `${colors.bgPrimary}ee`,
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px',
            background: `linear-gradient(135deg, ${colors.accent}, #8B5CF6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            🎓
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary }}>Atlas Coach</span>
        </a>
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="/paths" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>Learning Paths</a>
          <a href="/progress" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>My Progress</a>
          <a href="/build" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '14px' }}>Build</a>
          <button style={{
            background: colors.accent, color: 'white', border: 'none',
            padding: '8px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          }}>
            Sign In
          </button>
        </nav>
      </header>

      {/* ─── Hero + Search ─── */}
      <section style={{ padding: '40px 24px 24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          {uniqueGames.length}+ Interactive Games
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '28px' }}>
          Master complex concepts through hands-on simulations
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            color: colors.textMuted, fontSize: '18px', pointerEvents: 'none',
          }}>
            🔍
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder={`Search ${uniqueGames.length} games... (name, topic, or keyword)`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              width: '100%', padding: '16px 100px 16px 44px',
              borderRadius: '14px', border: `2px solid ${searchQuery ? colors.accent : colors.border}`,
              background: colors.bgCard, color: colors.textPrimary, fontSize: '16px', outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
            onBlur={(e) => { if (!searchQuery) e.currentTarget.style.borderColor = colors.border; }}
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
              style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: colors.border, color: colors.textSecondary, border: 'none',
                borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
              }}
            >
              Clear
            </button>
          ) : (
            <span style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              color: colors.textMuted, fontSize: '12px', background: colors.border,
              padding: '3px 8px', borderRadius: '5px', fontFamily: 'monospace',
            }}>
              Ctrl+K
            </span>
          )}
        </div>
      </section>

      {/* ─── Quick Launch (only when not filtering) ─── */}
      {!isFiltering && (
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: colors.textSecondary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B' }}>⚡</span> Quick Launch
          </h2>
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
            scrollbarWidth: 'thin',
          }}>
            {featuredGames.map((game) => {
              const category = gameCategories[game.category as keyof typeof gameCategories];
              return (
                <a
                  key={game.slug}
                  href={`/games/${game.slug}`}
                  style={{
                    flexShrink: 0, padding: '10px 16px', borderRadius: '10px',
                    background: `${category.color}15`, border: `1px solid ${category.color}44`,
                    textDecoration: 'none', color: 'inherit', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${category.color}30`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${category.color}15`;
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{category.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>{game.name}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Filters ─── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
        {/* Category filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '6px 14px', borderRadius: '100px',
              border: `1px solid ${!selectedCategory ? colors.accent : colors.border}`,
              background: !selectedCategory ? colors.accent : 'transparent',
              color: !selectedCategory ? 'white' : colors.textSecondary,
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            All ({uniqueGames.length})
          </button>
          {Object.entries(gameCategories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
              style={{
                padding: '6px 12px', borderRadius: '100px',
                border: `1px solid ${selectedCategory === key ? cat.color : colors.border}`,
                background: selectedCategory === key ? `${cat.color}22` : 'transparent',
                color: selectedCategory === key ? cat.color : colors.textSecondary,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              {cat.icon} {cat.name} <span style={{ opacity: 0.6 }}>({categoryCounts[key] || 0})</span>
            </button>
          ))}
        </div>

        {/* Difficulty filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['beginner', 'intermediate', 'advanced'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff === selectedDifficulty ? null : diff)}
              style={{
                padding: '5px 12px', borderRadius: '6px',
                border: `1px solid ${selectedDifficulty === diff ? getDifficultyColor(diff) : colors.border}`,
                background: selectedDifficulty === diff ? `${getDifficultyColor(diff)}22` : 'transparent',
                color: selectedDifficulty === diff ? getDifficultyColor(diff) : colors.textMuted,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {diff}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Games Grid ─── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>
            {searchQuery ? (
              <>Found <strong style={{ color: colors.textSecondary }}>{filteredGames.length}</strong> result{filteredGames.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</>
            ) : (
              <>Showing {filteredGames.length} of {uniqueGames.length} games</>
            )}
          </p>
          {highlightIndex >= 0 && filteredGames[highlightIndex] && (
            <span style={{ color: colors.textMuted, fontSize: '12px' }}>
              Press Enter to open <strong style={{ color: colors.textSecondary }}>{filteredGames[highlightIndex].name}</strong>
            </span>
          )}
        </div>

        {filteredGames.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No games found</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '20px' }}>
              Try a different search term or clear your filters
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedDifficulty(null); }}
              style={{
                background: colors.accent, color: 'white', border: 'none',
                padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredGames.map((game, idx) => {
              const category = gameCategories[game.category as keyof typeof gameCategories];
              const isHighlighted = idx === highlightIndex;
              const tags = searchTags[game.slug];
              const matchedTag = searchQuery && tags
                ? tags.find(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
                : null;
              return (
                <a
                  key={game.slug}
                  href={`/games/${game.slug}`}
                  data-game-card
                  style={{
                    background: isHighlighted ? `${category.color}18` : colors.bgCard,
                    borderRadius: '10px', padding: '16px',
                    border: `1px solid ${isHighlighted ? category.color : colors.border}`,
                    textDecoration: 'none',
                    color: 'inherit', transition: 'all 0.15s', display: 'block',
                    outline: isHighlighted ? `2px solid ${category.color}` : 'none',
                    outlineOffset: '-1px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = category.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    setHighlightIndex(idx);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px',
                  }}>
                    <span style={{ fontSize: '20px' }}>{category.icon}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, color: getDifficultyColor(game.difficulty),
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {game.difficulty}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', lineHeight: '1.3' }}>
                    {searchQuery ? highlightText(game.name, searchQuery) : game.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                    {category.name}
                    {matchedTag && (
                      <span style={{ marginLeft: '6px', color: colors.accent, fontSize: '11px' }}>
                        — {matchedTag}
                      </span>
                    )}
                  </p>
                  {/* Progress badges */}
                  {(() => {
                    const progress = progressMap.get(game.slug);
                    if (!progress) return null;
                    return (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                        {progress.completedAt !== null && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#10B981', color: 'white', fontSize: '11px', fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            &#10003;
                          </span>
                        )}
                        {progress.testScore !== null && progress.testTotal !== null && progress.testTotal > 0 && (
                          <span style={{
                            fontSize: '11px', fontWeight: 600, color: 'white',
                            background: colors.accent, borderRadius: '100px',
                            padding: '2px 8px', lineHeight: '1.4',
                          }}>
                            {Math.round((progress.testScore / progress.testTotal) * 100)}%
                          </span>
                        )}
                        {progress.completedAt === null && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', color: '#F59E0B',
                          }}>
                            <span style={{
                              display: 'inline-block', width: '8px', height: '8px',
                              borderRadius: '50%', background: '#F59E0B', flexShrink: 0,
                            }} />
                            In Progress
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── CTA ─── */}
      <section style={{
        textAlign: 'center', padding: '48px 24px', background: colors.bgSecondary,
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px' }}>
          Unlock all {uniqueGames.length}+ games
        </h2>
        <p style={{ color: colors.textSecondary, marginBottom: '20px', fontSize: '15px' }}>
          Start with 15 free games, or upgrade for unlimited access
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/pricing" style={{
            background: colors.accent, color: 'white', padding: '12px 28px',
            borderRadius: '10px', fontWeight: 600, textDecoration: 'none', fontSize: '14px',
          }}>
            View Pricing
          </a>
          <button style={{
            background: 'transparent', color: colors.textPrimary, padding: '12px 28px',
            borderRadius: '10px', fontWeight: 600, border: `1px solid ${colors.border}`,
            cursor: 'pointer', fontSize: '14px',
          }}>
            Start Free Trial
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.textMuted, fontSize: '13px' }}>
          © 2025 Atlas Coach. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default GamesPage;
