/**
 * useViewport Hook
 *
 * Client-side viewport detection for responsive game rendering.
 * Provides viewport dimensions, type classification, and orientation info.
 *
 * Usage:
 * ```tsx
 * const { width, height, type, isMobile, isTablet, isDesktop, isLandscape } = useViewport();
 *
 * // Pass viewport info to server games
 * const config = { viewport: { width, height, isMobile: type === 'mobile' } };
 * ```
 */

import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';

// === TYPES ===

export type ViewportType = 'mobile' | 'tablet' | 'desktop';

export interface ViewportInfo {
  /** Current viewport width in pixels */
  width: number;

  /** Current viewport height in pixels */
  height: number;

  /** Viewport type classification */
  type: ViewportType;

  /** True if viewport is mobile-sized */
  isMobile: boolean;

  /** True if viewport is tablet-sized */
  isTablet: boolean;

  /** True if viewport is desktop-sized */
  isDesktop: boolean;

  /** True if viewport is in landscape orientation */
  isLandscape: boolean;

  /** True if viewport is in portrait orientation */
  isPortrait: boolean;
}

// === BREAKPOINTS ===

export interface ViewportBreakpoints {
  /** Small mobile (default: 640) */
  sm: number;

  /** Medium - tablet portrait (default: 768) */
  md: number;

  /** Large - tablet landscape (default: 1024) */
  lg: number;

  /** Extra large - desktop (default: 1280) */
  xl: number;
}

export const DEFAULT_BREAKPOINTS: ViewportBreakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// === VIEWPORT DETECTION ===

/**
 * Determine viewport type from width
 */
function getViewportType(width: number, breakpoints: ViewportBreakpoints): ViewportType {
  if (width < breakpoints.md) {
    return 'mobile';
  } else if (width < breakpoints.lg) {
    return 'tablet';
  } else {
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

  const handleResize = useCallback(() => {
    setDimensions(getViewportDimensions());
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
    const type = getViewportType(width, breakpoints);
    const isLandscape = width > height;

    return {
      width,
      height,
      type,
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      isLandscape,
      isPortrait: !isLandscape,
    };
  }, [dimensions, breakpoints]);

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
 * Check if width is mobile-sized
 */
export function isMobileWidth(width: number): boolean {
  return getViewportTypeFromWidth(width) === 'mobile';
}

/**
 * Check if width is tablet-sized
 */
export function isTabletWidth(width: number): boolean {
  return getViewportTypeFromWidth(width) === 'tablet';
}

/**
 * Check if width is desktop-sized
 */
export function isDesktopWidth(width: number): boolean {
  return getViewportTypeFromWidth(width) === 'desktop';
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
