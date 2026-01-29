
import React, { useState } from 'react';

interface SmartDashboardProps {
  topic: string;
  keyPoints: string[];
  level?: string;
  onTestDiagram?: (type: string) => void;
}

// Game quality tiers based on code audit
const gameTiers = {
  // TIER 1: Gold Standard - marked as gold standard, correct format, comprehensive
  gold: [
    { id: 'coriolis_effect', name: 'Coriolis Effect', icon: '🌀', color: 'from-amber-500 to-yellow-400' },
    { id: 'p_waves_s_waves', name: 'P-Waves vs S-Waves', icon: '🌊', color: 'from-amber-500 to-yellow-400' },
    { id: 'convection', name: 'Convection', icon: '🔥', color: 'from-amber-500 to-yellow-400' },
    { id: 'venturi_effect', name: 'Venturi Effect', icon: '💨', color: 'from-amber-500 to-yellow-400' },
    { id: 'damped_oscillations', name: 'Damped Oscillations', icon: '📉', color: 'from-amber-500 to-yellow-400' },
    { id: 'elastic_potential_energy', name: 'Elastic Energy', icon: '🎯', color: 'from-amber-500 to-yellow-400' },
    { id: 'electric_field', name: 'Electric Field', icon: '⚡', color: 'from-amber-500 to-yellow-400' },
    { id: 'electric_potential', name: 'Electric Potential', icon: '🔋', color: 'from-amber-500 to-yellow-400' },
    { id: 'forced_oscillations', name: 'Forced Oscillations', icon: '〰️', color: 'from-amber-500 to-yellow-400' },
    { id: 'inelastic_collisions', name: 'Inelastic Collisions', icon: '💥', color: 'from-amber-500 to-yellow-400' },
    { id: 'kinetic_theory_gases', name: 'Kinetic Theory', icon: '🎱', color: 'from-amber-500 to-yellow-400' },
    { id: 'latent_heat', name: 'Latent Heat', icon: '🧊', color: 'from-amber-500 to-yellow-400' },
    { id: 'pascal_law', name: "Pascal's Law", icon: '⬇️', color: 'from-amber-500 to-yellow-400' },
    { id: 'thermal_expansion', name: 'Thermal Expansion', icon: '📏', color: 'from-amber-500 to-yellow-400' },
  ],

  // TIER 2: Premium - correct format, large files (>80KB), well-tested
  premium: [
    { id: 'wave_particle_duality', name: 'Wave-Particle Duality', icon: '🌟', color: 'from-violet-600 to-purple-500' },
    { id: 'coulombs_law', name: "Coulomb's Law", icon: '⚡', color: 'from-violet-600 to-purple-500' },
    { id: 'photoelectric_effect', name: 'Photoelectric Effect', icon: '💡', color: 'from-violet-600 to-purple-500' },
    { id: 'pendulum_period', name: 'Pendulum Period', icon: '🕰️', color: 'from-violet-600 to-purple-500' },
    { id: 'projectile_independence', name: 'Projectile Motion', icon: '🎯', color: 'from-violet-600 to-purple-500' },
    { id: 'non_newtonian_armor', name: 'Non-Newtonian Armor', icon: '🛡️', color: 'from-violet-600 to-purple-500' },
    { id: 'shear_thinning', name: 'Shear Thinning', icon: '🫗', color: 'from-violet-600 to-purple-500' },
    { id: 'oersted_experiment', name: 'Oersted Experiment', icon: '🧭', color: 'from-violet-600 to-purple-500' },
    { id: 'homopolar_motor', name: 'Homopolar Motor', icon: '🔄', color: 'from-violet-600 to-purple-500' },
    { id: 'classic_dc_motor', name: 'DC Motor', icon: '⚙️', color: 'from-violet-600 to-purple-500' },
    { id: 'doppler_effect', name: 'Doppler Effect', icon: '🚂', color: 'from-violet-600 to-purple-500' },
    { id: 'total_internal_reflection', name: 'Total Internal Reflection', icon: '💎', color: 'from-violet-600 to-purple-500' },
    { id: 'rayleigh_mie_scattering', name: 'Rayleigh Scattering', icon: '🌅', color: 'from-violet-600 to-purple-500' },
    { id: 'diffraction', name: 'Diffraction', icon: '🌈', color: 'from-violet-600 to-purple-500' },
    { id: 'dispersion', name: 'Dispersion', icon: '🔻', color: 'from-violet-600 to-purple-500' },
    { id: 'viscosity_temperature', name: 'Viscosity & Temp', icon: '🌡️', color: 'from-violet-600 to-purple-500' },
    { id: 'work_power', name: 'Work & Power', icon: '💪', color: 'from-violet-600 to-purple-500' },
    { id: 'phase_change_energy', name: 'Phase Change', icon: '❄️', color: 'from-violet-600 to-purple-500' },
  ],

  // TIER 3: Good - correct format, complete, well-structured
  good: [
    { id: 'static_kinetic_friction', name: 'Static vs Kinetic Friction', icon: '🧱', color: 'from-emerald-600 to-green-500' },
    { id: 'inclined_plane', name: 'Inclined Plane', icon: '📐', color: 'from-emerald-600 to-green-500' },
    { id: 'momentum_conservation', name: 'Momentum Conservation', icon: '🎱', color: 'from-emerald-600 to-green-500' },
    { id: 'center_of_mass', name: 'Center of Mass', icon: '⚖️', color: 'from-emerald-600 to-green-500' },
    { id: 'torque', name: 'Torque', icon: '🔧', color: 'from-emerald-600 to-green-500' },
    { id: 'inertia', name: 'Inertia', icon: '🪙', color: 'from-emerald-600 to-green-500' },
    { id: 'newtons_third_law', name: "Newton's 3rd Law", icon: '↔️', color: 'from-emerald-600 to-green-500' },
    { id: 'energy_conservation', name: 'Energy Conservation', icon: '♻️', color: 'from-emerald-600 to-green-500' },
    { id: 'standing_waves', name: 'Standing Waves', icon: '🎸', color: 'from-emerald-600 to-green-500' },
    { id: 'resonance', name: 'Resonance', icon: '🔔', color: 'from-emerald-600 to-green-500' },
    { id: 'beats', name: 'Beats', icon: '🎵', color: 'from-emerald-600 to-green-500' },
    { id: 'wave_speed_tension', name: 'Wave Speed & Tension', icon: '🎻', color: 'from-emerald-600 to-green-500' },
    { id: 'echo_time_of_flight', name: 'Echo & Time of Flight', icon: '📡', color: 'from-emerald-600 to-green-500' },
    { id: 'diffusion_convection', name: 'Diffusion vs Convection', icon: '💨', color: 'from-emerald-600 to-green-500' },
    { id: 'law_of_reflection', name: 'Law of Reflection', icon: '🪞', color: 'from-emerald-600 to-green-500' },
    { id: 'lens_focusing', name: 'Lens Focusing', icon: '🔍', color: 'from-emerald-600 to-green-500' },
    { id: 'refraction', name: 'Refraction', icon: '🥤', color: 'from-emerald-600 to-green-500' },
    { id: 'snells_law', name: "Snell's Law", icon: '📊', color: 'from-emerald-600 to-green-500' },
    { id: 'thin_film_interference', name: 'Thin Film', icon: '🫧', color: 'from-emerald-600 to-green-500' },
    { id: 'polarization', name: 'Polarization', icon: '🕶️', color: 'from-emerald-600 to-green-500' },
    { id: 'brewster_angle', name: 'Brewster Angle', icon: '☀️', color: 'from-emerald-600 to-green-500' },
    { id: 'camera_obscura', name: 'Camera Obscura', icon: '📷', color: 'from-emerald-600 to-green-500' },
    { id: 'chromatic_aberration', name: 'Chromatic Aberration', icon: '🌈', color: 'from-emerald-600 to-green-500' },
    { id: 'fluorescence', name: 'Fluorescence', icon: '✨', color: 'from-emerald-600 to-green-500' },
    { id: 'buoyancy', name: 'Buoyancy', icon: '🚢', color: 'from-emerald-600 to-green-500' },
    { id: 'bernoulli', name: 'Bernoulli Principle', icon: '✈️', color: 'from-emerald-600 to-green-500' },
    { id: 'cartesian_diver', name: 'Cartesian Diver', icon: '🤿', color: 'from-emerald-600 to-green-500' },
    { id: 'heat_transfer_capacity', name: 'Heat Capacity', icon: '🔥', color: 'from-emerald-600 to-green-500' },
    { id: 'centripetal_force', name: 'Centripetal Force', icon: '🎡', color: 'from-emerald-600 to-green-500' },
    { id: 'angular_momentum', name: 'Angular Momentum', icon: '🌀', color: 'from-emerald-600 to-green-500' },
    { id: 'gyroscope_stability', name: 'Gyroscope Stability', icon: '🔄', color: 'from-emerald-600 to-green-500' },
  ],

  // TIER 4: Standard - correct format, functional
  standard: [
    { id: 'laminar_turbulent', name: 'Laminar vs Turbulent', icon: '🌊', color: 'from-blue-600 to-cyan-500' },
    { id: 'make_microphone', name: 'Make a Microphone', icon: '🎤', color: 'from-blue-600 to-cyan-500' },
    { id: 'bimetal_thermostat', name: 'Bimetal Thermostat', icon: '🌡️', color: 'from-blue-600 to-cyan-500' },
    { id: 'newton_cooling', name: 'Newton Cooling', icon: '❄️', color: 'from-blue-600 to-cyan-500' },
    { id: 'inductive_kickback', name: 'Inductive Kickback', icon: '⚡', color: 'from-blue-600 to-cyan-500' },
    { id: 'minimal_surfaces', name: 'Minimal Surfaces', icon: '🫧', color: 'from-blue-600 to-cyan-500' },
    { id: 'carnot_cycle', name: 'Carnot Cycle', icon: '🔄', color: 'from-blue-600 to-cyan-500' },
    { id: 'cloud_in_bottle', name: 'Cloud in Bottle', icon: '☁️', color: 'from-blue-600 to-cyan-500' },
    { id: 'two_ball_collision', name: 'Two Ball Collision', icon: '🎱', color: 'from-blue-600 to-cyan-500' },
    { id: 'droplet_breakup', name: 'Droplet Breakup', icon: '💧', color: 'from-blue-600 to-cyan-500' },
    { id: 'cavitation', name: 'Cavitation', icon: '🫧', color: 'from-blue-600 to-cyan-500' },
    { id: 'kirchhoffs_laws', name: "Kirchhoff's Laws", icon: '🔌', color: 'from-blue-600 to-cyan-500' },
    { id: 'laser_speckle', name: 'Laser Speckle', icon: '🔴', color: 'from-blue-600 to-cyan-500' },
    { id: 'jar_lid_expansion', name: 'Jar Lid Expansion', icon: '🫙', color: 'from-blue-600 to-cyan-500' },
    { id: 'hydrostatic_pressure', name: 'Hydrostatic Pressure', icon: '💧', color: 'from-blue-600 to-cyan-500' },
    { id: 'electromagnetic_induction', name: 'EM Induction', icon: '🧲', color: 'from-blue-600 to-cyan-500' },
    { id: 'entropy', name: 'Entropy', icon: '🎲', color: 'from-blue-600 to-cyan-500' },
    { id: 'magnetic_field', name: 'Magnetic Field', icon: '🧲', color: 'from-blue-600 to-cyan-500' },
    { id: 'reaction_time', name: 'Reaction Time', icon: '⏱️', color: 'from-blue-600 to-cyan-500' },
    { id: 'rolling_vs_sliding', name: 'Rolling vs Sliding', icon: '🛞', color: 'from-blue-600 to-cyan-500' },
    { id: 'siphon', name: 'Siphon', icon: '🚰', color: 'from-blue-600 to-cyan-500' },
    { id: 'shower_curtain', name: 'Shower Curtain Effect', icon: '🚿', color: 'from-blue-600 to-cyan-500' },
    { id: 'water_hammer', name: 'Water Hammer', icon: '🔨', color: 'from-blue-600 to-cyan-500' },
    { id: 'soap_boat', name: 'Soap Boat', icon: '🛥️', color: 'from-blue-600 to-cyan-500' },
    { id: 'speed_of_sound', name: 'Speed of Sound', icon: '🔊', color: 'from-blue-600 to-cyan-500' },
    { id: 'hookes_law', name: "Hooke's Law", icon: '🧵', color: 'from-blue-600 to-cyan-500' },
    { id: 'egg_drop', name: 'Egg Drop', icon: '🥚', color: 'from-blue-600 to-cyan-500' },
    { id: 'helium_balloon_car', name: 'Helium Balloon Car', icon: '🎈', color: 'from-blue-600 to-cyan-500' },
    { id: 'capillary_action', name: 'Capillary Action', icon: '🌱', color: 'from-blue-600 to-cyan-500' },
  ],

  // TIER 5: Functional - working but simpler or smaller
  functional: [
    { id: 'poisson_ratio', name: 'Poisson Ratio', icon: '📊', color: 'from-slate-500 to-gray-400' },
    { id: 'supercooling', name: 'Supercooling', icon: '🧊', color: 'from-slate-500 to-gray-400' },
    { id: 'leidenfrost', name: 'Leidenfrost Effect', icon: '💧', color: 'from-slate-500 to-gray-400' },
    { id: 'straw_instrument', name: 'Straw Instrument', icon: '🎺', color: 'from-slate-500 to-gray-400' },
    { id: 'depth_of_field', name: 'Depth of Field', icon: '📸', color: 'from-slate-500 to-gray-400' },
    { id: 'endothermic_exothermic', name: 'Endo vs Exothermic', icon: '🔥', color: 'from-slate-500 to-gray-400' },
    { id: 'polarized_sky', name: 'Polarized Sky', icon: '🌤️', color: 'from-slate-500 to-gray-400' },
    { id: 'adiabatic_heating', name: 'Adiabatic Heating', icon: '🌡️', color: 'from-slate-500 to-gray-400' },
    { id: 'boiling_pressure', name: 'Boiling & Pressure', icon: '♨️', color: 'from-slate-500 to-gray-400' },
    { id: 'buckling', name: 'Buckling', icon: '📏', color: 'from-slate-500 to-gray-400' },
    { id: 'thermal_contact', name: 'Thermal Contact', icon: '🤝', color: 'from-slate-500 to-gray-400' },
    { id: 'tidal_forces', name: 'Tidal Forces', icon: '🌙', color: 'from-slate-500 to-gray-400' },
    { id: 'tuned_mass_damper', name: 'Tuned Mass Damper', icon: '🏢', color: 'from-slate-500 to-gray-400' },
    { id: 'vortex_rings', name: 'Vortex Rings', icon: '💨', color: 'from-slate-500 to-gray-400' },
    { id: 'terminal_velocity', name: 'Terminal Velocity', icon: '🪂', color: 'from-slate-500 to-gray-400' },
    { id: 'rolling_race', name: 'Rolling Race', icon: '🏁', color: 'from-slate-500 to-gray-400' },
    { id: 'tipping_point', name: 'Tipping Point', icon: '⚖️', color: 'from-slate-500 to-gray-400' },
    { id: 'sound_interference', name: 'Sound Interference', icon: '🔇', color: 'from-slate-500 to-gray-400' },
    { id: 'direction_finding', name: 'Direction Finding', icon: '🧭', color: 'from-slate-500 to-gray-400' },
    { id: 'reverberation', name: 'Reverberation', icon: '🔊', color: 'from-slate-500 to-gray-400' },
    { id: 'superhydrophobic', name: 'Superhydrophobic', icon: '💧', color: 'from-slate-500 to-gray-400' },
    { id: 'power_loss', name: 'Power Loss', icon: '📉', color: 'from-slate-500 to-gray-400' },
    { id: 'solar_cell', name: 'Solar Cell', icon: '☀️', color: 'from-slate-500 to-gray-400' },
    { id: 'viscoelasticity', name: 'Viscoelasticity', icon: '🫠', color: 'from-slate-500 to-gray-400' },
    { id: 'brownian_motion', name: 'Brownian Motion', icon: '🔬', color: 'from-slate-500 to-gray-400' },
    { id: 'stable_levitation', name: 'Stable Levitation', icon: '🎈', color: 'from-slate-500 to-gray-400' },
    { id: 'evaporative_cooling', name: 'Evaporative Cooling', icon: '💨', color: 'from-slate-500 to-gray-400' },
    { id: 'hand_warmer', name: 'Hand Warmer', icon: '🤲', color: 'from-slate-500 to-gray-400' },
    { id: 'induction_heating', name: 'Induction Heating', icon: '🔥', color: 'from-slate-500 to-gray-400' },
    { id: 'faraday_cage', name: 'Faraday Cage', icon: '🛡️', color: 'from-slate-500 to-gray-400' },
    { id: 'electromagnet', name: 'Electromagnet', icon: '🧲', color: 'from-slate-500 to-gray-400' },
    { id: 'floating_paperclip', name: 'Floating Paperclip', icon: '📎', color: 'from-slate-500 to-gray-400' },
    { id: 'fracture_mechanics', name: 'Fracture Mechanics', icon: '💔', color: 'from-slate-500 to-gray-400' },
    { id: 'phone_seismometer', name: 'Phone Seismometer', icon: '📱', color: 'from-slate-500 to-gray-400' },
    { id: 'infrared_emissivity', name: 'Infrared Emissivity', icon: '🌡️', color: 'from-slate-500 to-gray-400' },
    { id: 'lift_force', name: 'Lift Force', icon: '✈️', color: 'from-slate-500 to-gray-400' },
    { id: 'magnetic_mapping', name: 'Magnetic Mapping', icon: '🗺️', color: 'from-slate-500 to-gray-400' },
    { id: 'microwave_standing_wave', name: 'Microwave Waves', icon: '📻', color: 'from-slate-500 to-gray-400' },
    { id: 'orbital_mechanics', name: 'Orbital Mechanics', icon: '🛰️', color: 'from-slate-500 to-gray-400' },
    { id: 'capacitive_touch', name: 'Capacitive Touch', icon: '👆', color: 'from-slate-500 to-gray-400' },
    { id: 'transformer', name: 'Transformer', icon: '🔌', color: 'from-slate-500 to-gray-400' },
  ],

  // TIER 6: Advanced Demos - interesting but specialized
  advanced: [
    { id: 'bottle_tornado', name: 'Bottle Tornado', icon: '🌪️', color: 'from-indigo-500 to-blue-400' },
    { id: 'ballistic_pendulum', name: 'Ballistic Pendulum', icon: '🎯', color: 'from-indigo-500 to-blue-400' },
    { id: 'brachistochrone', name: 'Brachistochrone', icon: '⏱️', color: 'from-indigo-500 to-blue-400' },
    { id: 'chain_fountain', name: 'Chain Fountain', icon: '⛓️', color: 'from-indigo-500 to-blue-400' },
    { id: 'chladni_patterns', name: 'Chladni Patterns', icon: '🔊', color: 'from-indigo-500 to-blue-400' },
    { id: 'coupled_pendulums', name: 'Coupled Pendulums', icon: '🕰️', color: 'from-indigo-500 to-blue-400' },
    { id: 'cycloid_motion', name: 'Cycloid Motion', icon: '🎡', color: 'from-indigo-500 to-blue-400' },
    { id: 'hydraulic_jump', name: 'Hydraulic Jump', icon: '🌊', color: 'from-indigo-500 to-blue-400' },
    { id: 'karman_vortex', name: 'Kármán Vortex', icon: '🌀', color: 'from-indigo-500 to-blue-400' },
    { id: 'marangoni_tears', name: 'Marangoni Tears', icon: '🍷', color: 'from-indigo-500 to-blue-400' },
    { id: 'metronome_sync', name: 'Metronome Sync', icon: '🎼', color: 'from-indigo-500 to-blue-400' },
    { id: 'moire_patterns', name: 'Moiré Patterns', icon: '🔲', color: 'from-indigo-500 to-blue-400' },
    { id: 'rattleback', name: 'Rattleback', icon: '🪨', color: 'from-indigo-500 to-blue-400' },
    { id: 'retroreflection', name: 'Retroreflection', icon: '🔙', color: 'from-indigo-500 to-blue-400' },
    { id: 'rolling_shutter', name: 'Rolling Shutter', icon: '📹', color: 'from-indigo-500 to-blue-400' },
    { id: 'sleeping_top', name: 'Sleeping Top', icon: '🎠', color: 'from-indigo-500 to-blue-400' },
    { id: 'stick_slip', name: 'Stick-Slip', icon: '🎻', color: 'from-indigo-500 to-blue-400' },
    { id: 'swing_pumping', name: 'Swing Pumping', icon: '🎢', color: 'from-indigo-500 to-blue-400' },
    { id: 'tape_birefringence', name: 'Tape Birefringence', icon: '📼', color: 'from-indigo-500 to-blue-400' },
    { id: 'wagon_wheel_aliasing', name: 'Wagon Wheel Effect', icon: '🎬', color: 'from-indigo-500 to-blue-400' },
    { id: 'photoelasticity', name: 'Photoelasticity', icon: '🔬', color: 'from-indigo-500 to-blue-400' },
  ],

  // TIER 7: Legacy Format - need test format update
  legacy: [
    { id: 'circuits', name: 'Circuits (Ohm\'s Law)', icon: '🔌', color: 'from-orange-500 to-red-400' },
    { id: 'antenna_polarization', name: 'Antenna Polarization', icon: '📡', color: 'from-orange-500 to-red-400' },
    { id: 'wireless_charging', name: 'Wireless Charging', icon: '🔋', color: 'from-orange-500 to-red-400' },
    { id: 'gas_laws', name: 'Gas Laws', icon: '💨', color: 'from-orange-500 to-red-400' },
    { id: 'static_electricity', name: 'Static Electricity', icon: '⚡', color: 'from-orange-500 to-red-400' },
    { id: 'rc_time_constant', name: 'RC Time Constant', icon: '⏱️', color: 'from-orange-500 to-red-400' },
    { id: 'eddy_currents', name: 'Eddy Currents', icon: '🌀', color: 'from-orange-500 to-red-400' },
    { id: 'electric_field_mapping', name: 'Field Mapping', icon: '🗺️', color: 'from-orange-500 to-red-400' },
    { id: 'convection_currents', name: 'Convection Currents', icon: '♨️', color: 'from-orange-500 to-red-400' },
    { id: 'wave_interference', name: 'Wave Interference', icon: '🌊', color: 'from-orange-500 to-red-400' },
    { id: 'damping', name: 'Damping', icon: '📉', color: 'from-orange-500 to-red-400' },
    { id: 'drag_force', name: 'Drag Force', icon: '💨', color: 'from-orange-500 to-red-400' },
    { id: 'angular_momentum_transfer', name: 'Angular Transfer', icon: '🔄', color: 'from-orange-500 to-red-400' },
    { id: 'gyroscopic_precession', name: 'Gyro Precession', icon: '🎡', color: 'from-orange-500 to-red-400' },
    { id: 'magnus_effect', name: 'Magnus Effect', icon: '⚽', color: 'from-orange-500 to-red-400' },
    { id: 'moment_of_inertia', name: 'Moment of Inertia', icon: '🎯', color: 'from-orange-500 to-red-400' },
    { id: 'precession_nutation', name: 'Precession & Nutation', icon: '🌍', color: 'from-orange-500 to-red-400' },
    { id: 'tidal_locking', name: 'Tidal Locking', icon: '🌙', color: 'from-orange-500 to-red-400' },
    { id: 'molecular_orbitals', name: 'Molecular Orbitals', icon: '⚛️', color: 'from-orange-500 to-red-400' },
    { id: 'speaker_principle', name: 'Speaker Principle', icon: '🔊', color: 'from-orange-500 to-red-400' },
    { id: 'lc_resonance', name: 'LC Resonance', icon: '📻', color: 'from-orange-500 to-red-400' },
    { id: 'eddy_current_pendulum', name: 'Eddy Pendulum', icon: '🕰️', color: 'from-orange-500 to-red-400' },
  ],
};

