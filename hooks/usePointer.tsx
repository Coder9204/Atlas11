import { useCallback, useRef } from 'react';

interface PointerState {
  isDown: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  pointerId: number | null;
}

interface UsePointerOptions {
  onPointerDown?: (x: number, y: number, event: PointerEvent | React.PointerEvent) => void;
  onPointerMove?: (x: number, y: number, event: PointerEvent | React.PointerEvent) => void;
  onPointerUp?: (x: number, y: number, event: PointerEvent | React.PointerEvent) => void;
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  longPressDelay?: number;
  preventScroll?: boolean;
}

export const usePointer = (options: UsePointerOptions = {}) => {
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTap,
    onLongPress,
    longPressDelay = 500,
    preventScroll = false,
  } = options;

  const stateRef = useRef<PointerState>({
    isDown: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    pointerId: null,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didLongPressRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent | PointerEvent) => {
    // Only track primary pointer
    if (!('isPrimary' in event) || !event.isPrimary) return;

    const x = event.clientX;
    const y = event.clientY;

    stateRef.current = {
      isDown: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      pointerId: event.pointerId,
    };

    didLongPressRef.current = false;

    // Set up long press detection
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        didLongPressRef.current = true;
        onLongPress(x, y);
      }, longPressDelay);
    }

    if (preventScroll) {
      event.preventDefault();
    }

    onPointerDown?.(x, y, event);
  }, [onPointerDown, onLongPress, longPressDelay, preventScroll]);

  const handlePointerMove = useCallback((event: React.PointerEvent | PointerEvent) => {
    if (!stateRef.current.isDown) return;
    if (event.pointerId !== stateRef.current.pointerId) return;

    const x = event.clientX;
    const y = event.clientY;

    stateRef.current.currentX = x;
    stateRef.current.currentY = y;

    // Cancel long press if moved too far
    const dx = x - stateRef.current.startX;
    const dy = y - stateRef.current.startY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearLongPressTimer();
    }

    if (preventScroll) {
      event.preventDefault();
    }

    onPointerMove?.(x, y, event);
  }, [onPointerMove, preventScroll, clearLongPressTimer]);

  const handlePointerUp = useCallback((event: React.PointerEvent | PointerEvent) => {
    if (!stateRef.current.isDown) return;
    if (event.pointerId !== stateRef.current.pointerId) return;

    const x = event.clientX;
    const y = event.clientY;

    clearLongPressTimer();

    // Detect tap (short press with minimal movement)
    if (onTap && !didLongPressRef.current) {
      const dx = x - stateRef.current.startX;
      const dy = y - stateRef.current.startY;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        onTap(x, y);
      }
    }

    stateRef.current.isDown = false;
    stateRef.current.pointerId = null;

    onPointerUp?.(x, y, event);
  }, [onPointerUp, onTap, clearLongPressTimer]);

  const handlePointerCancel = useCallback((event: React.PointerEvent | PointerEvent) => {
    clearLongPressTimer();
    stateRef.current.isDown = false;
    stateRef.current.pointerId = null;
  }, [clearLongPressTimer]);

  // Return handlers to spread on elements
  const pointerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerCancel,
    style: preventScroll ? { touchAction: 'none' as const } : undefined,
  };

  return {
    pointerHandlers,
    getState: () => stateRef.current,
  };
};

// Utility to convert mouse handlers to pointer handlers
export const mouseToPointer = (handlers: {
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  return {
    onPointerDown: handlers.onMouseDown as unknown as (e: React.PointerEvent) => void,
    onPointerMove: handlers.onMouseMove as unknown as (e: React.PointerEvent) => void,
    onPointerUp: handlers.onMouseUp as unknown as (e: React.PointerEvent) => void,
    onClick: handlers.onClick,
  };
};

export default usePointer;
