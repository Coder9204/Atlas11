'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    positive: '#EF4444',
    negative: '#3B82F6',
    background: {
      primary: '#0F0F1A',
      secondary: '#1A1A2E',
      tertiary: '#252542',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#e2e8f0',
      muted: '#cbd5e1',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      warm: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      cool: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      field: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
    },
  },
  typography: {
    fontFamily: theme.fontFamily,
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40`,
  },
};

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Experiment',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Experiment',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

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

interface Charge {
  id: number;
  x: number;
  y: number;
  q: number; // charge magnitude (positive or negative)
}

interface FieldVector {
  x: number;
  y: number;
  ex: number;
  ey: number;
  magnitude: number;
}

interface ElectricFieldMappingRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function ElectricFieldMappingRenderer({ onGameEvent, gamePhase, onPhaseComplete }: ElectricFieldMappingRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const { isMobile } = useViewport();
// Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - field visualization
  const [charges, setCharges] = useState<Charge[]>([]);
  const [fieldVectors, setFieldVectors] = useState<FieldVector[]>([]);
  const [showVectors, setShowVectors] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [fieldLines, setFieldLines] = useState<{ x: number; y: number }[][]>([]);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - dipole field
  const [dipoleCharges, setDipoleCharges] = useState<Charge[]>([]);
  const [dipoleFieldLines, setDipoleFieldLines] = useState<{ x: number; y: number }[][]>([]);
  const [dipoleVectors, setDipoleVectors] = useState<FieldVector[]>([]);
  const [separation, setSeparation] = useState(80);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Play phase - field strength slider
  const [fieldStrength, setFieldStrength] = useState(50);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      scenario: "An engineer is designing a particle accelerator and needs to predict how a proton (positive charge) will move when placed in an electric field between two charged plates.",
      question: "In which direction will the proton move relative to the electric field lines?",
      options: [
        { id: 'a', label: "Perpendicular to the field lines" },
        { id: 'b', label: "In the same direction as the field lines (toward the negative plate)", correct: true },
        { id: 'c', label: "Opposite to the field lines (toward the positive plate)" },
        { id: 'd', label: "It will spiral in circles around the field lines" }
      ],
      explanation: "Electric field lines show the direction a positive test charge would move. Since field lines point from positive to negative, a proton (positive) follows the field lines toward the negative plate. Electrons (negative) would move opposite to the field lines."
    },
    {
      scenario: "A physicist draws electric field lines around a point charge and notices that the lines are much denser near the charge and spread out farther away.",
      question: "What does the varying density of field lines indicate about the electric field?",
      options: [
        { id: 'a', label: "The field changes direction at different distances" },
        { id: 'b', label: "The field is stronger where lines are denser (closer to the charge)", correct: true },
        { id: 'c', label: "There are more charges closer to the center" },
        { id: 'd', label: "The field oscillates between strong and weak" }
      ],
      explanation: "Field line density represents field strength. Where lines are close together, the field is strong; where they spread apart, the field is weaker. This follows from E = kq/r² - the field decreases with the square of distance, so fewer lines pass through a given area at greater distances."
    },
    {
      scenario: "A student drawing electric field maps wonders whether field lines from different charges could ever intersect at a single point.",
      question: "Why can electric field lines never cross each other?",
      options: [
        { id: 'a', label: "It would require infinite energy at the crossing point" },
        { id: 'b', label: "At any point in space, the field can only have one direction; crossing would imply two directions", correct: true },
        { id: 'c', label: "Magnetic fields prevent electric field lines from crossing" },
        { id: 'd', label: "They can cross, but only at very high voltages" }
      ],
      explanation: "Electric field lines represent the direction a positive test charge would move at each point. If lines crossed, a charge at the intersection would have two possible directions - which is physically impossible. The field at any point must be unique, so lines never cross."
    },
    {
      scenario: "You're standing 2 meters from a charged sphere and measure the electric field strength. You then move to 4 meters from the same sphere.",
      question: "How does the electric field strength at 4 meters compare to the field at 2 meters?",
      options: [
        { id: 'a', label: "Half as strong" },
        { id: 'b', label: "One-quarter as strong", correct: true },
        { id: 'c', label: "One-eighth as strong" },
        { id: 'd', label: "The same strength" }
      ],
      explanation: "Electric field follows an inverse-square law: E = kq/r². When you double the distance (2m to 4m), the field becomes (1/2)² = 1/4 as strong. This is why the field drops off rapidly with distance from a point charge."
    },
    {
      scenario: "A capacitor consists of two parallel metal plates - one positive, one negative - separated by a small gap. An electronics engineer needs to know what the electric field looks like between them.",
      question: "What is the pattern of electric field lines between the parallel plates of a charged capacitor?",
      options: [
        { id: 'a', label: "Field lines curve from one plate to the other" },
        { id: 'b', label: "Field lines are parallel and evenly spaced, pointing from positive to negative plate", correct: true },
        { id: 'c', label: "Field lines radiate outward from the center" },
        { id: 'd', label: "There is no field between the plates" }
      ],
      explanation: "Between parallel charged plates, the electric field is uniform - equal in strength and direction everywhere. This creates parallel, evenly-spaced field lines pointing from the positive plate to the negative plate. This uniform field is useful in many applications like particle acceleration."
    },
    {
      scenario: "A water molecule (H2O) has a slightly positive side (the hydrogen atoms) and a slightly negative side (the oxygen atom), forming what chemists call a polar molecule.",
      question: "What type of charge arrangement does a water molecule represent?",
      options: [
        { id: 'a', label: "A monopole - a single concentrated charge" },
        { id: 'b', label: "A dipole - separated positive and negative charges", correct: true },
        { id: 'c', label: "A quadrupole - four alternating charges" },
        { id: 'd', label: "A neutral arrangement with no electric properties" }
      ],
      explanation: "A dipole consists of equal positive and negative charges separated by a distance. Water molecules are permanent dipoles - the oxygen end is slightly negative while the hydrogen end is slightly positive. This dipole nature explains water's remarkable properties as a solvent."
    },
    {
      scenario: "Lightning rods are designed to protect buildings by providing a path for lightning to reach the ground. The rod is pointed with a sharp tip at the top.",
      question: "Why does the sharp tip of a lightning rod create a strong local electric field?",
      options: [
        { id: 'a', label: "Sharp points attract more dust particles that carry charge" },
        { id: 'b', label: "Electric charges concentrate at points, creating intense fields that help initiate controlled discharge", correct: true },
        { id: 'c', label: "The metal is more conductive at the tip" },
        { id: 'd', label: "Sharp tips are higher and closer to the clouds" }
      ],
      explanation: "Charges on a conductor concentrate at points or sharp edges, creating very strong local electric fields. This intense field at the lightning rod tip ionizes nearby air, creating a conductive path for lightning to follow safely to ground rather than striking the building randomly."
    },
    {
      scenario: "A researcher places a positive test charge between two positive charges of equal magnitude. She notices the test charge is pushed directly toward the midpoint between the two charges, then deflected away.",
      question: "At the exact midpoint between two equal positive charges, what is the net electric field?",
      options: [
        { id: 'a', label: "Maximum field pointing toward one of the charges" },
        { id: 'b', label: "Zero - the two fields cancel out exactly", correct: true },
        { id: 'c', label: "Double the field of a single charge" },
        { id: 'd', label: "The field points perpendicular to the line connecting the charges" }
      ],
      explanation: "At the midpoint between two equal positive charges, the electric field from each charge has the same magnitude but points in opposite directions (both away from their source). These vectors cancel exactly, resulting in zero net field at the midpoint."
    },
    {
      scenario: "An atmospheric scientist is studying how charged particles in clouds create lightning. She knows that electric breakdown of air occurs when the field strength exceeds about 3 million V/m.",
      question: "What happens when the electric field strength in air exceeds the breakdown threshold?",
      options: [
        { id: 'a', label: "The field lines become curved" },
        { id: 'b', label: "Air molecules become ionized, making air conductive, and a spark or lightning occurs", correct: true },
        { id: 'c', label: "The charges neutralize themselves instantly" },
        { id: 'd', label: "The field reverses direction" }
      ],
      explanation: "When the electric field is strong enough, it rips electrons from air molecules (ionization). This creates free charges that can carry current - air becomes conductive. The sudden discharge of charge through this ionized path is what we see as a spark or lightning bolt."
    },
    {
      scenario: "An engineer is designing a Van de Graaff generator for a science museum and needs to understand the field around the spherical dome when it's fully charged.",
      question: "How does the electric field behave outside a charged conducting sphere?",
      options: [
        { id: 'a', label: "The field is zero outside the sphere" },
        { id: 'b', label: "The field behaves as if all charge were concentrated at the center of the sphere", correct: true },
        { id: 'c', label: "The field only exists on the surface of the sphere" },
        { id: 'd', label: "The field is uniform in all directions outside" }
      ],
      explanation: "Outside a uniformly charged conducting sphere, the electric field is identical to that of a point charge located at the sphere's center (with the same total charge). This is a consequence of Gauss's Law and spherical symmetry. It's why field calculations for charged spheres are often simplified using point-charge formulas."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
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

  // Phase sync
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Audio feedback
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Event emission
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Calculate electric field at a point
  const calculateField = useCallback((x: number, y: number, chargeList: Charge[]): { ex: number; ey: number } => {
    let ex = 0, ey = 0;
    const k = 1000; // Coulomb constant scaled for visualization

    chargeList.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r2 = dx * dx + dy * dy;
      const r = Math.sqrt(r2);

      if (r > 10) { // Avoid singularity at charge location
        const eMag = k * charge.q / r2;
        ex += eMag * (dx / r);
        ey += eMag * (dy / r);
      }
    });

    return { ex, ey };
  }, []);

  // Generate field vectors on a grid
  const generateFieldVectors = useCallback((chargeList: Charge[]) => {
    const vectors: FieldVector[] = [];
    const gridSize = 25;

    for (let x = 30; x <= 270; x += gridSize) {
      for (let y = 30; y <= 270; y += gridSize) {
        const { ex, ey } = calculateField(x, y, chargeList);
        const magnitude = Math.sqrt(ex * ex + ey * ey);
        vectors.push({ x, y, ex, ey, magnitude });
      }
    }

    return vectors;
  }, [calculateField]);

  // Generate field lines
  const generateFieldLines = useCallback((chargeList: Charge[]) => {
    const lines: { x: number; y: number }[][] = [];

    chargeList.forEach(charge => {
      if (charge.q > 0) {
        // Start field lines from positive charges
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
          const angle = (2 * Math.PI * i) / numLines;
          const line: { x: number; y: number }[] = [];
          let x = charge.x + 15 * Math.cos(angle);
          let y = charge.y + 15 * Math.sin(angle);

          for (let step = 0; step < 100; step++) {
            if (x < 20 || x > 280 || y < 20 || y > 280) break;

            line.push({ x, y });

            const { ex, ey } = calculateField(x, y, chargeList);
            const mag = Math.sqrt(ex * ex + ey * ey);

            if (mag < 0.1) break;

            // Normalize and step
            const stepSize = 5;
            x += (ex / mag) * stepSize;
            y += (ey / mag) * stepSize;

            // Check if we reached a negative charge
            let hitNegative = false;
            chargeList.forEach(c => {
              if (c.q < 0) {
                const dist = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
                if (dist < 15) hitNegative = true;
              }
            });
            if (hitNegative) {
              line.push({ x, y });
              break;
            }
          }

          if (line.length > 2) lines.push(line);
        }
      }
    });

    return lines;
  }, [calculateField]);

  // Initialize play phase
  useEffect(() => {
    if (phase === 'play') {
      const initialCharges: Charge[] = [
        { id: 0, x: 150, y: 150, q: 1 }
      ];
      setCharges(initialCharges);
      setFieldVectors(generateFieldVectors(initialCharges));
      setFieldLines(generateFieldLines(initialCharges));
    }
  }, [phase, generateFieldVectors, generateFieldLines]);

  // Update fields when charges change
  useEffect(() => {
    if (phase === 'play' && charges.length > 0) {
      setFieldVectors(generateFieldVectors(charges));
      setFieldLines(generateFieldLines(charges));
    }
  }, [charges, phase, generateFieldVectors, generateFieldLines]);

  // Initialize twist phase (dipole)
  useEffect(() => {
    if (phase === 'twist_play') {
      const dipole: Charge[] = [
        { id: 0, x: 150 - separation / 2, y: 150, q: 1 },
        { id: 1, x: 150 + separation / 2, y: 150, q: -1 }
      ];
      setDipoleCharges(dipole);
      setDipoleFieldLines(generateFieldLines(dipole));
      setDipoleVectors(generateFieldVectors(dipole));
    }
  }, [phase, separation, generateFieldLines, generateFieldVectors]);

  // Add charge
  const addCharge = (q: number) => {
    const newCharge: Charge = {
      id: charges.length,
      x: 80 + Math.random() * 140,
      y: 80 + Math.random() * 140,
      q
    };
    setCharges([...charges, newCharge]);
  };

  // Helper functions for UI elements
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      borderRadius: premiumDesign.radius.lg,
      border: 'none',
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: premiumDesign.typography.fontFamily,
      opacity: disabled ? 0.5 : 1,
      zIndex: 10,
      minHeight: '44px',
    };

    const variants = {
      primary: {
        background: premiumDesign.colors.gradient.primary,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
      },
      secondary: {
        background: premiumDesign.colors.background.tertiary,
        color: premiumDesign.colors.text.primary,
        border: `1px solid rgba(255,255,255,0.1)`,
      },
      success: {
        background: premiumDesign.colors.gradient.field,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.success),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
      >
        {text}
      </button>
    );
  }

  function renderProgressBar() {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.muted,
        }}>
          <span>Phase {currentIndex + 1} of {phaseOrder.length}</span>
          <span>{phaseLabels[phase]}</span>
        </div>
        <div style={{
          height: 6,
          background: premiumDesign.colors.background.tertiary,
          borderRadius: premiumDesign.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: premiumDesign.colors.gradient.field,
            borderRadius: premiumDesign.radius.full,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  }

  function renderBottomBar(
    leftButton?: { text: string; onClick: () => void },
    rightButton?: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }
  ) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: premiumDesign.spacing.xl,
        paddingTop: premiumDesign.spacing.lg,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // Render field visualization with premium SVG graphics
  function renderFieldVisualization(
    chargeList: Charge[],
    vectors: FieldVector[],
    lines: { x: number; y: number }[][],
    showVec: boolean,
    showLines: boolean,
    fieldScale: number = 100
  ) {
    // Generate equipotential lines (circles around charges)
    const generateEquipotentialLines = () => {
      const equipotentials: { cx: number; cy: number; r: number; potential: number }[] = [];
      chargeList.forEach(charge => {
        // Draw equipotential circles at different radii
        [30, 50, 70, 90].forEach((r, i) => {
          equipotentials.push({
            cx: charge.x,
            cy: charge.y,
            r,
            potential: charge.q / r * 100
          });
        });
      });
      return equipotentials;
    };

    const equipotentials = generateEquipotentialLines();

    return (
      <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Electric Field Mapping visualization">
        <defs>
          {/* Premium background gradient */}
          <linearGradient id="efmLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a1628" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Field area gradient */}
          <linearGradient id="efmFieldArea" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.1" />
            <stop offset="25%" stopColor="#047857" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.05" />
            <stop offset="75%" stopColor="#047857" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.1" />
          </linearGradient>

          {/* Positive charge gradient (red/warm) */}
          <radialGradient id="efmPositiveCharge" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="20%" stopColor="#f87171" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#dc2626" />
            <stop offset="90%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Negative charge gradient (blue/cool) */}
          <radialGradient id="efmNegativeCharge" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="20%" stopColor="#60a5fa" />
            <stop offset="45%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#2563eb" />
            <stop offset="90%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>

          {/* Positive charge outer glow */}
          <radialGradient id="efmPositiveGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#f87171" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#fca5a5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#fecaca" stopOpacity="0" />
          </radialGradient>

          {/* Negative charge outer glow */}
          <radialGradient id="efmNegativeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
          </radialGradient>

          {/* Field line gradient (cyan to emerald) */}
          <linearGradient id="efmFieldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#14b8a6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.7" />
            <stop offset="75%" stopColor="#14b8a6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>

          {/* Field vector gradient */}
          <linearGradient id="efmVectorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#34d399" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#6ee7b7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="1" />
          </linearGradient>

          {/* Equipotential line gradient */}
          <linearGradient id="efmEquipotential" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="25%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#d8b4fe" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
          </linearGradient>

          {/* Charge glow filter */}
          <filter id="efmChargeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Field line glow filter */}
          <filter id="efmLineGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Vector arrow glow filter */}
          <filter id="efmVectorGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle inner shadow for field area */}
          <filter id="efmInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Arrow marker with gradient fill */}
          <marker
            id="efmFieldArrow"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#6ee7b7" />
          </marker>

          {/* Field line direction marker */}
          <marker
            id="efmLineArrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="#22d3ee" />
          </marker>

          {/* Grid pattern */}
          <pattern id="efmGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Premium dark background */}
        <rect width="300" height="300" fill="url(#efmLabBg)" />

        {/* Subtle grid pattern */}
        <rect width="300" height="300" fill="url(#efmGrid)" />

        {/* Field visualization area with gradient */}
        <rect x="20" y="20" width="260" height="260" fill="url(#efmFieldArea)" rx="12" filter="url(#efmInnerShadow)" />
        <rect x="20" y="20" width="260" height="260" fill="none" stroke="url(#efmFieldLine)" strokeWidth="2" rx="12" strokeOpacity="0.5" />

        {/* Equipotential lines (dashed circles) */}
        {equipotentials.map((eq, i) => (
          <circle
            key={`equi-${i}`}
            cx={eq.cx}
            cy={eq.cy}
            r={eq.r}
            fill="none"
            stroke="url(#efmEquipotential)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.4}
          />
        ))}

        {/* Field lines with premium gradient and glow */}
        {showLines && lines.map((line, i) => (
          <polyline
            key={`line-${i}`}
            points={line.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="url(#efmFieldLine)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#efmLineGlow)"
            markerMid="url(#efmLineArrow)"
          />
        ))}

        {/* Field vectors with gradient and glow */}
        {showVec && vectors.map((v, i) => {
          const scaleFactor = fieldScale / 100;
          const maxLen = 15 * scaleFactor;
          const scale = Math.min(maxLen, v.magnitude * 0.1 * scaleFactor);
          const mag = Math.sqrt(v.ex * v.ex + v.ey * v.ey);
          if (mag < 0.01) return null;

          const endX = v.x + (v.ex / mag) * scale;
          const endY = v.y + (v.ey / mag) * scale;
          const opacity = Math.min(1, v.magnitude * 0.025 * scaleFactor);

          return (
            <line
              key={`vec-${i}`}
              x1={v.x}
              y1={v.y}
              x2={endX}
              y2={endY}
              stroke="url(#efmVectorGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#efmFieldArrow)"
              filter="url(#efmVectorGlow)"
              opacity={opacity}
            />
          );
        })}

        {/* Charges with premium gradients and glow effects */}
        {chargeList.map(charge => (
          <g key={charge.id} filter="url(#efmChargeGlow)">
            {/* Outer glow layer */}
            <circle
              cx={charge.x}
              cy={charge.y}
              r="28"
              fill={charge.q > 0 ? 'url(#efmPositiveGlow)' : 'url(#efmNegativeGlow)'}
            />
            {/* Inner glow layer */}
            <circle
              cx={charge.x}
              cy={charge.y}
              r="20"
              fill={charge.q > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}
            />
            {/* Main charge circle with gradient */}
            <circle
              cx={charge.x}
              cy={charge.y}
              r="15"
              fill={charge.q > 0 ? 'url(#efmPositiveCharge)' : 'url(#efmNegativeCharge)'}
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2"
            />
            {/* Highlight reflection */}
            <ellipse
              cx={charge.x - 4}
              cy={charge.y - 4}
              rx="5"
              ry="3"
              fill="rgba(255,255,255,0.4)"
              transform={`rotate(-30 ${charge.x - 4} ${charge.y - 4})`}
            />
            {/* Sign */}
            <text
              x={charge.x}
              y={charge.y + 6}
              textAnchor="middle"
              fill="white"
              fontSize="18"
              fontWeight="bold"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {charge.q > 0 ? '+' : '−'}
            </text>
            {/* SVG Label for charge */}
            <text
              x={charge.x}
              y={charge.y + 35}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="11"
              fontWeight="500"
            >
              {charge.q > 0 ? 'Positive Charge' : 'Negative Charge'}
            </text>
          </g>
        ))}

        {/* Field direction label */}
        {showLines && lines.length > 0 && (
          <text x="150" y="285" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="500">
            Field Lines (E-field direction)
          </text>
        )}

        {/* Axis labels and educational annotations */}
        <g id="axis-labels">
          <text x="90" y="15" textAnchor="middle" fill="#94a3b8" fontSize="11">Distance (position)</text>
          <text x="12" y="155" textAnchor="middle" fill="#94a3b8" fontSize="11" transform="rotate(-90 12 155)">Force intensity</text>
        </g>

        {/* Formula annotation */}
        <g id="formula-layer">
          <text x="270" y="268" textAnchor="end" fill="#6ee7b7" fontSize="11">E = kq/r²</text>
          <text x="30" y="30" textAnchor="start" fill="#94a3b8" fontSize="11">Scale: {Math.round(fieldScale)}%</text>
        </g>

        {/* Interactive marker circle - moves with field scale */}
        <circle cx={150} cy={150 - fieldScale * 0.5} r="4" fill="#f59e0b" stroke="white" strokeWidth="1" opacity="0.8" />

      </svg>
    );
  }

  // Wrapper component for field visualization with external labels
  function renderFieldVisualizationWithLabels(
    chargeList: Charge[],
    vectors: FieldVector[],
    lines: { x: number; y: number }[][],
    showVec: boolean,
    showLines: boolean,
    fieldScale: number = 100
  ) {
    return (
      <div style={{ position: 'relative' }}>
        {/* External label using typo system */}
        {chargeList.length > 0 && (
          <div style={{
            position: 'absolute',
            top: typo.elementGap,
            left: typo.elementGap,
            padding: `${premiumDesign.spacing.xs}px ${premiumDesign.spacing.sm}px`,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: premiumDesign.radius.sm,
            border: '1px solid rgba(110, 231, 183, 0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
          }}>
            <span style={{
              fontSize: typo.label,
              fontWeight: 600,
              color: '#6ee7b7',
              fontFamily: premiumDesign.typography.fontFamily,
              letterSpacing: '0.5px',
            }}>
              E-FIELD
            </span>
          </div>
        )}
        {/* Legend section */}
        <div data-legend="true" style={{
          position: 'absolute',
          bottom: typo.elementGap,
          right: typo.elementGap,
          padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
          background: 'rgba(0,0,0,0.85)',
          borderRadius: premiumDesign.radius.md,
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '1px solid rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: '11px', color: '#e2e8f0' }}>Positive charge (+)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', border: '1px solid rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: '11px', color: '#e2e8f0' }}>Negative charge (-)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 16, height: 2, background: 'linear-gradient(90deg, #06b6d4, #10b981)', borderRadius: '1px' }} />
              <span style={{ fontSize: '11px', color: '#e2e8f0' }}>Field lines</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, background: 'linear-gradient(45deg, #10b981 50%, #6ee7b7 50%)', borderRadius: '2px' }} />
              <span style={{ fontSize: '11px', color: '#e2e8f0' }}>Field vectors</span>
            </div>
          </div>
        </div>
        {renderFieldVisualization(chargeList, vectors, lines, showVec, showLines, fieldScale)}
      </div>
    );
  }

  // Real-world applications data
  const realWorldApps = [
    {
      icon: "💓",
      title: "Cardiac Electrophysiology",
      short: "Heart Rhythm",
      tagline: "Mapping the heart's electrical symphony",
      description: "Cardiac electrophysiology studies the electrical activity of the heart by mapping electric fields across heart tissue. Cardiologists use electrode catheters inserted into the heart to measure voltage potentials at thousands of points, creating detailed 3D electric field maps. These maps reveal abnormal electrical pathways causing arrhythmias like atrial fibrillation, ventricular tachycardia, and Wolff-Parkinson-White syndrome. By visualizing how electrical impulses propagate through heart muscle, doctors can precisely target problem areas for treatment.",
      connection: "Just like our simulation shows electric field lines radiating from charges and connecting between opposites, the heart generates its own electric fields as cardiac cells depolarize and repolarize. The SA node acts like a positive charge source, initiating electrical waves that spread through the atria and ventricles. Mapping these biological electric fields uses the same physics principles—field strength decreases with distance, and field direction shows the path electrical signals travel through tissue.",
      howItWorks: "During an electrophysiology study, multi-electrode catheters are threaded through blood vessels into the heart chambers. Each electrode measures local voltage relative to a reference, sampling the electric potential field. Advanced mapping systems like CARTO and EnSite NavX use magnetic localization and impedance sensing to track catheter position in 3D space. Software interpolates voltage measurements to generate color-coded activation maps showing electrical propagation timing and voltage amplitude maps revealing scarred tissue. Abnormal circuits appear as rotating patterns or focal sources on these maps.",
      stats: [
        { val: "3500+", label: "Mapping points per procedure" },
        { val: "0.1mV", label: "Voltage detection threshold" },
        { val: "95%", label: "Success rate for ablation" }
      ],
      examples: [
        "Atrial fibrillation ablation procedures",
        "Ventricular tachycardia substrate mapping",
        "Accessory pathway localization in WPW",
        "Cardiac resynchronization therapy optimization"
      ],
      companies: ["Biosense Webster", "Abbott", "Boston Scientific", "Medtronic", "Acutus Medical"],
      futureImpact: "AI-powered mapping systems will automatically identify arrhythmia mechanisms and suggest optimal ablation targets in real-time. Non-invasive body surface mapping using vest electrodes will enable electric field reconstruction without catheters, making diagnostic mapping accessible in outpatient settings. Digital twin technology will simulate treatment outcomes before procedures, personalizing therapy for each patient's unique cardiac anatomy.",
      color: "#ef4444"
    },
    {
      icon: "🔬",
      title: "Semiconductor Device Design",
      short: "Chip Engineering",
      tagline: "Sculpting electron highways at the nanoscale",
      description: "Semiconductor engineers use electric field mapping to design transistors, memory cells, and integrated circuits at the nanometer scale. Electric fields control how electrons flow through silicon, determining device speed, power consumption, and reliability. TCAD (Technology Computer-Aided Design) software simulates electric field distributions in complex 3D structures, revealing potential problems like field crowding at sharp corners, leakage paths, and breakdown risks. Understanding field patterns is essential for pushing Moore's Law to its physical limits.",
      connection: "Our simulation demonstrates fundamental field behavior that directly applies to semiconductors—how fields concentrate near charges, superpose from multiple sources, and create equipotential surfaces. In a transistor, the gate electrode acts like our charged particles, creating an electric field that controls current flow in the channel. The field patterns around doped regions, interfaces, and electrodes follow the same physics we explore, just at a billion times smaller scale.",
      howItWorks: "TCAD simulators solve Poisson's equation coupled with carrier transport equations to compute electric fields throughout semiconductor structures. Engineers define device geometry, material properties, and doping profiles. The simulator meshes the structure into millions of tiny elements and iteratively solves for electrostatic potential. Electric field vectors are derived from potential gradients. Results reveal peak field locations where oxide breakdown might occur, depletion region shapes affecting capacitance, and channel field profiles influencing mobility. Designers iterate geometries to optimize field distributions for performance and reliability.",
      stats: [
        { val: "3nm", label: "Smallest commercial transistor gate" },
        { val: "10⁸", label: "V/m peak field in modern devices" },
        { val: "100B+", label: "Transistors per chip" }
      ],
      examples: [
        "FinFET transistor channel optimization",
        "DRAM capacitor field enhancement design",
        "Power MOSFET breakdown voltage engineering",
        "Flash memory tunnel oxide field calculations"
      ],
      companies: ["Intel", "TSMC", "Samsung", "Synopsys", "Cadence"],
      futureImpact: "Machine learning will revolutionize device design by predicting optimal geometries from specifications without exhaustive simulation. Sub-1nm transistors will require quantum-accurate field calculations as classical electrostatics breaks down. 3D stacked chips will demand sophisticated thermal-electric co-design as field interactions between vertically adjacent devices become critical. Neuromorphic chips mimicking brain synapses will use precisely engineered field profiles to enable analog in-memory computing.",
      color: "#3b82f6"
    },
    {
      icon: "⚡",
      title: "Lightning Protection Systems",
      short: "Electrical Safety",
      tagline: "Taming nature's most powerful discharge",
      description: "Lightning protection engineers use electric field mapping to design systems that safely intercept and conduct lightning strikes to ground. During thunderstorms, massive charge separation creates electric fields exceeding 10,000 V/m near ground level. Tall structures concentrate these fields at their tips, creating preferential strike attachment points. By understanding field enhancement and propagation, engineers position air terminals, down conductors, and grounding systems to protect buildings, aircraft, wind turbines, and electrical infrastructure from devastating lightning damage.",
      connection: "Our simulation shows how electric fields concentrate around charged objects and how opposite charges create field lines connecting them—exactly what happens during a lightning strike. Storm clouds accumulate negative charge at their base (like our negative charges), inducing positive charge on ground objects (like our positive charges). Field lines stretch between them, and when the field strength exceeds air's breakdown threshold, a lightning channel forms along these field paths. Franklin rods work by concentrating fields to initiate controlled attachment.",
      howItWorks: "Lightning protection design begins with field analysis of the structure under storm conditions. Software models the building geometry and simulates induced surface charges from an approaching stepped leader. Electric field calculations identify high-field points where upward streamers will initiate. The rolling sphere method uses a virtual sphere (typically 46m radius for standard protection) rolling over the structure—any contact points need air terminals. Down conductors provide low-impedance paths sized to handle 200+ kA peak currents. Grounding electrodes dissipate charge into soil while controlling step and touch voltages. Surge protection devices clamp transient fields on electrical systems.",
      stats: [
        { val: "300M", label: "Volts in a typical lightning bolt" },
        { val: "30,000", label: "Amps average peak current" },
        { val: "99.7%", label: "Protection level for Level I systems" }
      ],
      examples: [
        "Skyscraper rooftop lightning rod arrays",
        "Aircraft static discharge wicks and nose cones",
        "Wind turbine blade protection systems",
        "Data center surge protection infrastructure"
      ],
      companies: ["Lightning Master", "ERICO/nVent", "DEHN", "ABB", "Siemens"],
      futureImpact: "Advanced materials like carbon nanotube-enhanced composites will provide lighter, more effective strike attachment points for aircraft and wind turbines. Real-time electric field monitoring networks will predict lightning strikes seconds before they occur, enabling automated protective actions. Smart buildings will dynamically adjust their protection topology based on storm conditions, optimizing both safety and cost. Laser-triggered lightning channels may eventually allow controlled discharge of storm energy for research and protection applications.",
      color: "#f59e0b"
    },
    {
      icon: "📱",
      title: "Touchscreen Technology",
      short: "Capacitive Sensing",
      tagline: "Detecting touch through invisible fields",
      description: "Capacitive touchscreens detect finger position by measuring changes in electric fields across a sensor grid. A transparent electrode array beneath the screen surface creates a carefully mapped electric field pattern. When a conductive object like a finger approaches, it couples with this field, locally changing capacitance at nearby electrodes. By measuring capacitance changes across the entire grid, the controller precisely locates one or more touch points. This technology powers billions of smartphones, tablets, laptops, and interactive displays worldwide.",
      connection: "Our simulation shows how charges create electric fields that extend into surrounding space—capacitive touchscreens exploit this same principle. The screen electrodes create electric field lines that project above the glass surface. Your finger, being conductive, disturbs these field lines when it approaches, much like placing a charge in our simulation changes the overall field pattern. The controller measures these field disturbances as capacitance changes, translating electric field physics into touch coordinates.",
      howItWorks: "Projected capacitive touch (PCT) screens use two layers of transparent ITO (indium tin oxide) electrodes arranged in perpendicular X and Y patterns, separated by thin insulation. The controller rapidly drives one axis while measuring the other, scanning the entire grid hundreds of times per second. Each intersection forms a tiny capacitor. When a finger approaches, its capacitance adds to the intersection capacitance, increasing measured signal strength. Signal processing algorithms calculate touch centroids from the pattern of capacitance changes across multiple electrodes. Mutual capacitance sensing between crossing electrodes enables robust multi-touch detection, while self-capacitance mode provides hover detection.",
      stats: [
        { val: "240Hz", label: "Touch sampling rate" },
        { val: "10+", label: "Simultaneous touch points" },
        { val: "1mm", label: "Touch position accuracy" }
      ],
      examples: [
        "Smartphone and tablet displays",
        "Laptop trackpads and touch bars",
        "Automotive infotainment systems",
        "Interactive kiosks and digital signage"
      ],
      companies: ["Synaptics", "Goodix", "Parade Technologies", "STMicroelectronics", "Cypress"],
      futureImpact: "Under-display fingerprint sensors will use electric field imaging to capture 3D fingerprint details through OLED panels. Force-sensitive touchscreens will combine capacitive sensing with pressure detection for new interaction paradigms. Transparent touchscreens on windows and glasses will enable augmented reality interfaces. Whole-surface touch sensing will transform furniture, walls, and vehicles into interactive interfaces, detecting not just touch location but hand gestures and proximity in 3D space above the surface.",
      color: "#10b981"
    }
  ];

  // Phase Renderers
  function renderHookPhase() {
    const hookContent = [
      {
        title: "The Invisible Force Field",
        text: "Imagine you're a tiny positive charge floating in space. Suddenly, you feel a push or pull - but from where? Something invisible is acting on you. Welcome to the world of electric fields!",
      },
      {
        title: "Mapping the Unseen",
        text: "Scientists discovered they could 'map' these invisible forces by placing test charges and seeing which way they moved. Like mapping wind patterns by watching leaves blow, we can visualize electric fields!",
      },
      {
        title: "Discover Field Lines",
        text: "Today we'll learn to read the invisible map of electric forces - using field lines and vectors to visualize how charges influence the space around them!",
      },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        {/* Premium badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '9999px',
          marginBottom: '32px',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#06b6d4',
            borderRadius: '50%',
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#06b6d4',
            letterSpacing: '0.5px',
          }}>PHYSICS EXPLORATION</span>
        </div>

        {/* Gradient title */}
        <h1 style={{
          fontSize: isMobile ? '32px' : '48px',
          fontWeight: 700,
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #06b6d4 0%, #3B82F6 50%, #10B981 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.2,
        }}>
          {hookContent[hookStep].title}
        </h1>

        {/* Premium card */}
        <div style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '32px',
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}>
          <p style={{
            fontSize: '18px',
            color: '#94a3b8',
            lineHeight: 1.7,
          }}>
            {hookContent[hookStep].text}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
          {hookContent.map((_, i) => (
            <div
              key={i}
              style={{
                height: '8px',
                width: i === hookStep ? '32px' : '8px',
                borderRadius: '9999px',
                background: i === hookStep ? '#06b6d4' : '#334155',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          {hookStep > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); setHookStep(h => h - 1); }}
              style={{
                padding: '12px 24px',
                background: 'rgba(51, 65, 85, 0.5)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                zIndex: 10,
                minHeight: '44px',
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              if (hookStep < hookContent.length - 1) {
                setHookStep(h => h + 1);
              } else {
                goNext();
              }
            }}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3B82F6 100%)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.25)',
              transition: 'all 0.3s ease',
              zIndex: 10,
              minHeight: '44px',
            }}
          >
            {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
          </button>
        </div>
      </div>
    );
  }

  // Static predict phase SVG showing a charge without field lines
  function renderPredictSVG() {
    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxHeight: 200, marginBottom: premiumDesign.spacing.lg }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="efmPredictCharge" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
          <radialGradient id="efmPredictGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g id="background-layer">
          <rect width="300" height="200" fill="#0f172a" rx="12" />
          <rect x="10" y="10" width="280" height="180" fill="none" stroke="#1e293b" strokeWidth="1" rx="8" />
        </g>
        <g id="charge-layer">
          {/* Central positive charge */}
          <circle cx="150" cy="100" r="35" fill="url(#efmPredictGlow)" />
          <circle cx="150" cy="100" r="22" fill="url(#efmPredictCharge)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <text x="150" y="108" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">+</text>
          <text x="150" y="140" textAnchor="middle" fill="#e2e8f0" fontSize="12">Positive Charge</text>
        </g>
        <g id="question-layer">
          {/* Question marks around the charge */}
          <text x="80" y="70" fill="#94a3b8" fontSize="18" fontWeight="bold">?</text>
          <text x="220" y="70" fill="#94a3b8" fontSize="18" fontWeight="bold">?</text>
          <text x="80" y="140" fill="#94a3b8" fontSize="18" fontWeight="bold">?</text>
          <text x="220" y="140" fill="#94a3b8" fontSize="18" fontWeight="bold">?</text>
        </g>
        <g id="label-layer">
          <text x="150" y="185" textAnchor="middle" fill="#64748b" fontSize="11">Which direction do field lines point?</text>
        </g>
      </svg>
    );
  }

  // Static twist predict phase SVG showing dipole setup
  function renderTwistPredictSVG() {
    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxHeight: 200, marginBottom: premiumDesign.spacing.lg }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="efmTwistPosCharge" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
          <radialGradient id="efmTwistNegCharge" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
        </defs>
        <g id="twist-background">
          <rect width="300" height="200" fill="#0f172a" rx="12" />
          <rect x="10" y="10" width="280" height="180" fill="none" stroke="#1e293b" strokeWidth="1" rx="8" />
        </g>
        <g id="twist-charges">
          {/* Positive charge */}
          <circle cx="100" cy="100" r="20" fill="url(#efmTwistPosCharge)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <text x="100" y="107" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">+</text>
          <text x="100" y="135" textAnchor="middle" fill="#e2e8f0" fontSize="11">Positive</text>
          {/* Negative charge */}
          <circle cx="200" cy="100" r="20" fill="url(#efmTwistNegCharge)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <text x="200" y="107" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">-</text>
          <text x="200" y="135" textAnchor="middle" fill="#e2e8f0" fontSize="11">Negative</text>
        </g>
        <g id="twist-labels">
          <text x="150" y="50" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="500">Electric Dipole</text>
          <text x="150" y="185" textAnchor="middle" fill="#64748b" fontSize="11">What happens to field lines between opposite charges?</text>
        </g>
      </svg>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'away', text: "Field lines point away from positive charges, toward negative" },
      { id: 'toward', text: "Field lines point toward positive charges, away from negative" },
      { id: 'circles', text: "Field lines form circles around all charges" },
      { id: 'random', text: "Field lines point randomly in all directions" },
    ];

    const selectedCount = prediction ? 1 : 0;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            Which way do electric field lines point around charges?
          </p>
          {/* Progress indicator for predict phase */}
          <div style={{
            marginTop: premiumDesign.spacing.md,
            padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: premiumDesign.radius.md,
            display: 'inline-block',
          }}>
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
              Progress: {selectedCount}/1 prediction made
            </span>
          </div>
        </div>

        {/* Static SVG for predict phase */}
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          {renderPredictSVG()}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === p.id
                  ? `2px solid ${premiumDesign.colors.success}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(16, 185, 129, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
                minHeight: '48px',
              }}
              onClick={(e) => {
                e.preventDefault();
                setPrediction(p.id);
              }}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('hook') },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Electric Field Mapper
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Add charges and visualize the electric field around them
          </p>
          {/* Observation guidance text */}
          <div style={{
            marginTop: premiumDesign.spacing.md,
            padding: premiumDesign.spacing.md,
            background: 'rgba(34, 211, 238, 0.1)',
            borderRadius: premiumDesign.radius.md,
            border: '1px solid rgba(34, 211, 238, 0.3)',
          }}>
            <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
              <strong>Observe:</strong> Watch how field lines radiate from positive charges and converge toward negative charges. Notice how line density indicates field strength.
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Field Visualization */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {renderFieldVisualizationWithLabels(charges, fieldVectors, fieldLines, showVectors, showFieldLines, fieldStrength)}
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Add Charges
              </h4>
              <div style={{ display: 'flex', gap: premiumDesign.spacing.sm }}>
                <button
                  style={{
                    flex: 1,
                    padding: premiumDesign.spacing.md,
                    borderRadius: premiumDesign.radius.md,
                    border: 'none',
                    background: premiumDesign.colors.positive,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    addCharge(1);
                  }}
                >
                  + Positive
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: premiumDesign.spacing.md,
                    borderRadius: premiumDesign.radius.md,
                    border: 'none',
                    background: premiumDesign.colors.negative,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    addCharge(-1);
                  }}
                >
                  - Negative
                </button>
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Visualization Options
              </h4>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                marginBottom: premiumDesign.spacing.sm,
              }}>
                <input
                  type="checkbox"
                  checked={showFieldLines}
                  onChange={(e) => setShowFieldLines(e.target.checked)}
                  style={{ accentColor: premiumDesign.colors.success }}
                />
                Show field lines
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(e) => setShowVectors(e.target.checked)}
                  style={{ accentColor: premiumDesign.colors.success }}
                />
                Show field vectors
              </label>
            </div>

            {/* Field Strength Slider */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Field Intensity / Force Amplitude: {fieldStrength}%
              </h4>
              <input
                type="range"
                min="10"
                max="100"
                value={fieldStrength}
                onChange={(e) => setFieldStrength(Number(e.target.value))}
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: premiumDesign.colors.success }}
                aria-label="Field force amplitude"
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: premiumDesign.colors.text.muted,
                marginTop: premiumDesign.spacing.xs,
              }}>
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                zIndex: 10,
                minHeight: '44px',
              }}
              onClick={(e) => {
                e.preventDefault();
                setCharges([{ id: 0, x: 150, y: 150, q: 1 }]);
              }}
            >
              Reset to Single Charge
            </button>

            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                Field lines point AWAY from + charges, TOWARD - charges. Closer lines = stronger field!
              </p>
            </div>

            {/* Real-world relevance */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginTop: premiumDesign.spacing.md,
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '13px', margin: 0, fontWeight: 600 }}>
                Real-World Application:
              </p>
              <p style={{ color: '#e2e8f0', fontSize: '13px', margin: `${premiumDesign.spacing.xs}px 0 0` }}>
                Electric field mapping is used in medical devices like cardiac defibrillators, touchscreen technology, and particle accelerators at CERN to control charged particles.
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const reviewContent = [
      {
        title: "Field Direction Convention",
        content: prediction === 'away'
          ? "As you predicted, your observation was correct! Electric field lines point in the direction a positive test charge would move. Since positive charges repel other positive charges, lines point AWAY from positive charges. Since positive is attracted to negative, lines point TOWARD negative charges. The key equation is E = kq/r², showing the force relationship."
          : "Your prediction has been tested by experiment. The observation shows that electric field lines point in the direction a positive test charge would move. Since positive charges repel other positive charges, lines point AWAY from positive charges. Since positive is attracted to negative, lines point TOWARD negative charges. The key equation is E = kq/r², showing the force relationship.",
        formula: "E = kq/r² (Coulomb's Law for field strength)",
      },
      {
        title: "Field Strength from Line Density",
        content: "The density of field lines indicates field strength. Where lines are bunched together (close to charges), the field is strong. Where lines spread apart (far from charges), the field is weak. This demonstrates the inverse square relationship.",
        formula: "E = kq/r² (inverse square law)",
      },
      {
        title: "Field Lines Never Cross",
        content: "Electric field lines NEVER cross each other. At any point in space, the electric field has only one direction. If lines crossed, there would be two directions at that point - which is impossible! This is a fundamental principle of the field equation.",
        formula: "F = qE (force on a charge in a field)",
      },
      {
        title: "Your Prediction Result",
        content: prediction === 'away'
          ? "Excellent! You correctly predicted that field lines point away from positive charges and toward negative charges. Your prediction matches the experimental observation."
          : "The correct answer is that field lines point AWAY from positive charges and TOWARD negative charges. This follows from the convention of how a positive test charge would move. Compare your prediction with the observation to deepen your understanding.",
        formula: "Convention: Follow where + would go",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            Understanding Electric Fields
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.success,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {reviewContent[reviewStep].content}
          </p>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.success,
            textAlign: 'center',
          }}>
            {reviewContent[reviewStep].formula}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {reviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === reviewStep
                    ? premiumDesign.colors.success
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setReviewStep(i);
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('play') },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Try a Twist →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                setReviewStep(r => r + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const twistPredictions = [
      { id: 'connect', text: "Field lines will connect from positive to negative charge" },
      { id: 'cancel', text: "Fields will completely cancel between the charges" },
      { id: 'separate', text: "Each charge will have separate, non-interacting field lines" },
      { id: 'repel', text: "Field lines will repel each other and curve away" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            The Twist: Electric Dipole
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens to field lines when you place a positive and negative charge near each other?
          </p>
        </div>

        {/* Static SVG for twist predict phase */}
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          {renderTwistPredictSVG()}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === p.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === p.id
                  ? 'rgba(139, 92, 246, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
                minHeight: '48px',
              }}
              onClick={(e) => {
                e.preventDefault();
                setTwistPrediction(p.id);
              }}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Electric Dipole Field
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Observe how field lines connect between opposite charges
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Dipole Visualization */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {renderFieldVisualizationWithLabels(dipoleCharges, dipoleVectors, dipoleFieldLines, true, true)}
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Charge Separation: {separation}px
              </h4>
              <input
                type="range"
                min="40"
                max="160"
                value={separation}
                onChange={(e) => setSeparation(Number(e.target.value))}
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: premiumDesign.colors.secondary }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: premiumDesign.colors.text.muted,
                marginTop: premiumDesign.spacing.xs,
              }}>
                <span>Close</span>
                <span>Far</span>
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm }}>
                Dipole Properties
              </h4>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                Notice how field lines start at the positive charge (+) and end at the negative charge (-), creating a connected pattern.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                This is an electric dipole - like in water molecules! The field pattern is essential for understanding molecular interactions.
              </p>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Dipole Moment
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: '18px', fontFamily: 'monospace' }}>
                p = q x d
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const twistReviewContent = [
      {
        title: "Field Lines Connect Opposite Charges",
        content: "When opposite charges are near each other, field lines start at the positive charge and curve through space to end at the negative charge. This creates the characteristic dipole field pattern.",
        highlight: twistPrediction === 'connect'
          ? "You correctly predicted that field lines connect from positive to negative!"
          : "The correct answer was that field lines connect from positive to negative charge, following the direction a positive test charge would move.",
      },
      {
        title: "The Dipole Field Pattern",
        content: "Electric dipoles (pairs of opposite charges) create a distinctive field pattern that's crucial in chemistry and biology. Water molecules are dipoles, and their fields enable hydrogen bonding!",
      },
      {
        title: "Superposition of Fields",
        content: "The total field at any point is the vector sum of fields from all charges (superposition). Between a + and - charge, fields add to create strong connecting lines. Beyond the dipole, fields partially cancel.",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            Dipole Analysis
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.secondary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: twistPrediction === 'connect'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'connect' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'connect' ? premiumDesign.colors.success : '#EF4444',
                margin: 0
              }}>
                {twistReviewContent[twistReviewStep].highlight}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === twistReviewStep
                    ? premiumDesign.colors.secondary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setTwistReviewStep(i);
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_play') },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                setTwistReviewStep(t => t + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTransferPhase() {
    const applications = [
      {
        title: "Capacitors and Energy Storage",
        description: "Capacitors store energy in the electric field between parallel plates. Understanding field patterns helps engineers design capacitors with uniform fields for maximum energy storage. In modern electronics, capacitors are found in smartphones, laptops, electric vehicles, and power grid stabilization systems. Engineers use field mapping to optimize plate geometry, dielectric materials, and spacing for maximum capacitance density while preventing dielectric breakdown.",
        fact: "The energy stored is proportional to E² - doubling the field gives 4x energy. A typical smartphone capacitor operates at 3W while industrial ones handle 500W or more.",
      },
      {
        title: "Lightning Rods and Safety",
        description: "Lightning rods work because electric fields concentrate at sharp points. The intense field at the rod's tip ionizes air, creating a corona discharge that provides a path for lightning to safely discharge to ground instead of striking buildings. Field mapping helps engineers position rods optimally on structures, accounting for building geometry, height, and surrounding terrain to create comprehensive protection zones.",
        fact: "Benjamin Franklin invented the lightning rod in 1752. Modern systems must handle 200000W peak power and protect structures within 46 m radius.",
      },
      {
        title: "CRT Displays and Electron Beams",
        description: "Cathode ray tube (CRT) TVs and monitors used precisely controlled electric fields to steer electron beams and draw images on screen. Deflection plates created variable electric fields that bent the electron beam to different positions, painting pictures pixel by pixel, line by line. The precision of field control determined image sharpness and color accuracy in these displays.",
        fact: "A CRT TV drew 15000 lines per second at 30% the speed of light. Deflection plates used 25000W of power and controlled beams across 50 m of effective path length.",
      },
      {
        title: "Particle Accelerators",
        description: "Particle accelerators like the Large Hadron Collider use carefully shaped electric fields to accelerate charged particles to near light speed. Field mapping is crucial for controlling these incredibly precise machines. Radio-frequency cavities generate oscillating electric fields that push particles faster with each revolution, while superconducting magnets steer beams along curved paths with extraordinary precision.",
        fact: "The LHC beam travels at 99% light speed, completing 11245 laps per second. Peak collision energy reaches 13 TB equivalent, with 600W of beam power per bunch.",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Electric Fields in Action
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Electric field mapping is used across many industries and real-world applications. Explore how the same physics principles you just learned are applied by engineers, scientists, and doctors to solve important problems in technology, safety, and medicine.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.sm,
          marginBottom: premiumDesign.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {applications.map((app, index) => (
            <button
              key={index}
              style={{
                padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
                borderRadius: premiumDesign.radius.full,
                border: activeApp === index
                  ? `2px solid ${premiumDesign.colors.success}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(16, 185, 129, 0.2)'
                  : completedApps.has(index)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                zIndex: 10,
                minHeight: '44px',
              }}
              onClick={(e) => {
                e.preventDefault();
                setActiveApp(index);
              }}
            >
              {completedApps.has(index) && '✓ '}{app.title}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {applications[activeApp].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {applications[activeApp].description}
          </p>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.success, fontWeight: 600 }}>
              Fun Fact
            </p>
            <p style={{ margin: `${premiumDesign.spacing.sm}px 0 0`, color: premiumDesign.colors.text.secondary }}>
              {applications[activeApp].fact}
            </p>
          </div>

          {!completedApps.has(activeApp) ? (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 10,
                minHeight: '44px',
              }}
              onClick={(e) => {
                e.preventDefault();
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                if (activeApp < applications.length - 1) {
                  setActiveApp(activeApp + 1);
                }
              }}
            >
              Got It
            </button>
          ) : (
            activeApp < applications.length - 1 && (
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: premiumDesign.spacing.lg,
                  padding: premiumDesign.spacing.md,
                  borderRadius: premiumDesign.radius.md,
                  border: 'none',
                  background: premiumDesign.colors.gradient.secondary,
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  zIndex: 10,
                  minHeight: '44px',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveApp(activeApp + 1);
                }}
              >
                Next Application →
              </button>
            )
          )}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: premiumDesign.spacing.lg,
          color: premiumDesign.colors.text.muted,
        }}>
          {completedApps.size} of {applications.length} applications explored
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          {
            text: 'Next →',
            onClick: goNext,
          }
        )}
      </div>
    );
  }

  function renderTestPhase() {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: premiumDesign.spacing.lg }}>
              {passed ? '🎉' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 700,
              color: premiumDesign.colors.text.primary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {passed ? 'Excellent Work!' : 'Test Complete!'}
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              background: passed ? premiumDesign.colors.gradient.field : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: premiumDesign.spacing.md,
            }}>
              {testScore}/{testQuestions.length}
            </div>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '18px',
              marginBottom: premiumDesign.spacing.xl,
            }}>
              {passed
                ? `You scored ${testScore}/${testQuestions.length} - you have mastered electric field mapping!`
                : `You scored ${testScore}/${testQuestions.length}. Review the material and try again.`}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  goNext();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('review');
                }
              },
              passed ? 'success' : 'primary'
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: premiumDesign.colors.text.muted }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ color: premiumDesign.colors.success, fontWeight: 600 }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          {/* Scenario context */}
          <p style={{
            color: premiumDesign.colors.text.muted,
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: premiumDesign.spacing.md,
            fontStyle: 'italic',
          }}>
            {question.scenario}
          </p>

          <h3 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {question.options.map((option, index) => {
              let borderColor = 'rgba(255,255,255,0.1)';
              let bg = premiumDesign.colors.background.tertiary;

              if (showExplanation) {
                if (option.correct) {
                  bg = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  bg = 'rgba(239, 68, 68, 0.2)';
                  borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                borderColor = premiumDesign.colors.success;
                bg = 'rgba(16, 185, 129, 0.2)';
              }

              const buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor,
                background: bg,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
                minHeight: '48px',
              };

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                  disabled={showExplanation}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: premiumDesign.spacing.xl,
              padding: premiumDesign.spacing.lg,
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.success, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                Explanation:
              </p>
              <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: premiumDesign.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
          {!showExplanation ? (
            renderButton(
              'Check Answer',
              () => {
                setShowExplanation(true);
                if (question.options[selectedAnswer as number]?.correct) {
                  setTestScore(s => s + 1);
                }
              },
              'primary',
              selectedAnswer === null
            )
          ) : (
            renderButton(
              currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results',
              () => {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
              },
              'primary'
            )
          )}
        </div>
      </div>
    );
  }

  function renderMasteryPhase() {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: premiumDesign.spacing.xl,
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          🏆
        </div>

        <h1 style={{
          fontSize: isMobile ? '32px' : '42px',
          fontWeight: 700,
          background: premiumDesign.colors.gradient.field,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Field Mapping Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You can now read the invisible map of electric forces! You understand how field lines reveal the direction and strength of electric fields around charges.
        </p>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 500,
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          <h3 style={{ color: premiumDesign.colors.success, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Field lines: away from +, toward -</li>
            <li>Line density indicates field strength</li>
            <li>Field lines never cross</li>
            <li>Dipoles: + and - create connected field patterns</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {renderButton('← Review Again', () => goToPhase('hook'), 'secondary')}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: premiumDesign.typography.fontFamily,
    }}>
      {/* Premium background effects */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '25%',
        width: '100%',
        maxWidth: '384px',
        height: '384px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(48px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: '25%',
        width: '100%',
        maxWidth: '384px',
        height: '384px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(48px)',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '33%',
        width: '100%',
        maxWidth: '384px',
        height: '384px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(48px)',
      }} />

      {/* Navigation Bar - fixed position top with z-index */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
        aria-label="Phase navigation"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          maxWidth: '1024px',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Electric Field Mapping</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                aria-label={phaseLabels[p]}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title={phaseLabels[p]}
              >
                <span style={{
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  background: phase === p
                    ? '#22d3ee'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? '#10b981'
                      : '#334155',
                  display: 'block',
                }} />
              </button>
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#22d3ee' }}>{phaseLabels[phase]}</span>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px', flex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? premiumDesign.spacing.md : premiumDesign.spacing.xl }}>
          {phase === 'hook' && renderHookPhase()}
          {phase === 'predict' && renderPredictPhase()}
          {phase === 'play' && renderPlayPhase()}
          {phase === 'review' && renderReviewPhase()}
          {phase === 'twist_predict' && renderTwistPredictPhase()}
          {phase === 'twist_play' && renderTwistPlayPhase()}
          {phase === 'twist_review' && renderTwistReviewPhase()}
          {phase === 'transfer' && (
            <TransferPhaseView
              conceptName="Electric Field Mapping"
              applications={realWorldApps}
              onComplete={() => goToPhase('test')}
              isMobile={isMobile}
              colors={colors}
              typo={typo}
              playSound={playSound}
            />
          )}
          {phase === 'test' && renderTestPhase()}
          {phase === 'mastery' && renderMasteryPhase()}
        </div>
      </div>
    </div>
  );
}
