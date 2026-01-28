/**
 * Interaction Design - Clear Controls and User Feedback
 *
 * Provides guidelines and utilities for creating intuitive, clear
 * interactive controls that help users understand:
 * - What each slider controls
 * - Why it matters for the physics concept
 * - What effect their changes have
 */

import { ViewportType } from '../labeling/types.js';
import { SliderPurpose, SliderSpec, ControlGroup, FeedbackType } from './types.js';

// ============================================================
// SLIDER DESIGN PRINCIPLES
// ============================================================

/**
 * Slider design best practices
 */
export const SLIDER_DESIGN_PRINCIPLES = {
  /**
   * Label clarity - every slider must have:
   * 1. Clear name (what it controls)
   * 2. Current value with units
   * 3. Brief explanation of why it matters
   */
  labelClarity: {
    required: ['name', 'value', 'unit'],
    recommended: ['description', 'educationalNote'],
  },

  /**
   * Visual feedback - users should see:
   * 1. Immediate visual change in the graphic
   * 2. Value updating in real-time
   * 3. Affected object highlighted
   */
  visualFeedback: {
    immediateUpdate: true,
    highlightTarget: true,
    showValueChange: true,
  },

  /**
   * Touch target sizes (minimum)
   */
  touchTargets: {
    mobile: { width: 44, height: 44 },
    tablet: { width: 40, height: 40 },
    desktop: { width: 24, height: 24 },
  },

  /**
   * Slider track sizes
   */
  trackSize: {
    mobile: { width: '100%', height: 8 },
    tablet: { width: '100%', height: 6 },
    desktop: { width: 200, height: 4 },
  },
};

// ============================================================
// SLIDER TEMPLATES BY PURPOSE
// ============================================================

/**
 * Template configurations for different slider purposes
 */
export const SLIDER_TEMPLATES: Record<SliderPurpose, Partial<SliderSpec>> = {
  /**
   * Initial condition sliders (angle, velocity, position)
   * - Set before simulation starts
   * - Show preview of starting state
   */
  initial_condition: {
    feedbackType: 'preview',
    visualIndicator: {
      highlightTarget: true,
      showDelta: false,
      showFormula: false,
    },
    position: 'bottom',
  },

  /**
   * Parameter sliders (mass, friction, gravity)
   * - Adjust physical properties
   * - May require restart to take effect
   */
  parameter: {
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: true,
      showDelta: true,
      showFormula: true,
    },
    position: 'right',
  },

  /**
   * Time control sliders (playback speed, time scrub)
   * - Control simulation playback
   * - Immediate feedback essential
   */
  time_control: {
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: false,
      showDelta: false,
      showFormula: false,
    },
    position: 'bottom',
  },

  /**
   * View control sliders (zoom, rotation)
   * - Adjust visualization
   * - Don't affect physics
   */
  view_control: {
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: false,
      showDelta: false,
      showFormula: false,
    },
    position: 'right',
  },

  /**
   * Comparison sliders (A/B testing)
   * - Compare two values side by side
   * - Show difference clearly
   */
  comparison: {
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: true,
      showDelta: true,
      showFormula: false,
    },
    position: 'bottom',
  },
};

// ============================================================
// COMMON SLIDER PRESETS
// ============================================================

/**
 * Pre-configured sliders for common physics parameters
 */
