/**
 * Remote Game Renderer - Thin Client for Server-Side Games
 *
 * THIS IS ALL THE CLIENT CODE - NO GAME LOGIC.
 *
 * This component:
 * 1. Connects to the game server via WebSocket
 * 2. Receives draw commands (shapes, positions, colors)
 * 3. Renders them to canvas/SVG
 * 4. Sends user input back to server
 *
 * What an attacker sees in this file: Generic rendering code.
 * What they DON'T see: Game logic, physics, formulas, scoring.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// === TYPES (matching server types) ===

interface DrawCommand {
  type: string;
  id: string;
  props: Record<string, any>;
}

interface SliderState {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  color?: string;
}

interface ButtonState {
  id: string;
  label: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  icon?: string;
}

interface ToggleState {
  id: string;
  label: string;
  value: boolean;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}

interface ProgressState {
  id: string;
  current: number;
  total: number;
  labels?: string[];
  color?: string;
}

interface UIState {
  sliders?: SliderState[];
  buttons?: ButtonState[];
  toggles?: ToggleState[];
  progress?: ProgressState;
  header?: { title: string; subtitle?: string };
  footer?: { text: string; icon?: string };
  coachMessage?: string;
}

interface GameFrame {
  commands: DrawCommand[];
  defs?: DrawCommand[];
  ui: UIState;
  sounds?: Array<'click' | 'success' | 'failure' | 'transition' | 'complete'>;
  timestamp: number;
  frameNumber: number;
  viewport: { width: number; height: number };
}

interface UserInput {
  type: string;
  id?: string;
  value?: any;
  timestamp: number;
  [key: string]: any;
}

// === SOUND UTILITY (client-side only) ===

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' },
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    /* Audio not available */
  }
};

// === COLOR PALETTE ===

const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#a855f7',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === TEST QUESTIONS ===

