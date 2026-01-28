/**
 * Command Renderer - Utility for creating draw commands
 *
 * This provides a fluent API for games to generate draw commands
 * without worrying about the low-level command format.
 */

import {
  DrawCommand,
  GameFrame,
  UIState,
  SliderState,
  ButtonState,
  ToggleState,
  ProgressState,
} from '../types/DrawCommand.js';
import {
  LabelingEngine,
  GraphicElement,
  PositionedLabel,
  BoundingBox,
  GraphicElementType,
} from '../labeling/index.js';

export class CommandRenderer {
  private commands: DrawCommand[] = [];
  private defs: DrawCommand[] = [];
  private ui: UIState = {};
  private sounds: Array<'click' | 'success' | 'failure' | 'transition' | 'complete'> = [];
  private idCounter = 0;
  private viewport = { width: 800, height: 500 };

  constructor(width = 800, height = 500) {
    this.viewport = { width, height };
  }

  /**
   * Generate unique ID
   */
  private nextId(prefix: string = 'elem'): string {
    return `${prefix}_${++this.idCounter}`;
  }

  /**
   * Clear for new frame
   */
  reset(): this {
    this.commands = [];
    this.sounds = [];
    // Don't reset defs - they persist across frames
    return this;
  }

  /**
   * Set viewport dimensions
   */
  setViewport(width: number, height: number): this {
    this.viewport = { width, height };
    return this;
  }

  // === DRAWING PRIMITIVES ===

  /**
   * Clear/fill background
   */
  clear(color: string, id?: string): this {
    this.commands.push({
      type: 'clear',
      id: id || this.nextId('bg'),
      props: { color, width: this.viewport.width, height: this.viewport.height },
    });
    return this;
  }

