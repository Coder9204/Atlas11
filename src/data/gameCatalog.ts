/**
 * GAME CATALOG — Enriched game metadata with concepts, prerequisites, and tags.
 *
 * Derives from the gameCategories.ts subcategory groupings and the GamesPage
 * game list. Concepts and prerequisites are auto-derived from category/subcategory
 * relationships; games earlier in a subcategory are prerequisites for later ones.
 */

import { gameCategories, type Category } from './gameCategories';

// ============================================================
// TYPES
// ============================================================

export interface GameMeta {
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concepts: string[];
  prerequisites: string[];
  estimatedMinutes: number;
  tags: string[];
}

// ============================================================
// SLUG CONVERSION — match the router's PascalCase→slug convention
// ============================================================

function pascalToSlug(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

// ============================================================
// CONCEPT DERIVATION — maps subcategory names to concept keywords
// ============================================================

const subcategoryConcepts: Record<string, string[]> = {
  'Forces & Motion': ['force', 'acceleration', 'Newton\'s laws'],
  'Momentum & Collisions': ['momentum', 'conservation of momentum', 'collision'],
  'Energy': ['kinetic energy', 'potential energy', 'energy conservation'],
  'Rotational Motion': ['angular velocity', 'torque', 'moment of inertia'],
  'Projectiles & Kinematics': ['projectile motion', 'kinematics', 'trajectory'],
  'Center of Mass': ['center of mass', 'equilibrium', 'stability'],
  'Pendulums': ['simple harmonic motion', 'period', 'oscillation'],
  'Oscillations': ['damping', 'resonance', 'frequency'],
  'Sound Waves': ['sound', 'frequency', 'wave propagation'],
  'Wave Physics': ['wavelength', 'interference', 'superposition'],
  'Vibration Damping': ['vibration', 'damping', 'resonance control'],
  'Flow Types': ['flow regime', 'Reynolds number', 'turbulence'],
  'Pressure': ['pressure', 'fluid dynamics', 'Bernoulli\'s principle'],
  'Buoyancy': ['buoyancy', 'Archimedes\' principle', 'density'],
  'Surface Effects': ['surface tension', 'capillarity', 'wetting'],
  'Viscosity': ['viscosity', 'shear stress', 'non-Newtonian fluid'],
  'Special Phenomena': ['fluid phenomenon', 'vortex', 'instability'],
  'Heat Transfer': ['conduction', 'convection', 'heat transfer'],
  'Phase Changes': ['phase transition', 'latent heat', 'boiling point'],
  'Thermal Properties': ['thermal expansion', 'specific heat', 'thermal conductivity'],
  'Gas Laws': ['ideal gas law', 'PV=nRT', 'thermodynamic process'],
  'Thermal Management': ['heat dissipation', 'cooling', 'thermal resistance'],
  'Chemical Reactions': ['reaction rate', 'activation energy', 'exothermic'],
  'Electric Fields': ['electric field', 'Coulomb\'s law', 'charge'],
  'Circuits': ['Ohm\'s law', 'series circuit', 'parallel circuit'],
  'Magnetism': ['magnetic field', 'ferromagnetism', 'magnetic force'],
  'Electromagnetic Induction': ['Faraday\'s law', 'EMF', 'magnetic flux'],
  'Motors & Speakers': ['electromagnetic motor', 'Lorentz force', 'transducer'],
  'EMI & Shielding': ['electromagnetic interference', 'shielding', 'Faraday cage'],
  'Reflection & Refraction': ['reflection', 'refraction', 'Snell\'s law'],
  'Lenses & Imaging': ['focal length', 'lens equation', 'image formation'],
  'Interference & Diffraction': ['interference pattern', 'diffraction', 'coherence'],
  'Polarization': ['polarization', 'Brewster angle', 'birefringence'],
  'Scattering & Dispersion': ['scattering', 'dispersion', 'wavelength dependence'],
  'Mechanical Properties': ['stress', 'strain', 'Young\'s modulus'],
  'Corrosion & Degradation': ['corrosion', 'oxidation', 'material degradation'],
  'Molecular': ['diffusion', 'molecular motion', 'Brownian motion'],
  'Semiconductor Basics': ['transistor', 'switching', 'leakage'],
  'Fabrication': ['lithography', 'etching', 'deposition'],
  'Interconnects': ['RC delay', 'signal integrity', 'crosstalk'],
  'Packaging': ['chip packaging', 'thermal interface', 'chiplet'],
  'Timing & Clocks': ['clock distribution', 'jitter', 'synchronization'],
  'Power Delivery': ['power delivery', 'decoupling', 'voltage regulation'],
  'ESD & Reliability': ['ESD protection', 'reliability', 'radiation hardening'],
  'Manufacturing': ['yield', 'process variation', 'defect density'],
  'AI Inference': ['inference latency', 'throughput', 'model optimization'],
  'GPU Architecture': ['GPU', 'parallelism', 'compute units'],
  'Memory Systems': ['memory hierarchy', 'cache', 'bandwidth'],
  'Compute Comparison': ['ASIC', 'GPU', 'architecture tradeoffs'],
  'Power Management': ['DVFS', 'power gating', 'thermal throttling'],
  'Prompting & Safety': ['prompt engineering', 'AI safety', 'LLM techniques'],
  'Networking': ['network latency', 'bandwidth', 'congestion'],
  'Solar Cell Physics': ['photovoltaic effect', 'IV curve', 'efficiency'],
  'Module Design': ['module losses', 'bypass diode', 'string design'],
  'Performance Factors': ['temperature coefficient', 'derating', 'bifacial'],
  'System Design': ['MPPT', 'system sizing', 'yield prediction'],
  'Power Electronics': ['DC-DC conversion', 'inverter', 'power factor'],
  'Batteries & UPS': ['battery', 'internal resistance', 'UPS'],
  'Grid & Data Center': ['grid frequency', 'PUE', 'power distribution'],
  'Orbital Mechanics': ['orbital mechanics', 'Kepler\'s laws', 'gravity'],
  'Satellite Systems': ['satellite', 'space systems', 'thermal control'],
  'Earth Effects': ['Coriolis effect', 'lift', 'Magnus effect'],
  'Antennas': ['antenna gain', 'radiation pattern', 'polarization'],
  'Signal Propagation': ['signal attenuation', 'Fresnel zone', 'fiber optics'],
  'Acoustics': ['acoustics', 'echo', 'seismic waves'],
  'Kitchen Physics': ['everyday physics', 'surface tension', 'pressure'],
  'Optical Illusions': ['aliasing', 'stroboscopic effect', 'Moire pattern'],
  'Strange Physics': ['chain fountain', 'Leidenfrost', 'levitation'],
  'Human Senses': ['reaction time', 'perception', 'human factors'],
  'Storage Physics': ['magnetic storage', 'capacitive sensing', 'read/write head'],
  'Measurement & Instruments': ['oscilloscope', 'measurement', 'bridge circuit'],
  'Analog Design': ['op-amp', 'voltage divider', 'current mirror', 'impedance', 'filter'],
  'Data Converters': ['ADC', 'DAC', 'quantization', 'settling time'],
  'Clocking & PLLs': ['PLL', 'clock recovery', 'phase-locked loop', 'jitter'],
  'Signal Integrity': ['eye diagram', 'signal integrity', 'switch bounce', 'decoupling'],
  'Power Electronics': ['buck converter', 'boost converter', 'flyback', 'gate driver'],
  'Motor Control': ['back EMF', 'H-bridge', 'stepper motor', 'servo control'],
  'Sensors': ['strain gauge', 'thermocouple', 'Wheatstone bridge', 'sensor linearization'],
  'EMC & Reliability': ['EMC', 'electromagnetic compatibility', 'solder reflow', 'reliability'],
};

// ============================================================
// TAG DERIVATION — common search terms per category
// ============================================================

const categoryTags: Record<string, string[]> = {
  mechanics: ['force', 'motion', 'Newton', 'energy', 'momentum'],
  oscillations: ['wave', 'vibration', 'frequency', 'resonance', 'sound'],
  fluids: ['flow', 'pressure', 'viscosity', 'buoyancy', 'fluid'],
  thermodynamics: ['heat', 'temperature', 'thermal', 'phase change', 'entropy'],
  electricity: ['electric', 'magnetic', 'circuit', 'charge', 'field'],
  optics: ['light', 'lens', 'reflection', 'refraction', 'optics'],
  materials: ['stress', 'strain', 'material', 'corrosion', 'molecular'],
  semiconductors: ['chip', 'transistor', 'fabrication', 'semiconductor', 'CMOS'],
  computing: ['GPU', 'AI', 'memory', 'latency', 'compute'],
  solar: ['solar', 'photovoltaic', 'PV', 'module', 'cell'],
  space: ['orbit', 'satellite', 'gravity', 'space', 'Kepler'],
  rf: ['antenna', 'signal', 'RF', 'wireless', 'fiber'],
  experiments: ['experiment', 'demo', 'hands-on', 'fun'],
  storage: ['storage', 'HDD', 'memory', 'capacitive'],
  electronics: ['electronics', 'analog', 'power', 'motor', 'sensor', 'PCB', 'EMC'],
};

// ============================================================
// DIFFICULTY → MINUTES mapping
// ============================================================

const difficultyMinutes: Record<string, number> = {
  beginner: 5,
  intermediate: 8,
  advanced: 12,
};

// ============================================================
// GAME DIFFICULTY LOOKUP — from the existing GamesPage data
// (We import the mapping rather than the entire GamesPage component)
// ============================================================

const gameDifficultyMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  // Mechanics
  CenterOfMass: 'beginner', MomentumConservation: 'intermediate', AngularMomentum: 'intermediate',
  AngularMomentumTransfer: 'intermediate', ProjectileIndependence: 'beginner', Torque: 'intermediate',
  InclinedPlane: 'beginner', HookesLaw: 'beginner', PendulumPeriod: 'beginner', Inertia: 'beginner',
  NewtonsThirdLaw: 'beginner', StaticKineticFriction: 'intermediate', RollingVsSliding: 'intermediate',
  MomentOfInertia: 'advanced', GyroscopicPrecession: 'advanced', TwoBallCollision: 'intermediate',
  InelasticCollisions: 'intermediate', BallisticPendulum: 'advanced', EggDrop: 'beginner',
  Buckling: 'advanced', Brachistochrone: 'advanced', Rattleback: 'intermediate',
  RollingRace: 'beginner', SleepingTop: 'intermediate', SwingPumping: 'beginner',
  TippingPoint: 'beginner', TunedMassDamper: 'advanced', WorkPower: 'beginner',
  EnergyConservation: 'beginner', ElasticPotentialEnergy: 'beginner',
  DragForce: 'intermediate', CentripetalForce: 'beginner', GyroscopeStability: 'intermediate',
  PrecessionNutation: 'advanced', PoissonRatio: 'intermediate', FractureMechanics: 'advanced',
  StableLevitation: 'advanced', MinimalSurfaces: 'advanced', Viscoelasticity: 'intermediate',
  VortexRings: 'intermediate', NonNewtonianArmor: 'intermediate', ChainFountain: 'intermediate',
  CycloidMotion: 'intermediate', StickSlip: 'intermediate',
  // Oscillations
  DampedOscillations: 'intermediate', ForcedOscillations: 'intermediate', Damping: 'intermediate',
  CoupledPendulums: 'intermediate', EddyCurrentPendulum: 'intermediate', MetronomeSync: 'intermediate',
  // Waves & Sound
  Beats: 'beginner', SoundInterference: 'intermediate', SpeedOfSound: 'beginner',
  Reverberation: 'intermediate', DopplerEffect: 'intermediate', StrawInstrument: 'beginner',
  StandingWaves: 'intermediate', WaveInterference: 'intermediate', WaveSpeedTension: 'beginner',
  MicrowaveStandingWave: 'intermediate', ChladniPatterns: 'intermediate',
  // Optics
  Reflection: 'beginner', LawOfReflection: 'beginner', Refraction: 'beginner',
  SnellsLaw: 'beginner', TotalInternalReflection: 'intermediate', BrewsterAngle: 'intermediate',
  LensFocusing: 'beginner', ChromaticAberration: 'intermediate', DepthOfField: 'intermediate',
  CameraObscura: 'beginner', Diffraction: 'intermediate', ThinFilmInterference: 'intermediate',
  AntiReflectiveCoating: 'intermediate', MoirePatterns: 'intermediate',
  Polarization: 'intermediate', PolarizedSky: 'intermediate', TapeBirefringence: 'intermediate',
  Photoelasticity: 'intermediate', Dispersion: 'beginner', RayleighMieScattering: 'intermediate',
  LaserSpeckle: 'advanced', Retroreflection: 'intermediate', Fluorescence: 'intermediate',
  InfraredEmissivity: 'intermediate', WaveParticleDuality: 'advanced', PhotoelectricEffect: 'intermediate',
  FresnelZones: 'advanced', RollingShutter: 'intermediate', WagonWheelAliasing: 'intermediate',
  // Fluids
  LaminarFlow: 'intermediate', LaminarTurbulent: 'intermediate', KarmanVortex: 'advanced',
  Cavitation: 'advanced', Bernoulli: 'intermediate', VenturiEffect: 'intermediate',
  HydrostaticPressure: 'beginner', PascalLaw: 'beginner', PressureDrop: 'intermediate',
  Buoyancy: 'beginner', CartesianDiver: 'beginner', FloatingPaperclip: 'beginner',
  HeliumBalloonCar: 'beginner', CapillaryAction: 'beginner', SoapBoat: 'beginner',
  MarangoniTears: 'advanced', MinimalSurfaces2: 'advanced', Superhydrophobic: 'intermediate',
  ShearThinning: 'intermediate', ViscosityTemperature: 'intermediate',
  Siphon: 'beginner', BottleTornado: 'beginner', ShowerCurtain: 'intermediate',
  DropletBreakup: 'advanced', HydraulicJump: 'intermediate', WaterHammer: 'intermediate',
  TerminalVelocity: 'intermediate', LiftForce: 'intermediate', MagnusEffect: 'intermediate',
  FluidInertia: 'intermediate', JarLidExpansion: 'beginner', Supercooling: 'intermediate',
  // Thermodynamics
  Convection: 'beginner', ConvectionCurrents: 'intermediate', NewtonCooling: 'intermediate',
  ThermalContact: 'beginner', HeatTransferCapacity: 'intermediate',
  LatentHeat: 'intermediate', PhaseChangeEnergy: 'intermediate', BoilingPressure: 'intermediate',
  EvaporativeCooling: 'beginner', Leidenfrost: 'intermediate',
  ThermalExpansion: 'beginner', JarLidExpansion2: 'beginner', BimetalThermostat: 'beginner',
  AdiabaticHeating: 'intermediate', GasLaws: 'beginner', CloudInBottle: 'beginner',
  Entropy: 'advanced', CarnotCycle: 'advanced',
  HeatSinkThermal: 'intermediate', LiquidCooling: 'intermediate', ServerAirflow: 'intermediate',
  ThermalThrottling: 'intermediate', ThermalInterface: 'intermediate',
  ChillerCOP: 'intermediate', FanLaws: 'intermediate',
  EndothermicExothermic: 'beginner', HandWarmer: 'beginner', Arrhenius: 'advanced',
  // Electromagnetism
  ElectricField: 'intermediate', ElectricFieldMapping: 'intermediate',
  ElectricPotential: 'intermediate', CoulombsLaw: 'beginner', StaticElectricity: 'beginner',
  Circuits: 'beginner', KirchhoffsLaws: 'intermediate', RCTimeConstant: 'intermediate',
  LCResonance: 'advanced', PowerFactor: 'advanced',
  MagneticField: 'beginner', MagneticMapping: 'intermediate', Electromagnet: 'beginner',
  OerstedExperiment: 'beginner', HomopolarMotor: 'beginner',
  ElectromagneticInduction: 'intermediate', InductionHeating: 'intermediate',
  InductiveKickback: 'intermediate', EddyCurrents: 'intermediate', GeneratorStartup: 'intermediate',
  ClassicDCMotor: 'intermediate', SpeakerPrinciple: 'intermediate',
  Microphone: 'beginner', MakeMicrophone: 'beginner',
  FaradayCage: 'intermediate', EMIShielding: 'intermediate', WirelessCharging: 'intermediate',
  CapacitiveTouch: 'intermediate', GalvanicCorrosion: 'intermediate',
  // Semiconductors
  MOSFETSwitching: 'advanced', LeakageCurrent: 'intermediate', LeakagePower: 'intermediate',
  SRAMCell: 'advanced', DRAMRefresh: 'intermediate',
  Photolithography: 'intermediate', LithoFocusDose: 'advanced', EtchAnisotropy: 'intermediate',
  IonImplantation: 'intermediate', DopingDiffusion: 'intermediate', DepositionTypes: 'intermediate',
  CMPPlanarization: 'advanced',
  RCDelay: 'intermediate', RCDelayInterconnect: 'intermediate', Electromigration: 'advanced',
  Crosstalk: 'intermediate', IRDrop: 'intermediate', TransmissionLine: 'intermediate',
  FlipChipWirebond: 'advanced', ChipletArchitecture: 'advanced', ChipletsVsMonoliths: 'intermediate',
  ClockDistribution: 'advanced', ClockJitter: 'advanced', Metastability: 'advanced',
  PowerDeliveryNetwork: 'advanced', DecouplingCapacitor: 'intermediate', GroundBounce: 'advanced',
  NoiseMargin: 'intermediate',
  ESDProtection: 'intermediate', HumidityESD: 'intermediate',
  RadiationEffects: 'advanced', SpaceRadiation: 'advanced',
  CleanroomYield: 'intermediate', ProcessVariation: 'intermediate', OverlayError: 'intermediate',
  SRAMYieldRedundancy: 'advanced', DesignToFabTranslation: 'advanced',
  InterconnectTopology: 'advanced',
  // Solar
  SolarCell: 'intermediate', PVIVCurve: 'intermediate', FillFactor: 'advanced',
  SpectralMismatch: 'intermediate', LEDAsSolarCell: 'intermediate',
  CellToModuleLosses: 'intermediate', BypassDiodes: 'intermediate',
  SeriesParallelPV: 'intermediate', ShuntSeriesDefects: 'intermediate',
  SolarTempCoefficient: 'intermediate', SolarThermalDerating: 'intermediate',
  BifacialAlbedo: 'intermediate', PassivationRecombination: 'advanced',
  SiliconTexturing: 'intermediate', ScreenPrintingMetallization: 'intermediate',
  TexturingVsLithography: 'intermediate', SolarVsICPurity: 'intermediate',
  MPPT: 'intermediate', StringSizing: 'intermediate', SolarYieldPrediction: 'intermediate',
  SatelliteSolarAngle: 'intermediate', EncapsulationUVAging: 'intermediate',
  Hotspots: 'intermediate',
  // Power
  DCDCConverter: 'intermediate', InverterSineWave: 'intermediate', PowerLoss: 'intermediate',
  BatteryInternalResistance: 'intermediate', UPSBatterySizing: 'intermediate',
  UPSEfficiency: 'intermediate', GridFrequency: 'intermediate', PUECalculator: 'intermediate',
  GroundFault: 'intermediate', CableSizing: 'intermediate',
  // Computing
  AIInferenceLatency: 'advanced', EnergyPerToken: 'advanced', BatchingLatency: 'intermediate',
  QuantizationPrecision: 'intermediate', Sparsity: 'intermediate',
  GPUOccupancy: 'advanced', GPUMemoryBandwidth: 'intermediate', GPUPowerStates: 'intermediate',
  TensorCore: 'advanced', SystolicArray: 'advanced',
  MemoryHierarchy: 'intermediate', KVCache: 'advanced', ECCMemory: 'intermediate',
  DataMovementEnergy: 'intermediate', AttentionMemory: 'intermediate',
  AttentionLovesBandwidth: 'intermediate',
  ASICvsGPU: 'intermediate', TPUvsGPU: 'intermediate',
  ManufacturingDrivesArchitecture: 'advanced',
  DVFS: 'intermediate', NetworkCongestion: 'intermediate', NetworkLatency: 'intermediate',
  PCIeBandwidth: 'intermediate',
  PromptInjectionSafety: 'intermediate', SpecFirstPrompting: 'intermediate',
  TestFirstPrompting: 'intermediate', ToolAwarePrompting: 'intermediate',
  ModelAsReviewer: 'intermediate', PatchDiscipline: 'intermediate',
  VerificationHarness: 'intermediate', AskForAssumptions: 'beginner',
  LLMToSPICE: 'advanced',
  // Space
  OrbitalMechanics: 'advanced', OrbitalMechanicsBasics: 'intermediate',
  TidalForces: 'intermediate', TidalLocking: 'intermediate',
  SatelliteDoppler: 'intermediate', SatelliteThermal: 'intermediate',
  CoriolisEffect: 'intermediate',
  // Misc
  BrownianMotion: 'intermediate', MolecularOrbitals: 'advanced', DiffusionConvection: 'intermediate',
  ReactionTime: 'beginner', PhoneSeismometer: 'intermediate',
  EchoTimeOfFlight: 'beginner', PWavesSWaves: 'intermediate',
  HDDPhysics: 'intermediate', FiberSignalLoss: 'intermediate',
  AntennaGain: 'intermediate', AntennaPolarization: 'intermediate', DirectionFinding: 'intermediate',
  LinkBudget: 'intermediate', StringSizing2: 'intermediate',
  // Electronics Engineering
  OscilloscopeTriggerer: 'intermediate', WheatstoneBalance: 'intermediate', ThermalNoise: 'advanced',
  VoltageDividerDesign: 'beginner', CurrentMirrorMatching: 'advanced', OpAmpStability: 'advanced',
  ImpedanceMatching: 'intermediate', FilterDesign: 'intermediate',
  ADCQuantizationNoise: 'advanced', DACSettlingTime: 'advanced',
  PLLLockDynamics: 'advanced', ClockRecovery: 'advanced',
  SignalIntegrityEyeDiagram: 'advanced', SwitchBounce: 'intermediate', PowerSupplyDecouplingLayout: 'intermediate',
  BuckConverterRipple: 'intermediate', BoostConverter: 'intermediate', FlybackConverter: 'advanced', GateDriver: 'intermediate',
  MotorBackEMF: 'intermediate', HBridgeDrive: 'intermediate', StepperMotor: 'intermediate', ServoControl: 'intermediate',
  StrainGaugeSensor: 'intermediate', ThermocoupleNonlinearity: 'intermediate',
  EMCCompliance: 'advanced', SolderReflow: 'intermediate',
};

