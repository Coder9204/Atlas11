'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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

const phaseOrder: Phase[] = [
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

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// ────────────────────────────────────────────────────────────────────────────
// SOUND UTILITY
// ────────────────────────────────────────────────────────────────────────────

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' },
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ────────────────────────────────────────────────────────────────────────────

const colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#334155',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  border: '#475569',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#fbbf24',
  solarGlow: 'rgba(251, 191, 36, 0.3)',
  shaded: '#475569',
  hotspot: '#dc2626',
  bypass: '#22c55e',
  current: '#3b82f6',
  power: '#a855f7',
  optimizer: '#06b6d4',
};

interface BypassDiodesRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const BypassDiodesRenderer: React.FC<BypassDiodesRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL PHASE STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Responsive design
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
    bodyNormal: { fontWeight: 400 as const },
    bodyMedium: { fontWeight: 500 as const },
  };

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;

    setPhase(p);
    playSound('transition');

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 300);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // ──────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR COMPONENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
      }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            width: '44px',
            height: '44px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          ←
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: i < currentIdx
                  ? colors.success
                  : i === currentIdx
                    ? colors.primary
                    : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                opacity: i > currentIdx ? 0.5 : 1,
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        {/* Phase label and count */}
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: colors.primary,
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: `${colors.primary}15`,
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION BAR
  // ──────────────────────────────────────────────────────────────────────────

  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textSecondary,
          fontWeight: 600,
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!canGoNext) return;
            if (onNext) {
              onNext();
            } else {
              goNext();
            }
          }}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext
              ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`
              : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textSecondary,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            minHeight: '44px',
            transition: 'all 0.2s ease',
          }}
        >
          {nextLabel} →
        </button>
      </div>
    );
  };

  // Simulation state
  const [shadedCells, setShadedCells] = useState<Set<number>>(new Set());
  const [bypassEnabled, setBypassEnabled] = useState(true);
  const [showCurrentFlow, setShowCurrentFlow] = useState(true);
  const [hasOptimizers, setHasOptimizers] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [hasTwistExperimented, setHasTwistExperimented] = useState(false);

  // Panel specifications
  const CELLS_PER_STRING = 6;
  const CELL_VOLTAGE = 0.6;
  const CELL_CURRENT = 10;
  const STRINGS = 3;

  // Physics calculations
  const calculatePanelOutput = useCallback(() => {
    const numShadedCells = shadedCells.size;

    if (!bypassEnabled && !hasOptimizers) {
      if (numShadedCells > 0) {
        const limitedCurrent = CELL_CURRENT * 0.1;
        const totalVoltage = CELLS_PER_STRING * STRINGS * CELL_VOLTAGE;
        const power = totalVoltage * limitedCurrent;
        const reverseVoltage = (CELLS_PER_STRING - 1) * CELL_VOLTAGE;

        return {
          current: limitedCurrent,
          voltage: totalVoltage,
          power,
          efficiency: (power / (CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT)) * 100,
          hotSpotRisk: true,
          reverseVoltage,
          activeBypass: false,
          bypassedStrings: 0,
        };
      }
    }

    if (bypassEnabled && !hasOptimizers) {
      const string1Shaded = shadedCells.has(0) || shadedCells.has(1);
      const string2Shaded = shadedCells.has(2) || shadedCells.has(3);
      const string3Shaded = shadedCells.has(4) || shadedCells.has(5);

      let activeStrings = 3;
      if (string1Shaded) activeStrings--;
      if (string2Shaded) activeStrings--;
      if (string3Shaded) activeStrings--;

      const bypassedStrings = 3 - activeStrings;
      const current = CELL_CURRENT;
      const voltage = activeStrings * 2 * CELL_VOLTAGE - (bypassedStrings > 0 ? 0.7 * bypassedStrings : 0);
      const power = Math.max(0, voltage * current);

      return {
        current,
        voltage: Math.max(0, voltage),
        power,
        efficiency: (power / (CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT)) * 100,
        hotSpotRisk: false,
        reverseVoltage: 0,
        activeBypass: bypassedStrings > 0,
        bypassedStrings,
      };
    }

    if (hasOptimizers) {
      const activeCells = CELLS_PER_STRING - numShadedCells;
      const shadedCellPower = numShadedCells * (CELL_VOLTAGE * CELL_CURRENT * 0.1);
      const activeCellPower = activeCells * (CELL_VOLTAGE * CELL_CURRENT);
      const totalPower = (activeCellPower + shadedCellPower) * STRINGS;

      return {
        current: CELL_CURRENT,
        voltage: STRINGS * CELLS_PER_STRING * CELL_VOLTAGE,
        power: totalPower,
        efficiency: (totalPower / (CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT)) * 100,
        hotSpotRisk: false,
        reverseVoltage: 0,
        activeBypass: false,
        bypassedStrings: 0,
      };
    }

    const fullPower = CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT;
    return {
      current: CELL_CURRENT,
      voltage: CELLS_PER_STRING * STRINGS * CELL_VOLTAGE,
      power: fullPower,
      efficiency: 100,
      hotSpotRisk: false,
      reverseVoltage: 0,
      activeBypass: false,
      bypassedStrings: 0,
    };
  }, [shadedCells, bypassEnabled, hasOptimizers]);

  const values = calculatePanelOutput();

  const toggleCellShade = (cellIndex: number) => {
    const newShaded = new Set(shadedCells);
    if (newShaded.has(cellIndex)) {
      newShaded.delete(cellIndex);
    } else {
      newShaded.add(cellIndex);
    }
    setShadedCells(newShaded);
    if (phase === 'play') setHasExperimented(true);
    if (phase === 'twist_play') setHasTwistExperimented(true);
  };

  const predictions = [
    { id: 'proportional', label: 'Power drops proportionally to shaded area (1/6 shade = 1/6 power loss)' },
    { id: 'worse', label: 'Power drops MORE than proportionally - shade on one cell affects the whole panel' },
    { id: 'better', label: 'Power drops LESS than proportionally - other cells compensate' },
    { id: 'no_effect', label: 'Shading one cell has no effect on total power' },
  ];

  const twistPredictions = [
    { id: 'optimizers_help', label: 'Microinverters/optimizers make each cell independent, solving the problem' },
    { id: 'bypass_enough', label: 'Bypass diodes completely solve the shading problem' },
    { id: 'nothing_helps', label: 'No technology can overcome the series connection limitation' },
    { id: 'parallel_better', label: 'Connecting cells in parallel instead would solve everything' },
  ];

  const transferApplications = [
    {
      title: 'Residential Rooftop Shading',
      description: 'A chimney shadow crosses one panel in a residential array every afternoon.',
      question: 'What solutions exist for residential shading problems?',
      answer: 'Options include: 1) Module-level power optimizers that let each panel operate independently, 2) Microinverters that convert DC to AC at each panel, 3) Repositioning panels to avoid shadow paths.',
    },
    {
      title: 'Commercial Solar with Rooftop Equipment',
      description: 'Commercial roofs have HVAC units, vents, and equipment that create complex shade patterns.',
      question: 'Why are power optimizers almost standard for commercial installations?',
      answer: 'Commercial roofs have unavoidable obstructions. Without optimizers, a single shaded panel could reduce a 20-panel string by 30-50%. Optimizers cost extra but can recover 10-25% of production.',
    },
    {
      title: 'Utility-Scale Hot Spot Failures',
      description: 'A large solar farm experienced panel fires traced to hot spots under bird droppings.',
      question: 'How do hot spots cause panel fires, and how are they prevented?',
      answer: 'When a shaded cell is forced to carry string current, it becomes reverse-biased and dissipates power as heat. Temperatures can exceed 150C. Prevention: Bypass diodes, regular cleaning, IR drone inspections.',
    },
    {
      title: 'Solar Highways and Vehicle Shading',
      description: 'Solar installations along highways face intermittent shading from vehicles.',
      question: 'What technology makes roadside solar viable?',
      answer: 'AC microinverters or DC optimizers are essential. Rapid shade changes from passing vehicles would devastate traditional string systems. Microinverters respond in milliseconds.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does shading one cell in a series string affect the entire string?',
      options: [
        { text: 'The shaded cell blocks light from reaching others', correct: false },
        { text: 'In series, current must be equal through all cells - the weakest cell limits the whole string', correct: true },
        { text: 'The shaded cell absorbs power from other cells', correct: false },
        { text: 'Shading causes the inverter to shut down', correct: false },
      ],
    },
    {
      question: 'What is a hot spot in a solar panel?',
      options: [
        { text: 'A cell that is more efficient than others', correct: false },
        { text: 'A shaded cell that becomes reverse-biased and dissipates power as heat', correct: true },
        { text: 'A cell that receives more sunlight', correct: false },
        { text: 'A defect in the manufacturing process', correct: false },
      ],
    },
    {
      question: 'What is the purpose of a bypass diode?',
      options: [
        { text: 'To increase the voltage output of the panel', correct: false },
        { text: 'To allow current to flow around shaded cell groups, preventing hot spots', correct: true },
        { text: 'To convert DC to AC power', correct: false },
        { text: 'To store excess energy', correct: false },
      ],
    },
    {
      question: 'If one cell in a string of 20 cells is completely shaded (no bypass diodes), what happens?',
      options: [
        { text: 'The string loses exactly 5% (1/20) of its power', correct: false },
        { text: 'The string loses only the power from that one cell', correct: false },
        { text: 'The entire string current is limited to what the shaded cell can pass, losing most power', correct: true },
        { text: 'The other 19 cells compensate automatically', correct: false },
      ],
    },
    {
      question: 'What is a microinverter?',
      options: [
        { text: 'A very small solar panel', correct: false },
        { text: 'A device that converts DC to AC at each individual panel', correct: true },
        { text: 'A tiny battery for each cell', correct: false },
        { text: 'A microscope for inspecting solar cells', correct: false },
      ],
    },
    {
      question: 'How do power optimizers (like SolarEdge) help with shading?',
      options: [
        { text: 'They remove shadows using mirrors', correct: false },
        { text: 'They allow each panel to operate at its own optimal point regardless of others', correct: true },
        { text: 'They make panels immune to temperature effects', correct: false },
        { text: 'They are only useful at night', correct: false },
      ],
    },
    {
      question: 'A typical bypass diode in a 72-cell panel protects how many cells?',
      options: [
        { text: 'Just 1 cell', correct: false },
        { text: 'About 24 cells (panels usually have 3 bypass diodes)', correct: true },
        { text: 'All 72 cells together', correct: false },
        { text: 'Bypass diodes are not used in modern panels', correct: false },
      ],
    },
    {
      question: 'Why might a shaded panel in a string cause more than just its proportional power loss?',
      options: [
        { text: 'Shaded panels absorb energy from sunny ones', correct: false },
        { text: 'The mismatch causes the MPPT to operate away from optimum for all panels', correct: true },
        { text: 'Shading always triggers a complete shutdown', correct: false },
        { text: 'This is a myth - losses are always proportional', correct: false },
      ],
    },
    {
      question: 'What can cause hot spot damage in a solar panel?',
      options: [
        { text: 'Only manufacturing defects', correct: false },
        { text: 'Partial shading, dirt, bird droppings, or cracked cells', correct: true },
        { text: 'Only extreme ambient temperatures', correct: false },
        { text: 'Using the panel at night', correct: false },
      ],
    },
    {
      question: 'In a system with microinverters, what happens when one panel is shaded?',
      options: [
        { text: 'The entire system shuts down', correct: false },
        { text: 'All panels lose the same percentage of power', correct: false },
        { text: 'Only the shaded panel produces less - other panels are unaffected', correct: true },
        { text: 'The microinverter overheats', correct: false },
      ],
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // REAL-WORLD APPLICATIONS DATA
  // ────────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    {
      icon: '☀️',
      title: 'Solar Panel Shading Protection',
      short: 'Photovoltaics',
      tagline: 'Maximizing energy harvest in partially shaded conditions',
      description: 'Bypass diodes are fundamental protection devices in photovoltaic systems. When shadows from trees, buildings, or debris fall on solar panels, bypass diodes prevent catastrophic power loss and dangerous hot spots by providing alternative current paths around shaded cell groups.',
      connection: 'Solar panels use series-connected cells to achieve high voltages, but this makes them vulnerable to partial shading. A single shaded cell can limit current through an entire string of 20+ cells, causing 80-90% power loss. Bypass diodes segment panels into protected groups, limiting losses to just the shaded sections.',
      howItWorks: 'When a cell is shaded, it cannot generate current but the string tries to push current through it. This reverse-biases the shaded cell, causing it to dissipate power as heat. The bypass diode, connected in parallel with a group of cells, becomes forward-biased when shading occurs, allowing current to flow around the affected cells with only a 0.6-0.7V voltage drop.',
      stats: [
        { value: '3-6', label: 'Bypass diodes per panel' },
        { value: '80%', label: 'Power recovery in partial shade' },
        { value: '150°C', label: 'Hot spot temp without protection' },
      ],
      examples: [
        'Residential rooftop systems with chimney shadows',
        'Commercial installations with HVAC equipment shading',
        'Utility-scale farms with cloud edge shading',
        'Building-integrated photovoltaics (BIPV)',
      ],
      companies: [
        'SunPower',
        'First Solar',
        'Canadian Solar',
        'JinkoSolar',
        'LONGi Green Energy',
      ],
      futureImpact: 'Next-generation solar panels are integrating cell-level bypass protection and smart junction boxes with monitoring capabilities. Bifacial panels and half-cut cell designs are reducing the impact of partial shading while maintaining bypass diode protection as the last line of defense.',
      color: '#fbbf24',
    },
    {
      icon: '💡',
      title: 'LED String Light Reliability',
      short: 'Lighting',
      tagline: 'Keeping holiday lights glowing when LEDs fail',
      description: 'LED string lights use bypass mechanisms to ensure that when one LED fails open-circuit, the entire string does not go dark. This is the modern solution to the classic Christmas light problem where one burned-out bulb killed an entire strand.',
      connection: 'LEDs in string lights are connected in series to share a voltage source efficiently. However, if one LED fails as an open circuit, it breaks the entire current path. Bypass components provide an alternate route for current, isolating failed LEDs while keeping the rest illuminated.',
      howItWorks: 'Modern LED strings incorporate shunt resistors or bypass diodes parallel to each LED. When an LED fails open, the full string voltage appears across that position, triggering the bypass element to conduct. Some designs use anti-fuse shunts that permanently short when exposed to high voltage from an open LED.',
      stats: [
        { value: '99.9%', label: 'String survival rate with bypass' },
        { value: '50-100', label: 'LEDs per string typical' },
        { value: '<1W', label: 'Power waste per bypassed LED' },
      ],
      examples: [
        'Holiday and decorative string lights',
        'Architectural facade lighting',
        'Outdoor patio and landscape lighting',
        'Commercial signage with LED strings',
      ],
      companies: [
        'Philips Lighting',
        'GE Lighting',
        'Osram',
        'Cree',
      ],
      futureImpact: 'Smart LED strings with wireless communication and individual LED addressing are emerging. These systems can detect and report failed LEDs while bypass circuits maintain operation. Self-healing LED technology using redundant parallel paths may eventually eliminate the need for traditional bypass protection.',
      color: '#a855f7',
    },
    {
      icon: '🔋',
      title: 'Battery Pack Cell Balancing',
      short: 'Electric Vehicles',
      tagline: 'Protecting EV batteries from cell mismatch damage',
      description: 'Electric vehicle battery packs contain thousands of cells connected in series and parallel. Bypass circuitry protects against weak or failed cells that could limit the entire pack capacity or create dangerous thermal runaway conditions.',
      connection: 'Like solar panels, EV battery packs use series connections to achieve high voltages (400V-800V). Cell manufacturing variations and aging cause capacity mismatches. Without bypass protection, the weakest cell determines pack capacity and can be driven into dangerous over-discharge or reversal conditions.',
      howItWorks: 'Battery management systems (BMS) use active or passive bypass circuits during charging to balance cell voltages. During discharge, bypass MOSFETs can route current around weak cells. Advanced systems use DC-DC converters to actively transfer energy between cells, maximizing pack capacity while protecting weak cells.',
      stats: [
        { value: '7000+', label: 'Cells in Tesla Model S pack' },
        { value: '10-15%', label: 'Capacity gain from balancing' },
        { value: '<1mV', label: 'Voltage matching precision' },
      ],
      examples: [
        'Tesla electric vehicle battery packs',
        'Rivian truck and SUV powertrains',
        'Electric bus fleet batteries',
        'Grid-scale energy storage systems',
      ],
      companies: [
        'Tesla',
        'Panasonic',
        'CATL',
        'LG Energy Solution',
        'BYD',
      ],
      futureImpact: 'Solid-state batteries may reduce cell-to-cell variation, but bypass protection will remain critical for safety. AI-powered BMS systems are learning optimal bypass strategies that extend pack life by 20-30%. Wireless BMS architectures are eliminating wiring complexity while maintaining comprehensive cell monitoring.',
      color: '#22c55e',
    },
    {
      icon: '🛰️',
      title: 'Satellite Power Systems',
      short: 'Aerospace',
      tagline: 'Ensuring spacecraft survival through solar array failures',
      description: 'Satellites depend on solar arrays for power, operating in harsh space environments where radiation can damage individual cells. Bypass diodes are mission-critical components that prevent single cell failures from cascading into complete power system failure.',
      connection: 'Space solar arrays face unique challenges: micrometeorite impacts, radiation damage, and extreme temperature cycling. A single damaged cell without bypass protection could disable an entire solar panel string, potentially ending a billion-dollar mission. Redundant bypass paths ensure graceful degradation.',
      howItWorks: 'Space-grade bypass diodes are radiation-hardened and qualified for extreme temperatures (-150°C to +150°C). They activate when a cell is damaged or shadowed by spacecraft structures. Triple-junction gallium arsenide cells used in space are particularly sensitive to current mismatch, making bypass protection essential.',
      stats: [
        { value: '15-20yr', label: 'Mission design life' },
        { value: '30%', label: 'Efficiency of space solar cells' },
        { value: '-150/+150°C', label: 'Operating temp range' },
      ],
      examples: [
        'International Space Station solar arrays',
        'GPS satellite constellation power systems',
        'James Webb Space Telescope sunshield',
        'Mars rover solar panels',
      ],
      companies: [
        'Northrop Grumman',
        'Lockheed Martin',
        'Airbus Defence and Space',
        'Boeing',
        'SpaceX',
      ],
      futureImpact: 'Next-generation space solar arrays are using flexible, rollout designs with integrated bypass protection at the cell level. Starlink and other mega-constellations are driving cost reduction in radiation-hardened bypass diodes. Solar electric propulsion systems require even more robust bypass protection for their high-power arrays.',
      color: '#3b82f6',
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showOptimizerOption: boolean = false) => {
    const width = 400;
    const height = 450;

    const cellWidth = 50;
    const cellHeight = 40;
    const cellGap = 8;
    const stringGap = 30;

    const string1Shaded = shadedCells.has(0) || shadedCells.has(1);
    const string2Shaded = shadedCells.has(2) || shadedCells.has(3);
    const string3Shaded = shadedCells.has(4) || shadedCells.has(5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="cellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="shadedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.shaded} />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.current} />
            </marker>
          </defs>

          <text x="200" y="20" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">
            Solar Panel with {STRINGS} Strings in Series
          </text>
          <text x="200" y="38" fill={colors.textMuted} fontSize="10" textAnchor="middle">
            {interactive ? 'Click cells to toggle shade' : 'Each string has 2 cells + bypass diode'}
          </text>

          {[0, 1, 2].map(stringIndex => {
            const stringX = 50 + stringIndex * (2 * cellWidth + cellGap + stringGap);
            const isStringBypassed = bypassEnabled && (
              (stringIndex === 0 && string1Shaded) ||
              (stringIndex === 1 && string2Shaded) ||
              (stringIndex === 2 && string3Shaded)
            );

            return (
              <g key={stringIndex} transform={`translate(${stringX}, 50)`}>
                <text x={cellWidth + cellGap / 2} y="-8" fill={colors.textMuted} fontSize="9" textAnchor="middle">
                  String {stringIndex + 1}
                </text>

                {[0, 1].map(cellInString => {
                  const cellIndex = stringIndex * 2 + cellInString;
                  const isShaded = shadedCells.has(cellIndex);
                  const cellX = cellInString * (cellWidth + cellGap);

                  return (
                    <g key={cellIndex}>
                      <rect
                        x={cellX}
                        y="0"
                        width={cellWidth}
                        height={cellHeight}
                        fill={isShaded ? 'url(#shadedGradient)' : 'url(#cellGradient)'}
                        rx="4"
                        stroke={isShaded ? (values.hotSpotRisk ? colors.hotspot : colors.shaded) : colors.current}
                        strokeWidth="2"
                        style={{ cursor: interactive ? 'pointer' : 'default' }}
                        onClick={() => interactive && toggleCellShade(cellIndex)}
                      />
                      {isShaded && (
                        <text x={cellX + cellWidth / 2} y={cellHeight / 2 + 4} fill={values.hotSpotRisk ? colors.hotspot : colors.textMuted} fontSize="8" textAnchor="middle">
                          {values.hotSpotRisk ? 'HOT!' : 'SHADED'}
                        </text>
                      )}
                      {!isShaded && (
                        <text x={cellX + cellWidth / 2} y={cellHeight / 2 + 4} fill={colors.solar} fontSize="10" textAnchor="middle">
                          {CELL_VOLTAGE}V
                        </text>
                      )}

                      {isShaded && values.hotSpotRisk && (
                        <circle cx={cellX + cellWidth / 2} cy={cellHeight / 2} r="20" fill="none" stroke={colors.hotspot} strokeWidth="2" strokeDasharray="4,2" opacity="0.8">
                          <animate attributeName="r" values="15;22;15" dur="1s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  );
                })}

                <line x1={cellWidth} y1={cellHeight / 2} x2={cellWidth + cellGap} y2={cellHeight / 2} stroke={colors.textMuted} strokeWidth="2" />

                {bypassEnabled && (
                  <g transform={`translate(${cellWidth / 2 + cellGap / 2}, ${cellHeight + 15})`}>
                    <path
                      d={`M-20,0 L0,0 L0,-8 L15,0 L0,8 L0,0 M15,-8 L15,8 M15,0 L35,0`}
                      fill="none"
                      stroke={isStringBypassed ? colors.bypass : colors.textMuted}
                      strokeWidth={isStringBypassed ? 3 : 1.5}
                      filter={isStringBypassed ? 'url(#glow)' : undefined}
                    />
                    {isStringBypassed && (
                      <text x="7" y="20" fill={colors.bypass} fontSize="8" textAnchor="middle">ACTIVE</text>
                    )}
                  </g>
                )}

                {hasOptimizers && (
                  <g transform={`translate(${cellWidth / 2 + cellGap / 2}, ${cellHeight + 35})`}>
                    <rect x="-15" y="-8" width="30" height="16" fill="rgba(6, 182, 212, 0.3)" rx="3" stroke={colors.optimizer} strokeWidth="2" />
                    <text x="0" y="4" fill={colors.optimizer} fontSize="7" textAnchor="middle">OPT</text>
                  </g>
                )}

                {showCurrentFlow && !isStringBypassed && (
                  <line
                    x1="-15"
                    y1={cellHeight / 2}
                    x2={2 * cellWidth + cellGap + 15}
                    y2={cellHeight / 2}
                    stroke={colors.current}
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    opacity="0.7"
                  />
                )}

                {showCurrentFlow && isStringBypassed && bypassEnabled && (
                  <path
                    d={`M-15,${cellHeight / 2} Q${cellWidth / 2 + cellGap / 2},${cellHeight + 50} ${2 * cellWidth + cellGap + 15},${cellHeight / 2}`}
                    fill="none"
                    stroke={colors.bypass}
                    strokeWidth="3"
                    markerEnd="url(#arrowhead)"
                    filter="url(#glow)"
                  />
                )}
              </g>
            );
          })}

          <g transform="translate(0, 70)">
            <path
              d={`M${50 + 2 * cellWidth + cellGap},${cellHeight / 2}
                  L${50 + 2 * cellWidth + cellGap + stringGap / 2},${cellHeight / 2}
                  L${50 + 2 * cellWidth + cellGap + stringGap / 2},${-15}
                  L${50 + 2 * (2 * cellWidth + cellGap) + stringGap - stringGap / 2},${-15}
                  L${50 + 2 * (2 * cellWidth + cellGap) + stringGap - stringGap / 2},${cellHeight / 2}
                  L${50 + 2 * (2 * cellWidth + cellGap) + stringGap},${cellHeight / 2}`}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth="2"
            />

            <path
              d={`M${50 + 3 * (2 * cellWidth + cellGap) + stringGap},${cellHeight / 2}
                  L${50 + 3 * (2 * cellWidth + cellGap) + 1.5 * stringGap},${cellHeight / 2}
                  L${50 + 3 * (2 * cellWidth + cellGap) + 1.5 * stringGap},${-15}
                  L${50 + 4 * (2 * cellWidth + cellGap) + 2 * stringGap - stringGap / 2},${-15}
                  L${50 + 4 * (2 * cellWidth + cellGap) + 2 * stringGap - stringGap / 2},${cellHeight / 2}
                  L${50 + 4 * (2 * cellWidth + cellGap) + 2 * stringGap},${cellHeight / 2}`}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth="2"
            />
          </g>

          <g transform="translate(20, 180)">
            <rect x="0" y="0" width="360" height="100" fill="rgba(0,0,0,0.4)" rx="8" stroke={colors.accent} strokeWidth="1" />

            <text x="180" y="18" fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle">
              Panel Output
            </text>

            <text x="20" y="40" fill={colors.current} fontSize="11">Current:</text>
            <text x="90" y="40" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              {values.current.toFixed(1)} A
            </text>

            <text x="180" y="40" fill={colors.solar} fontSize="11">Voltage:</text>
            <text x="250" y="40" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              {values.voltage.toFixed(1)} V
            </text>

            <text x="20" y="65" fill={colors.power} fontSize="12" fontWeight="bold">Power:</text>
            <text x="90" y="65" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
              {values.power.toFixed(0)} W
            </text>
            <text x="150" y="65" fill={colors.textSecondary} fontSize="11">
              ({values.efficiency.toFixed(0)}% of max)
            </text>

            {values.hotSpotRisk && (
              <text x="180" y="85" fill={colors.hotspot} fontSize="11" textAnchor="middle" fontWeight="bold">
                WARNING: Hot spot risk! Reverse voltage: {values.reverseVoltage.toFixed(1)}V
              </text>
            )}
            {values.activeBypass && !hasOptimizers && (
              <text x="180" y="85" fill={colors.bypass} fontSize="11" textAnchor="middle">
                Bypass active: {values.bypassedStrings} string(s) bypassed
              </text>
            )}
            {hasOptimizers && shadedCells.size > 0 && (
              <text x="180" y="85" fill={colors.optimizer} fontSize="11" textAnchor="middle">
                Optimizers: Each cell at its own MPP
              </text>
            )}
          </g>

          <g transform="translate(20, 295)">
            <text x="180" y="0" fill={colors.textPrimary} fontSize="11" fontWeight="bold" textAnchor="middle">
              Power Output Comparison
            </text>

            <rect x="0" y="15" width="360" height="20" fill="rgba(255,255,255,0.1)" rx="4" />
            <rect x="0" y="15" width="360" height="20" fill="rgba(16, 185, 129, 0.3)" rx="4" stroke={colors.success} strokeWidth="1" />
            <text x="10" y="29" fill={colors.success} fontSize="10">Max: {(CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT).toFixed(0)}W (100%)</text>

            <rect x="0" y="45" width="360" height="20" fill="rgba(255,255,255,0.1)" rx="4" />
            <rect
              x="0"
              y="45"
              width={360 * values.efficiency / 100}
              height="20"
              fill={values.hotSpotRisk ? 'rgba(239, 68, 68, 0.5)' : values.efficiency > 80 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}
              rx="4"
            />
            <text x="10" y="59" fill={colors.textPrimary} fontSize="10">
              Actual: {values.power.toFixed(0)}W ({values.efficiency.toFixed(0)}%)
            </text>
          </g>

          <g transform="translate(20, 380)">
            <rect x="0" y="0" width="360" height="60" fill="rgba(0,0,0,0.3)" rx="6" />
            <text x="10" y="18" fill={colors.textPrimary} fontSize="10" fontWeight="bold">Configuration:</text>

            <circle cx="25" cy="35" r="6" fill={bypassEnabled ? colors.bypass : colors.textMuted} />
            <text x="40" y="39" fill={colors.textSecondary} fontSize="10">Bypass: {bypassEnabled ? 'ON' : 'OFF'}</text>

            <circle cx="160" cy="35" r="6" fill={hasOptimizers ? colors.optimizer : colors.textMuted} />
            <text x="175" y="39" fill={colors.textSecondary} fontSize="10">Optimizers: {hasOptimizers ? 'ON' : 'OFF'}</text>

            <circle cx="290" cy="35" r="6" fill={shadedCells.size > 0 ? colors.shaded : colors.solar} />
            <text x="305" y="39" fill={colors.textSecondary} fontSize="10">Shaded: {shadedCells.size}</text>

            <text x="180" y="55" fill={colors.textMuted} fontSize="9" textAnchor="middle">
              {!bypassEnabled && !hasOptimizers && 'No protection - risk of hot spots and severe power loss'}
              {bypassEnabled && !hasOptimizers && 'Bypass diodes protect against hot spots, but lose whole strings'}
              {hasOptimizers && 'Optimizers allow each cell to operate independently'}
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setBypassEnabled(!bypassEnabled)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: bypassEnabled ? colors.bypass : colors.textMuted,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Bypass: {bypassEnabled ? 'ON' : 'OFF'}
            </button>
            {showOptimizerOption && (
              <button
                onClick={() => setHasOptimizers(!hasOptimizers)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasOptimizers ? colors.optimizer : colors.textMuted,
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Optimizers: {hasOptimizers ? 'ON' : 'OFF'}
              </button>
            )}
            <button
              onClick={() => setShowCurrentFlow(!showCurrentFlow)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.current}`,
                background: showCurrentFlow ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: colors.current,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Current Flow
            </button>
            <button
              onClick={() => { setShadedCells(new Set()); setBypassEnabled(true); setHasOptimizers(false); }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.power}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          The Series Problem
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          In a series circuit, current must be the same through all components. A shaded cell
          can only pass a fraction of normal current, limiting the entire string.
        </div>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.bypass}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Bypass Diode Solution
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          Bypass diodes provide an alternate current path around shaded cells. When a cell
          is shaded, its voltage drops, forward-biasing the bypass diode.
        </div>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER PHASES
  // ────────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{ padding: '24px', paddingTop: '70px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
      }}>
        <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>SOLAR PHYSICS</span>
      </div>

      <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: colors.textPrimary, marginBottom: '16px' }}>
        Bypass Diodes and Partial Shading
      </h1>

      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        Why does shade on one cell ruin the whole panel? And how do bypass diodes help?
      </p>

      {renderVisualization(true)}

      <div style={{
        background: colors.bgCard,
        padding: '20px',
        borderRadius: '12px',
        marginTop: '24px',
        textAlign: 'left',
      }}>
        <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
          Solar cells are connected in series to build up voltage. But this creates a problem:
          <strong style={{ color: colors.hotspot }}> a single shaded cell can devastate the entire string's output</strong>.
          Even worse, it can create dangerous hot spots that damage the panel.
        </p>
        <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '12px', fontWeight: 400 }}>
          Click on individual cells to shade them and see what happens to power output!
        </p>
      </div>
    </div>
  );

  const renderStaticVisualization = () => {
    const width = 400;
    const height = 300;
    const cellWidth = 50;
    const cellHeight = 40;
    const cellGap = 8;
    const stringGap = 30;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px', transition: 'all 0.3s ease' }}
      >
        <defs>
          <linearGradient id="cellGradientStatic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>

        <text x="200" y="25" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">
          Solar Panel with 3 Strings in Series
        </text>
        <text x="200" y="45" fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Each string has 2 cells + bypass diode
        </text>

        {[0, 1, 2].map(stringIndex => {
          const stringX = 50 + stringIndex * (2 * cellWidth + cellGap + stringGap);
          return (
            <g key={stringIndex} transform={`translate(${stringX}, 70)`}>
              <text x={cellWidth + cellGap / 2} y="-10" fill={colors.textSecondary} fontSize="10" textAnchor="middle">
                String {stringIndex + 1}
              </text>
              {[0, 1].map(cellInString => {
                const cellX = cellInString * (cellWidth + cellGap);
                return (
                  <g key={cellInString}>
                    <rect
                      x={cellX}
                      y="0"
                      width={cellWidth}
                      height={cellHeight}
                      fill="url(#cellGradientStatic)"
                      rx="4"
                      stroke={colors.current}
                      strokeWidth="2"
                    />
                    <text x={cellX + cellWidth / 2} y={cellHeight / 2 + 4} fill={colors.solar} fontSize="10" textAnchor="middle">
                      {CELL_VOLTAGE}V
                    </text>
                  </g>
                );
              })}
              <line x1={cellWidth} y1={cellHeight / 2} x2={cellWidth + cellGap} y2={cellHeight / 2} stroke={colors.textMuted} strokeWidth="2" />
              {/* Bypass diode symbol */}
              <g transform={`translate(${cellWidth / 2 + cellGap / 2}, ${cellHeight + 15})`}>
                <path
                  d="M-20,0 L0,0 L0,-8 L15,0 L0,8 L0,0 M15,-8 L15,8 M15,0 L35,0"
                  fill="none"
                  stroke={colors.textMuted}
                  strokeWidth="1.5"
                />
              </g>
            </g>
          );
        })}

        <g transform="translate(20, 180)">
          <rect x="0" y="0" width="360" height="80" fill="rgba(0,0,0,0.4)" rx="8" stroke={colors.accent} strokeWidth="1" />
          <text x="180" y="25" fill={colors.textPrimary} fontSize="13" fontWeight="bold" textAnchor="middle">
            What happens when you shade one cell?
          </text>
          <text x="180" y="50" fill={colors.textSecondary} fontSize="11" textAnchor="middle">
            Make your prediction below
          </text>
          <text x="180" y="70" fill={colors.textMuted} fontSize="10" textAnchor="middle">
            Max power: {(CELLS_PER_STRING * STRINGS * CELL_VOLTAGE * CELL_CURRENT).toFixed(0)}W
          </text>
        </g>
      </svg>
    );
  };

  const renderPredict = () => (
    <div style={{ padding: '24px', paddingTop: '70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.textPrimary }}>
          Make Your Prediction
        </h2>
        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Step 1 of 4</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {renderStaticVisualization()}
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
          If you shade just 1 cell out of 6 (16% of area), how much power do you lose?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {predictions.map((option, index) => (
          <button
            key={option.id}
            onClick={() => setPrediction(option.id)}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? `2px solid ${colors.primary}`
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: colors.textPrimary,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: '44px',
              transition: 'all 0.2s ease',
            }}
          >
            {String.fromCharCode(65 + index)}. {option.label}
          </button>
        ))}
      </div>

      {!prediction && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: colors.textSecondary,
          fontSize: '13px',
        }}>
          Select a prediction to continue
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px', paddingTop: '70px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.textPrimary, marginBottom: '8px' }}>
        Explore Shading Effects
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
        Observe how shading affects power output. Try different configurations to understand bypass diodes.
      </p>

      {renderVisualization(true)}

      {/* Slider controls for play phase */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>Shading Intensity (cells blocked from sunlight)</label>
          <input
            type="range"
            min="0"
            max="6"
            value={shadedCells.size}
            aria-label="Shading intensity control"
            onChange={(e) => {
              const newCount = parseInt(e.target.value);
              const newSet = new Set<number>();
              for (let i = 0; i < newCount; i++) {
                newSet.add(i);
              }
              setShadedCells(newSet);
              setHasExperimented(true);
            }}
            style={{ width: '100%', cursor: 'pointer', accentColor: colors.primary }}
          />
          <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>{shadedCells.size} cells shaded - Power output affected</span>
        </div>
      </div>

      {renderControls()}

      <div style={{
        background: colors.bgCard,
        padding: '16px',
        borderRadius: '12px',
        marginTop: '16px',
      }}>
        <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
        <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
          <li>Shade one cell with bypass ON vs OFF</li>
          <li>Shade one cell in each string</li>
          <li>Turn off bypass and observe hot spot warning</li>
        </ul>
      </div>

      {/* Key Physics Terms - definitions for educational value */}
      <div style={{
        background: 'rgba(168, 85, 247, 0.1)',
        padding: '16px',
        borderRadius: '12px',
        marginTop: '16px',
        borderLeft: `3px solid ${colors.power}`,
      }}>
        <h4 style={{ color: colors.power, marginBottom: '8px' }}>Key Terms Defined:</h4>
        <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
          <li><strong style={{ color: colors.textPrimary }}>Series Circuit:</strong> is defined as components connected end-to-end where current flows through each sequentially</li>
          <li><strong style={{ color: colors.textPrimary }}>Bypass Diode:</strong> refers to a semiconductor device that provides an alternate current path around shaded cells</li>
          <li><strong style={{ color: colors.textPrimary }}>Hot Spot:</strong> describes how localized overheating occurs when a reverse-biased cell dissipates power as heat</li>
          <li><strong style={{ color: colors.textPrimary }}>Power Output:</strong> is a measure of electrical energy calculated as P = V x I (voltage times current)</li>
        </ul>
      </div>

      {/* Real-world relevance explanation */}
      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        padding: '16px',
        borderRadius: '12px',
        marginTop: '16px',
        borderLeft: `3px solid ${colors.success}`,
      }}>
        <h4 style={{ color: colors.success, marginBottom: '8px' }}>Why This Matters in Practice:</h4>
        <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
          Understanding bypass diodes is essential because partial shading is unavoidable in real installations.
          Trees, chimneys, passing clouds, and even bird droppings can shade panels. Without proper protection,
          a 5% shaded area can cause 50-80% power loss. In commercial installations with hundreds of panels,
          proper bypass diode design prevents thousands of dollars in lost energy production annually and
          protects against potentially dangerous hot spot fires.
        </p>
      </div>

      {!hasExperimented && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          marginTop: '16px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: colors.textSecondary,
          fontSize: '13px',
        }}>
          Click cells or use slider to experiment before continuing
        </div>
      )}
    </div>
  );

  const renderReviewDiagram = () => {
    const width = 400;
    const height = 200;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px', marginBottom: '16px', transition: 'all 0.3s ease' }}
      >
        <text x="200" y="25" fill={colors.textPrimary} fontSize="13" fontWeight="bold" textAnchor="middle">
          Series Circuit Current Flow
        </text>

        {/* Normal current flow */}
        <g transform="translate(30, 50)">
          <text x="80" y="-5" fill={colors.success} fontSize="10" textAnchor="middle">Normal: Full Current</text>
          <rect x="0" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.success} strokeWidth="2" />
          <rect x="50" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.success} strokeWidth="2" />
          <rect x="100" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.success} strokeWidth="2" />
          <line x1="40" y1="15" x2="50" y2="15" stroke={colors.success} strokeWidth="2" />
          <line x1="90" y1="15" x2="100" y2="15" stroke={colors.success} strokeWidth="2" />
          <line x1="140" y1="15" x2="160" y2="15" stroke={colors.success} strokeWidth="2" markerEnd="url(#arrowhead)" />
          <text x="80" y="50" fill={colors.textSecondary} fontSize="9" textAnchor="middle">10A through all</text>
        </g>

        {/* Shaded cell - limited current */}
        <g transform="translate(210, 50)">
          <text x="80" y="-5" fill={colors.error} fontSize="10" textAnchor="middle">Shaded: Limited Current</text>
          <rect x="0" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.textMuted} strokeWidth="2" />
          <rect x="50" y="0" width="40" height="30" fill={colors.shaded} rx="4" stroke={colors.error} strokeWidth="2" />
          <rect x="100" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.textMuted} strokeWidth="2" />
          <text x="70" y="20" fill={colors.error} fontSize="7">SHADED</text>
          <line x1="40" y1="15" x2="50" y2="15" stroke={colors.error} strokeWidth="1" strokeDasharray="3,2" />
          <line x1="90" y1="15" x2="100" y2="15" stroke={colors.error} strokeWidth="1" strokeDasharray="3,2" />
          <text x="80" y="50" fill={colors.error} fontSize="9" textAnchor="middle">Only 1A possible!</text>
        </g>

        {/* With bypass */}
        <g transform="translate(120, 120)">
          <text x="80" y="-5" fill={colors.bypass} fontSize="10" textAnchor="middle">Bypass: Current Rerouted</text>
          <rect x="0" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.bypass} strokeWidth="2" />
          <rect x="50" y="0" width="40" height="30" fill={colors.shaded} rx="4" stroke={colors.textMuted} strokeWidth="2" />
          <rect x="100" y="0" width="40" height="30" fill="#1e40af" rx="4" stroke={colors.bypass} strokeWidth="2" />
          <path d="M40,15 Q70,50 100,15" fill="none" stroke={colors.bypass} strokeWidth="2" />
          <text x="80" y="55" fill={colors.bypass} fontSize="9" textAnchor="middle">10A bypasses shaded cell</text>
        </g>
      </svg>
    );
  };

  const renderReview = () => {
    const wasCorrect = prediction === 'worse';
    const predictionText = prediction === 'proportional' ? 'proportional power loss'
      : prediction === 'worse' ? 'disproportionate power loss'
      : prediction === 'better' ? 'compensation by other cells'
      : 'no effect on power';

    return (
      <div style={{ padding: '24px', paddingTop: '70px' }}>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          marginBottom: '24px',
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
            You predicted {predictionText}. As you observed in the experiment,
            power drops <strong>MUCH more than proportionally!</strong> In series circuits,
            current is limited by the weakest link. Shading just 16% of the area can cause
            30-90% power loss without bypass diodes.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {renderReviewDiagram()}
        </div>

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Partial Shading</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Series Current Rule:</strong> In a series
              circuit, current must be identical through all components. A shaded cell generates
              less photocurrent but the string tries to push more through it.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Reverse Bias:</strong> The good cells
              generate voltage that reverse-biases the shaded cell. The shaded cell becomes a
              resistive load, dissipating power as heat.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Bypass Diodes:</strong> When a cell
              is shaded, the bypass diode provides an alternate current path. The string loses
              some voltage but avoids damage.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistPredict = () => (
    <div style={{ padding: '24px', paddingTop: '70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.warning }}>
          The Twist: Can Technology Help?
        </h2>
        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Step 2 of 4</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {renderStaticVisualization()}
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
          Bypass diodes help but still lose whole strings when even one cell is shaded.
          Modern solar systems use module-level power electronics (MLPE). How do they change the equation?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {twistPredictions.map((option, index) => (
          <button
            key={option.id}
            onClick={() => setTwistPrediction(option.id)}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: twistPrediction === option.id
                ? `2px solid ${colors.warning}`
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: twistPrediction === option.id
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: colors.textPrimary,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: '44px',
              transition: 'all 0.2s ease',
            }}
          >
            {String.fromCharCode(65 + index)}. {option.label}
          </button>
        ))}
      </div>

      {!twistPrediction && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: colors.textSecondary,
          fontSize: '13px',
        }}>
          Select a prediction to continue
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px', paddingTop: '70px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.warning, marginBottom: '8px' }}>
        Compare Technologies
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
        Observe the difference. Toggle optimizers on and off while shading cells to try different configurations.
      </p>

      {renderVisualization(true, true)}

      {/* Slider controls for twist play phase */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>Shading Level</label>
          <input
            type="range"
            min="0"
            max="6"
            value={shadedCells.size}
            onChange={(e) => {
              const newCount = parseInt(e.target.value);
              const newSet = new Set<number>();
              for (let i = 0; i < newCount; i++) {
                newSet.add(i);
              }
              setShadedCells(newSet);
              setHasTwistExperimented(true);
            }}
            style={{ width: '100%', cursor: 'pointer', accentColor: colors.primary }}
          />
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{shadedCells.size} cells shaded</span>
        </div>
      </div>

      {renderControls()}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '16px',
        borderRadius: '12px',
        borderLeft: `3px solid ${colors.warning}`,
        marginTop: '16px',
      }}>
        <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Experiment:</h4>
        <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
          Shade 2-3 cells, then toggle between bypass-only and optimizer modes.
          With optimizers, each cell operates at its own maximum power point!
        </p>
      </div>

      {!hasTwistExperimented && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          marginTop: '16px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: colors.textSecondary,
          fontSize: '13px',
        }}>
          Click cells or use slider to experiment before continuing
        </div>
      )}
    </div>
  );

  const renderTwistReviewDiagram = () => {
    const width = 400;
    const height = 180;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px', marginBottom: '16px', transition: 'all 0.3s ease' }}
      >
        <text x="200" y="20" fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle">
          Technology Comparison
        </text>

        {/* Bypass only */}
        <g transform="translate(20, 40)">
          <text x="80" y="0" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Bypass Diodes Only</text>
          <rect x="20" y="10" width="120" height="50" fill="rgba(30,41,59,0.8)" rx="6" stroke={colors.bypass} strokeWidth="1" />
          <rect x="30" y="20" width="30" height="25" fill="#1e40af" rx="3" stroke={colors.bypass} strokeWidth="1" />
          <rect x="70" y="20" width="30" height="25" fill={colors.shaded} rx="3" stroke={colors.textMuted} strokeWidth="1" />
          <text x="85" y="36" fill={colors.textMuted} fontSize="6">SHADED</text>
          <rect x="110" y="20" width="25" height="25" fill="#1e40af" rx="3" stroke={colors.bypass} strokeWidth="1" />
          <text x="80" y="75" fill={colors.warning} fontSize="9" textAnchor="middle">Loses whole string!</text>
        </g>

        {/* With optimizers */}
        <g transform="translate(200, 40)">
          <text x="90" y="0" fill={colors.textSecondary} fontSize="10" textAnchor="middle">With Power Optimizers</text>
          <rect x="20" y="10" width="140" height="50" fill="rgba(30,41,59,0.8)" rx="6" stroke={colors.optimizer} strokeWidth="1" />
          <rect x="30" y="20" width="30" height="25" fill="#1e40af" rx="3" stroke={colors.optimizer} strokeWidth="2" />
          <rect x="35" y="47" width="20" height="10" fill="rgba(6,182,212,0.3)" rx="2" stroke={colors.optimizer} strokeWidth="1" />
          <text x="45" y="54" fill={colors.optimizer} fontSize="5">OPT</text>
          <rect x="75" y="20" width="30" height="25" fill={colors.shaded} rx="3" stroke={colors.textMuted} strokeWidth="1" />
          <rect x="80" y="47" width="20" height="10" fill="rgba(6,182,212,0.3)" rx="2" stroke={colors.optimizer} strokeWidth="1" />
          <text x="90" y="54" fill={colors.optimizer} fontSize="5">OPT</text>
          <rect x="120" y="20" width="30" height="25" fill="#1e40af" rx="3" stroke={colors.optimizer} strokeWidth="2" />
          <rect x="125" y="47" width="20" height="10" fill="rgba(6,182,212,0.3)" rx="2" stroke={colors.optimizer} strokeWidth="1" />
          <text x="135" y="54" fill={colors.optimizer} fontSize="5">OPT</text>
          <text x="90" y="75" fill={colors.success} fontSize="9" textAnchor="middle">Only shaded cell affected!</text>
        </g>

        {/* Power comparison bar */}
        <g transform="translate(20, 100)">
          <text x="10" y="12" fill={colors.textSecondary} fontSize="9">Bypass:</text>
          <rect x="60" y="3" width="120" height="14" fill="rgba(255,255,255,0.1)" rx="3" />
          <rect x="60" y="3" width="40" height="14" fill="rgba(245,158,11,0.5)" rx="3" />
          <text x="185" y="14" fill={colors.warning} fontSize="9">33%</text>

          <text x="200" y="12" fill={colors.textSecondary} fontSize="9">Optimizer:</text>
          <rect x="260" y="3" width="120" height="14" fill="rgba(255,255,255,0.1)" rx="3" />
          <rect x="260" y="3" width="100" height="14" fill="rgba(6,182,212,0.5)" rx="3" />
          <text x="385" y="14" fill={colors.optimizer} fontSize="9">83%</text>
        </g>

        <text x="200" y="145" fill={colors.textPrimary} fontSize="10" fontWeight="bold" textAnchor="middle">
          Optimizers: Each panel at its own maximum power point
        </text>
      </svg>
    );
  };

  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'optimizers_help';

    return (
      <div style={{ padding: '24px', paddingTop: '70px' }}>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          marginBottom: '24px',
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Important Insight!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            <strong>Microinverters and optimizers solve the shading problem</strong> by making
            each panel (or cell group) electrically independent. A shaded panel only loses
            its own production - other panels are completely unaffected!
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {renderTwistReviewDiagram()}
        </div>

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>MLPE Technologies Explained</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.optimizer }}>Power Optimizers:</strong> DC-DC
              converters at each panel that perform MPPT locally. Panels feed a central string
              inverter but operate independently.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.optimizer }}>Microinverters:</strong> Each
              panel has its own DC-AC inverter. Complete independence. Easier expansion.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Trade-offs:</strong> Higher cost, more
              potential failure points, but worth it for shaded installations or complex roofs.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const [currentTransferApp, setCurrentTransferApp] = useState(0);

  const renderTransfer = () => (
    <div style={{ padding: '24px', paddingTop: '70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.textPrimary }}>
          Real-World Applications
        </h2>
        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Step 3 of 4</span>
      </div>
      <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
        Shading solutions are critical for real solar installations. Global solar capacity reached 1,185 GW in 2022,
        with 80% of installations using bypass diode protection.
      </p>
      <p style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '16px', fontWeight: 400 }}>
        Application {currentTransferApp + 1} of {transferApplications.length} - Complete all to unlock the test
      </p>

      {transferApplications.map((app, index) => (
        <div
          key={index}
          style={{
            background: colors.bgCard,
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '12px',
            border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
            {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
          </div>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
            <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
          </div>
          {!transferCompleted.has(index) ? (
            <button
              onClick={() => {
                setTransferCompleted(new Set([...transferCompleted, index]));
                setCurrentTransferApp(Math.min(index + 1, transferApplications.length - 1));
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 400,
                minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
            >
              Continue - Reveal Answer
            </button>
          ) : (
            <div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
              </div>
              <button
                onClick={() => setCurrentTransferApp(Math.min(index + 1, transferApplications.length - 1))}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  minHeight: '44px',
                  transition: 'all 0.2s ease',
                }}
              >
                Got It - Next App
              </button>
            </div>
          )}
        </div>
      ))}

      {transferCompleted.size < 4 && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: colors.textSecondary,
          fontSize: '13px',
        }}>
          Complete {4 - transferCompleted.size} more application(s) to continue
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;

    if (testSubmitted) {
      return (
        <div style={{ padding: '24px', paddingTop: '70px', maxHeight: '100%', overflowY: 'auto' }}>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>Score: {testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
              {testScore >= 8 ? 'You understand bypass diodes and partial shading!' : 'Review the material and try again.'}
            </p>
          </div>

          {/* Navigation buttons for quiz results */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(new Array(10).fill(null));
                setCurrentTestQuestion(0);
                setPhase('hook');
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
            >
              Replay
            </button>
          </div>

          {/* Answer review section */}
          <h3 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Answer Review</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`, transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isCorrect ? colors.success : colors.error,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'white',
                      fontWeight: 'bold',
                    }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Q{qIndex + 1}. {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ padding: '24px', paddingTop: '70px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
          <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
        </div>
        <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px', fontWeight: 400 }}>
          Test your understanding of bypass diodes, partial shading effects, and solar panel protection mechanisms.
          Apply what you learned from the experiments to answer these scenario-based questions about real-world situations.
        </p>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s ease' }} />
          ))}
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQ.options.map((opt, oIndex) => (
            <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', minHeight: '44px', transition: 'all 0.2s ease' }}>
              {String.fromCharCode(65 + oIndex)}. {opt.text}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textSecondary : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', minHeight: '44px', transition: 'all 0.2s ease' }}>Previous</button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', minHeight: '44px', transition: 'all 0.2s ease' }}>Next</button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', minHeight: '44px', transition: 'all 0.2s ease' }}>Submit Test</button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ padding: '24px', paddingTop: '70px', textAlign: 'center' }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(245, 158, 11, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>*</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: colors.textPrimary, marginBottom: '8px' }}>
        Mastery Achieved!
      </h1>
      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        You have mastered bypass diodes and partial shading
      </p>

      <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
        <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
          <li>Series circuits limit current to the weakest cell</li>
          <li>Partial shading causes disproportionate power loss</li>
          <li>Hot spots occur when shaded cells become reverse-biased</li>
          <li>Bypass diodes protect strings but lose whole groups</li>
          <li>Microinverters make each panel independent</li>
          <li>Power optimizers enable per-panel MPPT</li>
        </ul>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>

      {renderVisualization(true, true)}
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

  // Determine bottom bar state based on phase
  const getBottomBarState = () => {
    switch (phase) {
      case 'hook':
        return { canBack: false, canNext: true, label: 'Start Learning' };
      case 'predict':
        return { canBack: true, canNext: !!prediction, label: 'Continue' };
      case 'play':
        return { canBack: true, canNext: hasExperimented, label: 'Continue' };
      case 'review':
        return { canBack: true, canNext: true, label: 'Next: A Twist!' };
      case 'twist_predict':
        return { canBack: true, canNext: !!twistPrediction, label: 'Test My Prediction' };
      case 'twist_play':
        return { canBack: true, canNext: hasTwistExperimented, label: 'See the Explanation' };
      case 'twist_review':
        return { canBack: true, canNext: true, label: 'Apply This Knowledge' };
      case 'transfer':
        return { canBack: true, canNext: transferCompleted.size >= 4, label: 'Take the Test' };
      case 'test':
        return { canBack: true, canNext: testSubmitted, label: testScore >= 8 ? 'Complete Mastery' : 'Review & Retry' };
      case 'mastery':
        return { canBack: true, canNext: false, label: 'Review Again' };
      default:
        return { canBack: true, canNext: true, label: 'Continue' };
    }
  };

  const bottomState = getBottomBarState();

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e1b4b 50%, ${colors.bgPrimary} 100%)`,
      color: colors.textPrimary,
      overflow: 'hidden',
    }}>
      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      {phase !== 'mastery' && renderBottomBar(bottomState.canBack, bottomState.canNext, bottomState.label)}

      {/* Mastery phase has its own button */}
      {phase === 'mastery' && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: isMobile ? '12px' : '12px 16px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
        }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 40px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: colors.primary,
              background: 'transparent',
              border: `2px solid ${colors.primary}`,
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            Review Again
          </button>
        </div>
      )}
    </div>
  );
};

export default BypassDiodesRenderer;
