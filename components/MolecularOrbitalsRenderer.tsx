'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Billboard, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// MOLECULAR ORBITALS - REAL-WORLD DRUG-RECEPTOR BINDING SIMULATION
//
// Core Chemistry Concept: Frontier Molecular Orbital Theory
// - HOMO (Highest Occupied Molecular Orbital) of drug
// - LUMO (Lowest Unoccupied Molecular Orbital) of receptor
// - Binding occurs when these orbitals overlap
//
// Real-World Application: How aspirin works by binding to COX enzymes
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
// TYPES FOR QUANTUM CHEMISTRY
// ============================================================================

interface Atom {
  element: string;
  position: [number, number, number];
  color: string;
  radius: number;
}

interface Orbital {
  type: 's' | 'p' | 'd';
  center: [number, number, number];
  color: string;
  phase: number;
  label?: string;
}

interface BindingResult {
  overlap: number;
  energy: number;
  willBind: boolean;
  interactions: string[];
}

// ============================================================================
// 3D COMPONENTS - ATOMS AND ORBITALS
// ============================================================================

const AtomSphere: React.FC<{ atom: Atom; showLabel?: boolean }> = ({ atom, showLabel }) => {
  return (
    <group position={atom.position}>
      <Sphere args={[atom.radius, 32, 32]}>
        <meshStandardMaterial color={atom.color} metalness={0.3} roughness={0.7} />
      </Sphere>
      {showLabel && (
        <Billboard position={[0, atom.radius + 0.3, 0]}>
          <Html center>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'white',
              fontWeight: 600
            }}>
              {atom.element}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
};

// S Orbital - spherical electron cloud
const SOrbital: React.FC<{
  center: [number, number, number];
  color: string;
  scale?: number;
  opacity?: number;
  showElectron?: boolean;
}> = ({ center, color, scale = 1, opacity = 0.4, showElectron = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const electronRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      meshRef.current.scale.setScalar(scale * breathe);
    }
    if (electronRef.current && showElectron) {
      const t = state.clock.elapsedTime;
      const r = 0.6 * scale;
      electronRef.current.position.set(
        center[0] + r * Math.sin(t * 2) * Math.cos(t * 1.5),
        center[1] + r * Math.sin(t * 2) * Math.sin(t * 1.5),
        center[2] + r * Math.cos(t * 2)
      );
    }
  });

  return (
    <group>
      {/* Outer shell */}
      <mesh ref={meshRef} position={center}>
        <sphereGeometry args={[1.0 * scale, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity * 0.6}
          roughness={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner density */}
      <mesh position={center}>
        <sphereGeometry args={[0.5 * scale, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* Core */}
      <mesh position={center}>
        <sphereGeometry args={[0.2 * scale, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 1.5} />
      </mesh>
      {/* Electron particle */}
      {showElectron && (
        <mesh ref={electronRef}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" />
          <pointLight color="#22d3ee" intensity={0.5} distance={1} />
        </mesh>
      )}
    </group>
  );
};

// P Orbital - dumbbell shaped
const POrbital: React.FC<{
  center: [number, number, number];
  color: string;
  axis: 'x' | 'y' | 'z';
  scale?: number;
  opacity?: number;
  showNode?: boolean;
}> = ({ center, color, axis, scale = 1, opacity = 0.5, showNode = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotation: [number, number, number] = axis === 'x' ? [0, 0, Math.PI / 2] :
    axis === 'y' ? [0, 0, 0] : [Math.PI / 2, 0, 0];

  useFrame((state) => {
    if (groupRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      groupRef.current.scale.setScalar(breathe);
    }
  });

  // Use different shades for positive/negative phases
  const positiveColor = color;
  const negativeColor = new THREE.Color(color).offsetHSL(0.5, 0, -0.2).getStyle();

  return (
    <group ref={groupRef} position={center} rotation={rotation}>
      {/* Positive lobe */}
      <mesh position={[0, 0.7 * scale, 0]}>
        <sphereGeometry args={[0.5 * scale, 24, 24]} />
        <meshPhysicalMaterial color={positiveColor} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.65 * scale, 0]}>
        <sphereGeometry args={[0.25 * scale, 16, 16]} />
        <meshBasicMaterial color={positiveColor} transparent opacity={opacity * 1.3} />
      </mesh>
      {/* Negative lobe */}
      <mesh position={[0, -0.7 * scale, 0]}>
        <sphereGeometry args={[0.5 * scale, 24, 24]} />
        <meshPhysicalMaterial color={negativeColor} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, -0.65 * scale, 0]}>
        <sphereGeometry args={[0.25 * scale, 16, 16]} />
        <meshBasicMaterial color={negativeColor} transparent opacity={opacity * 1.3} />
      </mesh>
      {/* Nodal plane */}
      {showNode && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.8 * scale, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// D Orbital (simplified dz2)
const DOrbital: React.FC<{
  center: [number, number, number];
  color: string;
  scale?: number;
  opacity?: number;
}> = ({ center, color, scale = 1, opacity = 0.5 }) => {
  return (
    <group position={center}>
      {/* Dumbbell part */}
      <mesh position={[0, 0.8 * scale, 0]}>
        <sphereGeometry args={[0.4 * scale, 24, 24]} />
        <meshPhysicalMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, -0.8 * scale, 0]}>
        <sphereGeometry args={[0.4 * scale, 24, 24]} />
        <meshPhysicalMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* Donut/torus part */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6 * scale, 0.2 * scale, 16, 32]} />
        <meshPhysicalMaterial color={color} transparent opacity={opacity * 0.7} />
      </mesh>
    </group>
  );
};

