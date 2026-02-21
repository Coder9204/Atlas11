'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ═══════════════════════════════════════════════════════════════════════════
// HOOKE'S LAW RENDERER - PREMIUM PHYSICS GAME
// ═══════════════════════════════════════════════════════════════════════════

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

// String-based phases
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Introduction',
  'predict': 'Predict',
  'play': 'Experiment',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Experiment',
  'twist_review': 'Twist Review',
  'transfer': 'Real World',
  'test': 'Knowledge Test',
  'mastery': 'Mastery'
};

interface HookesLawRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Test Questions
const testQuestions = [
  {
    scenario: "You're testing springs at a hardware store. Spring A stretches 2 cm when you hang a 100g weight. Spring B stretches 4 cm with the same weight.",
    question: "According to Hooke's Law (F = kx), which spring has the higher spring constant k?",
    options: [
      { id: 'a', label: "Spring A (stiffer spring, smaller stretch per unit force)", correct: true },
      { id: 'b', label: "Spring B (stretches more, so must be stronger)" },
      { id: 'c', label: "They have the same k (same force applied)" },
      { id: 'd', label: "Cannot determine without knowing the material" },
    ],
    explanation: "From F = kx, we get k = F/x. Both springs have the same force F (100g weight). Spring A: k = F/2cm, Spring B: k = F/4cm. Spring A has DOUBLE the spring constant because it stretches HALF as much."
  },
  {
    scenario: "A bungee cord has a spring constant of 50 N/m. A 60 kg person is attached and jumps off a platform.",
    question: "If the cord stretches 12 meters at maximum extension, what is the restoring force?",
    options: [
      { id: 'a', label: "50 N" },
      { id: 'b', label: "600 N", correct: true },
      { id: 'c', label: "4.2 N" },
      { id: 'd', label: "720 N" },
    ],
    explanation: "Hooke's Law: F = kx = 50 N/m x 12 m = 600 N. This restoring force decelerates the jumper and accelerates them back upward."
  },
  {
    scenario: "A car's suspension spring compresses 5 cm when a 200 kg load is placed on one corner.",
    question: "What is the spring constant of this suspension spring?",
    options: [
      { id: 'a', label: "1,000 N/m" },
      { id: 'b', label: "4,000 N/m" },
      { id: 'c', label: "40,000 N/m", correct: true },
      { id: 'd', label: "400,000 N/m" },
    ],
    explanation: "F = mg = 200 kg x 10 m/s^2 = 2,000 N. x = 5 cm = 0.05 m. k = F/x = 2,000 N / 0.05 m = 40,000 N/m."
  },
  {
    scenario: "You stretch a spring beyond its elastic limit. When you release it, the spring doesn't return to its original length.",
    question: "What happened to the spring?",
    options: [
      { id: 'a', label: "It gained energy and is now more powerful" },
      { id: 'b', label: "It underwent plastic deformation - the molecular bonds reorganized permanently", correct: true },
      { id: 'c', label: "It lost its spring constant entirely" },
      { id: 'd', label: "Temperature change affected its length" },
    ],
    explanation: "Beyond the elastic limit, plastic deformation occurs - molecular bonds break and reform in new positions. The spring now has a new 'rest' length."
  },
  {
    scenario: "Two identical springs (k = 100 N/m each) are connected in series (end to end) and a 10 N force is applied.",
    question: "What is the total stretch of the combined spring system?",
    options: [
      { id: 'a', label: "5 cm" },
      { id: 'b', label: "10 cm" },
      { id: 'c', label: "20 cm", correct: true },
      { id: 'd', label: "2.5 cm" },
    ],
    explanation: "In series, each spring feels the full 10 N force! Each stretches x = F/k = 10 N / 100 N/m = 0.1 m = 10 cm. Total = 20 cm."
  },
  {
    scenario: "The same two springs (k = 100 N/m each) are now connected in parallel (side by side) and the same 10 N force is applied.",
    question: "Now what is the total stretch?",
    options: [
      { id: 'a', label: "20 cm" },
      { id: 'b', label: "10 cm" },
      { id: 'c', label: "5 cm", correct: true },
      { id: 'd', label: "2.5 cm" },
    ],
    explanation: "In parallel, the force is shared! k_total = k1 + k2 = 200 N/m. Stretch x = F/k_total = 10 N / 200 N/m = 0.05 m = 5 cm."
  },
  {
    scenario: "A spring stores potential energy when compressed or stretched. A spring with k = 500 N/m is compressed by 0.1 m.",
    question: "How much elastic potential energy is stored?",
    options: [
      { id: 'a', label: "50 J" },
      { id: 'b', label: "25 J" },
      { id: 'c', label: "2.5 J", correct: true },
      { id: 'd', label: "5 J" },
    ],
    explanation: "PE = 1/2 kx^2 = 1/2 x 500 N/m x (0.1 m)^2 = 1/2 x 500 x 0.01 = 2.5 J."
  },
  {
    scenario: "A kitchen scale uses a spring to measure weight. The spring compresses 1 mm for every 100 grams placed on it.",
    question: "If you place a 1.5 kg object on the scale, how much does the spring compress?",
    options: [
      { id: 'a', label: "1.5 mm" },
      { id: 'b', label: "15 mm", correct: true },
      { id: 'c', label: "150 mm" },
      { id: 'd', label: "0.15 mm" },
    ],
    explanation: "The relationship is linear (Hooke's Law!). 1.5 kg = 1500 g = 15 x 100 g. Each 100 g causes 1 mm compression, so 15 x 1 mm = 15 mm."
  },
  {
    scenario: "A trampoline is essentially a large spring system. A child bounces higher and higher with each jump.",
    question: "During each bounce, when is the net force on the child greatest?",
    options: [
      { id: 'a', label: "At the highest point of the bounce" },
      { id: 'b', label: "When moving upward through the natural position" },
      { id: 'c', label: "At maximum compression of the trampoline surface", correct: true },
      { id: 'd', label: "The force is constant throughout" },
    ],
    explanation: "Hooke's Law: F = kx. Maximum force occurs at maximum displacement (greatest compression)."
  },
  {
    scenario: "Engineers are designing earthquake-resistant buildings. They want to use base isolation - giant springs between the building and foundation.",
    question: "Should these isolation springs be stiff (high k) or soft (low k)?",
    options: [
      { id: 'a', label: "Very stiff - to prevent any movement" },
      { id: 'b', label: "Relatively soft - to allow controlled movement and absorb energy", correct: true },
      { id: 'c', label: "Infinitely stiff - completely rigid connection" },
      { id: 'd', label: "Spring stiffness doesn't matter for earthquakes" },
    ],
    explanation: "Soft springs allow the ground to move while the building stays relatively stationary - decoupling the building from ground shaking."
  }
];

