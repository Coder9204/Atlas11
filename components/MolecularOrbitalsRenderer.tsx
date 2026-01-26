'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// MOLECULAR ORBITALS - 3D Interactive Simulation
// Built with Three.js + React Three Fiber
// Follows GAME_TEST_SPECIFICATION.md
// ============================================================================

// GameEvent interface - matches spec
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed' | 'question_changed' | 'app_completed' | 'app_changed';
  gameType: string;
  gameTitle: string;
  details: {
    phase?: string;
    phaseLabel?: string;
    currentScreen?: number;
    totalScreens?: number;
    screenDescription?: string;
    prediction?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

interface MolecularOrbitalsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
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
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
};

// ============================================================================
// 3D ORBITAL COMPONENTS
// ============================================================================

// S Orbital - Spherical probability cloud
const SOrbital: React.FC<{ color?: string; opacity?: number; size?: number }> = ({
  color = '#3b82f6',
  opacity = 0.6,
  size = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(size * scale);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.1}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
};

// P Orbital - Dumbbell shape (two lobes)
const POrbital: React.FC<{
  axis: 'x' | 'y' | 'z';
  color?: string;
  opacity?: number;
  size?: number;
}> = ({ axis, color = '#ef4444', opacity = 0.6, size = 1 }) => {
  const groupRef = useRef<THREE.Group>(null);

  const rotation = useMemo(() => {
    switch (axis) {
      case 'x': return [0, 0, Math.PI / 2];
      case 'y': return [0, 0, 0];
      case 'z': return [Math.PI / 2, 0, 0];
      default: return [0, 0, 0];
    }
  }, [axis]);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const lobeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Create teardrop/lobe shape
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.8, 0.5, 0.8, 1.5, 0, 2);
    shape.bezierCurveTo(-0.8, 1.5, -0.8, 0.5, 0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 0.01,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 0.4,
      bevelSegments: 32
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group ref={groupRef} rotation={rotation as [number, number, number]} scale={size}>
      {/* Positive lobe */}
      <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.2}
          clearcoat={0.5}
        />
      </mesh>
      {/* Negative lobe */}
      <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity * 0.7}
          roughness={0.2}
          clearcoat={0.5}
        />
      </mesh>
      {/* Node at center */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
    </group>
  );
};

// D Orbital - Cloverleaf pattern
const DOrbital: React.FC<{
  type: 'xy' | 'xz' | 'yz' | 'x2y2' | 'z2';
  color?: string;
  opacity?: number;
  size?: number;
}> = ({ type, color = '#8b5cf6', opacity = 0.5, size = 1 }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  const renderLobes = () => {
    const lobes = [];
    const positions = type === 'z2'
      ? [[0, 1.2, 0], [0, -1.2, 0]]
      : [[0.8, 0, 0.8], [-0.8, 0, -0.8], [0.8, 0, -0.8], [-0.8, 0, 0.8]];

    positions.forEach((pos, i) => {
      lobes.push(
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={opacity}
            roughness={0.2}
            clearcoat={0.5}
          />
        </mesh>
      );
    });

    // Add torus for z2 orbital
    if (type === 'z2') {
      lobes.push(
        <mesh key="torus" rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.2, 16, 32]} />
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={opacity * 0.5}
            roughness={0.2}
          />
        </mesh>
      );
    }

    return lobes;
  };

  return (
    <group ref={groupRef} scale={size}>
      {renderLobes()}
      {/* Central nucleus indicator */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
};

// Nucleus visualization
const Nucleus: React.FC<{ protons: number; neutrons: number }> = ({ protons, neutrons }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const particles = useMemo(() => {
    const result = [];
    const total = Math.min(protons + neutrons, 20); // Cap for performance

    for (let i = 0; i < total; i++) {
      const isProton = i < protons;
      const theta = (i / total) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * (i + 0.5) / total);
      const r = 0.15;

      result.push({
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ] as [number, number, number],
        color: isProton ? '#ef4444' : '#64748b',
        key: i
      });
    }
    return result;
  }, [protons, neutrons]);

  return (
    <group ref={groupRef}>
      {particles.map(p => (
        <mesh key={p.key} position={p.position}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={p.color} />
        </mesh>
      ))}
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// Axis labels
const AxisLabels: React.FC = () => {
  return (
    <group>
      <Text position={[2.5, 0, 0]} fontSize={0.3} color="#ef4444">X</Text>
      <Text position={[0, 2.5, 0]} fontSize={0.3} color="#22c55e">Y</Text>
      <Text position={[0, 0, 2.5]} fontSize={0.3} color="#3b82f6">Z</Text>

      {/* Axis lines */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-2, 0, 0, 2, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" opacity={0.5} transparent />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, -2, 0, 0, 2, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" opacity={0.5} transparent />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, -2, 0, 0, 2])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" opacity={0.5} transparent />
      </line>
    </group>
  );
};

