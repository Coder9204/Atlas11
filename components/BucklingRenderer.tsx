'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// BUCKLING RENDERER - COLUMN COLLAPSE & EULER'S FORMULA
// Teaching: Slender columns fail by buckling, not crushing. Length² matters!
// ─────────────────────────────────────────────────────────────────────────────

interface GameEvent {
  type: 'prediction' | 'observation' | 'phase_change' | 'interaction' | 'completion';
  phase: string;
  data?: {
    prediction?: string;
    actual?: string;
    isCorrect?: boolean;
    score?: number;
    action?: string;
    details?: string;
  };
  timestamp: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Twist Lab',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

const isValidPhase = (phase: string): phase is Phase => {
  return PHASES.includes(phase as Phase);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface BucklingRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const BucklingRenderer: React.FC<BucklingRendererProps> = ({
  phase: propPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  // Support both 'phase' and 'gamePhase' props for compatibility with test framework
  const initialPhase = propPhase || gamePhase || 'hook';
  const { isMobile } = useViewport();
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

  const [currentPhase, setCurrentPhase] = useState<Phase>(initialPhase as Phase);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [currentPhase]);

  const [showCoachMessage, setShowCoachMessage] = useState(true);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Column simulation - legacy discrete selection
  const [columnLength, setColumnLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [appliedLoad, setAppliedLoad] = useState(0);
  const [hasBuckled, setHasBuckled] = useState(false);
  const [buckleAmount, setBuckleAmount] = useState(0);
  const [bucklingLoads, setBucklingLoads] = useState<Record<string, number>>({});

  // Enhanced play phase - continuous sliders
  const [columnLengthContinuous, setColumnLengthContinuous] = useState(1.5); // meters (0.5 to 3)
  const [columnRadius, setColumnRadius] = useState(0.02); // meters (0.01 to 0.05)
  const [appliedForce, setAppliedForce] = useState(0); // Newtons

  // Material properties (Young's modulus in Pa)
  const materials: Record<string, { name: string; E: number; color: string }> = {
    steel: { name: 'Steel', E: 200e9, color: '#94A3B8' },
    aluminum: { name: 'Aluminum', E: 69e9, color: '#CBD5E1' },
    wood: { name: 'Wood (Oak)', E: 12e9, color: '#A16207' }
  };

  // End condition factors (K values for Euler buckling)
  const endConditions: Record<string, { name: string; K: number; desc: string }> = {
    'fixed-fixed': { name: 'Fixed-Fixed', K: 0.5, desc: 'Both ends rigidly fixed' },
    'pinned-pinned': { name: 'Pinned-Pinned', K: 1.0, desc: 'Both ends free to rotate' },
    'fixed-free': { name: 'Fixed-Free (Cantilever)', K: 2.0, desc: 'One end fixed, one free' },
    'fixed-pinned': { name: 'Fixed-Pinned', K: 0.7, desc: 'One fixed, one pinned' }
  };

  // Twist phase - material and end condition selection
  const [selectedMaterial, setSelectedMaterial] = useState<string>('steel');
  const [selectedEndCondition, setSelectedEndCondition] = useState<string>('pinned-pinned');
  const [twistColumnLength, setTwistColumnLength] = useState(1.5);
  const [twistColumnRadius, setTwistColumnRadius] = useState(0.02);
  const [twistAppliedForce, setTwistAppliedForce] = useState(0);

  // Twist: cross-section shape
  const [crossSection, setCrossSection] = useState<'solid' | 'hollow' | 'i-beam'>('solid');
  const [twistLoad, setTwistLoad] = useState(0);
  const [twistHasBuckled, setTwistHasBuckled] = useState(false);
  const [twistBuckleAmount, setTwistBuckleAmount] = useState(0);
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

  // Track experiments for play phase
  const [playExperimentsRun, setPlayExperimentsRun] = useState(0);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Phase sync - supports both phase and gamePhase props
  useEffect(() => {
    const newPhase = propPhase || gamePhase;
    if (newPhase && newPhase !== currentPhase) {
      setCurrentPhase(newPhase);
    }
  }, [propPhase, gamePhase, currentPhase]);

  // Sound system
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

  // Helper for phase navigation
  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(currentPhase);
    if (currentIndex < PHASES.length - 1) {
      setCurrentPhase(PHASES[currentIndex + 1]);
      onPhaseComplete?.();
    }
  }, [currentPhase, onPhaseComplete]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setCurrentPhase(newPhase);
    setShowCoachMessage(true);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [playSound]);

  // ─────────────────────────────────────────────────────────────────────────
  // BUCKLING PHYSICS - EULER FORMULA
  // P_cr = π²EI / (KL)² where E=modulus, I=moment of inertia, K=end factor, L=length
  // ─────────────────────────────────────────────────────────────────────────

  // Calculate moment of inertia for circular cross-section: I = π*r⁴/4
  const getMomentOfInertia = (radius: number): number => {
    return (Math.PI * Math.pow(radius, 4)) / 4;
  };

  // Calculate critical buckling load using Euler's formula
  const calculateCriticalLoad = (
    length: number, // meters
    radius: number, // meters
    materialKey: string = 'steel',
    endConditionKey: string = 'pinned-pinned'
  ): number => {
    const E = materials[materialKey]?.E || materials.steel.E;
    const K = endConditions[endConditionKey]?.K || 1.0;
    const I = getMomentOfInertia(radius);
    const effectiveLength = K * length;

    // P_cr = π²EI / (KL)²
    const Pcr = (Math.PI * Math.PI * E * I) / (effectiveLength * effectiveLength);
    return Pcr;
  };

  // Get safety factor (applied load / critical load)
  const getSafetyFactor = (appliedLoad: number, criticalLoad: number): number => {
    if (appliedLoad === 0) return Infinity;
    return criticalLoad / appliedLoad;
  };

  // Legacy function for discrete length selection
  const getCriticalLoad = (length: 'short' | 'medium' | 'long', section: 'solid' | 'hollow' | 'i-beam' = 'solid') => {
    let baseLoad = 50;
    const lengthFactors = { short: 4, medium: 1, long: 0.25 };
    const sectionFactors = { solid: 1, hollow: 1.5, 'i-beam': 2.5 };
    return Math.round(baseLoad * lengthFactors[length] * sectionFactors[section]);
  };

  const handleLoadChange = (delta: number, istwist = false) => {
    if (istwist) {
      if (twistHasBuckled && delta > 0) return;
      const newLoad = Math.max(0, Math.min(200, twistLoad + delta));
      setTwistLoad(newLoad);

      const criticalLoad = getCriticalLoad('medium', crossSection);
      const loadRatio = newLoad / criticalLoad;

      if (loadRatio < 1) {
        setTwistBuckleAmount(loadRatio * 0.3);
        setTwistHasBuckled(false);
      } else {
        setTwistBuckleAmount(1);
        setTwistHasBuckled(true);
        playSound('failure');
        console.debug('observation', {
          details: `${crossSection} section buckled at ${newLoad}N`
        });
      }
    } else {
      if (hasBuckled && delta > 0) return;
      const newLoad = Math.max(0, Math.min(200, appliedLoad + delta));
      setAppliedLoad(newLoad);

      const criticalLoad = getCriticalLoad(columnLength);
      const loadRatio = newLoad / criticalLoad;

      if (loadRatio < 1) {
        setBuckleAmount(loadRatio * 0.3);
        setHasBuckled(false);
      } else {
        setBuckleAmount(1);
        setHasBuckled(true);
        playSound('failure');
        console.debug('observation', {
          details: `${columnLength} column buckled at ${newLoad}N`
        });
      }
    }
  };

  const resetColumn = (istwist = false) => {
    if (istwist) {
      setTwistLoad(0);
      setTwistHasBuckled(false);
      setTwistBuckleAmount(0);
    } else {
      setAppliedLoad(0);
      setHasBuckled(false);
      setBuckleAmount(0);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "Why does a yardstick break when you push down on it? It doesn't crush—it bends and snaps sideways!",
    predict: "Which holds more weight: a short thick column or a long thin one of the same material?",
    play: "Apply load to columns of different lengths. Watch for buckling!",
    review: "Euler discovered: doubling length makes a column 4x weaker to buckling!",
    twist_predict: "Engineers use I-beams and hollow tubes. Do they buckle differently than solid rods?",
    twist_play: "Test different cross-section shapes under load.",
    twist_review: "Shape matters! I-beams resist buckling far better than solid rods of equal weight!",
    transfer: "From bike frames to skyscrapers, buckling physics shapes our world!",
    test: "Let's test your understanding of buckling and column design!",
    mastery: "You've mastered structural buckling! Build stronger with less!"
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COLORS
  // ─────────────────────────────────────────────────────────────────────────

  const colors = {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
    neutral: '#64748B',
    column: '#475569',
    stressed: '#F59E0B',
    buckled: '#EF4444',
    load: '#3B82F6',
    steel: '#94A3B8'
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM SVG DEFS - Gradients, Filters, and Effects
  // ─────────────────────────────────────────────────────────────────────────

  const renderPremiumDefs = () => (
    <defs>
      {/* Premium Steel Column Gradient - Metallic brushed finish */}
      <linearGradient id="buckSteelColumn" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="15%" stopColor="#94a3b8" />
        <stop offset="35%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="65%" stopColor="#64748b" />
        <stop offset="85%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>

      {/* Aluminum Column Gradient - Lighter metallic */}
      <linearGradient id="buckAluminumColumn" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="20%" stopColor="#cbd5e1" />
        <stop offset="40%" stopColor="#e2e8f0" />
        <stop offset="60%" stopColor="#cbd5e1" />
        <stop offset="80%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>

      {/* Wood Column Gradient - Natural grain effect */}
      <linearGradient id="buckWoodColumn" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a16207" />
        <stop offset="20%" stopColor="#ca8a04" />
        <stop offset="40%" stopColor="#a16207" />
        <stop offset="60%" stopColor="#854d0e" />
        <stop offset="80%" stopColor="#a16207" />
        <stop offset="100%" stopColor="#713f12" />
      </linearGradient>

      {/* Stress Gradient - Low to High stress visualization */}
      <linearGradient id="buckStressLow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="50%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>

      <linearGradient id="buckStressMedium" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="30%" stopColor="#fbbf24" />
        <stop offset="70%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      <linearGradient id="buckStressHigh" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="25%" stopColor="#ef4444" />
        <stop offset="50%" stopColor="#f87171" />
        <stop offset="75%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>

      {/* Buckled Column Gradient - Damaged/failed state */}
      <linearGradient id="buckFailedColumn" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#991b1b" />
        <stop offset="30%" stopColor="#dc2626" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="70%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>

      {/* Force Arrow Gradient - 3D depth effect */}
      <linearGradient id="buckForceArrow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="30%" stopColor="#60a5fa" />
        <stop offset="70%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* Ground/Base Gradient - Concrete foundation */}
      <linearGradient id="buckFoundation" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="30%" stopColor="#475569" />
        <stop offset="70%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>

      {/* 3D Column Effect - Radial gradient for cylindrical appearance */}
      <radialGradient id="buckColumnCylinder" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" />
        <stop offset="40%" stopColor="#94a3b8" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#334155" stopOpacity="0.5" />
      </radialGradient>

      {/* Stressed Column 3D - Red warning glow */}
      <radialGradient id="buckStressedGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#dc2626" stopOpacity="0.2" />
      </radialGradient>

      {/* Safe indicator glow */}
      <radialGradient id="buckSafeGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
      </radialGradient>

      {/* Warning indicator glow */}
      <radialGradient id="buckWarningGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
      </radialGradient>

      {/* Premium glow filter for column stress visualization */}
      <filter id="buckColumnGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Stress pulse glow for critical state */}
      <filter id="buckStressPulse" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Force arrow glow */}
      <filter id="buckForceGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Buckle deformation shadow */}
      <filter id="buckDeformShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="shadow" />
        <feOffset dx="3" dy="3" in="shadow" result="offsetShadow" />
        <feMerge>
          <feMergeNode in="offsetShadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Status badge inner glow */}
      <filter id="buckBadgeGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Lab background gradient */}
      <linearGradient id="buckLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="50%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Grid pattern for lab floor */}
      <pattern id="buckLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
      </pattern>

      {/* I-Beam cross-section gradient */}
      <linearGradient id="buckIBeam" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="25%" stopColor="#64748b" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="75%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>

      {/* Hollow tube gradient */}
      <radialGradient id="buckHollowTube" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="60%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
    </defs>
  );

  // Helper function to get column gradient based on material and stress
  const getColumnGradient = (
    material: string,
    stressRatio: number,
    isBuckled: boolean
  ): string => {
    if (isBuckled) return 'url(#buckFailedColumn)';
    if (stressRatio > 0.8) return 'url(#buckStressHigh)';
    if (stressRatio > 0.5) return 'url(#buckStressMedium)';

    switch (material) {
      case 'aluminum': return 'url(#buckAluminumColumn)';
      case 'wood': return 'url(#buckWoodColumn)';
      default: return 'url(#buckSteelColumn)';
    }
  };

  // Get glow filter based on stress state
  const getStressFilter = (stressRatio: number, isBuckled: boolean): string => {
    if (isBuckled) return 'url(#buckStressPulse)';
    if (stressRatio > 0.8) return 'url(#buckColumnGlow)';
    return '';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderColumnVisualization = (
    length: 'short' | 'medium' | 'long',
    load: number,
    buckleAmt: number,
    buckled: boolean,
    section?: 'solid' | 'hollow' | 'i-beam'
  ) => {
    const heights = { short: 80, medium: 140, long: 200 };
    const height = heights[length];
    const criticalLoad = getCriticalLoad(length, section);
    const buckleOffset = buckleAmt * 30;
    const stressRatio = load / criticalLoad;
    const columnGradient = getColumnGradient('steel', stressRatio, buckled);
    const stressFilter = getStressFilter(stressRatio, buckled);

    return (
      <svg viewBox="0 0 200 280" className="w-full h-56 md:h-64" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Buckling visualization">
        {renderPremiumDefs()}

        {/* Premium lab background */}
        <rect x="0" y="0" width="200" height="280" fill="url(#buckLabBg)" rx="10" />
        <rect x="0" y="0" width="200" height="280" fill="url(#buckLabGrid)" rx="10" />

        {/* Foundation base with 3D effect */}
        <rect x="0" y="250" width="200" height="30" fill="url(#buckFoundation)" />
        <line x1="0" y1="250" x2="200" y2="250" stroke="#64748b" strokeWidth="2" />
        <line x1="80" y1="250" x2="120" y2="250" stroke="#94a3b8" strokeWidth="4" />

        {/* Force arrow with glow effect */}
        <g transform={`translate(100, ${60 - height / 2})`} filter="url(#buckForceGlow)">
          <rect x="-35" y="-22" width="70" height="22" fill="url(#buckForceArrow)" rx="4" />
          <text x="0" y="-7" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {load}N
          </text>
          {/* Animated force arrows */}
          <polygon points="0,8 -10,-4 10,-4" fill="url(#buckForceArrow)" />
          <polygon points="-15,4 -22,-4 -8,-4" fill="url(#buckForceArrow)" opacity="0.7" />
          <polygon points="15,4 8,-4 22,-4" fill="url(#buckForceArrow)" opacity="0.7" />
        </g>

        {/* Column with premium gradients and stress visualization */}
        <g transform={`translate(100, ${250 - height})`} filter={stressFilter}>
          {buckled || buckleAmt > 0 ? (
            <>
              {/* Shadow for buckled column */}
              <path
                d={`M 0,0
                    Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${height * 0.25}
                      ${buckleOffset},${height * 0.5}
                    Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${height * 0.75}
                      0,${height}`}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={section === 'i-beam' ? 18 : section === 'hollow' ? 16 : 14}
                fill="none"
                strokeLinecap="round"
                transform="translate(3, 3)"
              />
              {/* Main buckled column */}
              <path
                d={`M 0,0
                    Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${height * 0.25}
                      ${buckleOffset},${height * 0.5}
                    Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${height * 0.75}
                      0,${height}`}
                stroke={columnGradient}
                strokeWidth={section === 'i-beam' ? 16 : section === 'hollow' ? 14 : 12}
                fill="none"
                strokeLinecap="round"
              />
              {/* Stress concentration markers */}
              <circle cx={buckleOffset} cy={height * 0.5} r="4" fill="#ef4444" opacity="0.8">
                <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
              </circle>
            </>
          ) : (
            <>
              {/* Shadow for straight column */}
              <rect
                x={section === 'i-beam' ? -6 : section === 'hollow' ? -5 : -4}
                y="2"
                width={section === 'i-beam' ? 16 : section === 'hollow' ? 14 : 12}
                height={height}
                fill="rgba(0,0,0,0.2)"
                rx="2"
                transform="translate(3, 0)"
              />
              {/* Main column with gradient */}
              <rect
                x={section === 'i-beam' ? -8 : section === 'hollow' ? -7 : -6}
                y="0"
                width={section === 'i-beam' ? 16 : section === 'hollow' ? 14 : 12}
                height={height}
                fill={columnGradient}
                rx="2"
              />
              {/* Highlight stripe for 3D effect */}
              <rect
                x={section === 'i-beam' ? -6 : section === 'hollow' ? -5 : -4}
                y="0"
                width="2"
                height={height}
                fill="rgba(255,255,255,0.2)"
                rx="1"
              />
            </>
          )}

          {/* Cross-section visualization with premium gradients */}
          {section && (
            <g transform={`translate(55, ${height / 2})`}>
              <text x="0" y="-25" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Cross-section</text>
              {section === 'solid' && (
                <>
                  <circle cx="0" cy="0" r="12" fill="url(#buckHollowTube)" />
                  <circle cx="-3" cy="-3" r="3" fill="rgba(255,255,255,0.3)" />
                </>
              )}
              {section === 'hollow' && (
                <>
                  <circle cx="0" cy="0" r="14" fill="url(#buckHollowTube)" />
                  <circle cx="0" cy="0" r="8" fill="#1e293b" />
                  <circle cx="-4" cy="-4" r="2" fill="rgba(255,255,255,0.2)" />
                </>
              )}
              {section === 'i-beam' && (
                <g>
                  <rect x="-14" y="-12" width="28" height="5" fill="url(#buckIBeam)" rx="1" />
                  <rect x="-14" y="7" width="28" height="5" fill="url(#buckIBeam)" rx="1" />
                  <rect x="-4" y="-12" width="8" height="24" fill="url(#buckIBeam)" rx="1" />
                </g>
              )}
            </g>
          )}
        </g>

        {/* Status badge with glow effect */}
        <g transform="translate(100, 15)" filter="url(#buckBadgeGlow)">
          <rect
            x="-50"
            y="-16"
            width="100"
            height="28"
            fill={buckled ? 'url(#buckStressedGlow)' : stressRatio > 0.8 ? 'url(#buckWarningGlow)' : 'url(#buckSafeGlow)'}
            rx="14"
          />
          <rect
            x="-48"
            y="-14"
            width="96"
            height="24"
            fill={buckled ? '#dc2626' : stressRatio > 0.8 ? '#f59e0b' : '#10b981'}
            rx="12"
          />
          <text x="0" y="4" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {buckled ? 'BUCKLED!' : stressRatio > 0.8 ? 'CRITICAL' : 'STABLE'}
          </text>
        </g>

        {/* Info text with enhanced styling */}
        <g transform="translate(100, 268)">
          <text x="0" y="0" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">
            Critical: <tspan fill="#ef4444" fontWeight="bold">{criticalLoad}N</tspan> | Length: <tspan fill="#6366f1">{length}</tspan>
          </text>
        </g>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div
      className="flex flex-col items-center justify-center min-h-[600px] text-center"
      style={{ padding: '24px 24px 48px 24px' }}
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">STRUCTURAL MECHANICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Buckling Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-4">
        Welcome! Let's discover how columns work and explore why they collapse sideways instead of crushing straight down.
      </p>

      <p className="text-md text-slate-500 max-w-md mb-10">
        You're about to begin an introduction to structural mechanics - let's start by exploring what happens when you push down on a column.
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <svg viewBox="0 0 300 180" className="w-full h-44 mb-4" preserveAspectRatio="xMidYMid meet">
            {renderPremiumDefs()}

            {/* Premium lab background */}
            <rect x="0" y="0" width="300" height="180" fill="url(#buckLabBg)" rx="10" />
            <rect x="0" y="0" width="300" height="180" fill="url(#buckLabGrid)" rx="10" />

            {/* Foundation with gradient */}
            <rect x="0" y="160" width="300" height="20" fill="url(#buckFoundation)" />
            <line x1="0" y1="160" x2="300" y2="160" stroke="#64748b" strokeWidth="1" />

            {/* Before column - stable with metallic gradient */}
            <g transform="translate(80, 160)">
              {/* Shadow */}
              <rect x="-3" y="-98" width="10" height="100" fill="rgba(0,0,0,0.2)" rx="2" transform="translate(3, 2)" />
              {/* Column with gradient */}
              <rect x="-5" y="-100" width="10" height="100" fill="url(#buckSteelColumn)" rx="2" />
              {/* Highlight */}
              <rect x="-3" y="-100" width="2" height="100" fill="rgba(255,255,255,0.2)" rx="1" />
              {/* Label with glow */}
              <rect x="-22" y="-124" width="44" height="18" fill="url(#buckSafeGlow)" rx="9" />
              <rect x="-20" y="-122" width="40" height="14" fill="#10b981" rx="7" />
              <text x="0" y="-112" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">STABLE</text>
            </g>

            {/* Arrow with glow effect */}
            <g transform="translate(150, 90)" filter="url(#buckForceGlow)">
              <rect x="-20" y="-12" width="40" height="24" fill="url(#buckForceArrow)" rx="12" opacity="0.8" />
              <text x="0" y="5" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">→</text>
            </g>

            {/* After column - buckled with stress visualization */}
            <g transform="translate(220, 160)">
              {/* Shadow for buckled column */}
              <path
                d="M 0,0 Q 35,-50 0,-100"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                transform="translate(3, 3)"
              />
              {/* Buckled column with failure gradient */}
              <path
                d="M 0,0 Q 30,-50 0,-100"
                stroke="url(#buckFailedColumn)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                filter="url(#buckStressPulse)"
              />
              {/* Stress concentration point */}
              <circle cx="18" cy="-50" r="4" fill="#ef4444">
                <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
              </circle>
              {/* Force arrow with glow */}
              <g filter="url(#buckForceGlow)">
                <rect x="-15" y="-125" width="30" height="20" fill="url(#buckForceArrow)" rx="4" />
                <polygon points="0,-100 -10,-108 10,-108" fill="url(#buckForceArrow)" />
                <text x="0" y="-112" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">LOAD</text>
              </g>
              {/* Buckled label with warning glow */}
              <g transform="translate(35, -75)">
                <rect x="-28" y="-10" width="56" height="20" fill="url(#buckStressedGlow)" rx="10" />
                <rect x="-26" y="-8" width="52" height="16" fill="#dc2626" rx="8" />
                <text x="0" y="4" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">BUCKLED!</text>
              </g>
            </g>

            {/* Title text with glow */}
            <text x="150" y="22" textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="bold" style={{ textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>
              Push down on a yardstick...
            </text>
          </svg>

          <div className="mt-6 space-y-3">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A long thin column doesn't crush straight down
            </p>
            <p className="text-lg text-red-400 font-bold leading-relaxed">
              it bends and snaps sideways!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ zIndex: 10 }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Make Your Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" preserveAspectRatio="xMidYMid meet">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'linear', label: 'Double length = half the strength', icon: '📏' },
      { id: 'square', label: 'Double length = quarter the strength', icon: '📐' },
      { id: 'same', label: "Length doesn't affect buckling strength", icon: '=' },
      { id: 'stronger', label: 'Longer columns are actually stronger', icon: '💪' }
    ];

    return (
      <div
        className="flex flex-col items-center justify-center min-h-[500px]"
        style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}
      >
        <h2
          className="text-white mb-6"
          style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}
        >
          Make Your Prediction
        </h2>

        {/* Static visualization comparing two columns */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            maxWidth: '500px',
            width: '100%'
          }}
        >
          <svg viewBox="0 0 300 200" className="w-full" style={{ height: '180px' }} preserveAspectRatio="xMidYMid meet">
            {renderPremiumDefs()}

            {/* Background */}
            <rect x="0" y="0" width="300" height="200" fill="url(#buckLabBg)" rx="10" />
            <rect x="0" y="0" width="300" height="200" fill="url(#buckLabGrid)" rx="10" />

            {/* Ground */}
            <rect x="0" y="170" width="300" height="30" fill="url(#buckFoundation)" />

            {/* Short column (1m) - LEFT */}
            <g transform="translate(80, 170)">
              <rect x="-6" y="-60" width="12" height="60" fill="url(#buckSteelColumn)" rx="2" />
              <rect x="-4" y="-60" width="2" height="60" fill="rgba(255,255,255,0.2)" rx="1" />
              <text x="0" y="-70" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">1m</text>
              <text x="0" y="20" textAnchor="middle" fill="#6366f1" fontSize="11">Short</text>
            </g>

            {/* Long column (2m) - RIGHT */}
            <g transform="translate(220, 170)">
              <rect x="-6" y="-120" width="12" height="120" fill="url(#buckSteelColumn)" rx="2" />
              <rect x="-4" y="-120" width="2" height="120" fill="rgba(255,255,255,0.2)" rx="1" />
              <text x="0" y="-130" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">2m</text>
              <text x="0" y="20" textAnchor="middle" fill="#6366f1" fontSize="11">Long</text>
            </g>

            {/* VS indicator */}
            <g transform="translate(150, 100)">
              <circle cx="0" cy="0" r="18" fill="rgba(99,102,241,0.2)" />
              <text x="0" y="5" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="bold">VS</text>
            </g>

            {/* Question mark for unknown */}
            <text x="150" y="25" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">
              Which holds more weight?
            </text>
          </svg>
        </div>

        <div
          className="border rounded-xl mb-6 max-w-lg"
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            borderColor: 'rgba(99, 102, 241, 0.2)',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '500px'
          }}
        >
          <p style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: '1.6' }}>
            Imagine two identical steel rods—same thickness, same material.
            One is 1 meter long, one is 2 meters long.
          </p>
          <p style={{ color: '#818cf8', fontWeight: 600, marginTop: '12px', fontSize: '16px' }}>
            How do their buckling strengths compare?
          </p>
        </div>

