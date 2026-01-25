/**
 * Game Instance Interface - Base class for all server-side games
 *
 * Each game implements this interface. The game logic (physics, formulas,
 * scoring) lives ONLY here on the server and is NEVER sent to clients.
 */

import { GameFrame, CoachEvent } from './DrawCommand.js';
import { UserInput, SessionConfig } from './UserInput.js';

// === GAME INSTANCE INTERFACE ===

export interface GameInstance {
  /**
   * Unique identifier for this game session
   */
  readonly sessionId: string;

  /**
   * Game type identifier (e.g., 'wave_particle_duality')
   */
  readonly gameType: string;

  /**
   * Human-readable game title
   */
  readonly gameTitle: string;

  /**
   * Initialize the game with session configuration
   */
  initialize(config: SessionConfig): void;

  /**
   * Process user input and update game state
   * This is where ALL game logic happens - on the server
   *
   * @param input - User input event
   * @returns void (state updated internally)
   */
  handleInput(input: UserInput): void;

  /**
   * Run one simulation tick (for physics-based games)
   * Called at regular intervals (e.g., 60fps)
   *
   * @param deltaTime - Time since last tick in milliseconds
   */
  update(deltaTime: number): void;

  /**
   * Render current game state to draw commands
   * This is the ONLY output sent to clients
   *
   * @returns GameFrame with draw commands and UI state
   */
  render(): GameFrame;

  /**
   * Get current game phase (for state persistence)
   */
  getCurrentPhase(): string;

  /**
   * Get serializable game state (for persistence/resume)
   * This should NOT include any logic, just data
   */
  getState(): Record<string, any>;

  /**
   * Restore game from saved state
   */
  restoreState(state: Record<string, any>): void;

  /**
   * Clean up resources when session ends
   */
  dispose(): void;

  /**
   * Get events for AI coach (optional)
   */
  getCoachEvents(): CoachEvent[];

  /**
   * Clear coach events after they've been sent
   */
  clearCoachEvents(): void;
}

// === GAME FACTORY ===

export type GameFactory = (sessionId: string) => GameInstance;

// === GAME REGISTRY ===

export interface GameRegistry {
  /**
   * Register a game factory for a game type
   */
  register(gameType: string, factory: GameFactory): void;

  /**
   * Create a new game instance
   */
  create(gameType: string, sessionId: string): GameInstance | null;

  /**
   * Check if a game type is registered
   */
  has(gameType: string): boolean;

  /**
   * Get all registered game types
   */
  getGameTypes(): string[];
}

// === BASE GAME CLASS (optional helper) ===

export abstract class BaseGame implements GameInstance {
  readonly sessionId: string;
  abstract readonly gameType: string;
  abstract readonly gameTitle: string;

  protected frameNumber: number = 0;
  protected coachEvents: CoachEvent[] = [];
  protected viewport = { width: 800, height: 500, isMobile: false };

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  initialize(config: SessionConfig): void {
    this.viewport = {
      width: config.viewport.width,
      height: config.viewport.height,
      isMobile: config.viewport.isMobile,
    };
  }

  abstract handleInput(input: UserInput): void;
  abstract update(deltaTime: number): void;
  abstract render(): GameFrame;
  abstract getCurrentPhase(): string;
  abstract getState(): Record<string, any>;
  abstract restoreState(state: Record<string, any>): void;

  dispose(): void {
    this.coachEvents = [];
  }

  getCoachEvents(): CoachEvent[] {
    return this.coachEvents;
  }

  clearCoachEvents(): void {
    this.coachEvents = [];
  }

  protected emitCoachEvent(eventType: string, details: Record<string, any>): void {
    this.coachEvents.push({
      eventType,
      gameType: this.gameType,
      gameTitle: this.gameTitle,
      details,
      timestamp: Date.now(),
    });
  }

  protected nextFrame(): number {
    return ++this.frameNumber;
  }
}
