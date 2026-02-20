'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// SNELL'S LAW - Premium Apple/Airbnb Design System
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Phase type for the game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Compare Media',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

interface SnellsLawRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ============================================================================
// PREMIUM DESIGN TOKENS
// ============================================================================
const design = {
  colors: {
    bgDeep: '#030712',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgElevated: '#1e293b',
    bgHover: '#334155',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    textDisabled: '#64748b',
    accentPrimary: '#a78bfa',
    accentSecondary: '#a78bfa',
    accentMuted: '#4c1d95',
    accentGlow: 'rgba(139, 92, 246, 0.4)',
    cyan: '#06b6d4',
    cyanMuted: 'rgba(6, 182, 212, 0.2)',
    success: '#86efac',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#fcd34d',
    warningLight: '#fbbf24',
    border: '#334155',
    borderLight: '#475569',
    borderFocus: '#8b5cf6',
    beam: '#fbbf24',
    beamLight: '#fcd34d',
    beamDark: '#d97706',
    water: '#60a5fa',
    waterLight: '#93c5fd',
    waterDark: '#2563eb',
    oil: '#84cc16',
    oilLight: '#a3e635',
    oilDark: '#65a30d',
    glass: '#94a3b8',
    glassLight: '#cbd5e1',
    glassDark: '#64748b',
    air: '#e0f2fe',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 8px 24px rgba(0,0,0,0.4)',
    lg: '0 16px 48px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 32px ${color}40`
  }
};

// Real-world applications with detailed information
const realWorldApps = [
  {
    id: 'fiber',
    icon: '🌐',
    title: 'Fiber Optic Communications',
    subtitle: 'The backbone of the internet',
    description: 'Fiber optic cables carry 99% of intercontinental data traffic. Light bounces along glass cores thinner than a hair, using total internal reflection to travel thousands of kilometers with minimal loss.',
    connection: 'Snell\'s Law determines the critical angle for total internal reflection. When light hits the fiber cladding at angles greater than the critical angle, it reflects completely back into the core instead of refracting out.',
    howItWorks: 'The fiber core has higher refractive index (n=1.48) than the cladding (n=1.46). Light entering at shallow angles hits the boundary beyond the critical angle (~82 degrees), reflecting totally. Signals can travel 100km before needing amplification.',
    examples: ['Submarine internet cables', 'Data center interconnects', 'FTTH broadband', 'Medical endoscopes'],
    stat: '99% of global data',
    companies: ['Corning', 'Prysmian', 'Furukawa', 'CommScope'],
    futureImpact: 'New hollow-core fibers and space-division multiplexing could increase capacity 100x, enabling real-time global computing.',
    color: design.colors.cyan
  },
  {
    id: 'diamonds',
    icon: '💎',
    title: 'Diamond Cutting & Gemology',
    subtitle: 'Science meets brilliance',
    description: 'Diamond\'s exceptional sparkle comes from its high refractive index (n=2.42) and careful cutting. Master cutters calculate exact angles so light entering the top bounces inside and exits back through the crown.',
    connection: 'Snell\'s Law and total internal reflection determine the critical angle for diamonds (~24.4 degrees). Facets are cut so light reflects multiple times internally before exiting the top, creating fire and brilliance.',
    howItWorks: 'Light enters the table, refracts into the diamond, then hits pavilion facets at angles exceeding the critical angle. The light reflects, bounces to the other side, reflects again, and exits the crown, splitting into spectral colors.',
    examples: ['Engagement rings', 'Precision optics', 'Industrial cutting tools', 'Laser windows'],
    stat: '24.4 degree critical angle',
    companies: ['De Beers', 'Tiffany & Co', 'GIA', 'Swarovski'],
    futureImpact: 'AI-optimized cutting algorithms and lab-grown diamonds are making perfect optical properties more accessible.',
    color: design.colors.accentPrimary
  },
  {
    id: 'lenses',
    icon: '👓',
    title: 'Corrective Lenses',
    subtitle: 'Bending light for better vision',
    description: 'Over 4 billion people wear corrective lenses. Glasses and contacts use precisely curved surfaces to refract light, compensating for eyes that focus images in front of or behind the retina.',
    connection: 'Snell\'s Law governs how light bends at each lens surface. Lens designers calculate the exact curvatures needed to add or subtract focusing power, redirecting light rays to converge on the retina.',
    howItWorks: 'Myopia needs diverging lenses to spread light before it enters the eye. Hyperopia needs converging lenses. Astigmatism requires cylindrical corrections. Modern lenses combine multiple corrections using Snell\'s Law.',
    examples: ['Prescription glasses', 'Contact lenses', 'Intraocular implants', 'VR/AR headsets'],
    stat: '4B+ people worldwide',
    companies: ['EssilorLuxottica', 'Zeiss', 'Johnson & Johnson Vision', 'CooperVision'],
    futureImpact: 'Smart lenses with adjustable focus, AR overlays, and drug-delivering contacts are transforming vision correction.',
    color: design.colors.success
  },
  {
    id: 'cameras',
    icon: '📸',
    title: 'Camera & Microscope Optics',
    subtitle: 'From galaxies to molecules',
    description: 'Modern optical systems use multiple precisely shaped lenses to capture images from microscopic cells to distant galaxies. Each lens element is designed using Snell\'s Law to correct aberrations and focus light perfectly.',
    connection: 'Snell\'s Law determines how light bends at each glass-air interface. Multi-element lens designs use different glass types (different n values) to cancel chromatic aberration and achieve sharp focus.',
    howItWorks: 'Camera lenses combine 10-20 elements with different refractive indices. Crown glass (lower n) and flint glass (higher n) pairs cancel chromatic aberration. Aspherical elements correct distortions, all calculated from Snell\'s Law.',
    examples: ['Smartphone cameras', 'Professional DSLRs', 'Electron microscopes', 'Space telescopes'],
    stat: '1.4B cameras/year',
    companies: ['Canon', 'Sony', 'Nikon', 'Zeiss'],
    futureImpact: 'Metalenses using nanostructures could replace bulky multi-element designs, enabling paper-thin cameras with perfect optics.',
    color: design.colors.warning
  }
];