const testQuestions = [
  {
    scenario: "You're playing an online shooter and notice your character seems to teleport or stutter when moving. Your internet speed test shows 100 Mbps download but 85ms ping to the game server.",
    question: "What is the primary cause of this gameplay issue?",
    options: [
      { id: 'a', label: "Insufficient download bandwidth causing slow data transfer" },
      { id: 'b', label: "Network latency (ping) causing delayed server communication", correct: true },
      { id: 'c', label: "The game server running out of memory" },
      { id: 'd', label: "Your graphics card not rendering frames fast enough" }
    ],
    explanation: "Network latency (ping) measures the round-trip time for data to travel between your device and the server. At 85ms, there's a noticeable delay between your input and the server's response, causing stuttering. Bandwidth (100 Mbps) is more than sufficient for gaming; latency is the critical factor for real-time responsiveness."
  },
  {
    scenario: "A game development team is designing a multiplayer battle royale game with 100 players. They must decide between peer-to-peer (P2P) networking and a client-server architecture.",
    question: "Why would client-server architecture be the better choice for this game?",
    options: [
      { id: 'a', label: "P2P uses less bandwidth than client-server" },
      { id: 'b', label: "Client-server provides centralized authority preventing cheating and scales better with many players", correct: true },
      { id: 'c', label: "P2P requires each player to have a static IP address" },
      { id: 'd', label: "Client-server games always have lower latency than P2P" }
    ],
    explanation: "Client-server architecture maintains a single authoritative game state on the server, making cheating much harder since clients cannot directly manipulate other players' data. With 100 players, P2P would require each client to maintain connections with all others (creating O(n^2) connections), while client-server only needs n connections to the central server."
  },
  {
    scenario: "A competitive fighting game advertises a '128 tick rate server' while another game runs at '30 tick rate.' During gameplay, players notice the 128-tick game feels more responsive to quick inputs.",
    question: "What does tick rate measure and why does higher tick rate improve responsiveness?",
    options: [
      { id: 'a', label: "Tick rate is the frame rate of the game graphics on your screen" },
      { id: 'b', label: "Tick rate is how many times per second the server updates game state and sends data to clients", correct: true },
      { id: 'c', label: "Tick rate measures how fast your internet connection downloads data" },
      { id: 'd', label: "Tick rate is the refresh rate of your monitor in hertz" }
    ],
    explanation: "Tick rate is the frequency at which the server processes game logic and sends state updates to clients. At 128 ticks/second, the server updates every ~7.8ms, while 30 ticks/second means updates every ~33ms. Higher tick rates capture player inputs more precisely and reduce the time between an action occurring and other players seeing it."
  },
  {
    scenario: "In an online FPS game, you fire at an enemy who appears stationary on your screen. The shot registers as a hit on your client, but the server rejects it because the enemy had already moved on the server's timeline.",
    question: "What technique do game servers use to resolve this discrepancy fairly?",
    options: [
      { id: 'a', label: "Always trust the client's version of events to reward good aim" },
      { id: 'b', label: "Lag compensation - the server rewinds time to verify what the shooter saw when they fired", correct: true },
      { id: 'c', label: "Randomly decide which player wins the conflict" },
      { id: 'd', label: "Reject all shots that don't match current server state exactly" }
    ],
    explanation: "Lag compensation allows the server to 'rewind' the game state to the moment the shooter fired, accounting for their network latency. The server checks if the shot would have hit based on where the target was when the shooter saw them. This creates a fairer experience by not punishing players for unavoidable network delays."
  },
  {
    scenario: "A fighting game uses 'rollback netcode' instead of traditional 'delay-based netcode.' Players praise the game for feeling responsive even with 100ms+ ping opponents.",
    question: "How does rollback netcode achieve this responsive feel despite high latency?",
    options: [
      { id: 'a', label: "It compresses game data to send packets faster" },
      { id: 'b', label: "It predicts inputs locally, then corrects by rolling back and replaying if predictions were wrong", correct: true },
      { id: 'c', label: "It reduces the game's frame rate to match the slowest player's connection" },
      { id: 'd', label: "It increases server tick rate proportionally to player ping" }
    ],
    explanation: "Rollback netcode executes game logic immediately using predicted inputs (typically assuming players continue their last action). When actual inputs arrive and differ from predictions, the game 'rolls back' to the divergence point and replays frames with correct inputs. This eliminates input delay at the cost of occasional visual corrections, which most players find preferable to constant input lag."
  },
  {
    scenario: "While watching a replay of your online racing game, you notice other cars move smoothly even though the server only sends position updates 20 times per second. Your game renders at 60 FPS.",
    question: "What techniques allow smooth motion between the 20Hz server updates?",
    options: [
      { id: 'a', label: "The game automatically increases server tick rate during replays" },
      { id: 'b', label: "Interpolation smooths between past known positions; extrapolation predicts future positions beyond the latest update", correct: true },
      { id: 'c', label: "Your graphics card generates additional server data" },
      { id: 'd', label: "The replay file contains all 60 FPS worth of position data" }
    ],
    explanation: "Interpolation renders objects at positions between two known server updates, creating smooth motion by blending past states (typically rendering slightly behind real-time). Extrapolation predicts where objects will be beyond the latest received data using velocity and physics. Most games use interpolation for reliability, adding a small visual delay in exchange for smooth, accurate motion."
  },
  {
    scenario: "A player discovers they can modify their game client to report impossibly high damage values. Despite this, the cheat doesn't work in competitive matches on official servers.",
    question: "What server architecture principle prevents this cheat from working?",
    options: [
      { id: 'a', label: "The server encrypts all damage calculations" },
      { id: 'b', label: "Authoritative servers calculate all game-critical values server-side, treating client data as untrusted input", correct: true },
      { id: 'c', label: "Other players' clients verify and reject the fake damage" },
      { id: 'd', label: "The game's anti-cheat scans for memory modifications" }
    ],
    explanation: "Authoritative servers never trust clients to report outcomes - they only accept input commands (like 'fire weapon') and calculate results server-side. When the client reports 'I did 9999 damage,' the server ignores this and computes actual damage based on weapon stats, distance, and hit detection it performed itself. The client-reported value is purely for local display prediction."
  },
  {
    scenario: "Two friends try to play a peer-to-peer game together but cannot connect directly. Both are behind home routers using NAT (Network Address Translation). One player eventually hosts successfully after enabling 'UPnP' in their router settings.",
    question: "What networking challenge did NAT traversal need to overcome?",
    options: [
      { id: 'a', label: "NAT blocks all gaming traffic as a security measure" },
      { id: 'b', label: "Devices behind NAT have private IPs that aren't directly reachable from the internet; techniques like UPnP, STUN, or hole-punching establish connections", correct: true },
      { id: 'c', label: "NAT slows down internet speed, making gaming impossible" },
      { id: 'd', label: "Both players needed static IP addresses from their ISP" }
    ],
    explanation: "NAT allows multiple devices to share one public IP by assigning private internal addresses (like 192.168.x.x). External devices cannot initiate connections to these private IPs directly. NAT traversal techniques like UPnP (automatic port forwarding), STUN (discovering external IP/port), and UDP hole-punching (coordinated simultaneous outbound packets) enable connections between NAT'd devices."
  },
  {
    scenario: "A mobile game developer needs to reduce bandwidth usage for players on cellular data. The game currently sends complete player state (position, health, inventory, etc.) 30 times per second to all nearby players.",
    question: "Which optimization strategy would most effectively reduce bandwidth while maintaining gameplay quality?",
    options: [
      { id: 'a', label: "Reduce the tick rate to 5 updates per second for all data" },
      { id: 'b', label: "Use delta compression (only send what changed) and prioritize updates based on relevance and distance", correct: true },
      { id: 'c', label: "Send data as plain text instead of binary format" },
      { id: 'd', label: "Disable updates entirely and rely on client prediction" }
    ],
    explanation: "Delta compression transmits only values that changed since the last acknowledged update, dramatically reducing packet size when most state is static. Relevance-based prioritization sends frequent updates for nearby/visible players while reducing update rates for distant entities. Combined with quantization (reducing precision) and interest management (only sending relevant data), bandwidth can be reduced 80-90% without perceptible quality loss."
  },
  {
    scenario: "A cloud gaming service like GeForce NOW or Xbox Cloud Gaming lets you play high-end PC games on a basic laptop or phone. Users report the experience feels slightly 'sluggish' compared to local play, even with fast internet.",
    question: "What fundamental latency challenge makes cloud gaming feel different from local play?",
    options: [
      { id: 'a', label: "Cloud servers use slower processors than gaming PCs" },
      { id: 'b', label: "Every input must travel to the cloud, be processed, rendered, video-encoded, and streamed back, adding unavoidable round-trip delay", correct: true },
      { id: 'c', label: "Cloud gaming services intentionally add delay to prevent cheating" },
      { id: 'd', label: "Video compression makes the game run at lower frame rates" }
    ],
    explanation: "Cloud gaming adds multiple latency stages: input transmission to server (~5-30ms), server processing and rendering (~8-16ms), video encoding (~2-8ms), transmission back (~5-30ms), and client decoding/display (~2-10ms). Even with excellent infrastructure, total latency typically adds 40-80ms versus local play. This is imperceptible for turn-based games but noticeable in fast-action titles requiring quick reactions."
  }
];