export const COMMON_SLIDERS: Record<string, SliderSpec> = {
  // Motion parameters
  angle: {
    id: 'angle',
    label: 'Launch Angle',
    purpose: 'initial_condition',
    description: 'The angle at which the object is launched',
    unit: '°',
    educationalNote: 'Angle affects both height and distance. 45° gives maximum range in ideal conditions.',
    min: 0,
    max: 90,
    step: 1,
    defaultValue: 45,
    feedbackType: 'preview',
    visualIndicator: {
      highlightTarget: true,
      showDelta: false,
      showFormula: false,
    },
    position: 'bottom',
  },

  velocity: {
    id: 'velocity',
    label: 'Initial Velocity',
    purpose: 'initial_condition',
    description: 'How fast the object starts moving',
    unit: 'm/s',
    educationalNote: 'Higher velocity means more energy. Range increases with velocity squared.',
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 20,
    feedbackType: 'preview',
    visualIndicator: {
      highlightTarget: true,
      showDelta: true,
      showFormula: false,
    },
    position: 'bottom',
  },

  mass: {
    id: 'mass',
    label: 'Mass',
    purpose: 'parameter',
    description: 'The mass of the object',
    unit: 'kg',
    educationalNote: 'Mass affects momentum and kinetic energy, but not trajectory in vacuum.',
    min: 0.1,
    max: 10,
    step: 0.1,
    defaultValue: 1,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: true,
      showDelta: true,
      showFormula: true,
    },
    position: 'right',
  },

  gravity: {
    id: 'gravity',
    label: 'Gravity',
    purpose: 'parameter',
    description: 'Gravitational acceleration',
    unit: 'm/s²',
    educationalNote: 'Earth\'s gravity is 9.8 m/s². Moon is 1.6, Mars is 3.7.',
    min: 0,
    max: 20,
    step: 0.1,
    defaultValue: 9.8,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: false,
      showDelta: true,
      showFormula: true,
    },
    position: 'right',
  },

  friction: {
    id: 'friction',
    label: 'Friction Coefficient',
    purpose: 'parameter',
    description: 'Surface friction (0 = frictionless, 1 = high friction)',
    unit: '',
    educationalNote: 'Friction converts kinetic energy to heat, slowing objects down.',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.3,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: true,
      showDelta: true,
      showFormula: false,
    },
    position: 'right',
  },

  springConstant: {
    id: 'spring_k',
    label: 'Spring Constant (k)',
    purpose: 'parameter',
    description: 'Stiffness of the spring',
    unit: 'N/m',
    educationalNote: 'Higher k means stiffer spring. Force = k × displacement (Hooke\'s Law)',
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 20,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: true,
      showDelta: true,
      showFormula: true,
    },
    position: 'right',
  },

  damping: {
    id: 'damping',
    label: 'Damping',
    purpose: 'parameter',
    description: 'Energy loss per oscillation',
    unit: '',
    educationalNote: 'Damping causes oscillations to decrease over time.',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.1,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: false,
      showDelta: true,
      showFormula: false,
    },
    position: 'right',
  },

  // Position sliders
  positionX: {
    id: 'position_x',
    label: 'X Position',
    purpose: 'initial_condition',
    description: 'Horizontal starting position',
    unit: 'm',
    educationalNote: 'Starting position affects where the object ends up.',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    feedbackType: 'preview',
    visualIndicator: {
      highlightTarget: true,
      showDelta: false,
      showFormula: false,
    },
    position: 'bottom',
  },

  // Time controls
  playbackSpeed: {
    id: 'playback_speed',
    label: 'Speed',
    purpose: 'time_control',
    description: 'Simulation playback speed',
    unit: 'x',
    educationalNote: 'Slow down to see details, speed up to see long-term behavior.',
    min: 0.1,
    max: 3,
    step: 0.1,
    defaultValue: 1,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: false,
      showDelta: false,
      showFormula: false,
    },
    position: 'bottom',
  },

  // View controls
  zoom: {
    id: 'zoom',
    label: 'Zoom',
    purpose: 'view_control',
    description: 'Zoom in or out',
    unit: 'x',
    educationalNote: 'Zoom to see details or the big picture.',
    min: 0.5,
    max: 3,
    step: 0.1,
    defaultValue: 1,
    feedbackType: 'immediate',
    visualIndicator: {
      highlightTarget: false,
      showDelta: false,
      showFormula: false,
    },
    position: 'right',
  },
};

// ============================================================
// CONTROL GROUPING
// ============================================================

/**
 * Create a logical grouping of related sliders
 */
export function createControlGroup(
  id: string,
  label: string,
  sliderIds: string[],
  options: {
    description?: string;
    collapsed?: boolean;
    position?: 'sidebar' | 'bottom' | 'overlay';
  } = {}
): ControlGroup {
  const sliders = sliderIds
    .map(id => COMMON_SLIDERS[id])
    .filter(Boolean) as SliderSpec[];

  return {
    id,
    label,
    description: options.description ?? '',
    sliders,
    collapsed: options.collapsed ?? false,
    position: options.position ?? 'sidebar',
  };
}

/**
 * Common control group configurations
 */
export const CONTROL_GROUPS = {
  /** Initial conditions for projectile motion */
  projectile: createControlGroup(
    'projectile_controls',
    'Launch Settings',
    ['angle', 'velocity'],
    {
      description: 'Set the initial launch conditions',
      position: 'bottom',
    }
  ),

  /** Physics parameters */
  physics: createControlGroup(
    'physics_controls',
    'Physics Parameters',
    ['mass', 'gravity', 'friction'],
    {
      description: 'Adjust physical properties',
      position: 'sidebar',
    }
  ),

  /** Spring/oscillation parameters */
  oscillation: createControlGroup(
    'oscillation_controls',
    'Oscillation Settings',
    ['springConstant', 'damping', 'mass'],
    {
      description: 'Control the oscillation behavior',
      position: 'sidebar',
    }
  ),

  /** View controls */
  view: createControlGroup(
    'view_controls',
    'View',
    ['zoom', 'playbackSpeed'],
    {
      description: 'Adjust the view',
      position: 'sidebar',
      collapsed: true,
    }
  ),
};

// ============================================================
// FEEDBACK DESIGN
// ============================================================

/**
 * Visual feedback configuration for slider changes
 */
export interface SliderFeedbackConfig {
  /** Animation duration in ms */
  animationDuration: number;

  /** Highlight color for affected objects */
  highlightColor: string;

  /** Show value tooltip while dragging */
  showTooltip: boolean;

  /** Show connecting line to affected object */
  showConnector: boolean;

  /** Pulse animation on value change */
  pulseOnChange: boolean;
}

export const DEFAULT_FEEDBACK_CONFIG: SliderFeedbackConfig = {
  animationDuration: 200,
  highlightColor: '#06b6d4',
  showTooltip: true,
  showConnector: false,
  pulseOnChange: true,
};

/**
 * Get feedback configuration for a slider
 */
