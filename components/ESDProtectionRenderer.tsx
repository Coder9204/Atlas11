'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ESDProtectionRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  spark: '#fde047',
  diode: '#22c55e',
  circuit: '#60a5fa',
  human: '#f97316',
};

const ESDProtectionRenderer: React.FC<ESDProtectionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Simulation state
  const [esdVoltage, setEsdVoltage] = useState(2000); // Volts
  const [hasProtection, setHasProtection] = useState(true);
  const [dischargePath, setDischargePath] = useState<'chip' | 'diode' | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isDischarging, setIsDischarging] = useState(false);
  const [chipDamage, setChipDamage] = useState(0);
  const [responseTime, setResponseTime] = useState(1); // nanoseconds

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!isDischarging) return;

    const interval = setInterval(() => {
      setAnimationTime(prev => {
        const next = prev + 1;
        if (next > 30) {
          setIsDischarging(false);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isDischarging]);

  const triggerDischarge = useCallback(() => {
    setIsDischarging(true);
    setAnimationTime(0);

    if (hasProtection) {
      setDischargePath('diode');
      // Protection clamps voltage, minimal damage
      setChipDamage(prev => Math.min(prev + 1, 100));
    } else {
      setDischargePath('chip');
      // Direct ESD hit causes significant damage
      const damage = Math.min((esdVoltage / 100), 50);
      setChipDamage(prev => Math.min(prev + damage, 100));
    }
  }, [hasProtection, esdVoltage]);

  const resetSimulation = () => {
    setChipDamage(0);
    setDischargePath(null);
    setAnimationTime(0);
    setIsDischarging(false);
  };

  const predictions = [
    { id: 'nothing', label: 'Nothing - chips are immune to static electricity' },
    { id: 'damage', label: 'The static shock instantly destroys internal circuits' },
    { id: 'protection', label: 'Special protection circuits safely divert the energy' },
    { id: 'reset', label: 'The chip just resets and continues working' },
  ];

  const twistPredictions = [
    { id: 'slow', label: 'ESD protection can be slow since static is rare' },
    { id: 'fast', label: 'ESD circuits must activate in nanoseconds to be effective' },
    { id: 'manual', label: 'Protection requires manual activation by the user' },
    { id: 'always', label: 'Protection circuits are always conducting' },
  ];

  const transferApplications = [
    {
      title: 'USB Port Protection',
      description: 'Every USB port has ESD diodes to handle static from cable insertion. They must protect data lines while allowing high-speed signals.',
      icon: '🔌',
    },
    {
      title: 'Touchscreen Controllers',
      description: 'Your finger touching the screen can discharge thousands of volts. The touch IC has robust ESD protection on every input line.',
      icon: '📱',
    },
    {
      title: 'Automotive ECUs',
      description: 'Car electronics face harsh ESD from door handles, ignition, and dry air. ISO 10605 requires survival of 15kV+ discharges.',
      icon: '🚗',
    },
    {
      title: 'Industrial Sensors',
      description: 'Factory sensors near motors and welding face extreme ESD. Multi-stage protection with TVS diodes and spark gaps is common.',
      icon: '🏭',
    },
  ];

  const testQuestions = [
    {
      question: 'What is ESD (Electrostatic Discharge)?',
      options: [
        { text: 'A slow buildup of electrical charge over time', correct: false },
        { text: 'A sudden flow of electricity between charged objects', correct: true },
        { text: 'A type of battery discharge', correct: false },
        { text: 'Electromagnetic interference', correct: false },
      ],
    },
    {
      question: 'What voltage can a typical human body discharge?',
      options: [
        { text: '10-50 volts', correct: false },
        { text: '100-500 volts', correct: false },
        { text: '2,000-15,000+ volts', correct: true },
        { text: 'Less than 5 volts', correct: false },
      ],
    },
    {
      question: 'What is the Human Body Model (HBM) in ESD testing?',
      options: [
        { text: 'A model of how humans interact with devices', correct: false },
        { text: 'A standardized ESD test simulating human discharge', correct: true },
        { text: 'A thermal model of body temperature effects', correct: false },
        { text: 'A mechanical stress model', correct: false },
      ],
    },
    {
      question: 'How do clamping diodes protect circuits?',
      options: [
        { text: 'They block all current from entering', correct: false },
        { text: 'They provide a low-resistance path to ground when voltage exceeds threshold', correct: true },
        { text: 'They store the ESD energy in a capacitor', correct: false },
        { text: 'They reflect the ESD back to the source', correct: false },
      ],
    },
    {
      question: 'Why must ESD protection circuits respond in nanoseconds?',
      options: [
        { text: 'For user interface responsiveness', correct: false },
        { text: 'ESD events have extremely fast rise times (< 1ns)', correct: true },
        { text: 'To save battery power', correct: false },
        { text: 'To meet USB speed requirements', correct: false },
      ],
    },
    {
      question: 'What is a TVS (Transient Voltage Suppressor) diode?',
      options: [
        { text: 'A standard signal diode', correct: false },
        { text: 'A specialized diode designed to absorb voltage transients', correct: true },
        { text: 'A type of LED', correct: false },
        { text: 'A power supply regulator', correct: false },
      ],
    },
    {
      question: 'Why is ESD protection challenging for high-speed interfaces?',
      options: [
        { text: 'High-speed signals are too fast to protect', correct: false },
        { text: 'Protection capacitance can distort fast signals', correct: true },
        { text: 'High-speed interfaces are immune to ESD', correct: false },
        { text: 'The wires are too thin', correct: false },
      ],
    },
    {
      question: 'What happens to a chip without ESD protection during discharge?',
      options: [
        { text: 'It safely absorbs the energy', correct: false },
        { text: 'Gate oxide breakdown and junction damage can occur', correct: true },
        { text: 'It converts the energy to light', correct: false },
        { text: 'Nothing, modern chips are inherently protected', correct: false },
      ],
    },
    {
      question: 'Where are ESD protection structures typically located on a chip?',
      options: [
        { text: 'In the center of the die', correct: false },
        { text: 'At every I/O pad around the chip perimeter', correct: true },
        { text: 'Only on power pins', correct: false },
        { text: 'In a separate protection chip', correct: false },
      ],
    },
    {
      question: 'What is the typical clamping voltage of on-chip ESD protection?',
      options: [
        { text: 'Equal to the ESD voltage (thousands of volts)', correct: false },
        { text: 'Just above the supply voltage (a few volts)', correct: true },
        { text: 'Zero volts', correct: false },
        { text: 'Negative voltage', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (showTiming: boolean = false) => {
    const width = 400;
    const height = 280;

    // Spark animation
    const sparkIntensity = isDischarging ? Math.max(0, 1 - animationTime / 15) : 0;

    // Clamping voltage calculation (for display)
    const clampingVoltage = hasProtection ? 5.5 : esdVoltage;
    const clampingEfficiency = hasProtection ? ((esdVoltage - clampingVoltage) / esdVoltage * 100).toFixed(0) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #030712 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* === PREMIUM GRADIENTS === */}

            {/* ESD Spark gradient - electric yellow to orange */}
            <linearGradient id="esdSparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="75%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            {/* Human skin gradient */}
            <radialGradient id="esdHumanGrad" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="30%" stopColor="#fb923c" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </radialGradient>

            {/* Diode gradient - green semiconductor */}
            <linearGradient id="esdDiodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="25%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="75%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Diode active glow gradient */}
            <radialGradient id="esdDiodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Circuit trace gradient - metallic blue */}
            <linearGradient id="esdCircuitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Chip silicon gradient */}
            <linearGradient id="esdChipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#4f46e5" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#4338ca" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3730a3" stopOpacity="0.4" />
            </linearGradient>

            {/* Chip border gradient */}
            <linearGradient id="esdChipBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>

            {/* VDD power rail gradient - red */}
            <linearGradient id="esdVddGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* GND power rail gradient - dark gray */}
            <linearGradient id="esdGndGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Damage overlay gradient */}
            <radialGradient id="esdDamageGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.2" />
            </radialGradient>

            {/* Current flow particle gradient */}
            <radialGradient id="esdCurrentGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="40%" stopColor="#fde047" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#facc15" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* Card background gradient */}
            <linearGradient id="esdCardBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </linearGradient>

            {/* === GLOW FILTERS === */}

            {/* Spark glow filter - intense */}
            <filter id="esdSparkGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Diode glow filter */}
            <filter id="esdDiodeGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Chip glow filter */}
            <filter id="esdChipGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current flow glow */}
            <filter id="esdCurrentGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Damage pulse filter */}
            <filter id="esdDamageGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="esdGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={width} height={height} fill="url(#esdGridPattern)" />

          {/* Human finger/hand with premium gradient */}
          <g transform="translate(35, 55)">
            {/* Finger shadow */}
            <ellipse cx="32" cy="42" rx="22" ry="38" fill="#000" opacity="0.3" />
            {/* Finger body */}
            <ellipse cx="30" cy="40" rx="20" ry="35" fill="url(#esdHumanGrad)" />
            {/* Finger highlight */}
            <ellipse cx="25" cy="30" rx="8" ry="15" fill="#fdba74" opacity="0.5" />
            {/* Fingernail hint */}
            <ellipse cx="30" cy="12" rx="10" ry="8" fill="#fef3c7" opacity="0.3" />
          </g>

          {/* ESD discharge path - lightning bolt */}
          {sparkIntensity > 0 && (
            <g filter="url(#esdSparkGlow)">
              {/* Main lightning bolt path */}
              <path
                d={`M 85 95 L 110 88 L 100 100 L 130 92 L 118 105 L 150 95 L 138 110 L ${hasProtection ? '175 130' : '200 155'}`}
                fill="none"
                stroke="url(#esdSparkGrad)"
                strokeWidth={3 + sparkIntensity * 5}
                opacity={sparkIntensity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Secondary branch */}
              <path
                d={`M 130 92 L 145 105 L 135 112`}
                fill="none"
                stroke="url(#esdSparkGrad)"
                strokeWidth={2 + sparkIntensity * 2}
                opacity={sparkIntensity * 0.7}
                strokeLinecap="round"
              />
              {/* Spark particles */}
              {Array.from({ length: 12 }, (_, i) => {
                const t = (animationTime + i * 2.5) % 20;
                const baseX = 85 + t * 5;
                const baseY = 95 + Math.sin(t * 0.5 + i) * 15;
                const size = 2 + Math.sin(animationTime * 0.3 + i) * 1.5;
                return (
                  <circle
                    key={i}
                    cx={baseX + Math.sin(i * 1.2) * 12}
                    cy={baseY + Math.cos(i * 0.8 + t) * 10}
                    r={size}
                    fill="url(#esdCurrentGrad)"
                    opacity={sparkIntensity * (0.5 + Math.sin(i) * 0.3)}
                    filter="url(#esdCurrentGlow)"
                  />
                );
              })}
            </g>
          )}

          {/* I/O Pin with gradient */}
          <g>
            <rect x="165" y="115" width="50" height="12" rx="2" fill="url(#esdCircuitGrad)" />
            {/* Pin highlight */}
            <rect x="165" y="115" width="50" height="4" rx="1" fill="#93c5fd" opacity="0.4" />
          </g>

          {/* ESD Protection diodes (if enabled) */}
          {hasProtection && (
            <g>
              {/* VDD Rail */}
              <line x1="165" y1="70" x2="235" y2="70" stroke="url(#esdVddGrad)" strokeWidth="3" strokeLinecap="round" />

              {/* Upper diode to VDD */}
              <g filter={isDischarging && dischargePath === 'diode' ? "url(#esdDiodeGlowFilter)" : undefined}>
                {/* Diode body */}
                <polygon points="190,108 205,85 175,85" fill="url(#esdDiodeGrad)" />
                {/* Diode cathode bar */}
                <rect x="173" y="83" width="34" height="4" rx="1" fill="url(#esdDiodeGrad)" />
                {/* Connection to VDD */}
                <line x1="190" y1="83" x2="190" y2="70" stroke="url(#esdDiodeGrad)" strokeWidth="3" strokeLinecap="round" />
                {/* Active glow when discharging */}
                {isDischarging && dischargePath === 'diode' && (
                  <ellipse cx="190" cy="95" rx="20" ry="15" fill="url(#esdDiodeGlow)" opacity={0.5 + Math.sin(animationTime * 0.5) * 0.3} />
                )}
              </g>

              {/* Lower diode to GND */}
              <g filter={isDischarging && dischargePath === 'diode' ? "url(#esdDiodeGlowFilter)" : undefined}>
                {/* Diode body (inverted) */}
                <polygon points="190,140 175,163 205,163" fill="url(#esdDiodeGrad)" />
                {/* Diode anode bar */}
                <rect x="173" y="161" width="34" height="4" rx="1" fill="url(#esdDiodeGrad)" />
                {/* Connection to GND */}
                <line x1="190" y1="165" x2="190" y2="182" stroke="url(#esdDiodeGrad)" strokeWidth="3" strokeLinecap="round" />
                {/* Active glow when discharging */}
                {isDischarging && dischargePath === 'diode' && (
                  <ellipse cx="190" cy="153" rx="20" ry="15" fill="url(#esdDiodeGlow)" opacity={0.5 + Math.sin(animationTime * 0.5 + 1) * 0.3} />
                )}
              </g>

              {/* GND Rail */}
              <line x1="165" y1="182" x2="235" y2="182" stroke="url(#esdGndGrad)" strokeWidth="3" strokeLinecap="round" />
              {/* GND symbol */}
              <g transform="translate(190, 188)">
                <line x1="-15" y1="0" x2="15" y2="0" stroke="url(#esdGndGrad)" strokeWidth="3" />
                <line x1="-10" y1="5" x2="10" y2="5" stroke="url(#esdGndGrad)" strokeWidth="2" />
                <line x1="-5" y1="10" x2="5" y2="10" stroke="url(#esdGndGrad)" strokeWidth="1.5" />
              </g>

              {/* Clamping voltage indicator */}
              {isDischarging && dischargePath === 'diode' && (
                <g transform="translate(140, 120)">
                  <rect x="-25" y="-12" width="50" height="24" rx="4" fill="url(#esdCardBgGrad)" stroke="#22c55e" strokeWidth="1" opacity="0.9" />
                </g>
              )}

              {/* Current flow animation particles */}
              {isDischarging && dischargePath === 'diode' && (
                <g filter="url(#esdCurrentGlow)">
                  {/* Upper path current */}
                  {[0, 1, 2].map((i) => {
                    const progress = ((animationTime * 3 + i * 10) % 30) / 30;
                    const y = 108 - progress * 38;
                    return (
                      <circle
                        key={`up-${i}`}
                        cx={190}
                        cy={y}
                        r={4}
                        fill="url(#esdCurrentGrad)"
                        opacity={0.9 - progress * 0.3}
                      />
                    );
                  })}
                  {/* Lower path current */}
                  {[0, 1, 2].map((i) => {
                    const progress = ((animationTime * 3 + i * 10) % 30) / 30;
                    const y = 140 + progress * 42;
                    return (
                      <circle
                        key={`down-${i}`}
                        cx={190}
                        cy={y}
                        r={4}
                        fill="url(#esdCurrentGrad)"
                        opacity={0.9 - progress * 0.3}
                      />
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* Wire from pin to chip */}
          <line x1="215" y1="121" x2="245" y2="130" stroke="url(#esdCircuitGrad)" strokeWidth="2" strokeLinecap="round" />

          {/* Internal chip circuitry with premium styling */}
          <g filter="url(#esdChipGlow)">
            {/* Chip body */}
            <rect x="245" y="95" width="110" height="85" rx="6" fill="url(#esdChipGrad)" stroke="url(#esdChipBorderGrad)" strokeWidth="2" />
            {/* Chip internal pattern */}
            <g opacity="0.3">
              <rect x="255" y="105" width="30" height="20" rx="2" fill="#6366f1" />
              <rect x="290" y="105" width="25" height="20" rx="2" fill="#6366f1" />
              <rect x="320" y="105" width="25" height="20" rx="2" fill="#6366f1" />
              <rect x="255" y="130" width="40" height="15" rx="2" fill="#6366f1" />
              <rect x="300" y="130" width="45" height="15" rx="2" fill="#6366f1" />
              <rect x="255" y="150" width="90" height="20" rx="2" fill="#6366f1" />
            </g>
            {/* Chip pins (left side) */}
            {[105, 120, 135, 150, 165].map((y) => (
              <rect key={y} x="238" y={y} width="10" height="4" rx="1" fill="url(#esdCircuitGrad)" />
            ))}
            {/* Chip pins (right side) */}
            {[105, 120, 135, 150, 165].map((y) => (
              <rect key={y} x="352" y={y} width="10" height="4" rx="1" fill="url(#esdCircuitGrad)" />
            ))}
          </g>

          {/* Damage indicator overlay */}
          {chipDamage > 0 && (
            <g filter={chipDamage > 50 ? "url(#esdDamageGlow)" : undefined}>
              <rect
                x="245"
                y="95"
                width="110"
                height="85"
                rx="6"
                fill="url(#esdDamageGrad)"
                opacity={chipDamage / 150}
              />
              {/* Damage cracks when severely damaged */}
              {chipDamage > 60 && (
                <g stroke="#ef4444" strokeWidth="1.5" opacity={0.7}>
                  <path d="M 260 100 L 275 120 L 265 135 L 280 155" fill="none" />
                  <path d="M 330 100 L 315 125 L 325 145 L 310 170" fill="none" />
                </g>
              )}
            </g>
          )}

          {/* Direct ESD hit animation (when no protection) */}
          {isDischarging && dischargePath === 'chip' && (
            <g filter="url(#esdSparkGlow)">
              {/* Impact flash */}
              <ellipse
                cx="265"
                cy="138"
                rx={15 + animationTime}
                ry={10 + animationTime * 0.7}
                fill="url(#esdSparkGrad)"
                opacity={sparkIntensity * 0.8}
              />
              {/* Scattered damage particles */}
              {Array.from({ length: 8 }, (_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const dist = 10 + animationTime * 2;
                return (
                  <circle
                    key={i}
                    cx={265 + Math.cos(angle) * dist}
                    cy={138 + Math.sin(angle) * dist * 0.6}
                    r={3}
                    fill="#ef4444"
                    opacity={sparkIntensity * 0.6}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Labels and status indicators outside SVG */}
        <div style={{
          display: 'flex',
          gap: typo.elementGap,
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '500px'
        }}>
          {/* Human label */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: typo.cardPadding,
            minWidth: isMobile ? '80px' : '90px',
            flex: '1'
          }}>
            <span style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Human Touch</span>
            <span style={{ color: colors.human, fontSize: typo.body, fontWeight: 'bold' }}>{esdVoltage}V</span>
          </div>

          {/* Protection status */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: colors.bgCard,
            borderRadius: '8px',
            padding: typo.cardPadding,
            minWidth: isMobile ? '80px' : '90px',
            flex: '1',
            borderLeft: `3px solid ${hasProtection ? colors.success : colors.error}`
          }}>
            <span style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Protection</span>
            <span style={{
              color: hasProtection ? colors.success : colors.error,
              fontSize: typo.body,
              fontWeight: 'bold'
            }}>
              {hasProtection ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>

          {/* Clamping voltage (when protection enabled) */}
          {hasProtection && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: colors.bgCard,
              borderRadius: '8px',
              padding: typo.cardPadding,
              minWidth: isMobile ? '80px' : '90px',
              flex: '1',
              borderLeft: `3px solid ${colors.diode}`
            }}>
              <span style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Clamped To</span>
              <span style={{ color: colors.diode, fontSize: typo.body, fontWeight: 'bold' }}>{clampingVoltage}V</span>
              <span style={{ color: colors.textMuted, fontSize: typo.label }}>{clampingEfficiency}% blocked</span>
            </div>
          )}

          {/* Response time (for twist phase) */}
          {showTiming && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: colors.bgCard,
              borderRadius: '8px',
              padding: typo.cardPadding,
              minWidth: isMobile ? '80px' : '90px',
              flex: '1',
              borderLeft: `3px solid ${colors.warning}`
            }}>
              <span style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Response</span>
              <span style={{ color: colors.warning, fontSize: typo.body, fontWeight: 'bold' }}>{responseTime}ns</span>
            </div>
          )}

          {/* Chip damage */}
          {chipDamage > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: colors.bgCard,
              borderRadius: '8px',
              padding: typo.cardPadding,
              minWidth: isMobile ? '80px' : '90px',
              flex: '1',
              borderLeft: `3px solid ${colors.error}`
            }}>
              <span style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>Chip Damage</span>
              <span style={{ color: colors.error, fontSize: typo.body, fontWeight: 'bold' }}>{chipDamage.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(51, 65, 85, 0.8)',
    color: colors.textPrimary,
    border: `1px solid ${colors.accent}`,
  };

  const renderHook = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
      <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
        How Does a Chip Survive a Static Shock?
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
        You can build up 15,000 volts just walking across carpet. Yet your phone survives your touch every time. How?
      </p>
      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Invisible Shield</h3>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Every chip has protection circuits that can absorb thousands of volts in nanoseconds. Without them, static electricity would destroy electronics instantly.
        </p>
      </div>
      {renderVisualization()}
      <button
        onClick={() => onPhaseComplete?.()}
        style={primaryButtonStyle}
      >
        Explore ESD Protection
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Make Your Prediction
      </h2>
      <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          When you touch a chip's I/O pin with 2,000+ volts of static charge, what happens?
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {predictions.map((p) => (
          <button
            key={p.id}
            onClick={() => setPrediction(p.id)}
            style={{
              ...secondaryButtonStyle,
              background: prediction === p.id
                ? (p.id === 'protection' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: prediction === p.id ? (p.id === 'protection' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {prediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'protection' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: prediction === 'protection' ? colors.success : colors.warning }}>
            {prediction === 'protection'
              ? 'Correct! ESD protection diodes clamp the voltage and divert current safely to ground or power rails.'
              : 'Not quite. Without protection, ESD would cause damage - but modern chips have built-in protection circuits at every pin.'}
          </p>
        </div>
      )}
      {prediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          See It In Action
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        ESD Discharge Simulator
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        Toggle protection and trigger ESD events to see the difference
      </p>

      {renderVisualization()}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          ESD Voltage: {esdVoltage}V
        </label>
        <input
          type="range"
          min="500"
          max="15000"
          step="500"
          value={esdVoltage}
          onChange={(e) => setEsdVoltage(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setHasProtection(!hasProtection)}
          style={{
            ...secondaryButtonStyle,
            flex: 1,
            background: hasProtection ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            borderColor: hasProtection ? colors.success : colors.error,
          }}
        >
          Protection: {hasProtection ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={triggerDischarge}
          disabled={isDischarging}
          style={{
            ...primaryButtonStyle,
            flex: 1,
            opacity: isDischarging ? 0.5 : 1,
          }}
        >
          {isDischarging ? 'Discharging...' : 'Trigger ESD'}
        </button>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={resetSimulation} style={secondaryButtonStyle}>
          Reset Damage
        </button>
      </div>

      <div style={{ marginTop: '20px', background: colors.bgCard, borderRadius: '8px', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: colors.textMuted }}>Chip Health:</span>
          <span style={{ color: chipDamage > 50 ? colors.error : chipDamage > 20 ? colors.warning : colors.success, fontWeight: 'bold' }}>
            {(100 - chipDamage).toFixed(0)}%
          </span>
        </div>
        <div style={{ marginTop: '8px', height: '8px', background: '#1f2937', borderRadius: '4px' }}>
          <div
            style={{
              height: '100%',
              width: `${100 - chipDamage}%`,
              background: chipDamage > 50 ? colors.error : chipDamage > 20 ? colors.warning : colors.success,
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {chipDamage > 80 && (
        <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ color: colors.error, margin: 0 }}>
            Critical damage! Without ESD protection, the chip would be destroyed.
          </p>
        </div>
      )}

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
      >
        Continue to Review
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Understanding ESD Protection
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Human Body Model (HBM)</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          2kV - 15kV+
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
          Typical static discharge from human touch
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { icon: '🛡️', title: 'Clamping Diodes', desc: 'Pairs of diodes to VDD and GND create a voltage clamp window' },
          { icon: '⚡', title: 'Fast Response', desc: 'Protection must activate in nanoseconds before damage occurs' },
          { icon: '📍', title: 'Every Pin', desc: 'Protection structures exist at every I/O pad on the chip' },
          { icon: '🔄', title: 'Energy Routing', desc: 'ESD current is safely routed through power rails, not circuits' },
        ].map((item, i) => (
          <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '24px' }}>{item.icon}</div>
            <div>
              <h3 style={{ color: colors.textPrimary, margin: '0 0 4px' }}>{item.title}</h3>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        Discover the Speed Challenge
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
        The Speed Twist
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
        How fast must ESD protection respond?
      </p>

      <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          An ESD event rises from 0V to thousands of volts in under a nanosecond. What does this mean for protection circuits?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {twistPredictions.map((p) => (
          <button
            key={p.id}
            onClick={() => setTwistPrediction(p.id)}
            style={{
              ...secondaryButtonStyle,
              background: twistPrediction === p.id
                ? (p.id === 'fast' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: twistPrediction === p.id ? (p.id === 'fast' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'fast' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: twistPrediction === 'fast' ? colors.success : colors.warning }}>
            {twistPrediction === 'fast'
              ? 'Correct! ESD rises in < 1ns, so protection must respond faster than that or the voltage spike reaches internal circuits first.'
              : 'ESD events are incredibly fast - protection circuits must be even faster, responding in sub-nanosecond timescales.'}
          </p>
        </div>
      )}

      {twistPrediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          Explore Response Time
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Response Time Explorer
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        ESD protection must balance speed and signal integrity
      </p>

      {renderVisualization(true)}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Response Time: {responseTime}ns
        </label>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={responseTime}
          onChange={(e) => setResponseTime(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>ESD Rise Time</div>
          <div style={{ color: colors.spark, fontSize: '20px', fontWeight: 'bold' }}>0.7ns</div>
          <div style={{ color: colors.textMuted, fontSize: '10px' }}>Typical HBM</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Protection Status</div>
          <div style={{ color: responseTime < 1 ? colors.success : colors.error, fontSize: '14px', fontWeight: 'bold' }}>
            {responseTime < 1 ? 'PROTECTED' : 'TOO SLOW'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px' }}>
        <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: 0 }}>
          <strong style={{ color: colors.warning }}>Trade-off:</strong> Faster protection requires larger structures with more capacitance, which can affect high-speed signal integrity.
        </p>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        Continue
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        The ESD Design Challenge
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          Fast Enough, But Not Too Big
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
          ESD structures add capacitance that can slow down signals
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🐇</div>
          <div style={{ color: colors.success, fontWeight: 'bold' }}>Fast Response</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Big diodes, high capacitance</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📶</div>
          <div style={{ color: colors.circuit, fontWeight: 'bold' }}>Signal Quality</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Small diodes, low capacitance</div>
        </div>
      </div>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Design Solutions</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
          <li>Multi-stage protection: fast primary + robust secondary</li>
          <li>Silicon-controlled rectifiers (SCRs) for high current capability</li>
          <li>Low-capacitance TVS diodes for high-speed interfaces</li>
          <li>Careful layout to minimize parasitic inductance</li>
        </ul>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Real-World Applications
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
        Explore all 4 applications to continue
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {transferApplications.map((app, i) => (
          <div
            key={i}
            onClick={() => setTransferCompleted(prev => new Set([...prev, i]))}
            style={{
              background: transferCompleted.has(i) ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '2px solid transparent',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>{app.icon}</div>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', textAlign: 'center', margin: '0 0 8px' }}>
              {app.title}
            </h3>
            <p style={{ color: colors.textMuted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
              {app.description}
            </p>
            {transferCompleted.has(i) && (
              <div style={{ color: colors.success, textAlign: 'center', marginTop: '8px', fontSize: '12px' }}>
                Explored
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>
          Progress: {transferCompleted.size}/4 applications
        </p>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        disabled={transferCompleted.size < 4}
        style={{
          ...primaryButtonStyle,
          marginTop: '20px',
          width: '100%',
          opacity: transferCompleted.size < 4 ? 0.5 : 1,
          cursor: transferCompleted.size < 4 ? 'not-allowed' : 'pointer',
        }}
      >
        {transferCompleted.size < 4 ? `Explore ${4 - transferCompleted.size} more` : 'Take the Test'}
      </button>
    </div>
  );

  const renderTest = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Knowledge Check
      </h2>

      {!testSubmitted ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            {testQuestions.map((q, qIndex) => (
              <div key={qIndex} style={{ marginBottom: '24px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '12px' }}>
                  {qIndex + 1}. {q.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => handleTestAnswer(qIndex, oIndex)}
                      style={{
                        ...secondaryButtonStyle,
                        background: testAnswers[qIndex] === oIndex ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                        borderColor: testAnswers[qIndex] === oIndex ? colors.accent : 'transparent',
                        textAlign: 'left',
                        fontSize: '14px',
                        padding: '10px 16px',
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
            onClick={submitTest}
            disabled={testAnswers.includes(null)}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              opacity: testAnswers.includes(null) ? 0.5 : 1,
              cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
            }}
          >
            Submit Answers
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {testScore >= 7 ? '🎉' : '📚'}
          </div>
          <h3 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '8px' }}>
            Score: {testScore}/10
          </h3>
          <p style={{ color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '24px' }}>
            {testScore >= 7 ? 'Excellent! You understand ESD protection!' : 'Review the concepts and try again.'}
          </p>

          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            {testQuestions.map((q, i) => (
              <div key={i} style={{
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: testAnswers[i] !== null && q.options[testAnswers[i]!].correct
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)'
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', margin: '0 0 4px' }}>
                  {i + 1}. {q.question}
                </p>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                  Correct: {q.options.find(o => o.correct)?.text}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => onPhaseComplete?.()}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {testScore >= 7 ? 'Complete!' : 'Continue Anyway'}
          </button>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
      <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
        ESD Protection Master!
      </h1>
      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        You now understand how chips survive the invisible threat of static electricity.
      </p>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
        <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>ESD can reach 2,000-15,000+ volts from human touch</li>
          <li style={{ marginBottom: '8px' }}>Clamping diodes route current safely to power rails</li>
          <li style={{ marginBottom: '8px' }}>Protection must respond in sub-nanosecond timescales</li>
          <li style={{ marginBottom: '8px' }}>Every I/O pin has dedicated protection structures</li>
          <li>Design trade-off: protection strength vs. signal speed</li>
        </ul>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
          Score: {testScore}/10
        </p>
      </div>
    </div>
  );

  const realWorldApps = [
    {
      icon: '🏭',
      title: 'Electronics Manufacturing',
      short: 'Assembly Lines',
      tagline: 'Protecting components from human touch on the production floor',
      description: 'Electronics manufacturing facilities handle millions of sensitive components daily, from microprocessors to memory chips. A single uncontrolled ESD event during assembly can destroy expensive ICs, cause latent defects that fail in the field, or result in costly product recalls. ESD protection is a critical quality control measure that spans the entire production process.',
      connection: 'The same ESD protection principles we explored apply here at industrial scale. Workers become walking capacitors charged to thousands of volts, and every component touch is a potential discharge event. Grounding systems, ionizers, and protective packaging all work together to prevent the voltage spikes that would overwhelm on-chip protection.',
      howItWorks: 'Manufacturing floors use a multi-layered ESD control strategy. Workers wear grounded wrist straps and heel straps connected to the facility ground. ESD-safe flooring and workstation mats provide continuous paths to ground. Ionizers neutralize charge on ungrounded items. Components travel in conductive or static-dissipative packaging. Humidity control above 40% RH reduces charge generation. Real-time monitoring systems alert operators to grounding failures.',
      stats: [
        { value: '$5B+', label: 'Annual ESD Damage' },
        { value: '<100V', label: 'Damage Threshold for Some ICs' },
        { value: '99.9%', label: 'Required Yield Target' }
      ],
      examples: [
        'PCB assembly lines with grounded conveyor systems and ionizing bars',
        'Semiconductor packaging facilities with full-body grounding suits',
        'Smartphone assembly where workers handle exposed flex circuits',
        'Automotive ECU production requiring zero-defect quality standards'
      ],
      companies: [
        'Foxconn',
        'Jabil',
        'Flex Ltd',
        'Celestica',
        'Sanmina'
      ],
      futureImpact: 'As components shrink to 3nm and below, ESD sensitivity increases dramatically. Future factories will use AI-powered monitoring systems, automated handling robots to minimize human contact, and novel materials with self-dissipating properties to maintain yield as device vulnerability grows.',
      color: '#F59E0B'
    },
    {
      icon: '💾',
      title: 'Semiconductor Fabs',
      short: 'Chip Production',
      tagline: 'Ultra-clean environments where a single spark means disaster',
      description: 'Semiconductor fabrication facilities represent the most extreme ESD-sensitive environments on Earth. Here, transistors with gate oxides only a few atoms thick are manufactured on wafers worth millions of dollars. A single ESD event can destroy thousands of chips in an instant or create invisible defects that cause failures months later in customer devices.',
      connection: 'The on-chip ESD protection structures we simulated are actually built during fab processing, but during manufacturing, those structures dont exist yet. Bare wafers and in-process chips have no protection whatsoever, making them vulnerable to even tiny static charges that would be harmless to finished products.',
      howItWorks: 'Fabs implement the most stringent ESD protocols in any industry. Cleanroom suits include conductive fibers woven throughout. All wafer handling equipment is grounded and ionized. FOUP (Front Opening Unified Pod) carriers are made from static-dissipative materials. Process tools have built-in charge neutralization. Gate oxide integrity testing catches ESD damage early. Even the air handling systems use ionization to neutralize airborne particles.',
      stats: [
        { value: '<10V', label: 'Gate Oxide Breakdown' },
        { value: '$100M+', label: 'Cost Per Wafer Lot' },
        { value: '1000+', label: 'ESD Monitors Per Fab' }
      ],
      examples: [
        'Wafer probing stations with grounded chuck and ionized enclosures',
        'Photolithography tools where charge can attract killer particles',
        'Ion implantation systems with inherent charging from the beam',
        'Wafer transport robots with continuous ground monitoring'
      ],
      companies: [
        'TSMC',
        'Samsung Foundry',
        'Intel',
        'GlobalFoundries',
        'ASML'
      ],
      futureImpact: 'As EUV lithography and 2nm nodes become standard, new materials like high-k dielectrics and nanosheets increase ESD vulnerability. Fabs are developing real-time charge sensing at the wafer level and exploring plasma-based neutralization to protect these incredibly delicate structures.',
      color: '#6366F1'
    },
    {
      icon: '🖥️',
      title: 'Data Centers',
      short: 'Server Protection',
      tagline: 'Keeping the cloud running through industrial-scale ESD management',
      description: 'Data centers house millions of servers processing the worlds digital information. Technicians frequently access equipment for maintenance, upgrades, and repairs in environments where low humidity, raised floors, and constant movement create ideal conditions for static charge buildup. ESD damage to a single server can cause data loss, service outages, and cascade failures.',
      connection: 'Every server contains the same types of chips we explored with ESD protection diodes. But data center scale means thousands of potential discharge events daily. The protection philosophy shifts from protecting individual chips to creating ESD-safe zones where equipment can be safely serviced without risk.',
      howItWorks: 'Data centers implement zoned ESD protection. Hot aisles and cold aisles use static-dissipative flooring. Technicians must ground themselves at entry points using wrist straps or floor mats. Server rails and rack frames are bonded to facility ground. Humidity is maintained above 45% where possible. Hot-swappable components like drives and memory have gold-plated contacts that resist ESD damage. All packaging and transport containers are ESD-safe.',
      stats: [
        { value: '99.999%', label: 'Uptime Requirement' },
        { value: '$9K/min', label: 'Outage Cost (Large DCs)' },
        { value: '10K+', label: 'Service Events/Year' }
      ],
      examples: [
        'Hot-swap drive replacement in running storage arrays',
        'Memory DIMM upgrades requiring direct PCB contact',
        'Network card installation in high-availability clusters',
        'GPU replacement in AI training server racks'
      ],
      companies: [
        'Google Cloud',
        'Amazon AWS',
        'Microsoft Azure',
        'Meta',
        'Equinix'
      ],
      futureImpact: 'Liquid cooling and immersion cooling reduce static from airflow but introduce new grounding challenges. Robotic maintenance systems will minimize human-equipment contact. AI diagnostics will detect ESD-induced latent failures before they cause outages.',
      color: '#10B981'
    },
    {
      icon: '✈️',
      title: 'Aerospace and Aviation',
      short: 'Aircraft Electronics',
      tagline: 'Mission-critical systems that must survive lightning and cosmic rays',
      description: 'Aircraft electronics face the most demanding ESD environment imaginable. At altitude, low humidity and dry air maximize static generation. Composite airframes dont conduct charge like metal ones. And the ultimate ESD event, a lightning strike delivering 200,000+ amps, occurs regularly. Every avionic system must survive these threats while maintaining safety-critical operation.',
      connection: 'The ESD protection concepts scale up dramatically for aerospace. While we explored protecting chips from human-body discharge of a few thousand volts, aircraft systems must handle direct lightning attachment, P-static (precipitation static) from ice and rain, and charge accumulation from engine exhaust. Multi-stage protection with massive current-handling capability is essential.',
      howItWorks: 'Aircraft use layered ESD protection starting with the airframe. Lightning strike zones are designed with conductive pathways to route current safely around the fuselage. Internal bonding networks connect all equipment to a common ground plane. Avionic boxes have external TVS diodes and spark gaps rated for lightning-induced transients. Internal circuits use the same on-chip ESD structures we explored, but with higher robustness ratings. Fiber optic connections eliminate some ESD paths entirely.',
      stats: [
        { value: '200kA', label: 'Lightning Current Peak' },
        { value: '1-2/yr', label: 'Strikes Per Aircraft' },
        { value: 'DO-160G', label: 'Aviation ESD Standard' }
      ],
      examples: [
        'Flight computers with MIL-spec ESD protection on all interfaces',
        'Fuel system electronics that must never create ignition sources',
        'Composite radomes with embedded lightning diverter strips',
        'Satellite avionics hardened against space charging and cosmic rays'
      ],
      companies: [
        'Boeing',
        'Airbus',
        'Lockheed Martin',
        'Honeywell Aerospace',
        'Collins Aerospace'
      ],
      futureImpact: 'More-electric aircraft with higher power systems create new ESD challenges. Carbon nanotube composites may provide better charge dissipation than current materials. Solid-state power distribution will require revolutionary protection approaches for the all-electric aviation future.',
      color: '#3B82F6'
    }
  ];

  const renderPhase = () => {
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
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 100%)`,
      color: colors.textPrimary,
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default ESDProtectionRenderer;
