'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// MOLECULAR ORBITALS - EDUCATIONAL 3D Simulation
// Design principle: The visualization TEACHES, not just displays
// Every element answers: WHAT is it? WHY that shape? WHAT to notice?
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
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
    const sounds: Record<string, { freq: number; duration: number }> = {
      click: { freq: 600, duration: 0.1 },
      success: { freq: 800, duration: 0.2 },
      failure: { freq: 300, duration: 0.3 },
      transition: { freq: 500, duration: 0.15 },
      complete: { freq: 900, duration: 0.4 }
    };
    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ============================================================================
// EDUCATIONAL 3D COMPONENTS - Every element teaches something
// ============================================================================

// Electron particle that moves within the orbital cloud
const ElectronParticle: React.FC<{
  orbitalType: 's' | 'p' | 'd';
  color: string;
  speed?: number;
}> = ({ orbitalType, color, speed = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOffset = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed + timeOffset.current;

    if (orbitalType === 's') {
      // Electron wanders randomly within sphere - shows PROBABILITY
      const r = 0.8 + Math.sin(t * 2) * 0.3;
      const theta = t * 0.7;
      const phi = t * 0.5;
      meshRef.current.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    } else if (orbitalType === 'p') {
      // Electron moves in figure-8 pattern through both lobes
      const lobe = Math.sin(t) > 0 ? 1 : -1;
      const r = 0.5 + Math.abs(Math.sin(t * 2)) * 0.4;
      meshRef.current.position.set(
        Math.sin(t * 3) * 0.2,
        lobe * r,
        Math.cos(t * 3) * 0.2
      );
    } else {
      // D orbital - cloverleaf motion
      const angle = t * 0.8;
      const r = 0.6 + Math.sin(t * 2) * 0.2;
      meshRef.current.position.set(
        r * Math.cos(angle * 2) * Math.cos(angle),
        Math.sin(t * 1.5) * 0.3,
        r * Math.cos(angle * 2) * Math.sin(angle)
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color={color} />
      {/* Glow effect */}
      <pointLight color={color} intensity={0.5} distance={1} />
    </mesh>
  );
};

// S Orbital with educational annotations
const EducationalSOrbital: React.FC<{
  showLabels: boolean;
  showElectron: boolean;
  highlightFeature: 'none' | 'shape' | 'probability' | 'node';
}> = ({ showLabels, showElectron, highlightFeature }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle breathing animation to show it's a "cloud"
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* Main orbital shell - outer boundary */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshPhysicalMaterial
          color={highlightFeature === 'shape' ? '#60a5fa' : '#3b82f6'}
          transparent
          opacity={highlightFeature === 'probability' ? 0.15 : 0.25}
          roughness={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner probability density - darker = more likely */}
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Core - highest probability */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial
          color="#1d4ed8"
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Nucleus at center */}
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>

      {/* Animated electron */}
      {showElectron && (
        <>
          <ElectronParticle orbitalType="s" color="#22d3ee" speed={1.2} />
          <ElectronParticle orbitalType="s" color="#22d3ee" speed={0.8} />
        </>
      )}

      {/* Educational Labels - IN the 3D scene */}
      {showLabels && (
        <>
          {/* What it is */}
          <Billboard position={[0, 2, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(0,0,0,0.85)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #3b82f6',
                whiteSpace: 'nowrap'
              }}>
                <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '14px' }}>S ORBITAL</div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Spherical shape</div>
              </div>
            </Html>
          </Billboard>

          {/* Why spherical - with arrow */}
          <Billboard position={[1.8, 0.5, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(34, 197, 94, 0.9)',
                padding: '6px 12px',
                borderRadius: '6px',
                maxWidth: '140px'
              }}>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>
                  ↙ WHY SPHERICAL?
                </div>
                <div style={{ color: '#dcfce7', fontSize: '10px', marginTop: '4px' }}>
                  Equal probability in ALL directions from nucleus
                </div>
              </div>
            </Html>
          </Billboard>

          {/* What to notice */}
          <Billboard position={[-1.5, -0.8, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(249, 115, 22, 0.9)',
                padding: '6px 12px',
                borderRadius: '6px',
                maxWidth: '130px'
              }}>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>
                  👁 NOTICE:
                </div>
                <div style={{ color: '#fed7aa', fontSize: '10px', marginTop: '4px' }}>
                  Darker center = electron more likely to be there
                </div>
              </div>
            </Html>
          </Billboard>
        </>
      )}
    </group>
  );
};