// ============================================================
// BUILD CATALOG — iterate gameCategories to produce GameMeta[]
// ============================================================

function buildCatalog(): GameMeta[] {
  const catalog: GameMeta[] = [];
  const seenSlugs = new Set<string>();

  for (const category of gameCategories) {
    const catTags = categoryTags[category.id] || [];

    for (const sub of category.subcategories) {
      const subConcepts = subcategoryConcepts[sub.name] || [sub.name.toLowerCase()];
      const gamesInSub: string[] = []; // slugs accumulated for prereq chaining

      for (const gamePascal of sub.games) {
        const slug = pascalToSlug(gamePascal);
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        const difficulty = gameDifficultyMap[gamePascal] || 'intermediate';
        const name = gamePascal
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .replace(/\b[a-z]/g, c => c.toUpperCase());

        // Prerequisites: earlier beginner games in the same subcategory
        const prerequisites: string[] = [];
        if (difficulty !== 'beginner' && gamesInSub.length > 0) {
          // Take at most 2 prerequisites from earlier games in this subcategory
          prerequisites.push(...gamesInSub.slice(-2));
        }

        catalog.push({
          slug,
          name,
          category: category.id,
          subcategory: sub.name,
          difficulty,
          concepts: [...subConcepts],
          prerequisites,
          estimatedMinutes: difficultyMinutes[difficulty] || 8,
          tags: [...catTags, sub.name.toLowerCase()],
        });

        gamesInSub.push(slug);
      }
    }
  }

  return catalog;
}

// ============================================================
// EXPORTS
// ============================================================

export const gameCatalog: GameMeta[] = buildCatalog();

export default gameCatalog;

/** Find a single game by slug. */
export function getGameMeta(slug: string): GameMeta | undefined {
  return gameCatalog.find(g => g.slug === slug);
}

/** Return all games in a category. */
export function getGamesByCategory(category: string): GameMeta[] {
  return gameCatalog.filter(g => g.category === category);
}

/** Return games whose concepts array contains the query string. */
export function getGamesByConcept(concept: string): GameMeta[] {
  const q = concept.toLowerCase();
  return gameCatalog.filter(g =>
    g.concepts.some(c => c.toLowerCase().includes(q))
  );
}