  /**
   * Draw rectangle
   */
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      rx?: number;
      ry?: number;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    this.commands.push({
      type: 'rect',
      id: options.id || this.nextId('rect'),
      props: { x, y, width, height, ...options },
    });
    return this;
  }

  /**
   * Draw circle
   */
  circle(
    cx: number,
    cy: number,
    r: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    this.commands.push({
      type: 'circle',
      id: options.id || this.nextId('circle'),
      props: { cx, cy, r, ...options },
    });
    return this;
  }

  /**
   * Draw ellipse
   */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    this.commands.push({
      type: 'ellipse',
      id: options.id || this.nextId('ellipse'),
      props: { cx, cy, rx, ry, ...options },
    });
    return this;
  }

  /**
   * Draw line
   */
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: {
      stroke: string;
      strokeWidth?: number;
      strokeDasharray?: string;
      strokeLinecap?: 'butt' | 'round' | 'square';
      opacity?: number;
      id?: string;
    }
  ): this {
    this.commands.push({
      type: 'line',
      id: options.id || this.nextId('line'),
      props: { x1, y1, x2, y2, ...options },
    });
    return this;
  }

  /**
   * Draw path (SVG path data)
   */
  path(
    d: string,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    this.commands.push({
      type: 'path',
      id: options.id || this.nextId('path'),
      props: { d, ...options },
    });
    return this;
  }

  /**
   * Draw polygon (convenience method using path)
   */
  polygon(
    points: Array<[number, number] | { x: number; y: number }>,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeDasharray?: string;
      strokeLinecap?: 'butt' | 'round' | 'square';
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    if (points.length < 3) return this;
    // Normalize points to [x, y] format
    const normalized = points.map(p => Array.isArray(p) ? p : [p.x, p.y] as [number, number]);
    const d = `M ${normalized[0][0]} ${normalized[0][1]} ` +
      normalized.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
    return this.path(d, options);
  }

  /**
   * Draw arc (convenience method using path)
   */
  arc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    const start = {
      x: cx + r * Math.cos(startAngle),
      y: cy + r * Math.sin(startAngle)
    };
    const end = {
      x: cx + r * Math.cos(endAngle),
      y: cy + r * Math.sin(endAngle)
    };
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    return this.path(d, options);
  }

  /**
   * Draw rounded rectangle (convenience method using rect with rx/ry)
   */
  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    return this.rect(x, y, width, height, { ...options, rx: radius, ry: radius });
  }

  /**
   * Draw text
   */
  text(
    x: number,
    y: number,
    text: string,
    options: {
      fill?: string;
      fontSize?: number;
      fontWeight?: number | string;
      fontStyle?: 'normal' | 'italic' | 'oblique';
      fontFamily?: string;
      textAnchor?: 'start' | 'middle' | 'end';
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    this.commands.push({
      type: 'text',
      id: options.id || this.nextId('text'),
      props: { x, y, text, ...options },
    });
    return this;
  }

  /**
   * Start a group (for transforms)
   */
  group(
    transform: string | undefined,
    children: (renderer: CommandRenderer) => void,
    options: { opacity?: number; id?: string } = {}
  ): this {
    const childRenderer = new CommandRenderer(this.viewport.width, this.viewport.height);
    children(childRenderer);

    this.commands.push({
      type: 'group',
      id: options.id || this.nextId('group'),
      props: {
        transform,
        opacity: options.opacity,
        children: childRenderer.getCommands(),
      },
    });
    return this;
  }

  // === DEFINITIONS (gradients, filters) ===

  /**
   * Add linear gradient definition
   */
  linearGradient(
    gradientId: string,
    stops: Array<{ offset: string; color: string; opacity?: number }>,
    options: { x1?: string; y1?: string; x2?: string; y2?: string } = {}
  ): this {
    this.defs.push({
      type: 'gradient',
      id: this.nextId('gradient'),
      props: {
        gradientType: 'linear',
        gradientId,
        stops,
        ...options,
      },
    });
    return this;
  }

  /**
   * Add radial gradient definition
   */
  radialGradient(
    gradientId: string,
    stops: Array<{ offset: string; color: string; opacity?: number }>,
    options: { cx?: string; cy?: string; r?: string } = {}
  ): this {
    this.defs.push({
      type: 'gradient',
      id: this.nextId('gradient'),
      props: {
        gradientType: 'radial',
        gradientId,
        stops,
        ...options,
      },
    });
    return this;
  }

  // === UI STATE ===

  /**
   * Set header
   */
  setHeader(title: string, subtitle?: string): this {
    this.ui.header = { title, subtitle };
    return this;
  }

  /**
   * Set footer
   */
  setFooter(text: string, icon?: string): this {
    this.ui.footer = { text, icon };
    return this;
  }

  /**
   * Set coach message
   */
  setCoachMessage(message: string): this {
    this.ui.coachMessage = message;
    return this;
  }

  /**
   * Add slider control
   */
  addSlider(slider: SliderState): this {
    if (!this.ui.sliders) this.ui.sliders = [];
    this.ui.sliders.push(slider);
    return this;
  }

  /**
   * Add button control
   */
  addButton(button: ButtonState): this {
    if (!this.ui.buttons) this.ui.buttons = [];
    this.ui.buttons.push(button);
    return this;
  }

  /**
   * Add toggle control
   */
  addToggle(toggle: ToggleState): this {
    if (!this.ui.toggles) this.ui.toggles = [];
    this.ui.toggles.push(toggle);
    return this;
  }

  /**
   * Set progress state
   */
  setProgress(progress: ProgressState): this {
    this.ui.progress = progress;
    return this;
  }

  // === SOUNDS ===

  /**
   * Queue a sound effect
   */
  playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): this {
    this.sounds.push(type);
    return this;
  }

  // === OUTPUT ===

  /**
   * Get raw commands (for groups)
   */
  getCommands(): DrawCommand[] {
    return this.commands;
  }

  /**
   * Build final game frame
   */
  toFrame(frameNumber: number): GameFrame {
    return {
      commands: this.commands,
      defs: this.defs.length > 0 ? this.defs : undefined,
      ui: this.ui,
      sounds: this.sounds.length > 0 ? this.sounds : undefined,
      timestamp: Date.now(),
      frameNumber,
      viewport: this.viewport,
    };
  }

  // === ALIAS METHODS (for backward compatibility) ===

  drawRect(...args: Parameters<typeof this.rect>): this {
    return this.rect(...args);
  }

  drawCircle(...args: Parameters<typeof this.circle>): this {
    return this.circle(...args);
  }

  drawEllipse(...args: Parameters<typeof this.ellipse>): this {
    return this.ellipse(...args);
  }

  drawLine(...args: Parameters<typeof this.line>): this {
    return this.line(...args);
  }

  drawPath(...args: Parameters<typeof this.path>): this {
    return this.path(...args);
  }

  drawText(...args: Parameters<typeof this.text>): this {
    return this.text(...args);
  }

  polyline(
    points: Array<[number, number] | { x: number; y: number }>,
    options: {
      stroke?: string;
      strokeWidth?: number;
      strokeDasharray?: string;
      fill?: string;
      opacity?: number;
      id?: string;
    } = {}
  ): this {
    if (points.length < 2) return this;
    // Normalize points to [x, y] format
    const normalized = points.map(p => Array.isArray(p) ? p : [p.x, p.y] as [number, number]);
    const d = `M ${normalized[0][0]} ${normalized[0][1]} ` +
      normalized.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ');
    return this.path(d, { fill: 'none', ...options });
  }

  // === LABELING INTEGRATION ===

  /**
   * Register a graphic element for spatial awareness in the labeling engine.
   * Call this after drawing each element that labels may need to avoid or reference.
   */
  registerElement(
    labelEngine: LabelingEngine,
    element: GraphicElement
  ): this {
    labelEngine.registerElement(element);
    return this;
  }

  /**
   * Register a circle element for labeling
   * Convenience method that calculates bounds automatically
   */
  registerCircleElement(
    labelEngine: LabelingEngine,
    id: string,
    cx: number,
    cy: number,
    r: number,
    options: { isBackground?: boolean; isInteractive?: boolean } = {}
  ): this {
    labelEngine.registerElement({
      id,
      type: 'circle',
      bounds: { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
      center: { x: cx, y: cy },
      isBackground: options.isBackground,
      isInteractive: options.isInteractive,
    });
    return this;
  }

  /**
   * Register a rectangle element for labeling
   * Convenience method that calculates bounds automatically
   */
  registerRectElement(
    labelEngine: LabelingEngine,
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { isBackground?: boolean; isInteractive?: boolean } = {}
  ): this {
    labelEngine.registerElement({
      id,
      type: 'rect',
      bounds: { x, y, width, height },
      center: { x: x + width / 2, y: y + height / 2 },
      isBackground: options.isBackground,
      isInteractive: options.isInteractive,
    });
    return this;
  }

  /**
   * Render positioned labels from the labeling engine
   */
  renderLabels(labels: PositionedLabel[]): this {
    for (const label of labels) {
      const { x, y, text, style, bounds } = label;

      // Draw background if specified
      if (style.background) {
        const bg = style.background;
        this.rect(
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          {
            fill: bg.fill,
            rx: bg.borderRadius,
            ry: bg.borderRadius,
            stroke: bg.stroke,
            strokeWidth: bg.strokeWidth,
            id: `${label.id}_bg`,
          }
        );
      }

      // Draw text
      this.text(x, y, text, {
        fill: style.fill,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        textAnchor: style.textAnchor ?? 'start',
        id: label.id,
      });
    }
    return this;
  }

  /**
   * Build final game frame with intelligent label positioning.
   * This is the main entry point for rendering with labels.
   *
   * Usage:
   * ```typescript
   * const r = new CommandRenderer(700, 350);
   * r.reset().clear('#020617');
   *
   * // Draw graphics
   * r.circle(100, 100, 20, { fill: '#06b6d4' });
   * r.registerCircleElement(labelEngine, 'ball', 100, 100, 20);
   *
   * // Register labels (engine handles positioning)
   * labelEngine.registerLabel({
   *   id: 'ball_label',
   *   targetId: 'ball',
   *   fullText: 'Ball',
   *   anchor: 'top',
   *   priority: 'high',
   *   style: { fill: '#ffffff', fontSize: 12 }
   * });
   *
   * // Render with labels
   * return r.toFrameWithLabels(frameNumber, labelEngine);
   * ```
   */
  toFrameWithLabels(frameNumber: number, labelEngine: LabelingEngine): GameFrame {
    // Compute label positions
    const positionedLabels = labelEngine.computePositions(
      this.viewport.width,
      this.viewport.height
    );

    // Render the positioned labels
    this.renderLabels(positionedLabels);

    // Return the frame
    return this.toFrame(frameNumber);
  }
}

// === HELPER FUNCTIONS ===

/**
 * Create color with alpha
 */
export function rgba(hex: string, alpha: number): string {
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Interpolate between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