// P Orbital with educational annotations
const EducationalPOrbital: React.FC<{
  showLabels: boolean;
  showElectron: boolean;
  highlightFeature: 'none' | 'lobes' | 'node' | 'direction';
}> = ({ showLabels, showElectron, highlightFeature }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle breathing
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const lobeOpacity = highlightFeature === 'lobes' ? 0.6 : 0.4;
  const nodeHighlight = highlightFeature === 'node';

  return (
    <group ref={groupRef}>
      {/* Positive lobe (top) */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshPhysicalMaterial
          color="#ef4444"
          transparent
          opacity={lobeOpacity}
          roughness={0.3}
        />
      </mesh>

      {/* Inner density - positive lobe */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial color="#dc2626" transparent opacity={0.5} />
      </mesh>

      {/* Negative lobe (bottom) */}
      <mesh position={[0, -0.9, 0]}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshPhysicalMaterial
          color="#3b82f6"
          transparent
          opacity={lobeOpacity}
          roughness={0.3}
        />
      </mesh>

      {/* Inner density - negative lobe */}
      <mesh position={[0, -0.85, 0]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial color="#1d4ed8" transparent opacity={0.5} />
      </mesh>

      {/* NODAL PLANE - where probability = 0 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, nodeHighlight ? 1.2 : 0.8, 32]} />
        <meshBasicMaterial
          color={nodeHighlight ? '#fbbf24' : '#475569'}
          transparent
          opacity={nodeHighlight ? 0.8 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Nucleus */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>

      {/* Animated electron */}
      {showElectron && (
        <ElectronParticle orbitalType="p" color="#22d3ee" speed={1} />
      )}

      {/* Educational Labels */}
      {showLabels && (
        <>
          {/* Main label */}
          <Billboard position={[0, 2.2, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(0,0,0,0.85)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #ef4444'
              }}>
                <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '14px' }}>P ORBITAL</div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Dumbbell shape (2 lobes)</div>
              </div>
            </Html>
          </Billboard>

          {/* Lobe labels */}
          <Billboard position={[1.2, 1, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(239, 68, 68, 0.9)',
                padding: '4px 10px',
                borderRadius: '4px'
              }}>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>
                  + Phase
                </div>
              </div>
            </Html>
          </Billboard>

          <Billboard position={[1.2, -1, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(59, 130, 246, 0.9)',
                padding: '4px 10px',
                borderRadius: '4px'
              }}>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>
                  - Phase
                </div>
              </div>
            </Html>
          </Billboard>

          {/* Node explanation */}
          <Billboard position={[-1.8, 0, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(251, 191, 36, 0.95)',
                padding: '8px 12px',
                borderRadius: '6px',
                maxWidth: '150px'
              }}>
                <div style={{ color: '#1e293b', fontSize: '11px', fontWeight: 700 }}>
                  ⚠️ NODAL PLANE
                </div>
                <div style={{ color: '#44403c', fontSize: '10px', marginTop: '4px' }}>
                  Electron has ZERO probability here. It "jumps" between lobes!
                </div>
              </div>
            </Html>
          </Billboard>

          {/* Direction arrow */}
          <Billboard position={[0, 0, 1.5]}>
            <Html center>
              <div style={{
                background: 'rgba(34, 197, 94, 0.9)',
                padding: '6px 10px',
                borderRadius: '6px'
              }}>
                <div style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>
                  ↕ Oriented along Y-axis
                </div>
                <div style={{ color: '#dcfce7', fontSize: '10px' }}>
                  (px, py, pz point different ways)
                </div>
              </div>
            </Html>
          </Billboard>
        </>
      )}
    </group>
  );
};

// Comparison view - S vs P side by side
const ComparisonView: React.FC<{ showLabels: boolean }> = ({ showLabels }) => {
  return (
    <group>
      {/* S Orbital on left */}
      <group position={[-2, 0, 0]} scale={0.7}>
        <EducationalSOrbital showLabels={false} showElectron={true} highlightFeature="none" />
        <Billboard position={[0, 1.8, 0]}>
          <Html center>
            <div style={{
              background: '#3b82f6',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              color: 'white',
              fontSize: '14px'
            }}>
              S ORBITAL
            </div>
          </Html>
        </Billboard>
      </group>

      {/* P Orbital on right */}
      <group position={[2, 0, 0]} scale={0.7}>
        <EducationalPOrbital showLabels={false} showElectron={true} highlightFeature="none" />
        <Billboard position={[0, 2, 0]}>
          <Html center>
            <div style={{
              background: '#ef4444',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              color: 'white',
              fontSize: '14px'
            }}>
              P ORBITAL
            </div>
          </Html>
        </Billboard>
      </group>

      {/* VS in center */}
      <Billboard position={[0, 0, 0]}>
        <Html center>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '8px 16px',
            borderRadius: '50%',
            border: '2px solid #64748b'
          }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: '16px' }}>VS</div>
          </div>
        </Html>
      </Billboard>

      {/* Key difference callout */}
      {showLabels && (
        <Billboard position={[0, -2, 0]}>
          <Html center>
            <div style={{
              background: 'rgba(0,0,0,0.9)',
              padding: '12px 20px',
              borderRadius: '10px',
              border: '2px solid #8b5cf6',
              maxWidth: '300px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                🔑 KEY DIFFERENCE
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: 1.5 }}>
                <strong style={{ color: '#60a5fa' }}>S:</strong> Spherical, no direction preference<br/>
                <strong style={{ color: '#f87171' }}>P:</strong> Directional, determines bond angles
              </div>
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
};

// Why It Matters visualization
const BondingDemo: React.FC<{ showLabels: boolean }> = ({ showLabels }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Two P orbitals overlapping to form bond */}
      <group position={[-1, 0, 0]}>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial color="#ef4444" transparent opacity={0.5} />
        </mesh>
        <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
        {/* Nucleus */}
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        <Billboard position={[0, -1.2, 0]}>
          <Html center>
            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
              Atom 1
            </div>
          </Html>
        </Billboard>
      </group>

      <group position={[1, 0, 0]}>
        <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial color="#ef4444" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        <Billboard position={[0, -1.2, 0]}>
          <Html center>
            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
              Atom 2
            </div>
          </Html>
        </Billboard>
      </group>

      {/* Overlap region - the BOND */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
      </mesh>

      {showLabels && (
        <>
          <Billboard position={[0, 1, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(34, 197, 94, 0.95)',
                padding: '8px 14px',
                borderRadius: '8px'
              }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>
                  🔗 COVALENT BOND
                </div>
                <div style={{ color: '#dcfce7', fontSize: '11px', marginTop: '4px' }}>
                  Orbitals overlap → electrons shared
                </div>
              </div>
            </Html>
          </Billboard>

          <Billboard position={[0, -2, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(0,0,0,0.9)',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '2px solid #22c55e',
                maxWidth: '280px'
              }}>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '12px' }}>
                  💡 THIS IS WHY SHAPES MATTER
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '11px', marginTop: '6px', lineHeight: 1.5 }}>
                  P orbitals can only overlap in specific directions.<br/>
                  This determines molecular geometry!
                </div>
              </div>
            </Html>
          </Billboard>
        </>
      )}
    </group>
  );
};

