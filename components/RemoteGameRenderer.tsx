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
  const wsRef = useRef<WebSocket | null>(null);
  const frameRef = useRef<GameFrame | null>(null);
  const defsRef = useRef<DrawCommand[]>([]);

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
          {/* Commands rendered here dynamically */}
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