// Interactive 3D Scene
const OrbitalScene: React.FC<{
  orbitalType: 's' | 'p' | 'd';
  showNucleus: boolean;
  showAxes: boolean;
  pAxis?: 'x' | 'y' | 'z';
  dType?: 'xy' | 'xz' | 'yz' | 'x2y2' | 'z2';
  element: { symbol: string; protons: number; neutrons: number };
}> = ({ orbitalType, showNucleus, showAxes, pAxis = 'z', dType = 'xy', element }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Nucleus */}
      {showNucleus && <Nucleus protons={element.protons} neutrons={element.neutrons} />}

      {/* Orbitals */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
        {orbitalType === 's' && <SOrbital color="#3b82f6" size={1.5} />}
        {orbitalType === 'p' && <POrbital axis={pAxis} color="#ef4444" size={1.2} />}
        {orbitalType === 'd' && <DOrbital type={dType} color="#8b5cf6" size={1.2} />}
      </Float>

      {/* Axes */}
      {showAxes && <AxisLabels />}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
};

// ============================================================================
// MAIN RENDERER COMPONENT
// ============================================================================

const MolecularOrbitalsRenderer: React.FC<MolecularOrbitalsRendererProps> = ({ onGameEvent }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Explore Orbitals',
    review: 'Understanding',
    twist_predict: 'New Challenge',
    twist_play: 'Hybridization',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // State
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // 3D Visualization state
  const [orbitalType, setOrbitalType] = useState<'s' | 'p' | 'd'>('s');
  const [pAxis, setPAxis] = useState<'x' | 'y' | 'z'>('z');
  const [dType, setDType] = useState<'xy' | 'xz' | 'yz' | 'x2y2' | 'z2'>('xy');
  const [showNucleus, setShowNucleus] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [currentElement, setCurrentElement] = useState({ symbol: 'H', protons: 1, neutrons: 0 });

  // Transfer/Test state
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [activeApp, setActiveApp] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);

  // Navigation refs
  const isNavigating = useRef(false);
  const hasEmittedStart = useRef(false);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Design system
  const colors = {
    bgDeep: '#030712',
    bgSurface: '#0f172a',
    bgElevated: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    secondary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  // Emit game event
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: Partial<GameEvent['details']> = {}
  ) => {
    if (!onGameEvent) return;
    onGameEvent({
      eventType,
      gameType: 'molecular_orbitals',
      gameTitle: 'Molecular Orbitals',
      details: {
        phase,
        phaseLabel: phaseLabels[phase],
        currentScreen: phaseOrder.indexOf(phase) + 1,
        totalScreens: 10,
        ...details
      },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, phaseLabels, phaseOrder]);

  // Emit start
  useEffect(() => {
    if (!hasEmittedStart.current) {
      hasEmittedStart.current = true;
      emitGameEvent('game_started', { message: 'Starting Molecular Orbitals exploration' });
    }
  }, [emitGameEvent]);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_changed', { phase: p, phaseLabel: phaseLabels[p] });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitGameEvent, phaseLabels]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, phaseOrder, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, phaseOrder, goToPhase]);

  // Elements for exploration
  const elements = [
    { symbol: 'H', name: 'Hydrogen', protons: 1, neutrons: 0, config: '1s¹' },
    { symbol: 'He', name: 'Helium', protons: 2, neutrons: 2, config: '1s²' },
    { symbol: 'C', name: 'Carbon', protons: 6, neutrons: 6, config: '1s² 2s² 2p²' },
    { symbol: 'N', name: 'Nitrogen', protons: 7, neutrons: 7, config: '1s² 2s² 2p³' },
    { symbol: 'O', name: 'Oxygen', protons: 8, neutrons: 8, config: '1s² 2s² 2p⁴' },
    { symbol: 'Fe', name: 'Iron', protons: 26, neutrons: 30, config: '[Ar] 3d⁶ 4s²' },
  ];

  // Test questions
  const testQuestions = [
    {
      question: "What shape is an s orbital?",
      options: ["Spherical", "Dumbbell", "Cloverleaf", "Ring"],
      correct: 0,
      explanation: "S orbitals are spherically symmetric around the nucleus."
    },
    {
      question: "How many p orbitals exist in a given energy level (n ≥ 2)?",
      options: ["1", "2", "3", "5"],
      correct: 2,
      explanation: "There are 3 p orbitals: px, py, and pz, oriented along the three axes."
    },
    {
      question: "What does the orbital shape represent?",
      options: ["Electron's path", "Probability density", "Electric field", "Magnetic field"],
      correct: 1,
      explanation: "Orbitals show where an electron is most likely to be found - the probability density."
    },
    {
      question: "Which orbital has the lowest energy?",
      options: ["2s", "2p", "1s", "3s"],
      correct: 2,
      explanation: "1s is closest to the nucleus and has the lowest energy."
    },
    {
      question: "What is the maximum number of electrons in a d subshell?",
      options: ["2", "6", "10", "14"],
      correct: 2,
      explanation: "A d subshell has 5 orbitals, each holding 2 electrons: 5 × 2 = 10."
    },
    {
      question: "P orbitals have a node at the:",
      options: ["Edges", "Nucleus", "Lobes", "No nodes"],
      correct: 1,
      explanation: "P orbitals have a nodal plane passing through the nucleus where probability is zero."
    },
    {
      question: "In sp³ hybridization, what is the bond angle?",
      options: ["90°", "109.5°", "120°", "180°"],
      correct: 1,
      explanation: "sp³ hybrid orbitals point toward corners of a tetrahedron with 109.5° angles."
    },
    {
      question: "Which element's ground state has partially filled d orbitals?",
      options: ["Carbon", "Oxygen", "Iron", "Neon"],
      correct: 2,
      explanation: "Iron (Fe) has configuration [Ar] 3d⁶ 4s² with 6 electrons in 5 d orbitals."
    },
    {
      question: "What quantum number describes orbital shape?",
      options: ["n (principal)", "l (angular)", "m (magnetic)", "s (spin)"],
      correct: 1,
      explanation: "The angular momentum quantum number l determines shape: l=0 (s), l=1 (p), l=2 (d)."
    },
    {
      question: "Electrons in the same orbital must have:",
      options: ["Same spin", "Opposite spins", "No spin", "Parallel spins"],
      correct: 1,
      explanation: "The Pauli Exclusion Principle: two electrons in the same orbital must have opposite spins."
    }
  ];

  // Transfer apps
  const transferApps = [
    {
      title: 'Chemical Bonding',
      icon: '🔗',
      description: 'Orbitals overlap to form molecular bonds. The shapes determine bond angles and molecular geometry.',
      application: 'Understanding why water is bent (104.5°) and CO₂ is linear (180°).'
    },
    {
      title: 'Spectroscopy',
      icon: '🌈',
      description: 'Electrons transition between orbitals, absorbing or emitting photons at specific wavelengths.',
      application: 'How we identify elements in distant stars and analyze chemical compounds.'
    },
    {
      title: 'Semiconductor Physics',
      icon: '💻',
      description: 'Orbital overlap creates energy bands. The band gap determines electrical properties.',
      application: 'Why silicon works in computer chips and how LEDs produce light.'
    },
    {
      title: 'Drug Design',
      icon: '💊',
      description: 'Molecular orbitals determine how drugs bind to proteins through shape complementarity.',
      application: 'Designing medicines that fit perfectly into target receptor sites.'
    }
  ];

  // Button styles
  const buttonStyle = (variant: 'primary' | 'secondary' | 'ghost' = 'primary') => ({
    padding: isMobile ? '14px 24px' : '16px 32px',
    background: variant === 'primary'
      ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`
      : variant === 'secondary'
        ? colors.bgElevated
        : 'transparent',
    color: colors.textPrimary,
    border: variant === 'ghost' ? `1px solid ${colors.bgElevated}` : 'none',
    borderRadius: '12px',
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    touchAction: 'manipulation' as const,
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
  });

  // ============================================================================
  // RENDER PHASES
  // ============================================================================

  const renderHook = () => (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      {/* Category */}
      <div style={{
        padding: '6px 16px',
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          🔬 3D Quantum Chemistry
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: isMobile ? '32px' : '48px',
        fontWeight: 700,
        background: `linear-gradient(135deg, ${colors.textPrimary} 0%, ${colors.primary} 50%, ${colors.secondary} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '16px'
      }}>
        Molecular Orbitals
      </h1>

      <p style={{ fontSize: isMobile ? '16px' : '18px', color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px', lineHeight: 1.6 }}>
        Explore the 3D probability clouds where electrons live.<br/>
        <strong>Rotate, zoom, and discover</strong> the quantum shapes that build our universe.
      </p>

      {/* 3D Preview */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: '300px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${colors.bgElevated}`,
        marginBottom: '32px'
      }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <OrbitalScene
            orbitalType="p"
            showNucleus={true}
            showAxes={false}
            pAxis="z"
            dType="xy"
            element={{ symbol: 'C', protons: 6, neutrons: 6 }}
          />
        </Canvas>
      </div>

      <button onClick={() => goToPhase('predict')} style={buttonStyle('primary')}>
        Begin Exploration →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>Step 2 • Predict</span>
        <h2 style={{ fontSize: isMobile ? '24px' : '32px', color: colors.textPrimary, marginTop: '8px' }}>
          What Shape is an Electron Cloud?
        </h2>
      </div>

      <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
        Electrons don't orbit like planets. They exist in <strong>probability clouds</strong> called orbitals.
        What shape do you think the simplest orbital (1s) has?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'sphere', label: 'Spherical', desc: 'Like a fuzzy ball around the nucleus' },
          { id: 'ring', label: 'Ring/Orbit', desc: 'Like a planet\'s path' },
          { id: 'dumbbell', label: 'Dumbbell', desc: 'Two lobes on opposite sides' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              setPrediction(opt.id);
              playSound('click');
              emitGameEvent('prediction_made', { prediction: opt.id });
            }}
            style={{
              ...buttonStyle('ghost'),
              textAlign: 'left',
              padding: '16px 20px',
              background: prediction === opt.id ? `${colors.success}20` : colors.bgElevated,
              border: prediction === opt.id ? `2px solid ${colors.success}` : `1px solid ${colors.bgElevated}`,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{opt.label}</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {prediction && (
        <button onClick={goNext} style={buttonStyle('primary')}>
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.bgElevated}` }}>
        <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>Step 3 • Explore</span>
        <h2 style={{ fontSize: '20px', color: colors.textPrimary, marginTop: '4px' }}>
          Interactive 3D Orbitals
        </h2>
      </div>

      {/* 3D Viewer */}
      <div style={{ flex: 1, minHeight: '300px' }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <OrbitalScene
            orbitalType={orbitalType}
            showNucleus={showNucleus}
            showAxes={showAxes}
            pAxis={pAxis}
            dType={dType}
            element={currentElement}
          />
        </Canvas>
      </div>

      {/* Controls */}
      <div style={{ padding: '16px', background: colors.bgElevated, borderTop: `1px solid ${colors.bgSurface}` }}>
        {/* Orbital Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>
            Orbital Type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['s', 'p', 'd'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrbitalType(type)}
                style={{
                  ...buttonStyle('ghost'),
                  padding: '10px 20px',
                  background: orbitalType === type ? colors.primary : colors.bgSurface,
                  border: 'none'
                }}
              >
                {type.toUpperCase()} Orbital
              </button>
            ))}
          </div>
        </div>

        {/* P orbital axis selector */}
        {orbitalType === 'p' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: colors.textMuted, display: 'block', marginBottom: '8px' }}>
              P Orbital Axis
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['x', 'y', 'z'] as const).map(axis => (
                <button
                  key={axis}
                  onClick={() => setPAxis(axis)}
                  style={{
                    ...buttonStyle('ghost'),
                    padding: '8px 16px',
                    background: pAxis === axis ? colors.secondary : colors.bgSurface,
                    border: 'none',
                    fontSize: '14px'
                  }}
                >
                  p<sub>{axis}</sub>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toggle options */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showNucleus}
              onChange={() => setShowNucleus(!showNucleus)}
              style={{ width: '18px', height: '18px' }}
            />
            Show Nucleus
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showAxes}
              onChange={() => setShowAxes(!showAxes)}
              style={{ width: '18px', height: '18px' }}
            />
            Show Axes
          </label>
        </div>

        <button onClick={goNext} style={{ ...buttonStyle('primary'), width: '100%' }}>
          I Understand → Review
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '12px', color: colors.success, fontWeight: 600 }}>Step 4 • Understanding</span>
        <h2 style={{ fontSize: isMobile ? '24px' : '32px', color: colors.textPrimary, marginTop: '8px' }}>
          {prediction === 'sphere' ? '✓ Correct!' : 'The S Orbital is Spherical'}
        </h2>
      </div>

      <div style={{
        padding: '20px',
        background: `${colors.success}10`,
        borderRadius: '12px',
        marginBottom: '24px',
        border: `1px solid ${colors.success}30`
      }}>
        <h3 style={{ color: colors.success, marginBottom: '12px' }}>Key Insights:</h3>
        <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px' }}>
          <li><strong>S orbitals</strong> are spherical - equal probability in all directions</li>
          <li><strong>P orbitals</strong> are dumbbell-shaped - two lobes along an axis</li>
          <li><strong>D orbitals</strong> are cloverleaf or complex shapes</li>
          <li>The <strong>shape</strong> determines how atoms bond together</li>
        </ul>
      </div>

      <div style={{
        padding: '20px',
        background: colors.bgElevated,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Why It Matters:</h3>
        <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
          Orbital shapes determine molecular geometry. When atoms bond, their orbitals overlap.
          The shape of water (bent) vs CO₂ (linear) comes directly from orbital geometry.
        </p>
      </div>

      <button onClick={goNext} style={buttonStyle('primary')}>
        Next: Hybridization Challenge →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '12px', color: colors.warning, fontWeight: 600 }}>Step 5 • New Challenge</span>
        <h2 style={{ fontSize: isMobile ? '24px' : '32px', color: colors.textPrimary, marginTop: '8px' }}>
          The Hybridization Puzzle
        </h2>
      </div>

      <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
        Carbon has one 2s and three 2p orbitals. But in methane (CH₄), carbon forms
        <strong> four identical bonds</strong> at 109.5° angles. How?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'use_p_only', label: 'Use only p orbitals', desc: 'Ignore the s orbital' },
          { id: 'mix', label: 'Mix s and p together', desc: 'Create new "hybrid" orbitals' },
          { id: 'alternate', label: 'Alternate s and p', desc: 'Some bonds use s, others use p' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              setTwistPrediction(opt.id);
              playSound('click');
            }}
            style={{
              ...buttonStyle('ghost'),
              textAlign: 'left',
              padding: '16px 20px',
              background: twistPrediction === opt.id ? `${colors.warning}20` : colors.bgElevated,
              border: twistPrediction === opt.id ? `2px solid ${colors.warning}` : `1px solid ${colors.bgElevated}`,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{opt.label}</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button onClick={goNext} style={buttonStyle('primary')}>
          See Hybridization →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', color: colors.textPrimary, marginBottom: '16px' }}>
        sp³ Hybridization
      </h2>

      <div style={{
        height: '250px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px',
        border: `1px solid ${colors.bgElevated}`
      }}>
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Environment preset="city" />

          {/* Show 4 sp3 hybrid orbitals pointing to tetrahedron vertices */}
          {[
            [1, 1, 1],
            [-1, -1, 1],
            [-1, 1, -1],
            [1, -1, -1]
          ].map((dir, i) => {
            const len = Math.sqrt(dir[0]**2 + dir[1]**2 + dir[2]**2);
            return (
              <mesh key={i} position={[dir[0]/len * 1.2, dir[1]/len * 1.2, dir[2]/len * 1.2]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshPhysicalMaterial color={colors.primary} transparent opacity={0.6} clearcoat={0.5} />
              </mesh>
            );
          })}

          {/* Central nucleus */}
          <mesh>
            <sphereGeometry args={[0.2, 32, 32]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>

          <OrbitControls autoRotate autoRotateSpeed={1} />
        </Canvas>
      </div>

      <div style={{
        padding: '16px',
        background: `${colors.warning}15`,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
          {twistPrediction === 'mix' ? '✓ Correct! ' : ''}
          The s and three p orbitals <strong>mix (hybridize)</strong> to create four identical
          sp³ orbitals pointing toward the corners of a tetrahedron at 109.5° angles.
        </p>
      </div>

      <button onClick={goNext} style={buttonStyle('primary')}>
        Deep Insight →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', color: colors.textPrimary, marginBottom: '24px' }}>
        Why Hybridization Matters
      </h2>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        {[
          { type: 'sp³', angle: '109.5°', shape: 'Tetrahedral', example: 'Methane (CH₄)' },
          { type: 'sp²', angle: '120°', shape: 'Trigonal planar', example: 'Ethene (C₂H₄)' },
          { type: 'sp', angle: '180°', shape: 'Linear', example: 'Ethyne (C₂H₂)' },
        ].map(h => (
          <div key={h.type} style={{ padding: '16px', background: colors.bgElevated, borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: colors.primary }}>{h.type}</span>
              <span style={{ color: colors.textMuted }}>{h.angle}</span>
            </div>
            <div style={{ color: colors.textSecondary }}>
              {h.shape} • <em>{h.example}</em>
            </div>
          </div>
        ))}
      </div>

      <button onClick={goNext} style={buttonStyle('primary')}>
        Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '20px' : '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '12px', color: colors.secondary, fontWeight: 600 }}>Step 8 • Real World</span>
        <h2 style={{ fontSize: '24px', color: colors.textPrimary, marginTop: '8px' }}>
          Orbitals in Action
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
        {transferApps.map((app, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveApp(i);
              if (!completedApps[i]) {
                const newCompleted = [...completedApps];
                newCompleted[i] = true;
                setCompletedApps(newCompleted);
              }
            }}
            style={{
              ...buttonStyle('ghost'),
              padding: '12px 16px',
              background: activeApp === i ? colors.primary : colors.bgElevated,
              border: 'none',
              whiteSpace: 'nowrap',
              opacity: i === 0 || completedApps[i - 1] ? 1 : 0.5,
              pointerEvents: i === 0 || completedApps[i - 1] ? 'auto' : 'none'
            }}
          >
            {app.icon} {completedApps[i] && '✓'}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px', background: colors.bgElevated, borderRadius: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', color: colors.textPrimary, marginBottom: '8px' }}>
          {transferApps[activeApp].icon} {transferApps[activeApp].title}
        </h3>
        <p style={{ color: colors.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
          {transferApps[activeApp].description}
        </p>
        <div style={{ padding: '12px', background: `${colors.success}15`, borderRadius: '8px' }}>
          <strong style={{ color: colors.success }}>Application:</strong>
          <p style={{ color: colors.textSecondary, marginTop: '4px' }}>
            {transferApps[activeApp].application}
          </p>
        </div>
      </div>

      {completedApps.every(Boolean) ? (
        <button onClick={goNext} style={buttonStyle('primary')}>
          Take the Test →
        </button>
      ) : (
        <p style={{ color: colors.textMuted, textAlign: 'center' }}>
          Complete all 4 applications to unlock the test
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;

    return (
      <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span style={{ color: colors.textMuted }}>Question {currentQuestion + 1}/10</span>
          <span style={{ color: colors.success }}>Score: {testScore}/10</span>
        </div>

        <h2 style={{ fontSize: '20px', color: colors.textPrimary, marginBottom: '24px' }}>
          {q.question}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {q.options.map((opt, i) => {
            const isSelected = testAnswers[currentQuestion] === i;
            const isCorrect = i === q.correct;
            const showResult = answered;

            return (
              <button
                key={i}
                onClick={() => {
                  if (answered) return;
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = i;
                  setTestAnswers(newAnswers);
                  if (isCorrect) {
                    setTestScore(s => s + 1);
                    playSound('success');
                  } else {
                    playSound('failure');
                  }
                }}
                disabled={answered}
                style={{
                  ...buttonStyle('ghost'),
                  textAlign: 'left',
                  background: showResult
                    ? isCorrect ? `${colors.success}20` : isSelected ? `${colors.error}20` : colors.bgElevated
                    : isSelected ? colors.primary : colors.bgElevated,
                  border: showResult
                    ? isCorrect ? `2px solid ${colors.success}` : isSelected ? `2px solid ${colors.error}` : 'none'
                    : 'none',
                  opacity: answered ? 0.8 : 1
                }}
              >
                {opt}
                {showResult && isCorrect && ' ✓'}
                {showResult && isSelected && !isCorrect && ' ✗'}
              </button>
            );
          })}
        </div>

        {answered && (
          <div style={{
            padding: '16px',
            background: `${colors.secondary}15`,
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <p style={{ color: colors.textSecondary }}>{q.explanation}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentQuestion > 0 && (
            <button onClick={() => setCurrentQuestion(c => c - 1)} style={buttonStyle('ghost')}>
              ← Previous
            </button>
          )}
          {currentQuestion < 9 ? (
            <button
              onClick={() => setCurrentQuestion(c => c + 1)}
              disabled={!answered}
              style={{ ...buttonStyle('primary'), flex: 1, opacity: answered ? 1 : 0.5 }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!answered}
              style={{ ...buttonStyle('primary'), flex: 1, opacity: answered ? 1 : 0.5 }}
            >
              Complete →
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const passed = testScore >= 7;

    useEffect(() => {
      if (phase === 'mastery') {
        emitGameEvent('game_completed', { score: testScore, maxScore: 10, passed });
        playSound(passed ? 'complete' : 'failure');
      }
    }, [phase]);

    return (
      <div style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: passed ? `${colors.success}20` : `${colors.error}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <span style={{ fontSize: '48px' }}>{passed ? '🎓' : '📚'}</span>
        </div>

        <h1 style={{ fontSize: '32px', color: colors.textPrimary, marginBottom: '16px' }}>
          {passed ? 'Mastery Achieved!' : 'Keep Learning!'}
        </h1>

        <p style={{ fontSize: '24px', color: passed ? colors.success : colors.error, marginBottom: '24px' }}>
          Score: {testScore}/10 ({Math.round(testScore * 10)}%)
        </p>

        <div style={{
          padding: '20px',
          background: colors.bgElevated,
          borderRadius: '12px',
          maxWidth: '400px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>You mastered:</h3>
          <ul style={{ color: colors.textSecondary, textAlign: 'left', lineHeight: 1.8 }}>
            <li>S, P, and D orbital shapes</li>
            <li>Probability density visualization</li>
            <li>Orbital hybridization (sp, sp², sp³)</li>
            <li>Real-world applications</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={buttonStyle('primary')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      height: '100%',
      background: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'auto'
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: colors.bgSurface,
        padding: '12px 20px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>
            {phaseLabels[phase]}
          </span>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>
            {phaseOrder.indexOf(phase) + 1}/10
          </span>
        </div>
        <div style={{ height: '4px', background: colors.bgElevated, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((phaseOrder.indexOf(phase) + 1) / 10) * 100}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default MolecularOrbitalsRenderer;
