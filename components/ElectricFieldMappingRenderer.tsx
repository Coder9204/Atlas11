'use client';

import React, { useState, useEffect, useCallback } from 'react';

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
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
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
  const [isMobile, setIsMobile] = useState(false);

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

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "Electric field lines always point:",
      options: [
        { text: "Toward positive charges", correct: false },
        { text: "Away from positive charges", correct: true },
        { text: "In circles around charges", correct: false },
        { text: "Randomly in all directions", correct: false }
      ],
      explanation: "Electric field lines point AWAY from positive charges and TOWARD negative charges. The field shows the direction a positive test charge would move."
    },
    {
      question: "What does the density of field lines indicate?",
      options: [
        { text: "The charge's color", correct: false },
        { text: "The field strength", correct: true },
        { text: "The temperature", correct: false },
        { text: "The magnetic field", correct: false }
      ],
      explanation: "Where field lines are closer together (denser), the electric field is stronger. Sparse lines indicate a weaker field."
    },
    {
      question: "Can electric field lines ever cross each other?",
      options: [
        { text: "Yes, at high voltages", correct: false },
        { text: "Yes, between like charges", correct: false },
        { text: "No, never", correct: true },
        { text: "Only in magnetic fields", correct: false }
      ],
      explanation: "Electric field lines NEVER cross because at any point in space, the field can only point in one direction. Crossing would mean two directions at once!"
    },
    {
      question: "What is the formula for electric field strength from a point charge?",
      options: [
        { text: "E = kq/r", correct: false },
        { text: "E = kq/r²", correct: true },
        { text: "E = kq²/r", correct: false },
        { text: "E = kr/q", correct: false }
      ],
      explanation: "The electric field E = kq/r², where k is Coulomb's constant, q is the charge, and r is the distance from the charge."
    },
    {
      question: "In a uniform electric field (like between parallel plates), the field lines are:",
      options: [
        { text: "Curved", correct: false },
        { text: "Parallel and equally spaced", correct: true },
        { text: "Radiating outward", correct: false },
        { text: "Converging inward", correct: false }
      ],
      explanation: "A uniform field has parallel, equally-spaced field lines. This occurs between parallel charged plates (like in a capacitor)."
    },
    {
      question: "The electric field is a vector quantity, meaning it has:",
      options: [
        { text: "Only magnitude", correct: false },
        { text: "Only direction", correct: false },
        { text: "Both magnitude and direction", correct: true },
        { text: "Neither magnitude nor direction", correct: false }
      ],
      explanation: "The electric field is a vector - it has both magnitude (strength) and direction (the way it points at each location)."
    },
    {
      question: "What happens to the electric field strength when you double the distance from a charge?",
      options: [
        { text: "It doubles", correct: false },
        { text: "It halves", correct: false },
        { text: "It becomes 1/4 as strong", correct: true },
        { text: "It stays the same", correct: false }
      ],
      explanation: "Since E ∝ 1/r², doubling the distance reduces the field to (1/2)² = 1/4 of its original strength."
    },
    {
      question: "An electric dipole consists of:",
      options: [
        { text: "Two positive charges", correct: false },
        { text: "Two negative charges", correct: false },
        { text: "One positive and one negative charge", correct: true },
        { text: "A single neutral particle", correct: false }
      ],
      explanation: "A dipole consists of equal and opposite charges (one positive, one negative) separated by a distance, like the two poles of a magnet."
    },
    {
      question: "Where is the electric field strongest near a point charge?",
      options: [
        { text: "Far away from the charge", correct: false },
        { text: "Close to the charge", correct: true },
        { text: "At infinity", correct: false },
        { text: "Exactly at the center", correct: false }
      ],
      explanation: "The field is strongest closest to the charge (E = kq/r²). As you move away, the field weakens rapidly."
    },
    {
      question: "Electric field lines around a positive charge:",
      options: [
        { text: "Form closed loops", correct: false },
        { text: "Point inward toward the charge", correct: false },
        { text: "Radiate outward from the charge", correct: true },
        { text: "Are parallel to each other", correct: false }
      ],
      explanation: "Field lines radiate outward from positive charges (like rays from the sun) because positive test charges would be pushed away."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  // Render field visualization
  function renderFieldVisualization(
    chargeList: Charge[],
    vectors: FieldVector[],
    lines: { x: number; y: number }[][],
    showVec: boolean,
    showLines: boolean
  ) {
    return (
      <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
        {/* Background */}
        <rect x="20" y="20" width="260" height="260" fill="rgba(16, 185, 129, 0.05)" rx="8" />
        <rect x="20" y="20" width="260" height="260" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="2" rx="8" />

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="fieldArrow"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
          </marker>
          <marker
            id="lineArrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="#06B6D4" />
          </marker>
        </defs>

        {/* Field lines */}
        {showLines && lines.map((line, i) => (
          <polyline
            key={`line-${i}`}
            points={line.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#06B6D4"
            strokeWidth="1.5"
            strokeOpacity="0.7"
            markerMid="url(#lineArrow)"
          />
        ))}

        {/* Field vectors */}
        {showVec && vectors.map((v, i) => {
          const maxLen = 15;
          const scale = Math.min(maxLen, v.magnitude * 0.1);
          const mag = Math.sqrt(v.ex * v.ex + v.ey * v.ey);
          if (mag < 0.01) return null;

          const endX = v.x + (v.ex / mag) * scale;
          const endY = v.y + (v.ey / mag) * scale;

          return (
            <line
              key={`vec-${i}`}
              x1={v.x}
              y1={v.y}
              x2={endX}
              y2={endY}
              stroke="#10B981"
              strokeWidth="1.5"
              markerEnd="url(#fieldArrow)"
              opacity={Math.min(1, v.magnitude * 0.02)}
            />
          );
        })}

        {/* Charges */}
        {chargeList.map(charge => (
          <g key={charge.id}>
            {/* Glow */}
            <circle
              cx={charge.x}
              cy={charge.y}
              r="22"
              fill={charge.q > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}
            />
            {/* Main circle */}
            <circle
              cx={charge.x}
              cy={charge.y}
              r="15"
              fill={charge.q > 0 ? premiumDesign.colors.positive : premiumDesign.colors.negative}
              stroke="white"
              strokeWidth="2"
            />
            {/* Sign */}
            <text
              x={charge.x}
              y={charge.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="bold"
            >
              {charge.q > 0 ? '+' : '−'}
            </text>
          </g>
        ))}
      </svg>
    );
  }

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
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Gradient title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
          {hookContent[hookStep].title}
        </h1>

        {/* Premium card */}
        <div className="max-w-2xl mx-auto p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl">
          <p className="text-lg text-slate-300 leading-relaxed">
            {hookContent[hookStep].text}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mt-8">
          {hookContent.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === hookStep ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-8">
          {hookStep > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); setHookStep(h => h - 1); }}
              className="px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl font-medium transition-all"
              style={{ zIndex: 10 }}
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
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
          </button>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'away', text: "Field lines point away from positive charges, toward negative" },
      { id: 'toward', text: "Field lines point toward positive charges, away from negative" },
      { id: 'circles', text: "Field lines form circles around all charges" },
      { id: 'random', text: "Field lines point randomly in all directions" },
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
            Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            Which way do electric field lines point around charges?
          </p>
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
            {renderFieldVisualization(charges, fieldVectors, fieldLines, showVectors, showFieldLines)}
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

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                zIndex: 10,
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
        content: "Electric field lines point in the direction a positive test charge would move. Since positive charges repel other positive charges, lines point AWAY from positive charges. Since positive is attracted to negative, lines point TOWARD negative charges.",
        formula: "E points: + -> away, - -> toward",
      },
      {
        title: "Field Strength from Line Density",
        content: "The density of field lines indicates field strength. Where lines are bunched together (close to charges), the field is strong. Where lines spread apart (far from charges), the field is weak.",
        formula: "E = kq/r² (inverse square law)",
      },
      {
        title: "Field Lines Never Cross",
        content: "Electric field lines NEVER cross each other. At any point in space, the electric field has only one direction. If lines crossed, there would be two directions at that point - which is impossible!",
        formula: "One point -> One direction -> No crossing",
      },
      {
        title: "Your Prediction",
        content: prediction === 'away'
          ? "Excellent! You correctly predicted that field lines point away from positive charges and toward negative charges."
          : "The correct answer is that field lines point AWAY from positive charges and TOWARD negative charges. This follows from the convention of how a positive test charge would move.",
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
            {renderFieldVisualization(dipoleCharges, dipoleVectors, dipoleFieldLines, true, true)}
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
                style={{ width: '100%', accentColor: premiumDesign.colors.secondary }}
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
        title: "Capacitors",
        description: "Capacitors store energy in the electric field between parallel plates. Understanding field patterns helps engineers design capacitors with uniform fields for maximum energy storage in devices from phones to electric cars.",
        fact: "The energy stored in a capacitor is proportional to E squared - doubling the field quadruples the stored energy!",
      },
      {
        title: "Lightning Rods",
        description: "Lightning rods work because electric fields concentrate at sharp points. The intense field at the rod's tip ionizes air, creating a path for lightning to safely discharge to ground instead of striking buildings.",
        fact: "Benjamin Franklin invented the lightning rod in 1752 after his famous (and dangerous!) kite experiment.",
      },
      {
        title: "Old CRT Displays",
        description: "Cathode ray tube (CRT) TVs and monitors used electric fields to steer electron beams and draw images on screen. Changing the field deflected electrons to different positions, painting pictures line by line.",
        fact: "A CRT TV could draw 15,000+ horizontal lines per second, creating smooth motion video!",
      },
      {
        title: "Particle Accelerators",
        description: "Particle accelerators like the Large Hadron Collider use carefully shaped electric fields to accelerate charged particles to near light speed. Field mapping is crucial for controlling these incredibly precise machines.",
        fact: "The LHC's beam travels at 99.9999991% the speed of light - if it were a train, it could circle Earth 7.5 times per second!",
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
            Explore all {applications.length} applications to unlock the quiz
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
              Mark as Read
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
            text: completedApps.size === applications.length ? 'Take the Quiz →' : `Explore ${applications.length - completedApps.size} More →`,
            onClick: goNext,
            disabled: completedApps.size < applications.length,
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
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
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
                ? 'You have mastered electric field mapping!'
                : 'Review the material and try again.'}
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
              let buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: '2px solid rgba(255,255,255,0.1)',
                background: premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              };

              if (showExplanation) {
                if (option.correct) {
                  buttonStyle.background = 'rgba(16, 185, 129, 0.2)';
                  buttonStyle.borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
                  buttonStyle.borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                buttonStyle.borderColor = premiumDesign.colors.success;
                buttonStyle.background = 'rgba(16, 185, 129, 0.2)';
              }

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
                  {option.text}
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Electric Field Mapping</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? premiumDesign.spacing.md : premiumDesign.spacing.xl }}>
          {phase === 'hook' && renderHookPhase()}
          {phase === 'predict' && renderPredictPhase()}
          {phase === 'play' && renderPlayPhase()}
          {phase === 'review' && renderReviewPhase()}
          {phase === 'twist_predict' && renderTwistPredictPhase()}
          {phase === 'twist_play' && renderTwistPlayPhase()}
          {phase === 'twist_review' && renderTwistReviewPhase()}
          {phase === 'transfer' && renderTransferPhase()}
          {phase === 'test' && renderTestPhase()}
          {phase === 'mastery' && renderMasteryPhase()}
        </div>
      </div>
    </div>
  );
}
