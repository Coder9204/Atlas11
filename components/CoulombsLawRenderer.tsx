'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// COULOMB'S LAW RENDERER - GOLD STANDARD
// The fundamental law governing electrostatic force between charges
// F = k × q₁ × q₂ / r² where k = 8.99 × 10⁹ N·m²/C²
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
  | 'force_calculated'
  | 'field_visualized'
  | 'charge_placed'
  | 'charge_moved'
  | 'equilibrium_found';

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

interface Charge {
  id: number;
  x: number;
  y: number;
  q: number; // charge in microcoulombs
  color: string;
}

// Coulomb's constant
const k = 8.99e9; // N·m²/C²

const CoulombsLawRenderer: React.FC<Props> = ({
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
  const [charges, setCharges] = useState<Charge[]>([
    { id: 1, x: 150, y: 200, q: 5, color: '#ef4444' },
    { id: 2, x: 350, y: 200, q: -5, color: '#3b82f6' }
  ]);
  const [selectedChargeId, setSelectedChargeId] = useState<number | null>(null);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [animationTime, setAnimationTime] = useState(0);
  const [charge1Magnitude, setCharge1Magnitude] = useState(5);
  const [charge2Magnitude, setCharge2Magnitude] = useState(-5);
  const [separation, setSeparation] = useState(200);

  const navigationLockRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  // Update charges when magnitudes change
  useEffect(() => {
    setCharges(prev => prev.map((c, i) => ({
      ...c,
      q: i === 0 ? charge1Magnitude : charge2Magnitude,
      color: (i === 0 ? charge1Magnitude : charge2Magnitude) > 0 ? '#ef4444' : '#3b82f6'
    })));
  }, [charge1Magnitude, charge2Magnitude]);

  // Update separation
  useEffect(() => {
    setCharges(prev => {
      const centerX = 250;
      return prev.map((c, i) => ({
        ...c,
        x: i === 0 ? centerX - separation / 2 : centerX + separation / 2
      }));
    });
  }, [separation]);

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
          gainNode.gain.exponentialDecayToValueAtTime?.(0.01, ctx.currentTime + 0.1) ||
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
          oscillator.frequency.value = 1000;
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          oscillator.frequency.setValueAtTime(100, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
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

  // Calculate force between two charges
  const calculateForce = useCallback((q1: number, q2: number, r: number): number => {
    // q in microcoulombs, r in pixels (scale: 1px = 1mm)
    const q1_C = q1 * 1e-6;
    const q2_C = q2 * 1e-6;
    const r_m = r * 0.001; // 1 pixel = 1mm
    if (r_m === 0) return 0;
    return k * q1_C * q2_C / (r_m * r_m);
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);

    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    emitEvent('prediction_made', { prediction, correct: isCorrect });
  }, [playSound, emitEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 400) return;
    lastInteractionRef.current = now;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);

    const isCorrect = prediction === 'C';
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

  // Test questions with scenarios
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A physics student places two identical metal spheres, each with +3 μC charge, 10 cm apart on an insulating surface.",
      question: "What happens when the student releases the spheres?",
      options: [
        { text: "They move toward each other", correct: false },
        { text: "They move away from each other", correct: true },
        { text: "They remain stationary", correct: false },
        { text: "They orbit around each other", correct: false }
      ],
      explanation: "Like charges repel. Both spheres have positive charge, so they experience a repulsive force pushing them apart. The force magnitude is F = kq₁q₂/r² = (8.99×10⁹)(3×10⁻⁶)²/(0.1)² ≈ 8.1 N."
    },
    {
      scenario: "An engineer doubles the distance between two charged particles from 1m to 2m while keeping the charges constant.",
      question: "How does the electrostatic force change?",
      options: [
        { text: "It doubles", correct: false },
        { text: "It halves", correct: false },
        { text: "It becomes one-fourth as strong", correct: true },
        { text: "It quadruples", correct: false }
      ],
      explanation: "Coulomb's Law has an inverse-square relationship with distance: F ∝ 1/r². When distance doubles (2×), force becomes (1/2)² = 1/4 of the original. This is why electrostatic forces are so strong at atomic scales but weak at macroscopic distances."
    },
    {
      scenario: "A charged balloon sticks to a neutral wall. The balloon has a negative charge of -2 μC.",
      question: "How can a charged object attract a neutral object?",
      options: [
        { text: "The wall becomes permanently charged", correct: false },
        { text: "Gravity assists the attraction", correct: false },
        { text: "The balloon induces polarization in the wall surface", correct: true },
        { text: "Neutral objects are always attracted to charges", correct: false }
      ],
      explanation: "The negative balloon repels electrons in the wall's surface, leaving positive charges closer to the balloon. Since Coulomb force is stronger at shorter distances, the attraction to nearby positive charges exceeds the repulsion from farther negative charges. This is called polarization or induction."
    },
    {
      scenario: "In a hydrogen atom, the electron (q = -1.6×10⁻¹⁹ C) orbits the proton (q = +1.6×10⁻¹⁹ C) at approximately 5.3×10⁻¹¹ m.",
      question: "What is the approximate Coulomb force between them?",
      options: [
        { text: "About 8.2 × 10⁻⁸ N", correct: true },
        { text: "About 8.2 × 10⁻¹⁵ N", correct: false },
        { text: "About 9.0 × 10⁹ N", correct: false },
        { text: "About 1.6 × 10⁻¹⁹ N", correct: false }
      ],
      explanation: "F = kq₁q₂/r² = (8.99×10⁹)(1.6×10⁻¹⁹)²/(5.3×10⁻¹¹)² ≈ 8.2×10⁻⁸ N. This seems tiny, but for the electron's mass (~10⁻³⁰ kg), this produces enormous acceleration—about 10²² m/s²! This is why atoms hold together."
    },
    {
      scenario: "A technician compares two setups: Setup A has charges +4μC and -2μC at 5cm apart. Setup B has charges +2μC and -1μC at 5cm apart.",
      question: "How do the forces in Setup A and Setup B compare?",
      options: [
        { text: "Force A = Force B", correct: false },
        { text: "Force A = 2 × Force B", correct: false },
        { text: "Force A = 4 × Force B", correct: true },
        { text: "Force A = 8 × Force B", correct: false }
      ],
      explanation: "Force ∝ q₁q₂. Setup A: |4×(-2)| = 8 μC². Setup B: |2×(-1)| = 2 μC². The ratio is 8/2 = 4, so Force A is 4 times greater than Force B. Since both are opposite charges, both forces are attractive."
    },
    {
      scenario: "Three charges are placed in a line: +Q at x=0, +Q at x=d, and a test charge +q at x=d/2.",
      question: "What is the net force on the test charge?",
      options: [
        { text: "Net force points left", correct: false },
        { text: "Net force points right", correct: false },
        { text: "Net force is zero", correct: true },
        { text: "Net force points up", correct: false }
      ],
      explanation: "By symmetry, the test charge +q is equidistant from both +Q charges. Each +Q exerts an equal-magnitude repulsive force on +q, but in opposite directions (left and right). The forces cancel, resulting in zero net force—but this is unstable equilibrium!"
    },
    {
      scenario: "A lightning rod has a sharp pointed tip rather than a rounded end.",
      question: "Why does the sharp point help with lightning protection?",
      options: [
        { text: "Sharp points are cheaper to manufacture", correct: false },
        { text: "Points create stronger electric fields that ionize air more easily", correct: true },
        { text: "Points attract lightning directly by being taller", correct: false },
        { text: "The shape doesn't matter, only the material", correct: false }
      ],
      explanation: "Charge concentrates at sharp points, creating intense local electric fields. This ionizes air molecules, creating a conductive path that allows gradual charge dissipation. The rod prevents sudden, destructive lightning strikes by continuously bleeding charge through corona discharge."
    },
    {
      scenario: "In a Van de Graaff generator, a rubber belt carries positive charges from the base to a metal dome.",
      question: "Why do the charges spread over the dome's outer surface?",
      options: [
        { text: "The charges are attracted to the air outside", correct: false },
        { text: "Gravity pulls them to the bottom", correct: false },
        { text: "Like charges repel, maximizing distance by spreading to the surface", correct: true },
        { text: "Metal conducts charges to the outside automatically", correct: false }
      ],
      explanation: "Like charges repel each other. In a conductor, charges can move freely and arrange themselves to minimize potential energy. This happens when they spread as far apart as possible—on the outer surface of the conductor. Inside a charged conductor at equilibrium, the electric field is zero."
    },
    {
      scenario: "An inkjet printer uses charged ink droplets that pass between deflection plates with voltages of ±1500V.",
      question: "How does this system direct ink to the correct position on paper?",
      options: [
        { text: "Magnetic fields guide the droplets", correct: false },
        { text: "The electric field between plates exerts Coulomb force on charged droplets", correct: true },
        { text: "Air pressure pushes the droplets", correct: false },
        { text: "Gravity curves the droplet paths", correct: false }
      ],
      explanation: "Charged droplets experience Coulomb force F = qE in the electric field between the plates. The field E = V/d creates a force perpendicular to the droplet's motion, deflecting it. By varying the droplet charge, the printer controls exactly where each droplet lands."
    },
    {
      scenario: "Electrostatic precipitators in power plants use high-voltage wires (-50,000V) to charge smoke particles, which then stick to grounded collection plates.",
      question: "Why do the charged particles move toward the grounded plates?",
      options: [
        { text: "The particles become magnetic when charged", correct: false },
        { text: "Wind blows them toward the plates", correct: false },
        { text: "Negatively charged particles are attracted to the relatively positive plates", correct: true },
        { text: "The particles become heavier when charged", correct: false }
      ],
      explanation: "The corona discharge gives smoke particles a negative charge. The grounded plates (at 0V potential) are more positive than the -50,000V wires, creating an electric field pointing toward the plates. Negatively charged particles experience force F = qE in the opposite direction of E, moving them toward the plates."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "🏭",
      title: "Electrostatic Precipitators",
      short: "Clean Air Technology",
      tagline: "Capturing particles with electric fields",
      description: "Coulomb's Law enables the removal of 99%+ of particulate matter from industrial exhaust, preventing air pollution.",
      connection: "Charged particles experience Coulomb force in electric fields, moving toward collection plates where they accumulate and are removed.",
      howItWorks: "High-voltage corona wires ionize air molecules, which transfer charge to passing particles. The charged particles then migrate to grounded collection plates under the influence of the strong electric field, where they stick and are periodically cleaned off.",
      stats: [
        "Remove 99.9% of particles",
        "Handle temperatures up to 450°C",
        "Process millions of m³/hour",
        "Capture particles down to 0.01 μm"
      ],
      examples: [
        "Coal power plant fly ash removal",
        "Cement kiln dust collection",
        "Steel mill emission control",
        "Paper mill recovery boilers"
      ],
      companies: ["GE Power", "Babcock & Wilcox", "Mitsubishi Power", "Siemens"],
      futureImpact: "Next-generation precipitators with pulsed power systems will achieve even higher efficiency while reducing energy consumption, critical for meeting stricter air quality standards worldwide.",
      color: "from-gray-700 to-gray-900"
    },
    {
      icon: "🖨️",
      title: "Xerography & Laser Printing",
      short: "Electrostatic Imaging",
      tagline: "Printing with charged particles",
      description: "Every laser printer and photocopier uses Coulomb's Law to precisely place toner particles and create sharp images.",
      connection: "Toner particles with specific charges are attracted or repelled by charged regions on a photoconductor drum, creating images through controlled electrostatic forces.",
      howItWorks: "A laser discharges specific areas on a charged photoconductor drum. Oppositely charged toner particles stick only to the remaining charged areas. Paper receives a stronger charge that pulls toner off the drum, then heat fuses the toner permanently.",
      stats: [
        "Resolution up to 4800 DPI",
        "Toner particles ~5-10 μm",
        "Drum voltage ~1000V",
        "Millions of pages per drum"
      ],
      examples: [
        "Office laser printers",
        "High-speed commercial printing",
        "Photocopiers",
        "Digital press systems"
      ],
      companies: ["Xerox", "HP", "Canon", "Ricoh"],
      futureImpact: "Electrostatic printing is enabling 3D printing of complex materials, with charged particle deposition creating precise microstructures for electronics, biomedical devices, and aerospace components.",
      color: "from-blue-700 to-indigo-900"
    },
    {
      icon: "🎨",
      title: "Electrostatic Coating",
      short: "Efficient Painting",
      tagline: "Coulomb force for perfect finishes",
      description: "Electrostatic spray systems use charge attraction to achieve 95%+ transfer efficiency, reducing waste and creating uniform coatings.",
      connection: "Charged paint or powder particles are attracted to grounded objects by Coulomb force, wrapping around edges and reaching recessed areas that conventional spraying misses.",
      howItWorks: "Paint particles are charged at 60-100 kV as they leave the spray gun. The grounded workpiece attracts the charged particles, which follow electric field lines to coat all surfaces uniformly—even the back sides—through electrostatic wraparound.",
      stats: [
        "95% transfer efficiency (vs 30% conventional)",
        "Coating thickness: 25-75 μm",
        "Reduces overspray by 90%",
        "VOC reduction up to 80%"
      ],
      examples: [
        "Automotive body painting",
        "Appliance powder coating",
        "Furniture finishing",
        "Aerospace component coating"
      ],
      companies: ["Graco", "Nordson", "Wagner", "SAMES KREMLIN"],
      futureImpact: "Smart electrostatic systems with real-time charge control will enable single-coat finishes with gradient properties—harder outer surfaces transitioning to flexible inner layers—reducing manufacturing steps.",
      color: "from-orange-600 to-red-800"
    },
    {
      icon: "⚡",
      title: "Lightning Protection Systems",
      short: "Charge Management",
      tagline: "Taming nature's electricity",
      description: "Lightning rods and protection systems use principles of charge distribution and Coulomb's Law to safely channel massive electrical discharges.",
      connection: "Sharp points concentrate charge and create strong local electric fields, enabling controlled corona discharge that prevents destructive lightning strikes.",
      howItWorks: "Lightning rods create a region of ionized air through corona discharge, providing a low-resistance path for lightning. The rod system safely conducts the strike current (up to 200,000 A) to ground, protecting structures from the thermal and electromagnetic effects.",
      stats: [
        "Lightning carries ~1-5 coulombs",
        "Peak current up to 200 kA",
        "Strike duration ~0.5 ms",
        "Protection zone ~45° cone"
      ],
      examples: [
        "Building lightning rods",
        "Aircraft static dischargers",
        "Wind turbine protection",
        "Rocket launch pads"
      ],
      companies: ["Lightning Protection International", "ERICO", "Pentair", "East Coast Lightning Equipment"],
      futureImpact: "Laser-triggered lightning protection may enable precise control of lightning strike locations, protecting sensitive installations like data centers and space launch facilities with near-perfect reliability.",
      color: "from-yellow-500 to-amber-700"
    }
  ];

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === -1) return score;
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers, testQuestions]);

  // Render electric field lines
  const renderFieldLines = useCallback((charges: Charge[], width: number, height: number) => {
    if (!showFieldLines) return null;

    const lines: JSX.Element[] = [];
    const numLines = 8;

    charges.forEach((charge, chargeIndex) => {
      if (charge.q === 0) return;

      for (let i = 0; i < numLines; i++) {
        const angle = (2 * Math.PI * i) / numLines;
        const points: { x: number; y: number }[] = [];

        let x = charge.x + Math.cos(angle) * 20;
        let y = charge.y + Math.sin(angle) * 20;

        const direction = charge.q > 0 ? 1 : -1;

        for (let step = 0; step < 50; step++) {
          if (x < 0 || x > width || y < 0 || y > height) break;

          points.push({ x, y });

          // Calculate field at this point
          let Ex = 0, Ey = 0;
          charges.forEach(c => {
            const dx = x - c.x;
            const dy = y - c.y;
            const r = Math.sqrt(dx * dx + dy * dy);
            if (r < 10) return;
            const E = (c.q > 0 ? 1 : -1) / (r * r);
            Ex += E * dx / r;
            Ey += E * dy / r;
          });

          const Emag = Math.sqrt(Ex * Ex + Ey * Ey);
          if (Emag < 0.0001) break;

          x += direction * (Ex / Emag) * 5;
          y += direction * (Ey / Emag) * 5;
        }

        if (points.length > 2) {
          const pathD = points.map((p, idx) =>
            `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
          ).join(' ');

          lines.push(
            <path
              key={`field-${chargeIndex}-${i}`}
              d={pathD}
              fill="none"
              stroke={charge.q > 0 ? '#fca5a5' : '#93c5fd'}
              strokeWidth="1"
              opacity="0.5"
            />
          );
        }
      }
    });

    return <g>{lines}</g>;
  }, [showFieldLines]);

  // Render force vectors
  const renderForceVectors = useCallback(() => {
    if (!showForceVectors || charges.length < 2) return null;

    const vectors: JSX.Element[] = [];

    for (let i = 0; i < charges.length; i++) {
      let Fx = 0, Fy = 0;

      for (let j = 0; j < charges.length; j++) {
        if (i === j) continue;

        const dx = charges[j].x - charges[i].x;
        const dy = charges[j].y - charges[i].y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 1) continue;

        // Force direction (attraction/repulsion)
        const forceMag = charges[i].q * charges[j].q;
        const direction = forceMag < 0 ? 1 : -1; // Opposite charges attract

        Fx += direction * Math.abs(forceMag) * dx / (r * r * r) * 1000;
        Fy += direction * Math.abs(forceMag) * dy / (r * r * r) * 1000;
      }

      const Fmag = Math.sqrt(Fx * Fx + Fy * Fy);
      if (Fmag > 1) {
        const scale = Math.min(50, Fmag * 5);
        const endX = charges[i].x + (Fx / Fmag) * scale;
        const endY = charges[i].y + (Fy / Fmag) * scale;

        vectors.push(
          <g key={`force-${i}`}>
            <line
              x1={charges[i].x}
              y1={charges[i].y}
              x2={endX}
              y2={endY}
              stroke="#22c55e"
              strokeWidth="3"
              markerEnd="url(#forceArrow)"
            />
          </g>
        );
      }
    }

    return <g>{vectors}</g>;
  }, [showForceVectors, charges]);

  // Phase renderers
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">ELECTROSTATICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-300 via-white to-blue-300 bg-clip-text text-transparent">
        Coulomb's Law
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        The invisible force between electric charges
      </p>

      {/* Premium card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/5 mb-8">
        <svg viewBox="0 0 500 300" className="w-full max-w-md mx-auto mb-6">
          <defs>
            <radialGradient id="positiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="negativeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="500" height="300" fill="#0f172a" rx="12" />

          {/* Electric field lines (animated) */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const startAngle = (i * 60) * Math.PI / 180;
            const offset = Math.sin(animationTime * 2 + i) * 5;
            return (
              <path
                key={`line-${i}`}
                d={`M ${150 + Math.cos(startAngle) * 40} ${150 + Math.sin(startAngle) * 40}
                    Q 250 ${150 + offset}
                    ${350 + Math.cos(startAngle + Math.PI) * 40} ${150 + Math.sin(startAngle + Math.PI) * 40}`}
                stroke="#4ade80"
                strokeWidth="2"
                fill="none"
                opacity="0.4"
              />
            );
          })}

          {/* Positive charge glow */}
          <circle cx="150" cy="150" r="60" fill="url(#positiveGlow)">
            <animate attributeName="r" values="50;60;50" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Negative charge glow */}
          <circle cx="350" cy="150" r="60" fill="url(#negativeGlow)">
            <animate attributeName="r" values="50;60;50" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Positive charge */}
          <circle cx="150" cy="150" r="35" fill="#ef4444" stroke="#fca5a5" strokeWidth="3" />
          <text x="150" y="160" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">+</text>

          {/* Negative charge */}
          <circle cx="350" cy="150" r="35" fill="#3b82f6" stroke="#93c5fd" strokeWidth="3" />
          <text x="350" y="160" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">−</text>

          {/* Force arrows */}
          <g>
            <path d="M190,150 L250,150" stroke="#22c55e" strokeWidth="4" markerEnd="url(#greenArrow)" />
            <path d="M310,150 L250,150" stroke="#22c55e" strokeWidth="4" markerEnd="url(#greenArrow)" />
          </g>

          {/* Equation */}
          <text x="250" y="260" textAnchor="middle" fill="#94a3b8" fontSize="20">
            F = k × q₁ × q₂ / r²
          </text>

          <defs>
            <marker id="greenArrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p className="text-xl text-slate-300 mb-4">
          Two invisible forces reach across empty space...
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Why do opposite charges attract while like charges repel?
        </p>
        <p className="text-sm text-slate-500 mt-2">
          k = 8.99 x 10^9 N.m^2/C^2 (Coulomb's constant)
        </p>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Electric Force
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <p className="mt-6 text-sm text-slate-500">Explore attraction and repulsion between charges</p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Two charged particles are placed near each other. One has charge +4 μC,
          the other has charge -2 μC, separated by 10 cm.
        </p>
        <svg viewBox="0 0 400 150" className="w-full max-w-sm mx-auto my-4">
          <rect x="0" y="0" width="400" height="150" fill="#1e293b" rx="8" />

          {/* Positive charge */}
          <circle cx="100" cy="75" r="25" fill="#ef4444" stroke="#fca5a5" strokeWidth="2" />
          <text x="100" y="83" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">+</text>
          <text x="100" y="120" textAnchor="middle" fill="#fca5a5" fontSize="12">+4 μC</text>

          {/* Negative charge */}
          <circle cx="300" cy="75" r="25" fill="#3b82f6" stroke="#93c5fd" strokeWidth="2" />
          <text x="300" y="83" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">−</text>
          <text x="300" y="120" textAnchor="middle" fill="#93c5fd" fontSize="12">-2 μC</text>

          {/* Distance marker */}
          <line x1="125" y1="35" x2="275" y2="35" stroke="#94a3b8" strokeWidth="2" />
          <line x1="125" y1="30" x2="125" y2="40" stroke="#94a3b8" strokeWidth="2" />
          <line x1="275" y1="30" x2="275" y2="40" stroke="#94a3b8" strokeWidth="2" />
          <text x="200" y="28" textAnchor="middle" fill="#94a3b8" fontSize="12">10 cm</text>

          {/* Question marks for force */}
          <text x="160" y="80" fill="#22c55e" fontSize="20">?</text>
          <text x="240" y="80" fill="#22c55e" fontSize="20">?</text>
        </svg>
        <p className="text-cyan-400 font-medium">
          What forces will these charges experience?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Both charges repel each other (push apart)' },
          { id: 'B', text: 'Both charges attract each other (pull together)' },
          { id: 'C', text: 'Only the positive charge experiences a force' },
          { id: 'D', text: 'The forces depend on which charge is larger' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
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
            ✓ Correct! Opposite charges attract each other!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            F = k × |q₁| × |q₂| / r² = 8.99×10⁹ × 4×10⁻⁶ × 2×10⁻⁶ / (0.1)² ≈ 7.2 N
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-blue-500 transition-all duration-300"
          >
            Explore the Simulation →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => {
    const distance = Math.sqrt(
      Math.pow(charges[1].x - charges[0].x, 2) +
      Math.pow(charges[1].y - charges[0].y, 2)
    );
    const force = calculateForce(charges[0].q, charges[1].q, distance);
    const isAttractive = charges[0].q * charges[1].q < 0;

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Coulomb's Law Lab</h2>

        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
          <svg viewBox="0 0 500 400" className="w-full bg-slate-900 rounded-xl">
            <defs>
              <marker id="forceArrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#22c55e" />
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
            {[...Array(10)].map((_, i) => (
              <g key={`grid-${i}`}>
                <line x1={i * 50} y1="0" x2={i * 50} y2="400" stroke="#334155" strokeWidth="0.5" />
                <line x1="0" y1={i * 50} x2="500" y2={i * 50} stroke="#334155" strokeWidth="0.5" />
              </g>
            ))}

            {/* Field lines */}
            {renderFieldLines(charges, 500, 400)}

            {/* Force vectors */}
            {renderForceVectors()}

            {/* Charges */}
            {charges.map((charge, index) => (
              <g key={charge.id}>
                {/* Glow effect */}
                <circle
                  cx={charge.x}
                  cy={charge.y}
                  r={35 + Math.sin(animationTime * 3) * 3}
                  fill={charge.q > 0 ? 'url(#positiveGlow)' : 'url(#negativeGlow)'}
                  opacity="0.5"
                />

                {/* Charge circle */}
                <circle
                  cx={charge.x}
                  cy={charge.y}
                  r={25 + Math.abs(charge.q) * 2}
                  fill={charge.q > 0 ? 'url(#posGrad)' : 'url(#negGrad)'}
                  stroke={selectedChargeId === charge.id ? '#fbbf24' : (charge.q > 0 ? '#fca5a5' : '#93c5fd')}
                  strokeWidth={selectedChargeId === charge.id ? 4 : 2}
                  className="cursor-pointer"
                  onMouseDown={() => setSelectedChargeId(charge.id)}
                />

                {/* Charge symbol */}
                <text
                  x={charge.x}
                  y={charge.y + 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="28"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {charge.q > 0 ? '+' : '−'}
                </text>

                {/* Charge label */}
                <text
                  x={charge.x}
                  y={charge.y + 50}
                  textAnchor="middle"
                  fill={charge.q > 0 ? '#fca5a5' : '#93c5fd'}
                  fontSize="12"
                >
                  q{index + 1} = {charge.q > 0 ? '+' : ''}{charge.q} μC
                </text>
              </g>
            ))}

            {/* Distance line */}
            <line
              x1={charges[0].x}
              y1={charges[0].y}
              x2={charges[1].x}
              y2={charges[1].y}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
            <text
              x={(charges[0].x + charges[1].x) / 2}
              y={(charges[0].y + charges[1].y) / 2 - 10}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="12"
            >
              r = {(distance * 0.001).toFixed(3)} m
            </text>
          </svg>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-red-400 font-medium text-sm">Charge 1 (μC)</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={charge1Magnitude}
              onChange={(e) => {
                setCharge1Magnitude(Number(e.target.value));
                emitEvent('parameter_changed', { param: 'charge1', value: Number(e.target.value) });
              }}
              className="w-full mt-2 accent-red-500"
            />
            <div className="text-center text-white font-bold">{charge1Magnitude > 0 ? '+' : ''}{charge1Magnitude}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-blue-400 font-medium text-sm">Charge 2 (μC)</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={charge2Magnitude}
              onChange={(e) => {
                setCharge2Magnitude(Number(e.target.value));
                emitEvent('parameter_changed', { param: 'charge2', value: Number(e.target.value) });
              }}
              className="w-full mt-2 accent-blue-500"
            />
            <div className="text-center text-white font-bold">{charge2Magnitude > 0 ? '+' : ''}{charge2Magnitude}</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-green-400 font-medium text-sm">Separation (mm)</label>
            <input
              type="range"
              min="50"
              max="350"
              step="10"
              value={separation}
              onChange={(e) => {
                setSeparation(Number(e.target.value));
                emitEvent('parameter_changed', { param: 'separation', value: Number(e.target.value) });
              }}
              className="w-full mt-2 accent-green-500"
            />
            <div className="text-center text-white font-bold">{separation}</div>
          </div>
        </div>

        {/* Display toggles and result */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-4">
          <button
            onMouseDown={() => setShowFieldLines(!showFieldLines)}
            className={`p-3 rounded-xl transition-colors ${
              showFieldLines ? 'bg-purple-600' : 'bg-slate-700'
            } text-white font-medium`}
          >
            {showFieldLines ? '🔮 Field Lines: ON' : '🔮 Field Lines: OFF'}
          </button>
          <button
            onMouseDown={() => setShowForceVectors(!showForceVectors)}
            className={`p-3 rounded-xl transition-colors ${
              showForceVectors ? 'bg-green-600' : 'bg-slate-700'
            } text-white font-medium`}
          >
            {showForceVectors ? '➡️ Force Vectors: ON' : '➡️ Force Vectors: OFF'}
          </button>
        </div>

        {/* Force calculation result */}
        <div className="bg-gradient-to-r from-slate-800/70 to-slate-700/70 rounded-xl p-4 w-full max-w-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-slate-400 text-sm">Electrostatic Force:</p>
              <p className="text-2xl font-bold text-cyan-400">
                {Math.abs(force).toExponential(2)} N
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${isAttractive ? 'bg-green-600/30' : 'bg-red-600/30'}`}>
              <p className={`font-semibold ${isAttractive ? 'text-green-400' : 'text-red-400'}`}>
                {isAttractive ? '← ATTRACTIVE →' : '→ REPULSIVE ←'}
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            F = k × |q₁| × |q₂| / r² = 8.99×10⁹ × |{charge1Magnitude}×10⁻⁶| × |{charge2Magnitude}×10⁻⁶| / ({(separation * 0.001).toFixed(3)})²
          </p>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-blue-500 transition-all duration-300"
        >
          Review Key Concepts →
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Coulomb's Law Fundamentals</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">📐 The Inverse Square Law</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-lg text-center font-mono bg-slate-900/50 rounded-lg p-3">
              F = k × q₁ × q₂ / r²
            </p>
            <ul className="space-y-2">
              <li>• Double the distance → 1/4 the force</li>
              <li>• Triple the distance → 1/9 the force</li>
              <li>• Halve the distance → 4× the force</li>
              <li>• Same form as Newton's gravity law!</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">⚡ Charge Interactions</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <div className="flex items-center gap-4 justify-center mb-4">
              <span className="text-2xl">+ +</span>
              <span className="text-yellow-400">→ Repel ←</span>
            </div>
            <div className="flex items-center gap-4 justify-center mb-4">
              <span className="text-2xl">− −</span>
              <span className="text-yellow-400">→ Repel ←</span>
            </div>
            <div className="flex items-center gap-4 justify-center">
              <span className="text-2xl">+ −</span>
              <span className="text-green-400">← Attract →</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🔢 Coulomb's Constant</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-center font-mono bg-slate-900/50 rounded-lg p-2">
              k = 8.99 × 10⁹ N·m²/C²
            </p>
            <ul className="space-y-2">
              <li>• Also written as k = 1/(4πε₀)</li>
              <li>• ε₀ = 8.85 × 10⁻¹² F/m (permittivity)</li>
              <li>• Enormous value → strong atomic forces</li>
              <li>• ~10⁴⁰ times stronger than gravity!</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🎯 Superposition Principle</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p>With multiple charges, forces add as vectors:</p>
            <p className="text-center font-mono bg-slate-900/50 rounded-lg p-2">
              F_net = F₁ + F₂ + F₃ + ...
            </p>
            <ul className="space-y-2">
              <li>• Calculate each pair separately</li>
              <li>• Add x and y components</li>
              <li>• Find resultant magnitude and direction</li>
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

          {/* Balloon */}
          <ellipse cx="100" cy="80" rx="40" ry="50" fill="#3b82f6" />
          <path d="M100,130 L95,150 L105,150 Z" fill="#3b82f6" />
          <text x="100" y="70" textAnchor="middle" fill="white" fontSize="20">−−</text>
          <text x="100" y="95" textAnchor="middle" fill="white" fontSize="12">−2 μC</text>

          {/* Wall */}
          <rect x="250" y="30" width="20" height="140" fill="#64748b" />
          <text x="320" y="100" textAnchor="middle" fill="#94a3b8" fontSize="14">Neutral</text>
          <text x="320" y="118" textAnchor="middle" fill="#94a3b8" fontSize="14">Wall</text>

          {/* Question */}
          <text x="175" y="100" textAnchor="middle" fill="#22c55e" fontSize="24">?</text>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          A negatively charged balloon is brought near a neutral wall (uncharged).
          The wall has no net electric charge.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What will happen when the balloon gets close to the wall?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Nothing—neutral objects don\'t interact with charges' },
          { id: 'B', text: 'The balloon will be repelled by the wall' },
          { id: 'C', text: 'The balloon will be attracted to and stick to the wall' },
          { id: 'D', text: 'The wall will become permanently charged' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
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
            ✓ Correct! The balloon sticks to the wall through polarization!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Even though the wall is neutral, the balloon's charge causes the wall's electrons to shift,
            creating an attractive force. This is called "electrostatic induction."
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See How Polarization Works →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Electrostatic Induction</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 500 300" className="w-full">
          <rect x="0" y="0" width="500" height="300" fill="#0f172a" rx="12" />

          {/* Animated balloon approaching wall */}
          <g transform={`translate(${100 + Math.sin(animationTime) * 30}, 0)`}>
            {/* Balloon */}
            <ellipse cx="100" cy="150" rx="50" ry="60" fill="#3b82f6" />
            <path d="M100,210 L90,240 L110,240 Z" fill="#3b82f6" />
            <text x="100" y="140" textAnchor="middle" fill="white" fontSize="18">− − −</text>
            <text x="100" y="165" textAnchor="middle" fill="white" fontSize="18">− − −</text>
          </g>

          {/* Wall with polarization */}
          <rect x="280" y="50" width="100" height="200" fill="#475569" rx="4" />

          {/* Polarized charges in wall */}
          <g>
            {/* Positive charges (attracted to balloon) - left side */}
            {[0, 1, 2, 3, 4].map(i => (
              <g key={`pos-${i}`}>
                <circle
                  cx={295 + Math.sin(animationTime * 2) * 5}
                  cy={80 + i * 40}
                  r="10"
                  fill="#ef4444"
                  opacity="0.8"
                />
                <text
                  x={295 + Math.sin(animationTime * 2) * 5}
                  y={85 + i * 40}
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                >+</text>
              </g>
            ))}

            {/* Negative charges (repelled from balloon) - right side */}
            {[0, 1, 2, 3, 4].map(i => (
              <g key={`neg-${i}`}>
                <circle
                  cx={365 - Math.sin(animationTime * 2) * 5}
                  cy={80 + i * 40}
                  r="10"
                  fill="#3b82f6"
                  opacity="0.8"
                />
                <text
                  x={365 - Math.sin(animationTime * 2) * 5}
                  y={85 + i * 40}
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                >−</text>
              </g>
            ))}
          </g>

          {/* Force arrow */}
          <path
            d="M200,150 L260,150"
            stroke="#22c55e"
            strokeWidth="4"
            markerEnd="url(#greenArrow)"
          />
          <text x="230" y="140" textAnchor="middle" fill="#22c55e" fontSize="14">F_attraction</text>

          {/* Labels */}
          <text x="100" y="280" textAnchor="middle" fill="#94a3b8" fontSize="12">Charged Balloon</text>
          <text x="330" y="280" textAnchor="middle" fill="#94a3b8" fontSize="12">Neutral Wall (Polarized)</text>
        </svg>

        <div className="mt-4 space-y-3 text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">1</div>
            <p>Balloon's negative charge repels electrons in the wall surface</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">2</div>
            <p>Positive charges (protons in atoms) are left closer to the balloon</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">3</div>
            <p>Since F ∝ 1/r², the closer positive charges create stronger attraction than the farther negative charges create repulsion</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">4</div>
            <p>Net result: The balloon is attracted to and sticks to the wall!</p>
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
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery: Polarization</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Coulomb's Law Reveals Hidden Attractions!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The inverse-square nature of Coulomb's Law means:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Nearby charges always dominate over distant ones</li>
            <li>Polarization creates unequal distances → net force</li>
            <li>Even neutral objects can be attracted to charges</li>
            <li>This is why static cling, dust attraction, and many everyday phenomena occur</li>
          </ul>
          <div className="bg-slate-900/50 rounded-xl p-4 mt-4">
            <p className="text-cyan-400 font-medium">
              "The strength of electrostatic attraction to a polarized neutral object
              is proportional to 1/r⁴—it falls off even faster than Coulomb's Law!"
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🎈</div>
          <p className="text-sm text-slate-300">Balloon on Wall</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🧦</div>
          <p className="text-sm text-slate-300">Static Cling</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🌊</div>
          <p className="text-sm text-slate-300">Water Bending</p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-blue-500 transition-all duration-300"
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
                ? 'bg-cyan-600 text-white'
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-blue-500 transition-all duration-300"
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
                        ? 'bg-cyan-600 text-white'
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
                : 'bg-gradient-to-r from-red-600 to-blue-600 text-white hover:from-red-500 hover:to-blue-500'
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
                ? 'Excellent! You\'ve mastered Coulomb\'s Law!'
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
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-blue-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-red-900/50 via-purple-900/50 to-blue-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-white mb-4">Coulomb's Law Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the fundamental law of electrostatic force!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔴🔵</div>
            <p className="text-sm text-slate-300">Charge Interactions</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">Inverse Square Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🎈</div>
            <p className="text-sm text-slate-300">Polarization</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🏭</div>
            <p className="text-sm text-slate-300">Applications</p>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
          <p className="text-cyan-400 font-mono text-lg">
            F = k × q₁ × q₂ / r²
          </p>
          <p className="text-slate-400 text-sm mt-2">
            k = 8.99 × 10⁹ N·m²/C²
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
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-purple-400">Coulomb's Law</span>
          <div className="flex gap-1.5">
            {phaseLabels.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i
                    ? 'bg-gradient-to-r from-red-400 to-blue-400 w-6 shadow-lg shadow-purple-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabels[i]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default CoulombsLawRenderer;
