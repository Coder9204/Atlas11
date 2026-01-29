'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

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

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

interface PowerFactorRendererProps {
  phase: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What is power factor?',
    options: [
      { text: 'The ratio of voltage to current', correct: false },
      { text: 'The ratio of real power to apparent power (cos phi)', correct: true },
      { text: 'The total power consumed', correct: false },
      { text: 'The frequency of the AC power', correct: false },
    ],
  },
  {
    question: 'What type of power do motors primarily consume that heaters do not?',
    options: [
      { text: 'Active power', correct: false },
      { text: 'Reactive power', correct: true },
      { text: 'Phantom power', correct: false },
      { text: 'Direct power', correct: false },
    ],
  },
  {
    question: 'A power factor of 0.8 means:',
    options: [
      { text: '80% of the power is lost as heat', correct: false },
      { text: '80% of apparent power is doing useful work', correct: true },
      { text: 'The voltage is 80% of normal', correct: false },
      { text: 'The frequency is 80% of nominal', correct: false },
    ],
  },
  {
    question: 'Why do utilities charge industrial customers for low power factor?',
    options: [
      { text: 'To encourage energy conservation', correct: false },
      { text: 'Because reactive power requires larger conductors and equipment', correct: true },
      { text: 'It is just an arbitrary fee', correct: false },
      { text: 'Low power factor uses more fuel', correct: false },
    ],
  },
  {
    question: 'What is the phase relationship between voltage and current in a pure inductor?',
    options: [
      { text: 'Current leads voltage by 90 degrees', correct: false },
      { text: 'Current lags voltage by 90 degrees', correct: true },
      { text: 'They are in phase', correct: false },
      { text: 'Current leads voltage by 45 degrees', correct: false },
    ],
  },
  {
    question: 'How do capacitors improve power factor?',
    options: [
      { text: 'They store energy more efficiently', correct: false },
      { text: 'They provide leading reactive power that cancels lagging reactive power', correct: true },
      { text: 'They reduce the voltage', correct: false },
      { text: 'They increase the frequency', correct: false },
    ],
  },
  {
    question: 'What is the unit for reactive power?',
    options: [
      { text: 'Watts (W)', correct: false },
      { text: 'Volt-Amperes Reactive (VAR)', correct: true },
      { text: 'Joules (J)', correct: false },
      { text: 'Amperes (A)', correct: false },
    ],
  },
  {
    question: 'In the power triangle, apparent power is:',
    options: [
      { text: 'The sum of real and reactive power', correct: false },
      { text: 'The vector sum (hypotenuse) of real and reactive power', correct: true },
      { text: 'Equal to real power', correct: false },
      { text: 'Always less than real power', correct: false },
    ],
  },
  {
    question: 'What power factor do purely resistive loads like heaters have?',
    options: [
      { text: '0 (zero)', correct: false },
      { text: '0.5', correct: false },
      { text: '1.0 (unity)', correct: true },
      { text: 'Variable', correct: false },
    ],
  },
  {
    question: 'Why do motors have a lagging power factor?',
    options: [
      { text: 'Because they spin slowly', correct: false },
      { text: 'Because their inductive windings cause current to lag voltage', correct: true },
      { text: 'Because they are inefficient', correct: false },
      { text: 'Because they use DC internally', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Industrial Power Factor Correction',
    description: 'Factories install capacitor banks to correct power factor, reducing electricity bills and freeing up transformer capacity.',
    icon: '🏭',
  },
  {
    title: 'Variable Frequency Drives',
    description: 'VFDs in modern HVAC systems can cause harmonic distortion. Active filters and proper sizing maintain power quality.',
    icon: '🌡️',
  },
  {
    title: 'Utility Power Factor Penalties',
    description: 'Commercial customers often pay penalties for power factor below 0.9. Correction equipment typically pays for itself within 1-2 years.',
    icon: '💰',
  },
  {
    title: 'Renewable Energy Inverters',
    description: 'Solar inverters can provide reactive power support, helping stabilize grid voltage while generating clean energy.',
    icon: '☀️',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function PowerFactorRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: PowerFactorRendererProps) {
  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase state
  const [loadType, setLoadType] = useState<'resistive' | 'motor'>('resistive');
  const [phaseAngle, setPhaseAngle] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state - capacitor correction
  const [capacitorSize, setCapacitorSize] = useState(0);
  const [motorPhaseAngle, setMotorPhaseAngle] = useState(37); // About 0.8 PF lagging
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Animation for waveforms
  useEffect(() => {
    const animate = () => {
      setAnimationTime(prev => prev + 0.05);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Calculate effective phase angle with capacitor correction
  const effectivePhaseAngle = Math.max(0, motorPhaseAngle - capacitorSize);
  const powerFactor = Math.cos((effectivePhaseAngle * Math.PI) / 180);
  const realPower = 1000; // Fixed 1kW real power
  const reactivePower = realPower * Math.tan((effectivePhaseAngle * Math.PI) / 180);
  const apparentPower = realPower / powerFactor;

  // Navigation helpers
  const goToNextPhase = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;

    if (onPhaseComplete) {
      onPhaseComplete();
    }

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 300);
  }, [onPhaseComplete]);

  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleLoadTypeChange = useCallback((type: 'resistive' | 'motor') => {
    setLoadType(type);
    setPhaseAngle(type === 'resistive' ? 0 : 37);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 2) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleCapacitorChange = useCallback((value: number) => {
    setCapacitorSize(value);
    setHasExploredTwist(true);
  }, []);

  const handleCompleteApp = useCallback((index: number) => {
    setCompletedApps(prev => new Set([...prev, index]));
  }, []);

  const handleTestAnswer = useCallback((qIndex: number, aIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[qIndex] = aIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer !== null && TEST_QUESTIONS[index].options[answer].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // Get power factor color
  const getPFColor = (pf: number) => {
    if (pf >= 0.95) return '#22c55e';
    if (pf >= 0.85) return '#f59e0b';
    return '#ef4444';
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER PHASES
  // ────────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 600 }}>POWER PHYSICS</span>
      </div>

      <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Why Do Motors Cost More to Run Than Heaters at the Same Wattage?
      </h1>

      <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        A 1000W motor and a 1000W heater both say "1000W" but the motor actually draws more current. Why?
      </p>

      <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '32px' }}>
        <rect width="400" height="220" fill="#1e293b" rx="12" />

        {/* Heater */}
        <rect x="40" y="60" width="120" height="100" fill="rgba(239, 68, 68, 0.1)" stroke="#ef4444" strokeWidth="2" rx="8" />
        <text x="100" y="90" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">Heater</text>
        <text x="100" y="115" textAnchor="middle" fill="#ef4444" fontSize="20" fontWeight="bold">1000W</text>
        <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="11">Current: 8.3A</text>

        {/* Motor */}
        <rect x="240" y="60" width="120" height="100" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" rx="8" />
        <text x="300" y="90" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">Motor</text>
        <text x="300" y="115" textAnchor="middle" fill="#3b82f6" fontSize="20" fontWeight="bold">1000W</text>
        <text x="300" y="140" textAnchor="middle" fill="#f59e0b" fontSize="11">Current: 10.4A!</text>

        {/* Question mark */}
        <text x="200" y="130" textAnchor="middle" fill="#f59e0b" fontSize="36" fontWeight="bold">?</text>

        {/* Power factor labels */}
        <text x="100" y="180" textAnchor="middle" fill="#22c55e" fontSize="12">PF = 1.0</text>
        <text x="300" y="180" textAnchor="middle" fill="#ef4444" fontSize="12">PF = 0.8</text>
      </svg>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7 }}>
          The answer lies in <strong style={{ color: '#a855f7' }}>power factor</strong> - the relationship
          between the voltage and current waveforms. Motors need extra "reactive" current that heaters don't.
        </p>
      </div>

      <button
        onClick={goToNextPhase}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Discover Power Factor
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#c4b5fd', fontSize: '14px', lineHeight: 1.6 }}>
          In AC circuits, motors have inductive windings. What effect does this inductance
          have on the current waveform compared to voltage?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'leads', label: 'Current leads voltage (arrives before)', icon: '⏩' },
          { id: 'lags', label: 'Current lags voltage (arrives after)', icon: '⏪' },
          { id: 'same', label: 'Current and voltage are in phase', icon: '🔄' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? '2px solid #a855f7'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(168, 85, 247, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 500,
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '20px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{
          background: prediction === 'lags' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${prediction === 'lags' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: prediction === 'lags' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {prediction === 'lags' ? (
              <><strong>Correct!</strong> Inductors resist changes in current, so current lags behind voltage. This phase difference means extra current flows without doing useful work.</>
            ) : (
              <><strong>Not quite!</strong> In inductive loads like motors, current LAGS behind voltage because inductors resist changes in current flow.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onClick={goToNextPhase}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See the Waveforms
        </button>
      )}
    </div>
  );

  const renderPlay = () => {
    const currentAngle = loadType === 'resistive' ? 0 : 37;
    const currentPF = Math.cos((currentAngle * Math.PI) / 180);

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Voltage & Current Waveforms
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Compare resistive and inductive loads
        </p>

        {/* Power Factor Display */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center',
          border: `2px solid ${getPFColor(currentPF)}`,
        }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>POWER FACTOR</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: getPFColor(currentPF) }}>
            {currentPF.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Phase Angle: {currentAngle}deg
          </div>
        </div>

        {/* Waveform SVG */}
        <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '24px' }}>
          <rect width="400" height="200" fill="#0f172a" rx="12" />

          {/* Grid lines */}
          <line x1="50" y1="100" x2="350" y2="100" stroke="#334155" strokeWidth="1" />
          {[100, 150, 200, 250, 300].map(x => (
            <line key={x} x1={x} y1="40" x2={x} y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="4" />
          ))}

          {/* Voltage waveform (blue) */}
          <path
            d={`M 50 100 ${Array.from({ length: 60 }, (_, i) => {
              const x = 50 + i * 5;
              const y = 100 - Math.sin((i / 60) * 4 * Math.PI + animationTime) * 50;
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
          />

          {/* Current waveform (orange/green based on load) */}
          <path
            d={`M 50 100 ${Array.from({ length: 60 }, (_, i) => {
              const x = 50 + i * 5;
              const phaseShift = (currentAngle * Math.PI) / 180;
              const y = 100 - Math.sin((i / 60) * 4 * Math.PI + animationTime - phaseShift) * 50;
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={loadType === 'resistive' ? '#22c55e' : '#f59e0b'}
            strokeWidth="3"
          />

          {/* Legend */}
          <rect x="260" y="15" width="130" height="55" fill="rgba(15, 23, 42, 0.9)" rx="6" />
          <line x1="270" y1="32" x2="300" y2="32" stroke="#3b82f6" strokeWidth="3" />
          <text x="310" y="36" fill="#94a3b8" fontSize="11">Voltage</text>
          <line x1="270" y1="52" x2="300" y2="52" stroke={loadType === 'resistive' ? '#22c55e' : '#f59e0b'} strokeWidth="3" />
          <text x="310" y="56" fill="#94a3b8" fontSize="11">Current</text>

          {/* Phase shift indicator */}
          {currentAngle > 0 && (
            <>
              <path d="M 150 170 L 175 170" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
              <text x="162" y="185" textAnchor="middle" fill="#f59e0b" fontSize="10">lag</text>
            </>
          )}
        </svg>

        {/* Load Type Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => handleLoadTypeChange('resistive')}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              border: loadType === 'resistive' ? '2px solid #22c55e' : '2px solid rgba(100, 116, 139, 0.3)',
              background: loadType === 'resistive' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            🔥 Heater<br />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Resistive Load</span>
          </button>
          <button
            onClick={() => handleLoadTypeChange('motor')}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              border: loadType === 'motor' ? '2px solid #f59e0b' : '2px solid rgba(100, 116, 139, 0.3)',
              background: loadType === 'motor' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ⚙️ Motor<br />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Inductive Load</span>
          </button>
        </div>

        <div style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: '#c4b5fd', fontSize: '13px', lineHeight: 1.6 }}>
            <strong>Notice:</strong> With the motor, current lags voltage. This phase shift means
            more total current flows, even though real power (watts) is the same!
          </p>
        </div>

        <button
          onClick={goToNextPhase}
          disabled={!hasExperimented}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: hasExperimented
              ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
              : '#475569',
            border: 'none',
            borderRadius: '12px',
            cursor: hasExperimented ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {hasExperimented ? 'Continue to Review' : 'Try both load types first'}
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
        Understanding Power Factor
      </h2>

      {/* Power Triangle */}
      <div style={{
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
          The Power Triangle
        </div>
        <svg viewBox="0 0 300 150" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block' }}>
          {/* Triangle */}
          <line x1="50" y1="120" x2="250" y2="120" stroke="white" strokeWidth="3" />
          <line x1="250" y1="120" x2="250" y2="40" stroke="white" strokeWidth="3" />
          <line x1="50" y1="120" x2="250" y2="40" stroke="white" strokeWidth="3" strokeDasharray="8" />

          {/* Labels */}
          <text x="150" y="140" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Real Power (W)</text>
          <text x="280" y="85" textAnchor="start" fill="white" fontSize="12" fontWeight="bold">Reactive</text>
          <text x="280" y="100" textAnchor="start" fill="white" fontSize="12">(VAR)</text>
          <text x="120" y="70" textAnchor="middle" fill="#fcd34d" fontSize="12" fontWeight="bold">Apparent</text>
          <text x="120" y="85" textAnchor="middle" fill="#fcd34d" fontSize="12">(VA)</text>

          {/* Angle */}
          <path d="M 80 120 A 30 30 0 0 0 95 105" fill="none" stroke="white" strokeWidth="2" />
          <text x="105" y="115" fill="white" fontSize="10">phi</text>
        </svg>
        <div style={{ color: 'white', fontSize: '16px', textAlign: 'center', marginTop: '12px' }}>
          Power Factor = cos(phi) = Real / Apparent
        </div>
      </div>

      {[
        {
          icon: '⚡',
          title: 'Real Power (Watts)',
          desc: 'The actual work-producing power. This is what heaters use 100% of - converting electricity directly to heat.',
        },
        {
          icon: '🔄',
          title: 'Reactive Power (VAR)',
          desc: 'Power that sloshes back and forth in motor windings, creating magnetic fields but not doing work. Still requires current!',
        },
        {
          icon: '📊',
          title: 'Apparent Power (VA)',
          desc: 'The total power the utility must supply - the vector sum of real and reactive. This determines wire size and transformer rating.',
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <div>
            <h4 style={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}

      <button
        onClick={goToNextPhase}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Now for a Twist...
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>
        Power Factor Correction
      </h2>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          Motors have lagging power factor because of their inductance. But capacitors have
          LEADING current. What happens if we add capacitors to a motor circuit?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'worse', label: 'Power factor gets worse (more lag)', icon: '📉' },
          { id: 'nothing', label: 'No effect on power factor', icon: '➡️' },
          { id: 'better', label: 'Capacitor\'s lead cancels motor\'s lag!', icon: '✨' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: twistPrediction === option.id
                ? '2px solid #f59e0b'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: twistPrediction === option.id
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 500,
              cursor: showTwistFeedback ? 'default' : 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '20px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{
          background: twistPrediction === 'better' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${twistPrediction === 'better' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: twistPrediction === 'better' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {twistPrediction === 'better' ? (
              <><strong>Exactly!</strong> Capacitors draw leading reactive current that cancels the motor's lagging reactive current. The right size capacitor can bring power factor to nearly 1.0!</>
            ) : (
              <><strong>Actually,</strong> capacitors provide leading reactive power that cancels the motor's lagging reactive power. It's like adding positive to negative - they cancel out!</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onClick={goToNextPhase}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Try Capacitor Correction
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        Capacitor Power Factor Correction
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Add capacitance to correct the motor's lagging power factor
      </p>

      {/* Power Factor Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getPFColor(powerFactor)}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>CORRECTED POWER FACTOR</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getPFColor(powerFactor) }}>
          {powerFactor.toFixed(2)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Real</div>
            <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: 'bold' }}>{realPower}W</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Reactive</div>
            <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 'bold' }}>{reactivePower.toFixed(0)} VAR</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Apparent</div>
            <div style={{ fontSize: '14px', color: '#a855f7', fontWeight: 'bold' }}>{apparentPower.toFixed(0)} VA</div>
          </div>
        </div>
      </div>

      {/* Visual representation */}
      <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '24px' }}>
        <rect width="400" height="120" fill="#0f172a" rx="12" />

        {/* Motor reactive power bar */}
        <rect x="50" y="30" width="100" height="30" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="2" rx="4" />
        <text x="100" y="50" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">Motor -37 VAR</text>

        {/* Plus sign */}
        <text x="175" y="50" textAnchor="middle" fill="#94a3b8" fontSize="20">+</text>

        {/* Capacitor reactive power bar */}
        <rect x="200" y="30" width={Math.min(capacitorSize * 2.7, 100)} height="30" fill="rgba(34, 197, 94, 0.3)" stroke="#22c55e" strokeWidth="2" rx="4" />
        <text x="250" y="50" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">Cap +{capacitorSize} VAR</text>

        {/* Equals sign */}
        <text x="325" y="50" textAnchor="middle" fill="#94a3b8" fontSize="20">=</text>

        {/* Net result */}
        <text x="365" y="50" textAnchor="middle" fill={effectivePhaseAngle < 10 ? '#22c55e' : '#f59e0b'} fontSize="14" fontWeight="bold">
          {effectivePhaseAngle.toFixed(0)}deg
        </text>

        {/* Label */}
        <text x="200" y="100" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Leading VAR from capacitor cancels lagging VAR from motor
        </text>
      </svg>

      {/* Capacitor slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Capacitor Size: {capacitorSize} VAR (correction)
        </label>
        <input
          type="range"
          min="0"
          max="40"
          value={capacitorSize}
          onChange={(e) => handleCapacitorChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#22c55e' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>No correction</span>
          <span>Full correction</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#86efac', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Goal:</strong> Adjust the capacitor to bring power factor as close to 1.0 as possible.
          Watch how apparent power (VA) decreases as you correct!
        </p>
      </div>

      <button
        onClick={goToNextPhase}
        disabled={!hasExploredTwist}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: hasExploredTwist
            ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: hasExploredTwist ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {hasExploredTwist ? 'Continue' : 'Adjust the capacitor slider'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
        Why Power Factor Correction Matters
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Cost Savings Example</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>PF 0.8</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>1250 VA needed</div>
          </div>
          <div style={{ color: 'white', fontSize: '24px' }}>vs</div>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>PF 0.95</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>1053 VA needed</div>
          </div>
        </div>
        <div style={{ color: '#fef3c7', fontSize: '14px', marginTop: '12px', fontWeight: 'bold' }}>
          16% reduction in current!
        </div>
      </div>

      {[
        {
          icon: '💰',
          title: 'Lower Electricity Bills',
          desc: 'Utilities charge penalties for low power factor. Correction capacitors typically pay for themselves in 1-2 years.',
        },
        {
          icon: '🔌',
          title: 'Reduced Cable Losses',
          desc: 'Lower current means less I²R losses in wiring. This saves energy and reduces heat in electrical systems.',
        },
        {
          icon: '⚡',
          title: 'More Capacity',
          desc: 'Transformers and switchgear are rated in VA, not watts. Better power factor means you can add more equipment.',
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <div>
            <h4 style={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}

      <button
        onClick={goToNextPhase}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Real-World Applications
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Complete all 4 to unlock the assessment
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeAppTab === index
                ? '#a855f7'
                : completedApps.has(index)
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(51, 65, 85, 0.5)',
              color: activeAppTab === index ? 'white' : completedApps.has(index) ? '#22c55e' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {completedApps.has(index) && '✓'} App {index + 1}
          </button>
        ))}
      </div>

      {/* Active App Content */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '16px' }}>
          {TRANSFER_APPS[activeAppTab].icon}
        </div>
        <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
          {TRANSFER_APPS[activeAppTab].title}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, textAlign: 'center', marginBottom: '20px' }}>
          {TRANSFER_APPS[activeAppTab].description}
        </p>

        {!completedApps.has(activeAppTab) ? (
          <button
            onClick={() => handleCompleteApp(activeAppTab)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Mark as Complete
          </button>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '8px',
            color: '#22c55e',
            fontWeight: 'bold',
          }}>
            Completed
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress</span>
          <span style={{ color: '#a855f7', fontSize: '14px', fontWeight: 'bold' }}>{completedApps.size}/4</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
          <div style={{
            height: '100%',
            width: `${(completedApps.size / 4) * 100}%`,
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      <button
        onClick={goToNextPhase}
        disabled={completedApps.size < 4}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: completedApps.size >= 4
            ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: completedApps.size >= 4 ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {completedApps.size >= 4 ? 'Take the Assessment' : `Complete ${4 - completedApps.size} more`}
      </button>
    </div>
  );

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;

    if (testSubmitted) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: testScore >= 7
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <span style={{ fontSize: '36px' }}>{testScore >= 7 ? '⚡' : '📚'}</span>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
            {testScore}/10 Correct
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            {testScore >= 7 ? 'Excellent! You understand power factor!' : 'Review the concepts and try again.'}
          </p>

          {/* Answer Review */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                }}>
                  <p style={{ color: '#f8fafc', fontSize: '13px', marginBottom: '8px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#64748b',
                      fontSize: '12px',
                      padding: '2px 0',
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            onClick={goToNextPhase}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {testScore >= 7 ? 'Complete Lesson' : 'Continue Anyway'}
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Knowledge Assessment
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          10 questions - 70% to pass
        </p>

        {/* Progress */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress</span>
            <span style={{ color: '#a855f7', fontSize: '14px', fontWeight: 'bold' }}>{answeredCount}/10</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(answeredCount / 10) * 100}%`,
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Questions */}
        <div style={{ marginBottom: '24px' }}>
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: testAnswers[qIndex] !== null ? '#a855f7' : '#475569',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>
                  {qIndex + 1}
                </span>
                <p style={{ color: '#f8fafc', fontSize: '14px', lineHeight: 1.5 }}>{q.question}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '36px' }}>
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: testAnswers[qIndex] === oIndex ? '#a855f7' : 'rgba(51, 65, 85, 0.5)',
                      color: testAnswers[qIndex] === oIndex ? 'white' : '#cbd5e1',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
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
          onClick={handleSubmitTest}
          disabled={answeredCount < 10}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: answeredCount >= 10
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : '#475569',
            border: 'none',
            borderRadius: '12px',
            cursor: answeredCount >= 10 ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {answeredCount >= 10 ? 'Submit Assessment' : `Answer ${10 - answeredCount} more questions`}
        </button>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>⚡</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Power Factor Master!
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
        You now understand reactive power and power factor correction
      </p>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <h3 style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '16px' }}>Key Takeaways</h3>
        {[
          'Power factor is the ratio of real power to apparent power (cos phi)',
          'Motors draw reactive current that does not do work but requires wiring capacity',
          'Current lags voltage in inductive loads, leads voltage in capacitive loads',
          'Capacitors can correct power factor by providing leading reactive power',
          'Good power factor reduces costs and frees up electrical system capacity',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#a855f7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0,
            }}>✓</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#c4b5fd', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#a855f7',
          background: 'transparent',
          border: '2px solid #a855f7',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Review Again
      </button>
    </div>
  );

  // Main render
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
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      color: 'white',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        padding: '12px 24px',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Power Factor</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PHASES.map((p, i) => (
              <div
                key={p}
                style={{
                  width: phase === p ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: phase === p ? '#a855f7' : PHASES.indexOf(phase) > i ? '#22c55e' : '#475569',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {renderContent()}
      </div>
    </div>
  );
}
