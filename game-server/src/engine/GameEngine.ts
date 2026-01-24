/**
 * Game Engine - Main game loop and frame generation
 *
 * This is where games run on the server. Client sends input,
 * server processes it, updates state, and sends back draw commands.
 */

import { GameFrame, CoachEvent } from '../types/DrawCommand.js';
import { UserInput, SessionConfig, SessionInfo } from '../types/UserInput.js';
import { GameInstance } from '../types/GameInstance.js';
import { SessionManager } from '../session/SessionManager.js';
import { GameRegistryImpl, getGameRegistry } from './GameRegistry.js';

// Engine configuration
const ENGINE_CONFIG = {
  targetFps: 60,
  tickIntervalMs: 1000 / 60, // ~16.67ms
  maxTicksPerFrame: 3, // Prevent spiral of death
};

export class GameEngine {
  private sessionManager: SessionManager;
  private gameRegistry: GameRegistryImpl;
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();
  private lastTickTime: Map<string, number> = new Map();

  constructor() {
    this.gameRegistry = getGameRegistry();
    this.sessionManager = new SessionManager(this.gameRegistry);
  }

  /**
   * Start a new game session
   */
  startSession(config: SessionConfig): SessionInfo | null {
    const sessionInfo = this.sessionManager.createSession(config);
    if (!sessionInfo) {
      return null;
    }

    // Start game loop for this session
    this.startGameLoop(sessionInfo.sessionId);

    return sessionInfo;
  }

  /**
   * Process user input for a session
   *
   * @returns GameFrame with updated draw commands
   */
  processInput(sessionId: string, input: UserInput): GameFrame | null {
    const game = this.sessionManager.getGame(sessionId);
    if (!game) {
      console.error(`Session not found: ${sessionId}`);
      return null;
    }

    // Handle the input (game logic runs here ON SERVER)
    game.handleInput(input);

    // Update session info
    this.sessionManager.updateSessionInfo(sessionId);

    // Render and return frame
    return game.render();
  }

  /**
   * Get current frame for a session (without input)
   */
  getFrame(sessionId: string): GameFrame | null {
    const game = this.sessionManager.getGame(sessionId);
    if (!game) {
      return null;
    }

    return game.render();
  }

  /**
   * Get coach events for a session
   */
  getCoachEvents(sessionId: string): CoachEvent[] {
    const game = this.sessionManager.getGame(sessionId);
    if (!game) {
      return [];
    }

    const events = game.getCoachEvents();
    game.clearCoachEvents();
    return events;
  }

  /**
   * End a game session
   */
  endSession(sessionId: string): void {
    this.stopGameLoop(sessionId);
    this.sessionManager.closeSession(sessionId);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): SessionInfo | null {
    const session = this.sessionManager.getSession(sessionId);
    return session?.info || null;
  }

  /**
   * Save session state for persistence
   */
  saveSession(sessionId: string): Record<string, any> | null {
    return this.sessionManager.saveSessionState(sessionId);
  }

  /**
   * Resume a saved session
   */
  resumeSession(
    savedState: { info: SessionInfo; gameState: Record<string, any> },
    config: SessionConfig
  ): SessionInfo | null {
    const sessionInfo = this.sessionManager.restoreSession(savedState, config);
    if (sessionInfo) {
      this.startGameLoop(sessionInfo.sessionId);
    }
    return sessionInfo;
  }

  /**
   * Get available game types
   */
  getAvailableGames(): string[] {
    return this.gameRegistry.getGameTypes();
  }

  /**
   * Check if a game type exists
   */
  hasGame(gameType: string): boolean {
    return this.gameRegistry.has(gameType);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    activeSessions: number;
    activeUsers: number;
    gameTypes: Record<string, number>;
    registeredGames: number;
  } {
    const sessionStats = this.sessionManager.getStats();
    return {
      ...sessionStats,
      activeSessions: sessionStats.totalSessions,
      activeUsers: sessionStats.totalUsers,
      registeredGames: this.gameRegistry.getCount(),
    };
  }

  /**
   * Start game loop for a session
   */
  private startGameLoop(sessionId: string): void {
    if (this.gameLoops.has(sessionId)) {
      return; // Already running
    }

    this.lastTickTime.set(sessionId, Date.now());

    const loop = setInterval(() => {
      this.tick(sessionId);
    }, ENGINE_CONFIG.tickIntervalMs);

    this.gameLoops.set(sessionId, loop);
  }

  /**
   * Stop game loop for a session
   */
  private stopGameLoop(sessionId: string): void {
    const loop = this.gameLoops.get(sessionId);
    if (loop) {
      clearInterval(loop);
      this.gameLoops.delete(sessionId);
      this.lastTickTime.delete(sessionId);
    }
  }

  /**
   * Run one tick of the game loop
   */
  private tick(sessionId: string): void {
    const game = this.sessionManager.getGame(sessionId);
    if (!game) {
      this.stopGameLoop(sessionId);
      return;
    }

    const now = Date.now();
    const lastTick = this.lastTickTime.get(sessionId) || now;
    const deltaTime = Math.min(now - lastTick, ENGINE_CONFIG.tickIntervalMs * ENGINE_CONFIG.maxTicksPerFrame);

    // Update game state
    game.update(deltaTime);

    this.lastTickTime.set(sessionId, now);
  }

  /**
   * Register a game type
   */
  registerGame(gameType: string, factory: (sessionId: string) => GameInstance): void {
    this.gameRegistry.register(gameType, factory);
  }

  /**
   * Shutdown the engine
   */
  shutdown(): void {
    // Stop all game loops
    for (const sessionId of this.gameLoops.keys()) {
      this.stopGameLoop(sessionId);
    }

    // Shutdown session manager
    this.sessionManager.shutdown();

    console.log('Game engine shut down');
  }
}

// Singleton instance
let engineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}