// Real-World Applications
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Vehicle Suspension Systems',
    tagline: 'Springs Absorb the Road',
    description: 'Every vehicle from bicycles to trains relies on spring-based suspension to absorb bumps and provide comfortable, controlled rides.',
    connection: 'The spring constant experiment shows how different k values affect displacement. Car engineers tune suspension springs to balance comfort (soft springs) and handling (stiff springs).',
    stats: [
      { value: '40000 kg', label: 'Force handled per spring', icon: '🔧' },
      { value: '100 m', label: 'Cycles before fatigue', icon: '📏' },
      { value: '$45 billion', label: 'Suspension market', icon: '💰' }
    ],
    color: '#22c55e'
  },
  {
    icon: '⌚',
    title: 'Mechanical Watches & Clocks',
    tagline: 'Springs Measure Time',
    description: 'Mechanical watches use a tiny coiled spring (hairspring) whose oscillations follow Hooke\'s Law, providing remarkably accurate timekeeping without batteries.',
    connection: 'The oscillation period of a spring-mass system (T = 2pi*sqrt(m/k)) means that the spring\'s stiffness directly determines how fast the watch ticks.',
    stats: [
      { value: '50 nm', label: 'Hairspring precision', icon: '🔍' },
      { value: '2 s', label: 'Daily accuracy tolerance', icon: '⏱️' },
      { value: '$50 billion', label: 'Luxury watch market', icon: '💎' }
    ],
    color: '#14b8a6'
  },
  {
    icon: '🏗️',
    title: 'Structural Engineering',
    tagline: 'Elastic Design Saves Lives',
    description: 'Hooke\'s Law governs how buildings and bridges respond to loads. Engineers ensure structures stay within elastic limits under expected forces.',
    connection: 'The elastic limit demonstration shows what happens when materials are overstressed. Structural engineers design with safety factors to ensure elastic behavior.',
    stats: [
      { value: '200 GHz', label: 'Steel stress cycles', icon: '🔩' },
      { value: '3x', label: 'Typical safety factor', icon: '🛡️' },
      { value: '$12 billion', label: 'Global construction', icon: '🌍' }
    ],
    color: '#f59e0b'
  },
  {
    icon: '🏃',
    title: 'Sports & Athletic Equipment',
    tagline: 'Energy Return Systems',
    description: 'From running shoes to pole vaults, athletic equipment exploits elastic energy storage and return to enhance human performance.',
    connection: 'The elastic potential energy formula (PE = 1/2 kx^2) shows how compressed or stretched materials store energy that can be returned to the athlete.',
    stats: [
      { value: '85%', label: 'Nike Air energy return', icon: '👟' },
      { value: '6 m', label: 'Pole vault records', icon: '🏅' },
      { value: '$180 billion', label: 'Sporting goods market', icon: '📊' }
    ],
    color: '#3b82f6'
  }
];

