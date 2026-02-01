/**
 * useViewport Hook
 *
 * Client-side viewport detection for responsive game rendering.
 * Provides viewport dimensions, type classification, orientation info,
 * and input capability detection (touch, pointer type).
 *
 * Usage:
 * ```tsx
 * const { width, height, viewportType, isMobile, isTablet, isDesktop, isLandscape, isTouchDevice, isCoarsePointer } = useViewport();
 *
 * // Pass viewport info to server games
 * const config = { viewport: { width, height, isMobile: viewportType === 'mobile' } };
 *
 * // Adjust UI for touch devices
 * const buttonSize = isCoarsePointer ? 'large' : 'normal';
 * ```
 */

import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';

// === TYPES ===

export type ViewportType = 'watch' | 'mobile' | 'tablet' | 'laptop' | 'desktop';

/** @deprecated Use ViewportType instead */
export type LegacyViewportType = 'mobile' | 'tablet' | 'desktop';

export interface ViewportInfo {
  /** Current viewport width in pixels */
  width: number;

  /** Current viewport height in pixels */
  height: number;

  /** Viewport type classification (expanded: watch, mobile, tablet, laptop, desktop) */
  viewportType: ViewportType;

  /** @deprecated Use viewportType instead. Kept for backward compatibility. */
  type: LegacyViewportType;

  /** True if viewport is watch-sized (< 200px) */
  isWatch: boolean;

  /** True if viewport is mobile-sized (< 768px, includes watch and small phones) */
  isMobile: boolean;

  /** True if viewport is small phone-sized (< 375px, includes watch) */
  isSmallPhone: boolean;

  /** True if viewport is tablet-sized (768px - 1023px) */
  isTablet: boolean;

  /** True if viewport is laptop-sized (1024px - 1279px) */
  isLaptop: boolean;

  /** True if viewport is desktop-sized (>= 1280px) */
  isDesktop: boolean;

  /** True if viewport is in landscape orientation */
  isLandscape: boolean;

  /** True if viewport is in portrait orientation */
  isPortrait: boolean;

  /** True if the device supports touch input */
  isTouchDevice: boolean;

  /** True if the primary pointer is coarse (touch/stylus), useful for sizing touch targets */
  isCoarsePointer: boolean;
}

// === BREAKPOINTS ===

export interface ViewportBreakpoints {
  /** Apple Watch (default: 200) */
  watch: number;

  /** Small phone - iPhone SE, etc (default: 375) */
  xs: number;

  /** Small mobile (default: 640) */
  sm: number;

  /** Medium - tablet portrait (default: 768) */
  md: number;

  /** Large - tablet landscape / laptop (default: 1024) */
  lg: number;

  /** Extra large - desktop (default: 1280) */
  xl: number;
}

