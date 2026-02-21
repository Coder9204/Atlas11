// Game Categories - Organized by Physics/Science Topic
// Each category has subcategories for more specific groupings

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface SubCategory {
  name: string;
  games: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: SubCategory[];
}

export const gameCategories: Category[] = [
  {
    id: 'mechanics',
    name: 'Classical Mechanics',
    icon: '⚙️',
    description: 'Forces, motion, momentum, and energy',
    subcategories: [
      {
        name: 'Forces & Motion',
        games: ['NewtonsThirdLaw', 'DragForce', 'CentripetalForce', 'Torque', 'HookesLaw', 'StaticKineticFriction', 'InclinedPlane', 'Inertia']
      },
      {
        name: 'Momentum & Collisions',
        games: ['MomentumConservation', 'TwoBallCollision', 'InelasticCollisions', 'BallisticPendulum', 'EggDrop']
      },
      {
        name: 'Energy',
        games: ['EnergyConservation', 'WorkPower', 'ElasticPotentialEnergy', 'KineticTheoryGases']
      },
      {
        name: 'Rotational Motion',
        games: ['AngularMomentum', 'AngularMomentumTransfer', 'MomentOfInertia', 'GyroscopeStability', 'GyroscopicPrecession', 'PrecessionNutation', 'Rattleback', 'SleepingTop']
      },
      {
        name: 'Projectiles & Kinematics',
        games: ['ProjectileIndependence', 'Brachistochrone', 'CycloidMotion', 'TerminalVelocity']
      },
      {
        name: 'Center of Mass',
        games: ['CenterOfMass', 'TippingPoint', 'RollingRace', 'RollingVsSliding']
      }
    ]
  },
  {
    id: 'oscillations',
    name: 'Oscillations & Waves',
    icon: '〰️',
    description: 'Pendulums, resonance, and wave phenomena',
    subcategories: [
      {
        name: 'Pendulums',
        games: ['PendulumPeriod', 'CoupledPendulums', 'EddyCurrentPendulum', 'SwingPumping']
      },
      {
        name: 'Oscillations',
        games: ['DampedOscillations', 'ForcedOscillations', 'Damping', 'LCResonance', 'Resonance']
      },
      {
        name: 'Sound Waves',
        games: ['Beats', 'SoundInterference', 'SpeedOfSound', 'Reverberation', 'DopplerEffect', 'StrawInstrument']
      },
      {
        name: 'Wave Physics',
        games: ['StandingWaves', 'WaveInterference', 'WaveSpeedTension', 'MicrowaveStandingWave', 'ChladniPatterns']
      },
      {
        name: 'Vibration Damping',
        games: ['TunedMassDamper', 'MetronomeSync']
      }
    ]
  },
  {
    id: 'fluids',
    name: 'Fluid Mechanics',
    icon: '💧',
    description: 'Flow, pressure, and buoyancy',
    subcategories: [
      {
        name: 'Flow Types',
        games: ['LaminarFlow', 'LaminarTurbulent', 'KarmanVortex', 'VortexRings', 'Cavitation']
      },
      {
        name: 'Pressure',
        games: ['Bernoulli', 'VenturiEffect', 'HydrostaticPressure', 'PascalLaw', 'PressureDrop']
      },
      {
        name: 'Buoyancy',
        games: ['Buoyancy', 'CartesianDiver', 'FloatingPaperclip', 'HeliumBalloonCar']
      },
      {
        name: 'Surface Effects',
        games: ['CapillaryAction', 'SoapBoat', 'MarangoniTears', 'MinimalSurfaces', 'Superhydrophobic']
      },
      {
        name: 'Viscosity',
        games: ['ShearThinning', 'ViscosityTemperature', 'NonNewtonianArmor', 'Viscoelasticity', 'StickSlip']
      },
      {
        name: 'Special Phenomena',
        games: ['HydraulicJump', 'WaterHammer', 'Siphon', 'BottleTornado', 'ShowerCurtain', 'DropletBreakup']
      }
    ]
  },
  {
    id: 'thermodynamics',
    name: 'Thermodynamics & Heat',
    icon: '🔥',
    description: 'Heat transfer, phase changes, and thermal systems',
    subcategories: [
      {
        name: 'Heat Transfer',
        games: ['Convection', 'ConvectionCurrents', 'NewtonCooling', 'ThermalContact', 'HeatTransferCapacity']
      },
      {
        name: 'Phase Changes',
        games: ['LatentHeat', 'PhaseChangeEnergy', 'BoilingPressure', 'EvaporativeCooling', 'Supercooling', 'Leidenfrost']
      },
      {
        name: 'Thermal Properties',
        games: ['ThermalExpansion', 'JarLidExpansion', 'BimetalThermostat', 'AdiabaticHeating']
      },
      {
        name: 'Gas Laws',
        games: ['GasLaws', 'CloudInBottle', 'Entropy', 'CarnotCycle']
      },
      {
        name: 'Thermal Management',
        games: ['HeatSinkThermal', 'LiquidCooling', 'ServerAirflow', 'ThermalThrottling', 'ThermalInterface', 'ChillerCOP', 'FanLaws']
      },
      {
        name: 'Chemical Reactions',
        games: ['EndothermicExothermic', 'HandWarmer', 'Arrhenius']
      }
    ]
  },
  {
    id: 'electricity',
    name: 'Electricity & Magnetism',
    icon: '⚡',
    description: 'Circuits, fields, and electromagnetic phenomena',
    subcategories: [
      {
        name: 'Electric Fields',
        games: ['ElectricField', 'ElectricFieldMapping', 'ElectricPotential', 'CoulombsLaw', 'StaticElectricity']
      },
      {
        name: 'Circuits',
        games: ['Circuits', 'KirchhoffsLaws', 'RCTimeConstant', 'LCResonance', 'PowerFactor']
      },
      {
        name: 'Magnetism',
        games: ['MagneticField', 'MagneticMapping', 'Electromagnet', 'OerstedExperiment', 'HomopolarMotor']
      },
      {
        name: 'Electromagnetic Induction',
        games: ['ElectromagneticInduction', 'InductionHeating', 'InductiveKickback', 'EddyCurrents', 'GeneratorStartup']
      },
      {
        name: 'Motors & Speakers',
        games: ['ClassicDCMotor', 'SpeakerPrinciple', 'Microphone', 'MakeMicrophone']
      },
      {
        name: 'EMI & Shielding',
        games: ['FaradayCage', 'EMIShielding', 'WirelessCharging']
      }
    ]
  },
  {
    id: 'optics',
    name: 'Optics & Light',
    icon: '💡',
    description: 'Reflection, refraction, and interference',
    subcategories: [
      {
        name: 'Reflection & Refraction',
        games: ['Reflection', 'LawOfReflection', 'Refraction', 'SnellsLaw', 'TotalInternalReflection', 'BrewsterAngle']
      },
      {
        name: 'Lenses & Imaging',
        games: ['LensFocusing', 'ChromaticAberration', 'DepthOfField', 'CameraObscura']
      },
      {
        name: 'Interference & Diffraction',
        games: ['Diffraction', 'ThinFilmInterference', 'AntiReflectiveCoating', 'MoirePatterns']
      },
      {
        name: 'Polarization',
        games: ['Polarization', 'PolarizedSky', 'TapeBirefringence', 'Photoelasticity']
      },
      {
        name: 'Scattering & Dispersion',
        games: ['Dispersion', 'RayleighMieScattering', 'LaserSpeckle', 'Retroreflection']
      },
      {
        name: 'Special Phenomena',
        games: ['Fluorescence', 'InfraredEmissivity', 'WaveParticleDuality', 'PhotoelectricEffect']
      }
    ]
  },
  {
    id: 'materials',
    name: 'Materials Science',
    icon: '🔬',
    description: 'Material properties and behavior',
    subcategories: [
      {
        name: 'Mechanical Properties',
        games: ['PoissonRatio', 'Buckling', 'FractureMechanics']
      },
      {
        name: 'Corrosion & Degradation',
        games: ['GalvanicCorrosion', 'EncapsulationUVAging']
      },
      {
        name: 'Molecular',
        games: ['BrownianMotion', 'MolecularOrbitals', 'DiffusionConvection']
      }
    ]
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors & Electronics',
    icon: '🔌',
    description: 'Chip design, circuits, and electronic systems',
    subcategories: [
      {
        name: 'Semiconductor Basics',
        games: ['MOSFETSwitching', 'LeakageCurrent', 'LeakagePower', 'SRAMCell', 'DRAMRefresh']
      },
      {
        name: 'Fabrication',
        games: ['Photolithography', 'LithoFocusDose', 'EtchAnisotropy', 'IonImplantation', 'DopingDiffusion', 'DepositionTypes', 'CMPPlanarization']
      },
      {
        name: 'Interconnects',
        games: ['RCDelay', 'RCDelayInterconnect', 'Electromigration', 'Crosstalk', 'IRDrop', 'TransmissionLine']
      },
      {
        name: 'Packaging',
        games: ['FlipChipWirebond', 'ChipletArchitecture', 'ChipletsVsMonoliths', 'ThermalInterface']
      },
      {
        name: 'Timing & Clocks',
        games: ['ClockDistribution', 'ClockJitter', 'Metastability']
      },
      {
        name: 'Power Delivery',
        games: ['PowerDeliveryNetwork', 'DecouplingCapacitor', 'GroundBounce', 'NoiseMargin']
      },
      {
        name: 'ESD & Reliability',
        games: ['ESDProtection', 'HumidityESD', 'RadiationEffects', 'SpaceRadiation']
      },
      {
        name: 'Manufacturing',
        games: ['CleanroomYield', 'ProcessVariation', 'OverlayError', 'SRAMYieldRedundancy', 'DesignToFabTranslation']
      }
    ]
  },
  {
    id: 'computing',
    name: 'AI & Computing',
    icon: '🤖',
    description: 'AI inference, GPU architecture, and memory systems',
    subcategories: [
      {
        name: 'AI Inference',
        games: ['AIInferenceLatency', 'EnergyPerToken', 'BatchingLatency', 'QuantizationPrecision', 'Sparsity']
      },
      {
        name: 'GPU Architecture',
        games: ['GPUOccupancy', 'GPUMemoryBandwidth', 'GPUPowerStates', 'TensorCore', 'SystolicArray']
      },
      {
        name: 'Memory Systems',
        games: ['MemoryHierarchy', 'KVCache', 'ECCMemory', 'DataMovementEnergy']
      },
      {
        name: 'Compute Comparison',
        games: ['ASICvsGPU', 'TPUvsGPU', 'ManufacturingDrivesArchitecture']
      },
      {
        name: 'Power Management',
        games: ['DVFS', 'ThermalThrottling', 'Hotspots']
      },
      {
        name: 'Prompting & Safety',
        games: ['PromptInjectionSafety', 'SpecFirstPrompting', 'TestFirstPrompting', 'ToolAwarePrompting', 'ModelAsReviewer', 'AttentionLovesBandwidth', 'AttentionMemory', 'AskForAssumptions', 'LLMToSPICE', 'VerificationHarness', 'PatchDiscipline']
      },
      {
        name: 'Networking',
        games: ['NetworkCongestion', 'NetworkLatency', 'PCIeBandwidth', 'InterconnectTopology']
      }
    ]
  },
  {
    id: 'solar',
    name: 'Solar & Energy',
    icon: '☀️',
    description: 'Photovoltaics, batteries, and power systems',
    subcategories: [
      {
        name: 'Solar Cell Physics',
        games: ['SolarCell', 'PVIVCurve', 'FillFactor', 'SpectralMismatch', 'LEDAsSolarCell']
      },
      {
        name: 'Module Design',
        games: ['CellToModuleLosses', 'BypassDiodes', 'SeriesParallelPV', 'ShuntSeriesDefects']
      },
      {
        name: 'Performance Factors',
        games: ['SolarTempCoefficient', 'SolarThermalDerating', 'BifacialAlbedo', 'PassivationRecombination']
      },
      {
        name: 'Manufacturing',
        games: ['SiliconTexturing', 'ScreenPrintingMetallization', 'TexturingVsLithography', 'SolarVsICPurity']
      },
      {
        name: 'System Design',
        games: ['MPPT', 'StringSizing', 'SolarYieldPrediction', 'SatelliteSolarAngle']
      },
      {
        name: 'Power Electronics',
        games: ['DCDCConverter', 'InverterSineWave', 'PowerLoss', 'PowerFactor']
      },
      {
        name: 'Batteries & UPS',
        games: ['BatteryInternalResistance', 'UPSBatterySizing', 'UPSEfficiency']
      },
      {
        name: 'Grid & Data Center',
        games: ['GridFrequency', 'PUECalculator', 'GroundFault', 'CableSizing']
      }
    ]
  },
  {
    id: 'space',
    name: 'Space & Orbital Mechanics',
    icon: '🚀',
    description: 'Satellites, orbits, and space physics',
    subcategories: [
      {
        name: 'Orbital Mechanics',
        games: ['OrbitalMechanics', 'OrbitalMechanicsBasics', 'TidalForces', 'TidalLocking']
      },
      {
        name: 'Satellite Systems',
        games: ['SatelliteDoppler', 'SatelliteSolarAngle', 'SatelliteThermal']
      },
      {
        name: 'Earth Effects',
        games: ['CoriolisEffect', 'MagnusEffect', 'LiftForce']
      }
    ]
  },
  {
    name: 'RF & Communications',
    id: 'rf',
    icon: '📡',
    description: 'Antennas, signals, and wireless systems',
    subcategories: [
      {
        name: 'Antennas',
        games: ['AntennaGain', 'AntennaPolarization', 'DirectionFinding']
      },
      {
        name: 'Signal Propagation',
        games: ['LinkBudget', 'FresnelZones', 'FiberSignalLoss', 'Crosstalk']
      },
      {
        name: 'Acoustics',
        games: ['EchoTimeOfFlight', 'PhoneSeismometer', 'PWavesSWaves']
      }
    ]
  },
  {
    id: 'experiments',
    name: 'Fun Experiments',
    icon: '🧪',
    description: 'Hands-on demos and cool phenomena',
    subcategories: [
      {
        name: 'Kitchen Physics',
        games: ['CartesianDiver', 'BottleTornado', 'SoapBoat', 'FloatingPaperclip', 'JarLidExpansion', 'HeliumBalloonCar']
      },
      {
        name: 'Optical Illusions',
        games: ['WagonWheelAliasing', 'RollingShutter', 'MoirePatterns']
      },
      {
        name: 'Strange Physics',
        games: ['ChainFountain', 'Rattleback', 'StableLevitation', 'Leidenfrost']
      },
      {
        name: 'Human Senses',
        games: ['ReactionTime', 'RollingRace']
      }
    ]
  },
  {
    id: 'storage',
    name: 'Data Storage',
    icon: '💾',
    description: 'HDD, memory, and storage physics',
    subcategories: [
      {
        name: 'Storage Physics',
        games: ['HDDPhysics', 'CapacitiveTouch']
      }
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics Engineering',
    icon: '🔧',
    description: 'Analog design, power electronics, motor control, sensors, and PCB design',
    subcategories: [
      {
        name: 'Measurement & Instruments',
        games: ['OscilloscopeTriggerer', 'WheatstoneBalance', 'ThermalNoise']
      },
      {
        name: 'Analog Design',
        games: ['VoltageDividerDesign', 'CurrentMirrorMatching', 'OpAmpStability', 'ImpedanceMatching', 'FilterDesign']
      },
      {
        name: 'Data Converters',
        games: ['ADCQuantizationNoise', 'DACSettlingTime']
      },
      {
        name: 'Clocking & PLLs',
        games: ['PLLLockDynamics', 'ClockRecovery']
      },
      {
        name: 'Signal Integrity',
        games: ['SignalIntegrityEyeDiagram', 'SwitchBounce', 'PowerSupplyDecouplingLayout']
      },
      {
        name: 'Power Electronics',
        games: ['BuckConverterRipple', 'BoostConverter', 'FlybackConverter', 'GateDriver']
      },
      {
        name: 'Motor Control',
        games: ['MotorBackEMF', 'HBridgeDrive', 'StepperMotor', 'ServoControl']
      },
      {
        name: 'Sensors',
        games: ['StrainGaugeSensor', 'ThermocoupleNonlinearity']
      },
      {
        name: 'EMC & Reliability',
        games: ['EMCCompliance', 'SolderReflow']
      }
    ]
  }
];

// Get all games as a flat list
export function getAllGames(): string[] {
  const games: string[] = [];
  for (const category of gameCategories) {
    for (const sub of category.subcategories) {
      games.push(...sub.games);
    }
  }
  return [...new Set(games)]; // Remove duplicates
}

// Get category for a game
export function getCategoryForGame(gameId: string): Category | undefined {
  for (const category of gameCategories) {
    for (const sub of category.subcategories) {
      if (sub.games.includes(gameId)) {
        return category;
      }
    }
  }
  return undefined;
}

// Get all games in a category
export function getGamesInCategory(categoryId: string): string[] {
  const category = gameCategories.find(c => c.id === categoryId);
  if (!category) return [];

  const games: string[] = [];
  for (const sub of category.subcategories) {
    games.push(...sub.games);
  }
  return [...new Set(games)];
}

export default gameCategories;