const HookesLawRenderer: React.FC<HookesLawRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  // Core State
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [confirmedAnswers, setConfirmedAnswers] = useState<boolean[]>(Array(10).fill(false));
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Experiment state
  const [springConstant, setSpringConstant] = useState(50);
  const [appliedForce, setAppliedForce] = useState(10);
  const [isOscillating, setIsOscillating] = useState(false);
  const [showForceArrows, setShowForceArrows] = useState(true);

  // Mobile detection
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

  // Phase sync
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.03), 30);
    return () => clearInterval(interval);
  }, []);

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

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) onGameEvent({ type, data });
  }, [onGameEvent]);

  // Phase navigation - simplified without locks
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    emitEvent('phase_change', { phase: newPhase, phaseLabel: phaseLabels[newPhase] });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [playSound, onPhaseComplete, emitEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculations
  const displacement = appliedForce / springConstant;
  const oscillationDisp = isOscillating ? displacement * Math.sin(time * 5) : displacement;
  const elasticPE = 0.5 * springConstant * displacement * displacement;

  // Test score
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // Progress Bar
  const ProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', maxWidth: '896px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>Hooke's Law</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={phaseLabels[p]}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: phase === p ? '#34d399' : i < currentIdx ? '#10b981' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  zIndex: 10
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#34d399' }}>{phaseLabels[phase]}</span>
        </div>
      </div>
    );
  };

  // Spring Visualization with Premium SVG Graphics
  const SpringVisualization = () => {
    const baseY = 50;
    const restLength = 100;
    const stretchAmount = oscillationDisp * 200;
    const currentLength = restLength + stretchAmount;
    const coils = 12;

    const springPath = () => {
      let path = `M 200 ${baseY}`;
      const coilHeight = currentLength / coils;
      const amplitude = 20;
      for (let i = 0; i < coils; i++) {
        const y1 = baseY + i * coilHeight + coilHeight / 4;
        const y2 = baseY + i * coilHeight + coilHeight / 2;
        const y3 = baseY + i * coilHeight + coilHeight * 3 / 4;
        const y4 = baseY + (i + 1) * coilHeight;
        path += ` Q ${200 + amplitude} ${y1} 200 ${y2}`;
        path += ` Q ${200 - amplitude} ${y3} 200 ${y4}`;
      }
      return path;
    };

    return (
      <div className="relative">
        <svg viewBox="0 0 400 350" className="w-full max-h-[350px]" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hookes Law visualization">
          <defs>
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PREMIUM GRADIENTS                                                   */}
            {/* ═══════════════════════════════════════════════════════════════════ */}

            {/* Metallic Spring Gradient - 6 color stops for realistic metal look */}
            <linearGradient id="hookeSpringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="15%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="85%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Spring Coil Depth Gradient - vertical for 3D depth effect */}
            <linearGradient id="hookeSpringDepthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
              <stop offset="25%" stopColor="#16a34a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#15803d" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#166534" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#14532d" stopOpacity="1" />
            </linearGradient>

            {/* Mass Block 3D Gradient - creates metallic cube appearance */}
            <linearGradient id="hookeMassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Mass Block Highlight */}
            <linearGradient id="hookeMassHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#94a3b8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </linearGradient>

            {/* Wall/Support Gradient - brushed metal */}
            <linearGradient id="hookeWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Force Arrow Down (Weight) Gradient */}
            <linearGradient id="hookeForceDownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Force Arrow Up (Spring) Gradient */}
            <linearGradient id="hookeForceUpGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="30%" stopColor="#4ade80" />
              <stop offset="60%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Equilibrium Line Glow Gradient */}
            <linearGradient id="hookeEquilibriumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
              <stop offset="20%" stopColor="#14b8a6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="1" />
              <stop offset="80%" stopColor="#14b8a6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </linearGradient>

            {/* Background Gradient */}
            <linearGradient id="hookeBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Stats Panel Gradient */}
            <linearGradient id="hookeStatsPanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* GLOW FILTERS                                                        */}
            {/* ═══════════════════════════════════════════════════════════════════ */}

            {/* Spring Glow - soft emerald glow around spring coils */}
            <filter id="hookeSpringGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Mass Glow - subtle glow for 3D depth */}
            <filter id="hookeMassGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force Arrow Glow - makes arrows pop */}
            <filter id="hookeForceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Equilibrium Position Glow - subtle indicator glow */}
            <filter id="hookeEquilibriumGlow" x="-50%" y="-200%" width="200%" height="500%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner Shadow for depth */}
            <filter id="hookeInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feOffset dx="2" dy="2" />
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ARROW MARKERS                                                       */}
            {/* ═══════════════════════════════════════════════════════════════════ */}

            <marker id="hookeArrowDown" markerWidth="12" markerHeight="12" refX="6" refY="0" orient="auto">
              <path d="M0,0 L6,12 L12,0 L6,3 Z" fill="url(#hookeForceDownGrad)" />
            </marker>
            <marker id="hookeArrowUp" markerWidth="12" markerHeight="12" refX="6" refY="12" orient="auto">
              <path d="M0,12 L6,0 L12,12 L6,9 Z" fill="url(#hookeForceUpGrad)" />
            </marker>
          </defs>

          {/* Premium dark background with gradient */}
          <rect width="400" height="350" fill="url(#hookeBgGrad)" />

          {/* Subtle grid pattern for depth */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`hgrid-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="350" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`vgrid-${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20} stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          ))}

          {/* Wall/Support with brushed metal gradient */}
          <rect x="150" y="25" width="100" height="25" fill="url(#hookeWallGrad)" rx="4" />
          <rect x="150" y="25" width="100" height="8" fill="url(#hookeMassHighlight)" rx="4" />

          {/* Spring coils with metallic gradient and glow */}
          <path
            d={springPath()}
            fill="none"
            stroke="url(#hookeSpringGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#hookeSpringGlow)"
          />
          {/* Spring coil shadow for depth */}
          <path
            d={springPath()}
            fill="none"
            stroke="#064e3b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.3"
            transform="translate(1, 1)"
          />

          {/* Mass block with 3D gradient and glow */}
          <g filter="url(#hookeMassGlow)">
            <rect
              x="160"
              y={baseY + currentLength}
              width="80"
              height="50"
              rx="8"
              fill="url(#hookeMassGrad)"
            />
            {/* Mass highlight overlay */}
            <rect
              x="160"
              y={baseY + currentLength}
              width="80"
              height="20"
              rx="8"
              fill="url(#hookeMassHighlight)"
            />
            {/* Mass border glow */}
            <rect
              x="160"
              y={baseY + currentLength}
              width="80"
              height="50"
              rx="8"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeOpacity="0.6"
            />
          </g>

          {/* Force arrows with glow effect */}
          {showForceArrows && (
            <g filter="url(#hookeForceGlow)">
              {/* Weight arrow (down) */}
              <line
                x1="200"
                y1={baseY + currentLength + 55}
                x2="200"
                y2={baseY + currentLength + 55 + appliedForce * 2}
                stroke="url(#hookeForceDownGrad)"
                strokeWidth="4"
                markerEnd="url(#hookeArrowDown)"
              />

              {/* Spring force arrow (up) */}
              <line
                x1="200"
                y1={baseY + currentLength - 5}
                x2="200"
                y2={baseY + currentLength - 5 - appliedForce * 2}
                stroke="url(#hookeForceUpGrad)"
                strokeWidth="4"
                markerEnd="url(#hookeArrowUp)"
              />
            </g>
          )}

          {/* Equilibrium/Rest position indicator with glow */}
          <g filter="url(#hookeEquilibriumGlow)">
            <line
              x1="260"
              y1={baseY + restLength}
              x2="340"
              y2={baseY + restLength}
              stroke="url(#hookeEquilibriumGrad)"
              strokeWidth="2"
              strokeDasharray="6 3"
            />
          </g>

          {/* Current position indicator */}
          <line
            x1="260"
            y1={baseY + currentLength + 25}
            x2="340"
            y2={baseY + currentLength + 25}
            stroke="#14b8a6"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            strokeOpacity="0.8"
          />

          {/* Displacement bracket with glow */}
          {stretchAmount > 10 && (
            <g filter="url(#hookeEquilibriumGlow)">
              <line
                x1="300"
                y1={baseY + restLength}
                x2="300"
                y2={baseY + currentLength + 25}
                stroke="#2dd4bf"
                strokeWidth="2.5"
              />
              {/* Top bracket cap */}
              <line
                x1="295"
                y1={baseY + restLength}
                x2="305"
                y2={baseY + restLength}
                stroke="#2dd4bf"
                strokeWidth="2"
              />
              {/* Bottom bracket cap */}
              <line
                x1="295"
                y1={baseY + currentLength + 25}
                x2="305"
                y2={baseY + currentLength + 25}
                stroke="#2dd4bf"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Stats panel with gradient background */}
          <rect x="15" y="245" width="160" height="90" rx="10" fill="url(#hookeStatsPanelGrad)" stroke="#334155" strokeWidth="1" />

          {/* SVG Text Labels - Direct labels on objects */}
          <text x="200" y="35" textAnchor="middle" fill="#64748b" fontSize="11">Support Wall</text>
          <text x="200" y={baseY + currentLength + 35} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{(appliedForce / 10).toFixed(1)} kg Mass</text>
          <text x="340" y={baseY + restLength + 4} textAnchor="start" fill="#64748b" fontSize="11">Rest Position</text>
          <text x="25" y="260" fill="#64748b" fontSize="11">Spring Constant (k)</text>
          <text x="25" y="275" fill="#22c55e" fontSize="12" fontWeight="bold">{springConstant} N/m</text>
          <text x="25" y="295" fill="#64748b" fontSize="11">Potential Energy</text>
          <text x="25" y="310" fill="#f59e0b" fontSize="12" fontWeight="bold">{elasticPE.toFixed(2)} J</text>
          {stretchAmount > 10 && (
            <text x="315" y={(baseY + restLength + baseY + currentLength + 25) / 2} fill="#2dd4bf" fontSize="11" fontWeight="bold">x = {(displacement * 100).toFixed(1)} cm</text>
          )}
        </svg>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TEXT LABELS OUTSIDE SVG - Using typo system for responsive typography  */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}

        {/* Mass label - positioned over the mass block */}
        <div
          className="absolute text-white font-bold text-center pointer-events-none"
          style={{
            fontSize: typo.body,
            left: '50%',
            top: `calc(${((baseY + currentLength + 25) / 350) * 100}% + 2px)`,
            transform: 'translateX(-50%)',
          }}
        >
          {(appliedForce / 10).toFixed(1)} kg
        </div>

        {/* Force labels when arrows are shown */}
        {showForceArrows && (
          <>
            {/* Weight label */}
            <div
              className="absolute font-bold pointer-events-none"
              style={{
                fontSize: typo.small,
                color: '#f87171',
                left: '60%',
                top: `calc(${((baseY + currentLength + 70) / 350) * 100}%)`,
              }}
            >
              W = {appliedForce.toFixed(0)} N
            </div>

            {/* Spring force label */}
            <div
              className="absolute font-bold pointer-events-none"
              style={{
                fontSize: typo.small,
                color: '#4ade80',
                left: '60%',
                top: `calc(${((baseY + currentLength - 40) / 350) * 100}%)`,
              }}
            >
              F = kx = {appliedForce.toFixed(0)} N
            </div>
          </>
        )}

        {/* Rest position label */}
        <div
          className="absolute pointer-events-none text-right"
          style={{
            fontSize: typo.label,
            color: '#cbd5e1',
            right: '5%',
            top: `calc(${((baseY + restLength) / 350) * 100}%)`,
            transform: 'translateY(-50%)',
          }}
        >
          Rest
        </div>

        {/* Displacement label */}
        {stretchAmount > 10 && (
          <div
            className="absolute font-bold pointer-events-none"
            style={{
              fontSize: typo.small,
              color: '#2dd4bf',
              left: '78%',
              top: `calc(${((baseY + (restLength + currentLength) / 2 + 15) / 350) * 100}%)`,
            }}
          >
            x = {(displacement * 100).toFixed(1)} cm
          </div>
        )}

        {/* Stats panel labels */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '6%',
            top: '73%',
          }}
        >
          <div style={{ fontSize: typo.label, color: '#cbd5e1', marginBottom: '2px' }}>Spring Constant (k)</div>
          <div style={{ fontSize: typo.bodyLarge, color: '#22c55e', fontWeight: 'bold' }}>{springConstant} N/m</div>
          <div style={{ fontSize: typo.label, color: '#cbd5e1', marginTop: '8px', marginBottom: '2px' }}>Potential Energy</div>
          <div style={{ fontSize: typo.bodyLarge, color: '#f59e0b', fontWeight: 'bold' }}>{elasticPE.toFixed(2)} J</div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

        <ProgressBar />

        <div style={{ position: 'relative', paddingTop: '64px', paddingBottom: '48px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#10B981', letterSpacing: '0.05em' }}>MECHANICS</span>
            </div>

            <h1 style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 700, marginBottom: '16px', color: 'white' }}>
              Hooke's Law: F = kx
            </h1>

            <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '448px', marginBottom: '40px' }}>
              Discover the beautifully simple law that governs all springs
            </p>

            <div style={{ position: 'relative', background: 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '576px', width: '100%', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <div style={{ position: 'relative' }}>
                <p style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, lineHeight: 1.6, marginBottom: '24px' }}>
                  Springs are everywhere - in your mattress, your car, even your watch.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { icon: '🔧', label: 'Spring Lab' },
                    { icon: '📐', label: 'F = kx' },
                    { icon: '🚗', label: 'Real World' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.6 }}>
                  The law that governs them all is remarkably simple...
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{
                zIndex: 10,
                marginTop: '40px',
                padding: '20px 40px',
                background: 'linear-gradient(to right, #10B981, #14b8a6)',
                color: 'white',
                fontSize: '18px',
                fontWeight: 600,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                Start Learning
                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" preserveAspectRatio="xMidYMid meet">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10B981' }}>*</span>
                Interactive Lab
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10B981' }}>*</span>
                Real-World Examples
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10B981' }}>*</span>
                Knowledge Test
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  if (phase === 'predict') {
    const predictions = [
      { id: 'half', label: '2.5 cm (half as much)', desc: 'Heavier objects compress springs more tightly' },
      { id: 'same', label: '5 cm (same amount)', desc: 'Springs have a fixed maximum stretch' },
      { id: 'double', label: '10 cm (double the stretch)', desc: 'Double the force = double the displacement', correct: true },
      { id: 'quad', label: '20 cm (quadruple)', desc: 'Stretch increases with the square of force' },
    ];

    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

        <ProgressBar />

        <div style={{ position: 'relative', paddingTop: '80px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: '576px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Prediction</span>
              <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: 'white', marginTop: '8px', marginBottom: '12px' }}>
                How Do Springs Respond?
              </h2>
              <p style={{ color: '#94a3b8' }}>You hang 1 kg on a spring and it stretches 5 cm. If you hang 2 kg, how much will it stretch?</p>
            </div>

            {/* Static Spring Diagram for Predict Phase */}
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <svg viewBox="0 0 400 200" style={{ width: '100%', maxHeight: '200px' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="predictSpringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                {/* Background */}
                <rect width="400" height="200" fill="#0f172a" />
                {/* Wall */}
                <rect x="80" y="20" width="80" height="20" fill="#374151" rx="4" />
                {/* Spring coil - static diagram */}
                <path d="M 120 40 Q 140 50 120 60 Q 100 70 120 80 Q 140 90 120 100 Q 100 110 120 120"
                      fill="none" stroke="url(#predictSpringGrad)" strokeWidth="4" strokeLinecap="round" />
                {/* 1 kg mass */}
                <rect x="95" y="125" width="50" height="35" fill="#64748b" rx="6" />
                <text x="120" y="147" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">1 kg</text>
                {/* Label */}
                <text x="120" y="180" textAnchor="middle" fill="#10b981" fontSize="11">Stretches 5 cm</text>

                {/* Arrow to 2kg scenario */}
                <path d="M 180 100 L 220 100" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="200" y="90" textAnchor="middle" fill="#94a3b8" fontSize="11">Add weight</text>

                {/* 2 kg scenario - with ? */}
                <rect x="260" y="20" width="80" height="20" fill="#374151" rx="4" />
                <path d="M 300 40 Q 320 55 300 70 Q 280 85 300 100 Q 320 115 300 130 Q 280 145 300 160"
                      fill="none" stroke="url(#predictSpringGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 4" />
                <rect x="275" y="165" width="50" height="35" fill="#64748b" rx="6" />
                <text x="300" y="187" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">2 kg</text>
                <text x="365" y="140" fill="#f59e0b" fontSize="24" fontWeight="bold">?</text>
              </svg>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    zIndex: 10,
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    background: prediction === p.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    border: prediction === p.id ? '2px solid #10b981' : '2px solid transparent'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: prediction === p.id ? '#34d399' : 'white' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 500, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={() => { if (prediction) goToPhase('play'); }}
                disabled={!prediction}
                style={{
                  zIndex: 10,
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: prediction ? 'linear-gradient(to right, #10b981, #14b8a6)' : '#334155',
                  color: prediction ? 'white' : '#64748b',
                  border: 'none',
                  cursor: prediction ? 'pointer' : 'not-allowed'
                }}
              >
                Test the Spring
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PLAY (Spring Lab)
  // ============================================================================
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

        <ProgressBar />

        <div style={{ position: 'relative', paddingTop: '80px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spring Lab</span>
              <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: 'white', marginTop: '8px' }}>Hooke's Law Explorer</h2>
              <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>This visualization shows how a spring responds to applied force. Watch how when you increase the force, the spring stretches more because the displacement is proportional to the applied force. This is important for engineers who design suspension systems and other practical applications in industry.</p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            {/* SVG Visualization Container */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '24px' }}>
              <SpringVisualization />
            </div>

            {/* Formula Card */}
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>F = kx</p>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>Force = Spring Constant x Displacement</p>
              <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '8px' }}>As you increase force, displacement increases proportionally. A higher spring constant means less stretch for the same force.</p>
            </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Slider Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Applied Force</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>{appliedForce} N</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={appliedForce}
                  onChange={(e) => setAppliedForce(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', background: '#334155', borderRadius: '4px', accentColor: '#10b981', touchAction: 'pan-y' }}
                />
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#2dd4bf', fontWeight: 600 }}>Spring Constant</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>{springConstant} N/m</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={springConstant}
                  onChange={(e) => setSpringConstant(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', background: '#334155', borderRadius: '4px', accentColor: '#14b8a6', touchAction: 'pan-y' }}
                />
              </div>
            </div>

            {/* Toggle Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setShowForceArrows(!showForceArrows)}
                style={{
                  zIndex: 10,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: showForceArrows ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: showForceArrows ? '2px solid #10b981' : '2px solid transparent',
                  color: showForceArrows ? '#34d399' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {showForceArrows ? 'Hide' : 'Show'} Forces
              </button>
              <button
                onClick={() => setIsOscillating(!isOscillating)}
                style={{
                  zIndex: 10,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: isOscillating ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: isOscillating ? '2px solid #f59e0b' : '2px solid transparent',
                  color: isOscillating ? '#fbbf24' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {isOscillating ? 'Stop' : 'Start'} Oscillation
              </button>
            </div>
            </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 500, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10, flex: 1, padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: 'linear-gradient(to right, #10b981, #14b8a6)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Understand the Physics
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  if (phase === 'review') {
    const userWasRight = prediction === 'double';

    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

        <ProgressBar />

        <div style={{ position: 'relative', paddingTop: '80px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: '576px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{userWasRight ? '🎯' : '💡'}</div>
              <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, marginBottom: '8px', color: '#34d399' }}>
                {userWasRight ? 'Exactly Right!' : 'The Linear Relationship!'}
              </h2>
              <p style={{ color: '#cbd5e1' }}>
                {userWasRight
                  ? 'You predicted correctly! As you observed in the simulation, double the force = double the stretch.'
                  : 'As you saw in the experiment, double the force = double the stretch. This is the key insight you discovered!'}
              </p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>F = kx</p>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>Force = Spring Constant x Displacement</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>k = F/x</div>
                  <div style={{ fontSize: '14px', color: '#94a3b8' }}>Higher k = stiffer spring</div>
                </div>
                <div style={{ background: 'rgba(20, 184, 166, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(20, 184, 166, 0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2dd4bf', marginBottom: '4px' }}>PE = 1/2 kx^2</div>
                  <div style={{ fontSize: '14px', color: '#94a3b8' }}>Energy stored in spring</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {[
                { icon: '📏', title: 'Linearity', text: 'Double the force = double the stretch. Triple = triple. Perfectly linear!' },
                { icon: '🔧', title: 'Spring Constant k', text: 'Measures stiffness. High k = hard to stretch. Low k = easy to stretch.' },
                { icon: '⚠️', title: 'Elastic Limit', text: 'Only works up to a point! Beyond the elastic limit, springs deform permanently.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white' }}>{item.title}</div>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 500, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10, flex: 1, padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: 'linear-gradient(to right, #10b981, #14b8a6)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                The Elastic Limit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PREDICT
  // ============================================================================
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'break', label: 'The spring breaks immediately' },
      { id: 'same', label: 'Nothing - springs can stretch infinitely' },
      { id: 'deform', label: 'The spring deforms permanently - it won\'t return to original length', correct: true },
      { id: 'stronger', label: 'The spring becomes stronger' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Twist Challenge</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-3">
                What Happens Beyond the Limit?
              </h2>
              <p className="text-slate-400">You keep adding weight to a spring, stretching it more and more. What happens when you exceed the elastic limit?</p>
            </div>

            {/* Static Spring Diagram showing extreme stretch */}
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <svg viewBox="0 0 400 180" style={{ width: '100%', maxHeight: '180px' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="twistSpringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                {/* Background */}
                <rect width="400" height="180" fill="#0f172a" />
                {/* Wall */}
                <rect x="80" y="15" width="80" height="18" fill="#374151" rx="4" />
                {/* Spring - heavily stretched with warning signs */}
                <path d="M 120 33 Q 135 40 120 47 Q 105 54 120 61 Q 135 68 120 75 Q 105 82 120 89 Q 135 96 120 103 Q 105 110 120 117 Q 135 124 120 131"
                      fill="none" stroke="url(#twistSpringGrad)" strokeWidth="3" strokeLinecap="round" />
                {/* Multiple weights stacked */}
                <rect x="95" y="135" width="50" height="25" fill="#64748b" rx="4" />
                <rect x="100" y="110" width="40" height="22" fill="#475569" rx="3" />
                <rect x="105" y="88" width="30" height="20" fill="#4b5563" rx="2" />
                <text x="120" y="152" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Heavy!</text>
                {/* Warning indicator */}
                <text x="180" y="90" fill="#f59e0b" fontSize="28" fontWeight="bold">?</text>
                {/* Labels */}
                <text x="200" y="50" fill="#f59e0b" fontSize="11">Elastic Limit</text>
                <line x1="200" y1="55" x2="200" y2="140" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4" />
                <text x="280" y="100" fill="#94a3b8" fontSize="11">What happens</text>
                <text x="280" y="115" fill="#94a3b8" fontSize="11">beyond this?</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {twistOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTwistPrediction(opt.id)}
                  style={{
                    zIndex: 10,
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    background: twistPrediction === opt.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    border: twistPrediction === opt.id ? '2px solid #f59e0b' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontWeight: 600, color: twistPrediction === opt.id ? '#fbbf24' : 'white' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 500, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={() => { if (twistPrediction) goNext(); }}
                disabled={!twistPrediction}
                style={{
                  zIndex: 10,
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: twistPrediction ? 'linear-gradient(to right, #f59e0b, #ea580c)' : '#334155',
                  color: twistPrediction ? 'white' : '#64748b',
                  border: 'none',
                  cursor: twistPrediction ? 'pointer' : 'not-allowed'
                }}
              >
                See What Happens
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PLAY
  // ============================================================================
  if (phase === 'twist_play') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Beyond the Limit</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">Plastic Deformation</h2>
            </div>

            {/* Stress-Strain Curve */}
            <svg viewBox="0 0 400 250" className="w-full max-h-[250px] mb-6" preserveAspectRatio="xMidYMid meet">
              <rect width="400" height="250" fill="#0f172a" />
              <line x1="50" y1="200" x2="380" y2="200" stroke="#334155" strokeWidth="2" />
              <line x1="50" y1="200" x2="50" y2="30" stroke="#334155" strokeWidth="2" />
              <text x="220" y="230" textAnchor="middle" fill="#64748b" fontSize="12">Strain (Displacement)</text>
              <text x="20" y="120" textAnchor="middle" fill="#64748b" fontSize="12" transform="rotate(-90, 20, 120)">Stress (Force)</text>
              <path d="M 50 200 L 150 100" stroke="#22c55e" strokeWidth="3" fill="none" />
              <text x="90" y="140" fill="#22c55e" fontSize="11" fontWeight="bold">Linear (Hooke's Law)</text>
              <circle cx="150" cy="100" r="6" fill="#f59e0b" />
              <text x="150" y="85" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">Elastic Limit</text>
              <path d="M 150 100 Q 220 60 280 70" stroke="#ef4444" strokeWidth="3" fill="none" />
              <text x="220" y="55" fill="#ef4444" fontSize="11" fontWeight="bold">Plastic Deformation</text>
              <circle cx="280" cy="70" r="6" fill="#ef4444" />
              <text x="280" y="50" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">Fracture</text>
              <path d="M 200 85 L 120 200" stroke="#64748b" strokeWidth="2" strokeDasharray="5" fill="none" />
              <text x="170" y="170" fill="#64748b" fontSize="11">Permanent deformation</text>
            </svg>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="font-semibold text-emerald-400 mb-2">Elastic Region</p>
                <p className="text-sm text-slate-400">F = kx applies. Remove force = returns to original shape.</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <p className="font-semibold text-red-400 mb-2">Plastic Region</p>
                <p className="text-sm text-slate-400">Beyond elastic limit. Permanent deformation. Bonds break and reform.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10 }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                Key Insight
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST REVIEW
  // ============================================================================
  if (phase === 'twist_review') {
    const userWasRight = twistPrediction === 'deform';

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{userWasRight ? '🎯' : '💡'}</div>
              <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-amber-400'}`}>
                {userWasRight ? 'Exactly!' : 'Elastic vs Plastic'}
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { icon: '🔬', title: 'Molecular Basis', text: 'In the elastic region, atoms are displaced but bonds stretch - not break. In plastic region, bonds break and reform.' },
                { icon: '🏗️', title: 'Engineering Design', text: 'Structures must stay well within elastic limits under normal loads. Safety factors ensure we never approach plastic deformation.' },
                { icon: '🔨', title: 'Useful Deformation', text: 'Sometimes we WANT plastic deformation: bending metal into shapes, car crumple zones absorbing crash energy.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-slate-400">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10 }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
              >
                Real World Applications
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER (Real World Applications)
  // ============================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Hookes Law"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.size >= realWorldApps.length;

    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

        <ProgressBar />

        <div style={{ position: 'relative', paddingTop: '80px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: '672px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-World Applications</span>
              <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: 'white', marginTop: '8px' }}>Springs Everywhere</h2>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>App {selectedApp + 1} of {realWorldApps.length} - {completedApps.size} completed</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, idx) => {
                const isCompleted = completedApps.has(idx);
                const isCurrent = idx === selectedApp;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedApp(idx)}
                    style={{
                      zIndex: 10,
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      background: isCurrent ? a.color : isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                      color: isCurrent ? 'white' : isCompleted ? '#34d399' : '#94a3b8',
                      border: isCompleted && !isCurrent ? '1px solid #10b981' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {isCompleted ? '✓' : a.icon} {a.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: `${app.color}30` }}>
                  {app.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>{app.title}</h3>
                  <p style={{ fontSize: '14px', color: app.color }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>{app.description} Hooke's Law (F = kx) is fundamental to understanding how these systems work in the real world. Engineers use spring constants measured in N/m to precisely calculate displacements and ensure safety margins are maintained.</p>

              <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${app.color}40`, background: `${app.color}15` }}>
                <p style={{ fontWeight: 600, marginBottom: '4px', color: app.color }}>Physics Connection</p>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>{app.connection}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '18px' }}>{stat.icon}</span>
                    <div style={{ fontWeight: 700, color: app.color }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {!completedApps.has(selectedApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(selectedApp);
                    setCompletedApps(newCompleted);
                    playSound('complete');
                  }}
                  style={{ background: app.color, zIndex: 10, width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  Mark as Understood
                </button>
              ) : (
                <div style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 600, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', textAlign: 'center' }}>
                  Completed
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 500, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                {selectedApp < realWorldApps.length - 1 && (
                  <button
                    onClick={() => setSelectedApp(selectedApp + 1)}
                    style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: 'rgba(30, 41, 59, 0.8)', color: 'white', border: '1px solid rgba(51, 65, 85, 0.5)', cursor: 'pointer' }}
                  >
                    Next Application
                  </button>
                )}
                <button
                  onClick={() => { if (allCompleted) goNext(); }}
                  disabled={!allCompleted}
                  style={{
                    zIndex: 10,
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    background: allCompleted ? 'linear-gradient(to right, #10b981, #14b8a6)' : '#334155',
                    color: allCompleted ? 'white' : '#94a3b8',
                    border: 'none',
                    cursor: allCompleted ? 'pointer' : 'not-allowed',
                    opacity: allCompleted ? 1 : 0.7
                  }}
                >
                  Take the Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  if (phase === 'test') {
    const q = testQuestions[testQuestion];
    const totalCorrect = calculateTestScore();

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

          <ProgressBar />

          <div className="relative pt-20 pb-12 px-4">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="text-7xl mb-4">{passed ? '🎉' : '📚'}</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalCorrect}/10
              </div>
              <p className="text-slate-400 mb-8">
                {passed ? 'You\'ve mastered Hooke\'s Law!' : 'Review the concepts and try again.'}
              </p>
              <button
                onClick={() => passed ? goNext() : goToPhase('review')}
                style={{ zIndex: 10 }}
                className={`px-8 py-4 rounded-xl font-semibold text-lg ${
                  passed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                }`}
              >
                {passed ? 'Claim Your Badge!' : 'Review Material'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
        <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

        <ProgressBar />

        <div style={{ position: 'relative', paddingTop: '80px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: '576px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question {testQuestion + 1} of 10</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: testAnswers[i] !== null
                      ? testAnswers[i] === testQuestions[i].options.find(o => o.correct)?.id ? '#10b981' : '#ef4444'
                      : i === testQuestion ? '#34d399' : '#334155'
                  }} />
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Scenario:</p>
              <p style={{ fontSize: '14px', color: '#cbd5e1' }}>{q.scenario}</p>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>{q.question}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {q.options.map((opt, i) => {
                const isPending = pendingAnswer === opt.id && !confirmedAnswers[testQuestion];
                const isConfirmed = confirmedAnswers[testQuestion];
                const isSelected = testAnswers[testQuestion] === opt.id;
                const isCorrect = opt.correct;
                const showResult = isConfirmed;

                // Determine styling based on state
                let bgColor = 'rgba(30, 41, 59, 0.5)';
                let borderColor = 'transparent';
                let borderWidth = '2px';
                if (showResult) {
                  if (isCorrect) {
                    bgColor = 'rgba(16, 185, 129, 0.2)';
                    borderColor = '#10b981';
                  } else if (isSelected) {
                    bgColor = 'rgba(239, 68, 68, 0.2)';
                    borderColor = '#ef4444';
                  }
                } else if (isPending) {
                  bgColor = 'rgba(59, 130, 246, 0.2)';
                  borderColor = '#3b82f6';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!confirmedAnswers[testQuestion]) {
                        setPendingAnswer(opt.id);
                      }
                    }}
                    style={{
                      zIndex: 10,
                      padding: '16px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      fontSize: '14px',
                      background: bgColor,
                      border: `${borderWidth} solid ${borderColor}`,
                      cursor: !confirmedAnswers[testQuestion] ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{
                      fontWeight: 700,
                      marginRight: '8px',
                      color: showResult
                        ? isCorrect ? '#34d399' : isSelected ? '#f87171' : '#64748b'
                        : isPending ? '#60a5fa' : '#34d399'
                    }}>
                      {String.fromCharCode(65 + i)})
                    </span>
                    <span style={{ color: 'white' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Check Answer Button - shown when answer is pending but not confirmed */}
            {pendingAnswer && !confirmedAnswers[testQuestion] && (
              <button
                onClick={() => {
                  const newAnswers = [...testAnswers];
                  newAnswers[testQuestion] = pendingAnswer;
                  setTestAnswers(newAnswers);
                  const newConfirmed = [...confirmedAnswers];
                  newConfirmed[testQuestion] = true;
                  setConfirmedAnswers(newConfirmed);
                  const isCorrect = q.options.find(o => o.id === pendingAnswer)?.correct;
                  playSound(isCorrect ? 'success' : 'failure');
                  emitEvent('test_answered', { questionIndex: testQuestion, correct: isCorrect });
                  setPendingAnswer(null);
                }}
                style={{
                  zIndex: 10,
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  transition: 'all 0.2s ease'
                }}
              >
                Check Answer
              </button>
            )}

            {confirmedAnswers[testQuestion] && (
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '24px' }}>
                <p style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>Explanation</p>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>{q.explanation}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {testQuestion > 0 ? (
                <button
                  onClick={() => { setTestQuestion(testQuestion - 1); setPendingAnswer(null); }}
                  style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 500, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Previous
                </button>
              ) : <div />}
              {confirmedAnswers[testQuestion] && (
                testQuestion < testQuestions.length - 1 ? (
                  <button
                    onClick={() => { setTestQuestion(testQuestion + 1); setPendingAnswer(null); }}
                    style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: 'linear-gradient(to right, #10b981, #14b8a6)', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={() => { setTestSubmitted(true); emitEvent('game_completed', { score: testScore, total: testQuestions.length }); }}
                    style={{ zIndex: 10, padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: 'linear-gradient(to right, #10b981, #14b8a6)', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    See Results
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  if (phase === 'mastery') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center mb-6">
              <span className="text-6xl">🏆</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Elasticity Master!</h1>
            <p className="text-lg text-slate-400 mb-8 max-w-md">
              You've mastered Hooke's Law, spring constants, and elastic limits. Springs hold no secrets from you!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: '🔩', label: 'Spring Expert' },
                { icon: '📐', label: 'F = kx Master' },
                { icon: '⚡', label: 'Energy Guru' },
              ].map((achievement, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-xs text-slate-400">{achievement.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-8 max-w-md w-full">
              <p className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-2">Key Formula Mastered</p>
              <p className="text-2xl font-bold text-white">F = kx</p>
            </div>

            <button
              onClick={() => { goToPhase('hook'); emitEvent('mastery_achieved', {}); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg rounded-xl shadow-lg shadow-emerald-500/25"
            >
              Explore Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </div>
  );
};

export default HookesLawRenderer;