export const DEFAULT_BREAKPOINTS: ViewportBreakpoints = {
  watch: 200,
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// === VIEWPORT DETECTION ===

/**
 * Determine viewport type from width (expanded classification)
 */
function getViewportType(width: number, breakpoints: ViewportBreakpoints): ViewportType {
  if (width < breakpoints.watch) {
    return 'watch';
  } else if (width < breakpoints.md) {
    return 'mobile';
  } else if (width < breakpoints.lg) {
    return 'tablet';
  } else if (width < breakpoints.xl) {
    return 'laptop';
  } else {
    return 'desktop';
  }
}

/**
 * Map new viewport type to legacy type for backward compatibility
 */
function toLegacyViewportType(viewportType: ViewportType): LegacyViewportType {
  switch (viewportType) {
    case 'watch':
    case 'mobile':
      return 'mobile';
    case 'tablet':
      return 'tablet';
    case 'laptop':
    case 'desktop':
      return 'desktop';
  }
}

/**
 * Get current viewport dimensions
 */
function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    // SSR fallback
    return { width: 1024, height: 768 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Detect if device supports touch input
 */
function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Detect if primary pointer is coarse (touch/stylus vs mouse)
 */
function detectCoarsePointer(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches;
}

// === MAIN HOOK ===

export interface UseViewportOptions {
  /** Custom breakpoints (optional) */
  breakpoints?: Partial<ViewportBreakpoints>;

  /** Debounce delay in ms (default: 100) */
  debounceMs?: number;
}

/**
 * Hook for responsive viewport detection
 */
export function useViewport(options: UseViewportOptions = {}): ViewportInfo {
  const breakpoints = useMemo(
    () => ({ ...DEFAULT_BREAKPOINTS, ...options.breakpoints }),
    [options.breakpoints]
  );
  const debounceMs = options.debounceMs ?? 100;

  const [dimensions, setDimensions] = useState(getViewportDimensions);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const handleResize = useCallback(() => {
    setDimensions(getViewportDimensions());
  }, []);

  // Detect input capabilities on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsTouchDevice(detectTouchCapability());
    setIsCoarsePointer(detectCoarsePointer());

    // Listen for pointer capability changes (e.g., connecting a mouse to a tablet)
    const pointerMediaQuery = window.matchMedia('(pointer: coarse)');
    const handlePointerChange = (e: MediaQueryListEvent) => {
      setIsCoarsePointer(e.matches);
    };

    pointerMediaQuery.addEventListener('change', handlePointerChange);

    return () => {
      pointerMediaQuery.removeEventListener('change', handlePointerChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debouncedResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(handleResize, debounceMs);
    };

    window.addEventListener('resize', debouncedResize);

    // Initial call
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [handleResize, debounceMs]);

  const viewportInfo = useMemo((): ViewportInfo => {
    const { width, height } = dimensions;
    const viewportType = getViewportType(width, breakpoints);
    const legacyType = toLegacyViewportType(viewportType);
    const isLandscape = width > height;

    return {
      width,
      height,
      viewportType,
      type: legacyType, // Backward compatibility
      isWatch: viewportType === 'watch',
      isSmallPhone: width < breakpoints.xs,
      isMobile: legacyType === 'mobile', // Includes watch and small phones for backward compatibility
      isTablet: viewportType === 'tablet',
      isLaptop: viewportType === 'laptop',
      isDesktop: viewportType === 'desktop' || viewportType === 'laptop', // Backward compat: laptop was previously desktop
      isLandscape,
      isPortrait: !isLandscape,
      isTouchDevice,
      isCoarsePointer,
    };
  }, [dimensions, breakpoints, isTouchDevice, isCoarsePointer]);

  return viewportInfo;
}

// === CONTEXT (for passing to server games) ===

const ViewportContext = createContext<ViewportInfo | null>(null);

export interface ViewportProviderProps {
  children: ReactNode;
  options?: UseViewportOptions;
}

/**
 * Provider component for viewport context
 */
export function ViewportProvider({ children, options }: ViewportProviderProps) {
  const viewport = useViewport(options);
  return (
    <ViewportContext.Provider value={viewport}>
      {children}
    </ViewportContext.Provider>
  );
}

/**
 * Hook to consume viewport context
 */
export function useViewportContext(): ViewportInfo {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewportContext must be used within a ViewportProvider');
  }
  return context;
}

// === UTILITY FUNCTIONS ===

/**
 * Get viewport type from width (for server-side use)
 */
export function getViewportTypeFromWidth(width: number): ViewportType {
  return getViewportType(width, DEFAULT_BREAKPOINTS);
}

/**
 * Get legacy viewport type from width (for backward compatibility)
 */
export function getLegacyViewportTypeFromWidth(width: number): LegacyViewportType {
  return toLegacyViewportType(getViewportType(width, DEFAULT_BREAKPOINTS));
}

/**
 * Check if width is watch-sized
 */
export function isWatchWidth(width: number): boolean {
  return width < DEFAULT_BREAKPOINTS.watch;
}

/**
 * Check if width is small phone-sized
 */
export function isSmallPhoneWidth(width: number): boolean {
  return width < DEFAULT_BREAKPOINTS.xs;
}

/**
 * Check if width is mobile-sized (includes watch and small phones)
 */
export function isMobileWidth(width: number): boolean {
  const type = getViewportTypeFromWidth(width);
  return type === 'mobile' || type === 'watch';
}

/**
 * Check if width is tablet-sized
 */
export function isTabletWidth(width: number): boolean {
  return getViewportTypeFromWidth(width) === 'tablet';
}

/**
 * Check if width is laptop-sized
 */
export function isLaptopWidth(width: number): boolean {
  return getViewportTypeFromWidth(width) === 'laptop';
}

/**
 * Check if width is desktop-sized
 */
export function isDesktopWidth(width: number): boolean {
  const type = getViewportTypeFromWidth(width);
  return type === 'desktop' || type === 'laptop';
}

// === SESSION CONFIG HELPER ===

/**
 * Create viewport config for session
 * Use this to pass viewport info to server games
 */
export function createViewportConfig(viewport: ViewportInfo): {
  width: number;
  height: number;
  isMobile: boolean;
} {
  return {
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
  };
}

export default useViewport;