export function getFeedbackConfig(
  slider: SliderSpec,
  viewport: ViewportType
): SliderFeedbackConfig {
  const config = { ...DEFAULT_FEEDBACK_CONFIG };

  // Adjust for mobile
  if (viewport === 'mobile') {
    config.showConnector = false;
    config.animationDuration = 150;
  }

  // Adjust based on feedback type
  switch (slider.feedbackType) {
    case 'immediate':
      config.animationDuration = 0;
      config.pulseOnChange = false;
      break;
    case 'preview':
      config.showConnector = true;
      config.pulseOnChange = true;
      break;
    case 'animated':
      config.animationDuration = 500;
      break;
  }

  return config;
}

// ============================================================
// EDUCATIONAL ANNOTATIONS
// ============================================================

/**
 * Annotation to explain what a slider does
 */
export interface SliderAnnotation {
  /** Main title */
  title: string;

  /** Brief description */
  description: string;

  /** Physical formula if applicable */
  formula?: string;

  /** Real-world example */
  example?: string;

  /** Tips for exploration */
  tip?: string;
}

/**
 * Generate educational annotation for a slider
 */
export function getSliderAnnotation(slider: SliderSpec): SliderAnnotation {
  return {
    title: slider.label,
    description: slider.description,
    formula: getFormulaForSlider(slider.id),
    example: getRealWorldExample(slider.id),
    tip: slider.educationalNote,
  };
}

/**
 * Get formula associated with a slider
 */
function getFormulaForSlider(sliderId: string): string | undefined {
  const formulas: Record<string, string> = {
    velocity: 'v = d/t',
    mass: 'F = ma',
    gravity: 'g = 9.8 m/s²',
    angle: 'Range = v²sin(2θ)/g',
    spring_k: 'F = -kx (Hooke\'s Law)',
    friction: 'f = μN',
    damping: 'x(t) = Ae^(-γt)cos(ωt)',
  };

  return formulas[sliderId];
}

/**
 * Get real-world example for a slider
 */
function getRealWorldExample(sliderId: string): string | undefined {
  const examples: Record<string, string> = {
    velocity: 'A car traveling at 60 km/h has a velocity of about 17 m/s',
    mass: 'A basketball weighs about 0.6 kg, a bowling ball about 7 kg',
    gravity: 'Astronauts on the Moon experience 1/6th Earth\'s gravity',
    angle: 'Artillery uses 45° for maximum range',
    spring_k: 'Car suspension springs have k ≈ 50,000 N/m',
    friction: 'Ice has μ ≈ 0.03, rubber on concrete μ ≈ 0.8',
  };

  return examples[sliderId];
}

// ============================================================
// SLIDER BUILDER
// ============================================================

/**
 * Builder for creating custom sliders with good defaults
 */
export class SliderBuilder {
  private spec: Partial<SliderSpec> = {};

  constructor(id: string) {
    this.spec.id = id;
  }

  label(label: string): this {
    this.spec.label = label;
    return this;
  }

  purpose(purpose: SliderPurpose): this {
    this.spec.purpose = purpose;
    // Apply template defaults
    const template = SLIDER_TEMPLATES[purpose];
    this.spec = { ...template, ...this.spec };
    return this;
  }

  description(description: string): this {
    this.spec.description = description;
    return this;
  }

  unit(unit: string): this {
    this.spec.unit = unit;
    return this;
  }

  educationalNote(note: string): this {
    this.spec.educationalNote = note;
    return this;
  }

  range(min: number, max: number, step: number = 1): this {
    this.spec.min = min;
    this.spec.max = max;
    this.spec.step = step;
    return this;
  }

  defaultValue(value: number): this {
    this.spec.defaultValue = value;
    return this;
  }

  feedbackType(type: FeedbackType): this {
    this.spec.feedbackType = type;
    return this;
  }

  position(position: 'top' | 'bottom' | 'left' | 'right' | 'inline'): this {
    this.spec.position = position;
    return this;
  }

  build(): SliderSpec {
    // Validate required fields
    if (!this.spec.id) throw new Error('Slider must have an id');
    if (!this.spec.label) throw new Error('Slider must have a label');
    if (this.spec.min === undefined) throw new Error('Slider must have a min value');
    if (this.spec.max === undefined) throw new Error('Slider must have a max value');

    // Apply defaults
    return {
      id: this.spec.id,
      label: this.spec.label,
      purpose: this.spec.purpose ?? 'parameter',
      description: this.spec.description ?? '',
      unit: this.spec.unit ?? '',
      educationalNote: this.spec.educationalNote ?? '',
      min: this.spec.min,
      max: this.spec.max,
      step: this.spec.step ?? 1,
      defaultValue: this.spec.defaultValue ?? this.spec.min,
      feedbackType: this.spec.feedbackType ?? 'immediate',
      visualIndicator: this.spec.visualIndicator ?? {
        highlightTarget: true,
        showDelta: false,
        showFormula: false,
      },
      position: this.spec.position ?? 'right',
    };
  }
}

/**
 * Create a new slider builder
 */
export function slider(id: string): SliderBuilder {
  return new SliderBuilder(id);
}