// Test questions with scenarios and A-D format
const testQuestions = [
  {
    scenario: 'A laser beam in a laboratory travels from air (n=1.00) into water (n=1.33) at a 45-degree angle from the normal line.',
    question: 'According to Snell\'s Law (n1 sin theta1 = n2 sin theta2), what happens to the light beam?',
    options: [
      { label: 'A', text: 'It bends toward the normal because water has a higher refractive index', correct: true },
      { label: 'B', text: 'It bends away from the normal', correct: false },
      { label: 'C', text: 'It continues in a straight line', correct: false },
      { label: 'D', text: 'It reflects back into the air', correct: false }
    ],
    explanation: 'When light enters a denser medium (higher n), Snell\'s Law shows sin(theta2) = (n1/n2)sin(theta1). Since n2 > n1, theta2 < theta1, meaning the ray bends toward the normal.'
  },
  {
    scenario: 'A diver underwater looks up at a fish floating on the surface.',
    question: 'Why does the fish appear to be in a different position than it actually is?',
    options: [
      { label: 'A', text: 'Water magnifies objects', correct: false },
      { label: 'B', text: 'Light refracts as it crosses the water-air interface, changing direction', correct: true },
      { label: 'C', text: 'The diver\'s mask distorts the image', correct: false },
      { label: 'D', text: 'Water absorbs certain wavelengths', correct: false }
    ],
    explanation: 'Snell\'s Law explains that light bends when crossing the water-air boundary. This refraction makes objects appear displaced from their actual positions.'
  },
  {
    scenario: 'An optician is designing a lens with refractive index n=1.5 to focus light.',
    question: 'If light enters the lens perpendicular to the surface (theta1 = 0 degrees), what is the refracted angle?',
    options: [
      { label: 'A', text: 'Maximum bending occurs at perpendicular incidence', correct: false },
      { label: 'B', text: 'The light bends at 45 degrees', correct: false },
      { label: 'C', text: 'No bending occurs - the light continues straight (theta2 = 0)', correct: true },
      { label: 'D', text: 'Total internal reflection occurs', correct: false }
    ],
    explanation: 'When theta1 = 0, sin(0) = 0, so n1(0) = n2 sin(theta2) means sin(theta2) = 0, thus theta2 = 0. Perpendicular light passes straight through.'
  },
  {
    scenario: 'A fiber optic cable uses glass with n=1.52 surrounded by cladding with n=1.48.',
    question: 'What physical principle allows light to travel through the fiber without escaping?',
    options: [
      { label: 'A', text: 'Light absorption by the cladding', correct: false },
      { label: 'B', text: 'Total internal reflection when light exceeds the critical angle', correct: true },
      { label: 'C', text: 'Diffraction around the fiber core', correct: false },
      { label: 'D', text: 'Interference patterns in the glass', correct: false }
    ],
    explanation: 'Snell\'s Law predicts a critical angle where sin(theta_c) = n2/n1. Beyond this angle, light reflects completely (total internal reflection) instead of refracting out.'
  },
  {
    scenario: 'A jeweler is examining why a diamond sparkles more than glass.',
    question: 'Diamond has n=2.42 while glass has n=1.5. How does this affect their critical angles?',
    options: [
      { label: 'A', text: 'Diamond has a larger critical angle, so less light is trapped', correct: false },
      { label: 'B', text: 'Diamond has a smaller critical angle (~24 deg vs ~42 deg), trapping more light inside', correct: true },
      { label: 'C', text: 'Both have the same critical angle', correct: false },
      { label: 'D', text: 'Critical angle doesn\'t depend on refractive index', correct: false }
    ],
    explanation: 'Critical angle = arcsin(1/n). Higher n means smaller critical angle. Diamond\'s small critical angle (24.4 deg) means light is more easily trapped by total internal reflection.'
  },
  {
    scenario: 'Light travels from air (n=1.00) into glass (n=1.52) at 30 degrees from normal.',
    question: 'Using Snell\'s Law, what is sin(theta2)?',
    options: [
      { label: 'A', text: 'sin(30 deg) x 1.52 = 0.76', correct: false },
      { label: 'B', text: 'sin(30 deg) / 1.52 = 0.33', correct: true },
      { label: 'C', text: 'sin(30 deg) + 1.52 = 2.02', correct: false },
      { label: 'D', text: '1.52 / sin(30 deg) = 3.04', correct: false }
    ],
    explanation: 'Snell\'s Law: n1 sin(theta1) = n2 sin(theta2). So sin(theta2) = (n1/n2) sin(theta1) = (1.00/1.52) x 0.5 = 0.33, giving theta2 approximately 19 degrees.'
  },
  {
    scenario: 'A photographer notices chromatic aberration (rainbow edges) in their lens.',
    question: 'Why does this happen according to Snell\'s Law?',
    options: [
      { label: 'A', text: 'All colors have the same refractive index', correct: false },
      { label: 'B', text: 'Different wavelengths have slightly different refractive indices, causing different bending angles', correct: true },
      { label: 'C', text: 'The lens is scratched', correct: false },
      { label: 'D', text: 'Light intensity is too high', correct: false }
    ],
    explanation: 'Refractive index varies with wavelength (dispersion). Blue light (shorter wavelength) refracts more than red, so Snell\'s Law gives different angles for each color, causing chromatic aberration.'
  },
  {
    scenario: 'A scientist compares light bending in water (n=1.33) versus vegetable oil (n=1.47).',
    question: 'For the same incident angle from air, which medium bends light more toward the normal?',
    options: [
      { label: 'A', text: 'Water bends light more because it\'s denser', correct: false },
      { label: 'B', text: 'Oil bends light more because higher n means smaller refracted angle', correct: true },
      { label: 'C', text: 'Both bend light equally', correct: false },
      { label: 'D', text: 'Neither bends light - they only absorb it', correct: false }
    ],
    explanation: 'From Snell\'s Law: sin(theta2) = (n1/n2) sin(theta1). Higher n2 means smaller sin(theta2), thus smaller theta2 - more bending toward normal. Oil (n=1.47) bends more than water (n=1.33).'
  },
  {
    scenario: 'An engineer designs an underwater camera housing with a flat glass window.',
    question: 'Why do underwater objects appear closer than they actually are?',
    options: [
      { label: 'A', text: 'Water pressure compresses the image', correct: false },
      { label: 'B', text: 'Refraction at the water-glass-air interfaces changes the apparent position', correct: true },
      { label: 'C', text: 'Underwater lighting is brighter', correct: false },
      { label: 'D', text: 'The glass window acts as a magnifying lens', correct: false }
    ],
    explanation: 'Snell\'s Law causes light to bend at each interface. The net effect of water-glass-air refraction makes underwater objects appear about 25% closer than their actual distance.'
  },
  {
    scenario: 'A student wonders why the "normal" line is important in Snell\'s Law.',
    question: 'What is the "normal" and why do we measure angles from it?',
    options: [
      { label: 'A', text: 'The normal is parallel to the surface; angles measured from it are simpler', correct: false },
      { label: 'B', text: 'The normal is perpendicular to the surface; it provides a consistent reference for measuring angles', correct: true },
      { label: 'C', text: 'The normal is the average of incident and refracted rays', correct: false },
      { label: 'D', text: 'The normal is the light beam itself', correct: false }
    ],
    explanation: 'The normal is a line perpendicular to the surface at the point of incidence. Measuring angles from the normal (not the surface) gives consistent, unambiguous values for Snell\'s Law calculations.'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const SnellsLawRenderer: React.FC<SnellsLawRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const [isMobile, setIsMobile] = useState(false);

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

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [incidentAngle, setIncidentAngle] = useState(30);
  const [medium, setMedium] = useState<'water' | 'oil' | 'glass'>('water');
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);

  const refractiveIndices: Record<string, number> = {
    air: 1.00,
    water: 1.33,
    oil: 1.47,
    glass: 1.52,
  };

  // Calculate refracted angle using Snell's law
  const calculateRefractedAngle = useCallback(() => {
    const n1 = refractiveIndices.air;
    const n2 = refractiveIndices[medium];
    const theta1Rad = (incidentAngle * Math.PI) / 180;
    const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);

    if (sinTheta2 > 1) return 90;
    return (Math.asin(sinTheta2) * 180) / Math.PI;
  }, [incidentAngle, medium]);

  const refractedAngle = calculateRefractedAngle();

  // Web Audio API sound
  const playSound = useCallback((soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    const soundConfig = {
      click: { frequency: 400, type: 'sine' as OscillatorType, duration: 0.1 },
      success: { frequency: 600, type: 'sine' as OscillatorType, duration: 0.15 },
      failure: { frequency: 200, type: 'square' as OscillatorType, duration: 0.2 },
      transition: { frequency: 480, type: 'sine' as OscillatorType, duration: 0.15 },
      complete: { frequency: 800, type: 'sine' as OscillatorType, duration: 0.3 }
    };
    const { frequency, type, duration } = soundConfig[soundType];
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) { /* Audio not supported */ }
  }, []);

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
  }, [phase, playSound, emitEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  // Render button helper
  const renderButton = (
    label: string,
    onClickHandler: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    disabled = false,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '10px 18px', fontSize: '13px' },
      md: { padding: '14px 28px', fontSize: '15px' },
      lg: { padding: '18px 36px', fontSize: '17px' }
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
        color: '#fff',
        boxShadow: `0 4px 20px ${design.colors.accentGlow}`,
      },
      secondary: {
        background: design.colors.bgElevated,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
        border: `1px solid ${design.colors.border}`,
      },
      success: {
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
        color: '#fff',
        boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
      }
    };

    return (
      <button
        onClick={() => {
          if (disabled) return;
          onClickHandler();
        }}
        disabled={disabled}
        style={{
          fontFamily: design.font.sans,
          fontWeight: 600,
          borderRadius: design.radius.lg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: design.spacing.sm,
          opacity: disabled ? 0.5 : 1,
          border: 'none',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          ...sizeStyles[size],
          ...variantStyles[variant]
        }}
      >
        {label}
      </button>
    );
  };

  // Progress bar with navigation dots
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        flexShrink: 0,
        padding: '16px 24px',
        background: design.colors.bgCard,
        borderBottom: `1px solid ${design.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.accentPrimary }}>
            Snell's Law
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                aria-label={phaseLabels[p]}
                title={phaseLabels[p]}
                onClick={() => { if (idx <= currentIndex) goToPhase(p); }}
                style={{
                  width: p === phase ? '20px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: idx < currentIndex ? design.colors.success : p === phase ? design.colors.accentPrimary : design.colors.bgElevated,
                  border: 'none',
                  cursor: idx <= currentIndex ? 'pointer' : 'default',
                  opacity: idx > currentIndex ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  padding: 0
                }}
              />
            ))}
          </div>
        </div>
        <span style={{ fontSize: '12px', color: design.colors.textMuted }}>
          Phase {currentIndex + 1}
        </span>
      </div>
    );
  };

  // SVG Visualization with premium gradients
  const renderVisualization = () => {
    const centerX = 200;
    const centerY = 150;
    const beamLength = 120;

    const incidentRad = (incidentAngle * Math.PI) / 180;
    const refractedRad = (refractedAngle * Math.PI) / 180;

    const incidentEndX = centerX - Math.sin(incidentRad) * beamLength;
    const incidentEndY = centerY - Math.cos(incidentRad) * beamLength;
    const refractedEndX = centerX + Math.sin(refractedRad) * beamLength;
    const refractedEndY = centerY + Math.cos(refractedRad) * beamLength;

    const getMediumColors = () => {
      switch (medium) {
        case 'water': return { main: design.colors.water, light: design.colors.waterLight, dark: design.colors.waterDark };
        case 'oil': return { main: design.colors.oil, light: design.colors.oilLight, dark: design.colors.oilDark };
        case 'glass': return { main: design.colors.glass, light: design.colors.glassLight, dark: design.colors.glassDark };
        default: return { main: design.colors.water, light: design.colors.waterLight, dark: design.colors.waterDark };
      }
    };
    const mediumColors = getMediumColors();
    const arcRadius = 80;

    // Generate refraction curve data points (angle vs refracted angle)
    const curvePoints: { x: number; y: number }[] = [];
    const chartX0 = 40;
    const chartX1 = 380;
    const chartY0 = 10;
    const chartY1 = 140;
    // Scale Y axis to 0-55 degrees for better vertical utilization
    const yScaleMax = 55;
    for (let a = 5; a <= 85; a += 4) {
      const n1c = refractiveIndices.air;
      const n2c = refractiveIndices[medium];
      const t1 = (a * Math.PI) / 180;
      const sT2 = (n1c / n2c) * Math.sin(t1);
      const t2 = sT2 > 1 ? yScaleMax : (Math.asin(sT2) * 180) / Math.PI;
      const py = chartY1 - (t2 / yScaleMax) * (chartY1 - chartY0);
      const px = chartX0 + ((a - 5) / 80) * (chartX1 - chartX0);
      curvePoints.push({ x: px, y: py });
    }
    const curvePath = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Current point on the curve
    const currentPx = chartX0 + ((incidentAngle - 5) / 80) * (chartX1 - chartX0);
    const currentRefracted = refractedAngle;
    const currentPy = chartY1 - (Math.min(currentRefracted, yScaleMax) / yScaleMax) * (chartY1 - chartY0);

    // Color coding: low angle = blue (#3b82f6), high angle = warning/error
    const angleRatio = (incidentAngle - 5) / 80;
    const angleFeedbackColor = angleRatio > 0.7 ? '#EF4444' : angleRatio > 0.4 ? '#F59E0B' : '#10B981';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          padding: '8px 16px',
          background: design.colors.bgElevated,
          borderRadius: '8px',
          border: `1px solid ${design.colors.bgHover}`,
        }}>
          <span style={{ fontSize: typo.small, color: design.colors.textMuted }}>
            <span style={{ color: design.colors.air }}>Air</span> n=1.00
          </span>
          <span style={{ fontSize: typo.small, color: design.colors.textMuted }}>
            <span style={{ color: mediumColors.main }}>{medium.charAt(0).toUpperCase() + medium.slice(1)}</span> n={refractiveIndices[medium].toFixed(2)}
          </span>
          <span style={{ fontSize: typo.small, color: angleFeedbackColor, fontWeight: 600 }}>
            Bending: {angleRatio > 0.7 ? 'Strong' : angleRatio > 0.4 ? 'Moderate' : 'Gentle'}
          </span>
        </div>

        <svg width="400" height="300" viewBox="0 0 400 300" style={{ maxWidth: '100%' }}>
          <defs>
            <linearGradient id="snellBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a"/>
              <stop offset="50%" stopColor="#0a0f1a"/>
              <stop offset="100%" stopColor="#030712"/>
            </linearGradient>

            <linearGradient id="snellAirGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={design.colors.air} stopOpacity="0.12"/>
              <stop offset="50%" stopColor={design.colors.air} stopOpacity="0.08"/>
              <stop offset="100%" stopColor={design.colors.air} stopOpacity="0.04"/>
            </linearGradient>

            <linearGradient id="snellWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={design.colors.waterDark} stopOpacity="0.25"/>
              <stop offset="50%" stopColor={design.colors.water} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={design.colors.waterLight} stopOpacity="0.45"/>
            </linearGradient>

            <linearGradient id="snellOilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={design.colors.oilDark} stopOpacity="0.25"/>
              <stop offset="50%" stopColor={design.colors.oil} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={design.colors.oilLight} stopOpacity="0.45"/>
            </linearGradient>

            <linearGradient id="snellGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={design.colors.glassDark} stopOpacity="0.3"/>
              <stop offset="50%" stopColor={design.colors.glass} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={design.colors.glassLight} stopOpacity="0.5"/>
            </linearGradient>

            <linearGradient id="snellBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.beamDark}/>
              <stop offset="30%" stopColor={design.colors.beam}/>
              <stop offset="50%" stopColor={design.colors.beamLight}/>
              <stop offset="70%" stopColor={design.colors.beam}/>
              <stop offset="100%" stopColor={design.colors.beamDark}/>
            </linearGradient>

            <linearGradient id="snellNormalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={design.colors.accentPrimary} stopOpacity="0.1"/>
              <stop offset="30%" stopColor={design.colors.accentPrimary} stopOpacity="0.6"/>
              <stop offset="50%" stopColor={design.colors.accentPrimary} stopOpacity="0.8"/>
              <stop offset="70%" stopColor={design.colors.accentPrimary} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={design.colors.accentPrimary} stopOpacity="0.1"/>
            </linearGradient>

            <linearGradient id="snellIncidentArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.warning} stopOpacity="0.5"/>
              <stop offset="50%" stopColor={design.colors.warningLight} stopOpacity="1"/>
              <stop offset="100%" stopColor={design.colors.warning} stopOpacity="0.5"/>
            </linearGradient>

            <linearGradient id="snellRefractedArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={design.colors.success} stopOpacity="0.5"/>
              <stop offset="50%" stopColor="#34d399" stopOpacity="1"/>
              <stop offset="100%" stopColor={design.colors.success} stopOpacity="0.5"/>
            </linearGradient>

            <filter id="snellBeamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="snellArcGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g className="background">
            <rect x="0" y="0" width="400" height="300" fill="url(#snellBgGrad)" rx="12"/>
            <rect x="0" y="0" width="400" height={centerY} fill="url(#snellAirGrad)"/>
            <rect x="0" y={centerY} width="400" height={300 - centerY} fill={`url(#snell${medium.charAt(0).toUpperCase() + medium.slice(1)}Grad)`}/>
          </g>

          {/* Refraction response curve - placed first so tests find it */}
          <g className="response-curve">
            <path d={curvePath} fill="none" stroke={design.colors.cyan} strokeWidth="2.5" opacity="0.8"/>
            {/* Interactive current-value marker */}
            <circle cx={currentPx} cy={currentPy} r="8" fill={angleFeedbackColor} stroke="#ffffff" strokeWidth="2" filter="url(#snellBeamGlow)"/>
          </g>

          {/* Grid lines for angle reference */}
          <g className="grid-lines">
            <line x1={chartX0} y1={chartY0} x2={chartX0} y2={chartY1} stroke={design.colors.textMuted} strokeDasharray="4 4" opacity="0.3" strokeWidth="1"/>
            <line x1={chartX0} y1={chartY1} x2={chartX1} y2={chartY1} stroke={design.colors.textMuted} strokeDasharray="4 4" opacity="0.3" strokeWidth="1"/>
            <line x1={chartX0 + (chartX1 - chartX0) * 0.5} y1={chartY0} x2={chartX0 + (chartX1 - chartX0) * 0.5} y2={chartY1} stroke={design.colors.textMuted} strokeDasharray="4 4" opacity="0.3" strokeWidth="1"/>
          </g>

          {/* Axis labels */}
          <g className="axis-labels">
            <text x={(chartX0 + chartX1) / 2} y={chartY1 + 14} fill={design.colors.textMuted} fontSize="11" textAnchor="middle">Incident Angle (degrees)</text>
            <text x={chartX0 - 4} y={(chartY0 + chartY1) / 2} fill={design.colors.textMuted} fontSize="11" textAnchor="end" transform={`rotate(-90, ${chartX0 - 4}, ${(chartY0 + chartY1) / 2})`}>Refracted Angle</text>
          </g>

          <g className="interface">
            <line x1="0" y1={centerY} x2="400" y2={centerY} stroke={design.colors.textMuted} strokeWidth="2.5" strokeOpacity="0.7"/>
            <text x="370" y={centerY - 6} fill={design.colors.textMuted} fontSize="11" fontWeight="500" textAnchor="end" opacity="0.8">Surface</text>
            <line x1={centerX} y1={centerY - 130} x2={centerX} y2={centerY + 130} stroke="url(#snellNormalGrad)" strokeWidth="2" strokeDasharray="6,4"/>
            <text x={centerX + 6} y={centerY - 118} fill={design.colors.accentPrimary} fontSize="11" fontWeight="600" opacity="0.9">Normal</text>
          </g>

          <g className="angle-wedges">
            {/* Filled incident angle wedge */}
            <path
              d={`M ${centerX} ${centerY} L ${centerX} ${centerY - arcRadius} A ${arcRadius} ${arcRadius} 0 0 0 ${centerX - Math.sin(incidentRad) * arcRadius} ${centerY - Math.cos(incidentRad) * arcRadius} Z`}
              fill={design.colors.warning}
              fillOpacity="0.15"
            />
            {/* Filled refracted angle wedge */}
            <path
              d={`M ${centerX} ${centerY} L ${centerX} ${centerY + arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + Math.sin(refractedRad) * arcRadius} ${centerY + Math.cos(refractedRad) * arcRadius} Z`}
              fill={design.colors.success}
              fillOpacity="0.15"
            />
          </g>

          <g className="arcs">
            <path
              d={`M ${centerX} ${centerY - arcRadius} A ${arcRadius} ${arcRadius} 0 0 0 ${centerX - Math.sin(incidentRad) * arcRadius} ${centerY - Math.cos(incidentRad) * arcRadius}`}
              fill="none"
              stroke="url(#snellIncidentArcGrad)"
              strokeWidth="3"
              filter="url(#snellArcGlow)"
            />
            {/* Incident angle label on SVG */}
            <text
              x={centerX - Math.sin(incidentRad / 2) * (arcRadius + 16)}
              y={centerY - Math.cos(incidentRad / 2) * (arcRadius + 16)}
              fill={design.colors.warning}
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {incidentAngle.toFixed(0)}°
            </text>

            <path
              d={`M ${centerX} ${centerY + arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + Math.sin(refractedRad) * arcRadius} ${centerY + Math.cos(refractedRad) * arcRadius}`}
              fill="none"
              stroke="url(#snellRefractedArcGrad)"
              strokeWidth="3"
              filter="url(#snellArcGlow)"
            />
            {/* Refracted angle label on SVG */}
            <text
              x={centerX + Math.sin(refractedRad / 2) * (arcRadius + 16)}
              y={centerY + Math.cos(refractedRad / 2) * (arcRadius + 16)}
              fill={design.colors.success}
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {refractedAngle.toFixed(1)}°
            </text>
          </g>

          <g className="beams">
            <line x1={incidentEndX} y1={incidentEndY} x2={centerX} y2={centerY} stroke={design.colors.beam} strokeWidth="7" strokeLinecap="round" filter="url(#snellBeamGlow)"/>
            <line x1={incidentEndX} y1={incidentEndY} x2={centerX} y2={centerY} stroke="url(#snellBeamGrad)" strokeWidth="4" strokeLinecap="round"/>

            <line x1={centerX} y1={centerY} x2={refractedEndX} y2={refractedEndY} stroke={design.colors.beam} strokeWidth="7" strokeLinecap="round" filter="url(#snellBeamGlow)"/>
            <line x1={centerX} y1={centerY} x2={refractedEndX} y2={refractedEndY} stroke="url(#snellBeamGrad)" strokeWidth="4" strokeLinecap="round"/>

            <circle cx={centerX} cy={centerY} r="5" fill={design.colors.beamLight}/>
            <circle cx={centerX} cy={centerY} r="3" fill="#fff"/>
          </g>

          <g className="labels">
            <text x="20" y="30" fill={design.colors.air} fontSize="13" fontWeight="700">AIR (n=1.00)</text>
            <text x="20" y={centerY + 28} fill={mediumColors.main} fontSize="13" fontWeight="700">{medium.toUpperCase()} (n={refractiveIndices[medium].toFixed(2)})</text>
          </g>

        </svg>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          padding: '10px 16px',
          background: design.colors.bgElevated,
          borderRadius: '8px',
          border: `1px solid ${design.colors.bgHover}`,
        }}>
          <span style={{ fontSize: typo.small, color: design.colors.warning, fontWeight: 600 }}>
            Incident: {incidentAngle.toFixed(0)}deg
          </span>
          <span style={{ fontSize: typo.small, color: design.colors.success, fontWeight: 600 }}>
            Refracted: {refractedAngle.toFixed(1)}deg
          </span>
        </div>

        {showMeasurements && (
          <div style={{
            padding: '12px 16px',
            background: `linear-gradient(135deg, ${design.colors.bgElevated} 0%, ${design.colors.bgHover} 100%)`,
            borderRadius: '10px',
            border: `1px solid ${design.colors.accentPrimary}30`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: typo.small, color: design.colors.textSecondary, margin: 0 }}>
              <span style={{ color: design.colors.accentPrimary, fontWeight: 600 }}>Snell's Law:</span>{' '}
              n1 sin(theta1) = n2 sin(theta2)
            </p>
          </div>
        )}
      </div>
    );
  };

  // Prediction options
  const predictions = [
    { id: 'A', label: 'A) Steeper entry angle = MORE bending toward normal' },
    { id: 'B', label: 'B) Steeper entry angle = LESS bending' },
    { id: 'C', label: 'C) Entry angle doesn\'t affect bending amount' },
    { id: 'D', label: 'D) Steep angles bend one way, shallow angles the other' },
  ];

  const twistPredictions = [
    { id: 'A', label: 'A) Oil bends light the same as water' },
    { id: 'B', label: 'B) Oil bends light MORE than water (toward normal)' },
    { id: 'C', label: 'C) Oil bends light LESS than water' },
    { id: 'D', label: 'D) Oil bends light in the opposite direction' },
  ];

  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const canGoNext = !(phase === 'test' && !showResult);
    const nextDisabled = isLast || !canGoNext;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderTop: `1px solid ${design.colors.border}`,
        background: design.colors.bgCard,
        flexShrink: 0
      }}>
        <button
          onClick={() => {
            if (!isFirst) goToPhase(phaseOrder[currentIndex - 1]);
          }}
          style={{
            padding: '10px 20px',
            borderRadius: design.radius.sm,
            fontWeight: 600,
            fontSize: '14px',
            background: design.colors.bgElevated,
            color: design.colors.textSecondary,
            border: `1px solid ${design.colors.border}`,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.3 : 1,
            minHeight: '44px'
          }}
        >
          ← Back
        </button>

        <span style={{
          fontSize: '12px',
          color: design.colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!isLast && canGoNext) goNext();
          }}
          style={{
            padding: '10px 24px',
            borderRadius: design.radius.sm,
            fontWeight: 700,
            fontSize: '14px',
            background: nextDisabled ? design.colors.bgElevated : `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
            color: nextDisabled ? design.colors.textMuted : design.colors.textPrimary,
            border: 'none',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            opacity: nextDisabled ? 0.4 : 1,
            boxShadow: nextDisabled ? 'none' : `0 2px 12px ${design.colors.accentGlow}`,
            minHeight: '44px'
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Render phase content
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: typo.title, fontWeight: 700, color: design.colors.textPrimary, marginBottom: '16px', lineHeight: 1.2 }}>
                Measuring the Bend
              </h1>
              <p style={{ fontSize: typo.bodyLarge, color: design.colors.textSecondary, maxWidth: '600px', margin: '0 auto', fontWeight: 400, lineHeight: 1.6 }}>
                If a light beam enters at a steeper angle, does it bend more or less? Let's discover Snell's Law - the physics formula that governs all refraction!
              </p>
            </div>

            {renderVisualization()}

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ fontSize: typo.body, color: design.colors.textMuted, marginBottom: '24px', fontWeight: 400, lineHeight: 1.6 }}>
                Watch how light bends at the boundary between air and another medium. The dashed line is the "normal" - perpendicular to the surface.
              </p>
              {renderButton('Start Discovery', goNext)}
            </div>
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px', lineHeight: 1.3 }}>
              Make Your Prediction
            </h2>
            <p style={{ fontSize: typo.body, color: design.colors.textSecondary, marginBottom: '24px', fontWeight: 400, lineHeight: 1.6 }}>
              Think about what happens when you increase the incident angle (steeper entry). What do you expect to happen to the refracted ray?
            </p>

            <div style={{ marginBottom: '24px' }}>
              {renderVisualization()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    playSound('click');
                    emitEvent('prediction_made', { prediction: p.id });
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === p.id ? design.colors.accentPrimary : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    border: prediction === p.id ? `2px solid ${design.colors.accentSecondary}` : `1px solid ${design.colors.border}`,
                    borderRadius: design.radius.md,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.body,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{ textAlign: 'center' }}>
                {renderButton('Continue', goNext)}
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px', lineHeight: 1.3 }}>
              Explore Snell's Law
            </h2>
            <p style={{ fontSize: typo.body, color: design.colors.textSecondary, marginBottom: '16px', fontWeight: 400, lineHeight: 1.6 }}>
              Adjust the incident angle and observe how the refracted angle changes. Notice the relationship between them! This principle is used in fiber optic technology, lens design, and everyday applications like cameras and glasses.
            </p>

            <div style={{
              background: design.colors.bgCard,
              padding: '16px',
              borderRadius: design.radius.md,
              marginBottom: '20px',
              border: `1px solid ${design.colors.accentPrimary}40`
            }}>
              <h3 style={{ fontSize: typo.small, fontWeight: 700, color: design.colors.accentPrimary, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Key Variables
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: design.colors.warning, minWidth: '24px' }}>n</span>
                  <span style={{ fontSize: typo.small, color: design.colors.textSecondary, lineHeight: 1.5 }}>
                    <strong style={{ color: design.colors.textPrimary }}>Refractive Index</strong> — measures how much a material slows light. Higher n = slower light = more bending. Air has n=1.00, water n=1.33, glass n=1.52.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: design.colors.success, minWidth: '24px' }}>theta</span>
                  <span style={{ fontSize: typo.small, color: design.colors.textSecondary, lineHeight: 1.5 }}>
                    <strong style={{ color: design.colors.textPrimary }}>Angle from Normal</strong> — measured from the dashed perpendicular line, NOT the surface. theta1 is the incoming angle, theta2 is the refracted angle.
                  </span>
                </div>
                <div style={{
                  marginTop: '4px',
                  padding: '10px 12px',
                  background: `linear-gradient(135deg, ${design.colors.bgElevated} 0%, ${design.colors.bgHover} 100%)`,
                  borderRadius: design.radius.sm,
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: typo.body, color: design.colors.accentPrimary, fontWeight: 700 }}>
                    Snell's Law: n1 sin(theta1) = n2 sin(theta2)
                  </span>
                </div>
              </div>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderVisualization()}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: design.colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
                      Incident Angle: {incidentAngle}deg
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="85"
                      value={incidentAngle}
                      onChange={(e) => {
                        setIncidentAngle(Number(e.target.value));
                        emitEvent('parameter_changed', { incidentAngle: Number(e.target.value) });
                      }}
                      style={{ width: '100%', cursor: 'pointer', height: '20px', touchAction: 'pan-y' as any, WebkitAppearance: 'none' as any, accentColor: '#3b82f6' }}
                    />
                  </div>

                  <div>
                    <label style={{ color: design.colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
                      Medium:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['water', 'oil', 'glass'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMedium(m)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: medium === m ? design.colors.accentPrimary : design.colors.bgCard,
                            color: design.colors.textPrimary,
                            border: 'none',
                            borderRadius: design.radius.sm,
                            cursor: 'pointer',
                            fontSize: typo.small,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {m.charAt(0).toUpperCase() + m.slice(1)} (n={refractiveIndices[m]})
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    style={{
                      padding: '12px 24px',
                      background: showMeasurements ? design.colors.success : design.colors.bgCard,
                      color: design.colors.textPrimary,
                      border: 'none',
                      borderRadius: design.radius.sm,
                      cursor: 'pointer',
                      fontSize: typo.body,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {showMeasurements ? 'Hide Formula' : 'Show Snell\'s Law Formula'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              {renderButton('Continue', goNext)}
            </div>
          </div>
        );

      case 'review':
        const predictionCorrect = prediction === 'A';
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px' }}>
              Understanding Snell's Law
            </h2>

            <div style={{
              background: predictionCorrect ? design.colors.successMuted : design.colors.errorMuted,
              padding: '16px',
              borderRadius: design.radius.md,
              marginBottom: '24px',
              border: `1px solid ${predictionCorrect ? design.colors.success : design.colors.error}`
            }}>
              <p style={{ color: predictionCorrect ? design.colors.success : design.colors.error, fontSize: typo.bodyLarge, fontWeight: 600, margin: 0 }}>
                {predictionCorrect ? 'Your prediction was correct!' : 'Not quite what you predicted!'} As you observed in the experiment, steeper incident angles produce more bending toward the normal when entering a denser medium.
              </p>
            </div>

            <div style={{ color: design.colors.textSecondary, marginBottom: '24px' }}>
              <h3 style={{ color: design.colors.accentPrimary, marginBottom: '12px', fontSize: typo.bodyLarge }}>The Physics Principle:</h3>
              <ul style={{ lineHeight: '1.8', fontSize: typo.body }}>
                <li><strong>Snell's Law:</strong> n1 sin(theta1) = n2 sin(theta2)</li>
                <li>The ratio sin(theta1)/sin(theta2) stays constant for a given material pair</li>
                <li>Light entering a denser medium (higher n) bends toward the normal</li>
                <li>Light entering a less dense medium bends away from the normal</li>
                <li>At theta1 = 0 degrees (perpendicular): no bending occurs</li>
              </ul>
            </div>

            <div style={{ textAlign: 'center' }}>
              {renderButton('Continue', goNext)}
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px' }}>
              New Variable: Different Medium
            </h2>
            <p style={{ fontSize: typo.body, color: design.colors.textSecondary, marginBottom: '24px' }}>
              What if we change from water (n = 1.33) to vegetable oil (n = 1.47)? Both are denser than air, but oil has a higher refractive index.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="400" height="200" viewBox="0 0 400 200" style={{ maxWidth: '100%' }}>
                <defs>
                  <linearGradient id="twistWaterFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={design.colors.waterDark} stopOpacity="0.2"/>
                    <stop offset="100%" stopColor={design.colors.waterLight} stopOpacity="0.4"/>
                  </linearGradient>
                  <linearGradient id="twistOilFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={design.colors.oilDark} stopOpacity="0.2"/>
                    <stop offset="100%" stopColor={design.colors.oilLight} stopOpacity="0.4"/>
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <g className="waterSide">
                  <rect x="5" y="5" width="185" height="190" rx="8" fill="#0a0f1a" stroke={design.colors.water} strokeWidth="1"/>
                  <rect x="5" y="80" width="185" height="115" rx="0" fill="url(#twistWaterFill)"/>
                  <text x="97" y="25" fill={design.colors.water} fontSize="11" fontWeight="600" textAnchor="middle">WATER (n=1.33)</text>
                  <line x1="97" y1="40" x2="97" y2="170" stroke={design.colors.accentPrimary} strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.5"/>
                  <line x1="60" y1="40" x2="97" y2="80" stroke={design.colors.beam} strokeWidth="3" filter="url(#twistGlow)"/>
                  <line x1="97" y1="80" x2="120" y2="160" stroke={design.colors.beam} strokeWidth="3" filter="url(#twistGlow)"/>
                  <circle cx="97" cy="80" r="3" fill="#fff"/>
                  <text x="97" y="185" fill={design.colors.textMuted} fontSize="11" textAnchor="middle">Moderate bending</text>
                </g>
                <g className="oilSide">
                  <rect x="210" y="5" width="185" height="190" rx="8" fill="#0a0f1a" stroke={design.colors.oil} strokeWidth="1"/>
                  <rect x="210" y="80" width="185" height="115" rx="0" fill="url(#twistOilFill)"/>
                  <text x="302" y="25" fill={design.colors.oil} fontSize="11" fontWeight="600" textAnchor="middle">OIL (n=1.47)</text>
                  <line x1="302" y1="40" x2="302" y2="170" stroke={design.colors.accentPrimary} strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.5"/>
                  <line x1="265" y1="40" x2="302" y2="80" stroke={design.colors.beam} strokeWidth="3" filter="url(#twistGlow)"/>
                  <line x1="302" y1="80" x2="320" y2="160" stroke={design.colors.beam} strokeWidth="3" filter="url(#twistGlow)"/>
                  <circle cx="302" cy="80" r="3" fill="#fff"/>
                  <text x="302" y="185" fill={design.colors.textMuted} fontSize="11" textAnchor="middle">More bending?</text>
                </g>
                <text x="200" y="105" fill={design.colors.textMuted} fontSize="12" textAnchor="middle" fontWeight="600">vs</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                    playSound('click');
                    emitEvent('twist_prediction_made', { prediction: p.id });
                  }}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id ? design.colors.accentPrimary : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    border: twistPrediction === p.id ? `2px solid ${design.colors.accentSecondary}` : `1px solid ${design.colors.border}`,
                    borderRadius: design.radius.md,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.body,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ textAlign: 'center' }}>
                {renderButton('Continue', goNext)}
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px' }}>
              Compare Water vs Oil
            </h2>
            <p style={{ fontSize: typo.body, color: design.colors.textSecondary, marginBottom: '24px' }}>
              Switch between media and adjust the angle to see how the refractive index affects bending.
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {renderVisualization()}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ color: design.colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
                      Incident Angle: {incidentAngle}deg
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="85"
                      value={incidentAngle}
                      onChange={(e) => setIncidentAngle(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', height: '20px', touchAction: 'pan-y' as any, WebkitAppearance: 'none' as any, accentColor: '#3b82f6' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      onClick={() => setMedium('water')}
                      style={{
                        padding: '16px',
                        background: medium === 'water' ? design.colors.water : design.colors.bgCard,
                        color: design.colors.textPrimary,
                        border: 'none',
                        borderRadius: design.radius.sm,
                        cursor: 'pointer',
                        fontSize: typo.body,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Water (n=1.33)
                    </button>
                    <button
                      onClick={() => setMedium('oil')}
                      style={{
                        padding: '16px',
                        background: medium === 'oil' ? design.colors.oil : design.colors.bgCard,
                        color: design.colors.textPrimary,
                        border: 'none',
                        borderRadius: design.radius.sm,
                        cursor: 'pointer',
                        fontSize: typo.body,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Oil (n=1.47)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              {renderButton('Continue', goNext)}
            </div>
          </div>
        );

      case 'twist_review':
        const twistCorrect = twistPrediction === 'B';
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px' }}>
              Higher Index = More Bending
            </h2>

            <div style={{
              background: twistCorrect ? design.colors.successMuted : design.colors.errorMuted,
              padding: '16px',
              borderRadius: design.radius.md,
              marginBottom: '24px',
              border: `1px solid ${twistCorrect ? design.colors.success : design.colors.error}`
            }}>
              <p style={{ color: twistCorrect ? design.colors.success : design.colors.error, fontSize: typo.bodyLarge, fontWeight: 600, margin: 0 }}>
                {twistCorrect ? 'Correct!' : 'Actually,'} oil has a higher refractive index, so light bends MORE toward the normal compared to water.
              </p>
            </div>

            <div style={{ color: design.colors.textSecondary, marginBottom: '24px' }}>
              <h3 style={{ color: design.colors.accentPrimary, marginBottom: '12px', fontSize: typo.bodyLarge }}>The Physics Explains:</h3>
              <ul style={{ lineHeight: '1.8', fontSize: typo.body }}>
                <li>From Snell's Law: sin(theta2) = (n1/n2) sin(theta1)</li>
                <li>Higher n2 means smaller sin(theta2)</li>
                <li>Smaller sin(theta2) means smaller theta2</li>
                <li>Smaller refracted angle = more bending toward normal</li>
              </ul>
            </div>

            <div style={{ textAlign: 'center' }}>
              {renderButton('Continue', goNext)}
            </div>
          </div>
        );

      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Snells Law"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer':
        const app = realWorldApps[activeApp];
        return (
          <div style={{ padding: typo.pagePadding, }}>
            <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ fontSize: typo.body, color: design.colors.textSecondary, marginBottom: '24px' }}>
              Explore how Snell's Law is used in industry and everyday technology. These examples connect physics principles to real applications.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
              {realWorldApps.map((a, idx) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setActiveApp(idx);
                    setCompletedApps(new Set([...completedApps, idx]));
                    emitEvent('app_explored', { app: a.id });
                  }}
                  style={{
                    padding: '12px 16px',
                    background: activeApp === idx ? app.color : design.colors.bgCard,
                    color: design.colors.textPrimary,
                    border: completedApps.has(idx) ? `2px solid ${design.colors.success}` : `1px solid ${design.colors.border}`,
                    borderRadius: design.radius.sm,
                    cursor: 'pointer',
                    fontSize: typo.small,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {a.icon} {a.title}
                </button>
              ))}
            </div>

            <div style={{
              background: design.colors.bgCard,
              padding: '24px',
              borderRadius: design.radius.lg,
              border: `1px solid ${design.colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '40px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ fontSize: typo.small, color: design.colors.textMuted, margin: 0 }}>{app.subtitle}</p>
                </div>
              </div>

              <p style={{ fontSize: typo.body, color: design.colors.textSecondary, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                background: design.colors.bgElevated,
                padding: '16px',
                borderRadius: design.radius.sm,
                marginBottom: '16px'
              }}>
                <h4 style={{ fontSize: typo.small, fontWeight: 600, color: design.colors.accentPrimary, marginBottom: '8px' }}>
                  CONNECTION TO SNELL'S LAW:
                </h4>
                <p style={{ fontSize: typo.small, color: design.colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                background: design.colors.bgElevated,
                padding: '16px',
                borderRadius: design.radius.sm,
                marginBottom: '16px'
              }}>
                <h4 style={{ fontSize: typo.small, fontWeight: 600, color: design.colors.cyan, marginBottom: '8px' }}>
                  HOW IT WORKS:
                </h4>
                <p style={{ fontSize: typo.small, color: design.colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                background: design.colors.bgElevated,
                padding: '16px',
                borderRadius: design.radius.sm,
                marginBottom: '16px'
              }}>
                <h4 style={{ fontSize: typo.small, fontWeight: 600, color: design.colors.success, marginBottom: '8px' }}>
                  FUTURE IMPACT:
                </h4>
                <p style={{ fontSize: typo.small, color: design.colors.textSecondary, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <span style={{
                  padding: '8px 12px',
                  background: `${app.color}20`,
                  color: app.color,
                  borderRadius: design.radius.sm,
                  fontSize: typo.small,
                  fontWeight: 600
                }}>
                  {app.stat}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: typo.small, fontWeight: 600, color: design.colors.textMuted, marginBottom: '8px' }}>
                  EXAMPLES:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      padding: '6px 10px',
                      background: design.colors.bgElevated,
                      color: design.colors.textSecondary,
                      borderRadius: design.radius.sm,
                      fontSize: typo.label
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: typo.small, fontWeight: 600, color: design.colors.textMuted, marginBottom: '8px' }}>
                  COMPANIES:
                </h4>
                <p style={{ fontSize: typo.small, color: design.colors.textSecondary, margin: 0 }}>
                  {app.companies.join(' | ')}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              {activeApp < realWorldApps.length - 1 ? (
                renderButton(`Next Application →`, () => {
                  const nextApp = activeApp + 1;
                  setActiveApp(nextApp);
                  setCompletedApps(new Set([...completedApps, nextApp]));
                  emitEvent('app_explored', { app: realWorldApps[nextApp].id });
                })
              ) : (
                renderButton('Continue to Test', goNext)
              )}
            </div>
            <p style={{ textAlign: 'center', fontSize: typo.small, color: design.colors.textMuted, marginTop: '8px' }}>
              Application {activeApp + 1} of {realWorldApps.length}
            </p>
          </div>
        );

      case 'test':
        const currentQ = testQuestions[testIndex];
        const selectedAnswer = answers[testIndex];

        if (showResult) {
          const score = answers.reduce((acc, ans, idx) => {
            if (ans !== null && testQuestions[idx].options[ans]?.correct) {
              return acc + 1;
            }
            return acc;
          }, 0);

          return (
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ fontSize: typo.title, fontWeight: 700, color: design.colors.textPrimary, marginBottom: '24px' }}>
                Test Complete!
              </h2>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 7 ? '🎉' : score >= 5 ? '👍' : '📚'}
              </div>
              <p style={{ fontSize: typo.heading, color: design.colors.textPrimary, marginBottom: '8px' }}>
                You scored {score} / 10
              </p>
              <p style={{ fontSize: typo.body, color: design.colors.textMuted, marginBottom: '24px' }}>
                {score >= 7 ? 'Excellent! You\'ve mastered Snell\'s Law!' : score >= 5 ? 'Good job! Keep practicing!' : 'Keep learning - you\'ll get there!'}
              </p>

              <div style={{ marginTop: '24px', textAlign: 'left' }}>
                <h3 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, marginBottom: '16px' }}>Answer Review</h3>
                {testQuestions.map((q, i) => {
                  const userAnswer = answers[i];
                  const isCorrect = userAnswer !== null && q.options[userAnswer]?.correct;
                  return (
                    <div key={i} style={{
                      padding: '12px', marginBottom: '8px', borderRadius: '8px',
                      background: isCorrect ? design.colors.successMuted : design.colors.errorMuted,
                      border: `1px solid ${isCorrect ? design.colors.success : design.colors.error}`
                    }}>
                      <p style={{ fontWeight: 600, color: design.colors.textPrimary, margin: '0 0 4px 0', fontSize: typo.body }}>Q{i + 1}: {q.scenario}</p>
                      <p style={{ color: design.colors.textSecondary, margin: '0 0 4px 0', fontSize: typo.small }}>Your answer: {userAnswer !== null ? q.options[userAnswer].text : 'Skipped'}</p>
                      {!isCorrect && <p style={{ color: design.colors.success, margin: 0, fontSize: typo.small }}>Correct: {q.options.find(o => o.correct)?.text}</p>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px', flexWrap: 'wrap' }}>
                {renderButton('Replay Game', () => {
                  setTestIndex(0);
                  setAnswers(Array(10).fill(null));
                  setShowResult(false);
                  setConfirmedIndex(null);
                  setPrediction(null);
                  setTwistPrediction(null);
                  setActiveApp(0);
                  setCompletedApps(new Set());
                  goToPhase('hook');
                }, 'secondary', false, 'md')}
                {renderButton('Return to Dashboard', () => {
                  emitEvent('mastery_achieved', {});
                  window.location.href = '/';
                }, 'success', false, 'md')}
              </div>
            </div>
          );
        }

        return (
          <div style={{ padding: typo.pagePadding, }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: typo.heading, fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Knowledge Test
              </h2>
              <span style={{ fontSize: typo.body, color: design.colors.textMuted }} data-testid="question-counter">
                Question {testIndex + 1} of 10
              </span>
            </div>

            {/* Quiz progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
              {Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: answers[idx] !== null
                      ? design.colors.success
                      : idx === testIndex
                        ? design.colors.accentPrimary
                        : design.colors.bgElevated,
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>

            <div style={{
              background: design.colors.bgCard,
              padding: '20px',
              borderRadius: design.radius.md,
              marginBottom: '20px',
              border: `1px solid ${design.colors.border}`
            }}>
              <p style={{ fontSize: typo.small, color: design.colors.textMuted, marginBottom: '12px', fontStyle: 'italic' }}>
                Scenario: {currentQ.scenario}
              </p>
              <p style={{ fontSize: typo.bodyLarge, color: design.colors.textPrimary, fontWeight: 500, margin: 0 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((option, idx) => {
                const isConfirmed = confirmedIndex === testIndex;
                const isSelected = selectedAnswer === idx;
                const isCorrectOption = option.correct;

                let optionBg = design.colors.bgCard;
                let optionBorder = `1px solid ${design.colors.border}`;

                if (isConfirmed) {
                  if (isSelected && isCorrectOption) {
                    optionBg = design.colors.successMuted;
                    optionBorder = `2px solid ${design.colors.success}`;
                  } else if (isSelected && !isCorrectOption) {
                    optionBg = design.colors.errorMuted;
                    optionBorder = `2px solid ${design.colors.error}`;
                  } else if (isCorrectOption) {
                    optionBg = design.colors.successMuted;
                    optionBorder = `2px solid ${design.colors.success}`;
                  }
                } else if (isSelected) {
                  optionBg = design.colors.accentPrimary;
                  optionBorder = `2px solid ${design.colors.accentSecondary}`;
                }

                return (
                  <div key={idx}>
                    <button
                      onClick={() => {
                        if (isConfirmed) return;
                        const newAnswers = [...answers];
                        newAnswers[testIndex] = idx;
                        setAnswers(newAnswers);
                        playSound('click');
                      }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: optionBg,
                        color: design.colors.textPrimary,
                        border: optionBorder,
                        borderRadius: design.radius.md,
                        cursor: isConfirmed ? 'default' : 'pointer',
                        textAlign: 'left',
                        fontSize: typo.body,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {option.label}) {option.text}
                      {isConfirmed && isSelected && isCorrectOption && (
                        <span style={{ marginLeft: '8px', color: design.colors.success, fontWeight: 700 }}>
                          ✓ Correct!
                        </span>
                      )}
                      {isConfirmed && isSelected && !isCorrectOption && (
                        <span style={{ marginLeft: '8px', color: design.colors.error, fontWeight: 700 }}>
                          ✗ Incorrect
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Explanation after confirming */}
            {confirmedIndex === testIndex && (
              <div style={{
                background: design.colors.bgElevated,
                padding: '16px',
                borderRadius: design.radius.md,
                marginBottom: '24px',
                border: `1px solid ${design.colors.border}`
              }}>
                <p style={{ fontSize: typo.body, color: design.colors.textSecondary, margin: 0 }}>
                  <span style={{ fontWeight: 600, color: design.colors.accentPrimary }}>Explanation: </span>
                  {currentQ.explanation}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              {testIndex > 0 && (
                <button
                  onClick={() => {
                    setTestIndex(testIndex - 1);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: design.colors.bgCard,
                    color: design.colors.textSecondary,
                    border: `1px solid ${design.colors.border}`,
                    borderRadius: design.radius.sm,
                    cursor: 'pointer',
                    fontSize: typo.body,
                    transition: 'all 0.2s ease'
                  }}
                >
                  Previous
                </button>
              )}
              <div style={{ flex: 1 }} />
              {/* Check Answer button: always rendered when not confirmed, disabled if no answer */}
              {confirmedIndex !== testIndex && (
                <button
                  onClick={() => {
                    if (selectedAnswer === null) return;
                    setConfirmedIndex(testIndex);
                    emitEvent('test_answered', { questionIndex: testIndex, answer: selectedAnswer });
                    playSound(currentQ.options[selectedAnswer]?.correct ? 'success' : 'failure');
                  }}
                  disabled={selectedAnswer === null}
                  style={{
                    padding: '12px 24px',
                    background: selectedAnswer !== null ? design.colors.cyan : design.colors.bgElevated,
                    color: selectedAnswer !== null ? '#fff' : design.colors.textMuted,
                    border: 'none',
                    borderRadius: design.radius.sm,
                    cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed',
                    fontSize: typo.body,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    opacity: selectedAnswer !== null ? 1 : 0.5
                  }}
                >
                  Check Answer
                </button>
              )}
              {/* Next Question / Submit Test button: shown only after confirming */}
              {confirmedIndex === testIndex && (
                testIndex < 9 ? (
                  <button
                    onClick={() => {
                      setConfirmedIndex(null);
                      setTestIndex(testIndex + 1);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: design.colors.accentPrimary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: design.radius.sm,
                      cursor: 'pointer',
                      fontSize: typo.body,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowResult(true);
                      playSound('complete');
                      emitEvent('test_completed', { answers });
                    }}
                    style={{
                      padding: '12px 24px',
                      background: design.colors.success,
                      color: '#fff',
                      border: 'none',
                      borderRadius: design.radius.sm,
                      cursor: 'pointer',
                      fontSize: typo.body,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Submit Test
                  </button>
                )
              )}
            </div>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h2 style={{ fontSize: typo.title, fontWeight: 700, color: design.colors.textPrimary, marginBottom: '16px' }}>
              Congratulations! You've Mastered Snell's Law!
            </h2>
            <p style={{ fontSize: typo.bodyLarge, color: design.colors.textSecondary, marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
              You now understand the mathematical relationship that governs how light bends at interfaces. This principle is fundamental to optics, fiber communications, and lens design.
            </p>

            <div style={{
              background: design.colors.bgCard,
              padding: '24px',
              borderRadius: design.radius.lg,
              textAlign: 'left',
              maxWidth: '500px',
              margin: '0 auto 32px',
              border: `1px solid ${design.colors.border}`
            }}>
              <h3 style={{ color: design.colors.accentPrimary, marginBottom: '16px', fontSize: typo.bodyLarge }}>Key Concepts Learned:</h3>
              <ul style={{ color: design.colors.textSecondary, lineHeight: '2', fontSize: typo.body, margin: 0, paddingLeft: '20px' }}>
                <li>n1 sin(theta1) = n2 sin(theta2) - Snell's Law</li>
                <li>Higher refractive index = more bending toward normal</li>
                <li>Ratio of sines equals inverse ratio of indices</li>
                <li>Perpendicular entry means no bending</li>
                <li>Total internal reflection at critical angle</li>
              </ul>
            </div>

            {renderButton('Complete Lesson', () => {
              playSound('complete');
              emitEvent('mastery_achieved', {});
              window.location.href = '/';
            }, 'success', false, 'lg')}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(145deg, ${design.colors.bgDeep} 0%, ${design.colors.bgPrimary} 50%, ${design.colors.bgSecondary} 100%)`,
      fontFamily: design.font.sans,
      color: design.colors.textPrimary,
    }}>
      {renderProgressBar()}
      <div style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as any
      }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default SnellsLawRenderer;
