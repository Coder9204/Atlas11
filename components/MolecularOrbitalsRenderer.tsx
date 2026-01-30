'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Billboard, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// MOLECULAR ORBITALS - 10-PHASE LEARNING EXPERIENCE
// Physics: Molecular Orbital Theory, LCAO, Bonding/Antibonding, Paramagnetism
// Real-world applications: MRI, LEDs, Solar Cells, Drug Design
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  connection: string;
  examples: string[];
  color: string;
}

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
  onPhaseComplete?: (phase: string) => void;
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
// 3D COMPONENTS - ATOMS AND ORBITALS
// ============================================================================

// S Orbital - spherical electron cloud
const SOrbital: React.FC<{
  center: [number, number, number];
  color: string;
  scale?: number;
  opacity?: number;
  phase?: 'positive' | 'negative';
}> = ({ center, color, scale = 1, opacity = 0.5, phase = 'positive' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const displayColor = phase === 'negative' ? new THREE.Color(color).offsetHSL(0.5, 0, 0).getStyle() : color;

  useFrame((state) => {
    if (meshRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      meshRef.current.scale.setScalar(scale * breathe);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={center}>
        <sphereGeometry args={[1.0 * scale, 32, 32]} />
        <meshPhysicalMaterial
          color={displayColor}
          transparent
          opacity={opacity * 0.6}
          roughness={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={center}>
        <sphereGeometry args={[0.5 * scale, 24, 24]} />
        <meshBasicMaterial color={displayColor} transparent opacity={opacity} />
      </mesh>
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
}> = ({ center, color, axis, scale = 1, opacity = 0.5 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotation: [number, number, number] = axis === 'x' ? [0, 0, Math.PI / 2] :
    axis === 'y' ? [0, 0, 0] : [Math.PI / 2, 0, 0];

  useFrame((state) => {
    if (groupRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      groupRef.current.scale.setScalar(breathe);
    }
  });

  const positiveColor = color;
  const negativeColor = new THREE.Color(color).offsetHSL(0.5, 0, -0.2).getStyle();

  return (
    <group ref={groupRef} position={center} rotation={rotation}>
      <mesh position={[0, 0.7 * scale, 0]}>
        <sphereGeometry args={[0.5 * scale, 24, 24]} />
        <meshPhysicalMaterial color={positiveColor} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, -0.7 * scale, 0]}>
        <sphereGeometry args={[0.5 * scale, 24, 24]} />
        <meshPhysicalMaterial color={negativeColor} transparent opacity={opacity} />
      </mesh>
    </group>
  );
};

// Bonding/Antibonding Molecular Orbital visualization
const MolecularOrbitalDiagram: React.FC<{
  showBonding: boolean;
  showAntibonding: boolean;
  separation: number;
}> = ({ showBonding, showAntibonding, separation }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Left atom */}
      <Sphere args={[0.3, 32, 32]} position={[-separation, 0, 0]}>
        <meshStandardMaterial color="#666666" />
      </Sphere>

      {/* Right atom */}
      <Sphere args={[0.3, 32, 32]} position={[separation, 0, 0]}>
        <meshStandardMaterial color="#666666" />
      </Sphere>

      {/* Bonding orbital - constructive overlap */}
      {showBonding && (
        <group position={[0, -1.5, 0]}>
          <SOrbital center={[-separation * 0.5, 0, 0]} color="#22c55e" scale={0.8} opacity={0.6} phase="positive" />
          <SOrbital center={[separation * 0.5, 0, 0]} color="#22c55e" scale={0.8} opacity={0.6} phase="positive" />
          <Billboard position={[0, 1.2, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(34, 197, 94, 0.9)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'white',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                Bonding (sigma)
              </div>
            </Html>
          </Billboard>
        </group>
      )}

      {/* Antibonding orbital - destructive overlap */}
      {showAntibonding && (
        <group position={[0, 1.5, 0]}>
          <SOrbital center={[-separation * 0.5, 0, 0]} color="#ef4444" scale={0.8} opacity={0.6} phase="positive" />
          <SOrbital center={[separation * 0.5, 0, 0]} color="#ef4444" scale={0.8} opacity={0.6} phase="negative" />
          <Billboard position={[0, 1.2, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(239, 68, 68, 0.9)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'white',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                Antibonding (sigma*)
              </div>
            </Html>
          </Billboard>
        </group>
      )}
    </group>
  );
};

// O2 vs N2 Electron Configuration Visualization
const DiatomicMolecule: React.FC<{
  molecule: 'O2' | 'N2';
  showElectrons: boolean;
}> = ({ molecule, showElectrons }) => {
  const groupRef = useRef<THREE.Group>(null);

  // O2: 16 electrons, 2 unpaired in pi* (paramagnetic)
  // N2: 14 electrons, all paired (diamagnetic)
  const isO2 = molecule === 'O2';

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Atoms */}
      <Sphere args={[0.4, 32, 32]} position={[-1, 0, 0]}>
        <meshStandardMaterial color={isO2 ? '#ff6666' : '#6666ff'} />
      </Sphere>
      <Sphere args={[0.4, 32, 32]} position={[1, 0, 0]}>
        <meshStandardMaterial color={isO2 ? '#ff6666' : '#6666ff'} />
      </Sphere>

      {/* Bond */}
      <Line
        points={[[-0.6, 0, 0], [0.6, 0, 0]]}
        color="#888888"
        lineWidth={isO2 ? 4 : 6}
      />

      {/* Electron visualization for O2 */}
      {showElectrons && isO2 && (
        <>
          {/* Unpaired electrons in pi* orbitals - shown as small spheres */}
          <Sphere args={[0.12, 16, 16]} position={[0, 0.8, 0.4]}>
            <meshBasicMaterial color="#ffff00" />
            <pointLight color="#ffff00" intensity={0.5} distance={1} />
          </Sphere>
          <Sphere args={[0.12, 16, 16]} position={[0, 0.8, -0.4]}>
            <meshBasicMaterial color="#ffff00" />
            <pointLight color="#ffff00" intensity={0.5} distance={1} />
          </Sphere>
          <Billboard position={[0, 1.5, 0]}>
            <Html center>
              <div style={{
                background: 'rgba(255, 200, 0, 0.9)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#333',
                fontWeight: 600
              }}>
                2 unpaired e- (paramagnetic)
              </div>
            </Html>
          </Billboard>
        </>
      )}

      {/* Electron visualization for N2 */}
      {showElectrons && !isO2 && (
        <Billboard position={[0, 1.2, 0]}>
          <Html center>
            <div style={{
              background: 'rgba(100, 150, 255, 0.9)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'white',
              fontWeight: 600
            }}>
              All paired e- (diamagnetic)
            </div>
          </Html>
        </Billboard>
      )}

      {/* Molecule label */}
      <Billboard position={[0, -1.2, 0]}>
        <Html center>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '16px',
            color: 'white',
            fontWeight: 700
          }}>
            {molecule}
          </div>
        </Html>
      </Billboard>
    </group>
  );
};

// 3D Scene for MO Builder
const MOBuilderScene: React.FC<{
  showBonding: boolean;
  showAntibonding: boolean;
  separation: number;
}> = ({ showBonding, showAntibonding, separation }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      <MolecularOrbitalDiagram
        showBonding={showBonding}
        showAntibonding={showAntibonding}
        separation={separation}
      />
      <OrbitControls enablePan={true} minDistance={4} maxDistance={15} />
    </>
  );
};

// 3D Scene for O2/N2 comparison
const DiatomicScene: React.FC<{
  molecule: 'O2' | 'N2';
  showElectrons: boolean;
}> = ({ molecule, showElectrons }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <DiatomicMolecule molecule={molecule} showElectrons={showElectrons} />
      <OrbitControls enablePan={true} minDistance={3} maxDistance={12} />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MolecularOrbitalsRenderer: React.FC<MolecularOrbitalsRendererProps> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Prediction states
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play state
  const [showBonding, setShowBonding] = useState(true);
  const [showAntibonding, setShowAntibonding] = useState(true);
  const [orbitalSeparation, setOrbitalSeparation] = useState(1.5);

  // Twist play state
  const [selectedMolecule, setSelectedMolecule] = useState<'O2' | 'N2'>('O2');
  const [showElectrons, setShowElectrons] = useState(true);

  // Transfer state
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test state
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const phaseNames: Record<Phase, string> = {
    'hook': 'Hook',
    'predict': 'Predict',
    'play': 'Explore',
    'review': 'Review',
    'twist_predict': 'Twist Predict',
    'twist_play': 'Twist Demo',
    'twist_review': 'Twist Review',
    'transfer': 'Transfer',
    'test': 'Test',
    'mastery': 'Mastery'
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'molecular_orbitals',
      gameTitle: 'Molecular Orbital Theory',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');

    if (onPhaseComplete) {
      const currentIndex = phaseOrder.indexOf(phase);
      const newIndex = phaseOrder.indexOf(newPhase);
      if (newIndex > currentIndex) {
        onPhaseComplete(phase);
      }
    }

    setPhase(newPhase);
    emitGameEvent('phase_changed', { newPhase, phaseName: phaseNames[newPhase] });
  }, [phase, emitGameEvent, onPhaseComplete, phaseNames]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    emitGameEvent('prediction_made', { prediction, correct: prediction === 'B' });
  }, [emitGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'A' ? 'success' : 'failure');
    emitGameEvent('twist_prediction_made', { prediction, correct: prediction === 'A' });
  }, [emitGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'success' : 'failure');
    emitGameEvent('test_answered', { questionIndex, answerIndex, isCorrect });
  }, [testAnswers, emitGameEvent]);

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer !== -1 && testQuestions[index].options[answer].correct) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emitGameEvent('app_explored', { appIndex, appTitle: transferApps[appIndex].title });
  }, [emitGameEvent]);

  // 10 test questions
  const testQuestions: TestQuestion[] = [
    {
      scenario: "Two hydrogen atoms approach each other to form H2.",
      question: "When two atomic orbitals combine, how many molecular orbitals form?",
      options: [
        { text: "One - they merge into a single orbital", correct: false },
        { text: "Two - one bonding and one antibonding", correct: true },
        { text: "Three - bonding, nonbonding, antibonding", correct: false },
        { text: "Four - two bonding and two antibonding", correct: false }
      ],
      explanation: "LCAO principle: n atomic orbitals combine to form n molecular orbitals. Two AOs form one bonding and one antibonding MO."
    },
    {
      scenario: "A chemist is analyzing the stability of a diatomic molecule.",
      question: "What is the bond order formula?",
      options: [
        { text: "(bonding electrons + antibonding electrons) / 2", correct: false },
        { text: "(bonding electrons - antibonding electrons) / 2", correct: true },
        { text: "(antibonding electrons - bonding electrons) / 2", correct: false },
        { text: "bonding electrons x antibonding electrons", correct: false }
      ],
      explanation: "Bond order = (# bonding e- - # antibonding e-) / 2. Higher bond order means stronger, shorter bonds."
    },
    {
      scenario: "A student is learning about orbital overlap.",
      question: "In a bonding molecular orbital, atomic orbital wavefunctions...",
      options: [
        { text: "Cancel out completely", correct: false },
        { text: "Add constructively, increasing electron density between nuclei", correct: true },
        { text: "Remain unchanged from their atomic form", correct: false },
        { text: "Move further apart from the nuclei", correct: false }
      ],
      explanation: "Bonding MOs result from constructive interference - wavefunctions add, putting electron density between nuclei where it stabilizes the bond."
    },
    {
      scenario: "An antibonding orbital is labeled with an asterisk (*).",
      question: "What characterizes an antibonding molecular orbital?",
      options: [
        { text: "Higher electron density between nuclei", correct: false },
        { text: "A nodal plane between nuclei with reduced electron density", correct: true },
        { text: "Lower energy than the original atomic orbitals", correct: false },
        { text: "It cannot hold any electrons", correct: false }
      ],
      explanation: "Antibonding orbitals have a node between nuclei (destructive interference), reducing electron density where bonding occurs, destabilizing the molecule."
    },
    {
      scenario: "Consider the molecular orbital diagram for O2.",
      question: "Why is oxygen (O2) paramagnetic?",
      options: [
        { text: "It has two unpaired electrons in pi* antibonding orbitals", correct: true },
        { text: "It has no electrons in bonding orbitals", correct: false },
        { text: "Its bond order is zero", correct: false },
        { text: "All its electrons are in sigma orbitals", correct: false }
      ],
      explanation: "O2 has 2 unpaired electrons in degenerate pi* orbitals (Hund's rule). Unpaired electrons create magnetic moment = paramagnetism."
    },
    {
      scenario: "Nitrogen (N2) is known for its extremely strong triple bond.",
      question: "What is the bond order of N2?",
      options: [
        { text: "1", correct: false },
        { text: "2", correct: false },
        { text: "3", correct: true },
        { text: "4", correct: false }
      ],
      explanation: "N2: 10 bonding e- - 4 antibonding e- = 6. Bond order = 6/2 = 3. This triple bond makes N2 very stable and unreactive."
    },
    {
      scenario: "A researcher is comparing N2 and O2 molecules.",
      question: "Why is N2 diamagnetic while O2 is paramagnetic?",
      options: [
        { text: "N2 has all paired electrons, O2 has unpaired electrons", correct: true },
        { text: "N2 has more antibonding electrons", correct: false },
        { text: "O2 has a higher bond order", correct: false },
        { text: "N2 has unpaired electrons in sigma orbitals", correct: false }
      ],
      explanation: "N2's 14 electrons fill MOs such that all are paired. O2's 16 electrons leave 2 unpaired in pi* orbitals, making it paramagnetic."
    },
    {
      scenario: "An engineer is designing a new LED material.",
      question: "How does molecular orbital theory relate to LED colors?",
      options: [
        { text: "LEDs work purely through nuclear reactions", correct: false },
        { text: "The HOMO-LUMO gap determines the energy/color of emitted light", correct: true },
        { text: "LED color depends only on the temperature", correct: false },
        { text: "Molecular orbitals are not relevant to LED function", correct: false }
      ],
      explanation: "In LEDs, electrons transition from excited states to ground states. The HOMO-LUMO energy gap determines the photon energy and thus the light color."
    },
    {
      scenario: "A pharmaceutical company is designing a new drug.",
      question: "How do molecular orbitals affect drug-receptor binding?",
      options: [
        { text: "They don't - only molecular shape matters", correct: false },
        { text: "HOMO of drug must overlap with LUMO of receptor for binding", correct: true },
        { text: "Drugs work by destroying receptor orbitals", correct: false },
        { text: "Only sigma orbitals are involved in drug binding", correct: false }
      ],
      explanation: "Drug binding involves orbital overlap: drug HOMO (electron donor) interacts with receptor LUMO (electron acceptor). This frontier orbital interaction is key to drug design."
    },
    {
      scenario: "Consider a diatomic molecule with bond order of zero.",
      question: "What happens when bond order equals zero?",
      options: [
        { text: "The molecule has an extremely strong bond", correct: false },
        { text: "The molecule is unstable and won't form", correct: true },
        { text: "The molecule becomes paramagnetic", correct: false },
        { text: "The molecule becomes a solid", correct: false }
      ],
      explanation: "Bond order 0 means antibonding effects equal bonding effects - no net bonding occurs. Example: He2 doesn't exist because 2 bonding e- and 2 antibonding e- give bond order 0."
    }
  ];

  // 4 transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "🏥",
      title: "MRI Contrast Agents",
      tagline: "Molecular magnetism in medicine",
      description: "MRI contrast agents like gadolinium compounds work because of unpaired electrons in their molecular orbitals, just like O2's paramagnetism.",
      connection: "Unpaired electrons in molecular orbitals create magnetic properties that enhance MRI signals, allowing doctors to see detailed images of soft tissues.",
      examples: ["Gadolinium-based contrast agents", "Iron oxide nanoparticles", "Manganese complexes", "Paramagnetic blood imaging"],
      color: "#3b82f6"
    },
    {
      icon: "💡",
      title: "LED Colors",
      tagline: "Engineering light with orbital gaps",
      description: "The color of LED light is determined by the HOMO-LUMO gap in semiconductor materials - the energy difference between highest occupied and lowest unoccupied molecular orbitals.",
      connection: "By engineering molecular orbital energy levels in materials like GaN or InGaN, we control exactly what wavelength (color) of light is emitted when electrons transition between orbitals.",
      examples: ["Blue LEDs (Nobel Prize 2014)", "White LED lighting", "OLED displays", "Quantum dot TVs"],
      color: "#22c55e"
    },
    {
      icon: "☀️",
      title: "Solar Cells",
      tagline: "Harvesting sunlight with orbital transitions",
      description: "Solar cells absorb photons that excite electrons from HOMO to LUMO. The HOMO-LUMO gap must match solar spectrum energies for efficient conversion.",
      connection: "Organic solar cells and dye-sensitized cells are designed by tuning molecular orbital energy gaps to absorb maximum sunlight and generate electricity efficiently.",
      examples: ["Organic photovoltaics", "Perovskite solar cells", "Dye-sensitized cells", "Quantum dot solar cells"],
      color: "#f59e0b"
    },
    {
      icon: "💊",
      title: "Drug Design",
      tagline: "Molecular keys for biological locks",
      description: "Drugs bind to their targets through frontier molecular orbital interactions - the drug's HOMO donates electrons to the receptor's LUMO, forming bonds.",
      connection: "Computational drug design uses molecular orbital calculations to predict how well drug candidates will bind to disease targets, accelerating the discovery of new medicines.",
      examples: ["Aspirin blocking COX enzymes", "HIV protease inhibitors", "Cancer targeted therapies", "Antibiotic design"],
      color: "#8b5cf6"
    }
  ];

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      {/* Premium Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-purple-400/80 text-sm font-medium tracking-wide uppercase">Quantum Chemistry</span>
      </div>

      {/* Gradient Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent">
        Molecular Orbitals
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8">
        How atoms share electrons to form chemical bonds
      </p>

      {/* Premium Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 max-w-lg border border-slate-700/50 shadow-2xl mb-6">
        <div className="relative w-full h-48 bg-gradient-to-b from-purple-900/30 to-slate-900/50 rounded-xl overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            {/* Background */}
            <rect x="0" y="0" width="400" height="200" fill="url(#moGradient)" />
            <defs>
              <linearGradient id="moGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Left atom */}
            <circle cx="100" cy="100" r="25" fill="#6366f1" opacity="0.9">
              <animate attributeName="cx" values="100;120;100" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="100" r="45" fill="none" stroke="#818cf8" strokeWidth="2" opacity="0.5">
              <animate attributeName="r" values="45;55;45" dur="2s" repeatCount="indefinite" />
              <animate attributeName="cx" values="100;120;100" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Right atom */}
            <circle cx="300" cy="100" r="25" fill="#6366f1" opacity="0.9">
              <animate attributeName="cx" values="300;280;300" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="300" cy="100" r="45" fill="none" stroke="#818cf8" strokeWidth="2" opacity="0.5">
              <animate attributeName="r" values="45;55;45" dur="2s" repeatCount="indefinite" />
              <animate attributeName="cx" values="300;280;300" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Overlapping orbital region */}
            <ellipse cx="200" cy="100" rx="40" ry="30" fill="#22c55e" opacity="0">
              <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" />
              <animate attributeName="rx" values="0;60;0" dur="2s" repeatCount="indefinite" />
            </ellipse>

            {/* Electron dots */}
            <circle cx="140" cy="100" r="6" fill="#fbbf24">
              <animate attributeName="cx" values="140;180;140" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="260" cy="100" r="6" fill="#fbbf24">
              <animate attributeName="cx" values="260;220;260" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Labels */}
            <text x="100" y="170" fontSize="14" fill="#94a3b8" textAnchor="middle">Atom A</text>
            <text x="300" y="170" fontSize="14" fill="#94a3b8" textAnchor="middle">Atom B</text>
            <text x="200" y="50" fontSize="14" fill="#22c55e" textAnchor="middle" fontWeight="bold" opacity="0">
              BOND!
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
            </text>
          </svg>
        </div>
        <p className="text-xl text-slate-200 mt-4 mb-3">
          When two atoms come together, their atomic orbitals <span className="text-purple-400 font-bold">combine</span> to form new molecular orbitals!
        </p>
        <p className="text-lg text-green-300">
          But what happens to the electrons? Do they always form bonds?
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-2xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          Discover Molecular Orbitals
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <p className="text-slate-500 text-sm mt-4">
        Tap to explore how orbitals combine
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Make Your Prediction</h2>
      <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
        Two hydrogen atoms, each with <span className="text-cyan-400 font-bold">one electron</span> in a 1s orbital, approach each other. What happens when their atomic orbitals <span className="text-purple-400 font-bold">combine</span>?
      </p>
      <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
        {[
          { id: 'A', text: 'They form one combined orbital that holds both electrons' },
          { id: 'B', text: 'They form TWO molecular orbitals - one bonding, one antibonding' },
          { id: 'C', text: 'The orbitals repel and electrons stay separate' },
          { id: 'D', text: 'One orbital disappears, leaving only the other' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all ${
              showPredictionFeedback && option.id === 'B'
                ? 'bg-green-600 text-white ring-2 ring-green-400'
                : showPredictionFeedback && selectedPrediction === option.id
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            <span className="font-bold">{option.id}.</span> {option.text}
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-md">
          <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'B' ? 'text-green-400' : 'text-purple-400'}`}>
            {selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'}
          </p>
          <p className="text-slate-300 mb-3">
            The <span className="text-purple-400 font-bold">LCAO principle</span>: n atomic orbitals combine to form n molecular orbitals!
          </p>
          <p className="text-slate-400 text-sm">
            Two 1s orbitals create one BONDING (lower energy) and one ANTIBONDING (higher energy) molecular orbital.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            Build Molecular Orbitals
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Molecular Orbital Builder</h2>
      <p className="text-slate-400 mb-4">Explore how atomic orbitals combine into bonding and antibonding MOs</p>

      {/* 3D Visualization */}
      <div className="relative w-full max-w-2xl h-72 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
          <Suspense fallback={null}>
            <MOBuilderScene
              showBonding={showBonding}
              showAntibonding={showAntibonding}
              separation={orbitalSeparation}
            />
          </Suspense>
        </Canvas>
        <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-slate-400">
          Drag to rotate | Scroll to zoom
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-4">
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showBonding}
            onChange={(e) => setShowBonding(e.target.checked)}
            className="accent-green-500 w-5 h-5"
          />
          <span className="text-green-400">Show Bonding (sigma)</span>
        </label>
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showAntibonding}
            onChange={(e) => setShowAntibonding(e.target.checked)}
            className="accent-red-500 w-5 h-5"
          />
          <span className="text-red-400">Show Antibonding (sigma*)</span>
        </label>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl w-full max-w-md mb-4">
        <label className="text-slate-300 text-sm block mb-2">Atomic Separation: {orbitalSeparation.toFixed(1)}</label>
        <input
          type="range"
          min="0.8"
          max="2.5"
          step="0.1"
          value={orbitalSeparation}
          onChange={(e) => setOrbitalSeparation(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-4">
        <div className="bg-green-900/30 p-3 rounded-lg border border-green-700/50">
          <div className="text-green-400 font-bold text-sm">Bonding Orbital</div>
          <div className="text-slate-400 text-xs">Constructive overlap</div>
          <div className="text-slate-400 text-xs">Electrons between nuclei</div>
          <div className="text-green-300 text-xs mt-1">Lower energy = stable</div>
        </div>
        <div className="bg-red-900/30 p-3 rounded-lg border border-red-700/50">
          <div className="text-red-400 font-bold text-sm">Antibonding Orbital</div>
          <div className="text-slate-400 text-xs">Destructive overlap</div>
          <div className="text-slate-400 text-xs">Node between nuclei</div>
          <div className="text-red-300 text-xs mt-1">Higher energy = unstable</div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
      >
        Review Bond Order
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Understanding Bond Order</h2>

      <div className="bg-slate-800 p-6 rounded-xl max-w-lg mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Key Concepts</h3>

        <div className="space-y-4">
          <div className="bg-green-900/30 p-4 rounded-lg border-l-4 border-green-500">
            <div className="font-bold text-green-400">Bonding Orbitals</div>
            <p className="text-slate-300 text-sm">
              Formed by constructive interference. Electrons are concentrated BETWEEN nuclei, attracting both nuclei together.
            </p>
          </div>

          <div className="bg-red-900/30 p-4 rounded-lg border-l-4 border-red-500">
            <div className="font-bold text-red-400">Antibonding Orbitals</div>
            <p className="text-slate-300 text-sm">
              Formed by destructive interference. A NODE between nuclei means electrons push nuclei APART.
            </p>
          </div>

          <div className="bg-purple-900/30 p-4 rounded-lg border-l-4 border-purple-500">
            <div className="font-bold text-purple-400">Bond Order Formula</div>
            <div className="text-center my-3">
              <span className="text-2xl font-mono text-white bg-slate-900 px-4 py-2 rounded">
                Bond Order = (bonding e⁻ - antibonding e⁻) / 2
              </span>
            </div>
            <p className="text-slate-300 text-sm">
              Higher bond order = stronger, shorter bond. Bond order 0 = no stable molecule.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
          <div className="font-bold text-cyan-400 mb-2">Example: H2</div>
          <p className="text-slate-300 text-sm">
            2 electrons fill the bonding orbital (lower energy first)<br/>
            Bond Order = (2 - 0) / 2 = <span className="text-green-400 font-bold">1</span><br/>
            Single bond - H2 is stable!
          </p>
        </div>

        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
          <div className="font-bold text-cyan-400 mb-2">Example: He2 (does it exist?)</div>
          <p className="text-slate-300 text-sm">
            4 electrons: 2 in bonding, 2 in antibonding<br/>
            Bond Order = (2 - 2) / 2 = <span className="text-red-400 font-bold">0</span><br/>
            No bond - He2 doesn't exist!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
      >
        Explore Paramagnetism
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="text-amber-400 text-sm font-bold mb-2">TWIST</div>
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Magnetic Mystery</h2>

      <div className="bg-slate-800 p-6 rounded-xl max-w-lg mb-6">
        <p className="text-slate-200 text-lg mb-4">
          Liquid oxygen (O2) is attracted to a magnet! But liquid nitrogen (N2) is NOT attracted at all.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-900/30 p-3 rounded-lg text-center">
            <div className="text-3xl mb-2">🧲</div>
            <div className="text-red-400 font-bold">O2</div>
            <div className="text-green-400 text-sm">ATTRACTED to magnet</div>
          </div>
          <div className="bg-blue-900/30 p-3 rounded-lg text-center">
            <div className="text-3xl mb-2">🧲</div>
            <div className="text-blue-400 font-bold">N2</div>
            <div className="text-red-400 text-sm">NOT attracted</div>
          </div>
        </div>
        <p className="text-amber-300 font-bold text-center">
          Why is O2 paramagnetic but N2 is not?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
        {[
          { id: 'A', text: 'O2 has unpaired electrons in its molecular orbitals' },
          { id: 'B', text: 'O2 has more protons in its nucleus' },
          { id: 'C', text: 'N2 has more antibonding electrons' },
          { id: 'D', text: 'O2 is heavier and more attracted by gravity' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all ${
              showTwistFeedback && option.id === 'A'
                ? 'bg-green-600 text-white ring-2 ring-green-400'
                : showTwistFeedback && twistPrediction === option.id
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            <span className="font-bold">{option.id}.</span> {option.text}
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-md">
          <p className={`font-bold text-lg mb-2 ${twistPrediction === 'A' ? 'text-green-400' : 'text-amber-400'}`}>
            {twistPrediction === 'A' ? 'Correct!' : 'Think about electron configurations!'}
          </p>
          <p className="text-slate-300 mb-3">
            <span className="text-amber-400 font-bold">Unpaired electrons</span> create a magnetic moment!
          </p>
          <p className="text-slate-400 text-sm">
            O2 has 2 unpaired electrons in its pi* antibonding orbitals due to Hund's rule. This makes it paramagnetic.
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
          >
            Compare O2 vs N2
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">O2 vs N2 Electron Configuration</h2>

      {/* 3D Visualization */}
      <div className="relative w-full max-w-2xl h-64 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
        <Canvas camera={{ position: [0, 2, 6], fov: 50 }}>
          <Suspense fallback={null}>
            <DiatomicScene molecule={selectedMolecule} showElectrons={showElectrons} />
          </Suspense>
        </Canvas>
      </div>

      {/* Molecule selector */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setSelectedMolecule('O2')}
          style={{ position: 'relative', zIndex: 10 }}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            selectedMolecule === 'O2'
              ? 'bg-red-600 text-white ring-2 ring-red-400'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          O2 (Oxygen)
        </button>
        <button
          onClick={() => setSelectedMolecule('N2')}
          style={{ position: 'relative', zIndex: 10 }}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            selectedMolecule === 'N2'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          N2 (Nitrogen)
        </button>
      </div>

      <label className="flex items-center gap-2 text-slate-300 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={showElectrons}
          onChange={(e) => setShowElectrons(e.target.checked)}
          className="accent-amber-500 w-5 h-5"
        />
        Show Electron Configuration
      </label>

      {/* Info panel */}
      <div className={`bg-slate-800 p-4 rounded-xl w-full max-w-md mb-4 border-l-4 ${
        selectedMolecule === 'O2' ? 'border-red-500' : 'border-blue-500'
      }`}>
        {selectedMolecule === 'O2' ? (
          <>
            <div className="font-bold text-red-400 text-lg">Oxygen (O2)</div>
            <div className="text-slate-300 text-sm mt-2">
              <div>Total electrons: 16</div>
              <div>Pi* orbitals: 2 electrons (one in each)</div>
              <div className="text-yellow-400 font-bold mt-2">2 UNPAIRED ELECTRONS</div>
              <div className="text-green-400 mt-1">= PARAMAGNETIC (attracted to magnets)</div>
            </div>
          </>
        ) : (
          <>
            <div className="font-bold text-blue-400 text-lg">Nitrogen (N2)</div>
            <div className="text-slate-300 text-sm mt-2">
              <div>Total electrons: 14</div>
              <div>All bonding MOs filled first</div>
              <div className="text-cyan-400 font-bold mt-2">ALL ELECTRONS PAIRED</div>
              <div className="text-red-400 mt-1">= DIAMAGNETIC (not attracted to magnets)</div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
      >
        Understand Why
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Why O2 is Paramagnetic</h2>

      <div className="bg-slate-800 p-6 rounded-xl max-w-lg mb-6">
        <h3 className="text-lg font-bold text-white mb-4">The Key: Hund's Rule</h3>

        <div className="bg-amber-900/30 p-4 rounded-lg border-l-4 border-amber-500 mb-4">
          <p className="text-slate-300">
            When filling degenerate (equal energy) orbitals, electrons <span className="text-amber-400 font-bold">spread out</span> with parallel spins before pairing up.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-red-900/30 p-4 rounded-lg">
            <div className="font-bold text-red-400 mb-2">O2: 16 electrons</div>
            <p className="text-slate-300 text-sm">
              The last 2 electrons go into two degenerate pi* orbitals.<br/>
              By Hund's rule, they stay UNPAIRED (one in each).<br/>
              <span className="text-yellow-400">2 unpaired e- = paramagnetic!</span>
            </p>
          </div>

          <div className="bg-blue-900/30 p-4 rounded-lg">
            <div className="font-bold text-blue-400 mb-2">N2: 14 electrons</div>
            <p className="text-slate-300 text-sm">
              All electrons fill lower energy orbitals completely.<br/>
              No partially filled degenerate orbitals.<br/>
              <span className="text-cyan-400">All paired = diamagnetic!</span>
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
          <div className="font-bold text-purple-400 mb-2">Why Magnetism?</div>
          <p className="text-slate-300 text-sm">
            Unpaired electrons act like tiny magnets (they have "spin").
            When electrons are paired, their spins cancel out.
            O2's unpaired electrons give it a net magnetic moment!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ position: 'relative', zIndex: 10 }}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
      >
        See Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-2">Real-World Applications</h2>
      <p className="text-slate-400 mb-6">Molecular orbital theory is everywhere!</p>

      {/* App tabs */}
      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        {transferApps.map((app, i) => (
          <button
            key={i}
            onClick={() => { setActiveAppTab(i); handleAppComplete(i); }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === i
                ? 'bg-purple-600 text-white'
                : completedApps.has(i)
                ? 'bg-green-700 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title}
          </button>
        ))}
      </div>

      {/* Active app content */}
      <div
        className="bg-slate-800 p-6 rounded-xl max-w-lg w-full mb-4"
        style={{ borderTop: `4px solid ${transferApps[activeAppTab].color}` }}
      >
        <div className="text-4xl mb-3">{transferApps[activeAppTab].icon}</div>
        <h3 className="text-xl font-bold text-white mb-1">{transferApps[activeAppTab].title}</h3>
        <p className="text-slate-400 text-sm mb-3">{transferApps[activeAppTab].tagline}</p>

        <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 p-3 rounded-lg mb-4">
          <div className="font-bold text-purple-400 text-sm mb-1">MO Connection:</div>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].connection}</p>
        </div>

        <div className="font-bold text-slate-300 text-sm mb-2">Examples:</div>
        <ul className="text-slate-400 text-sm space-y-1">
          {transferApps[activeAppTab].examples.map((ex, i) => (
            <li key={i} className="flex items-center gap-2">
              <span style={{ color: transferApps[activeAppTab].color }}>•</span> {ex}
            </li>
          ))}
        </ul>
      </div>

      {/* Progress indicator */}
      <div className="text-slate-400 text-sm mb-4">
        Explored {completedApps.size} of {transferApps.length} applications
      </div>

      <button
        onClick={() => goToPhase('test')}
        disabled={completedApps.size < transferApps.length}
        style={{ position: 'relative', zIndex: 10 }}
        className={`px-6 py-3 font-bold rounded-xl transition-colors ${
          completedApps.size >= transferApps.length
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {completedApps.size >= transferApps.length ? 'Take the Test' : `Explore All Apps (${completedApps.size}/${transferApps.length})`}
      </button>
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testQuestions.findIndex((_, i) => testAnswers[i] === -1);
    const questionIndex = currentQuestion === -1 ? testQuestions.length - 1 : currentQuestion;
    const allAnswered = testAnswers.every(a => a !== -1);

    if (showTestResults) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <h2 className="text-2xl font-bold text-purple-400 mb-6">Test Results</h2>
          <div className="text-6xl font-bold text-white mb-4">{testScore}/10</div>
          <div className={`text-xl font-bold mb-6 ${testScore >= 7 ? 'text-green-400' : 'text-amber-400'}`}>
            {testScore >= 7 ? 'Excellent! You understand MO theory!' : 'Good effort! Review the concepts.'}
          </div>
          <button
            onClick={() => goToPhase('mastery')}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            Complete Journey
          </button>
        </div>
      );
    }

    const q = testQuestions[questionIndex];

    return (
      <div className="flex flex-col items-center min-h-[400px] p-6">
        <div className="text-slate-400 text-sm mb-2">Question {questionIndex + 1} of 10</div>
        <div className="w-full max-w-md h-2 bg-slate-700 rounded-full mb-6">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${((questionIndex + 1) / 10) * 100}%` }}
          />
        </div>

        <div className="bg-slate-800 p-4 rounded-xl max-w-lg w-full mb-4">
          <p className="text-slate-400 text-sm mb-2 italic">{q.scenario}</p>
          <p className="text-white font-bold">{q.question}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-lg mb-4">
          {q.options.map((option, i) => {
            const isSelected = testAnswers[questionIndex] === i;
            const isAnswered = testAnswers[questionIndex] !== -1;
            const isCorrect = option.correct;

            return (
              <button
                key={i}
                onClick={() => handleTestAnswer(questionIndex, i)}
                disabled={isAnswered}
                style={{ position: 'relative', zIndex: 10 }}
                className={`p-4 rounded-xl text-left transition-all ${
                  isAnswered && isCorrect
                    ? 'bg-green-600 text-white'
                    : isAnswered && isSelected
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        {testAnswers[questionIndex] !== -1 && (
          <div className="bg-slate-800 p-4 rounded-xl max-w-lg w-full mb-4">
            <p className="text-slate-300 text-sm">{q.explanation}</p>
          </div>
        )}

        {allAnswered && (
          <button
            onClick={() => {
              setTestScore(calculateTestScore());
              setShowTestResults(true);
            }}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            See Results
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="text-6xl mb-6">🎓</div>
      <h1 className="text-4xl font-bold text-white mb-4">
        Congratulations!
      </h1>
      <h2 className="text-2xl font-bold text-purple-400 mb-6">
        Molecular Orbital Theory Mastered
      </h2>

      <div className="bg-slate-800 p-6 rounded-xl max-w-lg mb-6">
        <h3 className="font-bold text-white mb-4">What You Learned:</h3>
        <ul className="text-left text-slate-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Atomic orbitals combine to form bonding and antibonding MOs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Bond order = (bonding e- - antibonding e-) / 2</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Unpaired electrons cause paramagnetism (like in O2)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>MO theory explains LED colors, drug binding, and more!</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => {
            playSound('complete');
            emitGameEvent('mastery_complete', { testScore });
          }}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-2xl hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER SWITCH
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Progress bar */}
      <div className="bg-slate-800 p-3 border-b border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400 text-sm">{phaseNames[phase]}</span>
          <span className="text-slate-400 text-sm">{phaseOrder.indexOf(phase) + 1}/{phaseOrder.length}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default MolecularOrbitalsRenderer;
