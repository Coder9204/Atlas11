/**
 * Draw Commands - The ONLY data sent to clients
 *
 * These are simple rendering instructions with NO game logic.
 * An attacker seeing these learns nothing about formulas, physics, or algorithms.
 */

// === PRIMITIVE DRAW COMMANDS ===

export interface ClearCommand {
  type: 'clear';
  id: string;
  props: {
    color: string;
    width?: number;
    height?: number;
  };
}

export interface RectCommand {
  type: 'rect';
  id: string;
  props: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number;
    ry?: number;
    opacity?: number;
  };
}

export interface CircleCommand {
  type: 'circle';
  id: string;
  props: {
    cx: number;
    cy: number;
    r: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface EllipseCommand {
  type: 'ellipse';
  id: string;
  props: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface LineCommand {
  type: 'line';
  id: string;
  props: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    opacity?: number;
  };
}

export interface PathCommand {
  type: 'path';
  id: string;
  props: {
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface TextCommand {
  type: 'text';
  id: string;
  props: {
    x: number;
    y: number;
    text: string;
    fill?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    fontFamily?: string;
    textAnchor?: 'start' | 'middle' | 'end';
    opacity?: number;
  };
}

export interface GroupCommand {
  type: 'group';
  id: string;
  props: {
    transform?: string;
    opacity?: number;
    children: DrawCommand[];
  };
}

export interface GradientCommand {
  type: 'gradient';
  id: string;
  props: {
    gradientType: 'linear' | 'radial';
    gradientId: string;
    stops: Array<{ offset: string; color: string; opacity?: number }>;
    // Linear gradient specific
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    // Radial gradient specific
    cx?: string;
    cy?: string;
    r?: string;
  };
}

export interface FilterCommand {
  type: 'filter';
  id: string;
  props: {
    filterId: string;
    filterType: 'blur' | 'glow' | 'shadow';
    params: Record<string, any>;
  };
}

export interface AnimationCommand {
  type: 'animation';
  id: string;
  props: {
    targetId: string;
    attribute: string;
    from: string | number;
    to: string | number;
    duration: number;
    repeatCount?: number | 'indefinite';
    easing?: string;
  };
}

// Union type for all draw commands
export type DrawCommand =
  | ClearCommand
  | RectCommand
  | CircleCommand
  | EllipseCommand
  | LineCommand
  | PathCommand
  | TextCommand
  | GroupCommand
  | GradientCommand
  | FilterCommand
  | AnimationCommand;

// === UI STATE (buttons, sliders, etc.) ===

export interface SliderState {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  color?: string;
}

export interface ButtonState {
  id: string;
  label: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  icon?: string;
}

export interface ToggleState {
  id: string;
  label: string;
  value: boolean;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}

export interface SelectState {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

export interface ProgressState {
  id: string;
  current: number;
  total: number;
  labels?: string[];
  color?: string;
}

export interface UIState {
  sliders?: SliderState[];
  buttons?: ButtonState[];
  toggles?: ToggleState[];
  selects?: SelectState[];
  progress?: ProgressState;
  header?: {
    title: string;
    subtitle?: string;
  };
  footer?: {
    text: string;
    icon?: string;
  };
  coachMessage?: string;
}

// === GAME FRAME - The complete output sent to client ===

export interface GameFrame {
  // Drawing commands for the canvas/SVG
  commands: DrawCommand[];

  // Definitions (gradients, filters) - sent once, reused
  defs?: DrawCommand[];

  // UI state for controls
  ui: UIState;

  // Sound effects to play (type-based, not frequency)
  sounds?: Array<'click' | 'success' | 'failure' | 'transition' | 'complete'>;

  // Frame metadata
  timestamp: number;
  frameNumber: number;

  // Viewport info
  viewport: {
    width: number;
    height: number;
  };
}

// === EVENTS FROM AI COACH (optional) ===

export interface CoachEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, any>;
  timestamp: number;
}