        <div className="grid grid-cols-1 w-full max-w-lg" style={{ display: 'grid', gap: '12px', maxWidth: '500px', width: '100%' }}>
          {predictionOptions.map(option => (
            <button
              key={option.id}
              onClick={() => {
                setPrediction(option.id);
                playSound('click');
                console.debug('prediction', { prediction: option.id });
              }}
              aria-pressed={prediction === option.id}
              className={`rounded-xl border-2 transition-all text-left flex items-center ${
                prediction === option.id
                  ? 'border-indigo-500 bg-indigo-500/20 shadow-md'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
              }`}
              style={{
                padding: '16px',
                borderRadius: '12px',
                zIndex: 10,
                display: 'flex',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: prediction === option.id ? '2px solid #6366f1' : '2px solid #334155',
                background: prediction === option.id ? 'rgba(99,102,241,0.2)' : 'rgba(30,41,59,0.5)',
                minHeight: '44px'
              }}
            >
              <span style={{ fontSize: '24px' }} aria-hidden="true">{option.icon}</span>
              <span style={{
                color: prediction === option.id ? '#a5b4fc' : '#e2e8f0',
                fontWeight: prediction === option.id ? 600 : 400,
                fontSize: '15px'
              }}>
                {option.label}
              </span>
              {prediction === option.id && (
                <span style={{ marginLeft: 'auto', color: '#818cf8' }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => goToPhase('play')}
            className="mt-6 text-white font-semibold rounded-xl"
            style={{
              marginTop: '24px',
              padding: '14px 28px',
              background: 'linear-gradient(90deg, #059669 0%, #0d9488 100%)',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              cursor: 'pointer',
              border: 'none',
              zIndex: 10,
              transition: 'all 0.2s ease'
            }}
          >
            Start Experiments →
          </button>
        )}
      </div>
    );
  };

  const renderPlay = () => {
    // Calculate critical load for current parameters
    const criticalLoad = calculateCriticalLoad(columnLengthContinuous, columnRadius, 'steel', 'pinned-pinned');
    const criticalLoadKN = criticalLoad / 1000; // Convert to kN for display
    const maxSliderForce = Math.min(criticalLoad * 1.2, 1000000); // Max slider is 120% of critical or 1MN
    const loadRatio = appliedForce / criticalLoad;
    const safetyFactor = getSafetyFactor(appliedForce, criticalLoad);
    const isBuckled = loadRatio >= 1;
    const buckleDeflection = isBuckled ? 1 : loadRatio * 0.3;

    // Visualization colors based on stress state
    const getColumnColor = () => {
      if (isBuckled) return colors.buckled;
      if (loadRatio > 0.8) return colors.stressed;
      if (loadRatio > 0.5) return colors.accent;
      return colors.column;
    };

    // Interactive column SVG with premium graphics
    const renderInteractiveColumn = () => {
      const columnVisualHeight = 50 + (columnLengthContinuous - 0.5) * 80; // Scale length visually
      const columnWidth = 8 + (columnRadius - 0.01) * 400; // Scale radius visually
      const buckleOffset = buckleDeflection * 40;
      const columnGradient = getColumnGradient('steel', loadRatio, isBuckled);
      const stressFilter = getStressFilter(loadRatio, isBuckled);

      return (
        <svg viewBox="0 0 300 320" className="w-full h-72 md:h-80" preserveAspectRatio="xMidYMid meet">
          {renderPremiumDefs()}

          {/* Premium lab background with grid */}
          <rect x="0" y="0" width="300" height="320" fill="url(#buckLabBg)" rx="12" />
          <rect x="0" y="0" width="300" height="320" fill="url(#buckLabGrid)" rx="12" />

          {/* Foundation base with 3D gradient effect */}
          <rect x="0" y="280" width="300" height="40" fill="url(#buckFoundation)" />
          <line x1="0" y1="280" x2="300" y2="280" stroke="#64748b" strokeWidth="2" />
          <line x1="100" y1="280" x2="200" y2="280" stroke="#94a3b8" strokeWidth="4" />

          {/* Applied Force Arrow with glow effect */}
          <g transform={`translate(150, ${40})`} filter="url(#buckForceGlow)">
            <rect x="-45" y="-28" width="90" height="28" fill="url(#buckForceArrow)" rx="5" />
            {/* Multiple force arrows for depth */}
            <polygon points="0,8 -12,-4 12,-4" fill="url(#buckForceArrow)" />
            <polygon points="-18,4 -25,-6 -11,-6" fill="url(#buckForceArrow)" opacity="0.7" />
            <polygon points="18,4 11,-6 25,-6" fill="url(#buckForceArrow)" opacity="0.7" />
            {/* Force direction lines */}
            <line x1="0" y1="8" x2="0" y2="20" stroke="#60a5fa" strokeWidth="3" />
            <line x1="-18" y1="4" x2="-18" y2="14" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
            <line x1="18" y1="4" x2="18" y2="14" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
          </g>
          <text x="150" y="11" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {appliedForce >= 1000 ? `${(appliedForce / 1000).toFixed(1)} kN` : `${appliedForce.toFixed(0)} N`}
          </text>

          {/* Column with premium gradients and stress visualization */}
          <g transform={`translate(150, ${280 - columnVisualHeight})`} filter={stressFilter}>
            {isBuckled || buckleDeflection > 0 ? (
              <>
                {/* Shadow for buckled column */}
                <path
                  d={`M 0,0
                      Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${columnVisualHeight * 0.25}
                        ${buckleOffset},${columnVisualHeight * 0.5}
                      Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${columnVisualHeight * 0.75}
                        0,${columnVisualHeight}`}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={columnWidth + 4}
                  fill="none"
                  strokeLinecap="round"
                  transform="translate(4, 4)"
                />
                {/* Main buckled column with gradient */}
                <path
                  d={`M 0,0
                      Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${columnVisualHeight * 0.25}
                        ${buckleOffset},${columnVisualHeight * 0.5}
                      Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${columnVisualHeight * 0.75}
                        0,${columnVisualHeight}`}
                  stroke={columnGradient}
                  strokeWidth={columnWidth}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Stress concentration point with animated pulse */}
                <circle cx={buckleOffset} cy={columnVisualHeight * 0.5} r="5" fill="#ef4444">
                  <animate attributeName="r" values="5;8;5" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.6;1" dur="0.6s" repeatCount="indefinite" />
                </circle>
                {/* Stress lines radiating from buckle point */}
                <line x1={buckleOffset} y1={columnVisualHeight * 0.5} x2={buckleOffset + 20} y2={columnVisualHeight * 0.45} stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                <line x1={buckleOffset} y1={columnVisualHeight * 0.5} x2={buckleOffset + 18} y2={columnVisualHeight * 0.55} stroke="#ef4444" strokeWidth="1" opacity="0.5" />
              </>
            ) : (
              <>
                {/* Shadow for straight column */}
                <rect
                  x={-columnWidth / 2 + 3}
                  y="3"
                  width={columnWidth}
                  height={columnVisualHeight}
                  fill="rgba(0,0,0,0.25)"
                  rx="3"
                />
                {/* Main column with metallic gradient */}
                <rect
                  x={-columnWidth / 2}
                  y="0"
                  width={columnWidth}
                  height={columnVisualHeight}
                  fill={columnGradient}
                  rx="2"
                />
                {/* 3D highlight stripe */}
                <rect
                  x={-columnWidth / 2 + 2}
                  y="0"
                  width="3"
                  height={columnVisualHeight}
                  fill="rgba(255,255,255,0.25)"
                  rx="1"
                />
                {/* Stress bands visualization */}
                {loadRatio > 0.3 && (
                  <>
                    <line x1={-columnWidth / 2 - 5} y1={columnVisualHeight * 0.3} x2={columnWidth / 2 + 5} y2={columnVisualHeight * 0.3} stroke={loadRatio > 0.8 ? '#ef4444' : '#f59e0b'} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
                    <line x1={-columnWidth / 2 - 5} y1={columnVisualHeight * 0.5} x2={columnWidth / 2 + 5} y2={columnVisualHeight * 0.5} stroke={loadRatio > 0.8 ? '#ef4444' : '#f59e0b'} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
                    <line x1={-columnWidth / 2 - 5} y1={columnVisualHeight * 0.7} x2={columnWidth / 2 + 5} y2={columnVisualHeight * 0.7} stroke={loadRatio > 0.8 ? '#ef4444' : '#f59e0b'} strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
                  </>
                )}
              </>
            )}
          </g>

          {/* Status Badge with glow effect */}
          <g transform="translate(150, 20)" filter="url(#buckBadgeGlow)">
            <rect
              x="-60"
              y="-14"
              width="120"
              height="28"
              fill={isBuckled ? 'url(#buckStressedGlow)' : loadRatio > 0.8 ? 'url(#buckWarningGlow)' : 'url(#buckSafeGlow)'}
              rx="14"
            />
            <rect
              x="-58"
              y="-12"
              width="116"
              height="24"
              fill={isBuckled ? '#dc2626' : loadRatio > 0.8 ? '#f59e0b' : '#10b981'}
              rx="12"
            />
          </g>
          <text x="150" y="25" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {isBuckled ? 'BUCKLED!' : loadRatio > 0.8 ? 'NEAR CRITICAL!' : 'STABLE'}
          </text>

          {/* Critical Load Indicator Line with enhanced styling */}
          <g transform={`translate(255, ${280 - columnVisualHeight})`}>
            <line x1="0" y1="0" x2="0" y2={columnVisualHeight} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3" opacity="0.8" />
            <circle cx="0" cy="0" r="3" fill="#ef4444" />
            <circle cx="0" cy={columnVisualHeight} r="3" fill="#ef4444" />
            <rect x="5" y={columnVisualHeight / 2 - 12} width="40" height="24" fill="rgba(239,68,68,0.2)" rx="4" />
          </g>

          {/* Safety Factor Display with premium styling */}
          <g transform="translate(40, 65)">
            <rect x="-32" y="-18" width="64" height="56" fill="rgba(0,0,0,0.4)" rx="10" stroke="#334155" strokeWidth="1" />
          </g>
          <text x="40" y="62" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Factor</text>
          <text x="40" y="83" textAnchor="middle" fill={safetyFactor > 2 ? '#10b981' : safetyFactor > 1 ? '#f59e0b' : '#ef4444'} fontSize="18" fontWeight="bold">
            {safetyFactor === Infinity ? '∞' : safetyFactor.toFixed(1)}
          </text>

          {/* Moment of Inertia Display with premium styling */}
          <g transform="translate(260, 65)">
            <rect x="-32" y="-18" width="64" height="56" fill="rgba(0,0,0,0.4)" rx="10" stroke="#334155" strokeWidth="1" />
          </g>
          <text x="260" y="63" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Inertia</text>
          <text x="260" y="83" textAnchor="middle" fill="#6366f1" fontSize="14" fontWeight="bold">
            {(getMomentOfInertia(columnRadius) * 1e9).toFixed(2)}
          </text>

          {/* Axis labels for educational clarity */}
          <text x="150" y="296" textAnchor="middle" fill="#94a3b8" fontSize="11">Force (N)</text>
          <text x="12" y="180" textAnchor="middle" fill="#94a3b8" fontSize="11" transform="rotate(-90, 12, 180)">Height (m)</text>

          {/* Enhanced info text */}
          <text x="150" y="312" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">
            L={columnLengthContinuous.toFixed(2)}m r={(columnRadius * 100).toFixed(1)}cm P_cr={criticalLoadKN.toFixed(1)}kN
          </text>
        </svg>
      );
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Interactive Buckling Lab</h2>
        <p className="text-slate-400 mb-6">Adjust parameters and observe real-time buckling behavior</p>

        {/* Side-by-side layout: SVG left, controls right */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          {/* Left: SVG visualization */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            {/* Interactive Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full">
              {renderInteractiveColumn()}
            </div>

            {/* Euler Formula Display */}
            <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-3 mb-4 w-full text-center">
              <p className="text-sm text-indigo-300 mb-1">Euler Buckling Formula:</p>
              <p className="text-lg font-mono text-indigo-400">P<sub>cr</sub> = π²EI / (KL)²</p>
            </div>

            {/* Physics Insight Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 w-full">
              <h4 className="font-bold text-amber-400 mb-2">Key Insight: The L² Effect</h4>
              <p className="text-sm text-slate-300">
                Notice how when you increase the length, it causes a dramatic decrease in critical load.
                Doubling the length <strong>quarters</strong> the critical load (1/L² relationship).
                Meanwhile, when you increase the radius, the impact is even more dramatic - doubling the radius
                leads to a <strong>16×</strong> increase in critical load (r⁴ in moment of inertia)!
              </p>
            </div>

            {/* Real-world relevance */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 w-full">
              <h4 className="font-bold text-indigo-400 mb-2">Why This Matters in Industry</h4>
              <p className="text-sm text-slate-300">
                This is why engineers use hollow tubes for bicycle frames and I-beams for buildings.
                Understanding buckling is important for practical design - it helps us create
                structures that are both strong AND lightweight. This technology enables everything
                from skyscrapers to spacecraft, and that's why Euler's formula is used in real-world
                applications every day.
              </p>
            </div>
          </div>

          {/* Right: Controls panel */}
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Range Sliders */}
            <div className="w-full space-y-4 mb-4">
              {/* Column Length Slider */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-300">Column Length (L)</label>
                  <span className="text-lg font-bold text-indigo-400">{columnLengthContinuous.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={columnLengthContinuous}
                  onChange={(e) => {
                    setColumnLengthContinuous(parseFloat(e.target.value));
                    setAppliedForce(0); // Reset force when changing parameters
                  }}
                  className="w-full h-3 bg-slate-700 rounded-lg cursor-pointer"
                  style={{ zIndex: 10, accentColor: '#6366f1', appearance: 'auto', background: '#334155', width: '100%', height: '20px', touchAction: 'pan-y' }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0.5m (short)</span>
                  <span>3m (tall)</span>
                </div>
              </div>

              {/* Column Radius Slider */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-300">Column Radius (r)</label>
                  <span className="text-lg font-bold text-purple-400">{(columnRadius * 100).toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.05"
                  step="0.001"
                  value={columnRadius}
                  onChange={(e) => {
                    setColumnRadius(parseFloat(e.target.value));
                    setAppliedForce(0); // Reset force when changing parameters
                  }}
                  className="w-full h-3 bg-slate-700 rounded-lg cursor-pointer"
                  style={{ zIndex: 10, accentColor: '#8b5cf6', appearance: 'auto', background: '#334155', width: '100%', height: '20px', touchAction: 'pan-y' }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1cm (thin)</span>
                  <span>5cm (thick)</span>
                </div>
              </div>

              {/* Applied Force Slider */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-300">Applied Force (P)</label>
                  <span className={`text-lg font-bold ${isBuckled ? 'text-red-400' : loadRatio > 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {appliedForce >= 1000 ? `${(appliedForce / 1000).toFixed(1)} kN` : `${appliedForce.toFixed(0)} N`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxSliderForce}
                  step={maxSliderForce / 100}
                  value={appliedForce}
                  onChange={(e) => {
                    const newForce = parseFloat(e.target.value);
                    setAppliedForce(newForce);
                    if (newForce >= criticalLoad && !isBuckled) {
                      playSound('failure');
                      setPlayExperimentsRun(prev => prev + 1);
                    }
                  }}
                  className="w-full h-3 bg-slate-700 rounded-lg cursor-pointer"
                  style={{ zIndex: 10, accentColor: '#3b82f6', appearance: 'auto', background: '#334155', width: '100%', height: '20px', touchAction: 'pan-y' }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span className="text-red-400">Critical: {criticalLoadKN.toFixed(1)} kN</span>
                </div>
                {/* Visual load bar */}
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${isBuckled ? 'bg-red-500' : loadRatio > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(loadRatio * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={() => {
                  setAppliedForce(0);
                  playSound('click');
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors text-sm"
                style={{ zIndex: 10 }}
              >
                Reset Force
              </button>
              <button
                onClick={() => {
                  setColumnLengthContinuous(1.5);
                  setColumnRadius(0.02);
                  setAppliedForce(0);
                  playSound('click');
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors text-sm"
                style={{ zIndex: 10 }}
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Progress to next phase */}
        {playExperimentsRun >= 2 && (
          <button
            onClick={() => goToPhase('review')}
            className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            Understand the Physics →
          </button>
        )}

        {playExperimentsRun < 2 && (
          <p className="text-slate-500 text-sm mt-4">
            Buckle the column {2 - playExperimentsRun} more time{playExperimentsRun === 1 ? '' : 's'} to continue
          </p>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Euler's Buckling Formula</h2>

      {/* Connection to prediction */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 max-w-xl">
        <p className="text-slate-300">
          As you saw in your experiment, {prediction === 'square' ? (
            <span className="text-emerald-400 font-semibold">your prediction was correct!</span>
          ) : (
            <span className="text-amber-400 font-semibold">the result may have surprised you.</span>
          )} When you observed the column behavior, what happened demonstrates a fundamental
          principle: doubling length quarters strength. This observation confirms the L² relationship.
        </p>
      </div>

      <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 max-w-xl mb-6">
        <div className="text-center mb-4">
          <div className="inline-block bg-slate-800 rounded-xl p-4 shadow-lg">
            <p className="text-sm text-slate-400 mb-1">Critical Buckling Load:</p>
            <span className="text-2xl font-bold text-indigo-400">P<sub>cr</sub> = π²EI / L²</span>
          </div>
        </div>

        <svg viewBox="0 0 300 140" className="w-full h-32 mb-4" preserveAspectRatio="xMidYMid meet">
          {renderPremiumDefs()}

          {/* Premium background */}
          <rect x="0" y="0" width="300" height="140" fill="url(#buckLabBg)" rx="10" />
          <rect x="0" y="0" width="300" height="140" fill="url(#buckLabGrid)" rx="10" />

          {/* Title with glow */}
          <text x="150" y="20" textAnchor="middle" fill="#6366f1" fontSize="11" fontWeight="bold" style={{ textShadow: '0 0 8px rgba(99,102,241,0.4)' }}>
            Buckling Load vs Length (1/L² Relationship)
          </text>

          {/* Axis lines with enhanced styling */}
          <line x1="40" y1="110" x2="280" y2="110" stroke="#64748b" strokeWidth="2" />
          <line x1="40" y1="110" x2="40" y2="30" stroke="#64748b" strokeWidth="2" />
          {/* Axis arrows */}
          <polygon points="280,110 272,106 272,114" fill="#64748b" />
          <polygon points="40,30 36,38 44,38" fill="#64748b" />

          <text x="160" y="128" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">Length (L) →</text>
          <text x="25" y="70" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500" transform="rotate(-90, 25, 70)">Load →</text>

          {/* Curve with gradient stroke effect using multiple paths */}
          <path
            d="M 50,35 Q 100,50 140,70 Q 180,85 220,95 Q 260,102 280,105"
            stroke="url(#buckForceArrow)"
            strokeWidth="4"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M 50,35 Q 100,50 140,70 Q 180,85 220,95 Q 260,102 280,105"
            stroke="#6366f1"
            strokeWidth="3"
            fill="none"
          />

          {/* Data points with glow effects */}
          <g filter="url(#buckBadgeGlow)">
            {/* Short column - high strength */}
            <circle cx="60" cy="38" r="8" fill="url(#buckSafeGlow)" />
            <circle cx="60" cy="38" r="6" fill="#10b981" />
            <text x="60" y="41" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">L</text>
          </g>
          <text x="60" y="55" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">200N</text>

          <g filter="url(#buckBadgeGlow)">
            {/* Medium column - medium strength */}
            <circle cx="140" cy="70" r="8" fill="url(#buckWarningGlow)" />
            <circle cx="140" cy="70" r="6" fill="#f59e0b" />
            <text x="140" y="73" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">2L</text>
          </g>
          <text x="140" y="87" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">50N</text>

          <g filter="url(#buckBadgeGlow)">
            {/* Long column - low strength */}
            <circle cx="260" cy="100" r="8" fill="url(#buckStressedGlow)" />
            <circle cx="260" cy="100" r="6" fill="#ef4444" />
            <text x="260" y="103" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">4L</text>
          </g>
          <text x="260" y="117" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">12N</text>
        </svg>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-500/20 rounded-lg p-2">
            <p className="font-bold text-emerald-400">L</p>
            <p className="text-sm text-emerald-300">200N</p>
          </div>
          <div className="bg-amber-500/20 rounded-lg p-2">
            <p className="font-bold text-amber-400">2L</p>
            <p className="text-sm text-amber-300">50N (4x less!)</p>
          </div>
          <div className="bg-red-500/20 rounded-lg p-2">
            <p className="font-bold text-red-400">4L</p>
            <p className="text-sm text-red-300">12N (16x less!)</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-xl">
        <h4 className="font-bold text-amber-400 mb-1">The Square Relationship</h4>
        <p className="text-slate-300">Double the length → Quarter the buckling strength! This is why skyscrapers need much thicker columns than houses.</p>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        style={{ zIndex: 10 }}
      >
        Try Shape Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'solid_best', label: 'Solid rods are strongest (most material)', icon: '●' },
      { id: 'hollow_best', label: 'Hollow tubes are stronger (material at edges)', icon: '◯' },
      { id: 'ibeam_best', label: 'I-beams are strongest (optimized shape)', icon: 'I' }
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-6">The Shape Twist</h2>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6 max-w-lg">
          <p className="text-slate-300">
            Three columns with the SAME amount of material, but different shapes:
            solid circle, hollow tube, or I-beam.
          </p>
          <p className="text-purple-400 font-semibold mt-3">
            Which resists buckling best?
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-6">
          {/* Solid cross-section with premium gradient */}
          <div className="text-center">
            <svg width="60" height="60" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet">
              {renderPremiumDefs()}
              {/* Background */}
              <circle cx="30" cy="30" r="28" fill="url(#buckLabBg)" stroke="#334155" strokeWidth="1" />
              {/* Solid section with metallic gradient */}
              <circle cx="30" cy="30" r="18" fill="url(#buckHollowTube)" />
              {/* 3D highlight */}
              <circle cx="24" cy="24" r="5" fill="rgba(255,255,255,0.25)" />
            </svg>
            <p className="text-sm text-slate-300 font-medium mt-1">Solid</p>
          </div>
          {/* Hollow cross-section with premium gradient */}
          <div className="text-center">
            <svg width="60" height="60" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet">
              {renderPremiumDefs()}
              {/* Background */}
              <circle cx="30" cy="30" r="28" fill="url(#buckLabBg)" stroke="#334155" strokeWidth="1" />
              {/* Outer ring with gradient */}
              <circle cx="30" cy="30" r="20" fill="url(#buckHollowTube)" />
              {/* Inner hole */}
              <circle cx="30" cy="30" r="12" fill="#0f172a" />
              {/* 3D highlight */}
              <ellipse cx="24" cy="24" rx="4" ry="3" fill="rgba(255,255,255,0.2)" />
            </svg>
            <p className="text-sm text-slate-300 font-medium mt-1">Hollow</p>
          </div>
          {/* I-Beam cross-section with premium gradient */}
          <div className="text-center">
            <svg width="60" height="60" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet">
              {renderPremiumDefs()}
              {/* Background */}
              <rect x="2" y="2" width="56" height="56" rx="5" fill="url(#buckLabBg)" stroke="#334155" strokeWidth="1" />
              {/* I-Beam with gradient */}
              <rect x="10" y="12" width="40" height="7" fill="url(#buckIBeam)" rx="1" />
              <rect x="10" y="41" width="40" height="7" fill="url(#buckIBeam)" rx="1" />
              <rect x="24" y="12" width="12" height="36" fill="url(#buckIBeam)" rx="1" />
              {/* 3D highlights */}
              <rect x="12" y="14" width="36" height="2" fill="rgba(255,255,255,0.15)" rx="1" />
            </svg>
            <p className="text-sm text-slate-300 font-medium mt-1">I-Beam</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
          {twistOptions.map(option => (
            <button
              key={option.id}
              onClick={() => {
                setTwistPrediction(option.id);
                playSound('click');
                console.debug('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                twistPrediction === option.id
                  ? 'border-purple-500 bg-purple-500/20 shadow-md'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl font-mono">{option.icon}</span>
              <span className={twistPrediction === option.id ? 'text-purple-300 font-semibold' : 'text-slate-300'}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            Test Shapes →
          </button>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => {
    // Calculate critical load for current twist parameters
    const twistCriticalLoad = calculateCriticalLoad(
      twistColumnLength,
      twistColumnRadius,
      selectedMaterial,
      selectedEndCondition
    );
    const twistCriticalLoadKN = twistCriticalLoad / 1000;
    const twistMaxSliderForce = Math.min(twistCriticalLoad * 1.2, 1000000);
    const twistLoadRatio = twistAppliedForce / twistCriticalLoad;
    const twistSafetyFactor = getSafetyFactor(twistAppliedForce, twistCriticalLoad);
    const twistIsBuckled = twistLoadRatio >= 1;
    const twistBuckleDeflection = twistIsBuckled ? 1 : twistLoadRatio * 0.3;

    const currentMaterial = materials[selectedMaterial];
    const currentEndCondition = endConditions[selectedEndCondition];

    // Get column color based on stress state
    const getTwistColumnColor = () => {
      if (twistIsBuckled) return colors.buckled;
      if (twistLoadRatio > 0.8) return colors.stressed;
      if (twistLoadRatio > 0.5) return colors.accent;
      return currentMaterial.color;
    };

    // Interactive twist column SVG
    const renderTwistInteractiveColumn = () => {
      const columnVisualHeight = 50 + (twistColumnLength - 0.5) * 80;
      const columnWidth = 8 + (twistColumnRadius - 0.01) * 400;
      const buckleOffset = twistBuckleDeflection * 40;

      // End condition visual markers
      const renderEndCondition = (position: 'top' | 'bottom') => {
        const y = position === 'top' ? 0 : columnVisualHeight;
        const isFixed = selectedEndCondition.includes('fixed') &&
          (position === 'bottom' || selectedEndCondition === 'fixed-fixed');
        const isPinned = selectedEndCondition.includes('pinned') &&
          (position === 'top' && selectedEndCondition === 'pinned-pinned') ||
          (position === 'bottom' && selectedEndCondition === 'fixed-pinned') ||
          (position === 'top' && selectedEndCondition === 'fixed-pinned');
        const isFree = selectedEndCondition === 'fixed-free' && position === 'top';

        if (isFixed) {
          return (
            <g transform={`translate(0, ${y})`}>
              <rect x="-20" y={position === 'top' ? -8 : 0} width="40" height="8" fill={colors.steel} />
              <line x1="-15" y1={position === 'top' ? -8 : 8} x2="-10" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
              <line x1="-5" y1={position === 'top' ? -8 : 8} x2="0" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
              <line x1="5" y1={position === 'top' ? -8 : 8} x2="10" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
              <line x1="15" y1={position === 'top' ? -8 : 8} x2="20" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
            </g>
          );
        }
        if (isPinned || (position === 'top' && selectedEndCondition === 'pinned-pinned')) {
          return (
            <g transform={`translate(0, ${y})`}>
              <circle cx="0" cy={position === 'top' ? -6 : 6} r="6" fill="none" stroke={colors.steel} strokeWidth="2" />
              <circle cx="0" cy={position === 'top' ? -6 : 6} r="2" fill={colors.steel} />
            </g>
          );
        }
        if (isFree) {
          return (
            <g transform={`translate(0, ${y})`}>
              <circle cx="0" cy="-4" r="3" fill={colors.accent} />
              <text x="15" y="0" fill={colors.accent} fontSize="11">free</text>
            </g>
          );
        }
        return null;
      };

      return (
        <svg viewBox="0 0 340 350" className="w-full h-80 md:h-96" preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect x="0" y="0" width="340" height="350" fill="#1e293b" rx="12" />

          {/* Ground/Base */}
          <rect x="0" y="300" width="340" height="50" fill={colors.steel} />

          {/* Applied Force Arrow */}
          <g transform={`translate(150, ${50})`}>
            <rect x="-45" y="-28" width="90" height="28" fill={colors.load} rx="4" />
            <text x="0" y="-10" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {twistAppliedForce >= 1000 ? `${(twistAppliedForce / 1000).toFixed(1)} kN` : `${twistAppliedForce.toFixed(0)} N`}
            </text>
            <polygon points="0,5 -12,-8 12,-8" fill={colors.load} />
          </g>

          {/* Column */}
          <g transform={`translate(150, ${300 - columnVisualHeight})`}>
            {twistIsBuckled || twistBuckleDeflection > 0 ? (
              <path
                d={`M 0,0
                    Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${columnVisualHeight * 0.25}
                      ${buckleOffset},${columnVisualHeight * 0.5}
                    Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${columnVisualHeight * 0.75}
                      0,${columnVisualHeight}`}
                stroke={getTwistColumnColor()}
                strokeWidth={columnWidth}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <rect
                x={-columnWidth / 2}
                y="0"
                width={columnWidth}
                height={columnVisualHeight}
                fill={getTwistColumnColor()}
                rx="2"
              />
            )}
            {/* End condition markers */}
            {renderEndCondition('top')}
            {renderEndCondition('bottom')}
          </g>

          {/* Status Badge */}
          <g transform="translate(150, 20)">
            <rect
              x="-55"
              y="-12"
              width="110"
              height="24"
              fill={twistIsBuckled ? colors.buckled : twistLoadRatio > 0.8 ? colors.stressed : colors.success}
              rx="12"
            />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {twistIsBuckled ? 'BUCKLED!' : twistLoadRatio > 0.8 ? 'NEAR CRITICAL!' : 'STABLE'}
            </text>
          </g>

          {/* Material indicator */}
          <g transform="translate(280, 80)">
            <rect x="-35" y="-20" width="70" height="55" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="-5" textAnchor="middle" fill={colors.neutral} fontSize="11">Material</text>
            <rect x="-15" y="5" width="30" height="8" fill={currentMaterial.color} rx="2" />
            <text x="0" y="28" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {currentMaterial.name}
            </text>
          </g>

          {/* End condition indicator */}
          <g transform="translate(60, 80)">
            <rect x="-45" y="-20" width="90" height="55" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="-5" textAnchor="middle" fill={colors.neutral} fontSize="11">End Condition</text>
            <text x="0" y="15" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">
              K = {currentEndCondition.K}
            </text>
            <text x="0" y="28" textAnchor="middle" fill="white" fontSize="11">
              {currentEndCondition.name.split(' ')[0]}
            </text>
          </g>

          {/* Safety Factor */}
          <g transform="translate(280, 180)">
            <rect x="-35" y="-15" width="70" height="50" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="0" textAnchor="middle" fill={colors.neutral} fontSize="11">Safety</text>
            <text x="0" y="18" textAnchor="middle" fill={twistSafetyFactor > 2 ? colors.success : twistSafetyFactor > 1 ? colors.accent : colors.danger} fontSize="16" fontWeight="bold">
              {twistSafetyFactor === Infinity ? '∞' : twistSafetyFactor.toFixed(1)}
            </text>
          </g>

          {/* Young's Modulus */}
          <g transform="translate(60, 180)">
            <rect x="-45" y="-15" width="90" height="50" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="0" textAnchor="middle" fill={colors.neutral} fontSize="11">E (modulus)</text>
            <text x="0" y="18" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
              {(currentMaterial.E / 1e9).toFixed(0)} GPa
            </text>
          </g>

          {/* Info text */}
          <text x="170" y="330" textAnchor="middle" fill={colors.neutral} fontSize="11">
            P_cr = {twistCriticalLoadKN.toFixed(1)} kN | K = {currentEndCondition.K} | E = {(currentMaterial.E / 1e9).toFixed(0)} GPa
          </text>
        </svg>
      );
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Material & End Condition Lab</h2>
        <p className="text-slate-400 mb-6">Explore how material properties and boundary conditions affect buckling</p>

        {/* Side-by-side layout: SVG left, controls right */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          {/* Left: SVG visualization */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            {/* Interactive Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full">
              {renderTwistInteractiveColumn()}
            </div>

            {/* Formula Explanation */}
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 w-full">
              <h4 className="font-bold text-purple-400 mb-2">How K Affects Critical Load</h4>
              <p className="text-sm text-slate-300 mb-2">
                The effective length factor <strong>K</strong> determines how end conditions affect buckling:
              </p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• <strong>Fixed-Fixed (K=0.5):</strong> 4x stronger than pinned-pinned</li>
                <li>• <strong>Pinned-Pinned (K=1.0):</strong> Reference case</li>
                <li>• <strong>Fixed-Free (K=2.0):</strong> 4x weaker than pinned-pinned</li>
              </ul>
            </div>
          </div>

          {/* Right: Controls panel */}
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Material Selector */}
            <div className="w-full mb-4">
              <h4 className="font-semibold text-slate-300 mb-2">Select Material:</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(materials).map(([key, mat]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedMaterial(key);
                      setTwistAppliedForce(0);
                      playSound('click');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedMaterial === key
                        ? 'border-purple-500 bg-purple-500/20 shadow-lg'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: mat.color }} />
                      <p className="font-medium text-white">{mat.name}</p>
                    </div>
                    <p className="text-xs text-slate-400">E = {(mat.E / 1e9).toFixed(0)} GPa</p>
                  </button>
                ))}
              </div>
            </div>

            {/* End Condition Selector */}
            <div className="w-full mb-4">
              <h4 className="font-semibold text-slate-300 mb-2">Select End Condition:</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(endConditions).map(([key, cond]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedEndCondition(key);
                      setTwistAppliedForce(0);
                      playSound('click');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedEndCondition === key
                        ? 'border-amber-500 bg-amber-500/20 shadow-lg'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-white text-sm">{cond.name}</p>
                      <span className="text-amber-400 font-bold">K = {cond.K}</span>
                    </div>
                    <p className="text-xs text-slate-400">{cond.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Range Sliders */}
            <div className="w-full space-y-4 mb-4">
              {/* Column Length Slider */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-300">Column Length (L)</label>
                  <span className="text-lg font-bold text-indigo-400">{twistColumnLength.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={twistColumnLength}
                  onChange={(e) => {
                    setTwistColumnLength(parseFloat(e.target.value));
                    setTwistAppliedForce(0);
                  }}
                  className="w-full h-3 bg-slate-700 rounded-lg cursor-pointer"
                  style={{ zIndex: 10, accentColor: '#6366f1', appearance: 'auto', background: '#334155', width: '100%', height: '20px', touchAction: 'pan-y' }}
                />
              </div>

              {/* Applied Force Slider */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-300">Applied Force (P)</label>
                  <span className={`text-lg font-bold ${twistIsBuckled ? 'text-red-400' : twistLoadRatio > 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {twistAppliedForce >= 1000 ? `${(twistAppliedForce / 1000).toFixed(1)} kN` : `${twistAppliedForce.toFixed(0)} N`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={twistMaxSliderForce}
                  step={twistMaxSliderForce / 100}
                  value={twistAppliedForce}
                  onChange={(e) => {
                    const newForce = parseFloat(e.target.value);
                    setTwistAppliedForce(newForce);
                    if (newForce >= twistCriticalLoad && !twistIsBuckled) {
                      playSound('failure');
                      setTwistExperimentsRun(prev => prev + 1);
                    }
                  }}
                  className="w-full h-3 bg-slate-700 rounded-lg cursor-pointer"
                  style={{ zIndex: 10, accentColor: '#3b82f6', appearance: 'auto', background: '#334155', width: '100%', height: '20px', touchAction: 'pan-y' }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span className="text-red-400">Critical: {twistCriticalLoadKN.toFixed(1)} kN</span>
                </div>
                {/* Visual load bar */}
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${twistIsBuckled ? 'bg-red-500' : twistLoadRatio > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(twistLoadRatio * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={() => {
                  setTwistAppliedForce(0);
                  playSound('click');
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors text-sm"
                style={{ zIndex: 10 }}
              >
                Reset Force
              </button>
              <button
                onClick={() => {
                  setSelectedMaterial('steel');
                  setSelectedEndCondition('pinned-pinned');
                  setTwistColumnLength(1.5);
                  setTwistColumnRadius(0.02);
                  setTwistAppliedForce(0);
                  playSound('click');
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors text-sm"
                style={{ zIndex: 10 }}
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Progress to next phase */}
        {twistExperimentsRun >= 2 && (
          <button
            onClick={() => goToPhase('twist_review')}
            className="mt-6 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            Review Findings →
          </button>
        )}

        {twistExperimentsRun < 2 && (
          <p className="text-slate-500 text-sm mt-4">
            Buckle the column with {2 - twistExperimentsRun} more configuration{twistExperimentsRun === 1 ? '' : 's'} to continue
          </p>
        )}
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Shape Optimization</h2>

      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-6 max-w-xl mb-6">
        <svg viewBox="0 0 300 130" className="w-full h-32 mb-4" preserveAspectRatio="xMidYMid meet">
          {renderPremiumDefs()}

          {/* Premium background with grid */}
          <rect x="0" y="0" width="300" height="130" fill="url(#buckLabBg)" rx="10" />
          <rect x="0" y="0" width="300" height="130" fill="url(#buckLabGrid)" rx="10" />

          {/* Title with glow effect */}
          <text x="150" y="18" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="bold" style={{ textShadow: '0 0 10px rgba(139,92,246,0.5)' }}>
            SAME MATERIAL, DIFFERENT SHAPES
          </text>

          {/* Solid section - least efficient */}
          <g transform="translate(50, 60)">
            {/* Background circle */}
            <circle cx="0" cy="0" r="28" fill="rgba(0,0,0,0.3)" stroke="#334155" strokeWidth="1" />
            {/* Solid with gradient */}
            <circle cx="0" cy="0" r="22" fill="url(#buckHollowTube)" filter="url(#buckDeformShadow)" />
            {/* 3D highlight */}
            <circle cx="-6" cy="-6" r="5" fill="rgba(255,255,255,0.2)" />
            {/* Label */}
            <text x="0" y="42" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">Solid</text>
            {/* Value badge */}
            <rect x="-22" y="48" width="44" height="18" fill="url(#buckStressedGlow)" rx="9" />
            <rect x="-20" y="50" width="40" height="14" fill="#dc2626" rx="7" />
            <text x="0" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">50N</text>
          </g>

          {/* Hollow section - medium efficient */}
          <g transform="translate(150, 60)">
            {/* Background circle */}
            <circle cx="0" cy="0" r="32" fill="rgba(0,0,0,0.3)" stroke="#334155" strokeWidth="1" />
            {/* Outer ring with gradient */}
            <circle cx="0" cy="0" r="26" fill="url(#buckHollowTube)" filter="url(#buckDeformShadow)" />
            {/* Inner hole */}
            <circle cx="0" cy="0" r="15" fill="#0f172a" />
            {/* 3D highlight */}
            <ellipse cx="-8" cy="-8" rx="4" ry="3" fill="rgba(255,255,255,0.15)" />
            {/* Label */}
            <text x="0" y="48" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">Hollow</text>
            {/* Value badge */}
            <rect x="-32" y="54" width="64" height="18" fill="url(#buckWarningGlow)" rx="9" />
            <rect x="-30" y="56" width="60" height="14" fill="#f59e0b" rx="7" />
            <text x="0" y="66" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">75N (1.5x)</text>
          </g>

          {/* I-Beam section - most efficient */}
          <g transform="translate(250, 60)">
            {/* Background rect */}
            <rect x="-30" y="-28" width="60" height="56" fill="rgba(0,0,0,0.3)" rx="5" stroke="#334155" strokeWidth="1" />
            {/* I-Beam with gradient */}
            <rect x="-24" y="-22" width="48" height="8" fill="url(#buckIBeam)" rx="1" filter="url(#buckDeformShadow)" />
            <rect x="-24" y="14" width="48" height="8" fill="url(#buckIBeam)" rx="1" />
            <rect x="-5" y="-22" width="10" height="44" fill="url(#buckIBeam)" rx="1" />
            {/* 3D highlights */}
            <rect x="-22" y="-20" width="44" height="2" fill="rgba(255,255,255,0.15)" rx="1" />
            {/* Label */}
            <text x="0" y="48" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">I-Beam</text>
            {/* Value badge */}
            <rect x="-32" y="54" width="64" height="18" fill="url(#buckSafeGlow)" rx="9" />
            <rect x="-30" y="56" width="60" height="14" fill="#10b981" rx="7" />
            <text x="0" y="66" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">125N (2.5x)</text>
          </g>
        </svg>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-xl">
        <h4 className="font-bold text-amber-400 mb-1">The Moment of Inertia Secret</h4>
        <p className="text-slate-300">
          Buckling resistance depends on the 'moment of inertia' (I)—how material is distributed from the center.
          I-beams place material far from the center, maximizing I and buckling resistance!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        style={{ zIndex: 10 }}
      >
        See Applications →
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    {
      icon: '🏢',
      title: 'Skyscraper Columns',
      short: 'Architecture',
      color: '#6366F1',
      description: 'The Burj Khalifa (828m tall) uses hollow steel-reinforced concrete columns. Engineers at Samsung C&T used Euler buckling calculations to ensure each column could support 500,000+ tons without buckling.',
      stat: '500,000+ tons supported'
    },
    {
      icon: '🚲',
      title: 'Bicycle Frame Design',
      short: 'Engineering',
      color: '#10B981',
      description: 'Trek, Specialized, and Giant all use hollow aluminum or carbon fiber tubes (not solid rods) for their frames. This design reduces weight by 40% while maintaining the same buckling resistance.',
      stat: '40% lighter frames'
    },
    {
      icon: '🦴',
      title: 'Bone Structure',
      short: 'Biology',
      color: '#F59E0B',
      description: 'Your femur (thigh bone) is hollow with a marrow cavity. Research from Harvard Medical School shows this evolved structure provides 3x the buckling resistance compared to a solid bone of equal weight.',
      stat: '3x buckling resistance'
    },
    {
      icon: '🗼',
      title: 'Transmission Towers',
      short: 'Infrastructure',
      color: '#8B5CF6',
      description: 'The lattice design of electrical towers (used by companies like National Grid and PG&E) separates structural members apart from the center, dramatically increasing effective moment of inertia.',
      stat: '10x more efficient'
    }
  ];

  const renderTransfer = () => (
    <div
      className="flex flex-col items-center"
      style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}
    >
      <h2
        className="text-white mb-4"
        style={{ fontSize: '28px', fontWeight: 700 }}
      >
        Buckling Everywhere
      </h2>

      <p style={{ color: '#94a3b8', marginBottom: '24px', textAlign: 'center', maxWidth: '600px' }}>
        From microscopic bones to towering skyscrapers, Euler's buckling formula shapes our world.
        Explore how engineers and nature apply these principles.
      </p>

      {/* Progress indicator */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
          Application {Math.min(completedApps + 1, 4)} of 4
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: completedApps > i ? '#10b981' : '#334155',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="grid grid-cols-2 w-full max-w-2xl mb-6"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '700px' }}
      >
        {realWorldApps.map((app, i) => (
          <button
            key={i}
            onClick={() => {
              if (completedApps <= i) {
                setCompletedApps(i + 1);
                playSound('complete');
              }
            }}
            className={`rounded-xl text-center transition-all ${
              completedApps > i
                ? 'border-emerald-500'
                : 'border-slate-700 hover:border-slate-600'
            }`}
            style={{
              padding: '20px',
              borderRadius: '16px',
              zIndex: 10,
              border: completedApps > i ? '2px solid #10b981' : '2px solid #334155',
              background: completedApps > i ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 41, 59, 0.5)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>{app.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '16px', color: completedApps > i ? '#10b981' : app.color }}>
                  {app.short}
                </p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>{app.title}</p>
              </div>
              {completedApps > i && <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '20px' }}>✓</span>}
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '8px' }}>
              {app.description}
            </p>
            <p style={{ fontSize: '14px', fontWeight: 700, color: app.color }}>
              {app.stat}
            </p>
          </button>
        ))}
      </div>

      <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
        {completedApps} / 4 applications explored
      </p>

      <button
        onClick={() => goToPhase('test')}
        style={{
          padding: '14px 28px',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 10,
          border: 'none',
          transition: 'all 0.2s ease',
          minHeight: '44px',
          background: completedApps >= 4
            ? 'linear-gradient(90deg, #7c3aed 0%, #db2777 100%)'
            : '#475569',
          color: 'white'
        }}
      >
        Got It
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    { question: 'What happens when you double a column\'s length?', options: [{ text: 'Half strength', correct: false }, { text: 'Quarter strength', correct: true }, { text: 'Same strength', correct: false }, { text: 'Double strength', correct: false }] },
    { question: 'Why do columns buckle sideways?', options: [{ text: 'Material weakness', correct: false }, { text: 'Small imperfections amplify', correct: true }, { text: 'Gravity pulls sideways', correct: false }, { text: 'Heat expansion', correct: false }] },
    { question: 'Which cross-section resists buckling best?', options: [{ text: 'Solid rod', correct: false }, { text: 'Hollow tube', correct: false }, { text: 'I-beam', correct: true }, { text: 'Square bar', correct: false }] },
    { question: 'What is moment of inertia (I)?', options: [{ text: 'Weight distribution', correct: false }, { text: 'Material distribution from center', correct: true }, { text: 'Total material amount', correct: false }, { text: 'Column height', correct: false }] },
    { question: 'Euler\'s formula shows P_cr is proportional to:', options: [{ text: '1/L', correct: false }, { text: '1/L²', correct: true }, { text: 'L', correct: false }, { text: 'L²', correct: false }] },
    { question: 'Why are bike frames hollow?', options: [{ text: 'Cheaper', correct: false }, { text: 'Higher I for same weight', correct: true }, { text: 'Easier to weld', correct: false }, { text: 'Better appearance', correct: false }] },
    { question: 'Long bones are hollow because:', options: [{ text: 'Blood storage', correct: false }, { text: 'Higher buckling resistance', correct: true }, { text: 'Flexibility', correct: false }, { text: 'Random evolution', correct: false }] },
    { question: 'Lattice towers resist buckling by:', options: [{ text: 'Heavy materials', correct: false }, { text: 'Separated members increase I', correct: true }, { text: 'Solid construction', correct: false }, { text: 'Magnetic forces', correct: false }] },
    { question: 'For same buckling resistance, 2x height needs:', options: [{ text: '2x thicker', correct: false }, { text: '4x thicker I', correct: true }, { text: 'Same thickness', correct: false }, { text: 'Half thickness', correct: false }] },
    { question: 'The L² relationship means:', options: [{ text: 'Linear scaling', correct: false }, { text: 'Dramatic weakness with length', correct: true }, { text: 'No effect', correct: false }, { text: 'Stronger when longer', correct: false }] }
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    const isCorrect = testQuestions[questionIndex].options[optionIndex].correct;
    playSound(isCorrect ? 'success' : 'failure');
    if (isCorrect) {
      onCorrectAnswer?.();
    } else {
      onIncorrectAnswer?.();
    }
  };

  const calculateTestScore = () => {
    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) correct++;
    });
    return correct;
  };

  const renderTest = () => {
    const allAnswered = testAnswers.every(a => a !== null);

    if (showTestResults) {
      const score = calculateTestScore();
      return (
        <div className="flex flex-col items-center p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Test Results</h2>
          <div className="text-6xl mb-4">{score >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-4xl font-bold text-indigo-400 mb-2">{score}/10</h3>
          <p className="text-slate-300 mb-6">
            {score >= 7 ? 'Excellent! Buckling physics mastered!' : 'Keep studying the concepts!'}
          </p>

          {/* Answer Review Section */}
          <div className="w-full max-w-2xl mb-6 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Answer Review</h3>
            <div className="space-y-3">
              {testQuestions.map((q, i) => {
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-left">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl flex-shrink-0">{isCorrect ? '✓' : '✗'}</span>
                      <p className="text-sm text-slate-300 flex-1">{i + 1}. {q.question}</p>
                    </div>
                    <div className="ml-7 text-xs space-y-1">
                      <p className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                        Your answer: {userAnswer !== null ? q.options[userAnswer].text : 'No answer'}
                      </p>
                      {!isCorrect && (
                        <p className="text-emerald-400">
                          Correct answer: {q.options.find(o => o.correct)?.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {score >= 7 ? (
            <button
              onClick={() => {
                setTestScore(score);
                goToPhase('mastery');
              }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              style={{ zIndex: 10 }}
            >
              Complete Lesson →
            </button>
          ) : (
            <button
              onClick={() => {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(null));
                goToPhase('review');
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              style={{ zIndex: 10 }}
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    // Track current question for sequential quiz flow
    const currentQuestionIndex = testAnswers.findIndex(a => a === null);
    const activeQuestion = currentQuestionIndex === -1 ? testQuestions.length - 1 : currentQuestionIndex;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Knowledge Check</h2>

        {/* Question progress indicator */}
        <p className="text-slate-400 mb-2">Question {activeQuestion + 1} of {testQuestions.length}</p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {testQuestions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                testAnswers[i] !== null
                  ? 'bg-emerald-500'
                  : i === activeQuestion
                    ? 'bg-indigo-500 scale-125'
                    : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4 w-full max-w-2xl max-h-96 overflow-y-auto mb-4">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="font-semibold text-white mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    aria-pressed={testAnswers[qIndex] === oIndex}
                    className={`p-3 rounded-lg text-left text-sm transition-all border-2 ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 transform scale-[1.02]'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border-transparent hover:border-slate-500'
                    }`}
                    style={{
                      zIndex: 10,
                      opacity: testAnswers[qIndex] === oIndex ? 1 : 0.9
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowTestResults(true)}
          disabled={!allAnswered}
          className={`px-6 py-3 rounded-xl font-semibold ${
            allAnswered
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          style={{ zIndex: 10 }}
        >
          Submit Answers
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MASTERY PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏗️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Buckling Physics Mastered!</h1>
        <p className="text-xl text-slate-300 mb-6">You understand structural stability!</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">L² Relationship</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔧</div>
            <p className="text-sm text-slate-300">Shape Optimization</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🦴</div>
            <p className="text-sm text-slate-300">Nature's Design</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🏢</div>
            <p className="text-sm text-slate-300">Engineering Apps</p>
          </div>
        </div>

        <div className="bg-emerald-500/20 rounded-xl p-4 mb-6">
          <div className="text-2xl font-bold text-emerald-400">Score: {testScore}/10 ({testScore * 10}%)</div>
        </div>

        <button
          onClick={() => {
            playSound('complete');
            onPhaseComplete?.();
          }}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg rounded-xl"
          style={{ zIndex: 10 }}
        >
          Complete Lesson
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const renderPhase = () => {
    switch (currentPhase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Buckling"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  // Calculate progress percentage for progress bar
  const progressPercent = ((PHASES.indexOf(currentPhase) + 1) / PHASES.length) * 100;

  return (
    <div
      className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden"
      style={{
        fontFamily: theme.fontFamily,
        lineHeight: '1.6',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh'
      }}
    >
      {/* Premium background gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)' }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Progress bar at very top */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: '#1e293b',
          zIndex: 100
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
            transition: 'width 0.3s ease-out'
          }}
        />
      </div>

      {/* Header */}
      <div
        className="fixed top-1 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}
      >
        <div
          className="flex items-center justify-between max-w-4xl mx-auto"
          style={{ padding: '12px 24px', maxWidth: '896px', display: 'flex', gap: '16px' }}
        >
          <span
            className="text-sm text-white/80 tracking-wide"
            style={{ fontWeight: 600, fontSize: '14px' }}
          >
            Buckling & Columns
          </span>
          <div className="flex items-center" style={{ display: 'flex', gap: '6px' }}>
            {PHASES.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={phaseLabels[p]}
                className={`rounded-full transition-all duration-300 ${
                  currentPhase === p
                    ? 'bg-indigo-400 shadow-lg shadow-indigo-400/30'
                    : PHASES.indexOf(currentPhase) > PHASES.indexOf(p)
                      ? 'bg-emerald-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{
                  width: currentPhase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'all 0.3s ease',
                  border: 'none',
                  fontSize: 0,
                  overflow: 'hidden',
                  color: 'transparent'
                }}
              >{idx}</button>
            ))}
          </div>
          <span
            className="text-sm text-indigo-400"
            style={{ fontWeight: 500, fontSize: '14px' }}
          >
            {phaseLabels[currentPhase]}
          </span>
        </div>
      </div>

      {/* Coach message */}
      {showCoachMessage && (
        <div className="fixed top-16 left-0 right-0 z-40 px-4" style={{ position: 'fixed', top: '64px' }}>
          <div style={{ maxWidth: '672px', margin: '16px auto' }}>
            <div
              className="text-white rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                padding: '16px',
                borderRadius: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧑‍🏫</span>
                <p style={{ flex: 1, fontWeight: 400, fontSize: '16px' }}>{coachMessages[currentPhase]}</p>
                <button
                  onClick={() => setShowCoachMessage(false)}
                  className="text-white/80 hover:text-white"
                  style={{ zIndex: 10, cursor: 'pointer', background: 'none', border: 'none', color: 'white' }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className="relative pt-16 pb-12"
        style={{ position: 'relative', paddingTop: '60px', paddingBottom: '16px', flex: 1, overflowY: 'auto' }}
      >
        {renderPhase()}
      </div>

      {/* Bottom navigation bar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.98) 100%)',
          padding: '12px 24px',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000
        }}
      >
        <button
          onClick={() => {
            const currentIndex = PHASES.indexOf(currentPhase);
            if (currentIndex > 0) {
              goToPhase(PHASES[currentIndex - 1]);
            }
          }}
          disabled={currentPhase === 'hook'}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: currentPhase === 'hook' ? 'not-allowed' : 'pointer',
            background: currentPhase === 'hook' ? '#334155' : '#475569',
            color: currentPhase === 'hook' ? '#64748b' : 'white',
            border: 'none',
            transition: 'all 0.2s ease',
            minHeight: '44px'
          }}
        >
          ← Back
        </button>
        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>
          {PHASES.indexOf(currentPhase) + 1} / {PHASES.length}
        </span>
        <button
          onClick={() => {
            const currentIndex = PHASES.indexOf(currentPhase);
            if (currentIndex < PHASES.length - 1) {
              goToPhase(PHASES[currentIndex + 1]);
            }
          }}
          disabled={currentPhase === 'mastery' || currentPhase === 'test'}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: (currentPhase === 'mastery' || currentPhase === 'test') ? 'not-allowed' : 'pointer',
            background: (currentPhase === 'mastery' || currentPhase === 'test') ? '#334155' : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
            color: (currentPhase === 'mastery' || currentPhase === 'test') ? '#64748b' : 'white',
            border: 'none',
            transition: 'all 0.2s ease',
            minHeight: '44px'
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default BucklingRenderer;
