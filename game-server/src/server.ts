/**
 * Game Server - WebSocket server for real-time game streaming
 *
 * This server runs all game logic and streams draw commands to clients.
 * Game source code NEVER leaves this server.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { getGameEngine } from './engine/GameEngine.js';
import { getGameRegistry } from './engine/GameRegistry.js';
import { createWaveParticleDualityGame } from './games/physics/WaveParticleDualityGame.js';
import { createProjectileMotionGame } from './games/physics/ProjectileMotionGame.js';
import { createSimpleHarmonicMotionGame } from './games/physics/SimpleHarmonicMotionGame.js';
// import { createCentripetalForceGame } from './games/physics/CentripetalForceGame.js'; // TODO: Fix strokeDasharray
import { createHeatEngineGame } from './games/physics/HeatEngineGame.js';
import { createOhmsLawGame } from './games/physics/OhmsLawGame.js';
import { createElasticCollisionsGame } from './games/physics/ElasticCollisionsGame.js';
import { createTerminalVelocityGame } from './games/physics/TerminalVelocityGame.js';
import { createIdealGasLawGame } from './games/physics/IdealGasLawGame.js';
// import { createElectricFieldGame } from './games/physics/ElectricFieldGame.js'; // TODO: Fix API signatures
// import { createCoulombsLawGame } from './games/physics/CoulombsLawGame.js'; // TODO: Fix polygon point format
import { createAngularMomentumGame } from './games/physics/AngularMomentumGame.js';
// import { createAngularMomentumTransferGame } from './games/physics/AngularMomentumTransferGame.js'; // TODO: Fix strokeLinecap
import { createArchimedesPrincipleGame } from './games/physics/ArchimedesPrincipleGame.js';
import { createBernoulliPrincipleGame } from './games/physics/BernoulliPrincipleGame.js';
import { createBrewsterAngleGame } from './games/physics/BrewsterAngleGame.js';
import { createBrownianMotionGame } from './games/physics/BrownianMotionGame.js';
import { createCameraObscuraGame } from './games/physics/CameraObscuraGame.js';
// import { createMagneticFieldGame } from './games/physics/MagneticFieldGame.js'; // TODO: Fix strokeDasharray
// import { createMagnusEffectGame } from './games/physics/MagnusEffectGame.js'; // TODO: Fix strokeDasharray
// import { createMakeMicrophoneGame } from './games/physics/MakeMicrophoneGame.js'; // TODO: Fix strokeDasharray
// import { createMomentOfInertiaGame } from './games/physics/MomentOfInertiaGame.js'; // TODO: Fix strokeDasharray
import { createPolarizationGame } from './games/physics/PolarizationGame.js';
// import { createPrecessionNutationGame } from './games/physics/PrecessionNutationGame.js'; // TODO: Fix strokeDasharray
import { createPressureGame } from './games/physics/PressureGame.js';
// import { createProjectileIndependenceGame } from './games/physics/ProjectileIndependenceGame.js'; // TODO: Fix polygon API
import { createRadiationHeatTransferGame } from './games/physics/RadiationHeatTransferGame.js';
import { createRefractionGame } from './games/physics/RefractionGame.js';
// import { createShearThinningGame } from './games/physics/ShearThinningGame.js'; // TODO: Fix syntax error
import { createSimpleGeneratorGame } from './games/physics/SimpleGeneratorGame.js';
import { createSnellsLawGame } from './games/physics/SnellsLawGame.js';
import { createSolarCellDetectorGame } from './games/physics/SolarCellDetectorGame.js';
import { createSolarHeatingGame } from './games/physics/SolarHeatingGame.js';
import { createSuperhydrophobicGame } from './games/physics/SuperhydrophobicGame.js';
import { createThermalConductionGame } from './games/physics/ThermalConductionGame.js';
// import { createThermalExpansionGame } from './games/physics/ThermalExpansionGame.js'; // TODO: Fix strokeDasharray
import { createThinFilmInterferenceGame } from './games/physics/ThinFilmInterferenceGame.js';
// import { createTidalForcesGame } from './games/physics/TidalForcesGame.js'; // TODO: Fix strokeDasharray
// import { createTidalLockingGame } from './games/physics/TidalLockingGame.js'; // TODO: Fix strokeDasharray
import { createViscosityTemperatureGame } from './games/physics/ViscosityTemperatureGame.js';
import { createViscoelasticityGame } from './games/physics/ViscoelasticityGame.js';
import { createVortexRingsGame } from './games/physics/VortexRingsGame.js';
// import { createWaveInterferenceGame } from './games/physics/WaveInterferenceGame.js'; // TODO: Fix API signatures
import { createRefrigerationCycleGame } from './games/physics/RefrigerationCycleGame.js';
import { createSoundDeadSpotsGame } from './games/physics/SoundDeadSpotsGame.js';
import { createCapacitanceGame } from './games/physics/CapacitanceGame.js';
// import { createCapacitiveTouchGame } from './games/physics/CapacitiveTouchGame.js'; // TODO: Fix input type
import { createTippingPointGame } from './games/physics/TippingPointGame.js';
// import { createNewtonsThirdLawGame } from './games/physics/NewtonsThirdLawGame.js'; // TODO: Fix API signatures
// import { createNonNewtonianArmorGame } from './games/physics/NonNewtonianArmorGame.js'; // TODO: Fix API signatures
import { createReverberationGame } from './games/physics/ReverberationGame.js';
import { createSoundLocalizationGame } from './games/physics/SoundLocalizationGame.js';
import { createWingLiftGame } from './games/physics/WingLiftGame.js';
import { createWirePowerLossGame } from './games/physics/WirePowerLossGame.js';
import { createSpecificHeatGame } from './games/physics/SpecificHeatGame.js';
import { createRollingFrictionGame } from './games/physics/RollingFrictionGame.js';
// import { createCapillaryActionGame } from './games/physics/CapillaryActionGame.js'; // TODO: Fix API issues
// import { createTotalInternalReflectionGame } from './games/physics/TotalInternalReflectionGame.js'; // TODO: Fix API signatures
import { createStableLevitationGame } from './games/physics/StableLevitationGame.js';
import { createRollingRaceGame } from './games/physics/RollingRaceGame.js';
// import { createTransformerGame } from './games/physics/TransformerGame.js'; // TODO: Fix API signatures
// import { createOrbitalMechanicsGame } from './games/physics/OrbitalMechanicsGame.js'; // TODO: Fix API signatures
// import { createPascalLawGame } from './games/physics/PascalLawGame.js'; // TODO: Fix API signatures
// import { createStaticKineticFrictionGame } from './games/physics/StaticKineticFrictionGame.js'; // TODO: Fix API signatures
// import { createVenturiEffectGame } from './games/physics/VenturiEffectGame.js'; // TODO: Fix API signatures
import { UserInput, SessionConfig } from './types/UserInput.js';
import { GameFrame } from './types/DrawCommand.js';

// === CONFIGURATION ===

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const FRAME_INTERVAL = 1000 / 30; // 30 FPS for network efficiency

// === REGISTER GAMES ===

const registry = getGameRegistry();

// Register all physics games - game code NEVER leaves this server
registry.register('wave_particle_duality', createWaveParticleDualityGame);
registry.register('projectile_motion', createProjectileMotionGame);
registry.register('simple_harmonic_motion', createSimpleHarmonicMotionGame);
// registry.register('centripetal_force', createCentripetalForceGame);
registry.register('heat_engine', createHeatEngineGame);
registry.register('ohms_law', createOhmsLawGame);
registry.register('elastic_collisions', createElasticCollisionsGame);
registry.register('terminal_velocity', createTerminalVelocityGame);
registry.register('ideal_gas_law', createIdealGasLawGame);
// registry.register('electric_field', createElectricFieldGame);
// registry.register('coulombs_law', createCoulombsLawGame);
registry.register('angular_momentum', createAngularMomentumGame);
// registry.register('angular_momentum_transfer', createAngularMomentumTransferGame);
registry.register('archimedes_principle', createArchimedesPrincipleGame);
registry.register('bernoulli_principle', createBernoulliPrincipleGame);
registry.register('brewster_angle', createBrewsterAngleGame);
registry.register('brownian_motion', createBrownianMotionGame);
registry.register('camera_obscura', createCameraObscuraGame);
// registry.register('magnetic_field', createMagneticFieldGame);
// registry.register('magnus_effect', createMagnusEffectGame);
// registry.register('make_microphone', createMakeMicrophoneGame);
// registry.register('moment_of_inertia', createMomentOfInertiaGame);
registry.register('polarization', createPolarizationGame);
// registry.register('precession_nutation', createPrecessionNutationGame);
registry.register('pressure', createPressureGame);
// registry.register('projectile_independence', createProjectileIndependenceGame);
registry.register('radiation_heat_transfer', createRadiationHeatTransferGame);
registry.register('refraction', createRefractionGame);
// registry.register('shear_thinning', createShearThinningGame);
registry.register('simple_generator', createSimpleGeneratorGame);
registry.register('snells_law', createSnellsLawGame);
registry.register('solar_cell_detector', createSolarCellDetectorGame);
registry.register('solar_heating', createSolarHeatingGame);
registry.register('superhydrophobic', createSuperhydrophobicGame);
registry.register('thermal_conduction', createThermalConductionGame);
// registry.register('thermal_expansion', createThermalExpansionGame);
registry.register('thin_film_interference', createThinFilmInterferenceGame);
// registry.register('tidal_forces', createTidalForcesGame);
// registry.register('tidal_locking', createTidalLockingGame);
registry.register('viscosity_temperature', createViscosityTemperatureGame);
registry.register('viscoelasticity', createViscoelasticityGame);
registry.register('vortex_rings', createVortexRingsGame);
// registry.register('wave_interference', createWaveInterferenceGame); // TODO: Fix API signatures
registry.register('refrigeration_cycle', createRefrigerationCycleGame);
registry.register('sound_dead_spots', createSoundDeadSpotsGame);
registry.register('capacitance', createCapacitanceGame);
// registry.register('capacitive_touch', createCapacitiveTouchGame); // TODO: Fix input type
registry.register('tipping_point', createTippingPointGame);
// registry.register('newtons_third_law', createNewtonsThirdLawGame);
// registry.register('non_newtonian_armor', createNonNewtonianArmorGame);
registry.register('reverberation', createReverberationGame);
registry.register('sound_localization', createSoundLocalizationGame);
registry.register('wing_lift', createWingLiftGame);
registry.register('wire_power_loss', createWirePowerLossGame);
registry.register('specific_heat', createSpecificHeatGame);
registry.register('rolling_friction', createRollingFrictionGame);
// registry.register('capillary_action', createCapillaryActionGame); // TODO: Fix API issues
// registry.register('total_internal_reflection', createTotalInternalReflectionGame);
registry.register('stable_levitation', createStableLevitationGame);
registry.register('rolling_race', createRollingRaceGame);
// registry.register('transformer', createTransformerGame); // TODO: Fix API signatures
// registry.register('orbital_mechanics', createOrbitalMechanicsGame);
// registry.register('pascal_law', createPascalLawGame);
// registry.register('static_kinetic_friction', createStaticKineticFrictionGame);
// registry.register('venturi_effect', createVenturiEffectGame); // TODO: Fix API signatures

console.log(`Registered ${registry.getCount()} games: ${registry.getGameTypes().join(', ')}`);

// === SERVER SETUP ===

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      games: registry.getCount(),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Stats endpoint
  if (req.url === '/stats') {
    const engine = getGameEngine();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.getStats()));
    return;
  }

  // Available games endpoint
  if (req.url === '/games') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      games: registry.getGameTypes(),
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server: httpServer });

// === CONNECTION HANDLING ===

interface ClientState {
  sessionId: string | null;
  userId: string;
  frameInterval: NodeJS.Timeout | null;
}

const clientStates = new Map<WebSocket, ClientState>();

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  console.log(`[Server] New connection from ${req.socket.remoteAddress}`);

  // Initialize client state
  const state: ClientState = {
    sessionId: null,
    userId: 'anonymous',
    frameInterval: null,
  };
  clientStates.set(ws, state);

  // Parse URL for game type
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // Expected path: /play/{gameType}
  if (pathParts[0] === 'play' && pathParts[1]) {
    const gameType = pathParts[1];
    const userId = url.searchParams.get('userId') || 'anonymous';
    const resumePhase = url.searchParams.get('resumePhase') || undefined;

    state.userId = userId;

    // Start game session
    const engine = getGameEngine();
    const config: SessionConfig = {
      gameType,
      userId,
      resumePhase,
      guidedMode: true,
      viewport: {
        width: 700,
        height: 350,
        isMobile: false,
      },
    };

    const sessionInfo = engine.startSession(config);
    if (sessionInfo) {
      state.sessionId = sessionInfo.sessionId;
      console.log(`[Server] Started session ${sessionInfo.sessionId} for game ${gameType}`);

      // Send initial frame
      const frame = engine.getFrame(sessionInfo.sessionId);
      if (frame) {
        sendFrame(ws, frame);
      }

      // Start frame streaming
      state.frameInterval = setInterval(() => {
        if (state.sessionId) {
          const frame = engine.getFrame(state.sessionId);
          if (frame) {
            sendFrame(ws, frame);
          }
        }
      }, FRAME_INTERVAL);
    } else {
      ws.send(JSON.stringify({ error: 'Failed to start game session', gameType }));
      ws.close();
    }
  }

  // Handle incoming messages (user input)
  ws.on('message', (data: Buffer) => {
    try {
      const input: UserInput = JSON.parse(data.toString());

      if (state.sessionId) {
        const engine = getGameEngine();
        const frame = engine.processInput(state.sessionId, input);

        // Send updated frame immediately after input
        if (frame) {
          sendFrame(ws, frame);
        }

        // Forward coach events if any
        const coachEvents = engine.getCoachEvents(state.sessionId);
        if (coachEvents.length > 0) {
          ws.send(JSON.stringify({ type: 'coach_events', events: coachEvents }));
        }
      }
    } catch (err) {
      console.error('[Server] Error processing message:', err);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`[Server] Client disconnected`);

    // Clean up
    if (state.frameInterval) {
      clearInterval(state.frameInterval);
    }

    if (state.sessionId) {
      const engine = getGameEngine();
      engine.endSession(state.sessionId);
    }

    clientStates.delete(ws);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error('[Server] WebSocket error:', err);
  });
});

// === FRAME SENDING ===

function sendFrame(ws: WebSocket, frame: GameFrame): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'frame', frame }));
  }
}

// === SERVER STARTUP ===

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    ATLAS GAME SERVER                              ║
╠══════════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                              ║
║  Port:       ${PORT}                                                  ║
║  Games:      ${registry.getCount()} registered                                       ║
║  Endpoint:   ws://localhost:${PORT}/play/{gameType}                   ║
╠══════════════════════════════════════════════════════════════════╣
║  All game logic runs on this server.                              ║
║  Clients receive ONLY draw commands - no source code.             ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

// === GRACEFUL SHUTDOWN ===

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');

  const engine = getGameEngine();
  engine.shutdown();

  wss.close(() => {
    httpServer.close(() => {
      console.log('[Server] Goodbye!');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Received SIGTERM, shutting down...');
  process.emit('SIGINT', 'SIGINT');
});
