/**
 * Session Manager - Handles per-user game sessions
 *
 * Each user gets their own isolated game instance.
 * Sessions are tied to authentication and have expiry.
 */

import { GameInstance, GameRegistry } from '../types/GameInstance.js';
import { SessionConfig, SessionInfo } from '../types/UserInput.js';

// Session configuration
const SESSION_CONFIG = {
  maxSessionsPerUser: 3,
  sessionTimeoutMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
};

interface Session {
  info: SessionInfo;
  game: GameInstance;
  lastActivity: number;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private gameRegistry: GameRegistry;

  constructor(gameRegistry: GameRegistry) {
    this.gameRegistry = gameRegistry;
    this.startCleanup();
  }

  /**
   * Create a new game session
   */
  createSession(config: SessionConfig): SessionInfo | null {
    // Check if user has too many sessions
    const userSessionSet = this.userSessions.get(config.userId) || new Set();
    if (userSessionSet.size >= SESSION_CONFIG.maxSessionsPerUser) {
      // Close oldest session
      const oldestSessionId = Array.from(userSessionSet)[0];
      this.closeSession(oldestSessionId);
    }

    // Create game instance
    const sessionId = this.generateSessionId();
    const game = this.gameRegistry.create(config.gameType, sessionId);
    if (!game) {
      console.error(`Unknown game type: ${config.gameType}`);
      return null;
    }

    // Initialize game
    game.initialize(config);

    // Create session info
    const info: SessionInfo = {
      sessionId,
      gameType: config.gameType,
      userId: config.userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      currentPhase: game.getCurrentPhase(),
      frameNumber: 0,
    };

    // Store session
    const session: Session = {
      info,
      game,
      lastActivity: Date.now(),
    };
    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(config.userId)) {
      this.userSessions.set(config.userId, new Set());
    }
    this.userSessions.get(config.userId)!.add(sessionId);

    console.log(`Session created: ${sessionId} for user ${config.userId}, game: ${config.gameType}`);
    return info;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.info.lastActivity = Date.now();
    }
    return session || null;
  }

  /**
   * Get the game instance for a session
   */
  getGame(sessionId: string): GameInstance | null {
    const session = this.getSession(sessionId);
    return session?.game || null;
  }

  /**
   * Update session info after game state changes
   */
  updateSessionInfo(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.info.currentPhase = session.game.getCurrentPhase();
      session.lastActivity = Date.now();
      session.info.lastActivity = Date.now();
    }
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clean up game
      session.game.dispose();

      // Remove from user sessions
      const userSessionSet = this.userSessions.get(session.info.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(session.info.userId);
        }
      }

      // Remove session
      this.sessions.delete(sessionId);
      console.log(`Session closed: ${sessionId}`);
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id)?.info)
      .filter((info): info is SessionInfo => info !== undefined);
  }

  /**
   * Save session state for persistence
   */
  saveSessionState(sessionId: string): Record<string, any> | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      info: session.info,
      gameState: session.game.getState(),
    };
  }

  /**
   * Restore session from saved state
   */
  restoreSession(
    savedState: { info: SessionInfo; gameState: Record<string, any> },
    config: SessionConfig
  ): SessionInfo | null {
    // Create new game instance
    const game = this.gameRegistry.create(savedState.info.gameType, savedState.info.sessionId);
    if (!game) return null;

    // Initialize and restore state
    game.initialize(config);
    game.restoreState(savedState.gameState);

    // Create session
    const session: Session = {
      info: {
        ...savedState.info,
        lastActivity: Date.now(),
      },
      game,
      lastActivity: Date.now(),
    };

    this.sessions.set(savedState.info.sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(config.userId)) {
      this.userSessions.set(config.userId, new Set());
    }
    this.userSessions.get(config.userId)!.add(savedState.info.sessionId);

    return session.info;
  }

  /**
   * Get session statistics
   */
  getStats(): { totalSessions: number; totalUsers: number; gameTypes: Record<string, number> } {
    const gameTypes: Record<string, number> = {};
    for (const session of this.sessions.values()) {
      gameTypes[session.info.gameType] = (gameTypes[session.info.gameType] || 0) + 1;
    }

    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      gameTypes,
    };
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, SESSION_CONFIG.cleanupIntervalMs);
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > SESSION_CONFIG.sessionTimeoutMs) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      console.log(`Cleaning up expired session: ${sessionId}`);
      this.closeSession(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Shutdown - close all sessions
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    console.log('Session manager shut down');
  }
}