// Camera auto-focus
const CameraController: React.FC<{ target: [number, number, number] }> = ({ target }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(new THREE.Vector3(...target));
  }, [camera, target]);

  return null;
};

// ============================================================================
// MAIN RENDERER
// ============================================================================

const MolecularOrbitalsRenderer: React.FC<MolecularOrbitalsRendererProps> = ({ onGameEvent }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Visualization controls
  const [viewMode, setViewMode] = useState<'s' | 'p' | 'compare' | 'bonding'>('s');
  const [showLabels, setShowLabels] = useState(true);
  const [showElectron, setShowElectron] = useState(true);
  const [highlightFeature, setHighlightFeature] = useState<string>('none');

  // Transfer/Test state
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);
  const [activeApp, setActiveApp] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);

  const isNavigating = useRef(false);
  const hasEmittedStart = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const colors = {
    bgDeep: '#030712',
    bgSurface: '#0f172a',
    bgElevated: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    primary: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'molecular_orbitals',
      gameTitle: 'Molecular Orbitals',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  useEffect(() => {
    if (!hasEmittedStart.current) {
      hasEmittedStart.current = true;
      emitGameEvent('game_started');
    }
  }, [emitGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_changed', { newPhase: p });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, phaseOrder, goToPhase]);

  // Button component
  const Button: React.FC<{
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }> = ({ onClick, variant = 'primary', disabled, children, style }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: isMobile ? '14px 24px' : '16px 32px',
        background: variant === 'primary'
          ? `linear-gradient(135deg, ${colors.primary} 0%, #7c3aed 100%)`
          : variant === 'secondary' ? colors.bgElevated : 'transparent',
        color: colors.textPrimary,
        border: variant === 'ghost' ? `1px solid ${colors.bgElevated}` : 'none',
        borderRadius: '12px',
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...style
      }}
    >
      {children}
    </button>
  );

  // Test questions
  const testQuestions = [
    {
      question: "What does an orbital represent?",
      options: ["The path an electron takes", "Where an electron is most likely to be found", "The speed of an electron", "The charge of an electron"],
      correct: 1,
      explanation: "Orbitals show probability density - where you're most likely to find the electron if you looked."
    },
    {
      question: "Why is an S orbital spherical?",
      options: ["Electrons move in circles", "Equal probability in all directions", "It's the smallest orbital", "Electrons are round"],
      correct: 1,
      explanation: "In an S orbital, the electron has equal probability of being in any direction from the nucleus."
    },
    {
      question: "What is the nodal plane in a P orbital?",
      options: ["Where electrons move fastest", "Where there's zero probability of finding the electron", "The center of the lobe", "The boundary of the orbital"],
      correct: 1,
      explanation: "At the nodal plane, the probability of finding an electron is exactly zero - it 'jumps' between lobes."
    },
    {
      question: "Why do P orbitals have two lobes?",
      options: ["They hold two electrons", "The wave function has opposite phases", "They're bigger than S orbitals", "One lobe per electron"],
      correct: 1,
      explanation: "The two lobes represent regions where the wave function has opposite signs (phases)."
    },
    {
      question: "How do orbital shapes affect bonding?",
      options: ["They don't", "They determine bond angles", "They change electron mass", "They affect nuclear charge"],
      correct: 1,
      explanation: "Orbital shapes determine how atoms can overlap, which directly controls molecular geometry."
    },
    {
      question: "What happens where two orbitals overlap?",
      options: ["Electrons repel", "A covalent bond can form", "Atoms explode", "Nothing"],
      correct: 1,
      explanation: "When orbitals overlap, electrons can be shared between atoms, forming a covalent bond."
    },
    {
      question: "Why does water have a bent shape (not linear)?",
      options: ["Gravity pulls it down", "P orbital geometry", "It's random", "Temperature effects"],
      correct: 1,
      explanation: "Oxygen's P orbitals overlap with hydrogen at specific angles, creating the bent 104.5° shape."
    },
    {
      question: "What color represents higher probability in our visualization?",
      options: ["Lighter/transparent", "Darker/more opaque", "It's all the same", "Red only"],
      correct: 1,
      explanation: "Darker regions = higher probability. The electron spends more time in the dense inner region."
    },
    {
      question: "How many P orbitals are there per energy level?",
      options: ["1", "2", "3", "4"],
      correct: 2,
      explanation: "There are 3 P orbitals: px, py, and pz - one pointing along each axis."
    },
    {
      question: "What would happen if orbitals were not directional?",
      options: ["Stronger bonds", "No specific molecular shapes", "Faster electrons", "Heavier atoms"],
      correct: 1,
      explanation: "Without directional orbitals, molecules couldn't have specific 3D shapes - chemistry as we know it wouldn't exist!"
    }
  ];

  // Transfer apps
  const transferApps = [
    { title: 'Molecular Geometry', icon: '🔷', desc: 'Orbital shapes determine bond angles. Water is bent (104.5°) because of P orbital geometry.' },
    { title: 'Chemical Reactions', icon: '⚗️', desc: 'Reactions happen when orbitals overlap in the right orientation. Shape controls reactivity.' },
    { title: 'Material Properties', icon: '💎', desc: 'Diamond vs graphite: same atoms, different orbital arrangements = different properties.' },
    { title: 'Drug Design', icon: '💊', desc: 'Drugs work by fitting into protein pockets. Orbital shapes determine if they fit.' }
  ];

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  const render3DViewer = (mode: typeof viewMode, height: string = '350px') => (
    <div style={{
      width: '100%',
      height,
      borderRadius: '16px',
      overflow: 'hidden',
      border: `2px solid ${colors.bgElevated}`,
      background: '#0a0a0f'
    }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        <Suspense fallback={null}>
          {mode === 's' && (
            <EducationalSOrbital
              showLabels={showLabels}
              showElectron={showElectron}
              highlightFeature={highlightFeature as 'none' | 'shape' | 'probability' | 'node'}
            />
          )}
          {mode === 'p' && (
            <EducationalPOrbital
              showLabels={showLabels}
              showElectron={showElectron}
              highlightFeature={highlightFeature as 'none' | 'lobes' | 'node' | 'direction'}
            />
          )}
          {mode === 'compare' && <ComparisonView showLabels={showLabels} />}
          {mode === 'bonding' && <BondingDemo showLabels={showLabels} />}
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          autoRotate={!showLabels}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Instructions overlay */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        color: '#94a3b8'
      }}>
        🖱️ Drag to rotate • Scroll to zoom
      </div>
    </div>
  );

  const renderHook = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', textAlign: 'center' }}>
      <div style={{
        padding: '6px 16px',
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        display: 'inline-block',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase' }}>
          🔬 3D Quantum Chemistry
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '42px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '16px'
      }}>
        Where Do Electrons<br/>Actually Live?
      </h1>

      <p style={{ fontSize: '16px', color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
        Electrons don't orbit like planets. They exist in <strong>probability clouds</strong> with specific shapes.
        These shapes determine everything from water's bent structure to why diamonds sparkle.
      </p>

      {/* Preview with labels */}
      <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto 32px' }}>
        {render3DViewer('p', '300px')}
      </div>

      <Button onClick={() => goToPhase('predict')}>
        Explore the Shapes →
      </Button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>Step 2 • Predict</span>
      <h2 style={{ fontSize: '24px', color: colors.textPrimary, margin: '8px 0 16px' }}>
        What shape is the simplest electron cloud?
      </h2>

      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        The 1s orbital holds hydrogen's single electron. What shape do you think this probability cloud has?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'sphere', label: '🔵 Spherical', desc: 'Like a fuzzy ball - equal probability in all directions' },
          { id: 'ring', label: '⭕ Ring/Orbit', desc: 'Like a planet path around the sun' },
          { id: 'dumbbell', label: '🏋️ Dumbbell', desc: 'Two blobs on opposite sides' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => { setPrediction(opt.id); playSound('click'); }}
            style={{
              padding: '16px 20px',
              background: prediction === opt.id ? `${colors.success}20` : colors.bgElevated,
              border: prediction === opt.id ? `2px solid ${colors.success}` : `1px solid ${colors.bgElevated}`,
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>{opt.label}</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {prediction && <Button onClick={goNext}>See the Answer →</Button>}
    </div>
  );

  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${colors.bgElevated}` }}>
        <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>Step 3 • Explore</span>
        <h2 style={{ fontSize: '18px', color: colors.textPrimary, margin: '4px 0 0' }}>
          Interactive Orbital Explorer
        </h2>
      </div>

      {/* View mode selector */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 's', label: 'S Orbital', color: '#3b82f6' },
          { id: 'p', label: 'P Orbital', color: '#ef4444' },
          { id: 'compare', label: 'Compare S vs P', color: '#8b5cf6' },
          { id: 'bonding', label: 'How Bonds Form', color: '#22c55e' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setViewMode(v.id as typeof viewMode)}
            style={{
              padding: '8px 16px',
              background: viewMode === v.id ? v.color : colors.bgElevated,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              opacity: viewMode === v.id ? 1 : 0.7
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* 3D Viewer */}
      <div style={{ flex: 1, padding: '0 20px', minHeight: '300px', position: 'relative' }}>
        {render3DViewer(viewMode, '100%')}
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 20px', background: colors.bgElevated, borderTop: `1px solid ${colors.bgSurface}` }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, cursor: 'pointer' }}>
            <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} />
            Show Labels
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, cursor: 'pointer' }}>
            <input type="checkbox" checked={showElectron} onChange={() => setShowElectron(!showElectron)} />
            Show Electron
          </label>
        </div>

        <Button onClick={goNext} style={{ width: '100%' }}>
          I Understand the Shapes →
        </Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{
        padding: '16px 20px',
        background: prediction === 'sphere' ? `${colors.success}15` : `${colors.warning}15`,
        borderRadius: '12px',
        marginBottom: '24px',
        border: `1px solid ${prediction === 'sphere' ? colors.success : colors.warning}40`
      }}>
        <h2 style={{ color: prediction === 'sphere' ? colors.success : colors.warning, marginBottom: '8px' }}>
          {prediction === 'sphere' ? '✓ Correct!' : 'The Answer: Spherical'}
        </h2>
        <p style={{ color: colors.textSecondary, margin: 0 }}>
          The S orbital is spherical because the electron has <strong>equal probability</strong> of being found in any direction from the nucleus.
        </p>
      </div>

      <h3 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Key Takeaways:</h3>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {[
          { emoji: '🔵', title: 'S = Spherical', desc: 'No preferred direction. Electron equally likely anywhere at same distance.' },
          { emoji: '🏋️', title: 'P = Dumbbell', desc: 'Two lobes with a nodal plane. Electron never at the center!' },
          { emoji: '🎯', title: 'Darker = More Likely', desc: 'Denser regions show where electron spends most time.' },
          { emoji: '🔗', title: 'Shapes → Bonds', desc: 'Orbital geometry determines how atoms connect.' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '14px 16px', background: colors.bgElevated, borderRadius: '10px', display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{item.emoji}</span>
            <div>
              <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '2px' }}>{item.title}</div>
              <div style={{ fontSize: '13px', color: colors.textMuted }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={goNext}>Next: The Twist →</Button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <span style={{ fontSize: '12px', color: colors.warning, fontWeight: 600 }}>Step 5 • New Challenge</span>
      <h2 style={{ fontSize: '24px', color: colors.textPrimary, margin: '8px 0 16px' }}>
        The Bonding Puzzle
      </h2>

      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        Carbon in methane (CH₄) forms <strong>4 identical bonds</strong> at 109.5° angles.
        But carbon has different orbital shapes (s and p). How can it make 4 identical bonds?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'ignore', label: 'Use only P orbitals', desc: 'Ignore the S orbital entirely' },
          { id: 'mix', label: 'Mix S and P together', desc: 'Create new hybrid shapes' },
          { id: 'alternate', label: 'Alternate between them', desc: 'Some bonds use S, others use P' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
            style={{
              padding: '16px 20px',
              background: twistPrediction === opt.id ? `${colors.warning}20` : colors.bgElevated,
              border: twistPrediction === opt.id ? `2px solid ${colors.warning}` : `1px solid ${colors.bgElevated}`,
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>{opt.label}</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {twistPrediction && <Button onClick={goNext}>See Hybridization →</Button>}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        padding: '16px',
        background: twistPrediction === 'mix' ? `${colors.success}15` : `${colors.primary}15`,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: twistPrediction === 'mix' ? colors.success : colors.primary, marginBottom: '8px' }}>
          {twistPrediction === 'mix' ? '✓ Correct!' : 'Answer:'} Hybridization!
        </h3>
        <p style={{ color: colors.textSecondary, margin: 0 }}>
          The S and P orbitals <strong>mix together</strong> to create 4 identical sp³ hybrid orbitals pointing toward the corners of a tetrahedron.
        </p>
      </div>

      <div style={{
        height: '280px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px',
        border: `2px solid ${colors.bgElevated}`,
        background: '#0a0a0f'
      }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} />

          {/* 4 sp3 orbitals pointing to tetrahedron corners */}
          {[
            { pos: [1, 1, 1], color: '#ef4444' },
            { pos: [-1, -1, 1], color: '#3b82f6' },
            { pos: [-1, 1, -1], color: '#22c55e' },
            { pos: [1, -1, -1], color: '#f59e0b' },
          ].map((lobe, i) => {
            const len = Math.sqrt(lobe.pos[0]**2 + lobe.pos[1]**2 + lobe.pos[2]**2);
            const norm = lobe.pos.map(p => p / len * 1.3) as [number, number, number];
            return (
              <group key={i}>
                <mesh position={norm}>
                  <sphereGeometry args={[0.5, 32, 32]} />
                  <meshPhysicalMaterial color={lobe.color} transparent opacity={0.6} />
                </mesh>
                <Billboard position={[norm[0] * 1.4, norm[1] * 1.4, norm[2] * 1.4]}>
                  <Html center>
                    <div style={{
                      background: lobe.color,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: 'white',
                      fontWeight: 600
                    }}>
                      sp³
                    </div>
                  </Html>
                </Billboard>
              </group>
            );
          })}

          {/* Central nucleus */}
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} />
          </mesh>

          {/* Labels */}
          <Billboard position={[0, 2.2, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(0,0,0,0.9)',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '2px solid #8b5cf6'
              }}>
                <div style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '13px' }}>sp³ HYBRIDIZATION</div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>4 identical orbitals • 109.5° apart</div>
              </div>
            </Html>
          </Billboard>

          <OrbitControls autoRotate autoRotateSpeed={1} enablePan={false} />
        </Canvas>
      </div>

      <Button onClick={goNext}>Continue →</Button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Hybridization Summary</h2>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {[
          { type: 'sp³', angle: '109.5°', shape: 'Tetrahedral', example: 'Methane CH₄', color: '#8b5cf6' },
          { type: 'sp²', angle: '120°', shape: 'Trigonal planar', example: 'Ethene C₂H₄', color: '#3b82f6' },
          { type: 'sp', angle: '180°', shape: 'Linear', example: 'CO₂', color: '#22c55e' },
        ].map(h => (
          <div key={h.type} style={{
            padding: '16px',
            background: colors.bgElevated,
            borderRadius: '12px',
            borderLeft: `4px solid ${h.color}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: h.color, fontSize: '16px' }}>{h.type}</span>
              <span style={{ color: colors.textMuted }}>{h.angle}</span>
            </div>
            <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {h.shape} • <em>{h.example}</em>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '16px',
        background: `${colors.success}15`,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ fontWeight: 600, color: colors.success, marginBottom: '8px' }}>💡 The Big Picture</div>
        <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
          Orbital shapes → Hybridization → Bond angles → Molecular geometry → Chemical properties.
          <strong> Understanding orbitals lets you predict how molecules behave!</strong>
        </p>
      </div>

      <Button onClick={goNext}>Real-World Applications →</Button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: isMobile ? '20px' : '40px' }}>
      <span style={{ fontSize: '12px', color: colors.success, fontWeight: 600 }}>Step 8 • Real World</span>
      <h2 style={{ fontSize: '22px', color: colors.textPrimary, margin: '8px 0 20px' }}>Why Orbital Shapes Matter</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
        {transferApps.map((app, i) => (
          <button
            key={i}
            onClick={() => {
              if (i === 0 || completedApps[i - 1]) {
                setActiveApp(i);
                if (!completedApps[i]) {
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }
              }
            }}
            style={{
              padding: '10px 16px',
              background: activeApp === i ? colors.success : colors.bgElevated,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 600,
              cursor: i === 0 || completedApps[i - 1] ? 'pointer' : 'not-allowed',
              opacity: i === 0 || completedApps[i - 1] ? 1 : 0.4,
              whiteSpace: 'nowrap',
              fontSize: '13px'
            }}
          >
            {app.icon} {completedApps[i] && '✓'}
          </button>
        ))}
      </div>

      <div style={{
        padding: '24px',
        background: colors.bgElevated,
        borderRadius: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '20px' }}>
          {transferApps[activeApp].icon} {transferApps[activeApp].title}
        </h3>
        <p style={{ color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
          {transferApps[activeApp].desc}
        </p>
      </div>

      {completedApps.every(Boolean) ? (
        <Button onClick={goNext}>Take the Test →</Button>
      ) : (
        <p style={{ color: colors.textMuted, textAlign: 'center' }}>
          Explore all 4 applications to unlock the test ({completedApps.filter(Boolean).length}/4)
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;

    return (
      <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ color: colors.textMuted }}>Question {currentQuestion + 1}/10</span>
          <span style={{ color: colors.success, fontWeight: 600 }}>Score: {testScore}</span>
        </div>

        <h2 style={{ fontSize: '18px', color: colors.textPrimary, marginBottom: '20px', lineHeight: 1.4 }}>
          {q.question}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
                  padding: '14px 18px',
                  background: showResult
                    ? isCorrect ? `${colors.success}20` : isSelected ? `${colors.error}20` : colors.bgElevated
                    : isSelected ? colors.primary : colors.bgElevated,
                  border: showResult && isCorrect ? `2px solid ${colors.success}` : showResult && isSelected && !isCorrect ? `2px solid ${colors.error}` : 'none',
                  borderRadius: '10px',
                  textAlign: 'left',
                  color: colors.textPrimary,
                  cursor: answered ? 'default' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {opt} {showResult && isCorrect && '✓'} {showResult && isSelected && !isCorrect && '✗'}
              </button>
            );
          })}
        </div>

        {answered && (
          <div style={{
            padding: '14px',
            background: `${colors.primary}15`,
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>{q.explanation}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentQuestion > 0 && (
            <Button variant="ghost" onClick={() => setCurrentQuestion(c => c - 1)}>← Back</Button>
          )}
          {currentQuestion < 9 ? (
            <Button onClick={() => setCurrentQuestion(c => c + 1)} disabled={!answered} style={{ flex: 1 }}>
              Next →
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!answered} style={{ flex: 1 }}>
              Finish →
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const passed = testScore >= 7;

    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: passed ? `${colors.success}20` : `${colors.error}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '48px'
        }}>
          {passed ? '🎓' : '📚'}
        </div>

        <h1 style={{ fontSize: '28px', color: colors.textPrimary, marginBottom: '12px' }}>
          {passed ? 'Mastery Achieved!' : 'Keep Practicing!'}
        </h1>

        <p style={{ fontSize: '22px', color: passed ? colors.success : colors.error, marginBottom: '24px' }}>
          {testScore}/10 ({testScore * 10}%)
        </p>

        <div style={{
          padding: '20px',
          background: colors.bgElevated,
          borderRadius: '12px',
          maxWidth: '400px',
          margin: '0 auto 24px',
          textAlign: 'left'
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>You learned:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Orbitals are probability clouds, not paths</li>
            <li>S = spherical, P = dumbbell shapes</li>
            <li>Nodal planes have zero probability</li>
            <li>Shapes determine molecular geometry</li>
            <li>Hybridization creates new orbital types</li>
          </ul>
        </div>

        <Button onClick={() => window.location.reload()}>
          Return to Dashboard
        </Button>
      </div>
    );
  };

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

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Explore',
    review: 'Review',
    twist_predict: 'Challenge',
    twist_play: 'Hybridization',
    twist_review: 'Summary',
    transfer: 'Applications',
    test: 'Test',
    mastery: 'Complete'
  };

  return (
    <div style={{
      height: '100%',
      background: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'auto'
    }}>
      {/* Progress */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: colors.bgSurface,
        padding: '10px 20px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{phaseLabels[phase]}</span>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{phaseOrder.indexOf(phase) + 1}/10</span>
        </div>
        <div style={{ height: '4px', background: colors.bgElevated, borderRadius: '2px' }}>
          <div style={{
            height: '100%',
            width: `${((phaseOrder.indexOf(phase) + 1) / 10) * 100}%`,
            background: `linear-gradient(90deg, ${colors.primary}, #3b82f6)`,
            borderRadius: '2px',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default MolecularOrbitalsRenderer;
