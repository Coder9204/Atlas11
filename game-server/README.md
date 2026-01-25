# Atlas Game Server

**Server-side game execution engine for secure code protection.**

## Overview

This server runs all game logic (physics, formulas, scoring) and streams only **draw commands** to clients. The game source code **never leaves the server**.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Thin Renderer  │◄───│  Draw Commands  │◄───│  WebSocket  │ │
│  │  (SVG/Canvas)   │    │  (JSON stream)  │    │  Connection │ │
│  └────────┬────────┘    └─────────────────┘    └──────┬──────┘ │
│           │                                           │        │
│           ▼                                           │        │
│  ┌─────────────────┐                                  │        │
│  │  Input Capture  │──────────────────────────────────┘        │
│  │  (clicks, keys) │     User events sent to server            │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WSS (encrypted)
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER (Protected)                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Game Engine    │───►│  State Manager  │───►│  Renderer   │ │
│  │  (ALL LOGIC)    │    │  (per session)  │    │  (to JSON)  │ │
│  │                 │    │                 │    │             │ │
│  │  • Physics      │    │  • User state   │    │  • Shapes   │ │
│  │  • Formulas     │    │  • Game state   │    │  • Colors   │ │
│  │  • Scoring      │    │  • Progress     │    │  • Text     │ │
│  │  • AI/Coaching  │    │  • Validation   │    │  • Positions│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                 │
│  YOUR 124K+ LINES OF GAME CODE LIVES HERE - NEVER SENT OUT     │
└─────────────────────────────────────────────────────────────────┘
```

## What Attackers See

**Before (Client-Side):**
```javascript
// In browser DevTools, attacker finds:
calculateTrajectory(){
  const g=9.8,vx=this.velocity*Math.cos(this.angle*Math.PI/180)...
}
// ALL YOUR FORMULAS AND LOGIC
```

**After (Server-Side):**
```javascript
// In browser DevTools, attacker finds:
ws.onmessage=(e)=>{const f=JSON.parse(e.data);renderFrame(f)}
// Generic rendering code - NO GAME LOGIC

// WebSocket traffic shows:
{"commands":[{"type":"circle","props":{"cx":234.5,"cy":156.2,"r":10}}]}
// Just coordinates - formulas are INVISIBLE
```

## Quick Start

```bash
# Install dependencies
cd game-server
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### WebSocket: `/play/{gameType}`

Connect to play a game. Query parameters:
- `userId` - User identifier (optional)
- `resumePhase` - Resume from a specific phase (optional)

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:8080/play/wave_particle_duality?userId=user123');

// Receive frames
ws.onmessage = (event) => {
  const { type, frame } = JSON.parse(event.data);
  if (type === 'frame') {
    renderFrame(frame);
  }
};

// Send input
ws.send(JSON.stringify({
  type: 'button_click',
  id: 'next',
  timestamp: Date.now()
}));
```

### HTTP: `/health`

Health check endpoint.

### HTTP: `/stats`

Server statistics (active sessions, users, etc.).

### HTTP: `/games`

List of available games.

## Adding a New Game

1. Create game class in `src/games/`:

```typescript
import { BaseGame } from '../types/GameInstance';
import { CommandRenderer } from '../renderer/CommandRenderer';

export class MyGame extends BaseGame {
  readonly gameType = 'my_game';
  readonly gameTitle = 'My Game';

  handleInput(input: UserInput): void {
    // Handle user input
  }

  update(deltaTime: number): void {
    // Run physics simulation
  }

  render(): GameFrame {
    const r = new CommandRenderer(700, 350);
    // Draw game state
    return r.toFrame(this.nextFrame());
  }
}
```

2. Register in `src/server.ts`:

```typescript
registry.register('my_game', (sessionId) => new MyGame(sessionId));
```

## Deployment

### Cloud Run (Recommended)

**Quick Deploy:**
```bash
cd game-server
chmod +x deploy.sh
./deploy.sh your-project-id
```

**Manual Deploy:**
```bash
# Build TypeScript
npm run build

# Build and push Docker image
docker build -t gcr.io/YOUR_PROJECT/atlas-game-server:latest .
docker push gcr.io/YOUR_PROJECT/atlas-game-server:latest

# Deploy to Cloud Run
gcloud run deploy atlas-game-server \
  --image gcr.io/YOUR_PROJECT/atlas-game-server:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

**With Firebase Hosting:**
The game server is configured in `firebase.json` to route `/game-server/**` requests to Cloud Run. After deploying to Cloud Run:
```bash
firebase deploy --only hosting
```

### CI/CD with Cloud Build

Use the provided `cloudbuild.yaml` for automated deployments:
```bash
gcloud builds submit --config cloudbuild.yaml
```

## Security

- All game logic runs on server
- Source code never transmitted to clients
- WebSocket connections should use WSS (TLS)
- Session isolation per user
- Rate limiting per user
- Authentication via Firebase Auth tokens

## Performance

- 30 FPS frame streaming (configurable)
- Delta encoding for reduced bandwidth
- Per-session game loops
- Automatic session cleanup
- Horizontal scaling via Cloud Run

## Directory Structure

```
game-server/
├── src/
│   ├── engine/
│   │   ├── GameEngine.ts      # Main game loop
│   │   └── GameRegistry.ts    # Game factory registry
│   ├── games/
│   │   └── physics/
│   │       └── WaveParticleDualityGame.ts
│   ├── renderer/
│   │   └── CommandRenderer.ts # Draw command utilities
│   ├── session/
│   │   └── SessionManager.ts  # Per-user sessions
│   ├── types/
│   │   ├── DrawCommand.ts     # Output types
│   │   ├── UserInput.ts       # Input types
│   │   └── GameInstance.ts    # Game interface
│   └── server.ts              # Entry point
├── package.json
├── tsconfig.json
└── README.md
```