const tierLabels: Record<string, { title: string; description: string; badge: string }> = {
  gold: { title: '⭐ Gold Standard', description: 'Verified, comprehensive, gold-standard implementation', badge: 'BEST' },
  premium: { title: '💎 Premium', description: 'Large, well-tested, professional quality', badge: 'PREMIUM' },
  good: { title: '✅ Good', description: 'Correct format, complete, well-structured', badge: 'GOOD' },
  standard: { title: '📘 Standard', description: 'Functional and complete', badge: 'STANDARD' },
  functional: { title: '📗 Functional', description: 'Working simpler implementations', badge: 'OK' },
  advanced: { title: '🔬 Advanced Demos', description: 'Specialized physics demonstrations', badge: 'DEMO' },
  legacy: { title: '⚠️ Legacy Format', description: 'Working but needs test format update', badge: 'LEGACY' },
};

const SmartDashboard: React.FC<SmartDashboardProps> = ({ topic, keyPoints, level = "Analyzing...", onTestDiagram }) => {
  const [expandedTier, setExpandedTier] = useState<string | null>('gold');

  const GameButton: React.FC<{ game: typeof gameTiers.gold[0]; tier: string }> = ({ game, tier }) => (
    <button
      onClick={() => onTestDiagram?.(game.id)}
      className={`group relative px-3 py-2 bg-gradient-to-r ${game.color} hover:scale-105 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5`}
      title={game.name}
    >
      <span className="text-sm">{game.icon}</span>
      <span className="truncate max-w-[120px]">{game.name}</span>
    </button>
  );

  const TierSection: React.FC<{ tierId: string; games: typeof gameTiers.gold }> = ({ tierId, games }) => {
    const tierInfo = tierLabels[tierId];
    const isExpanded = expandedTier === tierId;

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setExpandedTier(isExpanded ? null : tierId)}
          className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">{tierInfo.title}</span>
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              tierId === 'gold' ? 'bg-amber-100 text-amber-700' :
              tierId === 'premium' ? 'bg-violet-100 text-violet-700' :
              tierId === 'good' ? 'bg-emerald-100 text-emerald-700' :
              tierId === 'legacy' ? 'bg-orange-100 text-orange-700' :
              'bg-slate-200 text-slate-600'
            }`}>
              {games.length} GAMES
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:block">{tierInfo.description}</span>
            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400`}></i>
          </div>
        </button>
        {isExpanded && (
          <div className="p-4 flex flex-wrap gap-2">
            {games.map((game) => (
              <GameButton key={game.id} game={game} tier={tierId} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      <div className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
            Current Focus
          </div>
          <div className="h-[1px] flex-1 bg-slate-100"></div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <i className="fa-solid fa-signal text-indigo-400"></i> Mastery: {level}
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-6 leading-tight tracking-tight">
          {topic}
        </h1>

        {/* Key Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {keyPoints.map((point, i) => (
            <div key={i} className="group p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-lg">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-indigo-600 font-serif font-bold italic text-sm">
                {i + 1}
              </div>
              <p className="text-base text-slate-700 leading-relaxed font-medium">
                {point}
              </p>
            </div>
          ))}
        </div>

        {/* Interactive Lessons - All Games Ranked */}
        {onTestDiagram && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <i className="fa-solid fa-rocket text-indigo-500 text-xl"></i>
              <h2 className="text-xl font-bold text-slate-800">Interactive Physics Lessons</h2>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                {Object.values(gameTiers).flat().length} TOTAL
              </span>
            </div>

            <TierSection tierId="gold" games={gameTiers.gold} />
            <TierSection tierId="premium" games={gameTiers.premium} />
            <TierSection tierId="good" games={gameTiers.good} />
            <TierSection tierId="standard" games={gameTiers.standard} />
            <TierSection tierId="functional" games={gameTiers.functional} />
            <TierSection tierId="advanced" games={gameTiers.advanced} />
            <TierSection tierId="legacy" games={gameTiers.legacy} />
          </div>
        )}

        {/* AI Insight Card */}
        <div className="mt-8 p-6 bg-indigo-600 rounded-2xl text-white shadow-xl flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold mb-1">Coaching Insight</h3>
            <p className="text-indigo-100 leading-relaxed text-sm">
              Atlas is analyzing your progress. Start with ⭐ Gold Standard games for the best learning experience,
              or explore 💎 Premium games for advanced topics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartDashboard;
