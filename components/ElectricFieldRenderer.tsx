'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// ELECTRIC FIELD RENDERER - GOLD STANDARD
// The fundamental concept of force per unit charge
// E = F/q and E = kq/r² for point charges
// ============================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'discovery_made'
  | 'transfer_app_viewed'
  | 'transfer_app_completed'
  | 'test_answered'
  | 'test_completed'
  | 'field_calculated'
  | 'charge_placed'
  | 'test_charge_moved'
  | 'field_lines_toggled';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface SourceCharge {
  id: number;
  x: number;
  y: number;
  q: number; // charge in microcoulombs
}

// Coulomb's constant
const k = 8.99e9; // N·m²/C²

const ElectricFieldRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase = 0,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState(currentPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation states
  const [sourceCharges, setSourceCharges] = useState<SourceCharge[]>([
    { id: 1, x: 250, y: 200, q: 5 }
  ]);
  const [testChargePos, setTestChargePos] = useState({ x: 350, y: 200 });
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showFieldVectors, setShowFieldVectors] = useState(true);
  const [animationTime, setAnimationTime] = useState(0);
  const [selectedConfig, setSelectedConfig] = useState<'single' | 'dipole' | 'parallel'>('single');
  const [isDraggingTestCharge, setIsDraggingTestCharge] = useState(false);

  const navigationLockRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Update charge configuration
  useEffect(() => {
    switch (selectedConfig) {
      case 'single':
        setSourceCharges([{ id: 1, x: 250, y: 200, q: 5 }]);
        setTestChargePos({ x: 350, y: 200 });
        break;
      case 'dipole':
        setSourceCharges([
          { id: 1, x: 180, y: 200, q: 5 },
          { id: 2, x: 320, y: 200, q: -5 }
        ]);
        setTestChargePos({ x: 250, y: 120 });
        break;
      case 'parallel':
        setSourceCharges([
          { id: 1, x: 100, y: 100, q: 5 },
          { id: 2, x: 100, y: 150, q: 5 },
          { id: 3, x: 100, y: 200, q: 5 },
          { id: 4, x: 100, y: 250, q: 5 },
          { id: 5, x: 100, y: 300, q: 5 },
          { id: 6, x: 400, y: 100, q: -5 },
          { id: 7, x: 400, y: 150, q: -5 },
          { id: 8, x: 400, y: 200, q: -5 },
          { id: 9, x: 400, y: 250, q: -5 },
          { id: 10, x: 400, y: 300, q: -5 }
        ]);
        setTestChargePos({ x: 250, y: 200 });
        break;
    }
  }, [selectedConfig]);

  const playSound = useCallback((soundType: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'zap') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'click':
          oscillator.frequency.value = 600;
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'correct':
          oscillator.frequency.value = 523;
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          oscillator.start(ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'complete':
          oscillator.frequency.value = 440;
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          oscillator.start(ctx.currentTime);
          oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'transition':
          oscillator.frequency.value = 400;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'zap':
          oscillator.frequency.value = 2000;
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          oscillator.frequency.setValueAtTime(500, ctx.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    if (navigationLockRef.current) return;

    lastInteractionRef.current = now;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });

    if (newPhase > phase) {
      onPhaseComplete?.(phase);
    }

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Calculate electric field at a point
  const calculateField = useCallback((x: number, y: number): { Ex: number; Ey: number; E: number } => {
    let Ex = 0, Ey = 0;

    sourceCharges.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 10) return; // Avoid singularity

      // E = kq/r² in the direction away from positive charges
      const q_C = charge.q * 1e-6;
      const r_m = r * 0.001; // pixels to meters (1px = 1mm)
      const E_mag = k * Math.abs(q_C) / (r_m * r_m);
      const direction = charge.q > 0 ? 1 : -1;

      Ex += direction * E_mag * (dx / r);
      Ey += direction * E_mag * (dy / r);
    });

    const E = Math.sqrt(Ex * Ex + Ey * Ey);
    return { Ex, Ey, E };
  }, [sourceCharges]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);

    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    emitEvent('prediction_made', { prediction, correct: isCorrect });
  }, [playSound, emitEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);

    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    emitEvent('prediction_made', { prediction, correct: isCorrect, twist: true });
  }, [playSound, emitEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;

    playSound('click');
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    emitEvent('test_answered', { questionIndex, answerIndex });
  }, [playSound, emitEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emitEvent('transfer_app_completed', { appIndex });
  }, [playSound, emitEvent]);

  // Handle test charge dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingTestCharge || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 500;
    const y = ((e.clientY - rect.top) / rect.height) * 400;

    setTestChargePos({ x: Math.max(20, Math.min(480, x)), y: Math.max(20, Math.min(380, y)) });
  }, [isDraggingTestCharge]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingTestCharge(false);
  }, []);

  // Test questions with scenarios
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A small positive test charge is placed near a large positive source charge. The test charge experiences a force pushing it away.",
      question: "What is the direction of the electric field at the test charge's location?",
      options: [
        { text: "Toward the source charge", correct: false },
        { text: "Away from the source charge", correct: true },
        { text: "Perpendicular to the line between charges", correct: false },
        { text: "The field has no direction", correct: false }
      ],
      explanation: "Electric field direction is defined as the direction a positive test charge would be pushed. Since like charges repel, the field points away from positive charges. E = F/q, and when q is positive and F points away, E points away."
    },
    {
      scenario: "An electron (negative charge) is placed in a uniform electric field pointing to the right with magnitude 1000 N/C.",
      question: "In which direction will the electron accelerate?",
      options: [
        { text: "To the right (same as E)", correct: false },
        { text: "To the left (opposite to E)", correct: true },
        { text: "The electron won't move", correct: false },
        { text: "Perpendicular to E", correct: false }
      ],
      explanation: "The force on a charge in an electric field is F = qE. For a negative charge (electron), the force is opposite to the field direction. Since E points right, the force (and acceleration) on the electron points left."
    },
    {
      scenario: "A physics student observes electric field lines around two equal positive charges placed side by side.",
      question: "What happens to the field lines between the two charges?",
      options: [
        { text: "They connect the two charges directly", correct: false },
        { text: "They curve away from both charges, leaving a null point between them", correct: true },
        { text: "They form closed loops around each charge", correct: false },
        { text: "The field is strongest between the charges", correct: false }
      ],
      explanation: "Like charges repel, so their fields push against each other between them. Field lines curve away from both charges, creating a point of zero field exactly midway between them where the two fields cancel. This is called a saddle point or null point."
    },
    {
      scenario: "Inside a hollow conducting sphere that has been given a positive charge, a student wants to measure the electric field.",
      question: "What will the student find for the electric field inside the conductor?",
      options: [
        { text: "Very strong, pointing toward the center", correct: false },
        { text: "Very strong, pointing outward", correct: false },
        { text: "Zero everywhere inside", correct: true },
        { text: "It varies depending on position", correct: false }
      ],
      explanation: "Inside a conductor in electrostatic equilibrium, the electric field is always zero. Free charges in the conductor redistribute until they completely cancel any internal field. This is the basis for electrostatic shielding (Faraday cage)."
    },
    {
      scenario: "Two parallel plates are charged, with the top plate positive (+) and bottom plate negative (-). The separation is 5 mm and the voltage difference is 1000 V.",
      question: "What is the electric field magnitude between the plates?",
      options: [
        { text: "200 N/C", correct: false },
        { text: "5000 N/C", correct: false },
        { text: "200,000 N/C (or 200 kV/m)", correct: true },
        { text: "1,000,000 N/C", correct: false }
      ],
      explanation: "For a uniform field between parallel plates, E = V/d. Here E = 1000 V / 0.005 m = 200,000 V/m = 200,000 N/C. The field is uniform between the plates and points from + to - (top to bottom)."
    },
    {
      scenario: "A charge of +2 μC creates an electric field. At a distance of 3 m from this charge, you measure the field strength.",
      question: "What is the approximate electric field magnitude at this point?",
      options: [
        { text: "2000 N/C", correct: true },
        { text: "6000 N/C", correct: false },
        { text: "18,000 N/C", correct: false },
        { text: "600 N/C", correct: false }
      ],
      explanation: "E = kq/r² = (8.99×10⁹)(2×10⁻⁶)/(3)² = (8.99×10⁹)(2×10⁻⁶)/9 ≈ 2000 N/C. The field points radially outward from the positive charge at every point."
    },
    {
      scenario: "An electric dipole consists of a +Q and -Q charge separated by a small distance. You observe the field far away from the dipole.",
      question: "How does the field strength vary with distance r from a dipole?",
      options: [
        { text: "It falls off as 1/r (linear)", correct: false },
        { text: "It falls off as 1/r² (inverse square)", correct: false },
        { text: "It falls off as 1/r³ (inverse cube)", correct: true },
        { text: "It remains constant with distance", correct: false }
      ],
      explanation: "Unlike a single charge (1/r²), a dipole's field falls off as 1/r³. This is because the fields from the + and - charges largely cancel at large distances. The dipole field is weaker and decays faster than a monopole field."
    },
    {
      scenario: "Electric field lines are drawn around a negative point charge.",
      question: "Which statement correctly describes these field lines?",
      options: [
        { text: "They point radially outward from the charge", correct: false },
        { text: "They point radially inward toward the charge", correct: true },
        { text: "They form circles around the charge", correct: false },
        { text: "There are no field lines around negative charges", correct: false }
      ],
      explanation: "Electric field lines always point in the direction a positive test charge would move. A positive test charge would be attracted to (move toward) a negative charge, so field lines point inward toward negative charges and outward from positive charges."
    },
    {
      scenario: "A proton and an electron are placed in the same uniform electric field of 500 N/C.",
      question: "How do their accelerations compare?",
      options: [
        { text: "Same magnitude, same direction", correct: false },
        { text: "Same magnitude, opposite directions", correct: false },
        { text: "Different magnitudes, opposite directions (electron accelerates ~1836× faster)", correct: true },
        { text: "Different magnitudes, same direction", correct: false }
      ],
      explanation: "Force F = qE is the same magnitude for both (same |q|). But a = F/m, and the electron's mass is ~1836 times smaller than the proton's. So the electron accelerates ~1836 times faster. They accelerate in opposite directions because their charges have opposite signs."
    },
    {
      scenario: "In a cathode ray tube, electrons are accelerated through a potential difference of 10,000 V and then deflected by electric fields between parallel plates.",
      question: "Why do CRT displays use electric fields for electron beam control?",
      options: [
        { text: "Electric fields only affect electrons, not protons", correct: false },
        { text: "Electric fields can precisely control charged particle trajectories", correct: true },
        { text: "Magnetic fields don't work on moving charges", correct: false },
        { text: "Electric fields are cheaper to produce", correct: false }
      ],
      explanation: "Electric fields exert precise, controllable forces on charged particles (F = qE). By varying the voltage on deflection plates, the electron beam can be steered to any point on the screen. This principle is also used in oscilloscopes, mass spectrometers, and particle accelerators."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "⚛️",
      title: "Particle Accelerators",
      short: "Accelerator Physics",
      tagline: "Accelerating particles to near light speed",
      description: "Electric fields accelerate charged particles to incredible energies, enabling discoveries in fundamental physics.",
      connection: "Particles gain kinetic energy by moving through electric potential differences. Work W = qΔV converts to kinetic energy, allowing particles to reach relativistic speeds.",
      howItWorks: "Linear accelerators (linacs) use a series of drift tubes with alternating electric fields. Particles are accelerated in the gaps between tubes. Circular accelerators like synchrotrons use electric fields for acceleration and magnetic fields for steering.",
      stats: [
        "LHC: 6.5 TeV per beam",
        "Particles reach 99.9999991% speed of light",
        "Electric fields up to 50 MV/m",
        "SLAC linac: 3.2 km long"
      ],
      examples: [
        "Large Hadron Collider (CERN)",
        "SLAC National Accelerator Laboratory",
        "Fermilab particle physics",
        "Medical proton therapy accelerators"
      ],
      companies: ["CERN", "Fermilab", "SLAC", "DESY"],
      futureImpact: "Plasma wakefield accelerators use intense laser pulses to create electric fields 1000× stronger than conventional accelerators, potentially shrinking kilometer-scale machines to tabletop size.",
      color: "from-purple-700 to-indigo-900"
    },
    {
      icon: "🛡️",
      title: "Electrostatic Shielding",
      short: "Faraday Cages",
      tagline: "Protection through field cancellation",
      description: "The principle that E = 0 inside conductors protects sensitive electronics and people from external electric fields and electromagnetic interference.",
      connection: "Free charges in conductors redistribute to cancel internal fields. This means external electric fields cannot penetrate a conducting enclosure—the famous Faraday cage effect.",
      howItWorks: "A conducting enclosure (mesh or solid) allows charges to redistribute on its surface in response to external fields. The redistributed charges create an opposing field that exactly cancels the external field inside. The interior remains field-free.",
      stats: [
        "Can block millions of volts",
        "Protects against lightning strikes",
        "60+ dB electromagnetic shielding",
        "Mesh openings < 1/10 wavelength"
      ],
      examples: [
        "Aircraft fuselage (lightning protection)",
        "MRI room RF shielding",
        "Microwave oven enclosure",
        "EMP protection for electronics"
      ],
      companies: ["Boeing", "Holland Shielding", "Spira Manufacturing", "Leader Tech"],
      futureImpact: "Advanced metamaterial shields may provide frequency-selective protection, allowing certain signals through while blocking harmful interference—smart shielding for the IoT age.",
      color: "from-slate-600 to-slate-800"
    },
    {
      icon: "📺",
      title: "Electron Beam Steering",
      short: "CRT & Beam Physics",
      tagline: "Precise control of charged particles",
      description: "Electric fields steer electron beams with micrometer precision, from classic CRT displays to modern electron microscopes.",
      connection: "A charged particle in an electric field experiences force F = qE. By controlling E with voltage on deflection plates, particle trajectories can be precisely steered.",
      howItWorks: "Parallel plate electrodes create uniform electric fields. As electrons pass between plates, they experience constant transverse acceleration, curving their path. The deflection angle depends on field strength, plate length, and electron energy.",
      stats: [
        "Deflection accuracy: <1 μm",
        "Scanning rates: MHz",
        "Electron microscope resolution: 0.05 nm",
        "Oscilloscope bandwidth: GHz"
      ],
      examples: [
        "Electron microscopes",
        "Oscilloscope CRTs",
        "Mass spectrometers",
        "Electron beam lithography"
      ],
      companies: ["JEOL", "Thermo Fisher", "Zeiss", "Tektronix"],
      futureImpact: "Ultrafast electron diffraction using femtosecond electron pulses, steered by precisely timed electric fields, will enable 'molecular movies' showing chemical reactions in real-time.",
      color: "from-cyan-700 to-blue-900"
    },
    {
      icon: "🧬",
      title: "Electrophoresis",
      short: "Molecular Separation",
      tagline: "Sorting molecules by charge and size",
      description: "Electric fields drive charged biomolecules through gels, separating DNA, RNA, and proteins by size and charge for analysis.",
      connection: "Charged molecules in solution experience force F = qE. Different molecules have different charge-to-friction ratios, causing them to migrate at different speeds through the gel.",
      howItWorks: "A gel matrix (agarose or polyacrylamide) acts as a molecular sieve. When voltage is applied, negatively charged DNA moves toward the positive electrode. Smaller fragments move faster through the gel pores, creating size-based separation.",
      stats: [
        "DNA separation: 10 bp to 50 kbp",
        "Typical voltage: 5-10 V/cm",
        "Run times: 30 min to hours",
        "Resolution: single base pair"
      ],
      examples: [
        "DNA fingerprinting forensics",
        "PCR product analysis",
        "Protein western blots",
        "Clinical hemoglobin analysis"
      ],
      companies: ["Bio-Rad", "Thermo Fisher", "Agilent", "QIAGEN"],
      futureImpact: "Nanopore sequencing uses electric fields to drive DNA through protein pores. As each base passes, it briefly blocks ion current differently, enabling real-time sequencing without amplification.",
      color: "from-green-700 to-emerald-900"
    }
  ];

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === -1) return score;
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers, testQuestions]);

  // Render electric field lines
  const renderFieldLines = useCallback(() => {
    if (!showFieldLines) return null;

    const lines: JSX.Element[] = [];
    const numLinesPerCharge = 12;

    sourceCharges.forEach((charge, chargeIndex) => {
      if (charge.q === 0) return;

      for (let i = 0; i < numLinesPerCharge; i++) {
        const angle = (2 * Math.PI * i) / numLinesPerCharge;
        const points: { x: number; y: number }[] = [];

        let x = charge.x + Math.cos(angle) * 15;
        let y = charge.y + Math.sin(angle) * 15;

        const direction = charge.q > 0 ? 1 : -1;

        for (let step = 0; step < 80; step++) {
          if (x < 0 || x > 500 || y < 0 || y > 400) break;

          points.push({ x, y });

          const { Ex, Ey, E } = calculateField(x, y);
          if (E < 1e6) break; // Stop if field is too weak

          const stepSize = 4;
          x += direction * (Ex / E) * stepSize;
          y += direction * (Ey / E) * stepSize;

          // Check if reached another charge
          const nearCharge = sourceCharges.find(c =>
            c.id !== charge.id &&
            Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 15
          );
          if (nearCharge && nearCharge.q * charge.q < 0) break;
        }

        if (points.length > 3) {
          const pathD = points.map((p, idx) =>
            `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
          ).join(' ');

          const color = charge.q > 0 ? '#ef4444' : '#3b82f6';

          lines.push(
            <path
              key={`field-${chargeIndex}-${i}`}
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.6"
              markerEnd={charge.q > 0 ? "url(#arrowRed)" : undefined}
            />
          );
        }
      }
    });

    return <g>{lines}</g>;
  }, [showFieldLines, sourceCharges, calculateField]);

  // Render field vectors on a grid
  const renderFieldVectors = useCallback(() => {
    if (!showFieldVectors) return null;

    const vectors: JSX.Element[] = [];
    const gridSize = 40;

    for (let x = gridSize; x < 500; x += gridSize) {
      for (let y = gridSize; y < 400; y += gridSize) {
        // Skip if too close to a charge
        const tooClose = sourceCharges.some(c =>
          Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 25
        );
        if (tooClose) continue;

        const { Ex, Ey, E } = calculateField(x, y);
        if (E < 1e6) continue;

        const scale = Math.min(15, Math.log10(E / 1e6) * 5);
        const endX = x + (Ex / E) * scale;
        const endY = y + (Ey / E) * scale;

        vectors.push(
          <line
            key={`vector-${x}-${y}`}
            x1={x}
            y1={y}
            x2={endX}
            y2={endY}
            stroke="#22c55e"
            strokeWidth="2"
            markerEnd="url(#arrowGreen)"
            opacity="0.7"
          />
        );
      }
    }

    return <g>{vectors}</g>;
  }, [showFieldVectors, sourceCharges, calculateField]);

  // Phase renderers
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-cyan-400 text-sm font-medium">Electromagnetic Physics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent mb-3`}>
        Electric Fields
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Visualize the invisible force that shapes our universe
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        <svg viewBox="0 0 500 300" className="w-full max-w-md mx-auto mb-6">
          <defs>
            <radialGradient id="chargeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <marker id="hookArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="500" height="300" fill="#0f172a" rx="12" />

          {/* Animated field lines radiating from center */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const angle = (i * 45) * Math.PI / 180;
            const pulseOffset = Math.sin(animationTime * 2 + i * 0.5) * 10;
            const startR = 40;
            const endR = 120 + pulseOffset;
            return (
              <line
                key={`line-${i}`}
                x1={250 + Math.cos(angle) * startR}
                y1={150 + Math.sin(angle) * startR}
                x2={250 + Math.cos(angle) * endR}
                y2={150 + Math.sin(angle) * endR}
                stroke="#ef4444"
                strokeWidth="2"
                markerEnd="url(#hookArrow)"
                opacity="0.7"
              />
            );
          })}

          {/* Glow effect */}
          <circle cx="250" cy="150" r="80" fill="url(#chargeGlow)">
            <animate attributeName="r" values="60;80;60" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Central positive charge */}
          <circle cx="250" cy="150" r="30" fill="#ef4444" stroke="#fca5a5" strokeWidth="3" />
          <text x="250" y="160" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">+</text>

          {/* Test charge being pushed */}
          <g transform={`translate(${350 + Math.sin(animationTime * 3) * 20}, 150)`}>
            <circle r="12" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
            <text y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">q</text>
          </g>

          {/* Force arrow */}
          <path
            d={`M ${320 + Math.sin(animationTime * 3) * 20} 150 L ${380 + Math.sin(animationTime * 3) * 20} 150`}
            stroke="#4ade80"
            strokeWidth="3"
            markerEnd="url(#hookArrow)"
            opacity="0.8"
          />

          {/* Equation */}
          <text x="250" y="260" textAnchor="middle" fill="#94a3b8" fontSize="20">
            E = F/q = kQ/r²
          </text>
        </svg>

        <p className="text-xl text-slate-300 mb-4">
          Invisible force fields surround every charge...
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          How can we "see" and measure these electric fields?
        </p>
        <p className="text-sm text-slate-500 mt-2">
          The field exists at every point in space, even with no test charge present
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-2xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Explore Electric Fields
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Subtle Hint */}
      <p className="mt-4 text-slate-500 text-sm">
        Tap to begin your exploration
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A positive test charge is placed near a large negative source charge.
          The test charge experiences a force pulling it toward the source.
        </p>
        <svg viewBox="0 0 400 150" className="w-full max-w-sm mx-auto my-4">
          <rect x="0" y="0" width="400" height="150" fill="#1e293b" rx="8" />

          {/* Negative source charge */}
          <circle cx="100" cy="75" r="30" fill="#3b82f6" stroke="#93c5fd" strokeWidth="2" />
          <text x="100" y="85" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">−</text>
          <text x="100" y="125" textAnchor="middle" fill="#93c5fd" fontSize="12">Source: -Q</text>

          {/* Test charge */}
          <circle cx="280" cy="75" r="15" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
          <text x="280" y="81" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">+</text>
          <text x="280" y="125" textAnchor="middle" fill="#4ade80" fontSize="12">Test: +q</text>

          {/* Force arrow pointing left */}
          <path d="M250,75 L180,75" stroke="#4ade80" strokeWidth="3" markerEnd="url(#arrowGreen)" />
          <text x="215" y="65" textAnchor="middle" fill="#4ade80" fontSize="12">F</text>

          {/* Question mark for field direction */}
          <text x="215" y="100" textAnchor="middle" fill="#fbbf24" fontSize="24">E = ?</text>
        </svg>
        <p className="text-cyan-400 font-medium">
          What is the direction of the electric field at the test charge's location?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Away from the negative charge (pointing right)' },
          { id: 'B', text: 'Perpendicular to the line between charges' },
          { id: 'C', text: 'Toward the negative charge (pointing left)' },
          { id: 'D', text: 'Electric field has no direction, only magnitude' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! Electric field points toward negative charges!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            E is defined as the direction a <em>positive</em> test charge would be pushed.
            Since positive charges are attracted to negative charges, E points toward −Q.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Field Lab →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => {
    const { Ex, Ey, E } = calculateField(testChargePos.x, testChargePos.y);
    const angle = Math.atan2(Ey, Ex) * 180 / Math.PI;

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Electric Field Lab</h2>

        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
          <svg
            ref={svgRef}
            viewBox="0 0 500 400"
            className="w-full bg-slate-900 rounded-xl cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
              </marker>
              <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
              </marker>
              <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
              </marker>
              <radialGradient id="posGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#ef4444" />
              </radialGradient>
              <radialGradient id="negGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#3b82f6" />
              </radialGradient>
            </defs>

            {/* Grid */}
            {[...Array(13)].map((_, i) => (
              <g key={`grid-${i}`}>
                <line x1={i * 40} y1="0" x2={i * 40} y2="400" stroke="#334155" strokeWidth="0.5" />
                <line x1="0" y1={i * 40} x2="500" y2={i * 40} stroke="#334155" strokeWidth="0.5" />
              </g>
            ))}

            {/* Field lines */}
            {renderFieldLines()}

            {/* Field vectors */}
            {renderFieldVectors()}

            {/* Source charges */}
            {sourceCharges.map(charge => (
              <g key={charge.id}>
                <circle
                  cx={charge.x}
                  cy={charge.y}
                  r={20 + Math.sin(animationTime * 3) * 2}
                  fill={charge.q > 0 ? 'url(#posGrad)' : 'url(#negGrad)'}
                  stroke={charge.q > 0 ? '#fca5a5' : '#93c5fd'}
                  strokeWidth="2"
                />
                <text
                  x={charge.x}
                  y={charge.y + 7}
                  textAnchor="middle"
                  fill="white"
                  fontSize="24"
                  fontWeight="bold"
                >
                  {charge.q > 0 ? '+' : '−'}
                </text>
              </g>
            ))}

            {/* Test charge (draggable) */}
            <g
              onMouseDown={() => setIsDraggingTestCharge(true)}
              style={{ cursor: 'grab' }}
            >
              <circle
                cx={testChargePos.x}
                cy={testChargePos.y}
                r="15"
                fill="#22c55e"
                stroke={isDraggingTestCharge ? '#fbbf24' : '#4ade80'}
                strokeWidth={isDraggingTestCharge ? 4 : 2}
              />
              <text
                x={testChargePos.x}
                y={testChargePos.y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                className="pointer-events-none"
              >
                q
              </text>

              {/* Field vector at test charge */}
              {E > 1e6 && (
                <line
                  x1={testChargePos.x}
                  y1={testChargePos.y}
                  x2={testChargePos.x + (Ex / E) * 30}
                  y2={testChargePos.y + (Ey / E) * 30}
                  stroke="#fbbf24"
                  strokeWidth="3"
                  markerEnd="url(#arrowGreen)"
                  className="pointer-events-none"
                />
              )}
            </g>

            <text x="250" y="390" textAnchor="middle" fill="#64748b" fontSize="12">
              Drag the test charge (q) to explore the field
            </text>
          </svg>
        </div>

        {/* Configuration selector */}
        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {[
            { key: 'single', label: 'Single Charge', icon: '⊕' },
            { key: 'dipole', label: 'Dipole', icon: '⊕⊖' },
            { key: 'parallel', label: 'Parallel Plates', icon: '∥' }
          ].map(config => (
            <button
              key={config.key}
              onMouseDown={() => {
                setSelectedConfig(config.key as typeof selectedConfig);
                emitEvent('parameter_changed', { config: config.key });
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedConfig === config.key
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {config.icon} {!isMobile && config.label}
            </button>
          ))}
        </div>

        {/* Display toggles */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-4">
          <button
            onMouseDown={() => setShowFieldLines(!showFieldLines)}
            className={`p-3 rounded-xl transition-colors ${
              showFieldLines ? 'bg-red-600' : 'bg-slate-700'
            } text-white font-medium`}
          >
            {showFieldLines ? '📍 Field Lines: ON' : '📍 Field Lines: OFF'}
          </button>
          <button
            onMouseDown={() => setShowFieldVectors(!showFieldVectors)}
            className={`p-3 rounded-xl transition-colors ${
              showFieldVectors ? 'bg-green-600' : 'bg-slate-700'
            } text-white font-medium`}
          >
            {showFieldVectors ? '➡️ Vectors: ON' : '➡️ Vectors: OFF'}
          </button>
        </div>

        {/* Field information */}
        <div className="bg-gradient-to-r from-slate-800/70 to-slate-700/70 rounded-xl p-4 w-full max-w-2xl">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Field Magnitude:</p>
              <p className="text-xl font-bold text-yellow-400">
                {E > 1e6 ? (E / 1e6).toFixed(1) + ' MN/C' : '~0 N/C'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Field Direction:</p>
              <p className="text-xl font-bold text-cyan-400">
                {E > 1e6 ? angle.toFixed(0) + '°' : 'N/A'}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-slate-400 text-sm">Test Charge Position:</p>
              <p className="text-sm font-medium text-slate-300">
                ({testChargePos.x.toFixed(0)}, {testChargePos.y.toFixed(0)})
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            E = kQ/r² for point charges | E = V/d for parallel plates
          </p>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
        >
          Review Key Concepts →
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Electric Field Fundamentals</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">📐 Field Definition</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-lg text-center font-mono bg-slate-900/50 rounded-lg p-3">
              E = F/q (N/C or V/m)
            </p>
            <ul className="space-y-2">
              <li>• Force per unit positive test charge</li>
              <li>• Vector quantity (magnitude + direction)</li>
              <li>• Exists at every point in space</li>
              <li>• Independent of whether test charge is present</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">⊕ Point Charge Field</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-center font-mono bg-slate-900/50 rounded-lg p-3">
              E = kQ/r²
            </p>
            <ul className="space-y-2">
              <li>• Radial field (outward from + or inward to −)</li>
              <li>• Inverse square law (like gravity)</li>
              <li>• k = 8.99 × 10⁹ N·m²/C²</li>
              <li>• Superposition: E_total = E₁ + E₂ + ...</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">📍 Field Line Rules</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <ul className="space-y-2">
              <li>• Start on positive charges, end on negative</li>
              <li>• Never cross (field has unique direction at each point)</li>
              <li>• Denser lines = stronger field</li>
              <li>• Tangent to line = field direction at that point</li>
              <li>• Perpendicular to conductor surfaces</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">∥ Uniform Field</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-center font-mono bg-slate-900/50 rounded-lg p-3">
              E = V/d (parallel plates)
            </p>
            <ul className="space-y-2">
              <li>• Constant magnitude and direction</li>
              <li>• Between large parallel plates</li>
              <li>• Field lines are parallel and equally spaced</li>
              <li>• Used in capacitors, deflection systems</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 400 200" className="w-full max-w-md mx-auto mb-4">
          <rect x="0" y="0" width="400" height="200" fill="#1e293b" rx="8" />

          {/* Hollow sphere (conductor) */}
          <circle cx="200" cy="100" r="70" fill="none" stroke="#94a3b8" strokeWidth="4" />
          <circle cx="200" cy="100" r="65" fill="#1e293b" />

          {/* Charges on surface */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
            const rad = angle * Math.PI / 180;
            return (
              <circle
                key={angle}
                cx={200 + Math.cos(rad) * 67}
                cy={100 + Math.sin(rad) * 67}
                r="6"
                fill="#ef4444"
              />
            );
          })}

          {/* Question mark inside */}
          <text x="200" y="110" textAnchor="middle" fill="#22c55e" fontSize="36">E = ?</text>

          {/* Label */}
          <text x="200" y="190" textAnchor="middle" fill="#94a3b8" fontSize="12">
            Charged conducting hollow sphere
          </text>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          A hollow conducting sphere is given a positive charge.
          The charges distribute on the outer surface.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What is the electric field inside the hollow conductor?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Very strong, pointing toward the center' },
          { id: 'B', text: 'Zero everywhere inside', correct: true },
          { id: 'C', text: 'The same as outside the sphere' },
          { id: 'D', text: 'Depends on where you measure inside' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! The field inside a conductor is always zero!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This counterintuitive result is the basis for electrostatic shielding.
            It's how Faraday cages protect electronics and people from electric fields!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See Why E = 0 Inside →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Electrostatic Shielding</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 500 300" className="w-full">
          <rect x="0" y="0" width="500" height="300" fill="#0f172a" rx="12" />

          {/* Conductor outline */}
          <circle cx="250" cy="150" r="100" fill="none" stroke="#94a3b8" strokeWidth="6" />
          <circle cx="250" cy="150" r="90" fill="#1e293b" />

          {/* Surface charges */}
          {[...Array(16)].map((_, i) => {
            const angle = (i * 22.5) * Math.PI / 180;
            const pulseOffset = Math.sin(animationTime * 2 + i) * 3;
            return (
              <circle
                key={`charge-${i}`}
                cx={250 + Math.cos(angle) * (95 + pulseOffset)}
                cy={150 + Math.sin(angle) * (95 + pulseOffset)}
                r="8"
                fill="#ef4444"
              />
            );
          })}

          {/* External field arrows (being blocked) */}
          {[-40, 0, 40].map(yOffset => (
            <g key={`ext-${yOffset}`}>
              <line
                x1="50"
                y1={150 + yOffset}
                x2="140"
                y2={150 + yOffset}
                stroke="#fbbf24"
                strokeWidth="3"
                markerEnd="url(#arrowYellow)"
                opacity="0.7"
              />
              <line
                x1="360"
                y1={150 + yOffset}
                x2="450"
                y2={150 + yOffset}
                stroke="#fbbf24"
                strokeWidth="3"
                markerEnd="url(#arrowYellow)"
                opacity="0.7"
              />
            </g>
          ))}

          {/* E = 0 inside */}
          <text x="250" y="145" textAnchor="middle" fill="#22c55e" fontSize="28" fontWeight="bold">
            E = 0
          </text>
          <text x="250" y="170" textAnchor="middle" fill="#22c55e" fontSize="14">
            everywhere inside
          </text>

          {/* Labels */}
          <text x="95" y="280" textAnchor="middle" fill="#fbbf24" fontSize="12">External Field</text>
          <text x="250" y="280" textAnchor="middle" fill="#94a3b8" fontSize="12">Conductor</text>
          <text x="405" y="280" textAnchor="middle" fill="#fbbf24" fontSize="12">External Field</text>

          <defs>
            <marker id="arrowYellow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#fbbf24" />
            </marker>
          </defs>
        </svg>

        <div className="mt-4 space-y-3 text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">1</div>
            <p>When an external field is applied, free electrons in the conductor start to move</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">2</div>
            <p>Electrons redistribute until they create a field that exactly cancels the external field inside</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">3</div>
            <p>At equilibrium: E = 0 inside, all excess charge on surface</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">4</div>
            <p>This happens nearly instantaneously (speed of light in metal)!</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery: Faraday Cage</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Inside Conductors: E = 0 Always!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            This remarkable property has profound implications:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Any conductor shields its interior from external electric fields</li>
            <li>Doesn't need to be solid—a mesh works if holes are small enough</li>
            <li>Lightning strikes on airplanes leave passengers unharmed</li>
            <li>Sensitive electronics are protected in metal enclosures</li>
          </ul>
          <div className="bg-slate-900/50 rounded-xl p-4 mt-4">
            <p className="text-cyan-400 font-medium">
              "You could have millions of volts on the outside of a Faraday cage,
              and feel absolutely nothing inside—pure physics magic!"
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">✈️</div>
          <p className="text-sm text-slate-300">Aircraft Lightning Protection</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🔬</div>
          <p className="text-sm text-slate-300">MRI Room Shielding</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">📱</div>
          <p className="text-sm text-slate-300">EMP Protection</p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => {
              e.preventDefault();
              setActiveAppIndex(index);
              emitEvent('transfer_app_viewed', { appIndex: index, appTitle: app.title });
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? 'bg-yellow-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {isMobile ? '' : app.short}
          </button>
        ))}
      </div>

      <div className={`bg-gradient-to-br ${transferApps[activeAppIndex].color} rounded-2xl p-6 max-w-2xl w-full`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppIndex].title}</h3>
            <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p className="text-slate-200 mb-4">{transferApps[activeAppIndex].description}</p>

        <div className="bg-black/20 rounded-xl p-4 mb-4">
          <h4 className="text-cyan-400 font-semibold mb-2">🔗 Physics Connection</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].connection}</p>
        </div>

        <div className="bg-black/20 rounded-xl p-4 mb-4">
          <h4 className="text-yellow-400 font-semibold mb-2">⚙️ How It Works</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].howItWorks}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-green-400 font-semibold mb-2">📊 Key Stats</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              {transferApps[activeAppIndex].stats.map((stat, i) => (
                <li key={i}>• {stat}</li>
              ))}
            </ul>
          </div>

          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-orange-400 font-semibold mb-2">💡 Examples</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              {transferApps[activeAppIndex].examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4 mb-4">
          <h4 className="text-purple-400 font-semibold mb-2">🚀 Future Impact</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].futureImpact}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {transferApps[activeAppIndex].companies.map((company, i) => (
            <span key={i} className="px-2 py-1 bg-slate-600/50 rounded text-xs text-slate-300">
              {company}
            </span>
          ))}
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppIndex); }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              emitEvent('test_completed', { score: calculateTestScore() });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-500 hover:to-orange-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateTestScore() >= 7 ? '⚡' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateTestScore()}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {calculateTestScore() >= 7
                ? 'Excellent! You\'ve mastered Electric Fields!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>

            {calculateTestScore() >= 7 ? (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                Claim Your Mastery Badge →
              </button>
            ) : (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTestResults(false);
                  setTestAnswers(Array(10).fill(-1));
                  goToPhase(3);
                }}
                className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
              >
                Review & Try Again
              </button>
            )}
          </div>

          {/* Show explanations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Review Answers:</h4>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== -1 && q.options[userAnswer]?.correct;
              return (
                <div
                  key={qIndex}
                  className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}
                >
                  <p className="text-white font-medium mb-2">
                    {qIndex + 1}. {q.question}
                  </p>
                  <p className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {userAnswer !== -1 ? q.options[userAnswer].text : 'Not answered'}
                  </p>
                  {!isCorrect && (
                    <p className="text-emerald-400 text-sm mt-1">
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-slate-400 text-sm mt-2">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-yellow-900/50 via-orange-900/50 to-red-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-white mb-4">Electric Field Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the fundamental concept of electric fields!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">E = F/q</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📍</div>
            <p className="text-sm text-slate-300">Field Lines</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm text-slate-300">Faraday Cage</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚛️</div>
            <p className="text-sm text-slate-300">Applications</p>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 font-mono text-lg">
            E = kQ/r² | E = V/d
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Field direction: toward − charges, away from + charges
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  const phaseLabels = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Explore', 'Twist Review',
    'Apply', 'Test', 'Mastery'
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/50 via-transparent to-blue-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>Electric Fields</span>
          <div className="flex gap-1.5 items-center">
            {phaseLabels.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i ? 'bg-cyan-500 w-6' : phase > i ? 'bg-cyan-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[i]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default ElectricFieldRenderer;
