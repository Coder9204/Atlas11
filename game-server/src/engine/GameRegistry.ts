/**
 * Game Registry - Central registry for all game types
 *
 * Games register their factories here. This is the ONLY place
 * where game code is referenced.
 */

import { GameInstance, GameFactory, GameRegistry as IGameRegistry } from '../types/GameInstance.js';

export class GameRegistryImpl implements IGameRegistry {
  private factories: Map<string, GameFactory> = new Map();

  /**
   * Register a game factory
   */
  register(gameType: string, factory: GameFactory): void {
    if (this.factories.has(gameType)) {
      console.warn(`Game type '${gameType}' already registered. Overwriting.`);
    }
    this.factories.set(gameType, factory);
    console.log(`Registered game: ${gameType}`);
  }

  /**
   * Create a new game instance
   */
  create(gameType: string, sessionId: string): GameInstance | null {
    const factory = this.factories.get(gameType);
    if (!factory) {
      console.error(`Unknown game type: ${gameType}`);
      return null;
    }

    try {
      return factory(sessionId);
    } catch (error) {
      console.error(`Error creating game '${gameType}':`, error);
      return null;
    }
  }

  /**
   * Check if a game type is registered
   */
  has(gameType: string): boolean {
    return this.factories.has(gameType);
  }

  /**
   * Get all registered game types
   */
  getGameTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get count of registered games
   */
  getCount(): number {
    return this.factories.size;
  }
}

// Singleton instance
let registryInstance: GameRegistryImpl | null = null;

export function getGameRegistry(): GameRegistryImpl {
  if (!registryInstance) {
    registryInstance = new GameRegistryImpl();
  }
  return registryInstance;
}
