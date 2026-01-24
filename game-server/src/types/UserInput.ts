/**
 * User Input Types - Events sent FROM client TO server
 *
 * These are simple input events. The server decides what they mean.
 */

// === INPUT EVENT TYPES ===

export interface ButtonClickInput {
  type: 'button_click';
  id: string;
  timestamp: number;
}

export interface SliderChangeInput {
  type: 'slider_change';
  id: string;
  value: number;
  timestamp: number;
}

export interface ToggleChangeInput {
  type: 'toggle_change';
  id: string;
  value: boolean;
  timestamp: number;
}

export interface SelectChangeInput {
  type: 'select_change';
  id: string;
  value: string;
  timestamp: number;
}

export interface ProgressClickInput {
  type: 'progress_click';
  index: number;
  timestamp: number;
}

export interface CanvasClickInput {
  type: 'canvas_click';
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  timestamp: number;
}

export interface CanvasDragInput {
  type: 'canvas_drag';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  timestamp: number;
}

export interface KeyPressInput {
  type: 'key_press';
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  timestamp: number;
}

export interface HintRequestInput {
  type: 'hint_request';
  timestamp: number;
}

export interface PauseResumeInput {
  type: 'pause_resume';
  paused: boolean;
  timestamp: number;
}

export interface ResizeInput {
  type: 'resize';
  width: number;
  height: number;
  isMobile: boolean;
  timestamp: number;
}

// Union type for all user inputs
export type UserInput =
  | ButtonClickInput
  | SliderChangeInput
  | ToggleChangeInput
  | SelectChangeInput
  | ProgressClickInput
  | CanvasClickInput
  | CanvasDragInput
  | KeyPressInput
  | HintRequestInput
  | PauseResumeInput
  | ResizeInput;

// === SESSION TYPES ===

export interface SessionConfig {
  gameType: string;
  userId: string;
  resumePhase?: string;
  guidedMode?: boolean;
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
  };
}

export interface SessionInfo {
  sessionId: string;
  gameType: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  currentPhase: string;
  frameNumber: number;
}