// === PROPS ===

interface RemoteGameRendererProps {
  gameType: string;
  serverUrl?: string;
  onGameEvent?: (event: any) => void;
  userId?: string;
  resumePhase?: string;
}

// === MAIN COMPONENT ===

export const RemoteGameRenderer: React.FC<RemoteGameRendererProps> = ({
  gameType,
  serverUrl = 'wss://game.yourapp.com',
  onGameEvent,
  userId = 'anonymous',
  resumePhase,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ui, setUi] = useState<UIState>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: 700, height: 350 });
  const [isMobile, setIsMobile] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const frameRef = useRef<GameFrame | null>(null);
  const defsRef = useRef<DrawCommand[]>([]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // === WEBSOCKET CONNECTION ===

  useEffect(() => {
    // For development/demo, use HTTP polling instead of WebSocket
    // In production, this would be a real WebSocket connection
    const connectToServer = async () => {
      try {
        // In production: const ws = new WebSocket(`${serverUrl}/play/${gameType}`);

        // For demo purposes, we'll simulate the connection
        console.log(`[RemoteGame] Connecting to ${gameType}...`);
        setConnected(true);

        // Simulate initial frame
        // In production, this would come from the WebSocket
      } catch (err) {
        setError('Failed to connect to game server');
        console.error('[RemoteGame] Connection error:', err);
      }
    };

    connectToServer();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [gameType, serverUrl, userId, resumePhase]);

  // === INPUT SENDING ===

  const sendInput = useCallback((input: Omit<UserInput, 'timestamp'>) => {
    const fullInput: UserInput = {
      ...input,
      timestamp: Date.now(),
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(fullInput));
    } else {
      // For demo, log the input
      console.log('[RemoteGame] Input:', fullInput);
    }

    // Play click sound locally for responsiveness
    playSound('click');
  }, []);

  // === FRAME RENDERING ===

  const renderFrame = useCallback((frame: GameFrame) => {
    frameRef.current = frame;

    // Store defs for reuse
    if (frame.defs) {
      defsRef.current = frame.defs;
    }

    // Update UI state
    setUi(frame.ui);

    // Update viewport
    setViewport(frame.viewport);

    // Play sounds
    if (frame.sounds) {
      frame.sounds.forEach((sound) => playSound(sound));
    }

    // Render SVG commands
    renderSVG(frame.commands);
  }, []);

  // === SVG RENDERING ===

  const renderSVG = useCallback((commands: DrawCommand[]) => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear existing content (except defs)
    const existingDefs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (existingDefs) {
      svg.appendChild(existingDefs);
    }

    // Render each command
    commands.forEach((cmd) => {
      const element = createSVGElement(cmd);
      if (element) {
        svg.appendChild(element);
      }
    });
  }, []);

  const createSVGElement = (cmd: DrawCommand): SVGElement | null => {
    const { type, props } = cmd;

    switch (type) {
      case 'clear':
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', String(props.width || viewport.width));
        bg.setAttribute('height', String(props.height || viewport.height));
        bg.setAttribute('fill', props.color);
        return bg;

      case 'rect':
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(props.x));
        rect.setAttribute('y', String(props.y));
        rect.setAttribute('width', String(props.width));
        rect.setAttribute('height', String(props.height));
        if (props.fill) rect.setAttribute('fill', props.fill);
        if (props.stroke) rect.setAttribute('stroke', props.stroke);
        if (props.strokeWidth) rect.setAttribute('stroke-width', String(props.strokeWidth));
        if (props.rx) rect.setAttribute('rx', String(props.rx));
        if (props.ry) rect.setAttribute('ry', String(props.ry));
        if (props.opacity !== undefined) rect.setAttribute('opacity', String(props.opacity));
        return rect;

      case 'circle':
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(props.cx));
        circle.setAttribute('cy', String(props.cy));
        circle.setAttribute('r', String(props.r));
        if (props.fill) circle.setAttribute('fill', props.fill);
        if (props.stroke) circle.setAttribute('stroke', props.stroke);
        if (props.strokeWidth) circle.setAttribute('stroke-width', String(props.strokeWidth));
        if (props.opacity !== undefined) circle.setAttribute('opacity', String(props.opacity));
        return circle;

      case 'ellipse':
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', String(props.cx));
        ellipse.setAttribute('cy', String(props.cy));
        ellipse.setAttribute('rx', String(props.rx));
        ellipse.setAttribute('ry', String(props.ry));
        if (props.fill) ellipse.setAttribute('fill', props.fill);
        if (props.stroke) ellipse.setAttribute('stroke', props.stroke);
        if (props.opacity !== undefined) ellipse.setAttribute('opacity', String(props.opacity));
        return ellipse;

      case 'line':
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(props.x1));
        line.setAttribute('y1', String(props.y1));
        line.setAttribute('x2', String(props.x2));
        line.setAttribute('y2', String(props.y2));
        line.setAttribute('stroke', props.stroke);
        if (props.strokeWidth) line.setAttribute('stroke-width', String(props.strokeWidth));
        if (props.strokeDasharray) line.setAttribute('stroke-dasharray', props.strokeDasharray);
        if (props.opacity !== undefined) line.setAttribute('opacity', String(props.opacity));
        return line;

      case 'path':
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', props.d);
        if (props.fill) path.setAttribute('fill', props.fill);
        if (props.stroke) path.setAttribute('stroke', props.stroke);
        if (props.strokeWidth) path.setAttribute('stroke-width', String(props.strokeWidth));
        if (props.opacity !== undefined) path.setAttribute('opacity', String(props.opacity));
        return path;

      case 'text':
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(props.x));
        text.setAttribute('y', String(props.y));
        text.textContent = props.text;
        if (props.fill) text.setAttribute('fill', props.fill);
        if (props.fontSize) text.setAttribute('font-size', String(props.fontSize));
        if (props.fontWeight) text.setAttribute('font-weight', String(props.fontWeight));
        if (props.fontFamily) text.setAttribute('font-family', props.fontFamily);
        if (props.textAnchor) text.setAttribute('text-anchor', props.textAnchor);
        if (props.opacity !== undefined) text.setAttribute('opacity', String(props.opacity));
        return text;

      case 'group':
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (props.transform) group.setAttribute('transform', props.transform);
        if (props.opacity !== undefined) group.setAttribute('opacity', String(props.opacity));
        if (props.children) {
          props.children.forEach((child: DrawCommand) => {
            const childElement = createSVGElement(child);
            if (childElement) {
              group.appendChild(childElement);
            }
          });
        }
        return group;

      default:
        console.warn(`Unknown draw command type: ${type}`);
        return null;
    }
  };

  // === UI RENDERING ===

  const renderButton = (btn: ButtonState) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
        color: colors.textPrimary,
        boxShadow: `0 4px 20px ${colors.primary}40`,
      },
      secondary: {
        background: colors.bgCardLight,
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
      },
      success: {
        background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
        color: colors.textPrimary,
        boxShadow: `0 4px 20px ${colors.success}40`,
      },
      danger: {
        background: `linear-gradient(135deg, ${colors.danger} 0%, #dc2626 100%)`,
        color: colors.textPrimary,
      },
      ghost: {
        background: 'transparent',
        color: colors.textSecondary,
      },
    };

    return (
      <button
        key={btn.id}
        onClick={() => sendInput({ type: 'button_click', id: btn.id })}
        disabled={btn.disabled}
        style={{
          padding: '12px 24px',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: btn.disabled ? 'not-allowed' : 'pointer',
          opacity: btn.disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          ...variantStyles[btn.variant || 'primary'],
        }}
      >
        {btn.icon && <span style={{ marginRight: '8px' }}>{btn.icon}</span>}
        {btn.label}
      </button>
    );
  };

  const renderSlider = (slider: SliderState) => (
    <div key={slider.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
        {slider.label}: {slider.value}
      </label>
      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step || 1}
        value={slider.value}
        disabled={slider.disabled}
        onChange={(e) =>
          sendInput({ type: 'slider_change', id: slider.id, value: Number(e.target.value) })
        }
        style={{
          width: '150px',
          accentColor: slider.color || colors.primary,
        }}
      />
    </div>
  );

  const renderToggle = (toggle: ToggleState) => (
    <div key={toggle.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
        {toggle.label}
      </span>
      <button
        onClick={() => sendInput({ type: 'toggle_change', id: toggle.id, value: !toggle.value })}
        disabled={toggle.disabled}
        style={{
          padding: '8px 16px',
          borderRadius: '20px',
          border: 'none',
          background: toggle.value ? colors.success : colors.bgCardLight,
          color: colors.textPrimary,
          fontWeight: 600,
          fontSize: '12px',
          cursor: toggle.disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {toggle.value ? toggle.onLabel || 'ON' : toggle.offLabel || 'OFF'}
      </button>
    </div>
  );

  const renderProgress = (progress: ProgressState) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {Array.from({ length: progress.total }).map((_, i) => (
        <div
          key={i}
          onClick={() => i < progress.current - 1 && sendInput({ type: 'progress_click', index: i })}
          style={{
            width: i === progress.current - 1 ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            backgroundColor:
              i < progress.current - 1
                ? colors.success
                : i === progress.current - 1
                ? progress.color || colors.primary
                : colors.border,
            cursor: i < progress.current - 1 ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
          }}
          title={progress.labels?.[i]}
        />
      ))}
      <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
        {progress.current} / {progress.total}
      </span>
    </div>
  );

  // === LOADING/ERROR STATES ===

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: colors.bgDark,
          color: colors.danger,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: colors.primary,
              color: colors.textPrimary,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: colors.bgDark,
          color: colors.textSecondary,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: `3px solid ${colors.border}`,
              borderTopColor: colors.primary,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div>Connecting to game server...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // === MAIN RENDER ===

  return (
    <div
      className="remote-game-renderer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.bgDark,
        color: colors.textPrimary,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      {ui.header && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{ui.header.title}</span>
            {ui.header.subtitle && (
              <span
                style={{
                  marginLeft: '12px',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: `${colors.primary}20`,
                  color: colors.primary,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {ui.header.subtitle}
              </span>
            )}
          </div>
          {ui.progress && renderProgress(ui.progress)}
        </div>
      )}

      {/* Coach Message */}
      {ui.coachMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: `${colors.primary}10`,
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>
            {ui.coachMessage}
          </span>
        </div>
      )}

      {/* Game Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflow: 'hidden',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          style={{
            width: '100%',
            maxHeight: '100%',
            borderRadius: '12px',
            backgroundColor: colors.bgCard,
          }}
        >
          {/* Premium SVG Definitions */}
          <defs>
            {/* === LINEAR GRADIENTS FOR DEVICE VISUALIZATION === */}

            {/* Client device metallic body gradient */}
            <linearGradient id="rmtgClientDevice" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Server chassis gradient with depth */}
            <linearGradient id="rmtgServerChassis" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="15%" stopColor="#374151" />
              <stop offset="40%" stopColor="#1f2937" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="85%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Server rack front panel */}
            <linearGradient id="rmtgServerPanel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="10%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="90%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Screen display gradient */}
            <linearGradient id="rmtgScreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="20%" stopColor="#0f172a" />
              <stop offset="80%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Data packet gradient (cyan to purple) */}
            <linearGradient id="rmtgDataPacket" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="20%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="80%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
            </linearGradient>

            {/* Network cable gradient */}
            <linearGradient id="rmtgNetworkCable" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="75%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            {/* === RADIAL GRADIENTS FOR NETWORK/SIGNAL EFFECTS === */}

            {/* WiFi/signal emanation */}
            <radialGradient id="rmtgSignalWave" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>

            {/* Server activity glow */}
            <radialGradient id="rmtgServerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="30%" stopColor="#059669" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#047857" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
            </radialGradient>

            {/* Latency indicator glow (good - green) */}
            <radialGradient id="rmtgLatencyGood" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* Latency indicator glow (warning - amber) */}
            <radialGradient id="rmtgLatencyWarn" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Latency indicator glow (poor - red) */}
            <radialGradient id="rmtgLatencyPoor" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Data center ambient glow */}
            <radialGradient id="rmtgDataCenterGlow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>

            {/* Connection node pulse */}
            <radialGradient id="rmtgNodePulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS USING feGaussianBlur + feMerge === */}

            {/* Standard element glow */}
            <filter id="rmtgGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for status indicators */}
            <filter id="rmtgSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow for active connections */}
            <filter id="rmtgIntenseGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Data packet trail effect */}
            <filter id="rmtgPacketTrail" x="-100%" y="-50%" width="300%" height="200%">
              <feGaussianBlur stdDeviation="4 1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Server LED glow */}
            <filter id="rmtgLedGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Network wave pulse effect */}
            <filter id="rmtgWavePulse" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Drop shadow for depth */}
            <filter id="rmtgDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            {/* Inner glow effect */}
            <filter id="rmtgInnerGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* === BACKGROUND PATTERNS === */}

            {/* Grid pattern for background */}
            <pattern id="rmtgBackgroundGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Circuit board pattern */}
            <pattern id="rmtgCircuitPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="none" />
              <line x1="0" y1="20" x2="15" y2="20" stroke="#334155" strokeWidth="1" strokeOpacity="0.2" />
              <line x1="25" y1="20" x2="40" y2="20" stroke="#334155" strokeWidth="1" strokeOpacity="0.2" />
              <line x1="20" y1="0" x2="20" y2="15" stroke="#334155" strokeWidth="1" strokeOpacity="0.2" />
              <line x1="20" y1="25" x2="20" y2="40" stroke="#334155" strokeWidth="1" strokeOpacity="0.2" />
              <circle cx="20" cy="20" r="2" fill="#334155" fillOpacity="0.3" />
            </pattern>

            {/* === BACKGROUND GRADIENT === */}
            <linearGradient id="rmtgLabBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
          </defs>

          {/* Background Layer */}
          <rect width={viewport.width} height={viewport.height} fill="url(#rmtgLabBackground)" />
          <rect width={viewport.width} height={viewport.height} fill="url(#rmtgBackgroundGrid)" />
          <rect width={viewport.width} height={viewport.height} fill="url(#rmtgDataCenterGlow)" />

          {/* === CLIENT DEVICE (Left Side) === */}
          <g transform="translate(40, 100)">
            {/* Device shadow */}
            <rect x="-5" y="5" width="130" height="150" rx="12" fill="#000" opacity="0.3" filter="url(#rmtgDropShadow)" />

            {/* Device body */}
            <rect x="0" y="0" width="120" height="140" rx="10" fill="url(#rmtgClientDevice)" stroke="#475569" strokeWidth="1.5" />

            {/* Screen bezel */}
            <rect x="8" y="8" width="104" height="85" rx="5" fill="#111827" stroke="#1f2937" strokeWidth="1" />

            {/* Screen display */}
            <rect x="12" y="12" width="96" height="77" rx="3" fill="url(#rmtgScreenGradient)" />

            {/* Screen content - game frame indicator */}
            <rect x="18" y="18" width="84" height="65" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />

            {/* Screen game elements */}
            <rect x="25" y="28" width="30" height="20" rx="3" fill="#06b6d4" opacity="0.6" />
            <rect x="62" y="35" width="25" height="15" rx="2" fill="#a855f7" opacity="0.5" />
            <circle cx="45" cy="60" r="8" fill="#10b981" opacity="0.4" />

            {/* WiFi signal emanating from device */}
            <g transform="translate(60, -15)">
              <circle r="25" fill="url(#rmtgSignalWave)" opacity="0.4">
                <animate attributeName="r" values="15;35;15" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="18" fill="url(#rmtgSignalWave)" opacity="0.6">
                <animate attributeName="r" values="10;25;10" dur="2s" repeatCount="indefinite" begin="0.5s" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" begin="0.5s" />
              </circle>
            </g>

            {/* Keyboard area */}
            <rect x="10" y="100" width="100" height="32" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
            {/* Key rows */}
            {[0, 1, 2].map((row) => (
              <g key={`keyrow-${row}`}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((key) => (
                  <rect
                    key={`key-${row}-${key}`}
                    x={15 + key * 10}
                    y={105 + row * 10}
                    width="8"
                    height="7"
                    rx="1"
                    fill="#334155"
                    stroke="#475569"
                    strokeWidth="0.3"
                  />
                ))}
              </g>
            ))}

            {/* Touchpad */}
            <rect x="40" y="135" width="40" height="3" rx="1" fill="#334155" />

            {/* Status LED */}
            <circle cx="15" cy="97" r="3" fill="#10b981" filter="url(#rmtgLedGlow)">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="60" y="160" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">Client Device</text>
          </g>

          {/* === NETWORK CONNECTION VISUALIZATION (Center) === */}
          <g transform="translate(180, 170)">
            {/* Connection path with animated data packets */}
            <path
              d="M 0,0 C 80,-30 160,-30 240,0 C 320,30 280,30 340,0"
              fill="none"
              stroke="url(#rmtgNetworkCable)"
              strokeWidth="3"
              strokeOpacity="0.4"
              strokeDasharray="8 4"
            />

            {/* Main connection line */}
            <path
              d="M 0,0 C 80,-30 160,-30 240,0 C 320,30 280,30 340,0"
              fill="none"
              stroke="url(#rmtgNetworkCable)"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />

            {/* Animated data packets traveling to server */}
            <circle r="4" fill="url(#rmtgNodePulse)" filter="url(#rmtgPacketTrail)">
              <animateMotion dur="1.5s" repeatCount="indefinite" path="M 0,0 C 80,-30 160,-30 240,0 C 320,30 280,30 340,0" />
            </circle>
            <circle r="4" fill="url(#rmtgNodePulse)" filter="url(#rmtgPacketTrail)">
              <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.5s" path="M 0,0 C 80,-30 160,-30 240,0 C 320,30 280,30 340,0" />
            </circle>
            <circle r="4" fill="url(#rmtgNodePulse)" filter="url(#rmtgPacketTrail)">
              <animateMotion dur="1.5s" repeatCount="indefinite" begin="1s" path="M 0,0 C 80,-30 160,-30 240,0 C 320,30 280,30 340,0" />
            </circle>

            {/* Animated data packets traveling to client (return path) */}
            <circle r="3" fill="#a855f7" filter="url(#rmtgPacketTrail)">
              <animateMotion dur="1.2s" repeatCount="indefinite" path="M 340,0 C 280,30 320,30 240,0 C 160,-30 80,-30 0,0" />
            </circle>
            <circle r="3" fill="#a855f7" filter="url(#rmtgPacketTrail)">
              <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.4s" path="M 340,0 C 280,30 320,30 240,0 C 160,-30 80,-30 0,0" />
            </circle>
            <circle r="3" fill="#a855f7" filter="url(#rmtgPacketTrail)">
              <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.8s" path="M 340,0 C 280,30 320,30 240,0 C 160,-30 80,-30 0,0" />
            </circle>

            {/* Network hop nodes */}
            <g transform="translate(85, -20)">
              <circle r="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle r="5" fill="url(#rmtgNodePulse)" filter="url(#rmtgSoftGlow)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="22" textAnchor="middle" fontSize="8" fill="#64748b">Router</text>
            </g>

            <g transform="translate(170, 0)">
              <circle r="10" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle r="6" fill="url(#rmtgNodePulse)" filter="url(#rmtgSoftGlow)">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.6s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="25" textAnchor="middle" fontSize="8" fill="#64748b">Cloud</text>
            </g>

            <g transform="translate(255, -15)">
              <circle r="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <circle r="5" fill="url(#rmtgNodePulse)" filter="url(#rmtgSoftGlow)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.7s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="22" textAnchor="middle" fontSize="8" fill="#64748b">CDN</text>
            </g>

            {/* Data flow labels */}
            <g transform="translate(50, -50)">
              <rect x="-35" y="-10" width="70" height="18" rx="4" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="0.5" />
              <text x="0" y="3" textAnchor="middle" fontSize="9" fill="#22d3ee" fontWeight="600">Input Data</text>
            </g>

            <g transform="translate(290, 40)">
              <rect x="-40" y="-10" width="80" height="18" rx="4" fill="#a855f7" fillOpacity="0.15" stroke="#a855f7" strokeWidth="0.5" />
              <text x="0" y="3" textAnchor="middle" fontSize="9" fill="#c084fc" fontWeight="600">Render Frames</text>
            </g>
          </g>

          {/* === SERVER RACK (Right Side) === */}
          <g transform="translate(520, 60)">
            {/* Rack shadow */}
            <rect x="5" y="8" width="140" height="220" rx="8" fill="#000" opacity="0.4" />

            {/* Rack frame */}
            <rect x="0" y="0" width="135" height="210" rx="6" fill="url(#rmtgServerChassis)" stroke="#374151" strokeWidth="1.5" />

            {/* Rack mounting rails */}
            <rect x="5" y="0" width="4" height="210" fill="#111827" />
            <rect x="126" y="0" width="4" height="210" fill="#111827" />

            {/* Server units */}
            {[0, 1, 2, 3, 4].map((unit) => (
              <g key={`server-${unit}`} transform={`translate(12, ${15 + unit * 38})`}>
                {/* Server unit body */}
                <rect x="0" y="0" width="110" height="32" rx="3" fill="url(#rmtgServerPanel)" stroke="#475569" strokeWidth="0.5" />

                {/* Front panel details */}
                <rect x="5" y="5" width="60" height="22" rx="2" fill="#0f172a" stroke="#1f2937" strokeWidth="0.5" />

                {/* Ventilation slots */}
                {[0, 1, 2, 3, 4, 5].map((slot) => (
                  <rect key={`vent-${unit}-${slot}`} x={8 + slot * 9} y="10" width="6" height="12" rx="1" fill="#030712" />
                ))}

                {/* Status LEDs */}
                <circle cx="75" cy="10" r="3" fill={unit === 0 ? "#10b981" : unit === 3 ? "#f59e0b" : "#10b981"} filter="url(#rmtgLedGlow)">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur={`${1 + unit * 0.2}s`} repeatCount="indefinite" />
                </circle>
                <circle cx="85" cy="10" r="3" fill="#06b6d4" filter="url(#rmtgLedGlow)">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="0.3s" repeatCount="indefinite" />
                </circle>

                {/* Drive activity */}
                <rect x="75" y="18" width="30" height="8" rx="2" fill="#111827" stroke="#1f2937" strokeWidth="0.3" />
                <rect x="77" y="20" width={12 + (unit % 3) * 5} height="4" rx="1" fill="#06b6d4" opacity="0.7" />
              </g>
            ))}

            {/* Server glow effect */}
            <ellipse cx="67" cy="105" rx="80" ry="120" fill="url(#rmtgServerGlow)" opacity="0.15" filter="url(#rmtgWavePulse)" />

            {/* Label */}
            <text x="67" y="225" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">Game Server</text>
          </g>

          {/* === LATENCY/PERFORMANCE INDICATORS (Bottom) === */}
          <g transform="translate(200, 305)">
            {/* Metrics panel background */}
            <rect x="0" y="0" width="300" height="35" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />

            {/* Latency indicator */}
            <g transform="translate(25, 17)">
              <circle r="8" fill="url(#rmtgLatencyGood)" filter="url(#rmtgSoftGlow)" />
              <text x="15" y="4" fontSize="10" fill="#94a3b8" fontWeight="500">Latency:</text>
              <text x="60" y="4" fontSize="10" fill="#4ade80" fontWeight="700">12ms</text>
            </g>

            {/* FPS indicator */}
            <g transform="translate(120, 17)">
              <circle r="8" fill="url(#rmtgLatencyGood)" filter="url(#rmtgSoftGlow)" />
              <text x="15" y="4" fontSize="10" fill="#94a3b8" fontWeight="500">FPS:</text>
              <text x="42" y="4" fontSize="10" fill="#4ade80" fontWeight="700">60</text>
            </g>

            {/* Connection quality */}
            <g transform="translate(195, 17)">
              <circle r="8" fill="url(#rmtgLatencyGood)" filter="url(#rmtgSoftGlow)" />
              <text x="15" y="4" fontSize="10" fill="#94a3b8" fontWeight="500">Quality:</text>
              <text x="58" y="4" fontSize="10" fill="#4ade80" fontWeight="700">Excellent</text>
            </g>

            {/* Signal bars */}
            <g transform="translate(275, 10)">
              {[0, 1, 2, 3].map((bar) => (
                <rect
                  key={`signal-${bar}`}
                  x={bar * 5}
                  y={14 - bar * 4}
                  width="3"
                  height={6 + bar * 4}
                  rx="1"
                  fill="#10b981"
                  filter="url(#rmtgLedGlow)"
                />
              ))}
            </g>
          </g>

          {/* === TITLE AND LABELS === */}
          <g transform="translate(350, 25)">
            <text textAnchor="middle" fontSize="16" fill="#f8fafc" fontWeight="700">Remote Game Streaming Architecture</text>
            <text y="18" textAnchor="middle" fontSize="10" fill="#64748b">Thin Client - Server-Side Rendering</text>
          </g>

          {/* Commands rendered here dynamically (overlaid on top) */}
        </svg>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '16px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Sliders */}
        <div style={{ display: 'flex', gap: '24px' }}>
          {ui.sliders?.map((s) => renderSlider(s))}
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {ui.toggles?.map((t) => renderToggle(t))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {ui.buttons?.map((b) => renderButton(b))}
        </div>
      </div>

      {/* Footer */}
      {ui.footer && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '10px',
            color: colors.textMuted,
          }}
        >
          {ui.footer.icon && <span>{ui.footer.icon}</span>}
          <span style={{ fontStyle: 'italic' }}>{ui.footer.text}</span>
        </div>
      )}
    </div>
  );
};

export default RemoteGameRenderer;