// ============================================================================
// DRUG MOLECULE (Aspirin-like)
// ============================================================================

const DrugMolecule: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  showOrbitals: boolean;
  showLabels: boolean;
  highlight?: 'homo' | 'all' | 'none';
}> = ({ position, rotation, showOrbitals, showLabels, highlight = 'none' }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Simplified aspirin-like structure
  const atoms: Atom[] = useMemo(() => [
    // Benzene ring
    { element: 'C', position: [0, 0, 0], color: '#404040', radius: 0.3 },
    { element: 'C', position: [1.2, 0, 0], color: '#404040', radius: 0.3 },
    { element: 'C', position: [1.8, 1.0, 0], color: '#404040', radius: 0.3 },
    { element: 'C', position: [1.2, 2.0, 0], color: '#404040', radius: 0.3 },
    { element: 'C', position: [0, 2.0, 0], color: '#404040', radius: 0.3 },
    { element: 'C', position: [-0.6, 1.0, 0], color: '#404040', radius: 0.3 },
    // Functional groups
    { element: 'O', position: [-0.6, -0.7, 0], color: '#ff4444', radius: 0.28 },
    { element: 'O', position: [1.8, -0.8, 0], color: '#ff4444', radius: 0.28 },
    { element: 'C', position: [2.5, -1.5, 0], color: '#404040', radius: 0.3 },
    { element: 'O', position: [3.5, -1.5, 0], color: '#ff4444', radius: 0.28 },
  ], []);

  // Bonds between atoms
  const bonds: Array<[[number, number, number], [number, number, number]]> = useMemo(() => [
    [[0, 0, 0], [1.2, 0, 0]],
    [[1.2, 0, 0], [1.8, 1.0, 0]],
    [[1.8, 1.0, 0], [1.2, 2.0, 0]],
    [[1.2, 2.0, 0], [0, 2.0, 0]],
    [[0, 2.0, 0], [-0.6, 1.0, 0]],
    [[-0.6, 1.0, 0], [0, 0, 0]],
    [[0, 0, 0], [-0.6, -0.7, 0]],
    [[1.2, 0, 0], [1.8, -0.8, 0]],
    [[1.8, -0.8, 0], [2.5, -1.5, 0]],
    [[2.5, -1.5, 0], [3.5, -1.5, 0]],
  ], []);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Atoms */}
      {atoms.map((atom, i) => (
        <AtomSphere key={i} atom={atom} showLabel={showLabels && i < 3} />
      ))}

      {/* Bonds */}
      {bonds.map((bond, i) => (
        <Line
          key={i}
          points={bond}
          color="#666666"
          lineWidth={3}
        />
      ))}

      {/* HOMO - pi orbital above benzene ring */}
      {showOrbitals && (
        <group>
          <POrbital
            center={[0.6, 1.0, 0.5]}
            color={highlight === 'homo' || highlight === 'all' ? '#22c55e' : '#3b82f6'}
            axis="z"
            scale={0.8}
            opacity={highlight === 'homo' ? 0.7 : 0.4}
          />
          {(highlight === 'homo' || highlight === 'all') && showLabels && (
            <Billboard position={[0.6, 2.3, 0.5]}>
              <Html center>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.95)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '12px' }}>
                    HOMO
                  </div>
                  <div style={{ color: '#dcfce7', fontSize: '10px' }}>
                    Electrons to donate
                  </div>
                </div>
              </Html>
            </Billboard>
          )}
        </group>
      )}

      {/* Drug label */}
      {showLabels && (
        <Billboard position={[1.5, 3.5, 0]}>
          <Html center>
            <div style={{
              background: 'rgba(59, 130, 246, 0.9)',
              padding: '8px 14px',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                ASPIRIN
              </div>
              <div style={{ color: '#bfdbfe', fontSize: '11px' }}>
                Drug Molecule
              </div>
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
};

// ============================================================================
// RECEPTOR (Enzyme Active Site)
// ============================================================================

const ReceptorSite: React.FC<{
  showOrbitals: boolean;
  showLabels: boolean;
  highlight?: 'lumo' | 'all' | 'none';
}> = ({ showOrbitals, showLabels, highlight = 'none' }) => {
  // Simplified COX-2 active site
  const atoms: Atom[] = useMemo(() => [
    // Binding pocket
    { element: 'N', position: [3.0, 0.5, 1.0], color: '#4444ff', radius: 0.35 },
    { element: 'O', position: [-2.5, -0.5, 0.5], color: '#ff4444', radius: 0.32 },
    { element: 'C', position: [0, 3.5, 0], color: '#404040', radius: 0.35 },
    { element: 'C', position: [0, -3.5, 0], color: '#404040', radius: 0.35 },
    { element: 'N', position: [-2.0, 2.5, -0.5], color: '#4444ff', radius: 0.35 },
    { element: 'S', position: [-4.0, 0, 0], color: '#ffcc00', radius: 0.4 },
    // Catalytic center
    { element: 'Fe', position: [4.5, 1.5, 0], color: '#cc6600', radius: 0.45 },
  ], []);

  // Pocket surface (simplified as curves)
  const pocketPoints = useMemo(() => {
    const points: [number, number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      const r = 3.5 + Math.sin(t * 3) * 0.5;
      points.push([r * Math.cos(t), r * Math.sin(t), Math.sin(t * 2) * 0.3]);
    }
    return points;
  }, []);

  return (
    <group>
      {/* Pocket outline */}
      <Line points={pocketPoints} color="#475569" lineWidth={2} dashed dashSize={0.2} gapSize={0.1} />

      {/* Atoms */}
      {atoms.map((atom, i) => (
        <AtomSphere key={i} atom={atom} showLabel={showLabels} />
      ))}

      {/* LUMO - empty d-orbital on iron */}
      {showOrbitals && (
        <group>
          <DOrbital
            center={[4.5, 1.5, 0]}
            color={highlight === 'lumo' || highlight === 'all' ? '#ef4444' : '#8b5cf6'}
            scale={1.2}
            opacity={highlight === 'lumo' ? 0.6 : 0.3}
          />
          {(highlight === 'lumo' || highlight === 'all') && showLabels && (
            <Billboard position={[4.5, 3.5, 0]}>
              <Html center>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.95)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '12px' }}>
                    LUMO
                  </div>
                  <div style={{ color: '#fecaca', fontSize: '10px' }}>
                    Accepts electrons
                  </div>
                </div>
              </Html>
            </Billboard>
          )}
        </group>
      )}

      {/* Receptor label */}
      {showLabels && (
        <Billboard position={[0, -5, 0]}>
          <Html center>
            <div style={{
              background: 'rgba(139, 92, 246, 0.9)',
              padding: '8px 14px',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                COX-2 ENZYME
              </div>
              <div style={{ color: '#ddd6fe', fontSize: '11px' }}>
                Receptor Active Site
              </div>
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
};

// ============================================================================
// BINDING VISUALIZATION
// ============================================================================

const BindingVisualization: React.FC<{
  drugPosition: [number, number, number];
  drugRotation: [number, number, number];
  showLabels: boolean;
  bindingStrength: number;
}> = ({ drugPosition, drugRotation, showLabels, bindingStrength }) => {
  const lineRef = useRef<THREE.Group>(null);

  // Animated binding line when close enough
  const isBinding = bindingStrength > 0.3;

  useFrame((state) => {
    if (lineRef.current && isBinding) {
      lineRef.current.visible = Math.sin(state.clock.elapsedTime * 5) > 0;
    }
  });

  // Calculate drug HOMO position after transformation
  const homoWorldPos: [number, number, number] = [
    drugPosition[0] + 0.6,
    drugPosition[1] + 1.0,
    drugPosition[2] + 0.5
  ];

  // Receptor LUMO position
  const lumoPos: [number, number, number] = [4.5, 1.5, 0];

  return (
    <group ref={lineRef}>
      {isBinding && (
        <>
          {/* Orbital overlap indicator */}
          <Line
            points={[homoWorldPos, lumoPos]}
            color="#22c55e"
            lineWidth={3}
            dashed
            dashSize={0.3}
            gapSize={0.15}
          />

          {/* Binding energy indicator */}
          {showLabels && (
            <Billboard position={[(homoWorldPos[0] + lumoPos[0]) / 2, (homoWorldPos[1] + lumoPos[1]) / 2 + 1, 0]}>
              <Html center>
                <div style={{
                  background: bindingStrength > 0.7 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(251, 191, 36, 0.95)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>
                    {bindingStrength > 0.7 ? 'STRONG BINDING' : 'PARTIAL OVERLAP'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                    Overlap: {Math.round(bindingStrength * 100)}%
                  </div>
                </div>
              </Html>
            </Billboard>
          )}
        </>
      )}
    </group>
  );
};

// ============================================================================
// MAIN 3D SCENE
// ============================================================================

const Scene3D: React.FC<{
  drugPosition: [number, number, number];
  drugRotation: [number, number, number];
  showDrugOrbitals: boolean;
  showReceptorOrbitals: boolean;
  showLabels: boolean;
  highlightMode: 'none' | 'homo' | 'lumo' | 'both';
  bindingStrength: number;
}> = ({
  drugPosition,
  drugRotation,
  showDrugOrbitals,
  showReceptorOrbitals,
  showLabels,
  highlightMode,
  bindingStrength
}) => {
    const { camera } = useThree();

    useEffect(() => {
      camera.position.set(0, 5, 15);
      camera.lookAt(0, 0, 0);
    }, [camera]);

    return (
      <>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* Receptor (enzyme) */}
        <ReceptorSite
          showOrbitals={showReceptorOrbitals}
          showLabels={showLabels}
          highlight={highlightMode === 'lumo' || highlightMode === 'both' ? 'lumo' : 'none'}
        />

        {/* Drug molecule */}
        <DrugMolecule
          position={drugPosition}
          rotation={drugRotation}
          showOrbitals={showDrugOrbitals}
          showLabels={showLabels}
          highlight={highlightMode === 'homo' || highlightMode === 'both' ? 'homo' : 'none'}
        />

        {/* Binding visualization */}
        <BindingVisualization
          drugPosition={drugPosition}
          drugRotation={drugRotation}
          showLabels={showLabels}
          bindingStrength={bindingStrength}
        />

        <OrbitControls
          enablePan={true}
          minDistance={5}
          maxDistance={25}
          autoRotate={false}
        />
      </>
    );
  };

// ============================================================================
// CONTROL PANEL
// ============================================================================

const ControlPanel: React.FC<{
  drugPosition: [number, number, number];
  drugRotation: [number, number, number];
  onPositionChange: (pos: [number, number, number]) => void;
  onRotationChange: (rot: [number, number, number]) => void;
  bindingStrength: number;
  isMobile: boolean;
}> = ({ drugPosition, drugRotation, onPositionChange, onRotationChange, bindingStrength, isMobile }) => {
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    appearance: 'none',
    background: '#1e293b',
    cursor: 'pointer'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 600,
    marginBottom: '4px',
    display: 'flex',
    justifyContent: 'space-between'
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: isMobile ? '10px' : '20px',
      left: isMobile ? '10px' : '20px',
      right: isMobile ? '10px' : 'auto',
      width: isMobile ? 'auto' : '280px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
      border: '1px solid #334155',
      zIndex: 100
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 700,
        color: '#f8fafc',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>🎮</span>
        DRUG POSITION
      </div>

      {/* X Position */}
      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>
          <span>X Position</span>
          <span>{drugPosition[0].toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.2"
          value={drugPosition[0]}
          onChange={(e) => onPositionChange([parseFloat(e.target.value), drugPosition[1], drugPosition[2]])}
          style={sliderStyle}
        />
      </div>

      {/* Y Position */}
      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>
          <span>Y Position</span>
          <span>{drugPosition[1].toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.2"
          value={drugPosition[1]}
          onChange={(e) => onPositionChange([drugPosition[0], parseFloat(e.target.value), drugPosition[2]])}
          style={sliderStyle}
        />
      </div>

      {/* Z Position */}
      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>
          <span>Z Position (Depth)</span>
          <span>{drugPosition[2].toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.2"
          value={drugPosition[2]}
          onChange={(e) => onPositionChange([drugPosition[0], drugPosition[1], parseFloat(e.target.value)])}
          style={sliderStyle}
        />
      </div>

      {/* Rotation */}
      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>
          <span>Rotation</span>
          <span>{Math.round(drugRotation[2] * 180 / Math.PI)}°</span>
        </div>
        <input
          type="range"
          min="0"
          max={Math.PI * 2}
          step="0.1"
          value={drugRotation[2]}
          onChange={(e) => onRotationChange([0, 0, parseFloat(e.target.value)])}
          style={sliderStyle}
        />
      </div>

      {/* Binding indicator */}
      <div style={{
        marginTop: '16px',
        padding: '10px',
        borderRadius: '8px',
        background: bindingStrength > 0.7 ? 'rgba(34, 197, 94, 0.2)' :
          bindingStrength > 0.3 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        border: `1px solid ${bindingStrength > 0.7 ? '#22c55e' : bindingStrength > 0.3 ? '#f59e0b' : '#ef4444'}`
      }}>
        <div style={{
          fontSize: '11px',
          color: bindingStrength > 0.7 ? '#4ade80' : bindingStrength > 0.3 ? '#fbbf24' : '#f87171',
          fontWeight: 600,
          marginBottom: '4px'
        }}>
          BINDING STRENGTH
        </div>
        <div style={{
          height: '8px',
          background: '#0f172a',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${bindingStrength * 100}%`,
            height: '100%',
            background: bindingStrength > 0.7 ? '#22c55e' : bindingStrength > 0.3 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.3s, background 0.3s'
          }} />
        </div>
        <div style={{
          fontSize: '10px',
          color: '#64748b',
          marginTop: '6px'
        }}>
          {bindingStrength > 0.7 ? 'Drug will block enzyme!' :
            bindingStrength > 0.3 ? 'Partial interaction...' : 'No binding - adjust position'}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MolecularOrbitalsRenderer: React.FC<MolecularOrbitalsRendererProps> = ({ onGameEvent }) => {
  type Phase = 'intro' | 'learn_orbitals' | 'learn_binding' | 'practice' | 'challenge' | 'applications' | 'test' | 'complete';
  const phaseOrder: Phase[] = ['intro', 'learn_orbitals', 'learn_binding', 'practice', 'challenge', 'applications', 'test', 'complete'];

  const [phase, setPhase] = useState<Phase>('intro');
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [drugPosition, setDrugPosition] = useState<[number, number, number]>([-6, 0, 0]);
  const [drugRotation, setDrugRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [showDrugOrbitals, setShowDrugOrbitals] = useState(true);
  const [showReceptorOrbitals, setShowReceptorOrbitals] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [highlightMode, setHighlightMode] = useState<'none' | 'homo' | 'lumo' | 'both'>('both');

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(8).fill(null));
  const [testScore, setTestScore] = useState(0);

  const isNavigating = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Calculate binding strength based on drug position
  const bindingStrength = useMemo(() => {
    // Optimal position is around [1, 0, 0] with rotation aligned
    const optimalX = 1;
    const optimalY = 0;
    const optimalZ = 0;

    const dx = drugPosition[0] - optimalX;
    const dy = drugPosition[1] - optimalY;
    const dz = drugPosition[2] - optimalZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Gaussian falloff
    const positionScore = Math.exp(-distance * distance / 8);

    // Rotation matters too
    const rotationScore = Math.abs(Math.cos(drugRotation[2]));

    return Math.min(1, positionScore * rotationScore);
  }, [drugPosition, drugRotation]);

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
      gameTitle: 'Drug-Receptor Binding',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

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
  }, [phase, goToPhase]);

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
        ...style
      }}
    >
      {children}
    </button>
  );

  // 3D Viewer component
  const render3DViewer = (height: string = '100%') => (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <Canvas camera={{ position: [0, 5, 15], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene3D
            drugPosition={drugPosition}
            drugRotation={drugRotation}
            showDrugOrbitals={showDrugOrbitals}
            showReceptorOrbitals={showReceptorOrbitals}
            showLabels={showLabels}
            highlightMode={highlightMode}
            bindingStrength={bindingStrength}
          />
        </Suspense>
      </Canvas>

      {/* Controls overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => setShowLabels(!showLabels)}
          style={{
            padding: '8px 12px',
            background: showLabels ? colors.primary : colors.bgElevated,
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Labels {showLabels ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setShowDrugOrbitals(!showDrugOrbitals)}
          style={{
            padding: '8px 12px',
            background: showDrugOrbitals ? '#22c55e' : colors.bgElevated,
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Drug HOMO
        </button>
        <button
          onClick={() => setShowReceptorOrbitals(!showReceptorOrbitals)}
          style={{
            padding: '8px 12px',
            background: showReceptorOrbitals ? '#ef4444' : colors.bgElevated,
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Receptor LUMO
        </button>
      </div>

      {/* Instruction hint */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.7)',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        color: '#94a3b8'
      }}>
        Drag to rotate | Scroll to zoom
      </div>
    </div>
  );

  // Test questions
  const testQuestions = [
    {
      question: "What does HOMO stand for?",
      options: ["Highest Occupied Molecular Orbital", "High Output Molecular Object", "Horizontal Orbital Motion", "Hydrogen Oxygen Molecular Orbital"],
      correct: 0
    },
    {
      question: "Why does a drug need to 'fit' a receptor?",
      options: ["For aesthetic reasons", "So the orbitals can overlap", "To make the drug colorful", "To increase drug size"],
      correct: 1
    },
    {
      question: "What happens when drug HOMO overlaps with receptor LUMO?",
      options: ["Nothing", "Electrons are shared, forming a bond", "The drug explodes", "The receptor dissolves"],
      correct: 1
    },
    {
      question: "How does aspirin work?",
      options: ["It heats up the body", "It blocks COX enzyme by orbital overlap", "It produces more blood", "It makes you sleep"],
      correct: 1
    },
    {
      question: "Why are orbital shapes important in drug design?",
      options: ["They're not important", "They determine if drug can bind to target", "They affect drug color", "They make drugs taste better"],
      correct: 1
    },
    {
      question: "What is a LUMO?",
      options: ["A type of lamp", "Lowest Unoccupied Molecular Orbital - accepts electrons", "A drug brand", "A receptor type"],
      correct: 1
    },
    {
      question: "If a drug doesn't fit the receptor binding site, what happens?",
      options: ["It binds anyway", "No therapeutic effect - drug doesn't work", "The receptor changes shape", "The drug becomes toxic"],
      correct: 1
    },
    {
      question: "What real-world application uses orbital overlap?",
      options: ["Making ice cream", "Drug design, solar cells, catalysis", "Building bridges", "Painting walls"],
      correct: 1
    }
  ];

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  const renderIntro = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{
        padding: '8px 20px',
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase' }}>
          Real-World Chemistry Simulation
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '32px' : '48px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '16px',
        lineHeight: 1.2
      }}>
        How Do Drugs<br />Find Their Targets?
      </h1>

      <p style={{
        fontSize: '18px',
        color: colors.textSecondary,
        maxWidth: '600px',
        marginBottom: '32px',
        lineHeight: 1.6
      }}>
        Discover the quantum chemistry behind medicine. Learn how <strong>molecular orbital shapes</strong> determine
        whether a drug can bind to its target and produce a therapeutic effect.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '32px',
        maxWidth: '700px'
      }}>
        {[
          { icon: '🧬', title: 'Orbital Theory', desc: 'Why shapes matter' },
          { icon: '💊', title: 'Drug Design', desc: 'How medicines work' },
          { icon: '🎮', title: 'Interactive', desc: 'Dock a drug yourself' }
        ].map((item, i) => (
          <div key={i} style={{
            padding: '16px',
            background: colors.bgElevated,
            borderRadius: '12px',
            border: `1px solid ${colors.bgSurface}`
          }}>
            <span style={{ fontSize: '28px' }}>{item.icon}</span>
            <div style={{ fontWeight: 600, color: colors.textPrimary, marginTop: '8px' }}>{item.title}</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <Button onClick={goNext}>
        Start Learning
      </Button>
    </div>
  );

  const renderLearnOrbitals = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Left panel - explanation */}
      <div style={{
        width: isMobile ? '100%' : '40%',
        padding: isMobile ? '16px' : '24px',
        overflowY: 'auto',
        background: colors.bgSurface,
        borderRight: isMobile ? 'none' : `1px solid ${colors.bgElevated}`
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>Step 1 of 7</span>
        <h2 style={{ fontSize: '24px', color: colors.textPrimary, margin: '8px 0 16px' }}>
          Understanding Molecular Orbitals
        </h2>

        <div style={{
          padding: '16px',
          background: `${colors.success}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.success}30`,
          marginBottom: '20px'
        }}>
          <div style={{ fontWeight: 600, color: colors.success, marginBottom: '8px' }}>
            Core Concept
          </div>
          <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Electrons don't orbit like planets. They exist in <strong>probability clouds</strong> called
            orbitals. The <strong>shape</strong> of these clouds determines how molecules interact.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', color: colors.textPrimary, marginBottom: '12px' }}>
            Two Key Orbitals:
          </h3>

          <div style={{
            padding: '14px',
            background: colors.bgElevated,
            borderRadius: '10px',
            marginBottom: '10px',
            borderLeft: `4px solid #22c55e`
          }}>
            <div style={{ fontWeight: 600, color: '#22c55e' }}>HOMO</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>
              Highest Occupied Molecular Orbital — contains electrons ready to <strong>donate</strong>
            </div>
          </div>

          <div style={{
            padding: '14px',
            background: colors.bgElevated,
            borderRadius: '10px',
            borderLeft: `4px solid #ef4444`
          }}>
            <div style={{ fontWeight: 600, color: '#ef4444' }}>LUMO</div>
            <div style={{ fontSize: '13px', color: colors.textMuted }}>
              Lowest Unoccupied Molecular Orbital — empty, can <strong>accept</strong> electrons
            </div>
          </div>
        </div>

        <Button onClick={goNext} style={{ width: '100%' }}>
          Next: How Binding Works →
        </Button>
      </div>

      {/* Right panel - 3D view */}
      <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? '300px' : 'auto' }}>
        {render3DViewer()}
      </div>
    </div>
  );

  const renderLearnBinding = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{
        width: isMobile ? '100%' : '40%',
        padding: isMobile ? '16px' : '24px',
        overflowY: 'auto',
        background: colors.bgSurface
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>Step 2 of 7</span>
        <h2 style={{ fontSize: '24px', color: colors.textPrimary, margin: '8px 0 16px' }}>
          Drug-Receptor Binding
        </h2>

        <div style={{
          padding: '16px',
          background: `${colors.warning}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.warning}30`,
          marginBottom: '20px'
        }}>
          <div style={{ fontWeight: 600, color: colors.warning, marginBottom: '8px' }}>
            The Key Insight
          </div>
          <p style={{ color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            A drug works by <strong>fitting into a receptor</strong> like a key in a lock.
            But it's not just about shape — the <strong>orbitals must overlap</strong> for
            electrons to be shared and a bond to form.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', color: colors.textPrimary, marginBottom: '12px' }}>
            What You See:
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', background: '#3b82f6', borderRadius: '4px' }} />
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                <strong>Aspirin</strong> — drug molecule with HOMO (green)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', background: '#8b5cf6', borderRadius: '4px' }} />
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                <strong>COX-2</strong> — enzyme receptor with LUMO (red)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', background: '#22c55e', borderRadius: '4px' }} />
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                <strong>Green line</strong> — orbital overlap (binding!)
              </span>
            </div>
          </div>
        </div>

        <Button onClick={goNext} style={{ width: '100%' }}>
          Try It Yourself →
        </Button>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? '300px' : 'auto' }}>
        {render3DViewer()}
      </div>
    </div>
  );

  const renderPractice = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: colors.bgSurface,
        borderBottom: `1px solid ${colors.bgElevated}`
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>Step 3 of 7 • Interactive</span>
        <h2 style={{ fontSize: '18px', color: colors.textPrimary, margin: '4px 0 0' }}>
          Dock the Drug into the Receptor
        </h2>
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>
          Use the sliders to position aspirin so its HOMO overlaps with the receptor's LUMO
        </p>
      </div>

      {/* 3D View */}
      <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
        {render3DViewer()}
        <ControlPanel
          drugPosition={drugPosition}
          drugRotation={drugRotation}
          onPositionChange={setDrugPosition}
          onRotationChange={setDrugRotation}
          bindingStrength={bindingStrength}
          isMobile={isMobile}
        />
      </div>

      {/* Success check */}
      <div style={{
        padding: '16px 20px',
        background: colors.bgSurface,
        borderTop: `1px solid ${colors.bgElevated}`
      }}>
        {bindingStrength > 0.7 ? (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              padding: '12px 16px',
              background: `${colors.success}20`,
              borderRadius: '10px',
              flex: 1
            }}>
              <div style={{ fontWeight: 600, color: colors.success }}>
                Excellent! The drug is bound!
              </div>
              <div style={{ fontSize: '13px', color: colors.textMuted }}>
                The HOMO-LUMO overlap creates a stable interaction that blocks the enzyme.
              </div>
            </div>
            <Button onClick={goNext}>Continue →</Button>
          </div>
        ) : (
          <div style={{ color: colors.textMuted, textAlign: 'center' }}>
            Adjust the drug position until binding strength reaches 70%+
          </div>
        )}
      </div>
    </div>
  );

  const renderChallenge = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 20px',
        background: colors.bgSurface,
        borderBottom: `1px solid ${colors.bgElevated}`
      }}>
        <span style={{ fontSize: '11px', color: colors.warning, fontWeight: 600 }}>Step 4 of 7 • Challenge</span>
        <h2 style={{ fontSize: '18px', color: colors.textPrimary, margin: '4px 0 0' }}>
          Why Can't Just Any Molecule Bind?
        </h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{
          width: isMobile ? '100%' : '45%',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            padding: '16px',
            background: colors.bgElevated,
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '16px' }}>
              Three Requirements for Binding:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>1️⃣</span>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary }}>Shape Fit</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>
                    Drug must physically fit in the binding pocket
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>2️⃣</span>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary }}>Orbital Alignment</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>
                    HOMO and LUMO must be positioned to overlap
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>3️⃣</span>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary }}>Energy Match</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>
                    Orbital energies must be compatible for electron sharing
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: `${colors.primary}15`,
            borderRadius: '12px',
            border: `1px solid ${colors.primary}30`
          }}>
            <div style={{ fontWeight: 600, color: colors.primary, marginBottom: '8px' }}>
              This is Why Drug Design is Hard
            </div>
            <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              Finding molecules that satisfy all three requirements takes years of research.
              Understanding orbital theory helps chemists design better drugs faster.
            </p>
          </div>

          <Button onClick={goNext} style={{ width: '100%', marginTop: '20px' }}>
            See Real Applications →
          </Button>
        </div>

        <div style={{ flex: 1, position: 'relative', minHeight: isMobile ? '300px' : 'auto' }}>
          {render3DViewer()}
        </div>
      </div>
    </div>
  );

  const renderApplications = () => (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: isMobile ? '20px' : '40px'
    }}>
      <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>Step 5 of 7</span>
      <h2 style={{ fontSize: '28px', color: colors.textPrimary, margin: '8px 0 24px' }}>
        Real-World Applications
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          {
            icon: '💊',
            title: 'Drug Discovery',
            color: '#3b82f6',
            examples: ['Aspirin blocks COX enzymes', 'HIV drugs fit protease active sites', 'Cancer drugs target specific proteins'],
            key: 'Orbital shapes determine if a drug will work'
          },
          {
            icon: '☀️',
            title: 'Solar Cells',
            color: '#f59e0b',
            examples: ['HOMO-LUMO gap = absorbed light color', 'Organic photovoltaics', 'Dye-sensitized cells'],
            key: 'Tuning orbitals harvests more sunlight'
          },
          {
            icon: '🧪',
            title: 'Catalysis',
            color: '#22c55e',
            examples: ['Car catalytic converters', 'Industrial chemical synthesis', 'Enzyme engineering'],
            key: 'd-orbitals enable bond breaking/forming'
          },
          {
            icon: '💻',
            title: 'Electronics',
            color: '#8b5cf6',
            examples: ['Semiconductor band gaps', 'OLED displays', 'Quantum computers'],
            key: 'Orbital overlap creates conductivity'
          }
        ].map((app, i) => (
          <div key={i} style={{
            padding: '20px',
            background: colors.bgElevated,
            borderRadius: '16px',
            borderTop: `4px solid ${app.color}`
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{app.icon}</div>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>{app.title}</h3>
            <ul style={{ margin: '0 0 16px', paddingLeft: '20px' }}>
              {app.examples.map((ex, j) => (
                <li key={j} style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '6px' }}>
                  {ex}
                </li>
              ))}
            </ul>
            <div style={{
              padding: '10px',
              background: `${app.color}20`,
              borderRadius: '8px',
              fontSize: '13px',
              color: app.color,
              fontWeight: 600
            }}>
              Key: {app.key}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={goNext}>
        Take the Test →
      </Button>
    </div>
  );

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;

    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '20px' : '40px',
        maxWidth: '700px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ color: colors.textMuted }}>Question {currentQuestion + 1}/{testQuestions.length}</span>
          <span style={{ color: colors.success, fontWeight: 600 }}>Score: {testScore}</span>
        </div>

        <h2 style={{ fontSize: '20px', color: colors.textPrimary, marginBottom: '24px', lineHeight: 1.4 }}>
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
                  padding: '16px 20px',
                  background: showResult
                    ? isCorrect ? `${colors.success}20` : isSelected ? `${colors.error}20` : colors.bgElevated
                    : isSelected ? colors.primary : colors.bgElevated,
                  border: showResult && isCorrect ? `2px solid ${colors.success}` :
                    showResult && isSelected && !isCorrect ? `2px solid ${colors.error}` : 'none',
                  borderRadius: '12px',
                  textAlign: 'left',
                  color: colors.textPrimary,
                  cursor: answered ? 'default' : 'pointer',
                  fontSize: '15px'
                }}
              >
                {opt} {showResult && isCorrect && '✓'} {showResult && isSelected && !isCorrect && '✗'}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
          {currentQuestion > 0 && (
            <Button variant="ghost" onClick={() => setCurrentQuestion(c => c - 1)}>← Back</Button>
          )}
          {currentQuestion < testQuestions.length - 1 ? (
            <Button onClick={() => setCurrentQuestion(c => c + 1)} disabled={!answered} style={{ flex: 1 }}>
              Next →
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!answered} style={{ flex: 1 }}>
              See Results →
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderComplete = () => {
    const passed = testScore >= 6;

    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: passed ? `${colors.success}20` : `${colors.warning}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '48px'
        }}>
          {passed ? '🎓' : '📚'}
        </div>

        <h1 style={{ fontSize: '32px', color: colors.textPrimary, marginBottom: '12px' }}>
          {passed ? 'Mastery Achieved!' : 'Keep Learning!'}
        </h1>

        <p style={{ fontSize: '24px', color: passed ? colors.success : colors.warning, marginBottom: '32px' }}>
          {testScore}/{testQuestions.length} ({Math.round(testScore / testQuestions.length * 100)}%)
        </p>

        <div style={{
          padding: '24px',
          background: colors.bgElevated,
          borderRadius: '16px',
          maxWidth: '500px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '16px' }}>What You Learned:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>HOMO donates electrons, LUMO accepts them</li>
            <li>Drug binding requires orbital overlap</li>
            <li>Shape complementarity is essential</li>
            <li>Orbital theory enables drug design</li>
            <li>Applications: medicine, solar cells, catalysis</li>
          </ul>
        </div>

        <Button onClick={() => window.location.reload()}>
          Return to Dashboard
        </Button>
      </div>
    );
  };

  // Render current phase
  const renderContent = () => {
    switch (phase) {
      case 'intro': return renderIntro();
      case 'learn_orbitals': return renderLearnOrbitals();
      case 'learn_binding': return renderLearnBinding();
      case 'practice': return renderPractice();
      case 'challenge': return renderChallenge();
      case 'applications': return renderApplications();
      case 'test': return renderTest();
      case 'complete': return renderComplete();
      default: return renderIntro();
    }
  };

  const phaseLabels: Record<Phase, string> = {
    intro: 'Introduction',
    learn_orbitals: 'Orbital Theory',
    learn_binding: 'Binding Mechanism',
    practice: 'Dock the Drug',
    challenge: 'Why It Matters',
    applications: 'Real World',
    test: 'Knowledge Test',
    complete: 'Complete'
  };

  return (
    <div style={{
      height: '100%',
      background: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Progress bar */}
      <div style={{
        background: colors.bgSurface,
        padding: '10px 20px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{phaseLabels[phase]}</span>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{phaseOrder.indexOf(phase) + 1}/{phaseOrder.length}</span>
        </div>
        <div style={{ height: '4px', background: colors.bgElevated, borderRadius: '2px' }}>
          <div style={{
            height: '100%',
            width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
            background: `linear-gradient(90deg, ${colors.primary}, #3b82f6)`,
            borderRadius: '2px',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default MolecularOrbitalsRenderer;
